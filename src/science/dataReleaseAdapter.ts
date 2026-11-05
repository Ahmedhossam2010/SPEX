import { FITSImageData, WCSParams, DatasetSourceType, ReleaseValidationReport } from './types';
import { FITSReader } from './fitsReader';
import { WCS } from './wcs';

/**
 * Flexible Data Release Adapter:
 * Prepared for the upcoming Official NASA Space Apps Challenge Dataset Release (Nov 13).
 *
 * Designed to ingest, validate, and normalize arbitrary astronomical FITS files
 * without hardcoding file structures, extension indices, or NEP-only footprints.
 */
export interface IngestionFileCandidate {
  fileName: string;
  buffer: Buffer | ArrayBuffer;
  sourceType: DatasetSourceType;
  releaseId?: string;
}

export interface NormalizedObservationFile {
  obsId: string;
  sourceType: DatasetSourceType;
  releaseId: string;
  fileName: string;
  timestampUtc: string;
  mjd: number;
  wavelengthUm: number;
  bandName: string;
  imageData: FITSImageData;
  hasNativeVariance: boolean;
  hasNativeFlags: boolean;
  wcsFootprint: {
    raMin: number;
    raMax: number;
    decMin: number;
    decMax: number;
  };
}

export class DataReleaseAdapter {
  public static readonly VERSION = '2.5.0-release-ready';

  /**
   * Inspect and normalize an incoming FITS file buffer from either
   * DEVELOPMENT_BENCHMARK or the upcoming OFFICIAL_CHALLENGE_RELEASE.
   */
  public static normalizeFITS(input: IngestionFileCandidate): NormalizedObservationFile {
    const rawBuffer = Buffer.isBuffer(input.buffer) ? input.buffer : Buffer.from(input.buffer as ArrayBuffer);
    const parsed = FITSReader.parse(rawBuffer);

    const hdr = parsed.header || {};

    // Extract observation timestamp with fallbacks
    let timestampUtc = (hdr['DATE-OBS'] as string) || (hdr['DATE'] as string) || new Date().toISOString();
    let mjd = typeof hdr['MJD-OBS'] === 'number' ? hdr['MJD-OBS'] : parseFloat(hdr['MJD-OBS'] as string);
    if (!Number.isFinite(mjd)) {
      const parsedTime = Date.parse(timestampUtc);
      mjd = Number.isFinite(parsedTime) ? 40587 + parsedTime / 86400000 : 60800.0;
    }

    // Extract observation identifier
    const obsId =
      (hdr['OBSID'] as string) ||
      (hdr['OBS_ID'] as string) ||
      (hdr['OBJECT'] as string) ||
      input.fileName.replace(/\.fits(\.gz)?$/i, '');

    // Extract spectral metadata
    let wavelengthUm = 0.93;
    if (typeof hdr['WAVELEN'] === 'number') wavelengthUm = hdr['WAVELEN'];
    else if (typeof hdr['WAVELENGTH'] === 'number') wavelengthUm = hdr['WAVELENGTH'];
    else if (typeof hdr['LAMBDA'] === 'number') wavelengthUm = hdr['LAMBDA'];

    const bandName =
      (hdr['FILTER'] as string) ||
      (hdr['BAND'] as string) ||
      `Band (${wavelengthUm.toFixed(2)} µm)`;

    // Scientifically safe handling of missing variance extension
    let hasNativeVariance = parsed.variance !== null;
    let varianceArray = parsed.variance;
    if (!varianceArray) {
      // If the incoming official release doesn't provide a VARIANCE extension,
      // derive the robust Gaussian background noise floor from MAD
      const sigmaBg = parsed.stats.robustNoise || 0.5;
      const defaultVar = sigmaBg * sigmaBg;
      varianceArray = new Float32Array(parsed.width * parsed.height).fill(defaultVar);
    }

    const hasNativeFlags = parsed.flags !== null;
    const flagsArray = parsed.flags || new Int32Array(parsed.width * parsed.height).fill(0);

    const normalizedData: FITSImageData = {
      ...parsed,
      variance: varianceArray,
      flags: flagsArray,
    };

    // Compute exact WCS 4-corner footprint
    const w = parsed.width;
    const h = parsed.height;
    const c1 = WCS.pixToSky(0, 0, parsed.wcs);
    const c2 = WCS.pixToSky(w - 1, 0, parsed.wcs);
    const c3 = WCS.pixToSky(w - 1, h - 1, parsed.wcs);
    const c4 = WCS.pixToSky(0, h - 1, parsed.wcs);

    const raCorners = [c1.ra, c2.ra, c3.ra, c4.ra];
    const decCorners = [c1.dec, c2.dec, c3.dec, c4.dec];

    const footprint = {
      raMin: Math.min(...raCorners),
      raMax: Math.max(...raCorners),
      decMin: Math.min(...decCorners),
      decMax: Math.max(...decCorners),
    };

    return {
      obsId,
      sourceType: input.sourceType,
      releaseId: input.releaseId || (input.sourceType === 'OFFICIAL_CHALLENGE_RELEASE' ? 'RELEASE_2026_OFFICIAL' : 'QR2_DEVELOPMENT'),
      fileName: input.fileName,
      timestampUtc,
      mjd,
      wavelengthUm,
      bandName,
      imageData: normalizedData,
      hasNativeVariance,
      hasNativeFlags,
      wcsFootprint: footprint,
    };
  }

