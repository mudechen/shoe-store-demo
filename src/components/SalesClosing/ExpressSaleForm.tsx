import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Zap,
  Tag,
  CreditCard,
  Banknote,
  AlertTriangle,
  CheckCircle,
  Search,
  RotateCcw,
  Sparkles,
  Camera,
  ShoppingBag
} from 'lucide-react';
import { useInventory, useSales } from '../../context/InventoryContext';
import { useResponsive } from '../../context/ResponsiveContext';
import { ProductWithVariants } from '../../types/inventory';
import {
  ShoeCategory,
  PaymentMethod,
  SaleDraft,
  SHOE_CATEGORIES
} from '../../types/sales';
import { findMatchingShoe } from '../../services/salesService';
import { getTaiwanTodayStr } from '../../utils/dateUtils';
import { ShoePickerModal } from './ShoePickerModal';
import { BarcodeScannerModal } from '../Scanner/BarcodeScannerModal';
import { getProductFullDisplayVariants } from '../../data/sizeStandards';

interface ExpressSaleFormProps {
  onSaleComplete?: () => void;
  onSwitchBatch?: () => void;
}

const POPULAR_SIZES = [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0];

export function normalizeShoeCategory(cat: string): ShoeCategory {
  if (['運動鞋', '拖鞋', '涼鞋', '包鞋', '皮鞋', '雨鞋', '長短靴', '其他'].includes(cat)) {
    return cat as ShoeCategory;
  }
  const lower = (cat || '').toLowerCase();
  if (
    lower.includes('run') ||
    lower.includes('basket') ||
    lower.includes('life') ||
    lower.includes('sport') ||
    lower.includes('skate') ||
    lower.includes('train')
  ) {
    return '運動鞋';
  }
  if (lower.includes('slip') || lower.includes('slide')) return '拖鞋';
  if (lower.includes('sandal')) return '涼鞋';
  if (lower.includes('boot')) return '長短靴';
  if (lower.includes('leather') || lower.includes('oxford')) return '皮鞋';
  if (lower.includes('rain')) return '雨鞋';
  return '運動鞋';
}

