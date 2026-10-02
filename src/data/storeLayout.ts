import { ShelfLocation } from '../types/spatial';

export interface StorefrontZoneConfig {
  code: 'A' | 'B' | 'C' | 'D';
  name: string;
  columns: number;
  layers: number;
  description: string;
}

export const STOREFRONT_ZONES: StorefrontZoneConfig[] = [
  { code: 'A', name: '品牌主打熱銷牆', columns: 3, layers: 4, description: '門市入口右側主打展架' },
  { code: 'B', name: '機能慢跑中島', columns: 2, layers: 3, description: '中央中島慢跑鞋展區' },
  { code: 'C', name: '街頭潮流展示牆', columns: 3, layers: 4, description: '門市左側潮流生活鞋牆' },
  { code: 'D', name: '特價出清架', columns: 2, layers: 3, description: '試穿區旁精選折扣架' },
];

export const BACKROOM_RACKS = [
  { id: 'R1', name: '後倉排架 1 (Nike / Jordan 專用)', columns: 6, layers: 5 },
  { id: 'R2', name: '後倉排架 2 (New Balance 專用)', columns: 6, layers: 5 },
  { id: 'R3', name: '後倉排架 3 (Adidas 專用)', columns: 6, layers: 5 },
  { id: 'R4', name: '後倉排架 4 (ASICS / Puma / 其它)', columns: 6, layers: 5 },
];

/**
 * Generate all predefined storefront and backroom shelf locations
 */
export function getAllShelfLocations(): ShelfLocation[] {
  const locations: ShelfLocation[] = [];

  // 1. Storefront Zones
  STOREFRONT_ZONES.forEach((zone) => {
    for (let c = 1; c <= zone.columns; c++) {
      const colStr = String(c).padStart(2, '0');
      for (let l = 1; l <= zone.layers; l++) {
        const code = `${zone.code}-${colStr}-L${l}`;
        locations.push({
          id: `loc-sf-${code}`,
          code,
          zoneType: 'storefront',
          zoneName: `Zone ${zone.code}: ${zone.name}`,
          layer: l,
          column: c,
          maxCapacity: 6,
          description: `${zone.name} 第 ${c} 排 第 ${l} 層`,
        });
      }
    }
  });

  // 2. Backroom Racks
  BACKROOM_RACKS.forEach((rack) => {
    for (let c = 1; c <= rack.columns; c++) {
      const colStr = String(c).padStart(2, '0');
      for (let l = 1; l <= rack.layers; l++) {
        const code = `${rack.id}-C${colStr}-L${l}`;
        locations.push({
          id: `loc-br-${code}`,
          code,
          zoneType: 'backroom',
          zoneName: rack.name,
          layer: l,
          column: c,
          maxCapacity: 15,
          description: `${rack.name} 第 ${c} 欄 第 ${l} 層板`,
        });
      }
    }
  });

  return locations;
}

/**
 * Parse location code into constituent components
 * e.g. "A-01-L2" -> { zone: 'A', column: 1, layer: 2, isBackroom: false }
 * e.g. "R1-C03-L2" -> { zone: 'R1', column: 3, layer: 2, isBackroom: true }
 */
export function parseLocationCode(code: string) {
  if (!code) return null;
  const upper = code.trim().toUpperCase();

  // Backroom pattern: R1-C03-L2
  const brMatch = upper.match(/^(R[1-4])-C0?(\d+)-L(\d+)$/);
  if (brMatch) {
    return {
      zone: brMatch[1],
      column: parseInt(brMatch[2], 10),
      layer: parseInt(brMatch[3], 10),
      isBackroom: true,
    };
  }

  // Storefront pattern: A-01-L2
  const sfMatch = upper.match(/^([A-D])-0?(\d+)-L(\d+)$/);
  if (sfMatch) {
    return {
      zone: sfMatch[1],
      column: parseInt(sfMatch[2], 10),
      layer: parseInt(sfMatch[3], 10),
      isBackroom: false,
    };
  }

  return null;
}

/**
 * Get human-readable description for any shelf location code
 */
export function getLocationDescription(code: string): string {
  const parsed = parseLocationCode(code);
  if (!parsed) return code;

  if (parsed.isBackroom) {
    const rack = BACKROOM_RACKS.find((r) => r.id === parsed.zone);
    const rackName = rack ? rack.name : parsed.zone;
    return `${rackName} 第 ${parsed.column} 欄 第 ${parsed.layer} 層板`;
  } else {
    const zone = STOREFRONT_ZONES.find((z) => z.code === parsed.zone);
    const zoneName = zone ? zone.name : `Zone ${parsed.zone}`;
    return `${zoneName} 第 ${parsed.column} 排 第 ${parsed.layer} 層`;
  }
}

