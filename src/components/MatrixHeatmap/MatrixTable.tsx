import React, { useMemo } from 'react';
import { ProductWithVariants, SizeUnit, SizeSegment } from '../../types/inventory';
import { getSegmentSizes, parseSizeToNumeric, formatSizeDisplay } from '../../data/sizeStandards';
import { SizeCell } from './SizeCell';
import { MapPin, Inbox, LayoutGrid, Table } from 'lucide-react';
import { useResponsive } from '../../context/ResponsiveContext';

interface MatrixTableProps {
  products: ProductWithVariants[];
  activeUnit: SizeUnit;
  activeSegment?: SizeSegment;
  flashingVariantIds?: Set<string>;
  isCardMode?: boolean;
  isForceMobile?: boolean;
  onToggleCardMode?: () => void;
  onDeduct: (variantId: string, quantity: number) => void;
  onLocateShelf?: (target: {
    productId: string;
    variantId: string;
    displayLocation: string;
    storageLocation: string;
    preferredZone?: 'storefront' | 'backroom';
  }) => void;
}

export const MatrixTable: React.FC<MatrixTableProps> = ({
  products,
  activeUnit,
  activeSegment = 'all',
  flashingVariantIds,
  isCardMode = true,
  isForceMobile = false,
  onToggleCardMode,
  onDeduct,
  onLocateShelf,
}) => {
  const { isMobile } = useResponsive();
  const effectiveMobile = isForceMobile || isMobile;
  const isCards = effectiveMobile ? isCardMode : isCardMode;

  const columnItems = useMemo(() => {
    const sizes = getSegmentSizes(activeSegment, activeUnit);
    return sizes.map((s) => {
      const num = parseSizeToNumeric(s);
      let subLabel = '';
      if (activeUnit === 'ALPHA') {
        subLabel = '通碼';
      } else if (activeUnit === 'US') {
        if (s.includes('大')) subLabel = '大人';
        else subLabel = 'us';
      } else if (activeUnit === 'EU') {
        if (s.includes('童') || num < 32) subLabel = '童段';
        else if (s.includes('青') || (num >= 32 && num < 35)) subLabel = '青少';
        else if (s.includes('大')) subLabel = '大人';
        else subLabel = 'eu';
      } else if (activeUnit === 'CM') {
        if (s.includes('童')) subLabel = '童段';
        else if (s.includes('青')) subLabel = '青少';
        else if (s.includes('大')) subLabel = '大人';
        else subLabel = 'cm';
      }
      return {
        key: s,
        headerLabel: s,
        subLabel,
        sizeUS: num,
        sizeNum: num,
      };
    });
  }, [activeSegment, activeUnit]);

  if (products.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center my-6">
        <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
          查無符合條件的鞋款
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          請嘗試變更搜尋關鍵字或品牌篩選條件。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
      {/* Outer dual-axis scroll container with frozen header and frozen column */}
      <div
        className={`custom-scrollbar relative ${
          effectiveMobile
            ? isCards
              ? 'overflow-visible p-2'
              : 'overflow-auto max-h-[calc(100vh-210px)]'
            : isCards
            ? 'overflow-visible md:overflow-auto md:max-h-[calc(100vh-210px)] p-2 sm:p-3 md:p-0'
            : 'overflow-auto max-h-[calc(100vh-210px)]'
        }`}
      >
        <table
          data-testid="matrix-table"
          className={`w-full text-left border-collapse ${
            effectiveMobile
              ? isCards
                ? 'block'
                : 'min-w-[960px]'
              : isCards
              ? 'block md:table md:min-w-[960px]'
              : 'min-w-[960px]'
          }`}
        >
          {/* Table Header (尺碼凍結頂端列 Sticky Top Size Header) */}
          <thead className="sticky top-0 z-30 matrix-sticky-header">
            <tr className="bg-slate-100/95 dark:bg-slate-800/95 border-b-2 border-slate-300 dark:border-slate-700 text-sm font-black text-slate-800 dark:text-slate-200 backdrop-blur-md">
              {/* Corner: Sticky Shoe Info Column */}
              <th
                className={`matrix-sticky-col sticky top-0 left-0 bg-slate-200/95 dark:bg-slate-800/95 p-2.5 z-40 border-slate-300 dark:border-slate-700 shadow-sm ${
                  effectiveMobile
                    ? isCards ? 'w-full border-b' : 'min-w-[250px] max-w-[300px] border-r-2 sm:p-3.5'
                    : isCards
                    ? 'w-full md:w-auto md:min-w-[250px] md:max-w-[300px] border-r-2 border-b md:border-b-0'
                    : 'min-w-[250px] max-w-[300px] border-r-2 sm:p-3.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-black">👟 鞋款與尺碼庫存 ({products.length}款)</span>
                  <div className="flex items-center gap-1.5">
                    {onToggleCardMode && (
                      <button
                        type="button"
                        data-testid="btn-toggle-card-mode"
                        onClick={onToggleCardMode}
                        className={`${effectiveMobile ? 'flex' : 'flex md:hidden'} items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-slate-300 dark:border-slate-600 shadow-2xs active:scale-95 transition cursor-pointer`}
                      >
                        {isCardMode ? (
                          <>
                            <Table className="w-3 h-3" />
                            <span>橫向大表</span>
                          </>
                        ) : (
                          <>
                            <LayoutGrid className="w-3 h-3" />
                            <span>APP卡片</span>
                          </>
                        )}
                      </button>
                    )}
                    <span className={`${effectiveMobile ? 'hidden' : 'hidden md:inline-block'} text-[10px] sm:text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-300/80 dark:bg-slate-700 px-2 py-0.5 rounded-lg`}>
                      門市 / 後倉
                    </span>
                  </div>
                </div>
              </th>

              {/* Dynamic Size Columns */}
              {columnItems.map((col) => (
                <th
                  key={col.key}
                  data-testid={`matrix-header-${col.key}`}
                  className={`sticky top-0 p-2.5 text-center min-w-[64px] border-l border-slate-200 dark:border-slate-700 bg-slate-100/95 dark:bg-slate-800/95 z-30 shadow-xs ${
                    effectiveMobile ? (isCards ? 'hidden' : '') : (isCards ? 'hidden md:table-cell' : '')
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-base font-mono font-black text-slate-950 dark:text-white">
                      {col.headerLabel}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {col.subLabel}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody
            className={`text-sm ${
              effectiveMobile
                ? isCards
                  ? 'block space-y-3.5'
                  : 'divide-y divide-slate-200 dark:divide-slate-800/80'
                : isCards
                ? 'block md:table-row-group space-y-3.5 md:space-y-0 md:divide-y divide-slate-200 dark:divide-slate-800/80'
                : 'divide-y divide-slate-200 dark:divide-slate-800/80'
            }`}
          >
            {products.map((product) => {
              // Create quick map of sizeUS -> variant
              const variantMap = new Map<number, typeof product.variants[0]>();
              product.variants.forEach((v) => variantMap.set(v.sizeUS, v));

              // Compute total stock of this shoe
              const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);

              return (
                <tr
                  key={product.id}
                  data-testid={`product-row-${product.sku}`}
                  className={`transition-all group ${
                    effectiveMobile
                      ? isCards
                        ? 'block bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/90 dark:border-slate-800 p-3 shadow-sm'
                        : 'hover:bg-indigo-50/40 dark:hover:bg-slate-800/50'
                      : isCards
                      ? 'block md:table-row bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/90 dark:border-slate-800 p-3 sm:p-4 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800'
                      : 'hover:bg-indigo-50/40 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* Sticky Shoe Summary Header Cell */}
                  <td
                    className={`${
                      effectiveMobile
                        ? isCards
                          ? 'block p-0 border-0 mb-3'
                          : 'matrix-sticky-col bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90 p-3.5 z-20 border-r-2 border-slate-200 dark:border-slate-800'
                        : isCards
                        ? 'block md:table-cell p-0 md:p-3.5 border-0 md:border-r-2 md:border-slate-200 md:dark:border-slate-800 mb-3 md:mb-0'
                        : 'matrix-sticky-col bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90 p-3.5 z-20 border-r-2 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      {/* Brand, SKU & Price */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-block text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200">
                            {product.brand}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {product.sku}
                          </span>
                        </div>
                        <span className="font-mono text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                          NT$ {product.retailPrice.toLocaleString()}
                        </span>
                      </div>

                      {/* Shoe Title & In-Stock Count */}
                      <div className="flex items-baseline justify-between gap-2">
                        <div
                          className="font-black text-slate-950 dark:text-white text-base sm:text-lg line-clamp-1 leading-snug"
                          title={product.name}
                        >
                          {product.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold shrink-0">
                          在庫: <strong className="text-indigo-700 dark:text-indigo-300 text-sm sm:text-base font-black">{totalStock}</strong> 雙
                        </div>
                      </div>

                      {/* Locations Row */}
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (onLocateShelf) {
                              onLocateShelf({
                                productId: product.id,
                                variantId: product.variants[0]?.id || '',
                                displayLocation: product.displayLocation,
                                storageLocation: product.storageLocation,
                                preferredZone: 'storefront',
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-slate-700 font-mono font-black cursor-pointer border border-indigo-200 dark:border-indigo-800 transition active:scale-95"
                          title="查看門市展架"
                        >
                          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                          <span>門市:{product.displayLocation}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onLocateShelf) {
                              onLocateShelf({
                                productId: product.id,
                                variantId: product.variants[0]?.id || '',
                                displayLocation: product.displayLocation,
                                storageLocation: product.storageLocation,
                                preferredZone: 'backroom',
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 font-mono font-black cursor-pointer border border-emerald-200 dark:border-emerald-800 transition active:scale-95"
                          title="查看後倉排架"
                        >
                          <span>後倉:{product.storageLocation}</span>
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Dynamic Size Cells */}
                  {columnItems.map((col) => {
                    const variant =
                      product.variants.find((v) => {
                        if (!v.sizeDisplay) return false;
                        if (v.sizeDisplay === col.key) return true;
                        if (col.key.includes('童段 20') && v.sizeDisplay.includes('童段 20')) return true;
                        if (col.key.includes('大人段 20') && v.sizeDisplay.includes('大人段 20')) return true;
                        return false;
                      }) ||
                      product.variants.find((v) => activeUnit === 'ALPHA' && formatSizeDisplay(v.sizeUS, 'ALPHA', v.sizeDisplay) === col.key) ||
                      product.variants.find((v) => {
                        if (activeUnit === 'US') {
                          if (col.key.endsWith('C') || col.key.endsWith('c')) {
                            return v.sizeDisplay?.toUpperCase() === col.key.toUpperCase();
                          }
                          if (col.key.endsWith('Y') || col.key.endsWith('y')) {
                            return v.sizeDisplay?.toUpperCase() === col.key.toUpperCase();
                          }
                          if (v.sizeDisplay && (v.sizeDisplay.endsWith('C') || v.sizeDisplay.endsWith('c') || v.sizeDisplay.endsWith('Y') || v.sizeDisplay.endsWith('y') || v.sizeDisplay.includes('童'))) {
                            return false;
                          }
                          return (
                            (v.sizeUS % 1 === 0 ? v.sizeUS.toFixed(1) : String(v.sizeUS)) === col.key ||
                            Math.abs(v.sizeUS - col.sizeNum) < 0.05
                          );
                        }
                        if (activeUnit === 'EU') {
                          return (
                            String(v.sizeEU) === col.key ||
                            (v.sizeEU % 1 === 0 ? v.sizeEU.toFixed(1) : String(v.sizeEU)) === col.key ||
                            Math.abs(v.sizeEU - col.sizeNum) < 0.25
                          );
                        }
                        if (activeUnit === 'CM') {
                          if (col.key.includes('童段 20')) {
                            return v.sizeDisplay?.includes('童段 20');
                          }
                          if (col.key.includes('大人段 20')) {
                            return v.sizeDisplay?.includes('大人段 20');
                          }
                          return (
                            String(v.sizeCM) === col.key ||
                            v.sizeCM.toFixed(1) === col.key ||
                            Math.abs(v.sizeCM - col.sizeNum) < 0.25
                          );
                        }
                        return false;
                      }) ||
                      product.variants.find((v) => {
                        if (col.key.endsWith('C') || col.key.endsWith('Y') || col.key.includes('童') || col.key.includes('大')) {
                          return false;
                        }
                        if (v.sizeDisplay && (v.sizeDisplay.endsWith('C') || v.sizeDisplay.endsWith('Y') || v.sizeDisplay.includes('童') || v.sizeDisplay.includes('大'))) {
                          return false;
                        }
                        return Math.abs(v.sizeUS - col.sizeNum) < 0.05;
                      }) || {
                        id: `var-missing-${product.sku}-${encodeURIComponent(col.key).replace(/%/g, '_')}`,
                        productId: product.id,
                        sizeUS: col.sizeNum,
                        sizeEU: Math.round(col.sizeNum * 1.5 + 31),
                        sizeCM: Math.round((col.sizeNum + 18) * 10) / 10,
                        sizeDisplay: col.key,
                        stock: 0,
                      };

                    const sizeLabel =
                      activeUnit === 'ALPHA'
                        ? col.key
                        : `${col.headerLabel}${col.subLabel ? ` (${col.subLabel})` : ''}`;

                    return (
                      <td
                        key={col.key}
                        className={`${
                          effectiveMobile
                            ? isCards
                              ? 'inline-block w-[calc(25%-4px)] p-0.5 border-0'
                              : 'p-1 border-l'
                            : isCards
                            ? 'inline-block w-[calc(25%-4px)] md:w-auto md:table-cell p-0.5 md:p-1 border-0 md:border-l'
                            : 'p-1 border-l'
                        } text-center align-middle border-slate-100 dark:border-slate-800/60`}
                      >
                        {isCards && (
                          <div className={`text-[10px] sm:text-[11px] font-mono font-black text-slate-500 dark:text-slate-400 mb-0.5 text-center leading-none ${effectiveMobile ? '' : 'md:hidden'}`}>
                            {sizeLabel}
                          </div>
                        )}
                        <SizeCell
                          sku={product.sku}
                          brand={product.brand}
                          productName={product.name}
                          color={product.color}
                          displayLocation={product.displayLocation}
                          storageLocation={product.storageLocation}
                          variant={variant}
                          activeUnit={activeUnit}
                          isFlashing={flashingVariantIds?.has(variant.id)}
                          onDeduct={onDeduct}
                          onLocateShelf={onLocateShelf}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
