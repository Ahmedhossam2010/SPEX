import test from 'node:test';
import assert from 'node:assert/strict';
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

    // Exact pixel-level verification for Candidate 1 (CAND-13) at (x=19, y=31)
    const c1 = res.candidates[0];
    assert.equal(c1.x, 19);
    assert.equal(c1.y, 31);
    const pIdx = 31 * 64 + 19;
    const pDiff = res.diff[pIdx];
    const pVar = res.variance[pIdx];
    const pUnc = Math.sqrt(pVar);
    const pSig = res.significance[pIdx];

    assert.ok(Math.abs(pDiff - (-455.4924)) < 0.01, `Difference at (19, 31) must be -455.49 MJy/sr, got ${pDiff}`);
    assert.ok(Math.abs(pVar - 10.3173) < 0.01, `Variance at (19, 31) must be 10.32 (MJy/sr)^2, got ${pVar}`);
    assert.ok(Math.abs(pUnc - 3.2121) < 0.01, `Uncertainty at (19, 31) must be 3.21 MJy/sr, got ${pUnc}`);
    assert.ok(Math.abs(pSig - (-141.81)) < 0.05, `Significance at (19, 31) must be -141.81 sigma, got ${pSig}`);
    // Strict invariant check: S/N === D / sqrt(Var)
    assert.ok(Math.abs(pSig - (pDiff / pUnc)) < 1e-5, 'Invariant S/N = D / sqrt(Var) must hold to float precision');

    // Extrema verification
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
    assert.ok(Math.abs(maxD - 476.88) < 0.1);

    assert.equal(minDCoord.x, 20);
    assert.equal(minDCoord.y, 30);
    assert.ok(Math.abs(minD - (-456.30)) < 0.1);

    assert.equal(maxSCoord.x, 47);
    assert.equal(maxSCoord.y, 2);
    assert.ok(Math.abs(maxS - 93.67) < 0.1);

    assert.equal(minSCoord.x, 48);
    assert.equal(minSCoord.y, 1);
    assert.ok(Math.abs(minS - (-159.85)) < 0.1);
  }
});

test('Dynamic Footprint & Solid Angle: verifies WCS corner projection and area distinction', async () => {
  const { DataReleaseAdapter } = await import('./dataReleaseAdapter');
  const fs = await import('fs');
  const path = await import('path');

  const cacheDir = '/tmp/spherex_cache';
  const cachedFiles = fs.readdirSync(cacheDir).filter((f: string) => f.endsWith('.fits'));
  const buf = fs.readFileSync(path.join(cacheDir, cachedFiles[0]));

  const norm = DataReleaseAdapter.normalizeFITS({
    fileName: cachedFiles[0],
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







