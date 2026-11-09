import {
  CandidateDetection,
  EvidenceSummary,
  FITSImageData,
  InvestigationClassification,
  SPHERExObservation,
  WCSParams,
} from './types';
import { ReprojectionCoordinateGrid, WCS } from './wcs';

export const MIN_POSITIVE_VARIANCE = 1e-12;
export const SPATIAL_WARP_REPROJECTION_THRESHOLD_PX = 1e-4;
export const CONSERVATIVE_DQ_WEIGHT_THRESHOLD = 1e-7;

export interface PixelReprojectionResult {
  alignedData: Float32Array;
  alignedVariance: Float32Array;
  alignedFlags: Int32Array | null;
  grid: ReprojectionCoordinateGrid;
  runtimeMs: number;
}

export interface DifferenceOutput {
  width: number;
  height: number;
  diff: Float32Array;
  variance: Float32Array;
  significance: Float32Array;
  stats: {
    min: number;
    max: number;
    std: number;
    noiseSigma: number;
  };
  registration: {
    dxPixels: number;
    dyPixels: number;
    method: string;
    quality: string;
    runtimeMs?: number;
    maxSpatialWarpPixels?: number;
    reprojectionMode?: 'PIXEL_BY_PIXEL_WCS' | 'RIGID_TRANSLATION';
    dqPropagationPolicy?: string;
  };
  compatibility: {
    isCompatible: boolean;
    reason?: string;
    timeBaselineDays: number;
    wavelengthDiffUm: number;
    timeBaselineType?: 'SAME_EXPOSURE' | 'INTRA_VISIT_EXPOSURES' | 'INDEPENDENT_VISIT' | 'SURVEY_EPOCH';
    timeBaselineHuman?: string;
    integrationDuration1Sec?: number;
    integrationDuration2Sec?: number;
    startToStartCadenceSec?: number;
    interExposureGapSec?: number;
  };
  candidates: CandidateDetection[];
  evidence: EvidenceSummary;
}

export class ScientificPipeline {
  private static parseUtcTimestampMs(raw: unknown): number | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.replace(/['"]/g, '').trim();
    if (!trimmed || /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+UTC$/i.test(trimmed) === false && !trimmed.includes('T')) {
      return null;
    }
    const iso = trimmed.includes('T')
      ? /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)
        ? trimmed
        : `${trimmed}Z`
      : trimmed.replace(/\s*\(.*?\)\s*/g, '').replace(' ', 'T').replace(/\s+UTC$/i, 'Z');
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : null;
  }

  /**
   * Evaluate astronomical compatibility and separated temporal quantities between two SPHEREx exposures
   */
  public static checkCompatibility(
    obs1: SPHERExObservation,
    obs2: SPHERExObservation,
    fits1: FITSImageData,
    fits2: FITSImageData
  ): {
    isCompatible: boolean;
    reason?: string;
    timeBaselineDays: number;
    wavelengthDiffUm: number;
    timeBaselineType?: 'SAME_EXPOSURE' | 'INTRA_VISIT_EXPOSURES' | 'INDEPENDENT_VISIT' | 'SURVEY_EPOCH';
    timeBaselineHuman?: string;
    integrationDuration1Sec?: number;
    integrationDuration2Sec?: number;
    startToStartCadenceSec?: number;
    interExposureGapSec?: number;
  } {
    const explicitStart1Ms = this.parseUtcTimestampMs(obs1.date_obs);
    const explicitEnd1Ms = this.parseUtcTimestampMs(obs1.date_end);
    const explicitStart2Ms = this.parseUtcTimestampMs(obs2.date_obs);
    const explicitEnd2Ms = this.parseUtcTimestampMs(obs2.date_end);

    const headerStart1Ms = this.parseUtcTimestampMs(fits1.header?.['DATE-OBS']);
    const headerEnd1Ms = this.parseUtcTimestampMs(fits1.header?.['DATE-END']);
    const headerStart2Ms = this.parseUtcTimestampMs(fits2.header?.['DATE-OBS']);
    const headerEnd2Ms = this.parseUtcTimestampMs(fits2.header?.['DATE-END']);

    const obsHasDistinctMjdWithoutIso =
      (explicitStart1Ms === null || explicitStart2Ms === null) &&
      Math.abs((obs2.t_min ?? 0) - (obs1.t_min ?? 0)) > 1e-7;

    const start1Ms = explicitStart1Ms ?? (obsHasDistinctMjdWithoutIso ? null : headerStart1Ms);
    const end1Ms = explicitEnd1Ms ?? (obsHasDistinctMjdWithoutIso ? null : headerEnd1Ms);
    const start2Ms = explicitStart2Ms ?? (obsHasDistinctMjdWithoutIso ? null : headerStart2Ms);
    const end2Ms = explicitEnd2Ms ?? (obsHasDistinctMjdWithoutIso ? null : headerEnd2Ms);

    const integrationDuration1Sec =
      obs1.integration_duration_sec !== undefined
        ? obs1.integration_duration_sec
        : start1Ms !== null && end1Ms !== null && end1Ms >= start1Ms
        ? Number(((end1Ms - start1Ms) / 1000).toFixed(3))
        : obs1.t_max > obs1.t_min
        ? Number(((obs1.t_max - obs1.t_min) * 86400).toFixed(3))
        : undefined;

    const integrationDuration2Sec =
      obs2.integration_duration_sec !== undefined
        ? obs2.integration_duration_sec
        : start2Ms !== null && end2Ms !== null && end2Ms >= start2Ms
        ? Number(((end2Ms - start2Ms) / 1000).toFixed(3))
        : obs2.t_max > obs2.t_min
        ? Number(((obs2.t_max - obs2.t_min) * 86400).toFixed(3))
        : undefined;

    const timeBaselineDays =
      start1Ms !== null && start2Ms !== null
        ? Math.abs(start2Ms - start1Ms) / 86400000
        : Math.abs(obs2.t_min - obs1.t_min);

    const startToStartCadenceSec = Number(
      (
        start1Ms !== null && start2Ms !== null
          ? Math.abs(start2Ms - start1Ms) / 1000
          : timeBaselineDays * 86400
      ).toFixed(3)
    );

    const chronologicalFirstEndMs =
      start1Ms !== null && start2Ms !== null
        ? start1Ms <= start2Ms
          ? end1Ms
          : end2Ms
        : null;
    const chronologicalSecondStartMs =
      start1Ms !== null && start2Ms !== null
        ? start1Ms <= start2Ms
          ? start2Ms
          : start1Ms
        : null;

    let interExposureGapSec: number | undefined;
    if (chronologicalFirstEndMs !== null && chronologicalSecondStartMs !== null) {
      interExposureGapSec = Number(((chronologicalSecondStartMs - chronologicalFirstEndMs) / 1000).toFixed(3));
    } else if (obs2.t_min > obs1.t_max) {
      interExposureGapSec = Number(((obs2.t_min - obs1.t_max) * 86400).toFixed(3));
    }

    const wl1 = obs1.wavelength_um ?? (obs1.em_min + obs1.em_max) / 2 * 1e6;
    const wl2 = obs2.wavelength_um ?? (obs2.em_min + obs2.em_max) / 2 * 1e6;
    const wavelengthDiffUm = Math.abs(wl2 - wl1);

    let timeBaselineType: 'SAME_EXPOSURE' | 'INTRA_VISIT_EXPOSURES' | 'INDEPENDENT_VISIT' | 'SURVEY_EPOCH' = 'INDEPENDENT_VISIT';
    let timeBaselineHuman = `${timeBaselineDays.toFixed(1)} days`;

    if (timeBaselineDays < 0.00002) {
      timeBaselineType = 'SAME_EXPOSURE';
      timeBaselineHuman = 'Identical exposure (<1s start-to-start cadence)';
    } else if (timeBaselineDays < 0.04167) {
      timeBaselineType = 'INTRA_VISIT_EXPOSURES';
      const intText = integrationDuration1Sec !== undefined ? `; integration ${integrationDuration1Sec.toFixed(3)}s` : '';
      const gapText = interExposureGapSec !== undefined ? `, gap ${interExposureGapSec.toFixed(3)}s` : '';
      timeBaselineHuman = `${(startToStartCadenceSec / 60).toFixed(2)} minutes (${startToStartCadenceSec.toFixed(3)}s start-to-start cadence${intText}${gapText}; intra-orbit scan)`;
    } else if (timeBaselineDays < 30) {
      timeBaselineType = 'INDEPENDENT_VISIT';
      timeBaselineHuman = `${timeBaselineDays.toFixed(1)} days (independent visit start-to-start cadence)`;
    } else {
      timeBaselineType = 'SURVEY_EPOCH';
      timeBaselineHuman = `${(timeBaselineDays / 30.4).toFixed(1)} months (multi-epoch survey cadence)`;
    }

    // If wavelength difference exceeds 0.35 microns (different SPHEREx spectral channel),
    // direct flux differencing is physically invalid
    if (wavelengthDiffUm > 0.35) {
      return {
        isCompatible: false,
        reason: `Wavelength bands are physically incompatible: Exposure 1 is at ${wl1.toFixed(2)} µm and Exposure 2 is at ${wl2.toFixed(2)} µm (difference ${wavelengthDiffUm.toFixed(2)} µm). Differencing across distinct spectral bands measures spectral color slope rather than true temporal variability.`,
        timeBaselineDays,
        wavelengthDiffUm,
        timeBaselineType,
        timeBaselineHuman,
        integrationDuration1Sec,
        integrationDuration2Sec,
        startToStartCadenceSec,
        interExposureGapSec,
      };
    }

    // Check pixel scale ratio
    const scaleRatio = fits1.wcs.pixelScaleArcsec / (fits2.wcs.pixelScaleArcsec || 1.0);
    if (Math.abs(scaleRatio - 1.0) > 0.2) {
      return {
        isCompatible: false,
        reason: `Pixel scale mismatch: Exposure 1 is ${fits1.wcs.pixelScaleArcsec.toFixed(2)}"/px while Exposure 2 is ${fits2.wcs.pixelScaleArcsec.toFixed(2)}"/px.`,
        timeBaselineDays,
        wavelengthDiffUm,
        timeBaselineType,
        timeBaselineHuman,
        integrationDuration1Sec,
        integrationDuration2Sec,
        startToStartCadenceSec,
        interExposureGapSec,
      };
    }

    // Check data release version boundary (reject uncalibrated QR2 vs QR3 subtraction)
    const rel1 = (obs1 as any).releaseId || fits1.header?.['RELEASE'];
    const rel2 = (obs2 as any).releaseId || fits2.header?.['RELEASE'];
    const isQr2_1 = rel1 ? String(rel1).toUpperCase().includes('QR2') : false;
    const isQr3_1 = rel1 ? String(rel1).toUpperCase().includes('QR3') : false;
    const isQr2_2 = rel2 ? String(rel2).toUpperCase().includes('QR2') : false;
    const isQr3_2 = rel2 ? String(rel2).toUpperCase().includes('QR3') : false;

    if ((isQr2_1 && isQr3_2) || (isQr3_1 && isQr2_2)) {
      return {
        isCompatible: false,
        reason: `Cross-release comparison rejected: Exposure 1 is from '${rel1 || 'QR2'}' and Exposure 2 is from '${rel2 || 'QR3'}'. Direct flux differencing across IPAC Quick Releases is scientifically invalid without unified flux correction factors, background zero-point matching, and ePSF homogenization.`,
        timeBaselineDays,
        wavelengthDiffUm,
        timeBaselineType,
        timeBaselineHuman,
        integrationDuration1Sec,
        integrationDuration2Sec,
        startToStartCadenceSec,
        interExposureGapSec,
      };
    }

    return {
      isCompatible: true,
      timeBaselineDays,
      wavelengthDiffUm,
      timeBaselineType,
      timeBaselineHuman,
      integrationDuration1Sec,
      integrationDuration2Sec,
      startToStartCadenceSec,
      interExposureGapSec,
    };
  }

