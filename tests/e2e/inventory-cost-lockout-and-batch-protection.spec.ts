import { test, expect } from '@playwright/test';

const SEED_PRODUCT_TWO_BATCHES = [
  {
    id: 'test-two-batch-shoe',
    sku: 'DUAL-COST-001',
    brand: 'Nike',
    name: 'Air Max Multi-Batch Edition',
    color: '黑白',
    category: '休閒鞋',
    retailPrice: 3500,
    costPrice: 100, // Latest batch cost
    barcode: '471999888777',
    displayLocation: 'A-01-L1',
    storageLocation: 'R1-C01-L1',
    procurementType: '買斷',
    variants: [
      {
        id: 'var-db-1',
        productId: 'test-two-batch-shoe',
        sizeUS: 9.0,
        sizeEU: 42.5,
        sizeCM: 27.0,
        stock: 10, // 5 pairs from Batch 1, 5 pairs from Batch 2
        batches: [
          {
            id: 'batch-db-1',
            stockInId: 'stockin-batch-001',
            stockInOrderId: 'IN-20260901-001',
            timestamp: '2026-09-01T00:00:00.000Z',
            costPrice: 50,
            initialStock: 5,
            remainingStock: 5,
          },
          {
            id: 'batch-db-2',
            stockInId: 'stockin-batch-002',
            stockInOrderId: 'IN-20260902-002',
            timestamp: '2026-09-02T00:00:00.000Z',
            costPrice: 100,
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
    id: 'stockin-batch-002',
    orderId: 'IN-20260902-002',
    batchNo: 'IN-20260902-002',
    date: '2026-09-02',
    timestamp: '2026-09-02T00:00:00.000Z',
    vendor: 'Nike',
    sku: 'DUAL-COST-001',
    productName: 'Air Max Multi-Batch Edition',
    color: '黑白',
    sizeBreakdown: { 'US 9.0': 5 },
    totalPairs: 5,
    costPerPair: 100,
    totalCost: 500,
    operator: '門市人員',
    productId: 'test-two-batch-shoe',
  },
  {
    id: 'stockin-batch-001',
    orderId: 'IN-20260901-001',
    batchNo: 'IN-20260901-001',
    date: '2026-09-01',
    timestamp: '2026-09-01T00:00:00.000Z',
    vendor: 'Nike',
    sku: 'DUAL-COST-001',
    productName: 'Air Max Multi-Batch Edition',
    color: '黑白',
    sizeBreakdown: { 'US 9.0': 5 },
    totalPairs: 5,
    costPerPair: 50,
    totalCost: 250,
    operator: '門市人員',
    productId: 'test-two-batch-shoe',
  },
];

test.describe('庫存清單成本灰底鎖定與多批次歷史成本保護 E2E 測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ seedProducts, seedStockIns }) => {
        localStorage.clear();
        localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
        localStorage.setItem('shoe_store_sales_v1', JSON.stringify([]));
        localStorage.setItem('shoe_store_stockin_v1', JSON.stringify(seedStockIns));
        localStorage.setItem('shoe_store_vendor_returns_v1', JSON.stringify([]));
      },
      { seedProducts: SEED_PRODUCT_TWO_BATCHES, seedStockIns: SEED_STOCKIN_RECORDS }
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('防止所有鞋子成本遭覆蓋：庫存清單編輯模式下成本灰底禁用，引導至進貨紀錄明細精確修改打錯的新批次（100 -> 110），舊批次（50）完好保留', async ({ page }) => {
    // 1. 前往「庫存清單」
    await page.locator('[data-testid="nav-tab-inventory"]').click();
    await expect(page.locator('[data-testid="view-inventory"]')).toBeVisible();

    // 2. 展開商品卡片
    const shoeCard = page.locator('[data-testid="inventory-card-DUAL-COST-001"]');
    await expect(shoeCard).toBeVisible();
    await shoeCard.click();

    // 3. 點擊編輯按鈕開啟編輯模態框
    const editBtn = page.locator('[data-testid="btn-edit-product-DUAL-COST-001"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const modal = page.locator('[data-testid="stockin-modal"]');
    await expect(modal).toBeVisible();

    // 4. 核心驗證：成本欄位必須為灰底無法編輯（disabled/readOnly），並呈現鎖定徽章與警告提示
    const costInput = page.locator('[data-testid="stockin-input-cost"]');
    await expect(costInput).toBeDisabled();
    await expect(page.locator('[data-testid="badge-cost-locked"]')).toContainText('批次鎖定 (唯讀)');

    const notice = page.locator('[data-testid="cost-edit-locked-notice"]');
    // 預設保持介面整潔，警示框不預先展開
    await expect(notice).not.toBeVisible();

    // 點擊成本輸入區域或鎖定徽章時才跳出警示框
    await page.locator('[data-testid="cost-input-container"]').click();
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('進貨紀錄明細');
    await expect(notice).toContainText('庫存清單無法直接修改');

    // 5. 點擊引導按鈕：直接跳轉前往「進貨紀錄明細」修改成本
    const gotoRecordsBtn = page.locator('[data-testid="btn-goto-stockin-records"]');
    await expect(gotoRecordsBtn).toBeVisible();
    await gotoRecordsBtn.click();

    // 6. 模態框關閉，自動切換至「紀錄中心」➔「進貨紀錄」且過濾 DUAL-COST-001
    await expect(modal).not.toBeVisible();
    await expect(page.locator('[data-testid="view-records"]')).toBeVisible();

    // 7. 在進貨紀錄中，針對「打錯的新批次（$100）」點擊修改成本為 110
    const reviseBtnNewBatch = page.locator('[data-testid="btn-revise-cost-stockin-batch-002"]');
    await expect(reviseBtnNewBatch).toBeVisible();
    await reviseBtnNewBatch.click();

    const reviseModal = page.locator('[data-testid="modal-revise-stockin-cost"]');
    await expect(reviseModal).toBeVisible();

    const inputRevisedCost = page.locator('[data-testid="input-revised-cost"]');
    await inputRevisedCost.fill('110');
    await page.locator('[data-testid="input-revised-reason"]').fill('修正輸入錯誤成本');
    await page.locator('[data-testid="btn-confirm-revise-cost"]').click();
    await expect(reviseModal).not.toBeVisible();

    // 8. 驗證財務加總精準不變性：
    // 舊批次 5 雙 * $50 = $250
    // 新批次 5 雙 * $110 = $550
    // 總進貨成本應為 $250 + $550 = $800，絕非所有批次都被竄改為 110 的 $1,100！
    const totalCostSummary = page.locator('[data-testid="stockin-summary-total-cost"]');
    await expect(totalCostSummary).toContainText('800');
    await expect(totalCostSummary).not.toContainText('1,100');

    // 9. 驗證舊批次（stockin-batch-001）依然為有效單據，成本 $50 完好無缺
    const oldRecordItem = page.locator('[data-testid="stockin-record-item-stockin-batch-001"]');
    await expect(oldRecordItem).toBeVisible();
    await expect(oldRecordItem).toContainText('50');
    await expect(oldRecordItem).not.toContainText('已修訂');
  });
});
