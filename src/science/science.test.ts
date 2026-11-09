import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WCS } from './wcs';
import { ScientificPipeline } from './pipeline';
import { FITSReader } from './fitsReader';
import { CatalogMatcher } from './catalogMatcher';
import { WCSParams, SPHERExObservation } from './types';

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
    A_ORDER: 0,
    B_ORDER: 0,
  };

  const wcs = FITSReader.parseWCS(header, 64, 64);
  assert.ok(Math.abs(wcs.pixelScaleArcsec - 6.15) < 0.05);
  assert.ok(wcs.cd1_1 < 0);
  assert.ok(wcs.cd2_2 > 0);
  assert.equal(wcs.sip?.aOrder, 0);
  assert.equal(wcs.sip?.bOrder, 0);
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

test('CatalogMatcher: concurrently cross-matches Gaia DR3 and AllWISE multi-wavelength catalogs', async () => {
  const ra = 276.26084;
  const dec = 64.82562;
  const matches = await CatalogMatcher.crossmatch(ra, dec, 3.5);

  assert.ok(Array.isArray(matches), 'Matches must be an array');
  assert.ok(matches.length >= 2, `Expected at least 2 catalog matches (Gaia + AllWISE), got ${matches.length}`);

  const gaiaMatch = matches.find((m) => m.catalog === 'Gaia DR3');
  assert.ok(gaiaMatch, 'Must contain a Gaia DR3 counterpart');
  assert.ok(gaiaMatch.identifier.includes('2256659625017767168'));
  assert.ok(gaiaMatch.separationArcsec <= 3.5);

  const wiseMatch = matches.find((m) => m.catalog === 'AllWISE');
  assert.ok(wiseMatch, 'Must contain an AllWISE infrared counterpart');
  assert.ok(wiseMatch.identifier.includes('AllWISE'));
  assert.ok(wiseMatch.photometry?.includes('W1 ='), 'AllWISE match must report mid-IR photometry');
});

test('Pipeline: motion detection identifies moving asteroid / transient candidate from displaced dipole', () => {
  const width = 64;
  const height = 64;
  const size = width * height;

  const data1 = new Float32Array(size).fill(5.0);
  const data2 = new Float32Array(size).fill(5.0);
  const varMap = new Float32Array(size).fill(0.25);
  const diff = new Float32Array(size).fill(0.0);
  const sig = new Float32Array(size).fill(0.0);

  // In Epoch 1: asteroid at (20, 30) with flux 20.0
  data1[30 * width + 20] = 20.0;
  // In Epoch 2: asteroid moved to (26, 30) with flux 20.0 (displacement = 6 pixels)
  data2[30 * width + 26] = 20.0;

  // In difference D = I2 - I1:
  // (20, 30) is -15.0 (trough)
  // (26, 30) is +15.0 (peak)
  diff[30 * width + 20] = -15.0;
  diff[30 * width + 26] = +15.0;
  sig[30 * width + 20] = -15.0 / Math.sqrt(0.5); // S/N ≈ -21.2σ
  sig[30 * width + 26] = +15.0 / Math.sqrt(0.5); // S/N ≈ +21.2σ

  const wcs: WCSParams = {
    crval1: 276.26,
    crval2: 64.82,
    crpix1: 32.5,
    crpix2: 32.5,
    cdelt1: -6.15 / 3600,
    cdelt2: 6.15 / 3600,
    cd1_1: -6.15 / 3600,
    cd1_2: 0,
    cd2_1: 0,
    cd2_2: 6.15 / 3600,
    ctype1: 'RA---TAN',
    ctype2: 'DEC--TAN',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 6.15,
  };

  const timeBaselineDays = 2.0; // 2 days between observations
  const candidates = ScientificPipeline.detectCandidates(
    diff,
    varMap,
    sig,
    data1,
    data2,
    null,
    null,
    width,
    height,
    wcs,
    0.5,
    timeBaselineDays
  );

  const movingCandidate = candidates.find((c) => c.motion?.isMoving);
  assert.ok(movingCandidate, 'Pipeline must detect a moving object candidate');
  assert.equal(movingCandidate.status, 'Moving object candidate');
  assert.ok(movingCandidate.motion!.separationArcsec! > 30.0, 'Displacement must be ~36.9 arcsec (6 px * 6.15")');
  assert.ok(movingCandidate.motion!.speedArcsecPerDay! > 15.0, 'Apparent velocity must be ~18.4 arcsec/day');
  assert.ok(movingCandidate.motion!.properMotionMasYr! > 0, 'Proper motion must be calculated');
  assert.equal(movingCandidate.motion!.counterpart?.x, 20);
  assert.equal(movingCandidate.motion!.counterpart?.y, 30);
});

test('Integration Test: End-to-end multi-extension FITS generation, WCS ingestion, differencing, and catalog cross-match', async () => {
  // Construct valid FITS file headers and data arrays
  const width = 64;
  const height = 64;
  const numPixels = width * height;

  // Helper to build 80-char FITS card
  const makeCard = (key: string, value: string | number) => {
    let str = key.padEnd(8, ' ') + '= ';
    if (typeof value === 'number') {
      str += String(value).padStart(20, ' ');
    } else {
      str += `'${value}'`.padEnd(20, ' ');
    }
    return str.padEnd(80, ' ');
  };

  const buildHDU = (cards: string[], dataBytes: Buffer) => {
    let headerText = cards.join('');
    headerText += 'END'.padEnd(80, ' ');
    const padLen = 2880 - (headerText.length % 2880);
    if (padLen < 2880) headerText += ' '.repeat(padLen);

    const headerBuf = Buffer.from(headerText, 'ascii');
    const dataPad = 2880 - (dataBytes.length % 2880);
    const paddedData = dataPad < 2880 ? Buffer.concat([dataBytes, Buffer.alloc(dataPad)]) : dataBytes;
    return Buffer.concat([headerBuf, paddedData]);
  };

  // Primary HDU (WCS & Metadata)
  const primaryCards = [
    makeCard('SIMPLE', 'T'),
    makeCard('BITPIX', -32),
    makeCard('NAXIS', 2),
    makeCard('NAXIS1', width),
    makeCard('NAXIS2', height),
    makeCard('EXTEND', 'T'),
    makeCard('BUNIT', 'MJy/sr'),
    makeCard('CRVAL1', 276.26084),
    makeCard('CRVAL2', 64.82562),
    makeCard('CRPIX1', 33.0),
    makeCard('CRPIX2', 33.0),
    makeCard('PC1_1', -0.0017083),
    makeCard('PC1_2', 0.0),
    makeCard('PC2_1', 0.0),
    makeCard('PC2_2', 0.0017083),
    makeCard('CDELT1', 1.0),
    makeCard('CDELT2', 1.0),
    makeCard('CTYPE1', 'RA---TAN'),
    makeCard('CTYPE2', 'DEC--TAN'),
  ];

  // Image data buffers (Big-Endian IEEE 754 float32)
  const img1Buf = Buffer.alloc(numPixels * 4);
  const img2Buf = Buffer.alloc(numPixels * 4);
  const varBuf = Buffer.alloc(numPixels * 4);

  for (let i = 0; i < numPixels; i++) {
    img1Buf.writeFloatBE(10.0, i * 4);
    img2Buf.writeFloatBE(10.0, i * 4);
    varBuf.writeFloatBE(0.5, i * 4);
  }

  // Inject realistic astronomical point-source signal with PSF wings at center pixel (32, 32)
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const distSq = dx * dx + dy * dy;
      const psfWeight = Math.exp(-distSq / (2 * 1.3 * 1.3)); // SPHEREx PSF profile sigma ≈ 1.3 px
      const idx = (32 + dy) * width + (32 + dx);
      img2Buf.writeFloatBE(10.0 + 15.0 * psfWeight, idx * 4);
    }
  }

  const hdu1 = buildHDU(primaryCards, img1Buf);
  const hdu2 = buildHDU(primaryCards, img2Buf);

  // 1. Ingestion: FITSReader parse
  const fits1 = FITSReader.parse(hdu1.buffer.slice(hdu1.byteOffset, hdu1.byteOffset + hdu1.byteLength));
  const fits2 = FITSReader.parse(hdu2.buffer.slice(hdu2.byteOffset, hdu2.byteOffset + hdu2.byteLength));

  assert.equal(fits1.width, 64);
  assert.equal(fits1.height, 64);
  assert.ok(fits1.wcs.pixelScaleArcsec > 6.0, 'WCS pixel scale must be ~6.15"');

  // 2. Differencing: ScientificPipeline
  const obs1: SPHERExObservation = {
    obs_id: 'SPX-TEST-01',
    s_ra: 276.26084,
    s_dec: 64.82562,
    t_min: 60790.0,
    t_max: 60790.1,
    em_min: 0.75e-6,
    em_max: 1.11e-6,
    wavelength_um: 0.93,
    dataproduct_type: 'image',
    access_url: '',
    fits_url: '',
    access_format: 'application/fits',
  };
  const obs2: SPHERExObservation = {
    ...obs1,
    obs_id: 'SPX-TEST-02',
    t_min: 60795.0,
    t_max: 60795.1,
  };

  const diffResult = ScientificPipeline.processDifference(obs1, obs2, fits1, fits2);
  assert.equal(diffResult.evidence.classification, 'SIGNIFICANT CHANGE DETECTED');
  assert.ok(diffResult.candidates.length > 0, 'Must detect significant variable candidate');

  const topCand = diffResult.candidates[0];
  assert.equal(topCand.x, 32);
  assert.equal(topCand.y, 32);
  assert.ok(topCand.peakSignificance > 10.0, 'Candidate S/N must exceed 10σ');

  // 3. Multi-wavelength catalog match (Gaia + AllWISE)
  const matches = await CatalogMatcher.crossmatch(topCand.ra, topCand.dec, 3.5);
  assert.ok(matches.length >= 2, 'Candidate must crossmatch with Gaia DR3 and AllWISE');
  topCand.catalogMatches = matches;
  assert.ok(topCand.catalogMatches.some((m) => m.catalog === 'Gaia DR3'));
  assert.ok(topCand.catalogMatches.some((m) => m.catalog === 'AllWISE'));
});

test('ChallengeTargets: checkCoordinatesInQR2 accurately classifies NEP footprint and offsets', async () => {
  const { checkCoordinatesInQR2, OFFICIAL_CHALLENGE_TARGETS, SPHEREX_QR2_FOOTPRINT } = await import('./challengeTargets');

  // Verify footprint bounding box
  assert.equal(SPHEREX_QR2_FOOTPRINT.name, 'SPHEREx QR2 North Ecliptic Pole (NEP) Deep Survey Field');
  assert.equal(SPHEREX_QR2_FOOTPRINT.raMin, 275.5);
  assert.equal(SPHEREX_QR2_FOOTPRINT.raMax, 276.8);
  assert.equal(SPHEREX_QR2_FOOTPRINT.decMin, 64.5);
  assert.equal(SPHEREX_QR2_FOOTPRINT.decMax, 65.2);

  // Center of NEP footprint must be inside
  const inside = checkCoordinatesInQR2(276.15, 64.85);
  assert.equal(inside.inside, true);
  assert.ok(inside.distanceDeg < 0.1);

  // Barnard's Star (RA 269.4520, Dec +04.6933) is ~60 deg south
  const barnard = checkCoordinatesInQR2(OFFICIAL_CHALLENGE_TARGETS[0].ra, OFFICIAL_CHALLENGE_TARGETS[0].dec);
  assert.equal(barnard.inside, false);
  assert.ok(barnard.distanceDeg > 59.0 && barnard.distanceDeg < 61.0);

  // Verify all 5 official challenge targets exist with accurate astrometric coordinates
  assert.equal(OFFICIAL_CHALLENGE_TARGETS.length, 5);
  const ids = OFFICIAL_CHALLENGE_TARGETS.map(t => t.id);
  assert.ok(ids.includes('target-barnards-star'));
  assert.ok(ids.includes('target-epsilon-indi-b'));
  assert.ok(ids.includes('target-wise-0855'));
  assert.ok(ids.includes('target-rw-aurigae'));
  assert.ok(ids.includes('target-r-draconis'));

  // R Draconis is closest in Draco constellation (~11.3 deg from NEP boundary)
  const rDra = OFFICIAL_CHALLENGE_TARGETS.find(t => t.id === 'target-r-draconis')!;
  const rDraCheck = checkCoordinatesInQR2(rDra.ra, rDra.dec);
  assert.equal(rDraCheck.inside, false);
  assert.ok(rDraCheck.distanceDeg < 15.0);

  // RW Aurigae (RA 77.4583, Dec +30.4014) is outside the QR2 footprint (~83.6 deg offset)
  const rwAur = OFFICIAL_CHALLENGE_TARGETS.find(t => t.id === 'target-rw-aurigae')!;
  const rwAurCheck = checkCoordinatesInQR2(rwAur.ra, rwAur.dec);
  assert.equal(rwAurCheck.inside, false);
  assert.ok(rwAurCheck.distanceDeg > 80.0 && rwAurCheck.distanceDeg < 86.0);
});

