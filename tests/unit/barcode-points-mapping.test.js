import { describe, it, expect, beforeEach } from 'vitest';
import { mapPointsToDisplay } from '../../frontend/src/features/nutrition/barcode-decoder.js';

/**
 * `mapPointsToDisplay` converts ZXing ResultPoint coordinates (in video-pixel
 * space) to CSS pixel coordinates on the displayed <video> element, handling
 * the `object-fit: cover` crop so the highlight polygon lines up with the
 * visible frame — not the raw source resolution.
 */

function mockVideo({ videoWidth, videoHeight, displayWidth, displayHeight }) {
  return {
    videoWidth,
    videoHeight,
    getBoundingClientRect() {
      return {
        width: displayWidth,
        height: displayHeight,
        top: 0,
        left: 0,
        right: displayWidth,
        bottom: displayHeight
      };
    }
  };
}

describe('mapPointsToDisplay', () => {
  it('returns null when the video has no dimensions yet', () => {
    const video = mockVideo({ videoWidth: 0, videoHeight: 0, displayWidth: 0, displayHeight: 0 });
    expect(mapPointsToDisplay([{ x: 10, y: 10 }], video)).toBeNull();
  });

  it('returns null for empty points array', () => {
    const video = mockVideo({ videoWidth: 1280, videoHeight: 720, displayWidth: 400, displayHeight: 300 });
    expect(mapPointsToDisplay([], video)).toBeNull();
    expect(mapPointsToDisplay(null, video)).toBeNull();
  });

  it('scales points when video and display share the same aspect ratio', () => {
    // 16:9 source → 16:9 display (no crop)
    const video = mockVideo({ videoWidth: 1280, videoHeight: 720, displayWidth: 640, displayHeight: 360 });
    const points = [{ x: 640, y: 360 }]; // center of video
    const mapped = mapPointsToDisplay(points, video);
    expect(mapped[0].x).toBeCloseTo(320, 1); // center of display
    expect(mapped[0].y).toBeCloseTo(180, 1);
  });

  it('crops horizontally when video is wider than the display box (object-fit: cover)', () => {
    // 16:9 video displayed in a 4:3 box → width gets clipped
    const video = mockVideo({ videoWidth: 1920, videoHeight: 1080, displayWidth: 400, displayHeight: 300 });
    // scaleY = 300/1080 ≈ 0.2778  → scaledW ≈ 533, excess 133 px split = 66.67 each side
    // Video center (960, 540) → (960 * 0.2778 - 66.67, 540 * 0.2778) ≈ (200, 150) = display center
    const mapped = mapPointsToDisplay([{ x: 960, y: 540 }], video);
    expect(mapped[0].x).toBeCloseTo(200, 0);
    expect(mapped[0].y).toBeCloseTo(150, 0);
  });

  it('crops vertically when video is narrower/taller than the display box', () => {
    // 3:4 portrait video displayed in a 4:3 landscape box
    const video = mockVideo({ videoWidth: 600, videoHeight: 800, displayWidth: 400, displayHeight: 300 });
    // scaleX = 400/600 ≈ 0.6667 → scaledH ≈ 533, excess 233 px split = 116.67 each side
    // Video center (300, 400) → (300*0.6667, 400*0.6667 - 116.67) ≈ (200, 150)
    const mapped = mapPointsToDisplay([{ x: 300, y: 400 }], video);
    expect(mapped[0].x).toBeCloseTo(200, 0);
    expect(mapped[0].y).toBeCloseTo(150, 0);
  });

  it('maps the four corners of a barcode polygon correctly', () => {
    const video = mockVideo({ videoWidth: 1280, videoHeight: 720, displayWidth: 640, displayHeight: 360 });
    const corners = [
      { x: 320, y: 180 },  // top-left of a small region
      { x: 960, y: 180 },
      { x: 960, y: 540 },
      { x: 320, y: 540 }
    ];
    const mapped = mapPointsToDisplay(corners, video);
    expect(mapped).toHaveLength(4);
    expect(mapped[0].x).toBeCloseTo(160, 1);
    expect(mapped[0].y).toBeCloseTo(90, 1);
    expect(mapped[2].x).toBeCloseTo(480, 1);
    expect(mapped[2].y).toBeCloseTo(270, 1);
  });

  it('handles the common phone case: 1080p camera in a ~300x400 portrait viewport', () => {
    // 16:9 rear camera (1920x1080) displayed in a 3:4-ish portrait box
    const video = mockVideo({ videoWidth: 1920, videoHeight: 1080, displayWidth: 300, displayHeight: 400 });
    // Video is wider than display → height fills, width clipped
    // scaleY = 400/1080 ≈ 0.3704 → scaledW ≈ 711, excess ≈ 411, split ≈ 205.5
    // Video center (960, 540) → (960 * 0.3704 - 205.5, 540 * 0.3704) ≈ (150, 200)
    const mapped = mapPointsToDisplay([{ x: 960, y: 540 }], video);
    expect(mapped[0].x).toBeCloseTo(150, 0);
    expect(mapped[0].y).toBeCloseTo(200, 0);
  });
});
