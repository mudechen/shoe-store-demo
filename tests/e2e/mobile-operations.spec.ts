import { test, expect } from '@playwright/test';

test.describe('純手機版鞋店極速營運系統 (Mobile-First Operations App)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const testProducts = [
        {
          id: 'test-fixture-1',
          sku: 'FD0655-001',
          brand: 'Nike',
          name: "Air Force 1 '07",
          color: 'Triple White 純白',
          category: '休閒鞋',
          retailPrice: 3400,
          costPrice: 1900,
          variants: [
            { id: 'var-f1', productId: 'test-fixture-1', sizeUS: 6.0, sizeEU: 38.5, sizeCM: 24.0, stock: 0 },
            { id: 'var-f2', productId: 'test-fixture-1', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, stock: 8 },
          ],
        },
        {
          id: 'test-fixture-2',
          sku: 'DD1391-100',
          brand: 'Nike',
          name: 'Dunk Low Retro',
          color: 'White/Black 黑白熊貓',
          category: '休閒鞋',
          retailPrice: 3400,
          costPrice: 1850,
          variants: [
            { id: 'var-f3', productId: 'test-fixture-2', sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, stock: 1 },
          ],
        },
      ];
      localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(testProducts));
    });
    // Open home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('R1: 介面載入與底部分頁導航（無相機掃碼模組）', async ({ page }) => {
    // Check Header title
    await expect(page.locator('text=實體鞋店極速營運')).toBeVisible();

    // Verify absolutely no camera scanner button exists
    const scannerButtons = page.locator('button:has-text("掃碼"), button:has-text("相機")');
    expect(await scannerButtons.count()).toBe(0);

    // Verify 5 bottom navigation tabs exist
    const bottomNav = page.locator('[data-testid="mobile-bottom-nav"]');
    await expect(bottomNav.locator('button:has-text("銷貨記帳")')).toBeVisible();
    await expect(bottomNav.locator('button:has-text("客戶預訂")')).toBeVisible();
    await expect(bottomNav.locator('[data-testid="nav-tab-home"]')).toBeVisible();
    await expect(bottomNav.locator('button:has-text("庫存清單")')).toBeVisible();
    await expect(bottomNav.locator('button:has-text("紀錄明細")')).toBeVisible();
  });

  test('R2: 輸入編號即時聯想與極速銷貨記帳（連動扣庫存）', async ({ page }) => {
    // Ensure on Cashier tab
    await page.click('button:has-text("銷貨記帳")');

    // Type "FD" in model number input
    const skuInput = page.locator('input[placeholder*="例如輸入 CW、FD"]');
    await skuInput.fill('FD');

    // Live search suggestion dropdown appears
    const suggestionHeader = page.locator('text=找到');
    await expect(suggestionHeader).toBeVisible();

    // Click on the first matching shoe suggestion (e.g. FD0655-001 Air Force 1)
    const firstMatch = page.locator('button:has-text("FD0655-001")');
    await expect(firstMatch).toBeVisible();
    await firstMatch.click();

    // Verify auto-filled vendor, color and price
    await expect(page.locator('text=Nike').first()).toBeVisible();

    const priceInput = page.locator('input[placeholder="售價"]');
    await expect(priceInput).toHaveValue('3400');

    // Select a size (e.g. US 8.5)
    const sizeBtn = page.locator('button:has-text("US 8.5")').first();
    await sizeBtn.click();

    // Click confirm sale
    const submitBtn = page.locator('button:has-text("確認賣出")');
    await submitBtn.click();

    // Sale should appear in today's sales stream
    await expect(page.locator('text=FD0655-001').first()).toBeVisible();
    await expect(page.locator('text=$3400').first()).toBeVisible();
  });

  test('R3: 庫存清單緊湊折疊列（高資訊密度、展開看各尺寸雙數）', async ({ page }) => {
    // Switch to inventory tab
    await page.click('button:has-text("庫存清單")');

    // Check inventory list exists and categorized by vendor
    await expect(page.locator('text=按廠商分類').first()).toBeVisible();
    await expect(page.locator('text=廠商總成本').first()).toBeVisible();
    await expect(page.locator('text=總成本').first()).toBeVisible();
    await expect(page.locator('text=全尺碼現存雙數')).not.toBeVisible(); // Not yet expanded

    // Click first shoe row to expand
    const firstRow = page.locator('text=FD0655-001').first();
    await firstRow.click();

    // Now expanded details should show cost price, retail price and size pills (no shelf locations)
    await expect(page.locator('text=進貨成本:').first()).toBeVisible();
    await expect(page.locator('text=門市: A-01-L2')).not.toBeVisible();
    await expect(page.locator('text=全尺碼現存雙數（點擊 +/- 即時微調）')).toBeVisible();

    // Verify profit text and legend dots are removed, and size range is displayed
    await expect(page.locator('text=單雙毛利')).not.toBeVisible();
    await expect(page.locator('text=庫存預期總毛利')).not.toBeVisible();
    await expect(page.locator('text=0雙斷碼')).not.toBeVisible();
    await expect(page.locator('text=1-2雙')).not.toBeVisible();
    await expect(page.locator('text=3雙+')).not.toBeVisible();
    await expect(page.locator('[data-testid="inventory-size-range-FD0655-001"]')).toBeVisible();
    await expect(page.locator('text=尺碼區間：').first()).toBeVisible();

    // Click "+" to quick restock 1 pair
    const plusBtn = page.locator('button[title="進貨 +1"]').first();
    await plusBtn.click();

    // Toast notification for restock
    await expect(page.locator('text=已補貨入庫 1 雙')).toBeVisible();
  });
  test('R4: 智慧進貨入庫（既有款載入與新鞋款建檔）', async ({ page }) => {
    // Switch to inventory tab and open embedded stock-in modal
    await page.click('button:has-text("庫存清單")');
    await page.click('button:has-text("進貨入庫")');

    // Type an existing SKU
    const skuInput = page.locator('input[placeholder*="輸入編號"]');
    await skuInput.fill('DD1391-100');

    // Detects existing
    await expect(page.locator('text=找到現有款式')).toBeVisible();

    // Quick add +1 to all sizes
    const addAllBtn = page.locator('button:has-text("各尺碼 +1 雙")');
    await addAllBtn.click();

    // Submit stock in
    const submitBtn = page.locator('button:has-text("確認進貨入庫")');
    await submitBtn.click();

    // Should redirect to inventory view with toast
    await expect(page.locator('text=庫存清單')).toBeVisible();
  });

  test('R5: 門市營運首頁工作台（即時營業額、毛利率、快捷入口與預訂動態）', async ({ page }) => {
    // Switch to home tab
    await page.click('[data-testid="nav-tab-home"]');

    // KPI and workbench visible
    const homeView = page.locator('[data-testid="view-home"]');
    await expect(homeView.locator('text=門市今日營運工作台')).toBeVisible();
    await expect(homeView.locator('text=今日即時營業總額')).toBeVisible();
    await expect(homeView.locator('text=毛利率')).toBeVisible();
    await expect(homeView.locator('text=今日售出')).toBeVisible();
    await expect(homeView.locator('[data-testid="home-shortcut-reservations"]')).toBeVisible();
    await expect(homeView.locator('text=門市核心功能快捷')).toBeVisible();
  });

  test('R6: 建檔進貨後點擊頂部「重新整理」，資料永不丟失且正確保留', async ({ page }) => {
    // Switch to Inventory tab and open embedded stock-in modal
    await page.click('button:has-text("庫存清單")');
    await page.click('button:has-text("進貨入庫")');

    // Enter brand new item (e.g. 牛頭牌 9039)
    const customSku = `TEST-9039-${Date.now().toString().slice(-4)}`;
    await page.fill('input[placeholder*="輸入編號"]', customSku);
    await page.fill('input[placeholder*="例如 Nike"]', '牛頭牌');
    await page.fill('input[placeholder*="Air Force 1"]', '9039 H拖');
    await page.fill('input[placeholder*="例如 純白"]', '黑');
    await page.fill('input[placeholder*="成本"]', '250');
    await page.fill('input[placeholder*="售價"]', '490');

    // Quick add stock
    await page.click('button:has-text("各尺碼 +1 雙")');
    await page.click('button:has-text("確認進貨入庫")');

    // Switched to inventory, verify item appears
    await expect(page.locator('text=庫存清單')).toBeVisible();
    await page.fill('input[placeholder*="搜編號"]', customSku);
    const card = page.locator(`[data-testid="inventory-card-${customSku}"]`);
    await expect(card).toBeVisible();

    // Now click the top header "重新整理" button
    const refreshBtn = page.locator('button[title*="重新整理"]');
    await refreshBtn.click();

    // Verify item is STILL visible and NOT deleted!
    await expect(card).toBeVisible();
    await expect(page.locator('text=9039 H拖')).toBeVisible();
  });

  test('R7: 客戶缺貨預訂 ➔ 到貨通知 ➔ 取貨結算自動轉銷貨扣除庫存（完整業務閉環）', async ({ page }) => {
    // 1. Switch to reservations tab
    await page.click('button:has-text("客戶預訂")');
    await expect(page.locator('text=客戶缺貨預訂')).toBeVisible();

    // 2. Select shoe FD0655
    const skuInput = page.locator('[data-testid="reservation-sku-input"]');
    await skuInput.fill('FD0655');
    const firstMatch = page.locator('button:has-text("FD0655-001")');
    await expect(firstMatch).toBeVisible();
    await firstMatch.click();

    // 3. Fill customer info
    await page.fill('[data-testid="reservation-customer-name"]', '王大明');
    await page.fill('[data-testid="reservation-customer-phone"]', '0988-123-456');

    // 4. Select out-of-stock size 6.0
    await page.locator('[data-testid="reservation-size-6.0"]').click();

    // 5. Submit reservation
    await page.click('[data-testid="btn-submit-reservation"]');

    // 6. Reservation card appears in pending list
    await expect(page.locator('text=王大明').first()).toBeVisible();
    await expect(page.locator('text=待進貨到貨').first()).toBeVisible();

    // 7. Mark arrived
    const markArrivedBtn = page.locator('button:has-text("標記已到貨")').first();
    await markArrivedBtn.click();
    await expect(page.locator('text=已到貨 • 待取貨').first()).toBeVisible();

    // 8. Fulfill reservation (Pick up)
    const fulfillBtn = page.locator('button:has-text("取貨結算轉銷貨")').first();
    await fulfillBtn.click();
    await expect(page.locator('[data-testid="fulfill-reservation-modal"]')).toBeVisible();

    // 9. Confirm fulfillment
    await page.click('[data-testid="btn-confirm-fulfill-reservation"]');

    // 10. Verify reservation shows 取貨完成
    await expect(page.locator('text=取貨完成').first()).toBeVisible();
  });

  test('R8: 客戶預訂直接鎖定商品庫存清單原生尺規，真實顯示現貨雙數且不進行跨單位自行換算', async ({ page }) => {
    // 1. Switch to reservations tab
    await page.click('button:has-text("客戶預訂")');

    // 2. Select shoe FD0655
    const skuInput = page.locator('[data-testid="reservation-sku-input"]');
    await skuInput.fill('FD0655');
    await page.locator('button:has-text("FD0655-001")').click();

    // 3. Verify locked to native inventory unit without arbitrary conversion
    const unitBadge = page.locator('[data-testid="reservation-active-unit"]');
    await expect(unitBadge).toBeVisible();
    await expect(unitBadge).toHaveText('美國 (US)');

    // 4. Verify native size buttons: in-stock 8.5 shows "剩 8 雙", out-of-stock 6.0 shows "無現貨"
    const size85Btn = page.locator('[data-testid="reservation-size-8.5"]');
    await expect(size85Btn).toBeVisible();
    await expect(size85Btn.locator('text=剩 8 雙')).toBeVisible();

    const size60Btn = page.locator('[data-testid="reservation-size-6.0"]');
    await expect(size60Btn).toBeVisible();
    await expect(size60Btn.locator('text=無現貨')).toBeVisible();

    // 5. Select size 6.0 and verify clean "已選：6.0" without forced "US" prefix
    await size60Btn.click();
    await expect(page.locator('text=已選：6.0')).toBeVisible();

    // Capture screenshot of new size selector in reservations
    await page.screenshot({
      path: 'C:/Users/zxc03/.gemini/antigravity/brain/18c77d2d-b462-4232-8d98-c4d24adaee74/screenshot-customer-reservation-sizes.png',
      fullPage: true,
    });

    // 6. Submit pre-order
    await page.fill('[data-testid="reservation-customer-name"]', '林小華');
    await page.fill('[data-testid="reservation-customer-phone"]', '0977-888-999');
    await page.click('[data-testid="btn-submit-reservation"]');

    // 7. Verify reservation card shows clean "6.0"
    const card = page.locator('[data-testid^="reservation-card-"]:has-text("林小華")').first();
    await expect(card).toBeVisible();
    await expect(card.locator('text=6.0')).toBeVisible();

    // 8. Mark arrived and open fulfill modal
    await card.locator('button:has-text("標記已到貨")').click();
    await card.locator('button:has-text("取貨結算轉銷貨")').click();

    // 9. Verify fulfill modal displays clean "6.0"
    const modal = page.locator('[data-testid="fulfill-reservation-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=6.0')).toBeVisible();
    await modal.locator('button:has-text("取消")').click();
  });

  test('R9: 進貨補貨客戶預訂之款式與尺寸後，預訂單自動改為「已到貨待取」，無需手動修改', async ({ page }) => {
    // 1. Switch to reservations tab
    await page.click('button:has-text("客戶預訂")');

    // 2. Create reservation for out-of-stock size 6.0
    const skuInput = page.locator('[data-testid="reservation-sku-input"]');
    await skuInput.fill('FD0655');
    await page.locator('button:has-text("FD0655-001")').click();

    // Select out-of-stock size 6.0
    const size60Btn = page.locator('[data-testid="reservation-size-6.0"]');
    await size60Btn.click();

    // Enter customer info
    const testCustomer = `張阿美-${Date.now().toString().slice(-4)}`;
    await page.fill('[data-testid="reservation-customer-name"]', testCustomer);
    await page.fill('[data-testid="reservation-customer-phone"]', '0911-222-333');
    await page.click('[data-testid="btn-submit-reservation"]');

    // 3. Verify reservation card is created with pending status (待進貨到貨)
    const card = page.locator(`[data-testid^="reservation-card-"]:has-text("${testCustomer}")`).first();
    await expect(card).toBeVisible();
    await expect(card.locator('text=待進貨到貨')).toBeVisible();

    // 4. Perform stock-in for this exact shoe & size (FD0655-001, size 6.0)
    await page.click('button:has-text("庫存清單")');
    await page.click('button:has-text("進貨入庫")');
    await page.fill('input[placeholder*="輸入編號"]', 'FD0655-001');
    await expect(page.locator('text=找到現有款式')).toBeVisible();
    await page.click('button:has-text("各尺碼 +1 雙")');
    await page.click('button:has-text("確認進貨入庫")');

    // 5. Navigate back to reservations tab
    await page.click('button:has-text("客戶預訂")');

    // 6. Verify that the reservation status is AUTOMATICALLY "已到貨 • 待取貨" without manual intervention!
    const updatedCard = page.locator(`[data-testid^="reservation-card-"]:has-text("${testCustomer}")`).first();
    await expect(updatedCard).toBeVisible();
    await expect(updatedCard.locator('text=已到貨 • 待取貨')).toBeVisible();
    await expect(updatedCard.locator('button:has-text("取貨結算轉銷貨")')).toBeVisible();

    // Capture screenshot of auto-arrived reservation
    await page.screenshot({
      path: 'C:/Users/zxc03/.gemini/antigravity/brain/18c77d2d-b462-4232-8d98-c4d24adaee74/screenshot-reservation-auto-arrived.png',
      fullPage: true,
    });

    // 7. Check Workbench Home page
    await page.click('[data-testid="nav-tab-home"]');
    const arrivalNotice = page.locator('text=預訂商品已到貨');
    await expect(arrivalNotice).toBeVisible();
  });

  test('R10: 客戶預訂雲端同步與重新整理後資料完整保留（手機與電腦跨裝置資料不丟失）', async ({ page }) => {
    // 1. Switch to reservations tab and create a reservation
    await page.click('button:has-text("客戶預訂")');
    const skuInput = page.locator('[data-testid="reservation-sku-input"]');
    await skuInput.fill('FD0655');
    await page.locator('button:has-text("FD0655-001")').click();

    const uniqueCustomer = `雲端同步客戶-${Date.now().toString().slice(-4)}`;
    await page.locator('[data-testid="reservation-size-8.5"]').click();
    await page.fill('[data-testid="reservation-customer-name"]', uniqueCustomer);
    await page.fill('[data-testid="reservation-customer-phone"]', '0922-333-444');
    await page.click('[data-testid="btn-submit-reservation"]');

    // Verify card exists
    await expect(page.locator(`text=${uniqueCustomer}`).first()).toBeVisible();

    // 2. Click top header refresh button (simulating switching devices or page reload)
    const refreshBtn = page.locator('button[title*="重新整理"]');
    await refreshBtn.click();

    // 3. Switch back to reservations and verify customer record is intact
    await page.click('button:has-text("客戶預訂")');
    await expect(page.locator(`text=${uniqueCustomer}`).first()).toBeVisible();
  });

  test('R11: 預訂列表支援垃圾桶圖示點擊確認後永久刪除紀錄', async ({ page }) => {
    // 1. Switch to reservations tab
    await page.click('button:has-text("客戶預訂")');

    // 2. Create a reservation to be deleted
    const skuInput = page.locator('[data-testid="reservation-sku-input"]');
    await skuInput.fill('FD0655');
    await page.locator('button:has-text("FD0655-001")').click();

    const deleteTargetCustomer = `待刪除客人-${Date.now().toString().slice(-4)}`;
    await page.locator('[data-testid="reservation-size-8.5"]').click();
    await page.fill('[data-testid="reservation-customer-name"]', deleteTargetCustomer);
    await page.fill('[data-testid="reservation-customer-phone"]', '0988-777-666');
    await page.click('[data-testid="btn-submit-reservation"]');

    // 3. Verify card exists
    const card = page.locator(`[data-testid^="reservation-card-"]:has-text("${deleteTargetCustomer}")`).first();
    await expect(card).toBeVisible();

    // 4. Set dialog auto-accept and click trash button
    page.once('dialog', (dialog) => dialog.accept());
    const trashBtn = card.locator('button[title*="刪除此筆預訂紀錄"]');
    await expect(trashBtn).toBeVisible();
    await trashBtn.click();

    // 5. Verify card is permanently removed from the list
    await expect(page.locator(`text=${deleteTargetCustomer}`)).toHaveCount(0);
  });
});

