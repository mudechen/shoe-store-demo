import React, { useState, useMemo } from 'react';
import { ProductWithVariants, ShoeVariant, getStockLevel } from '../../types/inventory';
import { Search, ChevronDown, ChevronUp, Plus, Minus, Trash2, Building2, ArrowDownLeft, ShoppingBag, AlertCircle, X, Edit3, SlidersHorizontal, RotateCcw } from 'lucide-react';
import {
  InventoryFilterDrawer,
  FilterState,
  normalizeSizeFilter,
  formatSizeTagLabel,
  matchVariantToSize,
} from './InventoryFilterDrawer';
import { formatProductSizeRange, getProductFullDisplayVariants } from '../../data/sizeStandards';

interface CompactInventoryViewProps {
  products: ProductWithVariants[];
  onDeductStock: (variantId: string, qty: number, syntheticVariant?: ShoeVariant) => void;
  onOpenStockInModal?: () => void;
  onOpenVendorReturn?: (product: ProductWithVariants, initialSizeUS?: number) => void;
  onEditProduct?: (product: ProductWithVariants) => void;
  onDeleteProduct?: (productId: string) => void;
  onQuickSale?: (product: ProductWithVariants, variant: ShoeVariant) => void;
}

interface VendorStats {
  brand: string;
  count: number;
  pairs: number;
  totalCost: number;
}

interface VendorGroup {
  vendor: string;
  products: ProductWithVariants[];
  totalPairs: number;
  totalCost: number;
}

