import React, { useMemo, useState, useEffect } from 'react';
import { ProductWithVariants } from '../../types/inventory';
import { BACKROOM_RACKS, parseLocationCode } from '../../data/storeLayout';
import { ShelfSlot } from './ShelfSlot';
import { Warehouse } from 'lucide-react';

interface BackroomMapProps {
  products: ProductWithVariants[];
  highlightedLocationCode?: string | null;
  onSelectShelf: (locationCode: string) => void;
}

export const BackroomMap: React.FC<BackroomMapProps> = ({
  products,
  highlightedLocationCode,
  onSelectShelf,
}) => {
  // Active rack filter tab ('ALL' or 'R1', 'R2', 'R3', 'R4')
  const [activeRackId, setActiveRackId] = useState<string>('ALL');

  // If a location is highlighted (e.g., R2-C02-L2), switch to that rack or ALL so it is visible
  useEffect(() => {
    if (highlightedLocationCode && highlightedLocationCode.startsWith('R')) {
      const parsed = parseLocationCode(highlightedLocationCode);
      if (parsed && parsed.isBackroom) {
        // If current rack filter is a specific different rack, expand to that rack or ALL
        if (activeRackId !== 'ALL' && activeRackId !== parsed.zone) {
          setActiveRackId(parsed.zone);
        }
      }
    }
  }, [highlightedLocationCode, activeRackId]);

  // Map of storage location -> products
  const storageLocationMap = useMemo(() => {
    const map = new Map<string, ProductWithVariants[]>();
    products.forEach((prod) => {
      const loc = prod.storageLocation.toUpperCase();
      const existing = map.get(loc) || [];
      existing.push(prod);
      map.set(loc, existing);
    });
    return map;
  }, [products]);

  // Compute total pairs in backroom
  const totalBackroomPairs = useMemo(() => {
    let total = 0;
    products.forEach((p) => {
      total += p.variants.reduce((sum, v) => sum + v.stock, 0);
    });
    return total;
  }, [products]);

  // Filter racks based on active filter
  const visibleRacks = useMemo(() => {
    if (activeRackId === 'ALL') return BACKROOM_RACKS;
    return BACKROOM_RACKS.filter((r) => r.id === activeRackId);
  }, [activeRackId]);

  return (
    <div
      data-testid="backroom-map"
      className="space-y-6 w-full max-w-full overflow-hidden"
    >
      {/* Backroom Top Banner */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              後倉重型排架立體儲放地圖 (Racks R1 ~ R4)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 font-semibold">
              4 大排架 &bull; 共 120 格位
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>後倉在庫總量: <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">{totalBackroomPairs}</strong> 雙</span>
          </div>
        </div>

        {/* Rack Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveRackId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeRackId === 'ALL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
            }`}
          >
            全部排架 (R1 ~ R4 總覽)
          </button>

          {BACKROOM_RACKS.map((rack) => (
            <button
              key={rack.id}
              type="button"
              onClick={() => setActiveRackId(rack.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeRackId === rack.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
              }`}
            >
              <span className="font-mono font-black">{rack.id}</span>
              <span className="text-[11px] font-normal opacity-90">{rack.name.split(' ')[2] || rack.name}</span>
            </button>
          ))}
        </div>

        {/* Racks Display List */}
        <div className="space-y-6">
          {visibleRacks.map((rack) => {
            // Layers: L5 down to L1
            const layers = Array.from({ length: rack.layers }, (_, i) => rack.layers - i);
            // Columns: C01 to C06
            const cols = Array.from({ length: rack.columns }, (_, i) => i + 1);

            return (
              <div
                key={rack.id}
                id={`backroom-rack-${rack.id}`}
                className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs"
              >
                {/* Rack Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black font-mono text-sm flex items-center justify-center shadow-xs">
                      {rack.id}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {rack.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        標準五層六欄倉儲排架 &bull; 每格設計最大容量 15 雙鞋盒
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    6 欄 &times; 5 層 = 30 格位
                  </div>
                </div>

                {/* Grid with 6 columns x 5 layers */}
                <div className="overflow-x-auto custom-scrollbar">
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `auto repeat(${rack.columns}, minmax(120px, 1fr))`,
                    }}
                  >
                    {/* Top Row: Column Labels */}
                    <div className="text-[10px] text-slate-400 font-mono text-center flex items-center justify-center">
                      層架
                    </div>
                    {cols.map((c) => (
                      <div
                        key={`header-${rack.id}-C${c}`}
                        className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 text-center py-1 bg-slate-50 dark:bg-slate-800/60 rounded"
                      >
                        C{String(c).padStart(2, '0')} 欄
                      </div>
                    ))}

                    {/* Layers from L5 down to L1 */}
                    {layers.map((layer) => (
                      <React.Fragment key={`row-${rack.id}-L${layer}`}>
                        {/* Layer Indicator Axis */}
                        <div className="flex flex-col items-center justify-center px-1.5 py-1 bg-slate-100/70 dark:bg-slate-800/40 rounded text-center">
                          <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                            L{layer}
                          </span>
                          <span className="text-[9px] text-slate-400 font-sans">
                            {layer === 5 ? '頂層' : layer === 1 ? '底層' : '中層'}
                          </span>
                        </div>

                        {/* 6 Column Slots */}
                        {cols.map((col) => {
                          const colStr = String(col).padStart(2, '0');
                          const locationCode = `${rack.id}-C${colStr}-L${layer}`;
                          const slotShoes = storageLocationMap.get(locationCode) || [];
                          const isSelected =
                            Boolean(highlightedLocationCode) &&
                            highlightedLocationCode?.toUpperCase() === locationCode.toUpperCase();

                          return (
                            <ShelfSlot
                              key={locationCode}
                              locationCode={locationCode}
                              zoneType="backroom"
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
          })}
        </div>
      </div>
    </div>
  );
};
