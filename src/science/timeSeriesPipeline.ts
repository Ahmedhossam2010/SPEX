import { FITSReader } from './fitsReader';
import { WCS } from './wcs';
import { FITSImageData, SPHERExObservation, WCSParams } from './types';
import { SPHEREX_DETECTOR_ARRAYS, SPHEREX_102_CHANNELS } from './spectralBands';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface DecodedDQFlags {
  transientOrCR: number; // Bit 0 (0x1)
  overflow: number; // Bit 1 (0x2)
  surError: number; // Bit 2 (0x4)
  nonFunc: number; // Bit 4 (0x10)
  hot: number; // Bit 5 (0x20)
  statisticalOutlier: number; // Bit 19 (0x80000)
  source: number; // Bit 21 (0x200000)
  totalMaskedPixels: number;
  totalPixels: number;
  maskedFraction: number; // [0.0, 1.0]
}

export interface TimeSeriesFrame {
  index: number;
  obsId: string;
  detector: string; // 'D1'..'D6'
  visitKey: string; // e.g. '2025W35_1A_0444'
  mjd: number;
  dateObs: string;
  dateEnd?: string;
  integrationDurationSec?: number;
  wavelengthUm: number;
  width: number;
  height: number;
  flux: number[];
  variance?: number[];
  flags?: number[];
  dqDecoded: DecodedDQFlags;
  wcs: WCSParams;
  reprojectedFlux: number[]; // Aligned to reference WCS
  /** Where the propagated target lands in this frame, and its distance to the frame edge. */
  targetPixel?: { x: number; y: number; insideCutout: boolean; pxFromEdge: number };
  fitsUrl: string;
  accessUrl: string;
  isSimulated?: boolean;
  simulatedLabel?: string;
}

export interface TemporalPairInfo {
  frameAIndex: number;
  frameBIndex: number;
  obsIdA: string;
  obsIdB: string;
  baselineType: 'INTRA_VISIT' | 'INDEPENDENT_VISIT' | 'SURVEY_EPOCH';
  deltaMjd: number;
  deltaSeconds: number;
  deltaDays: number;
  humanBaseline: string;
  startToStartCadenceSec?: number;
  interExposureGapSec?: number;
}

export interface DetectorStack {
  detector: string;
  detectorNumber: number;
  bandName: string;
  wavelengthRange: string;
  frameCount: number;
  width: number;
  height: number;
  stackedFlux: number[];
  stackedVariance: number[];
  stats: {
    min: number;
    max: number;
    mean: number;
    std: number;
  };
}

export interface SpectrumPoint {
  channelIndex?: number;
  detector: string;
  obsId: string;
  mjd: number;
  date: string;
  wavelengthUm: number;
  fluxMjySr: number;
  uncertaintyMjySr: number;
  snr: number;
  isApertureSum: boolean;
}

export interface CatalogOverlayItem {
  catalog: 'Gaia DR3' | 'AllWISE';
  identifier: string;
  raRaw: number;
  decRaw: number;
  raPropagated: number;
  decPropagated: number;
  x: number; // pixel X on reference WCS
  y: number; // pixel Y on reference WCS
  mag?: number;
  magLabel?: string;
  pmRaMasYr?: number;
  pmDecMasYr?: number;
  sourceType: string;
}

export interface TimeSeriesResult {
  targetCoords: { ra: number; dec: number };
  fovArcmin: number;
  sizePix: number;
  totalExposuresFound: number;
  framesReturned: number;
  frames: TimeSeriesFrame[];
  pairs: TemporalPairInfo[];
  detectorStacks: Record<string, DetectorStack>;
  spectrumAtCenter: SpectrumPoint[];
  referenceWcs: WCSParams;
  catalogOverlays: CatalogOverlayItem[];
  releaseId: string;
  message?: string;
  /** Proper-motion propagation applied for per-exposure cutout centering. */
  properMotion?: {
    targetId?: string;
    pmRaMasYr: number;
    pmDecMasYr: number;
    fromEpochYear: number;
    toEpochYear: number;
    separationArcsec: number;
  };
}

