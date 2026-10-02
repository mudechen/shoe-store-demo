import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  X,
  Tag,
  Check,
  Package,
  Sparkles,
  Layers
} from 'lucide-react';
import { ProductWithVariants } from '../../types/inventory';
import { normalizeShoeCategory } from './ExpressSaleForm';
import { formatCurrency } from '../../utils/formatters';

export interface ShoePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductWithVariants[];
  onSelectProduct: (product: ProductWithVariants, selectedSize?: number, selectedVariantId?: string) => void;
}

export const ShoePickerModal: React.FC<ShoePickerModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract unique brands from products
  const uniqueBrands = useMemo(() => {
    const brands = Array.from(new Set(products.map((p) => p.brand))).filter(Boolean);
    return ['all', ...brands.sort()];
  }, [products]);

  // Extract unique normalized categories
  const uniqueCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => normalizeShoeCategory(p.category))));
    return ['all', ...cats.sort()];
  }, [products]);

  // Filter products based on search, brand, category
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      // Brand filter
      if (selectedBrand !== 'all' && p.brand !== selectedBrand) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all' && normalizeShoeCategory(p.category) !== selectedCategory) {
        return false;
      }
      // Text query
      if (q) {
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesBrand = p.brand.toLowerCase().includes(q);
        const matchesColor = (p.color || '').toLowerCase().includes(q);
        const matchesBarcode = (p.barcode || '').toLowerCase().startsWith(q) || (q.length >= 4 && (p.barcode || '').toLowerCase().includes(q));
        return matchesSku || matchesName || matchesBrand || matchesColor || matchesBarcode;
      }
      return true;
    });
  }, [products, searchQuery, selectedBrand, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>門市現有鞋款挑選</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                  共 {products.length} 款
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                點擊鞋款即可將商品編號 (SKU)、品名、廠牌與售價一鍵帶入開單
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="關閉"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-testid="shoe-picker-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋鞋款編號 (SKU)、品名、品牌、顏色或條碼..."
              className="w-full pl-10 pr-9 py-2.5 min-h-[42px] rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm font-bold focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 outline-none transition"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Chips (Brand & Category) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Brands Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full custom-scrollbar">
              <span className="text-slate-400 font-bold shrink-0 mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3" /> 品牌:
              </span>
              {uniqueBrands.map((b) => (
                <button
                  key={b}
                  type="button"
                  data-testid={`shoe-picker-brand-${b}`}
                  onClick={() => setSelectedBrand(b)}
                  className={`px-2.5 py-1 min-h-[32px] rounded-lg font-bold text-xs whitespace-nowrap transition cursor-pointer border ${
                    selectedBrand === b
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  {b === 'all' ? '全部品牌' : b}
                </button>
              ))}
            </div>

            {/* Categories Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full custom-scrollbar">
              <span className="text-slate-400 font-bold shrink-0 mr-1 flex items-center gap-1">
                <Layers className="w-3 h-3" /> 分類:
              </span>
              {uniqueCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  data-testid={`shoe-picker-cat-${c}`}
                  onClick={() => setSelectedCategory(c)}
                  className={`px-2.5 py-1 min-h-[32px] rounded-lg font-bold text-xs whitespace-nowrap transition cursor-pointer border ${
                    selectedCategory === c
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  {c === 'all' ? '全部分類' : c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Cards Grid List */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] space-y-3 custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="font-bold text-slate-600 dark:text-slate-400 text-sm">
                找不到符合「{searchQuery || selectedBrand || selectedCategory}」的鞋款
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedBrand('all');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition cursor-pointer"
              >
                重置過濾條件
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredProducts.map((product) => {
                const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
                const normCat = normalizeShoeCategory(product.category);

                return (
                  <div
                    key={product.id}
                    data-testid={`shoe-picker-card-${product.sku}`}
                    className="p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Brand & Category badges + Price */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-[11px] border border-indigo-200/60 dark:border-indigo-800/60">
                            {product.brand}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                            {normCat}
                          </span>
                        </div>
                        <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(product.retailPrice)}
                        </div>
                      </div>

                      {/* Product Name */}
                      <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {product.name}
                      </h4>

                      {/* SKU & Color & Total Stock */}
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <div className="font-mono text-[11px]">
                          SKU: <span className="font-bold text-slate-700 dark:text-slate-200">{product.sku}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>{product.color}</span>
                          &bull;
                          <span className={totalStock === 0 ? 'text-red-500 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                            {totalStock === 0 ? '全斷碼' : `庫存 ${totalStock} 雙`}
                          </span>
                        </div>
                      </div>

                      {/* Variant Size Preview Chips (Clickable) */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                          <span>點選尺碼立即帶入：</span>
                          {product.barcode && (
                            <span className="font-mono text-[10px] text-slate-400">條碼: {product.barcode}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {product.variants.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectProduct(product, v.sizeUS, v.id);
                                onClose();
                              }}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-bold font-mono border cursor-pointer transition ${
                                v.stock > 0
                                  ? 'bg-slate-50 hover:bg-amber-50 hover:border-amber-400 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                                  : 'bg-red-50/50 dark:bg-red-950/20 text-red-400 border-red-100 dark:border-red-900/30'
                              }`}
                              title={`${v.sizeDisplay || `US ${v.sizeUS}`} (庫存: ${v.stock}雙)`}
                            >
                              {v.sizeDisplay || `US ${v.sizeUS}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Choose Product Button */}
                    <div className="mt-3 pt-2">
                      <button
                        type="button"
                        data-testid={`btn-pick-shoe-${product.sku}`}
                        onClick={() => {
                          onSelectProduct(product);
                          onClose();
                        }}
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/40 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>選擇此款帶入開單</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>支援品牌、分類即時篩選與尺碼直選</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
