import { SpectralBandInfo, CatalogMatch } from './types';

/**
 * SPHEREx 102 Near-Infrared Spectral Band Model:
 * SPHEREx achieves all-sky spectroscopy across 0.75 - 5.0 µm using 6 Teledyne H2RG
 * 2048x2048 detector arrays coupled to Linear Variable Filters (LVFs).
 *
 * DETECTOR / BAND ARCHITECTURE:
 * - Detector 1 (Band 1): 0.75 - 1.11 µm | 17 channels | R ~ 41 | Deep optical-NIR transition, stellar photosphere
 * - Detector 2 (Band 2): 1.11 - 1.64 µm | 17 channels | R ~ 41 | 1.6 µm H- opacity minimum, cool dwarf peak
 * - Detector 3 (Band 3): 1.64 - 2.42 µm | 17 channels | R ~ 41 | 2.0 µm H2O ice, CO bandhead (2.3 µm)
 * - Detector 4 (Band 4): 2.42 - 3.82 µm | 17 channels | R ~ 35 | 3.05 µm H2O ice, 3.3 µm aromatic PAH feature
 * - Detector 5 (Band 5): 3.82 - 4.42 µm | 17 channels | R ~ 130 | 4.27 µm CO2 ice band (high resolution)
 * - Detector 6 (Band 6): 4.42 - 5.00 µm | 17 channels | R ~ 130 | 4.67 µm CO ice band & thermal dust continuum
 * Total: 6 x 17 = 102 independent spectral channels
 */

export interface DetectorArraySpec {
  detectorNumber: number; // 1 to 6
  name: string;
  technology: string;
  format: string; // 2048 x 2048
  pixelScaleArcsec: number; // 6.2" / pixel
  wavelengthRangeUm: [number, number];
  channelsCount: number;
  resolvingPower: string;
  scienceTarget: string;
}

export const SPHEREX_DETECTOR_ARRAYS: DetectorArraySpec[] = [
  {
    detectorNumber: 1,
    name: 'Detector 1 (Band 1)',
    technology: 'Teledyne H2RG HgCdTe (Cutoff 1.15 µm)',
    format: '2048 × 2048 (4 Mpix)',
    pixelScaleArcsec: 6.2,
    wavelengthRangeUm: [0.75, 1.11],
    channelsCount: 17,
    resolvingPower: 'R ≈ 41 (Δλ ≈ 0.022 µm)',
    scienceTarget: 'Large-scale cosmic galaxy clustering, stellar photospheres, low-redshift galaxy spectra',
  },
  {
    detectorNumber: 2,
    name: 'Detector 2 (Band 2)',
    technology: 'Teledyne H2RG HgCdTe (Cutoff 1.75 µm)',
    format: '2048 × 2048 (4 Mpix)',
    pixelScaleArcsec: 6.2,
    wavelengthRangeUm: [1.11, 1.64],
    channelsCount: 17,
    resolvingPower: 'R ≈ 41 (Δλ ≈ 0.033 µm)',
    scienceTarget: '1.6 µm H- opacity peak in stellar atmospheres, cool brown dwarf near-IR classification',
  },
  {
    detectorNumber: 3,
    name: 'Detector 3 (Band 3)',
    technology: 'Teledyne H2RG HgCdTe (Cutoff 2.50 µm)',
    format: '2048 × 2048 (4 Mpix)',
    pixelScaleArcsec: 6.2,
    wavelengthRangeUm: [1.64, 2.42],
    channelsCount: 17,
    resolvingPower: 'R ≈ 41 (Δλ ≈ 0.048 µm)',
    scienceTarget: 'Diffuse Extragalactic Background Light (EBL), water ice 2.0 µm absorption, CO overtone',
  },
  {
    detectorNumber: 4,
    name: 'Detector 4 (Band 4)',
    technology: 'Teledyne H2RG HgCdTe (Cutoff 3.90 µm)',
    format: '2048 × 2048 (4 Mpix)',
    pixelScaleArcsec: 6.2,
    wavelengthRangeUm: [2.42, 3.82],
    channelsCount: 17,
    resolvingPower: 'R ≈ 35 (Δλ ≈ 0.088 µm)',
    scienceTarget: '3.05 µm solid H2O ice mantle absorption, 3.3 µm polycyclic aromatic hydrocarbon (PAH)',
  },
  {
    detectorNumber: 5,
    name: 'Detector 5 (Band 5)',
    technology: 'Teledyne H2RG HgCdTe (Cutoff 5.30 µm)',
    format: '2048 × 2048 (4 Mpix)',
    pixelScaleArcsec: 6.2,
    wavelengthRangeUm: [3.82, 4.42],
    channelsCount: 17,
    resolvingPower: 'R ≈ 130 (Δλ ≈ 0.032 µm, High Resolution)',
    scienceTarget: '4.27 µm interstellar CO2 ice absorption resonance in molecular clouds and protoplanetary disks',
  },
  {
    detectorNumber: 6,
    name: 'Detector 6 (Band 6)',
    technology: 'Teledyne H2RG HgCdTe (Cutoff 5.30 µm)',
    format: '2048 × 2048 (4 Mpix)',
    pixelScaleArcsec: 6.2,
    wavelengthRangeUm: [4.42, 5.00],
    channelsCount: 17,
    resolvingPower: 'R ≈ 130 (Δλ ≈ 0.035 µm, High Resolution)',
    scienceTarget: '4.67 µm solid CO ice band, XCN feature, cold thermal circumstellar dust emission',
  },
];

