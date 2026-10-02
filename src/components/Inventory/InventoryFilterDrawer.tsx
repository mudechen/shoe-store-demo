import React, { useState, useEffect, useMemo } from 'react';
import { ProductWithVariants, SizeUnit, SizeSegment, ShoeVariant } from '../../types/inventory';
import {
  SIZE_UNITS,
  SEGMENTS,
  getSegmentSizes,
} from '../../data/sizeStandards';
import { X, RotateCcw, SlidersHorizontal, Check, Tag, DollarSign, Box, Layers, AlertTriangle } from 'lucide-react';

export interface SizeFilterItem {
  unit: SizeUnit;
  size: string;
}

export type SizeFilterInput = SizeFilterItem | string | number;

export function normalizeSizeFilter(
  item: SizeFilterInput,
  defaultUnit: SizeUnit = 'US'
): SizeFilterItem {
  if (typeof item === 'object' && item !== null && 'unit' in item && 'size' in item) {
    return item;
  }
  if (typeof item === 'number') {
    const s = item % 1 === 0 ? item.toFixed(1) : String(item);
    return { unit: 'US', size: s };
  }
  const str = String(item).trim();
  if (
    str.startsWith('US:') ||
    str.startsWith('EU:') ||
    str.startsWith('CM:') ||
    str.startsWith('ALPHA:')
  ) {
    const [u, ...rest] = str.split(':');
    return { unit: u as SizeUnit, size: rest.join(':') };
  }
  return { unit: defaultUnit, size: str };
}

export function formatSizeTagLabel(unit: SizeUnit, size: string): string {
  if (unit === 'US') {
    const num = parseFloat(size);
    return !isNaN(num) && num % 1 === 0 ? `US ${num.toFixed(1)}` : `US ${size}`;
  }
  if (unit === 'EU') {
    return `EU ${size}`;
  }
  if (unit === 'CM') {
    return size.includes('段') ? size : `${size} cm`;
  }
  if (unit === 'ALPHA') {
    return `尺碼 ${size}`;
  }
  return `${unit} ${size}`;
}

