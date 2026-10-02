import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ALargeSmall, Sparkles, RotateCcw, Check, Minus, Plus, X } from 'lucide-react';

export type FontSizeMode = 'auto' | 'small' | 'standard' | 'large' | 'xlarge';

export interface FontSizeOption {
  id: FontSizeMode;
  label: string;
  sublabel: string;
  scalePercent: number;
  basePx: number;
  description: string;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  {
    id: 'small',
    label: '緊湊',
    sublabel: '90%',
    scalePercent: 90,
    basePx: 14.4,
    description: '密集排列・一頁顯示最多款',
  },
  {
    id: 'standard',
    label: '標準',
    sublabel: '100%',
    scalePercent: 100,
    basePx: 16,
    description: '預設標準・最適閱讀比例',
  },
  {
    id: 'large',
    label: '中大',
    sublabel: '112%',
    scalePercent: 112.5,
    basePx: 18,
    description: '巡店清晰・手持走動易辨識',
  },
  {
    id: 'xlarge',
    label: '特大',
    sublabel: '125%',
    scalePercent: 125,
    basePx: 20,
    description: '長輩友善・特大字極速查庫存',
  },
];

const STORAGE_KEY = 'shoe_store_font_size_mode';

/**
 * Compute adaptive base font size according to viewport width for Auto mode
 */
export function computeAutoFontSize(): { px: number; scale: number } {
  if (typeof window === 'undefined') return { px: 16, scale: 1.0 };
  const width = window.innerWidth;
  // Narrow screens (< 360px)
  if (width < 360) {
    return { px: 14.8, scale: 0.925 };
  }
  // Standard mobile (360px - 440px)
  if (width <= 440) {
    return { px: 16, scale: 1.0 };
  }
  // Tablet and desktop screens
  return { px: 16.5, scale: 1.03125 };
}

/**
 * Apply the selected font size mode to document.documentElement
 */
export function applyFontSize(mode: FontSizeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.fontSize = mode;

  if (mode === 'auto') {
    const { px, scale } = computeAutoFontSize();
    root.style.fontSize = `${px}px`;
    root.style.setProperty('--app-font-scale', String(scale));
  } else {
    const opt = FONT_SIZE_OPTIONS.find((o) => o.id === mode);
    if (opt) {
      root.style.fontSize = `${opt.basePx}px`;
      root.style.setProperty('--app-font-scale', String(opt.scalePercent / 100));
    } else {
      root.style.fontSize = '16px';
      root.style.setProperty('--app-font-scale', '1.0');
    }
  }
}

interface FontSizeControlProps {
  className?: string;
}

