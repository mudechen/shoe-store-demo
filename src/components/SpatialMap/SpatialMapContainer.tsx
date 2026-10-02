import React, { useState } from 'react';
import { ProductWithVariants, SizeUnit } from '../../types/inventory';
import { BackroomMap } from './BackroomMap';
import { ShelfDetailDrawer } from './ShelfDetailDrawer';
import { Warehouse, Target } from 'lucide-react';

interface SpatialMapContainerProps {
  products: ProductWithVariants[];
  activeUnit: SizeUnit;
  activeTarget?: {
    productId: string;
    variantId?: string;
    displayLocation: string;
    storageLocation: string;
    preferredZone?: 'storefront' | 'backroom';
  } | null;
  onClearActiveTarget?: () => void;
  onDeduct: (variantId: string, quantity: number) => void;
  onLocateShelf?: (target: {
    productId: string;
    variantId: string;
    displayLocation: string;
    storageLocation: string;
  }) => void;
}

export const SpatialMapContainer: React.FC<SpatialMapContainerProps> = ({
  products,
  activeUnit,
  activeTarget,
  onClearActiveTarget,
  onDeduct,
}) => {
  // Drawer state for shelf inspection
  const [selectedShelfCode, setSelectedShelfCode] = useState<string | null>(null);

  // In warehouse-only mode, the highlighted location is always the storage location
  const currentHighlightedCode = activeTarget?.storageLocation || null;

  return (
    <div className="space-y-4 mb-8 w-full max-w-full overflow-hidden">
      {/* Top Controls Card: Warehouse Header & Senior Legend */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Header Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-950 dark:text-white">
                實體後倉儲位排架地圖 (R1 ~ R4 排架)
              </h3>
              <p className="text-xs sm:text-sm font-bold text-slate-500">
                點擊任意格位可展開該架位在庫鞋盒明細，並支援快速出庫扣減
              </p>
            </div>
          </div>

          {/* Map Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-sm bg-emerald-100 border-2 border-emerald-500 inline-block"></span>
              <span>3 雙以上</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-sm bg-amber-100 border-2 border-amber-500 inline-block"></span>
              <span>1~2 雙</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-sm bg-red-100 border-2 border-red-500 inline-block"></span>
              <span>0 雙</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-sm bg-slate-100 border-2 border-dashed border-slate-300 dark:border-slate-700 inline-block"></span>
              <span>空置架位</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-sm bg-indigo-600 ring-2 ring-indigo-300 animate-pulse inline-block"></span>
              <span className="text-indigo-600 dark:text-indigo-400 font-black">當前鎖定</span>
            </span>
          </div>
        </div>

        {/* Active Navigation Floating Bar (If a shoe is selected) */}
        {activeTarget && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl text-sm text-emerald-950 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse shrink-0" />
              <span className="font-bold">
                正在導航後倉架位：
                <span className="font-mono font-black text-base px-2 py-0.5 rounded bg-emerald-600 text-white shadow-xs ml-1">
                  {activeTarget.storageLocation}
                </span>
              </span>
            </div>

            {onClearActiveTarget && (
              <button
                type="button"
                onClick={onClearActiveTarget}
                className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white bg-emerald-200/60 hover:bg-emerald-200 px-3 py-1 rounded-lg transition cursor-pointer"
              >
                取消導航鎖定
              </button>
            )}
          </div>
        )}
      </div>

      {/* Warehouse Map View */}
      <div className="transition-opacity duration-200">
        <BackroomMap
          products={products}
          highlightedLocationCode={currentHighlightedCode}
          onSelectShelf={(code) => setSelectedShelfCode(code)}
        />
      </div>

      {/* Interactive Shelf Detail Drawer / Modal */}
      <ShelfDetailDrawer
        isOpen={Boolean(selectedShelfCode)}
        locationCode={selectedShelfCode}
        products={products}
        activeUnit={activeUnit}
        onClose={() => setSelectedShelfCode(null)}
        onDeduct={onDeduct}
      />
    </div>
  );
};
