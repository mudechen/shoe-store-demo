import React, { useState, useMemo, useEffect } from 'react';
import { StockInRecord, VendorReturnRecord, CustomerReturnReason } from '../../types/records';
import { SaleRecord } from '../../types/sales';
import { exportRecordsToExcel } from '../../services/excelService';
import { getTaiwanDateStr } from '../../utils/dateUtils';
import { StockInLedgerTable } from './StockInLedgerTable';
import { SalesLedgerTable } from './SalesLedgerTable';
import { VendorReturnLedgerTable } from './VendorReturnLedgerTable';
import { CustomerReturnModal } from './CustomerReturnModal';
import { DateRangePickerPopover } from './DateRangePickerPopover';
import {
  FileSpreadsheet,
  Search,
  X,
  Inbox,
  Package,
  ShoppingBag,
  ArrowDownLeft,
  Plus,
} from 'lucide-react';

export type RecordsTab = 'stockin' | 'sales' | 'vendor_returns';
export type DatePreset = 'all' | 'today' | 'yesterday' | '7days' | '30days';

interface RecordsCenterViewProps {
  stockInRecords: StockInRecord[];
  sales: SaleRecord[];
  vendorReturns: VendorReturnRecord[];
  onMarkSaleReturned: (saleId: string, reason: CustomerReturnReason, note?: string) => void;
  onOpenVendorReturnModal: () => void;
  onOpenStockInModal?: () => void;
  onNavigateToCashier?: () => void;
  onExportExcel?: () => void;
  onDeleteStockInRecord?: (recordId: string) => void;
  onDeleteSaleRecord?: (saleId: string) => void;
  onDeleteVendorReturnRecord?: (recordId: string) => void;
  onReviseStockInCost?: (recordId: string, newCost: number, reason?: string) => void;
  initialTab?: RecordsTab;
  initialSearchQuery?: string;
}