/**
 * Generate the 102 individual spectral channels.
 */
export function generate102SpectralChannels(): SpectralBandInfo[] {
  const channels: SpectralBandInfo[] = [];
  let channelIdx = 1;

  for (const det of SPHEREX_DETECTOR_ARRAYS) {
    const [wMin, wMax] = det.wavelengthRangeUm;
    const step = (wMax - wMin) / det.channelsCount;

    for (let i = 0; i < det.channelsCount; i++) {
      const wCenter = Number((wMin + (i + 0.5) * step).toFixed(3));
      const bandwidth = Number(step.toFixed(4));
      const resolvingPower = det.detectorNumber >= 5 ? 130 : (det.detectorNumber === 4 ? 35 : 41);

      let features = 'Stellar continuum';
      if (wCenter >= 0.90 && wCenter <= 0.95) features = 'SPHEREx QR2 Band 1 primary calibration channel';
      else if (wCenter >= 1.55 && wCenter <= 1.65) features = '1.6 µm H- opacity peak / cold dwarf SED maximum';
      else if (wCenter >= 2.00 && wCenter <= 2.05) features = '2.02 µm solid H2O ice absorption wing';
      else if (wCenter >= 2.28 && wCenter <= 2.35) features = '2.3 µm 12CO absorption bandhead in red giants';
      else if (wCenter >= 3.00 && wCenter <= 3.10) features = '3.05 µm fundamental OH stretching vibration in H2O ice';
      else if (wCenter >= 3.28 && wCenter <= 3.32) features = '3.3 µm C-H stretching mode in aromatic hydrocarbons (PAHs)';
      else if (wCenter >= 4.25 && wCenter <= 4.30) features = '4.27 µm asymmetric stretch (v3) in interstellar CO2 ice';
      else if (wCenter >= 4.65 && wCenter <= 4.70) features = '4.67 µm fundamental C-O stretching mode in solid CO ice';

      channels.push({
        channelIndex: channelIdx,
        detector: det.detectorNumber,
        bandName: `Band ${det.detectorNumber} (Ch ${channelIdx})`,
        wavelengthUm: wCenter,
        bandwidthUm: bandwidth,
        resolvingPower,
        primaryScienceFeatures: features,
      });

      channelIdx++;
    }
  }

  return channels;
}

export const SPHEREX_102_CHANNELS = generate102SpectralChannels();

/**
 * Generate a synthetic multi-wavelength Spectral Energy Distribution (SED) curve
 * for a detected astronomical candidate combining Gaia optical, SPHEREx near-IR, and AllWISE mid-IR.
 */