  /**
   * Run comprehensive automated inspection on an imported dataset bundle.
   * Produces a clean validation docket verifying readiness for the science pipeline.
   */
  public static validateDatasetRelease(
    files: IngestionFileCandidate[],
    declaredSource: DatasetSourceType
  ): ReleaseValidationReport {
    const issues: string[] = [];
    let validFilesCount = 0;
    let invalidFilesCount = 0;
    let hasVariance = true;
    let hasFlags = true;
    let wcsValid = true;

    const detectedEpochs: Array<{ obsId: string; mjd: number; date: string; wavelengthUm?: number }> = [];
    const detectedBands: Set<string> = new Set();

    let minRa = 360, maxRa = 0, minDec = 90, maxDec = -90;

    for (const f of files) {
      try {
        const norm = this.normalizeFITS(f);
        validFilesCount++;

        if (!norm.hasNativeVariance) {
          hasVariance = false;
          issues.push(`File ${f.fileName} lacks a native VARIANCE HDU; safe noise-floor estimation applied.`);
        }
        if (!norm.hasNativeFlags) {
          hasFlags = false;
          issues.push(`File ${f.fileName} lacks a FLAGS/DQ HDU; unmasked analysis applied.`);
        }

        if (isNaN(norm.imageData.wcs.crval1) || isNaN(norm.imageData.wcs.pixelScaleArcsec)) {
          wcsValid = false;
          issues.push(`File ${f.fileName} has incomplete or invalid WCS astrometry.`);
        }

        minRa = Math.min(minRa, norm.wcsFootprint.raMin);
        maxRa = Math.max(maxRa, norm.wcsFootprint.raMax);
        minDec = Math.min(minDec, norm.wcsFootprint.decMin);
        maxDec = Math.max(maxDec, norm.wcsFootprint.decMax);

        detectedEpochs.push({
          obsId: norm.obsId,
          mjd: norm.mjd,
          date: norm.timestampUtc,
          wavelengthUm: norm.wavelengthUm,
        });

        detectedBands.add(norm.bandName);
      } catch (err: any) {
        invalidFilesCount++;
        issues.push(`File ${f.fileName} failed ingestion: ${err.message}`);
      }
    }

    // Sort epochs chronologically
    detectedEpochs.sort((a, b) => a.mjd - b.mjd);

    // Calculate dynamic spherical area
    const deltaRaDeg = Math.max(0, maxRa - minRa);
    const d1Rad = (minDec * Math.PI) / 180;
    const d2Rad = (maxDec * Math.PI) / 180;
    const deltaSinDec = Math.abs(Math.sin(d2Rad) - Math.sin(d1Rad));
    const areaSqDeg = Number((deltaRaDeg * (180 / Math.PI) * deltaSinDec).toFixed(3));

    let status: 'READY' | 'WARNINGS' | 'INCOMPATIBLE' = 'READY';
    if (invalidFilesCount > 0 || !wcsValid || validFilesCount < 2) {
      status = 'INCOMPATIBLE';
    } else if (issues.length > 0) {
      status = 'WARNINGS';
    }

    return {
      timestamp: new Date().toISOString(),
      datasetSource: declaredSource,
      releaseId: declaredSource === 'OFFICIAL_CHALLENGE_RELEASE' ? 'RELEASE_2026_OFFICIAL' : 'QR2_DEVELOPMENT',
      filesInspected: files.length,
      validFilesCount,
      invalidFilesCount,
      wcsValid,
      varianceExtensionPresent: hasVariance,
      flagsExtensionPresent: hasFlags,
      derivedFootprint: {
        raMin: minRa,
        raMax: maxRa,
        decMin: minDec,
        decMax: maxDec,
        areaSqDeg,
      },
      detectedEpochs,
      detectedBands: Array.from(detectedBands),
      issues,
      status,
    };
  }
}
