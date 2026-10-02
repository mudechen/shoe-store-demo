import { test, expect } from '@playwright/test';

test.describe('同編號多顏色進貨與庫存管理測試', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start clean
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('輸入相同編號修改顏色為新色時獨立建檔不覆蓋，輸入既有顏色時正常累加補貨', async ({ page }) => {
    // 1. 切換至庫存頁面並開啟進貨入庫
    const navInventory = page.locator('[data-testid="nav-tab-inventory"]');
    await expect(navInventory).toBeVisible();
    await navInventory.click();

    const openStockInBtn = page.locator('[data-testid="btn-open-stockin-modal"]');
    await expect(openStockInBtn).toBeVisible();
    await openStockInBtn.click();

    const modal = page.locator('[data-testid="stockin-modal"]');
    await expect(modal).toBeVisible();

    // 2. 第一筆進貨：編號 9039，顏色「黑色」，數量 5 雙
    const skuInput = page.locator('[data-testid="stockin-input-sku"]');
    await skuInput.fill('9039');

    const vendorInput = page.locator('[data-testid="stockin-input-vendor"]');
    await vendorInput.fill('Nike');

    const nameInput = page.locator('[data-testid="stockin-input-name"]');
    await nameInput.fill('經典復古慢跑鞋');

    const colorInput = page.locator('[data-testid="stockin-input-color"]');
    await colorInput.fill('黑色');

    const costInput = page.locator('[data-testid="stockin-input-cost"]');
    await costInput.fill('1500');

    const retailInput = page.locator('[data-testid="stockin-input-retail"]');
    await retailInput.fill('2800');

    // 填寫 US 8.5 數量為 5
    const sizeInput85 = page.locator('[data-testid="stockin-size-input-8.5"]');
    await expect(sizeInput85).toBeVisible();
    await sizeInput85.fill('5');

    const submitBtn = page.locator('[data-testid="btn-submit-stockin"]');
    await submitBtn.click();

    // 驗證 Modal 關閉並回到庫存列表
    await expect(modal).not.toBeVisible();

    // 檢查庫存列表包含 9039 黑色
    await expect(page.locator('text=9039').first()).toBeVisible();
    await expect(page.locator('text=黑色').first()).toBeVisible();
    await expect(page.locator('text=現存 5 雙').first()).toBeVisible();

    // 3. 第二筆進貨：再次打開進貨入庫，輸入編號 9039，修改顏色為「白色」，數量 3 雙
    await openStockInBtn.click();
    await expect(modal).toBeVisible();

    await skuInput.fill('9039');

    // 驗證自動帶入品牌與品名
    await expect(vendorInput).toHaveValue('Nike');
    await expect(nameInput).toHaveValue('經典復古慢跑鞋');

    // 驗證已建檔顏色標籤出現「黑色」
    const blackTag = page.locator('[data-testid="stockin-color-tag-黑色"]');
    await expect(blackTag).toBeVisible();

    // 修改顏色為「白色」
    await colorInput.fill('白色');

    // 驗證畫面上出現「檢測為同編號新顏色」之提示訊息
    await expect(page.locator('text=檢測為同編號新顏色')).toBeVisible();
    await expect(page.locator('text=保留原 黑色 不覆蓋')).toBeVisible();

    // 填寫 US 8.5 數量為 3
    await sizeInput85.fill('3');

    // 送出新色進貨
    await submitBtn.click();
    await expect(modal).not.toBeVisible();

    // 4. 關鍵驗證：檢查庫存列表同時存在「黑色 (5雙)」與「白色 (3雙)」，原黑色紀錄未被覆蓋！
    const blackCard = page.locator('div:has-text("9039"):has-text("黑色")');
    const whiteCard = page.locator('div:has-text("9039"):has-text("白色")');
    await expect(blackCard.first()).toBeVisible();
    await expect(whiteCard.first()).toBeVisible();

    await expect(page.locator('text=現存 5 雙')).toBeVisible();
    await expect(page.locator('text=現存 3 雙')).toBeVisible();

    // 5. 第三筆進貨：再次打開進貨入庫，輸入 9039 並選擇既有「黑色」，補貨 2 雙
    await openStockInBtn.click();
    await expect(modal).toBeVisible();

    await skuInput.fill('9039');

    // 點擊已建檔顏色標籤「黑色」
    await expect(blackTag).toBeVisible();
    await blackTag.click();
    await expect(colorInput).toHaveValue('黑色');

    // 驗證出現「匹配既有款式」提示
    await expect(page.locator('text=匹配既有「黑色」款式')).toBeVisible();

    // 填寫 US 8.5 增加 2 雙
    await sizeInput85.fill('2');
    await submitBtn.click();
    await expect(modal).not.toBeVisible();

    // 6. 驗證最終數量：黑色由 5 雙累加為 7 雙，白色保持 3 雙
    await expect(page.locator('text=現存 7 雙')).toBeVisible();
    await expect(page.locator('text=現存 3 雙')).toBeVisible();
  });
});
