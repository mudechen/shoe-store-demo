// Spatial Positioning Types for Storefront Zones and Backroom Racks

export type ZoneType = 'storefront' | 'backroom';

export interface ShelfCoordinate {
  zone: string;        // 'A' | 'B' | 'C' | 'D' | 'R1' | 'R2' | 'R3' | 'R4'
  shelfOrCol: number;  // shelf number (1-3) or column (1-6)
  layer: number;       // layer 1-4 for storefront, 1-5 for backroom
  code: string;        // e.g. "A-01-L2" or "R1-C03-L2"
}

export interface ShelfLocation {
  id: string;
  code: string;               // e.g. "A-01-L2", "R1-C03-L2"
  zoneType: ZoneType;         // 'storefront' | 'backroom'
  zoneName: string;           // e.g. "A區 品牌主打熱銷牆" or "後倉排架 R1"
  layer: number;              // 1-indexed
  column?: number;            // 1-indexed for backroom
  maxCapacity: number;        // e.g. 12
  currentCount?: number;
  description: string;
}

export interface ShelfSlotDetail {
  code: string;
  zoneType: ZoneType;
  title: string;
  description: string;
  items: Array<{
    productId: string;
    sku: string;
    productName: string;
    color: string;
    sizeUS: number;
    stock: number;
  }>;
}
