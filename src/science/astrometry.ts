import { WCSParams } from './types';
import { WCS } from './wcs';
import { ScientificPipeline } from './pipeline';
import { CatalogMatcher } from './catalogMatcher';
import type { CatalogOverlayItem } from './timeSeriesPipeline';

export const SPHEREX_OVERFLOW_BIT = 0x02;
export const SPHEREX_NONFUNC_BIT = 0x10;
export const SPHEREX_TRANSIENT_BIT = 0x01;
export const SPHEREX_SUR_ERROR_BIT = 0x04;
export const SPHEREX_CRITICAL_MASK = SPHEREX_OVERFLOW_BIT | SPHEREX_NONFUNC_BIT;

export interface CatalogNeighborInfo {
  identifier: string;
  catalog: string;
  distToPredictedArcsec: number;
  distToCentroidArcsec?: number;
  magLabel?: string;
  ra: number;
  dec: number;
}

export interface IsolatedReferenceStar {
  identifier: string;
  ra: number;
  dec: number;
  x: number;
  y: number;
  mag?: number;
  pmTotalMasYr: number;
}

export type StarBrightnessClass = 'bright' | 'medium' | 'faint';

export interface LeaveOneOutResidual {
  identifier: string;
  mag?: number;
  snr: number;
  brightnessClass: StarBrightnessClass;
  residRaArcsec: number;
  residDecArcsec: number;
  residArcsec: number;
}

export interface FrameAstrometrySolution {
  shiftRaArcsec: number;
  shiftDecArcsec: number;
  affine?: {
    a0: number;
    a1: number;
    a2: number;
    b0: number;
    b1: number;
    b2: number;
    centerRa: number;
    centerDec: number;
    cosDec: number;
  };
  method: 'affine' | 'translation' | 'uncalibrated';
  refStarsUsed: number;
  refScatterArcsec: number;
  leaveOneOutResiduals: LeaveOneOutResidual[];
  leaveOneOutFloorArcsec: number | null;
  lowConfidence: boolean;
  lowConfidenceReason?: string;
  applyToSky: (measRa: number, measDec: number) => { ra: number; dec: number };
  invertToRawSky: (trueRa: number, trueDec: number) => { ra: number; dec: number };
}

export type MaskedFrameReason =
  | 'saturation_or_flag'
  | 'non_isolated_peak'
  | 'neighbor_contaminated'
  | 'offset_too_large'
  | 'low_snr'
  | 'out_of_bounds';

export interface FrameTargetAstrometry {
  valid: boolean;
  x: number;
  y: number;
  ra?: number;
  dec?: number;
  dxArcsec: number;
  dyArcsec: number;
  uncertaintyArcsec: number;
  centroidErrorArcsec?: number;
  refFitErrorArcsec?: number;
  snr: number;
  refStarsUsed: number;
  refScatterArcsec: number;
  astrometryMethod: 'affine' | 'translation' | 'uncalibrated';
  lowConfidence: boolean;
  lowConfidenceReason?: string;
  wingFit?: boolean;
  maskedReason?: MaskedFrameReason;
  predictedPixel: { x: number; y: number };
  distToPredictedPix: number;
  nearbyNeighbors15Arcsec: CatalogNeighborInfo[];
}

export interface ControlFrameResidualInput {
  dxArcsec: number;
  dyArcsec: number;
  predDxArcsec?: number;
  predDyArcsec?: number;
  valid: boolean;
}

export interface ControlScatterReport {
  targetId: string;
  detector?: string;
  validFrames: number;
  totalFrames: number;
  residualScatterArcsec: number | null;
  meanOffsetArcsec: number | null;
  perFrameResidualsArcsec: number[];
}

export function wrapDeltaRaDeg(ra1: number, ra2: number): number {
  return (((ra1 - ra2) + 540) % 360) - 180;
}

/**
 * Checks whether the core aperture around `(cx, cy)` is contaminated by
 * SPHEREx saturation/overflow (0x02), non-functional (0x10), or heavy DQ artifact bits.
 */
export function isApertureFlaggedBad(
  flags: Int32Array | null | undefined,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius = 1
): boolean {
  if (!flags || flags.length === 0) return false;
  const rx = Math.round(cx);
  const ry = Math.round(cy);
  if (rx < 0 || rx >= width || ry < 0 || ry >= height) return true;

  const centerIdx = ry * width + rx;
  if (centerIdx < flags.length && (flags[centerIdx] & SPHEREX_CRITICAL_MASK) !== 0) {
    return true;
  }

  let badCount = 0;
  let totalCount = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = rx + dx;
      const ny = ry + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      totalCount++;
      const idx = ny * width + nx;
      if (idx < flags.length) {
        const f = flags[idx];
        if ((f & SPHEREX_CRITICAL_MASK) !== 0) {
          badCount++;
          // Any critical overflow/nonfunc bit on the immediate 3x3 peak core invalidates the aperture
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return true;
        }
      }
    }
  }
  return totalCount > 0 && badCount >= Math.ceil(totalCount * 0.5);
}

/**
 * Checks whether all pixels within `coreRadiusPix` (default 2.0 px) of the predicted
 * target position are free of SPHEREx critical DQ flags (0x02 overflow, 0x10 nonFunc) and finite.
 */
export function isCorePixelUnsaturated(
  flux: Float32Array,
  flags: Int32Array | null | undefined,
  width: number,
  height: number,
  cx: number,
  cy: number,
  coreRadiusPix = 2.0
): boolean {
  const rx = Math.round(cx);
  const ry = Math.round(cy);
  if (rx < 1 || rx >= width - 1 || ry < 1 || ry >= height - 1) return false;
  const r2 = coreRadiusPix * coreRadiusPix;
  let checked = 0;
  for (let dy = -Math.ceil(coreRadiusPix); dy <= Math.ceil(coreRadiusPix); dy++) {
    for (let dx = -Math.ceil(coreRadiusPix); dx <= Math.ceil(coreRadiusPix); dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const nx = rx + dx;
      const ny = ry + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const idx = ny * width + nx;
      checked++;
      if (!Number.isFinite(flux[idx])) return false;
      if (flags && idx < flags.length && (flags[idx] & SPHEREX_CRITICAL_MASK) !== 0) return false;
    }
  }
  return checked > 0;
}

/**
 * Propagates a Gaia DR3 overlay item cleanly from 2016.0 to `epochYear`,
 * or returns the source's stored sky coordinates for static AllWISE sources.
 */
export function propagateCatalogSourceToEpoch(
  src: CatalogOverlayItem,
  epochYear: number
): { ra: number; dec: number } {
  const baseRa = src.raRaw ?? src.raPropagated;
  const baseDec = src.decRaw ?? src.decPropagated;
  if (src.catalog === 'Gaia DR3' && src.raRaw != null && src.decRaw != null) {
    return CatalogMatcher.propagateProperMotion(
      src.raRaw,
      src.decRaw,
      src.pmRaMasYr || 0,
      src.pmDecMasYr || 0,
      2016.0,
      epochYear
    );
  }
  return { ra: baseRa, dec: baseDec };
}

/**
 * Identifies whether a catalog entry represents the science target itself rather than
 * a field reference star or contaminating neighbor.
 */
export function isTargetSelfCatalogMatch(
  src: CatalogOverlayItem,
  srcEpochRa: number,
  srcEpochDec: number,
  targetEpochRa: number,
  targetEpochDec: number,
  targetJ2000Ra?: number,
  targetJ2000Dec?: number,
  targetId?: string
): boolean {
  const idLower = (targetId || '').toLowerCase();
  const srcIdLower = (src.identifier || '').toLowerCase();

  // WISE 0855 is optical-invisible to Gaia DR3; any Gaia star near it is a background neighbor.
  if (idLower.includes('wise-0855') || idLower.includes('0855')) {
    if (src.catalog === 'Gaia DR3') return false;
    if (srcIdLower.includes('j085501.95')) return false;
  }

  const sepEpoch = WCS.angularSeparationArcsec(srcEpochRa, srcEpochDec, targetEpochRa, targetEpochDec);
  if (sepEpoch <= 2.5) return true;

  if (targetJ2000Ra != null && targetJ2000Dec != null) {
    const sepJ2000 = WCS.angularSeparationArcsec(srcEpochRa, srcEpochDec, targetJ2000Ra, targetJ2000Dec);
    if (sepJ2000 <= 2.5) return true;
  }
  return false;
}

/**
 * Task 1: Select isolated Gaia DR3 reference stars with small proper motion (|pm| < 20 mas/yr)
 * and no catalog neighbor within ~3 pixels (~18.6 arcsec).
 */
