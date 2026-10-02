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
      { id: 'var-f1', productId: 'test-fixture-1', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, stock: 8 },
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
    barcode: '195244510023',
    displayLocation: 'A-01-L3',
    storageLocation: 'R1-C01-L2',
    variants: [
      { id: 'var-f4', productId: 'test-fixture-2', sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, stock: 1 },
    ],
  },
  {
    id: 'test-fixture-3',
    sku: 'U9060ECA',
    brand: 'New Balance',
    name: '9060 海鹽灰',
    color: '海鹽灰',
    category: '休閒鞋',
    retailPrice: 4880,
    costPrice: 2800,
    barcode: '196969123456',
    displayLocation: 'A-02-L1',
    storageLocation: 'R1-C02-L1',
    variants: [
      { id: 'var-f5', productId: 'test-fixture-3', sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, stock: 3 },
    ],
  },
];

test.describe('庫存列表廠商分組開合收放 (Vendor Accordion) 測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seedProducts) => {
      localStorage.clear();
      localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
    }, SEED_TEST_PRODUCTS);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切換至庫存分頁
    const navInventory = page.locator('[data-testid="nav-tab-inventory"]');
    await expect(navInventory).toBeVisible();
    await navInventory.click();
  });

  test('TC-VENDOR-1: 預設展開所有廠商，點擊廠商標題可獨立收合與展開該廠商之鞋款清單', async ({ page }) => {
    const nikeToggle = page.locator('[data-testid="vendor-group-toggle-Nike"]');
    const nbToggle = page.locator('[data-testid="vendor-group-toggle-New Balance"]');
    const nikeShoe = page.locator('[data-testid="inventory-card-FD0655-001"]');
    const nbShoe = page.locator('[data-testid="inventory-card-U9060ECA"]');

    // 1. 驗證預設狀態下 Nike 與 New Balance 及其鞋款均清楚展開
    await expect(nikeToggle).toBeVisible();
    await expect(nbToggle).toBeVisible();
    await expect(nikeShoe).toBeVisible();
    await expect(nbShoe).toBeVisible();

    // 2. 點擊 Nike 標題收合 Nike 分組
    await nikeToggle.click();

    // 3. 驗證 Nike 鞋款清單已被隱藏，但 Nike 廠商標題仍完整保留（顯示款數、雙數與總成本）
    await expect(nikeShoe).not.toBeVisible();
    await expect(nikeToggle).toBeVisible();
    await expect(nikeToggle).toContainText('Nike');
    await expect(nikeToggle).toContainText('2 款');

    // 4. 同時 New Balance 未受影響，依然保持展開
    await expect(nbShoe).toBeVisible();

    // 5. 再次點擊 Nike 標題，展開恢復顯示
    await nikeToggle.click();
    await expect(nikeShoe).toBeVisible();
  });

  test('TC-VENDOR-2: 支援一鍵全部收合與全部展開按鈕', async ({ page }) => {
    const toggleAllBtn = page.locator('[data-testid="btn-toggle-all-vendors"]');
    const nikeShoe = page.locator('[data-testid="inventory-card-FD0655-001"]');
    const nbShoe = page.locator('[data-testid="inventory-card-U9060ECA"]');

    await expect(toggleAllBtn).toBeVisible();
    await expect(toggleAllBtn).toHaveText('全部收合');

    // 1. 點擊「全部收合」
    await toggleAllBtn.click();

    // 2. 驗證所有廠商鞋款清單皆已收合
    await expect(nikeShoe).not.toBeVisible();
    await expect(nbShoe).not.toBeVisible();
    await expect(toggleAllBtn).toHaveText('全部展開');

    // 3. 點擊「全部展開」
    await toggleAllBtn.click();

    // 4. 驗證所有鞋款再次重現
    await expect(nikeShoe).toBeVisible();
    await expect(nbShoe).toBeVisible();
    await expect(toggleAllBtn).toHaveText('全部收合');
  });

  test('TC-VENDOR-3: 當廠商收合時，進行搜尋會自動展開相符鞋款便於檢視', async ({ page }) => {
    const nikeToggle = page.locator('[data-testid="vendor-group-toggle-Nike"]');
    const nikeShoe = page.locator('[data-testid="inventory-card-FD0655-001"]');
    const searchInput = page.locator('[data-testid="inventory-search-input"]');

    // 1. 收合 Nike
    await nikeToggle.click();
    await expect(nikeShoe).not.toBeVisible();

    // 2. 搜尋 "FD06"
    await searchInput.fill('FD06');

    // 3. 驗證即便原本收合，搜尋結果依然自動呈現出來
    await expect(nikeShoe).toBeVisible();

    // 4. 清除搜尋，回復原本收合狀態
    await searchInput.fill('');
    await expect(nikeShoe).not.toBeVisible();
  });
});
