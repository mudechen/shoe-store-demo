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
  {
    id: 'test-fixture-4',
    sku: '260',
    brand: '亞士達',
    name: '260',
    color: '藍',
    category: '拖鞋',
    retailPrice: 290,
    costPrice: 150,
    barcode: '172655909212', // 包含 90 之自動生成時間戳條碼
    displayLocation: 'C-01-L1',
    storageLocation: 'R3-C01-L1',
    variants: [
      { id: 'var-f6', productId: 'test-fixture-4', sizeUS: 8.0, sizeEU: 41.0, sizeCM: 26.0, stock: 13 },
    ],
  },
  {
    id: 'test-fixture-5',
    sku: '9039',
    brand: '牛頭',
    name: 'H拖',
    color: '黑',
    category: '拖鞋',
    retailPrice: 350,
    costPrice: 180,
    barcode: '197777888999',
    displayLocation: 'C-01-L2',
    storageLocation: 'R3-C01-L2',
    variants: [
      { id: 'var-f7', productId: 'test-fixture-5', sizeUS: 8.0, sizeEU: 41.0, sizeCM: 26.0, stock: 4 },
    ],
  },
];

test.describe('進貨入庫智慧自動補全與挑選功能測試', () => {
  test.beforeEach(async ({ page }) => {
    // Guaranteed clean state isolation with pre-seeded test catalog
    await page.addInitScript((seedProducts) => {
      localStorage.clear();
      localStorage.setItem('shoe_store_inventory_v1', JSON.stringify(seedProducts));
    }, SEED_TEST_PRODUCTS);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切換至庫存管理並開啟進貨入庫
    const navInventory = page.locator('[data-testid="nav-tab-inventory"]');
    await expect(navInventory).toBeVisible();
    await navInventory.click();

    const openStockInBtn = page.locator('[data-testid="btn-open-stockin-modal"]');
    await expect(openStockInBtn).toBeVisible();
    await openStockInBtn.click();

    const modal = page.locator('[data-testid="stockin-modal"]');
    await expect(modal).toBeVisible();
  });

  test('TC-AUTO-1: 輸入編號前幾碼即時顯示候選下拉選單，點擊一鍵自動帶入鞋款資訊', async ({ page }) => {
    const skuInput = page.locator('[data-testid="stockin-input-sku"]');
    const vendorInput = page.locator('[data-testid="stockin-input-vendor"]');
    const nameInput = page.locator('[data-testid="stockin-input-name"]');
    const colorInput = page.locator('[data-testid="stockin-input-color"]');

    // 1. 輸入部分貨號 "FD06"
    await skuInput.fill('FD06');

    // 2. 候選清單應自動展開並包含 FD0655-001
    const autocompleteItem = page.locator('[data-testid="stockin-sku-autocomplete-item"]').first();
    await expect(autocompleteItem).toBeVisible();
    await expect(autocompleteItem).toContainText('FD0655-001');
    await expect(autocompleteItem).toContainText("Air Force 1 '07");

    // 3. 點擊候選項
    await autocompleteItem.click();

    // 4. 驗證所有基本欄位均已一鍵自動帶入
    await expect(skuInput).toHaveValue('FD0655-001');
    await expect(vendorInput).toHaveValue('Nike');
    await expect(nameInput).toHaveValue("Air Force 1 '07");
    await expect(colorInput).toHaveValue('Triple White 純白');

    // 5. 驗證候選下拉選單已自動關閉
    await expect(page.locator('[data-testid="stockin-sku-autocomplete-item"]')).not.toBeVisible();
  });

  test('TC-AUTO-2: 點擊「挑選現有鞋款」按鈕開啟彈窗挑選並自動填入', async ({ page }) => {
    const skuInput = page.locator('[data-testid="stockin-input-sku"]');
    const vendorInput = page.locator('[data-testid="stockin-input-vendor"]');
    const nameInput = page.locator('[data-testid="stockin-input-name"]');

    // 1. 點擊「挑選現有鞋款」按鈕
    const pickShoeBtn = page.locator('[data-testid="btn-stockin-open-shoe-picker"]');
    await expect(pickShoeBtn).toBeVisible();
    await pickShoeBtn.click();

    // 2. 驗證現有鞋款挑選彈窗開啟
    await expect(page.locator('text=門市現有鞋款挑選')).toBeVisible();

    // 3. 點擊 Dunk Low Retro (DD1391-100) 的選擇按鈕
    const pickDunkBtn = page.locator('[data-testid="btn-pick-shoe-DD1391-100"]');
    await expect(pickDunkBtn).toBeVisible();
    await pickDunkBtn.click();

    // 4. 驗證彈窗關閉且欄位自動帶入
    await expect(page.locator('text=門市現有鞋款挑選')).not.toBeVisible();
    await expect(skuInput).toHaveValue('DD1391-100');
    await expect(vendorInput).toHaveValue('Nike');
    await expect(nameInput).toHaveValue('Dunk Low Retro');
  });

  test('TC-AUTO-3: 廠商/品牌輸入框輸入部分字元顯示既有廠商清單並可點擊選取', async ({ page }) => {
    const vendorInput = page.locator('[data-testid="stockin-input-vendor"]');

    // 1. 點擊廠商欄位並輸入部分文字 "Nik"
    await vendorInput.click();
    await vendorInput.fill('Nik');

    // 2. 候選廠商清單應出現 "Nike"
    const vendorItem = page.locator('[data-testid="stockin-vendor-autocomplete-item"]').first();
    await expect(vendorItem).toBeVisible();
    await expect(vendorItem).toContainText('Nike');

    // 3. 點擊該廠商項目
    await vendorItem.click();

    // 4. 驗證廠商輸入框已帶入 "Nike"
    await expect(vendorInput).toHaveValue('Nike');
    await expect(page.locator('[data-testid="stockin-vendor-autocomplete-item"]')).not.toBeVisible();
  });

  test('TC-AUTO-4: 品名/系列輸入框輸入部分字元顯示品名系列推薦並可點擊選取', async ({ page }) => {
    const vendorInput = page.locator('[data-testid="stockin-input-vendor"]');
    const nameInput = page.locator('[data-testid="stockin-input-name"]');

    // 1. 輸入部分品名 "Air"
    await nameInput.click();
    await nameInput.fill('Air');

    // 2. 推薦清單應出現 Air Force 1
    const nameItem = page.locator('[data-testid="stockin-name-autocomplete-item"]').first();
    await expect(nameItem).toBeVisible();
    await expect(nameItem).toContainText('Air Force 1');

    // 3. 點擊該品名系列項目
    await nameItem.click();

    // 4. 驗證品名已帶入，且連動帶入廠商 Nike
    await expect(nameInput).toHaveValue("Air Force 1 '07");
    await expect(vendorInput).toHaveValue('Nike');
    await expect(page.locator('[data-testid="stockin-name-autocomplete-item"]')).not.toBeVisible();
  });

  test('TC-AUTO-5: 輸入短字元(如 90)時精準排序貨號開頭，不因時間戳條碼包含 90 而誤出現無關鞋款 (如 260)', async ({ page }) => {
    const skuInput = page.locator('[data-testid="stockin-input-sku"]');

    // 1. 輸入 "90"
    await skuInput.fill('90');

    // 2. 候選清單應包含 9039，且不應包含 260
    const autocompleteItems = page.locator('[data-testid="stockin-sku-autocomplete-item"]');
    await expect(autocompleteItems.first()).toBeVisible();

    // 驗證首位項目為貨號以 90 開頭之鞋款 (9039 或 9060)
    await expect(autocompleteItems.first()).toContainText('9039');

    // 驗證無關之 260 絕不應該被條碼模糊誤比對跑出來
    const itemTexts = await autocompleteItems.allInnerTexts();
    const has260 = itemTexts.some((t) => t.includes('260') && !t.includes('9039') && !t.includes('9060'));
    expect(has260).toBe(false);
  });
});
