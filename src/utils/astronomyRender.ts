export type StretchMode = 'asinh' | 'linear' | 'log' | 'sqrt';
export type ColormapMode = 'grayscale' | 'infrared_warm' | 'diff_diverging' | 'inferno' | 'viridis';
export type DisplayMode = 'science' | 'presentation';

export interface RenderOptions {
  stretch: StretchMode;
  colormap: ColormapMode;
  displayMode?: DisplayMode;
  invert?: boolean;
  minPercentile?: number;
  maxPercentile?: number;
  renderSize?: number; // target display canvas resolution (default: 512)
}

export class AstronomyRenderer {
  /**
   * Render astronomical floating-point flux array to an HTML5 canvas.
   * Features:
   * - HiDPI / Retina-aware rendering via window.devicePixelRatio.
   * - 'science': Native detector sampling with sharp pixel grid (honest 6.15"/pixel).
   * - 'presentation': Clean subtle bilinear interpolation preserving true PSF geometry.
   * - Restrained, authentic astronomical contrast stretch: deep space background remains dark.
   */
  public static renderToCanvas(
    canvas: HTMLCanvasElement,
    data: number[] | Float32Array,
    width: number,
    height: number,
    options: RenderOptions
  ) {
    if (!canvas || !data || data.length === 0 || width === 0 || height === 0) return;

    const displayMode: DisplayMode = options.displayMode || 'science';
    const baseDisplaySize = options.renderSize || 512;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    // Filter valid finite values for robust noise and percentiles
    const valid: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (Number.isFinite(v)) valid.push(v);
    }
    valid.sort((a, b) => a - b);

    if (valid.length === 0) return;

    const mid = Math.floor(valid.length / 2);
    const median = valid[mid];
    const absDevs = valid.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
    const robustSigma = Math.max(1e-6, 1.4826 * (absDevs[mid] || 1e-3));

    // Percentile cutoffs (protect against hot pixels and saturation tails)
    const pMinIdx = Math.floor(valid.length * (options.minPercentile ?? 0.01));
    const pMaxIdx = Math.floor(valid.length * (options.maxPercentile ?? 0.995));
    const vMin = valid[Math.max(0, pMinIdx)];
    const vMax = valid[Math.min(valid.length - 1, pMaxIdx)];

    // Offscreen native canvas for pixel-accurate FITS data representation
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = offCtx.createImageData(width, height);
    const pixels = imgData.data;

    const isDiff = options.colormap === 'diff_diverging';
    const softKnee = Math.max(1e-5, 2.5 * robustSigma);
    const diffCut = Math.max(8 * robustSigma, Math.min(Math.max(Math.abs(vMax), Math.abs(vMin)), 35 * robustSigma));

    // Background level for single-epoch images: use median so empty sky is pure dark space
    const bgLevel = median;
    const maxExcess = Math.max(1e-6, vMax - bgLevel);

    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      let norm = 0;

      if (!Number.isFinite(raw)) {
        // Bad / masked pixel: subtle neutral dark grey
        pixels[i * 4] = 6;
        pixels[i * 4 + 1] = 8;
        pixels[i * 4 + 2] = 12;
        pixels[i * 4 + 3] = 255;
        continue;
      }

      if (isDiff) {
        // Symmetrical Asinh stretch centered on 0:
        // Zero residual is dark neutral void. Positive is warm amber; negative is cool cyan.
        // Faint fluctuations within noise floor stay submerged in the dark background.
        const sign = Math.sign(raw);
        const absVal = Math.abs(raw);
        const stretched = Math.asinh(absVal / softKnee) / Math.asinh(diffCut / softKnee);
        norm = sign * Math.min(1.0, Math.max(0, stretched)); // -1 to +1
      } else {
        // Single-epoch astronomical intensity stretch:
        // Subtract background median so sky is pitch black [0], and stars rise naturally.
        const excess = raw - bgLevel;
        if (excess <= 0) {
          // Empty background sky with subtle noise texture (0 to 0.02)
          norm = Math.max(0, 0.02 * (1 + excess / (3 * robustSigma)));
        } else {
          if (options.stretch === 'asinh') {
            const x = excess / softKnee;
            const xMax = maxExcess / softKnee;
            norm = Math.min(1.0, Math.asinh(x) / Math.asinh(Math.max(1.0, xMax)));
          } else if (options.stretch === 'sqrt') {
            norm = Math.min(1.0, Math.sqrt(excess / maxExcess));
          } else if (options.stretch === 'log') {
            norm = Math.min(1.0, Math.log10(1 + 9 * (excess / maxExcess)));
          } else {
            norm = Math.min(1.0, excess / maxExcess);
          }
        }

        norm = Math.max(0, Math.min(1, norm));
        if (options.invert) norm = 1 - norm;
      }

