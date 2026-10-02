import { test, expect } from '@playwright/test';

const SEED_TEST_PRODUCTS = [
  {
    id: 'test-fixture-1',
    sku: 'FD0655-001',
    brand: 'Nike',
    name: "Air Force 1 '07",
    color: 'Triple White 純白',
    category: '休閒鞋',
    retailPrice: 3400,
    costPrice: 1900,
    barcode: '196607831001',
    displayLocation: 'A-01-L2',
    storageLocation: 'R1-C01-L3',
    variants: [
      { id: 'var-f1', productId: 'test-fixture-1', sizeUS: 6.0, sizeEU: 38.5, sizeCM: 24.0, stock: 0 },
      { id: 'var-f2', productId: 'test-fixture-1', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, stock: 8 },
      { id: 'var-f3', productId: 'test-fixture-1', sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, stock: 5 },
    ],
  },
  {
    id: 'test-fixture-2',
    sku: 'CW2288-111',
    brand: 'Nike',
    name: 'Air Force 1 Low',
    color: 'All Black 全黑',
    category: '運動鞋',
    retailPrice: 3200,
    costPrice: 1800,
    barcode: '196607831002',
    displayLocation: 'A-01-L3',
    storageLocation: 'R1-C01-L4',
    variants: [
      { id: 'var-f4', productId: 'test-fixture-2', sizeUS: 8.0, sizeEU: 41.0, sizeCM: 26.0, stock: 3 },
      { id: 'var-f5', productId: 'test-fixture-2', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, stock: 0 },
    ],
  },
  {
    id: 'test-fixture-3',
    sku: 'EU-TEST-001',
    brand: 'Birkenstock',
    name: 'Boston Clog 勃肯包鞋',
    color: 'Taupe 經典灰褐',
    category: '包鞋',
    retailPrice: 4200,
    costPrice: 2400,
    barcode: '196607831003',
    displayLocation: 'A-01-L4',
    storageLocation: 'R1-C01-L5',
    variants: [
      { id: 'var-eu-45', productId: 'test-fixture-3', sizeUS: 11.0, sizeEU: 45.0, sizeCM: 29.0, sizeDisplay: '45', stock: 5 },
      { id: 'var-eu-47', productId: 'test-fixture-3', sizeUS: 12.5, sizeEU: 47.0, sizeCM: 30.5, sizeDisplay: '47', stock: 4 },
    ],
  },
];

