import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Minus,
  Sparkles,
  RefreshCw,
  Search,
} from 'lucide-react';
import { ProductWithVariants, ShoeVariant, getStockLevel } from '../../types/inventory';
import { formatCurrency } from '../../utils/formatters';
import { findProductByBarcode, getMockBarcodeOptions } from '../../services/barcodeService';

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductWithVariants[];
  onDeduct?: (variantId: string, quantity: number) => void;
  onSelectProduct?: (product: ProductWithVariants, variant?: ShoeVariant | null) => void;
  onLocateShelf?: (target: {
    productId: string;
    variantId: string;
    displayLocation: string;
    storageLocation: string;
  }) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onDeduct,
  onSelectProduct,
  onLocateShelf,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'mock' | 'manual'>('camera');
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [matchedProduct, setMatchedProduct] = useState<ProductWithVariants | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ShoeVariant | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const mockOptions = getMockBarcodeOptions(products);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Handle scanned/selected code
  const handleProcessCode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;

      setScannedBarcode(code);
      const product = findProductByBarcode(products, code);

      if (product) {
        setMatchedProduct(product);
        setCameraError(null);
        setScanFeedback(`成功辨識商品：${product.brand} ${product.name}`);

        // Automatically pick the first available variant with stock, or first variant
        const available = product.variants.find((v) => v.stock > 0) || product.variants[0];
        setSelectedVariant(available || null);
      } else {
        setMatchedProduct(null);
        setSelectedVariant(null);
        setScanFeedback(null);
        setCameraError(`查無此條碼或款號 (${code}) 之商品資料`);
      }
    },
    [products]
  );

  // Start real camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    // If mediaDevices is not available (e.g. headless environment or insecure context)
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError('當前環境不支援調用鏡頭，已為您切換至模擬條碼快選模式');
      setActiveTab((prev) => (prev === 'camera' ? 'mock' : prev));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on mobile phones
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setIsScanning(true);

      // Check if native BarcodeDetector API is supported
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'upc_a', 'code_128', 'qr_code'],
          });

          scanIntervalRef.current = window.setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const rawValue = barcodes[0].rawValue;
                  handleProcessCode(rawValue);
                }
              } catch {
                // Ignore per-frame detection hiccups
              }
            }
          }, 300);
        } catch {
          // BarcodeDetector format not supported
        }
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('無法開啟手機鏡頭（請確認鏡頭存取權限），已切換為模擬快速選單模式');
      setActiveTab((prev) => (prev === 'camera' ? 'mock' : prev));
    }
  }, [handleProcessCode, stopCamera]);

  // Manage camera lifecycle
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'camera') {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
      setScannedBarcode('');
      setMatchedProduct(null);
      setSelectedVariant(null);
      setCameraError(null);
      setScanFeedback(null);
      setManualInput('');
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Keep matched product up to date when central products state updates
  useEffect(() => {
    if (matchedProduct) {
      const fresh = products.find((p) => p.id === matchedProduct.id);
      if (fresh) {
        setMatchedProduct(fresh);
        if (selectedVariant) {
          const freshVariant = fresh.variants.find((v) => v.id === selectedVariant.id);
          if (freshVariant) {
            setSelectedVariant(freshVariant);
          }
        }
      }
    }
  }, [products, matchedProduct, selectedVariant]);

  if (!isOpen) return null;

  // Single-tap deduction on matched product's selected size
  const handleDeduct = () => {
    if (!selectedVariant || !matchedProduct) return;
    if (selectedVariant.stock <= 0) return;

    if (onDeduct) {
      onDeduct(selectedVariant.id, 1);
    }
    const sizeText = selectedVariant.sizeDisplay || (selectedVariant.sizeUS % 1 === 0 ? `US ${selectedVariant.sizeUS.toFixed(1)}` : `US ${selectedVariant.sizeUS}`);
    setScanFeedback(`已出庫扣減 1 雙 ${matchedProduct.name} (${sizeText})！`);
  };

  // 1-click navigate to shelf
  const handleLocate = () => {
    if (!matchedProduct || !selectedVariant || !onLocateShelf) return;
    onLocateShelf({
      productId: matchedProduct.id,
      variantId: selectedVariant.id,
      displayLocation: matchedProduct.displayLocation,
      storageLocation: matchedProduct.storageLocation,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                手機掃碼極速調庫
              </h3>
              <p className="text-xs text-slate-400">
                支援鞋盒 EAN-13 / UPC-A 條碼掃描與 1 鍵出庫
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="關閉"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-3 pb-2 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl text-xs font-semibold w-full">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                activeTab === 'camera'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>相機鏡頭</span>
            </button>
            <button
              onClick={() => setActiveTab('mock')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                activeTab === 'mock'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>模擬快選</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                activeTab === 'manual'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>手動輸入</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* TAB 1: Camera Scanner View */}
          {activeTab === 'camera' && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 flex items-center justify-center border border-slate-800 shadow-inner">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
                autoPlay
              />

              {/* Viewfinder Target Graphic */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="relative w-64 h-40 border-2 border-indigo-400/80 rounded-xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  {/* Scanning Laser Line */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse top-1/2 -translate-y-1/2 shadow-lg shadow-red-500/50"></div>

                  {/* Corner Accent Brackets */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white"></div>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white"></div>

                  <span className="text-[11px] font-medium text-white/80 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    將條碼對準框線內
                  </span>
                </div>
              </div>

              {/* Camera Action Control */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-xs text-white/90">
                <span className="flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px]">
                  <ScanLine className="w-3 h-3 text-indigo-400 animate-pulse" />
                  <span>{isScanning ? '辨識鏡頭運行中' : '等待鏡頭開啟'}</span>
                </span>
                <button
                  onClick={startCamera}
                  className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xs flex items-center gap-1 cursor-pointer transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>重啟鏡頭</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Mock Dropdown Selector (Required for automated tests & headless environments) */}
          {activeTab === 'mock' && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="mock-barcode-select"
                  className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>快速模擬條碼 (自動化測試 / CI 專用)</span>
                </label>
                <span className="text-[11px] text-indigo-500 font-mono">1-Tap 模擬掃碼</span>
              </div>

              <select
                id="mock-barcode-select"
                data-testid="mock-barcode-select"
                value={scannedBarcode}
                onChange={(e) => handleProcessCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
              >
                <option value="">-- 請選擇欲模擬掃描的鞋款條碼 --</option>
                {mockOptions.map((opt) => (
                  <option key={`${opt.barcode}-${opt.sku}`} value={opt.barcode}>
                    [{opt.brand}] {opt.name} ({opt.sku}) &bull; {opt.barcode}
                  </option>
                ))}
              </select>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                提示：選擇清單中任意預載條碼即可模擬相機瞬間辨識成功，調出對應商品與各尺碼即時庫存。
              </p>
            </div>
          )}

          {/* TAB 3: Manual Code / SKU Input */}
          {activeTab === 'manual' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessCode(manualInput);
              }}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <label
                htmlFor="manual-barcode-input"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-indigo-500" />
                <span>手動輸入鞋盒條碼或貨號 (SKU)</span>
              </label>

              <div className="flex gap-2">
                <input
                  id="manual-barcode-input"
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="輸入如 196607831001 或 FD0655-001..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
                >
                  搜尋調出
                </button>
              </div>
            </form>
          )}

          {/* Feedback & Error Alerts */}
          {cameraError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{cameraError}</span>
            </div>
          )}

          {scanFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{scanFeedback}</span>
            </div>
          )}

          {/* MATCHED PRODUCT CARD */}
          {matchedProduct && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 animate-in slide-in-from-bottom-2 duration-200">
              {/* Product Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                      {matchedProduct.brand}
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {matchedProduct.sku}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {matchedProduct.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{matchedProduct.color}</p>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(matchedProduct.retailPrice)}
                  </div>
                  <div className="text-[11px] text-slate-400">建議售價</div>
                </div>
              </div>

              {/* Physical Locations */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500">門市陳列：</span>
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {matchedProduct.displayLocation}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500">後倉儲放：</span>
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {matchedProduct.storageLocation}
                  </strong>
                </div>
              </div>

              {/* Size Matrix Selector */}
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>選擇鞋碼 (US / EU / CM)：</span>
                  {selectedVariant && (
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                      {selectedVariant.sizeDisplay || (selectedVariant.sizeUS % 1 === 0 ? `US ${selectedVariant.sizeUS.toFixed(1)}` : `US ${selectedVariant.sizeUS}`)} &bull; 在庫 {selectedVariant.stock} 雙
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                  {matchedProduct.variants.map((variant) => {
                    const isSelected = selectedVariant?.id === variant.id;
                    const level = getStockLevel(variant.stock);

                    let badgeColor = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200';
                    if (level === 'out') {
                      badgeColor = 'border-red-200 bg-red-50/70 text-red-700 dark:bg-red-950/40 dark:text-red-300';
                    } else if (level === 'warning') {
                      badgeColor = 'border-amber-200 bg-amber-50/70 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
                    } else {
                      badgeColor = 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
                    }

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`p-2 rounded-xl text-center border transition cursor-pointer flex flex-col items-center justify-center ${badgeColor} ${
                          isSelected ? 'ring-2 ring-indigo-600 shadow-sm' : 'hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-xs font-bold font-mono">
                          {variant.sizeDisplay || (variant.sizeUS % 1 === 0 ? `US ${variant.sizeUS.toFixed(1)}` : `US ${variant.sizeUS}`)}
                        </span>
                        <span className="text-[10px] font-semibold mt-0.5">
                          {variant.stock === 0 ? '斷碼' : `${variant.stock}雙`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Bar: Select for Sale OR Instant Deduction */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                {onSelectProduct ? (
                  <button
                    type="button"
                    data-testid="btn-scanner-select-product"
                    onClick={() => {
                      if (matchedProduct) {
                        onSelectProduct(matchedProduct, selectedVariant);
                        onClose();
                      }
                    }}
                    className="flex-1 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-98 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>帶入此商品開單 ({selectedVariant?.sizeDisplay || (selectedVariant ? `US ${selectedVariant.sizeUS.toFixed(1)}` : '8.5')})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="btn-scanner-deduct"
                    onClick={handleDeduct}
                    disabled={!selectedVariant || selectedVariant.stock <= 0}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                      !selectedVariant || selectedVariant.stock <= 0
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-98'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span>
                      {!selectedVariant
                        ? '請選擇尺碼'
                        : selectedVariant.stock <= 0
                        ? `${selectedVariant.sizeDisplay || `US ${selectedVariant.sizeUS}`} 斷碼缺貨`
                        : `確認售出 -1 雙 (${selectedVariant.sizeDisplay || `US ${selectedVariant.sizeUS}`})`}
                    </span>
                  </button>
                )}

                {onLocateShelf && (
                  <button
                    type="button"
                    onClick={handleLocate}
                    className="py-3 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="導航至店面與後倉架位"
                  >
                    <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>架位導航</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>支援 EAN-13 / UPC-A / 店面架位查詢</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-medium transition cursor-pointer"
          >
            完成關閉
          </button>
        </div>
      </div>
    </div>
  );
};
