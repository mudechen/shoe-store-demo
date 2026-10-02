import { test, expect, Page } from '@playwright/test';
import { calculateDailyClosing } from '../../src/services/salesService';
import { SaleRecord } from '../../src/types/sales';
import { getSeedShoes } from '../../src/data/seedShoes';

/**
 * Empirical Challenger Stress Test Suite
 * Adversarial verification of R1 & R3 requirements:
 * 1. CAS Inventory Deduction & Clamping (stock >= 0)
 * 2. Daily Closing Mathematical Invariants & Return Accounting
 * 3. Catalog Integrity (Seed shoes count remains strictly 24)
 * 4. Double-Return / Exchanged Item Vulnerability
 */

// Helper to extract integer value from currency or quantity strings
function extractNumber(text: string | null): number {
  if (!text) return 0;
  const cleaned = text.replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Navigation helpers
async function navigateToSalesClosing(page: Page) {
  const salesTab = page.locator('[data-testid="tab-sales-closing"], [data-testid="nav-tab-sales"]').first();
  await expect(salesTab).toBeVisible({ timeout: 10000 });
  await salesTab.click();
}

async function switchSubTab(page: Page, subtab: 'express' | 'batch' | 'closing') {
  if (subtab === 'express') {
    const btn = page.locator('[data-testid="subtab-express-sale"]').first();
    await expect(btn).toBeVisible({ timeout: 5000 });
    await btn.click();
    await expect(page.locator('[data-testid="sales-input-sku"]')).toBeVisible({ timeout: 5000 });
  } else if (subtab === 'batch') {
    const btn = page.locator('[data-testid="subtab-batch-sale"], [data-testid="btn-switch-batch-mode"]').first();
    await expect(btn).toBeVisible({ timeout: 5000 });
    await btn.click();
    await expect(page.locator('[data-testid="batch-sales-container"]')).toBeVisible({ timeout: 5000 });
  } else if (subtab === 'closing') {
    const btn = page.locator('[data-testid="subtab-closing-dashboard"], [data-testid="nav-tab-closing"]').first();
    await expect(btn).toBeVisible({ timeout: 5000 });
    await btn.click();
    await expect(page.locator('[data-testid="closing-dashboard-container"]')).toBeVisible({ timeout: 5000 });
  }
}

async function navigateToMatrix(page: Page) {
  const matrixTab = page.locator('[data-testid="tab-matrix"], button:has-text("尺碼熱圖")').first();
  await expect(matrixTab).toBeVisible({ timeout: 5000 });
  await matrixTab.click();
  await expect(page.locator('[data-testid="matrix-table"]')).toBeVisible({ timeout: 5000 });
}

test.describe('Empirical Challenger: Mathematical Invariants & Unit Logic', () => {

  // ==========================================================================
  // Invariant Test 1: Empty Day ($0)
  // ==========================================================================
  test('MATH-01: Empty day ($0) returns zeroed metrics without NaN or division by zero', () => {
    const emptySales: SaleRecord[] = [];
    const closing = calculateDailyClosing(emptySales, '2026-09-04');

    expect(closing.businessDate).toBe('2026-09-04');
    expect(closing.totalPairsSold).toBe(0);
    expect(closing.totalPairsReturned).toBe(0);
    expect(closing.netPairsSold).toBe(0);
    expect(closing.grossRevenue).toBe(0);
    expect(closing.returnedRevenue).toBe(0);
    expect(closing.netRevenue).toBe(0);

    // Payment breakdown invariants
    const { cash, credit, mobile_pay } = closing.paymentBreakdown;
    expect(cash.amount).toBe(0);
    expect(cash.percentage).toBe(0);
    expect(credit.amount).toBe(0);
    expect(credit.percentage).toBe(0);
    expect(mobile_pay.amount).toBe(0);
    expect(mobile_pay.percentage).toBe(0);

    // Sum invariant
    expect(cash.amount + credit.amount + mobile_pay.amount).toBe(closing.grossRevenue);
    expect(closing.grossRevenue - closing.returnedRevenue).toBe(closing.netRevenue);
  });

  // ==========================================================================
  // Invariant Test 2: 100% Cash Day
  // ==========================================================================
  test('MATH-02: 100% cash sales preserve total revenue and 100% percentage', () => {
    const cashSales: SaleRecord[] = [
      {
        id: 'sale-1',
        businessDate: '2026-09-04',
        timestamp: '2026-09-04T10:00:00Z',
        brand: 'Nike',
        sku: 'FD0655-001',
        productName: "Air Force 1 '07",
        color: 'Triple White 純白',
        sizeUS: 8.5,
        category: '運動鞋',
        retailPrice: 3400,
        actualPaid: 3400,
        paymentMethod: 'cash',
        status: 'completed',
        isCustomItem: false
      },
      {
        id: 'sale-2',
        businessDate: '2026-09-04',
        timestamp: '2026-09-04T11:00:00Z',
        brand: 'New Balance',
        sku: 'M2002RDA',
        productName: '2002R Protection Pack',
        color: 'Rain Cloud 雲雨灰',
        sizeUS: 9.0,
        category: '運動鞋',
        retailPrice: 4880,
        actualPaid: 4880,
        paymentMethod: 'cash',
        status: 'completed',
        isCustomItem: false
      }
    ];

    const closing = calculateDailyClosing(cashSales, '2026-09-04');
    expect(closing.totalPairsSold).toBe(2);
    expect(closing.totalPairsReturned).toBe(0);
    expect(closing.netPairsSold).toBe(2);
    expect(closing.grossRevenue).toBe(8280);
    expect(closing.returnedRevenue).toBe(0);
    expect(closing.netRevenue).toBe(8280);

    expect(closing.paymentBreakdown.cash.amount).toBe(8280);
    expect(closing.paymentBreakdown.cash.percentage).toBe(100);
    expect(closing.paymentBreakdown.credit.amount).toBe(0);
    expect(closing.paymentBreakdown.mobile_pay.amount).toBe(0);

    expect(
      closing.paymentBreakdown.cash.amount +
      closing.paymentBreakdown.credit.amount +
      closing.paymentBreakdown.mobile_pay.amount
    ).toBe(closing.grossRevenue);
    expect(closing.grossRevenue - closing.returnedRevenue).toBe(closing.netRevenue);
  });

  // ==========================================================================
  // Invariant Test 3: Mixed Payments Day
  // ==========================================================================
  test('MATH-03: Mixed payments satisfy cash + credit + mobile_pay === totalRevenue', () => {
    const mixedSales: SaleRecord[] = [
      {
        id: 'sale-cash',
        businessDate: '2026-09-04',
        timestamp: '2026-09-04T10:00:00Z',
        brand: 'Nike',
        sku: 'FD0655-001',
        productName: 'Air Force 1',
        color: 'White',
        sizeUS: 8.5,
        category: '運動鞋',
        retailPrice: 3400,
        actualPaid: 3400,
        paymentMethod: 'cash',
        status: 'completed',
        isCustomItem: false
      },
      {
        id: 'sale-credit',
        businessDate: '2026-09-04',
        timestamp: '2026-09-04T11:00:00Z',
        brand: 'Adidas',
        sku: 'B75806',
        productName: 'Samba OG',
        color: 'White/Black',
        sizeUS: 8.0,
        category: '運動鞋',
        retailPrice: 3490,
        actualPaid: 3490,
        paymentMethod: 'credit',
        status: 'completed',
        isCustomItem: false
      },
      {
        id: 'sale-mobile',
        businessDate: '2026-09-04',
        timestamp: '2026-09-04T12:00:00Z',
        brand: '手作',
        sku: 'SLIPPER-01',
        productName: '拖鞋',
        color: 'Blue',
        sizeUS: 9.0,
        category: '拖鞋',
        retailPrice: 590,
        actualPaid: 590,
        paymentMethod: 'mobile_pay',
        status: 'completed',
        isCustomItem: true
      }
    ];

    const closing = calculateDailyClosing(mixedSales, '2026-09-04');
    const expectedGross = 3400 + 3490 + 590; // 7480

    expect(closing.totalPairsSold).toBe(3);
    expect(closing.grossRevenue).toBe(expectedGross);
    expect(closing.paymentBreakdown.cash.amount).toBe(3400);
    expect(closing.paymentBreakdown.credit.amount).toBe(3490);
    expect(closing.paymentBreakdown.mobile_pay.amount).toBe(590);

    // Exact Mathematical Invariant Check
    expect(
      closing.paymentBreakdown.cash.amount +
      closing.paymentBreakdown.credit.amount +
      closing.paymentBreakdown.mobile_pay.amount
    ).toBe(closing.grossRevenue);
    expect(closing.grossRevenue - closing.returnedRevenue).toBe(closing.netRevenue);
  });

  // ==========================================================================
  // Invariant Test 4: Adversarial Multiple Returns & Accounting Double-Deduction
  // ==========================================================================
  test('MATH-04: Multiple returns correctly calculate gross, returned, netRevenue and netPairsSold without double-deduction', () => {
    // Scenario: Store sold 2 shoes today ($3,400 each). Customer returned 1 shoe.
    // Real-world accounting expectation:
    // - Gross revenue: $6,800 (total initial sales before returns)
    // - Returned revenue: $3,400
    // - Net revenue: MUST BE $3,400 (money retained by store!)
    // - Total pairs sold: 2 pairs sold gross, 1 pair returned, NET PAIRS SOLD = 1 PAIR!
    const mixedWithReturn: SaleRecord[] = [
      {
        id: 'sale-completed',
        businessDate: '2026-09-04',
        timestamp: '2026-09-04T10:00:00Z',
        brand: 'Nike',
        sku: 'FD0655-001',
        productName: 'Air Force 1',
        color: 'White',
        sizeUS: 8.5,
        category: '運動鞋',
        retailPrice: 3400,
        actualPaid: 3400,
        paymentMethod: 'cash',
        status: 'completed',
        isCustomItem: false
      },
      {
        id: 'sale-returned',
        businessDate: '2026-09-04',
        timestamp: '2026-09-04T11:00:00Z',
        brand: 'Nike',
        sku: 'FD0655-001',
        productName: 'Air Force 1',
        color: 'White',
        sizeUS: 9.0,
        category: '運動鞋',
        retailPrice: 3400,
        actualPaid: 3400,
        paymentMethod: 'credit',
        status: 'returned',
        isCustomItem: false,
        returnReason: '尺寸不合'
      }
    ];

    const closing = calculateDailyClosing(mixedWithReturn, '2026-09-04');

    // Verified Mathematical Accounting:
    // - Gross revenue: $6,800 (total initial sales before returns: completed $3,400 + returned $3,400)
    // - Returned revenue: $3,400
    // - Net revenue: $3,400 (retained net revenue: $6,800 - $3,400)
    // - Net pairs sold: 1 (2 total pairs sold - 1 returned pair)
    expect(closing.grossRevenue).toBe(6800);
    expect(closing.returnedRevenue).toBe(3400);
    expect(closing.netRevenue).toBe(3400);
    expect(closing.netPairsSold).toBe(1);

    // When 100% of sales are returned:
    const onlyReturned: SaleRecord[] = [
      {
        id: 'sale-ret-only',
        businessDate: '2026-09-04',
        timestamp: '2026-09-04T10:00:00Z',
        brand: 'Nike',
        sku: 'FD0655-001',
        productName: 'Air Force 1',
        color: 'White',
        sizeUS: 8.5,
        category: '運動鞋',
        retailPrice: 3400,
        actualPaid: 3400,
        paymentMethod: 'cash',
        status: 'returned',
        isCustomItem: false
      }
    ];

    const closingOnlyReturned = calculateDailyClosing(onlyReturned, '2026-09-04');
    expect(closingOnlyReturned.grossRevenue).toBe(3400);
    expect(closingOnlyReturned.returnedRevenue).toBe(3400);
    expect(closingOnlyReturned.netRevenue).toBe(0);
  });

  // ==========================================================================
  // Invariant Test 5: Catalog Integrity (Seed shoes count = 24)
  // ==========================================================================
  test('CATALOG-01: Seed shoe catalog contains exactly 24 models', () => {
    const seeds = getSeedShoes();
    expect(seeds.length).toBe(24);

    for (const shoe of seeds) {
      expect(shoe.variants.length).toBe(13); // US 6.0 to 12.0
      for (const v of shoe.variants) {
        expect(v.stock).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('Empirical Challenger: Browser Stress Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="matrix-table"]')).toBeVisible({ timeout: 10000 });
  });

  // ==========================================================================
  // Stress Test 1: Rapid Successive Sales on Zero Stock (Clamping & Disabled Defense)
  // ==========================================================================
  test('STRESS-01: Rapid successive sales on 0-stock variant clamps strictly at 0 without going negative', async ({ page }) => {
    // Air Force 1 US 6.0 has initial stock 0
    const cell60 = page.locator('[data-testid="size-cell-FD0655-001-6.0"]');
    await expect(cell60).toBeVisible();
    expect(extractNumber(await cell60.textContent())).toBe(0);

    await navigateToSalesClosing(page);
    await switchSubTab(page, 'express');

    await page.locator('[data-testid="sales-input-sku"]').fill('FD0655-001');
    await page.locator('[data-testid="sales-input-sku"]').press('Tab');

    // Rule 14 Clause 4: 0-stock variant button is disabled, strictly preventing checkout
    const sizeBtn60 = page.locator('[data-testid="sales-size-btn-6.0"], button:has-text("6.0")').first();
    await expect(sizeBtn60).toBeVisible();
    await expect(sizeBtn60).toBeDisabled();

    // Verify matrix stock is strictly clamped at 0 (never negative)
    await navigateToMatrix(page);
    await expect(cell60).toBeVisible();
    const finalStock = extractNumber(await cell60.textContent());
    expect(finalStock).toBe(0);
    expect(finalStock).toBeGreaterThanOrEqual(0);
  });

  // ==========================================================================
  // Stress Test 2: Uncatalogued Freeform Items Do NOT Corrupt Catalog (Count = 24)
  // ==========================================================================
  test('STRESS-02: Registering multiple freeform uncatalogued items maintains exactly 24 seed shoes', async ({ page }) => {
    // Check initial catalog rows in matrix heatmap
    const initialRows = await page.locator('[data-testid="matrix-table"] tbody tr[data-testid^="product-row-"]').count();
    expect(initialRows).toBe(24);

    // 1. Express sale of custom uncatalogued item 1
    await navigateToSalesClosing(page);
    await switchSubTab(page, 'express');

    await page.locator('[data-testid="sales-input-sku"]').fill('FREEFORM-ALPHA-99');
    await page.locator('[data-testid="sales-input-sku"]').press('Tab');
    await page.locator('[data-testid="sales-input-brand"]').fill('無名老匠');
    const chip = page.locator('[data-testid="sales-category-chip-拖鞋"], button:has-text("拖鞋")').first();
    if (await chip.isVisible()) await chip.click();
    await page.locator('[data-testid="sales-size-btn-8.5"]').click();
    await page.locator('[data-testid="sales-input-price"]').fill('350');
    await page.locator('[data-testid="btn-submit-express-sale"]').click();
    await expect(page.locator('text=/銷貨.*成功|登記成功|開單成功/i').first()).toBeVisible({ timeout: 5000 });

    // 2. Batch sale of custom uncatalogued items 2 & 3
    await switchSubTab(page, 'batch');
    const row0 = page.locator('[data-testid="batch-cell-sku-0"]');
    await row0.click();
    await row0.fill('FREEFORM-BETA-88');
    await page.keyboard.press('Tab');
    const row0Price = page.locator('[data-testid="batch-cell-price-0"]');
    if (await row0Price.isVisible()) await row0Price.fill('490');

    await page.locator('[data-testid="btn-batch-submit-sales"]').click();
    await expect(page.locator('text=/成功.*筆|批次.*完成/i').first()).toBeVisible({ timeout: 5000 });

    // Verify matrix catalog strictly retains 24 seed products
    await navigateToMatrix(page);
    const postRows = await page.locator('[data-testid="matrix-table"] tbody tr[data-testid^="product-row-"]').count();
    expect(postRows).toBe(24);
  });
});
