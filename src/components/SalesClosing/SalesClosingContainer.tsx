import React, { useState, useMemo } from 'react';
import {
  Zap,
  ClipboardList,
  BarChart3,
  Calendar,
  DollarSign,
  ShoppingBag,
  Download,
  FileSpreadsheet,
  Tag,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useSales } from '../../context/InventoryContext';
import { useResponsive } from '../../context/ResponsiveContext';
import { exportDailyClosingToExcel, exportDailyClosingToCSV } from '../../services/salesService';
import { formatSaleSizeDisplay } from '../../data/sizeStandards';
import { CATEGORY_COLORS } from '../../types/sales';
import { getTaiwanTodayStr, getTaiwanTimeStr } from '../../utils/dateUtils';
import { ExpressSaleForm } from './ExpressSaleForm';
import { BatchSaleGrid } from './BatchSaleGrid';

export type SalesSubTab = 'express' | 'batch' | 'dashboard';

interface SalesClosingContainerProps {
  onLocateShelf?: (target: any) => void;
}

export const SalesClosingContainer: React.FC<SalesClosingContainerProps> = () => {
  const { isMobile } = useResponsive();
  const [activeSubTab, setActiveSubTab] = useState<SalesSubTab>('express');
  const { sales, getDailyClosing, getAvailableDates, returnSaleRecord } = useSales();

  // Selected date for Daily Closing Dashboard
  const availableDates = useMemo(() => getAvailableDates(), [getAvailableDates]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getTaiwanTodayStr();
  });

  const closingSummary = useMemo(() => {
    return getDailyClosing(selectedDate);
  }, [getDailyClosing, selectedDate, sales]);

  // Refund modal & feedback state
  const [refundTargetId, setRefundTargetId] = useState<string | null>(null);
  const [refundToast, setRefundToast] = useState<string | null>(null);

  const handleOpenRefundModal = (saleId: string) => {
    setRefundTargetId(saleId);
  };

  const handleConfirmRefund = () => {
    if (!refundTargetId) return;
    const ok = returnSaleRecord(refundTargetId, '顧客現場退貨');
    if (ok) {
      setRefundToast('退貨成功！已回補庫存 1 雙並沖銷營業額');
      setTimeout(() => {
        setRefundToast(null);
      }, 4000);
    }
    setRefundTargetId(null);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden pb-16">
      {/* Refund Success Toast */}
      {refundToast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 bg-slate-950/95 text-white px-5 py-4 rounded-2xl shadow-2xl border-2 border-emerald-500 font-black flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5"
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-sm sm:text-base">{refundToast}</div>
        </div>
      )}

      {/* Refund Confirmation Dialog (DOM button for Playwright TC-6.8) */}
      {refundTargetId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-red-500 max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-black text-lg">確認銷貨退貨</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              確定要執行此筆銷貨退貨？系統將自動回補實體庫存 1 雙，並自今日營業額沖銷退款金額。
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRefundTargetId(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-md transition cursor-pointer"
              >
                確認退貨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Sub-Navigation Tabs Bar                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Subtab 1: Express Single Sale */}
          <button
            type="button"
            data-testid="subtab-express-sale"
            onClick={() => setActiveSubTab('express')}
            className={`min-h-[40px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl cursor-pointer font-black text-xs sm:text-base flex items-center gap-2 transition-all ${
              activeSubTab === 'express'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4 text-white" />
            <span>⚡ 即時極速開單</span>
          </button>

          {/* Subtab 2: Batch Consecutive Entry */}
          <button
            type="button"
            data-testid="subtab-batch-sale"
            onClick={() => setActiveSubTab('batch')}
            className={`min-h-[40px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl cursor-pointer font-black text-xs sm:text-base flex items-center gap-2 transition-all ${
              activeSubTab === 'batch'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>📋 打烊連續補登</span>
          </button>

          {/* Subtab 3: Daily Closing Dashboard */}
          <button
            type="button"
            data-testid="subtab-closing-dashboard"
            onClick={() => setActiveSubTab('dashboard')}
            className={`min-h-[40px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl cursor-pointer font-black text-xs sm:text-base flex items-center gap-2 transition-all ${
              activeSubTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>📊 日結營運看板</span>
          </button>
        </div>

        {/* Quick Info Badge */}
        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold px-3 py-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          今日已售 {getDailyClosing(getTaiwanTodayStr()).totalPairsSold} 雙 &bull; 總營業額 $
          {getDailyClosing(getTaiwanTodayStr()).grossRevenue.toLocaleString()}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Subtab 1: Express Single Sale Mode (M2 Functional Form)       */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'express' && (
        <div className="space-y-6 w-full max-w-full overflow-hidden">
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
                ⚡
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  即時單筆極速開單模式
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                  專為店員走動手機操作（390x844）與櫃台設計，包含熱門鞋款分類捷徑與常用尺寸面板，3 次點擊內極速結帳扣庫。
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="btn-switch-batch-mode"
              onClick={() => setActiveSubTab('batch')}
              className="text-xs font-black px-3.5 py-2 min-h-[40px] bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm hover:bg-indigo-50 transition cursor-pointer shrink-0"
            >
              切換至打烊批次補登 &rarr;
            </button>
          </div>

          {/* Render Full Functional ExpressSaleForm */}
          <ExpressSaleForm onSwitchBatch={() => setActiveSubTab('batch')} />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Subtab 2: Batch Consecutive Entry Mode (M2 Functional Grid)   */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'batch' && (
        <div className="space-y-6 w-full max-w-full overflow-hidden">
          <div className="bg-indigo-600/10 border-2 border-indigo-600/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                📋
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  打烊批次連續補登模式
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                  網格式快速登打介面，支援鍵盤 Tab / Enter 流暢跳格換行，適合對照紙本手寫單整批連續補錄。
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('dashboard')}
              className="text-xs font-black px-3.5 py-2 min-h-[40px] bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm hover:bg-emerald-50 transition cursor-pointer shrink-0"
            >
              檢視今日日結看板 &rarr;
            </button>
          </div>

          {/* Render Full Functional BatchSaleGrid */}
          <BatchSaleGrid />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Subtab 3: Daily Closing Dashboard (R3 Dashboard & Analytics)  */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'dashboard' && (
        <div
          data-testid="closing-dashboard-container"
          className="space-y-6 w-full max-w-full overflow-hidden"
        >
          {/* Header Controls: Date Picker & Export Buttons */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
              <label htmlFor="closing-date" className="text-sm font-black text-slate-700 dark:text-slate-300 shrink-0">
                營業日期：
              </label>
              <input
                id="closing-date"
                type="date"
                data-testid="closing-date-picker"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2 min-h-[40px] rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-500 outline-none"
              />
              {availableDates.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 ml-2">
                  <span className="text-xs text-slate-400 font-bold">歷史快捷：</span>
                  {availableDates.slice(0, 3).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer min-h-[32px] ${
                        selectedDate === d
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {d === getTaiwanTodayStr() ? '今日' : d.slice(5)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="btn-export-sales-excel"
                onClick={() => exportDailyClosingToExcel(closingSummary)}
                className="min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>匯出日結 Excel</span>
              </button>
              <button
                type="button"
                onClick={() => exportDailyClosingToCSV(closingSummary)}
                className="min-h-[40px] px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* KPI Cards: Pairs, Gross/Net Revenue, Returns */}
          <div className={`grid gap-3 sm:gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {/* KPI 1: Pairs Sold */}
            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-bold mb-1.5">
                <span className="whitespace-nowrap">銷貨總雙數</span>
                <ShoppingBag className="w-4 h-4 text-indigo-500 shrink-0" />
              </div>
              <div
                data-testid="closing-metric-total-pairs"
                className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white whitespace-nowrap"
              >
                {closingSummary.totalPairsSold} 雙
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1 truncate">
                <span>退：{closingSummary.totalPairsReturned}雙</span>
                <span>&bull;</span>
                <span className="text-emerald-600 font-black">淨銷：{closingSummary.netPairsSold}雙</span>
              </div>
            </div>

            {/* KPI 2: Net Revenue */}
            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-bold mb-1.5">
                <span className="whitespace-nowrap">今日總營業額 (淨額)</span>
                <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <div
                data-testid="closing-metric-total-revenue"
                className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white whitespace-nowrap"
              >
                ${closingSummary.netRevenue.toLocaleString()}
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1 truncate">
                <span>毛額：${closingSummary.grossRevenue.toLocaleString()}</span>
                <span>&bull;</span>
                <span>退：${closingSummary.returnedRevenue.toLocaleString()}</span>
              </div>
            </div>

            {/* KPI 3: Cash Payment Subtotal */}
            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-bold mb-1.5">
                <span className="whitespace-nowrap">現金實收 (抽屜)</span>
                <Banknote className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <div
                data-testid="closing-subtotal-cash"
                className="text-xl sm:text-3xl font-black text-amber-600 whitespace-nowrap"
              >
                ${closingSummary.paymentBreakdown.cash.amount.toLocaleString()}
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-1 truncate">
                {closingSummary.paymentBreakdown.cash.count} 筆 &bull; 佔比 {closingSummary.paymentBreakdown.cash.percentage}%
              </div>
            </div>

            {/* KPI 4: Card & Mobile Payments */}
            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-bold mb-1.5">
                <span className="whitespace-nowrap">非現金金流小計</span>
                <CreditCard className="w-4 h-4 text-blue-500 shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-black text-blue-600 whitespace-nowrap">
                ${(
                  closingSummary.paymentBreakdown.credit.amount +
                  closingSummary.paymentBreakdown.mobile_pay.amount
                ).toLocaleString()}
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1 truncate">
                <span>
                  刷卡: $<span data-testid="closing-subtotal-credit">{closingSummary.paymentBreakdown.credit.amount.toLocaleString()}</span>
                </span>
                <span>&bull;</span>
                <span>
                  行動: $<span data-testid="closing-subtotal-mobile-pay">{closingSummary.paymentBreakdown.mobile_pay.amount.toLocaleString()}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Charts & Analytics: Category Distribution & Brand Leaderboard */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {/* Category Sales Distribution (Upright Columns 1 by 1 in 1 Row) */}
            <div
              data-testid="closing-category-chart"
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <span>鞋款分類銷售分佈 (柱狀圖)</span>
                </h4>
                {closingSummary.categoryDistribution.filter((c) => c.pairs > 0).length > 0 && (
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    共 {closingSummary.categoryDistribution.filter((c) => c.pairs > 0).length} 款品類熱賣
                  </span>
                )}
              </div>

              {closingSummary.categoryDistribution.filter((c) => c.pairs > 0).length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400 font-bold">
                  今日暫無鞋款分類銷售數據
                </div>
              ) : (
                <div className="pt-4 pb-2 overflow-x-auto">
                  {/* Upright Bars Container: 1 根 1 根在同一行排列 */}
                  <div className="flex items-end justify-around gap-2 sm:gap-3 h-56 min-w-[320px] border-b-2 border-slate-200 dark:border-slate-700 px-1 pb-1">
                    {(() => {
                      const activeCats = closingSummary.categoryDistribution.filter((c) => c.pairs > 0);
                      const maxPairs = Math.max(...activeCats.map((c) => c.pairs), 1);

                      return activeCats.map((item) => {
                        const barHeightPercent = Math.max(16, Math.round((item.pairs / maxPairs) * 100));

                        return (
                          <div
                            key={item.category}
                            data-testid={`category-stat-${item.category}`}
                            className="flex-1 flex flex-col items-center justify-end h-full group"
                          >
                            {/* Pairs & Percentage on top of column */}
                            <div className="mb-1.5 flex flex-col items-center text-center">
                              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-none">
                                {item.pairs}雙
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 leading-none">
                                {item.percentage}%
                              </span>
                            </div>

                            {/* The Upright Column Bar (1根直立柱子) */}
                            <div className="w-full max-w-[44px] sm:max-w-[54px] bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden flex flex-col justify-end p-0.5 h-full max-h-[125px]">
                              <div
                                className={`w-full rounded-t-lg transition-all duration-500 shadow-sm ${
                                  CATEGORY_COLORS[item.category]?.activeBg || 'bg-indigo-600'
                                } group-hover:brightness-110 group-hover:scale-y-105 origin-bottom`}
                                style={{ height: `${barHeightPercent}%` }}
                              />
                            </div>

                            {/* Bottom Label: Category badge & revenue */}
                            <div className="mt-2.5 flex flex-col items-center gap-0.5">
                              <span
                                className={`text-[11px] sm:text-xs px-1.5 py-0.5 rounded font-black border truncate max-w-[58px] sm:max-w-none text-center ${
                                  CATEGORY_COLORS[item.category]?.bg || 'bg-slate-100'
                                } ${CATEGORY_COLORS[item.category]?.text || 'text-slate-800'} ${
                                  CATEGORY_COLORS[item.category]?.border || 'border-slate-200'
                                }`}
                              >
                                {item.category}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                                ${item.revenue.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Brand Leaderboard */}
            <div
              data-testid="closing-brand-leaderboard"
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <span>熱賣廠家 / 品牌排行榜</span>
              </h4>
              <div className="space-y-2.5">
                {closingSummary.brandLeaderboard.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400 font-bold">
                    今日暫無廠家銷售紀錄
                  </div>
                ) : (
                  closingSummary.brandLeaderboard.slice(0, 5).map((brand, idx) => {
                    const badgeColor =
                      idx === 0
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-800 border-slate-300'
                        : idx === 2
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200';

                    return (
                      <div
                        key={brand.brand}
                        data-testid={`brand-stat-${brand.brand}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs border ${badgeColor}`}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {brand.brand}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">
                          {brand.pairs} 雙 &bull; ${brand.revenue.toLocaleString()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sales History Table with Refund Action */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>{selectedDate} 銷貨流水帳明細 ({closingSummary.records.length} 筆)</span>
              </h4>
            </div>

            <div className="w-full max-w-full overflow-x-auto">
              <table
                data-testid="sales-history-table"
                className="w-full text-left text-sm border-collapse min-w-[700px]"
              >
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-slate-800 text-xs font-black text-slate-500 uppercase">
                    <th className="py-2.5 px-3">時間</th>
                    <th className="py-2.5 px-3">廠家 / 款號</th>
                    <th className="py-2.5 px-3">品名 / 顏色</th>
                    <th className="py-2.5 px-3">尺寸</th>
                    <th className="py-2.5 px-3">分類</th>
                    <th className="py-2.5 px-3">實收金額</th>
                    <th className="py-2.5 px-3">支付方式</th>
                    <th className="py-2.5 px-3">狀態</th>
                    <th className="py-2.5 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {closingSummary.records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                        此營業日尚無銷貨資料
                      </td>
                    </tr>
                  ) : (
                    closingSummary.records.map((record) => {
                      const isReturned = record.status === 'returned';
                      const timeStr = record.timestamp
                        ? getTaiwanTimeStr(record.timestamp)
                        : '-';

                      return (
                        <tr
                          key={record.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                            isReturned ? 'opacity-60 bg-red-50/30 dark:bg-red-950/10 line-through' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-xs text-slate-500">{timeStr}</td>
                          <td className="py-3 px-3">
                            <div className="font-black text-slate-900 dark:text-white">
                              {record.brand}
                            </div>
                            <div className="text-xs text-slate-500">{record.sku}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div>{record.productName}</div>
                            <div className="text-xs text-slate-400">{record.color}</div>
                          </td>
                          <td className="py-3 px-3 font-mono text-xs">
                            {formatSaleSizeDisplay(record.sizeDisplay, record.sizeUS)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-md border font-semibold ${
                                CATEGORY_COLORS[record.category]?.bg || 'bg-slate-100'
                              } ${CATEGORY_COLORS[record.category]?.text || 'text-slate-800'} ${
                                CATEGORY_COLORS[record.category]?.border || 'border-slate-200'
                              }`}
                            >
                              {record.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-black text-indigo-600 dark:text-indigo-400">
                            ${record.actualPaid}
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                            {record.paymentMethod === 'cash' && '💵 現金'}
                            {record.paymentMethod === 'credit' && '💳 信用卡'}
                            {(record.paymentMethod === 'mobile_pay' || (record.paymentMethod as string) === 'mobile') && '📱 行動支付'}
                          </td>
                          <td className="py-3 px-3 text-xs">
                            {isReturned ? (
                              <span className="text-red-600 font-black bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded">
                                已退貨
                              </span>
                            ) : record.status === 'exchanged' ? (
                              <span className="text-amber-600 font-black bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                                已換貨
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-black bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded">
                                已完成
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {!isReturned && (
                              <button
                                type="button"
                                data-testid={`btn-refund-sale-${record.id}`}
                                onClick={() => handleOpenRefundModal(record.id)}
                                className="text-xs px-2.5 py-1 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 dark:border-red-900/60 rounded-lg transition font-black cursor-pointer min-h-[32px]"
                              >
                                退貨
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
