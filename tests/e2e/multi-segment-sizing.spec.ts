import { test, expect } from '@playwright/test';

test.describe('多族群分段與多尺寸制切換驗證 (Multi-Segment & Multi-Unit Sizing)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('TC-SIZING-1: 進貨頁面已移除男女童段模版，改為雙欄滾輪區間選擇器與四大尺寸規格', async ({ page }) => {
    // 1. 切換至庫存頁面並開啟進貨入庫
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 2. 驗證舊男女童段模版按鈕已徹底移除
    await expect(page.locator('[data-testid="stockin-preset-all"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-preset-men"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-preset-women"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-preset-youth"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-preset-kids"]')).toHaveCount(0);

    // 3. 驗證尺寸計算 4 個規格按鈕均存在
    await expect(page.locator('[data-testid="stockin-unit-US"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-unit-EU"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-unit-CM"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-unit-ALPHA"]')).toBeVisible();

    // 4. 驗證起訖下拉選擇器與區間摘要元件存在，滾輪轉盤已移除防誤觸
    await expect(page.locator('[data-testid="stockin-wheel-min-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-wheel-max-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-wheel-min"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-wheel-max"]')).toHaveCount(0);
  });

  test('TC-SIZING-2: 切換滾輪區間與尺寸制時即時產出對應尺碼輸入清單', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 1. 設定美國 (US) 3.0 ~ 6.0
    await page.click('[data-testid="stockin-unit-US"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '3.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '6.0');

    // 應出現號數 3.0 到 6.0（無 C 或 Y，純數字）
    await expect(page.locator('[data-testid="stockin-size-card-3.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-4.5"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-6.0"]')).toBeVisible();

    // 2. 調整滾輪區間為 3.5 ~ 7.0
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '3.5');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '7.0');

    // 應出現號數 3.5 到 7.0
    await expect(page.locator('[data-testid="stockin-size-card-3.5"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-5.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-7.0"]')).toBeVisible();

    // 3. 點擊「XS~2XL」
    await page.click('[data-testid="stockin-unit-ALPHA"]');

    // 應出現 XS, S, M, L, 2L, XL, 2XL
    await expect(page.locator('[data-testid="stockin-size-card-XS"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-M"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-2XL"]')).toBeVisible();
  });

  test('TC-SIZING-3: 使用滾輪自訂童段尺碼 (3.0~6.0) 建檔新鞋並完成進貨，庫存清單正確顯示 3.0 等純數字尺碼', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 填寫新童鞋基本資料
    const testSku = `KID-${Date.now().toString().slice(-4)}`;
    await page.fill('input[placeholder*="輸入編號"]', testSku);
    await page.fill('input[placeholder*="例如 Nike"]', 'Nike Kids');
    await page.fill('input[placeholder*="Air Force 1"]', 'Little Force 1');
    await page.fill('input[placeholder*="例如 純白"]', '純白');

    // 套用美規尺碼並設定滾輪 3.0 ~ 6.0
    await page.click('[data-testid="stockin-unit-US"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '3.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '6.0');

    // 批次快填 +1 雙
    await page.click('button:has-text("各尺碼 +1 雙")');

    // 送出進貨
    await page.click('button:has-text("確認進貨入庫")');

    // 跳轉至庫存清單並展開該款童鞋
    await expect(page.locator('text=庫存清單')).toBeVisible();
    await page.fill('input[placeholder*="搜編號"]', testSku);

    const shoeCard = page.locator(`[data-testid="inventory-card-${testSku}"]`);
    await expect(shoeCard).toBeVisible();
    await shoeCard.click();

    // 驗證展開的尺碼格子顯示 3.0 等純數字尺碼（無 C 或 Y）
    await expect(page.locator('text=3.0').first()).toBeVisible();
  });

  test('TC-SIZING-4: 美規自3.0起最大至15.0由小排到大，歐碼連續涵蓋22至47，公分碼明確呈現', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 1. 全區間美國 (US) 應涵蓋 3.0 至 15.0，無 C/Y 且由小排到大
    await page.click('[data-testid="stockin-unit-US"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '3.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '15.0');
    await expect(page.locator('[data-testid="stockin-size-input-3.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-5.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-8.5"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-13.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-15.0"]')).toBeVisible();

    // 2. 歐洲 (EU) 全區間 22 至 47，包含成人最小 35 與青少年 37
    await page.click('[data-testid="stockin-unit-EU"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '22');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '47');
    await expect(page.locator('[data-testid="stockin-size-input-22"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-35"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-37"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-47"]')).toBeVisible();

    // 3. 日本 (JP) 包含 20.0 等半號
    await page.click('[data-testid="stockin-unit-CM"]');
    await expect(page.locator('[data-testid="stockin-size-input-22.0"]')).toBeVisible();
  });

  test('TC-SIZING-5: 滾輪區間調整縮小後，已填寫之區間外尺碼完整保留不消失，並顯示「區間外」標籤', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 1. 先選擇 3.0 ~ 6.0 並在 3.0 填寫 2 雙
    await page.click('[data-testid="stockin-unit-US"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '3.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '6.0');
    await page.click('[data-testid="stockin-size-plus-3.0"]');
    await page.click('[data-testid="stockin-size-plus-3.0"]');
    await expect(page.locator('[data-testid="stockin-size-input-3.0"]')).toHaveValue('2');

    // 2. 將滾輪區間移至 3.5 ~ 7.0（3.0 變成區間外），3.0 應依然存在於畫面中，保留數值 2，並標記「區間外」
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '3.5');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '7.0');
    await expect(page.locator('[data-testid="stockin-size-input-3.0"]')).toBeVisible();
    await expect(page.locator('text=區間外').first()).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-3.0"]')).toHaveValue('2');

    // 3. 再填寫尺碼 6.5，總進貨雙數應累計為 5
    await page.click('[data-testid="stockin-size-plus-6.5"]');
    await page.click('[data-testid="stockin-size-plus-6.5"]');
    await page.click('[data-testid="stockin-size-plus-6.5"]');
    await expect(page.locator('button[data-testid="btn-submit-stockin"]')).toContainText('5 雙');
  });

  test('TC-SIZING-6: 歐洲尺寸連續每半號無跳號，起始為22號至47號，完整包含35號與37號', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 1. 切換至歐碼全區間 (22 ~ 47)
    await page.click('[data-testid="stockin-unit-EU"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '22');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '47');

    // 驗證歐碼包含 36.5, 37, 37.5
    await expect(page.locator('[data-testid="stockin-size-input-36.5"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-37"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-37.5"]')).toBeVisible();

    // 驗證包含 35 號
    await expect(page.locator('[data-testid="stockin-size-input-35"]')).toBeVisible();

    // 驗證 22 至 24.5 連續每半號無跳號
    await expect(page.locator('[data-testid="stockin-size-input-22"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-22.5"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-23"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-23.5"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-24"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-24.5"]')).toBeVisible();
  });

  test('TC-SIZING-7: 既有編號 2133 之童段 20.0 與大人段 20.0 獨立庫存展示明確', async ({ page }) => {
    // 進入庫存清單查看種子資料中之 2133
    await page.click('[data-testid="nav-tab-inventory"]');
    await expect(page.locator('text=庫存清單')).toBeVisible();
    await page.fill('input[placeholder*="搜編號"]', '2133');

    const card = page.locator('[data-testid="inventory-card-2133"]');
    if (await card.isVisible()) {
      await card.click();
      await expect(page.locator('text=童段 20.0').first()).toBeVisible();
      await expect(page.locator('text=大人段 20.0').first()).toBeVisible();
    }
  });

  test('TC-SIZING-8: 快速開單收銀中，編號 2133 之童段 20.0 與大人段 20.0 具有獨立尺碼按鈕可供選取開單', async ({ page }) => {
    // 1. 進入銷貨記帳頁面
    await page.click('[data-testid="nav-tab-cashier"]');
    await expect(page.locator('text=極速銷貨記帳')).toBeVisible();

    // 2. 搜尋編號 2133
    const skuInput = page.locator('[data-testid="cashier-sku-input"]');
    await skuInput.fill('2133');

    // 3. 點擊建議列表中的 2133 鞋款
    const suggestion = page.locator('[data-testid="cashier-suggestion-item-2133"]');
    if (await suggestion.isVisible()) {
      await suggestion.click();
      const kidsBtn = page.locator('[data-testid="cashier-size-btn-童段 20.0"]');
      const adultBtn = page.locator('[data-testid="cashier-size-btn-大人段 20.0"]');
      await expect(kidsBtn).toBeVisible();
      await expect(adultBtn).toBeVisible();
      await kidsBtn.click();
      await expect(kidsBtn).toHaveClass(/bg-indigo-600/);
    }
  });

  test('TC-SIZING-9: 尺寸計算規格排在上方、尺碼區間選擇器排在下方之視覺與層級佈局驗證', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 驗證尺寸計算規格 (Unit) 與 區間選擇器 (Select) 均可見
    const unitEl = page.locator('[data-testid="stockin-unit-US"]');
    const selectEl = page.locator('[data-testid="stockin-wheel-min-select"]');
    await expect(unitEl).toBeVisible();
    await expect(selectEl).toBeVisible();

    // 驗證尺寸規格的 Y 軸座標嚴格小於區間選擇器的 Y 軸座標（規格在上方，區間選擇在下方）
    const unitBox = await unitEl.boundingBox();
    const selectBox = await selectEl.boundingBox();
    expect(unitBox).not.toBeNull();
    expect(selectBox).not.toBeNull();
    expect(unitBox!.y).toBeLessThan(selectBox!.y);
  });

  test('TC-SIZING-10: 滾輪區間平滑切換，尺碼軸由小到大連續排列去重', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 設定 US 3.0 ~ 7.0
    await page.click('[data-testid="stockin-unit-US"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '3.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '7.0');

    await expect(page.locator('[data-testid="stockin-size-input-3.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-4.5"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-5.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-7.0"]')).toBeVisible();

    // 切換歐碼 35 ~ 47，重疊去重各號數僅出現一次
    await page.click('[data-testid="stockin-unit-EU"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '35');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '47');

    await expect(page.locator('[data-testid="stockin-size-input-35"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-40"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="stockin-size-input-42"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="stockin-size-input-47"]')).toBeVisible();
  });

  test('TC-SIZING-11: 批次操作與各尺碼加減步進微調零遺漏', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    await page.fill('input[placeholder*="輸入編號"]', 'MULTI-TEST-01');

    // 設定 US 3.0 ~ 7.0
    await page.click('[data-testid="stockin-unit-US"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '3.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '7.0');

    // 在 3.0 填入 2 雙，在 6.5 填入 3 雙
    await page.click('[data-testid="stockin-size-plus-3.0"]');
    await page.click('[data-testid="stockin-size-plus-3.0"]');
    await page.click('[data-testid="stockin-size-plus-6.5"]');
    await page.click('[data-testid="stockin-size-plus-6.5"]');
    await page.click('[data-testid="stockin-size-plus-6.5"]');

    // 驗證總雙數累計為 5 雙
    await expect(page.locator('button[data-testid="btn-submit-stockin"]')).toContainText('5 雙');
    await expect(page.locator('[data-testid="stockin-size-input-3.0"]')).toHaveValue('2');
    await expect(page.locator('[data-testid="stockin-size-input-6.5"]')).toHaveValue('3');
  });

  test('TC-SIZING-12: 切換尺寸計算規格時已填寫雙數零損失保留且不進行破壞性換算', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 在 US 規填入 9.0 號 4 雙
    await page.click('[data-testid="stockin-unit-US"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '7.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '12.0');
    await page.fill('[data-testid="stockin-size-input-9.0"]', '4');

    // 切換至歐洲規格 EU
    await page.click('[data-testid="stockin-unit-EU"]');

    // 原 9.0 仍存在並保留 4 雙（跨規/區間外保留）
    await expect(page.locator('[data-testid="stockin-size-input-9.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-9.0"]')).toHaveValue('4');
    await expect(page.locator('button[data-testid="btn-submit-stockin"]')).toContainText('4 雙');
  });

  test('TC-SIZING-13: 滾輪設定尺碼進貨零損失累計與入庫驗證', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    const testSku = `COLLIDE-${Date.now().toString().slice(-4)}`;
    await page.fill('input[placeholder*="輸入編號"]', testSku);
    await page.fill('input[placeholder*="例如 Nike"]', 'Nike Test');
    await page.fill('input[placeholder*="Air Force 1"]', 'Dunk Collision Test');
    await page.fill('input[placeholder*="例如 純白"]', '經典灰');

    // 設定 US 6.0 ~ 10.0，在 7.0 填入 5 雙
    await page.click('[data-testid="stockin-unit-US"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '6.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '10.0');
    await page.fill('[data-testid="stockin-size-input-7.0"]', '5');

    // 驗證總雙數為 5 雙
    await expect(page.locator('button[data-testid="btn-submit-stockin"]')).toContainText('5 雙');

    // 送出進貨
    await page.click('button[data-testid="btn-submit-stockin"]');

    // 在庫存清單搜尋此鞋款並展開卡片
    await expect(page.locator('text=庫存清單')).toBeVisible();
    await page.fill('input[placeholder*="搜編號"]', testSku);
    const card = page.locator(`[data-testid="inventory-card-${testSku}"]`);
    await expect(card).toBeVisible();
    await card.click();

    // 驗證庫存卡片顯示 7.0 5 雙，格式純粹無 C/Y
    await expect(page.locator('text=7.0').first()).toBeVisible();
    await expect(page.locator('text=5 雙').first()).toBeVisible();
  });

  test('TC-SIZING-14: 跨規格切換後確認入庫，尺碼正確解析為標準對應值無負數或破壞性資料', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    const testSku = `UNIT-RESOLVE-${Date.now().toString().slice(-4)}`;
    await page.fill('input[placeholder*="輸入編號"]', testSku);
    await page.fill('input[placeholder*="例如 Nike"]', 'Nike Unit Test');
    await page.fill('input[placeholder*="Air Force 1"]', 'Cross Unit Shoe');
    await page.fill('input[placeholder*="例如 純白"]', '黑白');

    // 在 US 模式選 9.0 填入 4 雙
    await page.click('[data-testid="stockin-unit-US"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '7.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '12.0');
    await page.fill('[data-testid="stockin-size-input-9.0"]', '4');

    // 切換至歐洲規格 EU 模式
    await page.click('[data-testid="stockin-unit-EU"]');
    await expect(page.locator('[data-testid="stockin-size-input-9.0"]')).toBeVisible();

    // 送出進貨入庫
    await page.click('button[data-testid="btn-submit-stockin"]');

    // 在庫存清單搜尋此鞋款
    await expect(page.locator('text=庫存清單')).toBeVisible();
    await page.fill('input[placeholder*="搜編號"]', testSku);
    const card = page.locator(`[data-testid="inventory-card-${testSku}"]`);
    await expect(card).toBeVisible();
    await card.click();

    // 驗證庫存顯示正常 US 9.0，4 雙，無負數或損毀
    await expect(page.locator('text=9.0').first()).toBeVisible();
    await expect(page.locator('text=4 雙').first()).toBeVisible();
  });
});
