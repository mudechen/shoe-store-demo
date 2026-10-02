import { test, expect } from '@playwright/test';

/**
 * Tier 1: Core Feature Tests (F01~F08)
 * Verifies foundational capabilities:
 * - 24 seed shoes loading
 * - Size matrix 3-tier color heatmap (red/yellow/green)
 * - Multi-standard size unit toggle (US/EU/CM)
 * - Keyword search & brand filtering
 * - Template download and Excel export
 */
test.describe('Tier 1: Core Feature Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure deterministic default seed state
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="matrix-table"]')).toBeVisible({ timeout: 10000 });
  });

  test('TC-1.1: Page loads with 24 seed shoes visible in matrix table', async ({ page }) => {
    const table = page.locator('[data-testid="matrix-table"]');
    await expect(table).toBeVisible();

    // Verify all 24 product rows render
    const rows = table.locator('tbody tr[data-testid^="product-row-"]');
    await expect(rows).toHaveCount(24);

    // Verify presence of signature models across multiple major brands
    await expect(page.locator('[data-testid="product-row-FD0655-001"]')).toBeVisible(); // Nike Air Force 1
    await expect(page.locator('[data-testid="product-row-DD1391-100"]')).toBeVisible(); // Nike Dunk Low
    await expect(page.locator('[data-testid="product-row-FD2722-100"]')).toBeVisible(); // Nike Pegasus 41
    await expect(page.locator('[data-testid="product-row-U9060ECA"]')).toBeVisible();   // New Balance 9060
    await expect(page.locator('[data-testid="product-row-B75806"]')).toBeVisible();     // Adidas Samba OG

    // Realtime sync indicator should be healthy
    const syncIndicator = page.locator('[data-testid="sync-status-indicator"]');
    await expect(syncIndicator).toBeVisible();
    await expect(syncIndicator).toContainText('同步');

    // Aggregate inventory stats should be positive
    const outCount = page.locator('[data-testid="out-of-stock-count"]');
    const warnCount = page.locator('[data-testid="warning-count"]');
    const suffCount = page.locator('[data-testid="sufficient-count"]');

    await expect(outCount).toBeVisible();
    await expect(warnCount).toBeVisible();
    await expect(suffCount).toBeVisible();

    const outVal = parseInt((await outCount.textContent()) || '0', 10);
    const suffVal = parseInt((await suffCount.textContent()) || '0', 10);
    expect(outVal).toBeGreaterThan(0);
    expect(suffVal).toBeGreaterThan(0);
  });

  test('TC-1.2: Size matrix renders red/yellow/green cells corresponding to exact stock quantities', async ({ page }) => {
    // Air Force 1 '07 (FD0655-001) seed stocks: [0, 0, 1, 3, 5, 8, 7, 5, 4, 2, 1, 0, 0]
    // US 6.0: 0 pairs -> Red / 'stock-out'
    const cell60 = page.locator('[data-testid="size-cell-FD0655-001-6.0"]');
    await expect(cell60).toBeVisible();
    await expect(cell60).toHaveClass(/stock-out|bg-\[#FEE2E2\]/);
    await expect(cell60.locator('.stock-number')).toHaveText('0');
    await expect(cell60).toContainText('0雙');

    // US 7.0: 1 pair -> Yellow / 'stock-warning' (1~2 pairs)
    const cell70 = page.locator('[data-testid="size-cell-FD0655-001-7.0"]');
    await expect(cell70).toBeVisible();
    await expect(cell70).toHaveClass(/stock-warning|bg-\[#FEF3C7\]/);
    await expect(cell70.locator('.stock-number')).toHaveText('1');
    await expect(cell70).toContainText('1雙');

    // US 8.0: 5 pairs -> Green / 'stock-healthy' (>= 3 pairs)
    const cell80 = page.locator('[data-testid="size-cell-FD0655-001-8.0"]');
    await expect(cell80).toBeVisible();
    await expect(cell80).toHaveClass(/stock-healthy|bg-\[#D1FAE5\]/);
    await expect(cell80.locator('.stock-number')).toHaveText('5');
    await expect(cell80).toContainText('5雙');
  });

  test('TC-1.3: US / EU / CM size toggle changes column header labels dynamically', async ({ page }) => {
    const tableHeader = page.locator('[data-testid="matrix-table"] thead');

    // Default US standard: headers must show US 6.0 ~ 12.0
    await expect(tableHeader).toContainText('6.0');
    await expect(tableHeader).toContainText('8.5');
    await expect(tableHeader).toContainText('12.0');

    // Switch to EU standard
    const euToggle = page.locator('[data-testid="size-unit-toggle-EU"]');
    await euToggle.click();
    await expect(euToggle).toHaveClass(/text-indigo-600|text-indigo-400/);

    // EU column headers: 38.5, 42, 46
    await expect(tableHeader).toContainText('38.5');
    await expect(tableHeader).toContainText('42');
    await expect(tableHeader).toContainText('46');

    // Switch to CM standard
    const cmToggle = page.locator('[data-testid="size-unit-toggle-CM"]');
    await cmToggle.click();
    await expect(cmToggle).toHaveClass(/text-indigo-600|text-indigo-400/);

    // CM column headers: 24.0, 26.5, 30.0
    await expect(tableHeader).toContainText('24.0');
    await expect(tableHeader).toContainText('26.5');
    await expect(tableHeader).toContainText('30.0');

    // Switch back to US standard
    const usToggle = page.locator('[data-testid="size-unit-toggle-US"]');
    await usToggle.click();
    await expect(tableHeader).toContainText('6.0');
    await expect(tableHeader).toContainText('12.0');
  });

  test('TC-1.4: Keyword search and brand filter display correct subsets', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]');
    const table = page.locator('[data-testid="matrix-table"]');

    // 1. Search by SKU: 'FD0655'
    await searchInput.fill('FD0655');
    await expect(table.locator('tbody tr[data-testid^="product-row-"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="product-row-FD0655-001"]')).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(table.locator('tbody tr[data-testid^="product-row-"]')).toHaveCount(24);

    // 2. Search by model name: 'Dunk'
    await searchInput.fill('Dunk');
    const dunkRows = table.locator('tbody tr[data-testid^="product-row-"]');
    const dunkCount = await dunkRows.count();
    expect(dunkCount).toBeGreaterThanOrEqual(1);
    await expect(page.locator('[data-testid="product-row-DD1391-100"]')).toBeVisible();

    // Clear search
    await searchInput.fill('');

    // 3. Filter by Brand: 'New Balance'
    const nbPill = page.locator('[data-testid="brand-filter-New Balance"]');
    await nbPill.click();

    const nbRows = table.locator('tbody tr[data-testid^="product-row-"]');
    const nbCount = await nbRows.count();
    expect(nbCount).toBeGreaterThan(0);
    expect(nbCount).toBeLessThan(24);
    await expect(page.locator('[data-testid="product-row-U9060ECA"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-row-FD0655-001"]')).not.toBeVisible();

    // Reset to 'All'
    await page.locator('[data-testid="brand-filter-all"]').click();
    await expect(table.locator('tbody tr[data-testid^="product-row-"]')).toHaveCount(24);
  });

  test('TC-1.5: Excel template download triggers and generates valid format', async ({ page }) => {
    // 1. Verify blank template download button triggers download event
    const templateButton = page.locator('button[title="下載標準空白範本"]');
    await expect(templateButton).toBeVisible();

    const [templateDownload] = await Promise.all([
      page.waitForEvent('download'),
      templateButton.click(),
    ]);

    expect(templateDownload.suggestedFilename()).toMatch(/\.xlsx$/i);

    // 2. Verify export inventory button triggers export download
    const exportButton = page.locator('[data-testid="btn-export-excel"]');
    await expect(exportButton).toBeVisible();

    const [exportDownload] = await Promise.all([
      page.waitForEvent('download'),
      exportButton.click(),
    ]);

    expect(exportDownload.suggestedFilename()).toMatch(/\.xlsx$/i);
  });
});