export function selectIsolatedReferenceStars(
  catalogSources: CatalogOverlayItem[],
  wcs: WCSParams,
  width: number,
  height: number,
  epochYear: number,
  targetEpochRa: number,
  targetEpochDec: number,
  options?: {
    targetJ2000Ra?: number;
    targetJ2000Dec?: number;
    targetId?: string;
    isolationRadiusPix?: number;
    maxPmMasYr?: number;
    maxStars?: number;
  }
): IsolatedReferenceStar[] {
  const isolationRadiusPix = options?.isolationRadiusPix ?? 3.0;
  const maxPmMasYr = options?.maxPmMasYr ?? 20.0;
  const maxStars = options?.maxStars ?? 25;
  const pixScale = wcs.pixelScaleArcsec || 6.2;

  const projectedAll = catalogSources.map((src) => {
    const sky = propagateCatalogSourceToEpoch(src, epochYear);
    let pix = { x: -999, y: -999 };
    try {
      pix = WCS.skyToPix(sky.ra, sky.dec, wcs);
    } catch {}
    return { src, sky, pix };
  });

  const targetPix = WCS.skyToPix(targetEpochRa, targetEpochDec, wcs);
  const candidates: IsolatedReferenceStar[] = [];

  for (let i = 0; i < projectedAll.length; i++) {
    const { src, sky, pix } = projectedAll[i];
    if (src.catalog !== 'Gaia DR3') continue;
    if (
      isTargetSelfCatalogMatch(
        src,
        sky.ra,
        sky.dec,
        targetEpochRa,
        targetEpochDec,
        options?.targetJ2000Ra,
        options?.targetJ2000Dec,
        options?.targetId
      )
    ) {
      continue;
    }

    const pmTotal = Math.hypot(src.pmRaMasYr ?? 0, src.pmDecMasYr ?? 0);
    if (pmTotal >= maxPmMasYr) continue;

    // Must sit comfortably inside cutout so 5x5 aperture does not clip border
    if (pix.x < 3 || pix.x > width - 4 || pix.y < 3 || pix.y > height - 4) continue;

    // Must not lie within 3 pixels of the target itself
    if (Math.hypot(pix.x - targetPix.x, pix.y - targetPix.y) < isolationRadiusPix) continue;

    // Must have no distinct catalog neighbor within isolationRadiusPix (~3 px)
    let hasNeighborWithin3Px = false;
    for (let j = 0; j < projectedAll.length; j++) {
      if (i === j) continue;
      const other = projectedAll[j];
      const skySep = WCS.angularSeparationArcsec(sky.ra, sky.dec, other.sky.ra, other.sky.dec);
      // Same star cross-listed in Gaia + AllWISE (< 2.5 arcsec apart) is not a neighbor
      if (skySep < 2.5) continue;
      const pixSep = Math.hypot(pix.x - other.pix.x, pix.y - other.pix.y);
      if (pixSep < isolationRadiusPix || skySep < isolationRadiusPix * pixScale) {
        hasNeighborWithin3Px = true;
        break;
      }
    }
    if (hasNeighborWithin3Px) continue;

    candidates.push({
      identifier: src.identifier,
      ra: sky.ra,
      dec: sky.dec,
      x: pix.x,
      y: pix.y,
      mag: src.mag,
      pmTotalMasYr: Number(pmTotal.toFixed(2)),
    });
  }

  candidates.sort((a, b) => (a.mag ?? 99) - (b.mag ?? 99));
  return candidates.slice(0, maxStars);
}

/**
 * Solve 3x3 linear system Ax = b via Gaussian elimination with partial pivoting.
 */
function solve3x3(A: number[][], b: number[]): [number, number, number] | null {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let maxRow = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) maxRow = r;
    }
    if (Math.abs(M[maxRow][col]) < 1e-10) return null;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    const piv = M[col][col];
    for (let c = col; c < 4; c++) M[col][c] /= piv;
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c < 4; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return [M[0][3], M[1][3], M[2][3]];
}

/**
 * Task 1: Fit per-frame translation (or small constrained affine when >= 6 stars) mapping
 * measured isolated Gaia DR3 centroids to their propagated catalog positions.
 */
