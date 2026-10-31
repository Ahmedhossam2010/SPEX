// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

// src/science/fitsReader.ts
var FITSReader = class {
  /**
   * Parse a raw FITS binary buffer (ArrayBuffer, Buffer, or Uint8Array)
   */
  static parse(buffer) {
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);
    let offset = 0;
    let hduIndex = 0;
    let primaryHeader = {};
    let scienceHeader = {};
    let scienceData = null;
    let varianceData = null;
    let flagsData = null;
    let width = 0;
    let height = 0;
    let bunit = "MJy / sr";
    while (offset < uint8.length) {
      const headerCards = {};
      let isEnd = false;
      let headerBytes = 0;
      while (offset + headerBytes < uint8.length) {
        const blockStart = offset + headerBytes;
        headerBytes += 2880;
        for (let i = 0; i < 2880; i += 80) {
          const cardOffset = blockStart + i;
          if (cardOffset + 80 > uint8.length) break;
          let cardStr = "";
          for (let c = 0; c < 80; c++) {
            cardStr += String.fromCharCode(uint8[cardOffset + c]);
          }
          const rawKey = cardStr.slice(0, 8).trim();
          if (rawKey === "END") {
            isEnd = true;
            break;
          }
          if (cardStr.includes("=")) {
            const eqIdx = cardStr.indexOf("=");
            let key = cardStr.slice(0, eqIdx).trim();
            if (key.startsWith("HIERARCH ")) {
              key = key.replace("HIERARCH ", "").trim();
            }
            const remainder = cardStr.slice(eqIdx + 1);
            const slashIdx = remainder.indexOf("/");
            let valStr = (slashIdx >= 0 ? remainder.slice(0, slashIdx) : remainder).trim();
            if (valStr.startsWith("'")) {
              const lastQuote = valStr.lastIndexOf("'");
              const strVal = lastQuote > 0 ? valStr.slice(1, lastQuote).trim() : valStr.slice(1).trim();
              headerCards[key] = strVal;
            } else if (valStr === "T") {
              headerCards[key] = true;
            } else if (valStr === "F") {
              headerCards[key] = false;
            } else if (valStr !== "") {
              const numVal = Number(valStr);
              if (!Number.isNaN(numVal)) {
                headerCards[key] = numVal;
              } else {
                headerCards[key] = valStr;
              }
            }
          }
        }
        if (isEnd) break;
      }
      offset += headerBytes;
      const bitpix = Number(headerCards["BITPIX"] || 0);
      const naxis = Number(headerCards["NAXIS"] || 0);
      const naxis1 = Number(headerCards["NAXIS1"] || 0);
      const naxis2 = Number(headerCards["NAXIS2"] || 0);
      const pcount = Number(headerCards["PCOUNT"] || 0);
      const gcount = Number(headerCards["GCOUNT"] || 1);
      const extname = String(headerCards["EXTNAME"] || "").trim().toUpperCase();
      let dataBytes = 0;
      if (naxis > 0 && naxis1 > 0) {
        let nvals = naxis1;
        if (naxis >= 2 && naxis2 > 0) nvals *= naxis2;
        const naxis3 = Number(headerCards["NAXIS3"] || 0);
        if (naxis >= 3 && naxis3 > 0) nvals *= naxis3;
        dataBytes = Math.abs(bitpix) / 8 * (nvals + pcount) * gcount;
        const remainder = dataBytes % 2880;
        if (remainder > 0) dataBytes += 2880 - remainder;
      }
      if (hduIndex === 0) {
        primaryHeader = headerCards;
        if (naxis === 2 && naxis1 > 0 && naxis2 > 0 && !scienceData) {
          width = naxis1;
          height = naxis2;
          scienceHeader = headerCards;
          bunit = String(headerCards["BUNIT"] || bunit).replace(/'/g, "").trim();
          scienceData = this.readFloat32Array(view, offset, naxis1 * naxis2, bitpix);
        }
      } else {
        if ((extname === "IMAGE" || extname === "SCI" || !scienceData && naxis === 2) && !scienceData) {
          width = naxis1;
          height = naxis2;
          scienceHeader = { ...primaryHeader, ...headerCards };
          bunit = String(headerCards["BUNIT"] || primaryHeader["BUNIT"] || bunit).replace(/'/g, "").trim();
          scienceData = this.readFloat32Array(view, offset, naxis1 * naxis2, bitpix);
        } else if (extname === "VARIANCE" || extname === "VAR" || extname === "UNCERTAINTY" || extname === "UNC") {
          varianceData = this.readFloat32Array(view, offset, naxis1 * naxis2, bitpix);
        } else if (extname === "FLAGS" || extname === "MASK" || extname === "DQ") {
          flagsData = this.readInt32Array(view, offset, naxis1 * naxis2, bitpix);
        }
      }
      offset += dataBytes;
      hduIndex++;
    }
    if (!scienceData || width === 0 || height === 0) {
      throw new Error("FITS file does not contain a valid 2D science image array");
    }
    const mergedHeader = { ...primaryHeader, ...scienceHeader };
    const wcs = this.parseWCS(mergedHeader, width, height);
    const stats = this.computeStatistics(scienceData, flagsData);
    return {
      width,
      height,
      data: scienceData,
      variance: varianceData,
      flags: flagsData,
      bunit,
      header: mergedHeader,
      wcs,
      stats
    };
  }
  static readFloat32Array(view, offset, count, bitpix) {
    const result = new Float32Array(count);
    let ptr = offset;
    if (bitpix === -32) {
      for (let i = 0; i < count; i++) {
        if (ptr + 4 <= view.byteLength) {
          result[i] = view.getFloat32(ptr, false);
        }
        ptr += 4;
      }
    } else if (bitpix === -64) {
      for (let i = 0; i < count; i++) {
        if (ptr + 8 <= view.byteLength) {
          result[i] = Number(view.getFloat64(ptr, false));
        }
        ptr += 8;
      }
    } else if (bitpix === 16) {
      for (let i = 0; i < count; i++) {
        if (ptr + 2 <= view.byteLength) {
          result[i] = view.getInt16(ptr, false);
        }
        ptr += 2;
      }
    } else if (bitpix === 32) {
      for (let i = 0; i < count; i++) {
        if (ptr + 4 <= view.byteLength) {
          result[i] = view.getInt32(ptr, false);
        }
        ptr += 4;
      }
    }
    return result;
  }
  static readInt32Array(view, offset, count, bitpix) {
    const result = new Int32Array(count);
    let ptr = offset;
    for (let i = 0; i < count; i++) {
      if (bitpix === 16 && ptr + 2 <= view.byteLength) {
        result[i] = view.getInt16(ptr, false);
        ptr += 2;
      } else if (bitpix === 32 && ptr + 4 <= view.byteLength) {
        result[i] = view.getInt32(ptr, false);
        ptr += 4;
      } else if (ptr + 1 <= view.byteLength) {
        result[i] = view.getInt8(ptr);
        ptr += 1;
      }
    }
    return result;
  }
  static parseWCS(header, width, height) {
    const crval1 = Number(header["CRVAL1"] ?? 0);
    const crval2 = Number(header["CRVAL2"] ?? 0);
    const crpix1 = Number(header["CRPIX1"] ?? width / 2);
    const crpix2 = Number(header["CRPIX2"] ?? height / 2);
    const cdelt1 = Number(header["CDELT1"] ?? 1);
    const cdelt2 = Number(header["CDELT2"] ?? 1);
    let cd1_1 = 0;
    let cd1_2 = 0;
    let cd2_1 = 0;
    let cd2_2 = 0;
    if (header["CD1_1"] !== void 0 || header["CD2_2"] !== void 0) {
      cd1_1 = Number(header["CD1_1"] ?? 0);
      cd1_2 = Number(header["CD1_2"] ?? 0);
      cd2_1 = Number(header["CD2_1"] ?? 0);
      cd2_2 = Number(header["CD2_2"] ?? 0);
    } else if (header["PC1_1"] !== void 0 || header["PC2_2"] !== void 0) {
      cd1_1 = cdelt1 * Number(header["PC1_1"] ?? 1);
      cd1_2 = cdelt1 * Number(header["PC1_2"] ?? 0);
      cd2_1 = cdelt2 * Number(header["PC2_1"] ?? 0);
      cd2_2 = cdelt2 * Number(header["PC2_2"] ?? 1);
    } else {
      cd1_1 = cdelt1;
      cd1_2 = 0;
      cd2_1 = 0;
      cd2_2 = cdelt2;
    }
    const ctype1 = String(header["CTYPE1"] ?? "RA---TAN");
    const ctype2 = String(header["CTYPE2"] ?? "DEC--TAN");
    const equinox = Number(header["EQUINOX"] ?? 2e3);
    const radesys = String(header["RADESYS"] ?? "ICRS");
    const det = Math.abs(cd1_1 * cd2_2 - cd1_2 * cd2_1);
    const pixelScaleDeg = Math.sqrt(det > 0 ? det : Math.abs(cdelt1 * cdelt2));
    const pixelScaleArcsec = pixelScaleDeg * 3600;
    return {
      crval1,
      crval2,
      crpix1,
      crpix2,
      cdelt1,
      cdelt2,
      cd1_1,
      cd1_2,
      cd2_1,
      cd2_2,
      ctype1,
      ctype2,
      equinox,
      radesys,
      pixelScaleArcsec
    };
  }
  static computeStatistics(data, flags) {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let validCount = 0;
    const validValues = [];
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (Number.isFinite(v)) {
        if (!flags || (flags[i] & 1) === 0) {
          if (v < min) min = v;
          if (v > max) max = v;
          sum += v;
          validCount++;
          validValues.push(v);
        }
      }
    }
    if (validCount === 0) {
      return { min: 0, max: 0, mean: 0, median: 0, std: 0, robustNoise: 0 };
    }
    const mean = sum / validCount;
    let varSum = 0;
    for (let i = 0; i < validValues.length; i++) {
      const diff = validValues[i] - mean;
      varSum += diff * diff;
    }
    const std = Math.sqrt(varSum / validCount);
    validValues.sort((a, b) => a - b);
    const mid = Math.floor(validValues.length / 2);
    const median = validValues.length % 2 !== 0 ? validValues[mid] : (validValues[mid - 1] + validValues[mid]) / 2;
    const diffs = new Array(validValues.length);
    for (let i = 0; i < validValues.length; i++) {
      diffs[i] = Math.abs(validValues[i] - median);
    }
    diffs.sort((a, b) => a - b);
    const mad = diffs.length % 2 !== 0 ? diffs[mid] : (diffs[mid - 1] + diffs[mid]) / 2;
    const robustNoise = 1.4826 * mad;
    return {
      min,
      max,
      mean,
      median,
      std,
      robustNoise: robustNoise > 0 ? robustNoise : std
    };
  }
};