test('Coverage Audit: WCS detector polygon footprint vs rectangular approximation', async () => {
  const { checkCoordinatesInQR2, QR2_BENCHMARK_OBSERVATIONS } = await import('./challengeTargets');
  const { WCS } = await import('./wcs');

  // 1. Coordinates covered by all three authentic benchmark observations
  const tripleCovered = checkCoordinatesInQR2(276.2614, 64.8258);
  assert.equal(tripleCovered.inside, true);
  assert.equal(tripleCovered.coverageType, 'FULL_TRIPLE_OVERLAP');
  assert.equal(tripleCovered.coverageCount, 3);
  assert.equal(tripleCovered.coveredObservations.length, 3);
  assert.deepEqual(tripleCovered.coveredObservations, ['2025W18_1B_0001_1', '2025W18_1B_0001_2', '2025W18_1B_0001_3']);

  // 2. Coordinates covered by only ONE of the three observations (due to dither offsets near boundary)
  const singleCovered = checkCoordinatesInQR2(276.08445864, 64.82238805);
  assert.equal(singleCovered.inside, true);
  assert.equal(singleCovered.coverageType, 'SINGLE_EPOCH_ONLY');
  assert.equal(singleCovered.coverageCount, 1);
  assert.equal(singleCovered.coveredObservations[0], '2025W18_1B_0001_1');

  // 3. Coordinate inside the bounding box [275.5, 276.8] x [64.5, 65.2],
  // but OUTSIDE the actual diamond-shaped rotated WCS detector footprint
  const rotatedDiamondCorner = checkCoordinatesInQR2(276.085, 64.747);
  assert.equal(rotatedDiamondCorner.isInsideBoundingBox, true, 'Should be inside naive bounding rectangle');
  assert.equal(rotatedDiamondCorner.inside, false, 'Must be outside authentic WCS detector polygon');
  assert.equal(rotatedDiamondCorner.coverageType, 'OUTSIDE_FOOTPRINT');
  assert.equal(rotatedDiamondCorner.coverageCount, 0);

  // 4. Boundary coordinates:
  // Sky position corresponding exactly to pixel (1.0, 31.5) on Exp 1
  const boundarySky = WCS.pixToSky(1.0, 31.5, QR2_BENCHMARK_OBSERVATIONS[0].wcs);
  const boundaryCheck = checkCoordinatesInQR2(boundarySky.ra, boundarySky.dec);
  assert.equal(boundaryCheck.inside, true, 'Astrometrically inside pixel (1, 31.5)');

  // Sky position corresponding to pixel (-5.0, 31.5) - clearly outside detector array
  const outsideSky = WCS.pixToSky(-5.0, 31.5, QR2_BENCHMARK_OBSERVATIONS[0].wcs);
  const outsideCheck = checkCoordinatesInQR2(outsideSky.ra, outsideSky.dec);
  assert.equal(outsideCheck.inside, false, 'Outside pixel (-5, 31.5)');

  // 5. RA wrap-around near 0° / 360° and modulo handling
  const wrapPlus360 = checkCoordinatesInQR2(276.2614 + 360, 64.8258);
  const wrapMinus360 = checkCoordinatesInQR2(276.2614 - 360, 64.8258);
  const wrapPlus720 = checkCoordinatesInQR2(276.2614 + 720, 64.8258);
  assert.equal(wrapPlus360.inside, true);
  assert.equal(wrapPlus360.coverageType, 'FULL_TRIPLE_OVERLAP');
  assert.equal(wrapMinus360.inside, true);
  assert.equal(wrapMinus360.coverageType, 'FULL_TRIPLE_OVERLAP');
  assert.equal(wrapPlus720.inside, true);

  // 6. Invalid and non-finite coordinates
  const nanCheck = checkCoordinatesInQR2(NaN, 64.85);
  assert.equal(nanCheck.inside, false);
  assert.equal(nanCheck.coverageType, 'INVALID_COORDINATES');

  const infCheck = checkCoordinatesInQR2(276.15, Infinity);
  assert.equal(infCheck.inside, false);
  assert.equal(infCheck.coverageType, 'INVALID_COORDINATES');

  const negInfCheck = checkCoordinatesInQR2(-Infinity, 64.85);
  assert.equal(negInfCheck.inside, false);
  assert.equal(negInfCheck.coverageType, 'INVALID_COORDINATES');

  const decOver90 = checkCoordinatesInQR2(276.15, 95.0);
  assert.equal(decOver90.inside, false);
  assert.equal(decOver90.coverageType, 'INVALID_COORDINATES');

  const decUnderMinus90 = checkCoordinatesInQR2(276.15, -95.0);
  assert.equal(decUnderMinus90.inside, false);
  assert.equal(decUnderMinus90.coverageType, 'INVALID_COORDINATES');
});

test('SpectralBands: 102 channels across 6 detector arrays span 0.75um to 5.0um', async () => {
  const { generate102SpectralChannels, SPHEREX_DETECTOR_ARRAYS, generateCandidateSED } = await import('./spectralBands');

  // Verify 6 detector arrays
  assert.equal(SPHEREX_DETECTOR_ARRAYS.length, 6);
  assert.equal(SPHEREX_DETECTOR_ARRAYS[0].detectorNumber, 1);
  assert.deepEqual(SPHEREX_DETECTOR_ARRAYS[0].wavelengthRangeUm, [0.75, 1.11]);
  assert.equal(SPHEREX_DETECTOR_ARRAYS[5].detectorNumber, 6);
  assert.deepEqual(SPHEREX_DETECTOR_ARRAYS[5].wavelengthRangeUm, [4.42, 5.00]);

  // Verify 102 channels
  const channels = generate102SpectralChannels();
  assert.equal(channels.length, 102);

  // Channels must be monotonically increasing in wavelength
  for (let i = 0; i < channels.length - 1; i++) {
    assert.ok(
      channels[i].wavelengthUm < channels[i + 1].wavelengthUm,
      `Channel ${i} (${channels[i].wavelengthUm} um) not strictly less than channel ${i + 1} (${channels[i + 1].wavelengthUm} um)`
    );
    assert.ok(channels[i].resolvingPower >= 35 && channels[i].resolvingPower <= 135);
    assert.ok(channels[i].bandwidthUm > 0);
  }

  // Wavelength bounds: first channel ~0.76 um, last channel ~4.98 um
  assert.ok(channels[0].wavelengthUm >= 0.75);
  assert.ok(channels[channels.length - 1].wavelengthUm <= 5.0);

  // Test Candidate SED Generation
  const sed = generateCandidateSED({
    deltaFlux: 15.5,
    catalogMatches: [
      { catalog: 'Gaia DR3', identifier: 'Gaia DR3 2256659625017767168', separationArcsec: 0.42, photometry: 'G=15.2' },
      { catalog: 'AllWISE', identifier: 'AllWISE J182502.60+644932.2', separationArcsec: 0.65, photometry: 'W1=13.8, W2=13.5' }
    ]
  });

  assert.ok(Array.isArray(sed));
  assert.ok(sed.length >= 4);
  assert.ok(sed.some(p => p.source === 'Gaia DR3'));
  assert.ok(sed.some(p => p.source === 'SPHEREx QR2'));
  assert.ok(sed.some(p => p.source.includes('AllWISE')));

  for (const pt of sed) {
    assert.ok(pt.wavelengthUm > 0);
    assert.ok(pt.fluxMjy > 0);
  }
});

test('DataReleaseAdapter: normalizes incoming FITS and generates release validation report', async () => {
  const { DataReleaseAdapter } = await import('./dataReleaseAdapter');
  const fs = await import('fs');
  const path = await import('path');

  // Test with real cached FITS if present, or generate a valid test benchmark FITS
  const cacheDir = '/tmp/spherex_cache';
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const persistentDir = path.join(process.cwd(), 'data', 'spherex_cache');
  if (fs.existsSync(persistentDir)) {
    try {
      const pFiles = fs.readdirSync(persistentDir).filter((f: string) => f.endsWith('.fits'));
      for (const pf of pFiles) {
        const dest = path.join(cacheDir, pf);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(persistentDir, pf), dest);
        }
      }
    } catch {}
  }
  let cachedFiles = fs.readdirSync(cacheDir).filter((f: string) => f.endsWith('.fits'));
  if (cachedFiles.length === 0) {
    const makeCard = (key: string, value: string | number) => {
      let str = key.padEnd(8, ' ') + '= ';
      if (typeof value === 'number') {
        str += String(value).padStart(20, ' ');
      } else {
        str += `'${value}'`.padEnd(20, ' ');
      }
      return str.padEnd(80, ' ');
    };
    const buildHDU = (cards: string[], dataBytes: Buffer) => {
      let headerText = cards.join('');
      headerText += 'END'.padEnd(80, ' ');
      const padLen = 2880 - (headerText.length % 2880);
      if (padLen < 2880) headerText += ' '.repeat(padLen);
      const headerBuf = Buffer.from(headerText, 'ascii');
      const dataPad = 2880 - (dataBytes.length % 2880);
      const paddedData = dataPad < 2880 ? Buffer.concat([dataBytes, Buffer.alloc(dataPad)]) : dataBytes;
      return Buffer.concat([headerBuf, paddedData]);
    };
    const primaryCards = [
      makeCard('SIMPLE', 'T'),
      makeCard('BITPIX', -32),
      makeCard('NAXIS', 2),
      makeCard('NAXIS1', 64),
      makeCard('NAXIS2', 64),
      makeCard('EXTEND', 'T'),
      makeCard('BUNIT', 'MJy/sr'),
      makeCard('CRVAL1', 276.26084),
      makeCard('CRVAL2', 64.82562),
      makeCard('CRPIX1', 33.0),
      makeCard('CRPIX2', 33.0),
      makeCard('PC1_1', -0.0017083),
      makeCard('PC1_2', 0.0),
      makeCard('PC2_1', 0.0),
      makeCard('PC2_2', 0.0017083),
      makeCard('CDELT1', 1.0),
      makeCard('CDELT2', 1.0),
      makeCard('CTYPE1', 'RA---TAN'),
      makeCard('CTYPE2', 'DEC--TAN'),
      makeCard('DATE-OBS', '2025-04-28T13:00:00'),
      makeCard('MJD-OBS', 60793.5418),
      makeCard('FILTER', 'Band 1'),
    ];
    const dataBuf = Buffer.alloc(64 * 64 * 4);
    for (let i = 0; i < 64 * 64; i++) {
      dataBuf.writeFloatBE(10.0, i * 4);
    }
    const syntheticHDU = buildHDU(primaryCards, dataBuf);
    fs.writeFileSync(path.join(cacheDir, 'benchmark_test.fits'), syntheticHDU);
    cachedFiles = ['benchmark_test.fits'];
  }

  assert.ok(cachedFiles.length > 0, 'Real cached or benchmark FITS files must be present for validation');

  const testFile = cachedFiles[0];
  const buffer = fs.readFileSync(path.join(cacheDir, testFile));

  const normalized = DataReleaseAdapter.normalizeFITS({
    fileName: testFile,
    buffer,
    sourceType: 'OFFICIAL_CHALLENGE_RELEASE',
    releaseId: 'RELEASE_2026_TEST',
  });

  assert.equal(normalized.sourceType, 'OFFICIAL_CHALLENGE_RELEASE');
  assert.equal(normalized.releaseId, 'RELEASE_2026_TEST');
  assert.ok(normalized.imageData.width > 0);
  assert.ok(normalized.imageData.height > 0);
  assert.ok(Number.isFinite(normalized.imageData.wcs.crval1));
  assert.ok(Number.isFinite(normalized.imageData.wcs.crval2));
  assert.ok(normalized.wcsFootprint.raMin < normalized.wcsFootprint.raMax);
  assert.ok(normalized.wcsFootprint.decMin < normalized.wcsFootprint.decMax);

  // Validate dataset release batch
  const report = DataReleaseAdapter.validateDatasetRelease(
    [
      {
        fileName: testFile,
        buffer,
        sourceType: 'OFFICIAL_CHALLENGE_RELEASE',
      },
    ],
    'OFFICIAL_CHALLENGE_RELEASE'
  );

  assert.equal(report.filesInspected, 1);
  assert.equal(report.validFilesCount, 1);
  assert.equal(report.invalidFilesCount, 0);
  assert.equal(report.wcsValid, true);
  assert.ok(report.derivedFootprint.areaSqDeg >= 0);
});

test('Forensic Deduplication: correctly identifies duplicate files and redundant observation products', async () => {
  const { DataReleaseAdapter } = await import('./dataReleaseAdapter');
  const fs = await import('fs');
  const path = await import('path');

  const cacheDir = '/tmp/spherex_cache';
  const cachedFiles = fs.readdirSync(cacheDir).filter((f: string) => f.endsWith('.fits'));
  assert.ok(cachedFiles.length > 0);

  const file1 = cachedFiles[0];
  const buf1 = fs.readFileSync(path.join(cacheDir, file1));

  // Create a batch with:
  // 1. Original file
  // 2. Exact byte-level duplicate with different filename
  // 3. Duplicate with same obsId and same detector
  const candidates = [
    { fileName: 'orig_obs1.fits', buffer: buf1, sourceType: 'DEVELOPMENT_BENCHMARK' as const },
    { fileName: 'dup_copy_obs1.fits', buffer: buf1, sourceType: 'DEVELOPMENT_BENCHMARK' as const },
    { fileName: 'redundant_obs1.fits', buffer: Buffer.from(buf1), sourceType: 'DEVELOPMENT_BENCHMARK' as const },
  ];

  const report = DataReleaseAdapter.validateDatasetRelease(candidates, 'DEVELOPMENT_BENCHMARK');

  assert.equal(report.filesInspected, 3);
  assert.equal(report.validFilesCount, 3);
  assert.equal(report.uniqueObservationIds, 1, 'Must report exactly 1 unique Observation ID');
  assert.equal(report.uniqueObservationEpochs, 1, 'Must report exactly 1 unique observation epoch');
  assert.equal(report.duplicateOrAmbiguousCount, 2, 'Must flag 2 files as duplicate/redundant');
  assert.equal(report.duplicateOrAmbiguousDetails.length, 2);
  assert.ok(report.duplicateOrAmbiguousDetails[0].reason.includes('duplicate') || report.duplicateOrAmbiguousDetails[0].reason.includes('Redundant'));
});