export function generateCandidateSED(candidate: {
  deltaFlux: number;
  catalogMatches?: CatalogMatch[] | Array<{ catalog: string; photometry?: string; identifier: string; separationArcsec?: number; [key: string]: any }>;
}): Array<{ wavelengthUm: number; fluxMjy: number; source: string; label: string; isModel: boolean; measurementType?: string }> {
  const points: Array<{ wavelengthUm: number; fluxMjy: number; source: string; label: string; isModel: boolean; measurementType?: string }> = [];

  // Calibrated conversion: 1 MJy/sr over SPHEREx pixel solid angle (6.152" / px) = 0.8895 mJy
  // Net aperture delta flux converted to mJy
  const spherexFluxMjy = Math.max(0.01, Math.abs(candidate.deltaFlux) * 0.8895);

  // 1. SPHEREx Band 1 observed measurement (0.93 µm)
  points.push({
    wavelengthUm: 0.93,
    fluxMjy: Number(spherexFluxMjy.toFixed(3)),
    source: 'SPHEREx QR2',
    label: `SPHEREx B1 (${Math.abs(candidate.deltaFlux).toFixed(2)} MJy/sr)`,
    isModel: false,
    measurementType: 'SPHEREx Differential Flux',
  });

  // 2. Gaia DR3 optical counterpart (G-band ~ 0.67 µm)
  const gaiaMatch = candidate.catalogMatches?.find((m) => m.catalog === 'Gaia DR3');
  if (gaiaMatch?.photometry && /G\s*=\s*[\d.]+/.test(gaiaMatch.photometry)) {
    const magMatch = gaiaMatch.photometry.match(/G\s*=\s*([\d.]+)/);
    if (magMatch) {
      const gMag = parseFloat(magMatch[1]);
      // Zero-point flux for Gaia G band is 3228 Jy = 3.228e6 mJy
      const gaiaFlux = 3.228e6 * Math.pow(10, -0.4 * gMag);
      points.push({
        wavelengthUm: 0.67,
        fluxMjy: Number(gaiaFlux.toFixed(3)),
        source: 'Gaia DR3',
        label: `Gaia G (${gMag.toFixed(2)} mag)`,
        isModel: false,
        measurementType: 'Catalog Photometry',
      });
    }
  } else {
    // If no catalog optical counterpart exists, provide clearly labeled synthetic stellar photosphere model
    points.push({
      wavelengthUm: 0.67,
      fluxMjy: Number((spherexFluxMjy * 0.85).toFixed(3)),
      source: 'Theoretical Model',
      label: 'Stellar Model Reference (0.67 µm)',
      isModel: true,
      measurementType: 'Model Passband Spec',
    });
  }

  // 3. AllWISE infrared counterparts: W1 (3.4 µm) and W2 (4.6 µm)
  const wiseMatch = candidate.catalogMatches?.find((m) => m.catalog === 'AllWISE');
  let hasWiseObs = false;
  if (wiseMatch?.photometry) {
    const w1m = wiseMatch.photometry.match(/W1=\s*([\d.]+)/);
    const w2m = wiseMatch.photometry.match(/W2=\s*([\d.]+)/);
    if (w1m) {
      hasWiseObs = true;
      const w1Flux = 309540 * Math.pow(10, -0.4 * parseFloat(w1m[1]));
      points.push({
        wavelengthUm: 3.4,
        fluxMjy: Number(w1Flux.toFixed(3)),
        source: 'AllWISE W1',
        label: `AllWISE W1 (${parseFloat(w1m[1]).toFixed(2)} mag)`,
        isModel: false,
        measurementType: 'Catalog Photometry',
      });
    }
    if (w2m) {
      hasWiseObs = true;
      const w2Flux = 171787 * Math.pow(10, -0.4 * parseFloat(w2m[1]));
      points.push({
        wavelengthUm: 4.6,
        fluxMjy: Number(w2Flux.toFixed(3)),
        source: 'AllWISE W2',
        label: `AllWISE W2 (${parseFloat(w2m[1]).toFixed(2)} mag)`,
        isModel: false,
        measurementType: 'Catalog Photometry',
      });
    }
  }

  if (!hasWiseObs) {
    // Clearly flag instrument passband specification models instead of fabricating unobserved fluxes
    points.push({
      wavelengthUm: 3.4,
      fluxMjy: Number((spherexFluxMjy * 0.45).toFixed(3)),
      source: 'Theoretical Model',
      label: 'AllWISE W1 Bandpass Spec (3.4 µm)',
      isModel: true,
      measurementType: 'Model Passband Spec',
    });
    points.push({
      wavelengthUm: 4.6,
      fluxMjy: Number((spherexFluxMjy * 0.35).toFixed(3)),
      source: 'Theoretical Model',
      label: 'AllWISE W2 Bandpass Spec (4.6 µm)',
      isModel: true,
      measurementType: 'Model Passband Spec',
    });
  }

  return points.sort((a, b) => a.wavelengthUm - b.wavelengthUm);
}
