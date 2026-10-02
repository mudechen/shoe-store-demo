import { test, expect } from '@playwright/test';

/**
 * Tier 4: Real-World Scenarios & Mobile Ergonomics (F13, F14, F16)
 * Verifies real retail operational conditions:
 * - Mobile 390x844 zero horizontal page overflow
 * - Sub-2-click rapid deduction flow
 * - Complete clerk customer service scenario (search -> shelf locate -> deduct -> status verify)
 */
test.describe('Tier 4: Real-World Mobile Workloads & Ergonomics', () => {
  // Enforce mobile 390x844 viewport and touch emulation
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="matrix-table"]')).toBeVisible({ timeout: 10000 });
  });

  test('TC-4.1: Mobile viewport (390x844) has zero horizontal page-level overflow', async ({ page }) => {
    // Assert root document has no horizontal overflow
    const overflowMetrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        windowInnerWidth: window.innerWidth,
        hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth,
      };
    });

    expect(overflowMetrics.hasHorizontalOverflow).toBe(false);
    expect(overflowMetrics.docScrollWidth).toBeLessThanOrEqual(overflowMetrics.docClientWidth);
    expect(overflowMetrics.windowInnerWidth).toBe(390);

    // Verify sticky frozen column structure
    const stickyHeader = page.locator('.matrix-sticky-col').first();
    await expect(stickyHeader).toBeVisible();

    const positionType = await stickyHeader.evaluate((el) => window.getComputedStyle(el).position);
    expect(positionType).toBe('sticky');

    // Verify touch targets satisfy accessibility minimums (>= 40px)
    const firstCell = page.locator('[data-testid^="size-cell-"]').first();
    const cellBox = await firstCell.boundingBox();
    expect(cellBox).not.toBeNull();
    expect(cellBox!.width).toBeGreaterThanOrEqual(40);
    expect(cellBox!.height).toBeGreaterThanOrEqual(40);
  });

  test('TC-4.2: Sub-2-click rapid deduction flow completes in exactly 2 clicks', async ({ page }) => {
    // Air Force 1 US 8.5 (FD0655-001) has 8 pairs initial stock
    const targetCell = page.locator('[data-testid="size-cell-FD0655-001-8.5"]');
    await expect(targetCell).toBeVisible();

    const initialStockText = await targetCell.locator('.stock-number').innerText();
    const initialStock = parseInt(initialStockText, 10);
    expect(initialStock).toBeGreaterThan(0);

    const startTime = Date.now();

    // ==========================================
    // 【CLICK 1】: Tap size cell to open popover
    // ==========================================
    await targetCell.click();

    const deductPopover = page.locator('[data-testid="deduct-popover"]');
    await expect(deductPopover).toBeVisible();

    const deductBtn = deductPopover.locator('[data-testid="btn-deduct-one"]');
    await expect(deductBtn).toBeVisible();
    await expect(deductBtn).toBeEnabled();

    // ==========================================
    // 【CLICK 2】: Tap [-1 售出] button to deduct
    // ==========================================
    await deductBtn.click();

    // Verify stock immediately updates to (initialStock - 1)
    await expect(targetCell.locator('.stock-number')).toHaveText(String(initialStock - 1));

    const elapsed = Date.now() - startTime;
    // Fast optimistic update should be well under 1000ms
    expect(elapsed).toBeLessThan(2000);
  });

  test('TC-4.3: End-to-end retail clerk workflow: search -> shelf check -> deduct -> verify status', async ({ page }) => {
    // Step 1: Customer requests "Dunk Low" size US 7.0
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('Dunk');

    // Step 2: Catalog filters down to Dunk Low Retro
    const dunkRow = page.locator('[data-testid="product-row-DD1391-100"]');
    await expect(dunkRow).toBeVisible();
    await expect(page.locator('[data-testid="product-row-FD0655-001"]')).not.toBeVisible();

    // Step 3: Clerk inspects US 7.0 stock (DD1391-100 seed stock for 7.0 is 1 pair)
    const dunkCell = page.locator('[data-testid="size-cell-DD1391-100-7.0"]');
    await expect(dunkCell).toBeVisible();
    await expect(dunkCell.locator('.stock-number')).toHaveText('1');

    // Step 4: Clerk taps cell to view physical location
    await dunkCell.click();
    const popover = page.locator('[data-testid="deduct-popover"]');
    await expect(popover).toBeVisible();
    await expect(popover).toContainText('A-01-L3');
    await expect(popover).toContainText('R1-C01-L2');

    // Step 5: Clerk navigates to shelf
    await popover.locator('[data-testid="btn-locate-shelf"]').click();
    await expect(page.locator('text=實體定位導航中')).toBeVisible();

    // Step 6: Customer purchases the last pair -> Clerk deducts stock
    await dunkCell.click();
    await expect(popover).toBeVisible();
    await popover.locator('[data-testid="btn-deduct-one"]').click();

    // Step 7: Toast confirmation appears
    await expect(page.locator('text=已扣減出庫 1 雙')).toBeVisible();

    // Step 8: Stock drops to 0 -> cell turns into out-of-stock ('stock-out', 0 雙)
    await expect(dunkCell.locator('.stock-number')).toHaveText('0');
    await expect(dunkCell).toHaveClass(/stock-out|bg-\[#FEE2E2\]/);
    await expect(dunkCell).toContainText('0雙');

    // Step 9: Clerk clears search to reset interface for next customer
    await page.locator('button:has-text("清除")').click();
    await expect(page.locator('[data-testid="matrix-table"] tbody tr[data-testid^="product-row-"]')).toHaveCount(24);
  });
});
