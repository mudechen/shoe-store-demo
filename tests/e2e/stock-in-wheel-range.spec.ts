import { test, expect } from '@playwright/test';

const SEED_TEST_PRODUCTS = [
  {
    id: 'test-seed-af1',
    sku: 'CW2288-111',
    brand: 'Nike',
    name: "Air Force 1 '07",
    color: '純白',
    category: '休閒鞋',
    retailPrice: 3400,
    costPrice: 1900,
    barcode: '196607831001',
    displayLocation: 'A-01-L1',
    storageLocation: 'R1-C01-L1',
    procurementType: '買斷',
    sizeUnit: 'US',
    variants: [
      { id: 'var-1', productId: 'test-seed-af1', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, sizeDisplay: '8.5', stock: 4 },
      { id: 'var-2', productId: 'test-seed-af1', sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, sizeDisplay: '9.0', stock: 3 },
      { id: 'var-3', productId: 'test-seed-af1', sizeUS: 10.0, sizeEU: 44.0, sizeCM: 28.0, sizeDisplay: '10.0', stock: 2 },
    ],
  },
  {
    id: 'test-seed-alpha',
    sku: 'SLIP-888',
    brand: '大新',
    name: '經典字母拖鞋',
    color: '黑色',
    category: '拖鞋',
    retailPrice: 290,
    costPrice: 150,
    barcode: '471000888001',
    displayLocation: 'B-01-L1',
    storageLocation: 'R2-C01-L1',
    procurementType: '寄賣',
    sizeUnit: 'ALPHA',
    variants: [
      { id: 'var-a1', productId: 'test-seed-alpha', sizeUS: 7.0, sizeEU: 40.0, sizeCM: 25.0, sizeDisplay: 'S', stock: 5 },
      { id: 'var-a2', productId: 'test-seed-alpha', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, sizeDisplay: 'M', stock: 8 },
      { id: 'var-a3', productId: 'test-seed-alpha', sizeUS: 10.0, sizeEU: 44.0, sizeCM: 28.0, sizeDisplay: 'L', stock: 6 },
    ],
  },
];

