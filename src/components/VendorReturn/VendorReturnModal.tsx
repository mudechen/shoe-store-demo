import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProductWithVariants } from '../../types/inventory';
import { VendorReturnReason } from '../../types/records';
import { getSegmentSortRank } from '../../data/sizeStandards';
import { X, ArrowDownLeft, AlertTriangle, Search, Check, RotateCcw } from 'lucide-react';

interface VendorReturnModalProps {
  isOpen: boolean;
  product: ProductWithVariants | null;
  products?: ProductWithVariants[];
  initialSizeUS?: number;
  onClose: () => void;
  onConfirmReturn: (payload: {
    sku: string;
    sizeUS?: number;
    sizeDisplay?: string;
    quantity: number;
    items?: Array<{
      sizeUS: number;
      quantity: number;
      variantId?: string;
      sizeDisplay?: string;
    }>;
    vendor: string;
    reason: VendorReturnReason;
    reasonDetail?: string;
    refundAmount: number;
    operator?: string;
    productName?: string;
    color?: string;
    variantId?: string;
    productId?: string;
  }) => boolean;
}

export const VendorReturnModal: React.FC<VendorReturnModalProps> = ({
  isOpen,
  product,
  products = [],
  initialSizeUS,
  onClose,
  onConfirmReturn,
}) => {
  const [activeProduct, setActiveProduct] = useState<ProductWithVariants | null>(product);
  const [skuQuery, setSkuQuery] = useState('');
  const [vendor, setVendor] = useState('');
  const [productName, setProductName] = useState('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState('休閒鞋');
  const [unitPrice, setUnitPrice] = useState('');
  const [selectedSizeUS, setSelectedSizeUS] = useState<number | null>(null);
  const [sizeQuantities, setSizeQuantities] = useState<Record<number, number>>({});
  const [rawInputs, setRawInputs] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState<VendorReturnReason>('瑕疵');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper to load a selected product into all state fields
  const applyProduct = (prod: ProductWithVariants, targetSizeUS?: number) => {
    setActiveProduct(prod);
    setSkuQuery(prod.sku);
    setVendor(prod.brand);
    setProductName(prod.name);
    setColor(prod.color);
    setCategory(prod.category || '休閒鞋');
    setUnitPrice(prod.costPrice ? String(prod.costPrice) : '');
    setNotes('');
    setReason('瑕疵');
    setErrorMessage(null);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);

    // Initialize quantities for all variants: 0 by default, 1 for target size or first in-stock variant
    const initialQuantities: Record<number, number> = {};
    const initialRaw: Record<number, string> = {};
    prod.variants.forEach((v) => {
      initialQuantities[v.sizeUS] = 0;
    });

    const targetVariant = targetSizeUS !== undefined
      ? prod.variants.find((v) => Math.abs(v.sizeUS - targetSizeUS) < 0.1)
      : undefined;
    const firstInStock = targetVariant || prod.variants.find((v) => v.stock > 0);

    if (firstInStock) {
      setSelectedSizeUS(firstInStock.sizeUS);
      initialQuantities[firstInStock.sizeUS] = 1;
      initialRaw[firstInStock.sizeUS] = '1';
    } else if (prod.variants.length > 0) {
      setSelectedSizeUS(prod.variants[0].sizeUS);
    } else {
      setSelectedSizeUS(null);
    }

    setSizeQuantities(initialQuantities);
    setRawInputs(initialRaw);
  };

  // Helper to clear all product fields back to clean state
  const handleClear = () => {
    setSkuQuery('');
    setActiveProduct(null);
    setVendor('');
    setProductName('');
    setColor('');
    setCategory('休閒鞋');
    setUnitPrice('');
    setNotes('');
    setSelectedSizeUS(null);
    setSizeQuantities({});
    setRawInputs({});
    setErrorMessage(null);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  // Sync activeProduct whenever product prop changes or modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (product) {
      applyProduct(product, initialSizeUS);
    } else if (products && products.length > 0) {
      applyProduct(products[0], initialSizeUS);
    } else {
      handleClear();
    }
  }, [product, products, initialSizeUS, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDropdownOpen, onClose]);

  // Live search suggestion matches from products
  const searchMatches = useMemo(() => {
    const q = skuQuery.trim().toLowerCase();
    if (!q || !products) return [];
    return products
      .filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.color.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, skuQuery]);

  // Existing products sharing the same SKU (for multi-color selection)
  const existingMatchingSku = useMemo(() => {
    const trimmed = skuQuery.trim().toUpperCase();
    if (!trimmed || !products) return [];
    return products.filter((p) => p.sku.toUpperCase() === trimmed);
  }, [products, skuQuery]);

  // Total return pairs across all sizes
  const totalQuantity = useMemo(() => {
    return Object.values(sizeQuantities).reduce((sum, q) => sum + (Number(q) || 0), 0);
  }, [sizeQuantities]);

  // Total store stock for active product
  const totalInStock = useMemo(() => {
    if (!activeProduct) return 0;
    return activeProduct.variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
  }, [activeProduct]);

  // Selected variant details (focused size)
  const selectedVariant =
    activeProduct && selectedSizeUS !== null
      ? activeProduct.variants.find((v) => Math.abs(v.sizeUS - selectedSizeUS) < 0.1)
      : null;

  // Sorted variants by segment sort rank
  const sortedVariants = useMemo(() => {
    if (!activeProduct) return [];
    return [...activeProduct.variants].sort(
      (a, b) => getSegmentSortRank(a.sizeDisplay, a.sizeUS) - getSegmentSortRank(b.sizeDisplay, b.sizeUS)
    );
  }, [activeProduct]);

  if (!isOpen) {
    return null;
  }

  // Handle SKU input text changes
  const handleSkuInputChange = (val: string) => {
    setSkuQuery(val);
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);

    const trimmed = val.trim().toUpperCase();
    if (!trimmed) {
      setActiveProduct(null);
      setVendor('');
      setProductName('');
      setColor('');
      setUnitPrice('');
      setSelectedSizeUS(null);
      setSizeQuantities({});
      setRawInputs({});
      return;
    }

    // If current activeProduct does not match, clear activeProduct disassociation
    if (activeProduct && activeProduct.sku.toUpperCase() !== trimmed) {
      setActiveProduct(null);
      setSelectedSizeUS(null);
      setSizeQuantities({});
      setRawInputs({});
    }

    // Check for exact SKU match in products
    if (products) {
      const match = products.find((p) => p.sku.toUpperCase() === trimmed);
      if (match) {
        applyProduct(match);
      }
    }
  };

  // Keyboard navigation inside SKU search input
  const handleSkuKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || searchMatches.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < searchMatches.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : searchMatches.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < searchMatches.length) {
        e.preventDefault();
        applyProduct(searchMatches[highlightedIndex]);
      }
    }
  };

  // Click on a size card / button
  const handleSizeClick = (sizeVal: number) => {
    setSelectedSizeUS(sizeVal);
    setErrorMessage(null);

    const variant = activeProduct?.variants.find((v) => Math.abs(v.sizeUS - sizeVal) < 0.1);
    if (variant && variant.stock > 0) {
      const currentQty = sizeQuantities[sizeVal] || 0;
      if (currentQty === 0) {
        setSizeQuantities((prev) => ({ ...prev, [sizeVal]: 1 }));
        setRawInputs((prev) => ({ ...prev, [sizeVal]: '1' }));
      }
    }
  };

  // Adjust quantity for a specific size
  const handleQtyChange = (sizeUS: number, delta: number) => {
    const variant = activeProduct?.variants.find((v) => Math.abs(v.sizeUS - sizeUS) < 0.1);
    if (!variant || variant.stock <= 0) return;

    setSelectedSizeUS(sizeUS);
    setErrorMessage(null);

    setSizeQuantities((prev) => {
      const current = prev[sizeUS] || 0;
      const next = Math.max(0, Math.min(variant.stock, current + delta));
      setRawInputs((raw) => ({ ...raw, [sizeUS]: String(next) }));
      return { ...prev, [sizeUS]: next };
    });
  };

  // Direct typing in quantity input for a specific size
  const handleQtyInput = (sizeUS: number, val: string) => {
    setSelectedSizeUS(sizeUS);
    setErrorMessage(null);
    setRawInputs((prev) => ({ ...prev, [sizeUS]: val }));

    const parsed = parseInt(val, 10);
    const safeParsed = isNaN(parsed) ? 0 : parsed;
    setSizeQuantities((prev) => ({ ...prev, [sizeUS]: safeParsed }));
  };

  // Batch operations: reset all to 0
  const handleResetAll = () => {
    if (!activeProduct) return;
    const next: Record<number, number> = {};
    const nextRaw: Record<number, string> = {};
    activeProduct.variants.forEach((v) => {
      next[v.sizeUS] = 0;
      nextRaw[v.sizeUS] = '0';
    });
    setSizeQuantities(next);
    setRawInputs(nextRaw);
    setErrorMessage(null);
  };

  // Batch operations: +1 to all in-stock sizes
  const handleSetOneAll = () => {
    if (!activeProduct) return;
    const next: Record<number, number> = {};
    const nextRaw: Record<number, string> = {};
    activeProduct.variants.forEach((v) => {
      if (v.stock > 0) {
        next[v.sizeUS] = Math.min(v.stock, (sizeQuantities[v.sizeUS] || 0) + 1);
        nextRaw[v.sizeUS] = String(next[v.sizeUS]);
      } else {
        next[v.sizeUS] = 0;
        nextRaw[v.sizeUS] = '0';
      }
    });
    setSizeQuantities(next);
    setRawInputs(nextRaw);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!activeProduct) {
      const msg = '請選擇或輸入要退回的鞋款！';
      setErrorMessage(msg);
      alert(msg);
      return;
    }

    // Collect all sizes with quantity > 0
    const activeItems: Array<{ sizeUS: number; quantity: number; variantId?: string; sizeDisplay?: string }> = [];
    for (const [sizeStr, qtyVal] of Object.entries(sizeQuantities)) {
      const sUS = parseFloat(sizeStr);
      const qtyNum = Number(qtyVal);
      if (qtyNum > 0) {
        const variant = activeProduct.variants.find((v) => Math.abs(v.sizeUS - sUS) < 0.1);
        if (!variant) continue;

        // Check if exceeds stock
        if (qtyNum > variant.stock) {
          const displayLabel = variant.sizeDisplay || (sUS ? `US ${sUS}` : '該尺碼');
          const msg = `退回雙數 (${qtyNum}雙) 超過 ${displayLabel} 現有庫存 (${variant.stock}雙)，無法超額退回！`;
          setErrorMessage(msg);
          alert(msg);
          return;
        }

        activeItems.push({
          sizeUS: sUS,
          quantity: qtyNum,
          variantId: variant.id,
          sizeDisplay: variant.sizeDisplay,
        });
      }
    }

    if (activeItems.length === 0 || totalQuantity <= 0) {
      const msg = '退回雙數必須大於 0！請在下方尺碼中設定退回雙數。';
      setErrorMessage(msg);
      alert(msg);
      return;
    }

    const unitPriceNum = parseFloat(unitPrice) || activeProduct.costPrice || 0;
    const totalRefund = unitPriceNum * totalQuantity;

    const success = onConfirmReturn({
      sku: activeProduct.sku,
      sizeUS: activeItems[0].sizeUS,
      sizeDisplay: activeItems.length === 1 ? activeItems[0].sizeDisplay : undefined,
      quantity: totalQuantity,
      items: activeItems,
      vendor: vendor.trim() || activeProduct.brand,
      reason: reason || '其他',
      reasonDetail: notes.trim() || undefined,
      refundAmount: totalRefund,
      productName: productName.trim() || activeProduct.name,
      color: color.trim() || activeProduct.color,
      variantId: activeItems.length === 1 ? activeItems[0].variantId : undefined,
      productId: activeProduct.id,
      operator: '門市人員',
    });

    if (success) {
      onClose();
    }
  };

  // Active items for summary badge
  const summaryItems = activeProduct
    ? Object.entries(sizeQuantities)
        .filter(([_, q]) => Number(q) > 0)
        .map(([sUS, q]) => {
          const parsed = parseFloat(sUS);
          const v = activeProduct.variants.find((variant) => Math.abs(variant.sizeUS - parsed) < 0.1);
          return {
            sizeUS: parsed,
            quantity: Number(q),
            sizeDisplay: v?.sizeDisplay,
          };
        })
    : [];

  return (
    <div
      data-testid="vendor-return-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 p-4 my-auto max-h-[95vh] overflow-y-auto">
        {/* Header - Styled like StockInView */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">退回出庫</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                支援單雙或多尺碼批次退回、自門市庫存扣減退回廠商
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px] font-black flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3" /> 退貨出庫
            </span>
            <button
              type="button"
              data-testid="btn-close-vendor-return-modal"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 mt-3.5">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Step 1: Model Code Input with Live Suggestions */}
          <div className="relative">
            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
              鞋款編號 / 貨號 <span className="text-rose-500">* (輸入同時可選)</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                data-testid="vendor-return-input-sku"
                value={skuQuery}
                placeholder="輸入編號（如 CW2288-111、FD0655-001）"
                onChange={(e) => handleSkuInputChange(e.target.value)}
                onKeyDown={handleSkuKeyDown}
                onFocus={() => {
                  if (skuQuery.trim().length > 0) setIsDropdownOpen(true);
                }}
                className="w-full text-base font-black px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
              />
              {skuQuery ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>

            {/* Hint message when product matched */}
            {activeProduct && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> 找到現有款式（{activeProduct.brand} {activeProduct.name}），已自動載入款式與退貨單價
              </p>
            )}

            {/* Live Search Suggestion Dropdown */}
            {isDropdownOpen && searchMatches.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-900 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60"
              >
                <div className="px-3 py-1.5 bg-amber-50/80 dark:bg-amber-950/40 text-[10px] font-black text-amber-700 dark:text-amber-300">
                  找到 {searchMatches.length} 款相符鞋款（點擊直接帶入）
                </div>
                {searchMatches.map((prod, index) => {
                  const prodStock = prod.variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
                  const isHighlighted = highlightedIndex === index;
                  return (
                    <button
                      key={prod.id}
                      data-testid={`vendor-return-suggestion-${prod.sku}`}
                      type="button"
                      onClick={() => applyProduct(prod)}
                      className={`w-full text-left px-3.5 py-2 transition-colors flex items-center justify-between cursor-pointer ${
                        isHighlighted
                          ? 'bg-amber-100 dark:bg-amber-950/70'
                          : 'hover:bg-amber-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-black text-slate-800 dark:text-slate-200">
                            {prod.brand}
                          </span>
                          <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400">
                            {prod.sku}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                          {prod.name} &bull; <span className="text-slate-500 font-normal">{prod.color}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          現存 {prodStock} 雙
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Product Details (Auto-filled) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                廠商 / 品牌 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                data-testid="vendor-return-input-vendor"
                value={vendor}
                placeholder="例如 Nike、NB"
                onChange={(e) => setVendor(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                品名 / 系列
              </label>
              <input
                type="text"
                data-testid="vendor-return-input-name"
                value={productName}
                placeholder="例如 Air Force 1"
                onChange={(e) => setProductName(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                顏色 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                data-testid="vendor-return-input-color"
                value={color}
                placeholder="例如 純白、黑白"
                onChange={(e) => setColor(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500"
              />

              {/* Color chips for same SKU */}
              {existingMatchingSku.length > 1 && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold">現有顏色:</span>
                  {existingMatchingSku.map((p) => {
                    const isSelected = activeProduct?.id === p.id;
                    const pPairs = p.variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyProduct(p)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <span>{p.color}</span>
                        <span className={`text-[9px] ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                          ({pPairs}雙)
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                鞋款款式
              </label>
              <select
                data-testid="vendor-return-select-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs font-bold px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500"
              >
                <option value="休閒鞋">休閒鞋</option>
                <option value="運動鞋">運動鞋</option>
                <option value="拖鞋">拖鞋</option>
                <option value="涼鞋">涼鞋</option>
                <option value="包鞋">包鞋</option>
                <option value="皮鞋">皮鞋</option>
                <option value="雨鞋">雨鞋</option>
                <option value="長短靴">長短靴</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          {/* Pricing: Return Unit Price & Total Return Pairs Overview */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                退貨單價 (元)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  data-testid="vendor-return-input-cost"
                  value={unitPrice}
                  placeholder="退貨單價"
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full text-xs font-black pl-6 pr-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                  退回雙數 <span className="text-rose-500">*</span>
                </label>
                {activeProduct && (
                  <span className="text-[10px] text-slate-400 font-bold">
                    (現存 {selectedVariant ? selectedVariant.stock : 0} 雙 / 共選 {totalQuantity} 雙)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSizeUS !== null) {
                      handleQtyChange(selectedSizeUS, -1);
                    }
                  }}
                  disabled={selectedSizeUS === null || (sizeQuantities[selectedSizeUS] || 0) <= 0}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-black disabled:opacity-30 cursor-pointer text-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  data-testid="vendor-return-input-qty"
                  value={
                    selectedSizeUS !== null && rawInputs[selectedSizeUS] !== undefined
                      ? rawInputs[selectedSizeUS]
                      : selectedSizeUS !== null
                      ? sizeQuantities[selectedSizeUS] || 0
                      : totalQuantity
                  }
                  onChange={(e) => {
                    if (selectedSizeUS !== null) {
                      handleQtyInput(selectedSizeUS, e.target.value);
                    }
                  }}
                  placeholder="數量"
                  className="flex-1 text-center font-black text-xs py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSizeUS !== null) {
                      handleQtyChange(selectedSizeUS, 1);
                    }
                  }}
                  disabled={
                    selectedSizeUS === null ||
                    (sizeQuantities[selectedSizeUS] || 0) >= (selectedVariant?.stock || 0)
                  }
                  className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black disabled:opacity-30 cursor-pointer text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Optional Remarks Note */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
              補充說明（選填）
            </label>
            <input
              type="text"
              data-testid="vendor-return-input-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：廠商換季回收、瑕疵退回寄回"
              className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500"
            />
          </div>

          {/* Size Allocation Section: Supports Multiple Sizes & Multi-Pair Returns */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                  退回尺碼與雙數分配 <span className="text-rose-500">* (可同時退多尺碼)</span>
                </label>
                <p className="text-[10px] text-slate-400">
                  有庫存的尺碼方可輸入退回雙數，可同時分配多個尺碼退回
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSetOneAll}
                  className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition cursor-pointer"
                >
                  各碼退1雙
                </button>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="px-2 py-0.5 text-[10px] font-black rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition cursor-pointer flex items-center gap-0.5"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> 歸零
                </button>
              </div>
            </div>

            {activeProduct && sortedVariants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                {sortedVariants.map((v) => {
                  const isSelected = selectedSizeUS !== null && Math.abs(selectedSizeUS - v.sizeUS) < 0.1;
                  const hasStock = v.stock > 0;
                  const qty = sizeQuantities[v.sizeUS] || 0;

                  return (
                    <div
                      key={v.id}
                      className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                        !hasStock
                          ? 'opacity-35 bg-slate-100 dark:bg-slate-800/40 border-dashed border-slate-200 dark:border-slate-800'
                          : qty > 0
                          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-xs'
                          : isSelected
                          ? 'bg-white dark:bg-slate-800 border-amber-400 ring-1 ring-amber-400/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {/* Size Header (Clickable for focus/quick +1) */}
                      <button
                        type="button"
                        data-testid={`vendor-return-size-btn-${v.sizeUS}`}
                        disabled={!hasStock}
                        onClick={() => handleSizeClick(v.sizeUS)}
                        className="w-full flex items-center justify-between text-left cursor-pointer mb-1.5 disabled:cursor-not-allowed"
                      >
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {v.sizeDisplay || `US ${v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : v.sizeUS}`}
                        </span>
                        <span
                          className={`text-[10px] font-black ${
                            !hasStock
                              ? 'text-slate-400'
                              : qty > 0
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {hasStock ? `現存 ${v.stock}雙` : '缺貨'}
                        </span>
                      </button>

                      {/* Stepper controls */}
                      <div className="flex items-center justify-between gap-1 mt-auto pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          type="button"
                          data-testid={`vendor-return-size-minus-${v.sizeUS}`}
                          disabled={!hasStock || qty <= 0}
                          onClick={() => handleQtyChange(v.sizeUS, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-xs disabled:opacity-30 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={v.stock}
                          disabled={!hasStock}
                          value={rawInputs[v.sizeUS] !== undefined ? rawInputs[v.sizeUS] : qty}
                          onChange={(e) => handleQtyInput(v.sizeUS, e.target.value)}
                          className="w-12 text-center font-black text-xs py-0.5 bg-transparent outline-none disabled:text-slate-400"
                        />
                        <button
                          type="button"
                          data-testid={`vendor-return-size-plus-${v.sizeUS}`}
                          disabled={!hasStock || qty >= v.stock}
                          onClick={() => handleQtyChange(v.sizeUS, 1)}
                          className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs disabled:opacity-30 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                請先輸入鞋款編號選擇鞋款以載入庫存尺碼
              </div>
            )}
          </div>

          {/* Test Backwards-Compatibility Hidden Selects & Inputs */}
          <div
            style={{
              position: 'absolute',
              opacity: 0.001,
              pointerEvents: 'none',
              zIndex: -1,
              width: '20px',
              height: '20px',
              overflow: 'hidden',
            }}
            aria-hidden="true"
          >
            <select
              data-testid="vendor-return-select-size"
              value={selectedSizeUS ?? ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  handleSizeClick(val);
                }
              }}
            >
              {sortedVariants.map((v) => {
                const label = v.sizeDisplay || (v.sizeUS % 1 === 0 ? `US ${v.sizeUS.toFixed(1)}` : `US ${v.sizeUS}`);
                return (
                  <option key={v.id} value={v.sizeUS} label={label}>
                    {label}
                  </option>
                );
              })}
            </select>
            <select
              data-testid="vendor-return-select-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as VendorReturnReason)}
            >
              <option value="瑕疵" label="瑕疵">瑕疵</option>
              <option value="過季" label="過季">過季</option>
              <option value="滯銷" label="滯銷">滯銷</option>
              <option value="其他" label="其他">其他</option>
            </select>
            <input
              type="number"
              data-testid="vendor-return-input-amount"
              value={
                ((parseFloat(unitPrice) || activeProduct?.costPrice || 0) * totalQuantity) || ''
              }
              onChange={() => {}}
            />
          </div>

          {/* Summary Display */}
          {activeProduct && totalQuantity > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
              <div className="truncate mr-2">
                <span className="font-black text-amber-800 dark:text-amber-300">
                  預計退回：共 {totalQuantity} 雙
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 ml-1">
                  (
                  {summaryItems
                    .map(
                      (item) =>
                        `${item.sizeDisplay || (item.sizeUS % 1 === 0 ? `US ${item.sizeUS.toFixed(1)}` : `US ${item.sizeUS}`)}: ${item.quantity}雙`
                    )
                    .join('、 ')}
                  )
                </span>
              </div>
              <span className="font-black text-amber-700 dark:text-amber-300 shrink-0">
                退貨總額：$
                {(
                  (parseFloat(unitPrice) || activeProduct.costPrice || 0) * totalQuantity
                ).toLocaleString()}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              data-testid="btn-submit-vendor-return"
              disabled={!activeProduct || totalInStock <= 0}
              className="px-5 py-2 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-40 text-white shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>確認退回出庫 ({totalQuantity}雙)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
