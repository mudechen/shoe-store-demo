import React from 'react';
import { SaleRecord } from '../../types/sales';
import { RotateCcw, CreditCard, Banknote, Smartphone, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { getTaiwanDateTimeStr } from '../../utils/dateUtils';
import { formatSaleSizeDisplay } from '../../data/sizeStandards';

interface SalesLedgerTableProps {
  sales: SaleRecord[];
  activeSubFilter: 'all' | 'completed' | 'returned';
  onChangeSubFilter: (filter: 'all' | 'completed' | 'returned') => void;
  onInitiateReturn: (sale: SaleRecord) => void;
  onNavigateToCashier?: () => void;
  onDeleteSale?: (saleId: string) => void;
}

export const SalesLedgerTable: React.FC<SalesLedgerTableProps> = ({
  sales,
  activeSubFilter,
  onChangeSubFilter,
  onInitiateReturn,
  onNavigateToCashier,
  onDeleteSale,
}) => {
  const completedCount = sales.filter((s) => s.status !== 'returned').length;
  const returnedCount = sales.filter((s) => s.status === 'returned').length;

  const filteredSales = sales.filter((sale) => {
    if (activeSubFilter === 'completed') return sale.status !== 'returned';
    if (activeSubFilter === 'returned') return sale.status === 'returned';
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Top Action & Summary Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">銷貨流水帳</div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                共 {sales.length} 筆明細
              </div>
            </div>
          </div>

          {onNavigateToCashier && (
            <button
              type="button"
              data-testid="btn-sales-cashier"
              onClick={onNavigateToCashier}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>銷貨記帳</span>
            </button>
          )}
        </div>

        {/* Sub-Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            type="button"
            data-testid="sales-filter-all"
            onClick={() => onChangeSubFilter('all')}
            className={`flex-1 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
              activeSubFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            全部 ({sales.length})
          </button>
          <button
            type="button"
            data-testid="sales-filter-completed"
            onClick={() => onChangeSubFilter('completed')}
            className={`flex-1 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
              activeSubFilter === 'completed'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            已售出 ({completedCount})
          </button>
          <button
            type="button"
            data-testid="sales-filter-returned"
            onClick={() => onChangeSubFilter('returned')}
            className={`flex-1 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
            activeSubFilter === 'returned'
              ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          已退貨 ({returnedCount})
        </button>
      </div>
    </div>

      {/* Sales Records List Container */}
      <div data-testid="sales-records-list" className="space-y-2.5">
        {filteredSales.map((sale) => {
          const isReturned = sale.status === 'returned';
          const paymentLabel =
            sale.paymentMethod === 'cash'
              ? '現金'
              : sale.paymentMethod === 'credit'
              ? '信用卡'
              : '行動支付';

          const displayTime = sale.timestamp ? getTaiwanDateTimeStr(sale.timestamp) : sale.businessDate;

          return (
            <div
              key={sale.id}
              data-testid={`sales-record-item-${sale.id}`}
              className={`bg-white dark:bg-slate-900 rounded-xl p-3.5 shadow-2xs border transition-colors ${
                isReturned
                  ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Header: SKU, Brand, Status Badge */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                    {sale.sku}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {sale.brand}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    data-testid={`sale-status-badge-${sale.id}`}
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isReturned
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                    }`}
                  >
                    {isReturned ? '已退貨' : '已售出'}
                  </span>
                </div>
              </div>

              {/* Product Info, Size & Amount */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="truncate pr-2">
                  {sale.productName} &bull; <span className="text-slate-400">{sale.color}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    ${sale.actualPaid.toLocaleString()}
                  </span>
                  {typeof sale.costPrice === 'number' && sale.costPrice > 0 && (
                    <div className="text-[10px] text-slate-400 font-medium">
                      成本 ${sale.costPrice.toLocaleString()} &bull; <span className="text-emerald-600 dark:text-emerald-400 font-bold">毛利 ${(sale.grossProfit ?? (sale.actualPaid - sale.costPrice)).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Size & Payment Info */}
              <div className="mt-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span>尺碼: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{formatSaleSizeDisplay(sale.sizeDisplay, sale.sizeUS)}</strong></span>
                <span className="flex items-center gap-1">
                  {sale.paymentMethod === 'cash' ? (
                    <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                  ) : sale.paymentMethod === 'credit' ? (
                    <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>{paymentLabel}</span>
                </span>
              </div>

              {/* Returned Reason Info or Mark Return CTA & Delete */}
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono text-[10px]">{displayTime}</span>

                <div className="flex items-center gap-2">
                  {isReturned ? (
                    <div className="text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" />
                      <span>退貨原因: {sale.returnReason || '顧客退貨'}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid={`btn-mark-return-${sale.id}`}
                      onClick={() => onInitiateReturn(sale)}
                      className="px-2.5 py-1 rounded-lg text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>標記退貨</span>
                    </button>
                  )}

                  {onDeleteSale && (
                    <button
                      type="button"
                      data-testid={`btn-delete-sale-${sale.id}`}
                      onClick={() => {
                        if (window.confirm(`確定要刪除該筆「${sale.sku}」的銷貨紀錄嗎？此操作將自銷貨流水帳中移除。`)) {
                          onDeleteSale(sale.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer p-1 rounded"
                      title="刪除此筆銷貨單"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
