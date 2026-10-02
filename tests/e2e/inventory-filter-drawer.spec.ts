import { test, expect } from '@playwright/test';

const SEED_FILTER_PRODUCTS = [
  {
    id: 'test-filter-shoe-1',
    sku: 'NB-990',
    brand: 'New Balance',
    name: 'NB 990v6',
    color: '元祖灰',
    category: '慢跑鞋',
    retailPrice: 8680,
    costPrice: 5200,
    barcode: '454984512345',
    displayLocation: 'A-01-L1',
    storageLocation: 'R1-C01-L1',
    procurementType: '買斷',
    variants: [
      { id: 'var-f1', productId: 'test-filter-shoe-1', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, stock: 5 },
      { id: 'var-f2', productId: 'test-filter-shoe-1', sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, stock: 2 },
    ],
  },
  {
    id: 'test-filter-shoe-2',
    sku: 'NK-AF1',
    brand: 'Nike',
    name: 'Air Force 1',
    color: '純白',
    category: '休閒鞋',
    retailPrice: 3400,
    costPrice: 1900,
    barcode: '196607831001',
    displayLocation: 'A-01-L2',
    storageLocation: 'R1-C01-L2',
    procurementType: '寄賣',
    variants: [
      { id: 'var-f3', productId: 'test-filter-shoe-2', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, stock: 0 },
      { id: 'var-f4', productId: 'test-filter-shoe-2', sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, stock: 4 },
      { id: 'var-f5', productId: 'test-filter-shoe-2', sizeUS: 9.5, sizeEU: 43.0, sizeCM: 27.5, stock: 3 },
    ],
  },
];