  /**
   * Compute strictly positive fallback variance floor so missing or corrupt variance
   * is never silently treated as zero uncertainty.
   */
  public static resolveFallbackVariance(fits: Pick<FITSImageData, 'stats'>): number {
    const noise =
      fits.stats && Number.isFinite(fits.stats.robustNoise) && fits.stats.robustNoise > 0
        ? fits.stats.robustNoise
        : fits.stats && Number.isFinite(fits.stats.std) && fits.stats.std > 0
        ? fits.stats.std
        : 1e-3;
    return Math.max(MIN_POSITIVE_VARIANCE, noise * noise);
  }

  private static computeGridCorrelation(
    fits1: FITSImageData,
    fits2: FITSImageData,
    grid: ReprojectionCoordinateGrid
  ): number {
    const w = grid.width;
    const h = grid.height;
    const srcW = fits1.width;
    const srcH = fits1.height;
    const pad = Math.min(4, Math.floor(Math.min(w, h) / 6));

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    let count = 0;

    for (let y = pad; y < h - pad; y++) {
      const rowOffset = y * w;
      for (let x = pad; x < w - pad; x++) {
        const idx = rowOffset + x;
        const v2 = fits2.data[idx];
        if (!Number.isFinite(v2)) continue;
        const sx = grid.srcX[idx];
        const sy = grid.srcY[idx];
        if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx < 0 || sx > srcW - 1 || sy < 0 || sy > srcH - 1) {
          continue;
        }
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = Math.min(x0 + 1, srcW - 1);
        const y1 = Math.min(y0 + 1, srcH - 1);
        const fx = sx - x0;
        const fy = sy - y0;
        const v1 =
          (1 - fx) * (1 - fy) * fits1.data[y0 * srcW + x0] +
          fx * (1 - fy) * fits1.data[y0 * srcW + x1] +
          (1 - fx) * fy * fits1.data[y1 * srcW + x0] +
          fx * fy * fits1.data[y1 * srcW + x1];
        if (Number.isFinite(v1)) {
          const dev1 = v1 - fits1.stats.median;
          const dev2 = v2 - fits2.stats.median;
          dotProduct += dev1 * dev2;
          norm1 += dev1 * dev1;
          norm2 += dev2 * dev2;
          count++;
        }
      }
    }