export function fitFrameAstrometryCorrection(
  flux: Float32Array,
  variance: Float32Array | null,
  flags: Int32Array | null,
  width: number,
  height: number,
  wcs: WCSParams,
  refStars: IsolatedReferenceStar[]
): FrameAstrometrySolution {
  const centerRa = wcs.crval1 || refStars[0]?.ra || 0;
  const centerDec = wcs.crval2 || refStars[0]?.dec || 0;
  const cosDec = Math.max(1e-6, Math.cos((centerDec * Math.PI) / 180));
  const pixScale = wcs.pixelScaleArcsec || 6.2;

  interface RefResidual {
    star: IsolatedReferenceStar;
    measRa: number;
    measDec: number;
    dRaArcsec: number;
    dDecArcsec: number;
    weight: number;
    snr: number;
  }

  const residuals: RefResidual[] = [];

  for (const star of refStars) {
    const seedX = Math.round(star.x);
    const seedY = Math.round(star.y);
    if (seedX < 2 || seedX > width - 3 || seedY < 2 || seedY > height - 3) continue;

    let peakX = seedX;
    let peakY = seedY;
    let peakVal = -Infinity;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = seedX + dx;
        const ny = seedY + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const idx = ny * width + nx;
        if (flags && idx < flags.length && (flags[idx] & SPHEREX_CRITICAL_MASK) !== 0) continue;
        const v = flux[idx];
        if (Number.isFinite(v) && v > peakVal) {
          peakVal = v;
          peakX = nx;
          peakY = ny;
        }
      }
    }

    if (!Number.isFinite(peakVal)) continue;
    if (isApertureFlaggedBad(flags, width, height, peakX, peakY, 1)) continue;

    const cent = ScientificPipeline.computeSubpixelCentroid(flux, width, height, peakX, peakY, 2, variance, flags);
    if (!cent.valid || cent.snr < 3.5) continue;

    const measSky = WCS.pixToSky(cent.cx, cent.cy, wcs);
    const dRaArcsec = wrapDeltaRaDeg(star.ra, measSky.ra) * cosDec * 3600;
    const dDecArcsec = (star.dec - measSky.dec) * 3600;
    // Reject obvious wild mismatches (> 20 arcsec) caused by cosmic rays / mis-associations
    if (Math.hypot(dRaArcsec, dDecArcsec) > 20) continue;

    const sigArcsec = Math.max(0.1, cent.uncertaintyPix * pixScale);
    residuals.push({
      star,
      measRa: measSky.ra,
      measDec: measSky.dec,
      dRaArcsec,
      dDecArcsec,
      weight: 1 / (sigArcsec * sigArcsec),
      snr: cent.snr,
    });
  }

  // MAD sigma-clipping on initial residuals
  let used = residuals;
  if (residuals.length >= 4) {
    const ras = residuals.map((r) => r.dRaArcsec).sort((a, b) => a - b);
    const decs = residuals.map((r) => r.dDecArcsec).sort((a, b) => a - b);
    const medRa = ras[Math.floor(ras.length / 2)];
    const medDec = decs[Math.floor(decs.length / 2)];
    const dists = residuals.map((r) => Math.hypot(r.dRaArcsec - medRa, r.dDecArcsec - medDec)).sort((a, b) => a - b);
    const medDist = dists[Math.floor(dists.length / 2)];
    const clipThresh = Math.max(3.0, 3.0 * 1.4826 * medDist);
    const clipped = residuals.filter((r) => Math.hypot(r.dRaArcsec - medRa, r.dDecArcsec - medDec) <= clipThresh);
    if (clipped.length >= 3) used = clipped;
  }

  if (used.length < 3) {
    let shiftRa = 0;
    let shiftDec = 0;
    if (used.length > 0) {
      let wSum = 0;
      for (const r of used) {
        shiftRa += r.weight * r.dRaArcsec;
        shiftDec += r.weight * r.dDecArcsec;
        wSum += r.weight;
      }
      if (wSum > 0) {
        shiftRa /= wSum;
        shiftDec /= wSum;
      }
    }
    const lowConfidenceReason = `Fewer than 3 usable Gaia DR3 reference stars (${used.length} found)`;
    return {
      shiftRaArcsec: Number(shiftRa.toFixed(4)),
      shiftDecArcsec: Number(shiftDec.toFixed(4)),
      method: used.length > 0 ? 'translation' : 'uncalibrated',
      refStarsUsed: used.length,
      refScatterArcsec: used.length >= 2
        ? Number(Math.max(0.5, Math.sqrt(used.reduce((s, r) => s + (r.dRaArcsec - shiftRa) ** 2 + (r.dDecArcsec - shiftDec) ** 2, 0) / used.length)).toFixed(3))
        : 2.5,
      leaveOneOutResiduals: [],
      leaveOneOutFloorArcsec: null,
      lowConfidence: true,
      lowConfidenceReason,
      applyToSky: (measRa, measDec) => ({
        ra: ((measRa + shiftRa / (3600 * cosDec)) % 360 + 360) % 360,
        dec: Math.max(-90, Math.min(90, measDec + shiftDec / 3600)),
      }),
      invertToRawSky: (trueRa, trueDec) => ({
        ra: ((trueRa - shiftRa / (3600 * cosDec)) % 360 + 360) % 360,
        dec: Math.max(-90, Math.min(90, trueDec - shiftDec / 3600)),
      }),
    };
  }

  // Classify star brightness class by Gaia G mag (fallback to S/N)
  const classifyBrightness = (mag?: number, snr?: number): StarBrightnessClass => {
    if (mag != null && Number.isFinite(mag)) {
      if (mag < 14.0) return 'bright';
      if (mag < 16.0) return 'medium';
      return 'faint';
    }
    if ((snr ?? 0) >= 120) return 'bright';
    if ((snr ?? 0) >= 20) return 'medium';
    return 'faint';
  };

  // Weighted translation fit
  let wSum = 0;
  let shiftRa = 0;
  let shiftDec = 0;
  for (const r of used) {
    wSum += r.weight;
    shiftRa += r.weight * r.dRaArcsec;
    shiftDec += r.weight * r.dDecArcsec;
  }
  shiftRa /= wSum;
  shiftDec /= wSum;
  const rmsTrans = Math.sqrt(
    used.reduce((s, r) => s + (r.dRaArcsec - shiftRa) ** 2 + (r.dDecArcsec - shiftDec) ** 2, 0) / used.length
  );

  let useAffine = false;
  let affineParams:
    | { a0: number; a1: number; a2: number; b0: number; b1: number; b2: number; centerRa: number; centerDec: number; cosDec: number }
    | undefined;
  let rmsAffine = rmsTrans;

  const fitAffineSubset = (subset: RefResidual[]) => {
    const ATA = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const ATbRa = [0, 0, 0];
    const ATbDec = [0, 0, 0];
    for (const r of subset) {
      const u = wrapDeltaRaDeg(r.measRa, centerRa) * cosDec * 60;
      const v = (r.measDec - centerDec) * 60;
      const phi = [1, u, v];
      for (let i = 0; i < 3; i++) {
        ATbRa[i] += r.weight * phi[i] * r.dRaArcsec;
        ATbDec[i] += r.weight * phi[i] * r.dDecArcsec;
        for (let j = 0; j < 3; j++) {
          ATA[i][j] += r.weight * phi[i] * phi[j];
        }
      }
    }
    const solRa = solve3x3(ATA, ATbRa);
    const solDec = solve3x3(ATA, ATbDec);
    if (!solRa || !solDec) return null;
    const [a0, a1, a2] = solRa;
    const [b0, b1, b2] = solDec;
    if (Math.abs(a1) >= 0.2 || Math.abs(a2) >= 0.2 || Math.abs(b1) >= 0.2 || Math.abs(b2) >= 0.2) return null;
    return { a0, a1, a2, b0, b1, b2 };
  };

  if (used.length >= 6) {
    const aff = fitAffineSubset(used);
    if (aff) {
      const rmsAff = Math.sqrt(
        used.reduce((s, r) => {
          const u = wrapDeltaRaDeg(r.measRa, centerRa) * cosDec * 60;
          const v = (r.measDec - centerDec) * 60;
          const pRa = aff.a0 + aff.a1 * u + aff.a2 * v;
          const pDec = aff.b0 + aff.b1 * u + aff.b2 * v;
          return s + (r.dRaArcsec - pRa) ** 2 + (r.dDecArcsec - pDec) ** 2;
        }, 0) / used.length
      );
      if (rmsAff < 0.9 * rmsTrans) {
        useAffine = true;
        rmsAffine = rmsAff;
        affineParams = { ...aff, centerRa, centerDec, cosDec };
      }
    }
  }

  // Task 1: Leave-one-out validation on Gaia reference stars in the same frame
  const leaveOneOutResiduals: LeaveOneOutResidual[] = [];
  for (let i = 0; i < used.length; i++) {
    const heldOut = used[i];
    const train = used.filter((_, j) => j !== i);
    if (train.length < 2) continue;

    let predShiftRa = 0;
    let predShiftDec = 0;
    let trainAff = useAffine && train.length >= 6 ? fitAffineSubset(train) : null;
    if (trainAff) {
      const u = wrapDeltaRaDeg(heldOut.measRa, centerRa) * cosDec * 60;
      const v = (heldOut.measDec - centerDec) * 60;
      predShiftRa = trainAff.a0 + trainAff.a1 * u + trainAff.a2 * v;
      predShiftDec = trainAff.b0 + trainAff.b1 * u + trainAff.b2 * v;
    } else {
      let tw = 0;
      for (const t of train) {
        tw += t.weight;
        predShiftRa += t.weight * t.dRaArcsec;
        predShiftDec += t.weight * t.dDecArcsec;
      }
      if (tw > 0) {
        predShiftRa /= tw;
        predShiftDec /= tw;
      }
    }
    const calRa = heldOut.measRa + predShiftRa / (3600 * cosDec);
    const calDec = heldOut.measDec + predShiftDec / 3600;
    const resRa = wrapDeltaRaDeg(heldOut.star.ra, calRa) * cosDec * 3600;
    const resDec = (heldOut.star.dec - calDec) * 3600;
    const resTot = Math.hypot(resRa, resDec);
    if (Number.isFinite(resTot)) {
      leaveOneOutResiduals.push({
        identifier: heldOut.star.identifier,
        mag: heldOut.star.mag,
        snr: heldOut.snr,
        brightnessClass: classifyBrightness(heldOut.star.mag, heldOut.snr),
        residRaArcsec: Number(resRa.toFixed(4)),
        residDecArcsec: Number(resDec.toFixed(4)),
        residArcsec: Number(resTot.toFixed(4)),
      });
    }
  }
  const looSorted = leaveOneOutResiduals.map((r) => r.residArcsec).sort((a, b) => a - b);
  const leaveOneOutFloorArcsec =
    looSorted.length > 0 ? Number(looSorted[Math.floor(looSorted.length / 2)].toFixed(3)) : null;

  if (useAffine && affineParams) {
    const { a0, a1, a2, b0, b1, b2 } = affineParams;
    return {
      shiftRaArcsec: Number(a0.toFixed(4)),
      shiftDecArcsec: Number(b0.toFixed(4)),
      affine: affineParams,
      method: 'affine',
      refStarsUsed: used.length,
      refScatterArcsec: Number(Math.max(0.05, rmsAffine).toFixed(3)),
      leaveOneOutResiduals,
      leaveOneOutFloorArcsec,
      lowConfidence: false,
      applyToSky: (measRa, measDec) => {
        const u = wrapDeltaRaDeg(measRa, centerRa) * cosDec * 60;
        const v = (measDec - centerDec) * 60;
        const offRa = a0 + a1 * u + a2 * v;
        const offDec = b0 + b1 * u + b2 * v;
        return {
          ra: ((measRa + offRa / (3600 * cosDec)) % 360 + 360) % 360,
          dec: Math.max(-90, Math.min(90, measDec + offDec / 3600)),
        };
      },
      invertToRawSky: (trueRa, trueDec) => {
        const u = wrapDeltaRaDeg(trueRa, centerRa) * cosDec * 60;
        const v = (trueDec - centerDec) * 60;
        const offRa = a0 + a1 * u + a2 * v;
        const offDec = b0 + b1 * u + b2 * v;
        return {
          ra: ((trueRa - offRa / (3600 * cosDec)) % 360 + 360) % 360,
          dec: Math.max(-90, Math.min(90, trueDec - offDec / 3600)),
        };
      },
    };
  }

  return {
    shiftRaArcsec: Number(shiftRa.toFixed(4)),
    shiftDecArcsec: Number(shiftDec.toFixed(4)),
    method: 'translation',
    refStarsUsed: used.length,
    refScatterArcsec: Number(Math.max(0.05, rmsTrans).toFixed(3)),
    leaveOneOutResiduals,
    leaveOneOutFloorArcsec,
    lowConfidence: false,
    applyToSky: (measRa, measDec) => ({
      ra: ((measRa + shiftRa / (3600 * cosDec)) % 360 + 360) % 360,
      dec: Math.max(-90, Math.min(90, measDec + shiftDec / 3600)),
    }),
    invertToRawSky: (trueRa, trueDec) => ({
      ra: ((trueRa - shiftRa / (3600 * cosDec)) % 360 + 360) % 360,
      dec: Math.max(-90, Math.min(90, trueDec - shiftDec / 3600)),
    }),
  };
}

