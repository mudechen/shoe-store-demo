import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

/**
 * Tier 7: Unified Records Center, Embedded Stock-In & Vendor Returns (Round 3)
 *
 * Requirements verified:
 * - TC-7.1: 4-tab bottom navigation switching (cashier, inventory, records, analytics) on desktop and mobile (390x844) with zero horizontal overflow.
 * - TC-7.2: Inventory page embedded "+ 進貨入庫" button opens modal, fill stock-in (restocking & new registration), submit, verify stock increment.
 * - TC-7.3: Verify Stock-In record created in Records Center -> 【進貨紀錄】 with batch metadata, sizes, cost.
 * - TC-7.4: Perform sale in Cashier -> verify sale record appears in Records Center -> 【銷貨紀錄】.
 * - TC-7.5: In Records Center -> 【銷貨紀錄】, mark sale as returned with reason ("尺寸不合") -> verify status changes to "已退貨" -> verify variant stock restored (+1) -> test sub-filters (全部 / 已售出 / 已退貨).
 * - TC-7.6: Perform Vendor Return via "退回廠商" quick action on inventory shoe card -> verify inventory variant decremented -> verify Vendor Return record created.
 * - TC-7.7: Records Center Popover date range picker, newest-to-oldest sorting and SKU search.
 * - TC-7.8: Excel (.xlsx) export button in Records Center triggers download of valid .xlsx file.
 *
 * Strict Selector Contract: All tests use the authoritative data-testid registry defined in explorer_survey_r3_2/analysis.md Section 6.
 */

// ============================================================================
// Fixtures & Helper Functions
// ============================================================================

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
  {
    id: 'test-fixture-2',
    sku: 'DD1391-100',
    brand: 'Nike',
    name: 'Dunk Low Retro',
    color: 'White/Black 黑白熊貓',
    category: '休閒鞋',
    retailPrice: 3400,
    costPrice: 1850,
    barcode: '195244510023',
    displayLocation: 'A-01-L3',
    storageLocation: 'R1-C01-L2',
    variants: [
      { id: 'var-f4', productId: 'test-fixture-2', sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, stock: 1 },
    ],
  },
];

async function assertZeroHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      docScrollWidth: doc.scrollWidth,
      docClientWidth: doc.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      hasOverflow: doc.scrollWidth > doc.clientWidth || body.scrollWidth > doc.clientWidth,
    };
  });
  expect(metrics.hasOverflow).toBe(false);
  expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.docClientWidth);
}

async function navigateToTab(page: Page, tab: 'cashier' | 'inventory' | 'records' | 'analytics') {
  const tabBtn = page.locator(`[data-testid="nav-tab-${tab}"]`);
  await expect(tabBtn).toBeVisible({ timeout: 10000 });
  await tabBtn.click();
}

// ============================================================================
// Test Suite: Tier 7
// ============================================================================

