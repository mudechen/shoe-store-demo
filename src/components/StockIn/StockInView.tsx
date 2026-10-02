import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ProductWithVariants, ShoeVariant, SizeUnit, ProcurementType } from '../../types/inventory';
import { StockInRecord } from '../../types/records';
import { SIZE_UNITS, getCanonicalSizeIndex, getSegmentSortRank, resolveVariantSize, isSameSizeVariant, DEFAULT_UNIT_RANGES, getUnitRangeSizes, detectProductMinMax, getProductSizeUnit, normalizeSizeKey, UNIT_ALL_SIZES, isWholeSizeKey } from '../../data/sizeStandards';
import { SizeRangeWheelPicker } from './SizeRangeWheelPicker';
import { PlusCircle, Check, Search, X, ShoppingBag } from 'lucide-react';
import { getTaiwanTodayStr } from '../../utils/dateUtils';
import { addBatchToVariant, deductFifoVariantStock } from '../../services/fifoService';
import { ShoePickerModal } from '../SalesClosing/ShoePickerModal';

interface StockInViewProps {
  products: ProductWithVariants[];
  initialSku?: string;
  initialColor?: string;
  editingProduct?: ProductWithVariants | null;
  onStockInSuccess: (product: ProductWithVariants, isNewProduct: boolean, record?: StockInRecord) => void;
  onSaveEdit?: (updatedProduct: ProductWithVariants, record?: StockInRecord) => void;
  onClose?: () => void;
  isModal?: boolean;
  onNavigateToRecords?: (sku?: string) => void;
}

/**
 * Detect whether a list of variants contains fractional sizes (e.g. 8.5, 38.5, 24.5).
 * If variants are non-numeric (e.g. ALPHA S/M/L) or there are fewer than 2 numeric variants,
 * defaults to true (half-step enabled).
 */
function detectHasFractionalVariants(variants: ShoeVariant[]): boolean {
  if (!variants || variants.length < 2) return true;
  const numericVariants = variants.filter((v) => {
    const raw = v.sizeDisplay || (typeof v.sizeUS === 'number' && v.sizeUS > 0 ? v.sizeUS.toString() : '');
    const num = parseFloat(raw.replace(/[^\d.]/g, ''));
    return !isNaN(num);
  });
  if (numericVariants.length < 2) return true;
  return numericVariants.some((v) => {
    const raw = v.sizeDisplay || (typeof v.sizeUS === 'number' && v.sizeUS > 0 ? v.sizeUS.toString() : '');
    const num = parseFloat(raw.replace(/[^\d.]/g, ''));
    return !isNaN(num) && num % 1 !== 0;
  });
}

function getExpandedUnitBounds(variants: ShoeVariant[] = [], unit: SizeUnit): { min: string; max: string } {
  const def = DEFAULT_UNIT_RANGES[unit] || { min: '3.0', max: '13.0' };
  if (!variants || variants.length === 0) return def;
  const detected = detectProductMinMax(variants, unit);
  const allSizes = UNIT_ALL_SIZES[unit] || UNIT_ALL_SIZES.US;
  const defMinIdx = allSizes.indexOf(def.min);
  const defMaxIdx = allSizes.indexOf(def.max);
  const detMinIdx = allSizes.indexOf(detected.min);
  const detMaxIdx = allSizes.indexOf(detected.max);
  const finalMinIdx = (defMinIdx !== -1 && detMinIdx !== -1) ? Math.min(defMinIdx, detMinIdx) : (defMinIdx !== -1 ? defMinIdx : detMinIdx);
  const finalMaxIdx = (defMaxIdx !== -1 && detMaxIdx !== -1) ? Math.max(defMaxIdx, detMaxIdx) : (defMaxIdx !== -1 ? defMaxIdx : detMaxIdx);
  return {
    min: finalMinIdx !== -1 ? allSizes[finalMinIdx] : def.min,
    max: finalMaxIdx !== -1 ? allSizes[finalMaxIdx] : def.max,
  };
}