/**
 * List nearest non-target catalog neighbors within `radiusArcsec` (default 15")
 * at the given epoch, deduplicating co-located Gaia + AllWISE entries.
 */
export function findNearbyCatalogNeighbors(
  catalogSources: CatalogOverlayItem[],
  epochYear: number,
  targetEpochRa: number,
  targetEpochDec: number,
  options?: {
    targetJ2000Ra?: number;
    targetJ2000Dec?: number;
    targetId?: string;
    radiusArcsec?: number;
  }
): CatalogNeighborInfo[] {
  const radiusArcsec = options?.radiusArcsec ?? 15.0;
  const list: CatalogNeighborInfo[] = [];

  for (const src of catalogSources) {
    const sky = propagateCatalogSourceToEpoch(src, epochYear);
    if (
      isTargetSelfCatalogMatch(
        src,
        sky.ra,
        sky.dec,
        targetEpochRa,
        targetEpochDec,
        options?.targetJ2000Ra,
        options?.targetJ2000Dec,
        options?.targetId
      )
    ) {
      continue;
    }
    const dist = WCS.angularSeparationArcsec(sky.ra, sky.dec, targetEpochRa, targetEpochDec);
    if (dist <= radiusArcsec) {
      // Deduplicate same star cross-matched between Gaia DR3 and AllWISE
      const existing = list.find((n) => WCS.angularSeparationArcsec(n.ra, n.dec, sky.ra, sky.dec) < 2.0);
      if (existing) {
        if (src.catalog === 'Gaia DR3' && existing.catalog !== 'Gaia DR3') {
          existing.identifier = `${src.identifier} / ${existing.identifier}`;
          existing.catalog = 'Gaia DR3 + AllWISE';
          existing.ra = sky.ra;
          existing.dec = sky.dec;
          existing.distToPredictedArcsec = Number(dist.toFixed(2));
        } else if (src.magLabel && existing.magLabel && !existing.magLabel.includes(src.magLabel)) {
          existing.magLabel = `${existing.magLabel}, ${src.magLabel}`;
        }
        continue;
      }
      list.push({
        identifier: src.identifier,
        catalog: src.catalog,
        distToPredictedArcsec: Number(dist.toFixed(2)),
        magLabel: src.magLabel,
        ra: sky.ra,
        dec: sky.dec,
      });
    }
  }

  return list.sort((a, b) => a.distToPredictedArcsec - b.distToPredictedArcsec);
}

/**
 * Tasks 1, 2, 4: Measure a single frame's calibrated target centroid after:
 * - Saturation / overflow / nonFunc FLAGS masking
 * - Strict predicted-pixel search (< 1.5 px radius after reference-star shift correction)
 * - Pixel isolation check (no brighter/blended secondary peak within 1.8..3.5 px)
 * - Neighbor exclusion check (detection must not sit closer to a <=15" catalog neighbor than to the target)
 */
export function measureFrameTargetDifferential(params: {
  flux: Float32Array;
  variance: Float32Array | null;
  flags: Int32Array | null;
  width: number;
  height: number;
  wcs: WCSParams;
  epochYear: number;
  targetEpochRa: number;
  targetEpochDec: number;
  targetJ2000Ra?: number;
  targetJ2000Dec?: number;
  targetId?: string;
  catalogSources: CatalogOverlayItem[];
  astrometry?: FrameAstrometrySolution;
}): FrameTargetAstrometry {
  const {
    flux,
    variance,
    flags,
    width,
    height,
    wcs,
    epochYear,
    targetEpochRa,
    targetEpochDec,
    targetJ2000Ra,
    targetJ2000Dec,
    targetId,
    catalogSources,
  } = params;

  const pixScale = wcs.pixelScaleArcsec || 6.2;
  const solution =
    params.astrometry ||
    fitFrameAstrometryCorrection(
      flux,
      variance,
      flags,
      width,
      height,
      wcs,
      selectIsolatedReferenceStars(catalogSources, wcs, width, height, epochYear, targetEpochRa, targetEpochDec, {
        targetJ2000Ra,
        targetJ2000Dec,
        targetId,
      })
    );

  const nearbyNeighbors15Arcsec = findNearbyCatalogNeighbors(
    catalogSources,
    epochYear,
    targetEpochRa,
    targetEpochDec,
    { targetJ2000Ra, targetJ2000Dec, targetId, radiusArcsec: 15.0 }
  );

  // Predicted target pixel inside this frame after applying inverse frame WCS offset
  const rawPredSky = solution.invertToRawSky(targetEpochRa, targetEpochDec);
  const predPix = WCS.skyToPix(rawPredSky.ra, rawPredSky.dec, wcs);

  const baseInvalid = (
    reason: MaskedFrameReason,
    snr = 0,
    x = predPix.x,
    y = predPix.y,
    distToPredPix = 0
  ): FrameTargetAstrometry => ({
    valid: false,
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    dxArcsec: 0,
    dyArcsec: 0,
    uncertaintyArcsec: Number(Math.max(0.5, solution.refScatterArcsec).toFixed(3)),
    snr: Number((Number.isFinite(snr) ? snr : 0).toFixed(2)),
    refStarsUsed: solution.refStarsUsed,
    refScatterArcsec: solution.refScatterArcsec,
    astrometryMethod: solution.method,
    lowConfidence: solution.lowConfidence,
    lowConfidenceReason: solution.lowConfidenceReason,
    maskedReason: reason,
    predictedPixel: { x: Number(predPix.x.toFixed(3)), y: Number(predPix.y.toFixed(3)) },
    distToPredictedPix: Number(distToPredPix.toFixed(3)),
    nearbyNeighbors15Arcsec,
  });

  if (predPix.x < 1 || predPix.x >= width - 1 || predPix.y < 1 || predPix.y >= height - 1) {
    return baseInvalid('out_of_bounds');
  }

  // Mask frames with saturation/overflow/nonFunc flags in core target aperture
  if (isApertureFlaggedBad(flags, width, height, predPix.x, predPix.y, 1)) {
    return baseInvalid('saturation_or_flag');
  }

  // Strict peak search within < 1.5 px of predicted pixel
  let peakX = -1;
  let peakY = -1;
  let peakVal = -Infinity;
  const xMin = Math.max(0, Math.floor(predPix.x - 1.5));
  const xMax = Math.min(width - 1, Math.ceil(predPix.x + 1.5));
  const yMin = Math.max(0, Math.floor(predPix.y - 1.5));
  const yMax = Math.min(height - 1, Math.ceil(predPix.y + 1.5));

  for (let ny = yMin; ny <= yMax; ny++) {
    for (let nx = xMin; nx <= xMax; nx++) {
      if (Math.hypot(nx - predPix.x, ny - predPix.y) > 1.55) continue;
      const idx = ny * width + nx;
      if (flags && idx < flags.length && (flags[idx] & SPHEREX_CRITICAL_MASK) !== 0) continue;
      const v = flux[idx];
      if (Number.isFinite(v) && v > peakVal) {
        peakVal = v;
        peakX = nx;
        peakY = ny;
      }
    }
  }

  if (peakX < 0 || peakY < 0) {
    return baseInvalid('saturation_or_flag');
  }

  if (isApertureFlaggedBad(flags, width, height, peakX, peakY, 1)) {
    return baseInvalid('saturation_or_flag');
  }

  const cent = ScientificPipeline.computeSubpixelCentroid(flux, width, height, peakX, peakY, 2, variance, flags);
  if (!cent.valid || cent.snr < 3.0) {
    return baseInvalid('low_snr', cent.snr, cent.cx, cent.cy, Math.hypot(cent.cx - predPix.x, cent.cy - predPix.y));
  }

  const distToPredPix = Math.hypot(cent.cx - predPix.x, cent.cy - predPix.y);
  if (distToPredPix >= 1.5) {
    return baseInvalid('offset_too_large', cent.snr, cent.cx, cent.cy, distToPredPix);
  }

  // Check peak isolation: verify no brighter/blended secondary local max in annulus 1.8..3.5 px
  const outerVals: number[] = [];
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const r = Math.hypot(dx, dy);
      if (r < 2.8 || r > 4.2) continue;
      const nx = peakX + dx;
      const ny = peakY + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const idx = ny * width + nx;
      if (flags && (flags[idx] & SPHEREX_CRITICAL_MASK) !== 0) continue;
      if (Number.isFinite(flux[idx])) outerVals.push(flux[idx]);
    }
  }
  outerVals.sort((a, b) => a - b);
  const bg = outerVals.length > 0 ? outerVals[Math.floor(outerVals.length / 2)] : 0;
  const netPeak = peakVal - bg;

  if (netPeak > 0) {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const r = Math.hypot(dx, dy);
        if (r < 1.8 || r > 3.5) continue;
        const nx = peakX + dx;
        const ny = peakY + dy;
        if (nx < 1 || nx >= width - 1 || ny < 1 || ny >= height - 1) continue;
        const idx = ny * width + nx;
        if (flags && (flags[idx] & SPHEREX_CRITICAL_MASK) !== 0) continue;
        const v = flux[idx];
        if (!Number.isFinite(v)) continue;
        const netOuter = v - bg;
        if (netOuter <= 0.65 * netPeak) continue;

        // Check if (nx, ny) is a local maximum relative to its immediate neighbors
        let isLocalMax = true;
        for (let oy = -1; oy <= 1 && isLocalMax; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            const nVal = flux[(ny + oy) * width + (nx + ox)];
            if (Number.isFinite(nVal) && nVal > v) isLocalMax = false;
          }
        }
        if (isLocalMax) {
          // Check saddle value midway between target peak and outer peak
          const mx = Math.round((peakX + nx) / 2);
          const my = Math.round((peakY + ny) / 2);
          const midNet = (flux[my * width + mx] ?? bg) - bg;
          if (netOuter > 1.1 * netPeak || midNet > 0.55 * netOuter) {
            return baseInvalid('non_isolated_peak', cent.snr, cent.cx, cent.cy, distToPredPix);
          }
        }
      }
    }
  }

  // Convert measured centroid through differential astrometry solution
  const rawSky = WCS.pixToSky(cent.cx, cent.cy, wcs);
  const calSky = solution.applyToSky(rawSky.ra, rawSky.dec);

  // Task 4: Exclude detection if a catalog neighbor (<=15") is closer to the centroid than the target's predicted position
  const distToTargetArcsec = WCS.angularSeparationArcsec(calSky.ra, calSky.dec, targetEpochRa, targetEpochDec);
  let neighborCloser = false;
  for (const nb of nearbyNeighbors15Arcsec) {
    const distNb = WCS.angularSeparationArcsec(calSky.ra, calSky.dec, nb.ra, nb.dec);
    nb.distToCentroidArcsec = Number(distNb.toFixed(2));
    if (distNb < distToTargetArcsec) {
      neighborCloser = true;
    }
  }
  if (neighborCloser) {
    return baseInvalid('neighbor_contaminated', cent.snr, cent.cx, cent.cy, distToPredPix);
  }

  const centErrArcsec = cent.uncertaintyPix * pixScale;
  const regErrArcsec =
    solution.refStarsUsed >= 1
      ? solution.refScatterArcsec / Math.sqrt(solution.refStarsUsed)
      : 2.5;
  const combinedErrArcsec = Math.sqrt(centErrArcsec * centErrArcsec + regErrArcsec * regErrArcsec);

  return {
    valid: true,
    x: Number(cent.cx.toFixed(3)),
    y: Number(cent.cy.toFixed(3)),
    ra: Number(calSky.ra.toFixed(6)),
    dec: Number(calSky.dec.toFixed(6)),
    dxArcsec: 0, // populated relative to first valid frame across series
    dyArcsec: 0,
    uncertaintyArcsec: Number(combinedErrArcsec.toFixed(3)),
    centroidErrorArcsec: Number(centErrArcsec.toFixed(3)),
    refFitErrorArcsec: Number(regErrArcsec.toFixed(3)),
    snr: Number(cent.snr.toFixed(2)),
    refStarsUsed: solution.refStarsUsed,
    refScatterArcsec: solution.refScatterArcsec,
    astrometryMethod: solution.method,
    lowConfidence: solution.lowConfidence,
    lowConfidenceReason: solution.lowConfidenceReason,
    wingFit: false,
    predictedPixel: { x: Number(predPix.x.toFixed(3)), y: Number(predPix.y.toFixed(3)) },
    distToPredictedPix: Number(distToPredPix.toFixed(3)),
    nearbyNeighbors15Arcsec,
  };
}

