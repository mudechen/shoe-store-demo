import React, { useState, useRef } from 'react';
import {
  ClipboardList,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { useInventory, useSales } from '../../context/InventoryContext';
import {
  BatchSaleDraftItem,
  ShoeCategory,
  PaymentMethod,
  SHOE_CATEGORIES
} from '../../types/sales';
import { findMatchingShoe } from '../../services/salesService';
import { getTaiwanTodayStr } from '../../utils/dateUtils';

interface BatchSaleGridProps {
  onComplete?: () => void;
}

interface BatchGridRowState extends BatchSaleDraftItem {
  key: string;
}

export function normalizeShoeCategory(cat: string): ShoeCategory {
  if (['運動鞋', '拖鞋', '涼鞋', '包鞋', '皮鞋', '雨鞋', '長短靴', '其他'].includes(cat)) {
    return cat as ShoeCategory;
  }
  const lower = (cat || '').toLowerCase();
  if (
    lower.includes('run') ||
    lower.includes('basket') ||
    lower.includes('life') ||
    lower.includes('sport') ||
    lower.includes('skate') ||
    lower.includes('train')
  ) {
    return '運動鞋';
  }
  if (lower.includes('slip') || lower.includes('slide')) return '拖鞋';
  if (lower.includes('sandal')) return '涼鞋';
  if (lower.includes('boot')) return '長短靴';
  if (lower.includes('leather') || lower.includes('oxford')) return '皮鞋';
  if (lower.includes('rain')) return '雨鞋';
  return '運動鞋';
}

const createBlankRow = (index: number): BatchGridRowState => ({
  key: `row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
  id: `draft-${index}`,
  sku: '',
  brand: '',
  name: '',
  color: '',
  sizeUS: '8.5',
  category: '運動鞋',
  retailPrice: '',
  actualPaid: '',
  paymentMethod: 'cash',
  notes: '',
  isCustom: false
});

export const BatchSaleGrid: React.FC<BatchSaleGridProps> = ({ onComplete }) => {
  const { products } = useInventory();
  const { recordBatchSales } = useSales();

  const [businessDate, setBusinessDate] = useState<string>(() => {
    return getTaiwanTodayStr();
  });

  const [rows, setRows] = useState<BatchGridRowState[]>([
    createBlankRow(0),
    createBlankRow(1)
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const skuInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update a single field in a row
  const updateRow = (index: number, field: keyof BatchSaleDraftItem, value: any) => {
    setRows((prev) => {
      const copy = [...prev];
      const currentRow = { ...copy[index], [field]: value };

      // When SKU is updated, trigger automatic product match
      if (field === 'sku') {
        const query = String(value).trim();
        if (query) {
          const matched = findMatchingShoe(products, query);
          if (matched) {
            currentRow.brand = matched.brand;
            currentRow.name = matched.name;
            currentRow.color = matched.color;
            currentRow.category = normalizeShoeCategory(matched.category);
            currentRow.retailPrice = matched.retailPrice;
            if (!currentRow.actualPaid) {
              currentRow.actualPaid = matched.retailPrice;
            }
            currentRow.matchedProductId = matched.id;
            currentRow.isCustom = false;
          } else {
            currentRow.isCustom = true;
          }
        }
      }

      copy[index] = currentRow;
      return copy;
    });
  };

  // Add a new row to the grid
  const handleAddRow = () => {
    setRows((prev) => {
      const nextIndex = prev.length;
      return [...prev, createBlankRow(nextIndex)];
    });

    // Focus the newly added row after render
    setTimeout(() => {
      const nextIndex = rows.length;
      if (skuInputRefs.current[nextIndex]) {
        skuInputRefs.current[nextIndex]?.focus();
      }
    }, 50);
  };

  // Remove a row
  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      setRows([createBlankRow(0)]);
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Enter key on any input in row: commit and create/advance to next row
  const handleRowEnter = (currentIndex: number) => {
    if (currentIndex === rows.length - 1) {
      // Last row: append a new row and focus it
      setRows((prev) => [...prev, createBlankRow(prev.length)]);
      setTimeout(() => {
        if (skuInputRefs.current[currentIndex + 1]) {
          skuInputRefs.current[currentIndex + 1]?.focus();
        }
      }, 50);
    } else {
      // Middle row: jump to next row SKU
      if (skuInputRefs.current[currentIndex + 1]) {
        skuInputRefs.current[currentIndex + 1]?.focus();
      }
    }
  };

  // Submit batch sales
  const handleSubmitBatch = () => {
    // E08: Prune completely empty rows (must have SKU, brand, or name)
    const validDrafts = rows.filter((r) => {
      const hasSku = Boolean(r.sku && r.sku.trim());
      const hasBrand = Boolean(r.brand && r.brand.trim());
      const hasName = Boolean(r.name && r.name.trim());
      return hasSku || hasBrand || hasName;
    });

    if (validDrafts.length === 0) {
      alert('請至少填寫一列有效的銷貨資料（款號、廠家或品名）。');
      return;
    }

    const result = recordBatchSales(validDrafts, businessDate);

    if (result.successCount > 0 && result.errors.length === 0) {
      setToastMessage(`批次登打完成，成功記錄 ${result.successCount} 筆銷貨！已同步庫存連動`);
      setTimeout(() => {
        setToastMessage(null);
      }, 4500);

      // Reset to 2 clean rows
      setRows([createBlankRow(0), createBlankRow(1)]);

      if (onComplete) {
        onComplete();
      }
    } else if (result.successCount > 0 && result.errors.length > 0) {
      alert(`批次部分成功 (${result.successCount} 筆)，但有 ${result.errors.length} 列錯誤未記錄：\n${result.errors.join('\n')}`);
      setToastMessage(`已記錄 ${result.successCount} 筆銷貨，請修正錯誤列`);
      setTimeout(() => {
        setToastMessage(null);
      }, 4500);
    } else if (result.errors.length > 0) {
      alert(`批次登打失敗:\n${result.errors.join('\n')}`);
    }
  };

  return (
    <div
      data-testid="batch-sales-container"
      className="w-full max-w-full space-y-6 overflow-hidden"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 bg-slate-950/95 text-white px-5 py-4 rounded-2xl shadow-2xl border-2 border-emerald-500 font-black flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5"
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-sm sm:text-base">{toastMessage}</div>
        </div>
      )}

      {/* Control Bar: Business Date & Keyboard Hint */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
          <label
            htmlFor="batch-business-date"
            className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300 shrink-0"
          >
            補登營業日期：
          </label>
          <input
            id="batch-business-date"
            type="date"
            value={businessDate}
            onChange={(e) => setBusinessDate(e.target.value)}
            className="px-3 py-1.5 min-h-[40px] rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs sm:text-sm focus:border-indigo-600 outline-none"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>鍵盤提示：按 Tab 跳至下一格，任一格按 Enter 自動換行或新增下一列</span>
        </div>
      </div>

      {/* Interactive Spreadsheet Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs">
                <th className="py-3 px-2 text-center w-10">#</th>
                <th className="py-3 px-3 w-44">款號 / SKU (自動帶入)</th>
                <th className="py-3 px-3 w-28">尺碼 (US)</th>
                <th className="py-3 px-3 w-32">實收金額</th>
                <th className="py-3 px-3 w-32">廠家 / 品牌</th>
                <th className="py-3 px-3 w-28">顏色</th>
                <th className="py-3 px-3 w-32">分類</th>
                <th className="py-3 px-3 w-32">支付方式</th>
                <th className="py-3 px-2 text-center w-14">刪除</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row, index) => (
                <tr
                  key={row.key}
                  data-testid={`batch-grid-row-${index}`}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  {/* Row Number */}
                  <td className="py-2.5 px-2 text-center text-xs font-mono font-bold text-slate-400">
                    {index + 1}
                  </td>

                  {/* Cell 1: SKU */}
                  <td className="py-2.5 px-3">
                    <div className="relative">
                      <input
                        ref={(el) => {
                          skuInputRefs.current[index] = el;
                        }}
                        type="text"
                        data-testid={`batch-cell-sku-${index}`}
                        value={row.sku}
                        onChange={(e) => updateRow(index, 'sku', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleRowEnter(index);
                          }
                        }}
                        placeholder="如 FD0655-001..."
                        className="w-full px-2.5 py-1.5 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs sm:text-sm focus:border-indigo-600 outline-none"
                      />
                      {!row.isCustom && row.sku && (
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>
                  </td>

                  {/* Cell 2: Size */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      data-testid={`batch-cell-size-${index}`}
                      value={row.sizeUS}
                      onChange={(e) => updateRow(index, 'sizeUS', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRowEnter(index);
                        }
                      }}
                      placeholder="8.5"
                      className="w-full px-2.5 py-1.5 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs sm:text-sm text-center focus:border-indigo-600 outline-none"
                    />
                  </td>

                  {/* Cell 3: Price */}
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      data-testid={`batch-cell-price-${index}`}
                      value={row.actualPaid}
                      onChange={(e) => updateRow(index, 'actualPaid', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRowEnter(index);
                        }
                      }}
                      placeholder="3400"
                      className="w-full px-2.5 py-1.5 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-xs sm:text-sm text-right focus:border-indigo-600 outline-none"
                    />
                  </td>

                  {/* Cell 4: Brand */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      data-testid={`batch-cell-brand-${index}`}
                      value={row.brand}
                      onChange={(e) => updateRow(index, 'brand', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRowEnter(index);
                        }
                      }}
                      placeholder="品牌 / 廠家"
                      className="w-full px-2.5 py-1.5 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs sm:text-sm focus:border-indigo-600 outline-none"
                    />
                  </td>

                  {/* Cell 5: Color */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      data-testid={`batch-cell-color-${index}`}
                      value={row.color}
                      onChange={(e) => updateRow(index, 'color', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRowEnter(index);
                        }
                      }}
                      placeholder="標準色"
                      className="w-full px-2.5 py-1.5 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:border-indigo-600 outline-none"
                    />
                  </td>

                  {/* Cell 6: Category */}
                  <td className="py-2.5 px-3">
                    <select
                      data-testid={`batch-cell-category-${index}`}
                      value={row.category}
                      onChange={(e) =>
                        updateRow(index, 'category', e.target.value as ShoeCategory)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRowEnter(index);
                        }
                      }}
                      className="w-full px-2 py-1.5 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:border-indigo-600 outline-none cursor-pointer"
                    >
                      {SHOE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Cell 7: Payment Method */}
                  <td className="py-2.5 px-3">
                    <select
                      data-testid={`batch-cell-payment-${index}`}
                      value={row.paymentMethod}
                      onChange={(e) =>
                        updateRow(index, 'paymentMethod', e.target.value as PaymentMethod)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRowEnter(index);
                        }
                      }}
                      className="w-full px-2 py-1.5 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:border-indigo-600 outline-none cursor-pointer"
                    >
                      <option value="cash">💵 現金</option>
                      <option value="credit">💳 信用卡</option>
                      <option value="mobile_pay">📱 行動支付</option>
                    </select>
                  </td>

                  {/* Delete Action */}
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="min-h-[36px] min-w-[36px] p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer flex items-center justify-center mx-auto"
                      title="刪除此列"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row Button Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            data-testid="btn-add-batch-row"
            onClick={handleAddRow}
            className="min-h-[42px] px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-black text-xs sm:text-sm rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新增一行 (Enter 快速換行)</span>
          </button>

          <span className="text-xs font-bold text-slate-500">
            目前共 {rows.length} 列待登記項目
          </span>
        </div>
      </div>

      {/* Batch Submit Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          data-testid="btn-batch-submit-sales"
          onClick={handleSubmitBatch}
          className="w-full sm:w-auto min-h-[48px] px-8 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-base rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <ClipboardList className="w-5 h-5 text-white" />
          <span>確認送出整批銷貨紀錄（自動扣庫）</span>
        </button>
      </div>
    </div>
  );
};
