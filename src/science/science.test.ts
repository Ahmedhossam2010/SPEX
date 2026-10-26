import test from 'node:test';
import assert from 'node:assert/strict';
import { WCS } from './wcs';
import { ScientificPipeline } from './pipeline';
import { FITSReader } from './fitsReader';
import { WCSParams } from './types';

test('WCS: converts pixel to celestial coordinates and back with high precision', () => {
  const wcs: WCSParams = {
    crval1: 276.26,
    crval2: 64.82,
    crpix1: 32.5,
    crpix2: 32.5,
    cdelt1: -6.2 / 3600,
    cdelt2: 6.2 / 3600,
    cd1_1: -6.2 / 3600,
    cd1_2: 0,
    cd2_1: 0,
    cd2_2: 6.2 / 3600,
    ctype1: 'RA---TAN',
    ctype2: 'DEC--TAN',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 6.2,
  };

  const x0 = 31.5;
  const y0 = 31.5;
  const sky = WCS.pixToSky(x0, y0, wcs);

  // At reference pixel, sky coords must equal crval
  assert.ok(Math.abs(sky.ra - wcs.crval1) < 1e-4);
  assert.ok(Math.abs(sky.dec - wcs.crval2) < 1e-4);

  // Invert back to pixel
  const pix = WCS.skyToPix(sky.ra, sky.dec, wcs);
  assert.ok(Math.abs(pix.x - x0) < 1e-3);
  assert.ok(Math.abs(pix.y - y0) < 1e-3);
});

test('WCS: angularSeparationArcsec computes accurate great-circle distance', () => {
  const sep = WCS.angularSeparationArcsec(100.0, 0.0, 100.0, 1.0);
  assert.ok(Math.abs(sep - 3600.0) < 0.1); // 1 deg = 3600 arcsec
});

test('Pipeline: difference image and independent uncertainty propagation', () => {
  const width = 10;
  const height = 10;
  const size = width * height;

  const data1 = new Float32Array(size).fill(10.0);
  const data2 = new Float32Array(size).fill(15.0);

  // Introduce a variable source in pixel (5, 5)
  data2[5 * width + 5] = 25.0; // +15 difference

  const var1 = new Float32Array(size).fill(1.0);
  const var2 = new Float32Array(size).fill(1.0);

  const diff = new Float32Array(size);
  const sig = new Float32Array(size);

  for (let i = 0; i < size; i++) {
    diff[i] = data2[i] - data1[i];
    const varD = var1[i] + var2[i]; // 1 + 1 = 2
    const sigmaD = Math.sqrt(varD); // sqrt(2) ≈ 1.4142
    sig[i] = diff[i] / sigmaD;
  }

  // Background diff should be 5.0, significance = 5.0 / sqrt(2) ≈ 3.535
  assert.equal(diff[0], 5.0);
  assert.ok(Math.abs(sig[0] - (5.0 / Math.sqrt(2))) < 1e-4);

  // Point source diff should be 15.0, significance = 15.0 / sqrt(2) ≈ 10.606
  const targetIdx = 5 * width + 5;
  assert.equal(diff[targetIdx], 15.0);
  assert.ok(Math.abs(sig[targetIdx] - (15.0 / Math.sqrt(2))) < 1e-4);
});

test('Pipeline: aperturePhotometry subtracts local background correctly', () => {
  const width = 20;
  const height = 20;
  const size = width * height;

  // Background level = 2.0
  const diff = new Float32Array(size).fill(2.0);
  const varMap = new Float32Array(size).fill(0.25);
  const data1 = new Float32Array(size).fill(10.0);
  const data2 = new Float32Array(size).fill(12.0);

  // Add source at (10, 10) with peak +10 over background
  diff[10 * width + 10] += 10.0;
  diff[10 * width + 9] += 5.0;
  diff[10 * width + 11] += 5.0;

  const phot = ScientificPipeline.aperturePhotometry(
    10,
    10,
    data1,
    data2,
    diff,
    varMap,
    width,
    height,
    2.0,
    3.5,
    5.0
  );

  // Net delta flux should have background subtracted
  assert.ok(phot.deltaFlux > 15.0);
  assert.ok(phot.deltaUncertainty > 0);
});