test.describe('進貨頁面尺寸滾輪區間與點亮進貨功能 E2E 測試 (SizeRangeWheelPicker & Stock-In)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seedProducts) => {
      localStorage.clear();
      localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
      localStorage.setItem('shoe_store_sales_v1', JSON.stringify([]));
      localStorage.setItem('shoe_store_stockin_v1', JSON.stringify([]));
      localStorage.setItem('shoe_store_vendor_returns_v1', JSON.stringify([]));
    }, SEED_TEST_PRODUCTS);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('TC-WHEEL-1: 驗證已徹底移除男女段分類按鈕，具備起訖下拉區間選擇器，移除滾輪與簡化批次按鈕', async ({ page }) => {
    // 1. 開啟進貨模態框
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 2. 驗證舊男女童段模版按鈕列完全不存在
    await expect(page.locator('[data-testid="stockin-preset-all"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-preset-men"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-preset-women"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-preset-youth"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-preset-kids"]')).toHaveCount(0);

    // 3. 驗證起訖下拉選擇器與範圍摘要存在，且滾輪轉盤已徹底移除防誤觸
    await expect(page.locator('[data-testid="stockin-wheel-min-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-wheel-max-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-wheel-min"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-wheel-max"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-wheel-min-prev"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-wheel-min-next"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-wheel-max-prev"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-wheel-max-next"]')).toHaveCount(0);

    // 4. 驗證精簡後的批次按鈕（保留各尺碼+1雙與全部歸零，移除其他次要按鈕）
    await expect(page.locator('[data-testid="stockin-batch-add-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-batch-reset"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-batch-select-all"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-batch-deselect-all"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-batch-add-2"]')).toHaveCount(0);
  });

  test('TC-WHEEL-2: 美規 (US) 滾輪選取 3.0 ~ 13.0 時即時產出 21 個每半號遞增尺碼', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 1. 切換至 US 單位
    await page.click('[data-testid="stockin-unit-US"]');

    // 2. 使用快選下拉設定起號 3.0、迄號 13.0
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '3.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '13.0');

    // 3. 驗證摘要徽章顯示 21 碼
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('3.0 ～ 13.0（共 21 碼）');

    // 4. 驗證首碼 3.0、中間碼 8.5、尾碼 13.0 均存在
    await expect(page.locator('[data-testid="stockin-size-input-3.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-3.5"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-8.5"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-13.0"]')).toBeVisible();

    // 超出區間的 13.5、14.0 應不在畫面中
    await expect(page.locator('[data-testid="stockin-size-input-13.5"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-size-input-15.0"]')).toHaveCount(0);
  });

  test('TC-WHEEL-3: ALPHA 規格下滾輪支援 XS ~ 2XL 有序序列表', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 1. 切換至 ALPHA
    await page.click('[data-testid="stockin-unit-ALPHA"]');

    // 2. 驗證摘要顯示共 7 碼
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('XS ～ 2XL（共 7 碼）');

    // 3. 驗證依序包含 XS, S, M, L, 2L, XL, 2XL
    await expect(page.locator('[data-testid="stockin-size-input-XS"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-S"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-M"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-L"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-2L"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-XL"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-2XL"]')).toBeVisible();

    // 4. 調整起號為 M，迄號為 XL
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', 'M');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', 'XL');
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('M ～ XL（共 4 碼）');

    // XS 應消失，M, L, 2L, XL 仍在
    await expect(page.locator('[data-testid="stockin-size-input-XS"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-size-input-M"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-XL"]')).toBeVisible();
  });

  test('TC-WHEEL-4: 防呆連動機制（最小號大於最大號時自動推移最大號，反之拉齊最小號）', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');
    await page.click('[data-testid="stockin-unit-US"]');

    // 1. 先設為 5.0 ~ 8.0
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '5.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '8.0');
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('5.0 ～ 8.0');

    // 2. 將起號 (min) 調整為 10.0（大於原先迄號 8.0）
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '10.0');

    // 驗證迄號 (max) 被自動推移至 10.0
    await expect(page.locator('[data-testid="stockin-wheel-max-select"]')).toHaveValue('10.0');
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('10.0 ～ 10.0');

    // 3. 將迄號 (max) 調整為 7.0（小於目前起號 10.0）
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '7.0');

    // 驗證起號 (min) 被自動拉回至 7.0
    await expect(page.locator('[data-testid="stockin-wheel-min-select"]')).toHaveValue('7.0');
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('7.0 ～ 7.0');
  });

  test('TC-WHEEL-5: 兩側式卡片加減微調、防空白誤觸與批次操作（各尺碼+1雙、全部歸零）', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');
    await page.click('[data-testid="stockin-unit-US"]');

    // 設定區間 8.0 ~ 10.0 (5 碼: 8.0, 8.5, 9.0, 9.5, 10.0)
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '8.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '10.0');

    // 初始均為 0 雙
    await expect(page.locator('[data-testid="stockin-size-input-8.5"]')).toHaveValue('0');

    // 1. 點擊卡片空白處不觸發任何動作（防誤觸，數量仍為 0）
    const card85 = page.locator('[data-testid="stockin-size-card-8.5"]');
    await card85.click();
    await expect(page.locator('[data-testid="stockin-size-input-8.5"]')).toHaveValue('0');

    // 2. 點擊 + 鍵增為 1 雙
    await page.click('[data-testid="stockin-size-plus-8.5"]');
    await expect(page.locator('[data-testid="stockin-size-input-8.5"]')).toHaveValue('1');

    // 3. 再點擊 + 鍵增為 2 雙
    await page.click('[data-testid="stockin-size-plus-8.5"]');
    await expect(page.locator('[data-testid="stockin-size-input-8.5"]')).toHaveValue('2');

    // 4. 點擊 - 鍵減為 1 雙
    await page.click('[data-testid="stockin-size-minus-8.5"]');
    await expect(page.locator('[data-testid="stockin-size-input-8.5"]')).toHaveValue('1');

    // 5. 測試「各尺碼 +1 雙」批次按鈕
    await page.click('[data-testid="stockin-batch-add-1"]');
    // 8.5 從 1 變 2，其他從 0 變 1
    await expect(page.locator('[data-testid="stockin-size-input-8.5"]')).toHaveValue('2');
    await expect(page.locator('[data-testid="stockin-size-input-9.0"]')).toHaveValue('1');
    await expect(page.locator('[data-testid="stockin-size-input-10.0"]')).toHaveValue('1');

    // 6. 測試「全部歸零」
    await page.click('[data-testid="stockin-batch-reset"]');
    await expect(page.locator('[data-testid="stockin-size-input-8.5"]')).toHaveValue('0');
    await expect(page.locator('[data-testid="stockin-size-input-9.0"]')).toHaveValue('0');
    await expect(page.locator('[data-testid="stockin-size-input-10.0"]')).toHaveValue('0');
  });

  test('TC-WHEEL-6: 全新鞋款建檔進貨全流程（自訂區間、點亮進貨、入庫成功並在庫存中驗證）', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    const testSku = `WHEEL-NEW-${Date.now().toString().slice(-4)}`;
    await page.fill('[data-testid="stockin-input-sku"]', testSku);
    await page.fill('[data-testid="stockin-input-vendor"]', 'Asics');
    await page.fill('[data-testid="stockin-input-name"]', 'Gel-Kayano 14');
    await page.fill('[data-testid="stockin-input-color"]', '銀灰');
    await page.fill('[data-testid="stockin-input-cost"]', '2500');
    await page.fill('[data-testid="stockin-input-retail"]', '4880');

    // 滾輪設定起訖為 8.0 ~ 10.0
    await page.click('[data-testid="stockin-unit-US"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '8.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '10.0');

    // 點亮 8.5 (填入 4 雙) 與 9.0 (填入 6 雙)
    await page.fill('[data-testid="stockin-size-input-8.5"]', '4');
    await page.fill('[data-testid="stockin-size-input-9.0"]', '6');

    // 驗證按鈕雙數顯示 10 雙
    await expect(page.locator('[data-testid="btn-submit-stockin"]')).toContainText('10 雙');

    // 提交進貨
    await page.click('[data-testid="btn-submit-stockin"]');

    // 搜尋該新鞋款並驗證庫存
    await expect(page.locator('[data-testid="view-inventory"]')).toBeVisible();
    await page.fill('[data-testid="inventory-search-input"]', testSku);

    const card = page.locator(`[data-testid="inventory-card-${testSku}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText('10');
    await card.click();

    // 展開後確認 8.5 有 4 雙，9.0 有 6 雙
    const row = card.locator('..');
    await expect(row).toContainText('8.5');
    await expect(row).toContainText('4');
    await expect(row).toContainText('9.0');
    await expect(row).toContainText('6');
  });

  test('TC-WHEEL-7: 既有鞋款補貨自動解析尺碼起訖並帶入既有庫存', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 輸入既有鞋款 CW2288-111 (種子資料規格包含 8.5, 9.0, 10.0)
    await page.fill('[data-testid="stockin-input-sku"]', 'CW2288-111');
    await page.locator('[data-testid="stockin-input-sku"]').press('Tab');

    // 驗證自動帶入品牌 Nike、品名 Air Force 1
    await expect(page.locator('[data-testid="stockin-input-vendor"]')).toHaveValue('Nike');

    // 滾輪起訖應自動偵測並涵蓋 8.5 到 10.0
    await expect(page.locator('[data-testid="stockin-wheel-min-select"]')).toHaveValue('8.5');
    await expect(page.locator('[data-testid="stockin-wheel-max-select"]')).toHaveValue('10.0');

    // 既有庫存展示提示正確
    await expect(page.locator('text=現有: 4雙').first()).toBeVisible();

    // 為 8.5 加進 2 雙
    await page.click('[data-testid="stockin-size-plus-8.5"]');
    await page.click('[data-testid="stockin-size-plus-8.5"]');
    await expect(page.locator('[data-testid="stockin-size-input-8.5"]')).toHaveValue('2');

    // 提交進貨
    await page.click('[data-testid="btn-submit-stockin"]');

    // 庫存清單中驗證 8.5 庫存累加為 6 雙 (4 + 2)
    await page.fill('[data-testid="inventory-search-input"]', 'CW2288-111');
    const card = page.locator('[data-testid="inventory-card-CW2288-111"]');
    await expect(card).toBeVisible();
    await card.click();
    const row = card.locator('..');
    await expect(row).toContainText('6');
  });

  test('TC-WHEEL-8: 驗證起訖尺碼下拉選單切換與區間即時連動', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');
    await page.click('[data-testid="stockin-unit-US"]');

    // 初始起號為 3.0，下拉切換起號為 3.5
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '3.5');
    await expect(page.locator('[data-testid="stockin-wheel-min-select"]')).toHaveValue('3.5');
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('3.5 ～');

    // 下拉切換起號為 7.0
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '7.0');
    await expect(page.locator('[data-testid="stockin-wheel-min-select"]')).toHaveValue('7.0');
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('7.0 ～');

    // 下拉切換迄號為 11.0
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '11.0');
    await expect(page.locator('[data-testid="stockin-wheel-max-select"]')).toHaveValue('11.0');
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('7.0 ～ 11.0');
  });

  test('TC-WHEEL-9: 歐碼 (EU) 與公分 (CM) 規格起訖滾輪與去重防呆無小數重複', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');

    // 1. 切換至歐碼 EU
    await page.click('[data-testid="stockin-unit-EU"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '38');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '42');

    // 歐碼 38~42 應包含 38, 38.5, 39, 39.5, 40, 40.5, 41, 41.5, 42 共 9 碼
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('38 ～ 42（共 9 碼）');
    await expect(page.locator('[data-testid="stockin-size-input-40"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="stockin-size-input-42"]')).toHaveCount(1);
    // 不應出現重複的 '40.0' 或 '42.0'
    await expect(page.locator('[data-testid="stockin-size-input-40.0"]')).toHaveCount(0);

    // 2. 切換至日規 CM
    await page.click('[data-testid="stockin-unit-CM"]');
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '24.0');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '26.0');
    // 24.0 ~ 26.0 共 5 碼 (24.0, 24.5, 25.0, 25.5, 26.0)
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('24.0 ～ 26.0（共 5 碼）');
    await expect(page.locator('[data-testid="stockin-size-input-24.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-25.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-26.0"]')).toBeVisible();
  });

  test('TC-WHEEL-10: 特大字體 (125%) 模式下尺碼文字絕不截斷，無打勾符號，兩側式加減步進正常運作', async ({ page }) => {
    // 1. 設定特大字級 (125%)
    await page.evaluate(() => {
      localStorage.setItem('shoe_store_font_size_mode', 'xlarge');
      document.documentElement.dataset.fontSize = 'xlarge';
      document.documentElement.style.fontSize = '20px';
    });

    // 2. 開啟進貨模態框
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');
    await page.click('[data-testid="stockin-unit-US"]');

    // 3. 驗證尺碼文字如 3.5, 10.5 正常顯示，絕無 truncate 類別，具備 whitespace-nowrap
    const card35 = page.locator('[data-testid="stockin-size-card-3.5"]');
    await expect(card35).toBeVisible();
    const sizeLabel35 = card35.locator('span:has-text("3.5")').first();
    await expect(sizeLabel35).toBeVisible();
    await expect(sizeLabel35).toHaveClass(/whitespace-nowrap/);
    await expect(sizeLabel35).not.toHaveClass(/truncate/);

    const card105 = page.locator('[data-testid="stockin-size-card-10.5"]');
    await expect(card105).toBeVisible();
    const sizeLabel105 = card105.locator('span:has-text("10.5")').first();
    await expect(sizeLabel105).toBeVisible();
    await expect(sizeLabel105).toHaveClass(/whitespace-nowrap/);
    await expect(sizeLabel105).not.toHaveClass(/truncate/);

    // 4. 驗證卡片內絕無打勾符號（Check 圖示）
    await expect(card35.locator('svg.lucide-check')).toHaveCount(0);
    await expect(card105.locator('svg.lucide-check')).toHaveCount(0);

    // 5. 兩側式右側步進鍵與數量正常操作
    await page.click('[data-testid="stockin-size-plus-3.5"]');
    await expect(page.locator('[data-testid="stockin-size-input-3.5"]')).toHaveValue('1');
    await expect(card35).toHaveClass(/bg-indigo-50/);
  });

  test('TC-WHEEL-11: 驗證「半號間隔」勾選切換功能（預設勾選每半號跳、取消勾選時只跳全號、批次+1雙僅作用於全號、切換單位防呆）', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');
    await page.click('[data-testid="stockin-unit-US"]');

    // 1. 驗證「半號間隔」勾選框存在且預設為勾選狀態
    const checkbox = page.locator('[data-testid="stockin-half-step-checkbox"]');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked();

    // 2. 預設每半號跳，3.0 ~ 13.0 共有 21 碼，半號 3.5 存在
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('3.0 ～ 13.0（共 21 碼）');
    await expect(page.locator('[data-testid="stockin-size-card-3.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-3.5"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-4.0"]')).toBeVisible();

    // 3. 取消勾選「半號間隔」
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    // 4. 驗證摘要更新為 11 碼，且半號卡片 (3.5, 4.5, 5.5, 12.5) 不在畫面上
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('3.0 ～ 13.0（共 11 碼）');
    await expect(page.locator('[data-testid="stockin-size-card-3.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-4.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-3.5"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-size-card-4.5"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-size-card-5.5"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-size-card-12.5"]')).toHaveCount(0);

    // 5. 點擊「各尺碼 +1 雙」，驗證僅對全號生效
    await page.click('[data-testid="stockin-batch-add-1"]');
    await expect(page.locator('[data-testid="stockin-size-input-3.0"]')).toHaveValue('1');
    await expect(page.locator('[data-testid="stockin-size-input-4.0"]')).toHaveValue('1');

    // 6. 重新勾選「半號間隔」，驗證半號卡片重現且數量為 0，全號保有原數量 1
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('3.0 ～ 13.0（共 21 碼）');
    await expect(page.locator('[data-testid="stockin-size-card-3.5"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-input-3.5"]')).toHaveValue('0');
    await expect(page.locator('[data-testid="stockin-size-input-3.0"]')).toHaveValue('1');
    await expect(page.locator('[data-testid="stockin-size-input-4.0"]')).toHaveValue('1');

    // 7. 點擊「全部歸零」，驗證全數歸零
    await page.click('[data-testid="stockin-batch-reset"]');
    await expect(page.locator('[data-testid="stockin-size-input-3.0"]')).toHaveValue('0');
    await expect(page.locator('[data-testid="stockin-size-input-4.0"]')).toHaveValue('0');

    // 8. 切換至 ALPHA 單位，驗證「半號間隔」勾選框被禁用
    await page.click('[data-testid="stockin-unit-ALPHA"]');
    await expect(checkbox).toBeDisabled();
  });

  test('TC-WHEEL-12: 驗證起訖為半號時取消勾選自動吸附全號、下拉與卡片完美同步，以及歐碼 (EU) 全號跳號', async ({ page }) => {
    await page.click('[data-testid="nav-tab-inventory"]');
    await page.click('[data-testid="btn-open-stockin-modal"]');
    await page.click('[data-testid="stockin-unit-US"]');

    // 1. 設定半號起訖 3.5 ~ 9.5
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '3.5');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '9.5');
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('3.5 ～ 9.5（共 13 碼）');

    // 2. 取消勾選「半號間隔」
    const checkbox = page.locator('[data-testid="stockin-half-step-checkbox"]');
    await checkbox.uncheck();

    // 3. 驗證起號自動吸附至 3.0，迄號吸附至 9.0，摘要與卡片一致
    await expect(page.locator('[data-testid="stockin-wheel-min-select"]')).toHaveValue('3.0');
    await expect(page.locator('[data-testid="stockin-wheel-max-select"]')).toHaveValue('9.0');
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('3.0 ～ 9.0（共 7 碼）');
    await expect(page.locator('[data-testid="stockin-size-card-3.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-9.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-3.5"]')).toHaveCount(0);

    // 4. 切換至歐碼 (EU) 測試全號跳號
    await page.click('[data-testid="stockin-unit-EU"]');
    await expect(checkbox).toBeChecked(); // 預設每半號跳

    // 歐碼 38 ~ 42 預設半號跳為 9 碼
    await page.selectOption('[data-testid="stockin-wheel-min-select"]', '38');
    await page.selectOption('[data-testid="stockin-wheel-max-select"]', '42');
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('38 ～ 42（共 9 碼）');

    // 取消勾選歐碼半號間隔，應變為 5 碼 (38, 39, 40, 41, 42)
    await checkbox.uncheck();
    await expect(page.locator('[data-testid="stockin-wheel-range-summary"]')).toContainText('38 ～ 42（共 5 碼）');
    await expect(page.locator('[data-testid="stockin-size-card-38"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-39"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-40"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-41"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-42"]')).toBeVisible();
    await expect(page.locator('[data-testid="stockin-size-card-38.5"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="stockin-size-card-39.5"]')).toHaveCount(0);
  });
});
