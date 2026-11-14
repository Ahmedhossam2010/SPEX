import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { groupFramesBySurveyPass } from './surveyPasses';
import { TimeSeriesFrame } from './timeSeriesPipeline';

function makeFrame(idx: number, mjd: number, val: number, centroidX?: number): TimeSeriesFrame {
  const flux = new Array(16).fill(val);
  return {
    index: idx,
    obsId: `OBS-${idx}`,
    detector: 'D1',
    visitKey: `V-${idx}`,
    mjd,
    dateObs: `2025-05-0${Math.min(9, idx + 1)}T00:00:00Z`,
    wavelengthUm: 0.93,
    width: 4,
    height: 4,
    flux,
    reprojectedFlux: flux,
    flags: new Array(16).fill(0),
    dqDecoded: {
      transientOrCR: 0,
      overflow: 0,
      surError: 0,
      nonFunc: 0,
      hot: 0,
      statisticalOutlier: 0,
      source: 0,
      totalMaskedPixels: 0,
      totalPixels: 16,
      maskedFraction: 0,
    },
    wcs: {
      crval1: 10,
      crval2: 20,
      crpix1: 2,
      crpix2: 2,
      cdelt1: -0.0017,
      cdelt2: 0.0017,
      cd1_1: -0.0017,
      cd1_2: 0,
      cd2_1: 0,
      cd2_2: 0.0017,
      pixelScaleArcsec: 6.2,
      ctype1: 'RA---TAN',
      ctype2: 'DEC--TAN',
      equinox: 2000,
      radesys: 'ICRS',
    },
    fitsUrl: '',
    accessUrl: '',
    measuredCentroid:
      centroidX != null
        ? { x: centroidX, y: 2, dxArcsec: 0.5, dyArcsec: 0, uncertaintyArcsec: 0.2, valid: true }
        : undefined,
  };
}

describe('groupFramesBySurveyPass', () => {
  test('groups visits within a pass and splits real >45d survey passes without faking spacing', () => {
    const frames = [
      makeFrame(0, 60800.1, 10, 1.9),
      makeFrame(1, 60801.4, 20, 2.0),
      makeFrame(2, 60803.2, 30, 2.1),
      makeFrame(3, 60990.5, 40, 2.6), // ~187 days later -> real Pass 2
      makeFrame(4, 60991.8, 50, 2.8),
    ];

    const passes = groupFramesBySurveyPass(frames);
    assert.strictEqual(passes.length, 2);
    assert.strictEqual(passes[0].visitCount, 3);
    assert.strictEqual(passes[1].visitCount, 2);

    // Median of [10, 20, 30] is 20
    assert.strictEqual(passes[0].combinedFrame.flux[0], 20);
    // Average centroid X of [1.9, 2.0, 2.1] is 2.0
    assert.ok(Math.abs((passes[0].combinedFrame.measuredCentroid?.x ?? 0) - 2.0) < 1e-6);
    // Pass 2 midpoint MJD reflects real timestamps, NOT fixed +182.5d
    assert.ok(Math.abs(passes[1].combinedFrame.mjd - (60990.5 + 60991.8) / 2) < 1e-6);
  });

  test('returns empty array on empty input', () => {
    assert.deepStrictEqual(groupFramesBySurveyPass([]), []);
  });
});
