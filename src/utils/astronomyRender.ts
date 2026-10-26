export type StretchMode = 'asinh' | 'linear' | 'log' | 'sqrt';
export type ColormapMode = 'heat' | 'inferno' | 'cyan_gold' | 'grayscale' | 'diff_diverging';

export interface RenderOptions {
  stretch: StretchMode;
  colormap: ColormapMode;
  invert?: boolean;
  minPercentile?: number;
  maxPercentile?: number;
}

export class AstronomyRenderer {
  /**
   * Render astronomical floating-point flux array to an HTML5 canvas
   */
  public static renderToCanvas(
    canvas: HTMLCanvasElement,
    data: number[] | Float32Array,
    width: number,
    height: number,
    options: RenderOptions
  ) {
    if (!canvas || !data || data.length === 0 || width === 0 || height === 0) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    // Compute min / max percentile
    const valid = [];
    for (let i = 0; i < data.length; i++) {
      if (Number.isFinite(data[i])) valid.push(data[i]);
    }
    valid.sort((a, b) => a - b);

    if (valid.length === 0) return;

    const pMinIdx = Math.floor(valid.length * (options.minPercentile ?? 0.02));
    const pMaxIdx = Math.floor(valid.length * (options.maxPercentile ?? 0.995));
    let vMin = valid[Math.max(0, pMinIdx)];
    let vMax = valid[Math.min(valid.length - 1, pMaxIdx)];

    if (options.colormap === 'diff_diverging') {
      // Symmetric range around 0 for difference maps
      const absMax = Math.max(Math.abs(vMin), Math.abs(vMax), 1e-4);
      vMin = -absMax;
      vMax = absMax;
    }

    const span = Math.max(1e-8, vMax - vMin);

    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      let norm = 0;

      if (options.colormap === 'diff_diverging') {
        // Map [-absMax, absMax] to [-1, 1] then color
        const clamped = Math.max(vMin, Math.min(vMax, raw));
        norm = clamped / vMax; // -1 to +1
      } else {
        const clamped = Math.max(vMin, Math.min(vMax, raw));
        const fraction = (clamped - vMin) / span;

        if (options.stretch === 'asinh') {
          const Q = 8.0;
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

    ctx.putImageData(imgData, 0, 0);
  }

  private static getColor(norm: number, colormap: ColormapMode): [number, number, number] {
    if (colormap === 'diff_diverging') {
      // norm is -1 to +1
      // negative is blue/cyan deficit, zero is dark navy, positive is golden/amber excess
      if (norm < 0) {
        const mag = Math.min(1, Math.abs(norm));
        return [
          Math.floor(10 + 30 * mag),
          Math.floor(18 + 140 * mag),
          Math.floor(40 + 215 * mag),
        ];
      } else {
        const mag = Math.min(1, norm);
        return [
          Math.floor(10 + 245 * mag),
          Math.floor(18 + 160 * mag),
          Math.floor(40 + 20 * mag),
        ];
      }
    }

    if (colormap === 'grayscale') {
      const v = Math.floor(norm * 255);
      return [v, v, v];
    }

    if (colormap === 'cyan_gold') {
      // SPEX theme custom colormap: deep navy -> cyan -> gold -> white
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

    if (colormap === 'inferno') {
      // Inferno approximation
      const r = Math.floor(255 * Math.min(1, Math.max(0, 1.5 * norm - 0.1)));
      const g = Math.floor(255 * Math.min(1, Math.max(0, 2.0 * norm - 0.6)));
      const b = Math.floor(255 * Math.min(1, Math.max(0, 3.0 * norm - 1.5 + (norm < 0.3 ? norm * 2 : 0))));
      return [r, g, b];
    }

    // Default 'heat': black/navy -> deep amber -> gold -> warm white
    if (norm < 0.33) {
      const t = norm / 0.33;
      return [Math.floor(160 * t), Math.floor(20 * t), Math.floor(40 * (1 - t))];
    } else if (norm < 0.7) {
      const t = (norm - 0.33) / 0.37;
      return [Math.floor(160 + 95 * t), Math.floor(20 + 150 * t), 0];
    } else {
      const t = (norm - 0.7) / 0.3;
      return [255, Math.floor(170 + 85 * t), Math.floor(255 * t)];
    }
  }
}
