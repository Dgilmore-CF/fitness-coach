/**
 * Unified barcode decoder — ZXing-js on every browser.
 *
 * We previously used a split-brain approach (native BarcodeDetector on Chrome,
 * ZXing elsewhere). That produced two subtly different code paths and
 * inconsistent detection behaviour across devices. Consolidating on ZXing
 * costs ~100 KiB gzipped loaded once on first scan (cached by the browser
 * afterwards) in exchange for:
 *   - One code path for debugging and behavioural parity
 *   - Result points (polygon corners) for overlay highlighting
 *   - Multi-format detection out of the box
 *   - A mature, battle-tested library used by most Android food apps
 *
 * Public API:
 *   const decoder = createDecoder();
 *   const { camera } = await decoder.start(videoEl, onResult, onError);
 *   // camera.capabilities → { torch, zoom, focus } feature flags
 *   // camera.setTorch(on), camera.setZoom(v), camera.refocus({x,y})
 *   decoder.stop();
 */

// Pinned ZXing ESM build — stable, small (~100 KiB gzipped), supports all
// major 1D retail formats (EAN-13, EAN-8, UPC-A, UPC-E, Code-128, Code-39).
const ZXING_CDN = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm';

let zxingModulePromise = null;

async function loadZXing() {
  if (!zxingModulePromise) {
    // Non-literal URL so Vite doesn't try to resolve it at build time.
    zxingModulePromise = import(/* @vite-ignore */ ZXING_CDN).catch((err) => {
      zxingModulePromise = null; // allow retry on next open
      throw err;
    });
  }
  return zxingModulePromise;
}

export function hasCameraSupport() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Inspect a MediaStreamTrack to find out which camera features we can drive.
 * Returns a shape the UI layer can use to decide which controls to render.
 */
function readCapabilities(track) {
  let raw = {};
  try {
    raw = typeof track?.getCapabilities === 'function' ? track.getCapabilities() : {};
  } catch {
    raw = {};
  }

  return {
    torch: raw.torch === true,
    zoom: raw.zoom && typeof raw.zoom.min === 'number' && typeof raw.zoom.max === 'number'
      ? { min: raw.zoom.min, max: raw.zoom.max, step: raw.zoom.step || 0.1 }
      : null,
    focusMode: Array.isArray(raw.focusMode) ? raw.focusMode : [],
    pointsOfInterest: Array.isArray(raw.focusDistance) || raw.pointsOfInterest !== undefined
  };
}

/**
 * Bundle of per-track camera controls exposed to the UI. Each setter returns
 * a Promise that resolves `true` if the constraint was applied, `false`
 * otherwise. The underlying `applyConstraints()` call is asynchronous and
 * can silently ignore constraints the device doesn't support — we treat
 * any rejection as a no-op so the UI never breaks.
 */
function createCameraControls(track, capabilities) {
  async function applyAdvanced(constraint) {
    if (!track) return false;
    try {
      await track.applyConstraints({ advanced: [constraint] });
      return true;
    } catch (err) {
      console.warn('applyConstraints failed:', constraint, err?.message);
      return false;
    }
  }

  return {
    capabilities,
    setTorch(on) {
      if (!capabilities.torch) return Promise.resolve(false);
      return applyAdvanced({ torch: !!on });
    },
    setZoom(value) {
      if (!capabilities.zoom) return Promise.resolve(false);
      const clamped = Math.min(
        capabilities.zoom.max,
        Math.max(capabilities.zoom.min, Number(value) || capabilities.zoom.min)
      );
      return applyAdvanced({ zoom: clamped });
    },
    refocus({ x = 0.5, y = 0.5 } = {}) {
      // Not all devices support pointsOfInterest; tell camera to re-focus
      // at the center of the frame if possible.
      const constraints = {};
      if (capabilities.focusMode.includes('single-shot')) {
        constraints.focusMode = 'single-shot';
      } else if (capabilities.focusMode.includes('continuous')) {
        constraints.focusMode = 'continuous';
      }
      if (capabilities.pointsOfInterest) {
        constraints.pointsOfInterest = [{ x, y }];
      }
      if (Object.keys(constraints).length === 0) return Promise.resolve(false);
      return applyAdvanced(constraints);
    }
  };
}

/**
 * Create a decoder instance. Call `.start(videoEl, onResult, onError)`.
 *
 * @param {HTMLVideoElement} videoEl
 * @param {(barcode: string, result?: object) => void} onResult - called when
 *   a barcode is found. `result` has `.resultPoints` (array of {x,y} in
 *   video-pixel coordinates) and `.format` (string).
 * @param {(err: Error) => void} [onError]
 * @returns {Promise<{ camera: object }>} — resolves once the camera is
 *   running and the ZXing decode loop is attached. Access `camera` to
 *   control torch / zoom / focus. Call `.stop()` on the decoder to release.
 */
