import React, { useState, useMemo, useRef } from 'react';
import { ProductWithVariants, SizeUnit, ShoeVariant } from '../../types/inventory';
import { ReservationRecord, ReservationStatus } from '../../types/reservations';
import { ShoeCategory, SHOE_CATEGORIES } from '../../types/sales';
import {
  SIZE_UNITS,
  resolveVariantSize,
  parseSizeToNumeric,
  getProductSizeUnit,
  getProductFullDisplayVariants,
} from '../../data/sizeStandards';
import {
  CalendarClock,
  Search,
  X,
  Plus,
  Phone,
  CheckCircle2,
  PackageCheck,
  Clock,
  Check,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { getTaiwanTodayStr } from '../../utils/dateUtils';

interface CustomerReservationViewProps {
  products: ProductWithVariants[];
  reservations: ReservationRecord[];
  onCreateReservation: (record: Omit<ReservationRecord, 'id' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: ReservationStatus) => void;
  onOpenFulfillModal: (reservation: ReservationRecord) => void;
  onDeleteReservation?: (id: string) => void;
}

export const CustomerReservationView: React.FC<CustomerReservationViewProps> = ({
  products,
  reservations,
  onCreateReservation,
  onUpdateStatus,
  onOpenFulfillModal,
  onDeleteReservation,
}) => {
  // Form States
  const [skuQuery, setSkuQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<SizeUnit>('US');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedSizeDisplay, setSelectedSizeDisplay] = useState<string>('');
  const [customSizeText, setCustomSizeText] = useState('');
  const [price, setPrice] = useState<string>('');
  const [deposit, setDeposit] = useState<string>('0');
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState('');

  // List Filter State
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending_arrival' | 'arrived_ready' | 'completed' | 'cancelled'>('all');

  const inputRef = useRef<HTMLInputElement>(null);

  // Autocomplete matching products
  const searchMatches = useMemo(() => {
    const q = skuQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
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


  // Find matching variant from product variants (Strict exact match, ZERO cross-unit conversion!)
  const findVariantForSize = (product: ProductWithVariants, sizeKey: string, unit: SizeUnit): ShoeVariant | undefined => {
    const trimmed = sizeKey.trim();
    const cleanKey = trimmed.replace(/^US\s*/i, '').replace(/[CYcy]/g, '').trim();
    const numKey = parseFloat(cleanKey);

    return product.variants.find((v) => {
      const vDisplay = (v.sizeDisplay || '').trim();
      const cleanV = vDisplay.replace(/^US\s*/i, '').replace(/[CYcy]/g, '').trim();
      const numV = parseFloat(cleanV);

      // 1. Direct exact string match on sizeDisplay
      if (vDisplay && (vDisplay === trimmed || cleanV === cleanKey)) return true;

      // 2. Strict exact match within the same size standard (never cross-convert!)
      if (unit === 'ALPHA') {
        const vUpper = vDisplay.toUpperCase();
        const tUpper = trimmed.toUpperCase();
        if (vUpper === tUpper) return true;
        if ((tUpper === '2L' && vUpper === 'LL') || (tUpper === 'LL' && vUpper === '2L')) return true;
        if ((tUpper === '2XL' && vUpper === 'XXL') || (tUpper === 'XXL' && vUpper === '2XL')) return true;
        return false;
      }

      if (unit === 'CM') {
        if (trimmed.includes('童') !== vDisplay.includes('童')) return false;
        if (trimmed.includes('大') !== vDisplay.includes('大')) return false;
        if (!isNaN(numKey)) {
          if (!isNaN(numV) && Math.abs(numV - numKey) < 0.1) return true;
          if (v.sizeCM !== undefined && Math.abs(v.sizeCM - numKey) < 0.1) return true;
        }
        return false;
      }

      if (unit === 'EU') {
        // EU numbers are strictly >= 20
        if (!isNaN(numKey) && numKey >= 20) {
          if (!isNaN(numV) && numV >= 20 && Math.abs(numV - numKey) < 0.25) return true;
          if (v.sizeEU !== undefined && v.sizeEU >= 20 && Math.abs(v.sizeEU - numKey) < 0.25) return true;
        }
        return false;
      }

      if (unit === 'US') {
        // US numbers are strictly < 20
        if (!isNaN(numKey) && numKey < 20) {
          if (!isNaN(numV) && numV < 20 && Math.abs(numV - numKey) < 0.05) return true;
          if (v.sizeUS !== undefined && v.sizeUS < 20 && Math.abs(v.sizeUS - numKey) < 0.05) return true;
        }
        return false;
      }

      return false;
    });
  };

  // Full display variants according to Rule 14 (minSize ~ maxSize, preserving existing variants)
  const displayVariants = useMemo(() => {
    if (!selectedProduct) return [];
    return getProductFullDisplayVariants(selectedProduct);
  }, [selectedProduct]);

  // Handle product selection
  const handleSelectProduct = (prod: ProductWithVariants) => {
    setSelectedProduct(prod);
    setSkuQuery(prod.sku);
    setPrice(String(prod.retailPrice || ''));

    // Directly lock to the product's native size unit chosen in inventory list (Zero auto cross-conversion)
    const productUnit = prod.sizeUnit || getProductSizeUnit(prod);
    setSelectedUnit(productUnit);

    // By default select the first out-of-stock size or first size in full display variants
    const displayVars = getProductFullDisplayVariants(prod);
    const outOfStockVariant = displayVars.find((v) => v.stock <= 0);
    const firstVariant = displayVars[0];
    const initialVar = outOfStockVariant || firstVariant;

    if (initialVar) {
      setSelectedSize(initialVar.sizeUS);
      const label = initialVar.sizeDisplay
        ? initialVar.sizeDisplay.trim()
        : `${initialVar.sizeUS}`;
      setSelectedSizeDisplay(label);
      setCustomSizeText('');
    } else {
      setSelectedSize(null);
      setSelectedSizeDisplay('');
      setCustomSizeText('');
    }

    setIsDropdownOpen(false);
  };

  const handleSelectVariant = (v: ShoeVariant) => {
    const displayLabel = v.sizeDisplay || (v.sizeUS ? (v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : String(v.sizeUS)) : '');
    setSelectedSize(v.sizeUS || parseSizeToNumeric(displayLabel) || null);
    setSelectedSizeDisplay(displayLabel);
    setCustomSizeText('');
  };

  const handleResetForm = () => {
    setSkuQuery('');
    setSelectedProduct(null);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedSize(null);
    setSelectedSizeDisplay('');
    setCustomSizeText('');
    setSelectedUnit('US');
    setPrice('');
    setDeposit('0');
    setDepositPaymentMethod('cash');
    setNotes('');
    setIsDropdownOpen(false);
  };

  // Quick Deposit Setter
  const handleQuickDeposit = (type: 'zero' | '500' | '1000' | 'full') => {
    const total = parseFloat(price) || 0;
    if (type === 'zero') setDeposit('0');
    else if (type === '500') setDeposit(String(Math.min(500, total)));
    else if (type === '1000') setDeposit(String(Math.min(1000, total)));
    else if (type === 'full') setDeposit(String(total));
  };

  // Submit Reservation
  const handleSubmitReservation = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      alert('請先選擇要預訂的鞋款編號！');
      return;
    }

    if (!customerName.trim()) {
      alert('請填寫客戶姓名！');
      return;
    }

    if (!customerPhone.trim()) {
      alert('請填寫客戶聯絡電話！');
      return;
    }

    if (selectedSize === null && !customSizeText.trim() && !selectedSizeDisplay.trim()) {
      alert('請選擇或指定預訂尺碼！');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('請輸入有效的預訂售價！');
      return;
    }

    const parsedDeposit = parseFloat(deposit) || 0;
    if (parsedDeposit < 0 || parsedDeposit > parsedPrice) {
      alert('定金金額不得小於 0 且不得大於預定總價！');
      return;
    }

    const finalSizeDisplay =
      customSizeText.trim() ||
      selectedSizeDisplay ||
      (selectedSize !== null ? `${selectedSize}` : '標準碼');

    const resolved = resolveVariantSize(finalSizeDisplay, selectedUnit);
    const matchedVariant = findVariantForSize(selectedProduct, finalSizeDisplay, selectedUnit);

    const matchedCategory = SHOE_CATEGORIES.includes(selectedProduct.category as ShoeCategory)
      ? (selectedProduct.category as ShoeCategory)
      : '運動鞋';

    const numericSizeUS =
      typeof resolved.sizeUS === 'number' && resolved.sizeUS > 0
        ? resolved.sizeUS
        : typeof selectedSize === 'number'
        ? selectedSize
        : matchedVariant?.sizeUS || 0;

    onCreateReservation({
      businessDate: getTaiwanTodayStr(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      brand: selectedProduct.brand,
      sku: selectedProduct.sku.trim().toUpperCase(),
      productName: selectedProduct.name,
      color: selectedProduct.color,
      sizeUS: numericSizeUS,
      sizeDisplay: finalSizeDisplay,
      category: matchedCategory,
      retailPrice: parsedPrice,
      depositPaid: parsedDeposit,
      remainingBalance: Math.max(0, parsedPrice - parsedDeposit),
      depositPaymentMethod,
      status: 'pending_arrival',
      notes: notes.trim(),
      productId: selectedProduct.id,
      variantId: matchedVariant?.id,
    });

    handleResetForm();
  };

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    if (activeFilter === 'all') return reservations;
    return reservations.filter((r) => r.status === activeFilter);
  }, [reservations, activeFilter]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: reservations.length,
      pending_arrival: reservations.filter((r) => r.status === 'pending_arrival').length,
      arrived_ready: reservations.filter((r) => r.status === 'arrived_ready').length,
      completed: reservations.filter((r) => r.status === 'completed').length,
      cancelled: reservations.filter((r) => r.status === 'cancelled').length,
    };
  }, [reservations]);

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* Reservation Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">客戶缺貨預訂</h2>
              <p className="text-[11px] text-slate-500 font-medium">斷碼留單登記 ➔ 到貨通知 ➔ 取貨轉銷貨</p>
            </div>
          </div>
          {skuQuery && (
            <button
              type="button"
              onClick={handleResetForm}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold cursor-pointer"
            >
              清空
            </button>
          )}
        </div>

        <form onSubmit={handleSubmitReservation} className="space-y-3.5 mt-3.5">
          {/* Step 1: Shoe Model / SKU Search */}
          <div className="relative">
            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
              預訂鞋款編號 / 貨號 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                data-testid="reservation-sku-input"
                type="text"
                value={skuQuery}
                placeholder="輸入鞋款編號或名稱 (如 CW、AF1...)"
                onChange={(e) => {
                  setSkuQuery(e.target.value);
                  setIsDropdownOpen(true);
                  if (selectedProduct && selectedProduct.sku !== e.target.value) {
                    setSelectedProduct(null);
                  }
                }}
                onFocus={() => {
                  if (skuQuery.trim().length > 0) setIsDropdownOpen(true);
                }}
                className="w-full text-base font-black px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
              />
              {skuQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSkuQuery('');
                    setSelectedProduct(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Live Search Dropdown */}
            {isDropdownOpen && searchMatches.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-900 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                <div className="px-3 py-1.5 bg-amber-50/80 dark:bg-amber-950/40 text-[10px] font-black text-amber-700 dark:text-amber-300">
                  找到 {searchMatches.length} 款相符鞋款（點擊帶入預訂）
                </div>
                {searchMatches.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectProduct(prod)}
                    className="w-full text-left px-3.5 py-2 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between cursor-pointer"
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
                      <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                        ${prod.retailPrice}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProduct && (
            <>
              {/* Selected Shoe Info Card */}
              <div className="p-3 bg-amber-50/60 dark:bg-slate-800/80 border border-amber-100 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-black text-slate-800 dark:text-slate-200">
                      {selectedProduct.brand}
                    </span>
                    <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400">
                      {selectedProduct.sku}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                      {selectedProduct.category}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedProduct.name} &bull; <span className="text-slate-500 font-normal">{selectedProduct.color}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-2.5 py-1 text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-700 border border-amber-200 dark:border-slate-600 rounded-lg font-black transition-colors cursor-pointer"
                >
                  更換
                </button>
              </div>

              {/* Step 2: Size Selection (Unit switching, segment presets, and live stock indicator) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      選擇預訂尺寸 <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                      可自選斷碼預訂
                    </span>
                  </div>
                  {(customSizeText.trim() || selectedSizeDisplay) && (
                    <span className="text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-700">
                      已選：{customSizeText.trim() || selectedSizeDisplay}
                    </span>
                  )}
                </div>

                {/* Product Native Size Unit (Follows inventory list, never cross-converted) */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full inline-block"></span>
                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      商品庫存尺規
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      (依庫存清單規格，不跨單位轉換)
                    </span>
                  </div>
                  <span
                    data-testid="reservation-active-unit"
                    className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60"
                  >
                    {SIZE_UNITS.find((u) => u.key === selectedUnit)?.label}
                  </span>
                </div>

                {/* Sizes Grid (Full range display from minSize to maxSize, out-of-stock sizes remain clickable) */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-56 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  {displayVariants.map((v) => {
                    const displayLabel = v.sizeDisplay || (v.sizeUS ? (v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : String(v.sizeUS)) : '');
                    const testIdKey = displayLabel;
                    const isOutOfStock = v.stock <= 0;
                    const isSelected =
                      !customSizeText.trim() &&
                      (selectedSizeDisplay === displayLabel ||
                        (selectedSize !== null && selectedUnit === 'US' && v.sizeUS === selectedSize));

                    return (
                      <button
                        key={v.id}
                        type="button"
                        data-testid={`reservation-size-${testIdKey}`}
                        onClick={() => handleSelectVariant(v)}
                        className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30 ring-2 ring-amber-500/20 scale-[1.02]'
                            : isOutOfStock
                            ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-dashed border-amber-300 dark:border-amber-800/80 hover:bg-amber-50/50'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <div className="text-xs font-black truncate">
                          {displayLabel}
                        </div>
                        <div
                          className={`text-[9px] font-bold leading-none mt-0.5 ${
                            isSelected
                              ? 'text-amber-100'
                              : isOutOfStock
                              ? 'text-rose-500 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isOutOfStock ? '無現貨 (0雙)' : `剩 ${v.stock} 雙`}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Size Text Input */}
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    自訂特殊尺碼：
                  </span>
                  <input
                    type="text"
                    value={customSizeText}
                    placeholder="非規格尺碼可在此直接手動輸入 (例如 24.5、XL、48 特大)"
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomSizeText(val);
                      setSelectedSizeDisplay(val);
                      const resolved = resolveVariantSize(val, selectedUnit);
                      setSelectedSize(resolved.sizeUS || parseSizeToNumeric(val) || null);
                    }}
                    className="flex-1 text-xs font-bold px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Step 3: Customer Information */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                    顧客姓名 / 稱呼 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    data-testid="reservation-customer-name"
                    type="text"
                    value={customerName}
                    placeholder="例如：陳先生、林小姐"
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs font-black px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                    聯絡手機 / 電話 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    data-testid="reservation-customer-phone"
                    type="tel"
                    value={customerPhone}
                    placeholder="0912-345-678"
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full text-xs font-black px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Step 4: Price & Deposit & Balance */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                      預定售價 (全額)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full text-sm font-black pl-6 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                        已收定金
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickDeposit('zero')}
                          className="text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                        >
                          免定金
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickDeposit('500')}
                          className="text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                        >
                          $500
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickDeposit('full')}
                          className="text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                        >
                          全付
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        value={deposit}
                        onChange={(e) => setDeposit(e.target.value)}
                        className="w-full text-sm font-black pl-6 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 outline-none font-mono text-emerald-600 dark:text-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-bold">定金支付:</span>
                    <select
                      value={depositPaymentMethod}
                      onChange={(e) => setDepositPaymentMethod(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                    >
                      <option value="cash">現金</option>
                      <option value="credit">信用卡</option>
                      <option value="mobile_pay">行動支付</option>
                      <option value="transfer">匯款轉帳</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold">取貨尾款:</span>
                    <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                      ${Math.max(0, (parseFloat(price) || 0) - (parseFloat(deposit) || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 5: Notes */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                  預訂備註 (選填)
                </label>
                <input
                  type="text"
                  value={notes}
                  placeholder="例如：客人週六前要、到貨先留鞋盒完整"
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                data-testid="btn-submit-reservation"
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>確認建立客戶預訂單</span>
              </button>
            </>
          )}
        </form>
      </div>

      {/* Reservation Management List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              門市預訂單列表
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              共 {reservations.length} 筆
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all' as const, label: '全部', count: counts.all },
            { id: 'pending_arrival' as const, label: '待到貨', count: counts.pending_arrival, color: 'text-amber-600' },
            { id: 'arrived_ready' as const, label: '已到貨待取', count: counts.arrived_ready, color: 'text-emerald-600' },
            { id: 'completed' as const, label: '已取貨', count: counts.completed },
            { id: 'cancelled' as const, label: '已取消', count: counts.cancelled },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`reservation-filter-${tab.id}`}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`ml-1 text-[10px] font-black ${activeFilter === tab.id ? 'opacity-80' : tab.color || 'opacity-60'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List Content */}
        {filteredReservations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-bold">
            目前無符合條件的客戶預訂單
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredReservations.map((item) => {
              const isPending = item.status === 'pending_arrival';
              const isArrived = item.status === 'arrived_ready';
              const isDone = item.status === 'completed';
              const isCancelled = item.status === 'cancelled';

              return (
                <div
                  key={item.id}
                  data-testid={`reservation-card-${item.id}`}
                  className={`p-3 rounded-xl border transition-all ${
                    isArrived
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-xs ring-1 ring-emerald-500/20'
                      : isPending
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-80'
                  }`}
                >
                  {/* Top Bar: Customer Name & Status Badge */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {item.customerName}
                      </span>
                      <a
                        href={`tel:${item.customerPhone}`}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        title="撥打電話"
                      >
                        <Phone className="w-3 h-3" />
                        {item.customerPhone}
                      </a>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex items-center gap-1.5">
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-black">
                          <Clock className="w-3 h-3" />
                          待進貨到貨
                        </span>
                      )}
                      {isArrived && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black animate-pulse">
                          <PackageCheck className="w-3 h-3" />
                          已到貨 &bull; 待取貨
                        </span>
                      )}
                      {isDone && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black">
                          <Check className="w-3 h-3" />
                          取貨完成
                        </span>
                      )}
                      {isCancelled && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold">
                          已取消
                        </span>
                      )}

                      {onDeleteReservation && (
                        <button
                          type="button"
                          data-testid={`btn-delete-reservation-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`確定要刪除客戶【${item.customerName}】的預訂紀錄（${item.sku} ${item.sizeDisplay}）嗎？此操作將永久刪除此單據。`)) {
                              onDeleteReservation(item.id);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                          title="刪除此筆預訂紀錄"
                          aria-label="刪除預訂"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Shoe & Size Details */}
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-bold mb-1">
                    {item.brand} &bull; {item.productName} ({item.color})
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[10px] font-black">
                        {item.sku}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black text-[10px]">
                        {item.sizeDisplay}
                      </span>
                    </div>

                    {/* Money breakdown */}
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <span>總價 ${item.retailPrice}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        已付定金 ${item.depositPaid}
                      </span>
                      <span className="text-amber-600 dark:text-amber-400 font-black">
                        尾款 ${item.remainingBalance}
                      </span>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="text-[10px] text-slate-500 font-medium mt-1 bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded">
                      備註：{item.notes}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {(isPending || isArrived) && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-1.5">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(item.id, 'cancelled')}
                            className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          >
                            取消預訂
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-mark-arrived-${item.id}`}
                            onClick={() => onUpdateStatus(item.id, 'arrived_ready')}
                            className="px-2.5 py-1 text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 transition cursor-pointer flex items-center gap-1"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>標記已到貨</span>
                          </button>
                        </>
                      )}

                      {isArrived && (
                        <>
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(item.id, 'pending_arrival')}
                            className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          >
                            改回待到貨
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-fulfill-reservation-${item.id}`}
                            onClick={() => onOpenFulfillModal(item)}
                            className="px-3 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-sm shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>取貨結算轉銷貨</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