function getRecordTimestamp(timestamp?: string, date?: string, id?: string): number {
  if (timestamp) {
    const t = new Date(timestamp).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (id) {
    const match = id.match(/\d{10,13}/);
    if (match) {
      const t = Number(match[0]);
      if (!isNaN(t) && t > 0) return t;
    }
  }
  if (date) {
    if (date.includes('T') || date.includes(' ')) {
      const t = new Date(date).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    const dateStr = getTaiwanDateStr(date);
    if (dateStr) {
      const t = new Date(`${dateStr}T12:00:00+08:00`).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    const t = new Date(date).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

export const RecordsCenterView: React.FC<RecordsCenterViewProps> = ({
  stockInRecords,
  sales,
  vendorReturns,
  onMarkSaleReturned,
  onOpenVendorReturnModal,
  onOpenStockInModal,
  onNavigateToCashier,
  onExportExcel,
  onDeleteStockInRecord,
  onDeleteSaleRecord,
  onDeleteVendorReturnRecord,
  onReviseStockInCost,
  initialTab,
  initialSearchQuery,
}) => {
  // Navigation & Filtering State
  const [activeTab, setActiveTab] = useState<RecordsTab>(initialTab || 'sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [salesSubFilter, setSalesSubFilter] = useState<'all' | 'completed' | 'returned'>('all');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Customer Return Modal State
  const [returnModalSale, setReturnModalSale] = useState<SaleRecord | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Date Filtering Helper (strictly in Taiwan Timezone UTC+8)
  const matchesDate = (dateStrOrIso?: string): boolean => {
    if (!startDate && !endDate) return true;
    if (!dateStrOrIso) return false;

    const targetDateStr = getTaiwanDateStr(dateStrOrIso);
    if (!targetDateStr) return false;

    if (startDate && targetDateStr < startDate) return false;
    if (endDate && targetDateStr > endDate) return false;
    return true;
  };

  // Filtered Stock-In Records (Newest to Oldest)
  const filteredStockIns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = stockInRecords.filter((rec) => {
      const dateVal = rec.date || rec.timestamp;
      if (!matchesDate(dateVal)) return false;

      if (!q) return true;
      const haystack = [
        rec.sku,
        rec.productName,
        rec.vendor,
        rec.orderId,
        rec.batchNo,
        rec.color,
        rec.notes,
        rec.operator,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    return [...list].sort((a, b) => {
      const timeA = getRecordTimestamp(a.timestamp, a.date, a.id);
      const timeB = getRecordTimestamp(b.timestamp, b.date, b.id);
      if (timeB !== timeA) return timeB - timeA;

      // Active records strictly come BEFORE superseded records
      if (Boolean(a.isSuperseded) !== Boolean(b.isSuperseded)) {
        return a.isSuperseded ? 1 : -1;
      }

      // Higher revision number comes first
      const revA = a.revisionNo || 0;
      const revB = b.revisionNo || 0;
      if (revB !== revA) return revB - revA;

      // Newer cost modification time comes first
      if (b.costModifiedAt && a.costModifiedAt) {
        const modDiff = new Date(b.costModifiedAt).getTime() - new Date(a.costModifiedAt).getTime();
        if (modDiff !== 0) return modDiff;
      }

      return (b.id || b.orderId || '').localeCompare(a.id || a.orderId || '');
    });
  }, [stockInRecords, startDate, endDate, searchQuery]);

  // Filtered Sales Records (Newest to Oldest)
  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = sales.filter((s) => {
      const dateVal = s.businessDate || s.timestamp;
      if (!matchesDate(dateVal)) return false;

      if (!q) return true;
      const haystack = [
        s.sku,
        s.productName,
        s.brand,
        s.id,
        s.color,
        s.notes,
        s.paymentMethod,
        s.returnReason,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    return [...list].sort((a, b) => {
      const timeA = getRecordTimestamp(a.timestamp, a.businessDate, a.id);
      const timeB = getRecordTimestamp(b.timestamp, b.businessDate, b.id);
      if (timeB !== timeA) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });
  }, [sales, startDate, endDate, searchQuery]);

  // Filtered Vendor Return Records (Newest to Oldest)
  const filteredVendorReturns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = vendorReturns.filter((ret) => {
      const dateVal = ret.date || ret.timestamp;
      if (!matchesDate(dateVal)) return false;

      if (!q) return true;
      const haystack = [
        ret.sku,
        ret.productName,
        ret.vendor,
        ret.orderId,
        ret.returnNo,
        ret.reason,
        ret.reasonDetail,
        ret.color,
        ret.operator,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    return [...list].sort((a, b) => {
      const timeA = getRecordTimestamp(a.timestamp, a.date, a.id);
      const timeB = getRecordTimestamp(b.timestamp, b.date, b.id);
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || b.orderId || '').localeCompare(a.id || a.orderId || '');
    });
  }, [vendorReturns, startDate, endDate, searchQuery]);

  // Handle Excel Export
  const handleExportExcel = () => {
    if (onExportExcel) {
      onExportExcel();
    } else {
      exportRecordsToExcel(stockInRecords, sales, vendorReturns);
    }
  };

  // Determine if current view is empty
  const currentCount =
    activeTab === 'stockin'
      ? filteredStockIns.length
      : activeTab === 'sales'
      ? filteredSales.length
      : filteredVendorReturns.length;

  return (
    <div className="space-y-3.5 pb-24 max-w-lg mx-auto">
      {/* Top Header & Excel Export Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">紀錄明細中心</h2>
          <p className="text-[11px] text-slate-500 font-medium">進貨入庫、銷貨流水帳與廠商退回 3-in-1 集中帳本</p>
        </div>

        <button
          type="button"
          data-testid="btn-records-export-excel"
          onClick={handleExportExcel}
          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>匯出 Excel 報表</span>
        </button>
      </div>

      {/* Top Segmented Subtabs (3-in-1: 銷貨紀錄 -> 進貨紀錄 -> 退回紀錄) */}
      <div className="flex rounded-xl bg-slate-200/90 dark:bg-slate-800 p-1 border border-slate-300/80 dark:border-slate-700">
        <button
          type="button"
          data-testid="records-tab-sales"
          onClick={() => setActiveTab('sales')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'sales'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>銷貨紀錄</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
            {sales.length}
          </span>
        </button>

        <button
          type="button"
          data-testid="records-tab-stockin"
          onClick={() => setActiveTab('stockin')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'stockin'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>進貨紀錄</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
            {stockInRecords.filter((r) => !r.isSuperseded).length}
          </span>
        </button>

        <button
          type="button"
          data-testid="records-tab-vendor-returns"
          onClick={() => setActiveTab('vendor_returns')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'vendor_returns'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>退回紀錄</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
            {vendorReturns.length}
          </span>
        </button>
      </div>

      {/* Date Range Filter Popover */}
      <div className="flex items-center justify-between gap-2">
        <DateRangePickerPopover
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: s, endDate: e }) => {
            setStartDate(s);
            setEndDate(e);
          }}
        />
      </div>

      {/* Real-time Multi-Attribute Keyword Search Bar */}
      <div className="relative">
        <input
          type="text"
          data-testid="records-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜尋貨號、品名、廠商、單號..."
          className="w-full text-xs font-bold pl-9 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-600 placeholder:font-normal placeholder:text-slate-400 shadow-2xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Subtab Content or Empty State */}
      {currentCount === 0 ? (
        <div
          data-testid="records-empty-state"
          className="py-12 px-4 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-3"
        >
          <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="text-xs font-black text-slate-700 dark:text-slate-300">
            無符合條件的紀錄
          </div>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            在所選的日期區間或搜尋關鍵字下未找到任何項目，請嘗試清除關鍵字或切換區間。
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {activeTab === 'sales' && onNavigateToCashier && (
              <button
                type="button"
                data-testid="btn-empty-sales-cashier"
                onClick={onNavigateToCashier}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>銷貨記帳</span>
              </button>
            )}

            {activeTab === 'stockin' && onOpenStockInModal && (
              <button
                type="button"
                data-testid="btn-empty-stockin"
                onClick={onOpenStockInModal}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>進貨入庫</span>
              </button>
            )}

            {activeTab === 'vendor_returns' && onOpenVendorReturnModal && (
              <button
                type="button"
                data-testid="btn-empty-vendor-return"
                onClick={onOpenVendorReturnModal}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>退回出庫</span>
              </button>
            )}

            {(searchQuery || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                清除所有篩選條件
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'stockin' && (
            <StockInLedgerTable
              records={filteredStockIns}
              onOpenStockIn={onOpenStockInModal}
              onDeleteRecord={onDeleteStockInRecord}
              onReviseCost={onReviseStockInCost}
            />
          )}

          {activeTab === 'sales' && (
            <SalesLedgerTable
              sales={filteredSales}
              activeSubFilter={salesSubFilter}
              onChangeSubFilter={setSalesSubFilter}
              onNavigateToCashier={onNavigateToCashier}
              onInitiateReturn={(sale) => {
                setReturnModalSale(sale);
                setIsReturnModalOpen(true);
              }}
              onDeleteSale={onDeleteSaleRecord}
            />
          )}

          {activeTab === 'vendor_returns' && (
            <VendorReturnLedgerTable
              records={filteredVendorReturns}
              onOpenNewVendorReturn={onOpenVendorReturnModal}
              onDeleteRecord={onDeleteVendorReturnRecord}
            />
          )}
        </>
      )}

      {/* Customer Return Modal */}
      <CustomerReturnModal
        isOpen={isReturnModalOpen}
        sale={returnModalSale}
        onClose={() => {
          setIsReturnModalOpen(false);
          setReturnModalSale(null);
        }}
        onConfirm={onMarkSaleReturned}
      />
    </div>
  );
};