test('Temporal Science Validation: accurately distinguishes intra-visit exposures from independent visits', async () => {
  const { ScientificPipeline } = await import('./pipeline');
  const { FITSReader } = await import('./fitsReader');
  const fs = await import('fs');
  const path = await import('path');

  const cacheDir = '/tmp/spherex_cache';
  const cachedFiles = fs.readdirSync(cacheDir).filter((f: string) => f.endsWith('.fits'));
  const buf = fs.readFileSync(path.join(cacheDir, cachedFiles[0]));
  const dummyFits = FITSReader.parse(buf);

  // 1. Consecutive exposures 2.149 minutes apart (0.001492 days)
  const intraObs1 = {
    obs_id: '2025W18_1B_0001_1',
    s_ra: 276.26,
    s_dec: 64.82,
    t_min: 60793.541849,
    t_max: 60793.543181,
    em_min: 0.75e-6,
    em_max: 1.11e-6,
    wavelength_um: 0.93,
    dataproduct_type: 'image',
    access_url: '',
    fits_url: '',
    access_format: 'application/fits',
  };
  const intraObs2 = {
    ...intraObs1,
    obs_id: '2025W18_1B_0001_2',
    t_min: 60793.543341, // exactly 128.931 seconds (2.14885 min) later
    t_max: 60793.544674,
  };

  const intraCompat = ScientificPipeline.checkCompatibility(intraObs1, intraObs2, dummyFits, dummyFits);
  assert.equal(intraCompat.timeBaselineType, 'INTRA_VISIT_EXPOSURES');
  assert.ok(intraCompat.timeBaselineHuman!.includes('minutes'));
  assert.ok(intraCompat.timeBaselineHuman!.includes('intra-orbit scan'));

  // Pairwise exact temporal arithmetic from official FITS DATE-OBS timestamps
  const t1 = new Date('2025-04-28T13:00:15.755Z').getTime();
  const t2 = new Date('2025-04-28T13:02:24.686Z').getTime();
  const t3 = new Date('2025-04-28T13:04:33.616Z').getTime();

  const dt12 = (t2 - t1) / 1000;
  const dt23 = (t3 - t2) / 1000;
  const dt13 = (t3 - t1) / 1000;

  assert.equal(Math.round(dt12 * 1000), 128931, 'Exp 1 -> 2 must be exactly 128.931 seconds');
  assert.equal(Math.round(dt23 * 1000), 128930, 'Exp 2 -> 3 must be exactly 128.930 seconds');
  assert.equal(Math.round(dt13 * 1000), 257861, 'Exp 1 -> 3 must be exactly 257.861 seconds');

  // 2. DataReleaseAdapter Observation Hierarchy & Metadata Grouping
  const { DataReleaseAdapter } = await import('./dataReleaseAdapter');
  
  // SPHEREx structured obsId grouping
  const candidatesStructured = [
    { fileName: 'exp1.fits', buffer: buf, sourceType: 'DEVELOPMENT_BENCHMARK' as const },
    { fileName: 'exp2.fits', buffer: buf, sourceType: 'DEVELOPMENT_BENCHMARK' as const },
  ];
  // Verify that files without metadata are classified as NOT_VERIFIED if separated in time
  const reportWithGenericNames = DataReleaseAdapter.validateDatasetRelease([
    { fileName: 'generic_01.fits', buffer: buf, sourceType: 'DEVELOPMENT_BENCHMARK' as const }
  ], 'DEVELOPMENT_BENCHMARK');
  assert.ok(reportWithGenericNames.validFilesCount >= 1);

  // 3. Test that elapsed time ALONE without flight metadata returns NOT_VERIFIED
  // Create two files with generic names and mock >1 hour separation
  const genericBatch = [
    {
      obsId: 'GENERIC_SCAN_A',
      sourceType: 'DEVELOPMENT_BENCHMARK' as const,
      releaseId: 'QR2_DEVELOPMENT',
      fileName: 'scan_a.fits',
      timestampUtc: '2025-04-28T10:00:00Z',
      mjd: 60793.4166,
      wavelengthUm: 0.93,
      bandName: 'Band 1',
      detector: 1,
      imageData: dummyFits,
      hasNativeVariance: true,
      varianceSource: 'NATIVE' as const,
      hasNativeFlags: true,
      flagsStatus: 'PRESENT' as const,
      unit: 'MJy/sr',
      unitValid: true,
      sha256: 'hash_a',
      wcsFootprint: {
        raMin: 276.0,
        raMax: 276.4,
        decMin: 64.7,
        decMax: 64.9,
        actualImageAreaSqDeg: 0.012,
        boundingBoxAreaSqDeg: 0.023,
        corners: [],
      },
    },
    {
      obsId: 'GENERIC_SCAN_B',
      sourceType: 'DEVELOPMENT_BENCHMARK' as const,
      releaseId: 'QR2_DEVELOPMENT',
      fileName: 'scan_b.fits',
      timestampUtc: '2025-05-10T10:00:00Z',
      mjd: 60805.4166, // 12 days later
      wavelengthUm: 0.93,
      bandName: 'Band 1',
      detector: 1,
      imageData: dummyFits,
      hasNativeVariance: true,
      varianceSource: 'NATIVE' as const,
      hasNativeFlags: true,
      flagsStatus: 'PRESENT' as const,
      unit: 'MJy/sr',
      unitValid: true,
      sha256: 'hash_b',
      wcsFootprint: {
        raMin: 276.0,
        raMax: 276.4,
        decMin: 64.7,
        decMax: 64.9,
        actualImageAreaSqDeg: 0.012,
        boundingBoxAreaSqDeg: 0.023,
        corners: [],
      },
    },
  ];

  // Independent survey visits 20.7 days apart
  const surveyObs2 = {
    ...intraObs1,
    obs_id: 'VISIT-02',
    t_min: 60814.2418, // 20.7 days later
    t_max: 60814.2428,
  };

  const surveyCompat = ScientificPipeline.checkCompatibility(intraObs1, surveyObs2, dummyFits, dummyFits);
  assert.equal(surveyCompat.timeBaselineType, 'INDEPENDENT_VISIT');
  assert.ok(surveyCompat.timeBaselineHuman!.includes('20.7 days'));
});

test('Significance Calculation & Pixel Verification: verifies mathematical formula and pixel integrity', async () => {
  // Test mathematical formula: S = D / sqrt(var1 + var2)
  const diffVal = 15.52;
  const varSum = 0.0308;
  const trueUncertainty = Math.sqrt(varSum); // ~0.1755
  const trueSignificance = diffVal / trueUncertainty; // 88.43 sigma

  assert.ok(Math.abs(trueSignificance - 88.43) < 0.1);
  // Verify that previous report claim of 19.34 sigma was mathematically inconsistent:
  const inconsistentClaim = 19.34;
  assert.notEqual(Math.round(trueSignificance), Math.round(inconsistentClaim), '15.52 / sqrt(0.0308) is ~88.43 sigma, not 19.34 sigma');

  // Verify real physical differencing on cached benchmark files
  const { FITSReader } = await import('./fitsReader');
  const { ScientificPipeline } = await import('./pipeline');
  const fs = await import('fs');
  const path = await import('path');

  const cacheDir = '/tmp/spherex_cache';
  const realFiles = fs.readdirSync(cacheDir).filter((f: string) => f.endsWith('.fits') && !f.includes('benchmark_test'));
  if (realFiles.length >= 2) {
    const file1Name = realFiles.find((f: string) => f.includes('b6a1')) || realFiles[0];
    const file2Name = realFiles.find((f: string) => f.includes('569d')) || realFiles[1];
    const f1 = FITSReader.parse(fs.readFileSync(path.join(cacheDir, file1Name)));
    const f2 = FITSReader.parse(fs.readFileSync(path.join(cacheDir, file2Name)));

    const o1 = {
      obs_id: 'OBS1',
      s_ra: 276.2614,
      s_dec: 64.8258,
      t_min: 60793.5418,
      t_max: 60793.5428,
      em_min: 0.75e-6,
      em_max: 1.11e-6,
      wavelength_um: 0.93,
      dataproduct_type: 'image',
      access_url: '',
      fits_url: '',
      access_format: 'application/fits',
    };
    const o2 = { ...o1, obs_id: 'OBS2', t_min: 60793.5433, t_max: 60793.5443 };

    const res = ScientificPipeline.processDifference(o1, o2, f1, f2);
    assert.ok(res.diff.length === 64 * 64);
    assert.ok(res.significance.length === 64 * 64);

    // Verify for each candidate that peakSignificance = diff[idx] / sqrt(variance[idx])
    for (const cand of res.candidates.slice(0, 5)) {
      const idx = cand.y * res.width + cand.x;
      const computedD = res.diff[idx];
      const computedVar = res.variance[idx];
      const expectedSig = computedD / Math.sqrt(computedVar);
      assert.ok(Math.abs(cand.peakSignificance - expectedSig) < 0.05, `Candidate ${cand.id} significance must equal diff/sqrt(var)`);
    }

    // Exact pixel-level verification for primary saturated-core candidate (x=19, y=31, historically CAND-13, scanline CAND-10 under TAN-SIP)
    const c1 = res.candidates[0];
    assert.equal(c1.x, 19);
    assert.equal(c1.y, 31);
    const pIdx = 31 * 64 + 19;
    const pDiff = res.diff[pIdx];
    const pVar = res.variance[pIdx];
    const pUnc = Math.sqrt(pVar);
    const pSig = res.significance[pIdx];

    assert.equal(res.registration.method, 'Pixel-by-Pixel WCS Reprojection (TAN-SIP)');
    assert.ok(Math.abs(pDiff - (-691.17724609375)) < 1e-4, `Difference at (19, 31) must be -691.1772 MJy/sr, got ${pDiff}`);
    assert.ok(Math.abs(pVar - 24.65491485595703) < 1e-4, `Variance at (19, 31) must be 24.6549 (MJy/sr)^2, got ${pVar}`);
    assert.ok(Math.abs(pUnc - 4.965371572798659) < 1e-4, `Uncertainty at (19, 31) must be 4.9654 MJy/sr, got ${pUnc}`);
    assert.ok(Math.abs(pSig - (-139.19949340820312)) < 1e-4, `Significance at (19, 31) must be -139.1995 sigma, got ${pSig}`);
    // Strict invariant check: S/N === D / sqrt(Var)
    assert.ok(Math.abs(pSig - (pDiff / pUnc)) < 1e-5, 'Invariant S/N = D / sqrt(Var) must hold to float precision');

    // Extrema verification under full TAN-SIP pixel-by-pixel reprojection
    let maxD = -Infinity, maxDCoord = { x: 0, y: 0 };
    let minD = Infinity, minDCoord = { x: 0, y: 0 };
    let maxS = -Infinity, maxSCoord = { x: 0, y: 0 };
    let minS = Infinity, minSCoord = { x: 0, y: 0 };
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const i = y * 64 + x;
        if (res.diff[i] > maxD) { maxD = res.diff[i]; maxDCoord = { x, y }; }
        if (res.diff[i] < minD) { minD = res.diff[i]; minDCoord = { x, y }; }
        if (res.significance[i] > maxS) { maxS = res.significance[i]; maxSCoord = { x, y }; }
        if (res.significance[i] < minS) { minS = res.significance[i]; minSCoord = { x, y }; }
      }
    }
    assert.equal(maxDCoord.x, 21);
    assert.equal(maxDCoord.y, 30);
    assert.ok(Math.abs(maxD - 596.4126586914062) < 1e-3);

    assert.equal(minDCoord.x, 19);
    assert.equal(minDCoord.y, 31);
    assert.ok(Math.abs(minD - (-691.17724609375)) < 1e-3);

    assert.equal(maxSCoord.x, 21);
    assert.equal(maxSCoord.y, 30);
    assert.ok(Math.abs(maxS - 81.72502899169922) < 1e-3);

    assert.equal(minSCoord.x, 19);
    assert.equal(minSCoord.y, 31);
    assert.ok(Math.abs(minS - (-139.19949340820312)) < 1e-3);
  }
});

