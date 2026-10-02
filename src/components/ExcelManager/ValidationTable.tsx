import React from 'react';
import { ImportPreviewRow, ValidationError } from '../../types/excel';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { STANDARD_SIZES } from '../../data/sizeStandards';

interface ValidationTableProps {
  rows: ImportPreviewRow[];
  errors: ValidationError[];
}

export const ValidationTable: React.FC<ValidationTableProps> = ({ rows, errors }) => {
  return (
    <div className="space-y-4">
      {/* Error Summary Banner */}
      {errors.length > 0 && (
        <div
          data-testid="validation-error-banner"
          className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h5 className="font-bold text-red-800 dark:text-red-200 mb-1">
              資料格式檢核未通過 (發現 {errors.length} 項格式錯誤)
            </h5>
            <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto custom-scrollbar">
              {errors.slice(0, 10).map((err, idx) => (
                <li key={idx}>
                  第 {err.row} 列 【{err.column}】：{err.message}
                </li>
              ))}
              {errors.length > 10 && (
                <li className="font-semibold text-red-600">
                  ...其餘 {errors.length - 10} 項錯誤請參閱下方表格標記
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div className="max-h-72 overflow-x-auto overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-xs text-left border-collapse min-w-[700px]">
          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-2 w-12 text-center">列號</th>
              <th className="p-2 w-20 text-center">狀態</th>
              <th className="p-2">款號 (SKU)</th>
              <th className="p-2">品牌</th>
              <th className="p-2">品名</th>
              <th className="p-2 text-right">建議售價</th>
              {STANDARD_SIZES.slice(0, 6).map((s) => (
                <th key={s.sizeUS} className="p-2 text-center font-mono">
                  {s.sizeUS.toFixed(1)}
                </th>
              ))}
              <th className="p-2 text-center">...其餘尺碼</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => {
              const hasRowError = !row.isValid;
              return (
                <tr
                  key={row.rowNumber}
                  className={
                    hasRowError
                      ? 'bg-red-50/70 dark:bg-red-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }
                >
                  <td className="p-2 text-center font-mono text-slate-400">
                    {row.rowNumber}
                  </td>
                  <td className="p-2 text-center">
                    {row.isValid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 正確
                      </span>
                    ) : (
                      <span className="error-cell-badge inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/60 px-1.5 py-0.5 rounded">
                        <AlertCircle className="w-3.5 h-3.5" /> 錯誤
                      </span>
                    )}
                  </td>
                  <td className="p-2 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {row.data.sku || <span className="text-red-500 font-normal">缺款號</span>}
                  </td>
                  <td className="p-2 text-slate-600 dark:text-slate-300">
                    {row.data.brand || <span className="text-red-500 font-normal">缺品牌</span>}
                  </td>
                  <td className="p-2 text-slate-900 dark:text-white font-medium max-w-[150px] truncate">
                    {row.data.name || <span className="text-red-500 font-normal">缺品名</span>}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {row.data.retailPrice !== undefined ? (
                      `$${row.data.retailPrice}`
                    ) : (
                      <span className="text-red-500">異常</span>
                    )}
                  </td>

                  {/* First few size previews */}
                  {STANDARD_SIZES.slice(0, 6).map((s) => {
                    const count = row.data.sizes ? row.data.sizes[s.sizeUS] : undefined;
                    return (
                      <td key={s.sizeUS} className="p-2 text-center font-mono">
                        {count !== undefined ? count : '-'}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center text-slate-400">...</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