export function matchVariantToSize(
  v: ShoeVariant,
  unit: SizeUnit,
  targetSize: string
): boolean {
  if (!targetSize) return false;
  const targetClean = targetSize.trim();

  // 1. ALPHA (字母碼：XS, S, M, L, 2L, LL, XL, 2XL, XXL, F...)
  // 該是多少就是多少：只有鞋款真實標示就是該字母碼才匹配，絕不將數字尺碼自動換算為字母
  if (unit === 'ALPHA') {
    if (!v.sizeDisplay) return false;
    const cleanDisplay = v.sizeDisplay.trim().toUpperCase();
    const targetUpper = targetClean.toUpperCase();
    if (cleanDisplay === targetUpper) return true;
    if ((targetUpper === '2L' && cleanDisplay === 'LL') || (targetUpper === 'LL' && cleanDisplay === '2L')) return true;
    if ((targetUpper === '2XL' && cleanDisplay === 'XXL') || (targetUpper === 'XXL' && cleanDisplay === '2XL')) return true;
    return false;
  }

  // 2. US (美碼)
  if (unit === 'US') {
    const targetNum = parseFloat(targetClean);
    if (isNaN(targetNum)) return false;

    if (v.sizeDisplay) {
      const cleanDisplay = v.sizeDisplay.trim();
      const upper = cleanDisplay.toUpperCase();
      // 字母碼非美碼
      if (['XS', 'S', 'M', 'L', '2L', 'LL', 'XL', '2XL', 'XXL', 'F'].includes(upper)) {
        return false;
      }
      // 明確標記 EU 或 CM 非美碼
      if (upper.startsWith('EU') || upper.endsWith('CM') || cleanDisplay.includes('公分') || cleanDisplay.includes('段')) {
        return false;
      }
      const numStr = cleanDisplay.replace(/[CYcy]/g, '').replace(/^US\s*/i, '').trim();
      const numDisplay = parseFloat(numStr);
      if (!isNaN(numDisplay)) {
        // 數值 >= 32 且未明確標記 US，為歐碼非美碼
        if (numDisplay >= 32 && !upper.includes('US')) {
          return false;
        }
        return Math.abs(numDisplay - targetNum) < 0.05;
      }
      return false;
    }

    // 無 sizeDisplay 之標準商品以 sizeUS 比對
    return Math.abs(v.sizeUS - targetNum) < 0.05;
  }

  // 3. EU (歐碼)
  if (unit === 'EU') {
    const targetNum = parseFloat(targetClean);
    if (isNaN(targetNum)) return false;

    if (v.sizeDisplay) {
      const cleanDisplay = v.sizeDisplay.trim();
      const upper = cleanDisplay.toUpperCase();
      // 字母碼非歐碼
      if (['XS', 'S', 'M', 'L', '2L', 'LL', 'XL', '2XL', 'XXL', 'F'].includes(upper)) {
        return false;
      }
      // 明確標記 US 或 CM 非歐碼
      if (upper.startsWith('US') || upper.endsWith('CM') || cleanDisplay.includes('公分') || cleanDisplay.includes('段')) {
        return false;
      }
      const numStr = cleanDisplay.replace(/^EU\s*/i, '').trim();
      const numDisplay = parseFloat(numStr);
      if (!isNaN(numDisplay)) {
        // 數值 < 20 且未明確標記 EU，為美碼非歐碼
        if (numDisplay < 20 && !upper.includes('EU')) {
          return false;
        }
        return Math.abs(numDisplay - targetNum) < 0.25;
      }
      return false;
    }

    // 無 sizeDisplay 之商品，僅在明確存有 sizeEU 且不進行自動換算時比對
    if (v.sizeEU !== undefined) {
      return Math.abs(v.sizeEU - targetNum) < 0.25;
    }
    return false;
  }

  // 4. CM (公分碼 / 日本碼)
  if (unit === 'CM') {
    if (targetClean.includes('童段 20') || targetClean.includes('大人段 20')) {
      if (!v.sizeDisplay) {
        if (targetClean.includes('童段 20') && v.sizeUS <= 2) return true;
        if (targetClean.includes('大人段 20') && v.sizeUS > 2) return true;
        return false;
      }
      if (targetClean.includes('童段 20') && v.sizeDisplay.includes('童段 20')) return true;
      if (targetClean.includes('大人段 20') && v.sizeDisplay.includes('大人段 20')) return true;

      // 若商品當初建檔僅填寫純 "20" 或 "20.0" 或 "20cm"
      const cleanNum = v.sizeDisplay.replace(/[^\d.]/g, '');
      if (cleanNum === '20' || cleanNum === '20.0') {
        if (v.sizeDisplay.includes('童') && targetClean.includes('童段 20')) return true;
        if (v.sizeDisplay.includes('大') && targetClean.includes('大人段 20')) return true;
        if (targetClean.includes('童段 20') && v.sizeUS <= 2) return true;
        if (targetClean.includes('大人段 20') && v.sizeUS > 2) return true;
      }
      return false;
    }

    const targetNum = parseFloat(targetClean.replace(/[^\d.]/g, ''));
    if (isNaN(targetNum)) return false;

    if (v.sizeDisplay) {
      const cleanDisplay = v.sizeDisplay.trim();
      const upper = cleanDisplay.toUpperCase();
      // 字母碼非 CM
      if (['XS', 'S', 'M', 'L', '2L', 'LL', 'XL', '2XL', 'XXL', 'F'].includes(upper)) {
        return false;
      }
      // 明確標記 US 或 EU 非 CM
      if (upper.startsWith('US') || upper.startsWith('EU')) {
        return false;
      }
      if (v.sizeDisplay.includes('童段') || v.sizeDisplay.includes('大人段')) {
        return false;
      }
      const numStr = cleanDisplay.replace(/[^\d.]/g, '');
      const numDisplay = parseFloat(numStr);
      if (!isNaN(numDisplay)) {
        if (numDisplay < 10 && !cleanDisplay.toLowerCase().includes('cm')) {
          return false;
        }
        if (numDisplay > 35 && !cleanDisplay.toLowerCase().includes('cm')) {
          return false;
        }
        return Math.abs(numDisplay - targetNum) < 0.25;
      }
      return false;
    }

    // 無 sizeDisplay 之商品，僅在明確存有 sizeCM 且不進行自動換算時比對
    if (v.sizeCM !== undefined) {
      return Math.abs(v.sizeCM - targetNum) < 0.25;
    }
    return false;
  }

  return false;
}