test.describe('庫存總覽進階篩選抽屜 (InventoryFilterDrawer) 端對端測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seedProducts) => {
      localStorage.clear();
      localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
      localStorage.setItem('shoe_store_sales_v1', JSON.stringify([]));
      localStorage.setItem('shoe_store_stockin_v1', JSON.stringify([]));
      localStorage.setItem('shoe_store_vendor_returns_v1', JSON.stringify([]));
    }, SEED_FILTER_PRODUCTS);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切換至在庫總覽頁面
    const navInventory = page.getByTestId('nav-tab-inventory');
    await expect(navInventory).toBeVisible();
    await navInventory.click();
  });

  test('點擊篩選按鈕可順暢開啟與關閉抽屜面板', async ({ page }) => {
    const filterBtn = page.getByTestId('btn-open-filter-drawer');
    await expect(filterBtn).toBeVisible();
    await expect(filterBtn).toContainText('篩選');

    // 開啟抽屜
    await filterBtn.click();
    const drawer = page.getByTestId('filter-drawer');
    await expect(drawer).toBeVisible();
    await expect(page.locator('text=進階庫存篩選')).toBeVisible();
    await page.screenshot({ path: 'screenshot-mobile-filter-drawer.png' });

    // 點擊右上角 X 關閉
    const closeBtn = page.getByTestId('btn-close-filter-drawer');
    await closeBtn.click();
    await expect(drawer).not.toBeVisible();

    // 再次開啟並用 Escape 關閉
    await filterBtn.click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
  });

  test('廠商篩選與外部 Active Filter Tag 移除測試', async ({ page }) => {
    const filterBtn = page.getByTestId('btn-open-filter-drawer');
    await filterBtn.click();

    // 點擊 Nike 廠商標籤
    const nikeBtn = page.getByTestId('filter-vendor-Nike');
    await expect(nikeBtn).toBeVisible();
    await nikeBtn.click();

    // 套用篩選
    const applyBtn = page.getByTestId('btn-apply-filters');
    await applyBtn.click();

    // 抽屜關閉，且頂部篩選按鈕顯示計數 Badge
    await expect(page.getByTestId('filter-drawer')).not.toBeVisible();
    await expect(filterBtn.locator('span').nth(1)).toContainText('1');

    // 外層出現 Active Tag
    const activeTag = page.getByTestId('active-filter-vendor-Nike');
    await expect(activeTag).toBeVisible();

    // 驗證列表僅有 Nike (NK-AF1)，無 New Balance (NB-990)
    await expect(page.locator('text=NK-AF1')).toBeVisible();
    await expect(page.locator('text=NB-990')).not.toBeVisible();

    // 點擊 Active Tag 上的 X 快速移除
    await activeTag.locator('button').click();
    await expect(activeTag).not.toBeVisible();
    await expect(page.getByTestId('btn-clear-all-filters')).not.toBeVisible();

    // 兩者皆回復可見
    await expect(page.locator('text=NK-AF1')).toBeVisible();
    await expect(page.locator('text=NB-990')).toBeVisible();
  });

  test('現貨尺寸 (US Size) 篩選功能測試', async ({ page }) => {
    const filterBtn = page.getByTestId('btn-open-filter-drawer');
    await filterBtn.click();

    // 選擇 US 9.5 尺碼（只有 Nike 有現貨）
    const size95Btn = page.getByTestId('filter-size-9.5');
    await expect(size95Btn).toBeVisible();
    await size95Btn.click();

    // 套用篩選
    await page.getByTestId('btn-apply-filters').click();

    // 外層出現 US 9.5 的 Active Tag
    const sizeTag = page.getByTestId('active-filter-size-9.5');
    await expect(sizeTag).toBeVisible();
    await expect(sizeTag).toContainText('US 9.5');

    // 驗證商品過濾正確
    await expect(page.locator('text=NK-AF1')).toBeVisible();
    await expect(page.locator('text=NB-990')).not.toBeVisible();

    // 點擊清除全部按鈕
    const clearAllBtn = page.getByTestId('btn-clear-all-filters');
    await expect(clearAllBtn).toBeVisible();
    await clearAllBtn.click();
    await expect(sizeTag).not.toBeVisible();

    // 兩者皆回復可見
    await expect(page.locator('text=NK-AF1')).toBeVisible();
    await expect(page.locator('text=NB-990')).toBeVisible();
  });

  test('售價範圍與狀態重設篩選測試', async ({ page }) => {
    const filterBtn = page.getByTestId('btn-open-filter-drawer');
    await filterBtn.click();

    // 點擊狀態「斷碼款」（NK-AF1 有斷碼，NB-990 無斷碼）
    const brokenStatusBtn = page.getByTestId('filter-status-broken');
    await brokenStatusBtn.click();

    // 點擊套用查看結果
    await page.getByTestId('btn-apply-filters').click();
    await expect(page.locator('text=NK-AF1')).toBeVisible();
    await expect(page.locator('text=NB-990')).not.toBeVisible();

    // 再次開啟抽屜點擊重設按鈕
    await filterBtn.click();
    const resetBtn = page.getByTestId('btn-reset-filters');
    await resetBtn.click();

    // 驗證狀態已復原為全量
    const statusAllBtn = page.getByTestId('filter-status-all');
    await expect(statusAllBtn).toHaveClass(/bg-slate-800/);

    // 點擊套用查看結果
    await page.getByTestId('btn-apply-filters').click();
    await expect(page.getByTestId('btn-clear-all-filters')).not.toBeVisible();
    await expect(page.locator('text=NK-AF1')).toBeVisible();
    await expect(page.locator('text=NB-990')).toBeVisible();
  });

  test('多尺規切換 (EU, JP/CM, ALPHA) 與族群分段篩選測試', async ({ page }) => {
    const filterBtn = page.getByTestId('btn-open-filter-drawer');
    await filterBtn.click();

    // 1. 切換至歐規 (EU)
    const unitEuBtn = page.getByTestId('filter-unit-EU');
    await expect(unitEuBtn).toBeVisible();
    await unitEuBtn.click();

    // 驗證歐規尺碼按鈕出現 (例如 EU 43)
    const eu43Btn = page.getByTestId('filter-size-43');
    await expect(eu43Btn).toBeVisible();
    await eu43Btn.click();

    // 套用篩選
    await page.getByTestId('btn-apply-filters').click();

    // 外層 Active Tag 顯示 EU 43
    const euTag = page.getByTestId('active-filter-size-43');
    await expect(euTag).toBeVisible();
    await expect(euTag).toContainText('EU 43');

    // 驗證僅 NK-AF1 顯示 (有 EU 43 庫存 3 雙)
    await expect(page.locator('text=NK-AF1')).toBeVisible();
    await expect(page.locator('text=NB-990')).not.toBeVisible();

    // 2. 再次開啟抽屜，切換至日規 (JP/CM)
    await filterBtn.click();
    const unitCmBtn = page.getByTestId('filter-unit-CM');
    await unitCmBtn.click();

    // 先清除剛才選的 EU 43 (點擊清除尺碼)
    const clearSizesBtn = page.getByTestId('btn-clear-sizes');
    await expect(clearSizesBtn).toBeVisible();
    await clearSizesBtn.click();

    // 選擇 26.5 cm (NB-990 有 5 雙，NK-AF1 為 0 雙斷碼)
    const cm265Btn = page.getByTestId('filter-size-26.5');
    await expect(cm265Btn).toBeVisible();
    await cm265Btn.click();

    // 套用篩選
    await page.getByTestId('btn-apply-filters').click();

    // 外層 Active Tag 顯示 26.5 cm
    const cmTag = page.getByTestId('active-filter-size-26.5');
    await expect(cmTag).toBeVisible();
    await expect(cmTag).toContainText('26.5 cm');

    // 驗證僅 NB-990 顯示 (NB-990 的 26.5 cm 庫存為 5，NK-AF1 為 0)
    await expect(page.locator('text=NB-990')).toBeVisible();
    await expect(page.locator('text=NK-AF1')).not.toBeVisible();

    // 3. 測試族群分段按鈕切換
    await filterBtn.click();
    const segKidsBtn = page.getByTestId('filter-segment-kids');
    await expect(segKidsBtn).toBeVisible();
    await segKidsBtn.click();

    // 驗證童段顯示較小尺碼 (例如 12.0)
    await expect(page.getByTestId('filter-size-12.0')).toBeVisible();
    // 成人較大尺碼應不在童段列表 (例如 28.0 不可見)
    await expect(page.getByTestId('filter-size-28.0')).not.toBeVisible();
  });
});
