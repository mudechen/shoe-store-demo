import React, { useMemo } from 'react';
import {
  TrendingUp,
  PackageCheck,
  AlertTriangle,
  XCircle,
  Clock,
  DollarSign,
  Activity,
  Layers,
  ArrowUpRight,
  PieChart as PieChartIcon,
  BarChart3,
  Award,
} from 'lucide-react';
import { ProductWithVariants, getStockLevel } from '../../types/inventory';
import { formatCurrency } from '../../utils/formatters';
import { STANDARD_SIZES } from '../../data/sizeStandards';
import { useResponsive } from '../../context/ResponsiveContext';

interface HealthMetricsProps {
  products: ProductWithVariants[];
  onSelectStatusFilter?: (filter: 'all' | 'out' | 'warning' | 'sufficient') => void;
}

export const HealthMetrics: React.FC<HealthMetricsProps> = ({
  products,
  onSelectStatusFilter,
}) => {
  const { isMobile } = useResponsive();

  const metrics = useMemo(() => {
    let totalPairs = 0;
    let totalRetailValue = 0;
    let totalCostValue = 0;
    let outOfStockCount = 0;
    let warningCount = 0;
    let sufficientCount = 0;
    let totalVariants = 0;

    const brandPairsMap: { [brand: string]: number } = {};
    const sizePairsMap: { [sizeUS: number]: number } = {};

    // Initialize size pairs map
    STANDARD_SIZES.forEach((s) => {
      sizePairsMap[s.sizeUS] = 0;
    });

    products.forEach((p) => {
      brandPairsMap[p.brand] = (brandPairsMap[p.brand] || 0);

      p.variants.forEach((v) => {
        totalVariants++;
        totalPairs += v.stock;
        totalRetailValue += v.stock * p.retailPrice;
        totalCostValue += v.stock * p.costPrice;

        brandPairsMap[p.brand] += v.stock;
        if (sizePairsMap[v.sizeUS] !== undefined) {
          sizePairsMap[v.sizeUS] += v.stock;
        }

        const level = getStockLevel(v.stock);
        if (level === 'out') {
          outOfStockCount++;
        } else if (level === 'warning') {
          warningCount++;
        } else {
          sufficientCount++;
        }
      });
    });

    const potentialGrossProfit = totalRetailValue - totalCostValue;
    const grossMarginPercent =
      totalRetailValue > 0
        ? ((potentialGrossProfit / totalRetailValue) * 100).toFixed(1)
        : '0.0';

    // Estimated daily velocity & turnover
    const estimatedDailyVelocity = Math.max(1, Math.round(totalPairs / 38));
    const turnoverDays = Math.round(totalPairs / estimatedDailyVelocity);

    let turnoverHealth = {
      rating: '🟢 週轉健康',
      color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700',
      desc: '週轉率維持於 30~45 天黃金區間，庫存與資金運用健康穩健。',
    };

    if (turnoverDays > 60) {
      turnoverHealth = {
        rating: '⚠️ 庫存偏高',
        color: 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700',
        desc: '週轉天數逾 60 天，建議針對零碼與多量庫存鞋款進行促銷出清。',
      };
    } else if (turnoverDays < 25) {
      turnoverHealth = {
        rating: '🚀 週轉極速',
        color: 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700',
        desc: '熱賣週轉迅速，請特別留意黃金尺碼（US 8~10）及時補貨以防錯失商機。',
      };
    }

    // Brand ranking sorted descending
    const brandRanking = Object.entries(brandPairsMap)
      .map(([brand, pairs]) => ({
        brand,
        pairs,
        percentage: totalPairs > 0 ? ((pairs / totalPairs) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.pairs - a.pairs);

    // Size distribution sorted by US size
    const sizeDistribution = STANDARD_SIZES.map((s) => ({
      sizeUS: s.sizeUS,
      sizeEU: s.sizeEU,
      pairs: sizePairsMap[s.sizeUS] || 0,
    }));

    return {
      totalProducts: products.length,
      totalVariants,
      totalPairs,
      totalRetailValue,
      totalCostValue,
      potentialGrossProfit,
      grossMarginPercent,
      outOfStockCount,
      warningCount,
      sufficientCount,
      turnoverDays,
      turnoverHealth,
      estimatedDailyVelocity,
      brandRanking,
      sizeDistribution,
    };
  }, [products]);

  // SVG Pie/Donut Chart Calculation (Radius = 75, Circumference = 2 * PI * 75 ≈ 471.24)
  const pieData = useMemo(() => {
    const total = Math.max(1, metrics.totalVariants);
    const pctOut = (metrics.outOfStockCount / total) * 100;
    const pctWarn = (metrics.warningCount / total) * 100;
    const pctSuff = (metrics.sufficientCount / total) * 100;

    const C = 2 * Math.PI * 75; // 471.24
    const strokeOut = (pctOut / 100) * C;
    const strokeWarn = (pctWarn / 100) * C;
    const strokeSuff = (pctSuff / 100) * C;

    const offsetOut = 0;
    const offsetWarn = -strokeOut;
    const offsetSuff = -(strokeOut + strokeWarn);

    return {
      C,
      pctOut: pctOut.toFixed(1),
      pctWarn: pctWarn.toFixed(1),
      pctSuff: pctSuff.toFixed(1),
      strokeOut,
      strokeWarn,
      strokeSuff,
      offsetOut,
      offsetWarn,
      offsetSuff,
    };
  }, [metrics.outOfStockCount, metrics.warningCount, metrics.sufficientCount, metrics.totalVariants]);

  // Brand bar chart palette
  const brandColors = [
    'from-indigo-500 to-indigo-600',
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-amber-500 to-amber-600',
    'from-purple-500 to-purple-600',
    'from-rose-500 to-rose-600',
    'from-teal-500 to-teal-600',
    'from-orange-500 to-orange-600',
    'from-slate-500 to-slate-600',
  ];

  return (
    <div className="space-y-6">
      {/* Big Senior-Friendly Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
              門市庫存健康度與週轉動態指標
            </h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              長輩專用超大圖表視圖 &bull; 即時統計全店 {metrics.totalProducts} 款球鞋、共 {metrics.totalPairs} 雙庫存
            </p>
          </div>
        </div>
      </div>

      {/* 4 Big Asset & Volume KPI Cards (Senior Readable) */}
      <div className={`grid gap-3 sm:gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        {/* Total Stock Volume */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs sm:text-base font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">📦 在庫總雙數</span>
            <PackageCheck className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight whitespace-nowrap">
            {metrics.totalPairs.toLocaleString()} <span className="text-sm sm:text-base font-black text-slate-400">雙</span>
          </div>
          <div className="text-[11px] sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-1.5 truncate">
            涵蓋 {metrics.totalProducts} 款主流鞋款
          </div>
        </div>

        {/* Total Retail Value */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs sm:text-base font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">💰 零售總市值</span>
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight whitespace-nowrap">
            {formatCurrency(metrics.totalRetailValue)}
          </div>
          <div className="text-[11px] sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-1.5 flex items-center gap-1 truncate">
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">定價總體資產估值</span>
          </div>
        </div>

        {/* Total Cost Value */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs sm:text-base font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">🏷️ 進貨總成本</span>
            <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight whitespace-nowrap">
            {formatCurrency(metrics.totalCostValue)}
          </div>
          <div className="text-[11px] sm:text-sm font-bold text-slate-400 mt-1.5 truncate">
            全店進貨壓貨總成本
          </div>
        </div>

        {/* Potential Gross Margin */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs sm:text-base font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">📈 預估綜合毛利率</span>
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight whitespace-nowrap">
            {metrics.grossMarginPercent}%
          </div>
          <div className="text-[11px] sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 mt-1.5 truncate">
            預計毛利 {formatCurrency(metrics.potentialGrossProfit)}
          </div>
        </div>
      </div>

      {/* CHART 1: 圓餅圖（全店庫存健康狀態圓餅圖） */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600">
              <PieChartIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white">
                📊 全店庫存健康狀態 — 圓餅佔比圖
              </h4>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                點擊右側卡片可直接切換熱圖篩選對應款式
              </p>
            </div>
          </div>
          <span className="text-sm font-black px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            全店總碼位：{metrics.totalVariants} 個
          </span>
        </div>

        {/* Donut Chart & Large Interactive Legend Grid */}
        <div className={`grid gap-6 sm:gap-8 items-center ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
          {/* SVG Pie / Donut Visual */}
          <div className={`${isMobile ? 'w-full' : 'lg:col-span-5'} flex flex-col items-center justify-center p-2 sm:p-4`}>
            <div className="relative w-56 h-56 sm:w-72 sm:h-72">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                {/* Background Ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="28"
                  fill="none"
                />
                {/* Out of stock segment (Red) */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  stroke="#EF4444"
                  strokeWidth="28"
                  fill="none"
                  strokeDasharray={`${pieData.strokeOut} ${pieData.C}`}
                  strokeDashoffset={pieData.offsetOut}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
                {/* Warning / Sufficient (1~2 pairs) segment (Amber) */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  stroke="#F59E0B"
                  strokeWidth="28"
                  fill="none"
                  strokeDasharray={`${pieData.strokeWarn} ${pieData.C}`}
                  strokeDashoffset={pieData.offsetWarn}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
                {/* Sufficient / Overflow (3+ pairs) segment (Emerald) */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  stroke="#10B981"
                  strokeWidth="28"
                  fill="none"
                  strokeDasharray={`${pieData.strokeSuff} ${pieData.C}`}
                  strokeDashoffset={pieData.offsetSuff}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Donut Hub (Senior Clear Display) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs sm:text-sm font-black text-slate-400">總在庫碼位</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
                  {metrics.totalVariants} <span className="text-sm font-bold">碼</span>
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  共 {metrics.totalPairs} 雙
                </span>
              </div>
            </div>
          </div>

          {/* Large Interactive Legend Cards (Elder-friendly) */}
          <div className={`${isMobile ? 'w-full' : 'lg:col-span-7'} flex flex-col gap-3.5`}>
            {/* 1. Out of Stock Card (Red) */}
            <div
              onClick={() => onSelectStatusFilter?.('out')}
              className="p-4 sm:p-5 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 hover:border-red-500 shadow-sm cursor-pointer transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/30">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-base sm:text-lg font-black text-red-900 dark:text-red-100">
                      🔴 0 雙 (缺貨)
                    </h5>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200">
                      需叫貨
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-red-700 dark:text-red-300 mt-0.5">
                    佔比 {pieData.pctOut}% &bull; 客人試穿極易缺碼流失
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
                  <span data-testid="out-of-stock-count">{metrics.outOfStockCount}</span>
                  <span className="text-xs font-bold ml-1">個尺碼</span>
                </div>
              </div>
            </div>

            {/* 2. Warning / 充足 Card (Amber) */}
            <div
              onClick={() => onSelectStatusFilter?.('warning')}
              className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 hover:border-amber-500 shadow-sm cursor-pointer transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-100">
                      🟡 1~2 雙
                    </h5>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                      可試穿
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                    佔比 {pieData.pctWarn}% &bull; 存量可售，建議留意補貨節奏
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                  <span data-testid="warning-count">{metrics.warningCount}</span>
                  <span className="text-xs font-bold ml-1">個尺碼</span>
                </div>
              </div>
            </div>

            {/* 3. Sufficient / 爆量 Card (Emerald) */}
            <div
              onClick={() => onSelectStatusFilter?.('sufficient')}
              className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 shadow-sm cursor-pointer transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-base sm:text-lg font-black text-emerald-900 dark:text-emerald-100">
                      🟢 3 雙以上
                    </h5>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      充足
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                    佔比 {pieData.pctSuff}% &bull; 備貨充足，門市可全力主推
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  <span data-testid="sufficient-count">{metrics.sufficientCount}</span>
                  <span className="text-xs font-bold ml-1">個尺碼</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHART 2: 柱狀圖（各運動品牌庫存排行大長條圖） */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white">
                📊 各品牌在庫雙數排行榜 — 大長條柱狀圖
              </h4>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                一眼掌握店內哪家品牌鞋款壓貨最多、佔比最高
              </p>
            </div>
          </div>
          <span className="text-sm font-black px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
            共 {metrics.brandRanking.length} 個品牌
          </span>
        </div>

        {/* Big Horizontal Bars for Each Brand */}
        <div className="space-y-4">
          {metrics.brandRanking.map((item, idx) => {
            const maxPairs = metrics.brandRanking[0]?.pairs || 1;
            const barWidthPercent = Math.max(8, (item.pairs / maxPairs) * 100);
            const gradientClass = brandColors[idx % brandColors.length];

            return (
              <div key={item.brand} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm sm:text-base font-black">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-center font-mono">
                      #{idx + 1}
                    </span>
                    <span className="text-slate-900 dark:text-white text-base font-black">
                      {item.brand}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono text-base sm:text-lg font-black">
                      {item.pairs} 雙
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>

                {/* Big Thick Progress Bar */}
                <div className="h-6 sm:h-7 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden p-1 flex items-center">
                  <div
                    className={`h-full rounded-lg bg-gradient-to-r ${gradientClass} transition-all duration-700 flex items-center justify-end pr-2 text-[10px] text-white font-bold shadow-xs`}
                    style={{ width: `${barWidthPercent}%` }}
                  >
                    {barWidthPercent > 20 && `${item.percentage}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHART 3: 柱狀圖（全店 13 尺碼庫存垂直分佈圖） */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-slate-800 text-emerald-600">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white">
                👟 13 尺碼庫存分佈柱狀圖 (US 6.0 ~ 12.0)
              </h4>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                ⭐ 標記為黃金熱門銷售尺碼區間 (US 8.0 ~ 10.0)
              </p>
            </div>
          </div>
        </div>

        {/* Vertical Bars Container */}
        <div className="overflow-x-auto pb-2 -mx-2 px-2">
          <div
            className="grid grid-cols-13 gap-1.5 sm:gap-3 items-end pt-8 pb-3 min-h-[220px] min-w-[540px] sm:min-w-0"
            style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
          >
            {metrics.sizeDistribution.map((item) => {
              const maxSizePairs = Math.max(1, ...metrics.sizeDistribution.map((d) => d.pairs));
              const heightPercent = Math.max(12, Math.round((item.pairs / maxSizePairs) * 100));
              const isGoldenSize = item.sizeUS >= 8.0 && item.sizeUS <= 10.0;

              return (
                <div key={item.sizeUS} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  {/* Bar Value Tooltip / Label */}
                  <span className={`text-[10px] sm:text-xs font-mono font-black ${isGoldenSize ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'}`}>
                    {item.pairs}
                  </span>

                  {/* Vertical Bar */}
                  <div className="w-full max-w-[36px] bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden flex flex-col justify-end p-0.5 h-36">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-700 ${
                        isGoldenSize
                          ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-sm'
                          : 'bg-gradient-to-t from-slate-400 to-slate-300 dark:from-slate-600 dark:to-slate-500'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                  </div>

                  {/* X Axis Label */}
                  <div className="text-center">
                    <span className={`text-xs font-mono font-black block ${isGoldenSize ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                      {item.sizeUS.toFixed(1)}
                    </span>
                    {isGoldenSize && (
                      <span className="text-[10px] text-amber-500 font-black block leading-none">★熱</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Turnover Days Analysis Gauge (Required for Playwright E2E verification) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-950 dark:text-white">
                全店預估週轉天數分析 (Inventory Turnover Gauge)
              </h4>
              <p className="text-xs sm:text-sm font-bold text-slate-500">
                即時推估資金流動速度與平均去庫存週期
              </p>
            </div>
          </div>
          <span className={`text-sm font-black px-3.5 py-1.5 rounded-xl border-2 ${metrics.turnoverHealth.color}`}>
            {metrics.turnoverHealth.rating}
          </span>
        </div>

        {/* Visual Meter Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-base font-black text-slate-800 dark:text-slate-200">
            <span>
              預估庫存週轉：<strong className="text-indigo-600 dark:text-indigo-400 text-xl font-mono font-black">{metrics.turnoverDays} 天</strong>
            </span>
            <span className="text-slate-500 text-sm font-bold">日均預估銷速：約 {metrics.estimatedDailyVelocity} 雙 / 日</span>
          </div>

          <div className="relative h-6 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex p-0.5">
            {/* 0-30 Days zone (Fast moving) */}
            <div className="w-[33%] bg-emerald-500/80 rounded-l-lg border-r-2 border-white dark:border-slate-900 flex items-center justify-center text-[11px] text-white font-black" title="0~30 天：極速週轉">
              0~30天 極速
            </div>
            {/* 30-60 Days zone (Healthy) */}
            <div className="w-[33%] bg-indigo-500/80 border-r-2 border-white dark:border-slate-900 flex items-center justify-center text-[11px] text-white font-black" title="30~60 天：健康穩定">
              30~60天 健康
            </div>
            {/* 60+ Days zone (Slow) */}
            <div className="w-[34%] bg-amber-500/80 rounded-r-lg flex items-center justify-center text-[11px] text-white font-black" title="60 天以上：偏高滯銷">
              60天+ 偏高
            </div>

            {/* Current Position Needle / Indicator */}
            <div
              className="absolute top-0 bottom-0 w-3 bg-slate-950 dark:bg-white rounded-full shadow-lg -translate-x-1/2 border-2 border-white"
              style={{
                left: `${Math.min(96, Math.max(4, (metrics.turnoverDays / 90) * 100))}%`,
              }}
            ></div>
          </div>

          <div className="flex justify-between text-xs text-slate-400 font-mono font-bold">
            <span>0天 (極速)</span>
            <span>30天 (健康目標)</span>
            <span>60天 (注意)</span>
            <span>90天+ (滯銷)</span>
          </div>
        </div>

        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl">
          💡 營運建議：{metrics.turnoverHealth.desc}
        </p>
      </div>
    </div>
  );
};
