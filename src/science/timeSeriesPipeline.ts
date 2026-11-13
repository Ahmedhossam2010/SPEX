import { FITSReader } from './fitsReader';
import { WCS } from './wcs';
import { FITSImageData, SPHERExObservation, WCSParams, WcsWaveTable } from './types';
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

export interface MeasuredCentroid {
  x: number;
  y: number;
  ra?: number;
  dec?: number;
  dxArcsec: number;
  dyArcsec: number;
  uncertaintyArcsec: number;
  snr?: number;
  stacked?: boolean;
  valid: boolean;
  refStarsUsed?: number;
  refScatterArcsec?: number;
  astrometryMethod?: 'affine' | 'translation' | 'uncalibrated';
  lowConfidence?: boolean;
  lowConfidenceReason?: string;
  maskedReason?: string;
  distToPredictedPix?: number;
  wingFit?: boolean;
  centroidErrorArcsec?: number;
  refFitErrorArcsec?: number;
}

export interface LightCurvePoint {
  frameIndex: number;
  obsId: string;
  mjd: number;
  dateObs: string;
  detector: string;
  release?: string;
  version?: string;
  wavelengthUm: number;
  bandwidthUm?: number;
  fluxMjySr: number;
  uncertaintyMjySr: number;
  snr: number;
  valid: boolean;
  isWingAnnulus?: boolean;
  unmaskedPixels: number;
  maskedReason?: string;
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
  bandwidthUm?: number;
  version?: string;
  release?: string;
  cachedAt?: string;
  wcsWave?: WcsWaveTable;
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
  /** Predicted target position projected onto the common reference WCS grid */
  targetRefPixel?: { x: number; y: number };
  /** Subpixel measured centroid on the reference WCS grid */
  measuredCentroid?: MeasuredCentroid;
  fitsUrl: string;
  accessUrl: string;
  fitsSha256?: string;
  fitsOrigin?: 'live_ibe' | 'verified_fits_cache' | 'seeded_fixture_cache' | 'saved_snapshot' | 'synthetic_demo' | 'unavailable';
  fitsChecksumVerified?: boolean;
  isCached?: boolean;
  isDemoCopy?: boolean;
  trueCenter?: { ra: number; dec: number };
  trueObsId?: string;
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
  bandwidthUm?: number;
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
  /** True when the entry comes from the saved local benchmark fixture instead of a live catalog query. */
  isStaticFixture?: boolean;
}

export interface AvailableDetectorSummary {
  detector: string;
  bandName: string;
  wavelengthRangeUm: [number, number];
  exposureCount: number;
  minMjd: number;
  maxMjd: number;
  dateStart: string;
  dateEnd: string;
}

export interface TimeSeriesResult {
  status?: string;
  state?: string;
  sourceMode?: 'live' | 'saved_benchmark';
  sourceClassification?:
    | 'LIVE_ARCHIVE_DATA'
    | 'VERIFIED_FITS_CACHE'
    | 'STALE_TAP_CACHE'
    | 'SAVED_BENCHMARK'
    | 'SYNTHETIC_DEMO'
    | 'UNAVAILABLE';
  discoveryEligible?: boolean;
  discoveryEligibilityReason?: string;
  tapFreshness?: 'live' | 'fresh_cache' | 'stale_cache' | 'offline' | 'snapshot' | 'unavailable';
  tapCachedAt?: string;
  fitsOrigin?:
    | 'live_ibe'
    | 'verified_fits_cache'
    | 'seeded_fixture_cache'
    | 'saved_snapshot'
    | 'synthetic_demo'
    | 'unavailable';
  cacheIntegrityVerified?: boolean;
  cachedFrameCount?: number;
  liveFrameCount?: number;
  observationIds?: string[];
  fitsChecksums?: Array<{
    obsId: string;
    detector?: string;
    sha256: string;
    origin: string;
    verified: boolean;
    cachedAt?: string;
    sizeBytes?: number;
  }>;
  isSnapshot?: boolean;
  snapshotTakenAt?: string;
  sourceLabel?:
    | 'REAL SPHEREx DATA'
    | `REAL SPHEREx DATA - cached ${string}`
    | 'REAL DATA, SAVED COPY (NOT LIVE)'
    | 'DEMO COPY (DIFFERENT FIELD)'
    | string;
  cachedAt?: string;
  releaseBreakdown?: string[];
  centroidStacked?: boolean;
  partialFailures?: { failed: number; total: number; notice: string };
  isDemoCopy?: boolean;
  demoNotice?: string;
  trueCenter?: { ra: number; dec: number };
  targetCoords: { ra: number; dec: number };
  selectedDetector?: string;
  availableDetectors?: AvailableDetectorSummary[];
  fovArcmin: number;
  sizePix: number;
  totalExposuresFound: number;
  framesReturned: number;
  framesCount?: number;
  frames: TimeSeriesFrame[];
  temporalPairs?: TemporalPairInfo[];
  pairs: TemporalPairInfo[];
  cadenceSummary?: {
    totalFrames: number;
    totalPairs: number;
    intraVisitPairs: number;
    independentVisitPairs: number;
    surveyEpochPairs: number;
  };
  dateRange?: { start: string; end: string; spanDays: number };
  detectorStacks: Record<string, DetectorStack>;
  spectrumAtCenter: SpectrumPoint[];
  referenceWcs: WCSParams;
  catalogOverlays: CatalogOverlayItem[];
  releaseId: string;
  message?: string;
  /** 'sky' (default): common fixed grid so the mover drifts; 'target': each cutout re-centered on the mover. */
  frameMode?: 'sky' | 'target';
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
export type FitsResolutionMethod = 'datalink_cutout_service' | 'datalink' | 'offline_fixture';

export interface DataLinkCutoutService {
  accessUrl: string;
  path: string;
  sizeParamUnit?: 'deg';
}

export interface ResolvedFitsUrl {
  url: string;
  resolvedBy: FitsResolutionMethod;
  cutoutService?: DataLinkCutoutService;
}

// In-memory cache for resolved DataLink descriptors
const datalinkUrlCache = new Map<string, ResolvedFitsUrl>();

/**
 * Verifies that a resolved FITS URL is actually downloadable using a small
 * ranged GET (first FITS block). Throws when the request fails or the server
 * returns a non-success status, so a broken URL never reaches the pipeline
 * silently.
 *
 * Gating: strictly skipped when process.env.NODE_ENV === 'test' (unless forceCheck=true).
 * In production (NODE_ENV !== 'test'), it always verifies and throws on failure.
 */
export async function verifyFitsUrl(url: string, forceCheck = false): Promise<void> {
  if (process.env.NODE_ENV === 'test' && !forceCheck) {
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Range: 'bytes=0-2879',
        'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0',
      },
    });
    clearTimeout(timeout);
    if (!res.ok && res.status !== 416) {
      throw new Error(
        `FITS URL verification failed (HTTP ${res.status} ${res.statusText}) for ${url}`
      );
    }
    try {
      await res.arrayBuffer();
    } catch {
      // Body read issues do not invalidate a 2xx response; the status check above is authoritative.
    }
  } catch (err: any) {
    clearTimeout(timeout);
    throw new Error(`FITS URL verification failed for ${url}: ${err.message || String(err)}`);
  }
}