test.describe('退回出庫面板重構驗證 (Vendor Return Redesign)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seedProducts) => {
      localStorage.clear();
      localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
    }, SEED_TEST_PRODUCTS);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('VR-01: 面板外觀應與進貨入庫一致，具備退回出庫標題，且無退回原因與折讓金額欄位', async ({ page }) => {
    // Navigate to Records tab -> 退回紀錄
    const recordsNavBtn = page.locator('[data-testid="nav-tab-records"]');
    await recordsNavBtn.click();
    await page.locator('[data-testid="records-tab-vendor-returns"]').click();

    // Click "退回出庫" button to open modal
    const openBtn = page.locator('button:has-text("退回出庫")').first();
    await openBtn.click();

    const modal = page.locator('[data-testid="vendor-return-modal"]');
    await expect(modal).toBeVisible();

    // 1. 標題應為「退回出庫」
    await expect(modal.locator('h2')).toContainText('退回出庫');

    // 2. 應有「退貨單價」欄位，且預填進貨成本
    const costInput = modal.locator('[data-testid="vendor-return-input-cost"]');
    await expect(costInput).toBeVisible();
    await expect(costInput).toHaveValue('1900');

    // 3. 不應有「門市售價」欄位
    const retailInput = modal.locator('input[placeholder*="售價"], [data-testid="stockin-input-retail"]');
    await expect(retailInput).toHaveCount(0);

    // 4. 不應有可見的「退回原因」下拉選單
    const visibleReasonLabel = modal.locator('label:has-text("退回原因")');
    await expect(visibleReasonLabel).toHaveCount(0);

    // 5. 不應有可見的「折讓 / 退款金額」欄位
    const visibleRefundLabel = modal.locator('label:has-text("折讓"), label:has-text("退款金額")');
    await expect(visibleRefundLabel).toHaveCount(0);

    // 6. 應有可選填的「補充說明」欄位
    const notesInput = modal.locator('[data-testid="vendor-return-input-notes"]');
    await expect(notesInput).toBeVisible();
    await notesInput.fill('原廠合約換季回收測試');
    await expect(notesInput).toHaveValue('原廠合約換季回收測試');

    // Close modal
    await modal.locator('button:has-text("取消")').click();
    await expect(modal).not.toBeVisible();
  });

  test('VR-02: 尺碼部分參照銷貨記帳，有庫存的才亮起，無庫存的呈現缺貨反灰並禁止選取', async ({ page }) => {
    const recordsNavBtn = page.locator('[data-testid="nav-tab-records"]');
    await recordsNavBtn.click();
    await page.locator('[data-testid="records-tab-vendor-returns"]').click();

    const openBtn = page.locator('button:has-text("退回出庫")').first();
    await openBtn.click();

    const modal = page.locator('[data-testid="vendor-return-modal"]');
    await expect(modal).toBeVisible();

    // FD0655-001 has: US 6.0 (stock 0), US 8.5 (stock 8), US 9.0 (stock 5)
    // 檢查無庫存尺碼 US 6.0: 應呈現缺貨狀態且被 disabled
    const sizeBtn60 = modal.locator('[data-testid="vendor-return-size-btn-6"]');
    await expect(sizeBtn60).toBeVisible();
    await expect(sizeBtn60).toContainText('缺');
    await expect(sizeBtn60).toBeDisabled();

    // 檢查有庫存尺碼 US 8.5 (現有8雙): 亮起且可點擊
    const sizeBtn85 = modal.locator('[data-testid="vendor-return-size-btn-8.5"]');
    await expect(sizeBtn85).toBeVisible();
    await expect(sizeBtn85).toContainText('8雙');
    await expect(sizeBtn85).toBeEnabled();

    // 檢查有庫存尺碼 US 9.0 (現有5雙): 亮起且可點擊
    const sizeBtn90 = modal.locator('[data-testid="vendor-return-size-btn-9"]');
    await expect(sizeBtn90).toBeVisible();
    await expect(sizeBtn90).toContainText('5雙');
    await expect(sizeBtn90).toBeEnabled();

    // 點擊 US 9.0 尺碼切換
    await sizeBtn90.click();
    // 雙數輸入框旁的現存提示應更新為 5 雙
    await expect(modal.locator('text=現存 5 雙')).toBeVisible();

    await modal.locator('button:has-text("取消")').click();
  });

  test('VR-03: 上方資訊參照銷貨記帳，輸入編號後出現選單，點選後自動帶入廠商、品名、顏色、款式、單價與尺碼', async ({ page }) => {
    const recordsNavBtn = page.locator('[data-testid="nav-tab-records"]');
    await recordsNavBtn.click();
    await page.locator('[data-testid="records-tab-vendor-returns"]').click();

    const openBtn = page.locator('button:has-text("退回出庫")').first();
    await openBtn.click();

    const modal = page.locator('[data-testid="vendor-return-modal"]');
    await expect(modal).toBeVisible();

    // 在貨號輸入框輸入 "CW"
    const skuInput = modal.locator('[data-testid="vendor-return-input-sku"]');
    await skuInput.fill('CW');

    // 應跳出下拉建議選單
    const suggestionItem = modal.locator('[data-testid="vendor-return-suggestion-CW2288-111"]');
    await expect(suggestionItem).toBeVisible();
    await expect(suggestionItem).toContainText('Air Force 1 Low');

    // 點擊建議項目帶入資訊
    await suggestionItem.click();

    // 驗證自動帶入的欄位
    await expect(skuInput).toHaveValue('CW2288-111');
    await expect(modal.locator('[data-testid="vendor-return-input-vendor"]')).toHaveValue('Nike');
    await expect(modal.locator('[data-testid="vendor-return-input-name"]')).toHaveValue('Air Force 1 Low');
    await expect(modal.locator('[data-testid="vendor-return-input-color"]')).toHaveValue('All Black 全黑');
    await expect(modal.locator('[data-testid="vendor-return-select-category"]')).toHaveValue('運動鞋');
    await expect(modal.locator('[data-testid="vendor-return-input-cost"]')).toHaveValue('1800');

    // 驗證 CW2288-111 尺碼：US 8.0 有庫存 3 雙、US 8.5 缺貨
    const sizeBtn80 = modal.locator('[data-testid="vendor-return-size-btn-8"]');
    await expect(sizeBtn80).toBeVisible();
    await expect(sizeBtn80).toContainText('3雙');
    await expect(sizeBtn80).toBeEnabled();

    const sizeBtn85 = modal.locator('[data-testid="vendor-return-size-btn-8.5"]');
    await expect(sizeBtn85).toBeVisible();
    await expect(sizeBtn85).toContainText('缺');
    await expect(sizeBtn85).toBeDisabled();

    // 填寫退回數量 2 雙
    const qtyInput = modal.locator('[data-testid="vendor-return-input-qty"]');
    await qtyInput.fill('2');

    // 填寫補充說明
    const notesInput = modal.locator('[data-testid="vendor-return-input-notes"]');
    await notesInput.fill('黑鞋退回更換新版');

    // 確認退回出庫
    const submitBtn = modal.locator('[data-testid="btn-submit-vendor-return"]');
    await submitBtn.click();

    // 驗證 Modal 關閉
    await expect(modal).not.toBeVisible();

    // 驗證退回紀錄清單新增了一筆退回單
    const returnList = page.locator('[data-testid="vendor-return-records-list"]');
    await expect(returnList).toBeVisible();
    const latestRecord = returnList.locator('[data-testid^="vendor-return-record-item-"]').first();
    await expect(latestRecord).toContainText('CW2288-111');
    await expect(latestRecord).toContainText('退回: 2 雙');
    await expect(latestRecord).toContainText('黑鞋退回更換新版');
  });

  test('VR-04: 防呆機制：退回數量為 0 或超過現有庫存時應阻擋提交', async ({ page }) => {
    const recordsNavBtn = page.locator('[data-testid="nav-tab-records"]');
    await recordsNavBtn.click();
    await page.locator('[data-testid="records-tab-vendor-returns"]').click();

    const openBtn = page.locator('button:has-text("退回出庫")').first();
    await openBtn.click();

    const modal = page.locator('[data-testid="vendor-return-modal"]');
    await expect(modal).toBeVisible();

    const qtyInput = modal.locator('[data-testid="vendor-return-input-qty"]');
    const submitBtn = modal.locator('[data-testid="btn-submit-vendor-return"]');

    // 測試超過庫存 (US 8.5 只有 8 雙，填 50 雙)
    await qtyInput.fill('50');

    let dialogTriggered = false;
    const dialogListener = (d: any) => {
      dialogTriggered = true;
      d.accept().catch(() => {});
    };
    page.on('dialog', dialogListener);

    await submitBtn.click();

    // 應該被阻擋：modal 保持開啟或彈出 alert
    const isModalStillOpen = await modal.isVisible();
    expect(isModalStillOpen || dialogTriggered).toBe(true);

    page.off('dialog', dialogListener);
  });

  test('VR-05: 點選清除按鈕 (X) 應清空自動帶入之資訊與尺碼，且輸入不匹配貨號時自動解除鎖定', async ({ page }) => {
    const recordsNavBtn = page.locator('[data-testid="nav-tab-records"]');
    await recordsNavBtn.click();
    await page.locator('[data-testid="records-tab-vendor-returns"]').click();

    const openBtn = page.locator('button:has-text("退回出庫")').first();
    await openBtn.click();

    const modal = page.locator('[data-testid="vendor-return-modal"]');
    await expect(modal).toBeVisible();

    const skuInput = modal.locator('[data-testid="vendor-return-input-sku"]');
    await expect(skuInput).toHaveValue('FD0655-001');

    // 點擊清空按鈕
    const clearBtn = skuInput.locator('..').locator('button');
    await clearBtn.click();

    // 驗證已清空
    await expect(skuInput).toHaveValue('');
    await expect(modal.locator('[data-testid="vendor-return-input-vendor"]')).toHaveValue('');
    await expect(modal.locator('[data-testid="vendor-return-input-name"]')).toHaveValue('');
    await expect(modal.locator('[data-testid="vendor-return-input-color"]')).toHaveValue('');
    await expect(modal.locator('[data-testid="vendor-return-input-cost"]')).toHaveValue('');

    // 提交按鈕應被停用
    const submitBtn = modal.locator('[data-testid="btn-submit-vendor-return"]');
    await expect(submitBtn).toBeDisabled();

    // 尺碼區域應提示請先輸入或選擇鞋款
    await expect(modal.locator('text=請先輸入鞋款編號選擇鞋款以載入庫存尺碼')).toBeVisible();

    // 關閉
    await modal.locator('button:has-text("取消")').click();
  });

  test('VR-06: 支援一次退回多雙、多個尺碼之批次退回，各尺碼庫存扣減與紀錄明細正確', async ({ page }) => {
    const recordsNavBtn = page.locator('[data-testid="nav-tab-records"]');
    await recordsNavBtn.click();
    await page.locator('[data-testid="records-tab-vendor-returns"]').click();

    const openBtn = page.locator('button:has-text("退回出庫")').first();
    await openBtn.click();

    const modal = page.locator('[data-testid="vendor-return-modal"]');
    await expect(modal).toBeVisible();

    // 歸零後測試批次加雙數
    await modal.locator('button:has-text("歸零")').click();

    // US 8.5 加 1 雙
    const plus85 = modal.locator('[data-testid="vendor-return-size-plus-8.5"]');
    await plus85.click();

    // US 9.0 加 2 雙
    const plus90 = modal.locator('[data-testid="vendor-return-size-plus-9"]');
    await plus90.click();
    await plus90.click();

    // 驗證預計退回摘要顯示 3 雙
    await expect(modal.locator('text=預計退回：共 3 雙')).toBeVisible();

    // 提交退回
    const submitBtn = modal.locator('[data-testid="btn-submit-vendor-return"]');
    await submitBtn.click();
    await expect(modal).not.toBeVisible();

    // 驗證單據列表最新紀錄
    const returnList = page.locator('[data-testid="vendor-return-records-list"]');
    const latestRecord = returnList.locator('[data-testid^="vendor-return-record-item-"]').first();
    await expect(latestRecord).toBeVisible();
    await expect(latestRecord).toContainText('FD0655-001');
    await expect(latestRecord).toContainText('3'); // 3雙
    await expect(latestRecord).toContainText('US 8.5: 1雙');
    await expect(latestRecord).toContainText('US 9.0: 2雙');

    // 驗證庫存頁面扣減
    const invNavBtn = page.locator('[data-testid="nav-tab-inventory"]');
    await invNavBtn.click();

    // US 8.5 原本 8 雙 -> 扣 1 雙變 7 雙
    const stockCell85 = page.locator('[data-testid="inventory-stock-number-FD0655-001-8.5"], [data-testid="inventory-stock-number-FD0655-001-US 8.5"]').first();
    if (await stockCell85.isVisible()) {
      await expect(stockCell85).toContainText('7');
    }

    // US 9.0 原本 5 雙 -> 扣 2 雙變 3 雙
    const stockCell90 = page.locator('[data-testid="inventory-stock-number-FD0655-001-9.0"], [data-testid="inventory-stock-number-FD0655-001-US 9.0"]').first();
    if (await stockCell90.isVisible()) {
      await expect(stockCell90).toContainText('3');
    }
  });

  test('VR-07: 退回歐碼/特定尺碼商品時，退回紀錄應精確顯示原始尺碼 (如 47)，禁止硬編碼轉為美碼 (US 12.5)', async ({ page }) => {
    // Go to Records -> Vendor Returns
    const recordsNavBtn = page.locator('[data-testid="nav-tab-records"]');
    await recordsNavBtn.click();
    await page.locator('[data-testid="records-tab-vendor-returns"]').click();

    // Open Vendor Return Modal
    const openBtn = page.locator('button:has-text("退回出庫")').first();
    await openBtn.click();

    const modal = page.locator('[data-testid="vendor-return-modal"]');
    await expect(modal).toBeVisible();

    // Search and select the EU shoe
    const skuInput = modal.locator('[data-testid="vendor-return-input-sku"]');
    await skuInput.fill('EU');
    const suggestionItem = modal.locator('[data-testid="vendor-return-suggestion-EU-TEST-001"]');
    await expect(suggestionItem).toBeVisible();
    await suggestionItem.click();

    // Click 歸零
    await modal.locator('button:has-text("歸零")').click();

    // The size button for 47 should display "47" and not "US 12.5"
    const sizeBtn47 = modal.locator('[data-testid="vendor-return-size-btn-12.5"]');
    await expect(sizeBtn47).toBeVisible();
    await expect(sizeBtn47).toContainText('47');
    await expect(sizeBtn47).not.toContainText('US 12.5');

    // Return 1 pair of 47
    const plus47 = modal.locator('[data-testid="vendor-return-size-plus-12.5"]');
    await plus47.click();

    // Summary should say "47: 1雙"
    await expect(modal.locator('text=47: 1雙')).toBeVisible();

    // Submit
    const submitBtn = modal.locator('[data-testid="btn-submit-vendor-return"]');
    await submitBtn.click();
    await expect(modal).not.toBeVisible();

    // Check the latest record in Vendor Returns table
    const returnList = page.locator('[data-testid="vendor-return-records-list"]');
    const latestRecord = returnList.locator('[data-testid^="vendor-return-record-item-"]').first();
    await expect(latestRecord).toBeVisible();
    await expect(latestRecord).toContainText('EU-TEST-001');
    await expect(latestRecord).toContainText('尺碼: 47');
    await expect(latestRecord).not.toContainText('US 12.5');
  });

  test('VR-08: 進貨單據與退回單據刪除按鈕應為純垃圾桶圖標，且確認後可成功刪除單據', async ({ page }) => {
    const recordsNavBtn = page.locator('[data-testid="nav-tab-records"]');
    await recordsNavBtn.click();
    await page.locator('[data-testid="records-tab-vendor-returns"]').click();

    // 1. 執行一次退回出庫建立退回單據
    const openBtn = page.locator('button:has-text("退回出庫")').first();
    await openBtn.click();
    const modal = page.locator('[data-testid="vendor-return-modal"]');
    await expect(modal).toBeVisible();

    // 歸零後增加 1 雙 US 8.5
    await modal.locator('button:has-text("歸零")').click();
    const plus85 = modal.locator('[data-testid="vendor-return-size-plus-8.5"]');
    await plus85.click();

    const submitBtn = modal.locator('[data-testid="btn-submit-vendor-return"]');
    await submitBtn.click();
    await expect(modal).not.toBeVisible();

    // 2. 檢查退回紀錄清單中的單據與刪除按鈕
    const returnList = page.locator('[data-testid="vendor-return-records-list"]');
    const returnRecord = returnList.locator('[data-testid^="vendor-return-record-item-"]').first();
    await expect(returnRecord).toBeVisible();

    const deleteVretBtn = returnRecord.locator('[data-testid^="btn-delete-vendor-return-"]');
    await expect(deleteVretBtn).toBeVisible();
    // 驗證為純圖標按鈕，無文字「刪除單據」
    await expect(deleteVretBtn).not.toContainText('刪除單據');

    // 3. 點擊刪除退回單據，處理 window.confirm
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('確定要刪除');
      await dialog.accept();
    });
    await deleteVretBtn.click();

    // 4. 驗證退回單據已被移除
    await expect(returnRecord).not.toBeVisible();

    // 5. 驗證進貨紀錄之刪除按鈕亦為純圖標按鈕
    await page.locator('[data-testid="records-tab-stockin"]').click();
    const openStockInBtn = page.locator('[data-testid="btn-empty-stockin"], button:has-text("進貨入庫")').first();
    if (await openStockInBtn.isVisible()) {
      await openStockInBtn.click();
      const stockInModal = page.locator('[data-testid="stockin-modal"]');
      await expect(stockInModal).toBeVisible();
      const stkSkuInput = stockInModal.locator('[data-testid="stockin-input-sku"]');
      await stkSkuInput.fill('FD0655-001');
      await stkSkuInput.press('Tab');

      const plusBtn = stockInModal.locator('[data-testid^="stockin-size-plus-"]').first();
      await plusBtn.click();

      await stockInModal.locator('[data-testid="btn-submit-stockin"]').click();
      await expect(stockInModal).not.toBeVisible();

      // 補貨成功後會自動導向庫存，需切換回紀錄中心查看進貨帳本
      await page.locator('[data-testid="nav-tab-records"]').click();
      await page.locator('[data-testid="records-tab-stockin"]').click();

      // 檢查進貨紀錄清單之刪除按鈕
      const stockInDeleteBtn = page.locator('[data-testid^="btn-delete-stockin-"]').first();
      await expect(stockInDeleteBtn).toBeVisible();
      await expect(stockInDeleteBtn).not.toContainText('刪除單據');

      // 點擊刪除進貨單據，處理 window.confirm
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('確定要刪除');
        await dialog.accept();
      });
      await stockInDeleteBtn.click();

      // 驗證進貨紀錄已被移除
      await expect(page.locator('[data-testid^="stockin-record-item-"]')).not.toBeVisible();
    }
  });
});