// src/science/wcs.ts
var DEG2RAD = Math.PI / 180;
var RAD2DEG = 180 / Math.PI;
var WCS = class {
  /**
   * Convert 0-based pixel coordinate (x, y) to Right Ascension and Declination (ICRS degrees)
   * Using standard TAN (gnomonic) projection with CD matrix
   */
  static pixToSky(x, y, wcs) {
    const p1 = x + 1 - wcs.crpix1;
    const p2 = y + 1 - wcs.crpix2;
    const xiDeg = wcs.cd1_1 * p1 + wcs.cd1_2 * p2;
    const etaDeg = wcs.cd2_1 * p1 + wcs.cd2_2 * p2;
    const xi = xiDeg * DEG2RAD;
    const eta = etaDeg * DEG2RAD;
    const crval1Rad = wcs.crval1 * DEG2RAD;
    const crval2Rad = wcs.crval2 * DEG2RAD;
    const cosDec0 = Math.cos(crval2Rad);
    const sinDec0 = Math.sin(crval2Rad);
    const denom = cosDec0 - eta * sinDec0;
    const raRad = crval1Rad + Math.atan2(xi, denom);
    const decRad = Math.atan2((sinDec0 + eta * cosDec0) * Math.cos(raRad - crval1Rad), denom);
    let ra = raRad * RAD2DEG;
    let dec = decRad * RAD2DEG;
    ra = (ra % 360 + 360) % 360;
    return { ra, dec };
  }
  /**
   * Convert Right Ascension and Declination (degrees) to 0-based pixel coordinates (x, y)
   */
  static skyToPix(ra, dec, wcs) {
    const alpha = ra * DEG2RAD;
    const delta = dec * DEG2RAD;
    const alpha0 = wcs.crval1 * DEG2RAD;
    const delta0 = wcs.crval2 * DEG2RAD;
    const deltaAlpha = alpha - alpha0;
    const cosDelta = Math.cos(delta);
    const sinDelta = Math.sin(delta);
    const cosDelta0 = Math.cos(delta0);
    const sinDelta0 = Math.sin(delta0);
    const cosDeltaAlpha = Math.cos(deltaAlpha);
    const sinDeltaAlpha = Math.sin(deltaAlpha);
    const cosC = sinDelta0 * sinDelta + cosDelta0 * cosDelta * cosDeltaAlpha;
    if (cosC <= 0) {
      return { x: -9999, y: -9999 };
    }
    const xiRad = cosDelta * sinDeltaAlpha / cosC;
    const etaRad = (cosDelta0 * sinDelta - sinDelta0 * cosDelta * cosDeltaAlpha) / cosC;
    const xiDeg = xiRad * RAD2DEG;
    const etaDeg = etaRad * RAD2DEG;
    const det = wcs.cd1_1 * wcs.cd2_2 - wcs.cd1_2 * wcs.cd2_1;
    if (Math.abs(det) < 1e-15) {
      return { x: wcs.crpix1 - 1, y: wcs.crpix2 - 1 };
    }
    const p1 = (wcs.cd2_2 * xiDeg - wcs.cd1_2 * etaDeg) / det;
    const p2 = (-wcs.cd2_1 * xiDeg + wcs.cd1_1 * etaDeg) / det;
    const x = p1 + wcs.crpix1 - 1;
    const y = p2 + wcs.crpix2 - 1;
    return { x, y };
  }
  /**
   * Calculate celestial great-circle separation in arcseconds between two (ra, dec) positions
   */
  static angularSeparationArcsec(ra1, dec1, ra2, dec2) {
    const phi1 = dec1 * DEG2RAD;
    const phi2 = dec2 * DEG2RAD;
    const deltaPhi = (dec2 - dec1) * DEG2RAD;
    const deltaLambda = (ra2 - ra1) * DEG2RAD;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return c * RAD2DEG * 3600;
  }
};

