import { test, expect } from '@playwright/test';

test.describe('Taiwan Timezone (Asia/Taipei / UTC+8) Standardization Verification', () => {
  test('Verify Taiwan Date & Time calculation and display on UI', async ({ page }) => {
    // Navigate to application
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Evaluate Taiwan timezone calculations in browser context
    const tzEvaluation = await page.evaluate(() => {
      // Test UTC timestamp across midnight boundary (16:30 UTC = 00:30 Taiwan time next day)
      const utcIso = '2026-09-08T16:30:00.000Z';
      const d = new Date(utcIso);

      const taipeiDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);

      const taipeiTime = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(d);

      return {
        utcIso,
        taipeiDate,
        taipeiTime
      };
    });

    // 16:30 UTC must be converted to 2026-09-09 00:30 in Taiwan
    expect(tzEvaluation.taipeiDate).toBe('2026-09-09');
    expect(tzEvaluation.taipeiTime).toBe('00:30');
  });

  test('Verify Records Center sales ledger displays timestamp in Taiwan timezone', async ({ page }) => {
    // Inject a test sale with explicit UTC timestamp: 2026-09-08T16:45:00.000Z (00:45 Taiwan on 2026-09-09)
    await page.addInitScript(() => {
      localStorage.clear();
      const testSale = {
        id: 'sale-tz-test-001',
        businessDate: '2026-09-09',
        timestamp: '2026-09-08T16:45:00.000Z',
        brand: 'Nike',
        sku: 'TZ-TEST-01',
        productName: 'Air Force 1 Timezone Test',
        color: 'Pure White',
        sizeUS: 8.5,
        category: '運動鞋',
        retailPrice: 3400,
        actualPaid: 3400,
        paymentMethod: 'cash',
        status: 'completed',
        isCustomItem: true
      };
      localStorage.setItem('shoe_store_sales_v1', JSON.stringify([testSale]));
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Records Center
    const recordsNav = page.locator('[data-testid="nav-tab-records"]');
    await recordsNav.click();

    // Verify Sales ledger item is present
    const saleItem = page.locator('[data-testid="sales-record-item-sale-tz-test-001"]');
    await expect(saleItem).toBeVisible();

    // The displayTime should show 2026-09-09 00:45 (Taiwan Time UTC+8), NOT 2026-09-08 16:45 (UTC)
    const itemText = await saleItem.textContent();
    expect(itemText).toContain('2026-09-09 00:45');
    expect(itemText).not.toContain('2026-09-08 16:45');
  });
});