export const CompactInventoryView: React.FC<CompactInventoryViewProps> = ({
  products,
  onDeductStock,
  onOpenStockInModal,
  onOpenVendorReturn,
  onEditProduct,
  onDeleteProduct,
  onQuickSale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [collapsedVendors, setCollapsedVendors] = useState<Record<string, boolean>>({});
  const [deductTarget, setDeductTarget] = useState<{
    product: ProductWithVariants;
    variant: ShoeVariant;
  } | null>(null);

  // Dynamically compute min/max price bounds from products
  // Dynamically compute min/max price bounds from products
  const { minPriceBound, maxPriceBound } = useMemo(() => {
    let max = 10000;
    if (products && products.length > 0) {
      products.forEach((p) => {
        const price = p.retailPrice || 0;
        if (price > max) max = price;
      });
    }
    return {
      minPriceBound: 0,
      maxPriceBound: Math.ceil(Math.max(10000, max) / 1000) * 1000,
    };
  }, [products]);

  // Master Filter State for drawer and active tags
  const [filters, setFilters] = useState<FilterState>(() => ({
    selectedVendors: [],
    selectedSizes: [],
    selectedCategories: [],
    priceRange: null,
    procurementType: 'all',
    stockStatus: 'all',
  }));

  // Count how many non-default filter dimensions are active
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedVendors.length > 0) count++;
    if (filters.selectedSizes.length > 0) count++;
    if (filters.selectedCategories.length > 0) count++;
    if (filters.priceRange !== null) count++;
    if (filters.procurementType !== 'all') count++;
    if (filters.stockStatus !== 'all') count++;
    return count;
  }, [filters]);

  // Extract all distinct vendors and their aggregated stats
  const vendorStats = useMemo<VendorStats[]>(() => {
    const map = new Map<string, { count: number; pairs: number; totalCost: number }>();

    products.forEach((p) => {
      const brand = p.brand?.trim() || '未分類廠商';
      const pairs = p.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
      const cost = (p.costPrice || 0) * pairs;

      const cur = map.get(brand) || { count: 0, pairs: 0, totalCost: 0 };
      cur.count += 1;
      cur.pairs += pairs;
      cur.totalCost += cost;
      map.set(brand, cur);
    });

    return Array.from(map.entries())
      .map(([brand, data]) => ({
        brand,
        ...data,
      }))
      .sort((a, b) => a.brand.localeCompare(b.brand, 'zh-Hant'));
  }, [products]);

  // Overall store inventory totals
  const overallStats = useMemo(() => {
    let totalPairs = 0;
    let totalCost = 0;
    products.forEach((p) => {
      const pairs = p.variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
      totalPairs += pairs;
      totalCost += (p.costPrice || 0) * pairs;
    });
    return {
      totalPairs,
      totalCost,
      vendorCount: vendorStats.length,
      productCount: products.length,
    };
  }, [products, vendorStats]);

  // Filter products by search query and all drawer filter dimensions
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return products.filter((prod) => {
      // 1. Search Query
      const matchSearch =
        !q ||
        prod.sku.toLowerCase().includes(q) ||
        prod.name.toLowerCase().includes(q) ||
        prod.brand.toLowerCase().includes(q) ||
        prod.color.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // 2. Vendor / Brand Filter (multi-select)
      const brand = prod.brand?.trim() || '未分類廠商';
      if (filters.selectedVendors.length > 0 && !filters.selectedVendors.includes(brand)) {
        return false;
      }

      // 3. Size Filter (must have stock > 0 in any selected size across any unit)
      if (filters.selectedSizes.length > 0) {
        const hasStockInSize = prod.variants.some((v) => {
          if (v.stock <= 0) return false;
          return filters.selectedSizes.some((raw) => {
            const filterItem = normalizeSizeFilter(raw);
            return matchVariantToSize(v, filterItem.unit, filterItem.size);
          });
        });
        if (!hasStockInSize) return false;
      }

      // 4. Category / Style Filter (multi-select)
      if (filters.selectedCategories.length > 0) {
        const cat = prod.category?.trim() || '';
        if (!filters.selectedCategories.includes(cat)) {
          return false;
        }
      }

      // 5. Price Range
      if (filters.priceRange !== null) {
        const price = prod.retailPrice || 0;
        if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
          return false;
        }
      }

      // 6. Procurement Type filter (買斷 / 寄賣)
      const pType = prod.procurementType || '買斷';
      if (filters.procurementType !== 'all' && pType !== filters.procurementType) {
        return false;
      }

      // 7. Stock status
      const totalStock = prod.variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
      const hasOutOfStock = prod.variants.some((v) => v.stock <= 0);
      const hasWarning = prod.variants.some((v) => v.stock > 0 && v.stock <= 2);

      if (filters.stockStatus === 'broken' && !hasOutOfStock) return false;
      if (filters.stockStatus === 'warning' && (!hasWarning || hasOutOfStock)) return false;
      if (filters.stockStatus === 'sufficient' && (totalStock <= 0 || hasOutOfStock || hasWarning)) return false;

      return true;
    });
  }, [products, searchQuery, filters]);

  // Group filtered products by Vendor / Brand
  const groupedByVendor = useMemo<VendorGroup[]>(() => {
    const groups = new Map<string, ProductWithVariants[]>();

    filteredProducts.forEach((p) => {
      const brand = p.brand?.trim() || '未分類廠商';
      if (!groups.has(brand)) {
        groups.set(brand, []);
      }
      groups.get(brand)!.push(p);
    });

    return Array.from(groups.entries())
      .map(([vendor, items]) => {
        let pairs = 0;
        let cost = 0;
        items.forEach((p) => {
          const pStock = p.variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
          pairs += pStock;
          cost += (p.costPrice || 0) * pStock;
        });
        return {
          vendor,
          products: items,
          totalPairs: pairs,
          totalCost: cost,
        };
      })
      .sort((a, b) => a.vendor.localeCompare(b.vendor, 'zh-Hant'));
  }, [filteredProducts]);

  const toggleExpand = (productId: string) => {
    setExpandedProductId((prev) => (prev === productId ? null : productId));
  };

  const toggleVendorCollapse = (vendor: string) => {
    setCollapsedVendors((prev) => ({
      ...prev,
      [vendor]: !prev[vendor],
    }));
  };

  const allVendorsCollapsed = useMemo(() => {
    if (groupedByVendor.length === 0) return false;
    return groupedByVendor.every((g) => Boolean(collapsedVendors[g.vendor]));
  }, [groupedByVendor, collapsedVendors]);

  const toggleAllVendors = () => {
    if (allVendorsCollapsed) {
      setCollapsedVendors({});
    } else {
      const next: Record<string, boolean> = {};
      groupedByVendor.forEach((g) => {
        next[g.vendor] = true;
      });
      setCollapsedVendors(next);
    }
  };

  return (
    <div className="space-y-3 pb-24 max-w-lg mx-auto">
      {/* 1. Store Overview Financial Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-3.5 shadow-sm border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-200 font-bold">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>在庫總覽 &bull; 按廠商分類</span>
          </div>
          <div className="text-xl font-black mt-1 flex items-baseline gap-1.5">
            <span>${overallStats.totalCost.toLocaleString()}</span>
            <span className="text-[11px] font-medium text-slate-300">總成本金額</span>
          </div>
        </div>
        <div className="text-right space-y-0.5">
          <div className="text-xs font-black text-emerald-400">
            {overallStats.totalPairs} <span className="text-[10px] text-slate-300 font-normal">雙在庫</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            {overallStats.vendorCount} 家廠商 &bull; {overallStats.productCount} 款鞋
          </div>
        </div>
      </div>

      {/* 2. Top Action Bar: Search, Filter Drawer Trigger & + 進貨入庫 CTA */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-xs border border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-testid="inventory-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜編號、品名、廠商、顏色..."
              className="w-full text-xs font-bold pl-9 pr-7 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="清除搜尋"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Drawer Trigger Button */}
          <button
            type="button"
            data-testid="btn-open-filter-drawer"
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 border ${
              activeFilterCount > 0
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>篩選</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Prominent CTA Button: + 進貨入庫 */}
          <button
            type="button"
            data-testid="btn-open-stockin-modal"
            onClick={() => onOpenStockInModal?.()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>進貨入庫</span>
          </button>
        </div>

        {/* Active Filter Tags Bar (Rendered when at least one filter condition is active) */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] animate-in fade-in duration-150">
            <span className="text-slate-400 font-bold shrink-0">已篩選：</span>

            {/* Vendor tags */}
            {filters.selectedVendors.map((vendor) => (
              <span
                key={vendor}
                data-testid={`active-filter-vendor-${vendor}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold"
              >
                <span>{vendor}</span>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      selectedVendors: prev.selectedVendors.filter((v) => v !== vendor),
                    }))
                  }
                  className="hover:text-indigo-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            {/* Size tags */}
            {filters.selectedSizes.map((raw) => {
              const item = normalizeSizeFilter(raw);
              const tagLabel = formatSizeTagLabel(item.unit, item.size);
              const tagKey = `${item.unit}-${item.size}`;
              return (
                <span
                  key={tagKey}
                  data-testid={`active-filter-size-${item.size}`}
                  data-unit={item.unit}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold"
                >
                  <span>{tagLabel}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => {
                        const list = prev.selectedSizes.map((r) => normalizeSizeFilter(r));
                        return {
                          ...prev,
                          selectedSizes: list.filter(
                            (s) => !(s.unit === item.unit && s.size === item.size)
                          ),
                        };
                      })
                    }
                    className="hover:text-sky-900 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              );
            })}

            {/* Category tags */}
            {filters.selectedCategories.map((cat) => (
              <span
                key={cat}
                data-testid={`active-filter-category-${cat}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold"
              >
                <span>{cat}</span>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      selectedCategories: prev.selectedCategories.filter((c) => c !== cat),
                    }))
                  }
                  className="hover:text-emerald-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            {/* Price tag */}
            {filters.priceRange !== null && (
              <span
                data-testid="active-filter-price"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold"
              >
                <span>${filters.priceRange[0]} ~ ${filters.priceRange[1]}</span>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      priceRange: null,
                    }))
                  }
                  className="hover:text-amber-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {/* Procurement tag */}
            {filters.procurementType !== 'all' && (
              <span
                data-testid="active-filter-procurement"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold"
              >
                <span>{filters.procurementType === '買斷' ? '買斷自營' : '廠商寄賣'}</span>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, procurementType: 'all' }))}
                  className="hover:text-purple-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {/* Stock status tag */}
            {filters.stockStatus !== 'all' && (
              <span
                data-testid="active-filter-status"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold"
              >
                <span>
                  {filters.stockStatus === 'broken'
                    ? '斷碼款'
                    : filters.stockStatus === 'warning'
                    ? '緊張款'
                    : '充足款'}
                </span>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, stockStatus: 'all' }))}
                  className="hover:text-rose-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {/* Clear All button */}
            <button
              type="button"
              data-testid="btn-clear-all-filters"
              onClick={() =>
                setFilters({
                  selectedVendors: [],
                  selectedSizes: [],
                  selectedCategories: [],
                  priceRange: null,
                  procurementType: 'all',
                  stockStatus: 'all',
                })
              }
              className="text-[11px] font-bold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-auto cursor-pointer flex items-center gap-0.5"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>清除全部</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Grouped by Vendor Accordion List */}
      <div className="space-y-3">
        {groupedByVendor.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-xs shadow-xs border border-slate-200 dark:border-slate-800">
            {products.length === 0 ? (
              <div className="space-y-2.5">
                <div className="text-3xl">📦</div>
                <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  目前尚無任何鞋款庫存
                </div>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  已清除所有資料。請點擊下方按鈕前往「進貨入庫」開始建檔新鞋！
                </p>
                {onOpenStockInModal && (
                  <button
                    type="button"
                    onClick={onOpenStockInModal}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <span>+ 前往進貨入庫建檔</span>
                  </button>
                )}
              </div>
            ) : (
              '查無相符鞋款，請調整過濾條件'
            )}
          </div>
        ) : (
          <>
            {groupedByVendor.length > 0 && (
              <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-[11px]">
                  共 {groupedByVendor.length} 家廠商分類
                </span>
                <button
                  type="button"
                  data-testid="btn-toggle-all-vendors"
                  onClick={toggleAllVendors}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition"
                >
                  <span>{allVendorsCollapsed ? '全部展開' : '全部收合'}</span>
                </button>
              </div>
            )}
            {groupedByVendor.map((group) => {
              const isVendorCollapsed = !searchQuery.trim() && Boolean(collapsedVendors[group.vendor]);

              return (
                <div
                  key={group.vendor}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  {/* Vendor Group Header (Clickable Accordion) */}
                  <button
                    type="button"
                    data-testid={`vendor-group-toggle-${group.vendor}`}
                    onClick={() => toggleVendorCollapse(group.vendor)}
                    className={`w-full text-left px-3.5 py-2.5 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/70 transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isVendorCollapsed ? '' : 'border-b border-slate-200 dark:border-slate-700/80'
                    }`}
                    title={isVendorCollapsed ? `點擊展開 ${group.vendor}` : `點擊收合 ${group.vendor}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                        <span>{group.vendor}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                          {group.products.length} 款
                        </span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-right shrink-0">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        現存 <strong className="text-slate-800 dark:text-slate-200 font-black">{group.totalPairs}</strong> 雙
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        廠商總成本 ${group.totalCost.toLocaleString()}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isVendorCollapsed
                            ? '-rotate-90 text-slate-400'
                            : 'rotate-0 text-indigo-600 dark:text-indigo-400'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Shoes List in this Vendor Group (Collapsible) */}
                  {!isVendorCollapsed && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.products.map((prod) => {
                  const isExpanded = expandedProductId === prod.id;
                  const totalStock = prod.variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
                  const hasOutOfStock = prod.variants.some((v) => v.stock <= 0);
                  const shoeCost = prod.costPrice || 0;
                  const shoeTotalCost = shoeCost * totalStock;
                  const sizeRangeStr = formatProductSizeRange(prod);

                  return (
                    <div key={prod.id} className="transition-colors">
                      {/* Compact Row Header */}
                      <button
                        type="button"
                        data-testid={`inventory-card-${prod.sku}`}
                        onClick={() => toggleExpand(prod.id)}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer ${
                          isExpanded ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                              {prod.sku}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                              {prod.category}
                            </span>
                            {/* Procurement Type Badge */}
                            {prod.procurementType === '寄賣' ? (
                              <span
                                data-testid={`badge-consignment-${prod.sku}`}
                                className="text-[9px] px-1.5 py-0.2 rounded font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-0.5"
                              >
                                <span>📦 寄賣</span>
                              </span>
                            ) : (
                              <span
                                data-testid={`badge-buyout-${prod.sku}`}
                                className="text-[9px] px-1.5 py-0.2 rounded font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-0.5"
                              >
                                <span>🏷️ 買斷</span>
                              </span>
                            )}
                            {hasOutOfStock && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-black">
                                有斷碼
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                            {prod.name} &bull; <span className="text-slate-400 font-normal">{prod.color}</span>
                            {sizeRangeStr && (
                              <>
                                <span className="text-slate-300 dark:text-slate-600 mx-1.5">&bull;</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-black">區間 {sizeRangeStr}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Each Shoe's Individual Cost & Total Cost Display */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center justify-end gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                單雙成本 <strong className="text-slate-800 dark:text-slate-200 font-black">${shoeCost}</strong>
                              </span>
                              <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                總成本 ${shoeTotalCost.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-end gap-2 text-[10px] font-bold mt-0.5">
                              <span className="text-slate-400">售價 ${prod.retailPrice}</span>
                              <span
                                className={`font-black ${
                                  totalStock === 0
                                    ? 'text-rose-600'
                                    : totalStock <= 3
                                    ? 'text-amber-600'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                現存 {totalStock} 雙
                              </span>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Smoothly Expanded Inline Size Matrix & Detailed Cost/Financials */}
                      {isExpanded && (
                        <div className="px-3.5 py-3 bg-slate-50/90 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 space-y-3">
                          {/* Financial Cost & Retail Summary Cards */}
                          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold flex-wrap">
                              <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${
                                prod.procurementType === '寄賣'
                                  ? 'bg-purple-100/90 dark:bg-purple-950/90 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : 'bg-blue-100/90 dark:bg-blue-950/90 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}>
                                採購模式: <strong className="font-black">{prod.procurementType || '買斷'}</strong>
                              </span>
                              <span
                                title="各批次進貨成本請至「進貨紀錄明細」查看與修改"
                                className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300"
                              >
                                進貨成本: <strong className="text-slate-900 dark:text-white font-black">${shoeCost}</strong>
                              </span>
                              <span className="text-[11px] bg-indigo-100/70 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md text-indigo-800 dark:text-indigo-300">
                                此款庫存總成本: <strong className="text-indigo-900 dark:text-indigo-200 font-black">${shoeTotalCost.toLocaleString()}</strong> ({totalStock}雙)
                              </span>
                              <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
                                門市售價: <strong className="font-black">${prod.retailPrice}</strong>
                              </span>
                            </div>

                            {/* Action Buttons: 編輯, 退回廠商, 刪除鞋款 */}
                            <div className="flex items-center gap-2 shrink-0">
                              {onEditProduct && (
                                <button
                                  type="button"
                                  data-testid={`btn-edit-product-${prod.sku}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditProduct(prod);
                                  }}
                                  className="px-2.5 py-1 text-xs font-black rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                                  title="編輯鞋款基本資料與庫存數量"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>編輯</span>
                                </button>
                              )}
                              {onOpenVendorReturn && (
                                <button
                                  type="button"
                                  data-testid={`btn-vendor-return-${prod.sku}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenVendorReturn(prod);
                                  }}
                                  className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-500 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                  <span>退回廠商</span>
                                </button>
                              )}
                              {onDeleteProduct && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`確定要刪除鞋款「${prod.brand} ${prod.sku}」嗎？此操作將永久自庫存移除。`)) {
                                      onDeleteProduct(prod.id);
                                    }
                                  }}
                                  className="text-[11px] font-bold text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                                  title="刪除此鞋款"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>刪除</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Size Pill Grid with Color Status */}
                          <div>
                            <div className="text-[10px] font-black text-slate-400 mb-1.5 flex items-center justify-between">
                              <span>全尺碼現存雙數（點擊 +/- 即時微調）</span>
                              {sizeRangeStr && (
                                <span
                                  data-testid={`inventory-size-range-${prod.sku}`}
                                  className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/70 dark:border-indigo-800/70 whitespace-nowrap shadow-2xs"
                                >
                                  尺碼區間：{sizeRangeStr}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {getProductFullDisplayVariants(prod).map((v) => {
                                const level = getStockLevel(v.stock);
                                const sizeStr = v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : v.sizeUS.toString();

                                return (
                                  <div
                                    key={v.id}
                                    className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                                      level === 'out'
                                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200'
                                        : level === 'warning'
                                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs'
                                    }`}
                                  >
                                    <div className="flex items-baseline justify-between">
                                      <span className="text-xs font-black flex items-center gap-1 flex-wrap">
                                        <span>{v.sizeDisplay || `US ${v.sizeUS}`}</span>
                                        {v.sizeDisplay?.includes('童段') && (
                                          <span className="text-[9px] font-bold px-1 rounded bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-300">
                                            童
                                          </span>
                                        )}
                                        {v.sizeDisplay?.includes('大人段') && (
                                          <span className="text-[9px] font-bold px-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
                                            大人
                                          </span>
                                        )}
                                        {!v.sizeDisplay?.includes('童段') && !v.sizeDisplay?.includes('大人段') && (
                                          <>
                                            {(v.sizeDisplay?.endsWith('C') || v.sizeDisplay?.endsWith('c')) && (
                                              <span className="text-[9px] font-bold px-1 rounded bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-300">
                                                童
                                              </span>
                                            )}
                                            {(v.sizeDisplay?.endsWith('Y') || v.sizeDisplay?.endsWith('y')) && (
                                              <span className="text-[9px] font-bold px-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                                青少
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </span>
                                      <span
                                        data-testid={`inventory-stock-number-${prod.sku}-${sizeStr}`}
                                        data-size-display={v.sizeDisplay}
                                        className={`text-xs font-black ${
                                          level === 'out'
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : level === 'warning'
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-emerald-600 dark:text-emerald-400'
                                        }`}
                                      >
                                        {v.stock} 雙
                                      </span>
                                    </div>

                                    {/* Quick + / - Adjuster */}
                                    <div className="flex items-center justify-between gap-1 mt-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                                      <button
                                        type="button"
                                        data-testid={`inventory-btn-minus-${prod.sku}-${sizeStr}`}
                                        disabled={v.stock <= 0}
                                        onClick={() => setDeductTarget({ product: prod, variant: v })}
                                        className="flex-1 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-600 hover:text-rose-600 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer"
                                        title="出庫 -1"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        data-testid={`inventory-btn-plus-${prod.sku}-${sizeStr}`}
                                        onClick={() => onDeductStock(v.id, -1, v)}
                                        className="flex-1 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-600 hover:text-emerald-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                                        title="進貨 +1"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  )}
      </div>

      {/* Direct Deduct Confirmation Popover / Modal */}
      {deductTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    出庫扣減確認
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold">
                    {deductTarget.product.sku}（{deductTarget.variant.sizeDisplay || `US ${deductTarget.variant.sizeUS}`}，現存 {deductTarget.variant.stock} 雙）
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeductTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                data-testid="deduct-option-sale"
                onClick={() => {
                  if (onQuickSale) {
                    onQuickSale(deductTarget.product, deductTarget.variant);
                  } else {
                    onDeductStock(deductTarget.variant.id, 1, deductTarget.variant);
                  }
                  setDeductTarget(null);
                }}
                className="w-full text-left p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>門市售出（計入銷貨）</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    依定價 <strong className="text-emerald-600 font-black">${deductTarget.product.retailPrice}</strong> 記為現金銷貨，扣庫 1 雙
                  </div>
                </div>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  確認售出 &rarr;
                </span>
              </button>

              <button
                type="button"
                data-testid="deduct-option-return"
                onClick={() => {
                  if (onOpenVendorReturn) {
                    onOpenVendorReturn(deductTarget.product, deductTarget.variant.sizeUS);
                  }
                  setDeductTarget(null);
                }}
                className="w-full text-left p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>瑕疵退回 / 盤損出庫</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    開啟廠商退回單據，登記退回原因並扣庫
                  </div>
                </div>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  前往退回 &rarr;
                </span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeductTarget(null)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Advanced Inventory Filter Drawer */}
      <InventoryFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        products={products}
        activeFilters={filters}
        onApplyFilters={(newFilters) => setFilters(newFilters)}
        minPriceBound={minPriceBound}
        maxPriceBound={maxPriceBound}
      />
    </div>
  );
};