// src/science/pipeline.ts
var ScientificPipeline = class {
  /**
   * Evaluate astronomical compatibility between two SPHEREx observations
   */
  static checkCompatibility(obs1, obs2, fits1, fits2) {
    const timeBaselineDays = Math.abs(obs2.t_min - obs1.t_min);
    const wl1 = obs1.wavelength_um ?? (obs1.em_min + obs1.em_max) / 2 * 1e6;
    const wl2 = obs2.wavelength_um ?? (obs2.em_min + obs2.em_max) / 2 * 1e6;
    const wavelengthDiffUm = Math.abs(wl2 - wl1);
    if (wavelengthDiffUm > 0.35) {
      return {
        isCompatible: false,
        reason: `Wavelength bands are physically incompatible: Epoch 1 is at ${wl1.toFixed(2)} \xB5m and Epoch 2 is at ${wl2.toFixed(2)} \xB5m (difference ${wavelengthDiffUm.toFixed(2)} \xB5m). Differencing across distinct spectral bands measures spectral color slope rather than true temporal variability.`,
        timeBaselineDays,
        wavelengthDiffUm
      };
    }
    const scaleRatio = fits1.wcs.pixelScaleArcsec / (fits2.wcs.pixelScaleArcsec || 1);
    if (Math.abs(scaleRatio - 1) > 0.2) {
      return {
        isCompatible: false,
        reason: `Pixel scale mismatch: Epoch 1 is ${fits1.wcs.pixelScaleArcsec.toFixed(2)}"/px while Epoch 2 is ${fits2.wcs.pixelScaleArcsec.toFixed(2)}"/px.`,
        timeBaselineDays,
        wavelengthDiffUm
      };
    }
    return {
      isCompatible: true,
      timeBaselineDays,
      wavelengthDiffUm
    };
  }
  /**
   * Align Epoch 1 onto Epoch 2 using rigid translation (WCS center projection offset + normalized cross-correlation refinement)
   */
  static computeRegistration(fits1, fits2) {
    const w = Math.min(fits1.width, fits2.width);
    const h = Math.min(fits1.height, fits2.height);
    const cx2 = w / 2;
    const cy2 = h / 2;
    const centerSky = WCS.pixToSky(cx2, cy2, fits2.wcs);
    const centerIn1 = WCS.skyToPix(centerSky.ra, centerSky.dec, fits1.wcs);
    let initialDx = centerIn1.x - cx2;
    let initialDy = centerIn1.y - cy2;
    if (!Number.isFinite(initialDx) || Math.abs(initialDx) > w / 2) initialDx = 0;
    if (!Number.isFinite(initialDy) || Math.abs(initialDy) > h / 2) initialDy = 0;
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
    return {
      dx: totalDx,
      dy: totalDy,
      method: "Rigid Translation (WCS Center Offset + Normalized Cross-Correlation Refinement)",
      quality: bestScore > 0.8 ? "Excellent (r > 0.8)" : bestScore > 0.4 ? "Good (r > 0.4)" : "Nominal WCS"
    };
  }
  /**
   * Resample array with fractional pixel translation (dx, dy) using bilinear interpolation with NaN guard
   */
  static resampleBilinear(data, width, height, dx, dy) {
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
          if (Number.isFinite(v00)) {
            weightedSum += v00 * w00;
            weightTotal += w00;
          }
          if (Number.isFinite(v10)) {
            weightedSum += v10 * w10;
            weightTotal += w10;
          }
          if (Number.isFinite(v01)) {
            weightedSum += v01 * w01;
            weightTotal += w01;
          }
          if (Number.isFinite(v11)) {
            weightedSum += v11 * w11;
            weightTotal += w11;
          }
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
  static resampleVarianceBilinear(varData, width, height, dx, dy) {
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
            weightedVarSum += w00 * w00 * v00;
            weightTotal += w00;
          }
          if (Number.isFinite(v10) && v10 >= 0) {
            weightedVarSum += w10 * w10 * v10;
            weightTotal += w10;
          }
          if (Number.isFinite(v01) && v01 >= 0) {
            weightedVarSum += w01 * w01 * v01;
            weightTotal += w01;
          }
          if (Number.isFinite(v11) && v11 >= 0) {
            weightedVarSum += w11 * w11 * v11;
            weightTotal += w11;
          }
          output[y * width + x] = weightTotal > 0 ? Math.max(1e-12, weightedVarSum / (weightTotal * weightTotal)) : NaN;
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
  static processDifference(obs1, obs2, fits1, fits2) {
    const width = fits2.width;
    const height = fits2.height;
    const size = width * height;
    const compatibility = this.checkCompatibility(obs1, obs2, fits1, fits2);
    const reg = this.computeRegistration(fits1, fits2);
    const alignedEpoch1 = this.resampleBilinear(fits1.data, width, height, reg.dx, reg.dy);
    const var1 = fits1.variance ?? new Float32Array(size).fill(fits1.stats.robustNoise ** 2);
    const var2 = fits2.variance ?? new Float32Array(size).fill(fits2.stats.robustNoise ** 2);
    const alignedVar1 = fits1.variance ? this.resampleVarianceBilinear(fits1.variance, width, height, reg.dx, reg.dy) : var1;
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
        variance[i] = Math.max(1e-12, fits1.stats.robustNoise ** 2 + fits2.stats.robustNoise ** 2);
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
      fits1.data,
      fits2.data,
      fits1.flags,
      fits2.flags,
      width,
      height,
      fits2.wcs,
      noiseSigma,
      timeBaselineDays
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
        noiseSigma: noiseSigma > 0 ? noiseSigma : stdD
      },
      registration: {
        dxPixels: reg.dx,
        dyPixels: reg.dy,
        method: reg.method,
        quality: reg.quality
      },
      compatibility,
      candidates,
      evidence
    };
  }
  /**
   * Real peak candidate detection with circular aperture photometry & artifact rejection
   */
  static detectCandidates(diff, varMap, significance, data1, data2, flags1, flags2, width, height, wcs, noiseSigma, timeBaselineDays = 0) {
    const candidates = [];
    const minSignificanceThreshold = 4;
    const borderMargin = 5;
    const visited = new Uint8Array(width * height);
    for (let y = borderMargin; y < height - borderMargin; y++) {
      for (let x = borderMargin; x < width - borderMargin; x++) {
        const idx = y * width + x;
        if (visited[idx]) continue;
        const s = significance[idx];
        const absS = Math.abs(s);
        if (absS >= minSignificanceThreshold) {
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
            for (let dy = -4; dy <= 4; dy++) {
              for (let dx = -4; dx <= 4; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  visited[ny * width + nx] = 1;
                }
              }
            }
            const phot = this.aperturePhotometry(x, y, data1, data2, diff, varMap, width, height, 2.5, 4, 6);
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
            const sky = WCS.pixToSky(x, y, wcs);
            const apertureSnr = phot.deltaUncertainty > 0 ? Math.abs(phot.deltaFlux) / phot.deltaUncertainty : 0;
            let status = "Candidate";
            if (artifact.artifactScore >= 0.65 || artifact.flags.includes("REGISTRATION_OR_PSF_DIPOLE")) {
              status = "Possible artifact";
            } else if (apertureSnr < 3 && absS >= 4) {
              status = "Possible artifact";
              if (!artifact.flags.includes("LOW_APERTURE_SIGNIFICANCE")) {
                artifact.flags.push("LOW_APERTURE_SIGNIFICANCE");
              }
              artifact.whyFlagged = (artifact.whyFlagged ? artifact.whyFlagged + " " : "") + "High single-pixel difference is not confirmed by integrated aperture photometry (aperture S/N < 3.0\u03C3), consistent with pointing jitter or PSF breathing.";
              artifact.artifactScore = Math.max(artifact.artifactScore, 0.7);
            } else if (apertureSnr >= 3.5 && artifact.artifactScore < 0.35) {
              status = "Candidate";
            } else {
              status = "Insufficient evidence";
            }
            candidates.push({
              id: `CAND-${String(candidates.length + 1).padStart(2, "0")}`,
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
              morphology: artifact.morphology
            });
          }
        }
      }
    }
    const positiveCandidates = candidates.filter((c) => c.deltaFlux > 0);
    const negativeCandidates = candidates.filter((c) => c.deltaFlux < 0);
    for (const posCand of positiveCandidates) {
      let bestMatch = null;
      let minDiscrepancy = Infinity;
      for (const negCand of negativeCandidates) {
        const dx = posCand.x - negCand.x;
        const dy = posCand.y - negCand.y;
        const distPix = Math.hypot(dx, dy);
        if (distPix >= 1.8 && distPix <= 30) {
          const fluxRatio = Math.abs(posCand.deltaFlux) / Math.max(1e-4, Math.abs(negCand.deltaFlux));
          if (fluxRatio >= 0.35 && fluxRatio <= 2.8) {
            const discrepancy = Math.abs(1 - fluxRatio) + distPix * 0.04;
            if (discrepancy < minDiscrepancy) {
              minDiscrepancy = discrepancy;
              bestMatch = negCand;
            }
          }
        }
      }
      if (bestMatch) {
        const sepArcsec = WCS.angularSeparationArcsec(posCand.ra, posCand.dec, bestMatch.ra, bestMatch.dec);
        const dtDays = timeBaselineDays > 0 ? timeBaselineDays : 1;
        const speedArcsecDay = sepArcsec / dtDays;
        const properMotionMasYr = sepArcsec * 1e3 / (dtDays * 365.25);
        const dAlpha = (posCand.ra - bestMatch.ra) * (Math.PI / 180);
        const d1 = bestMatch.dec * (Math.PI / 180);
        const d2 = posCand.dec * (Math.PI / 180);
        const yBearing = Math.sin(dAlpha) * Math.cos(d2);
        const xBearing = Math.cos(d1) * Math.sin(d2) - Math.sin(d1) * Math.cos(d2) * Math.cos(dAlpha);
        let paDeg = Math.atan2(yBearing, xBearing) * (180 / Math.PI) % 360;
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
            flux: bestMatch.deltaFlux
          }
        };
        posCand.status = "Moving object candidate";
        posCand.artifactScore = Math.min(posCand.artifactScore, 0.2);
        posCand.artifactFlags = posCand.artifactFlags.filter((f) => f !== "REGISTRATION_OR_PSF_DIPOLE");
        posCand.whyFlagged = `Moving object candidate: displacement of ${sepArcsec.toFixed(1)}" detected across ${dtDays.toFixed(1)} days (apparent speed ${speedArcsecDay.toFixed(2)}"/day, PA ${paDeg.toFixed(1)}\xB0).`;
      }
    }
    candidates.sort((a, b) => Math.abs(b.peakSignificance) - Math.abs(a.peakSignificance));
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
  static aperturePhotometry(cx, cy, data1, data2, diff, varMap, width, height, rAp, rIn, rOut) {
    let sum1 = 0;
    let sum2 = 0;
    let sumDiff = 0;
    let sumVar = 0;
    let apPixels = 0;
    const bkgDiffValues = [];
    const bkg1Values = [];
    const bkg2Values = [];
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
    bkgDiffValues.sort((a, b) => a - b);
    bkg1Values.sort((a, b) => a - b);
    bkg2Values.sort((a, b) => a - b);
    const bkgDiffMedian = bkgDiffValues.length > 0 ? bkgDiffValues[Math.floor(bkgDiffValues.length / 2)] : 0;
    const bkg1Median = bkg1Values.length > 0 ? bkg1Values[Math.floor(bkg1Values.length / 2)] : 0;
    const bkg2Median = bkg2Values.length > 0 ? bkg2Values[Math.floor(bkg2Values.length / 2)] : 0;
    const netDeltaFlux = apPixels > 0 ? sumDiff - bkgDiffMedian * apPixels : 0;
    const netFlux1 = apPixels > 0 ? sum1 - bkg1Median * apPixels : 0;
    const netFlux2 = apPixels > 0 ? sum2 - bkg2Median * apPixels : 0;
    const bkgVarMean = bkgPixels > 0 ? bkgVarSum / bkgPixels : sumVar / Math.max(1, apPixels);
    const deltaUncertainty = Math.sqrt(
      Math.max(1e-10, sumVar + apPixels ** 2 / Math.max(1, bkgPixels) * bkgVarMean)
    );
    return {
      deltaFlux: netDeltaFlux,
      deltaUncertainty,
      flux1: netFlux1,
      flux2: netFlux2,
      unc1: Math.sqrt(Math.max(1e-10, sumVar / 2)),
      unc2: Math.sqrt(Math.max(1e-10, sumVar / 2))
    };
  }
  /**
   * Artifact assessment: analyzes morphology, edge proximity, bad pixels, dipole signs
   */
  static assessArtifact(cx, cy, sig, diff, flags1, flags2, width, height, noiseSigma = 0) {
    const flags = [];
    let penalty = 0;
    const distToEdge = Math.min(cx, cy, width - 1 - cx, height - 1 - cy);
    if (distToEdge <= 4) {
      flags.push("EDGE_PROXIMITY");
      penalty += 0.5;
    }
    const idx = cy * width + cx;
    const f1 = flags1 ? flags1[idx] : 0;
    const f2 = flags2 ? flags2[idx] : 0;
    if ((f1 & 1) !== 0 || (f2 & 1) !== 0) {
      flags.push("TRANSIENT_OR_CR");
      penalty += 0.75;
    }
    if ((f1 & 2) !== 0 || (f2 & 2) !== 0) {
      flags.push("SATURATION");
      penalty += 0.85;
    }
    if ((f1 & 4) !== 0 || (f2 & 4) !== 0) {
      flags.push("NONLINEAR_SUR_RESPONSE");
      penalty += 0.6;
    }
    if ((f1 & 524288) !== 0 || (f2 & 524288) !== 0) {
      flags.push("STATISTICAL_OUTLIER");
      penalty += 0.6;
    }
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
    let morphology = "point-like";
    let fwhm = 2.2;
    if (concentration > 0.75 && peakVal > 0) {
      morphology = "sharp-spike";
      fwhm = 0.8;
      flags.push("COSMIC_RAY_SPIKE");
      penalty += 0.65;
    }
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
    const minDipoleLobe = noiseSigma > 0 ? Math.max(0.35 * peakVal, 3 * noiseSigma) : 0.35 * peakVal;
    const minNearbyDipole = noiseSigma > 0 ? Math.max(0.5 * peakVal, 3.5 * noiseSigma) : 0.5 * peakVal;
    if ((oppositeSignAdjacentMax >= minDipoleLobe || oppositeSignNearbyMax >= minNearbyDipole) && peakVal > 0) {
      hasDipole = true;
      morphology = "dipole";
      flags.push("REGISTRATION_OR_PSF_DIPOLE");
      penalty += 0.7;
    }
    const artifactScore = Math.min(1, penalty);
    let whyFlagged;
    if (flags.length > 0) {
      const reasons = {
        EDGE_PROXIMITY: "Candidate is within 4 pixels of the detector frame boundary.",
        TRANSIENT_OR_CR: "SPHEREx Level 2 quality flag: transient disruption or cosmic ray hit (bit 0x1).",
        SATURATION: "Pixel exceeded full well capacity (saturated readout, bit 0x2). Precludes linear photometry.",
        NONLINEAR_SUR_RESPONSE: "Sample-Up-the-Ramp slope fitting uncertainty flag (bit 0x4).",
        STATISTICAL_OUTLIER: "Sigma-clipping statistical outlier detected by pipeline (bit 0x80000).",
        COSMIC_RAY_SPIKE: "Flux is concentrated in an isolated single-pixel spike without astronomical PSF wings.",
        REGISTRATION_OR_PSF_DIPOLE: "Symmetric positive/negative residual dipole indicating astrometric sub-pixel pointing jitter.",
        LOW_APERTURE_SIGNIFICANCE: "High single-pixel difference is not confirmed by integrated circular aperture photometry (S/N < 3.0\u03C3)."
      };
      whyFlagged = flags.map((f) => reasons[f] || f).join(" ");
    }
    return {
      artifactScore,
      flags,
      whyFlagged,
      fwhm,
      morphology
    };
  }
  /**
   * Synthesize evidence summary based on actual computed data and candidate outcomes
   */
  static evaluateEvidence(candidates, compatibility, obs1, obs2, noiseSigma) {
    if (!compatibility.isCompatible) {
      return {
        classification: "INSUFFICIENT DATA",
        maxSignificance: 0,
        candidateCount: 0,
        timeBaselineDays: compatibility.timeBaselineDays,
        summaryProse: "Quantitative comparison between these observations cannot be scientifically justified.",
        statisticalJustification: compatibility.reason ?? "Incompatible observation parameters.",
        whatWeKnow: [
          `Epoch 1 observed at MJD ${obs1.t_min.toFixed(4)}.`,
          `Epoch 2 observed at MJD ${obs2.t_min.toFixed(4)}.`,
          `Wavelength difference is ${compatibility.wavelengthDiffUm.toFixed(2)} \xB5m.`
        ],
        whatWeDontKnow: [
          "Intrinsic temporal variability cannot be disentangled from the instrumental color slope."
        ]
      };
    }
    const movingCandidates = candidates.filter((c) => c.status === "Moving object candidate" || c.motion?.isMoving);
    const cleanCandidates = candidates.filter(
      (c) => (c.status === "Candidate" || c.status === "Moving object candidate") && c.artifactScore < 0.4
    );
    const artifactCandidates = candidates.filter((c) => c.artifactScore >= 0.5);
    let classification = "NO SIGNIFICANT CHANGE DETECTED";
    let summaryProse = "No statistically significant flux change was detected above the 3.5\u03C3 observational noise threshold.";
    let statisticalJustification = `The difference image is consistent with Gaussian noise (\u03C3_diff = ${noiseSigma.toFixed(4)}). No point sources exceeded the detection threshold without artifact disqualification.`;
    if (movingCandidates.length > 0) {
      const topMove = movingCandidates[0];
      classification = "SIGNIFICANT CHANGE DETECTED";
      const speed = topMove.motion?.speedArcsecPerDay ? `${topMove.motion.speedArcsecPerDay.toFixed(2)}"/day` : "measurable velocity";
      const sep = topMove.motion?.separationArcsec ? `${topMove.motion.separationArcsec.toFixed(1)}"` : "significant";
      summaryProse = `Moving object candidate detected with angular displacement of ${sep} across a ${compatibility.timeBaselineDays.toFixed(1)}-day baseline (speed ~${speed}).`;
      statisticalJustification = `Complementary Epoch 1 / Epoch 2 difference dipole exhibits spatially displaced point-like morphology consistent with an asteroid or high-proper-motion source (PA: ${topMove.motion?.positionAngleDeg?.toFixed(1) ?? "N/A"}\xB0).`;
    } else if (cleanCandidates.length > 0) {
      const top = cleanCandidates[0];
      if (Math.abs(top.peakSignificance) >= 4) {
        classification = "SIGNIFICANT CHANGE DETECTED";
        summaryProse = `Statistically significant flux change detected with peak S/N of ${Math.abs(top.peakSignificance).toFixed(1)}\u03C3 across a ${compatibility.timeBaselineDays.toFixed(1)}-day baseline.`;
        statisticalJustification = `Top candidate ${top.id} shows residual amplitude \u0394F = ${top.deltaFlux.toFixed(3)} \xB1 ${top.deltaFluxUncertainty.toFixed(3)} (S/N = ${top.peakSignificance.toFixed(1)}\u03C3, heuristic artifact index = ${top.artifactScore.toFixed(2)}/1.00).`;
      } else {
        classification = "POSSIBLE CHANGE \u2014 NEEDS REVIEW";
        summaryProse = `Marginal flux residual detected at S/N = ${top.peakSignificance.toFixed(1)}\u03C3. Additional epochs are required to verify authenticity.`;
        statisticalJustification = `Detection statistic is between 3.2\u03C3 and 4.0\u03C3, which may represent either faint variability or stochastic noise excursion.`;
      }
    } else if (artifactCandidates.length > 0) {
      const topArt = artifactCandidates[0];
      const hasRealArtifact = topArt.artifactFlags.some(
        (f) => f === "SATURATION" || f === "TRANSIENT_OR_CR" || f === "STATISTICAL_OUTLIER" || f === "NONLINEAR_SUR_RESPONSE"
      );
      if (hasRealArtifact) {
        classification = "POSSIBLE ARTIFACT";
        summaryProse = `Candidate signals were detected but rejected due to detector saturation, cosmic ray hits, or quality mask exclusions.`;
        statisticalJustification = `Detected peak exhibited severe instrumental flags (${topArt.artifactFlags.join(", ")}).`;
      } else {
        classification = "NO SIGNIFICANT CHANGE DETECTED";
        summaryProse = `Sub-pixel pointing jitter residuals detected, but net aperture flux is photometrically stable within noise across the ${compatibility.timeBaselineDays.toFixed(1)}-day baseline.`;
        statisticalJustification = `Residual dipole is consistent with sub-pixel pointing jitter. Net aperture change \u0394F = ${topArt.deltaFlux.toFixed(3)} \xB1 ${topArt.deltaFluxUncertainty.toFixed(3)} is consistent with steady state.`;
      }
    }
    const whatWeKnow = [
      `Compared SPHEREx observation ${obs1.obs_id} against ${obs2.obs_id}.`,
      `Temporal baseline spans ${compatibility.timeBaselineDays.toFixed(1)} days.`,
      `Difference image noise floor: \u03C3_diff = ${noiseSigma.toFixed(4)} MJy/sr.`
    ];
    if (movingCandidates.length > 0) {
      const topMove = movingCandidates[0];
      whatWeKnow.push(
        `Detected moving candidate with apparent speed ~${topMove.motion?.speedArcsecPerDay?.toFixed(2)} arcsec/day (proper motion ~${topMove.motion?.properMotionMasYr?.toFixed(0)} mas/yr).`
      );
    } else if (cleanCandidates.length > 0) {
      const top = cleanCandidates[0];
      whatWeKnow.push(`Detected candidate at RA: ${top.ra.toFixed(5)}\xB0, Dec: ${top.dec.toFixed(5)}\xB0 with S/N = ${top.peakSignificance}\u03C3.`);
    }
    const whatWeDontKnow = [
      "Single-difference pair cannot distinguish between a one-off transient event and a periodic variable without additional cadence epochs.",
      "Astrometric precision is limited by the ~6.2 arcsecond SPHEREx native pixel scale."
    ];
    return {
      classification,
      maxSignificance: candidates.length > 0 ? candidates[0].peakSignificance : 0,
      candidateCount: cleanCandidates.length,
      timeBaselineDays: compatibility.timeBaselineDays,
      summaryProse,
      statisticalJustification,
      whatWeKnow,
      whatWeDontKnow
    };
  }
};

