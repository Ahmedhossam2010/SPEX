export type StretchMode = 'asinh' | 'linear' | 'sqrt' | 'log';
export type ColormapMode = 'diff_diverging' | 'grayscale' | 'heat' | 'infrared_warm' | 'inferno' | 'viridis';
export type DisplayMode = 'science' | 'presentation';

export interface RenderOptions {
  stretch: StretchMode;
  colormap: ColormapMode;
  displayMode?: DisplayMode;
  isDifference?: boolean; // Whether data is a signed difference / significance array
  mode?: 'signed_difference' | 'unipolar';
  asinhBeta?: number;
  invert?: boolean;
  minPercentile?: number;
  maxPercentile?: number;
  renderSize?: number; // target display canvas resolution (default: 512)
}

export interface PixelRGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class AstronomyRenderer {
  /**
   * Pure mathematical stretch function.
   * Transforms input ratio x in [0, 1] into [0, 1] based on selected astronomical curve.
   */
  public static applyStretch(
    val: number,
    maxVal: number,
    stretch: StretchMode,
    softKnee = 1.0
  ): number {
    if (maxVal <= 0 || val <= 0) return 0;
    const ratio = Math.min(1.0, Math.max(0, val / maxVal));

    switch (stretch) {
      case 'linear':
        return ratio;

      case 'sqrt':
        return Math.sqrt(ratio);

      case 'log':
        // Standard astronomical log10 compression: log10(1 + 9 * ratio) / log10(10)
        return Math.log10(1 + 9 * ratio);

      case 'asinh':
      default: {
        const x = val / softKnee;
        const xMax = maxVal / softKnee;
        const denom = Math.asinh(Math.max(1e-4, xMax));
        return denom > 0 ? Math.min(1.0, Math.max(0, Math.asinh(x) / denom)) : ratio;
      }
    }
  }

  /**
   * Pure computation of normalized pixel buffer.
   * Can run in Node.js (unit tests) or in the browser.
   */
  public static computePixels(
    data: number[] | Float32Array,
    width: number,
    height: number,
    options: RenderOptions
  ): Uint8ClampedArray {
    const totalPixels = width * height;
    const pixels = new Uint8ClampedArray(totalPixels * 4);

    if (!data || data.length === 0 || width === 0 || height === 0) {
      return pixels;
    }

    // Filter finite values to derive statistics
    const valid: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (Number.isFinite(v)) valid.push(v);
    }
    valid.sort((a, b) => a - b);

    if (valid.length === 0) return pixels;

    const mid = Math.floor(valid.length / 2);
    const median = valid[mid];
    const absDevs = valid.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
    const robustSigma = Math.max(1e-6, 1.4826 * (absDevs[mid] || 1e-3));

    // Determine if data is signed (difference or significance map)
    const isSigned =
      options.mode === 'signed_difference' ||
      (options.mode !== 'unipolar' && (
        options.isDifference ??
        (options.colormap === 'diff_diverging' || (valid[0] < -2 * robustSigma && valid[valid.length - 1] > 2 * robustSigma))
      ));

    if (isSigned) {
      // Symmetrical zero-centered dynamic range
      const p99Idx = Math.floor(valid.length * (options.maxPercentile ?? 0.995));
      const p01Idx = Math.floor(valid.length * (options.minPercentile ?? 0.005));
      const absMax = Math.max(
        Math.abs(valid[p01Idx] || 0),
        Math.abs(valid[p99Idx] || 0),
        6 * robustSigma
      );
      const softKnee = Math.max(1e-5, 2.5 * robustSigma);

      for (let i = 0; i < data.length; i++) {
        const raw = data[i];
        const pixelIdx = i * 4;

        if (!Number.isFinite(raw)) {
          // Bad / NaN pixel: deep neutral charcoal
          pixels[pixelIdx] = 10;
          pixels[pixelIdx + 1] = 12;
          pixels[pixelIdx + 2] = 16;
          pixels[pixelIdx + 3] = 255;
          continue;
        }

        const sign = Math.sign(raw);
        const absVal = Math.abs(raw);
        const stretched = this.applyStretch(absVal, absMax, options.stretch, softKnee);
        const norm = sign * stretched; // -1.0 to +1.0

        const [r, g, b] = this.getColorSigned(norm, options.colormap);
        pixels[pixelIdx] = r;
        pixels[pixelIdx + 1] = g;
        pixels[pixelIdx + 2] = b;
        pixels[pixelIdx + 3] = 255;
      }
    } else {
      // Unipolar single-epoch intensity
      const pMaxIdx = Math.floor(valid.length * (options.maxPercentile ?? 0.995));
      const vMax = valid[Math.min(valid.length - 1, pMaxIdx)];
      const bgLevel = median;
      const maxExcess = Math.max(1e-6, vMax - bgLevel);
      const softKnee = Math.max(1e-5, 2.5 * robustSigma);

      for (let i = 0; i < data.length; i++) {
        const raw = data[i];
        const pixelIdx = i * 4;

        if (!Number.isFinite(raw)) {
          pixels[pixelIdx] = 10;
          pixels[pixelIdx + 1] = 12;
          pixels[pixelIdx + 2] = 16;
          pixels[pixelIdx + 3] = 255;
          continue;
        }

        const excess = raw - bgLevel;
        let norm = 0;
        if (excess <= 0) {
          norm = Math.max(0, 0.02 * (1 + excess / (3 * robustSigma)));
        } else {
          norm = this.applyStretch(excess, maxExcess, options.stretch, softKnee);
        }

        if (options.invert) norm = 1 - norm;

        const [r, g, b] = this.getColorUnipolar(norm, options.colormap);
        pixels[pixelIdx] = r;
        pixels[pixelIdx + 1] = g;
        pixels[pixelIdx + 2] = b;
        pixels[pixelIdx + 3] = 255;
      }
    }

