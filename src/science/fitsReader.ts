import { FITSImageData, WCSParams } from './types';

export class FITSReader {
  /**
   * Parse a raw FITS binary buffer (ArrayBuffer, Buffer, or Uint8Array)
   */
  public static parse(buffer: ArrayBuffer | Uint8Array | Buffer): FITSImageData {
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);

    let offset = 0;
    let hduIndex = 0;

    let primaryHeader: Record<string, string | number | boolean> = {};
    let scienceHeader: Record<string, string | number | boolean> = {};
    let scienceData: Float32Array | null = null;
    let varianceData: Float32Array | null = null;
    let flagsData: Int32Array | null = null;
    let width = 0;
    let height = 0;
    let bunit = 'MJy / sr';

    while (offset < uint8.length) {
      // Read 2880 byte blocks until END card
      const headerCards: Record<string, string | number | boolean> = {};
      let isEnd = false;
      let headerBytes = 0;

      while (offset + headerBytes < uint8.length) {
        const blockStart = offset + headerBytes;
        headerBytes += 2880;

        for (let i = 0; i < 2880; i += 80) {
          const cardOffset = blockStart + i;
          if (cardOffset + 80 > uint8.length) break;

          let cardStr = '';
          for (let c = 0; c < 80; c++) {
            cardStr += String.fromCharCode(uint8[cardOffset + c]);
          }

          const rawKey = cardStr.slice(0, 8).trim();
          if (rawKey === 'END') {
            isEnd = true;
            break;
          }

          if (cardStr.includes('=')) {
            const eqIdx = cardStr.indexOf('=');
            let key = cardStr.slice(0, eqIdx).trim();
            if (key.startsWith('HIERARCH ')) {
              key = key.replace('HIERARCH ', '').trim();
            }

            const remainder = cardStr.slice(eqIdx + 1);
            const slashIdx = remainder.indexOf('/');
            let valStr = (slashIdx >= 0 ? remainder.slice(0, slashIdx) : remainder).trim();

            if (valStr.startsWith("'")) {
              const lastQuote = valStr.lastIndexOf("'");
              const strVal = lastQuote > 0 ? valStr.slice(1, lastQuote).trim() : valStr.slice(1).trim();
              headerCards[key] = strVal;
            } else if (valStr === 'T') {
              headerCards[key] = true;
            } else if (valStr === 'F') {
              headerCards[key] = false;
            } else if (valStr !== '') {
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

      const bitpix = Number(headerCards['BITPIX'] || 0);
      const naxis = Number(headerCards['NAXIS'] || 0);
      const naxis1 = Number(headerCards['NAXIS1'] || 0);
      const naxis2 = Number(headerCards['NAXIS2'] || 0);
      const pcount = Number(headerCards['PCOUNT'] || 0);
      const gcount = Number(headerCards['GCOUNT'] || 1);
      const extname = String(headerCards['EXTNAME'] || '').trim().toUpperCase();

      let dataBytes = 0;
      if (naxis > 0 && naxis1 > 0) {
        let nvals = naxis1;
        if (naxis >= 2 && naxis2 > 0) nvals *= naxis2;
        const naxis3 = Number(headerCards['NAXIS3'] || 0);
        if (naxis >= 3 && naxis3 > 0) nvals *= naxis3;

        dataBytes = (Math.abs(bitpix) / 8) * (nvals + pcount) * gcount;
        const remainder = dataBytes % 2880;
        if (remainder > 0) dataBytes += 2880 - remainder;
      }

      if (hduIndex === 0) {
        primaryHeader = headerCards;
        if (naxis === 2 && naxis1 > 0 && naxis2 > 0 && !scienceData) {
          // Primary HDU contains the image
          width = naxis1;
          height = naxis2;
          scienceHeader = headerCards;
          bunit = String(headerCards['BUNIT'] || bunit).replace(/'/g, '').trim();
          scienceData = this.readFloat32Array(view, offset, naxis1 * naxis2, bitpix);
        }
      } else {
        // Multi-extension HDU
        if ((extname === 'IMAGE' || extname === 'SCI' || (!scienceData && naxis === 2)) && !scienceData) {
          width = naxis1;
          height = naxis2;
          scienceHeader = { ...primaryHeader, ...headerCards };
          bunit = String(headerCards['BUNIT'] || primaryHeader['BUNIT'] || bunit).replace(/'/g, '').trim();
          scienceData = this.readFloat32Array(view, offset, naxis1 * naxis2, bitpix);
        } else if (extname === 'VARIANCE' || extname === 'VAR' || extname === 'UNCERTAINTY' || extname === 'UNC') {
          varianceData = this.readFloat32Array(view, offset, naxis1 * naxis2, bitpix);
        } else if (extname === 'FLAGS' || extname === 'MASK' || extname === 'DQ') {
          flagsData = this.readInt32Array(view, offset, naxis1 * naxis2, bitpix);
        }
      }

      offset += dataBytes;
      hduIndex++;
    }

    if (!scienceData || width === 0 || height === 0) {
      throw new Error('FITS file does not contain a valid 2D science image array');
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
      stats,
    };
  }

  private static readFloat32Array(view: DataView, offset: number, count: number, bitpix: number): Float32Array {
    const result = new Float32Array(count);
    let ptr = offset;

    if (bitpix === -32) {
      for (let i = 0; i < count; i++) {
        if (ptr + 4 <= view.byteLength) {
          result[i] = view.getFloat32(ptr, false); // Big Endian
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

  private static readInt32Array(view: DataView, offset: number, count: number, bitpix: number): Int32Array {
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

  public static parseWCS(header: Record<string, string | number | boolean>, width: number, height: number): WCSParams {
    const crval1 = Number(header['CRVAL1'] ?? 0);
    const crval2 = Number(header['CRVAL2'] ?? 0);
    const crpix1 = Number(header['CRPIX1'] ?? width / 2);
    const crpix2 = Number(header['CRPIX2'] ?? height / 2);
    const cdelt1 = Number(header['CDELT1'] ?? 1.0);
    const cdelt2 = Number(header['CDELT2'] ?? 1.0);

    let cd1_1 = 0;
    let cd1_2 = 0;
    let cd2_1 = 0;
    let cd2_2 = 0;

    if (header['CD1_1'] !== undefined || header['CD2_2'] !== undefined) {
      cd1_1 = Number(header['CD1_1'] ?? 0);
      cd1_2 = Number(header['CD1_2'] ?? 0);
      cd2_1 = Number(header['CD2_1'] ?? 0);
      cd2_2 = Number(header['CD2_2'] ?? 0);
    } else if (header['PC1_1'] !== undefined || header['PC2_2'] !== undefined) {
      cd1_1 = cdelt1 * Number(header['PC1_1'] ?? 1);
      cd1_2 = cdelt1 * Number(header['PC1_2'] ?? 0);
      cd2_1 = cdelt2 * Number(header['PC2_1'] ?? 0);
      cd2_2 = cdelt2 * Number(header['PC2_2'] ?? 1);
    } else {
      cd1_1 = cdelt1;
      cd1_2 = 0;
      cd2_1 = 0;
      cd2_2 = cdelt2;
    }

    const ctype1 = String(header['CTYPE1'] ?? 'RA---TAN');
    const ctype2 = String(header['CTYPE2'] ?? 'DEC--TAN');
    const equinox = Number(header['EQUINOX'] ?? 2000.0);
    const radesys = String(header['RADESYS'] ?? 'ICRS');

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
      pixelScaleArcsec,
    };
  }

  public static computeStatistics(data: Float32Array, flags: Int32Array | null): FITSImageData['stats'] {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let validCount = 0;

    const validValues: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (Number.isFinite(v)) {
        if (!flags || (flags[i] & 0x01) === 0) { // filter bad pixels if flagged
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

    // Variance & Std Dev
    let varSum = 0;
    for (let i = 0; i < validValues.length; i++) {
      const diff = validValues[i] - mean;
      varSum += diff * diff;
    }
    const std = Math.sqrt(varSum / validCount);

    // Median
    validValues.sort((a, b) => a - b);
    const mid = Math.floor(validValues.length / 2);
    const median = validValues.length % 2 !== 0 ? validValues[mid] : (validValues[mid - 1] + validValues[mid]) / 2;

    // Robust noise from Median Absolute Deviation (MAD): sigma_MAD = 1.4826 * median(|x - median|)
    const diffs: number[] = new Array(validValues.length);
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
      robustNoise: robustNoise > 0 ? robustNoise : std,
    };
  }
}
