import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AstronomyRenderer, StretchMode, ColormapMode } from './astronomyRender.js';

describe('AstronomyRenderer Unit Tests', () => {
  it('handles empty or zero-length input safely', () => {
    const emptyData = new Float32Array(0);
    const pixels = AstronomyRenderer.computePixels(emptyData, 0, 0, {
      stretch: 'asinh',
      colormap: 'grayscale',
      mode: 'unipolar'
    });
    assert.strictEqual(pixels.length, 0);
  });

  it('safely handles non-finite values (NaN and Infinity)', () => {
    const raw = new Float32Array([NaN, -Infinity, Infinity, 0.0, 50.0, 100.0]);
    const pixels = AstronomyRenderer.computePixels(raw, 3, 2, {
      stretch: 'linear',
      colormap: 'grayscale',
      mode: 'unipolar'
    });
    assert.strictEqual(pixels.length, 6 * 4);
    // None of the RGB channels should be NaN or undefined
    for (let i = 0; i < pixels.length; i++) {
      assert.ok(!Number.isNaN(pixels[i]), `Pixel byte at ${i} is NaN`);
      assert.ok(pixels[i] >= 0 && pixels[i] <= 255);
    }
  });

  it('produces mathematically distinct pixel buffers across all 4 stretches', () => {
    const width = 10;
    const height = 10;
    const count = width * height;
    const raw = new Float32Array(count);
    // Gradient from 0 to 1000 with a realistic dynamic range
    for (let i = 0; i < count; i++) {
      raw[i] = Math.pow(i / (count - 1), 2) * 1000;
    }

    const stretches: StretchMode[] = ['linear', 'asinh', 'sqrt', 'log'];
    const results: Record<StretchMode, Uint8ClampedArray> = {} as any;

    for (const stretch of stretches) {
      results[stretch] = AstronomyRenderer.computePixels(raw, width, height, {
        stretch,
        colormap: 'grayscale',
        mode: 'unipolar',
        asinhBeta: 10
      });
    }

    // Compare pairs to verify they are not identical
    for (let i = 0; i < stretches.length; i++) {
      for (let j = i + 1; j < stretches.length; j++) {
        const s1 = stretches[i];
        const s2 = stretches[j];
        const buf1 = results[s1];
        const buf2 = results[s2];

        let hasDifference = false;
        let maxDiff = 0;
        for (let k = 0; k < buf1.length; k += 4) {
          const diff = Math.abs(buf1[k] - buf2[k]);
          if (diff > 5) {
            hasDifference = true;
          }
          if (diff > maxDiff) maxDiff = diff;
        }

        assert.ok(
          hasDifference,
          `Stretches ${s1} and ${s2} produced virtually identical outputs (max diff: ${maxDiff})`
        );
      }
    }
  });

  it('produces distinctly colored RGB channels across all 3 colormaps', () => {
    const width = 8;
    const height = 8;
    const count = width * height;
    const raw = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      raw[i] = (i / (count - 1)) * 500;
    }

    const colormaps: ColormapMode[] = ['grayscale', 'heat', 'diff_diverging'];
    const results: Record<ColormapMode, Uint8ClampedArray> = {} as any;

    for (const cm of colormaps) {
      results[cm] = AstronomyRenderer.computePixels(raw, width, height, {
        stretch: 'asinh',
        colormap: cm,
        mode: 'unipolar'
      });
    }

    // Grayscale should have R === G === B
    const gray = results['grayscale'];
    for (let i = 0; i < gray.length; i += 4) {
      assert.strictEqual(gray[i], gray[i + 1], 'Grayscale R should equal G');
      assert.strictEqual(gray[i], gray[i + 2], 'Grayscale R should equal B');
    }

    // Heat colormap at mid-range should have high Red, medium Green, low Blue
    const heat = results['heat'];
    const midIdx = Math.floor(count / 2) * 4;
    assert.ok(heat[midIdx] > heat[midIdx + 2], 'Heat mid-range Red must exceed Blue');

    // Diverging colormap produces distinct colors
    const diff = results['diff_diverging'];
    assert.notDeepStrictEqual(heat, diff);
  });

  it('correctly preserves signed zero-crossings in difference mode', () => {
    const raw = new Float32Array([-100, -50, 0, 50, 100]);
    const pixels = AstronomyRenderer.computePixels(raw, 5, 1, {
      stretch: 'asinh',
      colormap: 'diff_diverging',
      mode: 'signed_difference'
    });

    // In diff_diverging:
    // Negative values should be Cyan/Blue dominant (B > R)
    // Zero should be neutral dark
    // Positive values should be Orange/Red dominant (R > B)
    const negPixelR = pixels[0];
    const negPixelB = pixels[2];
    assert.ok(negPixelB > negPixelR, `Negative pixel should be blue-dominant, got R=${negPixelR}, B=${negPixelB}`);

    const posPixelR = pixels[16];
    const posPixelB = pixels[18];
    assert.ok(posPixelR > posPixelB, `Positive pixel should be red/orange-dominant, got R=${posPixelR}, B=${posPixelB}`);
  });
});