    return pixels;
  }

  /**
   * Render astronomical floating-point array to an HTML5 canvas.
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

    // Create offscreen canvas for native resolution
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = offCtx.createImageData(width, height);
    const pixelBytes = this.computePixels(data, width, height, options);
    imgData.data.set(pixelBytes);
    offCtx.putImageData(imgData, 0, 0);

    // Target display size
    const targetSize =
      displayMode === 'presentation'
        ? baseDisplaySize
        : width * Math.max(1, Math.floor(baseDisplaySize / width));

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
    } else {
      // Science mode: Native detector pixels without synthetic blurring
      destCtx.imageSmoothingEnabled = false;
    }
    destCtx.drawImage(offscreen, 0, 0, targetSize, targetSize);
    destCtx.restore();
  }

  /**
   * Signed color mapping for difference images where norm is in [-1, +1]
   */
  public static getColorSigned(norm: number, colormap: ColormapMode): [number, number, number] {
    const clamped = Math.max(-1, Math.min(1, norm));

    if (colormap === 'grayscale') {
      // Zero = neutral mid-gray (128). Negative = black (0). Positive = white (255).
      const gray = Math.round(128 + 127 * clamped);
      return [gray, gray, gray];
    }

    if (colormap === 'heat') {
      // Bipolar thermal: Negative = blue/cyan ice, Zero = dark slate, Positive = red/orange/yellow fire
      if (clamped < 0) {
        const u = Math.abs(clamped);
        return [
          Math.floor(15 + 40 * u),
          Math.floor(17 + 130 * u),
          Math.floor(25 + 230 * u),
        ];
      } else {
        const u = clamped;
        if (u < 0.35) {
          const t = u / 0.35;
          return [Math.floor(15 + 180 * t), Math.floor(17 + 20 * t), Math.floor(25 * (1 - t))];
        } else if (u < 0.75) {
          const t = (u - 0.35) / 0.4;
          return [Math.floor(195 + 60 * t), Math.floor(37 + 160 * t), Math.floor(10 * t)];
        } else {
          const t = (u - 0.75) / 0.25;
          return [255, Math.floor(197 + 58 * t), Math.floor(10 + 245 * t)];
        }
      }
    }

    // Default: 'diff_diverging'
    // Negative = icy cyan. Zero = deep void. Positive = warm amber-gold to white.
    if (clamped < 0) {
      const u = Math.abs(clamped);
      if (u < 0.08) return [6, 9, 16]; // Submerged in noise floor
      const t = (u - 0.08) / 0.92;
      return [
        Math.floor(6 + 30 * t),
        Math.floor(9 + 173 * t),
        Math.floor(16 + 238 * t),
      ];
    } else {
      const u = clamped;
      if (u < 0.08) return [6, 9, 16]; // Submerged in noise floor
      const t = (u - 0.08) / 0.92;
      if (t < 0.7) {
        const t1 = t / 0.7;
        return [
          Math.floor(6 + 239 * t1),
          Math.floor(9 + 149 * t1),
          Math.floor(16 * (1 - t1)),
        ];
      } else {
        const t2 = (t - 0.7) / 0.3;
        return [
          245 + Math.floor(10 * t2),
          158 + Math.floor(97 * t2),
          Math.floor(240 * t2),
        ];
      }
    }
  }

  /**
   * Unipolar color mapping for single-epoch flux images where norm is in [0, 1]
   */
  public static getColorUnipolar(norm: number, colormap: ColormapMode): [number, number, number] {
    const n = Math.max(0, Math.min(1, norm));

    if (colormap === 'grayscale') {
      const v = Math.round(n * 255);
      return [v, v, v];
    }

    if (colormap === 'heat') {
      // Classic astronomical Heat: Black -> Maroon -> Orange -> Yellow -> White
      if (n < 0.33) {
        const t = n / 0.33;
        return [Math.floor(180 * t), Math.floor(10 * t), Math.floor(15 * t)];
      } else if (n < 0.66) {
        const t = (n - 0.33) / 0.33;
        return [Math.floor(180 + 75 * t), Math.floor(10 + 170 * t), Math.floor(15 * (1 - t))];
      } else {
        const t = (n - 0.66) / 0.34;
        return [255, Math.floor(180 + 75 * t), Math.floor(255 * t)];
      }
    }

    if (colormap === 'infrared_warm') {
      // NASA Warm Infrared: Deep space -> warm copper -> warm amber -> bright core
      if (n < 0.5) {
        const t = n / 0.5;
        return [Math.floor(3 + 130 * t), Math.floor(5 + 75 * t), Math.floor(10 + 35 * t)];
      } else {
        const t = (n - 0.5) / 0.5;
        return [Math.floor(133 + 122 * t), Math.floor(80 + 172 * t), Math.floor(45 + 205 * t)];
      }
    }

    // Default or 'diff_diverging' on unipolar data: Deep dark space -> gold amber -> radiant white
    if (n < 0.5) {
      const t = n / 0.5;
      return [Math.floor(6 + 180 * t), Math.floor(9 + 90 * t), Math.floor(16 * (1 - t))];
    } else {
      const t = (n - 0.5) / 0.5;
      return [Math.floor(186 + 69 * t), Math.floor(99 + 156 * t), Math.floor(255 * t)];
    }
  }

  /**
   * Backwards compatible color getter
   */
  public static getColor(norm: number, colormap: ColormapMode): [number, number, number] {
    if (colormap === 'diff_diverging') {
      return this.getColorSigned(norm, colormap);
    }
    return this.getColorUnipolar(norm, colormap);
  }
}
