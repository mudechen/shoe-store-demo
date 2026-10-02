import { ProductWithVariants } from '../types/inventory';

export interface MockBarcodeOption {
  barcode: string;
  sku: string;
  name: string;
  brand: string;
  color: string;
}

/**
 * Standardize barcode input (trim whitespace, remove dashes)
 */
export function normalizeBarcode(input: string): string {
  return input.trim().replace(/[-\s]/g, '');
}

/**
 * Validate barcode format: EAN-13 (13 digits), UPC-A (12 digits), or alphanumeric SKU
 */
export function validateBarcodeFormat(input: string): {
  valid: boolean;
  type?: 'EAN-13' | 'UPC-A' | 'SKU';
  error?: string;
} {
  const clean = normalizeBarcode(input);
  if (!clean) {
    return { valid: false, error: '條碼或款號不可為空' };
  }

  // 13-digit EAN-13
  if (/^\d{13}$/.test(clean)) {
    return { valid: true, type: 'EAN-13' };
  }

  // 12-digit UPC-A
  if (/^\d{12}$/.test(clean)) {
    return { valid: true, type: 'UPC-A' };
  }

  // SKU / Model code (letters, numbers, dashes)
  if (/^[A-Za-z0-9_-]{4,20}$/.test(clean)) {
    return { valid: true, type: 'SKU' };
  }

  return {
    valid: false,
    error: '不符合標準條碼格式 (支援 13碼 EAN-13、12碼 UPC-A 或貨號 SKU)',
  };
}

/**
 * Lookup product by Barcode (EAN-13, UPC-A, leading-zero padded) or SKU
 */
export function findProductByBarcode(
  products: ProductWithVariants[],
  barcodeOrSku: string
): ProductWithVariants | undefined {
  const clean = normalizeBarcode(barcodeOrSku).toUpperCase();
  if (!clean) return undefined;

  // 1. Direct barcode match
  let matched = products.find((p) => {
    const pCode = normalizeBarcode(p.barcode).toUpperCase();
    if (pCode === clean) return true;

    // Handle 12-digit UPC-A vs 13-digit EAN-13 (EAN often prefixes '0' to UPC)
    if (pCode.length === 12 && clean === '0' + pCode) return true;
    if (clean.length === 12 && pCode === '0' + clean) return true;

    return false;
  });

  if (matched) return matched;

  // 1.1 Check if barcode is one of PRELOADED_TEST_BARCODES
  const preloaded = PRELOADED_TEST_BARCODES.find((b) => b.barcode === clean);
  if (preloaded) {
    const matchedByPreloadedSku = products.find((p) => p.sku.toUpperCase() === preloaded.sku.toUpperCase());
    if (matchedByPreloadedSku) return matchedByPreloadedSku;
  }

  // 2. Direct SKU match
  matched = products.find((p) => p.sku.toUpperCase() === clean);
  if (matched) return matched;

  // 3. Fallback partial match for convenience in retail
  matched = products.find(
    (p) =>
      p.sku.toUpperCase().includes(clean) ||
      p.barcode.toUpperCase().includes(clean) ||
      p.name.toUpperCase().includes(clean)
  );

  return matched;
}

/**
 * Predefined quick test barcodes for simulated headless testing / CI
 */
export const PRELOADED_TEST_BARCODES: MockBarcodeOption[] = [
  {
    barcode: '0195866299101', // Standard EAN for AF1 White
    sku: 'FD0655-001',
    name: "Air Force 1 '07",
    brand: 'Nike',
    color: 'Triple White 純白',
  },
  {
    barcode: '196607831001', // Seed Barcode for AF1 White
    sku: 'FD0655-001',
    name: "Air Force 1 '07 (原廠條碼)",
    brand: 'Nike',
    color: 'Triple White 純白',
  },
  {
    barcode: '0196432851023', // Standard EAN for NB 9060
    sku: 'U9060ECA',
    name: '9060 Sea Salt',
    brand: 'New Balance',
    color: 'Sea Salt 海鹽灰',
  },
  {
    barcode: '196432109876', // Seed Barcode for NB 9060
    sku: 'U9060ECA',
    name: '9060 (原廠條碼)',
    brand: 'New Balance',
    color: 'Sea Salt 海鹽灰',
  },
  {
    barcode: '0406674845012', // Standard EAN for Adidas Samba
    sku: 'B75806',
    name: 'Samba OG',
    brand: 'Adidas',
    color: 'Cloud White/Core Black 白底黑條',
  },
  {
    barcode: '4059807654321', // Seed Barcode for Samba OG
    sku: 'B75806',
    name: 'Samba OG (原廠條碼)',
    brand: 'Adidas',
    color: 'Cloud White/Core Black 白底黑條',
  },
  {
    barcode: '195244510023', // Nike Dunk Low Retro
    sku: 'DD1391-100',
    name: 'Dunk Low Retro',
    brand: 'Nike',
    color: 'White/Black 黑白熊貓',
  },
  {
    barcode: '196608987654', // Nike Kobe 8 Protro
    sku: 'FN5215-100',
    name: 'Kobe 8 Protro',
    brand: 'Nike',
    color: 'Halo 純白紀念',
  },
];

/**
 * Generate full mock barcode list incorporating active products
 */
export function getMockBarcodeOptions(products: ProductWithVariants[]): MockBarcodeOption[] {
  const optionsMap = new Map<string, MockBarcodeOption>();

  // Add preloaded standards first
  PRELOADED_TEST_BARCODES.forEach((opt) => {
    optionsMap.set(opt.barcode, opt);
  });

  // Supplement with any active inventory items
  products.forEach((p) => {
    if (!optionsMap.has(p.barcode)) {
      optionsMap.set(p.barcode, {
        barcode: p.barcode,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        color: p.color,
      });
    }
  });

  return Array.from(optionsMap.values());
}