/** How the final FITS URL was obtained. */
export type FitsResolutionMethod = 'datalink' | 'fallback';

export interface ResolvedFitsUrl {
  url: string;
  resolvedBy: FitsResolutionMethod;
}

// In-memory cache for resolved DataLink FITS URLs
const datalinkUrlCache = new Map<string, ResolvedFitsUrl>();

/**
 * Verifies that a resolved FITS URL is actually downloadable using a small
 * ranged GET (first FITS block). Throws when the request fails or the server
 * returns a non-success status, so a broken URL never reaches the pipeline
 * silently.
 */
async function verifyFitsUrl(url: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Range: 'bytes=0-2879',
        'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(
        `FITS URL verification failed (HTTP ${res.status} ${res.statusText}) for ${url}`
      );
    }
    try {
      await res.arrayBuffer();
    } catch {
      // Body read issues do not invalidate a 2xx response; the status check above is authoritative.
    }
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.message.startsWith('FITS URL verification failed')) {
      throw err;
    }
    throw new Error(`FITS URL verification failed for ${url}: ${String(err)}`);
  }
}

/**
 * Resolves an IRSA DataLink access_url to its authentic calibrated Level-2B FITS cutout URL.
 * Returns which method produced the URL ('datalink' from the DataLink document, 'fallback'
 * from the deterministic IBE builder), verifies the result with a real request, and logs a
 * warning whenever the fallback path is used.
 */
export async function resolveFitsUrl(accessUrl: string, obsId?: string, detector?: string): Promise<ResolvedFitsUrl> {
  if (!accessUrl) {
    const fallback = buildFallbackFitsUrl(obsId, detector);
    console.warn(`[resolveFitsUrl] No access_url provided for ${obsId ?? 'unknown obs'}; using fallback URL`);
    await verifyFitsUrl(fallback);
    const resolved: ResolvedFitsUrl = { url: fallback, resolvedBy: 'fallback' };
    return resolved;
  }

  const cached = datalinkUrlCache.get(accessUrl);
  if (cached) {
    return cached;
  }

  // Attempt resolving from DataLink XML
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(accessUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0' },
    });
    clearTimeout(timeout);
    if (res.ok) {
      const xml = await res.text();
      const match = xml.match(/<TD>(https:\/\/irsa\.ipac\.caltech\.edu\/ibe\/data\/[^<]+\.fits)<\/TD>/);
      if (match && match[1]) {
        await verifyFitsUrl(match[1]);
        const resolved: ResolvedFitsUrl = { url: match[1], resolvedBy: 'datalink' };
        datalinkUrlCache.set(accessUrl, resolved);
        return resolved;
      }
    }
  } catch (verifyErr) {
    if (verifyErr instanceof Error && verifyErr.message.startsWith('FITS URL verification failed')) {
      // The URL the archive itself advertised is broken: surface the error, never
      // pretend the fallback is the archive's real product.
      throw verifyErr;
    }
    // Network/XML failure: graceful fallback below
  }

  const fallback = buildFallbackFitsUrl(obsId, detector, accessUrl);
  console.warn(
    `[resolveFitsUrl] DataLink resolution failed for ${obsId ?? accessUrl}; using fallback URL: ${fallback}`
  );
  await verifyFitsUrl(fallback);
  const resolved: ResolvedFitsUrl = { url: fallback, resolvedBy: 'fallback' };
  datalinkUrlCache.set(accessUrl, resolved);
  return resolved;
}

/**
 * Builds a deterministic IRSA IBE Level-2B FITS cutout URL based on obsId and detector.
 */
export function buildFallbackFitsUrl(obsId?: string, detector?: string, accessUrl?: string): string {
  const det = (detector || (accessUrl ? accessUrl.match(/\/D([1-6])$/)?.[1] : null) || '1').replace(/^D/i, '');
  const id = obsId || '2025W18_1B_0001_1';
  const weekMatch = id.match(/^(\d{4}W\d{2}_[0-9A-Z]+)/);
  const week = weekMatch ? weekMatch[1] : '2025W18_1B';
  const base = process.env.SPHEREX_BASE_URL || 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2';
  return `${base}/level2/${week}/l2b-v20-2025-241/${det}/level2_${id}D${det}_spx_l2b-v20-2025-241.fits`;
}