export interface FilterState {
  selectedVendors: string[]; // empty means all
  selectedSizes: SizeFilterInput[]; // empty means all; matches shoe that has stock > 0 in any selected size
  selectedCategories: string[]; // empty means all
  priceRange: [number, number] | null; // null means unrestricted
  procurementType: 'all' | '買斷' | '寄賣';
  stockStatus: 'all' | 'broken' | 'warning' | 'sufficient';
}

interface InventoryFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductWithVariants[];
  activeFilters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  minPriceBound: number;
  maxPriceBound: number;
}

export const InventoryFilterDrawer: React.FC<InventoryFilterDrawerProps> = ({
  isOpen,
  onClose,
  products,
  activeFilters,
  onApplyFilters,
  minPriceBound,
  maxPriceBound,
}) => {
  // Staged filter state within the drawer
  const [staged, setStaged] = useState<FilterState>(activeFilters);
  const [drawerUnit, setDrawerUnit] = useState<SizeUnit>('US');
  const [drawerSegment, setDrawerSegment] = useState<SizeSegment>('all');

  // Sync staged filters whenever drawer opens or activeFilters change
  useEffect(() => {
    if (isOpen) {
      setStaged(activeFilters);
    }
  }, [isOpen, activeFilters]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract distinct vendors with aggregated product counts and pairs
  const vendorList = useMemo(() => {
    const map = new Map<string, { brand: string; count: number; pairs: number }>();
    products.forEach((p) => {
      const brand = p.brand?.trim() || '未分類廠商';
      const pairs = p.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
      const cur = map.get(brand) || { brand, count: 0, pairs: 0 };
      cur.count += 1;
      cur.pairs += pairs;
      map.set(brand, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.brand.localeCompare(b.brand, 'zh-Hant'));
  }, [products]);

  // Extract distinct categories from current products
  const categoryList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [products]);

  // Standard sizes list based on active unit and segment
  const sizeOptions = useMemo(() => {
    return getSegmentSizes(drawerSegment, drawerUnit);
  }, [drawerSegment, drawerUnit]);

  // Quick lookup set of sizes currently having stock > 0 in store for drawerUnit
  // 嚴格保證：此集合中的尺碼判定與點擊篩選後的 matchVariantToSize 100% 同步，從根源杜絕「亮綠點卻查無鞋款(0雙)」的矛盾
  const sizesInStock = useMemo(() => {
    const set = new Set<string>();
    const inStockVariants = products.flatMap((p) => p.variants).filter((v) => v.stock > 0);

    for (const sz of sizeOptions) {
      if (inStockVariants.some((v) => matchVariantToSize(v, drawerUnit, sz))) {
        set.add(sz);
      }
    }
    return set;
  }, [products, drawerUnit, sizeOptions]);

  // Calculate live matching count under staged filters
  const matchingCount = useMemo(() => {
    return products.filter((prod) => {
      // 1. Vendor
      if (staged.selectedVendors.length > 0) {
        if (!staged.selectedVendors.includes(prod.brand?.trim() || '未分類廠商')) {
          return false;
        }
      }

      // 2. Sizes (must have stock > 0 in any selected size)
      if (staged.selectedSizes.length > 0) {
        const hasStockInSelectedSizes = prod.variants.some((v) => {
          if (v.stock <= 0) return false;
          return staged.selectedSizes.some((raw) => {
            const filterItem = normalizeSizeFilter(raw);
            return matchVariantToSize(v, filterItem.unit, filterItem.size);
          });
        });
        if (!hasStockInSelectedSizes) return false;
      }

      // 3. Category / Style
      if (staged.selectedCategories.length > 0) {
        if (!staged.selectedCategories.includes(prod.category?.trim() || '')) {
          return false;
        }
      }

      // 4. Price range
      if (staged.priceRange !== null) {
        const price = prod.retailPrice || 0;
        if (price < staged.priceRange[0] || price > staged.priceRange[1]) {
          return false;
        }
      }

      // 5. Procurement Type
      const pType = prod.procurementType || '買斷';
      if (staged.procurementType !== 'all' && pType !== staged.procurementType) {
        return false;
      }

      // 6. Stock status
      const totalStock = prod.variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
      const hasOutOfStock = prod.variants.some((v) => v.stock <= 0);
      const hasWarning = prod.variants.some((v) => v.stock > 0 && v.stock <= 2);

      if (staged.stockStatus === 'broken' && !hasOutOfStock) return false;
      if (staged.stockStatus === 'warning' && (!hasWarning || hasOutOfStock)) return false;
      if (staged.stockStatus === 'sufficient' && (totalStock <= 0 || hasOutOfStock || hasWarning)) return false;

      return true;
    }).length;
  }, [products, staged]);

  // Toggle Vendor selection
  const toggleVendor = (brand: string) => {
    setStaged((prev) => {
      const exists = prev.selectedVendors.includes(brand);
      return {
        ...prev,
        selectedVendors: exists
          ? prev.selectedVendors.filter((b) => b !== brand)
          : [...prev.selectedVendors, brand],
      };
    });
  };

  // Toggle Size selection for specified unit
  const toggleSize = (unit: SizeUnit, sizeStr: string) => {
    setStaged((prev) => {
      const list = prev.selectedSizes.map((r) => normalizeSizeFilter(r));
      const exists = list.some((item) => item.unit === unit && item.size === sizeStr);
      return {
        ...prev,
        selectedSizes: exists
          ? list.filter((item) => !(item.unit === unit && item.size === sizeStr))
          : [...list, { unit, size: sizeStr }],
      };
    });
  };

  // Toggle Category selection
  const toggleCategory = (cat: string) => {
    setStaged((prev) => {
      const exists = prev.selectedCategories.includes(cat);
      return {
        ...prev,
        selectedCategories: exists
          ? prev.selectedCategories.filter((c) => c !== cat)
          : [...prev.selectedCategories, cat],
      };
    });
  };

  // Reset all filters to default
  const handleReset = () => {
    setStaged({
      selectedVendors: [],
      selectedSizes: [],
      selectedCategories: [],
      priceRange: null,
      procurementType: 'all',
      stockStatus: 'all',
    });
  };

  // Apply filters and close drawer
  const handleApply = () => {
    onApplyFilters(staged);
    onClose();
  };

  // Count how many non-default filter dimensions are active in staged
  const activeConditionsCount = useMemo(() => {
    let count = 0;
    if (staged.selectedVendors.length > 0) count++;
    if (staged.selectedSizes.length > 0) count++;
    if (staged.selectedCategories.length > 0) count++;
    if (staged.priceRange !== null) count++;
    if (staged.procurementType !== 'all') count++;
    if (staged.stockStatus !== 'all') count++;
    return count;
  }, [staged]);

  const currentPriceRange = staged.priceRange ?? [minPriceBound, maxPriceBound];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        data-testid="filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="進階商品篩選"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md h-[88vh] sm:h-full bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-none sm:rounded-l-3xl shadow-2xl border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-right-8 duration-200"
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  進階庫存篩選
                </h2>
                {activeConditionsCount > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                    已套用 {activeConditionsCount} 項
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                多條件交叉篩選門市在庫商品
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="btn-reset-filters"
              onClick={handleReset}
              className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重設</span>
            </button>
            <button
              type="button"
              data-testid="btn-close-filter-drawer"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="關閉篩選抽屜"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 no-scrollbar">
          {/* Section 1: 廠商 / 品牌 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-indigo-500" />
                <span>廠商 / 品牌</span>
              </label>
              <button
                type="button"
                onClick={() => setStaged((prev) => ({ ...prev, selectedVendors: [] }))}
                className={`text-[11px] font-bold cursor-pointer transition-colors ${
                  staged.selectedVendors.length === 0
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                全部廠商
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {vendorList.map((v) => {
                const isSelected = staged.selectedVendors.includes(v.brand);
                return (
                  <button
                    key={v.brand}
                    type="button"
                    data-testid={`filter-vendor-${v.brand}`}
                    onClick={() => toggleVendor(v.brand)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs scale-102 ring-2 ring-indigo-600/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{v.brand}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected
                          ? 'bg-indigo-700 text-indigo-100'
                          : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {v.pairs}雙
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: 現貨尺碼 (支援多尺規規格: US, EU, JP/CM, ALPHA) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span>現貨尺碼</span>
                {staged.selectedSizes.length > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    已選 {staged.selectedSizes.length} 碼
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-medium hidden xs:inline">
                  點選後僅顯示該碼有現貨之鞋款
                </span>
                {staged.selectedSizes.length > 0 && (
                  <button
                    type="button"
                    data-testid="btn-clear-sizes"
                    onClick={() => setStaged((prev) => ({ ...prev, selectedSizes: [] }))}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
                  >
                    清除尺碼
                  </button>
                )}
              </div>
            </div>

            {/* 尺規切換 (Size Unit Switcher) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              {SIZE_UNITS.map((u) => {
                const isActive = drawerUnit === u.key;
                const unitSelectedCount = staged.selectedSizes.filter((r) => {
                  const item = normalizeSizeFilter(r);
                  return item.unit === u.key;
                }).length;

                return (
                  <button
                    key={u.key}
                    type="button"
                    data-testid={`filter-unit-${u.key}`}
                    onClick={() => setDrawerUnit(u.key)}
                    className={`flex-1 py-1 px-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{u.label}</span>
                    {unitSelectedCount > 0 && (
                      <span
                        className={`text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-black ${
                          isActive
                            ? 'bg-white text-indigo-700'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                        }`}
                      >
                        {unitSelectedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 族群分段過濾 (Segment Selector - 快速縮小範圍) */}
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">族群：</span>
              {SEGMENTS.map((seg) => {
                const isSegActive = drawerSegment === seg.key;
                return (
                  <button
                    key={seg.key}
                    type="button"
                    data-testid={`filter-segment-${seg.key}`}
                    onClick={() => setDrawerSegment(seg.key)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                      isSegActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {seg.label}
                  </button>
                );
              })}
            </div>

            {/* 尺寸按鈕網格 (Size Option Grid with In-stock indicator) */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-52 overflow-y-auto custom-scrollbar p-0.5 border border-slate-100 dark:border-slate-800/80 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
              {sizeOptions.map((sz) => {
                const isSelected = staged.selectedSizes.some((r) => {
                  const item = normalizeSizeFilter(r);
                  return item.unit === drawerUnit && item.size === sz;
                });
                const hasStock = sizesInStock.has(sz);

                let displayLabel = sz;
                if (drawerUnit === 'US') {
                  displayLabel = `US ${sz}`;
                } else if (drawerUnit === 'EU') {
                  displayLabel = `EU ${sz}`;
                } else if (drawerUnit === 'CM') {
                  displayLabel = sz.includes('段') ? sz : `${sz}cm`;
                }

                return (
                  <button
                    key={sz}
                    type="button"
                    data-testid={`filter-size-${sz}`}
                    data-unit={drawerUnit}
                    onClick={() => toggleSize(drawerUnit, sz)}
                    className={`relative py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/30 scale-102 z-10'
                        : hasStock
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-2xs'
                        : 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 hover:bg-slate-150 dark:hover:bg-slate-800'
                    }`}
                  >
                    {hasStock && !isSelected && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1"
                        title="有庫存"
                      />
                    )}
                    <span className="truncate w-full text-center">{displayLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: 款式 / 分類 */}
          {categoryList.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>款式 / 分類</span>
                </label>
                {staged.selectedCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStaged((prev) => ({ ...prev, selectedCategories: [] }))}
                    className="text-[11px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                  >
                    清除
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categoryList.map((cat) => {
                  const isSelected = staged.selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      data-testid={`filter-category-${cat}`}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4: 售價範圍 (Price Slider) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                <span>售價範圍</span>
              </label>
              <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg">
                {staged.priceRange !== null
                  ? `$${staged.priceRange[0].toLocaleString()} ~ $${staged.priceRange[1].toLocaleString()}`
                  : '不限金額 (全部)'}
              </div>
            </div>

            {/* Slider Inputs */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400 font-bold">
                  <span>最低售價</span>
                  <span className="text-slate-700 dark:text-slate-300 font-black">
                    ${currentPriceRange[0].toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  data-testid="filter-price-min"
                  min={minPriceBound}
                  max={maxPriceBound}
                  step={100}
                  value={currentPriceRange[0]}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStaged((prev) => {
                      const cur = prev.priceRange ?? [minPriceBound, maxPriceBound];
                      return {
                        ...prev,
                        priceRange: [Math.min(val, cur[1]), cur[1]],
                      };
                    });
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400 font-bold">
                  <span>最高售價</span>
                  <span className="text-slate-700 dark:text-slate-300 font-black">
                    ${currentPriceRange[1].toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  data-testid="filter-price-max"
                  min={minPriceBound}
                  max={maxPriceBound}
                  step={100}
                  value={currentPriceRange[1]}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStaged((prev) => {
                      const cur = prev.priceRange ?? [minPriceBound, maxPriceBound];
                      return {
                        ...prev,
                        priceRange: [cur[0], Math.max(val, cur[0])],
                      };
                    });
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Price Preset Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setStaged((prev) => ({
                      ...prev,
                      priceRange: null,
                    }))
                  }
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shrink-0 cursor-pointer transition-colors ${
                    staged.priceRange === null
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  不限金額
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStaged((prev) => ({
                      ...prev,
                      priceRange: [minPriceBound, Math.min(2000, maxPriceBound)],
                    }))
                  }
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 shrink-0 cursor-pointer"
                >
                  $2,000 以下
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStaged((prev) => ({
                      ...prev,
                      priceRange: [Math.max(minPriceBound, 2000), Math.min(3500, maxPriceBound)],
                    }))
                  }
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 shrink-0 cursor-pointer"
                >
                  $2,000 ~ $3,500
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStaged((prev) => ({
                      ...prev,
                      priceRange: [Math.max(minPriceBound, 3500), maxPriceBound],
                    }))
                  }
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 shrink-0 cursor-pointer"
                >
                  $3,500 以上
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: 採購模式 (買斷 / 寄賣) */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>採購模式</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                data-testid="filter-procurement-all"
                onClick={() => setStaged((prev) => ({ ...prev, procurementType: 'all' }))}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                  staged.procurementType === 'all'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                全量模式
              </button>
              <button
                type="button"
                data-testid="filter-procurement-buyout"
                onClick={() => setStaged((prev) => ({ ...prev, procurementType: '買斷' }))}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  staged.procurementType === '買斷'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>買斷自營</span>
              </button>
              <button
                type="button"
                data-testid="filter-procurement-consignment"
                onClick={() => setStaged((prev) => ({ ...prev, procurementType: '寄賣' }))}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  staged.procurementType === '寄賣'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>廠商寄賣</span>
              </button>
            </div>
          </div>

          {/* Section 6: 庫存狀態 */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>庫存狀態</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                data-testid="filter-status-all"
                onClick={() => setStaged((prev) => ({ ...prev, stockStatus: 'all' }))}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                  staged.stockStatus === 'all'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                全量
              </button>
              <button
                type="button"
                data-testid="filter-status-broken"
                onClick={() => setStaged((prev) => ({ ...prev, stockStatus: 'broken' }))}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  staged.stockStatus === 'broken'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>斷碼款</span>
              </button>
              <button
                type="button"
                data-testid="filter-status-warning"
                onClick={() => setStaged((prev) => ({ ...prev, stockStatus: 'warning' }))}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  staged.stockStatus === 'warning'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                <span>緊張款</span>
              </button>
              <button
                type="button"
                data-testid="filter-status-sufficient"
                onClick={() => setStaged((prev) => ({ ...prev, stockStatus: 'sufficient' }))}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  staged.stockStatus === 'sufficient'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>充足款</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 shrink-0">
          <button
            type="button"
            data-testid="btn-apply-filters"
            onClick={handleApply}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>查看結果 (符合 {matchingCount} 款鞋)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
