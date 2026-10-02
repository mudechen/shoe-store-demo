import { test, expect } from '@playwright/test';

test.describe('自動調整字體大小與文字大小選取器 (Font Size Control)', () => {
  test.beforeEach(async ({ page }) => {
    // Cleanly wipe storage before the initial page navigation without wiping storage during in-test page.reload()
    await page.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('__font_size_test_storage_initialized__')) {
          sessionStorage.setItem('__font_size_test_storage_initialized__', '1');
          localStorage.clear();
        }
      } catch (e) {}
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('TC-FONT-01: 文字大小按鈕必須出現在深淺色模式icon的右邊', async ({ page }) => {
    // Locate the header buttons container
    const darkModeBtn = page.locator('button[title="切換深淺模式"]');
    await expect(darkModeBtn).toBeVisible();

    const fontSizeBtn = page.locator('[data-testid="btn-font-size-toggle"]');
    await expect(fontSizeBtn).toBeVisible();

    // Verify DOM positioning: fontSizeContainer is immediately following darkModeBtn
    const isAdjacent = await page.evaluate(() => {
      const darkBtn = document.querySelector('button[title="切換深淺模式"]');
      const fontContainer = document.querySelector('[data-testid="font-size-control-container"]');
      const fontBtn = document.querySelector('[data-testid="btn-font-size-toggle"]');
      if (!darkBtn || !fontContainer || !fontBtn) return false;
      return (
        darkBtn.nextElementSibling === fontContainer &&
        (fontBtn.compareDocumentPosition(darkBtn) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
      );
    });
    expect(isAdjacent).toBe(true);

    // Verify visual order (fontSizeBtn's left is greater than darkModeBtn's left)
    const darkBox = await darkModeBtn.boundingBox();
    const fontBox = await fontSizeBtn.boundingBox();
    expect(darkBox).not.toBeNull();
    expect(fontBox).not.toBeNull();
    if (darkBox && fontBox) {
      expect(fontBox.x).toBeGreaterThan(darkBox.x);
    }
  });

  test('TC-FONT-02: 點擊按鈕能展開與收合字體調整選單 (Popover)', async ({ page }) => {
    const fontSizeBtn = page.locator('[data-testid="btn-font-size-toggle"]');
    const popover = page.locator('[data-testid="font-size-popover"]');

    // Initially closed
    await expect(popover).not.toBeVisible();

    // Click to open
    await fontSizeBtn.click();
    await expect(popover).toBeVisible();
    await expect(popover.locator('text=字體大小調整')).toBeVisible();

    // Click close button inside popover
    await page.locator('[data-testid="btn-close-font-size"]').click();
    await expect(popover).not.toBeVisible();

    // Open again and close by pressing Escape
    await fontSizeBtn.click();
    await expect(popover).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popover).not.toBeVisible();
  });

  test('TC-FONT-03: 支援螢幕智慧自動適配模式', async ({ page }) => {
    const fontSizeBtn = page.locator('[data-testid="btn-font-size-toggle"]');
    await fontSizeBtn.click();

    const autoBtn = page.locator('[data-testid="btn-font-mode-auto"]');
    await expect(autoBtn).toBeVisible();
    await autoBtn.click();

    // Verify documentElement attributes
    const datasetMode = await page.evaluate(() => document.documentElement.dataset.fontSize);
    expect(datasetMode).toBe('auto');

    const statusBadge = page.locator('[data-testid="font-size-status-badge"]');
    await expect(statusBadge).toContainText('自動');

    // Verify saved to localStorage
    const saved = await page.evaluate(() => localStorage.getItem('shoe_store_font_size_mode'));
    expect(saved).toBe('auto');
  });

  test('TC-FONT-04: 可選取不同固定字級 (小、標準、中大、特大) 且即時縮放', async ({ page }) => {
    const fontSizeBtn = page.locator('[data-testid="btn-font-size-toggle"]');
    await fontSizeBtn.click();

    // 1. Select Extra Large (特大 / 125%)
    await page.locator('[data-testid="btn-font-mode-xlarge"]').click();
    let rootFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    let rootDataset = await page.evaluate(() => document.documentElement.dataset.fontSize);
    expect(rootFontSize).toBe('20px');
    expect(rootDataset).toBe('xlarge');
    await expect(page.locator('[data-testid="font-size-status-badge"]')).toContainText('125%');

    // Verify active dot is shown when non-standard
    await expect(page.locator('[data-testid="font-size-active-dot"]')).toBeVisible();

    // 2. Select Small (緊湊 / 90%)
    await page.locator('[data-testid="btn-font-mode-small"]').click();
    rootFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    rootDataset = await page.evaluate(() => document.documentElement.dataset.fontSize);
    expect(rootFontSize).toBe('14.4px');
    expect(rootDataset).toBe('small');
    await expect(page.locator('[data-testid="font-size-status-badge"]')).toContainText('90%');

    // 3. Select Standard (標準 / 100%)
    await page.locator('[data-testid="btn-font-mode-standard"]').click();
    rootFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    rootDataset = await page.evaluate(() => document.documentElement.dataset.fontSize);
    expect(rootFontSize).toBe('16px');
    expect(rootDataset).toBe('standard');
    await expect(page.locator('[data-testid="font-size-status-badge"]')).toContainText('100%');
  });

  test('TC-FONT-05: 支援 A- / A+ 步進微調與重設標準功能', async ({ page }) => {
    const fontSizeBtn = page.locator('[data-testid="btn-font-size-toggle"]');
    await fontSizeBtn.click();

    // Reset to standard first
    await page.locator('[data-testid="btn-font-reset"]').click();
    let rootFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(rootFontSize).toBe('16px');

    // Step up to large (18px)
    const stepUpBtn = page.locator('[data-testid="btn-font-step-up"]');
    await stepUpBtn.click();
    rootFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(rootFontSize).toBe('18px');

    // Step up to xlarge (20px)
    await stepUpBtn.click();
    rootFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(rootFontSize).toBe('20px');

    // At xlarge, step up is disabled
    await expect(stepUpBtn).toBeDisabled();

    // Step down to large (18px)
    const stepDownBtn = page.locator('[data-testid="btn-font-step-down"]');
    await stepDownBtn.click();
    rootFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(rootFontSize).toBe('18px');

    // Reset button returns to standard
    await page.locator('[data-testid="btn-font-reset"]').click();
    rootFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(rootFontSize).toBe('16px');
  });

  test('TC-FONT-06: 重新整理頁面後能持久保存使用者的字級設定', async ({ page }) => {
    const fontSizeBtn = page.locator('[data-testid="btn-font-size-toggle"]');
    await fontSizeBtn.click();

    // Select Large (18px)
    await page.locator('[data-testid="btn-font-mode-large"]').click();
    let rootFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(rootFontSize).toBe('18px');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that 18px is still applied on reload
    rootFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    const rootDataset = await page.evaluate(() => document.documentElement.dataset.fontSize);
    expect(rootFontSize).toBe('18px');
    expect(rootDataset).toBe('large');
  });

  test('TC-FONT-07: 行動裝置小螢幕 (360px & 320px) 下 Popover 不會超出螢幕左邊緣破版', async ({ page }) => {
    // Test on standard 360px width Android viewport
    await page.setViewportSize({ width: 360, height: 740 });
    const fontSizeBtn = page.locator('[data-testid="btn-font-size-toggle"]');
    await fontSizeBtn.click();

    // Select xlarge mode (maximum scale)
    await page.locator('[data-testid="btn-font-mode-xlarge"]').click();
    const popover = page.locator('[data-testid="font-size-popover"]');
    await expect(popover).toBeVisible();

    const box360 = await popover.boundingBox();
    expect(box360).not.toBeNull();
    if (box360) {
      // Must not bleed outside left screen edge
      expect(box360.x).toBeGreaterThanOrEqual(0);
      // Must not bleed outside right screen edge
      expect(box360.x + box360.width).toBeLessThanOrEqual(360 + 5);
    }

    // Test on compact 320px width viewport
    await page.setViewportSize({ width: 320, height: 600 });
    const box320 = await popover.boundingBox();
    expect(box320).not.toBeNull();
    if (box320) {
      expect(box320.x).toBeGreaterThanOrEqual(0);
      expect(box320.x + box320.width).toBeLessThanOrEqual(320 + 5);
    }
  });

  test('TC-FONT-08: 關閉 Popover 時焦點無障礙還原至觸發按鈕', async ({ page }) => {
    const fontSizeBtn = page.locator('[data-testid="btn-font-size-toggle"]');
    await fontSizeBtn.click();
    const popover = page.locator('[data-testid="font-size-popover"]');
    await expect(popover).toBeVisible();

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await expect(popover).not.toBeVisible();

    // Verify focus is restored to toggle button
    await expect(fontSizeBtn).toBeFocused();
  });
});
