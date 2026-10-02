import { test, expect } from '@playwright/test';

const SEED_TEST_PRODUCTS = [
  {
    id: 'test-fixture-1',
    sku: 'FD0655-001',
    brand: 'Nike',
    name: "Air Force 1 '07",
    color: 'Triple White 純白',
    category: '休閒鞋',
    retailPrice: 3400,
    costPrice: 1900,
    barcode: '196607831001',
    displayLocation: 'A-01-L2',
    storageLocation: 'R1-C01-L3',
    variants: [
      { id: 'var-f1', productId: 'test-fixture-1', sizeUS: 6.0, sizeEU: 38.5, sizeCM: 24.0, stock: 0 },
      { id: 'var-f2', productId: 'test-fixture-1', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, stock: 8 },
      { id: 'var-f3', productId: 'test-fixture-1', sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, stock: 5 },
    ],
  },
];

test.describe('Records Center Action Buttons: 銷貨記帳, 進貨入庫, 退回出庫', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seedProducts) => {
      localStorage.clear();
      localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
    }, SEED_TEST_PRODUCTS);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('RAB-01: Verify all 3 action buttons in Records tabs and their functional triggers', async ({ page }) => {
    // 1. Navigate to Records tab
    const recordsNavBtn = page.locator('[data-testid="nav-tab-records"]');
    await expect(recordsNavBtn).toBeVisible();
    await recordsNavBtn.click();
    await expect(page.locator('[data-testid="view-records"]')).toBeVisible();

    // 2. Tab: 銷貨紀錄 -> Button "銷貨記帳"
    const salesTabBtn = page.locator('[data-testid="records-tab-sales"]');
    await salesTabBtn.click();

    const salesCashierBtn = page.locator('button:has-text("銷貨記帳")').first();
    await expect(salesCashierBtn).toBeVisible();
    await salesCashierBtn.click();

    // Verify navigating to cashier view
    await expect(page.locator('[data-testid="view-cashier"]')).toBeVisible();

    // 3. Navigate back to Records tab
    await recordsNavBtn.click();
    await expect(page.locator('[data-testid="view-records"]')).toBeVisible();

    // 4. Tab: 進貨紀錄 -> Button "進貨入庫"
    const stockInTabBtn = page.locator('[data-testid="records-tab-stockin"]');
    await stockInTabBtn.click();

    const stockInEntryBtn = page.locator('button:has-text("進貨入庫")').first();
    await expect(stockInEntryBtn).toBeVisible();
    await stockInEntryBtn.click();

    // Verify Stock-In modal opens
    const stockInModal = page.locator('[data-testid="stockin-modal"]');
    await expect(stockInModal).toBeVisible();

    // Close modal via close button
    const closeStockInBtn = page.locator('[data-testid="btn-close-stockin-modal"]');
    await expect(closeStockInBtn).toBeVisible();
    await closeStockInBtn.click();
    await expect(stockInModal).not.toBeVisible();

    // 5. Tab: 退回紀錄 -> Button "退回出庫"
    const returnTabBtn = page.locator('[data-testid="records-tab-vendor-returns"]');
    await returnTabBtn.click();

    const vendorReturnBtn = page.locator('button:has-text("退回出庫")').first();
    await expect(vendorReturnBtn).toBeVisible();
    await vendorReturnBtn.click();

    // Verify Vendor Return modal opens
    const returnModal = page.locator('[data-testid="vendor-return-modal"]');
    await expect(returnModal).toBeVisible();

    // Close vendor return modal
    const cancelReturnBtn = returnModal.locator('button:has-text("取消")');
    await cancelReturnBtn.click();
    await expect(returnModal).not.toBeVisible();
  });

  test('RAB-02: Verify empty state CTA buttons when records are empty or filtered out', async ({ page }) => {
    // Navigate to Records tab
    await page.locator('[data-testid="nav-tab-records"]').click();
    await expect(page.locator('[data-testid="view-records"]')).toBeVisible();

    // Search for non-existent keyword to trigger empty state
    const searchInput = page.locator('[data-testid="records-search-input"]');
    await searchInput.fill('NON_EXISTENT_SKU_XYZ');
    await expect(page.locator('[data-testid="records-empty-state"]')).toBeVisible();

    // Test on 銷貨紀錄 empty state
    await page.locator('[data-testid="records-tab-sales"]').click();
    const emptySalesBtn = page.locator('[data-testid="btn-empty-sales-cashier"]');
    await expect(emptySalesBtn).toBeVisible();
    await expect(emptySalesBtn).toContainText('銷貨記帳');
    await emptySalesBtn.click();
    await expect(page.locator('[data-testid="view-cashier"]')).toBeVisible();

    // Back to Records
    await page.locator('[data-testid="nav-tab-records"]').click();
    await searchInput.fill('NON_EXISTENT_SKU_XYZ');

    // Test on 進貨紀錄 empty state
    await page.locator('[data-testid="records-tab-stockin"]').click();
    const emptyStockInBtn = page.locator('[data-testid="btn-empty-stockin"]');
    await expect(emptyStockInBtn).toBeVisible();
    await expect(emptyStockInBtn).toContainText('進貨入庫');
    await emptyStockInBtn.click();
    const stockInModal = page.locator('[data-testid="stockin-modal"]');
    await expect(stockInModal).toBeVisible();
    await page.locator('[data-testid="btn-close-stockin-modal"]').click();
    await expect(stockInModal).not.toBeVisible();

    // Test on 退回紀錄 empty state
    await page.locator('[data-testid="records-tab-vendor-returns"]').click();
    const emptyReturnBtn = page.locator('[data-testid="btn-empty-vendor-return"]');
    await expect(emptyReturnBtn).toBeVisible();
    await expect(emptyReturnBtn).toContainText('退回出庫');
    await emptyReturnBtn.click();
    await expect(page.locator('[data-testid="vendor-return-modal"]')).toBeVisible();
  });
});