export const ExpressSaleForm: React.FC<ExpressSaleFormProps> = ({
  onSaleComplete,
}) => {
  const { products } = useInventory();
  const { recordSale } = useSales();
  const { isMobile } = useResponsive();

  // Form Fields
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('Nike');
  const [productName, setProductName] = useState('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState<ShoeCategory>('運動鞋');
  const [selectedSize, setSelectedSize] = useState<number>(8.5);
  const [retailPrice, setRetailPrice] = useState<number | string>(3400);
  const [actualPaid, setActualPaid] = useState<number | string>(3400);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');

  // Auxiliary State
  const [matchedProduct, setMatchedProduct] = useState<ProductWithVariants | null>(null);
  const [isCustomItem, setIsCustomItem] = useState<boolean>(false);
  const [showAutocomplete, setShowAutocomplete] = useState<boolean>(false);
  const [autocompleteResults, setAutocompleteResults] = useState<ProductWithVariants[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showZeroStockModal, setShowZeroStockModal] = useState<boolean>(false);
  const [isShoePickerOpen, setIsShoePickerOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Compute stock of current selection
  const selectedVariant = useMemo(() => {
    if (!matchedProduct) return null;
    if (selectedVariantId) {
      const byId = matchedProduct.variants.find((v) => v.id === selectedVariantId);
      if (byId) return byId;
    }
    return matchedProduct.variants.find((v) => Math.abs(v.sizeUS - selectedSize) < 0.05) || null;
  }, [matchedProduct, selectedSize, selectedVariantId]);

  // Full display variants according to Rule 14 (minSize ~ maxSize, preserving existing variants)
  const displayVariants = useMemo(() => {
    return matchedProduct ? getProductFullDisplayVariants(matchedProduct) : [];
  }, [matchedProduct]);

  const currentStock = selectedVariant ? selectedVariant.stock : (matchedProduct ? 0 : null);
  const isOutOfStock = currentStock !== null && currentStock === 0;

  // Handler: Apply product info into form
  const applyProduct = (prod: ProductWithVariants, preferredSize?: number, preferredVariantId?: string) => {
    setMatchedProduct(prod);
    setIsCustomItem(false);
    setSku(prod.sku);
    setBrand(prod.brand);
    setProductName(prod.name);
    setColor(prod.color);
    setCategory(normalizeShoeCategory(prod.category));
    setRetailPrice(prod.retailPrice);
    setActualPaid(prod.retailPrice);
    setShowAutocomplete(false);
    if (preferredVariantId) {
      setSelectedVariantId(preferredVariantId);
    } else if (preferredSize !== undefined) {
      const v = prod.variants.find((v) => Math.abs(v.sizeUS - preferredSize) < 0.05);
      if (v) setSelectedVariantId(v.id);
      setSelectedSize(preferredSize);
    } else if (prod.variants.length > 0) {
      const firstInStock = prod.variants.find((v) => v.stock > 0);
      if (firstInStock) {
        setSelectedVariantId(firstInStock.id);
        setSelectedSize(firstInStock.sizeUS);
      } else {
        setSelectedVariantId(prod.variants[0].id);
        setSelectedSize(prod.variants[0].sizeUS);
      }
    }
  };

  // Handler: SKU Input change
  const handleSkuChange = (val: string) => {
    setSku(val);
    const query = val.trim();
    if (!query) {
      setMatchedProduct(null);
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }

    const upper = query.toUpperCase();
    const scored = products.map((p) => {
      const pSku = p.sku.toUpperCase();
      const pName = p.name.toUpperCase();
      const pBarcode = (p.barcode || '').toUpperCase();
      const pBrand = p.brand.toUpperCase();

      let score = 0;
      if (pSku === upper) {
        score = 100;
      } else if (pSku.startsWith(upper)) {
        score = 80;
      } else if (pSku.includes(upper)) {
        score = 60;
      } else if (pName.startsWith(upper)) {
        score = 50;
      } else if (pName.includes(upper)) {
        score = 40;
      } else if (pBarcode.startsWith(upper)) {
        score = 35;
      } else if (upper.length >= 4 && pBarcode.includes(upper)) {
        score = 20;
      } else if (pBrand.includes(upper)) {
        score = 10;
      }

      return { product: p, score };
    });

    const matches = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.product);

    setAutocompleteResults(matches);
    setShowAutocomplete(matches.length > 0);

    // Exact match check
    const exact = products.find((p) => p.sku.toUpperCase() === upper);
    if (exact) {
      applyProduct(exact);
    } else {
      setMatchedProduct(null);
      setIsCustomItem(true);
    }
  };

  // Handler: SKU Blur or Tab key
  const handleSkuBlurOrTab = () => {
    if (!sku.trim()) return;
    const match = findMatchingShoe(products, sku);
    if (match) {
      applyProduct(match);
    } else {
      setIsCustomItem(true);
    }
  };

  // Handler: Category chip clicked
  const handleCategoryClick = (cat: ShoeCategory) => {
    setCategory(cat);
    // Only auto-pick product if SKU is completely empty (enables TC-6.4 3-click fast sale without overwriting custom SKU)
    if (!sku.trim()) {
      const catProd = products.find((p) => normalizeShoeCategory(p.category) === cat);
      if (catProd) {
        applyProduct(catProd);
      } else {
        setBrand('特選商品');
        setProductName(`${cat}系列`);
        setRetailPrice(890);
        setActualPaid(890);
        setIsCustomItem(true);
      }
    }
  };

  // Handler: Execute submission
  const executeSubmit = (bypassZeroStockCheck = false) => {
    if (!bypassZeroStockCheck && isOutOfStock) {
      setShowZeroStockModal(true);
      return;
    }

    setShowZeroStockModal(false);

    const priceNum = Math.max(0, Number(actualPaid) || 0);
    const retailNum = Math.max(0, Number(retailPrice) || priceNum);

    const finalSku = sku.trim() || `QUICK-${category}-01`;
    const finalBrand = brand.trim() || '通用品牌';
    const finalName = productName.trim() || `${finalBrand} ${category}`;

    const draft: SaleDraft = {
      businessDate: getTaiwanTodayStr(),
      brand: finalBrand,
      sku: finalSku,
      productName: finalName,
      color: color.trim() || '標準色',
      sizeUS: selectedSize,
      sizeDisplay: selectedVariant?.sizeDisplay || (selectedSize ? `US ${selectedSize.toFixed(1)}` : '標準碼'),
      category,
      retailPrice: retailNum,
      actualPaid: priceNum,
      paymentMethod,
      isCustomItem: Boolean(isCustomItem || !matchedProduct),
      productId: matchedProduct?.id,
      variantId: selectedVariant?.id,
      displayLocation: matchedProduct?.displayLocation,
      storageLocation: matchedProduct?.storageLocation,
      notes: notes.trim() || undefined,
      operator: '門市人員'
    };

    recordSale(draft);

    setToastMessage('銷貨登記成功！已完成開單扣庫');
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);

    // Reset form fields cleanly for consecutive sales
    setSku('');
    setBrand('');
    setProductName('');
    setColor('');
    setActualPaid('');
    setRetailPrice('');
    setMatchedProduct(null);
    setIsCustomItem(false);
    setShowAutocomplete(false);

    if (onSaleComplete) {
      onSaleComplete();
    }
  };

  const handleResetForm = () => {
    setSku('');
    setBrand('Nike');
    setProductName('');
    setColor('');
    setCategory('運動鞋');
    setSelectedSize(8.5);
    setRetailPrice(3400);
    setActualPaid(3400);
    setPaymentMethod('cash');
    setNotes('');
    setMatchedProduct(null);
    setIsCustomItem(false);
    setShowAutocomplete(false);
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 bg-slate-950/95 text-white px-5 py-4 rounded-2xl shadow-2xl border-2 border-emerald-500 font-black flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5"
        >
          <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-sm sm:text-base">{toastMessage}</div>
        </div>
      )}

      {/* Zero Stock Confirmation Modal */}
      {showZeroStockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-red-500 max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-black text-lg">零庫存出庫確認</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              此商品目前尺碼庫存為 0（已斷碼缺貨）。是否確認強制開單售出？系統將登記銷貨並將庫存維持為 0（不產生負數庫存）。
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowZeroStockModal(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => executeSubmit(true)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-md transition cursor-pointer"
              >
                確認強制開單
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shoe Model Picker Modal */}
      <ShoePickerModal
        isOpen={isShoePickerOpen}
        onClose={() => setIsShoePickerOpen(false)}
        products={products}
        onSelectProduct={(prod, preferredSize) => {
          applyProduct(prod, preferredSize);
        }}
      />

      {/* Barcode Scanner Modal (Camera / Mock / Manual) */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onSelectProduct={(prod, variant) => {
          applyProduct(prod, variant?.sizeUS);
          setIsScannerOpen(false);
        }}
      />

      {/* Main Form Container */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {/* Section 1: SKU Fast Lookup with Autocomplete */}
        <div className="space-y-2 relative" ref={autocompleteRef}>
          <div className="flex items-center justify-between">
            <label
              htmlFor="sales-sku-input"
              className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <Search className="w-4 h-4 text-indigo-600" />
              <span>商品編號 / 款號 SKU / 條碼</span>
              <span className="text-amber-500 font-bold">*</span>
            </label>
            {matchedProduct ? (
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> 已連動庫存
              </span>
            ) : isCustomItem && sku ? (
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                未建檔商品 (自訂銷貨)
              </span>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                id="sales-sku-input"
                type="text"
                data-testid="sales-input-sku"
                value={sku}
                onChange={(e) => handleSkuChange(e.target.value)}
                onBlur={handleSkuBlurOrTab}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' || e.key === 'Enter') {
                    handleSkuBlurOrTab();
                  }
                }}
                placeholder="輸入或掃描貨號 (如 FD0655-001 或手作自由款號)..."
                className="w-full px-4 py-3 min-h-[46px] rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 outline-none transition"
                autoComplete="off"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="btn-open-shoe-picker"
                onClick={() => setIsShoePickerOpen(true)}
                className="flex-1 sm:flex-initial min-h-[46px] px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-800 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                title="挑選門市現有鞋款"
              >
                <ShoppingBag className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>選擇鞋款</span>
              </button>

              <button
                type="button"
                data-testid="btn-open-barcode-scanner"
                onClick={() => setIsScannerOpen(true)}
                className="flex-1 sm:flex-initial min-h-[46px] px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                title="開啟相機或模擬條碼掃描"
              >
                <Camera className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                <span>直接掃碼</span>
              </button>
            </div>
          </div>

          {/* Autocomplete Dropdown List */}
          {showAutocomplete && autocompleteResults.length > 0 && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60 max-h-60 overflow-y-auto">
              {autocompleteResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid="sales-sku-autocomplete-item"
                  onClick={() => applyProduct(item)}
                  className="w-full text-left p-3 hover:bg-indigo-50 dark:hover:bg-slate-700/60 flex items-center justify-between cursor-pointer transition"
                >
                  <div>
                    <div className="font-black text-sm text-slate-900 dark:text-white">
                      {item.sku} &bull; {item.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.brand} &bull; {item.color} &bull; {item.category}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                      ${item.retailPrice}
                    </div>
                    <div className="text-[11px] text-slate-400 font-bold">點擊自動帶入</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Product Basic Info Inputs (Brand, Name, Color) */}
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
          <div>
            <label
              htmlFor="sales-brand-input"
              className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1"
            >
              廠家 / 品牌
            </label>
            <input
              id="sales-brand-input"
              type="text"
              data-testid="sales-input-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="例如：Nike, 富發牌..."
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="sales-color-input"
              className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1"
            >
              顏色
            </label>
            <input
              id="sales-color-input"
              type="text"
              data-testid="sales-input-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="例如：Triple White 純白..."
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none"
            />
          </div>

          <div className={isMobile ? 'col-span-2' : ''}>
            <label
              htmlFor="sales-name-input"
              className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1"
            >
              品名
            </label>
            <input
              id="sales-name-input"
              type="text"
              data-testid="sales-input-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="例如：Air Force 1 '07..."
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none"
            />
          </div>
        </div>

        {/* Section 3: 8 Category Pill Chips (Touch Target >= 40px) */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-indigo-600" />
            <span>鞋款分類捷徑 (點擊快選)</span>
          </label>
          <div className={`grid gap-2 ${isMobile ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-8'}`}>
            {SHOE_CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  data-testid={`sales-category-chip-${cat}`}
                  onClick={() => handleCategoryClick(cat)}
                  className={`min-h-[44px] min-w-[40px] px-2 py-2.5 rounded-xl font-black text-xs sm:text-sm border-2 transition-all flex items-center justify-center cursor-pointer shadow-xs whitespace-nowrap select-none ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 scale-[1.02]'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Shoe Sizes Selection Grid (Touch Target >= 40px) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">
              {matchedProduct && displayVariants.length > 0
                ? `此鞋款尺碼選擇 (${displayVariants.length} 碼)`
                : '常用鞋碼選擇 (US)'}
            </label>
            {selectedVariant && (
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                目前在庫：{selectedVariant.stock} 雙
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {matchedProduct && displayVariants.length > 0 ? (
              displayVariants.map((v) => {
                const isSelected = selectedVariant?.id === v.id;
                const vLabel = v.sizeDisplay || (v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : String(v.sizeUS));
                const testIdKey = v.sizeDisplay || (v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : String(v.sizeUS));
                const isOutOfStock = v.stock <= 0;

                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isOutOfStock}
                    data-testid={`sales-size-btn-${testIdKey}`}
                    data-size-us={v.sizeUS}
                    data-size-display={vLabel}
                    onClick={() => {
                      if (!isOutOfStock) {
                        setSelectedVariantId(v.id);
                        setSelectedSize(v.sizeUS);
                      }
                    }}
                    className={`min-h-[46px] min-w-[52px] px-2.5 py-1.5 rounded-xl font-black text-xs sm:text-sm border-2 transition-all flex flex-col items-center justify-center select-none whitespace-nowrap ${
                      isOutOfStock
                        ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50'
                        : isSelected
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 scale-[1.02] cursor-pointer'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400 cursor-pointer'
                    }`}
                  >
                    <span className="leading-tight">{vLabel}</span>
                    <span className={`text-[10px] font-bold leading-none mt-0.5 whitespace-nowrap ${
                      isOutOfStock ? 'text-rose-500 font-bold' : 'opacity-80 scale-90'
                    }`}>
                      {isOutOfStock ? '0雙 (斷碼)' : `${v.stock}雙`}
                    </span>
                  </button>
                );
              })
            ) : (
              POPULAR_SIZES.map((s) => {
                const isSelected = Math.abs(selectedSize - s) < 0.05;

                return (
                  <button
                    key={s}
                    type="button"
                    data-testid={`sales-size-btn-${s.toFixed(1)}`}
                    onClick={() => setSelectedSize(s)}
                    className={`min-h-[46px] min-w-[40px] px-1 py-1.5 rounded-xl font-black text-xs sm:text-sm border-2 transition-all flex flex-col items-center justify-center cursor-pointer select-none whitespace-nowrap ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 scale-[1.02]'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span className="leading-tight">{s.toFixed(1)}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Out of Stock Warning Badge (E02) */}
          {isOutOfStock && (
            <div
              data-testid="sales-out-of-stock-warning"
              className="p-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 rounded-xl flex items-center justify-between text-red-700 dark:text-red-400 font-bold text-xs sm:text-sm animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>⚠️ 此尺碼目前庫存為 0（斷碼缺貨）</span>
              </div>
              <span className="text-xs px-2 py-0.5 bg-red-200 dark:bg-red-900/60 rounded font-black">
                無庫存
              </span>
            </div>
          )}
        </div>

        {/* Section 5: Price & Payment Method */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {/* Price Input */}
          <div className="space-y-1">
            <label
              htmlFor="sales-price-input"
              className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>實收銷售金額 (TWD)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                $
              </span>
              <input
                id="sales-price-input"
                type="number"
                min="0"
                step="1"
                data-testid="sales-input-price"
                value={actualPaid}
                onChange={(e) => setActualPaid(e.target.value)}
                placeholder="例如：3400"
                className="w-full pl-8 pr-4 py-2.5 min-h-[44px] rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-lg focus:border-indigo-600 outline-none"
              />
            </div>
          </div>

          {/* Payment Method Radios */}
          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>結帳支付方式</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Cash Radio */}
              <label
                data-testid="payment-method-radio-cash"
                onClick={() => setPaymentMethod('cash')}
                className={`min-h-[44px] p-2 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition select-none whitespace-nowrap ${
                  paymentMethod === 'cash'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  className="sr-only"
                />
                <span>💵 現金</span>
              </label>

              {/* Credit Card Radio */}
              <label
                data-testid="payment-method-radio-credit"
                onClick={() => setPaymentMethod('credit')}
                className={`min-h-[44px] p-2 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition select-none whitespace-nowrap ${
                  paymentMethod === 'credit'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="credit"
                  checked={paymentMethod === 'credit'}
                  onChange={() => setPaymentMethod('credit')}
                  className="sr-only"
                />
                <span>💳 刷卡</span>
              </label>

              {/* Mobile Pay Radio */}
              <label
                data-testid="payment-method-radio-mobile_pay"
                onClick={() => setPaymentMethod('mobile_pay')}
                className={`min-h-[44px] p-2 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition select-none whitespace-nowrap ${
                  paymentMethod === 'mobile_pay'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="mobile_pay"
                  checked={paymentMethod === 'mobile_pay'}
                  onChange={() => setPaymentMethod('mobile_pay')}
                  className="sr-only"
                />
                <span>📱 行動支付</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 6: Notes (Optional) */}
        <div>
          <label
            htmlFor="sales-notes-input"
            className="text-xs font-black text-slate-600 dark:text-slate-400 block mb-1"
          >
            交易備註 (選填)
          </label>
          <input
            id="sales-notes-input"
            type="text"
            data-testid="sales-input-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="例如：特價優惠券現折、老客人折扣..."
            className="w-full px-3.5 py-2 min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:border-indigo-600 outline-none"
          />
        </div>

        {/* Section 7: Action Buttons (Submit & Reset) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            data-testid="btn-submit-express-sale"
            onClick={() => executeSubmit(false)}
            className="w-full sm:flex-1 min-h-[48px] px-6 py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-base sm:text-lg rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-5 h-5 text-white" />
            <span>確認登記銷貨（極速開單）</span>
          </button>

          <button
            type="button"
            onClick={handleResetForm}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
