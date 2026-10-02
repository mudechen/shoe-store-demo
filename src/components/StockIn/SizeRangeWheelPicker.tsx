import React, { useMemo, useCallback } from 'react';
import { SizeUnit } from '../../types/inventory';
import {
  UNIT_ALL_SIZES,
  getUnitRangeSizes,
  SIZE_UNITS,
  normalizeSizeKey,
  isWholeSizeKey,
} from '../../data/sizeStandards';
import { SlidersHorizontal } from 'lucide-react';

interface SizeRangeWheelPickerProps {
  unit: SizeUnit;
  minSize: string;
  maxSize: string;
  onRangeChange: (minSize: string, maxSize: string) => void;
  isHalfStep?: boolean;
}

export const SizeRangeWheelPicker: React.FC<SizeRangeWheelPickerProps> = ({
  unit,
  minSize,
  maxSize,
  onRangeChange,
  isHalfStep = true,
}) => {
  const allSizes = useMemo(() => {
    const raw = UNIT_ALL_SIZES[unit] || UNIT_ALL_SIZES.US;
    if (!isHalfStep && unit !== 'ALPHA') {
      return raw.filter(isWholeSizeKey);
    }
    return raw;
  }, [unit, isHalfStep]);

  // Robust normalized values matching allSizes
  const safeMinSize = useMemo(() => {
    const norm = normalizeSizeKey(unit, minSize);
    if (allSizes.includes(norm)) return norm;
    if (unit !== 'ALPHA') {
      const num = parseFloat(norm.replace(/[^\d.]/g, ''));
      if (!isNaN(num)) {
        let closest = allSizes[0] || minSize;
        let minDiff = Infinity;
        for (const s of allSizes) {
          const sNum = parseFloat(s.replace(/[^\d.]/g, ''));
          const diff = Math.abs(sNum - num);
          if (diff < minDiff) {
            minDiff = diff;
            closest = s;
          }
        }
        return closest;
      }
    }
    return allSizes[0] || minSize;
  }, [unit, minSize, allSizes]);

  const safeMaxSize = useMemo(() => {
    const norm = normalizeSizeKey(unit, maxSize);
    if (allSizes.includes(norm)) return norm;
    if (unit !== 'ALPHA') {
      const num = parseFloat(norm.replace(/[^\d.]/g, ''));
      if (!isNaN(num)) {
        let closest = allSizes[allSizes.length - 1] || maxSize;
        let minDiff = Infinity;
        for (const s of allSizes) {
          const sNum = parseFloat(s.replace(/[^\d.]/g, ''));
          const diff = Math.abs(sNum - num);
          if (diff < minDiff) {
            minDiff = diff;
            closest = s;
          }
        }
        return closest;
      }
    }
    return allSizes[allSizes.length - 1] || maxSize;
  }, [unit, maxSize, allSizes]);

  // Display order protection for summary
  const displayMin = useMemo(() => {
    const minIdx = allSizes.indexOf(safeMinSize);
    const maxIdx = allSizes.indexOf(safeMaxSize);
    if (minIdx !== -1 && maxIdx !== -1 && minIdx > maxIdx) {
      return safeMaxSize;
    }
    return safeMinSize;
  }, [allSizes, safeMinSize, safeMaxSize]);

  const displayMax = useMemo(() => {
    const minIdx = allSizes.indexOf(safeMinSize);
    const maxIdx = allSizes.indexOf(safeMaxSize);
    if (minIdx !== -1 && maxIdx !== -1 && minIdx > maxIdx) {
      return safeMinSize;
    }
    return safeMaxSize;
  }, [allSizes, safeMinSize, safeMaxSize]);

  // Calculate current range count
  const rangeSizes = useMemo(() => {
    return getUnitRangeSizes(unit, safeMinSize, safeMaxSize, isHalfStep);
  }, [unit, safeMinSize, safeMaxSize, isHalfStep]);

  const unitObj = useMemo(() => {
    return SIZE_UNITS.find((u) => u.key === unit);
  }, [unit]);

  // Safety validation handlers: min exceeds max -> push max; max < min -> pull min
  const handleMinSelect = useCallback(
    (newMin: string) => {
      const minIdx = allSizes.indexOf(newMin);
      const maxIdx = allSizes.indexOf(safeMaxSize);
      if (minIdx !== -1 && maxIdx !== -1 && minIdx > maxIdx) {
        // If min exceeds max, push max forward to match min
        onRangeChange(newMin, newMin);
      } else {
        onRangeChange(newMin, safeMaxSize);
      }
    },
    [allSizes, safeMaxSize, onRangeChange]
  );

  const handleMaxSelect = useCallback(
    (newMax: string) => {
      const maxIdx = allSizes.indexOf(newMax);
      const minIdx = allSizes.indexOf(safeMinSize);
      if (maxIdx !== -1 && minIdx !== -1 && maxIdx < minIdx) {
        // If max is less than min, pull min backward to match max
        onRangeChange(newMax, newMax);
      } else {
        onRangeChange(safeMinSize, newMax);
      }
    },
    [allSizes, safeMinSize, onRangeChange]
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl p-3 shadow-xs space-y-2.5">
      {/* Header: Title & Active Range Summary */}
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <SlidersHorizontal className="w-3 h-3" />
          </div>
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 whitespace-nowrap">
            尺碼區間選擇
          </span>
          <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
            (起訖號快速設定)
          </span>
        </div>

        <div
          data-testid="stockin-wheel-range-summary"
          className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 whitespace-nowrap"
        >
          {unitObj?.shortLabel || unit} {displayMin} ～ {displayMax}（共 {rangeSizes.length} 碼）
        </div>
      </div>

      {/* Dropdown Selectors: 起號與迄號快速下拉 */}
      <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-slate-600 dark:text-slate-400 shrink-0">起號:</span>
          <select
            data-testid="stockin-wheel-min-select"
            value={safeMinSize}
            onChange={(e) => handleMinSelect(e.target.value)}
            className="w-full text-xs font-black py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
          >
            {allSizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-slate-600 dark:text-slate-400 shrink-0">迄號:</span>
          <select
            data-testid="stockin-wheel-max-select"
            value={safeMaxSize}
            onChange={(e) => handleMaxSelect(e.target.value)}
            className="w-full text-xs font-black py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
          >
            {allSizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
