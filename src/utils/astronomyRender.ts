export type StretchMode = 'asinh' | 'linear' | 'log' | 'sqrt';
export type ColormapMode = 'spherex_cosmic' | 'inferno' | 'viridis' | 'cyan_gold' | 'grayscale' | 'diff_diverging';
export type DisplayMode = 'presentation' | 'science';

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
   * Supports:
   * - 'science': Honest native-resolution detector sampling with crisp pixels.
   * - 'presentation': High-fidelity smooth astronomical interpolation and calibrated contrast.
   */
  public static renderToCanvas(
    canvas: HTMLCanvasElement,
    data: number[] | Float32Array,
    width: number,
    height: number,
    options: RenderOptions
  ) {
    if (!canvas || !data || data.length === 0 || width === 0 || height === 0) return;

    const displayMode: DisplayMode = options.displayMode || 'presentation';
    const targetSize = displayMode === 'presentation' ? (options.renderSize || 512) : width;

    // Filter valid finite values for robust statistics
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

    // Percentile cutoffs
    const pMinIdx = Math.floor(valid.length * (options.minPercentile ?? 0.01));
    const pMaxIdx = Math.floor(valid.length * (options.maxPercentile ?? 0.99));
    let vMin = valid[Math.max(0, pMinIdx)];
    let vMax = valid[Math.min(valid.length - 1, pMaxIdx)];

    // Offscreen native canvas (width x height)
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = offCtx.createImageData(width, height);
    const pixels = imgData.data;

    // Asinh soft-knee scale factor for diverging difference maps
    const isDiff = options.colormap === 'diff_diverging';
    const softKnee = Math.max(1e-5, 2.5 * robustSigma);
    const diffCut = Math.max(8 * robustSigma, Math.min(Math.abs(vMax), 35 * robustSigma));

    const span = Math.max(1e-8, vMax - vMin);

    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      let norm = 0;

      if (!Number.isFinite(raw)) {
        // Bad / masked pixel: subtle neutral dark grey
        pixels[i * 4] = 10;
        pixels[i * 4 + 1] = 12;
        pixels[i * 4 + 2] = 20;
        pixels[i * 4 + 3] = 255;
        continue;
      }

      if (isDiff) {
        // Symmetrical Asinh stretch centered on 0:
        // Preserves faint noise fluctuations around zero, smoothly highlights 4σ-15σ excursions,
        // and prevents saturated stars from crushing contrast everywhere else.
        const sign = Math.sign(raw);
        const absVal = Math.abs(raw);
        const stretched = Math.asinh(absVal / softKnee) / Math.asinh(diffCut / softKnee);
        norm = sign * Math.min(1.0, Math.max(0, stretched)); // -1 to +1
      } else {
        const clamped = Math.max(vMin, Math.min(vMax, raw));
        const fraction = Math.max(0, Math.min(1, (clamped - vMin) / span));

        if (options.stretch === 'asinh') {
          const Q = 6.0;
          norm = Math.asinh(Q * fraction) / Math.asinh(Q);
        } else if (options.stretch === 'log') {
          norm = Math.log10(1 + 9 * fraction);
        } else if (options.stretch === 'sqrt') {
          norm = Math.sqrt(fraction);
        } else {
          norm = fraction;
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

    // Draw to destination canvas
    canvas.width = targetSize;
    canvas.height = targetSize;
    const destCtx = canvas.getContext('2d');
    if (!destCtx) return;

    if (displayMode === 'presentation') {
      destCtx.imageSmoothingEnabled = true;
      destCtx.imageSmoothingQuality = 'high';
      destCtx.drawImage(offscreen, 0, 0, targetSize, targetSize);
    } else {
      // Science mode: Native detector pixels without synthetic blurring
      destCtx.imageSmoothingEnabled = false;
      destCtx.drawImage(offscreen, 0, 0, targetSize, targetSize);
    }
  }

  public static getColor(norm: number, colormap: ColormapMode): [number, number, number] {
    if (colormap === 'diff_diverging') {
      // norm is -1 to +1
      // Negative: Ice Cyan / Royal Blue deficit
      // Zero: Deep Slate / Obsidian void
      // Positive: Warm Amber / Radiant Solar excess
      if (norm < 0) {
        const mag = Math.min(1, Math.abs(norm));
        return [
          Math.floor(10 + 20 * mag),
          Math.floor(16 + 180 * mag),
          Math.floor(32 + 223 * mag),
        ];
      } else {
        const mag = Math.min(1, norm);
        return [
          Math.floor(10 + 245 * mag),
          Math.floor(16 + 175 * mag),
          Math.floor(32 + 25 * (1 - mag)),
        ];
      }
    }

    if (colormap === 'grayscale') {
      const v = Math.floor(norm * 255);
      return [v, v, v];
    }

    if (colormap === 'spherex_cosmic') {
      // Official SPHEREx Cosmic theme:
      // Deep space obsidian (0.0) -> Twilight cyan (0.35) -> Warm amber (0.7) -> Supernova white (1.0)
      if (norm < 0.35) {
        const t = norm / 0.35;
        return [
          Math.floor(4 + 12 * t),
          Math.floor(8 + 120 * t),
          Math.floor(22 + 180 * t),
        ];
      } else if (norm < 0.72) {
        const t = (norm - 0.35) / 0.37;
        return [
          Math.floor(16 + 230 * t),
          Math.floor(128 + 40 * t),
          Math.floor(202 * (1 - t) + 15 * t),
        ];
      } else {
        const t = (norm - 0.72) / 0.28;
        return [
          246 + Math.floor(9 * t),
          168 + Math.floor(87 * t),
          15 + Math.floor(240 * t),
        ];
      }
    }

    if (colormap === 'cyan_gold') {
      if (norm < 0.5) {
        const t = norm / 0.5;
        return [
          Math.floor(6 + 20 * t),
          Math.floor(12 + 160 * t),
          Math.floor(28 + 210 * t),
        ];
      } else {
        const t = (norm - 0.5) / 0.5;
        return [
          Math.floor(26 + 225 * t),
          Math.floor(172 + 60 * t),
          Math.floor(238 * (1 - t * 0.6) + 200 * t),
        ];
      }
    }

    if (colormap === 'viridis') {
      // Viridis colormap approximation
      const r = Math.floor(255 * Math.max(0, Math.min(1, -0.6 * norm + 1.2 * norm ** 2)));
      const g = Math.floor(255 * Math.max(0, Math.min(1, 1.4 * norm - 0.4 * norm ** 2)));
      const b = Math.floor(255 * Math.max(0, Math.min(1, 0.4 + 1.2 * norm - 1.6 * norm ** 2)));
      return [r, g, b];
    }

    // Default 'inferno':
    const r = Math.floor(255 * Math.min(1, Math.max(0, 1.6 * norm - 0.1)));
    const g = Math.floor(255 * Math.min(1, Math.max(0, 2.2 * norm - 0.6)));
    const b = Math.floor(255 * Math.min(1, Math.max(0, 3.2 * norm - 1.5 + (norm < 0.25 ? norm * 2.5 : 0))));
    return [r, g, b];
  }
}
