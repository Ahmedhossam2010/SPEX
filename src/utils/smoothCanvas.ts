/**
 * Smooth Image Resampling & High-DPR PSF Star Rendering Utilities
 *
 * Eliminates blocky nearest-neighbor pixelation across astronomy cutouts and starfield backgrounds
 * at both 1x and 2x devicePixelRatio while preserving exact raw arrays for scientific astrometry.
 */

function cubicWeight(t: number): number {
  // Catmull-Rom spline (a = -0.5) for crisp yet smooth continuous astronomical PSFs
  const a = -0.5;
  const x = Math.abs(t);
  if (x <= 1) {
    return (a + 2) * x * x * x - (a + 3) * x * x + 1;
  }
  if (x < 2) {
    return a * x * x * x - 5 * a * x * x + 8 * a * x - 4 * a;
  }
  return 0;
}

function clampByte(v: number): number {
  return v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v);
}

/**
 * Separable 2D Catmull-Rom bicubic upsampler on RGBA buffers.
 * Turns e.g. 64x64 SPHEREx cutouts into silky 256x256+ display imagery with soft PSF halos.
 */
export function bicubicUpsampleRgba(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Uint8ClampedArray {
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) {
    return new Uint8ClampedArray(0);
  }
  if (srcW === dstW && srcH === dstH) {
    return new Uint8ClampedArray(src);
  }

  // Horizontal pass: srcW x srcH -> dstW x srcH (Float32 intermediate preserves subpixel accuracy)
  const temp = new Float32Array(dstW * srcH * 4);
  const scaleX = srcW / dstW;

  for (let x = 0; x < dstW; x++) {
    const srcPos = (x + 0.5) * scaleX - 0.5;
    const base = Math.floor(srcPos);
    const frac = srcPos - base;
    const i0 = Math.max(0, Math.min(srcW - 1, base - 1));
    const i1 = Math.max(0, Math.min(srcW - 1, base));
    const i2 = Math.max(0, Math.min(srcW - 1, base + 1));
    const i3 = Math.max(0, Math.min(srcW - 1, base + 2));
    const w0 = cubicWeight(frac + 1);
    const w1 = cubicWeight(frac);
    const w2 = cubicWeight(frac - 1);
    const w3 = cubicWeight(frac - 2);
    const wSum = w0 + w1 + w2 + w3 || 1;

    for (let y = 0; y < srcH; y++) {
      const rowSrc = y * srcW * 4;
      const outIdx = (y * dstW + x) * 4;
      const p0 = rowSrc + i0 * 4;
      const p1 = rowSrc + i1 * 4;
      const p2 = rowSrc + i2 * 4;
      const p3 = rowSrc + i3 * 4;
      for (let c = 0; c < 4; c++) {
        temp[outIdx + c] =
          (src[p0 + c] * w0 + src[p1 + c] * w1 + src[p2 + c] * w2 + src[p3 + c] * w3) / wSum;
      }
    }
  }

  // Vertical pass: dstW x srcH -> dstW x dstH
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const scaleY = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const srcPos = (y + 0.5) * scaleY - 0.5;
    const base = Math.floor(srcPos);
    const frac = srcPos - base;
    const j0 = Math.max(0, Math.min(srcH - 1, base - 1)) * dstW * 4;
    const j1 = Math.max(0, Math.min(srcH - 1, base)) * dstW * 4;
    const j2 = Math.max(0, Math.min(srcH - 1, base + 1)) * dstW * 4;
    const j3 = Math.max(0, Math.min(srcH - 1, base + 2)) * dstW * 4;
    const w0 = cubicWeight(frac + 1);
    const w1 = cubicWeight(frac);
    const w2 = cubicWeight(frac - 1);
    const w3 = cubicWeight(frac - 2);
    const wSum = w0 + w1 + w2 + w3 || 1;
    const dstRow = y * dstW * 4;

    for (let x = 0; x < dstW; x++) {
      const x4 = x * 4;
      const outIdx = dstRow + x4;
      for (let c = 0; c < 4; c++) {
        const val =
          (temp[j0 + x4 + c] * w0 +
            temp[j1 + x4 + c] * w1 +
            temp[j2 + x4 + c] * w2 +
            temp[j3 + x4 + c] * w3) /
          wSum;
        dst[outIdx + c] = clampByte(val);
      }
    }
  }

  return dst;
}

/**
 * Compute target backing resolution & size CSS vs DPR cleanly (capped reasonably for GPU budget, >= 1x/2x crispness).
 */
export function getCanvasDpr(): number {
  if (typeof window === 'undefined') return 1;
  return Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
}

/**
 * Draw a soft astronomical PSF star glow (bright core + exponential airy halo) with zero hard blocky edges.
 */
export function drawPsfStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colorRgb: string = '226, 232, 240',
  alpha: number = 0.85
): void {
  const haloRadius = Math.max(radius * 3.4, 2.5);
  const grad = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);
  grad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, alpha * 1.15).toFixed(3)})`);
  grad.addColorStop(0.24, `rgba(${colorRgb}, ${Math.min(1, alpha * 0.92).toFixed(3)})`);
  grad.addColorStop(0.58, `rgba(${colorRgb}, ${(alpha * 0.24).toFixed(3)})`);
  grad.addColorStop(1, `rgba(${colorRgb}, 0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
  ctx.fill();
}
