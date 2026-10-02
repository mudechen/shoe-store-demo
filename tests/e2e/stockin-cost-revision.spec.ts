import { test, expect } from '@playwright/test';

const SEED_TEST_PRODUCTS = [
  {
    id: 'test-cost-shoe-1',
    sku: 'COST-REV-001',
    brand: 'Nike',
    name: 'Air Max Revision Test',
    color: '純白',
    category: '休閒鞋',
    retailPrice: 4500,
    costPrice: 2000,
    barcode: '471000111222',
    displayLocation: 'A-01-L1',
    storageLocation: 'R1-C01-L1',
    procurementType: '買斷',
    variants: [
      {
        id: 'var-cr-1',
        productId: 'test-cost-shoe-1',
        sizeUS: 8.5,
        sizeEU: 42.0,
        sizeCM: 26.5,
        stock: 5,
        batches: [
          {
            id: 'batch-cr-1',
            stockInOrderId: 'IN-20260901-001',
            timestamp: '2026-09-01T00:00:00.000Z',
            costPrice: 2000,
            initialStock: 5,
            remainingStock: 5,
          },
        ],
      },
    ],
  },
];

const SEED_STOCKIN_RECORDS = [
  {
    id: 'stockin-initial-001',
    orderId: 'IN-20260901-001',
    batchNo: 'IN-20260901-001',
    date: '2026-09-01',
    timestamp: '2026-09-01T00:00:00.000Z',
    vendor: 'Nike',
    sku: 'COST-REV-001',
    productName: 'Air Max Revision Test',
    color: '純白',
    sizeBreakdown: { 'US 8.5': 5 },
    totalPairs: 5,
    costPerPair: 2000,
    totalCost: 10000,
    operator: '門市人員',
    productId: 'test-cost-shoe-1',
  },
];

