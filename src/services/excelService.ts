import * as XLSX from 'xlsx';
import { Product, ProductWithVariants, ShoeVariant } from '../types/inventory';
import { ImportPreviewRow, ImportResult, ValidationError, ExcelMatrixRow } from '../types/excel';
import { STANDARD_SIZES, formatSaleSizeDisplay } from '../data/sizeStandards';
import { StockInRecord, VendorReturnRecord } from '../types/records';
import { SaleRecord } from '../types/sales';
import { getTaiwanDateStr, getTaiwanDateTimeStr, getTaiwanTodayStr } from '../utils/dateUtils';

interface HeaderMapping {
  colIndex: number;
  headerName: string;
  field: 'sku' | 'brand' | 'name' | 'color' | 'category' | 'retailPrice' | 'costPrice' | 'displayLocation' | 'storageLocation' | 'barcode' | 'procurementType' | 'size';
  sizeUS?: number;
}

/**
 * Standard column headers for export and template
 */
export const EXCEL_COLUMNS = [
  '款號 / SKU',
  '品牌 / Brand',
  '品名 / Product Name',
  '顏色 / Color',
  '類別 / Category',
  '採購模式 / Procurement Type',
  '建議售價 / Retail Price',
  '進貨成本 / Cost Price',
  '門市陳列架位 / Display Shelf',
  '後倉儲存架位 / Storage Rack',
  '條碼 / Barcode',
  ...STANDARD_SIZES.map(s => `US ${s.sizeUS.toFixed(1)}`)
];

/**
 * Identify column header meaning through fuzzy matching
 */
function analyzeHeaders(rawHeaders: string[]): HeaderMapping[] {
  const mappings: HeaderMapping[] = [];

  rawHeaders.forEach((header, index) => {
    if (!header || typeof header !== 'string') return;
    const cleanHeader = header.trim().toLowerCase();

    // Size headers matching: e.g. "us 8.5", "us8.5", "8.5", "us 9", "us 9.0"
    const sizeMatch = cleanHeader.match(/(?:us\s*)?(\d+(?:\.\d+)?)/i);
    let matchedStandardSize: number | undefined;

    if (sizeMatch) {
      const parsedSize = parseFloat(sizeMatch[1]);
      const foundStd = STANDARD_SIZES.find(s => Math.abs(s.sizeUS - parsedSize) < 0.05);
      if (foundStd && (/\bus\b/i.test(cleanHeader) || /^us\d/i.test(cleanHeader) || cleanHeader === foundStd.sizeUS.toFixed(1) || cleanHeader === `${foundStd.sizeUS}`)) {
        matchedStandardSize = foundStd.sizeUS;
      }
    }

    if (matchedStandardSize !== undefined) {
      mappings.push({
        colIndex: index,
        headerName: header.trim(),
        field: 'size',
        sizeUS: matchedStandardSize
      });
      return;
    }

    // Field headers matching
    if (cleanHeader.includes('sku') || cleanHeader.includes('款號') || cleanHeader.includes('貨號')) {
      mappings.push({ colIndex: index, headerName: header.trim(), field: 'sku' });
    } else if (cleanHeader.includes('brand') || cleanHeader.includes('品牌')) {
      mappings.push({ colIndex: index, headerName: header.trim(), field: 'brand' });
    } else if (cleanHeader.includes('品名') || cleanHeader.includes('名稱') || (cleanHeader.includes('name') && !cleanHeader.includes('brand'))) {
      mappings.push({ colIndex: index, headerName: header.trim(), field: 'name' });
    } else if (cleanHeader.includes('color') || cleanHeader.includes('顏色') || cleanHeader.includes('配色')) {
      mappings.push({ colIndex: index, headerName: header.trim(), field: 'color' });
    } else if (cleanHeader.includes('category') || cleanHeader.includes('類別') || cleanHeader.includes('系列')) {
      mappings.push({ colIndex: index, headerName: header.trim(), field: 'category' });
    } else if (cleanHeader.includes('採購') || cleanHeader.includes('買斷') || cleanHeader.includes('寄賣') || cleanHeader.includes('procurement')) {
      mappings.push({ colIndex: index, headerName: header.trim(), field: 'procurementType' });
    } else if (cleanHeader.includes('retail') || cleanHeader.includes('售價') || cleanHeader.includes('定價')) {
      mappings.push({ colIndex: index, headerName: header.trim(), field: 'retailPrice' });
    } else if (cleanHeader.includes('cost') || cleanHeader.includes('成本')) {
      mappings.push({ colIndex: index, headerName: header.trim(), field: 'costPrice' });
    } else if (cleanHeader.includes('display') || cleanHeader.includes('門市') || cleanHeader.includes('陳列')) {
      mappings.push({ colIndex: index, headerName: header.trim(), field: 'displayLocation' });
    } else if (cleanHeader.includes('storage') || cleanHeader.includes('backroom') || cleanHeader.includes('後倉') || cleanHeader.includes('倉庫')) {
      mappings.push({ colIndex: index, headerName: header.trim(), field: 'storageLocation' });
    } else if (cleanHeader.includes('barcode') || cleanHeader.includes('條碼') || cleanHeader.includes('ean') || cleanHeader.includes('upc')) {
      mappings.push({ colIndex: index, headerName: header.trim(), field: 'barcode' });
    }
  });

  return mappings;
}