export function createDecoder() {
  let stream = null;
  let active = false;
  let zxingControls = null;
  let zxingReader = null;

  async function start(videoEl, onResult, onError) {
    if (!hasCameraSupport()) {
      onError?.(new Error('camera-unsupported'));
      return { camera: null };
    }

    // 1. Acquire the camera stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          // Nudge the browser to prefer a higher-resolution stream where
          // available so small barcodes are still decodable.
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
    } catch (err) {
      onError?.(err);
      return { camera: null };
    }

    // 2. Wire the stream into the video element + attempt to play
    videoEl.srcObject = stream;
    try {
      await videoEl.play();
    } catch {
      // iOS Safari may block autoplay until user taps; ZXing will
      // still decode once metadata is loaded.
    }
    active = true;

    // 3. Read track capabilities for feature-detection-based UX controls
    const track = stream.getVideoTracks?.()[0];
    const capabilities = readCapabilities(track);
    const camera = createCameraControls(track, capabilities);

    // Best-effort: prefer continuous auto-focus for live scanning
    if (capabilities.focusMode.includes('continuous')) {
      camera.refocus({ x: 0.5, y: 0.5 });
    }

    // 4. Load ZXing (lazy, on-demand, cached after first scan)
    try {
      const zxing = await loadZXing();
      const { BrowserMultiFormatReader } = zxing;
      zxingReader = new BrowserMultiFormatReader();
      zxingControls = await zxingReader.decodeFromVideoElement(videoEl, (result, err) => {
        if (!active || !result) return;
        try {
          const barcode = result.getText ? result.getText() : String(result);
          if (!barcode) return;

          // Extract polygon corner points for the highlight overlay.
          let points = null;
          try {
            const raw = result.getResultPoints ? result.getResultPoints() : null;
            if (Array.isArray(raw) && raw.length > 0) {
              points = raw.map((p) => ({
                x: typeof p.getX === 'function' ? p.getX() : p.x,
                y: typeof p.getY === 'function' ? p.getY() : p.y
              }));
            }
          } catch {
            // Points are nice-to-have; ignore extraction errors
          }

          let format = null;
          try {
            format = result.getBarcodeFormat ? String(result.getBarcodeFormat()) : null;
          } catch {
            // ignore
          }

          onResult(barcode, { points, format });
        } catch (innerErr) {
          console.warn('Barcode result parse failed:', innerErr);
        }
      });
    } catch (err) {
      console.error('ZXing load failed:', err);
      onError?.(err);
    }

    return { camera };
  }

  function stop() {
    active = false;
    if (zxingControls) {
      try { zxingControls.stop(); } catch {}
      zxingControls = null;
    }
    zxingReader = null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  return { start, stop };
}

/**
 * Map decoded ResultPoints (in video-pixel coordinates) to the displayed
 * pixel coordinates of the <video> element, accounting for CSS sizing AND
 * the `object-fit: cover` crop that makes one axis clip.
 *
 * Returns `null` if the video dimensions aren't available yet.
 *
 * @param {Array<{x:number,y:number}>} points - raw points from ZXing
 * @param {HTMLVideoElement} videoEl
 * @returns {Array<{x:number,y:number}> | null}
 */
export function mapPointsToDisplay(points, videoEl) {
  if (!Array.isArray(points) || points.length === 0) return null;
  const vw = videoEl?.videoWidth;
  const vh = videoEl?.videoHeight;
  const rect = videoEl?.getBoundingClientRect?.();
  if (!vw || !vh || !rect?.width || !rect?.height) return null;

  const displayW = rect.width;
  const displayH = rect.height;

  // `object-fit: cover` means the video is scaled up to fill the box and
  // the excess on the shorter axis is cropped evenly on both sides.
  const videoAspect = vw / vh;
  const displayAspect = displayW / displayH;

  let scale, offsetX, offsetY;
  if (videoAspect > displayAspect) {
    // Video is wider than the box → height fills, width is cropped
    scale = displayH / vh;
    const scaledW = vw * scale;
    offsetX = (scaledW - displayW) / 2;
    offsetY = 0;
  } else {
    // Video is taller/narrower than the box → width fills, height is cropped
    scale = displayW / vw;
    const scaledH = vh * scale;
    offsetX = 0;
    offsetY = (scaledH - displayH) / 2;
  }

  return points.map((p) => ({
    x: p.x * scale - offsetX,
    y: p.y * scale - offsetY
  }));
}
