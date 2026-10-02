// Validation utilities

/**
 * Validate SKU / Style code
 */
export function isValidSKU(sku: string): boolean {
  if (!sku || typeof sku !== 'string') return false;
  const clean = sku.trim();
  return clean.length >= 3 && clean.length <= 30;
}

/**
 * Validate EAN-13 or UPC barcode format
 */
export function isValidBarcode(barcode: string): boolean {
  if (!barcode || typeof barcode !== 'string') return false;
  const clean = barcode.trim();
  return /^\d{8,14}$/.test(clean);
}

/**
 * Validate location coordinate syntax:
 * Storefront: ^[A-D]-\d{2}-L[1-4]$
 * Backroom: ^R[1-4]-C\d{2}-L[1-5]$
 */
export function isValidLocation(location: string): boolean {
  if (!location || typeof location !== 'string') return false;
  const clean = location.trim().toUpperCase();
  const storefrontRegex = /^[A-D]-\d{2}-L[1-4]$/;
  const backroomRegex = /^R[1-4]-C\d{2}-L[1-5]$/;
  return storefrontRegex.test(clean) || backroomRegex.test(clean);
}
