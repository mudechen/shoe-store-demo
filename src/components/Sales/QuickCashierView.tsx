import React, { useState, useMemo, useRef } from 'react';
import { ProductWithVariants } from '../../types/inventory';
import { SaleRecord, ShoeCategory, SHOE_CATEGORIES, PaymentMethod, PAYMENT_METHODS } from '../../types/sales';
import { Check, Search, Trash2, ShoppingBag, X } from 'lucide-react';
import { getTaiwanTodayStr } from '../../utils/dateUtils';
import { formatSaleSizeDisplay, getProductFullDisplayVariants } from '../../data/sizeStandards';

interface QuickCashierViewProps {
  products: ProductWithVariants[];
  todaySales: SaleRecord[];
  onCompleteSale: (sale: Omit<SaleRecord, 'id' | 'timestamp'>) => void;
  onVoidSale: (saleId: string) => void;
}

export const QuickCashierView: React.FC<QuickCashierViewProps> = ({
  products,
  todaySales,
  onCompleteSale,
  onVoidSale,
}) => {
  // Input fields
  const [skuQuery, setSkuQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);

  const [category, setCategory] = useState<ShoeCategory>('運動鞋');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [price, setPrice] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time live filtering for shoe model number / SKU / Name
  const searchMatches = useMemo(() => {
    const q = skuQuery.trim().toLowerCase();
    if (!q) {
      // If dropdown is open but query is empty, show up to 8 existing products
      return products.slice(0, 8);
    }
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [products, skuQuery]);

  // Handle selecting a shoe from the live filter
  const handleSelectProduct = (prod: ProductWithVariants) => {
    setSelectedProduct(prod);
    setSkuQuery(prod.sku);
    // Cast or map category
    const matchedCategory = SHOE_CATEGORIES.includes(prod.category as ShoeCategory)
      ? (prod.category as ShoeCategory)
      : '運動鞋';
    setCategory(matchedCategory);
    setPrice(String(prod.retailPrice));

    // Default select first in-stock size if available
    const firstInStock = prod.variants.find((v) => v.stock > 0);
    setSelectedSize(firstInStock ? firstInStock.sizeUS : null);
    setSelectedVariantId(firstInStock ? firstInStock.id : null);

    setIsDropdownOpen(false);
  };

  // Full display variants according to Rule 14 (minSize ~ maxSize, preserving existing variants)
  const displayVariants = useMemo(() => {
    return selectedProduct ? getProductFullDisplayVariants(selectedProduct) : [];
  }, [selectedProduct]);

  // Reset form after successful checkout
  const handleResetForm = () => {
    setSkuQuery('');
    setSelectedProduct(null);
    setCategory('運動鞋');
    setSelectedSize(null);
    setSelectedVariantId(null);
    setPrice('');
    setNotes('');
    setIsDropdownOpen(false);
  };

  // Submit sale
  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      alert('銷貨記帳必須從現有庫存中選擇鞋款！');
      return;
    }

    if (selectedSize === null) {
      alert('請選擇有現有庫存的尺寸！');
      return;
    }

    const matchedVariant = selectedVariantId
      ? selectedProduct.variants.find((v) => v.id === selectedVariantId)
      : selectedProduct.variants.find((v) => v.sizeUS === selectedSize);
    if (!matchedVariant || matchedVariant.stock <= 0) {
      alert('該尺寸目前已無庫存，無法完成銷貨！');
      return;
    }

    const actualAmount = parseFloat(price);
    if (isNaN(actualAmount) || actualAmount <= 0) {
      alert('請填寫正確的實收金額！');
      return;
    }

    const todayDate = getTaiwanTodayStr();

    onCompleteSale({
      businessDate: todayDate,
      brand: selectedProduct.brand,
      sku: selectedProduct.sku.trim().toUpperCase(),
      productName: selectedProduct.name,
      color: selectedProduct.color,
      sizeUS: selectedSize,
      sizeDisplay: matchedVariant.sizeDisplay || (selectedSize !== null ? `${selectedSize}` : '標準碼'),
      category: (selectedProduct.category as ShoeCategory) || category,
      retailPrice: selectedProduct.retailPrice || actualAmount,
      actualPaid: actualAmount,
      paymentMethod,
      status: 'completed',
      isCustomItem: false,
      productId: selectedProduct.id,
      variantId: matchedVariant.id,
      notes: notes.trim(),
    });

    handleResetForm();
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Quick Cashier Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">極速銷貨記帳</h2>
              <p className="text-[11px] text-slate-500 font-medium">輸入編號即選、單擊尺寸扣庫</p>
            </div>
          </div>
          {skuQuery && (
            <button
              type="button"
              onClick={handleResetForm}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold"
            >
              清空
            </button>
          )}
        </div>

        <form onSubmit={handleSubmitSale} className="space-y-3.5 mt-3.5">
          {/* Step 1: Model Code Input with Live Suggestions */}
          <div className="relative">
            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
              鞋款編號 / 貨號 <span className="text-rose-500">* (輸入同時可選)</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                data-testid="cashier-sku-input"
                type="text"
                value={skuQuery}
                placeholder="例如輸入 CW、FD、9060..."
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
                className="w-full text-base font-black px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
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

            {/* Live Search Suggestion Dropdown */}
            {isDropdownOpen && searchMatches.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-900 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                <div className="px-3 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 text-[10px] font-black text-indigo-700 dark:text-indigo-300">
                  找到 {searchMatches.length} 款相符庫存鞋款（點擊直接帶入）
                </div>
                {searchMatches.map((prod) => (
                  <button
                    key={prod.id}
                    data-testid={`cashier-suggestion-item-${prod.sku}`}
                    type="button"
                    onClick={() => handleSelectProduct(prod)}
                    className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-black text-slate-800 dark:text-slate-200">
                          {prod.brand}
                        </span>
                        <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                          {prod.sku}
                        </span>
                        {prod.procurementType === '寄賣' ? (
                          <span className="text-[9px] px-1 py-0.2 rounded font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            寄賣
                          </span>
                        ) : (
                          <span className="text-[9px] px-1 py-0.2 rounded font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            買斷
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                        {prod.name} &bull; <span className="text-slate-500 font-normal">{prod.color}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        ${prod.retailPrice}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isDropdownOpen && searchMatches.length === 0 && skuQuery.trim() && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-center text-xs text-slate-400 font-bold">
                查無符合「{skuQuery}」的現有庫存鞋款（無法售出無庫存品項）
              </div>
            )}
          </div>

          {selectedProduct ? (
            <>
              {/* Selected Shoe Confirmation Card */}
              <div className="p-3 bg-indigo-50/60 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-black text-slate-800 dark:text-slate-200">
                      {selectedProduct.brand}
                    </span>
                    <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                      {selectedProduct.sku}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                      {selectedProduct.category || category}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                      selectedProduct.procurementType === '寄賣'
                        ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    }`}>
                      {selectedProduct.procurementType || '買斷'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedProduct.name} &bull; <span className="text-slate-500 font-normal">{selectedProduct.color}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                    門市架位：{selectedProduct.displayLocation || '未設定'} / 後倉：{selectedProduct.storageLocation || '未設定'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-2.5 py-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 rounded-lg font-black transition-colors cursor-pointer"
                >
                  更換鞋款
                </button>
              </div>

              {/* Size Selection (Full range from minSize to maxSize; Out-of-Stock Variants are Disabled) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                    尺寸選擇 <span className="text-rose-500">* (僅限在庫現貨)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold">
                    共 {selectedProduct.variants.reduce((s, v) => s + Math.max(0, v.stock), 0)} 雙在庫
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  {displayVariants.map((v) => {
                    const isSelected = selectedVariantId
                      ? selectedVariantId === v.id
                      : selectedSize === v.sizeUS;
                    const isOutOfStock = v.stock <= 0;

                    return (
                      <button
                        key={v.id}
                        data-testid={`cashier-size-btn-${v.sizeDisplay || v.sizeUS}`}
                        data-size-us={v.sizeUS}
                        data-size-display={v.sizeDisplay}
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => {
                          if (!isOutOfStock) {
                            setSelectedSize(v.sizeUS);
                            setSelectedVariantId(v.id);
                          }
                        }}
                        className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all ${
                          isOutOfStock
                            ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50'
                            : isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm cursor-pointer'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400 cursor-pointer'
                        }`}
                      >
                        <span className="text-xs font-black">{v.sizeDisplay || `US ${v.sizeUS}`}</span>
                        <span
                          className={`text-[10px] font-black ${
                            isOutOfStock
                              ? 'text-rose-500 font-bold'
                              : isSelected
                              ? 'text-indigo-100'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isOutOfStock ? '0雙 (缺貨)' : `${v.stock}雙`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {displayVariants.every((v) => v.stock <= 0) && (
                  <p className="text-[11px] text-rose-500 font-bold mt-1">
                    此鞋款全尺碼目前皆已缺貨，請先進行進貨入庫！
                  </p>
                )}
              </div>

              {/* Selling Price & Payment Method */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                    實收金額 (元) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                    <input
                      type="number"
                      value={price}
                      placeholder="售價"
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full text-base font-black pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-0.5">
                    支付方式
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm.id}
                        data-testid={pm.id === 'mobile_pay' ? 'cashier-payment-mobile' : `cashier-payment-${pm.id}`}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`py-2 rounded-xl text-[11px] font-black flex flex-col items-center justify-center transition-all cursor-pointer ${
                          paymentMethod === pm.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>{pm.icon}</span>
                        <span>{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirmation Button */}
              <button
                type="submit"
                data-testid="btn-submit-cashier-sale"
                disabled={selectedSize === null}
                className={`w-full py-3.5 rounded-xl font-black text-base shadow-md transition-all flex items-center justify-center gap-2 ${
                  selectedSize === null
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer active:scale-[0.98]'
                }`}
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>{selectedSize === null ? '請選擇有效尺碼' : '確認賣出 (扣庫 1 雙)'}</span>
              </button>
            </>
          ) : (
            /* Empty Selection Prompt */
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                {products.length === 0 ? '目前門市尚無庫存鞋款' : '請由上方搜尋或點選現有庫存鞋款'}
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto font-medium">
                {products.length === 0
                  ? '請先至「進貨入庫」建檔入庫新鞋後，即可在此進行銷貨記帳。'
                  : '為確保帳實相符，銷貨記帳僅限售出在庫現貨，不可登記無庫存品項。'}
              </p>
              <button
                type="submit"
                disabled={true}
                data-testid="btn-submit-cashier-sale"
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-not-allowed mt-2"
              >
                <span>請先由上方搜尋並選擇在庫鞋款</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Today's Sales Stream & One-Tap Refund / Void */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">今日銷售流水帳</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black">
              {todaySales.length} 筆
            </span>
          </div>
          <div className="text-xs font-black text-slate-700 dark:text-slate-300">
            總計: ${todaySales.reduce((s, r) => s + (Number(r.actualPaid) || 0), 0)}
          </div>
        </div>

        {todaySales.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs font-medium">
            今天尚未有銷貨紀錄，上方開單後即時更新
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {todaySales.map((sale) => (
              <div key={sale.id} className="pt-2 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {sale.timestamp ? sale.timestamp.slice(11, 16) : '今日'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300">
                      {sale.brand}
                    </span>
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {sale.sku}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                      {sale.category}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                    {sale.productName} &bull; {sale.color} &bull;{' '}
                    <span className="text-indigo-600 dark:text-indigo-400 font-black">
                      {formatSaleSizeDisplay(sale.sizeDisplay, sale.sizeUS)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      ${sale.actualPaid}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold">
                      {sale.paymentMethod === 'cash'
                        ? '現金'
                        : sale.paymentMethod === 'credit'
                        ? '刷卡'
                        : '行動支付'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`確定作廢此筆 ${sale.sku} (${formatSaleSizeDisplay(sale.sizeDisplay, sale.sizeUS)}) 的銷售並回補 1 雙庫存？`)) {
                        onVoidSale(sale.id);
                      }
                    }}
                    title="作廢並回補庫存"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