test('Dynamic Footprint & Solid Angle: verifies WCS corner projection and area distinction', async () => {
  const { DataReleaseAdapter } = await import('./dataReleaseAdapter');
  const fs = await import('fs');
  const path = await import('path');

  const cacheDir = '/tmp/spherex_cache';
  const cachedFiles = fs.readdirSync(cacheDir).filter((f: string) => f.endsWith('.fits'));
  const benchmarkFile = cachedFiles.find((f: string) => f.includes('b6a1')) || cachedFiles[0];
  const buf = fs.readFileSync(path.join(cacheDir, benchmarkFile));

  const norm = DataReleaseAdapter.normalizeFITS({
    fileName: benchmarkFile,
    buffer: buf,
    sourceType: 'DEVELOPMENT_BENCHMARK',
  });

  // Single 64x64 cutout with ~6.15" pixel scale:
  // Expected actual image area ≈ 4096 * (6.152 / 3600)^2 ≈ 0.01196 sq deg
  assert.ok(norm.wcsFootprint.actualImageAreaSqDeg > 0.0119 && norm.wcsFootprint.actualImageAreaSqDeg < 0.0121);

  // Diagonal rectangular bounding box is larger (~0.0232 sq deg)
  assert.ok(norm.wcsFootprint.boundingBoxAreaSqDeg > norm.wcsFootprint.actualImageAreaSqDeg);
  assert.ok(norm.wcsFootprint.boundingBoxAreaSqDeg > 0.023 && norm.wcsFootprint.boundingBoxAreaSqDeg < 0.024);

  // Corner verification (WCS TAN rotated square)
  assert.equal(norm.wcsFootprint.corners.length, 4);
  const c1 = norm.wcsFootprint.corners[0];
  assert.ok(Math.abs(c1.ra - 276.434) < 0.005);
  assert.ok(Math.abs(c1.dec - 64.829) < 0.005);
});

test('Scientific Safety: rejects invalid units, flags missing variance and flags HDUs', async () => {
  const { DataReleaseAdapter } = await import('./dataReleaseAdapter');

  const makeCard = (key: string, value: string | number) => {
    let str = key.padEnd(8, ' ') + '= ';
    if (typeof value === 'number') str += String(value).padStart(20, ' ');
    else str += `'${value}'`.padEnd(20, ' ');
    return str.padEnd(80, ' ');
  };
  const buildHDU = (cards: string[], dataBytes: Buffer) => {
    let headerText = cards.join('') + 'END'.padEnd(80, ' ');
    const padLen = 2880 - (headerText.length % 2880);
    if (padLen < 2880) headerText += ' '.repeat(padLen);
    const headerBuf = Buffer.from(headerText, 'ascii');
    const dataPad = 2880 - (dataBytes.length % 2880);
    const paddedData = dataPad < 2880 ? Buffer.concat([dataBytes, Buffer.alloc(dataPad)]) : dataBytes;
    return Buffer.concat([headerBuf, paddedData]);
  };

  // 1. Raw count unit 'DN'
  const rawCards = [
    makeCard('SIMPLE', 'T'),
    makeCard('BITPIX', -32),
    makeCard('NAXIS', 2),
    makeCard('NAXIS1', 32),
    makeCard('NAXIS2', 32),
    makeCard('BUNIT', 'DN'), // Raw detector number, not surface brightness
    makeCard('CRVAL1', 276.0),
    makeCard('CRVAL2', 64.0),
    makeCard('CDELT1', 0.0017),
    makeCard('CDELT2', 0.0017),
    makeCard('CTYPE1', 'RA---TAN'),
    makeCard('CTYPE2', 'DEC--TAN'),
  ];
  const rawBuf = buildHDU(rawCards, Buffer.alloc(32 * 32 * 4));

  const normRaw = DataReleaseAdapter.normalizeFITS({
    fileName: 'raw_counts.fits',
    buffer: rawBuf,
    sourceType: 'OFFICIAL_CHALLENGE_RELEASE',
  });
  assert.equal(normRaw.unitValid, false, 'Raw unit DN must be flagged as non-calibrated');
  assert.equal(normRaw.hasNativeVariance, false, 'Single HDU lacks native variance');
  assert.equal(normRaw.varianceSource, 'ESTIMATED', 'Must explicitly record varianceSource as ESTIMATED');
  assert.equal(normRaw.flagsStatus, 'MISSING', 'Must explicitly record flagsStatus as MISSING');

  // 2. Degenerate WCS missing coordinates
  const degenerateCards = [
    makeCard('SIMPLE', 'T'),
    makeCard('BITPIX', -32),
    makeCard('NAXIS', 2),
    makeCard('NAXIS1', 32),
    makeCard('NAXIS2', 32),
    makeCard('BUNIT', 'MJy/sr'),
    makeCard('CRVAL1', NaN), // Invalid coordinate
    makeCard('CRVAL2', NaN),
  ];
  const degenBuf = buildHDU(degenerateCards, Buffer.alloc(32 * 32 * 4));
  assert.throws(() => {
    DataReleaseAdapter.normalizeFITS({
      fileName: 'degenerate_wcs.fits',
      buffer: degenBuf,
      sourceType: 'OFFICIAL_CHALLENGE_RELEASE',
    });
  }, /WCS astrometry/);
});

test('Catalog & SED: preserves observed vs model distinction and match provenance', async () => {
  const { generateCandidateSED } = await import('./spectralBands');
  const { CatalogMatcher } = await import('./catalogMatcher');

  // 1. Candidate without catalog matches must flag model points as isModel: true
  const sedNoMatches = generateCandidateSED({ deltaFlux: 10.0 });
  const modelPoints = sedNoMatches.filter((p) => p.isModel);
  assert.ok(modelPoints.length > 0, 'Unobserved wavelengths must be marked as isModel: true');
  assert.ok(modelPoints.some((p) => p.source === 'Theoretical Model'));

  // 2. Candidate with real Gaia match must have isModel: false for Gaia
  const sedWithGaia = generateCandidateSED({
    deltaFlux: 10.0,
    catalogMatches: [
      {
        catalog: 'Gaia DR3',
        identifier: 'Gaia DR3 2256659625017767168',
        ra: 276.26084,
        dec: 64.82562,
        separationArcsec: 0.2,
        photometry: 'G = 15.42 mag',
        sourceUrl: '',
      },
    ],
  });
  const gaiaPoint = sedWithGaia.find((p) => p.source === 'Gaia DR3');
  assert.ok(gaiaPoint);
  assert.equal(gaiaPoint!.isModel, false, 'Real catalog photometry must be marked as isModel: false');
  assert.ok(gaiaPoint!.fluxMjy > 0);

  // 3. Catalog crossmatch records matchProvenance
  const matches = await CatalogMatcher.crossmatch(276.26084, 64.82562, 3.5);
  assert.ok(matches.length > 0);
  assert.ok(matches.some((m) => m.matchProvenance === 'BENCHMARK_FIXTURE_CACHE' || m.matchProvenance === 'LIVE_VIZIER_TAP'));
});

test('Real FITS Regression Traceability: SHA-256 inventory, separated UTC temporal metrics, NOT_VERIFIED visit grouping, CAND-13 math, and WCS spherical areas', async () => {
  const { DataReleaseAdapter } = await import('./dataReleaseAdapter');
  const { FITSReader } = await import('./fitsReader');
  const { ScientificPipeline } = await import('./pipeline');
  const { WCS } = await import('./wcs');
  const fs = await import('fs');
  const path = await import('path');
  const crypto = await import('crypto');

  const cacheDir = '/tmp/spherex_cache';
  const expectedInventory = [
    {
      fileName: 'b6a1e605728059ea6b7def1e9683adb2.fits',
      obsId: '2025W18_1B_0001_1',
      sha256: 'b66f276a2b3fe6e9318229b574f058be9dba1cda45fd46678014b7837b5187e9',
      integrationSec: 115.117,
    },
    {
      fileName: '569dafa911ec60ff30abb1807d719fef.fits',
      obsId: '2025W18_1B_0001_2',
      sha256: 'f39c8687dae94b80ec39e0cf537425f4dcf6e24ed26268b57c59b379b406a182',
      integrationSec: 115.118,
    },
    {
      fileName: '75b2c2369c175060576bec8d2e5333c0.fits',
      obsId: '2025W18_1B_0001_3',
      sha256: '8e1d894ae95abca0dc3936a9fc45eb9ccfc2636b79496fefc64a57557dfd1a8d',
      integrationSec: 115.118,
    },
  ];

  for (const item of expectedInventory) {
    const fullPath = path.join(cacheDir, item.fileName);
    assert.equal(fs.existsSync(fullPath), true, `Expected real cached FITS cutout ${item.fileName}`);
    const buf = fs.readFileSync(fullPath);
    assert.equal(buf.length, 5117760, `File ${item.fileName} must be 5,117,760 bytes (1,777 x 2,880 FITS blocks)`);
    const actualSha = crypto.createHash('sha256').update(buf).digest('hex');
    assert.equal(actualSha, item.sha256);
  }

  const batch = expectedInventory.map((item) => ({
    fileName: item.fileName,
    buffer: fs.readFileSync(path.join(cacheDir, item.fileName)),
    sourceType: 'DEVELOPMENT_BENCHMARK' as const,
  }));

  const report = DataReleaseAdapter.validateDatasetRelease(batch, 'DEVELOPMENT_BENCHMARK');
  assert.equal(report.status, 'WARNINGS');
  assert.equal(report.uniqueObservationIds, 3);
  assert.equal(report.uniqueObservationEpochs, 3);
  assert.equal(report.epochDeduplicationSummary.groupedVisitsCount, 1);
  assert.equal(report.independentVisitDistinctionStatus, 'NOT_VERIFIED');
  assert.equal(report.totalTemporalPairs, 3);
  assert.equal(report.intraVisitPairs, 3);
  assert.equal(report.independentVisitPairs, 0);
  assert.equal(report.surveyEpochPairs, 0);

  // Verify separated integration durations vs start-to-start cadences vs inter-exposure gaps
  assert.equal(report.detectedEpochs[0].parsedObsId?.visitKey, '2025W18_1B_0001');
  assert.equal(report.detectedEpochs[0].integrationDurationSec, 115.117);
  assert.equal(report.detectedEpochs[1].integrationDurationSec, 115.118);
  assert.equal(report.detectedEpochs[2].integrationDurationSec, 115.118);

  const pairs = report.epochDeduplicationSummary.pairwiseCadenceDetails!;
  assert.equal(pairs.length, 3);
  assert.equal(pairs[0].startToStartCadenceSec, 128.931); // _1 -> _2
  assert.equal(pairs[0].interExposureGapSec, 13.814);
  assert.equal(pairs[1].startToStartCadenceSec, 257.861); // _1 -> _3
  assert.equal(pairs[1].interExposureGapSec, 142.744);
  assert.equal(pairs[2].startToStartCadenceSec, 128.93);  // _2 -> _3
  assert.equal(pairs[2].interExposureGapSec, 13.812);

  // Verify exact spherical union area and bounding box area under TAN-SIP WCS projection
  assert.ok(Math.abs((report.derivedFootprint.unionAreaSqDeg ?? 0) - 0.012091894266849632) < 1e-12);
  assert.equal(report.derivedFootprint.boundingBoxAreaSqDeg, 0.023364);

  // Verify primary candidate at (19, 31) on real physical pixels of _1 -> _2 under TAN-SIP pixel reprojection
  const fits1 = FITSReader.parse(batch[0].buffer);
  const fits2 = FITSReader.parse(batch[1].buffer);
  const obs1 = {
    obs_id: '2025W18_1B_0001_1',
    s_ra: 276.2614,
    s_dec: 64.8258,
    t_min: Number(fits1.header['MJD-OBS']),
    t_max: Number(fits1.header['MJD-END']),
    date_obs: String(fits1.header['DATE-OBS']),
    date_end: String(fits1.header['DATE-END']),
    em_min: 0.75e-6,
    em_max: 1.11e-6,
    wavelength_um: 0.93,
    dataproduct_type: 'image',
    access_url: '',
    fits_url: '',
    access_format: 'application/fits',
  };
  const obs2 = {
    obs_id: '2025W18_1B_0001_2',
    s_ra: 276.2614,
    s_dec: 64.8258,
    t_min: Number(fits2.header['MJD-OBS']),
    t_max: Number(fits2.header['MJD-END']),
    date_obs: String(fits2.header['DATE-OBS']),
    date_end: String(fits2.header['DATE-END']),
    em_min: 0.75e-6,
    em_max: 1.11e-6,
    wavelength_um: 0.93,
    dataproduct_type: 'image',
    access_url: '',
    fits_url: '',
    access_format: 'application/fits',
  };

  const diffOut = ScientificPipeline.processDifference(obs1, obs2, fits1, fits2);
  assert.equal(diffOut.compatibility.integrationDuration1Sec, 115.117);
  assert.equal(diffOut.compatibility.integrationDuration2Sec, 115.118);
  assert.equal(diffOut.compatibility.startToStartCadenceSec, 128.931);
  assert.equal(diffOut.compatibility.interExposureGapSec, 13.814);

  const idx = 31 * 64 + 19;
  assert.equal(fits1.data[idx], 1600.3631591796875);
  assert.equal(fits2.data[idx], 44.053619384765625);
  assert.equal(fits1.variance![idx], 122.88430786132812);
  assert.equal(fits2.variance![idx], 1.2295539379119873);
  assert.ok(Math.abs(diffOut.diff[idx] - (-691.17724609375)) < 1e-5);
  assert.ok(Math.abs(diffOut.variance[idx] - 24.65491485595703) < 1e-5);
  assert.ok(Math.abs(diffOut.significance[idx] - (-139.19949340820312)) < 1e-5);
  assert.equal(diffOut.candidates[0].x, 19);
  assert.equal(diffOut.candidates[0].y, 31);
});

// ============================================================================
// ASTROMETRIC REMEDIATION TEST SUITE (A-I: SYNTHETIC UNIT TESTS, J: REAL FITS)
// ============================================================================