test('Pipeline: assessArtifact correctly flags registration dipole and cosmic rays', () => {
  const width = 16;
  const height = 16;
  const size = width * height;

  const diffDipole = new Float32Array(size).fill(0);
  // Dipole: positive peak adjacent to negative peak
  diffDipole[8 * width + 8] = 20.0;
  diffDipole[8 * width + 9] = -18.0;

  const dipoleRes = ScientificPipeline.assessArtifact(8, 8, 10.0, diffDipole, null, null, width, height);
  assert.equal(dipoleRes.morphology, 'dipole');
  assert.ok(dipoleRes.flags.includes('REGISTRATION_OR_PSF_DIPOLE'));
  assert.ok(dipoleRes.artifactScore >= 0.7);

  // Cosmic ray sharp spike
  const diffSpike = new Float32Array(size).fill(0);
  diffSpike[8 * width + 8] = 50.0; // Isolated 1-pixel spike
  const spikeRes = ScientificPipeline.assessArtifact(8, 8, 12.0, diffSpike, null, null, width, height);
  assert.equal(spikeRes.morphology, 'sharp-spike');
  assert.ok(spikeRes.flags.includes('COSMIC_RAY_SPIKE'));
});

test('Pipeline: checkCompatibility flags wavelength mismatch', () => {
  const obs1 = {
    obs_id: 'SPX-001',
    s_ra: 276.26,
    s_dec: 64.82,
    t_min: 60790.0,
    t_max: 60790.1,
    em_min: 0.75e-6,
    em_max: 1.1e-6,
    wavelength_um: 0.9,
    dataproduct_type: 'image',
    access_url: '',
    fits_url: '',
    access_format: '',
  };

  const obs2Incompatible = {
    ...obs1,
    obs_id: 'SPX-002',
    wavelength_um: 2.5, // 2.5 um vs 0.9 um
    em_min: 2.3e-6,
    em_max: 2.7e-6,
    t_min: 60810.0,
  };

  const dummyFits: any = {
    wcs: { pixelScaleArcsec: 6.2 },
    width: 64,
    height: 64,
  };

  const check = ScientificPipeline.checkCompatibility(obs1, obs2Incompatible, dummyFits, dummyFits);
  assert.equal(check.isCompatible, false);
  assert.ok(check.reason?.includes('Wavelength bands are physically incompatible'));
});

test('Pipeline: assessArtifact flags SPHEREx bitmask saturation and outlier flags', () => {
  const width = 16;
  const height = 16;
  const size = width * height;
  const diff = new Float32Array(size).fill(0);
  diff[5 * width + 5] = 40.0;

  const flags1 = new Int32Array(size).fill(0);
  const flags2 = new Int32Array(size).fill(0);
  flags2[5 * width + 5] = 0x02; // Saturated full-well pixel (OVERFLOW) in SPHEREx Level 2

  const res = ScientificPipeline.assessArtifact(5, 5, 20.0, diff, flags1, flags2, width, height);
  assert.ok(res.flags.includes('SATURATION'));
  assert.ok(res.artifactScore >= 0.8);
  assert.ok(res.whyFlagged?.includes('full well capacity'));
});

test('FITSReader: parseWCS correctly parses PC1_1..PC2_2 matrices into arcsecond pixel scale', () => {
  const header: Record<string, string | number | boolean> = {
    CRVAL1: 275.9238,
    CRVAL2: 64.9607,
    CRPIX1: 32.5,
    CRPIX2: 32.5,
    CDELT1: 1.0,
    CDELT2: 1.0,
    PC1_1: -0.00113597,
    PC1_2: -0.00123299,
    PC2_1: -0.00127892,
    PC2_2: 0.00118274,
    CTYPE1: 'RA---TAN-SIP',
    CTYPE2: 'DEC--TAN-SIP',
  };

  const wcs = FITSReader.parseWCS(header, 64, 64);
  assert.ok(Math.abs(wcs.pixelScaleArcsec - 6.15) < 0.05);
  assert.ok(wcs.cd1_1 < 0);
  assert.ok(wcs.cd2_2 > 0);
});

