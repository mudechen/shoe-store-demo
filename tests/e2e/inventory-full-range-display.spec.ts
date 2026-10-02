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
    id: 'test-seed-sneaker-888',
    sku: 'NK-888',
    brand: 'Nike',
    name: '疾風跑鞋',
    color: '黑白',
    category: '運動鞋',
    retailPrice: 3200,
    costPrice: 1800,
    barcode: '471000888111',
    displayLocation: 'B-01-L1',
    storageLocation: 'R1-C02-L1',
    procurementType: '買斷',
    sizeUnit: 'US',
    minSize: '8.0',
    maxSize: '10.0',
    isHalfStep: true,
    variants: [
      {
        id: 'var-888-85',
        productId: 'test-seed-sneaker-888',
        sizeUS: 8.5,
        sizeEU: 42.0,
        sizeCM: 26.5,
        sizeDisplay: '8.5',
        stock: 3,
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

test.describe('庫存展開尺碼網格：依最小號至最大號完整顯示與步長間隔 (Rule 14)', () => {
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

    // 切換到庫存清單標籤頁
    const inventoryTab = page.locator('[data-testid="tab-inventory"], button:has-text("庫存")').first();
    await inventoryTab.click();
  });

  test('TC-GRID-1: 拖鞋整號模式下，41~45區間完整展開5個卡片（41, 42, 43, 44, 45）且0雙卡片呈現缺貨風格', async ({ page }) => {
    // 展開 2233 拖鞋卡片
    const shoeCard = page.locator('text=2233').first();
    await expect(shoeCard).toBeVisible();
    await shoeCard.click();

    // 驗證 41, 42, 43, 44, 45 卡片皆出現在畫面上
    const card41 = page.locator('text=41').first();
    const card42 = page.locator('text=42').first();
    const card43 = page.locator('text=43').first();
    const card44 = page.locator('text=44').first();
    const card45 = page.locator('text=45').first();

    await expect(card41).toBeVisible();
    await expect(card42).toBeVisible();
    await expect(card43).toBeVisible();
    await expect(card44).toBeVisible();
    await expect(card45).toBeVisible();

    // 驗證 44 號顯示 2 雙，41 號顯示 0 雙
    const stock44 = page.locator('[data-testid="inventory-stock-number-2233-10.0"]');
    await expect(stock44).toHaveText('2 雙');

    const stock41 = page.locator('[data-testid^="inventory-stock-number-2233-"]').filter({ hasText: '0 雙' });
    await expect(stock41.first()).toBeVisible();
  });

  test('TC-GRID-2: 點擊0雙規格之 [+] 可即時補貨入庫 1 雙，並自動建立規格', async ({ page }) => {
    const shoeCard = page.locator('text=2233').first();
    await shoeCard.click();

    // 點擊 41 號規格之 [+] 按鈕（sizeUS 為 8.0 或對應 ID）
    const plusBtn41 = page.locator('[data-testid^="inventory-btn-plus-2233-"]').first();
    await plusBtn41.click();

    // 驗證出現 Toast 提示
    const toast = page.locator('text=已補貨入庫 1 雙');
    await expect(toast).toBeVisible();

    // 驗證該尺碼現存數量變為 1 雙
    const stock1 = page.locator('[data-testid^="inventory-stock-number-2233-"]').filter({ hasText: '1 雙' });
    await expect(stock1.first()).toBeVisible();

    // 驗證 2233 卡片總現存雙數由 2 雙增為 3 雙
    const totalPairsText = page.locator('[data-testid="inventory-card-2233"]').locator('text=現存 3 雙');
    await expect(totalPairsText).toBeVisible();
  });

  test('TC-GRID-3: 半號鞋款（US 8.0 ~ 10.0）依 0.5 間隔展示（8.0, 8.5, 9.0, 9.5, 10.0）', async ({ page }) => {
    const shoeCard = page.locator('text=NK-888').first();
    await expect(shoeCard).toBeVisible();
    await shoeCard.click();

    // 驗證半號規格皆存在
    await expect(page.locator('text=8.0').first()).toBeVisible();
    await expect(page.locator('text=8.5').first()).toBeVisible();
    await expect(page.locator('text=9.0').first()).toBeVisible();
    await expect(page.locator('text=9.5').first()).toBeVisible();
    await expect(page.locator('text=10.0').first()).toBeVisible();

    // 驗證 8.5 顯示 3 雙
    const stock85 = page.locator('[data-testid="inventory-stock-number-NK-888-8.5"]');
    await expect(stock85).toHaveText('3 雙');
  });

  test('TC-GRID-4: 現貨保護機制（Rule 14）：即使現貨落在區間外，37 與 38 號絕不被隱藏', async ({ page }) => {
    const shoeCard = page.locator('text=1618').first();
    await expect(shoeCard).toBeVisible();
    await shoeCard.click();

    // 1618 區間設定為 47，但現貨有 37 (1雙) 與 38 (1雙)
    await expect(page.locator('text=37').first()).toBeVisible();
    await expect(page.locator('text=38').first()).toBeVisible();
    await expect(page.locator('text=47').first()).toBeVisible();

    // 驗證 37 與 38 皆各為 1 雙
    const stock37 = page.locator('[data-testid^="inventory-stock-number-1618-"]').filter({ hasText: '1 雙' }).first();
    await expect(stock37).toBeVisible();
  });
});