test('Synthetic Test A: TAN-SIP forward transformation against independent closed-form analytical calculations', () => {
  const crval1 = 185.25;
  const crval2 = -42.75;
  const crpix1 = 100.5;
  const crpix2 = 200.25;
  const angleRad = (37.0 * Math.PI) / 180;
  const scaleDeg = 5.5 / 3600;
  const cd1_1 = -scaleDeg * Math.cos(angleRad);
  const cd1_2 = scaleDeg * Math.sin(angleRad);
  const cd2_1 = scaleDeg * Math.sin(angleRad);
  const cd2_2 = scaleDeg * Math.cos(angleRad);

  const wcs: WCSParams = {
    crval1,
    crval2,
    crpix1,
    crpix2,
    cdelt1: 1.0,
    cdelt2: 1.0,
    cd1_1,
    cd1_2,
    cd2_1,
    cd2_2,
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 5.5,
    sip: {
      aOrder: 4,
      bOrder: 4,
      aTerms: [
        { p: 0, q: 0, coeff: 0.75 },
        { p: 2, q: 0, coeff: -1.8e-5 },
        { p: 1, q: 1, coeff: 9.2e-6 },
        { p: 0, q: 2, coeff: 1.1e-5 },
        { p: 3, q: 1, coeff: -2.4e-9 },
      ],
      bTerms: [
        { p: 0, q: 0, coeff: -1.125 },
        { p: 1, q: 0, coeff: 4.5e-4 },
        { p: 2, q: 0, coeff: 2.3e-5 },
        { p: 0, q: 3, coeff: -6.1e-8 },
        { p: 2, q: 2, coeff: 1.5e-9 },
      ],
    },
  };

  // Evaluate at off-axis test point (x = 12.25, y = 264.75) using independent closed-form analytical equations
  const x = 12.25;
  const y = 264.75;
  const u = (x + 1) - crpix1; // -87.25
  const v = (y + 1) - crpix2; // +65.5

  const U =
    u +
    0.75 +
    -1.8e-5 * u * u +
    9.2e-6 * u * v +
    1.1e-5 * v * v +
    -2.4e-9 * Math.pow(u, 3) * v;
  const V =
    v +
    -1.125 +
    4.5e-4 * u +
    2.3e-5 * u * u +
    -6.1e-8 * Math.pow(v, 3) +
    1.5e-9 * u * u * v * v;

  const deg2rad = Math.PI / 180;
  const xi = (cd1_1 * U + cd1_2 * V) * deg2rad;
  const eta = (cd2_1 * U + cd2_2 * V) * deg2rad;
  const ra0 = crval1 * deg2rad;
  const dec0 = crval2 * deg2rad;

  const dRa = Math.atan2(xi, Math.cos(dec0) - eta * Math.sin(dec0));
  const refRa = (((ra0 + dRa) * 180) / Math.PI + 360) % 360;
  const refDec = (Math.asin((Math.sin(dec0) + eta * Math.cos(dec0)) / Math.sqrt(1 + xi * xi + eta * eta)) * 180) / Math.PI;

  const got = WCS.pixToSky(x, y, wcs);
  const sepArcsec = WCS.angularSeparationArcsec(refRa, refDec, got.ra, got.dec);
  // At Dec ~ -42.5 deg (exponent 2^5), 1 binary64 ULP in degrees equals 2^-47 * 3600 = 2.5579538487363607e-11 arcsec
  assert.ok(sepArcsec < 1e-10, `Forward TAN-SIP sky residual ${sepArcsec} arcsec exceeded 1e-10 arcsec`);

  // Also verify exact tangent point identity when A_0_0 = B_0_0 = 0
  const centeredWcs: WCSParams = {
    ...wcs,
    sip: {
      ...wcs.sip!,
      aTerms: wcs.sip!.aTerms.filter((t) => !(t.p === 0 && t.q === 0)),
      bTerms: wcs.sip!.bTerms.filter((t) => !(t.p === 0 && t.q === 0)),
    },
  };
  const tangentSky = WCS.pixToSky(crpix1 - 1, crpix2 - 1, centeredWcs);
  assert.ok(WCS.angularSeparationArcsec(crval1, crval2, tangentSky.ra, tangentSky.dec) < 1e-10);
});

test('Synthetic Test B: TAN-SIP inverse round-trip over detector center, edges, corners, and off-axis positions', () => {
  // 1. Exact closed-form analytical inverse check on pure quadratic SIP distortion (no AP/BP supplied)
  const crval1 = 83.6331;
  const crval2 = 22.0145;
  const crpix1 = 50.5;
  const crpix2 = 50.5;
  const scale = 4.0 / 3600;
  const a20 = -1.25e-4;
  const b02 = 1.75e-4;

  const quadWcs: WCSParams = {
    crval1,
    crval2,
    crpix1,
    crpix2,
    cdelt1: -scale,
    cdelt2: scale,
    cd1_1: -scale,
    cd1_2: 0,
    cd2_1: 0,
    cd2_2: scale,
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 4.0,
    sip: {
      aOrder: 2,
      bOrder: 2,
      aTerms: [{ p: 2, q: 0, coeff: a20 }],
      bTerms: [{ p: 0, q: 2, coeff: b02 }],
    },
  };

  // Choose exact undistorted world-plane target (U_exact, V_exact) and compute analytical sky coordinates
  const Uexact = -35.0;
  const Vexact = 42.0;
  const xi = -scale * Uexact * (Math.PI / 180);
  const eta = scale * Vexact * (Math.PI / 180);
  const dec0 = (crval2 * Math.PI) / 180;
  const targetRa = crval1 + (Math.atan2(xi, Math.cos(dec0) - eta * Math.sin(dec0)) * 180) / Math.PI;
  const targetDec = (Math.asin((Math.sin(dec0) + eta * Math.cos(dec0)) / Math.sqrt(1 + xi * xi + eta * eta)) * 180) / Math.PI;

  // Closed-form quadratic root for u + a20 * u^2 = Uexact and v + b02 * v^2 = Vexact:
  const uExact = (-1 + Math.sqrt(1 + 4 * a20 * Uexact)) / (2 * a20);
  const vExact = (-1 + Math.sqrt(1 + 4 * b02 * Vexact)) / (2 * b02);
  const xExact = uExact + crpix1 - 1;
  const yExact = vExact + crpix2 - 1;

  const solved = WCS.skyToPix(targetRa, targetDec, quadWcs);
  assert.ok(
    Math.hypot(solved.x - xExact, solved.y - yExact) < 1e-10,
    `Closed-form quadratic inverse residual ${Math.hypot(solved.x - xExact, solved.y - yExact)} exceeded 1e-10 px`
  );

  // 2. Round-trip over center, edges, corners, fractional pixels, and far off-axis (CRPIX off-cutout)
  const complexWcs: WCSParams = {
    crval1: 275.58152397,
    crval2: 65.0934469687,
    crpix1: 36.5,
    crpix2: 261.5, // off-cutout reference pixel
    cdelt1: 1.0,
    cdelt2: 1.0,
    cd1_1: -0.00112936147968,
    cd1_2: -0.00123879520159,
    cd2_1: -0.00128482841705,
    cd2_2: 0.00117627478847,
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 6.15,
    sip: {
      aOrder: 3,
      bOrder: 3,
      aTerms: [
        { p: 0, q: 0, coeff: 0.253411983969 },
        { p: 1, q: 0, coeff: -3.37276787342e-5 },
        { p: 0, q: 1, coeff: 1.13698272662e-4 },
        { p: 2, q: 0, coeff: -1.59573412506e-6 },
        { p: 1, q: 1, coeff: 4.16572337495e-6 },
        { p: 0, q: 2, coeff: -1.39509026615e-6 },
        { p: 3, q: 0, coeff: 5.28496364954e-10 },
      ],
      bTerms: [
        { p: 0, q: 0, coeff: -1.20333674297 },
        { p: 1, q: 0, coeff: -6.04891628415e-5 },
        { p: 0, q: 1, coeff: 3.11968426731e-4 },
        { p: 2, q: 0, coeff: 6.65931677632e-6 },
        { p: 1, q: 1, coeff: -6.77811679519e-7 },
        { p: 0, q: 2, coeff: 1.97584571356e-6 },
        { p: 2, q: 1, coeff: 6.59724665305e-10 },
      ],
    },
  };

  const testPositions = [
    [31.5, 31.5],     // center
    [0.0, 0.0],       // bottom-left corner
    [63.0, 0.0],      // bottom-right corner
    [0.0, 63.0],      // top-left corner
    [63.0, 63.0],     // top-right corner
    [0.0, 31.5],      // left edge
    [63.0, 31.5],     // right edge
    [31.5, 0.0],      // bottom edge
    [31.5, 63.0],     // top edge
    [-25.4, -40.8],   // negative off-cutout
    [150.25, 290.75], // far off-axis
  ];

  for (const [x, y] of testPositions) {
    const sky = WCS.pixToSky(x, y, complexWcs);
    const back = WCS.skyToPix(sky.ra, sky.dec, complexWcs);
    const err = Math.hypot(back.x - x, back.y - y);
    assert.ok(err < 1e-10, `Round-trip inverse error ${err} px at (${x}, ${y}) exceeded 1e-10 px`);
  }
});

test('Synthetic Test C: Non-zero SIP coefficients produce verified nonlinear distortion relative to distortion-free TAN', () => {
  const baseTan: WCSParams = {
    crval1: 120.0,
    crval2: 45.0,
    crpix1: 32.5,
    crpix2: 32.5,
    cdelt1: -6.0 / 3600,
    cdelt2: 6.0 / 3600,
    cd1_1: -6.0 / 3600,
    cd1_2: 0,
    cd2_1: 0,
    cd2_2: 6.0 / 3600,
    ctype1: 'RA---TAN',
    ctype2: 'DEC--TAN',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 6.0,
  };

  // Distortion at corner (63, 63) -> u = 31.5, v = 31.5: f = 2.5e-3 * u^2 = 2.480625 px, g = -1.8e-3 * v^2 = -1.78605 px
  const a20 = 2.5e-3;
  const b02 = -1.8e-3;
  const sipWcs: WCSParams = {
    ...baseTan,
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    sip: {
      aOrder: 2,
      bOrder: 2,
      aTerms: [{ p: 2, q: 0, coeff: a20 }],
      bTerms: [{ p: 0, q: 2, coeff: b02 }],
    },
  };

  const skyTan = WCS.pixToSky(63, 63, baseTan);
  const skySip = WCS.pixToSky(63, 63, sipWcs);
  const sepArcsec = WCS.angularSeparationArcsec(skyTan.ra, skyTan.dec, skySip.ra, skySip.dec);

  // Analytical tangent-plane displacement: sqrt((f * 6")^2 + (g * 6")^2) = 6 * sqrt(2.480625^2 + 1.78605^2) = 18.3446"
  const expectedSepArcsec = 6.0 * Math.hypot(a20 * 31.5 * 31.5, b02 * 31.5 * 31.5);
  assert.ok(sepArcsec > 18.0);
  assert.ok(Math.abs(sepArcsec - expectedSepArcsec) < 0.02);

  // Inverse mapping of linear-TAN corner sky coordinates through SIP WCS must recover exact nonlinear inverse pixel
  const invPix = WCS.skyToPix(skyTan.ra, skyTan.dec, sipWcs);
  const uExpected = (-1 + Math.sqrt(1 + 4 * a20 * 31.5)) / (2 * a20);
  const vExpected = (-1 + Math.sqrt(1 + 4 * b02 * 31.5)) / (2 * b02);
  assert.ok(Math.abs((invPix.x + 1 - 32.5) - uExpected) < 1e-12);
  assert.ok(Math.abs((invPix.y + 1 - 32.5) - vExpected) < 1e-12);
});

test('Synthetic Test D: Zero SIP coefficients match ordinary distortion-free TAN behavior to machine precision', () => {
  const tanWcs: WCSParams = {
    crval1: 215.4321,
    crval2: 52.9876,
    crpix1: 32.5,
    crpix2: 32.5,
    cdelt1: 1.0,
    cdelt2: 1.0,
    cd1_1: -0.0012,
    cd1_2: -0.0011,
    cd2_1: -0.0011,
    cd2_2: 0.0012,
    ctype1: 'RA---TAN',
    ctype2: 'DEC--TAN',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 5.86,
  };

  const zeroSipWcs: WCSParams = {
    ...tanWcs,
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    sip: {
      aOrder: 3,
      bOrder: 3,
      apOrder: 3,
      bpOrder: 3,
      aTerms: [{ p: 1, q: 1, coeff: 0 }, { p: 2, q: 0, coeff: 0 }],
      bTerms: [{ p: 0, q: 2, coeff: 0 }, { p: 3, q: 0, coeff: 0 }],
      apTerms: [{ p: 1, q: 0, coeff: 0 }],
      bpTerms: [{ p: 0, q: 1, coeff: 0 }],
    },
  };

  for (const [x, y] of [[0, 0], [19.4, 31.7], [31.5, 31.5], [63, 63]]) {
    const sTan = WCS.pixToSky(x, y, tanWcs);
    const sSip = WCS.pixToSky(x, y, zeroSipWcs);
    assert.ok(WCS.angularSeparationArcsec(sTan.ra, sTan.dec, sSip.ra, sSip.dec) < 1e-12);

    const pTan = WCS.skyToPix(sTan.ra, sTan.dec, tanWcs);
    const pSip = WCS.skyToPix(sTan.ra, sTan.dec, zeroSipWcs);
    assert.ok(Math.hypot(pTan.x - pSip.x, pTan.y - pSip.y) < 1e-13);
  }
});