/**
 * Task 3: Saturated-core PSF wing fit on unmasked pixels inside a 2..6 px annulus.
 * Masks out saturated/nonFunc/NaN pixels, enforces minimum unmasked count and >=3 quadrant coverage,
 * fits a 2D Gaussian/Moffat wing profile around the predicted position, and marks results
 * "wing fit, low confidence" with conservative uncertainty.
 */
export function fitSaturatedPsfWing(params: {
  flux: Float32Array;
  variance: Float32Array | null;
  flags: Int32Array | null;
  width: number;
  height: number;
  wcs: WCSParams;
  epochYear: number;
  targetEpochRa: number;
  targetEpochDec: number;
  targetJ2000Ra?: number;
  targetJ2000Dec?: number;
  targetId?: string;
  catalogSources: CatalogOverlayItem[];
  astrometry: FrameAstrometrySolution;
  minUnmaskedPixels?: number;
}): FrameTargetAstrometry {
  const {
    flux,
    variance,
    flags,
    width,
    height,
    wcs,
    epochYear,
    targetEpochRa,
    targetEpochDec,
    targetJ2000Ra,
    targetJ2000Dec,
    targetId,
    catalogSources,
    astrometry,
  } = params;
  const minUnmaskedPixels = params.minUnmaskedPixels ?? 20;
  const pixScale = wcs.pixelScaleArcsec || 6.2;

  const rawPredSky = astrometry.invertToRawSky(targetEpochRa, targetEpochDec);
  const predPix = WCS.skyToPix(rawPredSky.ra, rawPredSky.dec, wcs);
  const nearbyNeighbors15Arcsec = findNearbyCatalogNeighbors(
    catalogSources,
    epochYear,
    targetEpochRa,
    targetEpochDec,
    { targetJ2000Ra, targetJ2000Dec, targetId, radiusArcsec: 15.0 }
  );

  const invalidWing = (reason: MaskedFrameReason): FrameTargetAstrometry => ({
    valid: false,
    x: Number(predPix.x.toFixed(3)),
    y: Number(predPix.y.toFixed(3)),
    dxArcsec: 0,
    dyArcsec: 0,
    uncertaintyArcsec: Number(Math.max(1.8, astrometry.refScatterArcsec).toFixed(3)),
    snr: 0,
    refStarsUsed: astrometry.refStarsUsed,
    refScatterArcsec: astrometry.refScatterArcsec,
    astrometryMethod: astrometry.method,
    lowConfidence: true,
    lowConfidenceReason: 'wing fit, low confidence',
    wingFit: false,
    maskedReason: reason,
    predictedPixel: { x: Number(predPix.x.toFixed(3)), y: Number(predPix.y.toFixed(3)) },
    distToPredictedPix: 0,
    nearbyNeighbors15Arcsec,
  });

  if (predPix.x < 6 || predPix.x >= width - 6 || predPix.y < 6 || predPix.y >= height - 6) {
    return invalidWing('out_of_bounds');
  }

  // Local sky background from outer 6.5..9.5 px annulus
  const bgVals: number[] = [];
  for (let py = Math.max(0, Math.floor(predPix.y - 10)); py <= Math.min(height - 1, Math.ceil(predPix.y + 10)); py++) {
    for (let px = Math.max(0, Math.floor(predPix.x - 10)); px <= Math.min(width - 1, Math.ceil(predPix.x + 10)); px++) {
      const r = Math.hypot(px - predPix.x, py - predPix.y);
      if (r < 6.5 || r > 9.5) continue;
      const idx = py * width + px;
      if (flags && idx < flags.length && (flags[idx] & SPHEREX_CRITICAL_MASK) !== 0) continue;
      if (Number.isFinite(flux[idx])) bgVals.push(flux[idx]);
    }
  }
  bgVals.sort((a, b) => a - b);
  const bg = bgVals.length > 0 ? bgVals[Math.floor(bgVals.length / 2)] : 0;

  // Gather unmasked pixels strictly in the 2..6 px annulus (masking 0x02/0x10 and NaN core)
  interface WingSample {
    x: number;
    y: number;
    netFlux: number;
    invVar: number;
  }
  const samples: WingSample[] = [];
  const quadrants = new Set<number>();
  let wingSum = 0;
  let wingVarSum = 0;

  for (let py = Math.max(0, Math.floor(predPix.y - 6)); py <= Math.min(height - 1, Math.ceil(predPix.y + 6)); py++) {
    for (let px = Math.max(0, Math.floor(predPix.x - 6)); px <= Math.min(width - 1, Math.ceil(predPix.x + 6)); px++) {
      const dx = px - predPix.x;
      const dy = py - predPix.y;
      const r = Math.hypot(dx, dy);
      if (r < 2.0 || r > 6.0) continue;
      const idx = py * width + px;
      if (flags && idx < flags.length && (flags[idx] & SPHEREX_CRITICAL_MASK) !== 0) continue;
      const v = flux[idx];
      if (!Number.isFinite(v)) continue;
      const pixVar = variance && idx < variance.length && Number.isFinite(variance[idx]) && variance[idx] > 1e-12 ? variance[idx] : 1.0;
      const netFlux = v - bg;
      samples.push({ x: px, y: py, netFlux, invVar: 1.0 / pixVar });
      wingSum += netFlux;
      wingVarSum += pixVar;
      const q = (dx >= 0 ? 1 : 0) + (dy >= 0 ? 2 : 0);
      quadrants.add(q);
    }
  }

  if (samples.length < minUnmaskedPixels || quadrants.size < 3) {
    return invalidWing('saturation_or_flag');
  }

  const wingSnr = wingVarSum > 0 ? wingSum / Math.sqrt(wingVarSum) : 0;
  if (!Number.isFinite(wingSnr) || wingSnr < 5.0 || wingSum <= 0) {
    return invalidWing('saturation_or_flag');
  }

  // Fit 2D radial Moffat-like wing model I(r) = A * (1 + r^2 / alpha^2)^(-2.0) over offsets within 1.4 px
  const alphaCandidates = [1.0, 1.35, 1.75];
  let bestCx = predPix.x;
  let bestCy = predPix.y;
  let bestAmp = 0;
  let bestAlpha = 1.35;
  let bestChi2 = Infinity;

  const evalOffset = (cx: number, cy: number, alpha: number) => {
    let sMm = 0;
    let sMf = 0;
    for (const s of samples) {
      const r2 = (s.x - cx) * (s.x - cx) + (s.y - cy) * (s.y - cy);
      const model = Math.pow(1 + r2 / (alpha * alpha), -2.0);
      sMm += s.invVar * model * model;
      sMf += s.invVar * model * s.netFlux;
    }
    const amp = sMm > 1e-12 ? sMf / sMm : 0;
    if (amp <= 0) return { amp: 0, chi2: Infinity };
    let chi2 = 0;
    for (const s of samples) {
      const r2 = (s.x - cx) * (s.x - cx) + (s.y - cy) * (s.y - cy);
      const pred = amp * Math.pow(1 + r2 / (alpha * alpha), -2.0);
      const diff = s.netFlux - pred;
      chi2 += s.invVar * diff * diff;
    }
    return { amp, chi2 };
  };

  // Coarse + fine 2-stage grid search (step 0.25 px then 0.05 px)
  for (const alpha of alphaCandidates) {
    for (let dy = -1.25; dy <= 1.25; dy += 0.25) {
      for (let dx = -1.25; dx <= 1.25; dx += 0.25) {
        if (Math.hypot(dx, dy) > 1.35) continue;
        const { amp, chi2 } = evalOffset(predPix.x + dx, predPix.y + dy, alpha);
        if (amp > 0 && chi2 < bestChi2) {
          bestChi2 = chi2;
          bestCx = predPix.x + dx;
          bestCy = predPix.y + dy;
          bestAmp = amp;
          bestAlpha = alpha;
        }
      }
    }
  }
  const coarseCx = bestCx;
  const coarseCy = bestCy;
  for (let dy = -0.25; dy <= 0.25; dy += 0.05) {
    for (let dx = -0.25; dx <= 0.25; dx += 0.05) {
      const cx = coarseCx + dx;
      const cy = coarseCy + dy;
      if (Math.hypot(cx - predPix.x, cy - predPix.y) > 1.45) continue;
      const { amp, chi2 } = evalOffset(cx, cy, bestAlpha);
      if (amp > 0 && chi2 < bestChi2) {
        bestChi2 = chi2;
        bestCx = cx;
        bestCy = cy;
        bestAmp = amp;
      }
    }
  }

  const distToPredPix = Math.hypot(bestCx - predPix.x, bestCy - predPix.y);
  if (bestAmp <= 0 || !Number.isFinite(bestChi2) || distToPredPix >= 1.5) {
    return invalidWing('offset_too_large');
  }

  const rawSky = WCS.pixToSky(bestCx, bestCy, wcs);
  const calSky = astrometry.applyToSky(rawSky.ra, rawSky.dec);
  const distToTargetArcsec = WCS.angularSeparationArcsec(calSky.ra, calSky.dec, targetEpochRa, targetEpochDec);
  for (const nb of nearbyNeighbors15Arcsec) {
    const distNb = WCS.angularSeparationArcsec(calSky.ra, calSky.dec, nb.ra, nb.dec);
    nb.distToCentroidArcsec = Number(distNb.toFixed(2));
    if (distNb < distToTargetArcsec) {
      return invalidWing('neighbor_contaminated');
    }
  }

  // Larger conservative wing-fit positional uncertainty (>= 1.8")
  const rmsRatio = Math.sqrt(bestChi2 / Math.max(1, samples.length - 3));
  const centErrArcsec = Math.max(1.8, Math.min(4.5, 0.35 * pixScale * Math.max(0.8, Math.min(2.0, rmsRatio))));
  const regErrArcsec = astrometry.refStarsUsed >= 1 ? astrometry.refScatterArcsec / Math.sqrt(astrometry.refStarsUsed) : 2.5;
  const combinedErrArcsec = Math.hypot(centErrArcsec, regErrArcsec);

  return {
    valid: true,
    x: Number(bestCx.toFixed(3)),
    y: Number(bestCy.toFixed(3)),
    ra: Number(calSky.ra.toFixed(6)),
    dec: Number(calSky.dec.toFixed(6)),
    dxArcsec: 0,
    dyArcsec: 0,
    uncertaintyArcsec: Number(combinedErrArcsec.toFixed(3)),
    centroidErrorArcsec: Number(centErrArcsec.toFixed(3)),
    refFitErrorArcsec: Number(regErrArcsec.toFixed(3)),
    snr: Number(wingSnr.toFixed(2)),
    refStarsUsed: astrometry.refStarsUsed,
    refScatterArcsec: astrometry.refScatterArcsec,
    astrometryMethod: astrometry.method,
    lowConfidence: true,
    lowConfidenceReason: 'wing fit, low confidence',
    wingFit: true,
    predictedPixel: { x: Number(predPix.x.toFixed(3)), y: Number(predPix.y.toFixed(3)) },
    distToPredictedPix: Number(distToPredPix.toFixed(3)),
    nearbyNeighbors15Arcsec,
  };
}

