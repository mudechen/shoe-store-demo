import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertOctagon,
  Download,
  PlusCircle,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { ProductWithVariants } from '../../types/inventory';
import { formatCurrency } from '../../utils/formatters';
import { getTaiwanTodayStr } from '../../utils/dateUtils';

interface RestockAlertsProps {
  products: ProductWithVariants[];
  onRestockVariant?: (variantId: string, quantity: number) => void;
  onBatchRestock?: (restockItems: { variantId: string; quantity: number }[]) => void;
}

interface BrokenSizeItem {
  variantId: string;
  sizeUS: number;
  sizeDisplay?: string;
  currentStock: number;
  recommendedAdd: number;
}

interface ProductRestockSuggestion {
  product: ProductWithVariants;
  brokenCount: number;
  totalSizes: number;
  brokenRatio: number; // 0.0 ~ 1.0
  totalCurrentStock: number;
  brokenSizes: BrokenSizeItem[];
  totalRecommendedQty: number;
  estimatedCost: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const RestockAlerts: React.FC<RestockAlertsProps> = ({
  products,
  onRestockVariant,
  onBatchRestock,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'critical' | 'broken'>('all');
  const [justRestockedSku, setJustRestockedSku] = useState<string | null>(null);

  // Compute restock suggestions dynamically from inventory variants
  const suggestions: ProductRestockSuggestion[] = useMemo(() => {
    const list: ProductRestockSuggestion[] = [];

    products.forEach((p) => {
      let brokenCount = 0;
      let totalCurrentStock = 0;
      const brokenSizes: BrokenSizeItem[] = [];

      p.variants.forEach((v) => {
        totalCurrentStock += v.stock;
        if (v.stock === 0) {
          brokenCount++;
          // Recommend bringing stock to safe baseline of 3 pairs
          brokenSizes.push({
            variantId: v.id,
            sizeUS: v.sizeUS,
            sizeDisplay: v.sizeDisplay,
            currentStock: v.stock,
            recommendedAdd: 3,
          });
        } else if (v.stock <= 2) {
          brokenSizes.push({
            variantId: v.id,
            sizeUS: v.sizeUS,
            sizeDisplay: v.sizeDisplay,
            currentStock: v.stock,
            recommendedAdd: 3 - v.stock,
          });
        }
      });

      if (brokenSizes.length > 0) {
        const totalSizes = p.variants.length;
        const brokenRatio = totalSizes > 0 ? brokenCount / totalSizes : 0;
        const totalRecommendedQty = brokenSizes.reduce((sum, item) => sum + item.recommendedAdd, 0);
        const estimatedCost = totalRecommendedQty * p.costPrice;

        let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
        if (brokenRatio >= 0.4 || totalCurrentStock <= 3) {
          urgency = 'CRITICAL';
        } else if (brokenRatio >= 0.2 || totalCurrentStock <= 10) {
          urgency = 'HIGH';
        }

        list.push({
          product: p,
          brokenCount,
          totalSizes,
          brokenRatio,
          totalCurrentStock,
          brokenSizes,
          totalRecommendedQty,
          estimatedCost,
          urgency,
        });
      }
    });

    // Sort by Urgency (Critical -> High -> Medium) then Broken Ratio desc
    return list.sort((a, b) => {
      const rank = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
      if (rank[b.urgency] !== rank[a.urgency]) {
        return rank[b.urgency] - rank[a.urgency];
      }
      return b.brokenRatio - a.brokenRatio;
    });
  }, [products]);

  // Filtered suggestions
  const filteredSuggestions = useMemo(() => {
    if (filterMode === 'critical') {
      return suggestions.filter((s) => s.urgency === 'CRITICAL');
    }
    if (filterMode === 'broken') {
      return suggestions.filter((s) => s.brokenCount > 0);
    }
    return suggestions;
  }, [suggestions, filterMode]);

  // Totals for purchase order
  const totalSuggestedPairs = useMemo(
    () => filteredSuggestions.reduce((acc, s) => acc + s.totalRecommendedQty, 0),
    [filteredSuggestions]
  );

  const totalSuggestedCost = useMemo(
    () => filteredSuggestions.reduce((acc, s) => acc + s.estimatedCost, 0),
    [filteredSuggestions]
  );

  // Export replenishment purchase order to Excel / CSV
  const handleExportPurchaseOrder = () => {
    const today = getTaiwanTodayStr().replace(/-/g, '');
    const poNumber = `PO-${today}-${Math.floor(100 + Math.random() * 900)}`;

    const rows: any[] = [];

    filteredSuggestions.forEach((item) => {
      item.brokenSizes.forEach((bs) => {
        rows.push({
          '採購單號': poNumber,
          '匯出日期': getTaiwanTodayStr(),
          '款號 (SKU)': item.product.sku,
          '品牌': item.product.brand,
          '品名': item.product.name,
          '顏色': item.product.color,
          '缺貨尺碼': bs.sizeDisplay || (bs.sizeUS % 1 === 0 ? `US ${bs.sizeUS.toFixed(1)}` : `US ${bs.sizeUS}`),
          '目前庫存 (雙)': bs.currentStock,
          '建議採購量 (雙)': bs.recommendedAdd,
          '採購單價 (TWD)': item.product.costPrice,
          '採購小計 (TWD)': bs.recommendedAdd * item.product.costPrice,
          '門市陳列架位': item.product.displayLocation,
          '後倉存放架位': item.product.storageLocation,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '智慧補貨採購單');

    // Column widths
    worksheet['!cols'] = [
      { wch: 16 }, // PO
      { wch: 12 }, // Date
      { wch: 14 }, // SKU
      { wch: 14 }, // Brand
      { wch: 22 }, // Name
      { wch: 16 }, // Color
      { wch: 14 }, // Size
      { wch: 14 }, // Stock
      { wch: 16 }, // Order Qty
      { wch: 14 }, // Cost
      { wch: 16 }, // Subtotal
      { wch: 14 }, // Display
      { wch: 14 }, // Storage
    ];

    XLSX.writeFile(workbook, `鞋店補貨採購單_${today}.xlsx`);
  };

  // Quick 1-tap restock for single shoe
  const handleQuickRestockShoe = (item: ProductRestockSuggestion) => {
    if (onBatchRestock) {
      const restocks = item.brokenSizes.map((bs) => ({
        variantId: bs.variantId,
        quantity: bs.recommendedAdd,
      }));
      onBatchRestock(restocks);
    } else if (onRestockVariant) {
      item.brokenSizes.forEach((bs) => {
        onRestockVariant(bs.variantId, -bs.recommendedAdd); // negative quantity means restock
      });
    }

    setJustRestockedSku(item.product.sku);
    setTimeout(() => {
      setJustRestockedSku((curr) => (curr === item.product.sku ? null : curr));
    }, 2500);
  };

  return (
    <div className="space-y-4">
      {/* Header with Export Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              智慧斷碼分析與補貨採購建議
            </h3>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs">
              {filteredSuggestions.length} 款待補貨
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            自動依「斷碼率」與「安全庫存差額」即時演算最佳訂單量，防止流失客單
          </p>
        </div>

        {/* Action Button: Export Restock Purchase Order */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            data-testid="btn-export-excel-restock"
            onClick={handleExportPurchaseOrder}
            disabled={filteredSuggestions.length === 0}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer"
            title="一鍵匯出補貨採購單 Excel"
          >
            <Download className="w-4 h-4" />
            <span>匯出補貨採購單 ({totalSuggestedPairs} 雙)</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Summary Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl font-semibold">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterMode === 'all'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            全部需補貨 ({suggestions.length})
          </button>
          <button
            onClick={() => setFilterMode('critical')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterMode === 'critical'
                ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            重度斷碼 40%+ ({suggestions.filter((s) => s.urgency === 'CRITICAL').length})
          </button>
          <button
            onClick={() => setFilterMode('broken')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterMode === 'broken'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            已出現 0 雙斷碼 ({suggestions.filter((s) => s.brokenCount > 0).length})
          </button>
        </div>

        <div className="text-slate-500 font-medium">
          預計採購總額：<strong className="text-slate-900 dark:text-white font-bold">{formatCurrency(totalSuggestedCost)}</strong>
        </div>
      </div>

      {/* Suggestion Cards List */}
      <div className="space-y-3">
        {filteredSuggestions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              全店各尺碼庫存均維持充足！
            </h4>
            <p className="text-xs text-slate-400">
              目前無任何款式達到斷碼警戒線，營運狀態極佳。
            </p>
          </div>
        ) : (
          filteredSuggestions.map((item) => {
            const isJustRestocked = justRestockedSku === item.product.sku;

            return (
              <div
                key={item.product.id}
                className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs ${
                  item.urgency === 'CRITICAL'
                    ? 'border-red-200/90 dark:border-red-900/60'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  {/* Shoe Details */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                        {item.product.brand}
                      </span>
                      <span className="font-mono text-xs text-slate-400">{item.product.sku}</span>

                      {item.urgency === 'CRITICAL' && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold text-[10px] flex items-center gap-1">
                          <Flame className="w-3 h-3 text-red-500" />
                          <span>緊急缺碼</span>
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400">
                        目前全碼總計：<strong className="text-slate-800 dark:text-slate-200">{item.totalCurrentStock} 雙</strong>
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      {item.product.name}
                      <span className="text-xs font-normal text-slate-400 ml-2">({item.product.color})</span>
                    </h4>

                    {/* Broken Size Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">斷碼尺碼：</span>
                      {item.brokenSizes.map((bs) => (
                        <span
                          key={bs.variantId}
                          className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold flex items-center gap-1 ${
                            bs.currentStock === 0
                              ? 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                              : 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          <span>{bs.sizeDisplay || (bs.sizeUS % 1 === 0 ? `US ${bs.sizeUS.toFixed(1)}` : `US ${bs.sizeUS}`)}</span>
                          <span className="text-[10px] opacity-75">
                            ({bs.currentStock === 0 ? '斷碼' : `${bs.currentStock}雙`} &rarr; +{bs.recommendedAdd}雙)
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Restock Summary & Action */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left md:text-right">
                      <div className="text-xs text-slate-400">建議採購</div>
                      <div className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400">
                        +{item.totalRecommendedQty} 雙
                      </div>
                      <div className="text-[11px] text-slate-400">
                        成本約 {formatCurrency(item.estimatedCost)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickRestockShoe(item)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        isJustRestocked
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {isJustRestocked ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>已補齊入庫</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4 text-indigo-500" />
                          <span>一鍵補齊 (+{item.totalRecommendedQty}雙)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
