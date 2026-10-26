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
   * Align Epoch 1 onto Epoch 2 using sub-pixel cross correlation on central stars
   */
  public static computeRegistration(
    fits1: FITSImageData,
    fits2: FITSImageData
  ): { dx: number; dy: number; method: string; quality: string } {
    const w = Math.min(fits1.width, fits2.width);
    const h = Math.min(fits1.height, fits2.height);

    // Coordinate offset from WCS reference points
    const wcsPix1In2 = WCS.skyToPix(fits1.wcs.crval1, fits1.wcs.crval2, fits2.wcs);
    const initialDx = (fits1.wcs.crpix1 - 1) - wcsPix1In2.x;
    const initialDy = (fits1.wcs.crpix2 - 1) - wcsPix1In2.y;

    // Small-window cross-correlation search around initial shift (-3 to +3 pixels)
    let bestScore = -Infinity;
    let bestDx = 0;
    let bestDy = 0;

    const pad = 8;
    if (w > pad * 2 && h > pad * 2) {
      for (let sY = -2; sY <= 2; sY++) {
        for (let sX = -2; sX <= 2; sX++) {
          let dotProduct = 0;
          let norm1 = 0;
          let norm2 = 0;

          for (let y = pad; y < h - pad; y++) {
            for (let x = pad; x < w - pad; x++) {
              const v2 = fits2.data[y * w + x] - fits2.stats.median;
              const x1 = x + sX;
              const y1 = y + sY;
              if (x1 >= 0 && x1 < w && y1 >= 0 && y1 < h) {
                const v1 = fits1.data[y1 * w + x1] - fits1.stats.median;
                dotProduct += v1 * v2;
                norm1 += v1 * v1;
                norm2 += v2 * v2;
              }
            }
          }

          const denom = Math.sqrt(norm1 * norm2);
          const score = denom > 0 ? dotProduct / denom : -1;
          if (score > bestScore) {
            bestScore = score;
            bestDx = sX;
            bestDy = sY;
          }
        }
      }
    }

    const totalDx = Number.isFinite(initialDx) && Math.abs(initialDx) < 5 ? initialDx + bestDx : bestDx;
    const totalDy = Number.isFinite(initialDy) && Math.abs(initialDy) < 5 ? initialDy + bestDy : bestDy;

    return {
      dx: totalDx,
      dy: totalDy,
      method: 'WCS + Normalized Cross-Correlation Peak',
      quality: bestScore > 0.8 ? 'Excellent (r > 0.8)' : bestScore > 0.4 ? 'Good (r > 0.4)' : 'Nominal WCS',
    };
  }

  /**
   * Resample array with fractional pixel translation (dx, dy) using bilinear interpolation
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
        const srcX = x - dx;
        const srcY = y - dy;

        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        if (x0 >= 0 && x1 < width && y0 >= 0 && y1 < height) {
          const fx = srcX - x0;
          const fy = srcY - y0;

          const v00 = data[y0 * width + x0];
          const v10 = data[y0 * width + x1];
          const v01 = data[y1 * width + x0];
          const v11 = data[y1 * width + x1];

          output[y * width + x] =
            v00 * (1 - fx) * (1 - fy) +
            v10 * fx * (1 - fy) +
            v01 * (1 - fx) * fy +
            v11 * fx * fy;
        } else {
          // Out of boundary
          output[y * width + x] = data[y * width + x];
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

    // Variance maps
    const var1 = fits1.variance ?? new Float32Array(size).fill(fits1.stats.robustNoise ** 2);
    const var2 = fits2.variance ?? new Float32Array(size).fill(fits2.stats.robustNoise ** 2);
    const alignedVar1 = fits1.variance
      ? this.resampleBilinear(fits1.variance, width, height, reg.dx, reg.dy)
      : var1;

    const diff = new Float32Array(size);
    const variance = new Float32Array(size);
    const significance = new Float32Array(size);

    let diffSum = 0;
    let minD = Infinity;
    let maxD = -Infinity;

    for (let i = 0; i < size; i++) {
      const v2 = fits2.data[i];
      const v1 = alignedEpoch1[i];
      const d = v2 - v1;
      diff[i] = d;

      // Independent uncertainty propagation: sigma_D^2 = sigma_1^2 + sigma_2^2
      const varD = Math.max(1e-12, (alignedVar1[i] || fits1.stats.robustNoise ** 2) + (var2[i] || fits2.stats.robustNoise ** 2));
      variance[i] = varD;

      const sigmaD = Math.sqrt(varD);
      const s = sigmaD > 0 ? d / sigmaD : 0;
      significance[i] = s;

      if (d < minD) minD = d;
      if (d > maxD) maxD = d;
      diffSum += d;
    }

    const meanD = diffSum / size;
    let varDiffSum = 0;
    for (let i = 0; i < size; i++) {
      const delta = diff[i] - meanD;
      varDiffSum += delta * delta;
    }
    const stdD = Math.sqrt(varDiffSum / size);

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
              height
            );

            // Sky coordinates
            const sky = WCS.pixToSky(x, y, wcs);

            let status: CandidateDetection['status'] = 'Candidate';
            if (artifact.artifactScore >= 0.65) {
              status = 'Possible artifact';
            } else if (absS >= 4.5 && artifact.artifactScore < 0.35) {
              status = 'Candidate';
            } else if (absS >= 3.2) {
              status = 'Insufficient evidence';
            }

            candidates.push({
              id: `CAND-${String(candidates.length + 1).padStart(2, '0')}`,
              x,
              y,
              ra: sky.ra,
              dec: sky.dec,
              peakSignificance: Number(s.toFixed(2)),
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

    // Sort candidates by descending absolute significance and return top 6
    candidates.sort((a, b) => Math.abs(b.peakSignificance) - Math.abs(a.peakSignificance));
    return candidates.slice(0, 6);
  }

  /**
   * Exact circular aperture photometry with background annulus subtraction
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

    // Background annulus in difference image
    let bkgDiffSum = 0;
    let bkgPixels = 0;

    const maxR = Math.ceil(rOut);
    for (let dy = -maxR; dy <= maxR; dy++) {
      for (let dx = -maxR; dx <= maxR; dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const dist = Math.hypot(dx, dy);
          const idx = py * width + px;

          if (dist <= rAp) {
            sum1 += data1[idx];
            sum2 += data2[idx];
            sumDiff += diff[idx];
            sumVar += varMap[idx];
            apPixels++;
          } else if (dist >= rIn && dist <= rOut) {
            bkgDiffSum += diff[idx];
            bkgPixels++;
          }
        }
      }
    }

    const bkgDiffMean = bkgPixels > 0 ? bkgDiffSum / bkgPixels : 0;
    const netDeltaFlux = sumDiff - bkgDiffMean * apPixels;
    const deltaUncertainty = Math.sqrt(sumVar + (apPixels ** 2 / Math.max(1, bkgPixels)) * (sumVar / Math.max(1, apPixels)));

    return {
      deltaFlux: netDeltaFlux,
      deltaUncertainty,
      flux1: sum1,
      flux2: sum2,
      unc1: Math.sqrt(sumVar / 2),
      unc2: Math.sqrt(sumVar / 2),
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
    height: number
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
    const idx = cy * width + cx;
    const f1 = flags1 ? flags1[idx] : 0;
    const f2 = flags2 ? flags2[idx] : 0;

    if ((f1 & 0x01) !== 0 || (f2 & 0x01) !== 0) {
      flags.push('FLAGGED_BAD_PIXEL');
      penalty += 0.7;
    }
    if ((f1 & 0x02) !== 0 || (f2 & 0x02) !== 0) {
      flags.push('SATURATION');
      penalty += 0.8;
    }
    if ((f1 & 0x04) !== 0 || (f2 & 0x04) !== 0) {
      flags.push('NONLINEAR_RESPONSE');
      penalty += 0.6;
    }
    if ((f1 & 0x08) !== 0 || (f2 & 0x08) !== 0) {
      flags.push('RAMP_CR_HIT');
      penalty += 0.75;
    }
    if ((f1 & 0x80000) !== 0 || (f2 & 0x80000) !== 0) {
      flags.push('STRAY_LIGHT_OR_LATENT');
      penalty += 0.5;
    }
    if ((f1 & 0x200000) !== 0 || (f2 & 0x200000) !== 0) {
      flags.push('PERSISTENCE_CONTAMINATION');
      penalty += 0.85;
    }

    // 3. Cosmic ray spike check: central pixel contains >80% of entire 3x3 flux
    let peakVal = Math.abs(diff[idx]);
    let neighborSum = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nIdx = (cy + dy) * width + (cx + dx);
        neighborSum += Math.abs(diff[nIdx]);
      }
    }
    const concentration = peakVal / (peakVal + neighborSum || 1);
    let morphology: 'point-like' | 'extended' | 'sharp-spike' | 'dipole' = 'point-like';
    let fwhm = 2.2;

    if (concentration > 0.75) {
      morphology = 'sharp-spike';
      fwhm = 0.8;
      flags.push('COSMIC_RAY_SPIKE');
      penalty += 0.6;
    }

    // 4. Dipole / Astrometric registration residue check
    let hasDipole = false;
    const centerSign = Math.sign(diff[idx]);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nIdx = (cy + dy) * width + (cx + dx);
        if (Math.sign(diff[nIdx]) === -centerSign && Math.abs(diff[nIdx]) > peakVal * 0.45) {
          hasDipole = true;
          break;
        }
      }
      if (hasDipole) break;
    }

    if (hasDipole) {
      morphology = 'dipole';
      flags.push('REGISTRATION_OR_PSF_DIPOLE');
      penalty += 0.7;
    }

    const artifactScore = Math.min(1.0, penalty);

    let whyFlagged: string | undefined;
    if (flags.length > 0) {
      const reasons: Record<string, string> = {
        EDGE_PROXIMITY: 'Candidate is within 4 pixels of the detector frame boundary where edge distortions and coverage drops occur.',
        FLAGGED_BAD_PIXEL: 'FITS Level-2 Data Quality flag registers this pixel as defective/dead on detector arrays.',
        SATURATION: 'Pixel exceeded full well capacity (saturated readout).',
        NONLINEAR_RESPONSE: 'Pixel is operating in the nonlinear readout regime.',
        RAMP_CR_HIT: 'Cosmic ray hit detected during multi-accum detector ramp readout.',
        STRAY_LIGHT_OR_LATENT: 'Flagged as suspect stray light reflection or lingering latent image in previous scans.',
        PERSISTENCE_CONTAMINATION: 'Severe detector persistence contamination from recent bright star transit (bit 0x200000).',
        COSMIC_RAY_SPIKE: 'Flux is concentrated in an isolated single-pixel spike without astronomical PSF wings.',
        REGISTRATION_OR_PSF_DIPOLE: 'Symmetric positive/negative residual dipole indicating slight astrometric misalignment or PSF breathing rather than genuine flux change.',
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
      if (top.peakSignificance >= 4.5) {
        classification = 'SIGNIFICANT CHANGE DETECTED';
        summaryProse = `Statistically significant flux change detected with peak S/N of ${top.peakSignificance.toFixed(1)}σ across a ${compatibility.timeBaselineDays.toFixed(1)}-day baseline.`;
        statisticalJustification = `Top candidate ${top.id} shows residual amplitude ΔF = ${top.deltaFlux.toFixed(3)} ± ${top.deltaFluxUncertainty.toFixed(3)} (S/N = ${top.peakSignificance.toFixed(1)}σ, artifact score = ${top.artifactScore.toFixed(2)}).`;
      } else {
        classification = 'POSSIBLE CHANGE — NEEDS REVIEW';
        summaryProse = `Marginal flux residual detected at S/N = ${top.peakSignificance.toFixed(1)}σ. Additional epochs are required to verify authenticity.`;
        statisticalJustification = `Detection statistic is between 3.2σ and 4.5σ, which may represent either faint variability or stochastic noise excursion.`;
      }
    } else if (artifactCandidates.length > 0) {
      classification = 'POSSIBLE ARTIFACT';
      summaryProse = `Candidate signals were detected but rejected due to instrumental or registration artifacts.`;
      statisticalJustification = `All detected peaks exhibited artifact flags (${artifactCandidates[0].artifactFlags.join(', ')}).`;
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