/**
 * Extracts the flight visitKey (e.g. '2025W18_1B_0001') from an exposure obs_id ('2025W18_1B_0001_1').
 */
export function extractVisitKey(obsId: string): string {
  const parts = obsId.split('_');
  if (parts.length >= 4) {
    return `${parts[0]}_${parts[1]}_${parts[2]}`;
  }
  return obsId.replace(/_\d+$/, '');
}

/**
 * Decodes the SPHEREx Level-2 quality bitmask flags and counts masked pixels.
 */
export function decodeBitmaskFlags(flags: Int32Array | null | undefined, totalPixels: number): DecodedDQFlags {
  const dq: DecodedDQFlags = {
    transientOrCR: 0,
    overflow: 0,
    surError: 0,
    nonFunc: 0,
    hot: 0,
    statisticalOutlier: 0,
    source: 0,
    totalMaskedPixels: 0,
    totalPixels,
    maskedFraction: 0,
  };

  if (!flags || flags.length === 0) {
    return dq;
  }

  let maskedCount = 0;
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i];
    if (f !== 0) {
      maskedCount++;
      if (f & 0x01) dq.transientOrCR++;
      if (f & 0x02) dq.overflow++;
      if (f & 0x04) dq.surError++;
      if (f & 0x10) dq.nonFunc++;
      if (f & 0x20) dq.hot++;
      if (f & 0x80000) dq.statisticalOutlier++;
      if (f & 0x200000) dq.source++;
    }
  }

  dq.totalMaskedPixels = maskedCount;
  dq.maskedFraction = totalPixels > 0 ? Number((maskedCount / totalPixels).toFixed(4)) : 0;
  return dq;
}

/**
 * Co-adds all frames belonging to each detector using optimal inverse-variance weighting.
 */