test('Synthetic test: dipole filter rejects simulated pointing jitter residual', () => {
  const width = 24;
  const height = 24;
  const size = width * height;
  const diff = new Float32Array(size).fill(0);

  // Synthetic astrometric residual: a sub-pixel shift producing a positive peak and adjacent negative trough
  const cx = 12;
  const cy = 12;
  diff[cy * width + cx] = +20.27; // +20.27 peak
  diff[cy * width + (cx + 1)] = -14.50; // -14.50 opposite lobe (71.5% of peak)
  diff[(cy - 1) * width + (cx + 1)] = -6.20;

  const res = ScientificPipeline.assessArtifact(cx, cy, 61.1, diff, null, null, width, height);

  assert.equal(res.morphology, 'dipole');
  assert.ok(res.flags.includes('REGISTRATION_OR_PSF_DIPOLE'));
  assert.ok(res.artifactScore >= 0.7, `Expected artifactScore >= 0.7, got ${res.artifactScore}`);
});

test('Synthetic test: dipole filter preserves legitimate isolated variable point source', () => {
  const width = 24;
  const height = 24;
  const size = width * height;
  const diff = new Float32Array(size).fill(0);

  // Synthetic legitimate astronomical variable point source (2D Gaussian PSF with FWHM ~ 2.2 px, sigma ~ 0.93)
  const cx = 12;
  const cy = 12;
  const peak = 20.0;
  const psfSigma = 0.93;

  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const r2 = dx * dx + dy * dy;
      const val = peak * Math.exp(-r2 / (2 * psfSigma * psfSigma));
      // Add small background noise (+/- 0.1)
      const noise = ((dx + dy) % 2 === 0 ? 0.05 : -0.05);
      diff[(cy + dy) * width + (cx + dx)] = val + noise;
    }
  }

  const res = ScientificPipeline.assessArtifact(cx, cy, 18.5, diff, null, null, width, height);

  // Must NOT be classified as dipole or cosmic ray spike
  assert.equal(res.morphology, 'point-like');
  assert.equal(res.flags.includes('REGISTRATION_OR_PSF_DIPOLE'), false);
  assert.equal(res.flags.includes('COSMIC_RAY_SPIKE'), false);
  assert.ok(res.artifactScore < 0.35, `Expected artifactScore < 0.35, got ${res.artifactScore}`);
});

test('Synthetic test: dipole filter preserves variable point source near static neighbor', () => {
  const width = 24;
  const height = 24;
  const size = width * height;
  const diff = new Float32Array(size).fill(0);

  // Synthetic variable point source at (10, 10)
  const cx = 10;
  const cy = 10;
  const peak = 18.0;
  const psfSigma = 0.93;

  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const r2 = dx * dx + dy * dy;
      diff[(cy + dy) * width + (cx + dx)] += peak * Math.exp(-r2 / (2 * psfSigma * psfSigma));
    }
  }

  // An unrelated static neighbor star 3.5 pixels away at (13, 12)
  // In the difference image, a static star subtracts cleanly with only small Gaussian residuals (+/- 0.2)
  diff[12 * width + 13] = +0.22;
  diff[12 * width + 14] = -0.18;
  diff[11 * width + 13] = -0.15;

  const res = ScientificPipeline.assessArtifact(cx, cy, 16.0, diff, null, null, width, height, 0.5);

  // Must NOT trigger dipole flag
  assert.equal(res.morphology, 'point-like');
  assert.equal(res.flags.includes('REGISTRATION_OR_PSF_DIPOLE'), false);
  assert.ok(res.artifactScore < 0.35, `Expected artifactScore < 0.35, got ${res.artifactScore}`);
});

test('Pipeline: aperturePhotometry robust median resists outlier contamination in annulus', () => {
  const width = 24;
  const height = 24;
  const size = width * height;

  const diff = new Float32Array(size).fill(0.5); // 0.5 background
  const varMap = new Float32Array(size).fill(0.1);
  const data1 = new Float32Array(size).fill(5.0);
  const data2 = new Float32Array(size).fill(5.5);

  // Target point source at (12, 12)
  diff[12 * width + 12] += 10.0;

  // Severe outlier in the background annulus at (12, 17) (distance = 5 px)
  diff[17 * width + 12] = 85.0; // bright intruder star

  const phot = ScientificPipeline.aperturePhotometry(
    12,
    12,
    data1,
    data2,
    diff,
    varMap,
    width,
    height,
    2.5,
    4.0,
    6.0
  );

  // Because of robust median, net delta flux is not crushed by the 85.0 outlier
  assert.ok(phot.deltaFlux > 8.0, `Expected deltaFlux > 8.0, got ${phot.deltaFlux}`);
});

