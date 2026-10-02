import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Tier 2: Boundary & Corner Cases (F01, F02, F04, F07)
 * Verifies defensive handling and edge conditions:
 * - Rejection of invalid Excel with dirty non-numeric data
 * - Defense against negative stock quantities
 * - Extreme size boundaries (US 6.0 and US 12.0)
 * - Empty state search fallback
 * - Valid spreadsheet re-import and records merge
 */
test.describe('Tier 2: Boundary & Corner Case Defenses', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="matrix-table"]')).toBeVisible({ timeout: 10000 });
  });

  test('TC-2.1: Invalid Excel with non-numeric sizes shows validation error alert and blocks dirty data', async ({ page }) => {
    // Open import modal
    const importBtn = page.locator('[data-testid="btn-import-excel"]');
    await importBtn.click();

    const modal = page.locator('[data-testid="excel-preview-modal"]');
    await expect(modal).toBeVisible();

    // Upload corrupted test file containing non-numeric strings ("五雙", "abc")
    const corruptedFilePath = path.resolve(process.cwd(), 'fixtures/corrupted_shoes.csv');
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles(corruptedFilePath);

    // Validation error banner must be rendered
    const errorBanner = page.locator('[data-testid="validation-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('資料格式檢核未通過');

    // Confirm button MUST be disabled to guard database integrity
    const confirmBtn = page.locator('[data-testid="btn-confirm-import"]');
    await expect(confirmBtn).toBeDisabled();

    // Error badge should appear in the preview table
    await expect(modal.locator('.error-cell-badge').first()).toBeVisible();

    // Close modal without saving
    await modal.locator('button:has-text("取消")').click();
    await expect(modal).not.toBeVisible();

    // Inventory table must remain uncontaminated with clean 24 seed products
    const rows = page.locator('[data-testid="matrix-table"] tbody tr[data-testid^="product-row-"]');
    await expect(rows).toHaveCount(24);
  });

  test('TC-2.2: Negative stock defense in Excel import and UI out-of-stock cell deduction prevention', async ({ page }) => {
    // 1. In Excel import: negative quantity is blocked
    const importBtn = page.locator('[data-testid="btn-import-excel"]');
    await importBtn.click();

    const modal = page.locator('[data-testid="excel-preview-modal"]');
    await expect(modal).toBeVisible();

    const corruptedFilePath = path.resolve(process.cwd(), 'fixtures/corrupted_shoes.csv');
    await page.locator('[data-testid="file-upload-input"]').setInputFiles(corruptedFilePath);

    const errorBanner = page.locator('[data-testid="validation-error-banner"]');
    await expect(errorBanner).toBeVisible();
    // Negative number error message
    await expect(errorBanner).toContainText(/必須為非負整數|不可為負數/);
    await expect(page.locator('[data-testid="btn-confirm-import"]')).toBeDisabled();

    await modal.locator('button:has-text("取消")').click();

    // 2. In UI: out-of-stock cell (stock = 0) disables deduction
    // Air Force 1 US 6.0 has 0 stock
    const cellZero = page.locator('[data-testid="size-cell-FD0655-001-6.0"]');
    await expect(cellZero).toBeVisible();
    await expect(cellZero.locator('.stock-number')).toHaveText('0');

    // Click cell to open popover
    await cellZero.click();
    const popover = page.locator('[data-testid="deduct-popover"]');
    await expect(popover).toBeVisible();

    // The -1 deduction button MUST be disabled
    const deductBtn = page.locator('[data-testid="btn-deduct-one"]');
    await expect(deductBtn).toBeDisabled();
    await expect(deductBtn).toContainText('斷碼缺貨');

    // Clicking disabled button should not decrease stock below 0
    await deductBtn.click({ force: true });
    await expect(cellZero.locator('.stock-number')).toHaveText('0');
  });

  test('TC-2.3: Boundary sizes (US 6.0 and US 12.0) render and operate properly without layout truncation', async ({ page }) => {
    const table = page.locator('[data-testid="matrix-table"]');

    // 1. Lower boundary size US 6.0
    const cell60 = page.locator('[data-testid="size-cell-FD0655-001-6.0"]');
    await expect(cell60).toBeVisible();
    const box60 = await cell60.boundingBox();
    expect(box60).not.toBeNull();
    expect(box60!.width).toBeGreaterThanOrEqual(38);
    expect(box60!.height).toBeGreaterThanOrEqual(40);

    // Click US 6.0 to verify popover shows correct conversions
    await cell60.click();
    const popover60 = page.locator('[data-testid="deduct-popover"]');
    await expect(popover60).toBeVisible();
    await expect(popover60).toContainText('US 6.0');
    await expect(popover60).toContainText('EU 38.5');
    await expect(popover60).toContainText('24.0cm');
    await popover60.locator('button[aria-label="關閉"]').click();

    // 2. Upper boundary size US 12.0
    const cell120 = page.locator('[data-testid="size-cell-FD0655-001-12.0"]');
    await cell120.scrollIntoViewIfNeeded();
    await expect(cell120).toBeVisible();

    const box120 = await cell120.boundingBox();
    expect(box120).not.toBeNull();
    expect(box120!.width).toBeGreaterThanOrEqual(38);
    expect(box120!.height).toBeGreaterThanOrEqual(40);

    // Click US 12.0 to verify popover shows correct conversions
    await cell120.click();
    const popover120 = page.locator('[data-testid="deduct-popover"]');
    await expect(popover120).toBeVisible();
    await expect(popover120).toContainText('US 12.0');
    await expect(popover120).toContainText('EU 46');
    await expect(popover120).toContainText('30.0cm');
    await popover120.locator('button[aria-label="關閉"]').click();
  });

  test('TC-2.4: Search with nonexistent query displays clear empty state message', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]');

    // Type query guaranteed not to match
    await searchInput.fill('ZZZ-NONEXISTENT-MODEL-99999');

    // Matrix table should not be displayed, empty state message must be shown
    await expect(page.locator('[data-testid="matrix-table"]')).not.toBeVisible();
    await expect(page.locator('text=查無符合條件的鞋款')).toBeVisible();
    await expect(page.locator('text=請嘗試變更搜尋關鍵字或品牌篩選條件')).toBeVisible();

    // Clear search using clear button
    const clearBtn = page.locator('button:has-text("清除")');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Matrix table must re-appear with 24 products
    await expect(page.locator('[data-testid="matrix-table"]')).toBeVisible();
    const rows = page.locator('[data-testid="matrix-table"] tbody tr[data-testid^="product-row-"]');
    await expect(rows).toHaveCount(24);
  });

  test('TC-2.5: Re-uploading valid Excel template successfully imports and merges records', async ({ page }) => {
    // Ensure the novel test model is NOT in DOM prior to import
    await expect(page.locator('[data-testid="product-row-IMP-TEST-NEW-01"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="matrix-table"] tbody tr[data-testid^="product-row-"]')).toHaveCount(24);

    // Open import modal
    await page.locator('[data-testid="btn-import-excel"]').click();
    const modal = page.locator('[data-testid="excel-preview-modal"]');
    await expect(modal).toBeVisible();

    // Upload valid CSV fixture
    const validFilePath = path.resolve(process.cwd(), 'fixtures/valid_sample_shoes.csv');
    await page.locator('[data-testid="file-upload-input"]').setInputFiles(validFilePath);

    // Confirm error banner is NOT present
    await expect(page.locator('[data-testid="validation-error-banner"]')).not.toBeVisible();

    // Confirm button must be enabled
    const confirmBtn = page.locator('[data-testid="btn-confirm-import"]');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Modal closes
    await expect(modal).not.toBeVisible();

    // Genuinely prove that Excel import engine converts and mounts the new record into the database
    const newProductRow = page.locator('[data-testid="product-row-IMP-TEST-NEW-01"]');
    await expect(newProductRow).toBeVisible();
    await expect(newProductRow).toContainText('Speed Runner Pro');
    await expect(newProductRow).toContainText('TestBrand');

    // Total product rows should now increase to 25
    await expect(page.locator('[data-testid="matrix-table"] tbody tr[data-testid^="product-row-"]')).toHaveCount(25);

    // Verify existing updated models remain visible
    await expect(page.locator('[data-testid="product-row-FD0655-001"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-row-DD1391-100"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-row-U9060ECA"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-row-B75806"]')).toBeVisible();
  });
});
