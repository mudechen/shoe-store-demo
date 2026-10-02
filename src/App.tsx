import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ProductWithVariants, ShoeVariant } from './types/inventory';
import { SaleRecord, PaymentMethod } from './types/sales';
import { ReservationRecord, ReservationStatus } from './types/reservations';
import { StockInRecord, VendorReturnRecord, CustomerReturnReason, VendorReturnReason, isMockStockIn, isMockVendorReturn } from './types/records';
import { isMockProduct } from './data/seedShoes';
import { isMockSale } from './data/seedSales';
import { realtimeService, SyncStatusInfo } from './services/realtimeService';
import { MobileNav, MobileTabType } from './components/Navigation/MobileNav';
import { QuickCashierView } from './components/Sales/QuickCashierView';
import { CompactInventoryView } from './components/Inventory/CompactInventoryView';
import { CustomerReservationView } from './components/Reservations/CustomerReservationView';
import { FulfillReservationModal } from './components/Reservations/FulfillReservationModal';
import { HomeWorkbenchView } from './components/Home/HomeWorkbenchView';
import { StockInView } from './components/StockIn/StockInView';
import { StockInModal } from './components/StockIn/StockInModal';
import { VendorReturnModal } from './components/VendorReturn/VendorReturnModal';
import { StoreAnalyticsView } from './components/Analytics/StoreAnalyticsView';
import { RecordsCenterView, RecordsTab } from './components/Records/RecordsCenterView';
import { FontSizeControl } from './components/FontSizeControl';
import { exportRecordsToExcel } from './services/excelService';
import { getTaiwanTodayStr } from './utils/dateUtils';
import { RotateCcw, Moon, Sun, CheckCircle2, AlertCircle } from 'lucide-react';
import { deductFifoVariantStock, restoreFifoVariantStock, addBatchToVariant } from './services/fifoService';
import { formatSaleSizeDisplay, isReservationVariantMatch, getSegmentSortRank } from './data/sizeStandards';

const STORAGE_KEY_PRODUCTS = 'shoe_store_inventory_v1';
const STORAGE_KEY_SALES = 'shoe_store_sales_v1';
const STORAGE_KEY_STOCKIN = 'shoe_store_stockin_v1';
const STORAGE_KEY_VENDOR_RETURNS = 'shoe_store_vendor_returns_v1';
const STORAGE_KEY_RESERVATIONS = 'shoe_store_reservations_v1';

export type ExtendedTabType = MobileTabType | 'stockin' | 'analytics';

