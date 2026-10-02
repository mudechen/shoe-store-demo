import React, { useEffect } from 'react';
import { ProductWithVariants, SizeUnit, getStockLevel } from '../../types/inventory';
import { getLocationDescription } from '../../data/storeLayout';
import { formatSizeDisplay } from '../../data/sizeStandards';
import { X, MapPin, Package, Minus, Plus, Sparkles } from 'lucide-react';

interface ShelfDetailDrawerProps {
  isOpen: boolean;
  locationCode: string | null;
  products: ProductWithVariants[];
  activeUnit: SizeUnit;
  onClose: () => void;
  onDeduct: (variantId: string, quantity: number) => void;
}

export const ShelfDetailDrawer: React.FC<ShelfDetailDrawerProps> = ({
  isOpen,
  locationCode,
  products,
  activeUnit,
  onClose,
  onDeduct,
}) => {
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

  if (!isOpen || !locationCode) return null;

  // Filter products located at this shelf (displayLocation or storageLocation)
  const matchingShoes = products.filter(
    (p) =>
      p.displayLocation.toUpperCase() === locationCode.toUpperCase() ||
      p.storageLocation.toUpperCase() === locationCode.toUpperCase()
  );

  const totalPairs = matchingShoes.reduce(
    (acc, shoe) => acc + shoe.variants.reduce((sum, v) => sum + v.stock, 0),
    0
  );

  const description = getLocationDescription(locationCode);
  const isBackroom = locationCode.startsWith('R');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        data-testid="shelf-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`架位明細 ${locationCode}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl flex items-center justify-center ${
                isBackroom
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
              }`}
            >
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  {locationCode}
                </h3>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isBackroom
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                  }`}
                >
                  {isBackroom ? '後倉排架格位' : '門市展示陳列格位'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400 font-sans">架位總存量</div>
              <div className="text-base font-mono font-black text-slate-800 dark:text-slate-200">
                {totalPairs} <span className="text-xs font-normal text-slate-400">雙</span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="關閉"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar space-y-4">
          {matchingShoes.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
                此架位目前未配置鞋款 (空置)
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                可於 Excel 匯入或商品設定中，將展示或儲放位置設定為{' '}
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {locationCode}
                </span>
                。
              </p>
            </div>
          ) : (
            matchingShoes.map((shoe) => {
              const shoeStock = shoe.variants.reduce((sum, v) => sum + v.stock, 0);

              return (
                <div
                  key={shoe.id}
                  data-testid="shelf-drawer-item"
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* Shoe Header Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          {shoe.brand}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-400">
                          {shoe.sku}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {shoe.category}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white">
                        {shoe.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {shoe.color}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                      <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                        NT$ {shoe.retailPrice.toLocaleString()}
                      </div>
                      <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        此款在庫: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{shoeStock}</strong> 雙
                      </div>
                    </div>
                  </div>

                  {/* Dual Locations Reference */}
                  <div className="flex items-center gap-3 my-2.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-lg font-mono">
                    <span>
                      門市展示: <strong className="text-indigo-600 dark:text-indigo-400">{shoe.displayLocation}</strong>
                    </span>
                    <span>|</span>
                    <span>
                      後倉儲放: <strong className="text-emerald-600 dark:text-emerald-400">{shoe.storageLocation}</strong>
                    </span>
                  </div>

                  {/* Size Matrix Grid & Direct Deduction */}
                  <div className="mt-3">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                      <span>尺碼在庫矩陣與極速出庫：</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        點擊 [-1] 按鈕即時扣減
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {shoe.variants.map((v) => {
                        const level = getStockLevel(v.stock);
                        const isOutOfStock = v.stock <= 0;

                        return (
                          <div
                            key={v.id}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-between gap-1 transition-colors ${
                              level === 'out'
                                ? 'bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
                                : level === 'warning'
                                ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
                                : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                            }`}
                          >
                            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                              {formatSizeDisplay(v.sizeUS, activeUnit, v.sizeDisplay)}
                            </span>
                            <span
                              className={`text-xs font-mono font-black ${
                                level === 'out'
                                  ? 'text-red-700 dark:text-red-400'
                                  : level === 'warning'
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              {v.stock} 雙
                            </span>

                            {/* Rapid +/- actions */}
                            <div className="flex items-center gap-1 mt-0.5 w-full">
                              <button
                                type="button"
                                onClick={() => onDeduct(v.id, 1)}
                                disabled={isOutOfStock}
                                title={isOutOfStock ? '已斷碼' : '出庫 1 雙'}
                                className={`flex-1 py-1 rounded text-[11px] font-bold flex items-center justify-center transition cursor-pointer ${
                                  isOutOfStock
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-red-500 hover:bg-red-600 text-white shadow-xs'
                                }`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeduct(v.id, -1)}
                                title="補貨 +1 雙"
                                className="flex-1 py-1 rounded text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
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
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>架位支援實體雙向連動與即時扣庫更新</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 transition cursor-pointer"
          >
            完成並返回
          </button>
        </div>
      </div>
    </div>
  );
};