export const FontSizeControl: React.FC<FontSizeControlProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Initialize from localStorage
  const [mode, setMode] = useState<FontSizeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (
        saved &&
        (saved === 'auto' || saved === 'small' || saved === 'standard' || saved === 'large' || saved === 'xlarge')
      ) {
        return saved as FontSizeMode;
      }
    } catch (e) {
      console.warn('Unable to access localStorage for font size:', e);
    }
    return 'standard';
  });

  // Apply font size and register listeners
  useEffect(() => {
    applyFontSize(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Unable to save font size to localStorage:', e);
    }

    if (mode === 'auto') {
      const handleResize = () => {
        applyFontSize('auto');
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [mode]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Click outside and ESC key dismiss listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Quick stepper order
  const order: FontSizeMode[] = useMemo(() => ['small', 'standard', 'large', 'xlarge'], []);
  const currentIndex = order.indexOf(mode === 'auto' ? 'standard' : mode);

  const canStepDown = currentIndex > 0;
  const canStepUp = currentIndex < order.length - 1;

  const handleStepDown = useCallback(() => {
    if (canStepDown) {
      setMode(order[currentIndex - 1]);
    }
  }, [canStepDown, currentIndex, order]);

  const handleStepUp = useCallback(() => {
    if (canStepUp) {
      setMode(order[currentIndex + 1]);
    }
  }, [canStepUp, currentIndex, order]);

  // Mode display helpers
  const currentOption = FONT_SIZE_OPTIONS.find((o) => o.id === mode);
  const currentLabel = mode === 'auto' ? '自動適配' : currentOption ? currentOption.label : '標準';
  const currentScalePercent = mode === 'auto' ? 100 : currentOption ? currentOption.scalePercent : 100;

  return (
    <div
      data-testid="font-size-control-container"
      className={`relative ${className}`}
      ref={containerRef}
    >
      {/* Trigger Button: Placed in top bar next to Dark Mode button */}
      <button
        ref={triggerRef}
        type="button"
        data-testid="btn-font-size-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="選取文字大小"
        title={`字體大小 (${currentLabel})`}
        className={`p-2 rounded-xl transition-all cursor-pointer relative flex items-center justify-center ${
          isOpen
            ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-300 dark:ring-indigo-700'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <ALargeSmall className="w-4 h-4" />
        {mode !== 'standard' && (
          <span
            data-testid="font-size-active-dot"
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"
          />
        )}
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          data-testid="font-size-popover"
          role="dialog"
          aria-label="字體大小選單"
          className="absolute right-0 top-full mt-2 w-[285px] max-w-[calc(100vw-1.5rem)] sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800/90 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <ALargeSmall className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-black tracking-tight">字體大小調整</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                data-testid="font-size-status-badge"
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60"
              >
                {mode === 'auto' ? '✨ 智慧自動' : `${Math.round(currentScalePercent)}% ${currentLabel}`}
              </span>
              <button
                type="button"
                data-testid="btn-close-font-size"
                onClick={handleClose}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="關閉"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section 1: 自動調整模式 (Auto-Scaling Mode) */}
          <div className="mb-3">
            <button
              type="button"
              data-testid="btn-font-mode-auto"
              onClick={() => setMode('auto')}
              className={`w-full p-2.5 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                mode === 'auto'
                  ? 'bg-gradient-to-r from-indigo-50/90 to-indigo-100/50 dark:from-indigo-950/60 dark:to-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    mode === 'auto'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-black flex items-center gap-1.5">
                    <span>螢幕智慧自動適配</span>
                    {mode === 'auto' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                        作用中
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    隨手機螢幕寬度最適微調，避免斷碼破版
                  </div>
                </div>
              </div>
              {mode === 'auto' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
            </button>
          </div>

          {/* Section 2: 選取文字大小 (4 Presets) */}
          <div className="mb-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>選取固定字級</span>
              <span className="text-[10px] lowercase font-normal text-slate-400">即時切換</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {FONT_SIZE_OPTIONS.map((opt) => {
                const isSelected = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`btn-font-mode-${opt.id}`}
                    onClick={() => setMode(opt.id)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span
                      className={`font-black ${
                        opt.id === 'small'
                          ? 'text-xs'
                          : opt.id === 'standard'
                          ? 'text-sm'
                          : opt.id === 'large'
                          ? 'text-base'
                          : 'text-lg'
                      }`}
                    >
                      A
                    </span>
                    <span className="text-[10px] font-bold mt-0.5 leading-none">{opt.label}</span>
                    <span
                      className={`text-[9px] mt-0.5 leading-none ${
                        isSelected ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      {opt.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: 快速微調與重設 */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mb-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="btn-font-step-down"
                onClick={handleStepDown}
                disabled={!canStepDown}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                title="縮小一級"
              >
                <Minus className="w-3 h-3" />
                <span>A-</span>
              </button>
              <button
                type="button"
                data-testid="btn-font-step-up"
                onClick={handleStepUp}
                disabled={!canStepUp}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                title="放大一級"
              >
                <Plus className="w-3 h-3" />
                <span>A+</span>
              </button>
            </div>

            <button
              type="button"
              data-testid="btn-font-reset"
              onClick={() => setMode('standard')}
              className="px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="重設為預設標準 (100%)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重設標準</span>
            </button>
          </div>

          {/* Section 4: 店員即時預覽效果 */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-between">
              <span>門市字體預覽效果</span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {mode === 'auto' ? '自動縮放' : `${Math.round(currentScalePercent)}%`}
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                👟 Nike Air Force 1 &apos;07 ・ US 8.5
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">門市現貨 3 雙</span>
                <span className="font-mono text-slate-900 dark:text-white">$3,400</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
