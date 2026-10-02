import React, { useEffect } from 'react';
import { ProductWithVariants } from '../../types/inventory';
import { StockInRecord } from '../../types/records';
import { StockInView } from './StockInView';
import { X } from 'lucide-react';

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductWithVariants[];
  initialSku?: string;
  initialColor?: string;
  editingProduct?: ProductWithVariants | null;
  onStockInSuccess: (product: ProductWithVariants, isNewProduct: boolean, record?: StockInRecord) => void;
  onSaveEdit?: (updatedProduct: ProductWithVariants, record?: StockInRecord) => void;
  onNavigateToRecords?: (sku?: string) => void;
}

export const StockInModal: React.FC<StockInModalProps> = ({
  isOpen,
  onClose,
  products,
  initialSku,
  initialColor,
  editingProduct = null,
  onStockInSuccess,
  onSaveEdit,
  onNavigateToRecords,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-testid="stockin-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg my-auto max-h-[95vh] overflow-y-auto relative">
        <button
          type="button"
          data-testid="btn-close-stockin-modal"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-xs"
        >
          <X className="w-4 h-4" />
        </button>
        <StockInView
          products={products}
          initialSku={initialSku}
          initialColor={initialColor}
          editingProduct={editingProduct}
          onStockInSuccess={(prod, isNew, record) => {
            onStockInSuccess(prod, isNew, record);
            onClose();
          }}
          onSaveEdit={(prod, record) => {
            onSaveEdit?.(prod, record);
            onClose();
          }}
          onNavigateToRecords={(sku) => {
            onClose();
            onNavigateToRecords?.(sku);
          }}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};
