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

test('Pipeline: assessArtifact flags SPHEREx bitmask 0x200000 persistence contamination', () => {
  const width = 16;
  const height = 16;
  const size = width * height;
  const diff = new Float32Array(size).fill(0);
  diff[5 * width + 5] = 40.0;

  const flags1 = new Int32Array(size).fill(0);
  const flags2 = new Int32Array(size).fill(0);
  flags2[5 * width + 5] = 0x200000; // Persistence contamination flag in SPHEREx QR2

  const res = ScientificPipeline.assessArtifact(5, 5, 20.0, diff, flags1, flags2, width, height);
  assert.ok(res.flags.includes('PERSISTENCE_CONTAMINATION'));
  assert.ok(res.artifactScore >= 0.8);
  assert.ok(res.whyFlagged?.includes('persistence contamination'));
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

