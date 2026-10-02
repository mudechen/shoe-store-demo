import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { getTaiwanTodayStr } from '../../utils/dateUtils';

export interface DateRange {
  startDate: string; // 'YYYY-MM-DD' or ''
  endDate: string;   // 'YYYY-MM-DD' or ''
}

interface DateRangePickerPopoverProps {
  startDate: string;
  endDate: string;
  onChange: (range: DateRange) => void;
  className?: string;
}

export const DateRangePickerPopover: React.FC<DateRangePickerPopoverProps> = ({
  startDate,
  endDate,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const todayStr = getTaiwanTodayStr();

  // Pure string parsing to prevent any local browser timezone shifts
  const parseYearMonth = (dateStr?: string) => {
    const target = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : todayStr;
    const [y, m] = target.split('-').map(Number);
    return { year: y, month: m - 1 };
  };

  const initialView = parseYearMonth(endDate || startDate);
  const [viewYear, setViewYear] = useState<number>(initialView.year);
  const [viewMonth, setViewMonth] = useState<number>(initialView.month);

  // In-progress range selection inside popover
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);

  const prevIsOpenRef = useRef(false);

  // Sync temp state when props change or popover opens
  useEffect(() => {
    if (!prevIsOpenRef.current && isOpen) {
      // When popover transitions from closed to open: view endDate (or startDate)
      setTempStart(startDate);
      setTempEnd(endDate);
      const targetDate = endDate || startDate;
      const parsed = parseYearMonth(targetDate);
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    } else if (!isOpen) {
      // Keep temp state in sync with external prop changes when closed
      setTempStart(startDate);
      setTempEnd(endDate);
    }
    prevIsOpenRef.current = isOpen;
  }, [startDate, endDate, isOpen]);

  // Click outside listener to close popover
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Discard unfinished single-day pick on outside click
        setTempStart(startDate);
        setTempEnd(endDate);
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTempStart(startDate);
        setTempEnd(endDate);
        setIsOpen(false);
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
  }, [isOpen, startDate, endDate]);

  // Navigate to previous month
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  // Navigate to next month
  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Handle clicking a day in the calendar
  const handleDayClick = (dateStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      // First click: reset and start new range
      setTempStart(dateStr);
      setTempEnd('');
    } else {
      // Second click: determine start & end
      const [finalStart, finalEnd] = dateStr < tempStart ? [dateStr, tempStart] : [tempStart, dateStr];
      setTempStart(finalStart);
      setTempEnd(finalEnd);
      // Ensure calendar view stays on 訖日 (finalEnd)
      const endView = parseYearMonth(finalEnd);
      setViewYear(endView.year);
      setViewMonth(endView.month);
      onChange({ startDate: finalStart, endDate: finalEnd });
    }
  };

  // Quick Clear from trigger button
  const handleQuickClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempStart('');
    setTempEnd('');
    onChange({ startDate: '', endDate: '' });
    const parsed = parseYearMonth();
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
  };

  // Clear from inside popover
  const handleClear = () => {
    setTempStart('');
    setTempEnd('');
    onChange({ startDate: '', endDate: '' });
    const parsed = parseYearMonth();
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
    setIsOpen(false);
  };

  // Confirm selection from inside popover
  const handleConfirm = () => {
    if (tempStart && !tempEnd) {
      onChange({ startDate: tempStart, endDate: tempStart });
    } else if (tempStart && tempEnd) {
      const [finalStart, finalEnd] = tempEnd < tempStart ? [tempEnd, tempStart] : [tempStart, tempEnd];
      onChange({ startDate: finalStart, endDate: finalEnd });
    } else {
      onChange({ startDate: '', endDate: '' });
    }
    setIsOpen(false);
  };

  // Calendar Calculation Helpers (using noon to prevent DST offset)
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1, 12, 0, 0).getDay(); // 0 = Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0, 12, 0, 0).getDate();

  // Button Display Label
  const hasRange = Boolean(startDate || endDate);
  const displayLabel = useMemo(() => {
    if (!startDate && !endDate) return '📅 日期區間（全部）';
    if (startDate && (!endDate || startDate === endDate)) return `📅 ${startDate}`;
    if (!startDate && endDate) return `📅 截止至 ${endDate}`;
    return `📅 ${startDate} ~ ${endDate}`;
  }, [startDate, endDate]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button Group */}
      <div
        className={`inline-flex items-center rounded-xl border text-xs font-black transition-all shadow-2xs ${
          hasRange
            ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
      >
        <button
          type="button"
          data-testid="records-date-range-trigger"
          onClick={() => setIsOpen((prev) => !prev)}
          className="px-3 py-1.5 flex items-center gap-1.5 cursor-pointer text-xs font-black text-inherit"
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate max-w-[210px] sm:max-w-none">{displayLabel}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'
            }`}
          />
        </button>

        {hasRange && (
          <button
            type="button"
            data-testid="records-date-range-clear-btn"
            onClick={handleQuickClear}
            className="pr-2 pl-0.5 py-1 text-indigo-500 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-white transition flex items-center justify-center cursor-pointer"
            title="清除日期篩選"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Popover Calendar Container */}
      {isOpen && (
        <div
          data-testid="records-date-range-popover"
          className="absolute left-0 top-full mt-2 z-50 p-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-[290px] sm:w-[310px] select-none animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Calendar Month Navigation Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              data-testid="calendar-prev-month"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="上個月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              data-testid="calendar-current-month"
              className="text-xs font-black text-slate-800 dark:text-slate-200"
            >
              {viewYear} 年 {viewMonth + 1} 月
            </span>
            <button
              type="button"
              data-testid="calendar-next-month"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="下個月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['日', '一', '二', '三', '四', '五', '六'].map((dayName, idx) => (
              <div
                key={dayName}
                className={`text-[11px] font-black py-0.5 ${
                  idx === 0 || idx === 6 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank cells before day 1 */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="w-full aspect-square" />
            ))}

            {/* Days 1..daysInMonth */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

              const [sortedStart, sortedEnd] =
                tempStart && tempEnd
                  ? tempStart < tempEnd
                    ? [tempStart, tempEnd]
                    : [tempEnd, tempStart]
                  : [tempStart, ''];

              const isStart = sortedStart === dateStr;
              const isEnd = sortedEnd === dateStr;
              const isInRange = Boolean(sortedStart && sortedEnd && dateStr > sortedStart && dateStr < sortedEnd);
              const isSingleSelected = isStart && (!sortedEnd || sortedStart === sortedEnd);
              const isToday = dateStr === todayStr;

              let dayClasses =
                'text-xs font-bold w-full aspect-square flex items-center justify-center transition-colors cursor-pointer rounded-lg ';

              if (isSingleSelected) {
                dayClasses += 'bg-indigo-600 text-white font-black shadow-xs';
              } else if (isStart) {
                dayClasses += 'bg-indigo-600 text-white font-black rounded-r-none';
              } else if (isEnd) {
                dayClasses += 'bg-indigo-600 text-white font-black rounded-l-none';
              } else if (isInRange) {
                dayClasses += 'bg-indigo-100/70 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded-none font-black';
              } else if (isToday) {
                dayClasses += 'text-indigo-600 dark:text-indigo-400 font-black border border-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800';
              } else {
                dayClasses += 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  data-testid={`calendar-day-${dateStr}`}
                  onClick={() => handleDayClick(dateStr)}
                  className={dayClasses}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer with status and action buttons */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
              {tempStart && tempEnd ? (
                tempStart === tempEnd ? (
                  <span>{tempStart}</span>
                ) : (
                  <span>
                    {tempStart < tempEnd ? tempStart : tempEnd} ~ {tempStart < tempEnd ? tempEnd : tempStart}
                  </span>
                )
              ) : tempStart ? (
                <span>起日: {tempStart}</span>
              ) : (
                <span className="text-slate-400">全部日期</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-testid="calendar-btn-clear"
                onClick={handleClear}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                清除
              </button>
              <button
                type="button"
                data-testid="calendar-btn-confirm"
                onClick={handleConfirm}
                className="px-3 py-1 text-[11px] font-black rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
