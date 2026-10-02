import React from 'react';
import { SlidersHorizontal, BarChart3, Receipt, ScanBarcode } from 'lucide-react';

interface MobileBottomNavProps {
  viewMode: 'matrix' | 'dashboard' | 'sales';
  onSelectViewMode: (mode: 'matrix' | 'dashboard' | 'sales') => void;
  onOpenScanner: () => void;
  isInsideSimulator?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  viewMode,
  onSelectViewMode,
  onOpenScanner,
  isInsideSimulator = false,
}) => {
  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="手機端主導航"
      className={`${
        isInsideSimulator ? 'absolute' : 'fixed'
      } bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 px-3 py-2 shadow-lg transition-all`}
    >
      <div className="max-w-md mx-auto flex items-center justify-around gap-1">
        {/* Tab 1: Matrix Heatmap */}
        <button
          type="button"
          onClick={() => onSelectViewMode('matrix')}
          className={`flex-1 py-1.5 px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer active:scale-95 select-none ${
            viewMode === 'matrix'
              ? 'text-indigo-600 dark:text-indigo-400 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition ${
              viewMode === 'matrix'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-[11px] leading-tight tracking-tight">
            尺碼庫存
          </span>
        </button>

        {/* Tab 2: Dashboard */}
        <button
          type="button"
          data-testid="bottom-tab-dashboard"
          onClick={() => onSelectViewMode('dashboard')}
          className={`flex-1 py-1.5 px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer active:scale-95 select-none ${
            viewMode === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition ${
              viewMode === 'dashboard'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BarChart3 className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-[11px] leading-tight tracking-tight">
            經營動態
          </span>
        </button>

        {/* Center Action: Direct Barcode Scanner */}
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            data-testid="btn-mobile-scanner-center"
            onClick={onOpenScanner}
            className="w-12 h-12 -mt-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-90 text-white flex flex-col items-center justify-center shadow-lg shadow-indigo-600/30 border-2 border-white dark:border-slate-900 transition cursor-pointer group"
            title="開啟手機鏡頭快速掃碼"
          >
            <ScanBarcode className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Tab 3: Sales Closing */}
        <button
          type="button"
          data-testid="bottom-tab-sales-closing"
          onClick={() => onSelectViewMode('sales')}
          className={`flex-1 py-1.5 px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer active:scale-95 select-none ${
            viewMode === 'sales'
              ? 'text-indigo-600 dark:text-indigo-400 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition ${
              viewMode === 'sales'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Receipt className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-[11px] leading-tight tracking-tight">
            收銀日結
          </span>
        </button>
      </div>
    </nav>
  );
};