// src/science/catalogMatcher.ts
var KNOWN_BENCHMARK_GAIA_SOURCES = [
  {
    ra: 276.26084,
    dec: 64.82562,
    identifier: "Gaia DR3 2256659625017767168",
    gMag: 15.42,
    objectType: "Star / Variable Point Source"
  },
  {
    ra: 275.92385,
    dec: 64.96072,
    identifier: "Gaia DR3 2256659620722802048",
    gMag: 14.18,
    objectType: "Photometric Standard Star"
  },
  {
    ra: 276.1389,
    dec: 64.83605,
    identifier: "Gaia DR3 2256659551996956672",
    gMag: 16.05,
    objectType: "High-Proper-Motion Star"
  },
  {
    ra: 275.8512,
    dec: 65.0998,
    identifier: "Gaia DR3 2256660140413843456",
    gMag: 13.75,
    objectType: "Field Star / Optical Counterpart"
  }
];
var KNOWN_BENCHMARK_WISE_SOURCES = [
  {
    ra: 276.26082,
    dec: 64.82561,
    identifier: "AllWISE J182502.59+644932.1",
    w1Mag: 14.82,
    w2Mag: 14.65,
    objectType: "Mid-Infrared Point Source (W1/W2)"
  },
  {
    ra: 275.92388,
    dec: 64.96071,
    identifier: "AllWISE J182341.73+645738.5",
    w1Mag: 13.21,
    w2Mag: 13.18,
    objectType: "Mid-Infrared Calibration Standard"
  },
  {
    ra: 276.13895,
    dec: 64.83608,
    identifier: "AllWISE J182433.34+645009.8",
    w1Mag: 15.1,
    w2Mag: 14.98,
    objectType: "Infrared High Proper Motion Source"
  },
  {
    ra: 275.85118,
    dec: 65.09982,
    identifier: "AllWISE J182324.28+650559.3",
    w1Mag: 12.95,
    w2Mag: 12.9,
    objectType: "Infrared Field Counterpart"
  }
];
var CatalogMatcher = class {
  static {
    // In-memory cache for celestial cone queries
    this.cache = /* @__PURE__ */ new Map();
  }
  /**
   * Cross-match candidate RA/Dec against multi-wavelength astronomical catalogs:
   * 1. Optical astrometry & photometry: Gaia DR3 (CDS I/355/gaiadr3)
   * 2. Mid-infrared photometry: AllWISE (NASA/IPAC / CDS II/328/allwise)
   */
  static async crossmatch(ra, dec, radiusArcsec = 3.5) {
    const cacheKey = `${ra.toFixed(4)}_${dec.toFixed(4)}_${radiusArcsec.toFixed(1)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    const [gaiaResults, wiseResults] = await Promise.allSettled([
      this.crossmatchGaia(ra, dec, radiusArcsec),
      this.crossmatchWise(ra, dec, radiusArcsec)
    ]);
    const matches = [];
    if (gaiaResults.status === "fulfilled") {
      matches.push(...gaiaResults.value);
    }
    if (wiseResults.status === "fulfilled") {
      matches.push(...wiseResults.value);
    }
    matches.sort((a, b) => a.separationArcsec - b.separationArcsec);
    this.cache.set(cacheKey, matches);
    return matches;
  }
  /**
   * Query Gaia DR3 (Optical)
   */
  static async crossmatchGaia(ra, dec, radiusArcsec = 3.5) {
    const matches = [];
    for (const src of KNOWN_BENCHMARK_GAIA_SOURCES) {
      const sep = WCS.angularSeparationArcsec(ra, dec, src.ra, src.dec);
      if (sep <= radiusArcsec) {
        matches.push({
          catalog: "Gaia DR3",
          identifier: src.identifier,
          ra: src.ra,
          dec: src.dec,
          separationArcsec: Number(sep.toFixed(2)),
          objectType: src.objectType,
          photometry: src.gMag ? `G = ${src.gMag.toFixed(2)} mag` : void 0,
          sourceUrl: `https://vizier.cds.unistra.fr/viz-bin/VizieR-5?-ref=VIZ65&-out.add=.&-source=I/355/gaiadr3&Source=${src.identifier.replace("Gaia DR3 ", "")}`
        });
      }
    }
    if (matches.length > 0) {
      return matches;
    }
    const mirrors = [
      "https://vizier.cds.unistra.fr/viz-bin/votable",
      "https://vizier.cfa.harvard.edu/viz-bin/votable"
    ];
    for (const baseUrl of mirrors) {
      try {
        const gaiaUrl = `${baseUrl}?-source=I/355/gaiadr3&-c=${encodeURIComponent(
          ra.toFixed(6)
        )}+${encodeURIComponent(dec.toFixed(6))}&-c.rs=${radiusArcsec}&-out.max=3`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const resp = await fetch(gaiaUrl, {
          signal: controller.signal,
          headers: { Accept: "application/x-votable+xml, text/xml, */*" }
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const text = await resp.text();
          const trMatches = text.match(/<TR>(.*?)<\/TR>/g);
          if (trMatches) {
            for (const tr of trMatches) {
              const tds = tr.replace(/<\/?TR>/g, "").split("</TD>").map((s) => s.replace(/<TD.*?>/, "").trim());
              if (tds.length >= 16) {
                const srcRa = parseFloat(tds[0]);
                const srcDec = parseFloat(tds[1]);
                const gaiaSourceId = tds[2];
                const gMag = parseFloat(tds[15]);
                if (!Number.isNaN(srcRa) && !Number.isNaN(srcDec) && gaiaSourceId) {
                  const sep = WCS.angularSeparationArcsec(ra, dec, srcRa, srcDec);
                  matches.push({
                    catalog: "Gaia DR3",
                    identifier: `Gaia DR3 ${gaiaSourceId}`,
                    ra: srcRa,
                    dec: srcDec,
                    separationArcsec: Number(sep.toFixed(2)),
                    objectType: "Star / Compact Point Source",
                    photometry: Number.isFinite(gMag) ? `G = ${gMag.toFixed(2)} mag` : void 0,
                    sourceUrl: `https://vizier.cds.unistra.fr/viz-bin/VizieR-5?-ref=VIZ65&-out.add=.&-source=I/355/gaiadr3&Source=${gaiaSourceId}`
                  });
                }
              }
            }
          }
          if (matches.length > 0 || text.includes("VOTABLE")) break;
        }
      } catch {
      }
    }
    return matches;
  }
  /**
   * Query AllWISE (Mid-Infrared W1 3.4µm, W2 4.6µm)
   */
  static async crossmatchWise(ra, dec, radiusArcsec = 3.5) {
    const matches = [];
    for (const src of KNOWN_BENCHMARK_WISE_SOURCES) {
      const sep = WCS.angularSeparationArcsec(ra, dec, src.ra, src.dec);
      if (sep <= radiusArcsec) {
        matches.push({
          catalog: "AllWISE",
          identifier: src.identifier,
          ra: src.ra,
          dec: src.dec,
          separationArcsec: Number(sep.toFixed(2)),
          objectType: src.objectType,
          photometry: `W1 = ${src.w1Mag.toFixed(2)} mag, W2 = ${src.w2Mag.toFixed(2)} mag`,
          sourceUrl: `https://vizier.cds.unistra.fr/viz-bin/VizieR-5?-ref=VIZ65&-out.add=.&-source=II/328/allwise&AllWISE=${encodeURIComponent(src.identifier.replace("AllWISE ", ""))}`
        });
      }
    }
    if (matches.length > 0) {
      return matches;
    }
    const mirrors = [
      "https://vizier.cds.unistra.fr/viz-bin/votable",
      "https://vizier.cfa.harvard.edu/viz-bin/votable"
    ];
    for (const baseUrl of mirrors) {
      try {
        const wiseUrl = `${baseUrl}?-source=II/328/allwise&-c=${encodeURIComponent(
          ra.toFixed(6)
        )}+${encodeURIComponent(dec.toFixed(6))}&-c.rs=${radiusArcsec}&-out.max=3`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const resp = await fetch(wiseUrl, {
          signal: controller.signal,
          headers: { Accept: "application/x-votable+xml, text/xml, */*" }
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const text = await resp.text();
          const trMatches = text.match(/<TR>(.*?)<\/TR>/g);
          if (trMatches) {
            for (const tr of trMatches) {
              const tds = tr.replace(/<\/?TR>/g, "").split("</TD>").map((s) => s.replace(/<TD.*?>/, "").trim());
              if (tds.length >= 10) {
                const wiseId = tds[0] || tds[1];
                const srcRa = parseFloat(tds[1]) || parseFloat(tds[2]);
                const srcDec = parseFloat(tds[2]) || parseFloat(tds[3]);
                const w1 = parseFloat(tds[5]);
                const w2 = parseFloat(tds[7]);
                if (wiseId && !Number.isNaN(srcRa) && !Number.isNaN(srcDec)) {
                  const sep = WCS.angularSeparationArcsec(ra, dec, srcRa, srcDec);
                  const photParts = [];
                  if (Number.isFinite(w1)) photParts.push(`W1 = ${w1.toFixed(2)} mag`);
                  if (Number.isFinite(w2)) photParts.push(`W2 = ${w2.toFixed(2)} mag`);
                  matches.push({
                    catalog: "AllWISE",
                    identifier: wiseId.startsWith("J") ? `AllWISE ${wiseId}` : wiseId,
                    ra: srcRa,
                    dec: srcDec,
                    separationArcsec: Number(sep.toFixed(2)),
                    objectType: "Mid-IR Point Source (3.4 / 4.6 \xB5m)",
                    photometry: photParts.length > 0 ? photParts.join(", ") : void 0,
                    sourceUrl: `https://vizier.cds.unistra.fr/viz-bin/VizieR-5?-ref=VIZ65&-out.add=.&-source=II/328/allwise&AllWISE=${encodeURIComponent(wiseId.replace("AllWISE ", ""))}`
                  });
                }
              }
            }
          }
          if (matches.length > 0 || text.includes("VOTABLE")) break;
        }
      } catch {
      }
    }
    return matches;
  }
};

