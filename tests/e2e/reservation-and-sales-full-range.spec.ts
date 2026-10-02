import { test, expect } from '@playwright/test';

const SEED_TEST_PRODUCTS = [
  {
    id: 'test-seed-slipper-2233',
    sku: '2233',
    brand: '超輕H拖',
    name: '超輕H拖',
    color: '黑',
    category: '拖鞋',
    retailPrice: 100,
    costPrice: 70,
    barcode: '471000223301',
    displayLocation: 'A-01-L1',
    storageLocation: 'R1-C01-L1',
    procurementType: '寄賣',
    sizeUnit: 'EU',
    minSize: '41',
    maxSize: '45',
    variants: [
      {
        id: 'var-2233-44',
        productId: 'test-seed-slipper-2233',
        sizeUS: 10.0,
        sizeEU: 44.0,
        sizeCM: 28.0,
        sizeDisplay: '44',
        stock: 2,
      },
    ],
  },
  {
    id: 'test-seed-rainboot-1618',
    sku: '1618',
    brand: '短筒雨鞋',
    name: '短筒雨鞋',
    color: '粉點',
    category: '雨鞋',
    retailPrice: 300,
    costPrice: 190,
    barcode: '471000161801',
    displayLocation: 'C-01-L1',
    storageLocation: 'R2-C01-L1',
    procurementType: '寄賣',
    sizeUnit: 'EU',
    minSize: '47',
    maxSize: '47',
    variants: [
      {
        id: 'var-1618-37',
        productId: 'test-seed-rainboot-1618',
        sizeUS: 5.0,
        sizeEU: 37.0,
        sizeCM: 23.5,
        sizeDisplay: '37',
        stock: 1,
      },
      {
        id: 'var-1618-38',
        productId: 'test-seed-rainboot-1618',
        sizeUS: 6.0,
        sizeEU: 38.0,
        sizeCM: 24.0,
        sizeDisplay: '38',
        stock: 1,
      },
    ],
  },
];

