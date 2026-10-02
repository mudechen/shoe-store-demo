import React, { useRef, useEffect } from 'react';
import { ProductWithVariants } from '../../types/inventory';
import { Package, Target } from 'lucide-react';

interface ShelfSlotProps {
  locationCode: string;
  zoneType: 'storefront' | 'backroom';
  layer: number;
  column: number;
  shoes: ProductWithVariants[];
  isSelected: boolean;
  onClick: (locationCode: string) => void;
}

export const ShelfSlot: React.FC<ShelfSlotProps> = ({
  locationCode,
  zoneType,
  shoes,
  isSelected,
  onClick,
}) => {
  const slotRef = useRef<HTMLButtonElement>(null);

  // Auto scroll into view when this slot is selected by navigation
  useEffect(() => {
    if (isSelected && slotRef.current) {
      slotRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [isSelected]);

  // Compute total pairs stored at this shelf location
  const totalStock = shoes.reduce(
    (acc, shoe) => acc + shoe.variants.reduce((sum, v) => sum + v.stock, 0),
    0
  );

  const isOccupied = shoes.length > 0;
  const primaryShoe = shoes[0];

  return (
    <button
      ref={slotRef}
      type="button"
      data-testid={`shelf-slot-${locationCode}`}
      onClick={() => onClick(locationCode)}
      className={`relative w-full text-left rounded-xl p-2.5 transition-all duration-200 border cursor-pointer select-none group flex flex-col justify-between ${
        zoneType === 'backroom' ? 'min-h-[82px]' : 'min-h-[96px]'
      } ${
        isSelected
          ? 'ring-4 ring-indigo-500 active animate-pulse border-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/60 shadow-lg shadow-indigo-500/20 z-10'
          : isOccupied
          ? 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5'
          : 'bg-slate-50/60 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
      }`}
      title={`${locationCode} (${isOccupied ? `${shoes.length} 款鞋, ${totalStock} 雙` : '空置'})`}
    >
      {/* Top row: Location code & Status/Stock badge */}
      <div className="flex items-center justify-between gap-1 w-full">
        <span
          className={`font-mono text-[11px] font-black tracking-tight px-1.5 py-0.5 rounded ${
            isSelected
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600'
          }`}
        >
          {locationCode}
        </span>

        {isSelected ? (
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
            <Target className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
            <span>導航中</span>
          </span>
        ) : isOccupied ? (
          <span
            className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
              totalStock === 0
                ? 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300'
                : totalStock <= 2
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
            }`}
          >
            {totalStock} 雙
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
            空置
          </span>
        )}
      </div>

      {/* Center content: Shoe Information */}
      {isOccupied ? (
        <div className="my-1 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {primaryShoe.brand}
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
              {primaryShoe.sku}
            </span>
          </div>
          <div
            className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
            title={primaryShoe.name}
          >
            {primaryShoe.name}
          </div>
          {shoes.length > 1 && (
            <span className="text-[10px] text-indigo-500 font-semibold mt-0.5">
              + 另有 {shoes.length - 1} 款
            </span>
          )}
        </div>
      ) : (
        <div className="my-1 flex items-center justify-center text-slate-300 dark:text-slate-700 py-1">
          <Package className="w-4 h-4" />
        </div>
      )}

      {/* Bottom row: Visual accent line */}
      <div className="w-full pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
        <span className="capitalize">
          {zoneType === 'storefront' ? '陳列' : '後倉'}
        </span>
        <span className="group-hover:text-indigo-500 transition-colors font-sans">
          點擊查看 &rarr;
        </span>
      </div>
    </button>
  );
};
