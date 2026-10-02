import React from 'react';
import { MapPin, X, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ShoeVariant, SizeUnit, getStockLevel } from '../../types/inventory';
import { formatSizeDisplay } from '../../data/sizeStandards';

interface DeductPopoverProps {
  sku: string;
  brand: string;
  productName: string;
  color: string;
  displayLocation: string;
  storageLocation: string;
  variant: ShoeVariant;
  activeUnit: SizeUnit;
  onDeduct: (variantId: string, quantity: number) => void;
  onClose?: () => void;
  onLocateShelf?: (target: {
    productId: string;
    variantId: string;
    displayLocation: string;
    storageLocation: string;
    preferredZone?: 'storefront' | 'backroom';
  }) => void;
}

export const DeductPopover: React.FC<DeductPopoverProps> = ({
  sku,
  brand,
  productName,
  color,
  displayLocation,
  storageLocation,
  variant,
  activeUnit,
  onDeduct,
  onClose,
  onLocateShelf,
}) => {
  const stockLevel = getStockLevel(variant.stock);
  const isOutOfStock = variant.stock <= 0;

  const handleDeduct = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onDeduct(variant.id, 1);
  };

  const handleRestock = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeduct(variant.id, -1);
  };

  const handleLocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLocateShelf) {
      onLocateShelf({
        productId: variant.productId,
        variantId: variant.id,
        displayLocation,
        storageLocation,
      });
    }
  };

  return (
    <div
      data-testid="deduct-popover"
      className="fixed sm:absolute z-50 left-4 right-4 bottom-24 sm:bottom-auto sm:inset-x-auto sm:top-full sm:mt-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-72 max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 p-4 animate-in fade-in zoom-in-95 duration-150 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {brand}
            </span>
            <span className="text-xs font-mono text-slate-400">{sku}</span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
            {productName}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">{color}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="關閉"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Size & Stock Information */}
      <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg text-xs">
        <div>
          <span className="text-slate-400 block mb-0.5">尺碼</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            {formatSizeDisplay(variant.sizeUS, activeUnit, variant.sizeDisplay)}
          </span>
          <span className="text-xs text-slate-400 block mt-0.5 font-medium">
            {variant.sizeDisplay ? `${variant.sizeDisplay} • ` : ''}US {variant.sizeUS % 1 === 0 ? variant.sizeUS.toFixed(1) : variant.sizeUS} / EU {variant.sizeEU} / {variant.sizeCM % 1 === 0 ? variant.sizeCM.toFixed(1) : variant.sizeCM}cm
          </span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5 text-xs">在庫狀態</span>
          <div
            data-testid="stock-badge"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs ${
              stockLevel === 'out'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                : stockLevel === 'warning'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
            }`}
          >
            {stockLevel === 'out' && <XCircle className="w-3.5 h-3.5" />}
            {stockLevel === 'warning' && <AlertTriangle className="w-3.5 h-3.5" />}
            {stockLevel === 'sufficient' && <CheckCircle className="w-3.5 h-3.5" />}
            <span>{variant.stock} 雙</span>
          </div>
        </div>
      </div>

      {/* Location Tags */}
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-3.5 bg-slate-100/70 dark:bg-slate-800/40 px-3 py-2 rounded-lg">
        <span className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-bold">門市展架:</span>
          <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{displayLocation}</strong>
        </span>
        <span className="text-slate-300 dark:text-slate-700 font-bold">|</span>
        <span className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-bold">後倉架位:</span>
          <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{storageLocation}</strong>
        </span>
      </div>

      {/* Action Buttons (< 2 clicks deduction) */}
      <div className="flex gap-2">
        <span className="flex-1" data-testid="btn-deduct-stock">
          <button
            data-testid="btn-deduct-one"
            onClick={handleDeduct}
            disabled={isOutOfStock}
            className={`w-full py-2.5 px-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer ${
              isOutOfStock
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 hover:shadow-red-500/30'
            }`}
            title={isOutOfStock ? '已斷碼無法扣減' : '極速出庫 1 雙'}
          >
            <span>{isOutOfStock ? '斷碼缺貨' : '-1 售出'}</span>
          </button>
        </span>

        <button
          onClick={handleRestock}
          className="py-2.5 px-3.5 rounded-xl font-black text-sm border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center transition cursor-pointer"
          title="補貨 +1 雙"
        >
          <span>+1</span>
        </button>

        <button
          data-testid="btn-locate-shelf"
          onClick={handleLocate}
          className="py-2.5 px-3 rounded-xl font-black text-sm bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition flex items-center justify-center gap-1.5 cursor-pointer"
          title="定位實體貨架"
        >
          <MapPin className="w-4 h-4" />
          <span>找鞋</span>
        </button>
      </div>
    </div>
  );
};
