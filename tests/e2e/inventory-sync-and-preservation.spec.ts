import { test, expect } from '@playwright/test';

const SEED_TEST_PRODUCTS = [
  {
    id: 'test-sync-shoe-1',
    sku: 'SYNC-999',
    brand: 'New Balance',
    name: 'NB 990v6 Grey',
    color: '元祖灰',
    category: '休閒鞋',
    retailPrice: 8680,
    costPrice: 5200,
    barcode: '454984512345',
    displayLocation: 'B-02',
    storageLocation: 'R2-01',
    variants: [
      { id: 'var-s1', productId: 'test-sync-shoe-1', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, stock: 5 },
      { id: 'var-s2', productId: 'test-sync-shoe-1', sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, stock: 0 }, // 斷碼 / 0庫存
    ],
  },
];

test.describe('庫存同步、銷貨防呆與歷史單據保留 E2E 測試', () => {
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

  test('TC-SYNC-01: 庫存清單點擊「+」，庫存+1 且「紀錄明細 -> 進貨入庫」自動同步產生單據', async ({ page }) => {
    // 1. 前往「庫存清單」
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    await expect(page.locator('[data-testid="view-inventory"]')).toBeVisible();

    // 2. 展開鞋款卡片
    const shoeCard = page.locator('[data-testid="inventory-card-SYNC-999"]');
    await expect(shoeCard).toBeVisible();
    await shoeCard.click();

    // 3. 檢查目前 US 8.5 庫存為 5 雙
    const stockDisplay = page.locator('[data-testid="inventory-stock-number-SYNC-999-8.5"]');
    await expect(stockDisplay).toContainText('5 雙');

    // 4. 點擊「+」按鈕
    const plusBtn = page.locator('[data-testid="inventory-btn-plus-SYNC-999-8.5"]');
    await expect(plusBtn).toBeVisible();
    await plusBtn.click();

    // 5. 驗證庫存變為 6 雙
    await expect(stockDisplay).toContainText('6 雙');

    // 6. 前往「紀錄明細」
    await page.locator('[data-testid="nav-tab-records"]').click();
    await expect(page.locator('[data-testid="view-records"]')).toBeVisible();

    // 7. 切換至「進貨紀錄」
    await page.locator('[data-testid="records-tab-stockin"]').click();

    // 8. 驗證進貨清單第一筆包含 SYNC-999、1 雙
    const stockInList = page.locator('[data-testid="stockin-records-list"]');
    await expect(stockInList).toBeVisible();
    const firstRecord = stockInList.locator('[data-testid^="stockin-record-item-"]').first();
    await expect(firstRecord).toContainText('SYNC-999');
    await expect(firstRecord).toContainText('1 雙');
  });

  test('TC-SYNC-02: 庫存清單點擊「-」，彈出出庫確認選單，點選「門市售出」扣庫 1 雙且在「銷貨紀錄」同步單據', async ({ page }) => {
    // 1. 前往「庫存清單」
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    await page.locator('[data-testid="inventory-card-SYNC-999"]').click();

    // 2. 點擊「-」按鈕
    const minusBtn = page.locator('[data-testid="inventory-btn-minus-SYNC-999-8.5"]');
    await expect(minusBtn).toBeVisible();
    await minusBtn.click();

    // 3. 驗證彈出出庫確認選單
    const saleOption = page.locator('[data-testid="deduct-option-sale"]');
    await expect(saleOption).toBeVisible();
    await expect(saleOption).toContainText('門市售出（計入銷貨）');

    // 4. 點擊「門市售出（計入銷貨）」
    await saleOption.click();

    // 5. 驗證庫存從 5 雙變為 4 雙
    const stockDisplay = page.locator('[data-testid="inventory-stock-number-SYNC-999-8.5"]');
    await expect(stockDisplay).toContainText('4 雙');

    // 6. 前往「紀錄明細」->「銷貨紀錄」
    await page.locator('[data-testid="nav-tab-records"]').click();
    await page.locator('[data-testid="records-tab-sales"]').click();

    // 7. 驗證銷貨清單第一筆包含 SYNC-999 與定價 $8,680
    const salesList = page.locator('[data-testid="sales-records-list"]');
    await expect(salesList).toBeVisible();
    const topSale = salesList.locator('[data-testid^="sales-record-item-"]').first();
    await expect(topSale).toContainText('SYNC-999');
    await expect(topSale).toContainText('8,680');
    await expect(topSale).toContainText('已售出');
  });

  test('TC-SYNC-03: 銷貨記帳防呆：缺貨尺碼反灰禁用，未選擇現有庫存不可提交', async ({ page }) => {
    // 1. 前往「銷貨記帳」
    await page.locator('[data-testid="nav-tab-cashier"]').click();
    await expect(page.locator('[data-testid="view-cashier"]')).toBeVisible();

    // 2. 尚未選擇鞋款時，確認賣出按鈕為禁用狀態
    const submitBtn = page.locator('[data-testid="btn-submit-cashier-sale"]');
    await expect(submitBtn).toBeDisabled();

    // 3. 搜尋 SYNC-999 並點選帶入
    const skuInput = page.locator('[data-testid="cashier-sku-input"]');
    await skuInput.fill('SYNC');
    const suggestionItem = page.locator('[data-testid="cashier-suggestion-item-SYNC-999"]');
    await expect(suggestionItem).toBeVisible();
    await suggestionItem.click();

    // 4. 驗證 US 9.0（0庫存）按鈕為 disabled 且顯示缺貨
    const outOfStockBtn = page.locator('[data-testid="cashier-size-btn-9"]');
    await expect(outOfStockBtn).toBeVisible();
    await expect(outOfStockBtn).toBeDisabled();
    await expect(outOfStockBtn).toContainText('缺貨');

    // 5. 驗證 US 8.5（有庫存）為可點選
    const inStockBtn = page.locator('[data-testid="cashier-size-btn-8.5"]');
    await expect(inStockBtn).toBeEnabled();
    await expect(inStockBtn).toContainText('5雙');

    // 6. 點選有庫存的尺寸後，送出按鈕變為可用
    await inStockBtn.click();
    await expect(submitBtn).toBeEnabled();
  });

  test('TC-SYNC-04: 庫存清單刪除鞋款後，該鞋款在庫存移除，但歷史銷貨與進貨紀錄完整保留', async ({ page }) => {
    // 1. 先在「銷貨記帳」完成一筆 SYNC-999 的銷貨
    await page.locator('[data-testid="nav-tab-cashier"]').click();
    const skuInput = page.locator('[data-testid="cashier-sku-input"]');
    await skuInput.fill('SYNC');
    await page.locator('[data-testid="cashier-suggestion-item-SYNC-999"]').click();
    await page.locator('[data-testid="cashier-size-btn-8.5"]').click();
    await page.locator('[data-testid="btn-submit-cashier-sale"]').click();

    // 2. 再前往「庫存清單」，對該鞋款點擊「+」新增進貨紀錄
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    await page.locator('[data-testid="inventory-card-SYNC-999"]').click();
    await page.locator('[data-testid="inventory-btn-plus-SYNC-999-8.5"]').click();

    // 3. 確認紀錄明細中已有銷貨與進貨紀錄
    await page.locator('[data-testid="nav-tab-records"]').click();
    await page.locator('[data-testid="records-tab-sales"]').click();
    await expect(page.locator('[data-testid="sales-records-list"]')).toContainText('SYNC-999');
    await page.locator('[data-testid="records-tab-stockin"]').click();
    await expect(page.locator('[data-testid="stockin-records-list"]')).toContainText('SYNC-999');

    // 4. 回到庫存清單並刪除該鞋款
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    await page.locator('[data-testid="inventory-card-SYNC-999"]').click();

    page.on('dialog', (dialog) => dialog.accept());
    const deleteBtn = page.locator('button:has-text("刪除")').first();
    await deleteBtn.click();

    // 5. 驗證庫存清單中已無 SYNC-999
    await expect(page.locator('[data-testid="inventory-card-SYNC-999"]')).not.toBeVisible();

    // 6. 前往「紀錄明細」，驗證銷貨紀錄仍然完整存在！
    await page.locator('[data-testid="nav-tab-records"]').click();
    await page.locator('[data-testid="records-tab-sales"]').click();
    await expect(page.locator('[data-testid="sales-records-list"]')).toContainText('SYNC-999');

    // 7. 驗證進貨紀錄也仍然完整存在！
    await page.locator('[data-testid="records-tab-stockin"]').click();
    await expect(page.locator('[data-testid="stockin-records-list"]')).toContainText('SYNC-999');
  });
});
