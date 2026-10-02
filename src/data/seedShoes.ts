import { ProductWithVariants, ProcurementType } from '../types/inventory';
import { STANDARD_SIZES } from './sizeStandards';

interface ShoeSeedDefinition {
  sku: string;
  brand: string;
  name: string;
  color: string;
  category: string;
  retailPrice: number;
  costPrice: number;
  barcode: string;
  displayLocation: string;
  storageLocation: string;
  procurementType?: ProcurementType;
  stocks: number[]; // 13 stock values matching STANDARD_SIZES (US 6.0 to 12.0)
}

const RAW_SEEDS: ShoeSeedDefinition[] = [
  // 1. Nike Air Force 1 '07
  {
    sku: 'FD0655-001',
    brand: 'Nike',
    name: "Air Force 1 '07",
    color: 'Triple White 純白',
    category: 'Lifestyle',
    retailPrice: 3400,
    costPrice: 2050,
    barcode: '196607831001',
    displayLocation: 'A-01-L2',
    storageLocation: 'R1-C01-L3',
    stocks: [0, 0, 1, 3, 5, 8, 7, 5, 4, 2, 1, 0, 0]
  },
  // 2. Nike Dunk Low Retro
  {
    sku: 'DD1391-100',
    brand: 'Nike',
    name: 'Dunk Low Retro',
    color: 'White/Black 黑白熊貓',
    category: 'Lifestyle',
    retailPrice: 3400,
    costPrice: 2050,
    barcode: '195244510023',
    displayLocation: 'A-01-L3',
    storageLocation: 'R1-C01-L2',
    stocks: [1, 2, 1, 0, 0, 0, 0, 1, 2, 1, 0, 1, 0]
  },
  // 3. Nike Pegasus 41
  {
    sku: 'FD2722-100',
    brand: 'Nike',
    name: 'Pegasus 41',
    color: 'White/Volt 螢光白',
    category: 'Running',
    retailPrice: 4200,
    costPrice: 2500,
    barcode: '196969123045',
    displayLocation: 'B-01-L2',
    storageLocation: 'R2-C02-L2',
    stocks: [3, 4, 4, 5, 5, 5, 4, 4, 3, 3, 3, 3, 3]
  },
  // 4. Nike Vomero 5
  {
    sku: 'HF4313-001',
    brand: 'Nike',
    name: 'Vomero 5',
    color: 'Photon Dust 淺灰銀',
    category: 'Running',
    retailPrice: 4800,
    costPrice: 2900,
    barcode: '197593234567',
    displayLocation: 'A-02-L2',
    storageLocation: 'R1-C02-L3',
    stocks: [2, 3, 0, 3, 2, 1, 2, 1, 2, 3, 2, 1, 0]
  },
  // 5. Nike Kobe 8 Protro
  {
    sku: 'FN5215-100',
    brand: 'Nike',
    name: 'Kobe 8 Protro',
    color: 'Halo 純白紀念',
    category: 'Basketball',
    retailPrice: 6000,
    costPrice: 3600,
    barcode: '196608987654',
    displayLocation: 'A-02-L4',
    storageLocation: 'R1-C03-L5',
    stocks: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0]
  },
  // 6. New Balance 9060
  {
    sku: 'U9060ECA',
    brand: 'New Balance',
    name: '9060',
    color: 'Sea Salt 海鹽灰',
    category: 'Lifestyle',
    retailPrice: 4880,
    costPrice: 2950,
    barcode: '196432109876',
    displayLocation: 'A-03-L2',
    storageLocation: 'R2-C01-L3',
    stocks: [3, 4, 4, 3, 3, 2, 2, 0, 4, 3, 2, 1, 0]
  },
  // 7. New Balance 990v6 Made in USA
  {
    sku: 'M990GL6',
    brand: 'New Balance',
    name: '990v6 Made in USA',
    color: 'Classic Grey 經典元祖灰',
    category: 'Lifestyle',
    retailPrice: 8680,
    costPrice: 5200,
    barcode: '195907654321',
    displayLocation: 'A-03-L3',
    storageLocation: 'R2-C01-L4',
    stocks: [2, 2, 3, 3, 3, 3, 2, 2, 2, 2, 0, 1, 1]
  },
  // 8. New Balance 2002R Protection Pack
  {
    sku: 'M2002RDA',
    brand: 'New Balance',
    name: '2002R Protection Pack',
    color: 'Rain Cloud 雨雲灰',
    category: 'Lifestyle',
    retailPrice: 4980,
    costPrice: 3000,
    barcode: '195907456789',
    displayLocation: 'C-01-L2',
    storageLocation: 'R2-C02-L3',
    stocks: [0, 0, 2, 3, 5, 6, 5, 4, 3, 2, 1, 0, 0]
  },
  // 9. New Balance 530
  {
    sku: 'MR530SG',
    brand: 'New Balance',
    name: '530 Retro Running',
    color: 'White Silver 白銀',
    category: 'Running',
    retailPrice: 3080,
    costPrice: 1850,
    barcode: '195907123987',
    displayLocation: 'B-01-L3',
    storageLocation: 'R2-C03-L2',
    stocks: [6, 6, 5, 4, 3, 2, 2, 1, 1, 0, 0, 0, 0]
  },
  // 10. New Balance 574 Legacy
  {
    sku: 'U574LG1',
    brand: 'New Balance',
    name: '574 Legacy',
    color: 'Navy/Grey 海軍藍灰',
    category: 'Lifestyle',
    retailPrice: 3280,
    costPrice: 1950,
    barcode: '195907987123',
    displayLocation: 'C-01-L1',
    storageLocation: 'R2-C03-L1',
    stocks: [4, 5, 6, 6, 7, 7, 6, 5, 4, 4, 3, 3, 3]
  },
  // 11. Adidas Samba OG
  {
    sku: 'B75806',
    brand: 'Adidas',
    name: 'Samba OG',
    color: 'Cloud White/Core Black 白底黑條',
    category: 'Lifestyle',
    retailPrice: 3490,
    costPrice: 2100,
    barcode: '4059807654321',
    displayLocation: 'C-02-L2',
    storageLocation: 'R3-C01-L3',
    stocks: [1, 2, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0]
  },
  // 12. Adidas Gazelle Indoor
  {
    sku: 'IH7829',
    brand: 'Adidas',
    name: 'Gazelle Indoor',
    color: 'Collegiate Green 復古綠膠底',
    category: 'Lifestyle',
    retailPrice: 3890,
    costPrice: 2350,
    barcode: '4067887654321',
    displayLocation: 'C-02-L3',
    storageLocation: 'R3-C01-L2',
    stocks: [2, 3, 4, 3, 4, 1, 1, 2, 3, 2, 1, 0, 0]
  },
  // 13. Adidas Campus 00s
  {
    sku: 'IG1024',
    brand: 'Adidas',
    name: 'Campus 00s',
    color: 'Core Black 麵包滑板鞋',
    category: 'Skateboarding',
    retailPrice: 3690,
    costPrice: 2200,
    barcode: '4066747654321',
    displayLocation: 'C-02-L1',
    storageLocation: 'R3-C02-L1',
    stocks: [2, 0, 3, 4, 6, 8, 7, 5, 5, 3, 2, 1, 0]
  },
  // 14. Adidas Ultraboost Light
  {
    sku: 'IE1698',
    brand: 'Adidas',
    name: 'Ultraboost Light',
    color: 'Core Black 純黑跑鞋',
    category: 'Running',
    retailPrice: 5990,
    costPrice: 3600,
    barcode: '4065427654321',
    displayLocation: 'B-02-L2',
    storageLocation: 'R3-C02-L2',
    stocks: [3, 3, 4, 5, 6, 6, 5, 5, 4, 4, 3, 3, 3]
  },
  // 15. Adidas Anthony Edwards 1 (AE 1)
  {
    sku: 'IF1860',
    brand: 'Adidas',
    name: 'Anthony Edwards 1 (AE 1)',
    color: 'With Love 蜜桃粉',
    category: 'Basketball',
    retailPrice: 4290,
    costPrice: 2550,
    barcode: '4067897654321',
    displayLocation: 'A-02-L3',
    storageLocation: 'R3-C03-L4',
    stocks: [0, 0, 1, 2, 1, 0, 0, 0, 0, 1, 1, 2, 2]
  },
  // 16. Jordan Air Jordan 1 Retro High OG
  {
    sku: 'DZ5485-612',
    brand: 'Jordan',
    name: 'Air Jordan 1 Retro High OG',
    color: 'Chicago Lost & Found 芝加哥',
    category: 'Basketball',
    retailPrice: 6300,
    costPrice: 3800,
    barcode: '196154123456',
    displayLocation: 'A-01-L4',
    storageLocation: 'R1-C04-L5',
    stocks: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0]
  },
  // 17. Jordan Air Jordan 4 Retro
  {
    sku: 'DH6927-061',
    brand: 'Jordan',
    name: 'Air Jordan 4 Retro',
    color: 'Red Cement 紅水泥',
    category: 'Basketball',
    retailPrice: 6700,
    costPrice: 4000,
    barcode: '196607234567',
    displayLocation: 'A-01-L1',
    storageLocation: 'R1-C04-L4',
    stocks: [0, 1, 1, 2, 0, 3, 2, 3, 4, 2, 1, 0, 0]
  },
  // 18. ASICS GEL-KAYANO 14
  {
    sku: '1201A019-100',
    brand: 'ASICS',
    name: 'GEL-KAYANO 14',
    color: 'White/Pure Silver 雲母灰銀',
    category: 'Running',
    retailPrice: 4580,
    costPrice: 2750,
    barcode: '4550456123456',
    displayLocation: 'B-02-L3',
    storageLocation: 'R4-C01-L3',
    stocks: [1, 1, 2, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0]
  },
  // 19. ASICS NOVABLAST 4
  {
    sku: '1011B693-001',
    brand: 'ASICS',
    name: 'NOVABLAST 4',
    color: 'Black/Graphite Grey 純黑跳色',
    category: 'Running',
    retailPrice: 4580,
    costPrice: 2750,
    barcode: '4550456234567',
    displayLocation: 'B-02-L1',
    storageLocation: 'R4-C01-L2',
    stocks: [3, 3, 4, 4, 5, 5, 4, 4, 3, 3, 3, 3, 2]
  },
  // 20. ASICS GT-2160
  {
    sku: '1203A275-102',
    brand: 'ASICS',
    name: 'GT-2160',
    color: 'Cream/Sheet Rock 奶油灰銀',
    category: 'Lifestyle',
    retailPrice: 3980,
    costPrice: 2400,
    barcode: '4550456345678',
    displayLocation: 'C-03-L2',
    storageLocation: 'R4-C02-L2',
    stocks: [2, 3, 3, 2, 2, 0, 3, 4, 2, 2, 1, 0, 0]
  },
  // 21. Puma Palermo
  {
    sku: '396464-01',
    brand: 'Puma',
    name: 'Palermo',
    color: 'White/Black/Gum 德訓板鞋',
    category: 'Lifestyle',
    retailPrice: 2980,
    costPrice: 1800,
    barcode: '4065449123456',
    displayLocation: 'D-01-L2',
    storageLocation: 'R4-C03-L2',
    stocks: [4, 4, 5, 5, 6, 6, 5, 5, 4, 4, 3, 3, 2]
  },
  // 22. Converse Chuck 70 Classic Canvas
  {
    sku: '162058C',
    brand: 'Converse',
    name: 'Chuck 70 Classic Canvas',
    color: 'Black/Egret 經典黑高筒',
    category: 'Lifestyle',
    retailPrice: 2680,
    costPrice: 1600,
    barcode: '0888755123456',
    displayLocation: 'C-03-L1',
    storageLocation: 'R4-C04-L1',
    stocks: [5, 6, 7, 8, 10, 10, 9, 8, 7, 6, 5, 4, 4]
  },
  // 23. Salomon XT-6
  {
    sku: 'L41085000',
    brand: 'Salomon',
    name: 'XT-6',
    color: 'Black/Phantom 純黑機能',
    category: 'Outdoor',
    retailPrice: 6980,
    costPrice: 4200,
    barcode: '193128123456',
    displayLocation: 'D-01-L3',
    storageLocation: 'R4-C04-L4',
    stocks: [1, 2, 1, 2, 1, 0, 0, 0, 0, 1, 1, 0, 0]
  },
  // 24. Vans Old Skool
  {
    sku: 'VN000D3HY28',
    brand: 'Vans',
    name: 'Old Skool',
    color: 'Black/White 經典黑白條紋',
    category: 'Skateboarding',
    retailPrice: 2380,
    costPrice: 1450,
    barcode: '196573123456',
    displayLocation: 'D-02-L2',
    storageLocation: 'R4-C04-L2',
    stocks: [1, 0, 2, 2, 0, 2, 1, 0, 2, 1, 1, 0, 1]
  },
  // 25. Nike Victori One Slide (拖鞋)
  {
    sku: 'CN9675-002',
    brand: 'Nike',
    name: 'Victori One Slide 舒適運動拖鞋',
    color: 'Black/White 黑白',
    category: '拖鞋',
    retailPrice: 1000,
    costPrice: 600,
    barcode: '194497812345',
    displayLocation: 'D-03-L1',
    storageLocation: 'R4-C05-L1',
    stocks: [4, 5, 6, 8, 10, 12, 10, 8, 6, 4, 2, 0, 0]
  },
  // 26. Birkenstock Arizona (涼鞋)
  {
    sku: 'BK-51791',
    brand: 'Birkenstock',
    name: 'Arizona 雙帶軟木涼鞋',
    color: 'Black 啞光黑',
    category: '涼鞋',
    retailPrice: 2980,
    costPrice: 1800,
    barcode: '401387123987',
    displayLocation: 'D-03-L2',
    storageLocation: 'R4-C05-L2',
    stocks: [2, 3, 4, 5, 5, 4, 3, 2, 2, 1, 0, 0, 0]
  },
  // 27. Clarks Tilden Walk (皮鞋)
  {
    sku: 'CLK-26110310',
    brand: 'Clarks',
    name: 'Tilden Walk 經典商務真皮皮鞋',
    color: 'Dark Tan 深焦糖棕',
    category: '皮鞋',
    retailPrice: 4280,
    costPrice: 2550,
    barcode: '505041234567',
    displayLocation: 'D-04-L1',
    storageLocation: 'R4-C06-L1',
    stocks: [1, 2, 3, 4, 4, 3, 3, 2, 1, 1, 0, 0, 0]
  },
  // 28. Hunter Original Short (雨鞋)
  {
    sku: 'WFS1000RMA',
    brand: 'Hunter',
    name: 'Original Short 防水短筒雨靴',
    color: 'Matte Navy 海軍藍',
    category: '雨鞋',
    retailPrice: 4680,
    costPrice: 2800,
    barcode: '505491234901',
    displayLocation: 'D-04-L2',
    storageLocation: 'R4-C06-L2',
    stocks: [0, 1, 2, 3, 3, 2, 2, 1, 0, 0, 0, 0, 0]
  }
];