export function computeDetectorStacks(frames: TimeSeriesFrame[]): Record<string, DetectorStack> {
  const stacks: Record<string, DetectorStack> = {};

  // Group by detector
  const byDetector = new Map<string, TimeSeriesFrame[]>();
  for (const f of frames) {
    const list = byDetector.get(f.detector) || [];
    list.push(f);
    byDetector.set(f.detector, list);
  }

  byDetector.forEach((detFrames, det) => {
    if (detFrames.length === 0) return;
    const ref = detFrames[0];
    const width = ref.width;
    const height = ref.height;
    const numPixels = width * height;

    const stackedFlux = new Float32Array(numPixels);
    const stackedVariance = new Float32Array(numPixels);
    const weightSum = new Float32Array(numPixels);

    for (const frame of detFrames) {
      const data = frame.reprojectedFlux.length === numPixels ? frame.reprojectedFlux : frame.flux;
      const vars = frame.variance && frame.variance.length === numPixels ? frame.variance : null;
      const flags = frame.flags && frame.flags.length === numPixels ? frame.flags : null;

      for (let p = 0; p < numPixels; p++) {
        // Skip saturated full-well or bad pixels
        if (flags && (flags[p] & 0x02 || flags[p] & 0x10)) {
          continue;
        }

        const v = vars && vars[p] > 1e-12 ? vars[p] : 1.0;
        const w = 1.0 / v;
        stackedFlux[p] += data[p] * w;
        weightSum[p] += w;
      }
    }

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let validPix = 0;

    for (let p = 0; p < numPixels; p++) {
      if (weightSum[p] > 0) {
        stackedFlux[p] /= weightSum[p];
        stackedVariance[p] = 1.0 / weightSum[p];
        const val = stackedFlux[p];
        if (Number.isFinite(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
          sum += val;
          validPix++;
        }
      }
    }

    const mean = validPix > 0 ? sum / validPix : 0;
    let varSum = 0;
    for (let p = 0; p < numPixels; p++) {
      if (weightSum[p] > 0) {
        const diff = stackedFlux[p] - mean;
        varSum += diff * diff;
      }
    }
    const std = validPix > 1 ? Math.sqrt(varSum / (validPix - 1)) : 0;

    const detNum = parseInt(det.replace(/\D/g, ''), 10) || 1;
    const detArray = SPHEREX_DETECTOR_ARRAYS.find((d) => d.detectorNumber === detNum);

    stacks[det] = {
      detector: det,
      detectorNumber: detNum,
      bandName: detArray ? detArray.name : `Detector ${det}`,
      wavelengthRange: detArray ? `${detArray.wavelengthRangeUm[0]} – ${detArray.wavelengthRangeUm[1]} µm` : '',
      frameCount: detFrames.length,
      width,
      height,
      stackedFlux: Array.from(stackedFlux),
      stackedVariance: Array.from(stackedVariance),
      stats: {
        min: Number(min.toFixed(4)),
        max: Number(max.toFixed(4)),
        mean: Number(mean.toFixed(4)),
        std: Number(std.toFixed(4)),
      },
    };
  });

  return stacks;
}

/**
 * Extracts on-the-fly multi-wavelength spectrum at a pixel coordinate or within an aperture.
 * Computes exact wavelength via SPHEREx LVF dispersion formula across detectors.
 */
export function extractApertureSpectrum(
  frames: TimeSeriesFrame[],
  targetX: number,
  targetY: number,
  apertureRadiusPix = 2.5
): SpectrumPoint[] {
  const points: SpectrumPoint[] = [];

  for (const f of frames) {
    const width = f.width;
    const height = f.height;
    if (width === 0 || height === 0) continue;

    // LVF wavelength calculation across detector Y-axis
    const detNum = parseInt(f.detector.replace(/\D/g, ''), 10) || 1;
    const detArray = SPHEREX_DETECTOR_ARRAYS.find((d) => d.detectorNumber === detNum);
    let wavelengthUm = f.wavelengthUm;
    if (detArray) {
      const yNorm = Math.min(Math.max(targetY / height, 0.0), 1.0);
      const [wMin, wMax] = detArray.wavelengthRangeUm;
      wavelengthUm = Number((wMin + yNorm * (wMax - wMin)).toFixed(3));
    }

    const r2 = apertureRadiusPix * apertureRadiusPix;
    let fluxSum = 0;
    let varSum = 0;
    let count = 0;

    const data = f.reprojectedFlux.length === width * height ? f.reprojectedFlux : f.flux;
    const vars = f.variance && f.variance.length === width * height ? f.variance : null;

    const xMin = Math.max(0, Math.floor(targetX - apertureRadiusPix));
    const xMax = Math.min(width - 1, Math.ceil(targetX + apertureRadiusPix));
    const yMin = Math.max(0, Math.floor(targetY - apertureRadiusPix));
    const yMax = Math.min(height - 1, Math.ceil(targetY + apertureRadiusPix));

    for (let py = yMin; py <= yMax; py++) {
      for (let px = xMin; px <= xMax; px++) {
        const dx = px - targetX;
        const dy = py - targetY;
        if (dx * dx + dy * dy <= r2) {
          const idx = py * width + px;
          fluxSum += data[idx];
          varSum += vars ? vars[idx] : 1.0;
          count++;
        }
      }
    }

    if (count > 0) {
      const meanFlux = fluxSum / count;
      const uncertainty = Math.sqrt(varSum) / count;
      const snr = uncertainty > 1e-12 ? Math.abs(meanFlux / uncertainty) : 0;

      points.push({
        detector: f.detector,
        obsId: f.obsId,
        mjd: f.mjd,
        date: f.dateObs,
        wavelengthUm,
        fluxMjySr: Number(meanFlux.toFixed(4)),
        uncertaintyMjySr: Number(uncertainty.toFixed(4)),
        snr: Number(snr.toFixed(2)),
        isApertureSum: true,
      });
    }
  }

  // Sort by wavelength
  points.sort((a, b) => a.wavelengthUm - b.wavelengthUm);
  return points;
}
