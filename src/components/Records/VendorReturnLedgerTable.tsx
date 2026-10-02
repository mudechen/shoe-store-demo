import React from 'react';
import { VendorReturnRecord } from '../../types/records';
import { ArrowDownLeft, Plus, Calendar, User, AlertCircle, Trash2 } from 'lucide-react';
import { getTaiwanDateStr } from '../../utils/dateUtils';

interface VendorReturnLedgerTableProps {
  records: VendorReturnRecord[];
  onOpenNewVendorReturn: () => void;
  onDeleteRecord?: (recordId: string) => void;
}

export const VendorReturnLedgerTable: React.FC<VendorReturnLedgerTableProps> = ({
  records,
  onOpenNewVendorReturn,
  onDeleteRecord,
}) => {
  const totalQuantity = records.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const totalRefund = records.reduce(
    (sum, r) => sum + (Number(r.refundAmount) || Number(r.creditAmount) || ((Number(r.costPrice) || 0) * (Number(r.quantity) || 0)) || 0),
    0
  );

  return (
    <div className="space-y-3">
      {/* Top Action & Summary Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">退回廠商單據</div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                共 {records.length} 筆單據
              </div>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-new-vendor-return"
            onClick={onOpenNewVendorReturn}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>退回出庫</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
          <span className="text-slate-500">
            退回總雙數：<strong className="text-amber-600 dark:text-amber-400">{totalQuantity}</strong> 雙
          </span>
          <span className="text-slate-500">
            折讓總額：<strong className="text-slate-900 dark:text-white">${totalRefund.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Vendor Return Records List Container */}
      <div data-testid="vendor-return-records-list" className="space-y-2.5">
        {records.map((ret) => {
          const displayDate = ret.date ? getTaiwanDateStr(ret.date) : (ret.timestamp ? getTaiwanDateStr(ret.timestamp) : '今日');
          const displaySize = (() => {
            if (ret.sizeBreakdown && Object.keys(ret.sizeBreakdown).length > 1) {
              return Object.entries(ret.sizeBreakdown).map(([sz, q]) => `${sz}: ${q}雙`).join('、 ');
            }
            if (ret.sizeDisplay) return ret.sizeDisplay;
            if (ret.size) return ret.size;
            if (ret.sizeUS) return `US ${ret.sizeUS}`;
            return '標準';
          })();

          return (
            <div
              key={ret.id}
              data-testid={`vendor-return-record-item-${ret.id}`}
              className="bg-white dark:bg-slate-900 rounded-xl p-3.5 shadow-2xs border border-slate-200 dark:border-slate-800 space-y-2 hover:border-amber-200 dark:hover:border-amber-900 transition-colors"
            >
              {/* Row 1: SKU, Vendor, Refund Amount */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                    {ret.sku}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                    {ret.vendor}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    折讓 ${(ret.refundAmount ?? ret.creditAmount ?? (ret.costPrice ? ret.costPrice * ret.quantity : 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Row 2: Product Name & Color */}
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="truncate pr-2">
                  {ret.productName}{' '}
                  {ret.color && <span className="text-slate-400 font-normal">&bull; {ret.color}</span>}
                </span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {ret.orderId || ret.returnNo || ret.id}
                </span>
              </div>

              {/* Row 3: Return details pill: size, quantity, reason */}
              <div className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap text-slate-700 dark:text-slate-300">
                  <span>尺碼: <strong className="font-bold text-slate-900 dark:text-white break-words">{displaySize}</strong></span>
                  <span>&bull;</span>
                  <span>退回: <strong className="font-bold text-amber-600 dark:text-amber-400">{ret.quantity}</strong> 雙</span>
                </div>
                <div className="flex items-center gap-1 font-black text-amber-700 dark:text-amber-300 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>原因: {ret.reason}</span>
                </div>
              </div>

              {ret.reasonDetail && (
                <div className="text-[11px] text-slate-500 italic pl-1">
                  說明: {ret.reasonDetail}
                </div>
              )}

              {/* Row 4: Date, Operator & Delete */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {displayDate}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    經手人: {ret.operator || '門市人員'}
                  </span>
                </div>

                {onDeleteRecord && (
                  <button
                    type="button"
                    data-testid={`btn-delete-vendor-return-${ret.id}`}
                    onClick={() => {
                      if (window.confirm(`確定要刪除單號「${ret.orderId || ret.sku}」的退回紀錄嗎？此操作將自退回帳本移除。`)) {
                        onDeleteRecord(ret.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer p-1 rounded"
                    title="刪除此筆退回單"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