export const StockInView: React.FC<StockInViewProps> = ({
  products,
  initialSku = '',
  initialColor = '',
  editingProduct = null,
  onStockInSuccess,
  onSaveEdit,
  onClose,
  isModal = false,
  onNavigateToRecords,
}) => {
  const isEditMode = Boolean(editingProduct);
  const [sku, setSku] = useState(initialSku);
  const [vendor, setVendor] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState(initialColor);
  const [category, setCategory] = useState<string>('休閒鞋');
  const [procurementType, setProcurementType] = useState<ProcurementType>('買斷');
  const [costPrice, setCostPrice] = useState<string>('');
  const [retailPrice, setRetailPrice] = useState<string>('');
  const [showCostLockNotice, setShowCostLockNotice] = useState(false);
  const [displayLoc, setDisplayLoc] = useState('A-01-L1');
  const [storageLoc, setStorageLoc] = useState('R1-C01-L1');

  // Autocomplete and Picker states
  const [showSkuDropdown, setShowSkuDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [isShoePickerOpen, setIsShoePickerOpen] = useState(false);

  const skuContainerRef = useRef<HTMLDivElement>(null);
  const vendorContainerRef = useRef<HTMLDivElement>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (skuContainerRef.current && !skuContainerRef.current.contains(target)) {
        setShowSkuDropdown(false);
      }
      if (vendorContainerRef.current && !vendorContainerRef.current.contains(target)) {
        setShowVendorDropdown(false);
      }
      if (nameContainerRef.current && !nameContainerRef.current.contains(target)) {
        setShowNameDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Size Calculation Standard: US / EU / JP / XS~2XL (Top level priority)
  const [selectedUnit, setSelectedUnit] = useState<SizeUnit>('US');

  // 2. Wheel Range: minSize and maxSize
  const [minSize, setMinSize] = useState<string>(() => DEFAULT_UNIT_RANGES.US.min);
  const [maxSize, setMaxSize] = useState<string>(() => DEFAULT_UNIT_RANGES.US.max);

  // 3. Half-step interval toggle (default: true)
  const [isHalfStep, setIsHalfStep] = useState<boolean>(true);

  // Map of sizeKey -> stock to add (zero-loss guarantee)
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    getUnitRangeSizes('US', DEFAULT_UNIT_RANGES.US.min, DEFAULT_UNIT_RANGES.US.max).forEach((s) => {
      initial[s] = 0;
    });
    return initial;
  });

  const lastLoadedSkuRef = useRef<string>('');

  // When editingProduct or initialSku or initialColor changes
  useEffect(() => {
    if (editingProduct) {
      setSku(editingProduct.sku || '');
      setVendor(editingProduct.brand || '');
      setName(editingProduct.name || '');
      setColor(editingProduct.color || '');
      setCategory(editingProduct.category || '休閒鞋');
      setProcurementType(editingProduct.procurementType || '買斷');
      setCostPrice(editingProduct.costPrice !== undefined ? String(editingProduct.costPrice) : '');
      setRetailPrice(editingProduct.retailPrice !== undefined ? String(editingProduct.retailPrice) : '');
      setShowCostLockNotice(false);

      // Detect active unit and range bounds from editing product's variants
      const detectedUnit = editingProduct.sizeUnit || getProductSizeUnit(editingProduct);
      setSelectedUnit(detectedUnit);

      const effectiveHalfStep = typeof editingProduct.isHalfStep === 'boolean'
        ? editingProduct.isHalfStep
        : (detectedUnit === 'ALPHA'
          ? true
          : detectHasFractionalVariants(editingProduct.variants));
      setIsHalfStep(effectiveHalfStep);

      const bounds = (editingProduct.minSize && editingProduct.maxSize)
        ? { min: editingProduct.minSize, max: editingProduct.maxSize }
        : getExpandedUnitBounds(editingProduct.variants, detectedUnit);
      setMinSize(bounds.min);
      setMaxSize(bounds.max);

      const initialQtyMap: Record<string, number> = {};
      getUnitRangeSizes(detectedUnit, bounds.min, bounds.max, effectiveHalfStep).forEach((s) => {
        initialQtyMap[s] = 0;
      });
      editingProduct.variants.forEach((v) => {
        const rawKey = v.sizeDisplay || (v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : v.sizeUS.toString());
        const key = normalizeSizeKey(detectedUnit, rawKey);
        initialQtyMap[key] = v.stock;
      });
      setSizeQuantities(initialQtyMap);
    } else {
      if (initialSku) setSku(initialSku);
      if (initialColor) setColor(initialColor);
    }
  }, [editingProduct, initialSku, initialColor]);

  // All existing products with matching SKU (for auto-completing style info and listing colors)
  const existingMatchingSku = useMemo(() => {
    const trimmed = sku.trim().toUpperCase();
    if (!trimmed) return [];
    return products.filter((p) => p.sku.toUpperCase() === trimmed);
  }, [products, sku]);

  // Existing colors for this SKU
  const existingColors = useMemo(() => {
    return Array.from(new Set(existingMatchingSku.map((p) => p.color.trim()).filter(Boolean)));
  }, [existingMatchingSku]);

  // Exact match: SAME SKU AND SAME COLOR (for restocking the existing color record)
  const matchedExisting = useMemo(() => {
    if (isEditMode) return null;
    const trimmedSku = sku.trim().toUpperCase();
    const trimmedColor = color.trim().toLowerCase();
    if (!trimmedSku || !trimmedColor) return null;
    return (
      existingMatchingSku.find(
        (p) => p.color.trim().toLowerCase() === trimmedColor
      ) || null
    );
  }, [existingMatchingSku, sku, color, isEditMode]);

  // Matching products for SKU autocomplete with priority scoring
  const skuSuggestions = useMemo(() => {
    if (isEditMode) return [];
    const query = sku.trim().toLowerCase();
    if (!query) return [];

    const scored = products.map((p) => {
      const pSku = p.sku.toLowerCase();
      const pName = p.name.toLowerCase();
      const pBarcode = (p.barcode || '').toLowerCase();
      const pBrand = p.brand.toLowerCase();

      let score = 0;
      if (pSku === query) {
        score = 100; // 完全相符
      } else if (pSku.startsWith(query)) {
        score = 80;  // 貨號開頭相符 (如 9049、9039)
      } else if (pSku.includes(query)) {
        score = 60;  // 貨號包含關鍵字 (如 909049)
      } else if (pName.startsWith(query)) {
        score = 50;  // 品名開頭相符
      } else if (pName.includes(query)) {
        score = 40;  // 品名包含關鍵字
      } else if (pBarcode.startsWith(query)) {
        score = 35;  // 條碼開頭相符
      } else if (query.length >= 4 && pBarcode.includes(query)) {
        score = 20;  // 條碼包含 (僅輸入4碼以上才比對條碼中段，防止短數字誤匹配系統自動生成之時間戳條碼)
      } else if (pBrand.includes(query)) {
        score = 10;  // 品牌包含
      }

      return { product: p, score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.product);
  }, [products, sku, isEditMode]);

  // Unique vendors from products
  const allUniqueVendors = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      const b = p.brand?.trim();
      if (b) {
        counts.set(b, (counts.get(b) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([vName, count]) => ({ name: vName, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  const vendorSuggestions = useMemo(() => {
    if (isEditMode) return [];
    const q = vendor.trim().toLowerCase();
    if (!q) return allUniqueVendors.slice(0, 8);
    return allUniqueVendors
      .filter((v) => v.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allUniqueVendors, vendor, isEditMode]);

  // Unique names and series from products
  const nameSuggestions = useMemo(() => {
    if (isEditMode) return [];
    const q = name.trim().toLowerCase();
    const currentVendorLower = vendor.trim().toLowerCase();

    const seen = new Set<string>();
    const list: { name: string; brand: string; sku: string; category?: string; count: number }[] = [];

    for (const p of products) {
      const pName = p.name?.trim();
      if (!pName) continue;
      const key = `${p.brand}:::${pName}`;
      if (seen.has(key)) continue;

      if (!q || pName.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) {
        seen.add(key);
        list.push({
          name: pName,
          brand: p.brand,
          sku: p.sku,
          category: p.category,
          count: products.filter((item) => item.name === pName).length,
        });
      }
    }

    return list
      .sort((a, b) => {
        if (currentVendorLower) {
          const aMatch = a.brand.toLowerCase() === currentVendorLower ? 1 : 0;
          const bMatch = b.brand.toLowerCase() === currentVendorLower ? 1 : 0;
          if (aMatch !== bMatch) return bMatch - aMatch;
        }
        return b.count - a.count;
      })
      .slice(0, 8);
  }, [products, name, vendor, isEditMode]);

  // Handler: Select a full product from autocomplete or ShoePickerModal
  const handleSelectProduct = (prod: ProductWithVariants) => {
    lastLoadedSkuRef.current = prod.sku.trim().toUpperCase();
    setSku(prod.sku);
    setVendor(prod.brand);
    setName(prod.name);
    setCategory(prod.category || '休閒鞋');
    if (prod.procurementType) {
      setProcurementType(prod.procurementType);
    }
    setCostPrice(prod.costPrice !== undefined ? String(prod.costPrice) : '');
    setRetailPrice(prod.retailPrice !== undefined ? String(prod.retailPrice) : '');
    if (prod.displayLocation) setDisplayLoc(prod.displayLocation);
    if (prod.storageLocation) setStorageLoc(prod.storageLocation);
    if (prod.color && !color.trim()) {
      setColor(prod.color);
    }

    // Auto detect unit & range bounds
    const detectedUnit = prod.sizeUnit || getProductSizeUnit(prod);
    setSelectedUnit(detectedUnit);

    const effectiveHalfStep = typeof prod.isHalfStep === 'boolean'
      ? prod.isHalfStep
      : (detectedUnit === 'ALPHA'
        ? true
        : detectHasFractionalVariants(prod.variants));
    setIsHalfStep(effectiveHalfStep);

    const bounds = detectProductMinMax(prod.variants, detectedUnit);
    setMinSize(bounds.min);
    setMaxSize(bounds.max);

    // Populate sizes
    setSizeQuantities((prev) => {
      const initialQtyMap: Record<string, number> = {};
      getUnitRangeSizes(detectedUnit, bounds.min, bounds.max, effectiveHalfStep).forEach((s) => {
        initialQtyMap[s] = 0;
      });
      Object.entries(prev).forEach(([k, q]) => {
        if (q > 0) initialQtyMap[k] = q;
      });
      prod.variants.forEach((v) => {
        const rawKey = v.sizeDisplay || (v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : v.sizeUS.toString());
        const key = normalizeSizeKey(detectedUnit, rawKey);
        if (initialQtyMap[key] === undefined) {
          initialQtyMap[key] = 0;
        }
      });
      return initialQtyMap;
    });

    setShowSkuDropdown(false);
    setShowVendorDropdown(false);
    setShowNameDropdown(false);
  };

  // Auto-fill common product details when SKU is recognized (only in create mode)
  useEffect(() => {
    if (isEditMode) return;
    const trimmed = sku.trim().toUpperCase();
    if (!trimmed) {
      lastLoadedSkuRef.current = '';
      return;
    }

    if (existingMatchingSku.length > 0) {
      if (lastLoadedSkuRef.current !== trimmed) {
        lastLoadedSkuRef.current = trimmed;
        const template = existingMatchingSku[0];
        setVendor(template.brand);
        setName(template.name);
        setCategory(template.category || '休閒鞋');
        if (template.procurementType) {
          setProcurementType(template.procurementType);
        }
        setCostPrice(String(template.costPrice || ''));
        setRetailPrice(String(template.retailPrice || ''));
        setDisplayLoc(template.displayLocation || 'A-01-L1');
        setStorageLoc(template.storageLocation || 'R1-C01-L1');

        // Only prefill color if user hasn't typed one yet
        if (!color.trim()) {
          setColor(template.color);
        }

        // Auto detect unit & range bounds from template or matched existing product
        const detectedUnit = template.sizeUnit || getProductSizeUnit(template);
        setSelectedUnit(detectedUnit);
        const allExistingVariants = matchedExisting ? matchedExisting.variants : template.variants;

        const effectiveHalfStep = typeof template.isHalfStep === 'boolean'
          ? template.isHalfStep
          : (detectedUnit === 'ALPHA'
            ? true
            : detectHasFractionalVariants(allExistingVariants));
        setIsHalfStep(effectiveHalfStep);

        const bounds = detectProductMinMax(allExistingVariants, detectedUnit);
        setMinSize(bounds.min);
        setMaxSize(bounds.max);

        // Initialize sizes from existing template variants while preserving entered quantities
        setSizeQuantities((prev) => {
          const initialQtyMap: Record<string, number> = {};
          // Preserve all existing positive quantities
          Object.entries(prev).forEach(([k, q]) => {
            if (q > 0) initialQtyMap[k] = q;
          });
          getUnitRangeSizes(detectedUnit, bounds.min, bounds.max, effectiveHalfStep).forEach((s) => {
            if (initialQtyMap[s] === undefined) {
              initialQtyMap[s] = 0;
            }
          });
          allExistingVariants.forEach((v) => {
            const rawKey = v.sizeDisplay || (v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : v.sizeUS.toString());
            const key = normalizeSizeKey(detectedUnit, rawKey);
            if (initialQtyMap[key] === undefined) {
              initialQtyMap[key] = 0;
            }
          });
          return initialQtyMap;
        });
      }
    } else {
      if (lastLoadedSkuRef.current) {
        lastLoadedSkuRef.current = '';
        // When clearing/changing away from a loaded SKU, NEVER wipe out entered quantities > 0!
        setSizeQuantities((prev) => {
          const initialMap: Record<string, number> = {};
          Object.entries(prev).forEach(([k, q]) => {
            if (q > 0) initialMap[k] = q;
          });
          getUnitRangeSizes(selectedUnit, minSize, maxSize, isHalfStep).forEach((s) => {
            if (initialMap[s] === undefined) {
              initialMap[s] = 0;
            }
          });
          return initialMap;
        });
      }
    }
  }, [sku, existingMatchingSku, color, selectedUnit, minSize, maxSize]);

  // Switch size unit calculation (US / EUR / JP / ALPHA)
  const handleUnitChange = (newUnit: SizeUnit) => {
    setSelectedUnit(newUnit);
    let newBounds: { min: string; max: string };
    let newHalfStep = true;
    if (editingProduct && editingProduct.variants.length > 0) {
      newBounds = getExpandedUnitBounds(editingProduct.variants, newUnit);
      newHalfStep = newUnit === 'ALPHA' ? true : detectHasFractionalVariants(editingProduct.variants);
    } else if (matchedExisting && matchedExisting.variants.length > 0) {
      newBounds = getExpandedUnitBounds(matchedExisting.variants, newUnit);
      newHalfStep = newUnit === 'ALPHA' ? true : detectHasFractionalVariants(matchedExisting.variants);
    } else {
      newBounds = DEFAULT_UNIT_RANGES[newUnit] || { min: '3.0', max: '13.0' };
      newHalfStep = true;
    }
    setIsHalfStep(newHalfStep);
    setMinSize(newBounds.min);
    setMaxSize(newBounds.max);

    // Add sizes from newly selected unit range while preserving existing quantities > 0
    const nextRange = getUnitRangeSizes(newUnit, newBounds.min, newBounds.max, newHalfStep);
    setSizeQuantities((prev) => {
      const next: Record<string, number> = {};
      Object.entries(prev).forEach(([k, q]) => {
        if (q > 0) next[k] = q;
      });
      nextRange.forEach((s) => {
        if (next[s] === undefined) {
          next[s] = prev[s] || 0;
        }
      });
      return next;
    });
  };

  const handleRangeChange = (newMin: string, newMax: string) => {
    setMinSize(newMin);
    setMaxSize(newMax);
    const nextRange = getUnitRangeSizes(selectedUnit, newMin, newMax, isHalfStep);
    setSizeQuantities((prev) => {
      const next: Record<string, number> = {};
      Object.entries(prev).forEach(([k, q]) => {
        if (q > 0) next[k] = q;
      });
      nextRange.forEach((s) => {
        if (next[s] === undefined) {
          next[s] = prev[s] || 0;
        }
      });
      return next;
    });
  };

  // Active range sizes for current wheel range
  const activeRangeSizes = useMemo(() => {
    return getUnitRangeSizes(selectedUnit, minSize, maxSize, isHalfStep);
  }, [selectedUnit, minSize, maxSize, isHalfStep]);

  // Keys to display in grid: active range sizes PLUS any size with qty > 0 from other ranges / existing
  const visibleSizeKeys = useMemo(() => {
    const keysSet = new Set<string>(activeRangeSizes);
    Object.entries(sizeQuantities).forEach(([k, q]) => {
      if (q > 0) {
        keysSet.add(k);
      }
    });
    if (editingProduct) {
      editingProduct.variants.forEach((v) => {
        const rawKey = v.sizeDisplay || (v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : v.sizeUS.toString());
        const key = normalizeSizeKey(selectedUnit, rawKey);
        const isWhole = isWholeSizeKey(key);
        if (isHalfStep || isWhole || v.stock > 0 || (sizeQuantities[key] || 0) > 0) {
          keysSet.add(key);
        }
      });
    }
    if (matchedExisting) {
      matchedExisting.variants.forEach((v) => {
        const rawKey = v.sizeDisplay || (v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : v.sizeUS.toString());
        const key = normalizeSizeKey(selectedUnit, rawKey);
        const isWhole = isWholeSizeKey(key);
        if (isHalfStep || isWhole || v.stock > 0 || (sizeQuantities[key] || 0) > 0) {
          keysSet.add(key);
        }
      });
    }
    return Array.from(keysSet).sort((a, b) => {
      const idxA = getCanonicalSizeIndex(a, selectedUnit);
      const idxB = getCanonicalSizeIndex(b, selectedUnit);
      if (idxA !== idxB) return idxA - idxB;
      return getSegmentSortRank(a) - getSegmentSortRank(b);
    });
  }, [activeRangeSizes, sizeQuantities, editingProduct, matchedExisting, selectedUnit, isHalfStep]);

  // Toggle half-step interval
  const handleToggleHalfStep = (checked: boolean) => {
    setIsHalfStep(checked);
    if (!checked && selectedUnit !== 'ALPHA') {
      const allWhole = (UNIT_ALL_SIZES[selectedUnit] || UNIT_ALL_SIZES.US).filter(isWholeSizeKey);

      let nextMin = minSize;
      let nextMax = maxSize;

      const minNum = parseFloat(minSize.replace(/[^\d.]/g, ''));
      if (!isNaN(minNum) && !isWholeSizeKey(minSize)) {
        let closest = allWhole[0] || minSize;
        let minDiff = Infinity;
        for (const s of allWhole) {
          const sn = parseFloat(s.replace(/[^\d.]/g, ''));
          const diff = Math.abs(sn - minNum);
          if (diff < minDiff) {
            minDiff = diff;
            closest = s;
          }
        }
        nextMin = closest;
      }

      const maxNum = parseFloat(maxSize.replace(/[^\d.]/g, ''));
      if (!isNaN(maxNum) && !isWholeSizeKey(maxSize)) {
        let closest = allWhole[allWhole.length - 1] || maxSize;
        let minDiff = Infinity;
        for (const s of allWhole) {
          const sn = parseFloat(s.replace(/[^\d.]/g, ''));
          const diff = Math.abs(sn - maxNum);
          if (diff < minDiff) {
            minDiff = diff;
            closest = s;
          }
        }
        nextMax = closest;
      }

      const minIdx = allWhole.indexOf(nextMin);
      const maxIdx = allWhole.indexOf(nextMax);
      if (minIdx !== -1 && maxIdx !== -1 && minIdx > maxIdx) {
        nextMax = nextMin;
      }

      if (nextMin !== minSize || nextMax !== maxSize) {
        setMinSize(nextMin);
        setMaxSize(nextMax);
      }

      const nextRange = getUnitRangeSizes(selectedUnit, nextMin, nextMax, false);
      setSizeQuantities((prev) => {
        const next: Record<string, number> = {};
        Object.entries(prev).forEach(([k, q]) => {
          if (q > 0) next[k] = q;
        });
        nextRange.forEach((s) => {
          if (next[s] === undefined) {
            next[s] = prev[s] || 0;
          }
        });
        return next;
      });
    } else {
      const nextRange = getUnitRangeSizes(selectedUnit, minSize, maxSize, true);
      setSizeQuantities((prev) => {
        const next: Record<string, number> = {};
        Object.entries(prev).forEach(([k, q]) => {
          if (q > 0) next[k] = q;
        });
        nextRange.forEach((s) => {
          if (next[s] === undefined) {
            next[s] = prev[s] || 0;
          }
        });
        return next;
      });
    }
  };

  // Adjust quantity for a size
  const handleQtyChange = (sizeKey: string, delta: number) => {
    setSizeQuantities((prev) => {
      const current = prev[sizeKey] || 0;
      const updated = Math.max(0, current + delta);
      return { ...prev, [sizeKey]: updated };
    });
  };

  const handleQtyInput = (sizeKey: string, val: string) => {
    const num = parseInt(val, 10);
    setSizeQuantities((prev) => ({
      ...prev,
      [sizeKey]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  // Batch action: 各尺碼 +X 雙
  const handleAddAllQty = (delta: number) => {
    setSizeQuantities((prev) => {
      const next = { ...prev };
      activeRangeSizes.forEach((k) => {
        next[k] = Math.max(0, (next[k] || 0) + delta);
      });
      return next;
    });
  };

  // Batch action: 全部歸零
  const handleResetAllQty = () => {
    setSizeQuantities((prev) => {
      const next: Record<string, number> = {};
      Object.keys(prev).forEach((k) => {
        next[k] = 0;
      });
      return next;
    });
  };

  // Total pairs being added across all segments
  const totalStockInPairs = useMemo(() => {
    return Object.values(sizeQuantities).reduce((sum, q) => sum + (q || 0), 0);
  }, [sizeQuantities]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedSku = sku.trim().toUpperCase();
    if (!trimmedSku) {
      alert('請填寫鞋款編號！');
      return;
    }

    if (!isEditMode && totalStockInPairs <= 0) {
      alert('請至少為一個尺碼填寫大於 0 的進貨雙數！');
      return;
    }

    const costNum = parseFloat(costPrice) || 0;
    const retailNum = parseFloat(retailPrice) || (costNum > 0 ? costNum * 1.6 : 0);

    // Edit Mode: update product and direct size stock counts
    if (isEditMode && editingProduct) {
      const dateStr = getTaiwanTodayStr();
      const orderId = `IN-${dateStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const timestamp = new Date().toISOString();
      const effectiveCost = editingProduct.costPrice || 0;
      const stockInId = `stockin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const addedSizeBreakdown: Record<string, number> = {};
      let totalAddedPairs = 0;

      const updatedVariants: ShoeVariant[] = editingProduct.variants.map((v) => {
        const matchEntry = Object.entries(sizeQuantities).find(([sKey]) => isSameSizeVariant(v, sKey));
        const val = matchEntry !== undefined ? matchEntry[1] : v.stock;
        const newStock = Math.max(0, val);
        const added = Math.max(0, newStock - v.stock);

        if (added > 0) {
          const matchKey = matchEntry
            ? matchEntry[0]
            : (v.sizeDisplay || (v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : v.sizeUS.toString()));
          addedSizeBreakdown[matchKey] = (addedSizeBreakdown[matchKey] || 0) + added;
          totalAddedPairs += added;
          return addBatchToVariant(v, added, effectiveCost, stockInId, orderId, timestamp);
        } else if (newStock < v.stock) {
          return deductFifoVariantStock(v, v.stock - newStock, effectiveCost).updatedVariant;
        }

        return {
          ...v,
          stock: newStock,
        };
      });

      // Also append any newly selected sizes that have qty > 0
      Object.entries(sizeQuantities).forEach(([sizeKey, qty]) => {
        if (qty <= 0) return;
        const exists = updatedVariants.some((v) => isSameSizeVariant(v, sizeKey));
        if (!exists) {
          const sizeInfo = resolveVariantSize(sizeKey, selectedUnit);
          const initialBatch = {
            id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            stockInId,
            stockInOrderId: orderId,
            timestamp,
            costPrice: effectiveCost,
            initialStock: qty,
            remainingStock: qty,
          };
          updatedVariants.push({
            id: `var-${editingProduct.id}-${encodeURIComponent(sizeKey).replace(/%/g, '_')}`,
            productId: editingProduct.id,
            sizeUS: sizeInfo.sizeUS,
            sizeEU: sizeInfo.sizeEU,
            sizeCM: sizeInfo.sizeCM,
            sizeDisplay: sizeInfo.sizeDisplay,
            stock: qty,
            batches: [initialBatch],
          });

          addedSizeBreakdown[sizeKey] = (addedSizeBreakdown[sizeKey] || 0) + qty;
          totalAddedPairs += qty;
        }
      });

      const updatedProduct: ProductWithVariants = {
        ...editingProduct,
        sku: trimmedSku,
        brand: vendor.trim() || editingProduct.brand,
        name: name.trim() || editingProduct.name,
        color: color.trim() || editingProduct.color,
        category,
        procurementType,
        costPrice: editingProduct.costPrice !== undefined ? editingProduct.costPrice : costNum,
        retailPrice: retailNum,
        sizeUnit: selectedUnit || editingProduct.sizeUnit,
        minSize: minSize || editingProduct.minSize,
        maxSize: maxSize || editingProduct.maxSize,
        isHalfStep,
        variants: updatedVariants.sort(
          (a, b) => getSegmentSortRank(a.sizeDisplay, a.sizeUS) - getSegmentSortRank(b.sizeDisplay, b.sizeUS)
        ),
      };

      let stockInRecord: StockInRecord | undefined = undefined;
      if (totalAddedPairs > 0) {
        stockInRecord = {
          id: stockInId,
          orderId,
          batchNo: orderId,
          date: dateStr,
          timestamp,
          vendor: vendor.trim() || editingProduct.brand || '自訂廠商',
          sku: trimmedSku,
          productName: name.trim() || editingProduct.name || `${trimmedSku} 鞋款`,
          color: color.trim() || editingProduct.color || '標準色',
          sizeBreakdown: addedSizeBreakdown,
          totalPairs: totalAddedPairs,
          costPerPair: effectiveCost,
          totalCost: effectiveCost * totalAddedPairs,
          procurementType: procurementType || editingProduct.procurementType || '買斷',
          operator: '門市人員',
          notes: '庫存編輯入庫',
          category: category || editingProduct.category,
          retailPrice: retailNum > 0 ? retailNum : editingProduct.retailPrice,
          productId: editingProduct.id,
        };
      }

      if (onSaveEdit) {
        onSaveEdit(updatedProduct, stockInRecord);
      } else {
        onStockInSuccess(updatedProduct, false, stockInRecord);
      }
      if (onClose) onClose();
      return;
    }

    const dateStr = getTaiwanTodayStr();
    const orderId = `IN-${dateStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const sizeBreakdown: Record<string, number> = {};
    Object.entries(sizeQuantities).forEach(([k, q]) => {
      if (q > 0) {
        sizeBreakdown[k] = q;
      }
    });

    const stockInRecord: StockInRecord = {
      id: `stockin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderId,
      date: dateStr,
      timestamp: new Date().toISOString(),
      vendor: vendor.trim() || (matchedExisting?.brand ?? '自訂廠商'),
      sku: trimmedSku,
      productName: name.trim() || (matchedExisting?.name ?? `${trimmedSku} 鞋款`),
      color: color.trim() || (matchedExisting?.color ?? '標準色'),
      sizeBreakdown,
      totalPairs: totalStockInPairs,
      costPerPair: costNum || (matchedExisting?.costPrice ?? 0),
      totalCost: (costNum || (matchedExisting?.costPrice ?? 0)) * totalStockInPairs,
      procurementType,
      operator: '門市人員',
    };

    const effectiveCost = costNum > 0 ? costNum : (matchedExisting?.costPrice || 0);

    if (matchedExisting) {
      // Update existing
      const updatedVariants: ShoeVariant[] = matchedExisting.variants.map((v) => {
        const add = Object.entries(sizeQuantities)
          .filter(([sKey]) => isSameSizeVariant(v, sKey))
          .reduce((sum, [, qty]) => sum + (qty || 0), 0);
        if (add <= 0) return v;
        return addBatchToVariant(v, add, effectiveCost, stockInRecord.id, orderId);
      });

      // Add any new sizes that didn't exist before
      Object.entries(sizeQuantities).forEach(([sizeKey, add]) => {
        if (add <= 0) return;
        const exists = updatedVariants.some((v) => isSameSizeVariant(v, sizeKey));

        if (!exists) {
          const sizeInfo = resolveVariantSize(sizeKey, selectedUnit);
          const initialBatch = {
            id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            stockInId: stockInRecord.id,
            stockInOrderId: orderId,
            timestamp: new Date().toISOString(),
            costPrice: effectiveCost,
            initialStock: add,
            remainingStock: add,
          };
          updatedVariants.push({
            id: `var-${matchedExisting.id}-${encodeURIComponent(sizeKey).replace(/%/g, '_')}`,
            productId: matchedExisting.id,
            sizeUS: sizeInfo.sizeUS,
            sizeEU: sizeInfo.sizeEU,
            sizeCM: sizeInfo.sizeCM,
            sizeDisplay: sizeInfo.sizeDisplay,
            stock: add,
            batches: [initialBatch],
          });
        }
      });

      const updatedProduct: ProductWithVariants = {
        ...matchedExisting,
        brand: vendor.trim() || matchedExisting.brand,
        name: name.trim() || matchedExisting.name,
        color: color.trim() || matchedExisting.color,
        category: category || matchedExisting.category,
        procurementType: procurementType || matchedExisting.procurementType || '買斷',
        costPrice: costNum > 0 ? costNum : matchedExisting.costPrice,
        retailPrice: retailNum > 0 ? retailNum : matchedExisting.retailPrice,
        sizeUnit: selectedUnit || matchedExisting.sizeUnit,
        minSize: minSize || matchedExisting.minSize,
        maxSize: maxSize || matchedExisting.maxSize,
        isHalfStep,
        variants: updatedVariants.sort((a, b) => getSegmentSortRank(a.sizeDisplay, a.sizeUS) - getSegmentSortRank(b.sizeDisplay, b.sizeUS)),
      };

      onStockInSuccess(updatedProduct, false, stockInRecord);
    } else {
      // Create new product (distinct ID for this specific SKU + color)
      const newProductId = `prod-${Date.now()}-${trimmedSku}-${Math.random().toString(36).slice(2, 6)}`;

      const variants: ShoeVariant[] = Object.entries(sizeQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([sizeKey, qty]) => {
          const sizeInfo = resolveVariantSize(sizeKey, selectedUnit);
          const initialBatch = {
            id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            stockInId: stockInRecord.id,
            stockInOrderId: orderId,
            timestamp: new Date().toISOString(),
            costPrice: costNum,
            initialStock: qty || 0,
            remainingStock: qty || 0,
          };
          return {
            id: `var-${newProductId}-${encodeURIComponent(sizeKey).replace(/%/g, '_')}`,
            productId: newProductId,
            sizeUS: sizeInfo.sizeUS,
            sizeEU: sizeInfo.sizeEU,
            sizeCM: sizeInfo.sizeCM,
            sizeDisplay: sizeInfo.sizeDisplay,
            stock: qty || 0,
            batches: [initialBatch],
          };
        }).sort((a, b) => getSegmentSortRank(a.sizeDisplay, a.sizeUS) - getSegmentSortRank(b.sizeDisplay, b.sizeUS));

      const newProduct: ProductWithVariants = {
        id: newProductId,
        sku: trimmedSku,
        brand: vendor.trim() || '自訂廠商',
        name: name.trim() || `${trimmedSku} 鞋款`,
        color: color.trim() || '標準色',
        category,
        procurementType,
        retailPrice: retailNum,
        costPrice: costNum,
        barcode: `${Date.now()}`.slice(-12),
        displayLocation: displayLoc.trim() || 'A-01-L1',
        storageLocation: storageLoc.trim() || 'R1-C01-L1',
        sizeUnit: selectedUnit,
        minSize,
        maxSize,
        isHalfStep,
        variants,
      };

      onStockInSuccess(newProduct, true, stockInRecord);
    }

    // Reset inputs
    setSku('');
    setVendor('');
    setName('');
    setColor('');
    setCostPrice('');
    setRetailPrice('');
    setProcurementType('買斷');
    setSizeQuantities({});
  };

  return (
    <div className={`space-y-4 max-w-lg mx-auto ${isModal ? '' : 'pb-24'}`}>
      {/* Shoe Picker Modal */}
      <ShoePickerModal
        isOpen={isShoePickerOpen}
        onClose={() => setIsShoePickerOpen(false)}
        products={products}
        onSelectProduct={(prod) => {
          handleSelectProduct(prod);
          setIsShoePickerOpen(false);
        }}
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEditMode ? '編輯鞋款庫存' : '智慧進貨入庫'}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {isEditMode ? '修改鞋款基本資訊、價格與各尺碼現有庫存' : '既有款自動載入補貨、新鞋款一鍵分配建檔'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-black flex items-center gap-1">
                ✏️ 編輯模式
              </span>
            ) : matchedExisting ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-black flex items-center gap-1">
                <Check className="w-3 h-3" /> 既有鞋款補貨
              </span>
            ) : existingMatchingSku.length > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-black flex items-center gap-1">
                <PlusCircle className="w-3 h-3" /> 同編號新色建檔
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-black flex items-center gap-1">
                <PlusCircle className="w-3 h-3" /> 全新鞋款建檔
              </span>
            )}
            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-3.5">
          {/* Step 1: Model Code Input with Autocomplete & Shoe Picker */}
          <div className="relative" ref={skuContainerRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                鞋款編號 / 貨號 <span className="text-rose-500">*</span>
              </label>
              {!isEditMode && (
                <button
                  type="button"
                  data-testid="btn-stockin-open-shoe-picker"
                  onClick={() => setIsShoePickerOpen(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition"
                  title="挑選門市現有鞋款"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>挑選現有鞋款</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                data-testid="stockin-input-sku"
                value={sku}
                placeholder="輸入編號或品名（如 FD0655、CW2288）..."
                onChange={(e) => {
                  setSku(e.target.value);
                  setShowSkuDropdown(Boolean(e.target.value.trim()));
                }}
                onFocus={() => {
                  if (sku.trim()) setShowSkuDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowSkuDropdown(false), 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowSkuDropdown(false);
                }}
                autoComplete="off"
                className="w-full text-base font-black pl-3.5 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-600 outline-none transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* SKU Autocomplete dropdown */}
            {!isEditMode && showSkuDropdown && skuSuggestions.length > 0 && (
              <div className="absolute z-40 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 max-h-60 overflow-y-auto">
                <div className="px-3 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 text-[10px] font-black text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                  <span>符合現有鞋款 (點擊自動帶入)</span>
                  <span>共 {skuSuggestions.length} 筆</span>
                </div>
                {skuSuggestions.map((item) => {
                  const totalPairs = item.variants.reduce((acc, v) => acc + Math.max(0, v.stock), 0);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid="stockin-sku-autocomplete-item"
                      onClick={() => handleSelectProduct(item)}
                      className="w-full text-left p-2.5 hover:bg-indigo-50 dark:hover:bg-slate-700/60 flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                          <span className="text-indigo-600 dark:text-indigo-400 mr-1.5">{item.sku}</span>
                          <span>{item.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {item.brand} &bull; {item.color} &bull; {item.category}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          現存 {totalPairs} 雙
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {existingMatchingSku.length > 0 && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                ✓ 找到現有款式（同編號 {existingMatchingSku[0].brand} {existingMatchingSku[0].name}），已為您自動載入款式與價格
              </p>
            )}
          </div>

          {/* Product Details (Auto-filled or editable) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative" ref={vendorContainerRef}>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                廠商 / 品牌 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                data-testid="stockin-input-vendor"
                value={vendor}
                placeholder="例如 Nike、NB、Clarks"
                onChange={(e) => {
                  setVendor(e.target.value);
                  setShowVendorDropdown(true);
                }}
                onFocus={() => setShowVendorDropdown(true)}
                onBlur={() => {
                  setTimeout(() => setShowVendorDropdown(false), 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowVendorDropdown(false);
                }}
                autoComplete="off"
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-600 transition"
              />
              {/* Vendor Autocomplete dropdown */}
              {!isEditMode && showVendorDropdown && vendorSuggestions.length > 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                  <div className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-500">
                    現有廠商清單
                  </div>
                  {vendorSuggestions.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      data-testid="stockin-vendor-autocomplete-item"
                      onClick={() => {
                        setVendor(v.name);
                        setShowVendorDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-slate-700/60 flex items-center justify-between cursor-pointer transition text-xs"
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-100">{v.name}</span>
                      <span className="text-[10px] text-slate-400">{v.count} 款</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={nameContainerRef}>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                品名 / 系列
              </label>
              <input
                type="text"
                data-testid="stockin-input-name"
                value={name}
                placeholder="例如 Air Force 1、9060"
                onChange={(e) => {
                  setName(e.target.value);
                  setShowNameDropdown(true);
                }}
                onFocus={() => {
                  if (name.trim() || nameSuggestions.length > 0) setShowNameDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowNameDropdown(false), 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowNameDropdown(false);
                }}
                autoComplete="off"
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-600 transition"
              />
              {/* Name Autocomplete dropdown */}
              {!isEditMode && showNameDropdown && nameSuggestions.length > 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 max-h-52 overflow-y-auto">
                  <div className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-500">
                    現有品名 / 系列推薦
                  </div>
                  {nameSuggestions.map((item) => (
                    <button
                      key={`${item.brand}-${item.name}-${item.sku}`}
                      type="button"
                      data-testid="stockin-name-autocomplete-item"
                      onClick={() => {
                        setName(item.name);
                        if (!vendor.trim()) {
                          setVendor(item.brand);
                        }
                        if (item.category) {
                          setCategory(item.category);
                        }
                        setShowNameDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-slate-700/60 flex flex-col cursor-pointer transition text-xs"
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {item.brand} &bull; 編號: {item.sku}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                顏色 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                data-testid="stockin-input-color"
                value={color}
                placeholder="例如 純白、黑白、海鹽灰"
                onChange={(e) => setColor(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-600 transition-colors"
              />
              {/* Existing colors clickable tags if same SKU has other colors */}
              {existingColors.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold">已建檔顏色:</span>
                  {existingMatchingSku.map((p) => {
                    const isSelected = p.color.trim().toLowerCase() === color.trim().toLowerCase();
                    const pPairs = p.variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        data-testid={`stockin-color-tag-${p.color}`}
                        onClick={() => {
                          setColor(p.color);
                          if (p.costPrice) setCostPrice(String(p.costPrice));
                          if (p.retailPrice) setRetailPrice(String(p.retailPrice));
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <span>{p.color}</span>
                        <span className={`text-[9px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                          ({pPairs}雙)
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Dynamic status message */}
              {color.trim() && (
                <div className="mt-1">
                  {matchedExisting ? (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                      <span>🟢 匹配既有「{matchedExisting.color}」款式：本次進貨將直接累加各尺碼庫存</span>
                    </p>
                  ) : existingMatchingSku.length > 0 ? (
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black flex items-center gap-1">
                      <span>🔵 檢測為同編號新顏色：將為「{color.trim()}」建立全新鞋款紀錄（保留原 {existingColors.join('、')} 不覆蓋）</span>
                    </p>
                  ) : null}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                鞋款款式
              </label>
              <select
                data-testid="stockin-select-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs font-bold px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              >
                <option value="休閒鞋" label="休閒鞋">休閒鞋</option>
                <option value="運動鞋" label="運動鞋">運動鞋</option>
                <option value="拖鞋" label="拖鞋">拖鞋</option>
                <option value="涼鞋" label="涼鞋">涼鞋</option>
                <option value="包鞋" label="包鞋">包鞋</option>
                <option value="皮鞋" label="皮鞋">皮鞋</option>
                <option value="雨鞋" label="雨鞋">雨鞋</option>
                <option value="長短靴" label="長短靴">長短靴</option>
                <option value="其他" label="其他">其他</option>
              </select>
            </div>
          </div>

          {/* Procurement Type Selector: 買斷 vs 寄賣 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>採購類型（入庫註記）</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-bold">
                {procurementType === '買斷' ? '店家買斷庫存，計入自營成本' : '廠商專櫃寄售，售後結算拆帳'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="stockin-procurement-buyout"
                onClick={() => setProcurementType('買斷')}
                className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  procurementType === '買斷'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${procurementType === '買斷' ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span>🏷️ 買斷 (自營)</span>
              </button>
              <button
                type="button"
                data-testid="stockin-procurement-consignment"
                onClick={() => setProcurementType('寄賣')}
                className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  procurementType === '寄賣'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${procurementType === '寄賣' ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span>📦 寄賣 (寄售)</span>
              </button>
            </div>
          </div>

          {/* Pricing: Cost & Retail */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                  進貨成本 (元)
                </label>
                {isEditMode && (
                  <button
                    type="button"
                    data-testid="badge-cost-locked"
                    onClick={() => setShowCostLockNotice((prev) => !prev)}
                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 cursor-pointer transition select-none flex items-center gap-1"
                    title="點擊查看修訂說明"
                  >
                    <span>批次鎖定 (唯讀)</span>
                    <span className="text-[8px] text-amber-500 font-normal">{showCostLockNotice ? '▲' : '▼'}</span>
                  </button>
                )}
              </div>
              <div
                data-testid="cost-input-container"
                onClick={() => {
                  if (isEditMode) {
                    setShowCostLockNotice((prev) => !prev);
                  }
                }}
                className={`relative ${isEditMode ? 'cursor-pointer' : ''}`}
                title={isEditMode ? '點擊查看批次成本修訂說明' : undefined}
              >
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 select-none">$</span>
                <input
                  type="number"
                  data-testid="stockin-input-cost"
                  value={costPrice}
                  placeholder="成本價"
                  disabled={isEditMode}
                  readOnly={isEditMode}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className={`w-full text-xs font-black pl-6 pr-2 py-2 rounded-lg outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    isEditMode
                      ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-pointer pointer-events-none select-none'
                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-600'
                  }`}
                  title={isEditMode ? '點擊查看批次成本修訂說明' : undefined}
                />
              </div>
              {isEditMode && showCostLockNotice && (
                <div
                  data-testid="cost-edit-locked-notice"
                  className="mt-1.5 p-2.5 rounded-xl bg-amber-50/95 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 space-y-1.5 shadow-sm animate-in fade-in slide-in-from-top-1 duration-150 relative select-none"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCostLockNotice(false);
                    }}
                    className="absolute right-1.5 top-1.5 text-amber-500 hover:text-amber-700 dark:text-amber-400 p-0.5 rounded cursor-pointer"
                    title="關閉提示"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="flex items-start gap-1 font-bold leading-tight pr-4">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>成本由各進貨批次單據管理，庫存清單無法直接修改；如需修改進貨成本，請前往<strong>「進貨紀錄明細」</strong>進行修訂。</span>
                  </div>
                  {onNavigateToRecords && (
                    <button
                      type="button"
                      data-testid="btn-goto-stockin-records"
                      onClick={() => onNavigateToRecords(editingProduct?.sku || sku)}
                      className="w-full py-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-md flex items-center justify-center gap-1 cursor-pointer transition shadow-2xs"
                    >
                      <span>📋 前往「進貨紀錄明細」修改此鞋款成本 &rarr;</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                門市售價 (元)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">$</span>
                <input
                  type="number"
                  data-testid="stockin-input-retail"
                  value={retailPrice}
                  placeholder="建議售價"
                  onChange={(e) => setRetailPrice(e.target.value)}
                  className="w-full text-xs font-black pl-6 pr-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Size Presets & Calculation */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                {isEditMode ? '各尺碼現有庫存調整' : '各尺碼進貨雙數分配'} <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400">
                已選 {Object.values(sizeQuantities).filter((q) => q > 0).length} 碼 / 共 {totalStockInPairs} 雙
              </span>
            </div>

            {/* Row 1 (Top Priority): 尺寸計算規格 (US / EUR / JP / XS~2XL) */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full inline-block"></span>
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                    尺寸計算規格
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    (規格優先選擇)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
                  {SIZE_UNITS.find((u) => u.key === selectedUnit)?.label}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {SIZE_UNITS.map((unit) => {
                  const isSelected = selectedUnit === unit.key;
                  return (
                    <button
                      key={unit.key}
                      type="button"
                      data-testid={`stockin-unit-${unit.key}`}
                      onClick={() => handleUnitChange(unit.key)}
                      className={`text-[11px] font-black py-1.5 px-1 rounded-lg transition-all text-center cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-1 ring-indigo-500'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-slate-800'
                      }`}
                    >
                      {unit.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dual-column Wheel Range Picker */}
            <SizeRangeWheelPicker
              unit={selectedUnit}
              minSize={minSize}
              maxSize={maxSize}
              onRangeChange={handleRangeChange}
              isHalfStep={isHalfStep}
            />

            {/* Cross-range preservation helper banner */}
            {(() => {
              const crossRangeEntries = Object.entries(sizeQuantities).filter(
                ([k, q]) => q > 0 && !activeRangeSizes.includes(k)
              );
              if (crossRangeEntries.length === 0) return null;

              return (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-2 flex flex-wrap items-center justify-between gap-1.5 text-xs text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>
                      已保留 {crossRangeEntries.length} 個區間外尺碼（共 {crossRangeEntries.reduce((s, [, q]) => s + q, 0)} 雙）
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Quick Batch Buttons & Step Control Row: 包含半號間隔勾選、各尺碼 +1 雙與全部歸零 */}
            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              {/* 半號間隔勾選 */}
              <label
                data-testid="stockin-half-step-toggle"
                className={`flex items-center gap-1.5 text-xs font-bold select-none cursor-pointer px-2.5 py-1.5 rounded-lg border transition ${
                  selectedUnit === 'ALPHA'
                    ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
                    : isHalfStep
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  data-testid="stockin-half-step-checkbox"
                  checked={isHalfStep}
                  disabled={selectedUnit === 'ALPHA'}
                  onChange={(e) => handleToggleHalfStep(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                />
                <span className="whitespace-nowrap">半號間隔</span>
              </label>

              {/* Quick Batch Buttons: 各尺碼 +1 雙與全部歸零 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="stockin-batch-add-1"
                  onClick={() => handleAddAllQty(1)}
                  className="text-[11px] font-black px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900 transition border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1 shadow-2xs"
                >
                  <span>各尺碼 +1 雙</span>
                </button>
                <button
                  type="button"
                  data-testid="stockin-batch-reset"
                  onClick={handleResetAllQty}
                  className="text-[11px] font-black px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  全部歸零
                </button>
              </div>
            </div>

            {/* Sizes Grid: 兩側式尺碼卡片列表（無打勾、無卡片空白點擊、加減調整、防止文字截斷） */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
              {visibleSizeKeys.length === 0 ? (
                <div className="col-span-full py-4 text-center text-xs text-slate-400">
                  請設定上方起訖區間以展開尺碼
                </div>
              ) : (
                visibleSizeKeys.map((sizeKey) => {
                  const qty = sizeQuantities[sizeKey] || 0;
                  const isActive = qty > 0;
                  const isCrossRange = !activeRangeSizes.includes(sizeKey) && isActive;
                  const existingVariant = matchedExisting?.variants.find((v) => isSameSizeVariant(v, sizeKey));
                  const currentStock = existingVariant?.stock ?? 0;

                  return (
                    <div
                      key={sizeKey}
                      data-testid={`stockin-size-card-${sizeKey}`}
                      className={`p-2.5 rounded-xl border transition-all select-none flex items-center justify-between gap-2 ${
                        isActive
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-400 shadow-xs ring-1 ring-indigo-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* Left Side: Size Name (whitespace-nowrap) & Existing Stock */}
                      <div className="flex flex-col min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-sm font-black whitespace-nowrap ${
                              isActive
                                ? 'text-indigo-950 dark:text-indigo-100'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {sizeKey}
                          </span>
                          {isCrossRange && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 whitespace-nowrap">
                              區間外
                            </span>
                          )}
                        </div>
                        {matchedExisting && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">
                            現有: {currentStock}雙
                          </div>
                        )}
                      </div>

                      {/* Right Side: [-] Quantity [+] Steppers */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          data-testid={`stockin-size-minus-${sizeKey}`}
                          disabled={qty <= 0}
                          onClick={() => handleQtyChange(sizeKey, -1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-black transition cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                          title="減 1 雙"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          data-testid={`stockin-size-input-${sizeKey}`}
                          value={qty}
                          onChange={(e) => handleQtyInput(sizeKey, e.target.value)}
                          className="w-9 text-center font-black text-xs py-0.5 bg-transparent outline-none text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          data-testid={`stockin-size-plus-${sizeKey}`}
                          onClick={() => handleQtyChange(sizeKey, 1)}
                          className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center font-black cursor-pointer shadow-2xs transition text-xs"
                          title="加 1 雙"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            data-testid="btn-submit-stockin"
            disabled={!isEditMode && totalStockInPairs <= 0}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-black text-base shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer mb-2"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>
              {isEditMode
                ? `儲存修改內容（現存總庫存 ${totalStockInPairs} 雙）`
                : matchedExisting
                ? `確認進貨入庫（累加入庫 ${totalStockInPairs} 雙至既有「${matchedExisting.color}」）`
                : existingMatchingSku.length > 0
                ? `確認進貨入庫（同編號新色「${color.trim() || '新色'}」共 ${totalStockInPairs} 雙）`
                : `確認進貨入庫（全新鞋款共 ${totalStockInPairs} 雙）`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
