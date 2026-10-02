import { test, expect } from '@playwright/test';

const SEED_TEST_PRODUCTS = [
  {
    id: 'test-edit-shoe-1',
    sku: 'EDIT-001',
    brand: 'New Balance',
    name: 'NB 990v6 Standard',
    color: '灰色',
    category: '慢跑鞋',
    retailPrice: 8680,
    costPrice: 5200,
    barcode: '454984512345',
    displayLocation: 'A-01-L1',
    storageLocation: 'R1-C01-L1',
    procurementType: '買斷',
    variants: [
      { id: 'var-e1', productId: 'test-edit-shoe-1', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, stock: 5 },
      { id: 'var-e2', productId: 'test-edit-shoe-1', sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, stock: 0 },
    ],
  },
];

test.describe('庫存與鞋款內容編輯功能 E2E 測試（使用統一進貨入庫頁面）', () => {
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

  test('TC-EDIT-01: 庫存清單點擊「編輯」，順利彈出進貨入庫模態框（編輯模式）並正確帶入既有資料且無位置欄位', async ({ page }) => {
    // 1. 前往「庫存清單」
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    await expect(page.locator('[data-testid="view-inventory"]')).toBeVisible();

    // 2. 展開鞋款卡片
    const shoeCard = page.locator('[data-testid="inventory-card-EDIT-001"]');
    await expect(shoeCard).toBeVisible();
    await shoeCard.click();

    // 3. 驗證編輯按鈕可見並點擊
    const editBtn = page.locator('[data-testid="btn-edit-product-EDIT-001"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // 4. 驗證開啟的是進貨入庫模態框，並顯示「編輯鞋款庫存」與「✏️ 編輯模式」
    const modal = page.locator('[data-testid="stockin-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('編輯鞋款庫存');
    await expect(modal).toContainText('編輯模式');

    // 5. 驗證欄位已預填原資料，且成本為灰底禁用並顯示鎖定提示
    await expect(page.locator('[data-testid="stockin-input-sku"]')).toHaveValue('EDIT-001');
    await expect(page.locator('[data-testid="stockin-input-vendor"]')).toHaveValue('New Balance');
    await expect(page.locator('[data-testid="stockin-input-name"]')).toHaveValue('NB 990v6 Standard');
    await expect(page.locator('[data-testid="stockin-input-color"]')).toHaveValue('灰色');
    await expect(page.locator('[data-testid="stockin-input-cost"]')).toHaveValue('5200');
    await expect(page.locator('[data-testid="stockin-input-cost"]')).toBeDisabled();
    await expect(page.locator('[data-testid="badge-cost-locked"]')).toBeVisible();
    await expect(page.locator('[data-testid="cost-edit-locked-notice"]')).not.toBeVisible();
    await page.locator('[data-testid="cost-input-container"]').click();
    await expect(page.locator('[data-testid="cost-edit-locked-notice"]')).toBeVisible();
    await expect(page.locator('[data-testid="cost-edit-locked-notice"]')).toContainText('進貨紀錄明細');
    await expect(page.locator('[data-testid="stockin-input-retail"]')).toHaveValue('8680');

    // 6. 嚴格驗證：絕無門市位置或貨架位置輸入欄位
    await expect(modal).not.toContainText('門市位置');
    await expect(modal).not.toContainText('貨架位置');
    await expect(page.locator('input[placeholder*="門市"]')).toHaveCount(0);
    await expect(page.locator('input[placeholder*="貨架"]')).toHaveCount(0);

    // 7. 點擊右上角關閉
    await page.locator('[data-testid="btn-close-stockin-modal"]').click();
    await expect(modal).not.toBeVisible();
  });

  test('TC-EDIT-02: 編輯商品基本資料（品名、售價、採購模式改為寄賣）並成功儲存，成本維持灰底鎖定且不被變更', async ({ page }) => {
    // 1. 前往庫存清單並展開卡片
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    await page.locator('[data-testid="inventory-card-EDIT-001"]').click();

    // 2. 點擊編輯
    await page.locator('[data-testid="btn-edit-product-EDIT-001"]').click();
    const modal = page.locator('[data-testid="stockin-modal"]');
    await expect(modal).toBeVisible();

    // 3. 驗證成本灰底鎖定，修改品名、顏色、售價
    await expect(page.locator('[data-testid="stockin-input-cost"]')).toBeDisabled();
    await expect(page.locator('[data-testid="badge-cost-locked"]')).toBeVisible();
    await page.locator('[data-testid="stockin-input-name"]').fill('NB 990v6 旗艦灰');
    await page.locator('[data-testid="stockin-input-color"]').fill('經典灰');
    await page.locator('[data-testid="stockin-input-retail"]').fill('8980');

    // 4. 切換採購模式至「寄賣」
    await page.locator('[data-testid="stockin-procurement-consignment"]').click();

    // 5. 點擊儲存變更按鈕
    await page.locator('[data-testid="btn-submit-stockin"]').click();
    await expect(modal).not.toBeVisible();

    // 6. 驗證卡片顯示最新資訊（成本保持 5200 原值）
    const shoeCard = page.locator('[data-testid="inventory-card-EDIT-001"]');
    await expect(shoeCard).toContainText('NB 990v6 旗艦灰');
    await expect(shoeCard).toContainText('經典灰');
    await expect(shoeCard).toContainText('8980');
    await expect(shoeCard).toContainText('5200');

    // 7. 驗證寄賣徽章
    const badge = page.locator('[data-testid="badge-consignment-EDIT-001"]');
    await expect(badge).toBeVisible();
  });

  test('TC-EDIT-03: 直接修改尺碼庫存、調整雙數並驗證總雙數即時更新', async ({ page }) => {
    // 1. 前往庫存清單並開啟編輯
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    await page.locator('[data-testid="inventory-card-EDIT-001"]').click();
    await page.locator('[data-testid="btn-edit-product-EDIT-001"]').click();

    const modal = page.locator('[data-testid="stockin-modal"]');
    await expect(modal).toBeVisible();

    // 2. 將 US 8.5 庫存由 5 改為 10
    const stockInput85 = page.locator('[data-testid="stockin-size-input-8.5"]');
    await stockInput85.fill('10');

    // 3. 將 US 9.0 庫存由 0 改為 2
    const stockInput90 = page.locator('[data-testid="stockin-size-input-9.0"]');
    await stockInput90.fill('2');

    // 4. 點擊 US 10.0 的 + 按鈕 3 次增加到 3 雙
    const plusBtn10 = page.locator('[data-testid="stockin-size-plus-10.0"]');
    await plusBtn10.click();
    await plusBtn10.click();
    await plusBtn10.click();

    // 5. 驗證按鈕文字反映總庫存 (10 + 2 + 3 = 15 雙)
    await expect(page.locator('[data-testid="btn-submit-stockin"]')).toContainText('現存總庫存 15 雙');

    // 6. 儲存變更
    await page.locator('[data-testid="btn-submit-stockin"]').click();
    await expect(modal).not.toBeVisible();

    // 7. 驗證卡片上的總雙數 (15 雙)
    const shoeCard = page.locator('[data-testid="inventory-card-EDIT-001"]');
    await expect(shoeCard).toContainText('現存 15 雙');

    // 8. 展開卡片驗證各尺碼數值
    await expect(page.locator('[data-testid="inventory-stock-number-EDIT-001-8.5"]')).toContainText('10 雙');
    await expect(page.locator('[data-testid="inventory-stock-number-EDIT-001-9.0"]')).toContainText('2 雙');
    await expect(page.locator('[data-testid="inventory-stock-number-EDIT-001-10.0"]')).toContainText('3 雙');
  });

  test('TC-EDIT-04: 庫存編輯新增全新尺寸後，進貨紀錄頁面同步顯示進貨紀錄（包含新尺寸與雙數）', async ({ page }) => {
    // 1. 前往庫存清單並展開卡片
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    await page.locator('[data-testid="inventory-card-EDIT-001"]').click();

    // 2. 點擊編輯按鈕
    await page.locator('[data-testid="btn-edit-product-EDIT-001"]').click();
    const modal = page.locator('[data-testid="stockin-modal"]');
    await expect(modal).toBeVisible();

    // 3. 原本只有 8.5 和 9.0，為全新尺寸 US 10.0 增加 3 雙
    const plusBtn10 = page.locator('[data-testid="stockin-size-plus-10.0"]');
    await plusBtn10.click();
    await plusBtn10.click();
    await plusBtn10.click();

    // 4. 點擊儲存變更
    await page.locator('[data-testid="btn-submit-stockin"]').click();
    await expect(modal).not.toBeVisible();

    // 5. 前往「紀錄中心」並切換至【進貨紀錄】
    await page.locator('[data-testid="nav-tab-records"]').click();
    await expect(page.locator('[data-testid="view-records"]')).toBeVisible();

    const stockInSubtab = page.locator('[data-testid="records-tab-stockin"]');
    await expect(stockInSubtab).toBeVisible();
    await stockInSubtab.click();

    // 6. 驗證進貨明細清單中最新紀錄包含 EDIT-001、新增的 3 雙、以及 10.0 尺寸
    const recordsList = page.locator('[data-testid="stockin-records-list"]');
    await expect(recordsList).toBeVisible();

    const topRecord = recordsList.locator('[data-testid^="stockin-record-item-"]').first();
    await expect(topRecord).toBeVisible();
    await expect(topRecord).toContainText('EDIT-001');
    await expect(topRecord).toContainText('3 雙');
    await expect(topRecord).toContainText('10.0');
    // 3 雙 * 5,200 成本 = 15,600
    await expect(topRecord).toContainText('15,600');
  });

  test('TC-EDIT-05: 歐碼鞋款點擊「+」號快捷入庫時，進貨紀錄尺碼明細精準顯示「45」而非硬轉「US 11.0」', async ({ page }) => {
    // 1. 前往庫存清單並展開卡片
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    await page.locator('[data-testid="inventory-card-EDIT-001"]').click();

    // 2. 點擊編輯按鈕
    await page.locator('[data-testid="btn-edit-product-EDIT-001"]').click();
    const modal = page.locator('[data-testid="stockin-modal"]');
    await expect(modal).toBeVisible();

    // 3. 切換為歐洲規格 EU，為 45 尺寸增加 1 雙
    await page.locator('[data-testid="stockin-unit-EU"]').click();
    const modalPlus45 = page.locator('[data-testid="stockin-size-plus-45"]');
    await modalPlus45.click();

    // 4. 點擊儲存變更
    await page.locator('[data-testid="btn-submit-stockin"]').click();
    await expect(modal).not.toBeVisible();

    // 5. 在庫存卡片中找到 45 尺碼方塊，點擊快捷「+」按鈕
    const cardPlus45 = page.locator('[data-testid="inventory-btn-plus-EDIT-001-11.0"]');
    await expect(cardPlus45).toBeVisible();
    await cardPlus45.click();

    // 6. 前往「紀錄中心」並切換至【進貨紀錄】
    await page.locator('[data-testid="nav-tab-records"]').click();
    await expect(page.locator('[data-testid="view-records"]')).toBeVisible();

    const stockInSubtab = page.locator('[data-testid="records-tab-stockin"]');
    await expect(stockInSubtab).toBeVisible();
    await stockInSubtab.click();

    // 7. 驗證最新進貨紀錄之尺碼明細精準為 45: 1雙，絕無 US 11.0
    const recordsList = page.locator('[data-testid="stockin-records-list"]');
    await expect(recordsList).toBeVisible();

    const topRecord = recordsList.locator('[data-testid^="stockin-record-item-"]').first();
    await expect(topRecord).toBeVisible();
    await expect(topRecord).toContainText('EDIT-001');
    await expect(topRecord).toContainText('45: 1雙');
    await expect(topRecord).not.toContainText('US 11.0');
  });
});
