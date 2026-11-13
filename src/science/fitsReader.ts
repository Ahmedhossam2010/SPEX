import { FITSImageData, HDUMetadata, SIPParams, SIPTerm, WCSParams, WcsWaveTable } from './types';
import { MAX_SIP_ORDER, WCS } from './wcs';

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

    const hdus: HDUMetadata[] = [];
    let zodiData: Float32Array | null = null;
    let epsfMetadata: FITSImageData['epsfMetadata'];
    let psfMetadata: FITSImageData['psfMetadata'];
    let wcsWaveMetadata: FITSImageData['wcsWaveMetadata'];
    let rawWcsWaveTable: {
      xGrid: number[];
      yGrid: number[];
      values: number[];
      nx: number;
      ny: number;
      detector?: string;
    } | null = null;

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
            const trimmedRem = remainder.trim();

            if (trimmedRem.startsWith("'")) {
              let endQuote = 1;
              while (endQuote < trimmedRem.length) {
                if (trimmedRem[endQuote] === "'") {
                  if (trimmedRem[endQuote + 1] === "'") {
                    endQuote += 2;
                  } else {
                    break;
                  }
                } else {
                  endQuote++;
                }
              }
              const strVal = trimmedRem.slice(1, endQuote).replace(/''/g, "'").trim();
              headerCards[key] = strVal;
            } else {
              const slashIdx = remainder.indexOf('/');
              const valStr = (slashIdx >= 0 ? remainder.slice(0, slashIdx) : remainder).trim();

              if (valStr === 'T') {
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
        }
        if (isEnd) break;
      }

      offset += headerBytes;

      const bitpix = Number(headerCards['BITPIX'] || 0);
      const naxis = Number(headerCards['NAXIS'] || 0);
      const naxis1 = Number(headerCards['NAXIS1'] || 0);
      const naxis2 = Number(headerCards['NAXIS2'] || 0);
      const naxis3 = Number(headerCards['NAXIS3'] || 0);
      const pcount = Number(headerCards['PCOUNT'] || 0);
      const gcount = Number(headerCards['GCOUNT'] || 1);
      const extname = String(headerCards['EXTNAME'] || '').trim().toUpperCase();

      const shape: number[] = [];
      if (naxis >= 1 && naxis1 > 0) shape.push(naxis1);
      if (naxis >= 2 && naxis2 > 0) shape.push(naxis2);
      if (naxis >= 3 && naxis3 > 0) shape.push(naxis3);

      let dataBytes = 0;
      if (naxis > 0 && naxis1 > 0) {
        let nvals = naxis1;
        if (naxis >= 2 && naxis2 > 0) nvals *= naxis2;
        if (naxis >= 3 && naxis3 > 0) nvals *= naxis3;

        dataBytes = (Math.abs(bitpix) / 8) * (nvals + pcount) * gcount;
        const remainder = dataBytes % 2880;
        if (remainder > 0) dataBytes += 2880 - remainder;
      }

      let readStatus: HDUMetadata['readStatus'] = 'SKIPPED_NOT_NEEDED';

      if (hduIndex === 0) {
        primaryHeader = headerCards;
        readStatus = 'READ_AND_USED';
        if (naxis === 2 && naxis1 > 0 && naxis2 > 0 && !scienceData) {
          // Primary HDU contains the image
          width = naxis1;
          height = naxis2;
          scienceHeader = headerCards;
          bunit = String(headerCards['BUNIT'] || bunit).replace(/'/g, '').trim();
          scienceData = this.readFloat32Array(view, offset, naxis1 * naxis2, bitpix);
        }
      } else {
        // Multi-extension HDU keyed strictly by EXTNAME
        if ((extname === 'IMAGE' || extname === 'SCI' || (!extname && !scienceData && naxis === 2)) && !scienceData) {
          width = naxis1;
          height = naxis2;
          scienceHeader = { ...primaryHeader, ...headerCards };
          bunit = String(headerCards['BUNIT'] || primaryHeader['BUNIT'] || bunit).replace(/'/g, '').trim();
          scienceData = this.readFloat32Array(view, offset, naxis1 * naxis2, bitpix);
          readStatus = 'READ_AND_USED';
        } else if (extname === 'VARIANCE' || extname === 'VAR' || extname === 'UNCERTAINTY' || extname === 'UNC') {
          varianceData = this.readFloat32Array(view, offset, naxis1 * naxis2, bitpix);
          readStatus = 'READ_AND_USED';
        } else if (extname === 'FLAGS' || extname === 'MASK' || extname === 'DQ') {
          flagsData = this.readInt32Array(view, offset, naxis1 * naxis2, bitpix);
          readStatus = 'READ_AND_USED';
        } else if (extname === 'ZODI') {
          if (naxis === 2 && naxis1 > 0 && naxis2 > 0) {
            zodiData = this.readFloat32Array(view, offset, naxis1 * naxis2, bitpix);
          }
          readStatus = 'INGESTED_METADATA_PRESERVED';
        } else if (extname === 'EPSF' || extname === 'PSF') {
          epsfMetadata = {
            extname,
            dimensions: shape,
            is3DModel: naxis >= 3 || String(headerCards['XTENSION'] || '').toUpperCase() === 'BINTABLE',
            headerCards,
          };
          psfMetadata = {
            dimensions: shape,
            is3DModel: epsfMetadata.is3DModel,
            headerCards,
          };
          readStatus = 'INGESTED_METADATA_PRESERVED';
        } else if (extname === 'WCS-WAVE') {
          const parsedTable = this.parseWcsWaveBintable(view, offset, headerCards);
          if (parsedTable) {
            rawWcsWaveTable = parsedTable;
          }
          wcsWaveMetadata = {
            dimensions: shape,
            isTable: String(headerCards['XTENSION'] || '').toUpperCase() === 'BINTABLE' || extname === 'WCS-WAVE',
          };
          readStatus = 'READ_AND_USED';
        }
      }

      hdus.push({
        index: hduIndex,
        name: extname || (hduIndex === 0 ? 'PRIMARY' : `HDU_${hduIndex}`),
        bitpix,
        dimensions: shape,
        dataBytes,
        readStatus,
        headerSummary: headerCards,
      });

      offset += dataBytes;
      hduIndex++;
    }

    if (!scienceData || width === 0 || height === 0) {
      throw new Error('FITS file does not contain a valid 2D science image array');
    }

    const mergedHeader = { ...primaryHeader, ...scienceHeader };
    const wcs = this.parseWCS(mergedHeader, width, height);
    const stats = this.computeStatistics(scienceData, flagsData);

    // Attach full WCS-WAVE -TAB spectral lookup parameters if WCS-WAVE + W alternate WCS are present
    if (rawWcsWaveTable && wcsWaveMetadata) {
      const table = this.buildWcsWaveTable(mergedHeader, rawWcsWaveTable);
      if (table) {
        wcsWaveMetadata.table = table;
      }
    }

    const versionRaw = primaryHeader['VERSION'] ?? mergedHeader['VERSION'];
    const version = versionRaw !== undefined ? String(versionRaw).trim() : undefined;
    const releaseRaw = primaryHeader['RELEASE'] ?? mergedHeader['RELEASE'];
    const release = releaseRaw !== undefined ? String(releaseRaw).trim() : undefined;

    return {
      width,
      height,
      data: scienceData,
      variance: varianceData,
      flags: flagsData,
      bunit,
      version,
      release,
      header: mergedHeader,
      wcs,
      stats,
      hdus,
      zodi: zodiData ? { width, height, data: zodiData } : undefined,
      epsfMetadata,
      psfMetadata,
      wcsWaveMetadata,
    };
  }

  private static parseWcsWaveBintable(
    view: DataView,
    dataOffset: number,
    header: Record<string, string | number | boolean>
  ): {
    xGrid: number[];
    yGrid: number[];
    values: number[];
    nx: number;
    ny: number;
    detector?: string;
  } | null {
    const tfields = Number(header['TFIELDS'] || 0);
    const naxis2 = Number(header['NAXIS2'] || 0);
    if (tfields < 3 || naxis2 < 1) return null;

    let colOffset = 0;
    const cols: Record<string, { offset: number; repeat: number; type: string; tdim?: string }> = {};

    for (let i = 1; i <= tfields; i++) {
      const ttype = String(header[`TTYPE${i}`] || '').trim().toUpperCase();
      const tform = String(header[`TFORM${i}`] || '').trim().toUpperCase();
      const tdim = header[`TDIM${i}`] ? String(header[`TDIM${i}`]).trim() : undefined;
      const m = tform.match(/^(\d*)([A-Z])$/);
      if (!m) return null;
      const repeat = m[1] ? parseInt(m[1], 10) : 1;
      const code = m[2];
      const elemBytes =
        code === 'J' || code === 'E' ? 4 :
        code === 'D' || code === 'K' ? 8 :
        code === 'I' ? 2 :
        1;
      if (ttype) {
        cols[ttype] = { offset: colOffset, repeat, type: code, tdim };
      }
      colOffset += repeat * elemBytes;
    }

    const xCol = cols['X'];
    const yCol = cols['Y'];
    const valCol = cols['VALUES'];
    if (!xCol || !yCol || !valCol) return null;

    const readNumericCol = (col: { offset: number; repeat: number; type: string }): number[] => {
      const out: number[] = [];
      const base = dataOffset + col.offset;
      const elemBytes = col.type === 'D' || col.type === 'K' ? 8 : col.type === 'J' || col.type === 'E' ? 4 : col.type === 'I' ? 2 : 1;
      for (let k = 0; k < col.repeat; k++) {
        const ptr = base + k * elemBytes;
        if (ptr + elemBytes > view.byteLength) break;
        if (col.type === 'J') out.push(view.getInt32(ptr, false));
        else if (col.type === 'I') out.push(view.getInt16(ptr, false));
        else if (col.type === 'K') out.push(Number(view.getBigInt64(ptr, false)));
        else if (col.type === 'E') out.push(view.getFloat32(ptr, false));
        else if (col.type === 'D') out.push(view.getFloat64(ptr, false));
        else out.push(view.getUint8(ptr));
      }
      return out;
    };

    const xGrid = readNumericCol(xCol);
    const yGrid = readNumericCol(yCol);
    const values = readNumericCol(valCol);

    let nx = xGrid.length;
    let ny = yGrid.length;
    if (valCol.tdim) {
      const dm = valCol.tdim.match(/\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/);
      if (dm) {
        const d1 = parseInt(dm[2], 10);
        const d2 = parseInt(dm[3], 10);
        if (d1 > 0 && d2 > 0) {
          nx = d1;
          ny = d2;
        }
      }
    }

    if (nx < 1 || ny < 1 || values.length < 2 * nx * ny) return null;

    const detectorRaw = header['DETECTOR'] !== undefined ? String(header['DETECTOR']).trim() : undefined;
    return { xGrid, yGrid, values, nx, ny, detector: detectorRaw };
  }

  private static buildWcsWaveTable(
    header: Record<string, string | number | boolean>,
    raw: { xGrid: number[]; yGrid: number[]; values: number[]; nx: number; ny: number; detector?: string }
  ): WcsWaveTable | undefined {
    const num = (k: string, def: number): number => {
      const v = header[k];
      return typeof v === 'number' && Number.isFinite(v) ? v : def;
    };
    return {
      nx: raw.nx,
      ny: raw.ny,
      xGrid: raw.xGrid,
      yGrid: raw.yGrid,
      values: raw.values,
      crpix1W: num('CRPIX1W', 1),
      crpix2W: num('CRPIX2W', 1),
      cdelt1W: num('CDELT1W', 1),
      cdelt2W: num('CDELT2W', 1),
      crval1W: num('CRVAL1W', 1),
      crval2W: num('CRVAL2W', 1),
      waveIndex: num('PV1_3W', 1),
      bwIndex: num('PV2_3W', 2),
      detector: raw.detector,
    };
  }

  /**
   * Evaluate exact SPHEREx -TAB spectral WCS (WCS-WAVE + alternate WCS key 'W', ignoring SIP)
   * for a 0-based cutout pixel coordinate (px0, py0).
   */
  public static evaluateWaveWcs(
    table: WcsWaveTable | undefined,
    px0: number,
    py0: number
  ): { wavelengthUm: number; bandwidthUm: number } | null {
    if (!table || table.nx < 1 || table.ny < 1 || table.values.length < 2 * table.nx * table.ny) {
      return null;
    }

    // FITS pixel coordinates are 1-based; convert linearly via alternate WCS 'W' (no SIP).
    const p1 = px0 + 1;
    const p2 = py0 + 1;
    const detX = table.crval1W + table.cdelt1W * (p1 - table.crpix1W);
    const detY = table.crval2W + table.cdelt2W * (p2 - table.crpix2W);

    const findBracket = (grid: number[], val: number): { i0: number; i1: number; t: number } => {
      const n = grid.length;
      if (n === 1) return { i0: 0, i1: 0, t: 0 };
      const asc = grid[n - 1] >= grid[0];
      if ((asc && val <= grid[0]) || (!asc && val >= grid[0])) {
        return { i0: 0, i1: 1, t: 0 };
      }
      if ((asc && val >= grid[n - 1]) || (!asc && val <= grid[n - 1])) {
        return { i0: n - 2, i1: n - 1, t: 1 };
      }
      for (let i = 0; i < n - 1; i++) {
        const a = grid[i];
        const b = grid[i + 1];
        if ((asc && val >= a && val <= b) || (!asc && val <= a && val >= b)) {
          const span = b - a;
          const t = Math.abs(span) > 1e-12 ? (val - a) / span : 0;
          return { i0: i, i1: i + 1, t: Math.max(0, Math.min(1, t)) };
        }
      }
      return { i0: 0, i1: Math.min(1, n - 1), t: 0 };
    };

    const bx = findBracket(table.xGrid, detX);
    const by = findBracket(table.yGrid, detY);

    const sampleComp = (compIdx: number): number => {
      const idx00 = (by.i0 * table.nx + bx.i0) * 2 + compIdx;
      const idx10 = (by.i0 * table.nx + bx.i1) * 2 + compIdx;
      const idx01 = (by.i1 * table.nx + bx.i0) * 2 + compIdx;
      const idx11 = (by.i1 * table.nx + bx.i1) * 2 + compIdx;

      const v00 = table.values[idx00];
      const v10 = table.values[idx10];
      const v01 = table.values[idx01];
      const v11 = table.values[idx11];

      const v0 = v00 * (1 - bx.t) + v10 * bx.t;
      const v1 = v01 * (1 - bx.t) + v11 * bx.t;
      return v0 * (1 - by.t) + v1 * by.t;
    };

    const waveComp = Math.max(0, Math.min(1, (table.waveIndex || 1) - 1));
    const bwComp = Math.max(0, Math.min(1, (table.bwIndex || 2) - 1));

    const wavelengthUm = sampleComp(waveComp);
    const bandwidthUm = sampleComp(bwComp);
    if (!Number.isFinite(wavelengthUm) || wavelengthUm <= 0) return null;

    return {
      wavelengthUm: Number(wavelengthUm.toFixed(4)),
      bandwidthUm: Number((Number.isFinite(bandwidthUm) ? Math.abs(bandwidthUm) : 0).toFixed(4)),
    };
  }

  public static readonly SENTINEL_THRESHOLD = 1e10;

  private static readFloat32Array(view: DataView, offset: number, count: number, bitpix: number): Float32Array {
    const result = new Float32Array(count);
    let ptr = offset;

    if (bitpix === -32) {
      for (let i = 0; i < count; i++) {
        if (ptr + 4 <= view.byteLength) {
          const val = view.getFloat32(ptr, false); // Big Endian
          if (!Number.isFinite(val) || Math.abs(val) > FITSReader.SENTINEL_THRESHOLD) {
            result[i] = NaN;
          } else {
            result[i] = val;
          }
        }
        ptr += 4;
      }
    } else if (bitpix === -64) {
      for (let i = 0; i < count; i++) {
        if (ptr + 8 <= view.byteLength) {
          const val = Number(view.getFloat64(ptr, false));
          if (!Number.isFinite(val) || Math.abs(val) > FITSReader.SENTINEL_THRESHOLD) {
            result[i] = NaN;
          } else {
            result[i] = val;
          }
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

  private static extractSipOrder(
    header: Record<string, string | number | boolean>,
    key: string,
    required: boolean
  ): number | undefined {
    const raw = header[key];
    if (raw === undefined) {
      if (required) {
        throw new Error(`Invalid TAN-SIP WCS astrometry: missing required ${key} polynomial order keyword.`);
      }
      return undefined;
    }
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > MAX_SIP_ORDER) {
      throw new Error(
        `Invalid TAN-SIP WCS astrometry: ${key}=${String(raw)} must be an integer in [0, ${MAX_SIP_ORDER}].`
      );
    }
    return raw;
  }

  private static extractSipTerms(
    header: Record<string, string | number | boolean>,
    prefix: 'A' | 'B' | 'AP' | 'BP',
    order: number
  ): SIPTerm[] {
    const terms: SIPTerm[] = [];
    for (let p = 0; p <= order; p++) {
      for (let q = 0; q <= order - p; q++) {
        const key = `${prefix}_${p}_${q}`;
        const raw = header[key];
        if (raw !== undefined) {
          if (typeof raw !== 'number' || !Number.isFinite(raw)) {
            throw new Error(
              `Invalid TAN-SIP WCS astrometry: non-finite or non-numeric coefficient for ${key}=${String(raw)}.`
            );
          }
          if (raw !== 0) {
            terms.push({ p, q, coeff: raw });
          }
        }
      }
    }
    return terms;
  }

  public static parseWCS(header: Record<string, string | number | boolean>, width: number, height: number): WCSParams {
    const requireFiniteHeaderNum = (key: string): number => {
      const raw = header[key];
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        throw new Error(`Invalid WCS astrometry: missing or non-finite ${key} (${String(raw)}).`);
      }
      return raw;
    };

    const optionalFiniteHeaderNum = (key: string, defaultVal: number): number => {
      const raw = header[key];
      if (raw === undefined) return defaultVal;
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        throw new Error(`Invalid WCS astrometry: non-finite ${key} (${String(raw)}).`);
      }
      return raw;
    };

    const crval1 = requireFiniteHeaderNum('CRVAL1');
    const crval2 = requireFiniteHeaderNum('CRVAL2');
    if (crval2 < -90 || crval2 > 90) {
      throw new Error(`Invalid WCS astrometry: CRVAL2=${crval2} outside [-90, +90] degrees.`);
    }

    const crpix1 = optionalFiniteHeaderNum('CRPIX1', width / 2);
    const crpix2 = optionalFiniteHeaderNum('CRPIX2', height / 2);

    const hasCd =
      header['CD1_1'] !== undefined ||
      header['CD1_2'] !== undefined ||
      header['CD2_1'] !== undefined ||
      header['CD2_2'] !== undefined;
    const hasPc =
      header['PC1_1'] !== undefined ||
      header['PC1_2'] !== undefined ||
      header['PC2_1'] !== undefined ||
      header['PC2_2'] !== undefined;
    const hasCdelt = header['CDELT1'] !== undefined || header['CDELT2'] !== undefined;

    if (!hasCd && !hasPc && !hasCdelt) {
      throw new Error('Invalid WCS astrometry: missing CD, PC, or CDELT coordinate transformation keywords.');
    }

    const cdelt1 = optionalFiniteHeaderNum('CDELT1', 1.0);
    const cdelt2 = optionalFiniteHeaderNum('CDELT2', 1.0);

    let cd1_1 = 0;
    let cd1_2 = 0;
    let cd2_1 = 0;
    let cd2_2 = 0;

    if (hasCd) {
      cd1_1 = optionalFiniteHeaderNum('CD1_1', 0);
      cd1_2 = optionalFiniteHeaderNum('CD1_2', 0);
      cd2_1 = optionalFiniteHeaderNum('CD2_1', 0);
      cd2_2 = optionalFiniteHeaderNum('CD2_2', 0);
    } else if (hasPc) {
      cd1_1 = cdelt1 * optionalFiniteHeaderNum('PC1_1', 1);
      cd1_2 = cdelt1 * optionalFiniteHeaderNum('PC1_2', 0);
      cd2_1 = cdelt2 * optionalFiniteHeaderNum('PC2_1', 0);
      cd2_2 = cdelt2 * optionalFiniteHeaderNum('PC2_2', 1);
    } else {
      cd1_1 = cdelt1;
      cd1_2 = 0;
      cd2_1 = 0;
      cd2_2 = cdelt2;
    }

    if (header['CTYPE1'] !== undefined && typeof header['CTYPE1'] !== 'string') {
      throw new Error(`Invalid WCS astrometry: CTYPE1 must be a string, got ${typeof header['CTYPE1']}.`);
    }
    if (header['CTYPE2'] !== undefined && typeof header['CTYPE2'] !== 'string') {
      throw new Error(`Invalid WCS astrometry: CTYPE2 must be a string, got ${typeof header['CTYPE2']}.`);
    }
    if ((header['CTYPE1'] === undefined) !== (header['CTYPE2'] === undefined)) {
      throw new Error('Invalid WCS astrometry: CTYPE1 and CTYPE2 must both be specified or omitted together.');
    }

    const ctype1 = header['CTYPE1'] !== undefined ? String(header['CTYPE1']).trim() : 'RA---TAN';
    const ctype2 = header['CTYPE2'] !== undefined ? String(header['CTYPE2']).trim() : 'DEC--TAN';
    const isSipDeclared = ctype1.toUpperCase().endsWith('-SIP') || ctype2.toUpperCase().endsWith('-SIP');

    // Validate any present SIP keywords in the FITS header against malformed or non-numeric entries
    let sip: SIPParams | undefined;
    if (isSipDeclared) {
      const aOrder = this.extractSipOrder(header, 'A_ORDER', true)!;
      const bOrder = this.extractSipOrder(header, 'B_ORDER', true)!;
      const aTerms = this.extractSipTerms(header, 'A', aOrder);
      const bTerms = this.extractSipTerms(header, 'B', bOrder);

      const apOrder = this.extractSipOrder(header, 'AP_ORDER', false);
      const bpOrder = this.extractSipOrder(header, 'BP_ORDER', false);
      if ((apOrder !== undefined) !== (bpOrder !== undefined)) {
        throw new Error('Invalid TAN-SIP WCS astrometry: AP_ORDER and BP_ORDER must both be present if reverse polynomial is provided.');
      }

      const apTerms = apOrder !== undefined ? this.extractSipTerms(header, 'AP', apOrder) : undefined;
      const bpTerms = bpOrder !== undefined ? this.extractSipTerms(header, 'BP', bpOrder) : undefined;

      // Reject any out-of-order or malformed SIP term keywords in header
      for (const [key, val] of Object.entries(header)) {
        const m = key.match(/^(A|B|AP|BP)_(\d+)_(\d+)$/);
        if (m) {
          if (typeof val !== 'number' || !Number.isFinite(val)) {
            throw new Error(`Invalid TAN-SIP WCS astrometry: non-finite ${key}=${String(val)}.`);
          }
          const prefix = m[1] as 'A' | 'B' | 'AP' | 'BP';
          const pIdx = Number(m[2]);
          const qIdx = Number(m[3]);
          const declaredOrd =
            prefix === 'A'
              ? aOrder
              : prefix === 'B'
              ? bOrder
              : prefix === 'AP'
              ? apOrder
              : bpOrder;
          if (declaredOrd !== undefined && pIdx + qIdx > declaredOrd && val !== 0) {
            throw new Error(
              `Invalid TAN-SIP WCS astrometry: non-zero coefficient ${key}=${val} exceeds ${prefix}_ORDER=${declaredOrd}.`
            );
          }
        }
      }

      sip = {
        aOrder,
        bOrder,
        ...(apOrder !== undefined ? { apOrder } : {}),
        ...(bpOrder !== undefined ? { bpOrder } : {}),
        aTerms,
        bTerms,
        ...(apTerms !== undefined ? { apTerms } : {}),
        ...(bpTerms !== undefined ? { bpTerms } : {}),
      };
    } else if (
      header['A_ORDER'] !== undefined ||
      header['B_ORDER'] !== undefined ||
      Object.keys(header).some((k) => /^(A|B|AP|BP)_\d+_\d+$/.test(k))
    ) {
      throw new Error(
        `Invalid WCS astrometry: SIP polynomial keywords found in header with non-SIP projection CTYPE1='${ctype1}', CTYPE2='${ctype2}'.`
      );
    }

    const equinox = optionalFiniteHeaderNum('EQUINOX', 2000.0);
    const radesys = header['RADESYS'] !== undefined ? String(header['RADESYS']).trim() : 'ICRS';

    const det = Math.abs(cd1_1 * cd2_2 - cd1_2 * cd2_1);
    const pixelScaleDeg = Math.sqrt(det);
    const pixelScaleArcsec = pixelScaleDeg * 3600;

    const wcs: WCSParams = {
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
      ...(sip ? { sip } : {}),
    };

    WCS.validateWCS(wcs);
    return wcs;
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
