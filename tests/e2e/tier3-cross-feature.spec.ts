import { test, expect } from '@playwright/test';

/**
 * Tier 3: Cross-Feature Integration Tests (F04, F05, F09~F12, F14)
 * Verifies cross-module interactions:
 * - Shoe selection -> physical shelf location navigation and highlighting
 * - Shelf slot interaction and reverse lookup drawer
 * - Stock deduction driving real-time color transitions (Green -> Yellow -> Red)
 */
test.describe('Tier 3: Cross-Feature Linkages & State Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="matrix-table"]')).toBeVisible({ timeout: 10000 });
  });

  // Temporarily skipped while 2D Spatial Map is removed. Can be re-enabled when shelf map is restored.
  test.skip('TC-3.1: Shoe selection activates physical shelf location navigation', async ({ page }) => {
    // Air Force 1 '07: displayLocation 'A-01-L2', storageLocation 'R1-C01-L3'
    const targetCell = page.locator('[data-testid="size-cell-FD0655-001-8.0"]');
    await expect(targetCell).toBeVisible();

    // Click cell to open popover
    await targetCell.click();
    const popover = page.locator('[data-testid="deduct-popover"]');
    await expect(popover).toBeVisible();

    // Click "架位" button to trigger physical shelf localization
    const locateBtn = popover.locator('[data-testid="btn-locate-shelf"]');
    await expect(locateBtn).toBeVisible();
    await locateBtn.click();

    // Active navigation banner should appear
    const navBanner = page.locator('text=實體定位導航中');
    await expect(navBanner).toBeVisible();
    await expect(navBanner).toContainText('R1-C01-L3');

    // Unconditionally scroll into view and verify slot highlight styling in 2D Spatial Map
    const backroomSlot = page.locator('[data-testid="shelf-slot-R1-C01-L3"]');
    await backroomSlot.scrollIntoViewIfNeeded();
    await expect(backroomSlot).toBeVisible();
    await expect(backroomSlot).toHaveClass(/animate-pulse|ring|active/);

    // Dismiss active navigation
    const closeNavBtn = page.locator('button:has-text("關閉導航")');
    await closeNavBtn.click();
    await expect(navBanner).not.toBeVisible();
  });

  // Temporarily skipped while 2D Spatial Map is removed. Can be re-enabled when shelf map is restored.
  test.skip('TC-3.2: Shelf slot interaction and inventory lookup', async ({ page }) => {
    // In table, verify shelf location shortcuts in product row
    const row = page.locator('[data-testid="product-row-FD0655-001"]');
    await expect(row).toBeVisible();

    const storageTag = row.locator('text=R1-C01-L3');
    await expect(storageTag).toBeVisible();
    await storageTag.click();

    // Navigation banner triggers
    const navBanner = page.locator('text=實體定位導航中');
    await expect(navBanner).toBeVisible();
    await expect(navBanner).toContainText('R1-C01-L3');

    // Unconditionally scroll to and click shelf slot to open Shelf Detail Drawer
    const slot = page.locator('[data-testid="shelf-slot-R1-C01-L3"]');
    await slot.scrollIntoViewIfNeeded();
    await expect(slot).toBeVisible();
    await slot.click();

    // Verify shelf drawer opens and displays shoe info (AC-6)
    const drawer = page.locator('[data-testid="shelf-drawer"]');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(/Air Force|FD0655|Nike/);

    // Verify shelf drawer item and detailed size matrix / deduction controls
    const drawerItem = drawer.locator('[data-testid="shelf-drawer-item"]');
    await expect(drawerItem.first()).toBeVisible();
    await expect(drawer).toContainText('尺碼在庫矩陣與極速出庫');
    await expect(drawer.locator('button[title*="出庫"]').first()).toBeVisible();
    await expect(drawer.locator('button[title*="補貨"]').first()).toBeVisible();
  });

  test('TC-3.3: Rapid stock deduction cascades immediately to heatmap colors and inventory metrics', async ({ page }) => {
    // Air Force 1 US 8.0 initial stock is 5 (>= 3: Green / 'stock-healthy')
    const cell = page.locator('[data-testid="size-cell-FD0655-001-8.0"]');
    await expect(cell).toBeVisible();
    await expect(cell).toHaveClass(/stock-healthy|bg-\[#D1FAE5\]/);
    await expect(cell.locator('.stock-number')).toHaveText('5');

    // Click cell to open popover
    await cell.click();
    const popover = page.locator('[data-testid="deduct-popover"]');
    await expect(popover).toBeVisible();

    const deductBtn = popover.locator('[data-testid="btn-deduct-one"]');
    await expect(deductBtn).toBeVisible();
    await expect(deductBtn).toContainText('-1 售出');

    // Deduction 1: 5 -> 4
    await deductBtn.click();
    await expect(cell.locator('.stock-number')).toHaveText('4');
    await expect(cell).toHaveClass(/stock-healthy|bg-\[#D1FAE5\]/);

    // Deduction 2: 4 -> 3
    await deductBtn.click();
    await expect(cell.locator('.stock-number')).toHaveText('3');
    await expect(cell).toHaveClass(/stock-healthy|bg-\[#D1FAE5\]/);

    // Deduction 3: 3 -> 2 (Critical threshold: drops into Yellow / 'stock-warning')
    await deductBtn.click();
    await expect(cell.locator('.stock-number')).toHaveText('2');
    await expect(cell).toHaveClass(/stock-warning|bg-\[#FEF3C7\]/);
    await expect(popover.locator('[data-testid="stock-badge"]')).toContainText('2 雙');

    // Deduction 4: 2 -> 1
    await deductBtn.click();
    await expect(cell.locator('.stock-number')).toHaveText('1');
    await expect(cell).toHaveClass(/stock-warning|bg-\[#FEF3C7\]/);

    // Deduction 5: 1 -> 0 (Zero stock threshold: drops into Red / 'stock-out')
    await deductBtn.click();
    await expect(cell.locator('.stock-number')).toHaveText('0');
    await expect(cell).toHaveClass(/stock-out|bg-\[#FEE2E2\]/);
    await expect(cell).toContainText('0雙');
    await expect(popover.locator('[data-testid="stock-badge"]')).toContainText('0 雙');

    // Deduction button must now be disabled
    await expect(deductBtn).toBeDisabled();
    await expect(deductBtn).toContainText('斷碼缺貨');

    // Verify Restock (+1) button recovers the stock
    const restockBtn = popover.locator('button[title="補貨 +1 雙"]');
    await expect(restockBtn).toBeVisible();
    await restockBtn.click();

    await expect(cell.locator('.stock-number')).toHaveText('1');
    await expect(cell).toHaveClass(/stock-warning|bg-\[#FEF3C7\]/);
    await expect(deductBtn).toBeEnabled();
    await expect(deductBtn).toContainText('-1 售出');
  });
});
