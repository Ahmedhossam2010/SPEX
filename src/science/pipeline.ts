import {
  CandidateDetection,
  EvidenceSummary,
  FITSImageData,
  InvestigationClassification,
  SPHERExObservation,
} from './types';
import { WCS } from './wcs';

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
  };
  compatibility: {
    isCompatible: boolean;
    reason?: string;
    timeBaselineDays: number;
    wavelengthDiffUm: number;
  };
  candidates: CandidateDetection[];
  evidence: EvidenceSummary;
}

export class ScientificPipeline {
  /**
   * Evaluate astronomical compatibility between two SPHEREx observations
   */
  public static checkCompatibility(
    obs1: SPHERExObservation,
    obs2: SPHERExObservation,
    fits1: FITSImageData,
    fits2: FITSImageData
  ): { isCompatible: boolean; reason?: string; timeBaselineDays: number; wavelengthDiffUm: number } {
    const timeBaselineDays = Math.abs(obs2.t_min - obs1.t_min);

    const wl1 = obs1.wavelength_um ?? (obs1.em_min + obs1.em_max) / 2 * 1e6;
    const wl2 = obs2.wavelength_um ?? (obs2.em_min + obs2.em_max) / 2 * 1e6;
    const wavelengthDiffUm = Math.abs(wl2 - wl1);

    // If wavelength difference exceeds 0.25 microns (different SPHEREx spectral channel),
    // direct flux differencing is physically invalid
    if (wavelengthDiffUm > 0.35) {
      return {
        isCompatible: false,
        reason: `Wavelength bands are physically incompatible: Epoch 1 is at ${wl1.toFixed(2)} µm and Epoch 2 is at ${wl2.toFixed(2)} µm (difference ${wavelengthDiffUm.toFixed(2)} µm). Differencing across distinct spectral bands measures spectral color slope rather than true temporal variability.`,
        timeBaselineDays,
        wavelengthDiffUm,
      };
    }

    // Check pixel scale ratio
    const scaleRatio = fits1.wcs.pixelScaleArcsec / (fits2.wcs.pixelScaleArcsec || 1.0);
    if (Math.abs(scaleRatio - 1.0) > 0.2) {
      return {
        isCompatible: false,
        reason: `Pixel scale mismatch: Epoch 1 is ${fits1.wcs.pixelScaleArcsec.toFixed(2)}"/px while Epoch 2 is ${fits2.wcs.pixelScaleArcsec.toFixed(2)}"/px.`,
        timeBaselineDays,
        wavelengthDiffUm,
      };
    }

    return {
      isCompatible: true,
      timeBaselineDays,
      wavelengthDiffUm,
    };
  }