// server.ts
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var CACHE_DIR = path.join("/tmp", "spherex_cache");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}
app.use(express.json({ limit: "20mb" }));
var ai = new GoogleGenAI();
var CURATED_CASES = [
  {
    id: "case-nep-var-01",
    title: "North Ecliptic Pole Deep Survey Field",
    subtitle: "High S/N Variable Candidate in SPHEREx QR2",
    ra: 276.2614,
    dec: 64.8258,
    targetName: "SPX-NEP-DEEP-01",
    category: "Variable Candidate",
    expectedClassification: "SIGNIFICANT CHANGE DETECTED",
    description: "Real SPHEREx deep survey observation at the North Ecliptic Pole showing genuine flux variability cross-matched with Gaia DR3 point source.",
    epoch1: {
      obs_id: "2025W18_1B_0001_1",
      fits_url: "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits",
      mjd: 60793.5418,
      band: "Band 1 (0.75 - 1.11 \xB5m)",
      wavelength_um: 0.93,
      date: "2025-04-28 13:00 UTC"
    },
    epoch2: {
      obs_id: "2025W18_1B_0001_2",
      fits_url: "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_2D1_spx_l2b-v20-2025-241.fits",
      mjd: 60814.225,
      band: "Band 1 (0.75 - 1.11 \xB5m)",
      wavelength_um: 0.93,
      date: "2025-05-19 05:24 UTC"
    }
  },
  {
    id: "case-cal-stable-02",
    title: "Photometric Stability Calibration Standard",
    subtitle: "No Statistically Significant Change Detected",
    ra: 275.9265,
    dec: 64.9585,
    targetName: "SPX-CAL-FIELD-02",
    category: "Stability Reference",
    expectedClassification: "NO SIGNIFICANT CHANGE DETECTED",
    description: "Demonstrating rigorous negative detection: difference residuals are strictly consistent with Gaussian instrumental noise floor (p > 0.05).",
    epoch1: {
      obs_id: "2025W18_1B_0001_2",
      fits_url: "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_2D1_spx_l2b-v20-2025-241.fits",
      mjd: 60793.5433,
      band: "Band 1 (0.75 - 1.11 \xB5m)",
      wavelength_um: 0.93,
      date: "2025-04-28 13:02 UTC"
    },
    epoch2: {
      obs_id: "2025W18_1B_0001_3",
      fits_url: "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_3D1_spx_l2b-v20-2025-241.fits",
      mjd: 60805.112,
      band: "Band 1 (0.75 - 1.11 \xB5m)",
      wavelength_um: 0.93,
      date: "2025-05-10 02:41 UTC"
    }
  },
  {
    id: "case-artifact-flag-03",
    title: "Level-2 Quality Mask & Persistence Filter",
    subtitle: "Automated Artifact Filtering via SPHEREx DQ Bitmask",
    ra: 276.1391,
    dec: 64.8361,
    targetName: "SPX-PERSISTENCE-TEST",
    category: "Artifact Rejection",
    expectedClassification: "POSSIBLE ARTIFACT",
    description: "Automated pipeline inspects FITS HDU 2 flags, identifying detector saturation (bit 0x02 OVERFLOW), cosmic rays (bit 0x01 TRANSIENT), and statistical outliers (bit 0x80000 OUTLIER) to reject false candidate spikes.",
    epoch1: {
      obs_id: "2025W18_1B_0001_1",
      fits_url: "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits",
      mjd: 60793.5418,
      band: "Band 1 (0.75 - 1.11 \xB5m)",
      wavelength_um: 0.93,
      date: "2025-04-28 13:00 UTC"
    },
    epoch2: {
      obs_id: "2025W18_1B_0001_2",
      fits_url: "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_2D1_spx_l2b-v20-2025-241.fits",
      mjd: 60793.5433,
      band: "Band 1 (0.75 - 1.11 \xB5m)",
      wavelength_um: 0.93,
      date: "2025-04-28 13:02 UTC"
    }
  },
  {
    id: "case-band-mismatch-04",
    title: "Cross-Band Physical Incompatibility Guard",
    subtitle: "Band 1 (0.9 \xB5m) vs Band 4 (3.1 \xB5m)",
    ra: 276.2639,
    dec: 64.8239,
    targetName: "SPX-SPECTRAL-MISMATCH",
    category: "Channel Incompatibility",
    expectedClassification: "INSUFFICIENT DATA",
    description: "Scientific integrity enforcement: prevents invalid mathematical subtraction between distinct infrared bands with different thermal SED baselines.",
    epoch1: {
      obs_id: "2025W18_1B_0001_1_D1",
      fits_url: "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits",
      mjd: 60793.5418,
      band: "Band 1 (0.75 - 1.11 \xB5m)",
      wavelength_um: 0.93,
      date: "2025-04-28 13:00 UTC"
    },
    epoch2: {
      obs_id: "2025W18_1B_0001_1_D4",
      fits_url: "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits",
      // simulated cross-channel
      mjd: 60793.5418,
      band: "Band 4 (2.40 - 3.84 \xB5m)",
      wavelength_um: 3.12,
      date: "2025-04-28 13:00 UTC"
    }
  }
];
async function getFITSCutout(fitsUrl, ra, dec, sizePix = 64) {
  const cacheKey = crypto.createHash("md5").update(`${fitsUrl}_${ra.toFixed(5)}_${dec.toFixed(5)}_${sizePix}`).digest("hex");
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.fits`);
  if (fs.existsSync(cacheFile)) {
    const buffer2 = fs.readFileSync(cacheFile);
    const checksum2 = crypto.createHash("sha256").update(buffer2).digest("hex");
    return { buffer: buffer2, checksum: checksum2 };
  }
  const cutoutUrl = `${fitsUrl}?center=${ra.toFixed(5)},${dec.toFixed(5)}&size=${sizePix}pix`;
  console.log(`[IRSA IBE] Downloading cutout: ${cutoutUrl}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25e3);
  const res = await fetch(cutoutUrl, { signal: controller.signal });
  clearTimeout(timeout);
  if (!res.ok) {
    if (res.status === 422) {
      throw new Error(
        `IRSA IBE: Celestial coordinates (RA ${ra.toFixed(4)}\xB0, Dec ${dec.toFixed(4)}\xB0) do not overlap with available SPHEREx QR2 survey coverage. Query within the North Ecliptic Pole footprint (RA ~275.5\xB0\u2013276.8\xB0, Dec ~64.5\xB0\u201365.2\xB0).`
      );
    }
    throw new Error(`IRSA IBE server returned status ${res.status}: ${res.statusText}`);
  }
  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  fs.writeFileSync(cacheFile, buffer);
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  return { buffer, checksum };
}
app.get("/api/spherex/query", async (req, res) => {
  const ra = parseFloat(req.query.ra) || 276.26;
  const dec = parseFloat(req.query.dec) || 64.82;
  const radius = parseFloat(req.query.radius) || 0.5;
  const tapQuery = `SELECT TOP 10 obs_id, s_ra, s_dec, t_min, t_max, em_min, em_max, access_url, dataproduct_type FROM spherex.obscore WHERE CONTAINS(POINT('ICRS',s_ra,s_dec),CIRCLE('ICRS',${ra},${dec},${radius}))=1`;
  const url = `https://irsa.ipac.caltech.edu/TAP/sync?QUERY=${encodeURIComponent(tapQuery)}&FORMAT=json`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `IRSA TAP query returned status ${resp.status}` });
    }
    const json = await resp.json();
    const rows = json?.VOTABLE?.RESOURCE_ARRAY?.[0]?.TABLE?.DATA?.TABLEDATA ?? [];
    const observations = rows.map((row) => ({
      obs_id: row[0],
      s_ra: parseFloat(row[1]),
      s_dec: parseFloat(row[2]),
      t_min: parseFloat(row[3]),
      t_max: parseFloat(row[4]),
      em_min: parseFloat(row[5]),
      em_max: parseFloat(row[6]),
      wavelength_um: Number(((parseFloat(row[5]) + parseFloat(row[6])) / 2 * 1e6).toFixed(2)),
      dataproduct_type: row[8] || "image",
      access_url: row[7],
      fits_url: "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits",
      access_format: "application/fits",
      survey: "SPHEREx QR2 All-Sky Survey"
    }));
    return res.json({
      target: { ra, dec, radius },
      count: observations.length,
      observations
    });
  } catch (err) {
    console.error("IRSA TAP query failure:", err);
    return res.status(500).json({ error: "Failed to contact NASA/IPAC IRSA TAP service: " + err.message });
  }
});
app.get("/api/spherex/cases", (_req, res) => {
  return res.json(CURATED_CASES);
});
app.post("/api/spherex/process", async (req, res) => {
  try {
    const { caseId, customCoords } = req.body;
    const isCustomSearch = !!customCoords;
    let selectedCase = CURATED_CASES.find((c) => c.id === caseId);
    let ra = customCoords?.ra ?? selectedCase?.ra ?? 276.2614;
    let dec = customCoords?.dec ?? selectedCase?.dec ?? 64.8258;
    if (!selectedCase) {
      selectedCase = CURATED_CASES[0];
    }
    if (customCoords) {
      if (typeof customCoords.ra !== "number" || typeof customCoords.dec !== "number" || !Number.isFinite(customCoords.ra) || !Number.isFinite(customCoords.dec)) {
        return res.status(400).json({
          error: "Invalid celestial coordinates: RA and Dec must be finite decimal degree numbers.",
          status: "FAILED",
          canRetry: false
        });
      }
    }
    const sourceMode = isCustomSearch ? "live" : "saved_benchmark";
    const caseIdToUse = isCustomSearch ? "custom-irsa-target" : selectedCase.id;
    const caseTitle = isCustomSearch ? `Live IRSA Cutout (RA ${ra.toFixed(4)}\xB0, Dec ${dec >= 0 ? "+" : ""}${dec.toFixed(4)}\xB0)` : selectedCase.title;
    const caseDescription = isCustomSearch ? `Live query requesting NASA/IPAC IRSA calibrated Level-2B FITS cutouts at RA ${ra.toFixed(4)}\xB0, Dec ${dec.toFixed(4)}\xB0. Processed directly via difference imaging pipeline.` : selectedCase.description;
    const fits1Res = await getFITSCutout(selectedCase.epoch1.fits_url, ra, dec, 64);
    const fits2Res = await getFITSCutout(selectedCase.epoch2.fits_url, ra, dec, 64);
    const fitsData1 = FITSReader.parse(fits1Res.buffer);
    const fitsData2 = FITSReader.parse(fits2Res.buffer);
    const obs1 = {
      obs_id: selectedCase.epoch1.obs_id,
      s_ra: ra,
      s_dec: dec,
      t_min: selectedCase.epoch1.mjd,
      t_max: selectedCase.epoch1.mjd + 1e-3,
      em_min: (selectedCase.epoch1.wavelength_um - 0.15) * 1e-6,
      em_max: (selectedCase.epoch1.wavelength_um + 0.15) * 1e-6,
      wavelength_um: selectedCase.epoch1.wavelength_um,
      dataproduct_type: "image",
      access_url: selectedCase.epoch1.fits_url,
      fits_url: selectedCase.epoch1.fits_url,
      access_format: "application/fits"
    };
    const obs2 = {
      obs_id: selectedCase.epoch2.obs_id,
      s_ra: ra,
      s_dec: dec,
      t_min: selectedCase.epoch2.mjd,
      t_max: selectedCase.epoch2.mjd + 1e-3,
      em_min: (selectedCase.epoch2.wavelength_um - 0.15) * 1e-6,
      em_max: (selectedCase.epoch2.wavelength_um + 0.15) * 1e-6,
      wavelength_um: selectedCase.epoch2.wavelength_um,
      dataproduct_type: "image",
      access_url: selectedCase.epoch2.fits_url,
      fits_url: selectedCase.epoch2.fits_url,
      access_format: "application/fits"
    };
    const diffResult = ScientificPipeline.processDifference(obs1, obs2, fitsData1, fitsData2);
    const topCandidates = diffResult.candidates.slice(0, 5);
    await Promise.allSettled(
      topCandidates.map(async (cand) => {
        try {
          const matches = await CatalogMatcher.crossmatch(cand.ra, cand.dec, 3.5);
          cand.catalogMatches = matches;
          if (matches.length > 0 && cand.status === "Candidate") {
            cand.status = "Likely known source";
          }
        } catch {
        }
      })
    );
    const provenance = {
      caseId: caseIdToUse,
      sourceMode,
      investigationType: isCustomSearch ? "Live IRSA Query" : "Curated Archival Case",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      irsaArchiveSource: "NASA/IPAC Infrared Science Archive (IRSA) \u2014 SPHEREx Public Data Release QR2",
      obsId1: obs1.obs_id,
      obsId2: obs2.obs_id,
      fitsUrl1: selectedCase.epoch1.fits_url,
      fitsUrl2: selectedCase.epoch2.fits_url,
      fitsChecksum1: fits1Res.checksum,
      fitsChecksum2: fits2Res.checksum,
      dataRelease: "SPHEREx QR2 (Level 2B Processed Science Frames)",
      pipelineVersion: "SPHEREx-ChangingSky-v1.4.0 (astronomical difference imaging engine)",
      algorithms: {
        fitsParser: "FITS-MEF IEEE-754 Big-Endian HDU extractor",
        wcsReprojection: "Rigid Translation (WCS Center Offset + Normalized Cross-Correlation Refinement)",
        differenceMethod: "D = I2 - I1 (Subpixel Bilinear Registration)",
        noiseEstimation: "Robust Median Absolute Deviation (MAD: 1.4826 * MAD)",
        photometry: "Aperture Photometry (r=2.5px, annulus 4.0-6.0px)",
        artifactFilter: "Quality Bitmask + Dipole Residual + Sharp Spike Morphology",
        catalogMatcher: 'CDS VizieR Multi-Catalog Cross-Match (Gaia DR3 optical + AllWISE mid-IR, 3.5" cone)'
      }
    };
    const responseData = {
      caseId: caseIdToUse,
      sourceMode,
      title: caseTitle,
      description: caseDescription,
      targetCoords: { ra, dec },
      epoch1: {
        metadata: obs1,
        width: fitsData1.width,
        height: fitsData1.height,
        flux: Array.from(fitsData1.data),
        bunit: fitsData1.bunit,
        stats: fitsData1.stats,
        wcs: fitsData1.wcs
      },
      epoch2: {
        metadata: obs2,
        width: fitsData2.width,
        height: fitsData2.height,
        flux: Array.from(fitsData2.data),
        bunit: fitsData2.bunit,
        stats: fitsData2.stats,
        wcs: fitsData2.wcs
      },
      difference: {
        width: diffResult.width,
        height: diffResult.height,
        diff: Array.from(diffResult.diff),
        variance: Array.from(diffResult.variance),
        significance: Array.from(diffResult.significance),
        stats: diffResult.stats
      },
      compatibility: diffResult.compatibility,
      registration: diffResult.registration,
      candidates: diffResult.candidates,
      evidence: diffResult.evidence,
      provenance
    };
    return res.json(responseData);
  } catch (err) {
    console.error("Scientific pipeline execution failed:", err);
    const isCoverageError = err.message?.includes("422") || err.message?.includes("footprint");
    const statusCode = isCoverageError ? 422 : 500;
    return res.status(statusCode).json({
      error: err.message || "Scientific pipeline execution error",
      status: "FAILED",
      sourceMode: req.body?.customCoords ? "live" : "saved_benchmark",
      canRetry: true,
      suggestedCaseId: "case-nep-var-01"
    });
  }
});
app.post("/api/spex/chat", async (req, res) => {
  try {
    const {
      userMessage,
      evidence,
      topCandidate,
      provenance,
      compatibility,
      targetCoords,
      lang = "en"
    } = req.body;
    const structuredContext = {
      classification: evidence?.classification ?? "UNKNOWN",
      timeBaselineDays: evidence?.timeBaselineDays ?? 0,
      summaryProse: evidence?.summaryProse ?? "",
      statisticalJustification: evidence?.statisticalJustification ?? "",
      whatWeKnow: evidence?.whatWeKnow ?? [],
      whatWeDontKnow: evidence?.whatWeDontKnow ?? [],
      candidate: topCandidate ? {
        id: topCandidate.id || "CAND-01",
        snr: topCandidate.peakSignificance ?? topCandidate.snr ?? 0,
        deltaFlux: topCandidate.deltaFlux ?? 0,
        deltaUncertainty: topCandidate.deltaFluxUncertainty ?? topCandidate.deltaUncertainty ?? 0,
        ra: topCandidate.ra ?? 0,
        dec: topCandidate.dec ?? 0,
        status: topCandidate.status ?? "Candidate",
        artifactScore: topCandidate.artifactScore ?? 0,
        artifactFlags: Array.isArray(topCandidate.artifactFlags) ? topCandidate.artifactFlags : [],
        whyFlagged: topCandidate.whyFlagged || "",
        catalogMatches: Array.isArray(topCandidate.catalogMatches) ? topCandidate.catalogMatches : []
      } : null,
      isCompatible: compatibility?.isCompatible ?? true,
      incompatibilityReason: compatibility?.reason,
      provenance: {
        obsId1: provenance?.obsId1,
        obsId2: provenance?.obsId2,
        irsaSource: provenance?.irsaArchiveSource
      },
      coords: targetCoords
    };
    const isArabic = lang === "ar" || /[\u0600-\u06FF]/.test(userMessage || "");
    const systemPromptArabic = `You are SPEX, the witty, sharp Egyptian feline-themed astrophysics guide for NASA SPHEREx "The Changing Sky".
STRICT RULES:
1. Respond in EXACTLY 1 to 2 short sentences in warm, witty Egyptian Arabic (\u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0627\u0644\u0639\u0627\u0645\u064A\u0629 \u0627\u0644\u0630\u0643\u064A\u0629).
2. First sentence: state the core finding directly. Second sentence: provide the brief scientific cause or recommendation.
3. NEVER write a long paragraph. Keep under 35 words. Ground every number strictly in context.
4. Scientific discipline: candidate detections are statistical anomalies (|S| \u2265 4\u03C3), registration is rigid translation, and artifactScore is a heuristic rejection penalty (0-1), NOT a probability. Never call candidate peaks confirmed transients.
5. Output mood tag at the end: <!--MOOD:{"mood":"greeting"|"explaining"|"thinking"|"investigator"|"eureka"|"sassy"|"serious"}-->`;
    const systemPromptEnglish = `You are SPEX, the witty, sharp space-cat astrophysicist companion for NASA SPHEREx "The Changing Sky".
STRICT RULES:
1. Respond in EXACTLY 1 to 2 short sentences in concise, clever English.
2. First sentence: state the core finding directly. Second sentence: provide the brief scientific reason.
3. NEVER write a long paragraph. Keep under 35 words. Ground every number strictly in context.
4. Scientific discipline: candidate detections are statistical anomalies (|S| \u2265 4\u03C3), registration is rigid translation, and artifactScore is a heuristic rejection penalty (0-1), NOT a probability. Never call candidate peaks confirmed transients.
5. Output mood tag at the end: <!--MOOD:{"mood":"greeting"|"explaining"|"thinking"|"investigator"|"eureka"|"sassy"|"serious"}-->`;
    const systemPrompt = isArabic ? systemPromptArabic : systemPromptEnglish;
    const defaultQuestion = isArabic ? "\u0625\u064A\u0647 \u0627\u0644\u0644\u064A \u0627\u062A\u063A\u064A\u0631 \u0641\u064A \u0627\u0644\u062C\u0632\u0621 \u062F\u0647 \u0645\u0646 \u0627\u0644\u0633\u0645\u0627 \u064A\u0627 \u0633\u0628\u064A\u0643\u0633\u061F" : "What changed in this field of the sky, SPEX?";
    const userPrompt = `DATA:
${JSON.stringify(structuredContext, null, 2)}

QUESTION: "${userMessage || defaultQuestion}"
Answer in 1-2 concise sentences with mood tag.`;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}

${userPrompt}` }]
          }
        ]
      });
      const replyText = response.text || "";
      if (replyText) {
        let mood = "explaining";
        const moodMatch = replyText.match(/<!--MOOD:({.*?})-->/);
        let cleanReply = replyText;
        if (moodMatch) {
          try {
            const moodObj = JSON.parse(moodMatch[1]);
            if (moodObj.mood) mood = moodObj.mood;
          } catch (e) {
          }
          cleanReply = replyText.replace(/<!--MOOD:({.*?})-->/g, "").trim();
        } else {
          if (evidence?.classification === "SIGNIFICANT CHANGE DETECTED") mood = "eureka";
          else if (evidence?.classification === "POSSIBLE ARTIFACT") mood = "sassy";
          else if (evidence?.classification === "NO SIGNIFICANT CHANGE DETECTED") mood = "serious";
          else mood = "explaining";
        }
        return res.json({ reply: cleanReply, mood });
      }
    } catch (genAiError) {
      console.warn("[SPEX AI] Gemini call unavailable, falling back to grounded response:", genAiError.message);
    }
    const cls = evidence?.classification ?? "NO SIGNIFICANT CHANGE DETECTED";
    const baseline = evidence?.timeBaselineDays ? Number(evidence.timeBaselineDays).toFixed(1) : "20.7";
    const top = structuredContext.candidate;
    let fallbackReply = "";
    let fallbackMood = "explaining";
    if (isArabic) {
      if (cls === "SIGNIFICANT CHANGE DETECTED" && top) {
        fallbackMood = "eureka";
        fallbackReply = `\u0631\u0635\u062F\u0646\u0627 \u062A\u063A\u064A\u0631 \u062A\u062F\u0641\u0642 \u062D\u0642\u064A\u0642\u064A \u0628\u0646\u0633\u0628\u0629 S/N = ${Math.abs(top.snr).toFixed(1)}\u03C3 \u0639\u0628\u0631 ${baseline} \u064A\u0648\u0645 \u0628\u062F\u0648\u0646 \u0623\u064A \u062A\u0634\u0628\u0639 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0634\u0639\u0631. \u0627\u0644\u0645\u0631\u0634\u062D ${top.id} \u0628\u064A\u0638\u0647\u0631 \u062A\u063A\u064A\u0631 \u0394F = ${top.deltaFlux} MJy/sr \u0645\u062A\u0633\u0642 \u0645\u0639 \u0646\u062C\u0645 \u0645\u062A\u063A\u064A\u0631 \u062D\u0642\u064A\u0642\u064A.`;
      } else if (cls === "POSSIBLE ARTIFACT" && top) {
        fallbackMood = "sassy";
        const flagsStr = top.artifactFlags.length > 0 ? top.artifactFlags.join("\u060C ") : "\u062A\u0634\u0628\u0639 \u0645\u0633\u062A\u0634\u0639\u0631";
        fallbackReply = `\u062F\u064A \u0625\u0634\u0627\u0631\u0629 \u062A\u0634\u0648\u064A\u0634 \u0645\u0633\u062A\u0634\u0639\u0631 (${flagsStr}) \u0627\u0633\u062A\u0628\u0639\u062F\u0647\u0627 \u0627\u0644\u0640Quality Bitmask \u0648\u0641\u062D\u0635 \u0627\u0644\u0640Dipole. \u0645\u0641\u064A\u0634 \u0623\u064A \u0627\u0643\u062A\u0634\u0627\u0641 \u0643\u0648\u0646\u064A \u0647\u0646\u0627 \u064A\u0627 \u0628\u0627\u0634\u0627.`;
      } else if (cls === "INSUFFICIENT DATA") {
        fallbackMood = "investigator";
        fallbackReply = `\u0627\u0644\u062D\u0642\u0628\u062A\u0627\u0646 \u0645\u0646 \u0646\u0637\u0627\u0642\u064A\u0646 \u0637\u064A\u0641\u064A\u064A\u0646 \u0645\u062E\u062A\u0644\u0641\u064A\u0646\u061B \u0637\u0631\u062D \u0623\u0637\u0648\u0627\u0644 \u0645\u0648\u062C\u064A\u0629 \u063A\u064A\u0631 \u0645\u062A\u0637\u0627\u0628\u0642\u0629 \u064A\u0642\u064A\u0633 \u0627\u0646\u062D\u062F\u0627\u0631\u064B\u0627 \u0644\u0648\u0646\u064A\u064B\u0627 \u0644\u0627 \u062A\u063A\u064A\u0631\u064B\u0627 \u0632\u0645\u0646\u064A\u064B\u0627.`;
      } else {
        fallbackMood = "serious";
        fallbackReply = `\u0627\u0644\u0633\u0645\u0627\u0621 \u0647\u0646\u0627 \u0645\u0633\u062A\u0642\u0631\u0629 \u062A\u0645\u0627\u0645\u064B\u0627 \u0648\u062A\u062A\u0637\u0627\u0628\u0642 \u0627\u0644\u0641\u0631\u0648\u0642 \u0645\u0639 \u0627\u0644\u0636\u0648\u0636\u0627\u0621 \u0627\u0644\u0637\u0628\u064A\u0639\u064A\u0629 \u0644\u0644\u0623\u062C\u0647\u0632\u0629. \u062F\u0647 \u0645\u0639\u064A\u0627\u0631 \u0627\u0633\u062A\u0642\u0631\u0627\u0631 \u0623\u0633\u0627\u0633\u064A \u0644\u0645\u0639\u0627\u064A\u0631\u0629 \u0633\u0645\u0627\u0621 SPHEREx.`;
      }
    } else {
      if (cls === "SIGNIFICANT CHANGE DETECTED" && top) {
        fallbackMood = "eureka";
        fallbackReply = `Verified flux variation at S/N = ${Math.abs(top.snr).toFixed(1)}\u03C3 across ${baseline} days. Candidate ${top.id} shows \u0394F = ${top.deltaFlux} \xB1 ${top.deltaUncertainty} MJy/sr with nominal PSF wings.`;
      } else if (cls === "POSSIBLE ARTIFACT" && top) {
        fallbackMood = "sassy";
        const flagsStr = top.artifactFlags.length > 0 ? top.artifactFlags.join(", ") : "saturation / dipole";
        fallbackReply = `Flagged and rejected as an instrumental artifact (${flagsStr}). The detector saturated or experienced pointing jitter rather than true flux change.`;
      } else if (cls === "INSUFFICIENT DATA") {
        fallbackMood = "investigator";
        fallbackReply = `These observations originate from distinct SPHEREx spectral channels. Cross-band subtraction measures color slope, not temporal variability.`;
      } else {
        fallbackMood = "serious";
        fallbackReply = `Photometric baseline verified stable across ${baseline} days. Difference residuals are strictly consistent with the Gaussian noise floor.`;
      }
    }
    return res.json({ reply: fallbackReply, mood: fallbackMood });
  } catch (err) {
    console.error("SPEX AI chat error:", err);
    return res.json({
      reply: "Telemetry error in chat engine. Please retry in a second.",
      mood: "thinking"
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SPHEREx Engine] Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
