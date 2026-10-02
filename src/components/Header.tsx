import React from 'react';
import { Footprints, Wifi, Moon, Sun, Smartphone, Monitor, ScanBarcode, Maximize2, Minimize2 } from 'lucide-react';
import { SyncStatusInfo } from '../services/realtimeService';
import { FontSizeControl } from './FontSizeControl';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isMobilePreview: boolean;
  onToggleMobilePreview: () => void;
  onOpenScanner?: () => void;
  syncStatusInfo?: SyncStatusInfo;
  isFluidWidth?: boolean;
  onToggleFluidWidth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  onToggleDarkMode,
  isMobilePreview,
  onToggleMobilePreview,
  onOpenScanner,
  syncStatusInfo,
  isFluidWidth = true,
  onToggleFluidWidth,
}) => {
  const syncLabel = syncStatusInfo?.label || '⚡ 本地廣播同步中';
  const isTierA = syncStatusInfo?.isRealtimeTierA ?? false;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs w-full max-w-full overflow-hidden">
      {/* Portfolio Demo Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/30 py-1 text-center border-b border-amber-200/50 dark:border-amber-800/30">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          📋 Portfolio Demo — Data shown is for demonstration purposes only
        </p>
      </div>
      <div className={`mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 transition-all duration-200 ${
        isFluidWidth ? 'w-full max-w-[98%] 2xl:max-w-[1920px]' : 'max-w-7xl'
      }`}>
        {/* Brand & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Footprints className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none truncate">
                步態庫存視覺化系統
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider hidden sm:inline shrink-0">
                ShoeStore POS
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden md:block truncate">
              專為實體鞋零售打造之跨平台尺碼斷碼熱力圖與全流程庫存定位
            </p>
          </div>
        </div>

        {/* Action Controls & Sync Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Mobile Camera Barcode Scanner Open Button */}
          {onOpenScanner && (
            <button
              type="button"
              data-testid="btn-open-scanner"
              onClick={onOpenScanner}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition cursor-pointer"
              title="開啟手機鏡頭掃描條碼"
            >
              <ScanBarcode className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">掃描條碼</span>
            </button>
          )}

          {/* Dual-tier Realtime Sync Status Indicator */}
          <div
            data-testid="sync-status-indicator"
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-colors shrink-0"
            title={
              isTierA
                ? 'Supabase WebSocket 即時秒同步連線中'
                : 'HTML5 本地廣播頻道同步連線中 (多分頁/多視窗毫秒推播)'
            }
          >
            <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-500 shrink-0" />
            <span className="hidden md:inline">{syncLabel}</span>
            <span className="md:hidden">同步中</span>
          </div>

          {/* Fluid Width Toggle (Adaptive full width vs. 1280px standard container) */}
          {onToggleFluidWidth && !isMobilePreview && (
            <button
              type="button"
              data-testid="btn-toggle-fluid-width"
              onClick={onToggleFluidWidth}
              className={`hidden md:flex p-2 rounded-xl text-xs font-bold items-center gap-1.5 border transition cursor-pointer ${
                isFluidWidth
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isFluidWidth ? '當前為自適應滿版寬度，點擊切換為標準置中 (1280px)' : '當前為標準置中，點擊切換為自適應滿版寬度'}
            >
              {isFluidWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden xl:inline">
                {isFluidWidth ? '自適應滿版' : '標準寬度'}
              </span>
            </button>
          )}

          {/* Mobile Viewport Toggle (for desktop testing of 390x844 ergonomics) */}
          <button
            type="button"
            data-testid="btn-toggle-mobile-preview"
            onClick={onToggleMobilePreview}
            className={`hidden sm:flex p-2 rounded-xl text-xs font-bold items-center gap-1.5 border transition cursor-pointer ${
              isMobilePreview
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isMobilePreview ? '切換為電腦櫃台寬螢幕檢視' : '切換為店員手機 (390x844) 檢視'}
          >
            {isMobilePreview ? <Monitor className="w-4 h-4 text-white" /> : <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
            <span className="hidden sm:inline text-xs">
              {isMobilePreview ? '桌面視圖' : '手機模擬 (390x844)'}
            </span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
            aria-label="切換深淺色模式"
            title="切換深淺模式"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Font Size Selector Control */}
          <FontSizeControl />
        </div>
      </div>
    </header>
  );
};
