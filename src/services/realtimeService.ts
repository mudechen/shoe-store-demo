import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InventoryDeductPayload, ProductWithVariants } from '../types/inventory';
import { SaleRecord } from '../types/sales';
import { StockInRecord, VendorReturnRecord } from '../types/records';
import { ReservationRecord } from '../types/reservations';

export type SyncStatus = 'supabase-active' | 'broadcast-active' | 'connecting' | 'offline';

export interface SyncStatusInfo {
  status: SyncStatus;
  label: string;
  badgeClass: string;
  isRealtimeTierA: boolean;
}

export interface RemoteDeductEvent {
  type: 'STOCK_DEDUCTED';
  variantId: string;
  productId: string;
  delta: number;
  newStock?: number;
  sourceDevice: string;
  timestamp: string;
}

export interface RemoteUpdateEvent {
  type: 'STOCK_UPDATED';
  variantId: string;
  productId: string;
  newStock: number;
  timestamp: string;
}

export interface RemoteSyncEvent {
  type: 'INVENTORY_SYNC';
  products: ProductWithVariants[];
  sales?: SaleRecord[];
  timestamp: string;
}

export interface RemoteResetEvent {
  type: 'INVENTORY_RESET';
  timestamp: string;
}

export interface RemoteSaleEvent {
  type: 'SALE_COMPLETED';
  sale: SaleRecord;
  timestamp: string;
}

export interface RemoteVoidSaleEvent {
  type: 'SALE_VOIDED';
  saleId: string;
  timestamp: string;
}

export interface RemoteRequestSyncEvent {
  type: 'REQUEST_SYNC';
  sourceDevice: string;
  timestamp: string;
}

export interface RemoteStockInEvent {
  type: 'STOCK_IN_RECORDED';
  record: StockInRecord;
  timestamp: string;
}

export interface RemoteVendorReturnEvent {
  type: 'VENDOR_RETURN_RECORDED';
  record: VendorReturnRecord;
  timestamp: string;
}

export interface RemoteSaleReturnedEvent {
  type: 'SALE_RETURNED';
  saleId: string;
  reason: string;
  note?: string;
  returnTimestamp: string;
  timestamp: string;
}

export interface RemoteReservationCreatedEvent {
  type: 'RESERVATION_CREATED';
  reservation: ReservationRecord;
  timestamp: string;
}

export interface RemoteReservationUpdatedEvent {
  type: 'RESERVATION_UPDATED';
  reservationId: string;
  updates: Partial<ReservationRecord>;
  timestamp: string;
}

export interface RemoteReservationsSyncEvent {
  type: 'RESERVATIONS_SYNC';
  reservations: ReservationRecord[];
  timestamp: string;
}

export interface RemoteReservationDeletedEvent {
  type: 'RESERVATION_DELETED';
  reservationId: string;
  timestamp: string;
}

export interface RemoteStockInRevisedEvent {
  type: 'STOCK_IN_REVISED';
  supersededRecordIds: string[];
  revisedRecords: StockInRecord[];
  timestamp: string;
}

export type RealtimeEvent =
  | RemoteDeductEvent
  | RemoteUpdateEvent
  | RemoteSyncEvent
  | RemoteResetEvent
  | RemoteSaleEvent
  | RemoteVoidSaleEvent
  | RemoteRequestSyncEvent
  | RemoteStockInEvent
  | RemoteVendorReturnEvent
  | RemoteSaleReturnedEvent
  | RemoteReservationCreatedEvent
  | RemoteReservationUpdatedEvent
  | RemoteReservationsSyncEvent
  | RemoteReservationDeletedEvent
  | RemoteStockInRevisedEvent;

export type RealtimeEventCallback = (event: RealtimeEvent) => void;
export type SyncStatusCallback = (statusInfo: SyncStatusInfo) => void;

const BROADCAST_CHANNEL_NAME = 'shoe-store-realtime-channel';

// Demo mode: Supabase credentials removed. This demo uses BroadcastChannel only.
const DEFAULT_SUPABASE_URL = '';
const DEFAULT_SUPABASE_ANON_KEY = '';