/**
 * Task 4: Per-frame aperture photometry with FLAGS masking, local sky subtraction,
 * and wing-annulus fallback for saturated cores.
 */
export function measureFrameApertureFlux(params: {
  flux: Float32Array;
  variance: Float32Array | null;
  flags: Int32Array | null;
  width: number;
  height: number;
  cx: number;
  cy: number;
}): {
  fluxMjySr: number;
  uncertaintyMjySr: number;
  snr: number;
  valid: boolean;
  isWingAnnulus: boolean;
  unmaskedPixels: number;
  maskedReason?: string;
} {
  const { flux, variance, flags, width, height, cx, cy } = params;
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || cx < 2 || cx >= width - 2 || cy < 2 || cy >= height - 2) {
    return { fluxMjySr: 0, uncertaintyMjySr: 0, snr: 0, valid: false, isWingAnnulus: false, unmaskedPixels: 0, maskedReason: 'out_of_bounds' };
  }

  // Outer sky background median (4.5..7.5 px)
  const bgVals: number[] = [];
  for (let py = Math.max(0, Math.floor(cy - 8)); py <= Math.min(height - 1, Math.ceil(cy + 8)); py++) {
    for (let px = Math.max(0, Math.floor(cx - 8)); px <= Math.min(width - 1, Math.ceil(cx + 8)); px++) {
      const r = Math.hypot(px - cx, py - cy);
      if (r < 4.5 || r > 7.5) continue;
      const idx = py * width + px;
      if (flags && idx < flags.length && (flags[idx] & SPHEREX_CRITICAL_MASK) !== 0) continue;
      if (Number.isFinite(flux[idx])) bgVals.push(flux[idx]);
    }
  }
  bgVals.sort((a, b) => a - b);
  const bg = bgVals.length > 0 ? bgVals[Math.floor(bgVals.length / 2)] : 0;

  // Core aperture (r <= 2.0 px)
  let coreSaturated = false;
  let coreSum = 0;
  let coreVar = 0;
  let coreCount = 0;
  for (let py = Math.max(0, Math.floor(cy - 2)); py <= Math.min(height - 1, Math.ceil(cy + 2)); py++) {
    for (let px = Math.max(0, Math.floor(cx - 2)); px <= Math.min(width - 1, Math.ceil(cx + 2)); px++) {
      const r = Math.hypot(px - cx, py - cy);
      if (r > 2.0) continue;
      const idx = py * width + px;
      if ((flags && idx < flags.length && (flags[idx] & SPHEREX_CRITICAL_MASK) !== 0) || !Number.isFinite(flux[idx])) {
        if (r <= 1.4) coreSaturated = true;
        continue;
      }
      coreSum += flux[idx] - bg;
      coreVar += variance && idx < variance.length && Number.isFinite(variance[idx]) && variance[idx] > 1e-12 ? variance[idx] : 0.25;
      coreCount++;
    }
  }

  if (!coreSaturated && coreCount >= 4) {
    const meanFlux = coreSum / coreCount;
    const unc = Math.sqrt(coreVar) / coreCount;
    const snr = unc > 1e-9 ? Math.abs(meanFlux) / unc : 0;
    return {
      fluxMjySr: Number(meanFlux.toFixed(4)),
      uncertaintyMjySr: Number(unc.toFixed(4)),
      snr: Number(snr.toFixed(2)),
      valid: true,
      isWingAnnulus: false,
      unmaskedPixels: coreCount,
    };
  }

  // Wing annulus photometry (2.0 < r <= 5.0 px) when core is saturated
  let wingSum = 0;
  let wingVar = 0;
  let wingCount = 0;
  for (let py = Math.max(0, Math.floor(cy - 5)); py <= Math.min(height - 1, Math.ceil(cy + 5)); py++) {
    for (let px = Math.max(0, Math.floor(cx - 5)); px <= Math.min(width - 1, Math.ceil(cx + 5)); px++) {
      const r = Math.hypot(px - cx, py - cy);
      if (r <= 2.0 || r > 5.0) continue;
      const idx = py * width + px;
      if (flags && idx < flags.length && (flags[idx] & SPHEREX_CRITICAL_MASK) !== 0) continue;
      if (!Number.isFinite(flux[idx])) continue;
      wingSum += flux[idx] - bg;
      wingVar += variance && idx < variance.length && Number.isFinite(variance[idx]) && variance[idx] > 1e-12 ? variance[idx] : 0.25;
      wingCount++;
    }
  }

  if (wingCount >= 10) {
    const meanWing = wingSum / wingCount;
    const unc = Math.sqrt(wingVar) / wingCount;
    const snr = unc > 1e-9 ? Math.abs(meanWing) / unc : 0;
    return {
      fluxMjySr: Number(meanWing.toFixed(4)),
      uncertaintyMjySr: Number(unc.toFixed(4)),
      snr: Number(snr.toFixed(2)),
      valid: true,
      isWingAnnulus: true,
      unmaskedPixels: wingCount,
    };
  }

  return {
    fluxMjySr: 0,
    uncertaintyMjySr: 0,
    snr: 0,
    valid: false,
    isWingAnnulus: false,
    unmaskedPixels: coreCount + wingCount,
    maskedReason: 'saturated_insufficient_annulus',
  };
}