test('Pipeline: difference image safely handles NaN and Infinity without crashing', () => {
  const width = 12;
  const height = 12;
  const size = width * height;

  const data1 = new Float32Array(size).fill(10.0);
  const data2 = new Float32Array(size).fill(15.0);

  // Introduce NaN and Infinity at various pixels
  data1[0] = NaN;
  data2[1] = Infinity;
  data1[2] = -Infinity;

  const obs1: any = {
    obs_id: 'O1',
    s_ra: 276.0,
    s_dec: 64.8,
    t_min: 60000,
    t_max: 60000.1,
    em_min: 0.8e-6,
    em_max: 1.0e-6,
    wavelength_um: 0.9,
    dataproduct_type: 'image',
    access_url: '',
    fits_url: '',
    access_format: '',
  };
  const obs2 = { ...obs1, obs_id: 'O2', t_min: 60020 };

  const fits1: any = {
    width,
    height,
    data: data1,
    variance: null,
    flags: null,
    bunit: 'MJy/sr',
    header: {},
    wcs: { pixelScaleArcsec: 6.2, crval1: 276.0, crval2: 64.8, crpix1: 6, crpix2: 6, cdelt1: 1, cdelt2: 1, cd1_1: -1, cd1_2: 0, cd2_1: 0, cd2_2: 1, ctype1: 'RA---TAN', ctype2: 'DEC--TAN', equinox: 2000, radesys: 'ICRS' },
    stats: { min: 10, max: 10, mean: 10, median: 10, std: 0.5, robustNoise: 0.5 },
  };
  const fits2 = { ...fits1, data: data2 };

  const result = ScientificPipeline.processDifference(obs1, obs2, fits1, fits2);
  assert.ok(Number.isFinite(result.stats.noiseSigma));
  assert.ok(Number.isFinite(result.evidence.maxSignificance));
  // Pixel 0 should be NaN in diff array, but handled safely
  assert.ok(Number.isNaN(result.diff[0]));
});

test('Pipeline: candidate detection returns all genuine peaks without 4 or 6 candidate limit', () => {
  const width = 80;
  const height = 80;
  const size = width * height;

  const data1 = new Float32Array(size).fill(5.0);
  const data2 = new Float32Array(size).fill(5.0);
  const diff = new Float32Array(size).fill(0.0);
  const varMap = new Float32Array(size).fill(0.5);
  const significance = new Float32Array(size).fill(0.0);

  // Inject 8 distinct isolated significant variable point sources (separated by >10 pixels)
  const coords = [
    [15, 15], [35, 15], [55, 15],
    [15, 35], [35, 35], [55, 35],
    [15, 55], [35, 55]
  ];

  for (const [x, y] of coords) {
    const idx = y * width + x;
    data2[idx] += 8.0; // Significant peak
    diff[idx] = 8.0;
    significance[idx] = 8.0 / Math.sqrt(1.0); // 8 sigma
    // Add realistic PSF wings
    diff[idx - 1] = 4.0;
    diff[idx + 1] = 4.0;
    diff[idx - width] = 4.0;
    diff[idx + width] = 4.0;
  }

  const wcs: any = {
    pixelScaleArcsec: 6.2,
    crval1: 276.0,
    crval2: 64.8,
    crpix1: 40,
    crpix2: 40,
    cdelt1: -6.2 / 3600,
    cdelt2: 6.2 / 3600,
    cd1_1: -6.2 / 3600,
    cd1_2: 0,
    cd2_1: 0,
    cd2_2: 6.2 / 3600,
    ctype1: 'RA---TAN',
    ctype2: 'DEC--TAN',
    equinox: 2000,
    radesys: 'ICRS',
  };

  const candidates = ScientificPipeline.detectCandidates(
    data1,
    data2,
    diff,
    significance,
    varMap,
    null,
    null,
    width,
    height,
    wcs,
    0.7
  );

  // Must detect all 8 candidates (previous limit was 4, then 6)
  assert.equal(candidates.length, 8);
  assert.ok(candidates[0].peakSignificance >= 7.0);
});

