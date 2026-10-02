import React from 'react';
import { Receipt, CalendarClock, Home, Layers, FileSpreadsheet } from 'lucide-react';

export type MobileTabType = 'cashier' | 'reservations' | 'home' | 'inventory' | 'records';

interface MobileNavProps {
  activeTab: MobileTabType;
  onChangeTab: (tab: MobileTabType) => void;
  todaySalesCount?: number;
  pendingReservationsCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onChangeTab,
  todaySalesCount = 0,
  pendingReservationsCount = 0,
}) => {
  const tabs = [
    {
      id: 'cashier' as const,
      label: '銷貨記帳',
      icon: Receipt,
      badge: todaySalesCount > 0 ? todaySalesCount : undefined,
      badgeColor: 'bg-emerald-500',
    },
    {
      id: 'reservations' as const,
      label: '客戶預訂',
      icon: CalendarClock,
      badge: pendingReservationsCount > 0 ? pendingReservationsCount : undefined,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'home' as const,
      label: '首頁',
      icon: Home,
      isCenter: true,
    },
    {
      id: 'inventory' as const,
      label: '庫存清單',
      icon: Layers,
    },
    {
      id: 'records' as const,
      label: '紀錄明細',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="手機端底部導航"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 safe-area-bottom shadow-lg"
    >
      <div className="max-w-md mx-auto flex items-end justify-around px-1.5 py-1 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          // Special Center Prominent Home Button (小房子放大居中)
          if (tab.isCenter) {
            return (
              <div key={tab.id} className="flex-1 flex flex-col items-center justify-end pb-1">
                <button
                  type="button"
                  data-testid={`nav-tab-${tab.id}`}
                  onClick={() => onChangeTab(tab.id)}
                  aria-label="首頁總覽大廳"
                  className={`-mt-4 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 shadow-md select-none ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-indigo-600/35 ring-4 ring-indigo-100 dark:ring-indigo-950 scale-105'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-lg'
                  }`}
                  title="首頁總覽工作台"
                >
                  <Home className={`w-6 h-6 ${isActive ? 'stroke-[2.4]' : 'stroke-[2]'}`} />
                </button>
                <span
                  className={`text-[10px] mt-1 tracking-tight select-none ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400 font-black'
                      : 'text-slate-500 dark:text-slate-400 font-semibold'
                  }`}
                >
                  首頁
                </span>
              </div>
            );
          }

          // Normal 4 Side Tabs (銷貨、預訂、庫存、紀錄)
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`nav-tab-${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 relative flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer active:scale-95 select-none ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 shadow-3xs'
                      : 'bg-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                </div>
                {typeof tab.badge === 'number' && (
                  <span
                    className={`absolute -top-1 -right-2 min-w-[17px] h-[17px] px-1 text-[9px] font-black text-white ${tab.badgeColor} rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse`}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight truncate max-w-[56px] text-center ${
                  isActive ? 'font-black' : 'font-semibold'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