    const denom = Math.sqrt(norm1 * norm2);
    return denom > 0 && count > 25 ? dotProduct / denom : 0;
  }

  /**
   * Analyze spatial WCS mapping between Epoch 1 and Epoch 2 and select the scientifically
   * appropriate registration mode:
   * - Pixel-by-pixel WCS reprojection when TAN-SIP distortion is present or when spatial
   *   mapping varies across the detector (rotation, shear, scale change, or gnomonic curvature).
   * - Rigid translation when both exposures share an undistorted constant-offset WCS grid.
   */
  public static computeRegistration(
    fits1: FITSImageData,
    fits2: FITSImageData
  ): {
    dx: number;
    dy: number;
    method: string;
    quality: string;
    runtimeMs: number;
    maxSpatialWarpPixels: number;
    reprojectionMode: 'PIXEL_BY_PIXEL_WCS' | 'RIGID_TRANSLATION';
    dqPropagationPolicy: string;
  } {
    const t0 = performance.now();
    const w = Math.min(fits1.width, fits2.width);
    const h = Math.min(fits1.height, fits2.height);

    const grid = WCS.getReprojectionGrid(fits2.wcs, fits1.wcs, w, h);
    const requiresPixelReprojection =
      grid.hasSipDistortion || grid.maxSpatialWarpPixels > SPATIAL_WARP_REPROJECTION_THRESHOLD_PX;

    if (requiresPixelReprojection) {
      const rScore = this.computeGridCorrelation(fits1, fits2, grid);
      const elapsedMs = Number((performance.now() - t0).toFixed(4));
      return {
        dx: grid.centerDx,
        dy: grid.centerDy,
        method: grid.hasSipDistortion
          ? 'Pixel-by-Pixel WCS Reprojection (TAN-SIP)'
          : 'Pixel-by-Pixel WCS Reprojection (TAN)',
        quality:
          rScore > 0.8
            ? `Excellent (r=${rScore.toFixed(3)}, warp=${grid.maxSpatialWarpPixels.toFixed(4)}px)`
            : rScore > 0.4
            ? `Good (r=${rScore.toFixed(3)}, warp=${grid.maxSpatialWarpPixels.toFixed(4)}px)`
            : `Astrometric WCS Solution (warp=${grid.maxSpatialWarpPixels.toFixed(4)}px)`,
        runtimeMs: elapsedMs,
        maxSpatialWarpPixels: grid.maxSpatialWarpPixels,
        reprojectionMode: 'PIXEL_BY_PIXEL_WCS',
        dqPropagationPolicy: 'Conservative Bitwise OR over contributing bilinear stencil pixels (w > 1e-7); out-of-bounds = 0',
      };
    }

    let initialDx = grid.centerDx;
    let initialDy = grid.centerDy;

    if (!Number.isFinite(initialDx) || Math.abs(initialDx) > w / 2) initialDx = 0;
    if (!Number.isFinite(initialDy) || Math.abs(initialDy) > h / 2) initialDy = 0;

    // Cross-correlation refinement search around constant WCS shift (-2 to +2 pixels)
    let bestScore = -Infinity;
    let bestDx = 0;
    let bestDy = 0;

    const pad = 6;
    if (w > pad * 2 && h > pad * 2) {
      for (let sY = -2; sY <= 2; sY++) {
        for (let sX = -2; sX <= 2; sX++) {
          let dotProduct = 0;
          let norm1 = 0;
          let norm2 = 0;
          let count = 0;

          for (let y = pad; y < h - pad; y++) {
            for (let x = pad; x < w - pad; x++) {
              const v2 = fits2.data[y * w + x];
              if (!Number.isFinite(v2)) continue;
              const x1 = Math.round(x + initialDx + sX);
              const y1 = Math.round(y + initialDy + sY);
              if (x1 >= 0 && x1 < w && y1 >= 0 && y1 < h) {
                const v1 = fits1.data[y1 * w + x1];
                if (Number.isFinite(v1)) {
                  const dev2 = v2 - fits2.stats.median;
                  const dev1 = v1 - fits1.stats.median;
                  dotProduct += dev1 * dev2;
                  norm1 += dev1 * dev1;
                  norm2 += dev2 * dev2;
                  count++;
                }
              }
            }
          }

          const denom = Math.sqrt(norm1 * norm2);
          const score = denom > 0 && count > 50 ? dotProduct / denom : -1;
          if (score > bestScore) {
            bestScore = score;
            bestDx = sX;
            bestDy = sY;
          }
        }
      }
    }

    const totalDx = initialDx + (bestScore > 0.6 ? bestDx : 0);
    const totalDy = initialDy + (bestScore > 0.6 ? bestDy : 0);
    const elapsedMs = Number((performance.now() - t0).toFixed(4));

    return {
      dx: totalDx,
      dy: totalDy,
      method: 'Rigid Translation (WCS Center Offset + Normalized Cross-Correlation Refinement)',
      quality: bestScore > 0.8 ? 'Excellent (r > 0.8)' : bestScore > 0.4 ? 'Good (r > 0.4)' : 'Nominal WCS',
      runtimeMs: elapsedMs,
      maxSpatialWarpPixels: grid.maxSpatialWarpPixels,
      reprojectionMode: 'RIGID_TRANSLATION',
      dqPropagationPolicy: 'Conservative Bitwise OR over contributing bilinear stencil pixels (w > 1e-7); out-of-bounds = 0',
    };
  }

  /**
   * Reproject source image onto target WCS grid pixel-by-pixel using bilinear interpolation,
   * squared-weight variance propagation (never zero uncertainty), explicit out-of-bounds NaN masking,
   * NaN stencil weight renormalization, and conservative bitwise-OR DQ flag propagation.
   *
   * Policies:
   * - Coordinate mapping: (x, y)_target -> (RA, Dec) via targetWcs -> (sx, sy)_source via sourceFits.wcs.
   * - Boundaries: Pixels with non-finite (sx, sy) or outside [0, srcWidth - 1] x [0, srcHeight - 1]
   *   are never extrapolated; flux = NaN, variance = NaN, flags = 0.
   * - Flux interpolation: I_out = sum_{ab: finite} (w_ab * I_ab) / W_valid; NaN if W_valid == 0.
   * - Variance propagation: Var_out = max(1e-12, sum_{ab: finite} (w_ab^2 * V_ab) / W_valid^2),
   *   where missing variance extension or non-finite pixel variance uses max(1e-12, robustNoise^2).
   * - Conservative DQ propagation: Bitwise OR across all 2x2 stencil pixels with weight w_ab > 1e-7.
   */
  public static reprojectPixelByPixel(
    sourceFits: FITSImageData,
    targetWcs: WCSParams,
    outWidth: number,
    outHeight: number
  ): PixelReprojectionResult {
    const t0 = performance.now();
    const grid = WCS.getReprojectionGrid(targetWcs, sourceFits.wcs, outWidth, outHeight);

    const srcW = sourceFits.width;
    const srcH = sourceFits.height;
    const srcData = sourceFits.data;
    const srcVar = sourceFits.variance;
    const srcFlags = sourceFits.flags;
    const fallbackVar = this.resolveFallbackVariance(sourceFits);

    const total = outWidth * outHeight;
    const alignedData = new Float32Array(total);
    const alignedVariance = new Float32Array(total);
    const alignedFlags = srcFlags ? new Int32Array(total) : null;

    for (let idx = 0; idx < total; idx++) {
      const sx = grid.srcX[idx];
      const sy = grid.srcY[idx];

      if (
        !Number.isFinite(sx) ||
        !Number.isFinite(sy) ||
        sx < 0 ||
        sx > srcW - 1 ||
        sy < 0 ||
        sy > srcH - 1
      ) {
        alignedData[idx] = NaN;
        alignedVariance[idx] = NaN;
        continue;
      }

      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const y1 = Math.min(y0 + 1, srcH - 1);

      const fx = sx - x0;
      const fy = sy - y0;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const i00 = y0 * srcW + x0;
      const i10 = y0 * srcW + x1;
      const i01 = y1 * srcW + x0;
      const i11 = y1 * srcW + x1;

      if (alignedFlags && srcFlags) {
        let dq = 0;
        if (w00 > CONSERVATIVE_DQ_WEIGHT_THRESHOLD) dq |= srcFlags[i00];
        if (w10 > CONSERVATIVE_DQ_WEIGHT_THRESHOLD) dq |= srcFlags[i10];
        if (w01 > CONSERVATIVE_DQ_WEIGHT_THRESHOLD) dq |= srcFlags[i01];
        if (w11 > CONSERVATIVE_DQ_WEIGHT_THRESHOLD) dq |= srcFlags[i11];
        alignedFlags[idx] = dq;
      }

      const d00 = srcData[i00];
      const d10 = srcData[i10];
      const d01 = srcData[i01];
      const d11 = srcData[i11];

      let fluxSum = 0;
      let validWeight = 0;
      let varSum = 0;

      if (Number.isFinite(d00)) {
        fluxSum += d00 * w00;
        validWeight += w00;
        const v00 = srcVar && Number.isFinite(srcVar[i00]) && srcVar[i00] >= 0 ? srcVar[i00] : fallbackVar;
        varSum += w00 * w00 * v00;
      }
      if (Number.isFinite(d10)) {
        fluxSum += d10 * w10;
        validWeight += w10;
        const v10 = srcVar && Number.isFinite(srcVar[i10]) && srcVar[i10] >= 0 ? srcVar[i10] : fallbackVar;
        varSum += w10 * w10 * v10;
      }
      if (Number.isFinite(d01)) {
        fluxSum += d01 * w01;
        validWeight += w01;
        const v01 = srcVar && Number.isFinite(srcVar[i01]) && srcVar[i01] >= 0 ? srcVar[i01] : fallbackVar;
        varSum += w01 * w01 * v01;
      }
      if (Number.isFinite(d11)) {
        fluxSum += d11 * w11;
        validWeight += w11;
        const v11 = srcVar && Number.isFinite(srcVar[i11]) && srcVar[i11] >= 0 ? srcVar[i11] : fallbackVar;
        varSum += w11 * w11 * v11;
      }

      if (validWeight > 0) {
        alignedData[idx] = fluxSum / validWeight;
        alignedVariance[idx] = Math.max(MIN_POSITIVE_VARIANCE, varSum / (validWeight * validWeight));
      } else {
        alignedData[idx] = NaN;
        alignedVariance[idx] = NaN;
      }
    }

    const runtimeMs = Number((performance.now() - t0).toFixed(4));
    return {
      alignedData,
      alignedVariance,
      alignedFlags,
      grid,
      runtimeMs,
    };
  }

  /**
   * Resample array with fractional pixel translation (dx, dy) using bilinear interpolation with NaN guard
   */
  public static resampleBilinear(
    data: Float32Array,
    width: number,
    height: number,
    dx: number,
    dy: number
  ): Float32Array {
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) {
      return new Float32Array(data);
    }

    const output = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = x + dx;
        const srcY = y + dy;

        if (!Number.isFinite(srcX) || !Number.isFinite(srcY) || srcX < 0 || srcX > width - 1 || srcY < 0 || srcY > height - 1) {
          output[y * width + x] = NaN;
          continue;
        }

        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, width - 1);
        const y1 = Math.min(y0 + 1, height - 1);

        const fx = srcX - x0;
        const fy = srcY - y0;

        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;

        const v00 = data[y0 * width + x0];
        const v10 = data[y0 * width + x1];
        const v01 = data[y1 * width + x0];
        const v11 = data[y1 * width + x1];

        let weightedSum = 0;
        let weightTotal = 0;

        if (Number.isFinite(v00)) { weightedSum += v00 * w00; weightTotal += w00; }
        if (Number.isFinite(v10)) { weightedSum += v10 * w10; weightTotal += w10; }
        if (Number.isFinite(v01)) { weightedSum += v01 * w01; weightTotal += w01; }
        if (Number.isFinite(v11)) { weightedSum += v11 * w11; weightTotal += w11; }

        output[y * width + x] = weightTotal > 0 ? weightedSum / weightTotal : NaN;
      }
    }
    return output;
  }

  /**
   * Resample variance array with fractional pixel translation (dx, dy)
   * propagating variance using squared interpolation weights: Var(F') = sum(w_i^2 * Var(F_i)).
   * If weights are normalized by weightTotal (when missing/NaN pixels occur):
   * Var(F') = sum(w_i^2 * Var(F_i)) / (weightTotal^2).
   */
  public static resampleVarianceBilinear(
    varData: Float32Array,
    width: number,
    height: number,
    dx: number,
    dy: number
  ): Float32Array {
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) {
      return new Float32Array(varData);
    }

    const output = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = x + dx;
        const srcY = y + dy;

        if (!Number.isFinite(srcX) || !Number.isFinite(srcY) || srcX < 0 || srcX > width - 1 || srcY < 0 || srcY > height - 1) {
          output[y * width + x] = NaN;
          continue;
        }

        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, width - 1);
        const y1 = Math.min(y0 + 1, height - 1);

        const fx = srcX - x0;
        const fy = srcY - y0;

        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;

        const v00 = varData[y0 * width + x0];
        const v10 = varData[y0 * width + x1];
        const v01 = varData[y1 * width + x0];
        const v11 = varData[y1 * width + x1];

        let weightedVarSum = 0;
        let weightTotal = 0;

        if (Number.isFinite(v00) && v00 >= 0) {
          weightedVarSum += (w00 * w00) * v00;
          weightTotal += w00;
        }
        if (Number.isFinite(v10) && v10 >= 0) {
          weightedVarSum += (w10 * w10) * v10;
          weightTotal += w10;
        }
        if (Number.isFinite(v01) && v01 >= 0) {
          weightedVarSum += (w01 * w01) * v01;
          weightTotal += w01;
        }
        if (Number.isFinite(v11) && v11 >= 0) {
          weightedVarSum += (w11 * w11) * v11;
          weightTotal += w11;
        }

        output[y * width + x] = weightTotal > 0
          ? Math.max(MIN_POSITIVE_VARIANCE, weightedVarSum / (weightTotal * weightTotal))
          : NaN;
      }
    }
    return output;
  }

  /**
   * Resample DQ flag mask under rigid sub-pixel translation using conservative bitwise OR
   * across all 2x2 stencil pixels with weight w > 1e-7.
   */
  public static resampleFlagsConservative(
    flagsData: Int32Array | null,
    width: number,
    height: number,
    dx: number,
    dy: number
  ): Int32Array | null {
    if (!flagsData) return null;
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) {
      return new Int32Array(flagsData);
    }

    const output = new Int32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = x + dx;
        const srcY = y + dy;

        if (!Number.isFinite(srcX) || !Number.isFinite(srcY) || srcX < 0 || srcX > width - 1 || srcY < 0 || srcY > height - 1) {
          output[y * width + x] = 0;
          continue;
        }

        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, width - 1);
        const y1 = Math.min(y0 + 1, height - 1);
        const fx = srcX - x0;
        const fy = srcY - y0;

        let dq = 0;
        if ((1 - fx) * (1 - fy) > CONSERVATIVE_DQ_WEIGHT_THRESHOLD) dq |= flagsData[y0 * width + x0];
        if (fx * (1 - fy) > CONSERVATIVE_DQ_WEIGHT_THRESHOLD) dq |= flagsData[y0 * width + x1];
        if ((1 - fx) * fy > CONSERVATIVE_DQ_WEIGHT_THRESHOLD) dq |= flagsData[y1 * width + x0];
        if (fx * fy > CONSERVATIVE_DQ_WEIGHT_THRESHOLD) dq |= flagsData[y1 * width + x1];
        output[y * width + x] = dq;
      }
    }
    return output;
  }

  /**
   * Execute full difference image generation: D = I2 - I1_reprojected, variance propagation,
   * conservative DQ propagation, candidate detection, and evidence synthesis.
   */
  public static processDifference(
    obs1: SPHERExObservation,
    obs2: SPHERExObservation,
    fits1: FITSImageData,
    fits2: FITSImageData
  ): DifferenceOutput {
    const t0 = performance.now();
    const width = fits2.width;
    const height = fits2.height;
    const size = width * height;

    const compatibility = this.checkCompatibility(obs1, obs2, fits1, fits2);
    const reg = this.computeRegistration(fits1, fits2);

    const fallbackVar1 = this.resolveFallbackVariance(fits1);
    const fallbackVar2 = this.resolveFallbackVariance(fits2);

    let alignedEpoch1: Float32Array;
    let alignedVar1: Float32Array;
    let alignedFlags1: Int32Array | null;

    if (reg.reprojectionMode === 'PIXEL_BY_PIXEL_WCS') {
      const reproj = this.reprojectPixelByPixel(fits1, fits2.wcs, width, height);
      alignedEpoch1 = reproj.alignedData;
      alignedVar1 = reproj.alignedVariance;
      alignedFlags1 = reproj.alignedFlags;
    } else {
      alignedEpoch1 = this.resampleBilinear(fits1.data, width, height, reg.dx, reg.dy);
      const var1 = fits1.variance ?? new Float32Array(size).fill(fallbackVar1);
      alignedVar1 = this.resampleVarianceBilinear(var1, width, height, reg.dx, reg.dy);
      alignedFlags1 = this.resampleFlagsConservative(fits1.flags, width, height, reg.dx, reg.dy);
    }

    const diff = new Float32Array(size);
    const variance = new Float32Array(size);
    const significance = new Float32Array(size);

    let diffSum = 0;
    let validDiffCount = 0;
    let minD = Infinity;
    let maxD = -Infinity;

    for (let i = 0; i < size; i++) {
      const v2 = fits2.data[i];
      const v1 = alignedEpoch1[i];

      const rawV2 = fits2.variance ? fits2.variance[i] : fallbackVar2;
      const v2_unc = Number.isFinite(rawV2) && rawV2 > 0 ? rawV2 : fallbackVar2;

      if (Number.isFinite(v2) && Number.isFinite(v1)) {
        const d = v2 - v1;
        diff[i] = d;

        // Independent uncertainty propagation: sigma_D^2 = sigma_1,prop^2 + sigma_2^2
        const v1_unc = Number.isFinite(alignedVar1[i]) && alignedVar1[i] > 0 ? alignedVar1[i] : fallbackVar1;
        const varD = Math.max(MIN_POSITIVE_VARIANCE, v1_unc + v2_unc);
        variance[i] = varD;

        const sigmaD = Math.sqrt(varD);
        significance[i] = d / sigmaD;

        if (d < minD) minD = d;
        if (d > maxD) maxD = d;
        diffSum += d;
        validDiffCount++;
      } else {
        diff[i] = NaN;
        variance[i] = Math.max(MIN_POSITIVE_VARIANCE, fallbackVar1 + v2_unc);
        significance[i] = 0;
      }
    }

    const meanD = validDiffCount > 0 ? diffSum / validDiffCount : 0;
    let varDiffSum = 0;
    for (let i = 0; i < size; i++) {
      if (Number.isFinite(diff[i])) {
        const delta = diff[i] - meanD;
        varDiffSum += delta * delta;
      }
    }
    const stdD = validDiffCount > 0 ? Math.sqrt(varDiffSum / validDiffCount) : 0;

    // Robust noise in difference image via MAD
    const diffValues = Array.from(diff).filter(Number.isFinite);
    diffValues.sort((a, b) => a - b);
    const mid = Math.floor(diffValues.length / 2);
    const medianD = diffValues.length > 0 ? diffValues[mid] : 0;
    const diffAbsDev = diffValues.map((v) => Math.abs(v - medianD));
    diffAbsDev.sort((a, b) => a - b);
    const noiseSigma = 1.4826 * (diffAbsDev[mid] || stdD);
    const timeBaselineDays = Math.abs(obs2.t_min - obs1.t_min);

    const candidates = this.detectCandidates(
      diff,
      variance,
      significance,
      alignedEpoch1,
      fits2.data,
      alignedFlags1 ?? fits1.flags,
      fits2.flags,
      width,
      height,
      fits2.wcs,
      noiseSigma,
      timeBaselineDays
    );

    const evidence = this.evaluateEvidence(candidates, compatibility, obs1, obs2, noiseSigma);
    const totalRegRuntimeMs = Number((performance.now() - t0).toFixed(4));

    return {
      width,
      height,
      diff,
      variance,
      significance,
      stats: {
        min: Number.isFinite(minD) ? minD : 0,
        max: Number.isFinite(maxD) ? maxD : 0,
        std: stdD,
        noiseSigma: noiseSigma > 0 ? noiseSigma : stdD,
      },
      registration: {
        dxPixels: reg.dx,
        dyPixels: reg.dy,
        method: reg.method,
        quality: reg.quality,
        runtimeMs: totalRegRuntimeMs,
        maxSpatialWarpPixels: reg.maxSpatialWarpPixels,
        reprojectionMode: reg.reprojectionMode,
        dqPropagationPolicy: reg.dqPropagationPolicy,
      },
      compatibility,
      candidates,
      evidence,
    };
  }

  /**
   * Subpixel 2D Center-of-Mass / Intensity-Weighted Centroiding
   * Computes subpixel centroid coordinates (cx, cy) and positional uncertainty
   * within a local 5x5 window around the detected peak (peakX, peakY).
   */
  public static computeSubpixelCentroid(
    diff: Float32Array,
    width: number,
    height: number,
    peakX: number,
    peakY: number,
    radius = 2
  ): { cx: number; cy: number; uncertaintyPix: number; valid: boolean } {
    let sumWeight = 0;
    let sumWx = 0;
    let sumWy = 0;
    const peakIdx = peakY * width + peakX;
    const peakVal = diff[peakIdx];
    const isPositive = peakVal >= 0;

    // Estimate local background from outer perimeter of 5x5 box
    let bgSum = 0;
    let bgCount = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
          const nx = peakX + dx;
          const ny = peakY + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            bgSum += diff[ny * width + nx];
            bgCount++;
          }
        }
      }
    }
    const bg = bgCount > 0 ? bgSum / bgCount : 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = peakX + dx;
        const ny = peakY + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const val = diff[ny * width + nx];
          const net = isPositive ? val - bg : -(val - bg);
          if (net > 0) {
            sumWeight += net;
            sumWx += net * nx;
            sumWy += net * ny;
          }
        }
      }
    }

    if (sumWeight > 0) {
      const cx = sumWx / sumWeight;
      const cy = sumWy / sumWeight;
      // Positional deviation must be within physical radius of peak pixel
      if (Math.abs(cx - peakX) <= radius && Math.abs(cy - peakY) <= radius) {
        const snr = Math.max(1, Math.abs(peakVal));
        const uncertaintyPix = Math.max(0.05, Math.min(0.5, 1.0 / Math.sqrt(snr)));
        return {
          cx: Number(cx.toFixed(3)),
          cy: Number(cy.toFixed(3)),
          uncertaintyPix: Number(uncertaintyPix.toFixed(3)),
          valid: true,
        };
      }
    }

    return { cx: peakX, cy: peakY, uncertaintyPix: 0.5, valid: false };
  }

  /**
   * Real peak candidate detection with circular aperture photometry & artifact rejection
   */
  public static detectCandidates(
    diff: Float32Array,
    varMap: Float32Array,
    significance: Float32Array,
    data1: Float32Array,
    data2: Float32Array,
    flags1: Int32Array | null,
    flags2: Int32Array | null,
    width: number,
    height: number,
    wcs: any,
    noiseSigma: number,
    timeBaselineDays = 0
  ): CandidateDetection[] {
    const candidates: CandidateDetection[] = [];
    const minSignificanceThreshold = 4.0; // 4.0 sigma threshold
    const borderMargin = 5; // Ignore border pixels

    const visited = new Uint8Array(width * height);

    for (let y = borderMargin; y < height - borderMargin; y++) {
      for (let x = borderMargin; x < width - borderMargin; x++) {
        const idx = y * width + x;
        if (visited[idx]) continue;

        const s = significance[idx];
        const absS = Math.abs(s);

        if (absS >= minSignificanceThreshold) {
          // Check if it's a local peak in 5x5 neighborhood
          let isExtremum = true;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nIdx = (y + dy) * width + (x + dx);
              if (Math.abs(significance[nIdx]) > absS) {
                isExtremum = false;
                break;
              }
            }
            if (!isExtremum) break;
          }

          if (isExtremum) {
            // Mark 9x9 neighborhood as visited to isolate individual sources
            for (let dy = -4; dy <= 4; dy++) {
              for (let dx = -4; dx <= 4; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  visited[ny * width + nx] = 1;
                }
              }
            }

            // Subpixel 2D centroid fitting
            const centroid = this.computeSubpixelCentroid(diff, width, height, x, y, 2);
            const peakSky = WCS.pixToSky(x, y, wcs);
            const centroidSky = centroid.valid ? WCS.pixToSky(centroid.cx, centroid.cy, wcs) : peakSky;

            // Perform circular aperture photometry centered at candidate coordinates
            const phot = this.aperturePhotometry(
              centroid.cx,
              centroid.cy,
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

            // Artifact assessment
            const artifact = this.assessArtifact(
              x,
              y,
              absS,
              diff,
              flags1,
              flags2,
              width,
              height,
              noiseSigma
            );

            // Aperture S/N verification: authentic astrophysical sources require significant integrated aperture flux
            const apertureSnr = phot.deltaUncertainty > 0 ? Math.abs(phot.deltaFlux) / phot.deltaUncertainty : 0;
            let status: CandidateDetection['status'] = 'Candidate';
            let scientificClassification: CandidateDetection['scientificClassification'] = 'SIGNIFICANT_FLUX_CHANGE';

            if (artifact.artifactScore >= 0.65 || artifact.flags.includes('REGISTRATION_OR_PSF_DIPOLE')) {
              status = 'Possible artifact';
              scientificClassification = 'REGISTRATION_OR_PSF_ARTIFACT';
            } else if (apertureSnr < 3.0 && absS >= 4.0) {
              // High single-pixel residual without significant integrated aperture flux is an unmodeled PSF/registration artifact
              status = 'Possible artifact';
              scientificClassification = 'REGISTRATION_OR_PSF_ARTIFACT';
              if (!artifact.flags.includes('LOW_APERTURE_SIGNIFICANCE')) {
                artifact.flags.push('LOW_APERTURE_SIGNIFICANCE');
              }
              artifact.whyFlagged = (artifact.whyFlagged ? artifact.whyFlagged + ' ' : '') +
                'High single-pixel difference is not confirmed by integrated aperture photometry (aperture S/N < 3.0σ), consistent with pointing jitter or PSF breathing.';
              artifact.artifactScore = Math.max(artifact.artifactScore, 0.70);
            } else if (apertureSnr >= 3.5 && artifact.artifactScore < 0.35) {
              status = 'Candidate';
              scientificClassification = 'SIGNIFICANT_FLUX_CHANGE';
            } else if (apertureSnr >= 2.0 && absS >= 3.5) {
              status = 'Stationary source residual';
              scientificClassification = 'STATIONARY_SOURCE_RESIDUAL';
            } else {
              status = 'Insufficient evidence';
              scientificClassification = 'INSUFFICIENT_EVIDENCE';
            }

            candidates.push({
              id: `CAND-${String(candidates.length + 1).padStart(2, '0')}`,
              x,
              y,
              peakX: x,
              peakY: y,
              peakRa: Number(peakSky.ra.toFixed(6)),
              peakDec: Number(peakSky.dec.toFixed(6)),
              centroidX: centroid.cx,
              centroidY: centroid.cy,
              centroidUncertaintyPix: centroid.uncertaintyPix,
              ra: Number(centroidSky.ra.toFixed(6)),
              dec: Number(centroidSky.dec.toFixed(6)),
              peakSignificance: Number(s.toFixed(2)),
              apertureSignificance: Number(apertureSnr.toFixed(2)),
              deltaFlux: Number(phot.deltaFlux.toFixed(4)),
              deltaFluxUncertainty: Number(phot.deltaUncertainty.toFixed(4)),
              apertureFluxEpoch1: Number(phot.flux1.toFixed(4)),
              apertureFluxEpoch2: Number(phot.flux2.toFixed(4)),
              apertureUncertainty1: Number(phot.unc1.toFixed(4)),
              apertureUncertainty2: Number(phot.unc2.toFixed(4)),
              status,
              scientificClassification,
              artifactScore: Number(artifact.artifactScore.toFixed(2)),
              artifactFlags: artifact.flags,
              whyFlagged: artifact.whyFlagged,
              catalogMatches: [],
              fwhmPixels: artifact.fwhm,
              morphology: artifact.morphology,
            });
          }
        }
      }
    }

    // -------------------------------------------------------------
    // MOTION / ASTEROID DETECTION ALGORITHM:
    // Identifies moving objects (e.g. Solar System asteroids or high-proper-motion stars)
    // by searching for a complementary opposite-sign counterpart in the difference frame.
    // RIGOROUS GUARDS TO PREVENT FALSE POSITIVE MOVING OBJECTS:
    // 1. Neither component may be flagged as a registration/PSF artifact or dipole.
    // 2. Both components must have clean point-like morphology.
    // 3. True displacement check:
    //    - At Epoch 1 (negative candidate position), a real source existed, and was absent at Epoch 2.
    //    - At Epoch 2 (positive candidate position), a real source exists, and was absent at Epoch 1.
    //    - Stationary stars with flux in both epochs MUST NOT be classified as moving objects!
    // 4. Physical velocity constraint:
    //    - Apparent motion must be physically plausible (< 3000 arcsec/day for Solar System objects).
    //    - Over intra-visit cadences (< 0.05 days / < 1 hour), displacement cannot exceed realistic
    //      asteroid velocities (e.g. < 5 pixels).
    // -------------------------------------------------------------
    const positiveCandidates = candidates.filter(
      (c) =>
        c.deltaFlux > 0 &&
        !c.artifactFlags.includes('REGISTRATION_OR_PSF_DIPOLE') &&
        !c.artifactFlags.includes('DETECTOR_OVERFLOW')
    );
    const negativeCandidates = candidates.filter(
      (c) =>
        c.deltaFlux < 0 &&
        !c.artifactFlags.includes('REGISTRATION_OR_PSF_DIPOLE') &&
        !c.artifactFlags.includes('DETECTOR_OVERFLOW')
    );

    for (const posCand of positiveCandidates) {
      let bestMatch: CandidateDetection | null = null;
      let minDiscrepancy = Infinity;

      for (const negCand of negativeCandidates) {
        const dx = posCand.x - negCand.x;
        const dy = posCand.y - negCand.y;
        const distPix = Math.hypot(dx, dy);

        // Displaced dipole condition: spatial displacement between 1.8 and 30 pixels
        if (distPix < 1.8 || distPix > 30.0) continue;

        const sepArcsec = WCS.angularSeparationArcsec(posCand.ra, posCand.dec, negCand.ra, negCand.dec);
        const dtDays = timeBaselineDays > 0 ? timeBaselineDays : 1.0;
        const speedArcsecDay = sepArcsec / dtDays;

        // Physical velocity constraint:
        // Solar System asteroids move at ~200 - 2500 arcsec/day.
        // For intra-visit cadences (dtDays < 0.05 = ~1.2 hours), a separation > 5 pixels (~31 arcsec)
        // implies > 25,000 "/day, which is physically impossible for asteroids!
        // Unrelated stationary PSF residuals separated by 71-175" (11-28 px) must NOT be paired!
        if (dtDays < 0.05 && distPix > 5.0) continue;
        if (speedArcsecDay > 4000.0) continue;

        // Check astrophysical displacement:
        // PosCand in Epoch 1 should NOT have had a dominant stationary star:
        const posEpoch1Significance =
          posCand.apertureUncertainty1 > 0 ? posCand.apertureFluxEpoch1 / posCand.apertureUncertainty1 : 0;
        const posRatio = posCand.apertureFluxEpoch1 / Math.max(1e-4, posCand.apertureFluxEpoch2);
        // If posCand already had > 60% of its flux in Epoch 1 with high significance, it is a stationary star, not a moving object!
        if (posRatio > 0.6 && posEpoch1Significance > 4.0) continue;

        // Similarly for negCand in Epoch 2:
        const negEpoch2Significance =
          negCand.apertureUncertainty2 > 0 ? negCand.apertureFluxEpoch2 / negCand.apertureUncertainty2 : 0;
        const negRatio = negCand.apertureFluxEpoch2 / Math.max(1e-4, negCand.apertureFluxEpoch1);
        if (negRatio > 0.6 && negEpoch2Significance > 4.0) continue;

        const fluxRatio = Math.abs(posCand.deltaFlux) / Math.max(1e-4, Math.abs(negCand.deltaFlux));
        // Flux balance condition (within a factor of 2.8)
        if (fluxRatio >= 0.35 && fluxRatio <= 2.8) {
          const discrepancy = Math.abs(1.0 - fluxRatio) + distPix * 0.04;
          if (discrepancy < minDiscrepancy) {
            minDiscrepancy = discrepancy;
            bestMatch = negCand;
          }
        }
      }

      if (bestMatch) {
        const sepArcsec = WCS.angularSeparationArcsec(posCand.ra, posCand.dec, bestMatch.ra, bestMatch.dec);
        const dtDays = timeBaselineDays > 0 ? timeBaselineDays : 1.0;
        const speedArcsecDay = sepArcsec / dtDays;
        const properMotionMasYr = (sepArcsec * 1000) / (dtDays * 365.25);

        // Bearing / Position Angle from Epoch 1 (negative trough) to Epoch 2 (positive peak)
        const dAlpha = (posCand.ra - bestMatch.ra) * (Math.PI / 180);
        const d1 = bestMatch.dec * (Math.PI / 180);
        const d2 = posCand.dec * (Math.PI / 180);
        const yBearing = Math.sin(dAlpha) * Math.cos(d2);
        const xBearing = Math.cos(d1) * Math.sin(d2) - Math.sin(d1) * Math.cos(d2) * Math.cos(dAlpha);
        let paDeg = (Math.atan2(yBearing, xBearing) * (180 / Math.PI)) % 360;
        if (paDeg < 0) paDeg += 360;

        posCand.motion = {
          isMoving: true,
          speedArcsecPerDay: Number(speedArcsecDay.toFixed(2)),
          properMotionMasYr: Number(properMotionMasYr.toFixed(1)),
          positionAngleDeg: Number(paDeg.toFixed(1)),
          separationArcsec: Number(sepArcsec.toFixed(2)),
          counterpart: {
            x: bestMatch.x,
            y: bestMatch.y,
            ra: bestMatch.ra,
            dec: bestMatch.dec,
            flux: bestMatch.deltaFlux,
          },
        };

        posCand.status = 'Moving object candidate';
        posCand.scientificClassification = 'POSSIBLE_MOVING_OBJECT';
        posCand.artifactScore = Math.min(posCand.artifactScore, 0.2);
        posCand.whyFlagged = `Moving object candidate: displacement of ${sepArcsec.toFixed(1)}" detected across ${dtDays.toFixed(1)} days (apparent speed ${speedArcsecDay.toFixed(2)}"/day, PA ${paDeg.toFixed(1)}°).`;
      }
    }

    // Sort candidates by descending absolute significance
    candidates.sort((a, b) => Math.abs(b.peakSignificance) - Math.abs(a.peakSignificance));
    // Return all genuine candidates meeting statistical significance and isolation criteria (safe memory cap: 50)
    return candidates.slice(0, 50);
  }

  /**
   * Circular aperture photometry with local sky background annulus subtraction
   * 
   * Photometry Units & Flux Calibration:
   * - Native FITS data are calibrated in surface brightness (BUNIT = 'MJy/sr').
   * - Pixel scale is ~6.15 arcsec/pixel; pixel solid angle Omega_pix ≈ 8.89e-10 sr.
   * - 1 MJy/sr corresponds to ~889 uJy per pixel beam (F_Jy = I * 1e6 * Omega_pix).
   * - Aperture sum computes integrated surface brightness across the aperture: sum(I_i - <I_sky>).
   * 
   * Geometry:
   * - Target Aperture: r_ap = 2.5 pixels (~15.4 arcsec radius, enclosing ~85% of SPHEREx PSF energy).
   * - Background Annulus: r_in = 4.0 pixels to r_out = 6.0 pixels (~24.6 to 36.9 arcsec).
   * - Background Subtraction: F_net = sum_ap(I_i) - N_ap * <I_sky>.
   * 
   * Variance Propagation & Correlated Noise Limitation:
   * - Uncorrelated variance propagation: sigma_net^2 = sum_ap(sigma_i^2) + (N_ap^2 / N_sky) * sigma_sky^2.
   * - Limitation Note: Bilinear sub-pixel resampling and detector inter-pixel capacitance (IPC)
   *   introduce positive spatial covariance between adjacent pixels (cov(I_i, I_j) > 0).
   *   Assuming independent pixel noise underestimates true aperture noise by ~15-30%.
   *   Reported aperture uncertainties are nominal uncorrelated estimates.
   */
  public static aperturePhotometry(
    cx: number,
    cy: number,
    data1: Float32Array,
    data2: Float32Array,
    diff: Float32Array,
    varMap: Float32Array,
    width: number,
    height: number,
    rAp: number,
    rIn: number,
    rOut: number
  ) {
    let sum1 = 0;
    let sum2 = 0;
    let sumDiff = 0;
    let sumVar = 0;
    let apPixels = 0;

    // Background annulus in difference image (collect for robust median)
    const bkgDiffValues: number[] = [];
    const bkg1Values: number[] = [];
    const bkg2Values: number[] = [];
    let bkgVarSum = 0;
    let bkgPixels = 0;

    const maxR = Math.ceil(rOut);
    for (let dy = -maxR; dy <= maxR; dy++) {
      for (let dx = -maxR; dx <= maxR; dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const dist = Math.hypot(dx, dy);
          const idx = py * width + px;

          const dVal = diff[idx];
          const vVal = varMap[idx];
          const d1 = data1[idx];
          const d2 = data2[idx];

          if (dist <= rAp) {
            if (Number.isFinite(dVal)) {
              sumDiff += dVal;
              sumVar += Number.isFinite(vVal) && vVal > 0 ? vVal : MIN_POSITIVE_VARIANCE;
              if (Number.isFinite(d1)) sum1 += d1;
              if (Number.isFinite(d2)) sum2 += d2;
              apPixels++;
            }
          } else if (dist >= rIn && dist <= rOut) {
            if (Number.isFinite(dVal)) {
              bkgDiffValues.push(dVal);
              if (Number.isFinite(d1)) bkg1Values.push(d1);
              if (Number.isFinite(d2)) bkg2Values.push(d2);
              bkgVarSum += Number.isFinite(vVal) && vVal > 0 ? vVal : MIN_POSITIVE_VARIANCE;
              bkgPixels++;
            }
          }
        }
      }
    }

    // Robust median of background annulus pixels prevents bias from nearby stars or cosmetic defects
    bkgDiffValues.sort((a, b) => a - b);
    bkg1Values.sort((a, b) => a - b);
    bkg2Values.sort((a, b) => a - b);

    const bkgDiffMedian = bkgDiffValues.length > 0
      ? bkgDiffValues[Math.floor(bkgDiffValues.length / 2)]
      : 0;
    const bkg1Median = bkg1Values.length > 0
      ? bkg1Values[Math.floor(bkg1Values.length / 2)]
      : 0;
    const bkg2Median = bkg2Values.length > 0
      ? bkg2Values[Math.floor(bkg2Values.length / 2)]
      : 0;

    const netDeltaFlux = apPixels > 0 ? sumDiff - bkgDiffMedian * apPixels : 0;
    const netFlux1 = apPixels > 0 ? sum1 - bkg1Median * apPixels : 0;
    const netFlux2 = apPixels > 0 ? sum2 - bkg2Median * apPixels : 0;

    const bkgVarMean = bkgPixels > 0 ? bkgVarSum / bkgPixels : sumVar / Math.max(1, apPixels);
    const deltaUncertainty = Math.sqrt(
      Math.max(1e-10, sumVar + (apPixels ** 2 / Math.max(1, bkgPixels)) * bkgVarMean)
    );

    return {
      deltaFlux: netDeltaFlux,
      deltaUncertainty,
      flux1: netFlux1,
      flux2: netFlux2,
      unc1: Math.sqrt(Math.max(1e-10, sumVar / 2)),
      unc2: Math.sqrt(Math.max(1e-10, sumVar / 2)),
    };
  }

  /**
   * Artifact assessment: analyzes morphology, edge proximity, bad pixels, dipole signs
   */
  public static assessArtifact(
    cx: number,
    cy: number,
    sig: number,
    diff: Float32Array,
    flags1: Int32Array | null,
    flags2: Int32Array | null,
    width: number,
    height: number,
    noiseSigma: number = 0
  ): {
    artifactScore: number;
    flags: string[];
    whyFlagged?: string;
    fwhm: number;
    morphology: 'point-like' | 'extended' | 'sharp-spike' | 'dipole';
  } {
    const flags: string[] = [];
    let penalty = 0.0;

    // 1. Edge proximity
    const distToEdge = Math.min(cx, cy, width - 1 - cx, height - 1 - cy);
    if (distToEdge <= 4) {
      flags.push('EDGE_PROXIMITY');
      penalty += 0.5;
    }

    // 2. Data quality flag inspection from FITS HDU 2 (SPHEREx QR2 flag bitmask)
    // Bit 0 (0x1): TRANSIENT (Cosmic ray hit or slope jump)
    // Bit 1 (0x2): OVERFLOW (Full-well saturation / nonlinearity)
    // Bit 2 (0x4): SUR_ERROR (Sample-Up-the-Ramp slope fitting error)
    // Bit 19 (0x80000): OUTLIER (Statistical outlier detected by pipeline)
    // Bit 21 (0x200000): SOURCE (Astronomical source catalog position)
    const idx = cy * width + cx;
    const f1 = flags1 ? flags1[idx] : 0;
    const f2 = flags2 ? flags2[idx] : 0;

    if ((f1 & 0x01) !== 0 || (f2 & 0x01) !== 0) {
      flags.push('TRANSIENT_OR_CR');
      penalty += 0.75;
    }
    if ((f1 & 0x02) !== 0 || (f2 & 0x02) !== 0) {
      flags.push('SATURATION');
      penalty += 0.85;
    }
    if ((f1 & 0x04) !== 0 || (f2 & 0x04) !== 0) {
      flags.push('NONLINEAR_SUR_RESPONSE');
      penalty += 0.6;
    }
    if ((f1 & 0x80000) !== 0 || (f2 & 0x80000) !== 0) {
      flags.push('STATISTICAL_OUTLIER');
      penalty += 0.6;
    }

    // 3. Cosmic ray spike check: central pixel contains >80% of entire 3x3 flux
    let peakVal = Math.abs(diff[idx]);
    if (!Number.isFinite(peakVal)) peakVal = 0;
    let neighborSum = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nVal = Math.abs(diff[ny * width + nx]);
          if (Number.isFinite(nVal)) neighborSum += nVal;
        }
      }
    }
    const concentration = peakVal / Math.max(1e-5, peakVal + neighborSum);
    let morphology: 'point-like' | 'extended' | 'sharp-spike' | 'dipole' = 'point-like';
    let fwhm = 2.2;

    if (concentration > 0.75 && peakVal > 0) {
      morphology = 'sharp-spike';
      fwhm = 0.8;
      flags.push('COSMIC_RAY_SPIKE');
      penalty += 0.65;
    }

    // 4. Astrometric registration residue / dipole check
    // An authentic registration dipole from sub-pixel pointing jitter exhibits a paired
    // opposite-sign trough immediately adjacent to the peak (|dx| <= 1, |dy| <= 1).
    let hasDipole = false;
    const centerSign = Math.sign(diff[idx]);
    let oppositeSignAdjacentMax = 0;
    let oppositeSignNearbyMax = 0;

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nVal = diff[ny * width + nx];
          if (Number.isFinite(nVal) && Math.sign(nVal) === -centerSign) {
            const absN = Math.abs(nVal);
            const dist = Math.hypot(dx, dy);
            if (dist <= 1.5) {
              if (absN > oppositeSignAdjacentMax) oppositeSignAdjacentMax = absN;
            } else {
              if (absN > oppositeSignNearbyMax) oppositeSignNearbyMax = absN;
            }
          }
        }
      }
    }

    const minDipoleLobe = noiseSigma > 0 ? Math.max(0.35 * peakVal, 3.0 * noiseSigma) : 0.35 * peakVal;
    const minNearbyDipole = noiseSigma > 0 ? Math.max(0.50 * peakVal, 3.5 * noiseSigma) : 0.50 * peakVal;

    if ((oppositeSignAdjacentMax >= minDipoleLobe || oppositeSignNearbyMax >= minNearbyDipole) && peakVal > 0) {
      hasDipole = true;
      morphology = 'dipole';
      flags.push('REGISTRATION_OR_PSF_DIPOLE');
      penalty += 0.7;
    }

    const artifactScore = Math.min(1.0, penalty);

    let whyFlagged: string | undefined;
    if (flags.length > 0) {
      const reasons: Record<string, string> = {
        EDGE_PROXIMITY: 'Candidate is within 4 pixels of the detector frame boundary.',
        TRANSIENT_OR_CR: 'SPHEREx Level 2 quality flag: transient disruption or cosmic ray hit (bit 0x1).',
        SATURATION: 'Pixel exceeded full well capacity (saturated readout, bit 0x2). Precludes linear photometry.',
        NONLINEAR_SUR_RESPONSE: 'Sample-Up-the-Ramp slope fitting uncertainty flag (bit 0x4).',
        STATISTICAL_OUTLIER: 'Sigma-clipping statistical outlier detected by pipeline (bit 0x80000).',
        COSMIC_RAY_SPIKE: 'Flux is concentrated in an isolated single-pixel spike without astronomical PSF wings.',
        REGISTRATION_OR_PSF_DIPOLE: 'Symmetric positive/negative residual dipole indicating astrometric sub-pixel pointing jitter.',
        LOW_APERTURE_SIGNIFICANCE: 'High single-pixel difference is not confirmed by integrated circular aperture photometry (S/N < 3.0σ).',
      };
      whyFlagged = flags.map((f) => reasons[f] || f).join(' ');
    }

    return {
      artifactScore,
      flags,
      whyFlagged,
      fwhm,
      morphology,
    };
  }

  /**
   * Synthesize evidence summary based on actual computed data and candidate outcomes
   */
  public static evaluateEvidence(
    candidates: CandidateDetection[],
    compatibility: {
      isCompatible: boolean;
      reason?: string;
      timeBaselineDays: number;
      wavelengthDiffUm: number;
      timeBaselineType?: 'SAME_EXPOSURE' | 'INTRA_VISIT_EXPOSURES' | 'INDEPENDENT_VISIT' | 'SURVEY_EPOCH';
      timeBaselineHuman?: string;
      integrationDuration1Sec?: number;
      integrationDuration2Sec?: number;
      startToStartCadenceSec?: number;
      interExposureGapSec?: number;
    },
    obs1: SPHERExObservation,
    obs2: SPHERExObservation,
    noiseSigma: number
  ): EvidenceSummary {
    if (!compatibility.isCompatible) {
      return {
        classification: 'INSUFFICIENT DATA',
        maxSignificance: 0,
        candidateCount: 0,
        timeBaselineDays: compatibility.timeBaselineDays,
        integrationDuration1Sec: compatibility.integrationDuration1Sec,
        integrationDuration2Sec: compatibility.integrationDuration2Sec,
        startToStartCadenceSec: compatibility.startToStartCadenceSec,
        interExposureGapSec: compatibility.interExposureGapSec,
        summaryProse: 'Quantitative comparison between these observations cannot be scientifically justified.',
        statisticalJustification: compatibility.reason ?? 'Incompatible observation parameters.',
        whatWeKnow: [
          `Exposure 1 observed at MJD ${obs1.t_min.toFixed(6)}${obs1.date_obs ? ` (${obs1.date_obs})` : ''}.`,
          `Exposure 2 observed at MJD ${obs2.t_min.toFixed(6)}${obs2.date_obs ? ` (${obs2.date_obs})` : ''}.`,
          `Wavelength difference is ${compatibility.wavelengthDiffUm.toFixed(2)} µm.`,
        ],
        whatWeDontKnow: [
          'Intrinsic temporal variability cannot be disentangled from the instrumental color slope.',
        ],
      };
    }

    const movingCandidates = candidates.filter((c) => c.status === 'Moving object candidate' || c.motion?.isMoving);
    const cleanCandidates = candidates.filter(
      (c) => (c.status === 'Candidate' || c.status === 'Moving object candidate') && c.artifactScore < 0.4
    );
    const artifactCandidates = candidates.filter((c) => c.artifactScore >= 0.5);

    let classification: InvestigationClassification = 'NO SIGNIFICANT CHANGE DETECTED';
    let summaryProse = 'No statistically significant flux change was detected above the 3.5σ observational noise threshold.';
    let statisticalJustification = `The difference image is consistent with Gaussian noise (σ_diff = ${noiseSigma.toFixed(4)}). No point sources exceeded the detection threshold without artifact disqualification.`;

    const baselineText =
      compatibility.timeBaselineHuman ||
      (compatibility.timeBaselineDays < 0.04167
        ? `${(compatibility.timeBaselineDays * 1440).toFixed(2)} minutes start-to-start cadence (intra-orbit scan)`
        : `${compatibility.timeBaselineDays.toFixed(1)} days start-to-start cadence`);

    if (movingCandidates.length > 0) {
      const topMove = movingCandidates[0];
      classification = 'SIGNIFICANT CHANGE DETECTED';
      const speed = topMove.motion?.speedArcsecPerDay ? `${topMove.motion.speedArcsecPerDay.toFixed(2)}"/day` : 'measurable velocity';
      const sep = topMove.motion?.separationArcsec ? `${topMove.motion.separationArcsec.toFixed(1)}"` : 'significant';
      summaryProse = `Moving object candidate detected with angular displacement of ${sep} across a ${baselineText} (speed ~${speed}).`;
      statisticalJustification = `Complementary Exposure 1 / Exposure 2 difference dipole exhibits spatially displaced point-like morphology consistent with a candidate moving source (PA: ${topMove.motion?.positionAngleDeg?.toFixed(1) ?? 'N/A'}°).`;
    } else if (cleanCandidates.length > 0) {
      const top = cleanCandidates[0];
      if (Math.abs(top.peakSignificance) >= 4.0) {
        classification = 'SIGNIFICANT CHANGE DETECTED';
        summaryProse = `Statistically significant flux residual detected with peak S/N of ${Math.abs(top.peakSignificance).toFixed(1)}σ across a ${baselineText}.`;
        statisticalJustification = `Top candidate ${top.id} shows residual amplitude ΔF = ${top.deltaFlux.toFixed(3)} ± ${top.deltaFluxUncertainty.toFixed(3)} MJy/sr (S/N = ${top.peakSignificance.toFixed(1)}σ, heuristic artifact index = ${top.artifactScore.toFixed(2)}/1.00).`;
      } else {
        classification = 'POSSIBLE CHANGE — NEEDS REVIEW';
        summaryProse = `Marginal flux residual detected at S/N = ${top.peakSignificance.toFixed(1)}σ. Additional epochs are required to verify authenticity.`;
        statisticalJustification = `Detection statistic is between 3.2σ and 4.0σ, which may represent either faint variability or stochastic noise excursion.`;
      }
    } else if (artifactCandidates.length > 0) {
      const topArt = artifactCandidates[0];
      const hasRealArtifact = topArt.artifactFlags.some(
        (f) =>
          f === 'SATURATION' ||
          f === 'TRANSIENT_OR_CR' ||
          f === 'STATISTICAL_OUTLIER' ||
          f === 'NONLINEAR_SUR_RESPONSE'
      );

      if (hasRealArtifact) {
        classification = 'POSSIBLE ARTIFACT';
        summaryProse = `Candidate signals were detected but rejected due to detector saturation, cosmic ray hits, or quality mask exclusions.`;
        statisticalJustification = `Detected peak exhibited severe instrumental flags (${topArt.artifactFlags.join(', ')}).`;
      } else {
        // Pure dipole/astrometric pointing jitter with stable aperture flux
        classification = 'NO SIGNIFICANT CHANGE DETECTED';
        summaryProse = `Sub-pixel pointing jitter residuals detected, but net aperture flux is photometrically stable within noise across a ${baselineText}.`;
        statisticalJustification = `Residual dipole is consistent with sub-pixel pointing jitter. Net aperture change ΔF = ${topArt.deltaFlux.toFixed(3)} ± ${topArt.deltaFluxUncertainty.toFixed(3)} MJy/sr is consistent with steady state.`;
      }
    }

    const whatWeKnow = [
      `Compared SPHEREx exposure ${obs1.obs_id} against ${obs2.obs_id}.`,
      `Start-to-start cadence (ΔDATE-OBS): ${
        compatibility.startToStartCadenceSec !== undefined
          ? `${compatibility.startToStartCadenceSec.toFixed(3)} s (${(compatibility.startToStartCadenceSec / 60).toFixed(5)} min)`
          : baselineText
      }.`,
    ];

    if (
      compatibility.integrationDuration1Sec !== undefined &&
      compatibility.integrationDuration2Sec !== undefined
    ) {
      whatWeKnow.push(
        `Integration durations (DATE-END - DATE-OBS): Exp 1 = ${compatibility.integrationDuration1Sec.toFixed(3)} s, Exp 2 = ${compatibility.integrationDuration2Sec.toFixed(3)} s.`
      );
    }

    if (compatibility.interExposureGapSec !== undefined) {
      whatWeKnow.push(
        `Inter-exposure endpoint gap (next DATE-OBS - prev DATE-END): ${compatibility.interExposureGapSec.toFixed(3)} s.`
      );
    }

    whatWeKnow.push(`Difference image noise floor: σ_diff = ${noiseSigma.toFixed(4)} MJy/sr.`);

    if (movingCandidates.length > 0) {
      const topMove = movingCandidates[0];
      whatWeKnow.push(
        `Detected moving candidate with apparent speed ~${topMove.motion?.speedArcsecPerDay?.toFixed(2)} arcsec/day (proper motion ~${topMove.motion?.properMotionMasYr?.toFixed(0)} mas/yr).`
      );
    } else if (cleanCandidates.length > 0) {
      const top = cleanCandidates[0];
      whatWeKnow.push(`Detected candidate at RA: ${top.ra.toFixed(5)}°, Dec: ${top.dec.toFixed(5)}° with S/N = ${top.peakSignificance}σ.`);
    }

    const whatWeDontKnow = [
      'Single-difference pair cannot distinguish between a one-off transient event and a periodic variable without additional cadence epochs.',
      'Astrometric precision is limited by the ~6.15 arcsecond SPHEREx native pixel scale.',
    ];

    if (compatibility.timeBaselineType === 'INTRA_VISIT_EXPOSURES') {
      whatWeDontKnow.unshift(
        'Both exposures belong to the same continuous flight slew/visit (~2.15 min per step); this intra-visit comparison does not constitute a multi-month survey baseline.'
      );
    }

    return {
      classification,
      maxSignificance: candidates.length > 0 ? candidates[0].peakSignificance : 0,
      candidateCount: cleanCandidates.length,
      timeBaselineDays: compatibility.timeBaselineDays,
      integrationDuration1Sec: compatibility.integrationDuration1Sec,
      integrationDuration2Sec: compatibility.integrationDuration2Sec,
      startToStartCadenceSec: compatibility.startToStartCadenceSec,
      interExposureGapSec: compatibility.interExposureGapSec,
      summaryProse,
      statisticalJustification,
      whatWeKnow,
      whatWeDontKnow,
    };
  }
}