      const [r, g, b] = this.getColor(norm, options.colormap);
      const pixelIdx = i * 4;
      pixels[pixelIdx] = r;
      pixels[pixelIdx + 1] = g;
      pixels[pixelIdx + 2] = b;
      pixels[pixelIdx + 3] = 255;
    }

    offCtx.putImageData(imgData, 0, 0);

    // Render to destination canvas with HiDPI scale
    const targetSize = displayMode === 'presentation' ? baseDisplaySize : width * Math.max(1, Math.floor(baseDisplaySize / width));
    canvas.width = Math.round(targetSize * dpr);
    canvas.height = Math.round(targetSize * dpr);
    canvas.style.width = `${targetSize}px`;
    canvas.style.height = `${targetSize}px`;

    const destCtx = canvas.getContext('2d');
    if (!destCtx) return;

    destCtx.save();
    destCtx.scale(dpr, dpr);

    if (displayMode === 'presentation') {
      destCtx.imageSmoothingEnabled = true;
      destCtx.imageSmoothingQuality = 'high';
      destCtx.drawImage(offscreen, 0, 0, targetSize, targetSize);
    } else {
      // Science mode: Native detector pixels without synthetic blurring
      destCtx.imageSmoothingEnabled = false;
      destCtx.drawImage(offscreen, 0, 0, targetSize, targetSize);
    }

    destCtx.restore();
  }

  public static getColor(norm: number, colormap: ColormapMode): [number, number, number] {
    if (colormap === 'diff_diverging') {
      // norm is -1.0 to +1.0
      // Zero: pitch neutral black void [4, 6, 12]
      // Negative deficit: clean icy cyan/slate [2, 132, 199]
      // Positive excess: warm amber to radiant white [245, 158, 11] -> [255, 255, 255]
      if (norm < 0) {
        const mag = Math.min(1, Math.abs(norm));
        if (mag < 0.1) {
          // Submerged in background noise
          return [4, 6, 12];
        }
        const t = (mag - 0.1) / 0.9;
        return [
          Math.floor(4 + 30 * t),
          Math.floor(6 + 150 * t),
          Math.floor(12 + 220 * t),
        ];
      } else {
        const mag = Math.min(1, norm);
        if (mag < 0.1) {
          // Submerged in background noise
          return [4, 6, 12];
        }
        const t = (mag - 0.1) / 0.9;
        if (t < 0.7) {
          const t1 = t / 0.7;
          return [
            Math.floor(4 + 235 * t1),
            Math.floor(6 + 145 * t1),
            Math.floor(12 + 10 * (1 - t1)),
          ];
        } else {
          const t2 = (t - 0.7) / 0.3;
          return [
            240 + Math.floor(15 * t2),
            150 + Math.floor(105 * t2),
            10 + Math.floor(245 * t2),
          ];
        }
      }
    }

    // Default authentic grayscale: deep space pitch black [3, 5, 10] -> crisp white [255, 255, 255]
    if (colormap === 'grayscale') {
      const v = Math.floor(Math.max(0, Math.min(1, norm)) * 255);
      return [v, v, v];
    }

    if (colormap === 'infrared_warm') {
      // Subtle NASA infrared monochrome:
      // Deep black space [3, 5, 10] -> warm copper [120, 75, 45] -> warm amber [225, 150, 40] -> star core [255, 252, 245]
      const n = Math.max(0, Math.min(1, norm));
      if (n < 0.5) {
        const t = n / 0.5;
        return [
          Math.floor(3 + 130 * t),
          Math.floor(5 + 75 * t),
          Math.floor(10 + 35 * t),
        ];
      } else {
        const t = (n - 0.5) / 0.5;
        return [
          Math.floor(133 + 122 * t),
          Math.floor(80 + 172 * t),
          Math.floor(45 + 205 * t),
        ];
      }
    }

    if (colormap === 'inferno') {
      const n = Math.max(0, Math.min(1, norm));
      const r = Math.floor(255 * Math.min(1, Math.max(0, 1.6 * n - 0.05)));
      const g = Math.floor(255 * Math.min(1, Math.max(0, 2.2 * n - 0.6)));
      const b = Math.floor(255 * Math.min(1, Math.max(0, 3.2 * n - 1.5 + (n < 0.25 ? n * 2.0 : 0))));
      return [r, g, b];
    }

    // Viridis: perceptually uniform scientific colormap
    const n = Math.max(0, Math.min(1, norm));
    const r = Math.floor(255 * Math.max(0, Math.min(1, -0.6 * n + 1.2 * n ** 2)));
    const g = Math.floor(255 * Math.max(0, Math.min(1, 1.4 * n - 0.4 * n ** 2)));
    const b = Math.floor(255 * Math.max(0, Math.min(1, 0.4 + 1.2 * n - 1.6 * n ** 2)));
    return [r, g, b];
  }
}