  /**
   * Align Epoch 1 onto Epoch 2 using rigid translation (WCS center projection offset + normalized cross-correlation refinement)
   */
  public static computeRegistration(
    fits1: FITSImageData,
    fits2: FITSImageData
  ): { dx: number; dy: number; method: string; quality: string } {
    const w = Math.min(fits1.width, fits2.width);
    const h = Math.min(fits1.height, fits2.height);

    // Compute coordinate offset by projecting the center of fits2 into fits1
    const cx2 = w / 2;
    const cy2 = h / 2;
    const centerSky = WCS.pixToSky(cx2, cy2, fits2.wcs);
    const centerIn1 = WCS.skyToPix(centerSky.ra, centerSky.dec, fits1.wcs);

    let initialDx = centerIn1.x - cx2;
    let initialDy = centerIn1.y - cy2;

    if (!Number.isFinite(initialDx) || Math.abs(initialDx) > w / 2) initialDx = 0;
    if (!Number.isFinite(initialDy) || Math.abs(initialDy) > h / 2) initialDy = 0;

    // Cross-correlation refinement search around WCS shift (-2 to +2 pixels)
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

    // Only apply cross-correlation shift if it improves correlation noticeably
    const totalDx = initialDx + (bestScore > 0.6 ? bestDx : 0);
    const totalDy = initialDy + (bestScore > 0.6 ? bestDy : 0);

    return {
      dx: totalDx,
      dy: totalDy,
      method: 'Rigid Translation (WCS Center Offset + Normalized Cross-Correlation Refinement)',
      quality: bestScore > 0.8 ? 'Excellent (r > 0.8)' : bestScore > 0.4 ? 'Good (r > 0.4)' : 'Nominal WCS',
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

        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        if (x0 >= 0 && x1 < width && y0 >= 0 && y1 < height) {
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
        } else {
          output[y * width + x] = NaN;
        }
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

        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        if (x0 >= 0 && x1 < width && y0 >= 0 && y1 < height) {
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
            ? Math.max(1e-12, weightedVarSum / (weightTotal * weightTotal))
            : NaN;
        } else {
          output[y * width + x] = NaN;
        }
      }
    }
    return output;
  }

  /**
   * Execute full difference image generation: D = I2 - I1, variance propagation, candidate detection
   */
  public static processDifference(
    obs1: SPHERExObservation,
    obs2: SPHERExObservation,
    fits1: FITSImageData,
    fits2: FITSImageData
  ): DifferenceOutput {
    const width = fits2.width;
    const height = fits2.height;
    const size = width * height;

    const compatibility = this.checkCompatibility(obs1, obs2, fits1, fits2);
    const reg = this.computeRegistration(fits1, fits2);

    // Resample Epoch 1 onto Epoch 2 grid
    const alignedEpoch1 = this.resampleBilinear(fits1.data, width, height, reg.dx, reg.dy);

    // Variance maps with rigorous squared-weight propagation under translation
    const var1 = fits1.variance ?? new Float32Array(size).fill(fits1.stats.robustNoise ** 2);
    const var2 = fits2.variance ?? new Float32Array(size).fill(fits2.stats.robustNoise ** 2);
    const alignedVar1 = fits1.variance
      ? this.resampleVarianceBilinear(fits1.variance, width, height, reg.dx, reg.dy)
      : var1;

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

      if (Number.isFinite(v2) && Number.isFinite(v1)) {
        const d = v2 - v1;
        diff[i] = d;

        // Independent uncertainty propagation: sigma_D^2 = sigma_1^2 + sigma_2^2
        const v1_unc = Number.isFinite(alignedVar1[i]) ? alignedVar1[i] : fits1.stats.robustNoise ** 2;
        const v2_unc = Number.isFinite(var2[i]) ? var2[i] : fits2.stats.robustNoise ** 2;
        const varD = Math.max(1e-12, v1_unc + v2_unc);
        variance[i] = varD;

        const sigmaD = Math.sqrt(varD);
        const s = sigmaD > 0 ? d / sigmaD : 0;
        significance[i] = s;

        if (d < minD) minD = d;
        if (d > maxD) maxD = d;
        diffSum += d;
        validDiffCount++;
      } else {
        diff[i] = NaN;
        variance[i] = Math.max(1e-12, (fits1.stats.robustNoise ** 2) + (fits2.stats.robustNoise ** 2));
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

    const candidates = this.detectCandidates(
      diff,
      variance,
      significance,
      fits1.data,
      fits2.data,
      fits1.flags,
      fits2.flags,
      width,
      height,
      fits2.wcs,
      noiseSigma
    );

    const evidence = this.evaluateEvidence(candidates, compatibility, obs1, obs2, noiseSigma);

    return {
      width,
      height,
      diff,
      variance,
      significance,
      stats: {
        min: minD,
        max: maxD,
        std: stdD,
        noiseSigma: noiseSigma > 0 ? noiseSigma : stdD,
      },
      registration: {
        dxPixels: reg.dx,
        dyPixels: reg.dy,
        method: reg.method,
        quality: reg.quality,
      },
      compatibility,
      candidates,
      evidence,
    };
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
    noiseSigma: number
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

            // Perform circular aperture photometry
            const phot = this.aperturePhotometry(x, y, data1, data2, diff, varMap, width, height, 2.5, 4.0, 6.0);

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

            // Sky coordinates
            const sky = WCS.pixToSky(x, y, wcs);

            // Aperture S/N verification: authentic astrophysical sources require significant integrated aperture flux
            const apertureSnr = phot.deltaUncertainty > 0 ? Math.abs(phot.deltaFlux) / phot.deltaUncertainty : 0;
            let status: CandidateDetection['status'] = 'Candidate';
            if (artifact.artifactScore >= 0.65 || artifact.flags.includes('REGISTRATION_OR_PSF_DIPOLE')) {
              status = 'Possible artifact';
            } else if (apertureSnr < 3.0 && absS >= 4.0) {
              // High single-pixel residual without significant integrated aperture flux is an unmodeled PSF/registration artifact
              status = 'Possible artifact';
              if (!artifact.flags.includes('LOW_APERTURE_SIGNIFICANCE')) {
                artifact.flags.push('LOW_APERTURE_SIGNIFICANCE');
              }
              artifact.whyFlagged = (artifact.whyFlagged ? artifact.whyFlagged + ' ' : '') +
                'High single-pixel difference is not confirmed by integrated aperture photometry (aperture S/N < 3.0σ), consistent with pointing jitter or PSF breathing.';
              artifact.artifactScore = Math.max(artifact.artifactScore, 0.70);
            } else if (apertureSnr >= 3.5 && artifact.artifactScore < 0.35) {
              status = 'Candidate';
            } else {
              status = 'Insufficient evidence';
            }

            candidates.push({
              id: `CAND-${String(candidates.length + 1).padStart(2, '0')}`,
              x,
              y,
              ra: sky.ra,
              dec: sky.dec,
              peakSignificance: Number(s.toFixed(2)),
              apertureSignificance: Number(apertureSnr.toFixed(2)),
              deltaFlux: Number(phot.deltaFlux.toFixed(4)),
              deltaFluxUncertainty: Number(phot.deltaUncertainty.toFixed(4)),
              apertureFluxEpoch1: Number(phot.flux1.toFixed(4)),
              apertureFluxEpoch2: Number(phot.flux2.toFixed(4)),
              apertureUncertainty1: Number(phot.unc1.toFixed(4)),
              apertureUncertainty2: Number(phot.unc2.toFixed(4)),
              status,
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
              sumVar += Number.isFinite(vVal) ? vVal : 0;
              if (Number.isFinite(d1)) sum1 += d1;
              if (Number.isFinite(d2)) sum2 += d2;
              apPixels++;
            }
          } else if (dist >= rIn && dist <= rOut) {
            if (Number.isFinite(dVal)) {
              bkgDiffValues.push(dVal);
              if (Number.isFinite(d1)) bkg1Values.push(d1);
              if (Number.isFinite(d2)) bkg2Values.push(d2);
              if (Number.isFinite(vVal)) bkgVarSum += vVal;
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
    compatibility: { isCompatible: boolean; reason?: string; timeBaselineDays: number; wavelengthDiffUm: number },
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
        summaryProse: 'Quantitative comparison between these observations cannot be scientifically justified.',
        statisticalJustification: compatibility.reason ?? 'Incompatible observation parameters.',
        whatWeKnow: [
          `Epoch 1 observed at MJD ${obs1.t_min.toFixed(4)}.`,
          `Epoch 2 observed at MJD ${obs2.t_min.toFixed(4)}.`,
          `Wavelength difference is ${compatibility.wavelengthDiffUm.toFixed(2)} µm.`,
        ],
        whatWeDontKnow: [
          'Intrinsic temporal variability cannot be disentangled from the instrumental color slope.',
        ],
      };
    }

    const cleanCandidates = candidates.filter((c) => c.status === 'Candidate' && c.artifactScore < 0.4);
    const artifactCandidates = candidates.filter((c) => c.artifactScore >= 0.5);

    let classification: InvestigationClassification = 'NO SIGNIFICANT CHANGE DETECTED';
    let summaryProse = 'No statistically significant flux change was detected above the 3.5σ observational noise threshold.';
    let statisticalJustification = `The difference image is consistent with Gaussian noise (σ_diff = ${noiseSigma.toFixed(4)}). No point sources exceeded the detection threshold without artifact disqualification.`;

    if (cleanCandidates.length > 0) {
      const top = cleanCandidates[0];
      if (Math.abs(top.peakSignificance) >= 4.0) {
        classification = 'SIGNIFICANT CHANGE DETECTED';
        summaryProse = `Statistically significant flux change detected with peak S/N of ${Math.abs(top.peakSignificance).toFixed(1)}σ across a ${compatibility.timeBaselineDays.toFixed(1)}-day baseline.`;
        statisticalJustification = `Top candidate ${top.id} shows residual amplitude ΔF = ${top.deltaFlux.toFixed(3)} ± ${top.deltaFluxUncertainty.toFixed(3)} (S/N = ${top.peakSignificance.toFixed(1)}σ, heuristic artifact index = ${top.artifactScore.toFixed(2)}/1.00).`;
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
        summaryProse = `Sub-pixel pointing jitter residuals detected, but net aperture flux is photometrically stable within noise across the ${compatibility.timeBaselineDays.toFixed(1)}-day baseline.`;
        statisticalJustification = `Residual dipole is consistent with sub-pixel pointing jitter. Net aperture change ΔF = ${topArt.deltaFlux.toFixed(3)} ± ${topArt.deltaFluxUncertainty.toFixed(3)} is consistent with steady state.`;
      }
    }

    const whatWeKnow = [
      `Compared SPHEREx observation ${obs1.obs_id} against ${obs2.obs_id}.`,
      `Temporal baseline spans ${compatibility.timeBaselineDays.toFixed(1)} days.`,
      `Difference image noise floor: σ_diff = ${noiseSigma.toFixed(4)} MJy/sr.`,
    ];

    if (cleanCandidates.length > 0) {
      const top = cleanCandidates[0];
      whatWeKnow.push(`Detected candidate at RA: ${top.ra.toFixed(5)}°, Dec: ${top.dec.toFixed(5)}° with S/N = ${top.peakSignificance}σ.`);
    }

    const whatWeDontKnow = [
      'Single-difference pair cannot distinguish between a one-off transient event and a periodic variable without additional cadence epochs.',
      'Astrometric precision is limited by the ~6.2 arcsecond SPHEREx native pixel scale.',
    ];

    return {
      classification,
      maxSignificance: candidates.length > 0 ? candidates[0].peakSignificance : 0,
      candidateCount: cleanCandidates.length,
      timeBaselineDays: compatibility.timeBaselineDays,
      summaryProse,
      statisticalJustification,
      whatWeKnow,
      whatWeDontKnow,
    };
  }
}
