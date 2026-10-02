import { test, expect } from '@playwright/test';

const SEED_SIZE_TEST_PRODUCTS = [
  // 1. 歐碼鞋款（例如 326 前包塑膠拖・黑，尺碼為 36~41 歐碼）
  {
    id: 'test-shoe-326',
    sku: '326',
    brand: '大新',
    name: '前包塑膠拖・黑',
    color: '黑',
    category: '拖鞋',
    retailPrice: 290,
    costPrice: 150,
    barcode: '471000326001',
    displayLocation: 'A-01',
    storageLocation: 'R1-01',
    procurementType: '寄賣',
    variants: [
      { id: 'var-326-36', productId: 'test-shoe-326', sizeUS: 4.5, sizeEU: 36, sizeCM: 23.0, sizeDisplay: '36', stock: 1 },
      { id: 'var-326-37', productId: 'test-shoe-326', sizeUS: 5.0, sizeEU: 37, sizeCM: 23.5, sizeDisplay: '37', stock: 1 },
      { id: 'var-326-38', productId: 'test-shoe-326', sizeUS: 5.5, sizeEU: 38, sizeCM: 24.0, sizeDisplay: '38', stock: 1 },
      { id: 'var-326-39', productId: 'test-shoe-326', sizeUS: 6.5, sizeEU: 39, sizeCM: 24.5, sizeDisplay: '39', stock: 1 },
      { id: 'var-326-40', productId: 'test-shoe-326', sizeUS: 7.0, sizeEU: 40, sizeCM: 25.0, sizeDisplay: '40', stock: 1 },
      { id: 'var-326-41', productId: 'test-shoe-326', sizeUS: 8.0, sizeEU: 41, sizeCM: 26.0, sizeDisplay: '41', stock: 1 },
    ],
  },
  // 2. ALPHA 字母尺碼鞋款（例如 888 字母拖鞋・黑，尺碼為 S, M, L）
  {
    id: 'test-shoe-888',
    sku: '888',
    brand: '大新',
    name: '經典字母拖鞋・黑',
    color: '黑',
    category: '拖鞋',
    retailPrice: 290,
    costPrice: 150,
    barcode: '471000888001',
    displayLocation: 'A-02',
    storageLocation: 'R1-02',
    procurementType: '寄賣',
    variants: [
      { id: 'var-888-S', productId: 'test-shoe-888', sizeUS: 7.0, sizeEU: 40, sizeCM: 25.0, sizeDisplay: 'S', stock: 2 },
      { id: 'var-888-M', productId: 'test-shoe-888', sizeUS: 8.5, sizeEU: 42, sizeCM: 26.5, sizeDisplay: 'M', stock: 3 },
      { id: 'var-888-L', productId: 'test-shoe-888', sizeUS: 10.0, sizeEU: 44, sizeCM: 28.0, sizeDisplay: 'L', stock: 1 },
      { id: 'var-888-2L', productId: 'test-shoe-888', sizeUS: 10.5, sizeEU: 44.5, sizeCM: 28.5, sizeDisplay: '2L', stock: 4 },
    ],
  },
  // 3. 台灣傳統拖鞋（牛頭牌 999，標示為 LL）
  {
    id: 'test-shoe-999',
    sku: '999',
    brand: '牛頭牌',
    name: '台規防水拖・藍',
    color: '藍',
    category: '拖鞋',
    retailPrice: 350,
    costPrice: 180,
    barcode: '471000999001',
    displayLocation: 'A-03',
    storageLocation: 'R1-03',
    procurementType: '寄賣',
    variants: [
      { id: 'var-999-LL', productId: 'test-shoe-999', sizeUS: 10.5, sizeEU: 44.5, sizeCM: 28.5, sizeDisplay: 'LL', stock: 2 },
    ],
  },
  // 4. 純美碼標準運動鞋（Nike Air Force 1，尺碼為 US 8.5, US 9.0）
  {
    id: 'test-shoe-af1',
    sku: 'NK-AF1',
    brand: 'Nike',
    name: 'Air Force 1',
    color: '純白',
    category: '休閒鞋',
    retailPrice: 3400,
    costPrice: 1900,
    barcode: '196607831001',
    displayLocation: 'B-01',
    storageLocation: 'R2-01',
    procurementType: '買斷',
    variants: [
      { id: 'var-af1-85', productId: 'test-shoe-af1', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, sizeDisplay: 'US 8.5', stock: 4 },
      { id: 'var-af1-90', productId: 'test-shoe-af1', sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, sizeDisplay: 'US 9.0', stock: 2 },
    ],
  },
  // 4. 日本公分碼鞋款（例如 Mizuno 慢跑鞋，尺碼為 26.0cm, 26.5cm）
  {
    id: 'test-shoe-mizuno',
    sku: 'MIZ-001',
    brand: 'Mizuno',
    name: 'Wave Rider 27',
    color: '藍白',
    category: '慢跑鞋',
    retailPrice: 3800,
    costPrice: 2100,
    barcode: '490000123456',
    displayLocation: 'C-01',
    storageLocation: 'R3-01',
    procurementType: '買斷',
    variants: [
      { id: 'var-miz-260', productId: 'test-shoe-mizuno', sizeUS: 8.0, sizeEU: 41.0, sizeCM: 26.0, sizeDisplay: '26.0 cm', stock: 2 },
      { id: 'var-miz-265', productId: 'test-shoe-mizuno', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, sizeDisplay: '26.5 cm', stock: 3 },
    ],
  },
];