/**
 * Task 2: Compute residual scatter (astrometric floor) in arcsec from a stationary control target.
 */
export function measureControlResidualScatter(
  targetId: string,
  frames: ControlFrameResidualInput[]
): ControlScatterReport {
  const perFrameResidualsArcsec: number[] = [];
  for (const fr of frames) {
    if (!fr.valid) continue;
    const res = Math.hypot(fr.dxArcsec - (fr.predDxArcsec ?? 0), fr.dyArcsec - (fr.predDyArcsec ?? 0));
    if (Number.isFinite(res)) perFrameResidualsArcsec.push(Number(res.toFixed(4)));
  }

  if (perFrameResidualsArcsec.length < 2) {
    return {
      targetId,
      validFrames: perFrameResidualsArcsec.length,
      totalFrames: frames.length,
      residualScatterArcsec: null,
      meanOffsetArcsec: null,
      perFrameResidualsArcsec,
    };
  }

  const rms = Math.sqrt(
    perFrameResidualsArcsec.reduce((acc, r) => acc + r * r, 0) / perFrameResidualsArcsec.length
  );
  const mean = perFrameResidualsArcsec.reduce((acc, r) => acc + r, 0) / perFrameResidualsArcsec.length;
  return {
    targetId,
    validFrames: perFrameResidualsArcsec.length,
    totalFrames: frames.length,
    residualScatterArcsec: Number(Math.max(0.05, rms).toFixed(3)),
    meanOffsetArcsec: Number(mean.toFixed(3)),
    perFrameResidualsArcsec,
  };
}

/**
 * Task 2: Combine residual scatters across stationary controls (RW Aur, R Dra)
 * into a single empirical astrometric floor in arcsec.
 */
export function computeAstrometricFloor(reports: ControlScatterReport[]): {
  floorArcsec: number;
  controlsUsed: string[];
  perControlScatterArcsec: Record<string, number>;
} {
  const validReports = reports.filter((r) => r.residualScatterArcsec != null && r.validFrames >= 2);
  const perControlScatterArcsec: Record<string, number> = {};
  for (const r of validReports) {
    perControlScatterArcsec[r.targetId] = r.residualScatterArcsec!;
  }
  if (validReports.length === 0) {
    return {
      floorArcsec: 1.5,
      controlsUsed: [],
      perControlScatterArcsec,
    };
  }
  const rmsFloor = Math.sqrt(
    validReports.reduce((s, r) => s + r.residualScatterArcsec! * r.residualScatterArcsec!, 0) / validReports.length
  );
  return {
    floorArcsec: Number(rmsFloor.toFixed(3)),
    controlsUsed: validReports.map((r) => r.targetId),
    perControlScatterArcsec,
  };
}

/**
 * Task 1: Compute per-detector and per-brightness-class astrometric floor
 * combining leave-one-out Gaia DR3 reference-star residuals (median per class)
 * with stationary controls measured in the SAME detector.
 */
export function computeDetectorAndBrightnessFloor(params: {
  detector: string;
  looResiduals: LeaveOneOutResidual[];
  targetMeanSnr: number;
  controlReportsInDetector: ControlScatterReport[];
}): {
  floorArcsec: number;
  detectorLooFloorArcsec: number | null;
  controlFloorInDetectorArcsec: number | null;
  floorByBrightnessClass: Partial<Record<StarBrightnessClass, number>>;
  brightnessClassUsed: StarBrightnessClass;
  looSampleCount: number;
  controlsUsedInDetector: string[];
} {
  const { looResiduals, targetMeanSnr, controlReportsInDetector } = params;

  const brightnessClassUsed: StarBrightnessClass =
    targetMeanSnr >= 80 ? 'bright' : targetMeanSnr >= 12 ? 'medium' : 'faint';

  const medianOf = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const val = sorted.length % 2 === 1 ? sorted[mid] : 0.5 * (sorted[mid - 1] + sorted[mid]);
    return Number(val.toFixed(3));
  };

  const allLooVals = looResiduals
    .map((r) => r.residArcsec)
    .filter((v) => Number.isFinite(v) && v >= 0);
  const detectorLooFloorArcsec = medianOf(allLooVals);

  const floorByBrightnessClass: Partial<Record<StarBrightnessClass, number>> = {};
  for (const cls of ['bright', 'medium', 'faint'] as StarBrightnessClass[]) {
    const vals = looResiduals
      .filter((r) => r.brightnessClass === cls)
      .map((r) => r.residArcsec)
      .filter((v) => Number.isFinite(v) && v >= 0);
    const med = medianOf(vals);
    if (med != null) floorByBrightnessClass[cls] = med;
  }

  const classSpecificFloor =
    looResiduals.filter((r) => r.brightnessClass === brightnessClassUsed).length >= 3
      ? floorByBrightnessClass[brightnessClassUsed] ?? detectorLooFloorArcsec
      : detectorLooFloorArcsec ?? floorByBrightnessClass[brightnessClassUsed] ?? null;

  const validControls = controlReportsInDetector.filter(
    (r) => r.residualScatterArcsec != null && r.validFrames >= 2
  );
  const controlFloorInDetectorArcsec =
    validControls.length > 0
      ? Number(
          Math.sqrt(
            validControls.reduce(
              (acc, r) => acc + r.residualScatterArcsec! * r.residualScatterArcsec!,
              0
            ) / validControls.length
          ).toFixed(3)
        )
      : null;

  let floorArcsec = 1.5;
  if (classSpecificFloor != null && controlFloorInDetectorArcsec != null) {
    // Combine LOO empirical residual floor and same-detector stationary control floor via RMS
    floorArcsec = Number(
      Math.max(0.15, Math.sqrt(0.5 * (classSpecificFloor * classSpecificFloor + controlFloorInDetectorArcsec * controlFloorInDetectorArcsec))).toFixed(3)
    );
  } else if (classSpecificFloor != null) {
    floorArcsec = Number(Math.max(0.15, classSpecificFloor).toFixed(3));
  } else if (controlFloorInDetectorArcsec != null) {
    floorArcsec = Number(Math.max(0.15, controlFloorInDetectorArcsec).toFixed(3));
  }

  return {
    floorArcsec,
    detectorLooFloorArcsec,
    controlFloorInDetectorArcsec,
    floorByBrightnessClass,
    brightnessClassUsed,
    looSampleCount: allLooVals.length,
    controlsUsedInDetector: validControls.map((r) => r.targetId),
  };
}

