import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ProductWithVariants, InventoryLog } from '../types/inventory';
import {
  SaleRecord,
  SaleDraft,
  BatchSaleDraftItem,
  DailyClosingSummary
} from '../types/sales';
import { getSeedShoes } from '../data/seedShoes';
import { getInitialSeedSales } from '../data/seedSales';
import { calculateDailyClosing } from '../services/salesService';
import { realtimeService } from '../services/realtimeService';
import { getTaiwanTodayStr } from '../utils/dateUtils';
import { deductFifoVariantStock, restoreFifoVariantStock, addBatchToVariant } from '../services/fifoService';

const STORAGE_KEY_INVENTORY = 'shoe_store_inventory_v1';
const STORAGE_KEY_SALES = 'shoe_store_sales_v1';
const STORAGE_KEY_LOGS = 'shoe_store_logs_v1';

export interface BatchSaleResult {
  successCount: number;
  errors: string[];
  records: SaleRecord[];
}

export interface InventoryContextValue {
  // Inventory (Phase 1-3)
  products: ProductWithVariants[];
  setProducts: React.Dispatch<React.SetStateAction<ProductWithVariants[]>>;
  inventoryLogs: InventoryLog[];
  deductStock: (variantId: string, quantity?: number) => boolean;
  batchRestock: (items: { variantId: string; quantity: number }[]) => void;
  importProducts: (imported: ProductWithVariants[]) => void;
  resetInventory: () => void;

  // Sales (Follow-up R1-R3)
  sales: SaleRecord[];
  setSales: React.Dispatch<React.SetStateAction<SaleRecord[]>>;
  recordSale: (draft: SaleDraft) => SaleRecord;
  addSaleRecord: (draft: SaleDraft) => SaleRecord; // Alias
  recordBatchSales: (drafts: BatchSaleDraftItem[], businessDate: string) => BatchSaleResult;
  addBatchSales: (drafts: BatchSaleDraftItem[], businessDate: string) => BatchSaleResult; // Alias
  returnSaleRecord: (saleId: string, reason?: string) => boolean;
  processReturn: (saleId: string, reason?: string) => boolean; // Alias
  exchangeSaleRecord: (saleId: string, newSaleDraft: SaleDraft, reason?: string) => boolean;
  processExchange: (saleId: string, newSaleDraft: SaleDraft, reason?: string) => boolean; // Alias
  getDailyClosing: (businessDate: string) => DailyClosingSummary;
  getAvailableDates: () => string[];
  resetSales: () => void;
}

export interface InventoryProviderProps {
  children: React.ReactNode;
  externalProducts?: ProductWithVariants[];
  setExternalProducts?: React.Dispatch<React.SetStateAction<ProductWithVariants[]>>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export const InventoryProvider: React.FC<InventoryProviderProps> = ({
  children,
  externalProducts,
  setExternalProducts: setExternalProductsProp
}) => {
  // -------------------------------------------------------------
  // 1. Inventory State (Internal or External delegation)
  // -------------------------------------------------------------
  const [internalProducts, setInternalProducts] = useState<ProductWithVariants[]>(() => {
    if (externalProducts) return externalProducts;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVENTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read inventory from localStorage:', e);
    }
    return getSeedShoes();
  });

  const products = externalProducts ?? internalProducts;
  const setProducts = setExternalProductsProp ?? setInternalProducts;


