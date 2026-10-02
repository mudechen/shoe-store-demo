import React, { useState, useEffect } from 'react';
import { ReservationRecord } from '../../types/reservations';
import { PaymentMethod } from '../../types/sales';
import { CheckCircle2, DollarSign, X, AlertCircle } from 'lucide-react';

interface FulfillReservationModalProps {
  isOpen: boolean;
  reservation: ReservationRecord | null;
  onClose: () => void;
  onConfirmFulfill: (reservation: ReservationRecord, finalPaymentMethod: PaymentMethod) => void;
}

export const FulfillReservationModal: React.FC<FulfillReservationModalProps> = ({
  isOpen,
  reservation,
  onClose,
  onConfirmFulfill,
}) => {
  const [finalPaymentMethod, setFinalPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFinalPaymentMethod('cash');
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen || !reservation) return null;

  const handleConfirm = () => {
    setIsProcessing(true);
    try {
      onConfirmFulfill(reservation, finalPaymentMethod);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      data-testid="fulfill-reservation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                客戶取貨結清
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                收訖尾款並自動轉正式銷貨扣減庫存
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Reservation Card Details */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {reservation.customerName}
              </span>
              <span className="text-xs font-mono text-slate-500 font-bold">
                {reservation.customerPhone}
              </span>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 font-bold">
              {reservation.brand} &bull; {reservation.productName} ({reservation.color})
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-black">
                {reservation.sku}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black">
                {reservation.sizeDisplay || (reservation.sizeUS ? `US ${reservation.sizeUS}` : '標準碼')}
              </span>
            </div>
          </div>

          {/* Pricing & Deposit Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>預定總金額</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                ${reservation.retailPrice.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>已收定金</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                -${reservation.depositPaid.toLocaleString()}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
              <span className="font-black text-slate-900 dark:text-white text-sm">
                本日應收尾款
              </span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                ${Math.max(0, reservation.remainingBalance).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Final Payment Method Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
              尾款收取方式
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash' as PaymentMethod, label: '現金' },
                { id: 'credit' as PaymentMethod, label: '信用卡' },
                { id: 'mobile_pay' as PaymentMethod, label: '行動支付' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFinalPaymentMethod(m.id)}
                  className={`py-2 px-1 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                    finalPaymentMethod === m.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200/60 dark:border-amber-900/60">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>點擊確認後將完成抵銷，即時扣減門市現貨 1 雙並計入今日營業額。</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            data-testid="btn-confirm-fulfill-reservation"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <DollarSign className="w-4 h-4" />
            <span>確認收訖並出庫</span>
          </button>
        </div>
      </div>
    </div>
  );
};
