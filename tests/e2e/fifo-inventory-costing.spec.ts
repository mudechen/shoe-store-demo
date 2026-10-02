import { test, expect, Page } from '@playwright/test';

const SEED_TEST_PRODUCTS = [
  {
    id: 'test-fifo-prod-1',
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
      {
        id: 'var-fifo-1',
        productId: 'test-fifo-prod-1',
        sizeUS: 8.5,
        sizeEU: 42.0,
        sizeCM: 26.5,
        stock: 2, // Only 2 pairs in Batch 1 (@ 1900)
        batches: [
          {
            id: 'batch-fifo-1',
            stockInOrderId: 'IN-20260901-001',
            timestamp: '2026-09-01T00:00:00.000Z',
            costPrice: 1900,
            initialStock: 2,
            remainingStock: 2,
          },
        ],
      },
    ],
  },
];

async function navigateToTab(page: Page, tab: 'cashier' | 'inventory' | 'records' | 'analytics') {
  const tabBtn = page.locator(`[data-testid="nav-tab-${tab}"]`);
  await expect(tabBtn).toBeVisible({ timeout: 10000 });
  await tabBtn.click();
}

test.describe('FIFO Inventory Costing & Sales Ledger Accuracy', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seedProducts) => {
      localStorage.clear();
      localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
      localStorage.setItem('shoe_store_sales_v1', JSON.stringify([]));
      localStorage.setItem('shoe_store_stockin_v1', JSON.stringify([]));
    }, SEED_TEST_PRODUCTS);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('FIFO accurately consumes oldest batch first, snapshots cost, and adapts when batch is exhausted', async ({ page }) => {
    // =========================================================================
    // Step 1: Restock Batch 2 with higher cost (2 pairs @ $2,400)
    // =========================================================================
    await navigateToTab(page, 'inventory');
    const openStockInBtn = page.locator('[data-testid="btn-open-stockin-modal"]');
    await expect(openStockInBtn).toBeVisible();
    await openStockInBtn.click();

    const stockInModal = page.locator('[data-testid="stockin-modal"]');
    await expect(stockInModal).toBeVisible();

    const skuInput = stockInModal.locator('[data-testid="stockin-input-sku"]');
    await skuInput.fill('FD0655-001');
    await skuInput.press('Tab');

    // Update cost for this batch to 2400, retail to 4000
    const costInput = stockInModal.locator('[data-testid="stockin-input-cost"]');
    await costInput.fill('2400');
    const retailInput = stockInModal.locator('[data-testid="stockin-input-retail"]');
    await retailInput.fill('4000');

    // Add 2 pairs of US 8.5
    const plusBtn85 = stockInModal.locator('[data-testid="stockin-size-plus-8.5"], [data-testid="stockin-size-plus-US 8.5"]').first();
    await plusBtn85.click();
    await plusBtn85.click();

    const submitStockInBtn = stockInModal.locator('[data-testid="btn-submit-stockin"]');
    await submitStockInBtn.click();
    await expect(stockInModal).not.toBeVisible();

    // Now US 8.5 has 4 pairs:
    // Batch 1 (older): 2 pairs @ $1,900
    // Batch 2 (newer): 2 pairs @ $2,400

    // =========================================================================
    // Step 2: Cashier sells 1st pair -> Must consume Batch 1 @ $1,900
    // =========================================================================
    await navigateToTab(page, 'cashier');
    const cashierSkuInput = page.locator('[data-testid="cashier-sku-input"], input[placeholder*="例如輸入 CW"]').first();
    await cashierSkuInput.fill('FD0655');

    const suggestionItem = page.locator('[data-testid^="cashier-suggestion-item-"], button:has-text("FD0655-001")').first();
    await expect(suggestionItem).toBeVisible();
    await suggestionItem.click();

    const sizeBtn = page.locator('[data-testid="cashier-size-btn-8.5"], [data-testid="cashier-size-btn-US 8.5"], button:has-text("US 8.5")').first();
    await sizeBtn.click();

    const submitSaleBtn = page.locator('[data-testid="btn-submit-cashier-sale"], button:has-text("確認賣出")').first();
    await submitSaleBtn.click();

    // =========================================================================
    // Step 3: Cashier sells 2nd pair -> Must also consume Batch 1 @ $1,900 (exhausts Batch 1)
    // =========================================================================
    await cashierSkuInput.fill('FD0655');
    await suggestionItem.click();
    await sizeBtn.click();
    await submitSaleBtn.click();

    // =========================================================================
    // Step 4: Cashier sells 3rd pair -> Batch 1 is empty, must consume Batch 2 @ $2,400!
    // =========================================================================
    await cashierSkuInput.fill('FD0655');
    await suggestionItem.click();
    await sizeBtn.click();
    await submitSaleBtn.click();

    // =========================================================================
    // Step 5: Check Records Center -> Sales Ledger
    // =========================================================================
    await navigateToTab(page, 'records');
    const salesSubtab = page.locator('[data-testid="records-tab-sales"]');
    await salesSubtab.click();

    const salesList = page.locator('[data-testid="sales-records-list"]');
    await expect(salesList).toBeVisible();

    // Verify 3 sales items exist
    const saleItems = salesList.locator('[data-testid^="sales-record-item-"]');
    await expect(saleItems).toHaveCount(3);

    // The newest sale (Sale 3, at the top) consumed Batch 2: cost $2,400, gross profit = 4000 - 2400 = 1600
    await expect(page.locator('text=成本 $2,400').first()).toBeVisible();
    await expect(page.locator('text=毛利 $1,600').first()).toBeVisible();

    // The older 2 sales consumed Batch 1: cost $1,900, gross profit = 4000 - 1900 = 2100 (or 3400 - 1900 = 1500)
    const olderBatchCosts = page.locator('text=成本 $1,900');
    await expect(olderBatchCosts).toHaveCount(2);

    // =========================================================================
    // Step 6: Verify Store Analytics COGS
    // =========================================================================
    await navigateToTab(page, 'analytics');
    await expect(page.locator('[data-testid="view-analytics"]')).toBeVisible();

    // Total Revenue: 12,000, Total COGS: 1900 + 1900 + 2400 = 6,200; Gross Profit: 5,800
    await expect(page.locator('text=成本: $6,200').first()).toBeVisible();
    await expect(page.locator('text=毛利: $5,800').first()).toBeVisible();
  });

  test('FIFO cross-unit restocking (US 12.5 @ $100 first, then EU 46.5 @ $104) accurately prioritizes oldest batch @ $100 on sale', async ({ page }) => {
    // 1. Stock In Batch 1 in US unit (1 pair US 12.5 @ $100)
    await navigateToTab(page, 'inventory');
    const openStockInBtn = page.locator('[data-testid="btn-open-stockin-modal"]');
    await expect(openStockInBtn).toBeVisible();
    await openStockInBtn.click();

    const stockInModal = page.locator('[data-testid="stockin-modal"]');
    await expect(stockInModal).toBeVisible();

    const skuInput = stockInModal.locator('[data-testid="stockin-input-sku"]');
    await skuInput.fill('001');
    await skuInput.press('Tab');

    // Cost $100, Retail $200
    const costInput = stockInModal.locator('[data-testid="stockin-input-cost"]');
    await costInput.fill('100');
    const retailInput = stockInModal.locator('[data-testid="stockin-input-retail"]');
    await retailInput.fill('200');

    // Add 1 pair of US 12.5
    const plusBtn125 = stockInModal.locator('[data-testid="stockin-size-plus-12.5"], [data-testid="stockin-size-plus-US 12.5"]').first();
    await plusBtn125.click();

    const submitStockInBtn = stockInModal.locator('[data-testid="btn-submit-stockin"]');
    await submitStockInBtn.click();
    await expect(stockInModal).not.toBeVisible();

    // 2. Stock In Batch 2 in EU unit (1 pair EU 46.5 @ $104)
    await openStockInBtn.click();
    await expect(stockInModal).toBeVisible();
    await skuInput.fill('001');
    await skuInput.press('Tab');

    // Switch unit to EU
    const euUnitBtn = stockInModal.locator('[data-testid="stockin-unit-EU"]');
    await euUnitBtn.click();

    await costInput.fill('104');
    await retailInput.fill('200');

    // Add 1 pair of EU 46.5
    const plusBtnEU465 = stockInModal.locator('[data-testid="stockin-size-plus-46.5"], [data-testid="stockin-size-plus-EU 46.5"]').first();
    await plusBtnEU465.click();

    await submitStockInBtn.click();
    await expect(stockInModal).not.toBeVisible();

    // 3. Cashier sells 1st pair of US 12.5 -> Must record cost $100 (Batch 1), gross profit $100!
    await navigateToTab(page, 'cashier');
    const cashierSkuInput = page.locator('[data-testid="cashier-sku-input"], input[placeholder*="例如輸入 CW"]').first();
    await cashierSkuInput.fill('001');

    const suggestionItem = page.locator('[data-testid^="cashier-suggestion-item-"], button:has-text("001")').first();
    await expect(suggestionItem).toBeVisible();
    await suggestionItem.click();

    const sizeBtn = page.locator('[data-testid="cashier-size-btn-12.5"], [data-testid="cashier-size-btn-US 12.5"], button:has-text("12.5")').first();
    await expect(sizeBtn).toBeVisible();
    await sizeBtn.click();

    const submitSaleBtn = page.locator('[data-testid="btn-submit-cashier-sale"], button:has-text("確認賣出")').first();
    await submitSaleBtn.click();

    // 4. Verify in Sales Ledger: Cost MUST be $100 and Gross Profit $100
    await navigateToTab(page, 'records');
    const salesSubtab = page.locator('[data-testid="records-tab-sales"]');
    await salesSubtab.click();

    const salesList = page.locator('[data-testid="sales-records-list"]');
    await expect(salesList).toBeVisible();

    await expect(page.locator('text=成本 $100').first()).toBeVisible();
    await expect(page.locator('text=毛利 $100').first()).toBeVisible();

    // 5. Cashier sells 2nd pair of US 12.5 -> Must record cost $104 (Batch 2), gross profit $96!
    await navigateToTab(page, 'cashier');
    await cashierSkuInput.fill('001');
    await suggestionItem.click();
    await sizeBtn.click();
    await submitSaleBtn.click();

    await navigateToTab(page, 'records');
    await salesSubtab.click();

    // The newer sale at the top consumed Batch 2 @ $104
    await expect(page.locator('text=成本 $104').first()).toBeVisible();
    await expect(page.locator('text=毛利 $96').first()).toBeVisible();
  });
});
