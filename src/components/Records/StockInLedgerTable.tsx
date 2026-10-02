import React, { useState } from 'react';
import { StockInRecord } from '../../types/records';
import { Package, Calendar, User, Plus, Trash2, Edit2, History, X, Eye, EyeOff } from 'lucide-react';
import { getTaiwanDateStr } from '../../utils/dateUtils';

interface StockInLedgerTableProps {
  records: StockInRecord[];
  onOpenStockIn?: () => void;
  onDeleteRecord?: (recordId: string) => void;
  onReviseCost?: (recordId: string, newCost: number, reason?: string) => void;
}

export const StockInLedgerTable: React.FC<StockInLedgerTableProps> = ({
  records,
  onOpenStockIn,
  onDeleteRecord,
  onReviseCost,
}) => {
  const [hideSuperseded, setHideSuperseded] = useState(false);
  const [editingCostRecord, setEditingCostRecord] = useState<StockInRecord | null>(null);
  const [newCostInput, setNewCostInput] = useState('');
  const [reviseReason, setReviseReason] = useState('');

  // Strict Accounting Filter: Only active records contribute to total pairs & total cost
  const activeRecords = records.filter((r) => !r.isSuperseded);
  const supersededRecords = records.filter((r) => r.isSuperseded);

  const totalPairs = activeRecords.reduce((sum, r) => sum + (Number(r.totalPairs) || 0), 0);
  const totalCost = activeRecords.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);

  const displayRecords = hideSuperseded ? activeRecords : records;

  const handleConfirmRevise = () => {
    if (!editingCostRecord || !onReviseCost) return;
    const costNum = Number(newCostInput);
    if (isNaN(costNum) || costNum < 0) {
      alert('請輸入大於或等於 0 的有效成本金額');
      return;
    }
    onReviseCost(editingCostRecord.id, Math.round(costNum), reviseReason.trim() || undefined);
    setEditingCostRecord(null);
  };

  return (
    <div className="space-y-3">
      {/* Summary KPI Header & Action Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">進貨批次總計</div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>共 {activeRecords.length} 批次有效</span>
                {supersededRecords.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({supersededRecords.length} 筆已修訂歷史)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {supersededRecords.length > 0 && (
              <button
                type="button"
                data-testid="toggle-hide-superseded"
                onClick={() => setHideSuperseded(!hideSuperseded)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  hideSuperseded
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {hideSuperseded ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{hideSuperseded ? '顯示已修訂紀錄' : '隱藏已修訂紀錄'}</span>
              </button>
            )}

            {onOpenStockIn && (
              <button
                type="button"
                data-testid="btn-stockin-entry"
                onClick={onOpenStockIn}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>進貨入庫</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
          <span className="text-slate-500">
            總入庫雙數：<strong data-testid="stockin-summary-total-pairs" className="text-indigo-600 dark:text-indigo-400 font-black">{totalPairs} 雙</strong>
          </span>
          <span className="text-slate-500">
            總進貨成本：<strong data-testid="stockin-summary-total-cost" className="text-slate-900 dark:text-white">${totalCost.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Records List Container */}
      <div data-testid="stockin-records-list" className="space-y-2.5">
        {displayRecords.map((record) => {
          // Format size breakdown: e.g. "US 8.5: 4雙" or "8.5: 4雙"
          let sizeBreakdownText = '';
          if (record.sizeBreakdown && typeof record.sizeBreakdown === 'object') {
            sizeBreakdownText = Object.entries(record.sizeBreakdown)
              .filter(([_, q]) => Number(q) > 0)
              .map(([sz, q]) => `${sz}: ${q}雙`)
              .join('、 ');
          } else if (Array.isArray(record.sizeDetails)) {
            sizeBreakdownText = record.sizeDetails
              .filter((d) => d.quantity > 0)
              .map((d) => `${d.sizeKey}: ${d.quantity}雙`)
              .join('、 ');
          }

          const displayDate = record.date ? getTaiwanDateStr(record.date) : (record.timestamp ? getTaiwanDateStr(record.timestamp) : '今日');
          const isSuperseded = Boolean(record.isSuperseded);
          const isRevisedVersion = !isSuperseded && Boolean(record.revisionNo && record.revisionNo > 0);

          return (
            <div
              key={record.id}
              data-testid={`stockin-record-item-${record.id}`}
              className={`rounded-xl p-3.5 shadow-2xs space-y-2 transition-colors ${
                isSuperseded
                  ? 'bg-slate-50/70 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 opacity-65'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900'
              }`}
            >
              {/* Row 1: SKU, Vendor, Badges & Total Cost */}
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className={`font-mono text-sm font-black whitespace-nowrap ${isSuperseded ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                    {record.sku}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {record.vendor}
                  </span>
                  {record.procurementType === '寄賣' ? (
                    <span
                      data-testid={`stockin-record-badge-consignment-${record.id}`}
                      className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 whitespace-nowrap"
                    >
                      寄賣
                    </span>
                  ) : (
                    <span
                      data-testid={`stockin-record-badge-buyout-${record.id}`}
                      className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 whitespace-nowrap"
                    >
                      買斷
                    </span>
                  )}

                  {/* Version Badges */}
                  {isSuperseded && (
                    <span
                      data-testid={`stockin-record-badge-superseded-${record.id}`}
                      className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 whitespace-nowrap"
                    >
                      📜 歷史版本 (已修訂)
                    </span>
                  )}

                  {isRevisedVersion && (
                    <span
                      data-testid={`stockin-record-badge-revised-${record.id}`}
                      className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap"
                    >
                      🟢 最新修訂版 (Rev.{record.revisionNo})
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-xs font-black whitespace-nowrap ${isSuperseded ? 'text-slate-400 line-through' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    總成本 ${(record.totalCost || 0).toLocaleString()}
                  </div>
                  <div className={`text-[10px] font-bold whitespace-nowrap ${isSuperseded ? 'text-slate-400 line-through' : 'text-slate-400'}`}>
                    單雙 ${(record.costPerPair ?? (record.totalPairs ? Math.round((record.totalCost || 0) / record.totalPairs) : 0)).toLocaleString()}
                    {!isSuperseded && record.originalCostPerPair !== undefined && (
                      <span className="ml-1 text-[9px] text-slate-400 line-through whitespace-nowrap">
                        原${record.originalCostPerPair.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Product Name & Color */}
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {record.productName}{' '}
                {record.color && <span className="text-slate-400 font-normal">&bull; {record.color}</span>}
              </div>

              {/* Row 3: Total Pairs & Size Breakdown Details */}
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-indigo-500" />
                    <span>入庫雙數：<strong className="text-indigo-600 dark:text-indigo-400">{record.totalPairs}</strong> 雙</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                    單號: {record.orderId || record.batchNo || record.id}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  尺碼明細：{sizeBreakdownText || `${record.totalPairs} 雙`}
                </div>
                {record.costModifiedReason && (
                  <div className="mt-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    修訂說明：{record.costModifiedReason}
                  </div>
                )}
              </div>

              {/* Row 4: Meta & Operator & Actions */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {displayDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    經手人: {record.operator || '門市人員'}
                  </span>
                  {record.costModifiedAt && (
                    <span className="flex items-center gap-1 text-slate-400" title={`修改時間: ${record.costModifiedAt}`}>
                      <History className="w-3 h-3" />
                      修訂於 {getTaiwanDateStr(record.costModifiedAt)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isSuperseded && onReviseCost && (
                    <button
                      type="button"
                      data-testid={`btn-revise-cost-${record.id}`}
                      onClick={() => {
                        setEditingCostRecord(record);
                        setNewCostInput(String(record.costPerPair || 0));
                        setReviseReason('');
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950"
                      title="單筆單據修改成本"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>修改成本</span>
                    </button>
                  )}

                  {onDeleteRecord && (
                    <button
                      type="button"
                      data-testid={`btn-delete-stockin-${record.id}`}
                      onClick={() => {
                        if (window.confirm(`確定要刪除單號「${record.orderId || record.sku}」的進貨紀錄嗎？此操作將自進貨帳本移除。`)) {
                          onDeleteRecord(record.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer p-1 rounded"
                      title="刪除此筆進貨單"
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

      {/* Single-Batch Cost Revision Modal */}
      {editingCostRecord && (
        <div
          data-testid="modal-revise-stockin-cost"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingCostRecord(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-4 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Edit2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white">單筆進貨單成本修訂</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    單號: {editingCostRecord.orderId || editingCostRecord.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCostRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="font-black text-slate-800 dark:text-slate-200">
                {editingCostRecord.productName} ({editingCostRecord.sku})
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>入庫雙數：{editingCostRecord.totalPairs} 雙</span>
                <span>原單雙成本：${(editingCostRecord.costPerPair || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  新單雙成本 (元) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  data-testid="input-revised-cost"
                  value={newCostInput}
                  onChange={(e) => setNewCostInput(e.target.value)}
                  placeholder="請輸入新成本"
                  className="w-full text-xs font-bold px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-500 font-bold">修訂後總成本預估：</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                  ${((Number(newCostInput) || 0) * editingCostRecord.totalPairs).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  修訂原因 / 備註 (選填)
                </label>
                <input
                  type="text"
                  data-testid="input-revised-reason"
                  value={reviseReason}
                  onChange={(e) => setReviseReason(e.target.value)}
                  placeholder="例如：廠商價格回溯調整、發票折讓..."
                  className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-600"
                />
              </div>

              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 text-[10px] text-amber-800 dark:text-amber-300 space-y-0.5">
                <div className="font-bold">💡 會計與審計保存說明：</div>
                <div>確認後將保留原單據作審計歷史，並建立「最新修訂版」計入加總；同步更新現存在庫批次，不回溯已結算銷貨。</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                data-testid="btn-cancel-revise-cost"
                onClick={() => setEditingCostRecord(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                data-testid="btn-confirm-revise-cost"
                onClick={handleConfirmRevise}
                className="px-4 py-1.5 text-xs font-black bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                確認修訂
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
