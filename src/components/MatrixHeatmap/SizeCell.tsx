import React, { useState, useRef, useEffect } from 'react';
import { ShoeVariant, SizeUnit, getStockLevel } from '../../types/inventory';
import { DeductPopover } from './DeductPopover';

interface SizeCellProps {
  sku: string;
  brand: string;
  productName: string;
  color: string;
  displayLocation: string;
  storageLocation: string;
  variant: ShoeVariant;
  activeUnit: SizeUnit;
  isFlashing?: boolean;
  onDeduct: (variantId: string, quantity: number) => void;
  onLocateShelf?: (target: {
    productId: string;
    variantId: string;
    displayLocation: string;
    storageLocation: string;
    preferredZone?: 'storefront' | 'backroom';
  }) => void;
}

export const SizeCell: React.FC<SizeCellProps> = ({
  sku,
  brand,
  productName,
  color,
  displayLocation,
  storageLocation,
  variant,
  activeUnit,
  isFlashing,
  onDeduct,
  onLocateShelf,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const stockLevel = getStockLevel(variant.stock);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Color tokens with high-contrast borders and large text for senior readability
  const colorStyles = isFlashing
    ? 'bg-amber-300 dark:bg-amber-600 text-amber-950 dark:text-white border-amber-500 ring-4 ring-yellow-400 animate-pulse z-20'
    : {
        out: 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-200 border-red-400 dark:border-red-700 hover:border-red-600 stock-out',
        warning: 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-700 hover:border-amber-600 stock-warning',
        sufficient: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-400 dark:border-emerald-700 hover:border-emerald-600 stock-healthy'
      }[stockLevel];

  const handleCellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleDeductStock = (variantId: string, quantity: number) => {
    onDeduct(variantId, quantity);
  };

  return (
    <div
      ref={cellRef}
      data-testid={`matrix-cell-${sku}-${variant.sizeUS.toFixed(1)}`}
      className="relative p-1 flex items-center justify-center w-full"
    >
      <button
        type="button"
        data-testid={`size-cell-${sku}-${variant.sizeUS.toFixed(1)}`}
        data-size-display={variant.sizeDisplay}
        data-size-us={variant.sizeUS}
        onClick={handleCellClick}
        aria-expanded={isOpen}
        aria-label={`${productName} ${variant.sizeDisplay || `US ${variant.sizeUS}`} 庫存 ${variant.stock} 雙`}
        className={`w-full min-h-[58px] min-w-[50px] px-1.5 py-2 rounded-xl border-2 font-mono font-black flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs select-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-500 ${colorStyles} ${
          isOpen ? 'ring-4 ring-indigo-500 scale-105 z-30' : ''
        }`}
      >
        <span className="stock-number text-xl sm:text-2xl tracking-tight leading-none font-black">
          {variant.stock}
        </span>
        <span className="text-[11px] sm:text-xs font-sans font-bold mt-0.5 leading-none tracking-tight">
          雙
        </span>
      </button>

      {/* Micro Action Popover */}
      {isOpen && (
        <DeductPopover
          sku={sku}
          brand={brand}
          productName={productName}
          color={color}
          displayLocation={displayLocation}
          storageLocation={storageLocation}
          variant={variant}
          activeUnit={activeUnit}
          onDeduct={handleDeductStock}
          onClose={() => setIsOpen(false)}
          onLocateShelf={(target) => {
            setIsOpen(false);
            if (onLocateShelf) onLocateShelf(target);
          }}
        />
      )}
    </div>
  );
};
