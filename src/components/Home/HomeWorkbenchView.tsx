import React, { useMemo } from 'react';
import { ProductWithVariants } from '../../types/inventory';
import { SaleRecord } from '../../types/sales';
import { ReservationRecord } from '../../types/reservations';
import { calculateRetailAnalytics } from '../../services/analyticsService';
import {
  Receipt,
  CalendarClock,
  Layers,
  FileSpreadsheet,
  PackagePlus,
  Undo2,
  Download,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Sparkles,
  PackageCheck,
} from 'lucide-react';

interface HomeWorkbenchViewProps {
  products: ProductWithVariants[];
  sales: SaleRecord[];
  reservations: ReservationRecord[];
  onNavigateTab: (tab: 'cashier' | 'reservations' | 'inventory' | 'records') => void;
  onOpenStockInModal: () => void;
  onOpenVendorReturnModal: () => void;
  onExportExcel: () => void;
}

export const HomeWorkbenchView: React.FC<HomeWorkbenchViewProps> = ({
  products,
  sales,
  reservations,
  onNavigateTab,
  onOpenStockInModal,
  onOpenVendorReturnModal,
  onExportExcel,
}) => {
  // Calculate real-time retail analytics
  const analytics = useMemo(() => {
    return calculateRetailAnalytics(products, sales);
  }, [products, sales]);

  // Reservation counts
  const pendingReservationsCount = useMemo(() => {
    return reservations.filter((r) => r.status === 'pending_arrival').length;
  }, [reservations]);

  const readyReservations = useMemo(() => {
    return reservations.filter((r) => r.status === 'arrived_ready');
  }, [reservations]);

  // Best sellers calculated from sales
  const hotSellers = useMemo(() => {
    const counts: Record<string, { sku: string; name: string; brand: string; count: number }> = {};
    for (const s of sales) {
      if (s.status === 'completed') {
        if (!counts[s.sku]) {
          counts[s.sku] = { sku: s.sku, name: s.productName, brand: s.brand, count: 0 };
        }
        counts[s.sku].count += 1;
      }
    }
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [sales]);

  // Only currently existing feature shortcuts
  const existingShortcuts = [
    {
      id: 'cashier',
      title: '銷貨記帳',
      subtitle: '現場快速開單',
      icon: Receipt,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/60',
      border: 'hover:border-indigo-300 dark:hover:border-indigo-800',
      onClick: () => onNavigateTab('cashier'),
    },
    {
      id: 'reservations',
      title: '客戶預訂',
      subtitle: '缺貨留單登記',
      icon: CalendarClock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/60',
      border: 'hover:border-amber-300 dark:hover:border-amber-800',
      badge: pendingReservationsCount > 0 ? `${pendingReservationsCount} 待補` : undefined,
      onClick: () => onNavigateTab('reservations'),
    },
    {
      id: 'inventory',
      title: '尺碼庫存',
      subtitle: '斷碼熱力矩陣',
      icon: Layers,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/60',
      border: 'hover:border-sky-300 dark:hover:border-sky-800',
      onClick: () => onNavigateTab('inventory'),
    },
    {
      id: 'stockin',
      title: '進貨入庫',
      subtitle: '批量尺碼建檔',
      icon: PackagePlus,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/60',
      border: 'hover:border-emerald-300 dark:hover:border-emerald-800',
      onClick: onOpenStockInModal,
    },
    {
      id: 'records',
      title: '紀錄明細',
      subtitle: '銷退進歷程總表',
      icon: FileSpreadsheet,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/60',
      border: 'hover:border-violet-300 dark:hover:border-violet-800',
      onClick: () => onNavigateTab('records'),
    },
    {
      id: 'vendor_return',
      title: '退還廠商',
      subtitle: '瑕疵或換季退庫',
      icon: Undo2,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/60',
      border: 'hover:border-rose-300 dark:hover:border-rose-800',
      onClick: onOpenVendorReturnModal,
    },
  ];

  return (
    <div data-testid="view-home" className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* Ambient Greeting & Store Status Header */}
      <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white shadow-lg border border-slate-800">
        {/* Subtle Radial Glow effect */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-36 h-36 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>門市今日營運工作台</span>
            </div>
            <button
              type="button"
              onClick={onExportExcel}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold backdrop-blur-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出總報表</span>
            </button>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">今日即時營業總額</p>
              <div className="text-3xl font-black tracking-tight text-white font-mono mt-0.5">
                ${analytics.todayRevenue.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                毛利率 {analytics.todayGrossMarginPct.toFixed(1)}%
              </span>
              <div className="text-[11px] text-slate-400 font-bold mt-1">
                已售 {analytics.todayPairsSold} 雙 &bull; 客單 ${Math.round(analytics.avgOrderValue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Quad Cards (Compact Bento Grid) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Today's Sales Count */}
        <div
          onClick={() => onNavigateTab('cashier')}
          className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">今日售出</span>
            <Receipt className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {analytics.todayPairsSold} <span className="text-xs font-bold text-slate-500">雙</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
            點擊進入銷貨收銀
          </div>
        </div>

        {/* Customer Reservations Badge Card */}
        <div
          onClick={() => onNavigateTab('reservations')}
          className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">客戶預訂</span>
            <CalendarClock className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono flex items-baseline gap-1.5">
            <span>{reservations.length}</span>
            <span className="text-xs font-bold text-slate-500">筆</span>
            {pendingReservationsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse">
                {pendingReservationsCount} 待補
              </span>
            )}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
            {readyReservations.length > 0 ? `${readyReservations.length} 筆已到貨待取` : '點擊查看所有預訂'}
          </div>
        </div>
      </div>

      {/* Alert: If any reservation is ready for customer pickup, show a prominent spotlight card */}
      {readyReservations.length > 0 && (
        <div
          onClick={() => onNavigateTab('reservations')}
          className="p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-300/80 dark:border-emerald-800/80 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-emerald-500/15 transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                有 {readyReservations.length} 雙預訂商品已到貨！
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                可立即通知顧客來店取貨結算
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
            <span>前往</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Feature Shortcuts Grid (Only Existing Core Functions) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            門市核心功能快捷
          </h3>
          <span className="text-[11px] text-slate-400 font-bold">
            一鍵直達模組
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {existingShortcuts.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                data-testid={`home-shortcut-${item.id}`}
                onClick={item.onClick}
                className={`relative p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 ${item.border} transition-all duration-150 flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer active:scale-95 group shadow-2xs`}
              >
                {item.badge && (
                  <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
                <div className={`p-2 rounded-xl ${item.bg} ${item.color} transition-transform group-hover:scale-110 shadow-3xs`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5 leading-none">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Store Diagnostics: Hot Sellers & Broken Golden Size Alerts */}
      <div className="grid grid-cols-1 gap-3">
        {/* Broken Golden Size Alert */}
        {analytics.brokenGoldenSizeAlerts && analytics.brokenGoldenSizeAlerts.length > 0 && (
          <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
              <div className="flex items-center gap-1.5 text-xs font-black">
                <AlertTriangle className="w-4 h-4" />
                <span>斷碼急迫補貨預警 ({analytics.brokenGoldenSizeAlerts.length} 款)</span>
              </div>
              <button
                type="button"
                onClick={onOpenStockInModal}
                className="text-[11px] font-black underline cursor-pointer hover:opacity-80"
              >
                立即進貨
              </button>
            </div>
            <div className="space-y-1">
              {analytics.brokenGoldenSizeAlerts.slice(0, 3).map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white/60 dark:bg-slate-900/60"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-[11px]">
                      {item.product.sku}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[140px]">
                      {item.product.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-rose-600 px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950">
                    缺 US {item.outGoldenSizes.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hot Sellers */}
        {hotSellers.length > 0 && (
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>門市熱銷人氣榜</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">累積銷售雙數</span>
            </div>
            <div className="space-y-1">
              {hotSellers.map((item, idx) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950 font-black'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-[11px]">
                      {item.sku}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-medium truncate max-w-[130px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-[11px]">
                    已售 {item.count} 雙
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