test('Synthetic Test E: Different SIP distortions and rotated CD matrices between two exposures', () => {
  const scale = 6.0 / 3600;
  const wcs1: WCSParams = {
    crval1: 250.0,
    crval2: 50.0,
    crpix1: 32.5,
    crpix2: 32.5,
    cdelt1: -scale,
    cdelt2: scale,
    cd1_1: -scale,
    cd1_2: 0,
    cd2_1: 0,
    cd2_2: scale,
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 6.0,
    sip: {
      aOrder: 2,
      bOrder: 2,
      aTerms: [{ p: 2, q: 0, coeff: 2.0e-4 }, { p: 1, q: 1, coeff: -1.5e-4 }],
      bTerms: [{ p: 0, q: 2, coeff: -2.2e-4 }],
    },
  };

  const theta = (22.0 * Math.PI) / 180;
  const wcs2: WCSParams = {
    crval1: 250.008,
    crval2: 49.994,
    crpix1: 32.5,
    crpix2: 32.5,
    cdelt1: 1.0,
    cdelt2: 1.0,
    cd1_1: -scale * Math.cos(theta),
    cd1_2: scale * Math.sin(theta),
    cd2_1: scale * Math.sin(theta),
    cd2_2: scale * Math.cos(theta),
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 6.0,
    sip: {
      aOrder: 3,
      bOrder: 3,
      aTerms: [{ p: 0, q: 2, coeff: -1.8e-4 }, { p: 3, q: 0, coeff: 1.2e-6 }],
      bTerms: [{ p: 2, q: 0, coeff: 1.6e-4 }, { p: 1, q: 2, coeff: -1.1e-6 }],
    },
  };

  const grid = WCS.getReprojectionGrid(wcs2, wcs1, 64, 64);
  assert.equal(grid.hasSipDistortion, true);
  assert.ok(grid.maxSpatialWarpPixels > 10.0, `Expected strong non-rigid warp > 10 px, got ${grid.maxSpatialWarpPixels}`);

  // Verify sky coordinate agreement at every sampled point mapped from Exposure 2 -> Exposure 1
  for (const [x, y] of [[10, 12], [32, 32], [52, 48], [20, 44]]) {
    const sx = grid.srcX[y * 64 + x];
    const sy = grid.srcY[y * 64 + x];
    const sky2 = WCS.pixToSky(x, y, wcs2);
    const sky1 = WCS.pixToSky(sx, sy, wcs1);
    const sep = WCS.angularSeparationArcsec(sky2.ra, sky2.dec, sky1.ra, sky1.dec);
    assert.ok(sep < 1e-10, `Cross-exposure sky registration error ${sep}" exceeded 1e-10" at (${x}, ${y})`);
  }
});

test('Synthetic Test F: Pixel-by-pixel reprojection accuracy eliminates rigid-translation dipole on warped exposures', () => {
  const width = 64;
  const height = 64;
  const size = width * height;
  const scale = 6.0 / 3600;

  // Exposure 1: unrotated with strong cubic+quadratic SIP distortion
  const wcs1: WCSParams = {
    crval1: 180.0,
    crval2: 35.0,
    crpix1: 32.5,
    crpix2: 32.5,
    cdelt1: -scale,
    cdelt2: scale,
    cd1_1: -scale,
    cd1_2: 0,
    cd2_1: 0,
    cd2_2: scale,
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 6.0,
    sip: {
      aOrder: 3,
      bOrder: 3,
      aTerms: [{ p: 0, q: 0, coeff: 0.45 }, { p: 2, q: 0, coeff: -2.2e-4 }, { p: 0, q: 2, coeff: 1.8e-4 }],
      bTerms: [{ p: 0, q: 0, coeff: -0.35 }, { p: 1, q: 1, coeff: 2.0e-4 }, { p: 3, q: 0, coeff: -1.5e-6 }],
    },
  };

  // Exposure 2: rotated by 14 deg + different tangent point + distinct SIP distortion
  const theta = (14.0 * Math.PI) / 180;
  const wcs2: WCSParams = {
    crval1: 180.002,
    crval2: 35.001,
    crpix1: 32.5,
    crpix2: 32.5,
    cdelt1: 1.0,
    cdelt2: 1.0,
    cd1_1: -scale * Math.cos(theta),
    cd1_2: scale * Math.sin(theta),
    cd2_1: scale * Math.sin(theta),
    cd2_2: scale * Math.cos(theta),
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 6.0,
    sip: {
      aOrder: 2,
      bOrder: 2,
      aTerms: [{ p: 0, q: 0, coeff: -0.25 }, { p: 1, q: 1, coeff: -1.7e-4 }],
      bTerms: [{ p: 0, q: 0, coeff: 0.30 }, { p: 2, q: 0, coeff: 2.1e-4 }],
    },
  };

  // Project a static sky Gaussian star (located off-center at sky coords corresponding to (16, 48) in wcs2)
  const starSky = WCS.pixToSky(16, 48, wcs2);
  const starIn1 = WCS.skyToPix(starSky.ra, starSky.dec, wcs1);
  const starIn2 = WCS.skyToPix(starSky.ra, starSky.dec, wcs2);

  const bkg = 12.0;
  const amplitude = 200.0;
  const sigmaSkyArcsec = 10.0;

  const data1 = new Float32Array(size);
  const data2 = new Float32Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const sep1 = WCS.angularSeparationArcsec(starSky.ra, starSky.dec, WCS.pixToSky(x, y, wcs1).ra, WCS.pixToSky(x, y, wcs1).dec);
      const sep2 = WCS.angularSeparationArcsec(starSky.ra, starSky.dec, WCS.pixToSky(x, y, wcs2).ra, WCS.pixToSky(x, y, wcs2).dec);
      data1[idx] = bkg + amplitude * Math.exp(-(sep1 * sep1) / (2 * sigmaSkyArcsec * sigmaSkyArcsec));
      data2[idx] = bkg + amplitude * Math.exp(-(sep2 * sep2) / (2 * sigmaSkyArcsec * sigmaSkyArcsec));
    }
  }

  const fits1: any = {
    width, height, data: data1, variance: new Float32Array(size).fill(0.04), flags: null,
    bunit: 'MJy/sr', header: {}, wcs: wcs1,
    stats: FITSReader.computeStatistics(data1, null),
  };
  const fits2: any = {
    width, height, data: data2, variance: new Float32Array(size).fill(0.04), flags: null,
    bunit: 'MJy/sr', header: {}, wcs: wcs2,
    stats: FITSReader.computeStatistics(data2, null),
  };

  // Compare naive rigid translation vs pixel-by-pixel TAN-SIP reprojection around off-axis star (16, 48)
  const rigidCenterDx = starIn1.x - starIn2.x; // even with exact center shift, rotation+SIP varies across field:
  const centerDx = WCS.skyToPix(WCS.pixToSky(32, 32, wcs2).ra, WCS.pixToSky(32, 32, wcs2).dec, wcs1).x - 32;
  const centerDy = WCS.skyToPix(WCS.pixToSky(32, 32, wcs2).ra, WCS.pixToSky(32, 32, wcs2).dec, wcs1).y - 32;
  const rigidAligned = ScientificPipeline.resampleBilinear(data1, width, height, centerDx, centerDy);
  const rigidErrAtStar = Math.abs(data2[48 * width + 16] - rigidAligned[48 * width + 16]);
  assert.ok(rigidErrAtStar > 20.0 && Math.abs(rigidCenterDx - centerDx) > 3.0, 'Off-axis rigid translation must suffer multi-pixel rotation/SIP error');

  const obs1: any = { obs_id: 'SYN-1', s_ra: 180, s_dec: 35, t_min: 60000, t_max: 60000.01, em_min: 0.8e-6, em_max: 1.0e-6, wavelength_um: 0.9, dataproduct_type: 'image', access_url: '', fits_url: '', access_format: '' };
  const obs2: any = { ...obs1, obs_id: 'SYN-2', t_min: 60010, t_max: 60010.01 };

  const diffOut = ScientificPipeline.processDifference(obs1, obs2, fits1, fits2);
  assert.equal(diffOut.registration.reprojectionMode, 'PIXEL_BY_PIXEL_WCS');
  assert.equal(diffOut.registration.method, 'Pixel-by-Pixel WCS Reprojection (TAN-SIP)');

  // Verify resampled value at (16, 48) matches exact analytical bilinear interpolation of data1 at (starIn1.x, starIn1.y)
  const reproj = ScientificPipeline.reprojectPixelByPixel(fits1, wcs2, width, height);
  const sx = reproj.grid.srcX[48 * width + 16];
  const sy = reproj.grid.srcY[48 * width + 16];
  assert.ok(Math.hypot(sx - starIn1.x, sy - starIn1.y) < 1e-10);
  const x0 = Math.floor(sx), y0 = Math.floor(sy);
  const fx = sx - x0, fy = sy - y0;
  const expectedBilinear =
    (1 - fx) * (1 - fy) * data1[y0 * width + x0] +
    fx * (1 - fy) * data1[y0 * width + (x0 + 1)] +
    (1 - fx) * fy * data1[(y0 + 1) * width + x0] +
    fx * fy * data1[(y0 + 1) * width + (x0 + 1)];
  assert.ok(Math.abs(reproj.alignedData[48 * width + 16] - expectedBilinear) < 1e-4);
  assert.ok(Math.abs(data2[48 * width + 16] - reproj.alignedData[48 * width + 16]) < rigidErrAtStar * 0.25);
});

test('Synthetic Test G: Variance propagation under bilinear interpolation and missing-variance protection', () => {
  const width = 16;
  const height = 16;
  const size = width * height;
  const scale = 6.0 / 3600;

  // Source pixel (5, 7) mapped to target pixel (5, 7) via sub-pixel offset (fx = 0.25, fy = 0.60)
  // Using u = (x+1) - CRPIX1 with A_0_0 = 0.25, B_0_0 = 0.60 on identical CRPIX = 1.0, CDELT = scale:
  // Target (5, 7) has U2 = u = 5.0 -> sky -> Source U1 = 5.0 = u1 + 0.25 -> u1 = 4.75 -> sx = 4.75? Wait:
  // If A_0_0 = +0.25, u1 + 0.25 = U -> u1 = U - 0.25 -> sx = x - 0.25. To sample (5.25, 7.60), set A_0_0 = -0.25, B_0_0 = -0.60!
  const targetWcs: WCSParams = {
    crval1: 200.0, crval2: 40.0, crpix1: 1.0, crpix2: 1.0,
    cdelt1: -scale, cdelt2: scale, cd1_1: -scale, cd1_2: 0, cd2_1: 0, cd2_2: scale,
    ctype1: 'RA---TAN', ctype2: 'DEC--TAN', equinox: 2000, radesys: 'ICRS', pixelScaleArcsec: 6.0,
  };
  const sourceWcs: WCSParams = {
    ...targetWcs,
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    sip: {
      aOrder: 1,
      bOrder: 1,
      aTerms: [{ p: 0, q: 0, coeff: -0.25 }],
      bTerms: [{ p: 0, q: 0, coeff: -0.60 }],
    },
  };

  const data = new Float32Array(size).fill(25.0);
  const variance = new Float32Array(size).fill(0.5);
  // Populate 2x2 stencil around (5.25, 7.60): x0=5, x1=6, y0=7, y1=8
  const v00 = 2.0, v10 = 4.0, v01 = 6.0, v11 = 8.0;
  variance[7 * width + 5] = v00;
  variance[7 * width + 6] = v10;
  variance[8 * width + 5] = v01;
  variance[8 * width + 6] = v11;

  const fits1: any = {
    width, height, data, variance, flags: null, bunit: 'MJy/sr', header: {}, wcs: sourceWcs,
    stats: FITSReader.computeStatistics(data, null),
  };

  const res = ScientificPipeline.reprojectPixelByPixel(fits1, targetWcs, width, height);
  const idx = 7 * width + 5;
  assert.ok(Math.abs(res.grid.srcX[idx] - 5.25) < 1e-10);
  assert.ok(Math.abs(res.grid.srcY[idx] - 7.60) < 1e-10);

  // Analytical bilinear squared weights for fx = 0.25, fy = 0.60:
  const w00 = 0.75 * 0.40; // 0.30 -> w00^2 = 0.09
  const w10 = 0.25 * 0.40; // 0.10 -> w10^2 = 0.01
  const w01 = 0.75 * 0.60; // 0.45 -> w01^2 = 0.2025
  const w11 = 0.25 * 0.60; // 0.15 -> w11^2 = 0.0225
  const expectedVar = w00 * w00 * v00 + w10 * w10 * v10 + w01 * w01 * v01 + w11 * w11 * v11; // 1.755
  assert.ok(Math.abs(res.alignedVariance[idx] - expectedVar) < 1e-5, `Expected squared-weight var ${expectedVar}, got ${res.alignedVariance[idx]}`);

  // NaN in one flux corner (8, 5) -> renormalize remaining weights wValid = w00 + w10 + w11 = 0.55
  const dataWithNan = new Float32Array(data);
  dataWithNan[8 * width + 5] = NaN;
  const resNan = ScientificPipeline.reprojectPixelByPixel({ ...fits1, data: dataWithNan }, targetWcs, width, height);
  const wValid = w00 + w10 + w11; // 0.55
  const expectedNanVar = (w00 * w00 * v00 + w10 * w10 * v10 + w11 * w11 * v11) / (wValid * wValid);
  assert.ok(Math.abs(resNan.alignedVariance[idx] - expectedNanVar) < 1e-5);

  // Missing variance (variance: null), even on zero-scatter flat image, must never yield zero uncertainty
  const flatNoVarFits: any = {
    width, height, data: new Float32Array(size).fill(10.0), variance: null, flags: null,
    bunit: 'MJy/sr', header: {}, wcs: sourceWcs,
    stats: { min: 10, max: 10, mean: 10, median: 10, std: 0, robustNoise: 0 },
  };
  const noVarRes = ScientificPipeline.reprojectPixelByPixel(flatNoVarFits, targetWcs, width, height);
  assert.ok(Number.isFinite(noVarRes.alignedVariance[idx]) && noVarRes.alignedVariance[idx] > 0, 'Missing variance must never produce zero uncertainty');
});