export interface WeightedMotionFrameInput {
  mjd: number;
  dxArcsec: number;
  dyArcsec: number;
  uncertaintyArcsec: number;
  valid: boolean;
  wingFit?: boolean;
}

export interface WeightedLinearMotionResult {
  valid: boolean;
  validFrames: number;
  wingFitFrames: number;
  mjdStart: number;
  mjdEnd: number;
  spanDays: number;
  netDxArcsec: number;
  netDyArcsec: number;
  displacementArcsec: number;
  displacementErrorArcsec: number;
  pmRaArcsecYr: number;
  pmDecArcsecYr: number;
  annualMotionArcsecYr: number;
  annualMotionErrorArcsecYr: number;
  reducedChi2: number;
}

export interface AstrometryErrorBudgetResult {
  chosenOption: 'a' | 'b';
  methodLabel: 'unsaturated frames only' | 'includes wing-fit frames, low confidence';
  chosen: WeightedLinearMotionResult;
  optionA: WeightedLinearMotionResult;
  optionB: WeightedLinearMotionResult;
}

/**
 * Inverse-variance weighted linear fit of (dRA*cos(dec), dDec) vs time (MJD).
 * Weights each frame by w_i = 1 / sigma_i^2, uses Birge inflation if redChi2 > 1,
 * and combines with the per-detector/brightness-class astrometric floor in quadrature.
 */
export function fitWeightedProperMotionLinear(
  frames: WeightedMotionFrameInput[],
  detectorFloorArcsec: number
): WeightedLinearMotionResult {
  const valid = frames.filter((f) => f.valid && Number.isFinite(f.mjd) && Number.isFinite(f.dxArcsec) && Number.isFinite(f.dyArcsec));
  const wingFitFrames = valid.filter((f) => f.wingFit).length;
  if (valid.length < 2) {
    const mjdSingle = valid[0]?.mjd ?? frames[0]?.mjd ?? 0;
    return {
      valid: false,
      validFrames: valid.length,
      wingFitFrames,
      mjdStart: mjdSingle,
      mjdEnd: mjdSingle,
      spanDays: 0,
      netDxArcsec: 0,
      netDyArcsec: 0,
      displacementArcsec: 0,
      displacementErrorArcsec: Number(Math.max(0.05, detectorFloorArcsec).toFixed(3)),
      pmRaArcsecYr: 0,
      pmDecArcsecYr: 0,
      annualMotionArcsecYr: 0,
      annualMotionErrorArcsecYr: 0,
      reducedChi2: 1,
    };
  }

  const sorted = [...valid].sort((a, b) => a.mjd - b.mjd);
  const mjdStart = sorted[0].mjd;
  const mjdEnd = sorted[sorted.length - 1].mjd;
  const spanDays = Number((mjdEnd - mjdStart).toFixed(4));
  const spanYears = spanDays / 365.25;

  if (spanDays <= 0.01) {
    return {
      valid: false,
      validFrames: sorted.length,
      wingFitFrames,
      mjdStart,
      mjdEnd,
      spanDays,
      netDxArcsec: 0,
      netDyArcsec: 0,
      displacementArcsec: 0,
      displacementErrorArcsec: Number(Math.max(0.05, detectorFloorArcsec).toFixed(3)),
      pmRaArcsecYr: 0,
      pmDecArcsecYr: 0,
      annualMotionArcsecYr: 0,
      annualMotionErrorArcsecYr: 0,
      reducedChi2: 1,
    };
  }

  let sW = 0;
  let sWt = 0;
  let sWdx = 0;
  let sWdy = 0;
  const pts = sorted.map((f) => {
    const t = (f.mjd - mjdStart) / 365.25;
    const sig = Math.max(0.15, Number.isFinite(f.uncertaintyArcsec) ? f.uncertaintyArcsec : 1.0);
    const w = 1 / (sig * sig);
    sW += w;
    sWt += w * t;
    sWdx += w * f.dxArcsec;
    sWdy += w * f.dyArcsec;
    return { t, w, dx: f.dxArcsec, dy: f.dyArcsec };
  });

  const tBar = sWt / sW;
  const dxBar = sWdx / sW;
  const dyBar = sWdy / sW;

  let stt = 0;
  let stDx = 0;
  let stDy = 0;
  for (const p of pts) {
    const dt = p.t - tBar;
    stt += p.w * dt * dt;
    stDx += p.w * dt * (p.dx - dxBar);
    stDy += p.w * dt * (p.dy - dyBar);
  }

  if (stt <= 1e-12) {
    return {
      valid: false,
      validFrames: sorted.length,
      wingFitFrames,
      mjdStart,
      mjdEnd,
      spanDays,
      netDxArcsec: 0,
      netDyArcsec: 0,
      displacementArcsec: 0,
      displacementErrorArcsec: Number(Math.max(0.05, detectorFloorArcsec).toFixed(3)),
      pmRaArcsecYr: 0,
      pmDecArcsecYr: 0,
      annualMotionArcsecYr: 0,
      annualMotionErrorArcsecYr: 0,
      reducedChi2: 1,
    };
  }

  const vx = stDx / stt;
  const vy = stDy / stt;
  const ax = dxBar - vx * tBar;
  const ay = dyBar - vy * tBar;

  let chi2 = 0;
  for (const p of pts) {
    const rx = p.dx - (ax + vx * p.t);
    const ry = p.dy - (ay + vy * p.t);
    chi2 += p.w * (rx * rx + ry * ry);
  }
  const dof = 2 * (pts.length - 2);
  const reducedChi2 = dof > 0 ? Number((chi2 / dof).toFixed(3)) : 1;
  // Cap Birge inflation reasonably while reflecting real scatter exceeding formal errors
  const birge = dof > 0 ? Math.min(3.5, Math.sqrt(Math.max(1, reducedChi2))) : 1;

  const netDxArcsec = Number((vx * spanYears).toFixed(3));
  const netDyArcsec = Number((vy * spanYears).toFixed(3));
  const displacementArcsec = Number(Math.hypot(netDxArcsec, netDyArcsec).toFixed(3));

  const formalDispErr = (spanYears / Math.sqrt(stt)) * birge;
  const displacementErrorArcsec = Number(Math.hypot(formalDispErr, detectorFloorArcsec).toFixed(3));

  const safeYears = Math.max(0.05, spanYears);
  const annualMotionArcsecYr = Number(Math.hypot(vx, vy).toFixed(3));
  const annualMotionErrorArcsecYr = Number((displacementErrorArcsec / safeYears).toFixed(3));

  return {
    valid: true,
    validFrames: sorted.length,
    wingFitFrames,
    mjdStart,
    mjdEnd,
    spanDays,
    netDxArcsec,
    netDyArcsec,
    displacementArcsec,
    displacementErrorArcsec,
    pmRaArcsecYr: Number(vx.toFixed(3)),
    pmDecArcsecYr: Number(vy.toFixed(3)),
    annualMotionArcsecYr,
    annualMotionErrorArcsecYr,
    reducedChi2,
  };
}

/**
 * Computes astrometric error budget twice:
 *   (a) unsaturated-core frames only
 *   (b) all valid frames including wing fits (weighted by individual frame errors)
 * Chooses (a) when (a) has >= 4 frames spanning >= 180 days, else (b).
 */
export function evaluateAstrometryErrorBudget(
  frames: WeightedMotionFrameInput[],
  detectorFloorArcsec: number
): AstrometryErrorBudgetResult {
  const unsatOnly = frames.filter((f) => f.valid && !f.wingFit);
  const optionA = fitWeightedProperMotionLinear(unsatOnly, detectorFloorArcsec);
  const optionB = fitWeightedProperMotionLinear(frames, detectorFloorArcsec);

  const useOptionA = optionA.valid && optionA.validFrames >= 4 && optionA.spanDays >= 180;
  const chosenOption: 'a' | 'b' = useOptionA ? 'a' : 'b';
  const chosen = useOptionA ? optionA : optionB;
  const methodLabel: 'unsaturated frames only' | 'includes wing-fit frames, low confidence' =
    chosenOption === 'a' || chosen.wingFitFrames === 0
      ? 'unsaturated frames only'
      : 'includes wing-fit frames, low confidence';

  return {
    chosenOption,
    methodLabel,
    chosen,
    optionA,
    optionB,
  };
}