/**
 * Parses an IRSA DataLink VOTable XML document to extract:
 * 1. The `#cutout` adhoc:service accessURL + path column (`ibe-cutout`)
 * 2. The `#this` science image FITS URL
 */
export function parseDataLinkXml(xml: string): ResolvedFitsUrl | null {
  if (!xml || typeof xml !== 'string') return null;

  // 1. Extract adhoc:service cutout endpoint (e.g. <RESOURCE ID="ibe-cutout" ...><PARAM name="accessURL" ... value="..."/>)
  let cutoutServiceUrl = '';
  const serviceBlocks = xml.match(/<RESOURCE[^>]*utype=["']adhoc:service["'][^>]*>[\s\S]*?<\/RESOURCE>/gi) || [];
  for (const block of serviceBlocks) {
    const accessParam =
      block.match(/<PARAM[^>]*name=["']accessURL["'][^>]*value=["']([^"']+)["']/i) ||
      block.match(/<PARAM[^>]*value=["']([^"']+)["'][^>]*name=["']accessURL["']/i);
    if (accessParam && accessParam[1]) {
      cutoutServiceUrl = accessParam[1].trim();
      break;
    }
  }

  // 2. Map FIELD names in <TABLE>
  const fieldMatches = Array.from(xml.matchAll(/<FIELD[^>]*name=["']([^"']+)["'][^>]*>/gi));
  const fieldNames = fieldMatches.map((m) => m[1].toLowerCase());
  const idxUrl = fieldNames.indexOf('access_url');
  const idxSemantics = fieldNames.indexOf('semantics');
  const idxServiceDef = fieldNames.indexOf('service_def');
  const idxPath = fieldNames.indexOf('path');
  const idxContentType = fieldNames.indexOf('content_type');

  let thisUrl = '';
  let cutoutPath = '';

  const trMatches = xml.match(/<TR>[\s\S]*?<\/TR>/gi) || [];
  for (const tr of trMatches) {
    const tds = Array.from(tr.matchAll(/<TD[^>]*>([\s\S]*?)<\/TD>/gi)).map((m) =>
      m[1].replace(/&amp;/g, '&').trim()
    );
    if (tds.length === 0) continue;

    const sem = idxSemantics >= 0 ? (tds[idxSemantics] || '') : '';
    const acc = idxUrl >= 0 ? (tds[idxUrl] || '') : '';
    const srv = idxServiceDef >= 0 ? (tds[idxServiceDef] || '') : '';
    const pth = idxPath >= 0 ? (tds[idxPath] || '') : '';
    const ctype = idxContentType >= 0 ? (tds[idxContentType] || '') : '';

    if (sem === '#this' && acc && (ctype.includes('fits') || acc.endsWith('.fits')) && !thisUrl) {
      thisUrl = acc;
    }
    if ((sem === '#cutout' || srv === 'ibe-cutout') && pth && !cutoutPath) {
      cutoutPath = pth;
    }
  }

  // Fallback regex for #this science Level-2 FITS URL if VOTable fields varied
  if (!thisUrl) {
    const absMatch = xml.match(/<TD[^>]*>\s*(https:\/\/irsa\.ipac\.caltech\.edu\/ibe\/data\/[^\s<"]+level2[^\s<"]+\.fits)\s*<\/TD>/i);
    if (absMatch) thisUrl = absMatch[1].trim();
  }

  if (cutoutServiceUrl && cutoutPath) {
    return {
      url: thisUrl || cutoutServiceUrl,
      resolvedBy: 'datalink_cutout_service',
      cutoutService: {
        accessUrl: cutoutServiceUrl,
        path: cutoutPath,
        sizeParamUnit: 'deg',
      },
    };
  }

  if (thisUrl) {
    return {
      url: thisUrl,
      resolvedBy: 'datalink',
    };
  }

  return null;
}

/**
 * Constructs the live cutout download URL strictly from the DataLink-resolved service or #this FITS URL.
 */
export function buildCutoutRequestUrl(
  resolved: ResolvedFitsUrl | string,
  ra: number,
  dec: number,
  sizePix: number
): string {
  if (typeof resolved === 'string') {
    if (resolved.includes('?')) return resolved;
    return `${resolved}?center=${ra.toFixed(6)},${dec.toFixed(6)}&size=${sizePix}pix`;
  }
  if (resolved.cutoutService) {
    // IRSA ibe-cutout expects cutout size in degrees (SPHEREx pixel scale is 6.2"/px)
    const sizeDeg = Math.max(0.01, (sizePix * 6.2) / 3600);
    const params = new URLSearchParams({
      path: resolved.cutoutService.path,
      ra: ra.toFixed(6),
      dec: dec.toFixed(6),
      size: sizeDeg.toFixed(5),
    });
    return `${resolved.cutoutService.accessUrl}?${params.toString()}`;
  }
  if (resolved.url.includes('?')) return resolved.url;
  return `${resolved.url}?center=${ra.toFixed(6)},${dec.toFixed(6)}&size=${sizePix}pix`;
}

/**
 * Resolves an IRSA DataLink access_url through its live DataLink VOTable document
 * (3 retries with exponential backoff, 15s timeout). Never uses hand-built IBE paths in live mode.
 */
export async function resolveFitsUrl(accessUrl: string, obsId?: string, detector?: string): Promise<ResolvedFitsUrl> {
  if (process.env.SPHEREX_OFFLINE === '1' || (process.env.NODE_ENV === 'test' && !accessUrl?.startsWith('http'))) {
    const fallback = buildFallbackFitsUrl(obsId, detector, accessUrl);
    return { url: fallback, resolvedBy: 'offline_fixture' };
  }

  if (!accessUrl) {
    throw new Error(`[resolveFitsUrl] No DataLink access_url provided for ${obsId ?? 'unknown obs'}`);
  }

  // Direct FITS URL (non-DataLink)
  if (accessUrl.startsWith('local://') || accessUrl.endsWith('.fits')) {
    return { url: accessUrl, resolvedBy: accessUrl.startsWith('local://') ? 'offline_fixture' : 'datalink' };
  }

  const cached = datalinkUrlCache.get(accessUrl);
  if (cached) {
    return cached;
  }

  // Test environment shortcut for synthetic DataLink URLs in unit tests
  if (process.env.NODE_ENV === 'test') {
    const fallback = buildFallbackFitsUrl(obsId, detector, accessUrl);
    return { url: fallback, resolvedBy: 'offline_fixture' };
  }

  const MAX_RETRIES = 3;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(accessUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0' },
      });
      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`DataLink HTTP ${res.status} ${res.statusText}`);
      }
      const xml = await res.text();
      const parsed = parseDataLinkXml(xml);
      if (!parsed) {
        throw new Error(`DataLink VOTable contained neither #cutout service nor #this science FITS for ${accessUrl}`);
      }
      datalinkUrlCache.set(accessUrl, parsed);
      return parsed;
    } catch (dlErr: any) {
      clearTimeout(timeout);
      lastErr = dlErr;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw new Error(`DataLink resolution failed for ${accessUrl}: ${lastErr?.message || 'unknown error'}`);
}

/**
 * Offline/test-only FITS identifier helper. Never called during live archive queries.
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

    // Exact spectral wavelength from WCS-WAVE -TAB BINTABLE at target frame pixel,
    // falling back to frame metadata evaluated at exposure target pixel.
    let wavelengthUm = f.wavelengthUm;
    let bandwidthUm = f.bandwidthUm;
    if (f.wcsWave) {
      const fx = f.targetPixel?.x ?? targetX;
      const fy = f.targetPixel?.y ?? targetY;
      const evaluated = FITSReader.evaluateWaveWcs(f.wcsWave, fx, fy);
      if (evaluated && Number.isFinite(evaluated.wavelengthUm)) {
        wavelengthUm = Number(evaluated.wavelengthUm.toFixed(4));
        bandwidthUm = Number(evaluated.bandwidthUm.toFixed(4));
      }
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
        bandwidthUm,
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