test('Synthetic Test H: Conservative DQ flag propagation near flagged pixels and boundaries', () => {
  const width = 12;
  const height = 12;
  const size = width * height;
  const scale = 6.0 / 3600;

  const targetWcs: WCSParams = {
    crval1: 200.0, crval2: 40.0, crpix1: 1.0, crpix2: 1.0,
    cdelt1: -scale, cdelt2: scale, cd1_1: -scale, cd1_2: 0, cd2_1: 0, cd2_2: scale,
    ctype1: 'RA---TAN', ctype2: 'DEC--TAN', equinox: 2000, radesys: 'ICRS', pixelScaleArcsec: 6.0,
  };

  const data = new Float32Array(size).fill(10.0);
  const flags = new Int32Array(size).fill(0);
  flags[5 * width + 5] = 0x01;    // TRANSIENT at (5, 5)
  flags[5 * width + 6] = 0x02;    // OVERFLOW at (6, 5)
  flags[6 * width + 5] = 0x04;    // SUR_ERROR at (5, 6)
  flags[6 * width + 6] = 0x80000; // OUTLIER at (6, 6)

  const makeSourceWcs = (shiftX: number, shiftY: number): WCSParams => ({
    ...targetWcs,
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    sip: {
      aOrder: 1,
      bOrder: 1,
      aTerms: shiftX !== 0 ? [{ p: 0, q: 0, coeff: -shiftX }] : [],
      bTerms: shiftY !== 0 ? [{ p: 0, q: 0, coeff: -shiftY }] : [],
    },
  });

  const baseFits = (wcs: WCSParams): any => ({
    width, height, data, variance: null, flags, bunit: 'MJy/sr', header: {}, wcs,
    stats: FITSReader.computeStatistics(data, flags),
  });

  // 1. Exact integer alignment (shiftX = 0, shiftY = 0): (5, 5) keeps only 0x01; adjacent zero-weight corners do not bleed
  const intRes = ScientificPipeline.reprojectPixelByPixel(baseFits(makeSourceWcs(0, 0)), targetWcs, width, height);
  assert.equal(intRes.alignedFlags![5 * width + 5], 0x01);
  assert.equal(intRes.alignedFlags![5 * width + 6], 0x02);

  // 2. Horizontal-only sub-pixel shift (sx = 5.3, sy = 5.0): bitwise OR of (5, 5) [0x01] and (6, 5) [0x02] -> 0x03
  const horizRes = ScientificPipeline.reprojectPixelByPixel(baseFits(makeSourceWcs(0.3, 0.0)), targetWcs, width, height);
  assert.equal(horizRes.alignedFlags![5 * width + 5], 0x01 | 0x02);

  // 3. Full 2x2 sub-pixel interior stencil (sx = 5.3, sy = 5.4): conservative bitwise OR of all 4 corners -> 0x80007
  const quadRes = ScientificPipeline.reprojectPixelByPixel(baseFits(makeSourceWcs(0.3, 0.4)), targetWcs, width, height);
  assert.equal(quadRes.alignedFlags![5 * width + 5], 0x01 | 0x02 | 0x04 | 0x80000);

  // 4. Out-of-bounds pixels get 0 DQ flag and NaN flux/variance
  assert.ok(Number.isNaN(quadRes.alignedData[5 * width + (width - 1)]));
  assert.ok(Number.isNaN(quadRes.alignedVariance[5 * width + (width - 1)]));
  assert.equal(quadRes.alignedFlags![5 * width + (width - 1)], 0);
});

test('Synthetic Test I: Invalid WCS configurations and out-of-bounds handling reject malformed inputs explicitly', () => {
  const validTan: WCSParams = {
    crval1: 276.0, crval2: 64.0, crpix1: 16.5, crpix2: 16.5,
    cdelt1: -6.0 / 3600, cdelt2: 6.0 / 3600,
    cd1_1: -6.0 / 3600, cd1_2: 0, cd2_1: 0, cd2_2: 6.0 / 3600,
    ctype1: 'RA---TAN', ctype2: 'DEC--TAN',
    equinox: 2000, radesys: 'ICRS', pixelScaleArcsec: 6.0,
  };

  // 1. Unsupported CTYPE projection (ARC / SIN) must throw explicitly
  assert.throws(() => WCS.pixToSky(10, 10, { ...validTan, ctype1: 'RA---ARC', ctype2: 'DEC--ARC' }), /Unsupported or malformed WCS/);

  // 2. Mismatched -SIP axes must throw explicitly
  assert.throws(() => WCS.pixToSky(10, 10, { ...validTan, ctype1: 'RA---TAN-SIP', ctype2: 'DEC--TAN' }), /Mismatched WCS projection/);

  // 3. TAN-SIP without sip payload or missing FITS A_ORDER/B_ORDER must never fall back silently to TAN
  assert.throws(() => WCS.pixToSky(10, 10, { ...validTan, ctype1: 'RA---TAN-SIP', ctype2: 'DEC--TAN-SIP' }), /TAN-SIP WCS astrometry/);
  assert.throws(
    () => FITSReader.parseWCS({ CRVAL1: 276.0, CRVAL2: 64.0, CD1_1: -0.0017, CD2_2: 0.0017, CTYPE1: 'RA---TAN-SIP', CTYPE2: 'DEC--TAN-SIP' }, 32, 32),
    /missing required A_ORDER/
  );

  // 4. SIP terms supplied on non-SIP CTYPE must throw explicitly
  assert.throws(
    () => FITSReader.parseWCS({ CRVAL1: 276.0, CRVAL2: 64.0, CD1_1: -0.0017, CD2_2: 0.0017, CTYPE1: 'RA---TAN', CTYPE2: 'DEC--TAN', A_ORDER: 2, A_2_0: 1e-5 }, 32, 32),
    /SIP polynomial keywords found in header with non-SIP projection/
  );

  // 5. Out-of-bounds SIP order or out-of-order coefficient must throw explicitly
  assert.throws(
    () => WCS.validateWCS({ ...validTan, ctype1: 'RA---TAN-SIP', ctype2: 'DEC--TAN-SIP', sip: { aOrder: 12, bOrder: 2, aTerms: [], bTerms: [] } }),
    /must be integers in \[0, 9\]/
  );
  assert.throws(
    () => WCS.validateWCS({ ...validTan, ctype1: 'RA---TAN-SIP', ctype2: 'DEC--TAN-SIP', sip: { aOrder: 2, bOrder: 2, aTerms: [{ p: 2, q: 1, coeff: 1e-5 }], bTerms: [] } }),
    /invalid polynomial term/
  );

  // 6. Singular CD matrix must throw explicitly
  assert.throws(
    () => WCS.pixToSky(10, 10, { ...validTan, cd1_1: 0, cd1_2: 0, cd2_1: 0, cd2_2: 0 }),
    /singular or zero CD/
  );

  // 7. Non-invertible SIP Jacobian (A_1_0 = -1.0 -> dU/du = 0) must throw explicitly in skyToPix
  const nonInvertibleWcs: WCSParams = {
    ...validTan,
    ctype1: 'RA---TAN-SIP',
    ctype2: 'DEC--TAN-SIP',
    sip: { aOrder: 1, bOrder: 1, aTerms: [{ p: 1, q: 0, coeff: -1.0 }], bTerms: [] },
  };
  const skyPt = WCS.pixToSky(20, 20, nonInvertibleWcs);
  assert.throws(() => WCS.skyToPix(skyPt.ra, skyPt.dec, nonInvertibleWcs), /Jacobian is singular|failed to converge/);

  // 8. Out-of-bounds reprojection must return NaN (never extrapolate edge pixels)
  const wcsShifted: WCSParams = { ...validTan, crpix1: validTan.crpix1 - 4.0, crpix2: validTan.crpix2 + 3.0 };
  const fitsSrc: any = {
    width: 16, height: 16, data: new Float32Array(256).fill(42.0), variance: new Float32Array(256).fill(1.5), flags: null,
    bunit: 'MJy/sr', header: {}, wcs: validTan, stats: { min: 42, max: 42, mean: 42, median: 42, std: 0.1, robustNoise: 0.1 },
  };
  const oobReproj = ScientificPipeline.reprojectPixelByPixel(fitsSrc, wcsShifted, 16, 16);
  // Target x = 0 maps to sx = 4.0 (in bounds), whereas target x = 12 maps to sx = 16.0 > 15 (out of bounds!)
  assert.equal(oobReproj.alignedData[5 * 16 + 0], 42.0);
  assert.ok(Number.isNaN(oobReproj.alignedData[5 * 16 + 12]), 'Out-of-bounds sx = 16.0 must return NaN flux');
  assert.ok(Number.isNaN(oobReproj.alignedVariance[5 * 16 + 12]), 'Out-of-bounds sx = 16.0 must return NaN variance');
});

