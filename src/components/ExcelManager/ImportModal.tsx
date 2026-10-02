import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, Download, Check, AlertCircle } from 'lucide-react';
import { parseExcelFile, downloadTemplateFile } from '../../services/excelService';
import { ImportResult } from '../../types/excel';
import { ProductWithVariants } from '../../types/inventory';
import { ValidationTable } from './ValidationTable';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedProducts: ProductWithVariants[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('請上傳 .xlsx, .xls 或 .csv 試算表檔案');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);
    try {
      const result = await parseExcelFile(file);
      setImportResult(result);
    } catch (err) {
      console.error('Failed to parse file:', err);
      alert('檔案讀取失敗，請確認檔案未損毀且符合 Excel 格式');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!importResult || importResult.parsedProducts.length === 0) return;

    const formattedProducts: ProductWithVariants[] = importResult.parsedProducts.map((p) => ({
      ...p.product,
      variants: p.variants,
    }));

    onImportSuccess(formattedProducts);
    onClose();
  };

  // Determine whether confirm button should be disabled
  const canConfirm =
    importResult !== null &&
    importResult.validCount > 0 &&
    importResult.errorCount === 0;

  return (
    <div
      data-testid="excel-preview-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                批次匯入鞋業專屬 Excel 尺碼矩陣
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                支援橫向尺碼 US 6.0 ~ 12.0 矩陣自動反樞紐化與型態防護檢核
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* File Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[0.99]'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300'
            }`}
          >
            <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              將 Excel 檔案拖曳至此，或點擊瀏覽電腦中的檔案
            </p>
            <p className="text-xs text-slate-400 mb-4">
              支援 .xlsx, .xls, .csv 檔案（建議使用標準橫向鞋碼範本）
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="cursor-pointer px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition">
                <span>選擇檔案</span>
                <input
                  type="file"
                  data-testid="file-upload-input"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              <button
                type="button"
                onClick={downloadTemplateFile}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>下載官方標準範本 (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span>正在即時解析試算表並校驗各欄位型態...</span>
            </div>
          )}

          {/* Parse Result Summary & Validation */}
          {importResult && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-xl font-medium">
                <div>
                  檔案名稱：<strong className="text-slate-900 dark:text-white font-mono">{fileName}</strong>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600 font-semibold">
                    通過：{importResult.validCount} 款
                  </span>
                  <span className={importResult.errorCount > 0 ? 'text-red-500 font-bold' : 'text-slate-400'}>
                    錯誤：{importResult.errorCount} 款
                  </span>
                </div>
              </div>

              {/* Validation Details Table */}
              <ValidationTable
                rows={importResult.previewRows}
                errors={importResult.errors}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {importResult ? (
              canConfirm ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> 驗證通過，可匯入 {importResult.validCount} 款鞋（共 {importResult.parsedProducts.reduce((acc, p) => acc + p.variants.reduce((a, v) => a + v.stock, 0), 0)} 雙庫存）
                </span>
              ) : (
                <span className="text-red-500 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> 檔案內包含格式錯誤，已阻擋匯入以防髒資料寫入
                </span>
              )
            ) : (
              '請上傳欲匯入之鞋款庫存 Excel 檔案'
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
            >
              取消
            </button>
            <button
              data-testid="btn-confirm-import"
              disabled={!canConfirm}
              onClick={handleConfirmImport}
              className={`px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition ${
                canConfirm
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>確認整批匯入</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