  // -------------------------------------------------------------
  // 2. Sales State
  // -------------------------------------------------------------
  const [sales, setSales] = useState<SaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SALES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read sales from localStorage:', e);
    }
    return getInitialSeedSales();
  });

  // -------------------------------------------------------------
  // 3. Inventory Logs State
  // -------------------------------------------------------------
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read inventory logs from localStorage:', e);
    }
    return [];
  });

  // -------------------------------------------------------------
  // Persistence Effects
  // -------------------------------------------------------------
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(products));
    } catch (e) {
      console.warn('Failed to save inventory to localStorage:', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
    } catch (e) {
      console.warn('Failed to save sales to localStorage:', e);
    }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(inventoryLogs));
    } catch (e) {
      console.warn('Failed to save inventory logs to localStorage:', e);
    }
  }, [inventoryLogs]);

  // -------------------------------------------------------------
  // Realtime Subscriptions & Cross-Tab Sync
  // -------------------------------------------------------------
  useEffect(() => {
    const unsub = realtimeService.subscribe((event) => {
      if (event.type === 'STOCK_DEDUCTED') {
        const { variantId, delta, newStock } = event;
        setProducts((prev) =>
          prev.map((p) => ({
            ...p,
            variants: p.variants.map((v) => {
              if (v.id === variantId) {
                const updated = Math.max(0, typeof newStock === 'number' ? newStock : v.stock - delta);
                return { ...v, stock: updated };
              }
              return v;
            })
          }))
        );
      } else if (event.type === 'STOCK_UPDATED') {
        const { variantId, newStock } = event;
        setProducts((prev) =>
          prev.map((p) => ({
            ...p,
            variants: p.variants.map((v) => (v.id === variantId ? { ...v, stock: newStock } : v))
          }))
        );
      } else if (event.type === 'INVENTORY_SYNC') {
        setProducts(event.products);
      } else if (event.type === 'INVENTORY_RESET') {
        setProducts(getSeedShoes());
      }
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_INVENTORY && e.newValue) {
        try {
          setProducts(JSON.parse(e.newValue));
        } catch {}
      } else if (e.key === STORAGE_KEY_SALES && e.newValue) {
        try {
          setSales(JSON.parse(e.newValue));
        } catch {}
      } else if (e.key === STORAGE_KEY_LOGS && e.newValue) {
        try {
          setInventoryLogs(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // -------------------------------------------------------------
  // Inventory Mutation Actions
  // -------------------------------------------------------------
  const deductStock = useCallback((variantId: string, quantity: number = 1): boolean => {
    let deductSuccess = false;
    let targetVariantInfo: { productId: string; productName: string; sku: string; sizeUS: number; stockBefore: number; stockAfter: number } | null = null;

    setProducts((prev) => {
      let found = false;
      const updated = prev.map((p) => {
        const vMatch = p.variants.find((v) => v.id === variantId);
        if (!vMatch) return p;

        found = true;
        const currentStock = vMatch.stock;
        const fifoResult = deductFifoVariantStock(vMatch, quantity, p.costPrice);
        const newStock = fifoResult.updatedVariant.stock;

        targetVariantInfo = {
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          sizeUS: vMatch.sizeUS,
          stockBefore: currentStock,
          stockAfter: newStock
        };

        return {
          ...p,
          variants: p.variants.map((v) => (v.id === variantId ? fifoResult.updatedVariant : v))
        };
      });

      if (found) {
        deductSuccess = true;
        return updated;
      }
      return prev;
    });

    if (deductSuccess && targetVariantInfo) {
      const info = targetVariantInfo as { productId: string; productName: string; sku: string; sizeUS: number; stockBefore: number; stockAfter: number };
      const log: InventoryLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        variantId,
        productId: info.productId,
        productName: info.productName,
        sku: info.sku,
        sizeUS: info.sizeUS,
        delta: -quantity,
        stockBefore: info.stockBefore,
        stockAfter: info.stockAfter,
        action: 'sale_deduct',
        operator: '門市人員',
        timestamp: new Date().toISOString()
      };
      setInventoryLogs((logs) => [log, ...logs]);

      realtimeService.broadcastDeduction(
        {
          variantId,
          productId: info.productId,
          quantity,
          sourceDevice: 'desktop-counter',
          timestamp: new Date().toISOString()
        },
        info.stockAfter
      );
    }

    return deductSuccess;
  }, []);

  const batchRestock = useCallback((items: { variantId: string; quantity: number }[]) => {
    if (!items.length) return;

    setProducts((prev) => {
      const itemMap = new Map(items.map((i) => [i.variantId, i.quantity]));
      const updated = prev.map((p) => ({
        ...p,
        variants: p.variants.map((v) => {
          const add = itemMap.get(v.id);
          return add ? addBatchToVariant(v, add, p.costPrice) : v;
        })
      }));

      realtimeService.broadcastSync(updated);
      return updated;
    });
  }, []);

  const importProducts = useCallback((imported: ProductWithVariants[]) => {
    setProducts((prev) => {
      const map = new Map(prev.map((p) => [`${p.sku.toUpperCase()}__${(p.color || '').trim().toUpperCase()}`, p]));
      imported.forEach((item) => {
        map.set(`${item.sku.toUpperCase()}__${(item.color || '').trim().toUpperCase()}`, item);
      });
      const merged = Array.from(map.values());
      realtimeService.broadcastSync(merged);
      return merged;
    });
  }, []);

  const resetInventory = useCallback(() => {
    const seeds = getSeedShoes();
    setProducts(seeds);
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(seeds));
    } catch {}
    realtimeService.broadcastReset();
  }, []);

  const resetSales = useCallback(() => {
    const seeds = getInitialSeedSales();
    setSales(seeds);
    setInventoryLogs([]);
    try {
      localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(seeds));
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify([]));
    } catch {}
  }, []);

  // -------------------------------------------------------------
  // Core Sales Linkage: recordSale
  // -------------------------------------------------------------
  const recordSale = useCallback(
    (draft: SaleDraft): SaleRecord => {
      const saleId = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const timestamp = new Date().toISOString();

      const newRecord: SaleRecord = {
        id: saleId,
        businessDate: draft.businessDate || getTaiwanTodayStr(),
        timestamp,
        brand: draft.brand,
        sku: draft.sku,
        productName: draft.productName,
        color: draft.color,
        sizeUS: Number(draft.sizeUS),
        sizeDisplay: draft.sizeDisplay || (draft.sizeUS ? `${draft.sizeUS}` : '標準碼'),
        category: draft.category,
        retailPrice: Number(draft.retailPrice) || 0,
        actualPaid: Number(draft.actualPaid) || 0,
        paymentMethod: draft.paymentMethod,
        status: draft.status || 'completed',
        isCustomItem: Boolean(draft.isCustomItem),
        productId: draft.productId,
        variantId: draft.variantId,
        displayLocation: draft.displayLocation,
        storageLocation: draft.storageLocation,
        notes: draft.notes,
        operator: draft.operator || '門市人員'
      };

      // Atomic stock deduction for catalogued items
      if (!draft.isCustomItem) {
        let matchedVariantId = draft.variantId;
        let matchedProductId = draft.productId;
        let pName = draft.productName;
        let pSku = draft.sku;
        let pSize = Number(draft.sizeUS);
        let stockBefore = 0;
        let stockAfter = 0;
        let unitCostPrice = 0;
        let batchId: string | undefined;
        let stockInOrderId: string | undefined;

        // Synchronously find target product and variant from current products state
        const targetProd = products.find((p) =>
          matchedProductId
            ? p.id === matchedProductId
            : p.sku.toUpperCase() === draft.sku.toUpperCase() &&
              (!draft.color || p.color.trim().toLowerCase() === draft.color.trim().toLowerCase())
        );

        if (targetProd) {
          matchedProductId = targetProd.id;
          pName = targetProd.name;
          pSku = targetProd.sku;

          const targetVar = targetProd.variants.find((v) =>
            matchedVariantId
              ? v.id === matchedVariantId
              : draft.sizeDisplay && v.sizeDisplay
              ? v.sizeDisplay === draft.sizeDisplay
              : Math.abs(v.sizeUS - pSize) < 0.05
          );

          if (targetVar) {
            matchedVariantId = targetVar.id;
            stockBefore = targetVar.stock;
            const fifoResult = deductFifoVariantStock(targetVar, 1, targetProd.costPrice);
            stockAfter = fifoResult.updatedVariant.stock;
            unitCostPrice = fifoResult.costPrice;
            batchId = fifoResult.batchId;
            stockInOrderId = fifoResult.stockInOrderId;
          } else {
            unitCostPrice = targetProd.costPrice || 0;
          }
        }

        if (matchedProductId && matchedVariantId) {
          newRecord.productId = matchedProductId;
          newRecord.variantId = matchedVariantId;
          newRecord.costPrice = unitCostPrice;
          newRecord.grossProfit = newRecord.actualPaid - unitCostPrice;
          newRecord.batchId = batchId;
          newRecord.stockInOrderId = stockInOrderId;

          setProducts((prev) =>
            prev.map((p) => {
              if (p.id !== matchedProductId) return p;
              return {
                ...p,
                variants: p.variants.map((v) => {
                  if (v.id !== matchedVariantId) return v;
                  return deductFifoVariantStock(v, 1, p.costPrice).updatedVariant;
                }),
              };
            })
          );

          // Generate Inventory Log
          const log: InventoryLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            variantId: matchedVariantId,
            productId: matchedProductId,
            productName: pName,
            sku: pSku,
            sizeUS: pSize,
            delta: -1,
            stockBefore,
            stockAfter,
            action: 'sale_deduct',
            operator: draft.operator || '門市人員',
            timestamp,
          };
          setInventoryLogs((logs) => [log, ...logs]);

          realtimeService.broadcastDeduction(
            {
              variantId: matchedVariantId,
              productId: matchedProductId,
              quantity: 1,
              sourceDevice: 'desktop-counter',
              timestamp,
            },
            stockAfter
          );
        } else {
          // Custom item fallback or uncatalogued variant
          const customCost = Number(draft.costPrice) || (targetProd?.costPrice ?? 0);
          newRecord.costPrice = customCost;
          newRecord.grossProfit = newRecord.actualPaid - customCost;
        }
      } else {
        // Custom item (uncatalogued)
        const customCost = Number(draft.costPrice) || 0;
        newRecord.costPrice = customCost;
        newRecord.grossProfit = newRecord.actualPaid - customCost;
      }

      setSales((prev) => [newRecord, ...prev]);
      return newRecord;
    },
    [products]
  );

  // -------------------------------------------------------------
  // Bulk Consecutive Entry: recordBatchSales
  // -------------------------------------------------------------
  const recordBatchSales = useCallback(
    (drafts: BatchSaleDraftItem[], businessDate: string): BatchSaleResult => {
      const createdRecords: SaleRecord[] = [];
      const errors: string[] = [];
      const now = new Date();

      if (!drafts.length) {
        return { successCount: 0, errors: ['無可提交之銷貨項目'], records: [] };
      }

      // Collect variant deductions for atomic CAS update
      const deductions: { variantId: string; delta: number }[] = [];
      const logsToCreate: InventoryLog[] = [];

      setProducts((currentProducts) => {
        // Deep copy products for CAS calculation
        const productMap = new Map(currentProducts.map((p) => [p.id, { ...p, variants: p.variants.map((v) => ({ ...v })) }]));

        drafts.forEach((draft, index) => {
          const rowNum = index + 1;
          const sku = (draft.sku || '').trim();
          const brand = (draft.brand || '').trim();
          const name = (draft.name || '').trim();
          const price = Number(draft.actualPaid) || 0;
          const retail = Number(draft.retailPrice) || price;
          const size = Number(draft.sizeUS) || 8.5;

          if (!sku && !brand && !name) {
            // Empty row, skip quietly
            return;
          }

          if (price < 0) {
            errors.push(`第 ${rowNum} 列: 銷售金額不可為負數`);
            return;
          }

          const saleId = `sale-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
          const timestamp = new Date(now.getTime() + index * 100).toISOString();

          let linkedProductId = draft.matchedProductId;
          let linkedVariantId = draft.matchedVariantId;
          let isCustom = Boolean(draft.isCustom);
          let unitCostPrice = Number(draft.costPrice) || 0;
          let batchId: string | undefined;
          let stockInOrderId: string | undefined;
          let matchedSizeDisplay: string | undefined;

          // Attempt catalog match if not flagged as custom
          if (!isCustom) {
            let matchedProd = linkedProductId ? productMap.get(linkedProductId) : null;
            if (!matchedProd) {
              matchedProd = Array.from(productMap.values()).find(
                (p) =>
                  p.sku.toUpperCase() === sku.toUpperCase() &&
                  (!draft.color || p.color.trim().toLowerCase() === (draft.color || '').trim().toLowerCase())
              ) || null;
            }

            if (matchedProd) {
              linkedProductId = matchedProd.id;
              const matchedVar = linkedVariantId
                ? matchedProd.variants.find((v) => v.id === linkedVariantId)
                : draft.sizeDisplay
                ? matchedProd.variants.find((v) => v.sizeDisplay === draft.sizeDisplay)
                : matchedProd.variants.find((v) => Math.abs(v.sizeUS - size) < 0.05);

              if (matchedVar) {
                linkedVariantId = matchedVar.id;
                matchedSizeDisplay = matchedVar.sizeDisplay;
                const before = matchedVar.stock;

                const fifoResult = deductFifoVariantStock(matchedVar, 1, matchedProd.costPrice);
                matchedVar.stock = fifoResult.updatedVariant.stock;
                matchedVar.batches = fifoResult.updatedVariant.batches;
                const after = matchedVar.stock;
                unitCostPrice = fifoResult.costPrice;
                batchId = fifoResult.batchId;
                stockInOrderId = fifoResult.stockInOrderId;

                deductions.push({ variantId: matchedVar.id, delta: -1 });
                logsToCreate.push({
                  id: `log-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
                  variantId: matchedVar.id,
                  productId: matchedProd.id,
                  productName: matchedProd.name,
                  sku: matchedProd.sku,
                  sizeUS: matchedVar.sizeUS,
                  delta: -1,
                  stockBefore: before,
                  stockAfter: after,
                  action: 'sale_deduct',
                  operator: '打烊補登人員',
                  timestamp
                });
              } else {
                isCustom = true;
              }
            } else {
              isCustom = true;
            }
          }

          const record: SaleRecord = {
            id: saleId,
            businessDate: businessDate || getTaiwanTodayStr(),
            timestamp,
            brand: brand || '未標示',
            sku: sku || 'N/A',
            productName: name || `${brand} ${sku}`,
            color: draft.color || '標準色',
            sizeUS: size,
            sizeDisplay: matchedSizeDisplay || (size ? `${size}` : '標準碼'),
            category: draft.category || '其他',
            retailPrice: retail,
            actualPaid: price,
            costPrice: unitCostPrice,
            grossProfit: price - unitCostPrice,
            batchId,
            stockInOrderId,
            paymentMethod: draft.paymentMethod || 'cash',
            status: 'completed',
            isCustomItem: isCustom,
            productId: linkedProductId,
            variantId: linkedVariantId,
            notes: draft.notes,
            operator: '打烊補登人員'
          };

          createdRecords.push(record);
        });

        if (logsToCreate.length > 0) {
          setInventoryLogs((prevLogs) => [...logsToCreate, ...prevLogs]);
        }

        const updatedList = Array.from(productMap.values());
        if (deductions.length > 0) {
          realtimeService.broadcastSync(updatedList);
        }

        return updatedList;
      });

      if (createdRecords.length > 0) {
        setSales((prev) => [...createdRecords, ...prev]);
      }

      return {
        successCount: createdRecords.length,
        errors,
        records: createdRecords
      };
    },
    []
  );

  // -------------------------------------------------------------
  // Return Action & Stock Rollback: returnSaleRecord
  // -------------------------------------------------------------
  const returnSaleRecord = useCallback(
    (saleId: string, reason: string = '顧客換退貨'): boolean => {
      const target = sales.find((s) => s.id === saleId);
      if (!target || target.status === 'returned' || target.status === 'exchanged') {
        return false;
      }

      const returnTime = new Date().toISOString();

      // 1. Update sales state
      setSales((prevSales) =>
        prevSales.map((s) =>
          s.id === saleId
            ? {
                ...s,
                status: 'returned',
                returnTimestamp: returnTime,
                returnReason: reason
              }
            : s
        )
      );

      // 2. If catalogued item with variant, restore stock +1
      if (!target.isCustomItem) {
        setProducts((prevProducts) => {
          let restored = false;
          const nextProducts = prevProducts.map((p) => {
            const isProd = target.productId
              ? p.id === target.productId
              : p.sku.toUpperCase() === (target.sku || '').toUpperCase() &&
                (!target.color || p.color.trim().toLowerCase() === (target.color || '').trim().toLowerCase());
            if (!isProd) return p;

            return {
              ...p,
              variants: p.variants.map((v) => {
                const isVar = target.variantId
                  ? v.id === target.variantId
                  : Math.abs(v.sizeUS - Number(target.sizeUS)) < 0.05;
                if (!isVar) return v;

                restored = true;
                const stockBefore = v.stock;
                const restoredVar = restoreFifoVariantStock(
                  v,
                  1,
                  target.costPrice ?? p.costPrice,
                  target.batchId,
                  target.stockInOrderId
                );
                const stockAfter = restoredVar.stock;

                const log: InventoryLog = {
                  id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  variantId: v.id,
                  productId: p.id,
                  productName: p.name,
                  sku: p.sku,
                  sizeUS: v.sizeUS,
                  delta: 1,
                  stockBefore,
                  stockAfter,
                  action: 'sale_return_rollback',
                  operator: '退換貨人員',
                  timestamp: returnTime
                };
                setInventoryLogs((logs) => [log, ...logs]);

                realtimeService.broadcastDeduction(
                  {
                    variantId: v.id,
                    productId: p.id,
                    quantity: -1,
                    sourceDevice: 'desktop-counter',
                    timestamp: returnTime
                  },
                  stockAfter
                );

                return restoredVar;
              })
            };
          });

          return restored ? nextProducts : prevProducts;
        });
      }

      return true;
    },
    [sales]
  );

  // -------------------------------------------------------------
  // Exchange Action: exchangeSaleRecord (Rollback Old +1, Deduct New -1)
  // -------------------------------------------------------------
  const exchangeSaleRecord = useCallback(
    (saleId: string, newSaleDraft: SaleDraft, reason: string = '商品更換尺碼/款式'): boolean => {
      let success = false;

      // 1. Process return on existing sale
      const returnResult = returnSaleRecord(saleId, `換貨退回: ${reason}`);
      if (!returnResult) return false;

      // 2. Mark old sale status as exchanged
      setSales((prev) =>
        prev.map((s) => (s.id === saleId ? { ...s, status: 'exchanged', returnReason: reason } : s))
      );

      // 3. Record new sale linked to originalSaleId
      const newRecord = recordSale({
        ...newSaleDraft,
        notes: `由換貨產生 (原單號: ${saleId}) - ${newSaleDraft.notes || ''}`
      });

      if (newRecord) {
        success = true;
      }

      return success;
    },
    [returnSaleRecord, recordSale]
  );

  // -------------------------------------------------------------
  // Daily Closing & Available Dates
  // -------------------------------------------------------------
  const getDailyClosing = useCallback(
    (businessDate: string): DailyClosingSummary => {
      return calculateDailyClosing(sales, businessDate);
    },
    [sales]
  );

  const getAvailableDates = useCallback((): string[] => {
    const set = new Set<string>();
    const todayStr = getTaiwanTodayStr();
    set.add(todayStr);

    sales.forEach((s) => {
      if (s.businessDate) set.add(s.businessDate);
    });

    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [sales]);

  const value: InventoryContextValue = useMemo(
    () => ({
      products,
      setProducts,
      inventoryLogs,
      deductStock,
      batchRestock,
      importProducts,
      resetInventory,
      sales,
      setSales,
      recordSale,
      addSaleRecord: recordSale,
      recordBatchSales,
      addBatchSales: recordBatchSales,
      returnSaleRecord,
      processReturn: returnSaleRecord,
      exchangeSaleRecord,
      processExchange: exchangeSaleRecord,
      getDailyClosing,
      getAvailableDates,
      resetSales
    }),
    [
      products,
      inventoryLogs,
      deductStock,
      batchRestock,
      importProducts,
      resetInventory,
      sales,
      recordSale,
      recordBatchSales,
      returnSaleRecord,
      exchangeSaleRecord,
      getDailyClosing,
      getAvailableDates,
      resetSales
    ]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

/**
 * Hook for full unified Inventory & Sales context
 */
export function useInventoryContext(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error('useInventoryContext must be used within an InventoryProvider');
  }
  return ctx;
}

/**
 * Hook for Inventory & Stock operations (Phase 1-3)
 */
export function useInventory() {
  const ctx = useInventoryContext();
  return {
    products: ctx.products,
    setProducts: ctx.setProducts,
    inventoryLogs: ctx.inventoryLogs,
    deductStock: ctx.deductStock,
    batchRestock: ctx.batchRestock,
    importProducts: ctx.importProducts,
    resetInventory: ctx.resetInventory
  };
}

/**
 * Hook for Daily Sales & Closing operations (Round 2 R1-R3)
 */
export function useSales() {
  const ctx = useInventoryContext();
  return {
    sales: ctx.sales,
    setSales: ctx.setSales,
    recordSale: ctx.recordSale,
    addSaleRecord: ctx.addSaleRecord,
    recordBatchSales: ctx.recordBatchSales,
    addBatchSales: ctx.addBatchSales,
    returnSaleRecord: ctx.returnSaleRecord,
    processReturn: ctx.processReturn,
    exchangeSaleRecord: ctx.exchangeSaleRecord,
    processExchange: ctx.processExchange,
    getDailyClosing: ctx.getDailyClosing,
    getAvailableDates: ctx.getAvailableDates,
    resetSales: ctx.resetSales
  };
}