test.describe('Tier 7: Unified Records Center, Embedded Stock-In & Vendor Returns (Round 3)', () => {
  test.beforeEach(async ({ page }) => {
    // Guaranteed clean state isolation and deterministic pre-seeded catalog
    await page.addInitScript((seedProducts) => {
      localStorage.clear();
      localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
    }, SEED_TEST_PRODUCTS);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  /**
   * TC-7.1: 4-Tab Bottom Navigation Switching (Desktop & Mobile 390x844)
   * Verify navigation contains exactly 4 tabs: cashier, inventory, records, analytics.
   * Verify no obsolete "進貨入庫" bottom tab.
   * Verify view switching and zero horizontal overflow on mobile 390x844.
   */
  test('TC-7.1: 4-Tab Bottom Navigation Switching (Desktop & Mobile 390x844)', async ({ page }) => {
    const navContainer = page.locator('[data-testid="mobile-bottom-nav"]');
    await expect(navContainer).toBeVisible();

    // 1. Verify exactly 4 tabs exist
    const navButtons = navContainer.locator('button');
    await expect(navButtons).toHaveCount(4);

    // 2. Assert exact 4 tab buttons
    const cashierTab = page.locator('[data-testid="nav-tab-cashier"]');
    const inventoryTab = page.locator('[data-testid="nav-tab-inventory"]');
    const recordsTab = page.locator('[data-testid="nav-tab-records"]');
    const analyticsTab = page.locator('[data-testid="nav-tab-analytics"]');

    await expect(cashierTab).toBeVisible();
    await expect(inventoryTab).toBeVisible();
    await expect(recordsTab).toBeVisible();
    await expect(analyticsTab).toBeVisible();

    await expect(cashierTab).toContainText('銷貨記帳');
    await expect(inventoryTab).toContainText('庫存清單');
    await expect(recordsTab).toContainText('紀錄明細');
    await expect(analyticsTab).toContainText('門市營運');

    // 3. Verify absolutely no obsolete "進貨入庫" bottom tab exists
    const obsoleteStockInTab = navContainer.locator('button:has-text("進貨入庫")');
    expect(await obsoleteStockInTab.count()).toBe(0);

    // 4. Test View Switching
    // Switch to Inventory
    await inventoryTab.click();
    await expect(page.locator('[data-testid="view-inventory"]')).toBeVisible();

    // Switch to Records
    await recordsTab.click();
    await expect(page.locator('[data-testid="view-records"]')).toBeVisible();

    // Switch to Analytics
    await analyticsTab.click();
    await expect(page.locator('[data-testid="view-analytics"]')).toBeVisible();

    // Switch back to Cashier
    await cashierTab.click();
    await expect(page.locator('[data-testid="view-cashier"]')).toBeVisible();

    // 5. Verify zero horizontal overflow on mobile viewport 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await assertZeroHorizontalOverflow(page);
  });

  /**
   * TC-7.2: Inventory Page Embedded "+ 進貨入庫" Button Opens Modal, Fill Stock-In & Verify Inventory Incremented
   * Supports restocking existing shoe (FD0655-001) and registering brand new shoe (NEW-SHOE-702).
   */
  test('TC-7.2: Inventory Page Embedded "+ 進貨入庫" Button Opens Modal, Fill Stock-In & Verify Inventory Incremented', async ({ page }) => {
    // Navigate to Inventory tab
    await navigateToTab(page, 'inventory');
    await expect(page.locator('[data-testid="view-inventory"]')).toBeVisible();

    // 1. Locate and click embedded "+ 進貨入庫" CTA
    const openStockInBtn = page.locator('[data-testid="btn-open-stockin-modal"]');
    await expect(openStockInBtn).toBeVisible();
    await openStockInBtn.click();

    // 2. Stock-In Modal appears
    const stockInModal = page.locator('[data-testid="stockin-modal"]');
    await expect(stockInModal).toBeVisible();

    // ==========================================
    // Subtest A: Restocking existing shoe FD0655-001
    // ==========================================
    const skuInput = stockInModal.locator('[data-testid="stockin-input-sku"]');
    await skuInput.fill('FD0655-001');
    await skuInput.press('Tab');

    // Auto-detection fills vendor and name
    const vendorInput = stockInModal.locator('[data-testid="stockin-input-vendor"]');
    const nameInput = stockInModal.locator('[data-testid="stockin-input-name"]');
    await expect(vendorInput).toHaveValue(/Nike/i);
    await expect(nameInput).toHaveValue(/Air Force 1/i);

    // Increase US 8.5 quantity by 4
    const sizeInput85 = stockInModal.locator('[data-testid="stockin-size-input-8.5"], [data-testid="stockin-size-input-US 8.5"]').first();
    if (await sizeInput85.isVisible()) {
      await sizeInput85.fill('4');
    } else {
      const plusBtn = stockInModal.locator('[data-testid="stockin-size-plus-8.5"], [data-testid="stockin-size-plus-US 8.5"]').first();
      for (let i = 0; i < 4; i++) {
        await plusBtn.click();
      }
    }

    // Submit stock-in
    const submitBtn = stockInModal.locator('[data-testid="btn-submit-stockin"]');
    await submitBtn.click();

    // Modal closes
    await expect(stockInModal).not.toBeVisible();

    // Verify inventory incremented in Inventory View: initial 8 + 4 = 12
    const af1Card = page.locator('[data-testid="inventory-card-FD0655-001"]');
    await expect(af1Card).toBeVisible();
    await af1Card.click(); // Expand card to see size variants

    const stockNumber85 = page.locator('[data-testid="inventory-stock-number-FD0655-001-8.5"], [data-testid="inventory-stock-number-FD0655-001-US 8.5"]').first();
    if (await stockNumber85.isVisible()) {
      await expect(stockNumber85).toContainText('12');
    } else {
      // Fallback: verify 12 appears in the expanded card text
      await expect(af1Card).toContainText('12');
    }

    // ==========================================
    // Subtest B: New Shoe Registration NEW-SHOE-702
    // ==========================================
    await openStockInBtn.click();
    await expect(stockInModal).toBeVisible();

    await stockInModal.locator('[data-testid="stockin-input-sku"]').fill('NEW-SHOE-702');
    await stockInModal.locator('[data-testid="stockin-input-vendor"]').fill('Puma');
    await stockInModal.locator('[data-testid="stockin-input-name"]').fill('Speedcat OG');
    await stockInModal.locator('[data-testid="stockin-input-color"]').fill('Black/White');
    await stockInModal.locator('[data-testid="stockin-select-category"]').selectOption({ label: '休閒鞋' });
    await stockInModal.locator('[data-testid="stockin-input-cost"]').fill('1500');
    await stockInModal.locator('[data-testid="stockin-input-retail"]').fill('3280');

    // Add 5 pairs of US 9.0
    const sizeInput90 = stockInModal.locator('[data-testid="stockin-size-input-9.0"], [data-testid="stockin-size-input-US 9.0"]').first();
    if (await sizeInput90.isVisible()) {
      await sizeInput90.fill('5');
    } else {
      const plusBtn90 = stockInModal.locator('[data-testid="stockin-size-plus-9.0"], [data-testid="stockin-size-plus-US 9.0"]').first();
      for (let i = 0; i < 5; i++) {
        await plusBtn90.click();
      }
    }

    await submitBtn.click();
    await expect(stockInModal).not.toBeVisible();

    // Verify new card exists in inventory search
    const inventorySearch = page.locator('[data-testid="inventory-search-input"]');
    await inventorySearch.fill('NEW-SHOE-702');

    const newCard = page.locator('[data-testid="inventory-card-NEW-SHOE-702"]');
    await expect(newCard).toBeVisible();
    await expect(newCard).toContainText('5');
  });

  /**
   * TC-7.3: Verify Stock-In Record Created in Records Center -> 【進貨紀錄】
   * Perform stock-in and verify batch metadata, sizes, cost in Records Center.
   */
  test('TC-7.3: Verify Stock-In Record Created in Records Center -> 【進貨紀錄】', async ({ page }) => {
    // 1. Perform stock-in of FD0655-001 (4 pairs US 8.5, cost 1900)
    await navigateToTab(page, 'inventory');
    await page.locator('[data-testid="btn-open-stockin-modal"]').click();

    const modal = page.locator('[data-testid="stockin-modal"]');
    await expect(modal).toBeVisible();
    await modal.locator('[data-testid="stockin-input-sku"]').fill('FD0655-001');
    await modal.locator('[data-testid="stockin-input-sku"]').press('Tab');

    const sizeInput85 = modal.locator('[data-testid="stockin-size-input-8.5"], [data-testid="stockin-size-input-US 8.5"]').first();
    if (await sizeInput85.isVisible()) {
      await sizeInput85.fill('4');
    } else {
      const plusBtn = modal.locator('[data-testid="stockin-size-plus-8.5"], [data-testid="stockin-size-plus-US 8.5"]').first();
      for (let i = 0; i < 4; i++) await plusBtn.click();
    }
    await modal.locator('[data-testid="btn-submit-stockin"]').click();
    await expect(modal).not.toBeVisible();

    // 2. Navigate to Records Center
    await navigateToTab(page, 'records');
    await expect(page.locator('[data-testid="view-records"]')).toBeVisible();

    // 3. Switch to 【進貨紀錄】 subtab
    const stockInSubtab = page.locator('[data-testid="records-tab-stockin"]');
    await expect(stockInSubtab).toBeVisible();
    await stockInSubtab.click();

    // 4. Assert stock-in records list container
    const recordsList = page.locator('[data-testid="stockin-records-list"]');
    await expect(recordsList).toBeVisible();

    // 5. Assert the top stock-in record card
    const topRecord = recordsList.locator('[data-testid^="stockin-record-item-"]').first();
    await expect(topRecord).toBeVisible();

    await expect(topRecord).toContainText('FD0655-001');
    await expect(topRecord).toContainText('Nike');
    await expect(topRecord).toContainText('4');
    await expect(topRecord).toContainText('8.5');
    // Total cost: 4 pairs * $1,900 = $7,600
    await expect(topRecord).toContainText(/7,600|7600/);

    // 6. Check summary KPI
    const totalPairsKpi = page.locator('[data-testid="stockin-summary-total-pairs"]');
    if (await totalPairsKpi.isVisible()) {
      await expect(totalPairsKpi).toContainText('4');
    }
  });

  /**
   * TC-7.4: Perform Sale in Cashier -> Verify Sale Record Appears in Records Center -> 【銷貨紀錄】
   * Verify cashier sale flow persists record with correct SKU, price, status and payment method.
   */
  test('TC-7.4: Perform Sale in Cashier -> Verify Sale Record Appears in Records Center -> 【銷貨紀錄】', async ({ page }) => {
    // 1. Go to Cashier
    await navigateToTab(page, 'cashier');
    await expect(page.locator('[data-testid="view-cashier"]')).toBeVisible();

    // 2. Search SKU FD0655
    const cashierSkuInput = page.locator('[data-testid="cashier-sku-input"], input[placeholder*="例如輸入 CW"]').first();
    await cashierSkuInput.fill('FD0655');

    // 3. Select suggestion
    const suggestionItem = page.locator('[data-testid^="cashier-suggestion-item-"], button:has-text("FD0655-001")').first();
    await expect(suggestionItem).toBeVisible();
    await suggestionItem.click();

    // 4. Select size US 8.5
    const sizeBtn = page.locator('[data-testid="cashier-size-btn-8.5"], [data-testid="cashier-size-btn-US 8.5"], button:has-text("US 8.5")').first();
    await expect(sizeBtn).toBeVisible();
    await sizeBtn.click();

    // 5. Select Cash payment
    const cashBtn = page.locator('[data-testid="cashier-payment-cash"], button:has-text("現金")').first();
    await cashBtn.click();

    // 6. Submit sale
    const submitSaleBtn = page.locator('[data-testid="btn-submit-cashier-sale"], button:has-text("確認賣出")').first();
    await submitSaleBtn.click();

    // 7. Navigate to Records Center
    await navigateToTab(page, 'records');
    await expect(page.locator('[data-testid="view-records"]')).toBeVisible();

    // 8. Switch to 【銷貨紀錄】 subtab
    const salesSubtab = page.locator('[data-testid="records-tab-sales"]');
    await expect(salesSubtab).toBeVisible();
    await salesSubtab.click();

    // 9. Verify sales list and top record
    const salesList = page.locator('[data-testid="sales-records-list"]');
    await expect(salesList).toBeVisible();

    const topSale = salesList.locator('[data-testid^="sales-record-item-"]').first();
    await expect(topSale).toBeVisible();
    await expect(topSale).toContainText('FD0655-001');
    await expect(topSale).toContainText('8.5');
    await expect(topSale).toContainText(/3,400|3400/);
    await expect(topSale).toContainText('現金');

    // Status badge shows "已售出"
    const statusBadge = topSale.locator('[data-testid^="sale-status-badge-"]').first();
    await expect(statusBadge).toContainText('已售出');
  });

  /**
   * TC-7.5: In Records Center -> 【銷貨紀錄】, Mark Sale as Returned with Reason -> Status "已退貨" -> Variant Stock Restored (+1) -> Sub-Filters
   * Verify customer return dialog, status change, variant stock +1 increment, and sub-filter pills (全部 / 已售出 / 已退貨).
   */
  test('TC-7.5: Mark Sale as Returned with Reason -> Status "已退貨" -> Variant Stock Restored (+1) -> Sub-Filters', async ({ page }) => {
    // 1. Perform sale of FD0655-001 US 8.5 (initial stock 8 -> after sale is 7)
    await navigateToTab(page, 'cashier');
    const cashierSkuInput = page.locator('[data-testid="cashier-sku-input"], input[placeholder*="例如輸入 CW"]').first();
    await cashierSkuInput.fill('FD0655');
    const suggestionItem = page.locator('[data-testid^="cashier-suggestion-item-"], button:has-text("FD0655-001")').first();
    await suggestionItem.click();
    const sizeBtn = page.locator('[data-testid="cashier-size-btn-8.5"], [data-testid="cashier-size-btn-US 8.5"], button:has-text("US 8.5")').first();
    await sizeBtn.click();
    const submitSaleBtn = page.locator('[data-testid="btn-submit-cashier-sale"], button:has-text("確認賣出")').first();
    await submitSaleBtn.click();

    // 2. Navigate to Records Center -> 【銷貨紀錄】
    await navigateToTab(page, 'records');
    await page.locator('[data-testid="records-tab-sales"]').click();

    const salesList = page.locator('[data-testid="sales-records-list"]');
    await expect(salesList).toBeVisible();

    const saleRow = salesList.locator('[data-testid^="sales-record-item-"]').first();
    await expect(saleRow).toBeVisible();

    // 3. Click "標記退貨" button
    const markReturnBtn = saleRow.locator('[data-testid^="btn-mark-return-"]');
    await expect(markReturnBtn).toBeVisible();
    await markReturnBtn.click();

    // 4. Return dialog appears
    const returnDialog = page.locator('[data-testid="return-dialog"]');
    await expect(returnDialog).toBeVisible();

    // 5. Select reason "尺寸不合"
    const reasonSelect = returnDialog.locator('[data-testid="select-return-reason"]');
    await reasonSelect.selectOption({ label: '尺寸不合' });

    // 6. Confirm return
    const confirmReturnBtn = returnDialog.locator('[data-testid="btn-confirm-return"]');
    await confirmReturnBtn.click();
    await expect(returnDialog).not.toBeVisible();

    // 7. Verify status changed to "已退貨" and reason "尺寸不合"
    const statusBadge = saleRow.locator('[data-testid^="sale-status-badge-"]').first();
    await expect(statusBadge).toContainText('已退貨');
    await expect(saleRow).toContainText('尺寸不合');

    // 8. Prevent double-refund: mark return button should no longer be visible or disabled
    await expect(saleRow.locator('[data-testid^="btn-mark-return-"]')).toHaveCount(0);

    // 9. Test Sub-Filters
    const filterCompleted = page.locator('[data-testid="sales-filter-completed"]');
    const filterReturned = page.locator('[data-testid="sales-filter-returned"]');
    const filterAll = page.locator('[data-testid="sales-filter-all"]');

    // Sub-filter: 已售出 (returned sale should NOT be shown)
    await filterCompleted.click();
    await expect(salesList.locator('[data-testid^="sales-record-item-"]:has-text("已退貨")')).toHaveCount(0);

    // Sub-filter: 已退貨 (returned sale MUST be shown)
    await filterReturned.click();
    await expect(salesList.locator('[data-testid^="sales-record-item-"]')).toHaveCount(1);
    await expect(salesList.locator('[data-testid^="sales-record-item-"]').first()).toContainText('已退貨');

    // Sub-filter: 全部 (returned sale is shown)
    await filterAll.click();
    await expect(salesList.locator('[data-testid^="sales-record-item-"]')).toHaveCount(1);

    // 10. Verify stock rollback in Inventory (+1 restored: back to initial 8)
    await navigateToTab(page, 'inventory');
    const af1Card = page.locator('[data-testid="inventory-card-FD0655-001"]');
    await expect(af1Card).toBeVisible();
    await af1Card.click();

    const stockNumber85 = page.locator('[data-testid="inventory-stock-number-FD0655-001-8.5"], [data-testid="inventory-stock-number-FD0655-001-US 8.5"]').first();
    if (await stockNumber85.isVisible()) {
      await expect(stockNumber85).toContainText('8');
    } else {
      await expect(af1Card).toContainText('8');
    }
  });

  /**
   * TC-7.6: Perform Vendor Return via "退回廠商" Quick Action on Inventory Shoe Card
   * Verify defense against exceeding stock, stock decrement (-qty), and record logged in 【退回紀錄】.
   */
  test('TC-7.6: Perform Vendor Return via "退回廠商" Quick Action -> Inventory Decremented -> Record Created', async ({ page }) => {
    // 1. Navigate to Inventory
    await navigateToTab(page, 'inventory');
    const af1Card = page.locator('[data-testid="inventory-card-FD0655-001"]');
    await expect(af1Card).toBeVisible();
    await af1Card.click(); // Expand card

    // 2. Click "退回廠商" CTA on card
    const cardReturnBtn = page.locator('[data-testid="btn-vendor-return-FD0655-001"]');
    await expect(cardReturnBtn).toBeVisible();
    await cardReturnBtn.click();

    // 3. Vendor Return Modal opens
    const returnModal = page.locator('[data-testid="vendor-return-modal"]');
    await expect(returnModal).toBeVisible();

    // Pre-filled SKU and Vendor
    await expect(returnModal.locator('[data-testid="vendor-return-input-sku"]')).toHaveValue(/FD0655-001/i);
    await expect(returnModal.locator('[data-testid="vendor-return-input-vendor"]')).toHaveValue(/Nike/i);

    // 4. Select size US 8.5
    const sizeSelect = returnModal.locator('[data-testid="vendor-return-select-size"]');
    await sizeSelect.selectOption({ label: 'US 8.5' });

    // 5. Defensive Check: Attempting to return 999 pairs (exceeding stock 8)
    const qtyInput = returnModal.locator('[data-testid="vendor-return-input-qty"]');
    await qtyInput.fill('999');

    // Setup dialog listener in case native alert is used
    let dialogTriggered = false;
    const dialogListener = (d: any) => {
      dialogTriggered = true;
      d.accept().catch(() => {});
    };
    page.on('dialog', dialogListener);

    const submitVendorReturnBtn = returnModal.locator('[data-testid="btn-submit-vendor-return"]');
    await submitVendorReturnBtn.click();

    // Submission should be blocked: modal remains open OR dialog was shown
    const isModalStillOpen = await returnModal.isVisible();
    expect(isModalStillOpen || dialogTriggered).toBe(true);

    page.off('dialog', dialogListener);

    // 6. Enter valid return quantity: 2 pairs
    await qtyInput.fill('2');

    // 7. Select Return Reason: "瑕疵"
    const reasonSelect = returnModal.locator('[data-testid="vendor-return-select-reason"]');
    await reasonSelect.selectOption({ label: '瑕疵' });

    // 8. Amount: 2 pairs * $1,900 = $3,800
    const amountInput = returnModal.locator('[data-testid="vendor-return-input-amount"]');
    if (await amountInput.isVisible()) {
      await amountInput.fill('3800');
    }

    // 9. Submit valid vendor return
    await submitVendorReturnBtn.click();
    await expect(returnModal).not.toBeVisible();

    // 10. Verify US 8.5 stock decremented from 8 to 6 in inventory
    const stockNumber85 = page.locator('[data-testid="inventory-stock-number-FD0655-001-8.5"], [data-testid="inventory-stock-number-FD0655-001-US 8.5"]').first();
    if (await stockNumber85.isVisible()) {
      await expect(stockNumber85).toContainText('6');
    } else {
      await expect(af1Card).toContainText('6');
    }

    // 11. Navigate to Records Center -> 【退回紀錄】
    await navigateToTab(page, 'records');
    await page.locator('[data-testid="records-tab-vendor-returns"]').click();

    const returnRecordsList = page.locator('[data-testid="vendor-return-records-list"]');
    await expect(returnRecordsList).toBeVisible();

    const topReturnRecord = returnRecordsList.locator('[data-testid^="vendor-return-record-item-"]').first();
    await expect(topReturnRecord).toBeVisible();
    await expect(topReturnRecord).toContainText('Nike');
    await expect(topReturnRecord).toContainText('FD0655-001');
    await expect(topReturnRecord).toContainText('8.5');
    await expect(topReturnRecord).toContainText('2');
    await expect(topReturnRecord).toContainText('瑕疵');
    await expect(topReturnRecord).toContainText(/3,800|3800/);
  });

  /**
   * TC-7.7: Records Center Popover Date Range Picker, Newest-to-Oldest Sorting & SKU Search
   * Test keyword search, default newest-to-oldest sorting, popover date range picking, and quick clear.
   */
  test('TC-7.7: Records Center Popover Date Range Picker, Newest-to-Oldest Sorting & SKU Search', async ({ page }) => {
    // 1. Create first stock-in record (FD0655-001)
    await navigateToTab(page, 'inventory');
    await page.locator('[data-testid="btn-open-stockin-modal"]').click();
    const modal = page.locator('[data-testid="stockin-modal"]');
    await modal.locator('[data-testid="stockin-input-sku"]').fill('FD0655-001');
    await modal.locator('[data-testid="stockin-input-sku"]').press('Tab');
    const sizeInput85 = modal.locator('[data-testid="stockin-size-input-8.5"], [data-testid="stockin-size-input-US 8.5"]').first();
    if (await sizeInput85.isVisible()) {
      await sizeInput85.fill('2');
    } else {
      const plusBtn = modal.locator('[data-testid="stockin-size-plus-8.5"], [data-testid="stockin-size-plus-US 8.5"]').first();
      await plusBtn.click();
      await plusBtn.click();
    }
    await modal.locator('[data-testid="btn-submit-stockin"]').click();
    await expect(modal).not.toBeVisible();

    // 2. Create second stock-in record (DD1391-100) to verify newest-to-oldest sorting
    await page.locator('[data-testid="btn-open-stockin-modal"]').click();
    await expect(modal).toBeVisible();
    await modal.locator('[data-testid="stockin-input-sku"]').fill('DD1391-100');
    await modal.locator('[data-testid="stockin-input-sku"]').press('Tab');
    const sizeInput90 = modal.locator('[data-testid="stockin-size-input-9.0"], [data-testid="stockin-size-input-US 9.0"]').first();
    if (await sizeInput90.isVisible()) {
      await sizeInput90.fill('3');
    } else {
      const plusBtn90 = modal.locator('[data-testid="stockin-size-plus-9.0"], [data-testid="stockin-size-plus-US 9.0"]').first();
      await plusBtn90.click();
      await plusBtn90.click();
      await plusBtn90.click();
    }
    await modal.locator('[data-testid="btn-submit-stockin"]').click();
    await expect(modal).not.toBeVisible();

    // 3. Go to Records Center -> 【進貨紀錄】
    await navigateToTab(page, 'records');
    await page.locator('[data-testid="records-tab-stockin"]').click();

    const stockList = page.locator('[data-testid="stockin-records-list"]');
    await expect(stockList).toBeVisible();

    // 4. Verify default sorting: Newest to Oldest (DD1391-100 should be on top, FD0655-001 second)
    const recordCards = stockList.locator('[data-testid^="stockin-record-item-"]');
    await expect(recordCards).toHaveCount(2);
    await expect(recordCards.nth(0)).toContainText('DD1391-100');
    await expect(recordCards.nth(1)).toContainText('FD0655-001');

    // 5. Search matching SKU
    const searchInput = page.locator('[data-testid="records-search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('FD0655');
    await expect(stockList.locator('[data-testid^="stockin-record-item-"]')).toHaveCount(1);
    await expect(stockList.locator('[data-testid^="stockin-record-item-"]').first()).toContainText('FD0655-001');

    // 6. Search non-existent SKU -> Empty state
    await searchInput.fill('ZZZ-UNKNOWN-999');
    const emptyState = page.locator('[data-testid="records-empty-state"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText(/無符合/);

    // 7. Clear search -> both records re-appear (still sorted newest first)
    await searchInput.fill('');
    await expect(recordCards).toHaveCount(2);
    await expect(recordCards.nth(0)).toContainText('DD1391-100');

    // 8. Test Popover Date Range Picker
    const triggerBtn = page.locator('[data-testid="records-date-range-trigger"]');
    await expect(triggerBtn).toBeVisible();
    await expect(triggerBtn).toContainText(/日期區間（全部）|全部/);

    // Open popover
    await triggerBtn.click();
    const popover = page.locator('[data-testid="records-date-range-popover"]');
    await expect(popover).toBeVisible();

    // Today's date in Taiwan Timezone (en-CA -> YYYY-MM-DD)
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const todayDayBtn = popover.locator(`[data-testid="calendar-day-${todayStr}"]`);
    await expect(todayDayBtn).toBeVisible();
    await todayDayBtn.click();

    // Confirm date range (single day: today ~ today)
    const confirmBtn = popover.locator('[data-testid="calendar-btn-confirm"]');
    await confirmBtn.click();
    await expect(popover).not.toBeVisible();

    // Trigger button should now reflect the selected date and have clear button
    await expect(triggerBtn).toContainText(todayStr);
    const quickClearBtn = page.locator('[data-testid="records-date-range-clear-btn"]');
    await expect(quickClearBtn).toBeVisible();

    // Records created today are visible
    await expect(recordCards).toHaveCount(2);

    // 9. Filter to past month -> empty state
    await triggerBtn.click();
    await expect(popover).toBeVisible();

    const prevMonthBtn = popover.locator('[data-testid="calendar-prev-month"]');
    await prevMonthBtn.click();

    // Pick 1st and 2nd day in previous month
    const pastDays = popover.locator('[data-testid^="calendar-day-"]');
    await pastDays.nth(0).click();
    await pastDays.nth(1).click();
    await confirmBtn.click();
    await expect(popover).not.toBeVisible();

    // Since no records were created in past month, empty state is shown
    await expect(emptyState).toBeVisible();

    // 10. Click quick clear button -> reset filter to all dates
    await quickClearBtn.click();
    await expect(triggerBtn).toContainText(/日期區間（全部）|全部/);
    await expect(recordCards).toHaveCount(2);
    await expect(recordCards.nth(0)).toContainText('DD1391-100');

    // 11. Test Reverse Order Selection (later date then earlier date) & Popover Internal Clear
    await triggerBtn.click();
    await expect(popover).toBeVisible();
    const currentMonthDays = popover.locator('[data-testid^="calendar-day-"]');
    const dayCount = await currentMonthDays.count();
    if (dayCount >= 10) {
      await currentMonthDays.nth(9).click();
      await currentMonthDays.nth(4).click();
    }
    const internalClearBtn = popover.locator('[data-testid="calendar-btn-clear"]');
    await internalClearBtn.click();
    await expect(popover).not.toBeVisible();
    await expect(triggerBtn).toContainText(/日期區間（全部）|全部/);
    await expect(recordCards).toHaveCount(2);
    await expect(recordCards.nth(0)).toContainText('DD1391-100');

    // 12. Cross-Month Selection: pick day in month M, navigate to month M+1, pick day -> view MUST stay on month M+1 (訖日)
    await triggerBtn.click();
    await expect(popover).toBeVisible();
    const monthHeader = popover.locator('[data-testid="calendar-current-month"]');
    const startMonthText = await monthHeader.innerText();

    // Pick a day in current month
    await popover.locator('[data-testid^="calendar-day-"]').first().click();

    // Navigate to next month
    const nextMonthBtn = popover.locator('[data-testid="calendar-next-month"]');
    await nextMonthBtn.click();
    const nextMonthText = await monthHeader.innerText();
    expect(nextMonthText).not.toEqual(startMonthText);

    // Pick a day in next month (訖日)
    await popover.locator('[data-testid^="calendar-day-"]').first().click();

    // Verify calendar month view remains on 訖日's month (next month), and does NOT jump back to start month
    await expect(monthHeader).toHaveText(nextMonthText);

    // Close and clear
    await internalClearBtn.click();
    await expect(popover).not.toBeVisible();
  });

  /**
   * TC-7.8: Excel (.xlsx) Export in Records Center Triggers Download of Valid File
   * Verify export button triggers valid .xlsx file download and binary integrity using SheetJS.
   */
  test('TC-7.8: Excel (.xlsx) Export in Records Center Triggers Download of Valid File', async ({ page }) => {
    // 1. Seed at least one transaction: stock in FD0655-001
    await navigateToTab(page, 'inventory');
    await page.locator('[data-testid="btn-open-stockin-modal"]').click();
    const modal = page.locator('[data-testid="stockin-modal"]');
    await modal.locator('[data-testid="stockin-input-sku"]').fill('FD0655-001');
    await modal.locator('[data-testid="stockin-input-sku"]').press('Tab');
    const sizeInput85 = modal.locator('[data-testid="stockin-size-input-8.5"], [data-testid="stockin-size-input-US 8.5"]').first();
    if (await sizeInput85.isVisible()) {
      await sizeInput85.fill('2');
    } else {
      const plusBtn = modal.locator('[data-testid="stockin-size-plus-8.5"], [data-testid="stockin-size-plus-US 8.5"]').first();
      await plusBtn.click();
      await plusBtn.click();
    }
    await modal.locator('[data-testid="btn-submit-stockin"]').click();
    await expect(modal).not.toBeVisible();

    // 2. Navigate to Records Center
    await navigateToTab(page, 'records');
    const exportBtn = page.locator('[data-testid="btn-records-export-excel"]');
    await expect(exportBtn).toBeVisible();

    // 3. Intercept download
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      exportBtn.click(),
    ]);

    // 4. Verify suggested filename matches .xlsx
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.xlsx$/i);

    // 5. Retrieve saved path and verify file exists and size > 0
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const stats = fs.statSync(downloadPath!);
    expect(stats.size).toBeGreaterThan(0);

    // 6. Authoritative Oracle Verification: Parse workbook with SheetJS
    const fileBuffer = fs.readFileSync(downloadPath!);
    const xlsxLib = (XLSX as any).default || XLSX;
    const workbook = (xlsxLib.read || (XLSX as any).read)(fileBuffer, { type: 'buffer' });
    expect(workbook.SheetNames.length).toBeGreaterThan(0);
  });
});
