import { test, expect } from '@playwright/test';

test.describe('鞋款買斷與寄賣註記功能端對端測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('進貨入庫時能選擇「寄賣」或「買斷」，並在列表、篩選與進貨紀錄中正確顯示', async ({ page }) => {
    // 1. 切換至庫存管理頁籤
    const navInventory = page.getByTestId('nav-tab-inventory');
    await expect(navInventory).toBeVisible();
    await navInventory.click();

    // 2. 開啟「進貨入庫」彈窗
    const openStockInBtn = page.getByTestId('btn-open-stockin-modal');
    await expect(openStockInBtn).toBeVisible();
    await openStockInBtn.click();

    const modal = page.getByTestId('stockin-modal');
    await expect(modal).toBeVisible();

    // 檢查預設採購類型是否為「買斷」
    const buyoutBtn = page.getByTestId('stockin-procurement-buyout');
    const consignmentBtn = page.getByTestId('stockin-procurement-consignment');
    await expect(buyoutBtn).toBeVisible();
    await expect(consignmentBtn).toBeVisible();

    // 3. 第一筆進貨：建立「寄賣」鞋款 CS-2026
    const skuInput = page.getByTestId('stockin-input-sku');
    await skuInput.fill('CS-2026');

    const vendorInput = page.getByTestId('stockin-input-vendor');
    await vendorInput.fill('Clarks');

    const nameInput = page.getByTestId('stockin-input-name');
    await nameInput.fill('英倫復古皮鞋');

    const colorInput = page.getByTestId('stockin-input-color');
    await colorInput.fill('酒紅棕');

    // 點選「寄賣」
    await consignmentBtn.click();

    const costInput = page.getByTestId('stockin-input-cost');
    await costInput.fill('2200');

    const retailInput = page.getByTestId('stockin-input-retail');
    await retailInput.fill('4500');

    // 填寫 US 8.5 數量為 3
    const sizeInput85 = page.getByTestId('stockin-size-input-8.5');
    await expect(sizeInput85).toBeVisible();
    await sizeInput85.fill('3');

    // 送出進貨
    const submitBtn = page.getByTestId('btn-submit-stockin');
    await submitBtn.click();
    await expect(modal).not.toBeVisible();

    // 4. 第二筆進貨：建立「買斷」鞋款 BY-2026
    await openStockInBtn.click();
    await expect(modal).toBeVisible();

    await skuInput.fill('BY-2026');
    await vendorInput.fill('Nike');
    await nameInput.fill('全能運動鞋');
    await colorInput.fill('極致黑');

    // 確認點擊「買斷」
    await buyoutBtn.click();

    await costInput.fill('1600');
    await retailInput.fill('3200');

    // 填寫 US 9.0 數量為 5
    const sizeInput90 = page.getByTestId('stockin-size-input-9.0');
    await expect(sizeInput90).toBeVisible();
    await sizeInput90.fill('5');

    await submitBtn.click();
    await expect(modal).not.toBeVisible();

    // 5. 驗證庫存列表中的標籤
    const consignmentBadge = page.getByTestId('badge-consignment-CS-2026');
    const buyoutBadge = page.getByTestId('badge-buyout-BY-2026');
    await expect(consignmentBadge).toBeVisible();
    await expect(consignmentBadge).toContainText('寄賣');
    await expect(buyoutBadge).toBeVisible();
    await expect(buyoutBadge).toContainText('買斷');

    // 6. 驗證展開詳情中的採購模式文字
    const csCard = page.getByTestId('inventory-card-CS-2026');
    await csCard.click();
    await expect(page.locator('text=採購模式: 寄賣')).toBeVisible();

    // 7. 驗證採購模式篩選（透過進階篩選抽屜）
    const filterBtn = page.getByTestId('btn-open-filter-drawer');
    const applyBtn = page.getByTestId('btn-apply-filters');
    const filterConsignment = page.getByTestId('filter-procurement-consignment');
    const filterBuyout = page.getByTestId('filter-procurement-buyout');
    const filterAll = page.getByTestId('filter-procurement-all');

    // 切換為只看「廠商寄賣」
    await filterBtn.click();
    await filterConsignment.click();
    await applyBtn.click();
    await expect(page.locator('text=CS-2026')).toBeVisible();
    await expect(page.locator('text=BY-2026')).not.toBeVisible();

    // 切換為只看「買斷自營」
    await filterBtn.click();
    await filterBuyout.click();
    await applyBtn.click();
    await expect(page.locator('text=BY-2026')).toBeVisible();
    await expect(page.locator('text=CS-2026')).not.toBeVisible();

    // 切換回「全量」
    await filterBtn.click();
    await filterAll.click();
    await applyBtn.click();
    await expect(page.locator('text=CS-2026')).toBeVisible();
    await expect(page.locator('text=BY-2026')).toBeVisible();

    // 8. 驗證紀錄中心 (RecordsCenterView) 的進貨單據標註
    const navRecords = page.getByTestId('nav-tab-records');
    if (await navRecords.isVisible()) {
      await navRecords.click();
      const stockInTab = page.getByTestId('records-tab-stockin');
      await expect(stockInTab).toBeVisible();
      await stockInTab.click();

      // 進貨列表中應包含剛建檔的兩筆紀錄，並分別標記「寄賣」與「買斷」
      await expect(page.getByTestId('stockin-records-list')).toBeVisible();
      await expect(page.locator('text=CS-2026')).toBeVisible();
      await expect(page.locator('text=BY-2026')).toBeVisible();
      await expect(page.locator('text=寄賣').first()).toBeVisible();
      await expect(page.locator('text=買斷').first()).toBeVisible();
    }
  });
});