test.describe('庫存清單成本修改與進貨紀錄版本化同步 E2E 測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ seedProducts, seedStockIns }) => {
        localStorage.clear();
        localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
        localStorage.setItem('shoe_store_sales_v1', JSON.stringify([]));
        localStorage.setItem('shoe_store_stockin_v1', JSON.stringify(seedStockIns));
        localStorage.setItem('shoe_store_vendor_returns_v1', JSON.stringify([]));
      },
      { seedProducts: SEED_TEST_PRODUCTS, seedStockIns: SEED_STOCKIN_RECORDS }
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('TC-COST-REV-01: 庫存清單成本灰底鎖定無法直接編輯，點擊提示按鈕前往進貨紀錄明細修改成本後，進貨紀錄保留舊單為已修訂存檔、產生新修訂版、且加總僅計新成本', async ({ page }) => {
    // 1. 前往「庫存清單」
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    await expect(page.locator('[data-testid="view-inventory"]')).toBeVisible();

    // 2. 展開商品卡片並開啟編輯模態框
    const shoeCard = page.locator('[data-testid="inventory-card-COST-REV-001"]');
    await expect(shoeCard).toBeVisible();
    await shoeCard.click();

    const editBtn = page.locator('[data-testid="btn-edit-product-COST-REV-001"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const modal = page.locator('[data-testid="stockin-modal"]');
    await expect(modal).toBeVisible();

    // 3. 驗證成本灰底鎖定無法直接編輯，並呈現前往進貨紀錄明細修改之提示
    const costInput = page.locator('[data-testid="stockin-input-cost"]');
    await expect(costInput).toHaveValue('2000');
    await expect(costInput).toBeDisabled();
    await expect(page.locator('[data-testid="badge-cost-locked"]')).toBeVisible();
    const notice = page.locator('[data-testid="cost-edit-locked-notice"]');
    // 預設保持介面整潔，警示框未展開
    await expect(notice).not.toBeVisible();
    await page.locator('[data-testid="cost-input-container"]').click();
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('進貨紀錄明細');

    // 4. 點擊提示內的快捷按鈕前往「進貨紀錄明細」
    const gotoRecordsBtn = page.locator('[data-testid="btn-goto-stockin-records"]');
    await expect(gotoRecordsBtn).toBeVisible();
    await gotoRecordsBtn.click();

    // 5. 模態框關閉，自動切換至「紀錄中心」➔「進貨紀錄」且過濾該貨號
    await expect(modal).not.toBeVisible();
    await expect(page.locator('[data-testid="view-records"]')).toBeVisible();

    // 6. 在進貨紀錄找到該單據並點擊「修改成本」
    const reviseBtn = page.locator('[data-testid^="btn-revise-cost-"]').first();
    await expect(reviseBtn).toBeVisible();
    await reviseBtn.click();

    const reviseModal = page.locator('[data-testid="modal-revise-stockin-cost"]');
    await expect(reviseModal).toBeVisible();

    const inputCost = page.locator('[data-testid="input-revised-cost"]');
    await inputCost.fill('2500');
    await page.locator('[data-testid="btn-confirm-revise-cost"]').click();
    await expect(reviseModal).not.toBeVisible();

    // 7. 驗證加總：5 雙 * $2,500 = $12,500，絕無 $10,000 + $12,500 = $22,500 重複計算
    const totalCostSummary = page.locator('[data-testid="stockin-summary-total-cost"]');
    await expect(totalCostSummary).toContainText('12,500');
    await expect(totalCostSummary).not.toContainText('22,500');

    const totalPairsSummary = page.locator('[data-testid="stockin-summary-total-pairs"]');
    await expect(totalPairsSummary).toContainText('5 雙');
    await expect(totalPairsSummary).not.toContainText('10 雙');

    // 7. 驗證列表中同時展示：歷史版本（已修訂、刪除線）與最新修訂版（Rev.1、有效成本 $2,500）
    const supersededBadge = page.locator('[data-testid^="stockin-record-badge-superseded-"]');
    await expect(supersededBadge).toBeVisible();
    await expect(supersededBadge).toContainText('歷史版本 (已修訂)');

    const revisedBadge = page.locator('[data-testid^="stockin-record-badge-revised-"]');
    await expect(revisedBadge).toBeVisible();
    await expect(revisedBadge).toContainText('最新修訂版 (Rev.1)');

    // 8. 驗證切換「隱藏已修訂紀錄」按鈕
    const toggleHideBtn = page.locator('[data-testid="toggle-hide-superseded"]');
    await expect(toggleHideBtn).toBeVisible();
    await toggleHideBtn.click();

    // 隱藏後，歷史版本徽章不可見，最新修訂版依然可見
    await expect(supersededBadge).not.toBeVisible();
    await expect(revisedBadge).toBeVisible();

    // 再次點擊顯示
    await toggleHideBtn.click();
    await expect(supersededBadge).toBeVisible();
  });

  test('TC-COST-REV-02: 在進貨紀錄使用「單筆修改成本」按鈕精確微調單據成本', async ({ page }) => {
    // 1. 前往「紀錄中心」➔「進貨紀錄」
    await page.locator('[data-testid="nav-tab-records"]').click();
    await page.locator('[data-testid="records-tab-stockin"]').click();

    // 2. 找到有效單據的「修改成本」按鈕並點擊
    const reviseBtn = page.locator('[data-testid^="btn-revise-cost-"]').first();
    await expect(reviseBtn).toBeVisible();
    await reviseBtn.click();

    // 3. 驗證彈出微調彈窗
    const reviseModal = page.locator('[data-testid="modal-revise-stockin-cost"]');
    await expect(reviseModal).toBeVisible();

    // 4. 輸入新成本 2,200 與備註
    const inputCost = page.locator('[data-testid="input-revised-cost"]');
    await inputCost.fill('2200');

    const inputReason = page.locator('[data-testid="input-revised-reason"]');
    await inputReason.fill('廠商回溯折讓');

    // 5. 確認修訂
    await page.locator('[data-testid="btn-confirm-revise-cost"]').click();
    await expect(reviseModal).not.toBeVisible();

    // 6. 驗證加總更新為 5 * 2,200 = 11,000
    const totalCostSummary = page.locator('[data-testid="stockin-summary-total-cost"]');
    await expect(totalCostSummary).toContainText('11,000');

    // 7. 驗證最新修訂版標記 Rev.1 且備註有修訂說明
    const revisedBadge = page.locator('[data-testid^="stockin-record-badge-revised-"]');
    await expect(revisedBadge).toBeVisible();
    await expect(page.locator('text=廠商回溯折讓')).toBeVisible();
  });

  test('TC-COST-REV-03: 連續多次修訂成本（Rev.1 -> Rev.2），驗證版本號遞增、舊版本全數標記已修訂且加總依然嚴格準確', async ({ page }) => {
    // 1. 前往「紀錄中心」➔「進貨紀錄」
    await page.locator('[data-testid="nav-tab-records"]').click();
    await page.locator('[data-testid="records-tab-stockin"]').click();

    // 2. 第一次修訂：2,000 -> 2,200
    const reviseBtn1 = page.locator('[data-testid^="btn-revise-cost-"]').first();
    await reviseBtn1.click();
    await page.locator('[data-testid="input-revised-cost"]').fill('2200');
    await page.locator('[data-testid="input-revised-reason"]').fill('第一次調價');
    await page.locator('[data-testid="btn-confirm-revise-cost"]').click();

    // 驗證第一次修訂 Rev.1
    await expect(page.locator('[data-testid^="stockin-record-badge-revised-"]')).toContainText('最新修訂版 (Rev.1)');
    await expect(page.locator('[data-testid="stockin-summary-total-cost"]')).toContainText('11,000');

    // 3. 第二次修訂：2,200 -> 2,400（點擊 Rev.1 上的修改成本按鈕）
    const reviseBtn2 = page.locator('[data-testid^="btn-revise-cost-"]').first();
    await reviseBtn2.click();
    await page.locator('[data-testid="input-revised-cost"]').fill('2400');
    await page.locator('[data-testid="input-revised-reason"]').fill('第二次調價');
    await page.locator('[data-testid="btn-confirm-revise-cost"]').click();

    // 4. 驗證最新修訂版為 Rev.2，加總 5 * 2,400 = 12,000
    await expect(page.locator('[data-testid^="stockin-record-badge-revised-"]')).toContainText('最新修訂版 (Rev.2)');
    await expect(page.locator('[data-testid="stockin-summary-total-cost"]')).toContainText('12,000');

    // 5. 驗證共有 2 筆歷史已修訂單據
    const supersededBadges = page.locator('[data-testid^="stockin-record-badge-superseded-"]');
    await expect(supersededBadges).toHaveCount(2);

    // 6. 點擊隱藏已修訂紀錄
    const toggleHideBtn = page.locator('[data-testid="toggle-hide-superseded"]');
    await toggleHideBtn.click();
    await expect(supersededBadges).toHaveCount(0);
    await expect(page.locator('[data-testid^="stockin-record-badge-revised-"]')).toBeVisible();
  });

  test('TC-COST-REV-04: 單筆單據修訂成本後，商品庫存成本與 FIFO 批次同步更新', async ({ page }) => {
    // 1. 前往「紀錄中心」➔「進貨紀錄」
    await page.locator('[data-testid="nav-tab-records"]').click();
    await page.locator('[data-testid="records-tab-stockin"]').click();

    // 2. 修訂成本為 2,300
    const reviseBtn = page.locator('[data-testid^="btn-revise-cost-"]').first();
    await reviseBtn.click();
    await page.locator('[data-testid="input-revised-cost"]').fill('2300');
    await page.locator('[data-testid="btn-confirm-revise-cost"]').click();

    // 3. 前往「庫存清單」，驗證商品成本價已同步更新為 $2,300
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    const shoeCard = page.locator('[data-testid="inventory-card-COST-REV-001"]');
    await expect(shoeCard).toBeVisible();
    await expect(shoeCard).toContainText(/(2300|2,300)/);
  });
});
