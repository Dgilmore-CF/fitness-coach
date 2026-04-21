/**
 * Cross-browser barcode decoder.
 *
 * Strategy:
 *   1. Native BarcodeDetector — Chrome / Edge / Android (instant, no deps)
 *   2. ZXing-js fallback loaded from CDN on-demand — Safari / Firefox / iOS
 *
 * The ZXing bundle is ~100 KB gzipped so we load it dynamically only when
 * the native API is missing AND the user actually opens the scanner. This
 * keeps the first-paint bundle small for the 90% of Chrome users who get
 * the native path.
 *
 * Public API:
 *   const decoder = createDecoder();
 *   await decoder.start(videoElement, onResult);   // returns when first code found
 *   decoder.stop();
 */

const SUPPORTED_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

// ZXing CDN — pinned to a specific version for reproducibility
const ZXING_CDN = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm';

let zxingModulePromise = null;

async function loadZXing() {
  if (!zxingModulePromise) {
    // Use a dynamic import with a non-literal URL so Vite doesn't try to
    // resolve it at build time
    zxingModulePromise = import(/* @vite-ignore */ ZXING_CDN)
      .catch((err) => {
        zxingModulePromise = null; // allow retry
        throw err;
      });
  }
  return zxingModulePromise;
}

export function hasNativeDetector() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export function hasCameraSupport() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Create a decoder instance. Call `.start(videoEl, onResult)` to begin
 * and `.stop()` to release resources.
 */
export function createDecoder() {
  let stream = null;
  let active = false;
  let zxingControls = null;
  let rafHandle = null;

  async function start(videoEl, onResult, onError) {
    if (!hasCameraSupport()) {
      onError?.(new Error('camera-unsupported'));
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
    } catch (err) {
      onError?.(err);
      return;
    }

    videoEl.srcObject = stream;
    try {
      await videoEl.play();
    } catch {
      // Autoplay may be blocked on iOS until user taps the video
    }
    active = true;

    // Route 1: native BarcodeDetector (fastest, Chrome/Edge/Android)
    if (hasNativeDetector()) {
      try {
        const detector = new window.BarcodeDetector({ formats: SUPPORTED_FORMATS });
        runNativeLoop(videoEl, detector, onResult);
        return;
      } catch (err) {
        // Some Chrome builds report BarcodeDetector but throw on construction.
        // Fall through to ZXing.
        console.warn('Native BarcodeDetector construction failed, falling back to ZXing:', err);
      }
    }

    // Route 2: ZXing-js fallback (Safari / Firefox / iOS / WebView)
    try {
      const zxing = await loadZXing();
      const { BrowserMultiFormatReader } = zxing;
      const reader = new BrowserMultiFormatReader();
      zxingControls = await reader.decodeFromVideoElement(videoEl, (result, err) => {
        if (!active || !result) return;
        try {
          const barcode = result.getText ? result.getText() : String(result);
          if (barcode) {
            onResult(barcode);
          }
        } catch (innerErr) {
          console.warn('ZXing result parse failed:', innerErr);
        }
      });
    } catch (err) {
      console.error('ZXing load failed:', err);
      onError?.(err);
    }
  }

  function runNativeLoop(videoEl, detector, onResult) {
    const tick = async () => {
      if (!active || !videoEl.isConnected) return;
      if (videoEl.readyState < 2 || !videoEl.videoWidth) {
        rafHandle = requestAnimationFrame(tick);
        return;
      }
      try {
        const codes = await detector.detect(videoEl);
        if (codes.length > 0) {
          const barcode = codes[0].rawValue;
          if (barcode) {
            onResult(barcode);
            return;
          }
        }
      } catch {
        // Transient detection error — just try again next frame
      }
      rafHandle = requestAnimationFrame(tick);
    };
    tick();
  }

  function stop() {
    active = false;
    if (rafHandle) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    if (zxingControls) {
      try {
        zxingControls.stop();
      } catch {}
      zxingControls = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  return { start, stop };
}