const CATEGORY_MAP: Record<string, string> = {
  'Lifestyle': '休閒鞋',
  'Running': '運動鞋',
  'Basketball': '運動鞋',
  'Skateboarding': '休閒鞋',
  'Outdoor': '包鞋',
};

export function isMockProduct(p: { id: string; sku?: string }): boolean {
  if (p.id?.startsWith('test-fixture-')) return false;
  return /^prod-[0-9]{1,2}-/.test(p.id);
}

/**
 * Return empty array as default product inventory (no simulated mock data)
 */
export function getSeedShoes(): ProductWithVariants[] {
  return [];
}

export const DEMO_SHOE_2133: ProductWithVariants = {
  id: 'prod-demo-2133',
  sku: '2133',
  brand: 'Nike Kids & Adults',
  name: '編號 2133 跨段經典款',
  color: '純黑/純白',
  category: '休閒鞋',
  retailPrice: 2200,
  costPrice: 1300,
  barcode: '471000002133',
  displayLocation: 'K-01-L1',
  storageLocation: 'R5-C01-L1',
  procurementType: '買斷',
  variants: [
    {
      id: 'var-2133-kids-20',
      productId: 'prod-demo-2133',
      sizeUS: 1.0,
      sizeEU: 32,
      sizeCM: 20,
      sizeDisplay: '童段 20.0',
      stock: 5,
    },
    {
      id: 'var-2133-adult-20',
      productId: 'prod-demo-2133',
      sizeUS: 3.0,
      sizeEU: 35,
      sizeCM: 20,
      sizeDisplay: '大人段 20.0',
      stock: 6,
    },
  ],
};

/**
 * Generate fully typed ProductWithVariants array for test fixtures if needed
 */
export function getMockSeedShoes(): ProductWithVariants[] {
  const baseSeeds = RAW_SEEDS.map((seed, productIdx) => {
    const productId = `prod-${productIdx + 1}-${seed.sku}`;

    const variants = STANDARD_SIZES.map((std, sizeIdx) => {
      const stock = seed.stocks[sizeIdx] ?? 0;
      return {
        id: `var-${seed.sku}-${std.sizeUS.toFixed(1)}`,
        productId,
        sizeUS: std.sizeUS,
        sizeEU: std.sizeEU,
        sizeCM: std.sizeCM,
        stock,
      };
    });

    const categoryChinese = CATEGORY_MAP[seed.category] || seed.category;

    return {
      id: productId,
      sku: seed.sku,
      brand: seed.brand,
      name: seed.name,
      color: seed.color,
      category: categoryChinese,
      retailPrice: seed.retailPrice,
      costPrice: seed.costPrice,
      barcode: seed.barcode,
      displayLocation: seed.displayLocation,
      storageLocation: seed.storageLocation,
      procurementType: seed.procurementType || '買斷',
      variants,
    };
  });

  return [...baseSeeds, DEMO_SHOE_2133];
}
