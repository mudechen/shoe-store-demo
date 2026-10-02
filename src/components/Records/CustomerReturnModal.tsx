import React, { useState, useEffect } from 'react';
import { SaleRecord } from '../../types/sales';
import { CustomerReturnReason, CUSTOMER_RETURN_REASONS } from '../../types/records';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';
import { formatSaleSizeDisplay } from '../../data/sizeStandards';

interface CustomerReturnModalProps {
  isOpen: boolean;
  sale: SaleRecord | null;
  onClose: () => void;
  onConfirm: (saleId: string, reason: CustomerReturnReason, note?: string) => void;
}

export const CustomerReturnModal: React.FC<CustomerReturnModalProps> = ({
  isOpen,
  sale,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState<CustomerReturnReason>('尺寸不合');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('尺寸不合');
      setNote('');
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(sale.id, reason, note.trim() || undefined);
    onClose();
  };

  return (
    <div
      data-testid="return-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-rose-500/10 to-amber-500/10 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">顧客退貨登記</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                標記退貨並自動回補門市庫存 1 雙
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Sale Summary Card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {sale.sku}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-300">
                  {sale.brand}
                </span>
              </div>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                實收: ${sale.actualPaid.toLocaleString()}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
              {sale.productName} &bull; <span className="text-slate-400">{sale.color}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-bold flex items-center justify-between pt-1">
              <span>尺碼: {formatSaleSizeDisplay(sale.sizeDisplay, sale.sizeUS)}</span>
              <span>付款: {sale.paymentMethod === 'cash' ? '現金' : sale.paymentMethod === 'credit' ? '信用卡' : '行動支付'}</span>
            </div>
          </div>

          {/* Return Reason Dropdown */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
              退貨原因 <span className="text-rose-500">*</span>
            </label>
            <select
              data-testid="select-return-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as CustomerReturnReason)}
              className="w-full text-xs font-black px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500"
            >
              {CUSTOMER_RETURN_REASONS.map((r) => (
                <option key={r} value={r} label={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
              備註說明（選填）
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：原盒完整、發票已作廢"
              className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>確認後門市庫存對應尺碼將自動回補 +1 雙，並更新銷貨狀態為「已退貨」。</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              data-testid="btn-confirm-return"
              className="px-5 py-2 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>確認退貨</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