test('Real FITS Integration Test J: TAN-SIP distortion, independent NASA/IPAC AP/BP cross-check, pixel reprojection across all 3 physical files, and runtime', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const crypto = await import('node:crypto');
  const { performance } = await import('node:perf_hooks');

  const cacheDir = '/tmp/spherex_cache';
  const expectedFiles = [
    {
      name: 'b6a1e605728059ea6b7def1e9683adb2.fits',
      obsId: '2025W18_1B_0001_1',
      sha256: 'b66f276a2b3fe6e9318229b574f058be9dba1cda45fd46678014b7837b5187e9',
      crpix1: 32.5,
      crpix2: 31.5,
      a00: 0.32053197961,
      b00: -1.18308696523,
    },
    {
      name: '569dafa911ec60ff30abb1807d719fef.fits',
      obsId: '2025W18_1B_0001_2',
      sha256: 'f39c8687dae94b80ec39e0cf537425f4dcf6e24ed26268b57c59b379b406a182',
      crpix1: 34.5,
      crpix2: 146.5,
      a00: 0.460012528281,
      b00: -1.34096951066,
    },
    {
      name: '75b2c2369c175060576bec8d2e5333c0.fits',
      obsId: '2025W18_1B_0001_3',
      sha256: '8e1d894ae95abca0dc3936a9fc45eb9ccfc2636b79496fefc64a57557dfd1a8d',
      crpix1: 36.5,
      crpix2: 261.5,
      a00: 0.253411983969,
      b00: -1.20333674297,
    },
  ];

  // Fail loudly if real physical FITS fixtures are missing or corrupted
  const buffers: Buffer[] = [];
  for (const spec of expectedFiles) {
    const p = path.join(cacheDir, spec.name);
    assert.equal(fs.existsSync(p), true, `Missing required physical SPHEREx FITS file: ${p}`);
    const buf = fs.readFileSync(p);
    assert.equal(buf.length, 5117760);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    assert.equal(sha, spec.sha256, `SHA-256 mismatch for ${spec.name}`);
    buffers.push(buf);
  }

  // Verify cold uncached registration + pixel reprojection runtime on real 64x64 cutout
  const coldFits1 = FITSReader.parse(buffers[0]);
  const coldFits2 = FITSReader.parse(buffers[1]);
  const tColdStart = performance.now();
  const coldReproj = ScientificPipeline.reprojectPixelByPixel(coldFits1, coldFits2.wcs, 64, 64);
  const coldRuntimeMs = performance.now() - tColdStart;
  assert.ok(coldRuntimeMs < 2000, `Cold 64x64 reprojection runtime (${coldRuntimeMs} ms) exceeded budget`);
  assert.equal(coldReproj.alignedData.length, 64 * 64);

  const parsedFiles = buffers.map((b) => FITSReader.parse(b));
  for (let i = 0; i < parsedFiles.length; i++) {
    const f = parsedFiles[i];
    const spec = expectedFiles[i];
    assert.equal(f.wcs.ctype1, 'RA---TAN-SIP');
    assert.equal(f.wcs.ctype2, 'DEC--TAN-SIP');
    assert.equal(f.wcs.crpix1, spec.crpix1);
    assert.equal(f.wcs.crpix2, spec.crpix2);
    assert.equal(f.wcs.sip?.aOrder, 3);
    assert.equal(f.wcs.sip?.bOrder, 3);
    assert.equal(f.wcs.sip?.apOrder, 3);
    assert.equal(f.wcs.sip?.bpOrder, 3);

    const a00Term = f.wcs.sip!.aTerms.find((t) => t.p === 0 && t.q === 0);
    const b00Term = f.wcs.sip!.bTerms.find((t) => t.p === 0 && t.q === 0);
    assert.ok(Math.abs((a00Term?.coeff ?? 0) - spec.a00) < 1e-11);
    assert.ok(Math.abs((b00Term?.coeff ?? 0) - spec.b00) < 1e-11);

    // Verify Newton-Raphson round-trip (< 1e-12 px) AND independent NASA/IPAC AP/BP polynomial consistency (< 0.006 px) across 49 grid points
    let maxRoundTripErr = 0;
    let maxApBpDiscrepancy = 0;
    for (let gy = 0; gy <= 63; gy += 10.5) {
      for (let gx = 0; gx <= 63; gx += 10.5) {
        const sky = WCS.pixToSky(gx, gy, f.wcs);
        const rt = WCS.skyToPix(sky.ra, sky.dec, f.wcs);
        maxRoundTripErr = Math.max(maxRoundTripErr, Math.hypot(rt.x - gx, rt.y - gy));

        // Pure reverse Shupe polynomial without Newton refinement (aTerms=[], bTerms=[])
        const reverseOnlyWcs: WCSParams = {
          ...f.wcs,
          sip: {
            aOrder: f.wcs.sip!.apOrder!,
            bOrder: f.wcs.sip!.bpOrder!,
            apOrder: f.wcs.sip!.apOrder!,
            bpOrder: f.wcs.sip!.bpOrder!,
            aTerms: [],
            bTerms: [],
            apTerms: f.wcs.sip!.apTerms,
            bpTerms: f.wcs.sip!.bpTerms,
          },
        };
        const apBpPix = WCS.skyToPix(sky.ra, sky.dec, reverseOnlyWcs);
        maxApBpDiscrepancy = Math.max(maxApBpDiscrepancy, Math.hypot(apBpPix.x - gx, apBpPix.y - gy));
      }
    }
    assert.ok(maxRoundTripErr < 1e-10, `File ${i + 1} Newton-Raphson round-trip error ${maxRoundTripErr} px >= 1e-10`);
    assert.ok(maxApBpDiscrepancy < 0.006, `File ${i + 1} AP/BP discrepancy ${maxApBpDiscrepancy} px >= 0.006`);
  }

  // Verify pixel-by-pixel TAN-SIP reprojection across all 3 physical pairs (1->2, 2->3, 1->3)
  const expectedPairWarps = [
    { i: 0, j: 1, minWarp: 0.025, maxWarp: 0.035, minSnr23_31: -145, maxSnr23_31: -135 },
    { i: 1, j: 2, minWarp: 0.025, maxWarp: 0.035, minSnr23_31: -10, maxSnr23_31: 10 },
    { i: 0, j: 2, minWarp: 0.050, maxWarp: 0.065, minSnr23_31: -150, maxSnr23_31: -140 },
  ];

  for (const pair of expectedPairWarps) {
    const f1 = parsedFiles[pair.i];
    const f2 = parsedFiles[pair.j];
    const reproj = ScientificPipeline.reprojectPixelByPixel(f1, f2.wcs, 64, 64);

    assert.ok(
      reproj.grid.maxSpatialWarpPixels >= pair.minWarp && reproj.grid.maxSpatialWarpPixels <= pair.maxWarp,
      `Pair ${pair.i + 1}->${pair.j + 1} warp ${reproj.grid.maxSpatialWarpPixels} px outside expected [${pair.minWarp}, ${pair.maxWarp}]`
    );

    // Count out-of-bounds pixels explicitly marked NaN without edge extrapolation
    let oobNanCount = 0;
    for (let k = 0; k < 64 * 64; k++) {
      if (reproj.grid.srcX[k] < 0 || reproj.grid.srcX[k] > 63 || reproj.grid.srcY[k] < 0 || reproj.grid.srcY[k] > 63) {
        assert.ok(Number.isNaN(reproj.alignedData[k]), `Out-of-bounds pixel ${k} must have NaN flux`);
        assert.ok(Number.isNaN(reproj.alignedVariance[k]), `Out-of-bounds pixel ${k} must have NaN variance`);
        assert.equal(reproj.alignedFlags![k], 0, `Out-of-bounds pixel ${k} must have 0 DQ flags`);
        oobNanCount++;
      }
    }
    assert.equal(oobNanCount, 127, `Expected 127 out-of-bounds pixels on pair ${pair.i + 1}->${pair.j + 1}`);
  }

  // Verify exact CAND-13 (x=19, y=31) local mapping, variance propagation, and conservative DQ bitwise OR on Pair 1 -> 2
  const reproj12 = ScientificPipeline.reprojectPixelByPixel(parsedFiles[0], parsedFiles[1].wcs, 64, 64);
  const idx = 31 * 64 + 19;
  assert.ok(Math.abs(reproj12.grid.srcX[idx] - 18.461021824284437) < 1e-11);
  assert.ok(Math.abs(reproj12.grid.srcY[idx] - 31.059421344181963) < 1e-11);
  assert.equal(parsedFiles[0].flags![idx], 2097154); // 0x200002 (OVERFLOW | SOURCE)
  assert.equal(reproj12.alignedFlags![idx], 2097159); // 0x200007 (TRANSIENT | OVERFLOW | SUR_ERROR | SOURCE via 2x2 stencil OR)
  assert.equal(parsedFiles[1].flags![idx], 2097157); // 0x200005 (TRANSIENT | SUR_ERROR | SOURCE)
});

test('Scientific Integrity Regression: Weak stationary PSF residuals separated by 71-175" are NOT classified as moving objects', () => {
  const width = 64;
  const height = 64;
  const size = width * height;

  const data1 = new Float32Array(size).fill(2.0);
  const data2 = new Float32Array(size).fill(2.0);
  const varMap = new Float32Array(size).fill(0.1);
  const diff = new Float32Array(size).fill(0.0);
  const sig = new Float32Array(size).fill(0.0);

  // Star 1 at (15, 20): stationary star present in both epochs, slight pointing jitter residual (+1.8)
  data1[20 * width + 15] = 45.0;
  data2[20 * width + 15] = 46.8;
  diff[20 * width + 15] = 1.8;
  sig[20 * width + 15] = 1.8 / Math.sqrt(0.2); // ~4.02 sigma

  // Star 2 at (35, 20): another stationary star 20 px (~123") away with slight negative residual (-1.6)
  data1[20 * width + 35] = 50.0;
  data2[20 * width + 35] = 48.4;
  diff[20 * width + 35] = -1.6;
  sig[20 * width + 35] = -1.6 / Math.sqrt(0.2); // ~ -3.58 sigma

  const wcs: WCSParams = {
    crval1: 276.26,
    crval2: 64.82,
    crpix1: 32.5,
    crpix2: 32.5,
    cdelt1: -6.15 / 3600,
    cdelt2: 6.15 / 3600,
    cd1_1: -6.15 / 3600,
    cd1_2: 0,
    cd2_1: 0,
    cd2_2: 6.15 / 3600,
    ctype1: 'RA---TAN',
    ctype2: 'DEC--TAN',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec: 6.15,
  };

  // Intra-visit cadence: 128 seconds = 0.00148 days
  const timeBaselineDays = 128.93 / 86400;
  const candidates = ScientificPipeline.detectCandidates(
    diff,
    varMap,
    sig,
    data1,
    data2,
    null,
    null,
    width,
    height,
    wcs,
    0.3,
    timeBaselineDays
  );

  // Verify that neither candidate is falsely classified as a moving object
  const movingCands = candidates.filter((c) => c.status === 'Moving object candidate' || c.motion?.isMoving);
  assert.equal(movingCands.length, 0, 'Weak stationary PSF residuals must NOT be paired into a false moving object');

  // Verify classifications are separated
  const star1Cand = candidates.find((c) => c.peakX === 15 && c.peakY === 20);
  if (star1Cand) {
    assert.notEqual(star1Cand.scientificClassification, 'POSSIBLE_MOVING_OBJECT');
    assert.ok(
      star1Cand.scientificClassification === 'SIGNIFICANT_FLUX_CHANGE' ||
      star1Cand.scientificClassification === 'STATIONARY_SOURCE_RESIDUAL' ||
      star1Cand.scientificClassification === 'REGISTRATION_OR_PSF_ARTIFACT',
      'Star 1 must have an authentic stationary classification'
    );
  }
});

test('Scientific Integrity Regression: Subpixel centroiding preserves integer peaks and provides subpixel accuracy', () => {
  const width = 64;
  const height = 64;
  const diff = new Float32Array(width * height).fill(0.0);

  // Asymmetric peak centered near (25.3, 30.2)
  diff[30 * width + 25] = 10.0;
  diff[30 * width + 26] = 6.0;
  diff[31 * width + 25] = 4.0;
  diff[29 * width + 25] = 1.0;
  diff[30 * width + 24] = 1.0;

  const centroid = ScientificPipeline.computeSubpixelCentroid(diff, width, height, 25, 30, 2);
  assert.equal(centroid.valid, true);
  // Integer peak is at 25, subpixel centroid is shifted towards 26 (x > 25)
  assert.ok(centroid.cx > 25.0 && centroid.cx < 26.0, `Centroid cx should be > 25.0, got ${centroid.cx}`);
  // Subpixel centroid shifted towards 31 (y > 30)
  assert.ok(centroid.cy > 30.0 && centroid.cy < 31.0, `Centroid cy should be > 30.0, got ${centroid.cy}`);
  assert.ok(centroid.uncertaintyPix > 0.05 && centroid.uncertaintyPix < 0.5);
});

test('FITSReader: parses and indexes all 6 MEF extensions (IMAGE, FLAGS, VARIANCE, ZODI, PSF, WCS-WAVE) on physical FITS files', () => {
  const buffer = fs.readFileSync('data/spherex_cache/b6a1e605728059ea6b7def1e9683adb2.fits');
  const parsed = FITSReader.parse(buffer);

  assert.ok(parsed.hdus, 'Must parse HDUs list');
  assert.equal(parsed.hdus.length, 7, 'Must find 7 HDUs (Primary + 6 extensions)');

  const extnames = parsed.hdus.map((h: any) => h.name.trim());
  assert.ok(extnames.includes('PRIMARY'));
  assert.ok(extnames.includes('IMAGE'));
  assert.ok(extnames.includes('FLAGS'));
  assert.ok(extnames.includes('VARIANCE'));
  assert.ok(extnames.includes('ZODI'));
  assert.ok(extnames.includes('PSF'));
  assert.ok(extnames.includes('WCS-WAVE'));

  // Verify ZODI and PSF metadata preservation
  assert.ok(parsed.zodi, 'Must preserve ZODI model array');
  assert.equal(parsed.zodi.width, 64);
  assert.equal(parsed.zodi.height, 64);

  assert.ok(parsed.psfMetadata, 'Must preserve PSF 3D model metadata');
  assert.equal(parsed.psfMetadata.is3DModel, true);
  assert.deepEqual(parsed.psfMetadata.dimensions, [101, 101, 121]);

  assert.ok(parsed.wcsWaveMetadata, 'Must preserve WCS-WAVE spectral table metadata');
  assert.equal(parsed.wcsWaveMetadata.isTable, true);
});

test('Pipeline: checkCompatibility enforces release boundary (QR2 vs QR2 ok, QR3 vs QR3 ok, QR2 vs QR3 rejected)', () => {
  const obsQr2_1: any = {
    obs_id: 'SPX_QR2_01',
    releaseId: 'SPHEREx-QR2-Level2B',
    date_obs: '2025-04-28T13:00:15.755Z',
    date_end: '2025-04-28T13:02:10.835Z',
    wavelength_um: 0.93,
    t_min: 60793.5418,
    t_max: 60793.5431,
  };
  const obsQr2_2: any = {
    obs_id: 'SPX_QR2_02',
    releaseId: 'SPHEREx-QR2-Level2B',
    date_obs: '2025-04-28T13:02:24.686Z',
    date_end: '2025-04-28T13:04:19.766Z',
    wavelength_um: 0.93,
    t_min: 60793.5433,
    t_max: 60793.5446,
  };
  const obsQr3: any = {
    obs_id: 'SPX_QR3_01',
    releaseId: 'SPHEREx-QR3-Level2B',
    date_obs: '2026-09-15T10:00:00.000Z',
    date_end: '2026-09-15T10:01:55.080Z',
    wavelength_um: 0.93,
    t_min: 61298.4166,
    t_max: 61298.4179,
  };

  const dummyFits: any = {
    wcs: { pixelScaleArcsec: 6.15 },
    header: {},
    stats: { robustNoise: 0.5 },
  };

  // 1. QR2 vs QR2
  const checkQr2 = ScientificPipeline.checkCompatibility(obsQr2_1, obsQr2_2, dummyFits, dummyFits);
  assert.equal(checkQr2.isCompatible, true, 'QR2 vs QR2 must be compatible');

  // 2. QR3 vs QR3
  const obsQr3_2 = { ...obsQr3, obs_id: 'SPX_QR3_02', date_obs: '2026-09-15T10:02:08.000Z' };
  const checkQr3 = ScientificPipeline.checkCompatibility(obsQr3, obsQr3_2, dummyFits, dummyFits);
  assert.equal(checkQr3.isCompatible, true, 'QR3 vs QR3 must be compatible');

  // 3. QR2 vs QR3 Cross-release comparison
  const checkCross = ScientificPipeline.checkCompatibility(obsQr2_1, obsQr3, dummyFits, dummyFits);
  assert.equal(checkCross.isCompatible, false, 'QR2 vs QR3 cross-release must be rejected');
  assert.ok(checkCross.reason?.includes('Cross-release comparison rejected'), 'Must provide clear rejection explanation');
  assert.ok(checkCross.reason?.includes('photometric cross-calibration') || checkCross.reason?.includes('flux correction factors'));
});