export default function App() {
  // 1. Products Inventory State (defaults to empty, auto-purging legacy mock data)
  const [products, setProducts] = useState<ProductWithVariants[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => !isMockProduct(p));
        }
      }
    } catch (e) {
      console.warn('Could not read inventory from localStorage:', e);
    }
    return [];
  });

  // 2. Sales Ledger State (defaults to empty, auto-purging legacy mock data)
  const [sales, setSales] = useState<SaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SALES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s) => !isMockSale(s));
        }
      }
    } catch (e) {
      console.warn('Could not read sales from localStorage:', e);
    }
    return [];
  });

  // 3. Stock-In Records Ledger (defaults to empty when not in localStorage)
  const [stockInRecords, setStockInRecords] = useState<StockInRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STOCKIN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((r) => !isMockStockIn(r));
        }
      }
    } catch (e) {
      console.warn('Could not read stock-in records from localStorage:', e);
    }
    return [];
  });

  // 4. Vendor Returns Ledger (defaults to empty when not in localStorage)
  const [vendorReturns, setVendorReturns] = useState<VendorReturnRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VENDOR_RETURNS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((r) => !isMockVendorReturn(r));
        }
      }
    } catch (e) {
      console.warn('Could not read vendor returns from localStorage:', e);
    }
    return [];
  });

  // 5. Customer Reservations Ledger (defaults to empty when not in localStorage)
  const [reservations, setReservations] = useState<ReservationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read reservations from localStorage:', e);
    }
    return [];
  });

  // UI State
  const [activeTab, setActiveTab] = useState<ExtendedTabType>('home');
  const [stockInSku, setStockInSku] = useState('');
  const [stockInColor, setStockInColor] = useState('');
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isVendorReturnModalOpen, setIsVendorReturnModalOpen] = useState(false);
  const [vendorReturnShoe, setVendorReturnShoe] = useState<ProductWithVariants | null>(null);
  const [vendorReturnInitialSize, setVendorReturnInitialSize] = useState<number | undefined>(undefined);
  const [editingProduct, setEditingProduct] = useState<ProductWithVariants | null>(null);
  const [recordsInitialTab, setRecordsInitialTab] = useState<RecordsTab>('sales');
  const [recordsInitialQuery, setRecordsInitialQuery] = useState('');

  // Jump to Stock-In Records with SKU prefilled
  const handleNavigateToStockInRecords = useCallback((sku?: string) => {
    setIsStockInModalOpen(false);
    setEditingProduct(null);
    setRecordsInitialTab('stockin');
    if (sku) {
      setRecordsInitialQuery(sku);
    }
    setActiveTab('records');
  }, []);

  // Reservation Fulfillment Modal State
  const [isFulfillModalOpen, setIsFulfillModalOpen] = useState(false);
  const [fulfillingReservation, setFulfillingReservation] = useState<ReservationRecord | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'info' | 'error' } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [syncStatusInfo, setSyncStatusInfo] = useState<SyncStatusInfo>(() => realtimeService.getStatusInfo());

  // Transient toast notification
  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((curr) => (curr?.text === text ? null : curr));
    }, 2800);
  }, []);

  // Save to localStorage (always sanitized without mock data)
  useEffect(() => {
    try {
      const clean = products.filter((p) => !isMockProduct(p));
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(clean));
    } catch (e) {
      console.warn('Failed to save products:', e);
    }
  }, [products]);

  const isInitialSyncDone = useRef(false);

  // Fetch persistent state from Supabase Cloud on mount
  useEffect(() => {
    realtimeService.fetchCloudState().then((cloud) => {
      isInitialSyncDone.current = true;
      if (cloud) {
        if (Array.isArray(cloud.products)) {
          const filteredCloudProds = cloud.products.filter((p) => !isMockProduct(p));
          setProducts(filteredCloudProds);
          try {
            localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(filteredCloudProds));
          } catch (e) {}
        }
        if (Array.isArray(cloud.sales)) {
          const filteredCloudSales = cloud.sales.filter((s) => !isMockSale(s));
          setSales(filteredCloudSales);
          try {
            localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(filteredCloudSales));
          } catch (e) {}
        }
        if (Array.isArray(cloud.stockIns)) {
          const filteredCloudStockIns = cloud.stockIns.filter((r) => !isMockStockIn(r));
          setStockInRecords(filteredCloudStockIns);
          try {
            localStorage.setItem(STORAGE_KEY_STOCKIN, JSON.stringify(filteredCloudStockIns));
          } catch (e) {}
        }
        if (Array.isArray(cloud.vendorReturns)) {
          const filteredCloudReturns = cloud.vendorReturns.filter((r) => !isMockVendorReturn(r));
          setVendorReturns(filteredCloudReturns);
          try {
            localStorage.setItem(STORAGE_KEY_VENDOR_RETURNS, JSON.stringify(filteredCloudReturns));
          } catch (e) {}
        }
        if (Array.isArray(cloud.reservations)) {
          setReservations(cloud.reservations);
          try {
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(cloud.reservations));
          } catch (e) {}
        }
      }
    });
  }, []);

  useEffect(() => {
    try {
      const clean = sales.filter((s) => !isMockSale(s));
      localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(clean));
    } catch (e) {
      console.warn('Failed to save sales:', e);
    }
  }, [sales]);

  useEffect(() => {
    try {
      const clean = stockInRecords.filter((r) => !isMockStockIn(r));
      localStorage.setItem(STORAGE_KEY_STOCKIN, JSON.stringify(clean));
    } catch (e) {
      console.warn('Failed to save stock-in records:', e);
    }
  }, [stockInRecords]);

  useEffect(() => {
    try {
      const clean = vendorReturns.filter((r) => !isMockVendorReturn(r));
      localStorage.setItem(STORAGE_KEY_VENDOR_RETURNS, JSON.stringify(clean));
    } catch (e) {
      console.warn('Failed to save vendor returns:', e);
    }
  }, [vendorReturns]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(reservations));
    } catch (e) {
      console.warn('Failed to save reservations:', e);
    }
  }, [reservations]);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Realtime Broadcast synchronization
  useEffect(() => {
    const unsubStatus = realtimeService.onStatusChange((info) => {
      setSyncStatusInfo(info);
    });

    const unsubEvents = realtimeService.subscribe((event) => {
      if (event.type === 'STOCK_DEDUCTED') {
        const { variantId, delta, newStock } = event;
        setProducts((prev) =>
          prev.map((prod) => ({
            ...prod,
            variants: prod.variants.map((v) => {
              if (v.id === variantId) {
                const updated = Math.max(0, typeof newStock === 'number' ? newStock : v.stock - delta);
                return { ...v, stock: updated };
              }
              return v;
            }),
          }))
        );
        showToast('遠端裝置已同步扣庫 1 雙', 'info');
      } else if (event.type === 'STOCK_UPDATED') {
        const { variantId, newStock } = event;
        setProducts((prev) =>
          prev.map((prod) => ({
            ...prod,
            variants: prod.variants.map((v) =>
              v.id === variantId ? { ...v, stock: Math.max(0, typeof newStock === 'number' ? newStock : 0) } : v
            ),
          }))
        );
      } else if (event.type === 'INVENTORY_SYNC') {
        if (Array.isArray(event.products)) {
          setProducts(event.products);
        }
        if (Array.isArray(event.sales)) {
          setSales(event.sales);
        }
      } else if (event.type === 'SALE_COMPLETED') {
        const remoteSale = event.sale;
        setSales((prev) => {
          if (prev.some((s) => s.id === remoteSale.id)) return prev;
          return [remoteSale, ...prev];
        });
        showToast(`[雲端同步] 遠端售出：${remoteSale.sku} (${formatSaleSizeDisplay(remoteSale.sizeDisplay, remoteSale.sizeUS)})`, 'info');
      } else if (event.type === 'SALE_VOIDED') {
        setSales((prev) =>
          prev.map((s) => (s.id === event.saleId ? { ...s, status: 'returned' as const } : s))
        );
        showToast('[雲端同步] 遠端已作廢 1 筆銷貨', 'info');
      } else if (event.type === 'STOCK_IN_RECORDED') {
        const remoteRecord = event.record;
        setStockInRecords((prev) => {
          if (prev.some((r) => r.id === remoteRecord.id)) return prev;
          return [remoteRecord, ...prev];
        });
        showToast(`[雲端同步] 遠端進貨入庫：${remoteRecord.sku}（${remoteRecord.totalPairs}雙）`, 'info');
      } else if (event.type === 'STOCK_IN_REVISED') {
        const { supersededRecordIds, revisedRecords } = event;
        setStockInRecords((prev) => {
          const supersededSet = new Set(supersededRecordIds);
          const updated = prev.map((r) =>
            supersededSet.has(r.id) ? { ...r, isSuperseded: true } : r
          );
          const existingIds = new Set(updated.map((r) => r.id));
          const toAdd = revisedRecords.filter((r) => !existingIds.has(r.id));
          const nextList = [...toAdd, ...updated];
          try {
            localStorage.setItem(STORAGE_KEY_STOCKIN, JSON.stringify(nextList));
          } catch (e) {}
          return nextList;
        });

        // Synchronize remote products and FIFO batches
        setProducts((prevProds) => {
          let prodsChanged = false;
          const nextProds = prevProds.map((prod) => {
            const matchingRevised = revisedRecords.find(
              (r) =>
                r.productId === prod.id ||
                (r.sku.trim().toUpperCase() === prod.sku.trim().toUpperCase() &&
                  (!r.color || prod.color.trim().toLowerCase() === r.color.trim().toLowerCase()))
            );
            if (!matchingRevised) return prod;

            const targetOrderId = matchingRevised.orderId || matchingRevised.batchNo;
            const rootRevisionId = matchingRevised.revisionOf || matchingRevised.id;
            let varChanged = false;

            const nextVariants = prod.variants.map((v) => {
              if (v.batches && v.batches.length > 0) {
                const updatedBatches = v.batches.map((b) => {
                  const isMatch =
                    b.stockInId === matchingRevised.id ||
                    b.stockInId === rootRevisionId ||
                    (targetOrderId && b.stockInOrderId === targetOrderId);
                  if (isMatch) {
                    varChanged = true;
                    return { ...b, costPrice: matchingRevised.costPerPair };
                  }
                  return b;
                });
                return varChanged ? { ...v, batches: updatedBatches } : v;
              }
              return v;
            });

            const shouldUpdateCost =
              matchingRevised.originalCostPerPair !== undefined &&
              prod.costPrice === matchingRevised.originalCostPerPair;

            if (varChanged || shouldUpdateCost) {
              prodsChanged = true;
              return {
                ...prod,
                costPrice: shouldUpdateCost ? matchingRevised.costPerPair : prod.costPrice,
                variants: nextVariants,
              };
            }
            return prod;
          });

          if (prodsChanged) {
            try {
              localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextProds));
            } catch (e) {}
            return nextProds;
          }
          return prevProds;
        });

        showToast(`[雲端同步] 遠端已修訂 ${revisedRecords.length} 筆進貨成本`, 'info');
      } else if (event.type === 'VENDOR_RETURN_RECORDED') {
        const remoteReturn = event.record;
        setVendorReturns((prev) => {
          if (prev.some((r) => r.id === remoteReturn.id)) return prev;
          return [remoteReturn, ...prev];
        });
        showToast(`[雲端同步] 遠端廠商退回：${remoteReturn.sku}（${remoteReturn.quantity}雙）`, 'info');
      } else if (event.type === 'SALE_RETURNED') {
        setSales((prev) =>
          prev.map((s) =>
            s.id === event.saleId
              ? {
                  ...s,
                  status: 'returned' as const,
                  returnReason: event.reason,
                  returnTimestamp: event.returnTimestamp,
                  notes: event.note ? `${s.notes || ''} [退貨備註: ${event.note}]`.trim() : s.notes,
                }
              : s
          )
        );
        setSales((currentSales) => {
          const target = currentSales.find((s) => s.id === event.saleId);
          if (target && !target.isCustomItem && (target.variantId || target.productId || target.sku)) {
            setProducts((prev) =>
              prev.map((prod) => {
                const matchesProd = target.productId
                  ? prod.id === target.productId
                  : prod.sku.toUpperCase() === target.sku.toUpperCase() &&
                    (!target.color || prod.color.trim().toLowerCase() === target.color.trim().toLowerCase());
                if (!matchesProd) return prod;

                return {
                  ...prod,
                  variants: prod.variants.map((v) => {
                    const matchesVar =
                      v.id === target.variantId ||
                      (target.sizeDisplay && v.sizeDisplay === target.sizeDisplay) ||
                      Math.abs(v.sizeUS - target.sizeUS) < 0.1;
                    if (matchesVar) {
                      return { ...v, stock: v.stock + 1 };
                    }
                    return v;
                  }),
                };
              })
            );
          }
          return currentSales;
        });
        showToast(`[雲端同步] 遠端已標記退貨：${event.saleId}`, 'info');
      } else if (event.type === 'REQUEST_SYNC') {
        setProducts((currProds) => {
          setSales((currSales) => {
            realtimeService.broadcastSync(currProds, currSales);
            return currSales;
          });
          return currProds;
        });
      } else if (event.type === 'INVENTORY_RESET') {
        setProducts([]);
        setSales([]);
        setStockInRecords([]);
        setVendorReturns([]);
        setReservations([]);
      } else if (event.type === 'RESERVATION_CREATED') {
        const remoteRes = event.reservation;
        setReservations((prev) => {
          if (prev.some((r) => r.id === remoteRes.id)) return prev;
          const next = [remoteRes, ...prev];
          try {
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(next));
          } catch (e) {}
          return next;
        });
        showToast(`[雲端同步] 遠端新增預訂：${remoteRes.customerName} - ${remoteRes.sku} (${remoteRes.sizeDisplay})`, 'info');
      } else if (event.type === 'RESERVATION_UPDATED') {
        setReservations((prev) => {
          const next = prev.map((r) => (r.id === event.reservationId ? { ...r, ...event.updates } : r));
          try {
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(next));
          } catch (e) {}
          return next;
        });
        if (event.updates.status === 'arrived_ready') {
          showToast('[雲端同步] 遠端預訂商品已到貨！', 'info');
        }
      } else if (event.type === 'RESERVATIONS_SYNC') {
        if (Array.isArray(event.reservations)) {
          setReservations(event.reservations);
          try {
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(event.reservations));
          } catch (e) {}
        }
      } else if (event.type === 'RESERVATION_DELETED') {
        setReservations((prev) => {
          const next = prev.filter((r) => r.id !== event.reservationId);
          try {
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(next));
          } catch (e) {}
          return next;
        });
        showToast('[雲端同步] 遠端已刪除 1 筆預訂單', 'info');
      }
    });

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, [showToast]);

  // 1. Handle Cashier Sale Completion
  const handleCompleteSale = useCallback(
    (saleDraft: Omit<SaleRecord, 'id' | 'timestamp'>) => {
      const saleId = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const timestamp = new Date().toISOString();

      let unitCostPrice = saleDraft.costPrice || 0;
      let batchId = saleDraft.batchId;
      let stockInOrderId = saleDraft.stockInOrderId;
      let updatedStock = 0;
      let matchedProdId = saleDraft.productId;
      let matchedVarId = saleDraft.variantId;

      // Synchronously find target product and variant from current products state
      const targetProd = products.find((prod) =>
        matchedProdId
          ? prod.id === matchedProdId
          : prod.sku.toUpperCase() === saleDraft.sku.toUpperCase() &&
            (!saleDraft.color || prod.color.trim().toLowerCase() === saleDraft.color.trim().toLowerCase())
      );

      if (targetProd) {
        matchedProdId = targetProd.id;
        const targetVar = targetProd.variants.find((v) =>
          matchedVarId
            ? v.id === matchedVarId
            : (saleDraft.sizeDisplay && v.sizeDisplay
                ? v.sizeDisplay === saleDraft.sizeDisplay
                : Math.abs(v.sizeUS - saleDraft.sizeUS) < 0.05)
        );

        if (targetVar) {
          matchedVarId = targetVar.id;
          const fifoResult = deductFifoVariantStock(targetVar, 1, targetProd.costPrice);
          updatedStock = fifoResult.updatedVariant.stock;
          unitCostPrice = fifoResult.costPrice;
          batchId = fifoResult.batchId;
          stockInOrderId = fifoResult.stockInOrderId;
        } else {
          unitCostPrice = targetProd.costPrice || 0;
        }
      }

      if (matchedProdId && matchedVarId) {
        setProducts((prev) =>
          prev.map((prod) => {
            if (prod.id !== matchedProdId) return prod;
            return {
              ...prod,
              variants: prod.variants.map((v) => {
                if (v.id !== matchedVarId) return v;
                return deductFifoVariantStock(v, 1, prod.costPrice).updatedVariant;
              }),
            };
          })
        );

        realtimeService.broadcastDeduction(
          {
            variantId: matchedVarId,
            productId: matchedProdId,
            quantity: 1,
            sourceDevice: 'mobile-cashier',
            timestamp,
          },
          updatedStock
        );
      }

      const newRecord: SaleRecord = {
        ...saleDraft,
        id: saleId,
        timestamp,
        productId: matchedProdId || saleDraft.productId,
        variantId: matchedVarId || saleDraft.variantId,
        costPrice: unitCostPrice,
        grossProfit: (Number(saleDraft.actualPaid) || 0) - unitCostPrice,
        batchId,
        stockInOrderId,
      };

      setSales((prev) => [newRecord, ...prev]);
      realtimeService.broadcastSale(newRecord);

      showToast(`已成功售出：${newRecord.sku} (${formatSaleSizeDisplay(newRecord.sizeDisplay, newRecord.sizeUS)})，實收 $${newRecord.actualPaid}`);
    },
    [products, showToast]
  );

  // Handle Create Customer Reservation
  const handleCreateReservation = useCallback(
    (record: Omit<ReservationRecord, 'id' | 'createdAt'>) => {
      const newRecord: ReservationRecord = {
        ...record,
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
      };
      setReservations((prev) => {
        const next = [newRecord, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(next));
        } catch (e) {}
        realtimeService.saveCloudReservations(next);
        return next;
      });
      realtimeService.broadcastReservationCreated(newRecord);
      showToast(`已建立客戶預訂：${newRecord.customerName} - ${newRecord.sku} (${newRecord.sizeDisplay})`);
    },
    [showToast]
  );

  // Handle Update Reservation Status
  const handleUpdateReservationStatus = useCallback(
    (id: string, status: ReservationStatus) => {
      let updatedUpdates: Partial<ReservationRecord> = { status };
      setReservations((prev) => {
        const next = prev.map((r) => {
          if (r.id !== id) return r;
          const arrivedAt = status === 'arrived_ready' ? (r.arrivedAt || Date.now()) : r.arrivedAt;
          updatedUpdates = { status, arrivedAt };
          return {
            ...r,
            status,
            arrivedAt,
          };
        });
        try {
          localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(next));
        } catch (e) {}
        realtimeService.saveCloudReservations(next);
        return next;
      });
      realtimeService.broadcastReservationUpdated(id, updatedUpdates);
      if (status === 'arrived_ready') {
        showToast('已標記為到貨待取，可通知客戶來店取鞋', 'info');
      } else if (status === 'cancelled') {
        showToast('已取消該筆預訂單', 'info');
      }
    },
    [showToast]
  );

  // Handle Fulfill Reservation (Turn reservation into SaleRecord & deduct stock)
  const handleFulfillReservation = useCallback(
    (reservation: ReservationRecord, finalPaymentMethod: PaymentMethod) => {
      const todayDate = getTaiwanTodayStr();
      const actualCollected = reservation.retailPrice;

      handleCompleteSale({
        businessDate: todayDate,
        brand: reservation.brand,
        sku: reservation.sku,
        productName: reservation.productName,
        color: reservation.color,
        sizeUS: reservation.sizeUS || 0,
        sizeDisplay: reservation.sizeDisplay,
        category: reservation.category,
        retailPrice: reservation.retailPrice,
        actualPaid: actualCollected,
        paymentMethod: finalPaymentMethod,
        status: 'completed',
        isCustomItem: false,
        productId: reservation.productId,
        variantId: reservation.variantId,
        reservationId: reservation.id,
        notes: `[客戶預訂取貨] 客戶：${reservation.customerName} (${reservation.customerPhone})，已扣定金 $${reservation.depositPaid}，實收尾款 $${reservation.remainingBalance}${
          reservation.notes ? `；原備註：${reservation.notes}` : ''
        }`,
        operator: '門市人員',
      });

      setReservations((prev) => {
        const next = prev.map((r) =>
          r.id === reservation.id
            ? {
                ...r,
                status: 'completed' as const,
                fulfilledAt: Date.now(),
                finalPaymentMethod,
              }
            : r
        );
        try {
          localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(next));
        } catch (e) {}
        realtimeService.saveCloudReservations(next);
        return next;
      });

      realtimeService.broadcastReservationUpdated(reservation.id, {
        status: 'completed',
        fulfilledAt: Date.now(),
        finalPaymentMethod,
      });

      setIsFulfillModalOpen(false);
      setFulfillingReservation(null);
      showToast(`預訂取貨結算成功！已扣減進貨庫存並記錄銷貨`);
    },
    [handleCompleteSale, showToast]
  );

  // Helper: Automatically check and match arrived reservations for stocked products & sizes
  const autoMatchArrivedReservations = useCallback(
    (
      product: ProductWithVariants,
      stockedVariants?: Array<{ variantId?: string; sizeDisplay?: string; sizeUS?: number }>
    ) => {
      setReservations((prev) => {
        let matchedCount = 0;
        const matchedDetails: string[] = [];
        const next = prev.map((r) => {
          if (r.status !== 'pending_arrival') return r;
          if (r.sku.trim().toUpperCase() !== product.sku.trim().toUpperCase()) return r;

          // Find a matching variant on the product that currently has stock > 0
          const matchingVariant = product.variants.find((v) => {
            if (v.stock <= 0) return false;
            if (
              stockedVariants &&
              stockedVariants.length > 0 &&
              !stockedVariants.some(
                (sv) =>
                  (sv.variantId && sv.variantId === v.id) ||
                  isReservationVariantMatch(r, v, product.sku)
              )
            ) {
              return false;
            }
            return isReservationVariantMatch(r, v, product.sku);
          });

          if (matchingVariant) {
            matchedCount++;
            matchedDetails.push(`${r.customerName}（${r.sku} ${r.sizeDisplay}）`);
            return {
              ...r,
              status: 'arrived_ready' as const,
              arrivedAt: Date.now(),
              productId: product.id,
              variantId: matchingVariant.id,
            };
          }
          return r;
        });

        if (matchedCount > 0) {
          try {
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(next));
          } catch (e) {}
          realtimeService.saveCloudReservations(next);
          realtimeService.broadcastReservationsSync(next);
          setTimeout(() => {
            showToast(
              `🎉 到貨提醒：已自動將 ${matchedCount} 筆預訂更新為「已到貨待取」！${matchedDetails.join('、')}`,
              'info'
            );
          }, 350);
        }
        return next;
      });
    },
    [showToast]
  );

  // Handle Delete Customer Reservation
  const handleDeleteReservation = useCallback(
    (reservationId: string) => {
      const target = reservations.find((r) => r.id === reservationId);
      setReservations((prev) => {
        const next = prev.filter((r) => r.id !== reservationId);
        try {
          localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(next));
        } catch (e) {}
        realtimeService.saveCloudReservations(next);
        return next;
      });
      realtimeService.broadcastReservationDeleted(reservationId);
      showToast(
        target
          ? `已刪除客戶 ${target.customerName} 的預訂紀錄（${target.sku} ${target.sizeDisplay}）`
          : '已刪除該筆預訂單',
        'info'
      );
    },
    [reservations, showToast]
  );

  // 6. Handle Mark Sale Returned (Customer return with reason & +1 variant stock rollback)
  const handleMarkSaleReturned = useCallback(
    (saleId: string, reason: CustomerReturnReason, note?: string) => {
      const targetSale = sales.find((s) => s.id === saleId);
      if (!targetSale) {
        showToast('找不到該筆銷貨紀錄！', 'error');
        return;
      }
      if (targetSale.status === 'returned') {
        showToast('該筆銷貨已完成退貨，無法重複退貨！', 'error');
        return;
      }

      const returnTimestamp = new Date().toISOString();

      setSales((prev) =>
        prev.map((s) =>
          s.id === saleId
            ? {
                ...s,
                status: 'returned' as const,
                returnReason: reason,
                returnTimestamp,
                notes: note ? `${s.notes || ''} [退貨備註: ${note}]`.trim() : s.notes,
              }
            : s
        )
      );

      if (!targetSale.isCustomItem && (targetSale.variantId || targetSale.productId || targetSale.sku)) {
        setProducts((prev) => {
          const updated = prev.map((prod) => {
            const matchesProd = targetSale.productId
              ? prod.id === targetSale.productId
              : prod.sku.toUpperCase() === targetSale.sku.toUpperCase() &&
                (!targetSale.color || prod.color.trim().toLowerCase() === targetSale.color.trim().toLowerCase());
            if (!matchesProd) return prod;

            return {
              ...prod,
              variants: prod.variants.map((v) => {
                const matchesVar =
                  v.id === targetSale.variantId ||
                  (targetSale.sizeDisplay && v.sizeDisplay === targetSale.sizeDisplay) ||
                  Math.abs(v.sizeUS - targetSale.sizeUS) < 0.1;
                if (matchesVar) {
                  return restoreFifoVariantStock(
                    v,
                    1,
                    targetSale.costPrice ?? prod.costPrice,
                    targetSale.batchId,
                    targetSale.stockInOrderId
                  );
                }
                return v;
              }),
            };
          });

          realtimeService.broadcastSync(updated);
          return updated;
        });
      }

      realtimeService.broadcastSaleReturned(saleId, reason, note);
      showToast(`已成功標記退貨 (${reason})，門市庫存已自動回補 1 雙至 ${targetSale.sku}！`);
    },
    [sales, showToast]
  );

  // 2. Handle Void / Refund Sale
  const handleVoidSale = useCallback(
    (saleId: string) => {
      handleMarkSaleReturned(saleId, '其他');
    },
    [handleMarkSaleReturned]
  );

  // Sync to Supabase Cloud
  useEffect(() => {
    if (!isInitialSyncDone.current) return;
    realtimeService.saveCloudState(products, sales, stockInRecords, vendorReturns, reservations);
  }, [products, sales, stockInRecords, vendorReturns, reservations]);

  // 3. Handle Direct Stock Deduct / Adjust (+1 or -1) from Inventory View
  const handleDeductStock = useCallback(
    (variantId: string, quantity: number, syntheticVariant?: ShoeVariant) => {
      let prod = products.find((p) => p.variants.some((v) => v.id === variantId));
      let targetVariant = prod?.variants.find((v) => v.id === variantId);

      // If variantId is synthetic or not yet found in prod.variants
      if (!targetVariant && syntheticVariant) {
        prod = products.find((p) => p.id === syntheticVariant.productId);
        if (!prod) return;
        if (quantity > 0) return; // Cannot deduct stock from a non-existent variant
        const realId = syntheticVariant.id.startsWith('synthetic-')
          ? syntheticVariant.id.replace('synthetic-', 'var-')
          : syntheticVariant.id;
        targetVariant = {
          ...syntheticVariant,
          id: realId,
          stock: 0,
          batches: [],
        };
      }

      if (!prod || !targetVariant) return;

      const effectiveVariantId = targetVariant.id;
      const currentStock = targetVariant.stock;
      const newStockCount = Math.max(0, currentStock - quantity);
      const shoeSize = targetVariant.sizeUS;
      const prodName = prod.name;
      const sizeLabel =
        targetVariant.sizeDisplay || (shoeSize % 1 === 0 ? `US ${shoeSize.toFixed(1)}` : `US ${shoeSize}`);

      // 1. If incoming stock (quantity < 0), create StockInRecord & add FIFO batch
      if (quantity < 0) {
        const addedPairs = Math.abs(quantity);
        const todayDate = getTaiwanTodayStr();
        const timestamp = new Date().toISOString();
        const orderId = `IN-${todayDate.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
        const stockInRec: StockInRecord = {
          id: `stockin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          orderId,
          date: todayDate,
          timestamp,
          vendor: prod.brand || '未分類廠商',
          sku: prod.sku,
          productName: prod.name,
          color: prod.color,
          sizeBreakdown: { [sizeLabel]: addedPairs },
          totalPairs: addedPairs,
          costPerPair: prod.costPrice || 0,
          totalCost: (prod.costPrice || 0) * addedPairs,
          operator: '門市人員',
          notes: '庫存清單快捷入庫',
          category: prod.category,
          retailPrice: prod.retailPrice,
          productId: prod.id,
          procurementType: prod.procurementType,
        };

        let updatedForReservation: ProductWithVariants | null = null;
        setProducts((prev) => {
          const next = prev.map((p) => {
            if (p.id !== prod!.id) return p;
            const exists = p.variants.some((v) => v.id === effectiveVariantId);
            let updatedVariants: ShoeVariant[];
            if (exists) {
              updatedVariants = p.variants.map((v) =>
                v.id === effectiveVariantId
                  ? addBatchToVariant(v, addedPairs, prod!.costPrice || 0, stockInRec.id, orderId, timestamp)
                  : v
              );
            } else {
              const newVar = addBatchToVariant(
                targetVariant!,
                addedPairs,
                prod!.costPrice || 0,
                stockInRec.id,
                orderId,
                timestamp
              );
              updatedVariants = [...p.variants, newVar].sort(
                (a, b) => getSegmentSortRank(a.sizeDisplay, a.sizeUS) - getSegmentSortRank(b.sizeDisplay, b.sizeUS)
              );
            }
            const updatedP = {
              ...p,
              variants: updatedVariants,
            };
            updatedForReservation = updatedP;
            return updatedP;
          });
          realtimeService.broadcastSync(next);
          return next;
        });

        setStockInRecords((prev) => [stockInRec, ...prev]);
        realtimeService.broadcastStockIn(stockInRec);
        showToast(`已補貨入庫 1 雙 ${prodName} (${sizeLabel})，已同步新增至進貨明細！`);

        if (updatedForReservation) {
          autoMatchArrivedReservations(updatedForReservation, [
            { variantId: effectiveVariantId, sizeDisplay: targetVariant.sizeDisplay, sizeUS: targetVariant.sizeUS },
          ]);
        }
      } else {
        // Outgoing stock (deduct FIFO)
        setProducts((prev) => {
          const next = prev.map((p) => {
            if (p.id !== prod!.id) return p;
            return {
              ...p,
              variants: p.variants.map((v) =>
                v.id === effectiveVariantId ? deductFifoVariantStock(v, quantity, prod!.costPrice).updatedVariant : v
              ),
            };
          });
          realtimeService.broadcastSync(next);
          return next;
        });
        showToast(`已出庫扣減 1 雙 ${prodName} (${sizeLabel})，現存 ${newStockCount} 雙`);
      }
    },
    [products, showToast]
  );

  // 3b. Handle Quick Sale from Inventory View
  const handleQuickSale = useCallback(
    (product: ProductWithVariants, variant: { id: string; sizeUS: number; sizeDisplay?: string }) => {
      const todayDate = getTaiwanTodayStr();
      handleCompleteSale({
        businessDate: todayDate,
        brand: product.brand,
        sku: product.sku,
        productName: product.name,
        color: product.color,
        sizeUS: variant.sizeUS,
        sizeDisplay: variant.sizeDisplay || (variant.sizeUS ? `${variant.sizeUS}` : '標準碼'),
        category: (product.category as any) || '運動鞋',
        retailPrice: product.retailPrice,
        actualPaid: product.retailPrice,
        paymentMethod: 'cash',
        status: 'completed',
        isCustomItem: false,
        productId: product.id,
        variantId: variant.id,
        notes: '庫存清單快捷售出',
        operator: '門市人員',
      });
    },
    [handleCompleteSale]
  );

  // 4. Handle Stock-In Success (updates products/variants, prepends StockInRecord, broadcasts)
  const handleStockInSuccess = useCallback(
    (product: ProductWithVariants, isNewProduct: boolean, record?: StockInRecord) => {
      setProducts((prev) => {
        let next: ProductWithVariants[];
        if (isNewProduct) {
          // Distinct new product record (preserves all other colors with same SKU)
          next = [product, ...prev];
        } else {
          // Update existing product by unique ID
          const existsById = prev.some((p) => p.id === product.id);
          if (existsById) {
            next = prev.map((p) => (p.id === product.id ? product : p));
          } else {
            // Fallback match by exact SKU and Color
            const existsBySkuColor = prev.some(
              (p) =>
                p.sku.toUpperCase() === product.sku.toUpperCase() &&
                p.color.trim().toLowerCase() === product.color.trim().toLowerCase()
            );
            if (existsBySkuColor) {
              next = prev.map((p) =>
                p.sku.toUpperCase() === product.sku.toUpperCase() &&
                p.color.trim().toLowerCase() === product.color.trim().toLowerCase()
                  ? product
                  : p
              );
            } else {
              next = [product, ...prev];
            }
          }
        }
        try {
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to save to localStorage:', e);
        }
        realtimeService.broadcastSync(next, sales);
        realtimeService.saveCloudState(next, sales, stockInRecords, vendorReturns);
        return next;
      });

      if (record) {
        setStockInRecords((prev) => {
          if (prev.some((r) => r.id === record.id)) return prev;
          return [record, ...prev];
        });
        realtimeService.broadcastStockIn(record);
      }

      const addedPairs = record ? record.totalPairs : product.variants.reduce((s, v) => s + v.stock, 0);
      showToast(
        isNewProduct
          ? `已成功建檔入庫全新鞋款：${product.brand} ${product.sku}（${product.color}，共 ${addedPairs} 雙）！`
          : `已成功完成 ${product.sku}（${product.color}）補貨入庫（共 ${addedPairs} 雙）！`
      );

      // Check if any pending customer reservations match this stocked SKU & sizes
      autoMatchArrivedReservations(product);

      // Return to inventory view and close modal
      setActiveTab('inventory');
      setIsStockInModalOpen(false);
    },
    [sales, stockInRecords, vendorReturns, showToast, autoMatchArrivedReservations]
  );

  // 5. Handle Vendor Return (Strict defense & variant decrement)
  // 5. Handle Vendor Return (Strict defense & variant decrement, supports multi-size batch)
  const handleVendorReturn = useCallback(
    (payload: {
      sku: string;
      sizeUS?: number;
      sizeDisplay?: string;
      quantity: number;
      items?: Array<{
        sizeUS: number;
        quantity: number;
        variantId?: string;
        sizeDisplay?: string;
      }>;
      vendor: string;
      reason: VendorReturnReason;
      reasonDetail?: string;
      refundAmount: number;
      operator?: string;
      productName?: string;
      color?: string;
      variantId?: string;
      productId?: string;
    }): boolean => {
      if (!payload || payload.quantity <= 0) {
        showToast('退回雙數必須大於 0！', 'error');
        return false;
      }

      // Locate product
      const targetProd = payload.productId
        ? products.find((p) => p.id === payload.productId)
        : products.find(
            (p) =>
              p.sku.toUpperCase() === payload.sku.toUpperCase() &&
              (!payload.color || p.color.trim().toLowerCase() === payload.color.trim().toLowerCase())
          );
      if (!targetProd) {
        showToast(`找不到貨號為 ${payload.sku} 的鞋款！`, 'error');
        return false;
      }

      // Normalize items list (support both multi-size batch and single size)
      const returnItems: Array<{ sizeUS: number; quantity: number; variantId?: string; sizeDisplay?: string }> =
        payload.items && payload.items.length > 0
          ? payload.items.filter((item) => item.quantity > 0)
          : payload.sizeUS !== undefined
          ? [{ sizeUS: payload.sizeUS, quantity: payload.quantity, variantId: payload.variantId, sizeDisplay: payload.sizeDisplay }]
          : [];

      if (returnItems.length === 0) {
        showToast('請至少選擇一個尺碼並填寫退回雙數！', 'error');
        return false;
      }

      // Helper to format item size label
      const getItemSizeLabel = (item: { sizeUS: number; variantId?: string; sizeDisplay?: string }) => {
        if (item.sizeDisplay) return item.sizeDisplay;
        const variant = targetProd.variants.find(
          (v) => (item.variantId && v.id === item.variantId) || Math.abs(v.sizeUS - item.sizeUS) < 0.1
        );
        if (variant?.sizeDisplay) return variant.sizeDisplay;
        return item.sizeUS % 1 === 0 ? `US ${item.sizeUS.toFixed(1)}` : `US ${item.sizeUS}`;
      };

      // Validate all items against stock
      for (const item of returnItems) {
        const variant = targetProd.variants.find(
          (v) =>
            (item.variantId && v.id === item.variantId) ||
            Math.abs(v.sizeUS - item.sizeUS) < 0.1
        );
        const displayLabel = getItemSizeLabel(item);
        if (!variant) {
          showToast(`找不到 ${payload.sku} 尺碼 ${displayLabel}！`, 'error');
          return false;
        }
        if (item.quantity > variant.stock) {
          showToast(
            `退回雙數 (${item.quantity}雙) 超過 ${displayLabel} 現有庫存 (${variant.stock}雙)，無法超額退回！`,
            'error'
          );
          return false;
        }
      }

      // Create item decrement maps (by variantId and fallback by sizeUS)
      const deductVariantMap = new Map<string, number>();
      const deductSizeMap = new Map<number, number>();
      returnItems.forEach((item) => {
        if (item.variantId) {
          deductVariantMap.set(item.variantId, (deductVariantMap.get(item.variantId) || 0) + item.quantity);
        } else {
          deductSizeMap.set(item.sizeUS, (deductSizeMap.get(item.sizeUS) || 0) + item.quantity);
        }
      });

      // Decrement variant stock across all target sizes
      const updatedProducts = products.map((prod) => {
        if (prod.id !== targetProd.id) {
          return prod;
        }
        return {
          ...prod,
          variants: prod.variants.map((v) => {
            const deduct = (deductVariantMap.get(v.id) || 0) + (deductSizeMap.get(v.sizeUS) || 0);
            if (deduct > 0) {
              return deductFifoVariantStock(v, deduct, prod.costPrice).updatedVariant;
            }
            return v;
          }),
        };
      });
      setProducts(updatedProducts);

      // Format size text & breakdown
      const sizeBreakdown: Record<string, number> = {};
      returnItems.forEach((item) => {
        const key = getItemSizeLabel(item);
        sizeBreakdown[key] = (sizeBreakdown[key] || 0) + item.quantity;
      });

      const formattedSizeText =
        returnItems.length === 1
          ? getItemSizeLabel(returnItems[0])
          : returnItems
              .map((item) => `${getItemSizeLabel(item)}: ${item.quantity}雙`)
              .join('、 ');

      const totalReturnedPairs = returnItems.reduce((sum, item) => sum + item.quantity, 0);

      // Create immutable VendorReturnRecord
      const timestamp = new Date().toISOString();
      const dateStr = getTaiwanTodayStr();
      const newRecord: VendorReturnRecord = {
        id: `vret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        orderId: `VR-${dateStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        returnNo: `VR-${dateStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        date: dateStr,
        timestamp,
        vendor: payload.vendor || targetProd.brand,
        sku: targetProd.sku,
        productName: payload.productName || targetProd.name,
        color: payload.color || targetProd.color,
        size: formattedSizeText,
        sizeDisplay: returnItems.length === 1 ? getItemSizeLabel(returnItems[0]) : formattedSizeText,
        sizeUS: returnItems.length === 1 ? returnItems[0].sizeUS : undefined,
        quantity: totalReturnedPairs,
        reason: payload.reason,
        reasonDetail: payload.reasonDetail,
        refundAmount: payload.refundAmount,
        operator: payload.operator || '門市人員',
        status: 'completed',
        productId: targetProd.id,
        variantId: returnItems.length === 1 ? returnItems[0].variantId : undefined,
        sizeBreakdown,
        totalPairs: totalReturnedPairs,
      };

      setVendorReturns((prev) => [newRecord, ...prev]);

      // Broadcast event & inventory sync
      realtimeService.broadcastVendorReturn(newRecord);
      realtimeService.broadcastSync(updatedProducts, sales);
      returnItems.forEach((item) => {
        const v = targetProd.variants.find(
          (variant) => (item.variantId && variant.id === item.variantId) || Math.abs(variant.sizeUS - item.sizeUS) < 0.1
        );
        if (v && v.id) {
          const newStock = Math.max(0, v.stock - item.quantity);
          realtimeService.broadcastDeduction(
            {
              variantId: v.id,
              productId: targetProd.id,
              quantity: item.quantity,
              sourceDevice: 'vendor-return',
              timestamp,
            },
            newStock
          );
        }
      });

      showToast(
        returnItems.length === 1
          ? `已成功退回廠商 ${totalReturnedPairs} 雙 ${targetProd.sku} (${formattedSizeText})！`
          : `已成功退回廠商 ${totalReturnedPairs} 雙 ${targetProd.sku}（共 ${returnItems.length} 種尺碼）！`
      );
      return true;
    },
    [products, sales, showToast]
  );

  // Jump to Stock-In with SKU and Color prefilled (opens modal)
  const handleNavigateToStockIn = useCallback((sku: string, color?: string) => {
    setStockInSku(sku);
    setStockInColor(color || '');
    setIsStockInModalOpen(true);
  }, []);

  // Delete Shoe from Inventory (Preserves all historical ledgers: Sales, Stock-In, Vendor Returns)
  const handleDeleteProduct = useCallback(
    (productId: string) => {
      const target = products.find((p) => p.id === productId);
      const nextProducts = products.filter((p) => p.id !== productId);

      setProducts(nextProducts);

      try {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextProducts));
      } catch (e) {}

      realtimeService.broadcastSync(nextProducts, sales);
      realtimeService.saveCloudState(nextProducts, sales, stockInRecords, vendorReturns);
      showToast(`已自庫存清單刪除鞋款 (${target?.sku || ''})，所有進貨/銷貨/退回歷史紀錄均已完整保留`, 'info');
    },
    [products, sales, stockInRecords, vendorReturns, showToast]
  );

  // Update Product Details & Inventory from Edit Product Modal
  const handleUpdateProduct = useCallback(
    (updatedProduct: ProductWithVariants, stockInRecord?: StockInRecord) => {
      const oldProduct = products.find((p) => p.id === updatedProduct.id);
      const costPriceChanged = oldProduct !== undefined && oldProduct.costPrice !== updatedProduct.costPrice;

      // Synchronize cost price to variant batches if cost changed
      let finalProduct = updatedProduct;
      if (costPriceChanged) {
        finalProduct = {
          ...updatedProduct,
          variants: updatedProduct.variants.map((v) => ({
            ...v,
            batches:
              v.batches && v.batches.length > 0
                ? v.batches.map((b) => ({
                    ...b,
                    costPrice: updatedProduct.costPrice,
                  }))
                : v.stock > 0
                ? [
                    {
                      id: `batch-init-${v.id}`,
                      timestamp: '2026-01-01T00:00:00.000Z',
                      costPrice: updatedProduct.costPrice,
                      initialStock: v.stock,
                      remainingStock: v.stock,
                    },
                  ]
                : [],
          })),
        };
      }

      const nextProducts = products.map((p) => (p.id === finalProduct.id ? finalProduct : p));

      setProducts(nextProducts);
      try {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextProducts));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
      realtimeService.broadcastSync(nextProducts, sales);

      if (costPriceChanged) {
        setStockInRecords((prev) => {
          const supersededIds: string[] = [];
          const newRevisions: StockInRecord[] = [];
          const nowIso = new Date().toISOString();

          const updatedExisting = prev.map((r) => {
            const matches =
              !r.isSuperseded &&
              (r.productId === finalProduct.id ||
                (r.sku.trim().toUpperCase() === finalProduct.sku.trim().toUpperCase() &&
                  (!r.color || !finalProduct.color || r.color.trim().toLowerCase() === finalProduct.color.trim().toLowerCase())));

            // Only supersede and revise if cost actually differs!
            if (matches && r.costPerPair !== finalProduct.costPrice) {
              supersededIds.push(r.id);
              const revNo = (r.revisionNo || 0) + 1;
              const revised: StockInRecord = {
                ...r,
                id: `stockin-rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                revisionOf: r.revisionOf || r.id,
                revisionNo: revNo,
                isSuperseded: false,
                costPerPair: finalProduct.costPrice,
                totalCost: r.totalPairs * finalProduct.costPrice,
                originalCostPerPair: r.costPerPair,
                originalTotalCost: r.totalCost,
                costModifiedAt: nowIso,
                costModifiedReason: `商品庫存成本調整 ($${r.costPerPair} -> $${finalProduct.costPrice})`,
              };
              newRevisions.push(revised);
              return { ...r, isSuperseded: true };
            }
            return r;
          });

          let nextList = [...newRevisions, ...updatedExisting];
          if (stockInRecord && !nextList.some((r) => r.id === stockInRecord.id)) {
            nextList = [stockInRecord, ...nextList];
          }

          try {
            localStorage.setItem(STORAGE_KEY_STOCKIN, JSON.stringify(nextList));
          } catch (e) {}

          if (supersededIds.length > 0) {
            realtimeService.broadcastStockInRevised(supersededIds, newRevisions);
          }
          if (stockInRecord) {
            realtimeService.broadcastStockIn(stockInRecord);
          }
          realtimeService.saveCloudState(nextProducts, sales, nextList, vendorReturns, reservations);

          return nextList;
        });
      } else {
        realtimeService.saveCloudState(nextProducts, sales, stockInRecords, vendorReturns, reservations);
        if (stockInRecord) {
          setStockInRecords((prev) => {
            if (prev.some((r) => r.id === stockInRecord.id)) return prev;
            const nextList = [stockInRecord, ...prev];
            try {
              localStorage.setItem(STORAGE_KEY_STOCKIN, JSON.stringify(nextList));
            } catch (e) {}
            realtimeService.saveCloudState(nextProducts, sales, nextList, vendorReturns, reservations);
            return nextList;
          });
          realtimeService.broadcastStockIn(stockInRecord);
        }
      }

      // Automatically check and match arrived reservations for this updated product
      autoMatchArrivedReservations(finalProduct);

      showToast(
        stockInRecord
          ? `已成功更新鞋款並補貨入庫 ${stockInRecord.totalPairs} 雙：${finalProduct.brand} ${finalProduct.sku}！`
          : costPriceChanged
          ? `已成功更新鞋款成本為 $${finalProduct.costPrice.toLocaleString()}，歷史進貨紀錄已同步版本化修訂！`
          : `已成功更新鞋款資訊：${finalProduct.brand} ${finalProduct.sku}！`
      );
    },
    [products, sales, stockInRecords, vendorReturns, reservations, showToast, autoMatchArrivedReservations]
  );

  // Revise single Stock-In Record cost
  const handleReviseStockInCost = useCallback(
    (recordId: string, newCostPerPair: number, reason?: string) => {
      const targetRecord = stockInRecords.find((r) => r.id === recordId && !r.isSuperseded);
      if (!targetRecord) {
        showToast('找不到該筆有效進貨單據或已被修訂', 'error');
        return;
      }

      if (targetRecord.costPerPair === newCostPerPair) {
        showToast('成本未變更', 'info');
        return;
      }

      const nowIso = new Date().toISOString();
      const revNo = (targetRecord.revisionNo || 0) + 1;
      const revisedRecord: StockInRecord = {
        ...targetRecord,
        id: `stockin-rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        revisionOf: targetRecord.revisionOf || targetRecord.id,
        revisionNo: revNo,
        isSuperseded: false,
        costPerPair: newCostPerPair,
        totalCost: targetRecord.totalPairs * newCostPerPair,
        originalCostPerPair: targetRecord.costPerPair,
        originalTotalCost: targetRecord.totalCost,
        costModifiedAt: nowIso,
        costModifiedReason: reason || `單筆單據成本修訂 ($${targetRecord.costPerPair} -> $${newCostPerPair})`,
      };

      // 1. Update stockInRecords: mark old record as isSuperseded, prepend revisedRecord
      const nextStockIns = stockInRecords.map((r) =>
        r.id === recordId ? { ...r, isSuperseded: true } : r
      );
      const finalStockIns = [revisedRecord, ...nextStockIns];
      setStockInRecords(finalStockIns);
      try {
        localStorage.setItem(STORAGE_KEY_STOCKIN, JSON.stringify(finalStockIns));
      } catch (e) {}

      // 2. Update FIFO batches of products if any batch references this record or orderId, and synchronize prod.costPrice
      const targetOrderId = targetRecord.orderId || targetRecord.batchNo;
      const rootRevisionId = targetRecord.revisionOf || targetRecord.id;
      let productsUpdated = false;

      const nextProducts = products.map((prod) => {
        const matchesProd =
          prod.id === targetRecord.productId ||
          (prod.sku.trim().toUpperCase() === targetRecord.sku.trim().toUpperCase() &&
            (!targetRecord.color || prod.color.trim().toLowerCase() === targetRecord.color.trim().toLowerCase()));

        if (!matchesProd) return prod;

        let varChanged = false;
        const nextVariants = prod.variants.map((v) => {
          if (v.batches && v.batches.length > 0) {
            const updatedBatches = v.batches.map((b) => {
              const isBatchMatch =
                b.stockInId === targetRecord.id ||
                b.stockInId === rootRevisionId ||
                (targetOrderId && b.stockInOrderId === targetOrderId);
              if (isBatchMatch) {
                varChanged = true;
                return { ...b, costPrice: newCostPerPair };
              }
              return b;
            });
            return varChanged ? { ...v, batches: updatedBatches } : v;
          } else if (v.stock > 0 && (prod.costPrice === targetRecord.costPerPair || !prod.costPrice)) {
            // Ensure variant batches initialized with the revised cost
            varChanged = true;
            return {
              ...v,
              batches: [
                {
                  id: `batch-init-${v.id}`,
                  timestamp: '2026-01-01T00:00:00.000Z',
                  costPrice: newCostPerPair,
                  initialStock: v.stock,
                  remainingStock: v.stock,
                },
              ],
            };
          }
          return v;
        });

        // Also update prod.costPrice if this product's cost matches targetRecord's old cost
        const shouldUpdateProdCost = prod.costPrice === targetRecord.costPerPair || !prod.costPrice;
        if (varChanged || shouldUpdateProdCost) {
          productsUpdated = true;
          return {
            ...prod,
            costPrice: shouldUpdateProdCost ? newCostPerPair : prod.costPrice,
            variants: nextVariants,
          };
        }
        return prod;
      });

      if (productsUpdated) {
        setProducts(nextProducts);
        try {
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(nextProducts));
        } catch (e) {}
        realtimeService.broadcastSync(nextProducts, sales);
      }

      // 3. Broadcast and save cloud state
      realtimeService.broadcastStockInRevised([recordId], [revisedRecord]);
      realtimeService.saveCloudState(nextProducts, sales, finalStockIns, vendorReturns, reservations);

      showToast(
        `已成功修訂單號「${targetRecord.orderId || targetRecord.sku}」成本為 $${newCostPerPair.toLocaleString()}（原 $${targetRecord.costPerPair.toLocaleString()}）`,
        'success'
      );
    },
    [stockInRecords, products, sales, vendorReturns, reservations, showToast]
  );

  // Delete single Stock-In Record
  const handleDeleteStockInRecord = useCallback(
    (recordId: string) => {
      const nextStockIns = stockInRecords.filter((r) => r.id !== recordId);
      setStockInRecords(nextStockIns);
      try {
        localStorage.setItem(STORAGE_KEY_STOCKIN, JSON.stringify(nextStockIns));
      } catch (e) {}
      realtimeService.saveCloudState(products, sales, nextStockIns, vendorReturns);
      showToast('已刪除該筆進貨單據', 'info');
    },
    [products, sales, stockInRecords, vendorReturns, showToast]
  );

  // Delete single Sale Record
  const handleDeleteSaleRecord = useCallback(
    (saleId: string) => {
      const nextSales = sales.filter((s) => s.id !== saleId);
      setSales(nextSales);
      try {
        localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(nextSales));
      } catch (e) {}
      realtimeService.broadcastSync(products, nextSales);
      realtimeService.saveCloudState(products, nextSales, stockInRecords, vendorReturns);
      showToast('已刪除該筆銷貨紀錄', 'info');
    },
    [products, sales, stockInRecords, vendorReturns, showToast]
  );

  // Delete single Vendor Return Record
  const handleDeleteVendorReturnRecord = useCallback(
    (recordId: string) => {
      const nextVendorReturns = vendorReturns.filter((r) => r.id !== recordId);
      setVendorReturns(nextVendorReturns);
      try {
        localStorage.setItem(STORAGE_KEY_VENDOR_RETURNS, JSON.stringify(nextVendorReturns));
      } catch (e) {}
      realtimeService.saveCloudState(products, sales, stockInRecords, nextVendorReturns);
      showToast('已刪除該筆退回單據', 'info');
    },
    [products, sales, stockInRecords, vendorReturns, showToast]
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh Data from Cloud or LocalStorage
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const cloud = await realtimeService.fetchCloudState();
      let hasUpdated = false;
      if (cloud) {
        if (Array.isArray(cloud.products)) {
          const cleanCloudProds = cloud.products.filter((p) => !isMockProduct(p));
          setProducts(cleanCloudProds);
          try {
            localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(cleanCloudProds));
          } catch (e) {}
          hasUpdated = true;
        }
        if (Array.isArray(cloud.sales)) {
          const cleanCloudSales = cloud.sales.filter((s) => !isMockSale(s));
          setSales(cleanCloudSales);
          try {
            localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(cleanCloudSales));
          } catch (e) {}
          hasUpdated = true;
        }
        if (Array.isArray(cloud.stockIns)) {
          const cleanStockIns = cloud.stockIns.filter((r) => !isMockStockIn(r));
          setStockInRecords(cleanStockIns);
          try {
            localStorage.setItem(STORAGE_KEY_STOCKIN, JSON.stringify(cleanStockIns));
          } catch (e) {}
          hasUpdated = true;
        }
        if (Array.isArray(cloud.vendorReturns)) {
          const cleanReturns = cloud.vendorReturns.filter((r) => !isMockVendorReturn(r));
          setVendorReturns(cleanReturns);
          try {
            localStorage.setItem(STORAGE_KEY_VENDOR_RETURNS, JSON.stringify(cleanReturns));
          } catch (e) {}
          hasUpdated = true;
        }
        if (Array.isArray(cloud.reservations)) {
          setReservations(cloud.reservations);
          try {
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(cloud.reservations));
          } catch (e) {}
          hasUpdated = true;
        }
      }

      if (!hasUpdated) {
        try {
          const savedProd = localStorage.getItem(STORAGE_KEY_PRODUCTS);
          if (savedProd) {
            const parsed = JSON.parse(savedProd);
            if (Array.isArray(parsed)) {
              setProducts(parsed.filter((p) => !isMockProduct(p)));
            }
          }
          const savedSales = localStorage.getItem(STORAGE_KEY_SALES);
          if (savedSales) {
            const parsed = JSON.parse(savedSales);
            if (Array.isArray(parsed)) {
              setSales(parsed.filter((s) => !isMockSale(s)));
            }
          }
          const savedStockIns = localStorage.getItem(STORAGE_KEY_STOCKIN);
          if (savedStockIns) {
            const parsed = JSON.parse(savedStockIns);
            if (Array.isArray(parsed)) {
              setStockInRecords(parsed);
            }
          }
          const savedReturns = localStorage.getItem(STORAGE_KEY_VENDOR_RETURNS);
          if (savedReturns) {
            const parsed = JSON.parse(savedReturns);
            if (Array.isArray(parsed)) {
              setVendorReturns(parsed);
            }
          }
          const savedReservations = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
          if (savedReservations) {
            const parsed = JSON.parse(savedReservations);
            if (Array.isArray(parsed)) {
              setReservations(parsed);
            }
          }
        } catch (e) {
          console.warn('Refresh from localStorage failed:', e);
        }
      }

      showToast('已重新整理最新庫存、銷售與客戶預訂紀錄', 'success');
    } catch (e) {
      console.error('Refresh error:', e);
      showToast('重新整理失敗，請稍後再試', 'error');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [products, sales, stockInRecords, vendorReturns, reservations, showToast]);

  // Today's Sales Count
  const todayStr = useMemo(() => getTaiwanTodayStr(), []);
  const todaySales = useMemo(() => {
    return sales.filter((s) => s.businessDate === todayStr && s.status === 'completed');
  }, [sales, todayStr]);

  // Expose store state and actions on window for test verification
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__shoeStore = {
        products,
        sales,
        stockInRecords,
        vendorReturns,
        reservations,
        handleStockInSuccess,
        handleVendorReturn,
        handleMarkSaleReturned,
        handleUpdateProduct,
        handleReviseStockInCost,
        handleDeleteReservation,
      };
    }
  }, [products, sales, stockInRecords, vendorReturns, reservations, handleStockInSuccess, handleVendorReturn, handleMarkSaleReturned, handleUpdateProduct, handleReviseStockInCost, handleDeleteReservation]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
      {/* Mobile Screen Wrapper: Centered & sleek on desktop, 100% native on mobile */}
      <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 shadow-2xl relative border-x border-slate-200/80 dark:border-slate-800/80">
        {/* Top Mobile App Bar */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">👟</span>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white leading-none">
                實體鞋店極速營運
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      syncStatusInfo.status !== 'offline' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  {syncStatusInfo.label || '即時連線中'}
                </span>
                <span className="text-slate-300 dark:text-slate-700 text-[10px]">&bull;</span>
                <span className="text-[10px] text-slate-400 font-bold">手機主控端</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="重新整理"
              aria-label="重新整理"
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="切換深淺模式"
              aria-label="切換深淺模式"
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <FontSizeControl />
          </div>
        </header>

        {/* Transient Notification Toast */}
        {toastMessage && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-black shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 max-w-[90%] pointer-events-none">
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="truncate">{toastMessage.text}</span>
          </div>
        )}

        {/* Main Content Body with explicit view testids */}
        <main className="flex-1 p-3">
          {activeTab === 'home' && (
            <HomeWorkbenchView
              products={products}
              sales={sales}
              reservations={reservations}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenStockInModal={() => {
                setStockInSku('');
                setStockInColor('');
                setIsStockInModalOpen(true);
              }}
              onOpenVendorReturnModal={() => {
                if (products.length > 0) {
                  setVendorReturnShoe(products[0]);
                  setVendorReturnInitialSize(undefined);
                  setIsVendorReturnModalOpen(true);
                } else {
                  showToast('目前門市尚無庫存商品可退回，請先建立進貨', 'info');
                }
              }}
              onExportExcel={() => exportRecordsToExcel(stockInRecords, sales, vendorReturns)}
            />
          )}

          {activeTab === 'cashier' && (
            <div data-testid="view-cashier">
              <QuickCashierView
                products={products}
                todaySales={todaySales}
                onCompleteSale={handleCompleteSale}
                onVoidSale={handleVoidSale}
              />
            </div>
          )}

          {activeTab === 'reservations' && (
            <div data-testid="view-reservations">
              <CustomerReservationView
                products={products}
                reservations={reservations}
                onCreateReservation={handleCreateReservation}
                onUpdateStatus={handleUpdateReservationStatus}
                onOpenFulfillModal={(res) => {
                  setFulfillingReservation(res);
                  setIsFulfillModalOpen(true);
                }}
                onDeleteReservation={handleDeleteReservation}
              />
            </div>
          )}

          {activeTab === 'inventory' && (
            <div data-testid="view-inventory">
              <CompactInventoryView
                products={products}
                onDeductStock={handleDeductStock}
                onOpenStockInModal={() => {
                  setStockInSku('');
                  setStockInColor('');
                  setIsStockInModalOpen(true);
                }}
                onOpenVendorReturn={(shoe, initialSizeUS) => {
                  setVendorReturnShoe(shoe);
                  setVendorReturnInitialSize(initialSizeUS);
                  setIsVendorReturnModalOpen(true);
                }}
                onEditProduct={(shoe) => {
                  setEditingProduct(shoe);
                  setIsStockInModalOpen(true);
                }}
                onDeleteProduct={handleDeleteProduct}
                onQuickSale={handleQuickSale}
              />
            </div>
          )}

          {activeTab === 'records' && (
            <div data-testid="view-records">
              <RecordsCenterView
                stockInRecords={stockInRecords}
                sales={sales}
                vendorReturns={vendorReturns}
                onMarkSaleReturned={handleMarkSaleReturned}
                onDeleteStockInRecord={handleDeleteStockInRecord}
                onDeleteSaleRecord={handleDeleteSaleRecord}
                onDeleteVendorReturnRecord={handleDeleteVendorReturnRecord}
                onReviseStockInCost={handleReviseStockInCost}
                initialTab={recordsInitialTab}
                initialSearchQuery={recordsInitialQuery}
                onOpenVendorReturnModal={() => {
                  if (products.length > 0) {
                    setVendorReturnShoe(products[0]);
                    setVendorReturnInitialSize(undefined);
                    setIsVendorReturnModalOpen(true);
                  } else {
                    showToast('目前門市尚無庫存商品可退回，請先建立進貨', 'info');
                    return;
                  }
                  setIsVendorReturnModalOpen(true);
                }}
                onOpenStockInModal={() => {
                  setStockInSku('');
                  setStockInColor('');
                  setIsStockInModalOpen(true);
                }}
                onNavigateToCashier={() => setActiveTab('cashier')}
                onExportExcel={() => exportRecordsToExcel(stockInRecords, sales, vendorReturns)}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div data-testid="view-analytics">
              <StoreAnalyticsView
                products={products}
                sales={sales}
                onNavigateToStockIn={handleNavigateToStockIn}
              />
            </div>
          )}

          {activeTab === 'stockin' && (
            <StockInView
              products={products}
              initialSku={stockInSku}
              initialColor={stockInColor}
              onStockInSuccess={handleStockInSuccess}
            />
          )}
        </main>

        {/* Embedded Modals */}
        <StockInModal
          isOpen={isStockInModalOpen}
          onClose={() => {
            setIsStockInModalOpen(false);
            setStockInSku('');
            setStockInColor('');
            setEditingProduct(null);
          }}
          products={products}
          initialSku={stockInSku}
          initialColor={stockInColor}
          editingProduct={editingProduct}
          onStockInSuccess={handleStockInSuccess}
          onSaveEdit={handleUpdateProduct}
          onNavigateToRecords={handleNavigateToStockInRecords}
        />

        <VendorReturnModal
          isOpen={isVendorReturnModalOpen}
          product={vendorReturnShoe}
          products={products}
          initialSizeUS={vendorReturnInitialSize}
          onClose={() => {
            setIsVendorReturnModalOpen(false);
            setVendorReturnShoe(null);
            setVendorReturnInitialSize(undefined);
          }}
          onConfirmReturn={handleVendorReturn}
        />

        <FulfillReservationModal
          isOpen={isFulfillModalOpen}
          reservation={fulfillingReservation}
          onClose={() => {
            setIsFulfillModalOpen(false);
            setFulfillingReservation(null);
          }}
          onConfirmFulfill={handleFulfillReservation}
        />

        {/* Mobile Bottom Navigation Bar */}
        <MobileNav
          activeTab={activeTab as MobileTabType}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            if ((tab as string) !== 'stockin') {
              setStockInSku('');
              setStockInColor('');
            }
          }}
          todaySalesCount={todaySales.length}
          pendingReservationsCount={
            reservations.filter((r) => r.status === 'pending_arrival' || r.status === 'arrived_ready').length
          }
        />
      </div>
    </div>
  );
}