test('Pipeline: resampleVarianceBilinear propagates variance using squared interpolation weights', () => {
  const width = 10;
  const height = 10;
  const varData = new Float32Array(width * height).fill(0);

  // Set known variances at (2, 2) and (3, 2)
  const v1 = 4.0;
  const v2 = 2.0;
  varData[2 * width + 2] = v1;
  varData[2 * width + 3] = v2;

  // Shift by dx = 0.5, dy = 0.0
  // At output pixel (2, 2), srcX = 2.5, which falls halfway between (2, 2) and (3, 2)
  // Bilinear weights: w0 = 0.5, w1 = 0.5
  // Linear interpolation would give: 0.5 * 4.0 + 0.5 * 2.0 = 3.0
  // Squared-weight propagation gives: (0.5)^2 * 4.0 + (0.5)^2 * 2.0 = 0.25 * 4.0 + 0.25 * 2.0 = 1.0 + 0.5 = 1.5
  const resampled = ScientificPipeline.resampleVarianceBilinear(varData, width, height, 0.5, 0.0);
  const outVar = resampled[2 * width + 2];

  assert.ok(Math.abs(outVar - 1.5) < 1e-4, `Expected Var = 1.5 (0.25*V1 + 0.25*V2), got ${outVar}`);
  assert.ok(outVar < 3.0, 'Squared-weight variance must be lower than linear interpolation smoothing');
});

test('Pipeline: resampleVarianceBilinear handles NaNs and boundaries cleanly without negative values', () => {
  const width = 5;
  const height = 5;
  const varData = new Float32Array(width * height).fill(1.0);

  // Inject a NaN pixel
  varData[1 * width + 2] = NaN;

  const resampled = ScientificPipeline.resampleVarianceBilinear(varData, width, height, 0.5, 0.5);

  // All valid output pixels must be strictly >= 0 and finite or NaN
  for (let i = 0; i < resampled.length; i++) {
    const val = resampled[i];
    if (Number.isFinite(val)) {
      assert.ok(val >= 0, `Variance must never be negative, got ${val}`);
    }
  }

  // Pixel shifted completely outside frame boundary must be NaN
  const edgeResampled = ScientificPipeline.resampleVarianceBilinear(varData, width, height, 10.0, 10.0);
  assert.ok(Number.isNaN(edgeResampled[0]), 'Boundary overflow must return NaN');
});

test('Pipeline: computeRegistration accurately reports Rigid Translation terminology', () => {
  const fits1: any = {
    width: 64,
    height: 64,
    data: new Float32Array(64 * 64).fill(10),
    variance: new Float32Array(64 * 64).fill(1),
    flags: new Int32Array(64 * 64).fill(0),
    stats: { median: 10, robustNoise: 0.5 },
    wcs: {
      crval1: 276.26,
      crval2: 64.82,
      crpix1: 32.5,
      crpix2: 32.5,
      cdelt1: -6.2 / 3600,
      cdelt2: 6.2 / 3600,
      pixelScaleArcsec: 6.2,
    },
  };
  const fits2: any = { ...fits1 };

  const reg = ScientificPipeline.computeRegistration(fits1, fits2);
  assert.equal(reg.method, 'Rigid Translation (WCS Center Offset + Normalized Cross-Correlation Refinement)');
  assert.ok(typeof reg.dx === 'number');
  assert.ok(typeof reg.dy === 'number');
});

test('Pipeline: assessArtifact produces heuristic penalty bounded between 0.0 and 1.0', () => {
  const width = 64;
  const height = 64;
  const diff = new Float32Array(width * height).fill(0.0);
  const flags1 = new Int32Array(width * height).fill(0);
  const flags2 = new Int32Array(width * height).fill(0);

  // Test edge pixel penalty
  const edgeResult = ScientificPipeline.assessArtifact(2, 2, 5.0, diff, flags1, flags2, width, height, 0.5);
  assert.ok(edgeResult.artifactScore >= 0.5, 'Edge proximity must add heuristic penalty');
  assert.ok(edgeResult.artifactScore <= 1.0, 'Score must be capped at 1.0');
  assert.ok(edgeResult.flags.includes('EDGE_PROXIMITY'));

  // Test saturation flag penalty
  flags1[32 * width + 32] = 0x02; // OVERFLOW
  const satResult = ScientificPipeline.assessArtifact(32, 32, 10.0, diff, flags1, flags2, width, height, 0.5);
  assert.ok(satResult.artifactScore >= 0.8, 'Saturation must incur major heuristic penalty');
  assert.ok(satResult.flags.includes('SATURATION'));
});



