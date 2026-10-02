import React from 'react';
import { Search, FileSpreadsheet, Download, RefreshCw, Layers } from 'lucide-react';
import { SizeUnit, SizeSegment } from '../../types/inventory';
import { SEGMENTS } from '../../data/sizeStandards';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedBrand: string;
  onBrandChange: (brand: string) => void;
  activeUnit: SizeUnit;
  onUnitChange: (unit: SizeUnit) => void;
  activeSegment?: SizeSegment;
  onSegmentChange?: (segment: SizeSegment) => void;
  stockFilter: 'all' | 'out' | 'warning' | 'sufficient';
  onStockFilterChange: (filter: 'all' | 'out' | 'warning' | 'sufficient') => void;
  stats: {
    totalProducts: number;
    totalPairs: number;
    outOfStockVariants: number;
    warningVariants: number;
    sufficientVariants: number;
  };
  onOpenImport: () => void;
  onExport: () => void;
  onDownloadTemplate: () => void;
  onResetData: () => void;
}

const BRANDS = [
  'All',
  'Nike',
  'New Balance',
  'Adidas',
  'Jordan',
  'ASICS',
  'Puma',
  'Converse',
  'Salomon',
  'Vans',
];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedBrand,
  onBrandChange,
  activeUnit,
  onUnitChange,
  activeSegment = 'all',
  onSegmentChange,
  stockFilter,
  onStockFilterChange,
  stats,
  onOpenImport,
  onExport,
  onDownloadTemplate,
  onResetData,
}) => {
  return (
    <div className="space-y-3 mb-4">
      {/* 1. Spotlight Search Input */}
      <div className="relative w-full">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          data-testid="search-input"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="🔍 大字快搜：輸入鞋名 (如 AF1, Samba)、貨號 (如 DD1391) 或顏色..."
          className="w-full pl-12 pr-12 py-3 text-sm sm:text-base font-bold rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500 shadow-xs transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
          >
            ✕ 清除
          </button>
        )}
      </div>

      {/* 2. Horizontal Smooth Scrolling Brand Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar select-none">
        {BRANDS.map((brand) => {
          const isSelected = selectedBrand.toLowerCase() === brand.toLowerCase();
          return (
            <button
              key={brand}
              data-testid={`brand-filter-${brand.toLowerCase() === 'all' ? 'all' : brand}`}
              onClick={() => onBrandChange(brand)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition cursor-pointer border-2 active:scale-95 shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {brand === 'All' ? '全部品牌' : brand}
            </button>
          );
        })}
      </div>

      {/* 3. Horizontal Stock Status Badges Reel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar select-none">
        {/* Total stats */}
        <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-bold border border-slate-200/80 dark:border-slate-700 whitespace-nowrap shrink-0">
          總計 <strong className="text-slate-950 dark:text-white font-black">{stats.totalProducts}</strong> 款 /{' '}
          <strong className="text-slate-950 dark:text-white font-black">{stats.totalPairs}</strong> 雙
        </div>

        {/* Out of Stock filter */}
        <button
          onClick={() => onStockFilterChange(stockFilter === 'out' ? 'all' : 'out')}
          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer border-2 whitespace-nowrap shrink-0 active:scale-95 ${
            stockFilter === 'out'
              ? 'bg-red-600 text-white border-red-700 shadow-xs'
              : 'bg-red-50 hover:bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200 border-red-300 dark:border-red-800'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
          <span>0 雙</span>
          <span data-testid="out-of-stock-count" className="font-black text-sm ml-0.5">
            {stats.outOfStockVariants}
          </span>
        </button>

        {/* Warning filter */}
        <button
          onClick={() => onStockFilterChange(stockFilter === 'warning' ? 'all' : 'warning')}
          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer border-2 whitespace-nowrap shrink-0 active:scale-95 ${
            stockFilter === 'warning'
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 border-amber-300 dark:border-amber-800'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
          <span>1~2 雙</span>
          <span data-testid="warning-count" className="font-black text-sm ml-0.5">
            {stats.warningVariants}
          </span>
        </button>

        {/* Sufficient filter */}
        <button
          onClick={() => onStockFilterChange(stockFilter === 'sufficient' ? 'all' : 'sufficient')}
          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer border-2 whitespace-nowrap shrink-0 active:scale-95 ${
            stockFilter === 'sufficient'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
          <span>3 雙以上</span>
          <span data-testid="sufficient-count" className="font-black text-sm ml-0.5">
            {stats.sufficientVariants}
          </span>
        </button>
      </div>

      {/* 4. Compact Action Toolbar: Segment & Size Unit Switcher & Excel Actions */}
      <div className="flex flex-col gap-2.5 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Row A: Segment Pills & Unit Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Segment Selector */}
          {onSegmentChange && (
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
              <span className="text-xs font-black text-slate-400 shrink-0">族群分段:</span>
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black border border-slate-200 dark:border-slate-700">
                {SEGMENTS.map((seg) => (
                  <button
                    key={seg.key}
                    data-testid={`segment-filter-${seg.key}`}
                    onClick={() => onSegmentChange(seg.key)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-black ${
                      activeSegment === seg.key
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200 dark:border-slate-600'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Unit Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5">
            <span className="text-xs font-black text-slate-400 shrink-0">尺寸單位:</span>
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black border border-slate-200 dark:border-slate-700">
              {(['US', 'EU', 'CM', 'ALPHA'] as SizeUnit[]).map((unit) => (
                <button
                  key={unit}
                  data-testid={`size-unit-toggle-${unit}`}
                  data-unit={unit}
                  onClick={() => onUnitChange(unit)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-black ${
                    activeUnit === unit
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {unit === 'ALPHA' ? 'XS~2XL' : unit}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Excel & Maintenance Actions */}
        <div className="flex items-center gap-1.5 flex-wrap sm:ml-auto justify-end">
          <span data-testid="btn-open-import">
            <button
              data-testid="btn-import-excel"
              onClick={onOpenImport}
              className="px-3 py-1.5 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 whitespace-nowrap"
              title="匯入 Excel 橫向尺碼矩陣"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>匯入 Excel</span>
            </button>
          </span>

          <button
            data-testid="btn-export-excel"
            onClick={onExport}
            className="px-3 py-1.5 text-xs font-black rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95 whitespace-nowrap"
            title="匯出目前庫存 Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出</span>
          </button>

          <button
            onClick={onDownloadTemplate}
            className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95 whitespace-nowrap"
            title="下載標準空白範本"
          >
            <Layers className="w-3.5 h-3.5 inline mr-1" />
            <span>範本</span>
          </button>

          <button
            onClick={onResetData}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95"
            title="重設為 24 款擬真預設資料"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