class RealtimeSyncService {
  private supabase: SupabaseClient | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private eventListeners: Set<RealtimeEventCallback> = new Set();
  private statusListeners: Set<SyncStatusCallback> = new Set();
  private currentStatus: SyncStatus = 'connecting';
  private supabaseChannel: any = null;
  private deviceId: string;

  constructor() {
    this.deviceId = 'dev_' + Math.random().toString(36).substring(2, 9);
    this.initialize();
  }

  /**
   * Initialize connection to Supabase or HTML5 BroadcastChannel
   */
  private initialize() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

    // Check if Tier A (Supabase) is configured
    if (supabaseUrl && supabaseKey && typeof supabaseUrl === 'string' && supabaseUrl.startsWith('http')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          realtime: {
            params: {
              eventsPerSecond: 15,
            },
          },
        });

        this.supabaseChannel = this.supabase.channel(BROADCAST_CHANNEL_NAME, {
          config: { broadcast: { self: false } },
        });

        this.supabaseChannel
          .on('broadcast', { event: 'sync-event' }, ({ payload }: { payload: RealtimeEvent }) => {
            this.handleIncomingEvent(payload);
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              this.updateStatus('supabase-active');
              // Request current state from other active devices
              this.requestInitialSync();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              this.fallbackToBroadcastChannel();
            }
          });

        return;
      } catch (err) {
        console.warn('Supabase initialization failed, falling back to local BroadcastChannel:', err);
      }
    }

    // Default to Tier B: HTML5 BroadcastChannel
    this.fallbackToBroadcastChannel();
  }

  /**
   * Request other online devices to broadcast latest full state
   */
  public requestInitialSync() {
    this.sendEvent({
      type: 'REQUEST_SYNC',
      sourceDevice: this.deviceId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Activate Tier B: Native HTML5 BroadcastChannel
   */
  private fallbackToBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && typeof event.data === 'object' && 'type' in event.data) {
            this.handleIncomingEvent(event.data as RealtimeEvent);
          }
        };
        this.updateStatus('broadcast-active');
      } else {
        this.updateStatus('offline');
      }
    } catch (e) {
      console.warn('HTML5 BroadcastChannel unavailable:', e);
      this.updateStatus('offline');
    }
  }

  /**
   * Dispatch received event to all registered listeners
   */
  private handleIncomingEvent(event: RealtimeEvent) {
    this.eventListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (e) {
        console.error('Error executing realtime event listener:', e);
      }
    });
  }

  /**
   * Update sync status and notify status listeners
   */
  private updateStatus(newStatus: SyncStatus) {
    this.currentStatus = newStatus;
    const info = this.getStatusInfo();
    this.statusListeners.forEach((listener) => {
      try {
        listener(info);
      } catch (e) {
        console.error('Error executing status listener:', e);
      }
    });
  }

  /**
   * Get current sync status descriptor
   */
  public getStatusInfo(): SyncStatusInfo {
    switch (this.currentStatus) {
      case 'supabase-active':
        return {
          status: 'supabase-active',
          label: '雲端同步 (全台門市連線中)',
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-300',
          isRealtimeTierA: true,
        };
      case 'broadcast-active':
        return {
          status: 'broadcast-active',
          label: '本地廣播同步中',
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-300',
          isRealtimeTierA: false,
        };
      case 'connecting':
        return {
          status: 'connecting',
          label: '雲端連線中...',
          badgeClass: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 text-amber-700 dark:text-amber-300',
          isRealtimeTierA: false,
        };
      case 'offline':
      default:
        return {
          status: 'offline',
          label: '單機離線模式 (待同步)',
          badgeClass: 'bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-600 dark:text-slate-400',
          isRealtimeTierA: false,
        };
    }
  }

  /**
   * Subscribe to real-time events
   */
  public subscribe(callback: RealtimeEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  /**
   * Subscribe to status changes
   */
  public onStatusChange(callback: SyncStatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.getStatusInfo());
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Atomic CAS stock deduction verification
   */
  public atomicDeductCheck(
    currentStock: number,
    quantity: number
  ): { allowed: boolean; newStock: number; error?: string } {
    if (quantity <= 0) {
      return { allowed: true, newStock: currentStock + Math.abs(quantity) };
    }

    if (currentStock < quantity) {
      return {
        allowed: false,
        newStock: currentStock,
        error: `庫存不足！當前僅餘 ${currentStock} 雙，無法出庫 ${quantity} 雙`,
      };
    }

    return {
      allowed: true,
      newStock: currentStock - quantity,
    };
  }

  /**
   * Broadcast a completed sale across all devices
   */
  public broadcastSale(sale: SaleRecord) {
    this.sendEvent({
      type: 'SALE_COMPLETED',
      sale,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast a voided/refunded sale across all devices
   */
  public broadcastVoidSale(saleId: string) {
    this.sendEvent({
      type: 'SALE_VOIDED',
      saleId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast stock deduction
   */
  public broadcastDeduction(payload: InventoryDeductPayload, newStock?: number) {
    const event: RemoteDeductEvent = {
      type: 'STOCK_DEDUCTED',
      variantId: payload.variantId,
      productId: payload.productId,
      delta: payload.quantity,
      newStock,
      sourceDevice: this.deviceId,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    this.sendEvent(event);
  }

  /**
   * Broadcast single variant update
   */
  public broadcastVariantUpdate(variantId: string, productId: string, newStock: number) {
    const event: RemoteUpdateEvent = {
      type: 'STOCK_UPDATED',
      variantId,
      productId,
      newStock,
      timestamp: new Date().toISOString(),
    };
    this.sendEvent(event);
  }

  /**
   * Broadcast full inventory sync
   */
  public broadcastSync(products: ProductWithVariants[], sales?: SaleRecord[]) {
    const event: RemoteSyncEvent = {
      type: 'INVENTORY_SYNC',
      products,
      sales,
      timestamp: new Date().toISOString(),
    };
    this.sendEvent(event);
  }

  /**
   * Broadcast reset event
   */
  public broadcastReset() {
    const event: RemoteResetEvent = {
      type: 'INVENTORY_RESET',
      timestamp: new Date().toISOString(),
    };
    this.sendEvent(event);
  }

  /**
   * Broadcast a newly added stock-in batch across all devices
   */
  public broadcastStockIn(record: StockInRecord) {
    this.sendEvent({
      type: 'STOCK_IN_RECORDED',
      record,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast revised stock-in records across all devices
   */
  public broadcastStockInRevised(supersededRecordIds: string[], revisedRecords: StockInRecord[]) {
    this.sendEvent({
      type: 'STOCK_IN_REVISED',
      supersededRecordIds,
      revisedRecords,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast a vendor return record across all devices
   */
  public broadcastVendorReturn(record: VendorReturnRecord) {
    this.sendEvent({
      type: 'VENDOR_RETURN_RECORDED',
      record,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast a customer sale returned across all devices
   */
  public broadcastSaleReturned(saleId: string, reason: string, note?: string) {
    const returnTimestamp = new Date().toISOString();
    this.sendEvent({
      type: 'SALE_RETURNED',
      saleId,
      reason,
      note,
      returnTimestamp,
      timestamp: returnTimestamp,
    });
  }

  /**
   * Broadcast a newly created reservation across all devices
   */
  public broadcastReservationCreated(reservation: ReservationRecord) {
    this.sendEvent({
      type: 'RESERVATION_CREATED',
      reservation,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast a reservation update (e.g. auto arrived, cancelled) across all devices
   */
  public broadcastReservationUpdated(reservationId: string, updates: Partial<ReservationRecord>) {
    this.sendEvent({
      type: 'RESERVATION_UPDATED',
      reservationId,
      updates,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast full reservations list sync across all devices
   */
  public broadcastReservationsSync(reservations: ReservationRecord[]) {
    this.sendEvent({
      type: 'RESERVATIONS_SYNC',
      reservations,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast a deleted reservation ID across all devices
   */
  public broadcastReservationDeleted(reservationId: string) {
    this.sendEvent({
      type: 'RESERVATION_DELETED',
      reservationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Fetch persistent state from Supabase database table if available
   */
  public async fetchCloudState(): Promise<{
    products?: ProductWithVariants[];
    sales?: SaleRecord[];
    stockIns?: StockInRecord[];
    vendorReturns?: VendorReturnRecord[];
    reservations?: ReservationRecord[];
  } | null> {
    if (!this.supabase) return null;
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      // Do not fetch production cloud database during automated test runs
      return null;
    }
    try {
      const { data, error } = await this.supabase
        .from('shoe_store_state')
        .select('*');

      if (error || !data) return null;

      const result: {
        products?: ProductWithVariants[];
        sales?: SaleRecord[];
        stockIns?: StockInRecord[];
        vendorReturns?: VendorReturnRecord[];
        reservations?: ReservationRecord[];
      } = {};
      data.forEach((row: any) => {
        if (row.key === 'inventory' && Array.isArray(row.data)) {
          result.products = row.data;
        } else if (row.key === 'sales' && Array.isArray(row.data)) {
          result.sales = row.data;
        } else if (row.key === 'stock_ins' && Array.isArray(row.data)) {
          result.stockIns = row.data;
        } else if (row.key === 'vendor_returns' && Array.isArray(row.data)) {
          result.vendorReturns = row.data;
        } else if (row.key === 'reservations' && Array.isArray(row.data)) {
          result.reservations = row.data;
        }
      });

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Save state to Supabase database table if available
   */
  public async saveCloudState(
    products: ProductWithVariants[],
    sales: SaleRecord[],
    stockIns?: StockInRecord[],
    vendorReturns?: VendorReturnRecord[],
    reservations?: ReservationRecord[]
  ) {
    if (!this.supabase) return;
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      // Do not write into production cloud database during automated test runs
      return;
    }
    try {
      const operations = [
        this.supabase.from('shoe_store_state').upsert({
          key: 'inventory',
          data: products,
          updated_at: new Date().toISOString(),
        }),
        this.supabase.from('shoe_store_state').upsert({
          key: 'sales',
          data: sales,
          updated_at: new Date().toISOString(),
        }),
      ];
      if (stockIns) {
        operations.push(
          this.supabase.from('shoe_store_state').upsert({
            key: 'stock_ins',
            data: stockIns,
            updated_at: new Date().toISOString(),
          })
        );
      }
      if (vendorReturns) {
        operations.push(
          this.supabase.from('shoe_store_state').upsert({
            key: 'vendor_returns',
            data: vendorReturns,
            updated_at: new Date().toISOString(),
          })
        );
      }
      if (reservations) {
        operations.push(
          this.supabase.from('shoe_store_state').upsert({
            key: 'reservations',
            data: reservations,
            updated_at: new Date().toISOString(),
          })
        );
      }
      await Promise.all(operations);
    } catch (e) {
      // Ignored if table not created yet; realtime broadcast still handles live cross-device sync
    }
  }

  /**
   * Dedicated method to save reservations to Supabase
   */
  public async saveCloudReservations(reservations: ReservationRecord[]) {
    if (!this.supabase) return;
    if (typeof navigator !== 'undefined' && navigator.webdriver) return;
    try {
      await this.supabase.from('shoe_store_state').upsert({
        key: 'reservations',
        data: reservations,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed to save reservations to Supabase:', e);
    }
  }

  /**
   * Low-level dispatch to active tier
   */
  private sendEvent(event: RealtimeEvent) {
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      // Isolate tests to local broadcast channel only
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage(event);
        } catch (err) {}
      }
      return;
    }

    // 1. Send via Supabase WebSocket if active
    if (this.supabaseChannel && this.currentStatus === 'supabase-active') {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'sync-event',
          payload: event,
        });
      } catch (err) {
        console.warn('Supabase broadcast failed:', err);
      }
    }

    // 2. Always also broadcast locally via BroadcastChannel for multi-tab
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(event);
      } catch (err) {
        console.warn('BroadcastChannel postMessage failed:', err);
      }
    }
  }

  /**
   * Clean up resources
   */
  public destroy() {
    this.eventListeners.clear();
    this.statusListeners.clear();
    if (this.supabaseChannel) {
      this.supabaseChannel.unsubscribe();
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeSyncService();
