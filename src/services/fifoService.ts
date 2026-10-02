import { ProductWithVariants, ShoeVariant, InventoryBatch } from '../types/inventory';

/**
 * Ensure a ShoeVariant has a valid FIFO batches queue.
 * Seamlessly migrates legacy variants without batches by wrapping their current stock into an initial batch.
 */
export function ensureVariantBatches(variant: ShoeVariant, fallbackCost: number = 0): InventoryBatch[] {
  if (Array.isArray(variant.batches) && variant.batches.length > 0) {
    // Sort ascending by timestamp (FIFO: earliest first)
    return [...variant.batches].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  const currentStock = Math.max(0, variant.stock || 0);
  if (currentStock > 0) {
    return [
      {
        id: `batch-init-${variant.id}`,
        timestamp: '2026-01-01T00:00:00.000Z',
        costPrice: Math.max(0, fallbackCost),
        initialStock: currentStock,
        remainingStock: currentStock,
      },
    ];
  }

  return [];
}

export interface FifoDeductResult {
  updatedVariant: ShoeVariant;
  costPrice: number; // Unit cost price for this deduction (or weighted avg if qty > 1)
  totalCost: number;
  batchId?: string;
  stockInOrderId?: string;
  consumedBatches: {
    batchId: string;
    orderId?: string;
    quantity: number;
    costPrice: number;
  }[];
}

/**
 * Deducts stock from a variant using First-In, First-Out (FIFO) logic.
 * Consumes earliest batches with remainingStock > 0 first.
 */
export function deductFifoVariantStock(
  variant: ShoeVariant,
  quantity: number = 1,
  fallbackCost: number = 0
): FifoDeductResult {
  const currentBatches = ensureVariantBatches(variant, fallbackCost);
  const consumedBatches: FifoDeductResult['consumedBatches'] = [];

  let remainingToDeduct = Math.max(1, quantity);
  let totalCost = 0;
  let primaryBatchId: string | undefined;
  let primaryOrderId: string | undefined;

  const updatedBatches = currentBatches.map((batch) => {
    if (remainingToDeduct <= 0 || batch.remainingStock <= 0) {
      return batch;
    }

    const take = Math.min(batch.remainingStock, remainingToDeduct);
    remainingToDeduct -= take;
    totalCost += take * batch.costPrice;

    if (!primaryBatchId) {
      primaryBatchId = batch.id;
      primaryOrderId = batch.stockInOrderId;
    }

    consumedBatches.push({
      batchId: batch.id,
      orderId: batch.stockInOrderId,
      quantity: take,
      costPrice: batch.costPrice,
    });

    return {
      ...batch,
      remainingStock: batch.remainingStock - take,
    };
  });

  // If quantity exceeded all batch stocks (oversold / zero stock scenario)
  if (remainingToDeduct > 0) {
    const extraCost = remainingToDeduct * Math.max(0, fallbackCost);
    totalCost += extraCost;
    consumedBatches.push({
      batchId: 'untracked-excess',
      quantity: remainingToDeduct,
      costPrice: Math.max(0, fallbackCost),
    });
  }

  const effectiveQty = Math.max(1, quantity);
  const unitCost = Math.round((totalCost / effectiveQty) * 100) / 100;
  const newStock = Math.max(0, variant.stock - quantity);

  return {
    updatedVariant: {
      ...variant,
      stock: newStock,
      batches: updatedBatches,
    },
    costPrice: unitCost,
    totalCost,
    batchId: primaryBatchId,
    stockInOrderId: primaryOrderId,
    consumedBatches,
  };
}

/**
 * Restores stock back to a variant using FIFO logic upon customer return or exchange rollback.
 */
export function restoreFifoVariantStock(
  variant: ShoeVariant,
  quantity: number = 1,
  costPrice: number = 0,
  batchId?: string,
  stockInOrderId?: string
): ShoeVariant {
  const currentBatches = ensureVariantBatches(variant, costPrice);
  const qtyToRestore = Math.max(1, quantity);
  let restored = false;

  const updatedBatches = currentBatches.map((batch) => {
    if (batchId && batch.id === batchId) {
      restored = true;
      return {
        ...batch,
        remainingStock: batch.remainingStock + qtyToRestore,
      };
    }
    return batch;
  });

  if (!restored) {
    // Put as a restored batch at the beginning of the queue for next FIFO consumption
    const returnBatch: InventoryBatch = {
      id: batchId || `batch-return-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stockInOrderId,
      timestamp: new Date().toISOString(),
      costPrice: Math.max(0, costPrice),
      initialStock: qtyToRestore,
      remainingStock: qtyToRestore,
    };
    // Unshift so returned item is sold first in next sale
    updatedBatches.unshift(returnBatch);
  }

  const newStock = variant.stock + qtyToRestore;

  return {
    ...variant,
    stock: newStock,
    batches: updatedBatches,
  };
}

/**
 * Appends a new stock-in batch to the variant's FIFO queue.
 */
export function addBatchToVariant(
  variant: ShoeVariant,
  quantity: number,
  costPrice: number,
  stockInId?: string,
  stockInOrderId?: string,
  timestamp: string = new Date().toISOString()
): ShoeVariant {
  const currentBatches = ensureVariantBatches(variant, costPrice);
  const addQty = Math.max(0, quantity);

  if (addQty === 0) {
    return { ...variant, batches: currentBatches };
  }

  const newBatch: InventoryBatch = {
    id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    stockInId,
    stockInOrderId,
    timestamp,
    costPrice: Math.max(0, costPrice),
    initialStock: addQty,
    remainingStock: addQty,
  };

  const updatedBatches = [...currentBatches, newBatch];
  const newStock = variant.stock + addQty;

  return {
    ...variant,
    stock: newStock,
    batches: updatedBatches,
  };
}

/**
 * Calculates accurate total inventory valuation cost for a single variant based on FIFO batches.
 */
export function calculateVariantInventoryCost(variant: ShoeVariant, fallbackCost: number = 0): number {
  if (Array.isArray(variant.batches) && variant.batches.length > 0) {
    return variant.batches.reduce(
      (sum, b) => sum + Math.max(0, b.remainingStock) * Math.max(0, b.costPrice),
      0
    );
  }
  return Math.max(0, variant.stock) * Math.max(0, fallbackCost);
}

/**
 * Calculates accurate total inventory valuation cost for a product with variants using FIFO.
 */
export function calculateProductInventoryCost(product: ProductWithVariants): number {
  return product.variants.reduce(
    (sum, v) => sum + calculateVariantInventoryCost(v, product.costPrice),
    0
  );
}
