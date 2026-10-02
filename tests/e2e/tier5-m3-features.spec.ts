import { test, expect } from '@playwright/test';

/**
 * Tier 5: Milestone M3 Verification Tests
 * Verifies:
 * - F13: Mobile 390x844 responsive ergonomics across Scanner & Dashboard
 * - F14: Sub-2-click rapid deduction flow
 * - F15: Barcode Scanner modal & mock selector
 * - F16: Dual-tier Realtime Sync status indicator & broadcast updates
 * - F17: Inventory Health & Replenishment Dashboard (HealthMetrics, RestockAlerts, turnover gauge)
 */
test.describe('Tier 5: Milestone M3 Features & Mobile Ergonomics', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="matrix-table"]')).toBeVisible({ timeout: 10000 });
  });

  test('TC-5.1: Barcode Scanner modal opens and mock selector simulates instant product scan & 1-tap deduction', async ({ page }) => {
    // 1. Open barcode scanner from header
    const scannerBtn = page.locator('[data-testid="btn-open-scanner"]');
    await expect(scannerBtn).toBeVisible();
    await scannerBtn.click();

    // 2. Scanner modal dialog should appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('手機掃碼極速調庫');

    // 3. Switch to mock selector tab
    await modal.locator('button:has-text("模擬快選")').click();

    // 4. Select Nike AF1 from mock dropdown
    const mockSelect = modal.locator('[data-testid="mock-barcode-select"]');
    await expect(mockSelect).toBeVisible();
    await mockSelect.selectOption('196607831001');

    // 5. Product card displays Air Force 1 details
    await expect(modal).toContainText("Air Force 1 '07");
    await expect(modal).toContainText('A-01-L2'); // Display location
    await expect(modal).toContainText('R1-C01-L3'); // Storage location

    // 6. 1-tap rapid deduction
    const deductBtn = modal.locator('[data-testid="btn-scanner-deduct"]');
    await expect(deductBtn).toBeVisible();
    await expect(deductBtn).toBeEnabled();
    await expect(deductBtn).toContainText('確認售出 -1 雙');

    await deductBtn.click();

    // Feedback confirms deduction
    await expect(modal).toContainText('已出庫扣減 1 雙');

    // Close scanner modal
    await modal.locator('button:has-text("完成關閉")').click();
    await expect(modal).not.toBeVisible();
  });

  test('TC-5.2: Barcode Scanner manual SKU search and physical shelf navigation linkage', async ({ page }) => {
    // Open scanner modal
    await page.locator('[data-testid="btn-open-scanner"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Switch to manual input tab
    await modal.locator('button:has-text("手動輸入")').click();

    // Search for New Balance 9060 by SKU
    const input = modal.locator('#manual-barcode-input');
    await input.fill('U9060ECA');
    await modal.locator('button:has-text("搜尋調出")').click();

    // Verify product card matches NB 9060
    await expect(modal).toContainText('9060');
    await expect(modal).toContainText('New Balance');
    await expect(modal).toContainText('A-03-L2');
    await expect(modal).toContainText('R2-C01-L3');

    // Click shelf navigation button inside modal
    const locateBtn = modal.locator('button:has-text("架位導航")');
    await expect(locateBtn).toBeVisible();
    await locateBtn.click();

    // Modal closes and active navigation banner appears on page
    await expect(modal).not.toBeVisible();
    const navBanner = page.locator('text=實體定位導航中');
    await expect(navBanner).toBeVisible();
    await expect(navBanner).toContainText('A-03-L2');
  });

  test('TC-5.3: Dual-tier Realtime Sync indicator shows healthy synchronization status', async ({ page }) => {
    const indicator = page.locator('[data-testid="sync-status-indicator"]');
    await expect(indicator).toBeVisible();
    // Must contain '同步' per TC-1.1 requirement
    await expect(indicator).toContainText('同步');

    // Verify animated pulse icon
    const icon = indicator.locator('svg');
    await expect(icon).toBeVisible();
    await expect(icon).toHaveClass(/animate-pulse/);
  });

  test('TC-5.4: Inventory Health & Replenishment Dashboard calculates metrics and exports restock PO', async ({ page }) => {
    // Switch to Business Dashboard view
    const dashboardBtn = page.locator('button:has-text("經營儀表板")');
    await expect(dashboardBtn).toBeVisible();
    await dashboardBtn.click();

    // Verify Health Metrics section
    await expect(page.locator('text=門市庫存健康度與週轉動態指標')).toBeVisible();

    // Verify presence of 3 inventory health category counts
    const outCount = page.locator('[data-testid="out-of-stock-count"]');
    const warnCount = page.locator('[data-testid="warning-count"]');
    const suffCount = page.locator('[data-testid="sufficient-count"]');

    await expect(outCount).toBeVisible();
    await expect(warnCount).toBeVisible();
    await expect(suffCount).toBeVisible();

    const outVal = parseInt((await outCount.textContent()) || '0', 10);
    const warnVal = parseInt((await warnCount.textContent()) || '0', 10);
    const suffVal = parseInt((await suffCount.textContent()) || '0', 10);

    expect(outVal).toBeGreaterThan(0);
    expect(warnVal).toBeGreaterThan(0);
    expect(suffVal).toBeGreaterThan(0);

    // Verify turnover gauge
    await expect(page.locator('text=全店預估週轉天數分析')).toBeVisible();
    await expect(page.locator('text=預估庫存週轉：')).toBeVisible();

    // Verify Restock Alerts section
    await expect(page.locator('text=智慧斷碼分析與補貨採購建議')).toBeVisible();

    // Test Restock Purchase Order Excel export
    const exportBtn = page.locator('[data-testid="btn-export-excel-restock"]');
    await expect(exportBtn).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportBtn.click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/鞋店補貨採購單.*\.xlsx$/i);
  });

  test('TC-5.5: Mobile Viewport (390x844) zero horizontal overflow in Dashboard & Scanner', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Check root page overflow on mobile in default view
    const overflowMetrics = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        hasOverflow: doc.scrollWidth > doc.clientWidth,
      };
    });
    expect(overflowMetrics.hasOverflow).toBe(false);

    // 2. Open Scanner Modal on mobile and verify no overflow
    await page.locator('[data-testid="btn-open-scanner"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    const modalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth;
    });
    expect(modalOverflow).toBe(false);

    await modal.locator('button[aria-label="關閉"]').click();
    await expect(modal).not.toBeVisible();

    // 3. Switch to Dashboard on mobile and verify zero overflow
    await page.locator('button:has-text("經營儀表板")').click();
    await expect(page.locator('text=門市庫存健康度與週轉動態指標')).toBeVisible();

    const dashboardOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth;
    });
    expect(dashboardOverflow).toBe(false);
  });
});