test.describe('Rule 14 擴充驗證：客戶預訂與銷貨記帳全尺碼網格展示與防呆', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seedProducts) => {
      localStorage.clear();
      localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
      localStorage.setItem('shoe_store_sales_v1', JSON.stringify([]));
      localStorage.setItem('shoe_store_stockin_v1', JSON.stringify([]));
      localStorage.setItem('shoe_store_vendor_returns_v1', JSON.stringify([]));
      localStorage.setItem('shoe_store_reservations_v1', JSON.stringify([]));
    }, SEED_TEST_PRODUCTS);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('TC-RESERV-RANGE: 客戶預訂選取 2233 拖鞋，精準展開 41~45 (含 0 現貨之 41 號)，通用分段器隱藏，且 41 號可點選並成功建立預訂單', async ({ page }) => {
    // 1. 切換至「客戶預訂」標籤頁
    const reservTab = page.locator('[data-testid="nav-tab-reservations"], button:has-text("客戶預訂")').first();
    await reservTab.click();
    await expect(page.locator('text=客戶缺貨預訂')).toBeVisible();

    // 2. 搜尋並選取 2233
    const skuInput = page.locator('[data-testid="reservation-sku-input"]');
    await skuInput.fill('2233');
    const matchBtn = page.locator('button:has-text("2233")').first();
    await expect(matchBtn).toBeVisible();
    await matchBtn.click();

    // 3. 驗證通用分段器（全碼/男段/女段/青少年/童段）被隱藏
    await expect(page.locator('[data-testid="reservation-segment-all"]')).not.toBeVisible();
    await expect(page.locator('text=尺碼種類模版')).not.toBeVisible();

    // 4. 驗證 41~45 全尺碼展開
    for (const size of ['41', '42', '43', '44', '45']) {
      const btn = page.locator(`[data-testid="reservation-size-${size}"]`);
      await expect(btn).toBeVisible();
    }

    // 5. 驗證 41 號（0 現貨）顯示無現貨且仍為可點選 (enabled)
    const btn41 = page.locator('[data-testid="reservation-size-41"]');
    await expect(btn41).toBeEnabled();
    await expect(btn41).toContainText('無現貨');

    // 6. 點選 41 號
    await btn41.click();
    await expect(page.locator('text=已選：41')).toBeVisible();

    // 7. 填寫預訂資料並送出
    await page.fill('[data-testid="reservation-customer-name"]', '張三');
    await page.fill('[data-testid="reservation-customer-phone"]', '0912-345-678');
    await page.click('[data-testid="btn-submit-reservation"]');

    // 8. 驗證預訂單成功建立
    await expect(page.locator('text=張三').first()).toBeVisible();
    await expect(page.locator('text=41').first()).toBeVisible();
    await expect(page.locator('text=待進貨到貨').first()).toBeVisible();
  });

  test('TC-CASHIER-RANGE: 快速收銀選擇 2233 拖鞋，畫面展開 41~45 全尺碼，0雙規格反灰禁用且無法點擊，44 號（現貨 2 雙）可正常點擊並結帳', async ({ page }) => {
    // 1. 切換至「快速收銀」標籤頁
    const cashierTab = page.locator('[data-testid="nav-tab-cashier"], button:has-text("銷貨記帳"), button:has-text("收銀")').first();
    await cashierTab.click();
    await expect(page.locator('text=極速銷貨記帳')).toBeVisible();

    // 2. 搜尋並選取 2233
    const skuInput = page.locator('[data-testid="cashier-sku-input"]');
    await skuInput.fill('2233');
    const suggestion = page.locator('[data-testid="cashier-suggestion-item-2233"], button:has-text("2233")').first();
    await expect(suggestion).toBeVisible();
    await suggestion.click();

    // 3. 驗證 41~45 全尺碼皆展開在畫面上
    for (const size of ['41', '42', '43', '44', '45']) {
      const btn = page.locator(`[data-testid="cashier-size-btn-${size}"]`);
      await expect(btn).toBeVisible();
    }

    // 4. 驗證 41, 42, 43, 45 號顯示 0雙 且為 disabled 禁用
    for (const size of ['41', '42', '43', '45']) {
      const btn = page.locator(`[data-testid="cashier-size-btn-${size}"]`);
      await expect(btn).toBeDisabled();
      await expect(btn).toContainText('0雙');
    }

    // 5. 驗證 44 號顯示 2 雙且為 enabled 可點選
    const btn44 = page.locator('[data-testid="cashier-size-btn-44"]');
    await expect(btn44).toBeEnabled();
    await expect(btn44).toContainText('2雙');

    // 6. 點選 44 號並確認送出
    await btn44.click();
    await page.click('[data-testid="btn-submit-cashier-sale"]');

    // 7. 驗證流水帳中出現該筆銷貨
    await expect(page.locator('text=今日銷售流水帳')).toBeVisible();
    await expect(page.locator('text=2233').first()).toBeVisible();
    await expect(page.locator('text=44').first()).toBeVisible();
  });

  test('TC-ASSET-PROTECTION: 現貨資產絕對保護（Rule 14 條款 2 & 4）：1618 雨鞋區間設定為 47，但現貨 37 與 38 號在收銀端完整展示且可點選結帳', async ({ page }) => {
    // 1. 切換至「快速收銀」標籤頁
    const cashierTab = page.locator('[data-testid="nav-tab-cashier"]').first();
    await cashierTab.click();

    // 2. 搜尋並選取 1618
    const skuInput = page.locator('[data-testid="cashier-sku-input"]');
    await skuInput.fill('1618');
    const suggestion = page.locator('[data-testid="cashier-suggestion-item-1618"], button:has-text("1618")').first();
    await expect(suggestion).toBeVisible();
    await suggestion.click();

    // 3. 驗證 37, 38, 47 號皆出現
    const btn37 = page.locator('[data-testid="cashier-size-btn-37"]');
    const btn38 = page.locator('[data-testid="cashier-size-btn-38"]');
    const btn47 = page.locator('[data-testid="cashier-size-btn-47"]');

    await expect(btn37).toBeVisible();
    await expect(btn38).toBeVisible();
    await expect(btn47).toBeVisible();

    // 4. 37 與 38 號各 1 雙且為 enabled；47 號 0 雙且為 disabled
    await expect(btn37).toBeEnabled();
    await expect(btn37).toContainText('1雙');

    await expect(btn38).toBeEnabled();
    await expect(btn38).toContainText('1雙');

    await expect(btn47).toBeDisabled();
    await expect(btn47).toContainText('0雙');
  });



  test('TC-RESERV-ASSET-PROTECTION: 客戶預訂現貨資產保護：1618 雨鞋設定 47 碼，在庫現貨 37、38 與區間 47 皆可選，47 號 0 現貨可建立預訂', async ({ page }) => {
    // 1. 切換至「客戶預訂」
    const reservTab = page.locator('[data-testid="nav-tab-reservations"], button:has-text("客戶預訂")').first();
    await reservTab.click();

    // 2. 搜尋並選取 1618
    const skuInput = page.locator('[data-testid="reservation-sku-input"]');
    await skuInput.fill('1618');
    const matchBtn = page.locator('button:has-text("1618")').first();
    await expect(matchBtn).toBeVisible();
    await matchBtn.click();

    // 3. 驗證 37, 38, 47 號皆出現且皆為 enabled
    const btn37 = page.locator('[data-testid="reservation-size-37"]');
    const btn38 = page.locator('[data-testid="reservation-size-38"]');
    const btn47 = page.locator('[data-testid="reservation-size-47"]');

    await expect(btn37).toBeVisible();
    await expect(btn38).toBeVisible();
    await expect(btn47).toBeVisible();

    await expect(btn37).toBeEnabled();
    await expect(btn38).toBeEnabled();
    await expect(btn47).toBeEnabled();
    await expect(btn47).toContainText('無現貨');

    // 4. 點選 47 號並送出預訂單
    await btn47.click();
    await page.fill('[data-testid="reservation-customer-name"]', '李四');
    await page.fill('[data-testid="reservation-customer-phone"]', '0922-111-222');
    await page.click('[data-testid="btn-submit-reservation"]');

    // 5. 驗證預訂單成功建立
    await expect(page.locator('text=李四').first()).toBeVisible();
    await expect(page.locator('text=47').first()).toBeVisible();
  });
});
