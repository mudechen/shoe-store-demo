// Excel Matrix Import / Export Types

import { Product, ShoeVariant, ProcurementType } from './inventory';

export interface ExcelMatrixRow {
  sku: string;
  brand: string;
  name: string;
  color?: string;
  category?: string;
  retailPrice: number;
  costPrice?: number;
  displayLocation?: string;
  storageLocation?: string;
  barcode?: string;
  procurementType?: ProcurementType;
  sizes: Record<number, number>; // sizeUS -> stock quantity
}

export interface ValidationError {
  row: number;         // 1-indexed Excel row (row 1 is header, data starts row 2)
  column: string;      // e.g. "US 8.5" or "建議售價"
  field: string;       // normalized field key
  value: unknown;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportPreviewRow {
  rowNumber: number;
  isValid: boolean;
  data: Partial<ExcelMatrixRow>;
  errors: ValidationError[];
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  validCount: number;
  errorCount: number;
  previewRows: ImportPreviewRow[];
  parsedProducts: Array<{
    product: Product;
    variants: ShoeVariant[];
  }>;
  errors: ValidationError[];
}
