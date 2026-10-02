import React, { useMemo } from 'react';
import { ProductWithVariants } from '../../types/inventory';
import { STOREFRONT_ZONES, StorefrontZoneConfig } from '../../data/storeLayout';
import { ShelfSlot } from './ShelfSlot';
import { Store, Compass } from 'lucide-react';

interface StorefrontMapProps {
  products: ProductWithVariants[];
  highlightedLocationCode?: string | null;
  onSelectShelf: (locationCode: string) => void;
}

export const StorefrontMap: React.FC<StorefrontMapProps> = ({
  products,
  highlightedLocationCode,
  onSelectShelf,
}) => {
  // Map of display location -> products
  const displayLocationMap = useMemo(() => {
    const map = new Map<string, ProductWithVariants[]>();
    products.forEach((prod) => {
      const loc = prod.displayLocation.toUpperCase();
      const existing = map.get(loc) || [];
      existing.push(prod);
      map.set(loc, existing);
    });
    return map;
  }, [products]);

  // Render a single Storefront Zone Card
  const renderZone = (zone: StorefrontZoneConfig) => {
    // We render layers from top to bottom (e.g. L4 down to L1)
    const layerNumbers = Array.from({ length: zone.layers }, (_, i) => zone.layers - i);
    const colNumbers = Array.from({ length: zone.columns }, (_, i) => i + 1);

    return (
      <div
        key={zone.code}
        className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col"
      >
        {/* Zone Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              {zone.code}
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {zone.name}
              </h4>
              <p className="text-[11px] text-slate-400">
                {zone.description}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {zone.columns} 排 &times; {zone.layers} 層 ({zone.columns * zone.layers} 格)
            </span>
          </div>
        </div>

        {/* Rack Grid with Layer Markings */}
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `auto repeat(${zone.columns}, minmax(130px, 1fr))`,
            }}
          >
            {/* Top row: Column labels */}
            <div className="text-[10px] text-slate-400 font-mono text-center flex items-center justify-center">
              層級
            </div>
            {colNumbers.map((c) => (
              <div
                key={`header-${zone.code}-${c}`}
                className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 text-center py-1 bg-slate-50 dark:bg-slate-800/60 rounded"
              >
                第 {String(c).padStart(2, '0')} 排架
              </div>
            ))}

            {/* Grid rows by layer (top layer first) */}
            {layerNumbers.map((layer) => (
              <React.Fragment key={`row-${zone.code}-L${layer}`}>
                {/* Layer indicator on left axis */}
                <div className="flex flex-col items-center justify-center px-1.5 py-1 bg-slate-100/70 dark:bg-slate-800/40 rounded text-center">
                  <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                    L{layer}
                  </span>
                  <span className="text-[9px] text-slate-400 font-sans">
                    {layer === zone.layers ? '頂層' : layer === 1 ? '底層' : '中層'}
                  </span>
                </div>

                {/* Slots across columns for this layer */}
                {colNumbers.map((col) => {
                  const colStr = String(col).padStart(2, '0');
                  const locationCode = `${zone.code}-${colStr}-L${layer}`;
                  const slotShoes = displayLocationMap.get(locationCode) || [];
                  const isSelected =
                    Boolean(highlightedLocationCode) &&
                    highlightedLocationCode?.toUpperCase() === locationCode.toUpperCase();

                  return (
                    <ShelfSlot
                      key={locationCode}
                      locationCode={locationCode}
                      zoneType="storefront"
                      layer={layer}
                      column={col}
                      shoes={slotShoes}
                      isSelected={isSelected}
                      onClick={onSelectShelf}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const zoneA = STOREFRONT_ZONES.find((z) => z.code === 'A')!;
  const zoneB = STOREFRONT_ZONES.find((z) => z.code === 'B')!;
  const zoneC = STOREFRONT_ZONES.find((z) => z.code === 'C')!;
  const zoneD = STOREFRONT_ZONES.find((z) => z.code === 'D')!;

  return (
    <div
      data-testid="storefront-map"
      className="space-y-6 w-full max-w-full overflow-hidden"
    >
      {/* Store Architectural Floorplan Frame */}
      <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 sm:p-6 overflow-hidden">
        {/* Ambient Top Orientation Marker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              門市實體展架空間配置圖 (Zones A ~ D)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-semibold">
              共 36 格陳列架位
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              <span>依門市實際格局縱覽</span>
            </span>
          </div>
        </div>

        {/* Store Floorplan Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Wing: Zone C (Streetwear / Lifestyle Hot Wall) */}
          <div className="lg:col-span-6 space-y-6">
            {renderZone(zoneC)}
            {/* Zone D: Clearance / Fitting section */}
            {renderZone(zoneD)}
          </div>

          {/* Right Wing: Zone B (Center Running Island) & Zone A (Main Entry Wall) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Zone A: Entrance Hot Wall */}
            {renderZone(zoneA)}
            {/* Zone B: Center Running Island */}
            {renderZone(zoneB)}
          </div>
        </div>

        {/* Store Entrance / Cashier Visual Indicator Bar */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              🚪 門市主出入口 &amp; 迎賓走道（下方進入）
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>[櫃台收銀大螢幕系統]</span>
            <span>[顧客試穿舒適椅區]</span>
          </div>
        </div>
      </div>
    </div>
  );
};