/**
 * Parse an Excel ArrayBuffer into validated inventory records
 */
export function parseExcelData(data: ArrayBuffer): ImportResult {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return {
      success: false,
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
      previewRows: [],
      parsedProducts: [],
      errors: [{
        row: 1,
        column: 'Sheet',
        field: 'sheet',
        value: '',
        message: '上傳檔案中未發現任何工作表',
        severity: 'error'
      }]
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Array<unknown[]> = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length < 2) {
    return {
      success: false,
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
      previewRows: [],
      parsedProducts: [],
      errors: [{
        row: 1,
        column: 'Table',
        field: 'table',
        value: '',
        message: '未偵測到有效鞋款資料行，請下載標準範本填寫後再試',
        severity: 'error'
      }]
    };
  }

  const headerRow = (rawRows[0] || []).map(h => String(h || ''));
  const headerMappings = analyzeHeaders(headerRow);

  const hasSkuCol = headerMappings.some(m => m.field === 'sku');
  const hasBrandCol = headerMappings.some(m => m.field === 'brand');
  const hasNameCol = headerMappings.some(m => m.field === 'name');

  if (!hasSkuCol || !hasBrandCol || !hasNameCol) {
    const missing: string[] = [];
    if (!hasSkuCol) missing.push('款號(SKU)');
    if (!hasBrandCol) missing.push('品牌(Brand)');
    if (!hasNameCol) missing.push('品名(Product Name)');
    return {
      success: false,
      totalRows: rawRows.length - 1,
      validCount: 0,
      errorCount: rawRows.length - 1,
      previewRows: [],
      parsedProducts: [],
      errors: [{
        row: 1,
        column: 'Header',
        field: 'header',
        value: headerRow.join(', '),
        message: `缺少必要欄位表頭：${missing.join('、')}，請使用標準範本格式。`,
        severity: 'error'
      }]
    };
  }

  const previewRows: ImportPreviewRow[] = [];
  const parsedProducts: Array<{ product: Product; variants: ShoeVariant[] }> = [];
  const allErrors: ValidationError[] = [];

  // Parse each row (1-indexed row number in Excel: header is row 1, data starts row 2)
  for (let r = 1; r < rawRows.length; r++) {
    const rowNum = r + 1;
    const rowValues = rawRows[r];

    // Check if entire row is empty (including whitespace-only rows)
    const isEmpty = !rowValues || rowValues.every(val => String(val ?? '').trim() === '');
    if (isEmpty) continue;

    const rowErrors: ValidationError[] = [];
    const parsedData: Partial<ExcelMatrixRow> = {
      sizes: {}
    };

    // Initialize all standard sizes to 0 default
    STANDARD_SIZES.forEach(s => {
      parsedData.sizes![s.sizeUS] = 0;
    });

    headerMappings.forEach(mapping => {
      const rawVal = rowValues[mapping.colIndex];

      if (mapping.field === 'sku') {
        const valStr = String(rawVal ?? '').trim().toUpperCase();
        if (!valStr) {
          rowErrors.push({
            row: rowNum,
            column: mapping.headerName,
            field: 'sku',
            value: rawVal,
            message: '款號(SKU)為必填欄位，不可為空',
            severity: 'error'
          });
        } else {
          parsedData.sku = valStr;
        }
      } else if (mapping.field === 'brand') {
        const valStr = String(rawVal ?? '').trim();
        if (!valStr) {
          rowErrors.push({
            row: rowNum,
            column: mapping.headerName,
            field: 'brand',
            value: rawVal,
            message: '品牌為必填欄位，不可為空',
            severity: 'error'
          });
        } else {
          parsedData.brand = valStr;
        }
      } else if (mapping.field === 'name') {
        const valStr = String(rawVal ?? '').trim();
        if (!valStr) {
          rowErrors.push({
            row: rowNum,
            column: mapping.headerName,
            field: 'name',
            value: rawVal,
            message: '品名為必填欄位，不可為空',
            severity: 'error'
          });
        } else {
          parsedData.name = valStr;
        }
      } else if (mapping.field === 'color') {
        parsedData.color = String(rawVal ?? '').trim() || '標準配色';
      } else if (mapping.field === 'category') {
        parsedData.category = String(rawVal ?? '').trim() || 'Lifestyle';
      } else if (mapping.field === 'procurementType') {
        const valStr = String(rawVal ?? '').trim();
        parsedData.procurementType = valStr.includes('寄賣') ? '寄賣' : '買斷';
      } else if (mapping.field === 'retailPrice') {
        if (rawVal === '' || rawVal === null || rawVal === undefined) {
          rowErrors.push({
            row: rowNum,
            column: mapping.headerName,
            field: 'retailPrice',
            value: rawVal,
            message: '建議售價不可為空',
            severity: 'error'
          });
        } else {
          const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.-]/g, ''));
          if (isNaN(num) || num <= 0) {
            rowErrors.push({
              row: rowNum,
              column: mapping.headerName,
              field: 'retailPrice',
              value: rawVal,
              message: `售價「${rawVal}」非大於 0 之有效數值`,
              severity: 'error'
            });
          } else {
            parsedData.retailPrice = Math.round(num);
          }
        }
      } else if (mapping.field === 'costPrice') {
        if (rawVal !== '' && rawVal !== null && rawVal !== undefined) {
          const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.-]/g, ''));
          if (isNaN(num) || num < 0) {
            rowErrors.push({
              row: rowNum,
              column: mapping.headerName,
              field: 'costPrice',
              value: rawVal,
              message: `成本價「${rawVal}」不可為負數或非法字串`,
              severity: 'error'
            });
          } else {
            parsedData.costPrice = Math.round(num);
          }
        } else {
          parsedData.costPrice = 0;
        }
      } else if (mapping.field === 'displayLocation') {
        parsedData.displayLocation = String(rawVal ?? '').trim() || 'A-01-L1';
      } else if (mapping.field === 'storageLocation') {
        parsedData.storageLocation = String(rawVal ?? '').trim() || 'R1-C01-L1';
      } else if (mapping.field === 'barcode') {
        parsedData.barcode = String(rawVal ?? '').trim() || '';
      } else if (mapping.field === 'size' && mapping.sizeUS !== undefined) {
        // Size validation
        if (rawVal === '' || rawVal === null || rawVal === undefined) {
          parsedData.sizes![mapping.sizeUS] = 0;
        } else if (typeof rawVal === 'number') {
          if (rawVal < 0 || !Number.isInteger(rawVal)) {
            rowErrors.push({
              row: rowNum,
              column: mapping.headerName,
              field: `size_${mapping.sizeUS}`,
              value: rawVal,
              message: `尺碼數量「${rawVal}」必須為非負整數 (>= 0)`,
              severity: 'error'
            });
          } else {
            parsedData.sizes![mapping.sizeUS] = rawVal;
          }
        } else {
          const strVal = String(rawVal).trim();
          // Check if string is a valid positive integer
          if (/^\d+$/.test(strVal)) {
            parsedData.sizes![mapping.sizeUS] = parseInt(strVal, 10);
          } else {
            rowErrors.push({
              row: rowNum,
              column: mapping.headerName,
              field: `size_${mapping.sizeUS}`,
              value: rawVal,
              message: `尺碼「${mapping.headerName}」填寫值「${strVal}」非合法數字`,
              severity: 'error'
            });
          }
        }
      }
    });

    const isRowValid = rowErrors.length === 0;

    previewRows.push({
      rowNumber: rowNum,
      isValid: isRowValid,
      data: parsedData,
      errors: rowErrors
    });

    if (rowErrors.length > 0) {
      allErrors.push(...rowErrors);
    } else {
      // Build valid Product and ShoeVariants
      const cleanColorSlug = (parsedData.color || 'std').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
      const productId = `prod-imp-${r}-${parsedData.sku}-${cleanColorSlug}`;
      const product: Product = {
        id: productId,
        sku: parsedData.sku!,
        brand: parsedData.brand!,
        name: parsedData.name!,
        color: parsedData.color || '標準款',
        category: parsedData.category || 'Lifestyle',
        retailPrice: parsedData.retailPrice || 3000,
        costPrice: parsedData.costPrice || 0,
        barcode: parsedData.barcode || `EAN${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        displayLocation: parsedData.displayLocation || 'A-01-L1',
        storageLocation: parsedData.storageLocation || 'R1-C01-L1',
        procurementType: parsedData.procurementType || '買斷',
      };

      const variants: ShoeVariant[] = STANDARD_SIZES.map(std => {
        const stock = parsedData.sizes![std.sizeUS] ?? 0;
        return {
          id: `var-${productId}-${std.sizeUS.toFixed(1)}`,
          productId,
          sizeUS: std.sizeUS,
          sizeEU: std.sizeEU,
          sizeCM: std.sizeCM,
          stock
        };
      });

      parsedProducts.push({ product, variants });
    }
  }

  const validCount = previewRows.filter(r => r.isValid).length;
  const errorCount = previewRows.filter(r => !r.isValid).length;

  return {
    success: errorCount === 0 && validCount > 0,
    totalRows: previewRows.length,
    validCount,
    errorCount,
    previewRows,
    parsedProducts,
    errors: allErrors
  };
}

/**
 * Asynchronously parse a File object from input
 */
export async function parseExcelFile(file: File): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  return parseExcelData(arrayBuffer);
}

/**
 * Build standard downloadable workbook with sample pre-filled rows
 */
export function buildTemplateWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const data = [
    EXCEL_COLUMNS,
    // Sample Row 1: Air Force 1
    [
      'FD0655-001',
      'Nike',
      "Air Force 1 '07",
      'Triple White 純白',
      'Lifestyle',
      '買斷',
      3400,
      1900,
      'A-01-L2',
      'R1-C01-L3',
      '196607831001',
      0, 0, 1, 3, 5, 8, 7, 5, 4, 2, 1, 0, 0
    ],
    // Sample Row 2: 9060
    [
      'U9060ECA',
      'New Balance',
      '9060',
      'Sea Salt 海鹽灰',
      'Lifestyle',
      '買斷',
      4880,
      2750,
      'A-03-L2',
      'R2-C01-L3',
      '196432109876',
      3, 4, 4, 3, 3, 2, 2, 0, 4, 3, 2, 1, 0
    ],
    // Sample Row 3: Samba OG
    [
      'B75806',
      'Adidas',
      'Samba OG',
      'Cloud White 白底黑條',
      'Lifestyle',
      '寄賣',
      3490,
      1950,
      'C-02-L2',
      'R3-C01-L3',
      '4059807654321',
      1, 2, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // SKU
    { wch: 15 }, // Brand
    { wch: 25 }, // Name
    { wch: 20 }, // Color
    { wch: 15 }, // Category
    { wch: 16 }, // Procurement Type
    { wch: 14 }, // Retail
    { wch: 14 }, // Cost
    { wch: 16 }, // Display
    { wch: 16 }, // Storage
    { wch: 18 }, // Barcode
    ...STANDARD_SIZES.map(() => ({ wch: 8 }))
  ];

  XLSX.utils.book_append_sheet(wb, ws, '庫存匯入範本');
  return wb;
}

/**
 * Trigger download of standard shoe inventory template
 */
export function downloadTemplateFile(): void {
  const wb = buildTemplateWorkbook();
  XLSX.writeFile(wb, 'shoe_inventory_template.xlsx');
}

/**
 * Export current inventory list to horizontal size matrix Excel file
 */
export function exportInventoryToExcel(products: ProductWithVariants[], filename = 'shoe_store_inventory_export.xlsx'): void {
  const wb = XLSX.utils.book_new();

  const data: Array<Array<string | number>> = [EXCEL_COLUMNS];

  products.forEach(p => {
    const sizeMap = new Map<number, number>();
    p.variants.forEach(v => sizeMap.set(v.sizeUS, v.stock));

    const sizeValues = STANDARD_SIZES.map(s => sizeMap.get(s.sizeUS) ?? 0);

    data.push([
      p.sku,
      p.brand,
      p.name,
      p.color,
      p.category,
      p.procurementType || '買斷',
      p.retailPrice,
      p.costPrice,
      p.displayLocation,
      p.storageLocation,
      p.barcode,
      ...sizeValues
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    ...STANDARD_SIZES.map(() => ({ wch: 8 }))
  ];

  XLSX.utils.book_append_sheet(wb, ws, '實體鞋店庫存矩陣');
  XLSX.writeFile(wb, filename);
}

/**
 * Sanitize cell values against Excel / CSV formula injection (DDE attacks).
 * If a string value starts with '=', '+', '-', or '@', prepend a single quote `'`.
 */
export function sanitizeCell(value: unknown): string | number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value).trim();
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Export unified records (Stock-In, Sales, Vendor Returns) into a 3-sheet Excel workbook
 */
export function exportRecordsToExcel(
  stockIns: StockInRecord[],
  sales: SaleRecord[],
  vendorReturns: VendorReturnRecord[],
  filename?: string
): void {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: 進貨明細紀錄
  // -------------------------------------------------------------
  const stockInHeaders = [
    '單號',
    '日期',
    '廠商',
    '貨號',
    '品名',
    '顏色',
    '採購類型',
    '尺碼分配',
    '進貨雙數',
    '單雙成本',
    '總成本',
    '經手人',
    '版本狀態',
    '備註',
  ];

  const stockInRows = stockIns.map((r) => {
    let sizeAllocationStr = '';
    if (r.sizeBreakdown && typeof r.sizeBreakdown === 'object') {
      sizeAllocationStr = Object.entries(r.sizeBreakdown)
        .filter(([_, q]) => Number(q) > 0)
        .map(([s, q]) => `${s}:${q}雙`)
        .join(', ');
    } else if (Array.isArray(r.sizeDetails)) {
      sizeAllocationStr = r.sizeDetails
        .filter((d) => d.quantity > 0)
        .map((d) => `${d.sizeKey}:${d.quantity}雙`)
        .join(', ');
    }

    const orderId = r.orderId || r.batchNo || r.id;
    const dateStr = r.date ? getTaiwanDateStr(r.date) : (r.timestamp ? getTaiwanDateStr(r.timestamp) : '');

    const versionStatus = r.isSuperseded
      ? '已修訂 (歷史存檔)'
      : r.revisionNo && r.revisionNo > 0
      ? `最新修訂版 (Rev.${r.revisionNo})`
      : '有效原單';

    let notesWithHistory = r.notes || '';
    if (r.isSuperseded) {
      const supStr = '[已修訂存檔 - 請參照最新修訂版]';
      notesWithHistory = notesWithHistory ? `${notesWithHistory} ${supStr}` : supStr;
    } else if (r.originalCostPerPair !== undefined) {
      const historyStr = `[原單雙成本: $${r.originalCostPerPair.toLocaleString()}${r.costModifiedReason ? ` - ${r.costModifiedReason}` : ''}]`;
      notesWithHistory = notesWithHistory ? `${notesWithHistory} ${historyStr}` : historyStr;
    }

    return [
      sanitizeCell(orderId),
      sanitizeCell(dateStr),
      sanitizeCell(r.vendor),
      sanitizeCell(r.sku),
      sanitizeCell(r.productName),
      sanitizeCell(r.color || ''),
      sanitizeCell(r.procurementType || '買斷'),
      sanitizeCell(sizeAllocationStr || '無'),
      typeof r.totalPairs === 'number' ? r.totalPairs : Number(r.totalPairs) || 0,
      typeof r.costPerPair === 'number' ? r.costPerPair : Number(r.costPerPair) || 0,
      typeof r.totalCost === 'number' ? r.totalCost : Number(r.totalCost) || 0,
      sanitizeCell(r.operator || '門市人員'),
      sanitizeCell(versionStatus),
      sanitizeCell(notesWithHistory),
    ];
  });

  const wsStockIn = XLSX.utils.aoa_to_sheet([stockInHeaders, ...stockInRows]);
  wsStockIn['!cols'] = [
    { wch: 20 }, // 單號
    { wch: 14 }, // 日期
    { wch: 16 }, // 廠商
    { wch: 18 }, // 貨號
    { wch: 24 }, // 品名
    { wch: 18 }, // 顏色
    { wch: 14 }, // 採購類型
    { wch: 32 }, // 尺碼分配
    { wch: 12 }, // 進貨雙數
    { wch: 12 }, // 單雙成本
    { wch: 14 }, // 總成本
    { wch: 14 }, // 經手人
    { wch: 18 }, // 版本狀態
    { wch: 30 }, // 備註
  ];
  XLSX.utils.book_append_sheet(wb, wsStockIn, '進貨明細紀錄');

  // -------------------------------------------------------------
  // Sheet 2: 銷貨流水帳明細
  // -------------------------------------------------------------
  const salesHeaders = [
    '單號',
    '交易時間',
    '貨號',
    '品名',
    '顏色',
    '尺碼',
    '售價',
    '實收金額',
    '付款方式',
    '狀態',
    '退貨原因',
    '經手人',
  ];

  const salesRows = sales.map((s) => {
    const timeStr = s.timestamp ? getTaiwanDateTimeStr(s.timestamp) : s.businessDate || '';
    const sizeStr = formatSaleSizeDisplay(s.sizeDisplay, s.sizeUS);
    const payStr =
      s.paymentMethod === 'cash'
        ? '現金'
        : s.paymentMethod === 'credit'
        ? '信用卡'
        : s.paymentMethod === 'mobile_pay'
        ? '行動支付'
        : String(s.paymentMethod || '');
    const statusStr =
      s.status === 'returned'
        ? '已退貨'
        : s.status === 'exchanged'
        ? '已換貨'
        : '已完成';

    return [
      sanitizeCell(s.id),
      sanitizeCell(timeStr),
      sanitizeCell(s.sku),
      sanitizeCell(s.productName),
      sanitizeCell(s.color || ''),
      sanitizeCell(sizeStr),
      typeof s.retailPrice === 'number' ? s.retailPrice : Number(s.retailPrice) || 0,
      typeof s.actualPaid === 'number' ? s.actualPaid : Number(s.actualPaid) || 0,
      sanitizeCell(payStr),
      sanitizeCell(statusStr),
      sanitizeCell(s.returnReason || '-'),
      sanitizeCell(s.operator || '門市人員'),
    ];
  });

  const wsSales = XLSX.utils.aoa_to_sheet([salesHeaders, ...salesRows]);
  wsSales['!cols'] = [
    { wch: 20 }, // 單號
    { wch: 22 }, // 交易時間
    { wch: 18 }, // 貨號
    { wch: 24 }, // 品名
    { wch: 16 }, // 顏色
    { wch: 12 }, // 尺碼
    { wch: 12 }, // 售價
    { wch: 12 }, // 實收金額
    { wch: 12 }, // 付款方式
    { wch: 12 }, // 狀態
    { wch: 16 }, // 退貨原因
    { wch: 14 }, // 經手人
  ];
  XLSX.utils.book_append_sheet(wb, wsSales, '銷貨流水帳明細');

  // -------------------------------------------------------------
  // Sheet 3: 廠商退回紀錄
  // -------------------------------------------------------------
  const returnHeaders = [
    '單號',
    '退回日期',
    '廠商',
    '貨號',
    '品名',
    '尺碼',
    '退回雙數',
    '退回原因',
    '原因說明',
    '折讓/退款金額',
    '經手人',
  ];

  const returnRows = vendorReturns.map((r) => {
    const orderId = r.orderId || r.returnNo || r.id;
    const dateStr = r.date ? getTaiwanDateStr(r.date) : (r.timestamp ? getTaiwanDateStr(r.timestamp) : '');
    const sizeStr =
      r.size && (r.size.includes('、') || r.size.includes(':'))
        ? r.size
        : r.sizeDisplay || r.size || (r.sizeUS ? `US ${r.sizeUS}` : '');
    const detailStr = r.reasonDetail || r.notes || '-';

    return [
      sanitizeCell(orderId),
      sanitizeCell(dateStr),
      sanitizeCell(r.vendor),
      sanitizeCell(r.sku),
      sanitizeCell(r.productName),
      sanitizeCell(sizeStr),
      typeof r.quantity === 'number' ? r.quantity : Number(r.quantity) || 0,
      sanitizeCell(r.reason),
      sanitizeCell(detailStr),
      typeof r.refundAmount === 'number' ? r.refundAmount : Number(r.refundAmount) || 0,
      sanitizeCell(r.operator || '門市人員'),
    ];
  });

  const wsVendorReturns = XLSX.utils.aoa_to_sheet([returnHeaders, ...returnRows]);
  wsVendorReturns['!cols'] = [
    { wch: 20 }, // 單號
    { wch: 14 }, // 退回日期
    { wch: 16 }, // 廠商
    { wch: 18 }, // 貨號
    { wch: 24 }, // 品名
    { wch: 14 }, // 尺碼
    { wch: 12 }, // 退回雙數
    { wch: 14 }, // 退回原因
    { wch: 26 }, // 原因說明
    { wch: 14 }, // 折讓金額
    { wch: 14 }, // 經手人
  ];
  XLSX.utils.book_append_sheet(wb, wsVendorReturns, '廠商退回紀錄');

  // Trigger download
  const defaultFilename = filename || `實體鞋店進銷退紀錄報表_${getTaiwanTodayStr()}.xlsx`;
  XLSX.writeFile(wb, defaultFilename);
}