test.describe('尺碼精準篩選與嚴禁自動換算 (該是多少就是多少) E2E 測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seedProducts) => {
      localStorage.clear();
      localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
      localStorage.setItem('shoe_store_sales_v1', JSON.stringify([]));
      localStorage.setItem('shoe_store_stockin_v1', JSON.stringify([]));
      localStorage.setItem('shoe_store_vendor_returns_v1', JSON.stringify([]));
    }, SEED_SIZE_TEST_PRODUCTS);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切換至庫存清單分頁
    const navInventory = page.getByTestId('nav-tab-inventory');
    await expect(navInventory).toBeVisible();
    await navInventory.click();
  });

  test('TC-SIZE-1: 篩選尺碼 M 絕不出現歐碼(如36~41)等非M號鞋款，嚴格禁止自動換算', async ({ page }) => {
    // 初始狀態下三款鞋皆可見
    await expect(page.locator('text=326')).toBeVisible();
    await expect(page.locator('text=888')).toBeVisible();
    await expect(page.locator('text=NK-AF1')).toBeVisible();

    // 開啟篩選抽屜
    const filterBtn = page.getByTestId('btn-open-filter-drawer');
    await filterBtn.click();

    // 切換至 ALPHA (XS~2XL) 單位
    const unitAlphaBtn = page.getByTestId('filter-unit-ALPHA');
    await expect(unitAlphaBtn).toBeVisible();
    await unitAlphaBtn.click();

    // 點選尺碼 M
    const sizeMBtn = page.getByTestId('filter-size-M');
    await expect(sizeMBtn).toBeVisible();
    await sizeMBtn.click();

    // 套用篩選
    await page.getByTestId('btn-apply-filters').click();

    // 外層 Active Tag 顯示「尺碼 M」
    const sizeTag = page.getByTestId('active-filter-size-M');
    await expect(sizeTag).toBeVisible();
    await expect(sizeTag).toContainText('尺碼 M');

    // 驗收條件：
    // 1. 真正有 M 號的「888 經典字母拖鞋」必須可見
    await expect(page.locator('text=888')).toBeVisible();
    await expect(page.locator('text=經典字母拖鞋・黑')).toBeVisible();

    // 2. 只有歐碼 36~41 的「326 前包塑膠拖」絕對不可以出現！
    await expect(page.locator('text=前包塑膠拖・黑')).not.toBeVisible();
    await expect(page.locator('text=326')).not.toBeVisible();

    // 3. 美碼「NK-AF1」也絕對不可以出現！
    await expect(page.locator('text=NK-AF1')).not.toBeVisible();
  });

  test('TC-SIZE-2: 篩選歐碼 EU 37 僅出現 326，不出現字母碼拖鞋與美碼運動鞋', async ({ page }) => {
    const filterBtn = page.getByTestId('btn-open-filter-drawer');
    await filterBtn.click();

    // 切換至 EU (歐洲) 單位
    const unitEuBtn = page.getByTestId('filter-unit-EU');
    await expect(unitEuBtn).toBeVisible();
    await unitEuBtn.click();

    // 點選歐碼 37
    const size37Btn = page.getByTestId('filter-size-37');
    await expect(size37Btn).toBeVisible();
    await size37Btn.click();

    // 套用篩選
    await page.getByTestId('btn-apply-filters').click();

    // 外層 Active Tag 顯示「EU 37」
    const sizeTag = page.getByTestId('active-filter-size-37');
    await expect(sizeTag).toBeVisible();
    await expect(sizeTag).toContainText('EU 37');

    // 驗收條件：
    // 1. 歐碼 37 的 326 前包拖鞋必須可見
    await expect(page.locator('text=326')).toBeVisible();
    await expect(page.locator('text=前包塑膠拖・黑')).toBeVisible();

    // 2. 字母拖鞋 888 與 美碼 NK-AF1 絕對不可見
    await expect(page.locator('text=888')).not.toBeVisible();
    await expect(page.locator('text=NK-AF1')).not.toBeVisible();
  });

  test('TC-SIZE-3: 篩選美碼 US 8.5 僅出現 NK-AF1，絕不把歐碼326內部計算之US混淆進入', async ({ page }) => {
    const filterBtn = page.getByTestId('btn-open-filter-drawer');
    await filterBtn.click();

    // 選擇 US 8.5
    const size85Btn = page.getByTestId('filter-size-8.5');
    await expect(size85Btn).toBeVisible();
    await size85Btn.click();

    // 套用篩選
    await page.getByTestId('btn-apply-filters').click();

    // 外層 Active Tag 顯示「US 8.5」
    const sizeTag = page.getByTestId('active-filter-size-8.5');
    await expect(sizeTag).toBeVisible();
    await expect(sizeTag).toContainText('US 8.5');

    // 驗收條件：
    // 1. 只有 NK-AF1 可見
    await expect(page.locator('text=NK-AF1')).toBeVisible();

    // 2. 歐碼 326 與 字母拖 888 絕對不可見
    await expect(page.locator('text=326')).not.toBeVisible();
    await expect(page.locator('text=888')).not.toBeVisible();
  });

  test('TC-SIZE-4: 尺碼綠點點必須與篩選結果 100% 同步，無庫存者絕不亮綠點，亮綠點者點擊必有相符鞋款', async ({ page }) => {
    const filterBtn = page.getByTestId('btn-open-filter-drawer');
    await filterBtn.click();

    // 切換至日本碼 (CM)
    const unitCmBtn = page.getByTestId('filter-unit-CM');
    await expect(unitCmBtn).toBeVisible();
    await unitCmBtn.click();

    // 1. 童段 20.0 與 大人段 20.0 在無庫存時，絕不可出現綠點點
    const kid20Btn = page.getByTestId('filter-size-童段 20.0');
    const adult20Btn = page.getByTestId('filter-size-大人段 20.0');
    await expect(kid20Btn).toBeVisible();
    await expect(adult20Btn).toBeVisible();
    await expect(kid20Btn.locator('.bg-emerald-500')).toHaveCount(0);
    await expect(adult20Btn.locator('.bg-emerald-500')).toHaveCount(0);

    // 2. 14.0cm 等無現貨尺寸，也絕不可亮綠點
    const size14Btn = page.getByTestId('filter-size-14.0');
    await expect(size14Btn).toBeVisible();
    await expect(size14Btn.locator('.bg-emerald-500')).toHaveCount(0);

    // 3. 有現貨的 26.5cm 必須亮綠點
    const size265Btn = page.getByTestId('filter-size-26.5');
    await expect(size265Btn).toBeVisible();
    await expect(size265Btn.locator('.bg-emerald-500')).toHaveCount(1);

    // 4. 點擊亮綠點的 26.5cm 並套用
    await size265Btn.click();
    await page.getByTestId('btn-apply-filters').click();

    // 5. 驗證篩選結果必定大於 0 雙（MIZ-001 必定可見，美碼 NK-AF1 絕不可見，絕非「查無相符鞋款」）
    await expect(page.locator('text=查無相符鞋款')).not.toBeVisible();
    await expect(page.locator('text=MIZ-001')).toBeVisible();
    await expect(page.locator('text=Wave Rider 27')).toBeVisible();
    await expect(page.locator('text=NK-AF1')).not.toBeVisible();
  });

  test('TC-SIZE-5: ALPHA 尺規在 L 與 XL 之間呈現 2L，且篩選 2L 可精準命中 2L 與 LL 拖鞋', async ({ page }) => {
    const filterBtn = page.getByTestId('btn-open-filter-drawer');
    await filterBtn.click();

    // 切換至 ALPHA (XS~2XL) 單位
    const unitAlphaBtn = page.getByTestId('filter-unit-ALPHA');
    await expect(unitAlphaBtn).toBeVisible();
    await unitAlphaBtn.click();

    // 驗證按鈕清單中存在 2L
    const size2LBtn = page.getByTestId('filter-size-2L');
    await expect(size2LBtn).toBeVisible();

    // 點擊 2L
    await size2LBtn.click();
    await page.getByTestId('btn-apply-filters').click();

    // 驗收條件：
    // 1. 含有 2L 的 888 與含有 LL 的 999 必須可見
    await expect(page.locator('text=888')).toBeVisible();
    await expect(page.locator('text=999')).toBeVisible();
    await expect(page.locator('text=經典字母拖鞋・黑')).toBeVisible();
    await expect(page.locator('text=台規防水拖・藍')).toBeVisible();

    // 2. 其他尺碼或球鞋絕不可見
    await expect(page.locator('text=326')).not.toBeVisible();
    await expect(page.locator('text=NK-AF1')).not.toBeVisible();
  });
});
