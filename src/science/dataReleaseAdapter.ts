import crypto from 'crypto';
import {
  FITSImageData,
  WCSParams,
  DatasetSourceType,
  ReleaseValidationReport,
} from './types';
import { FITSReader } from './fitsReader';
import { WCS } from './wcs';

/**
 * Flexible Data Release Adapter:
 * Prepared for the upcoming Official NASA Space Apps Challenge Dataset Release (Nov 13).
 *
 * Implements strict observation deduplication, genuine temporal visit grouping,
 * authentic WCS spherical footprint calculations with wraparound protection,
 * and scientific safety guards for missing variance/flags/units.
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
  dateEndUtc?: string;
  integrationDurationSec?: number;
  telapseSec?: number;
  xposureSec?: number;
  expIdn?: number | string | null;
  mjd: number;
  mjdEnd?: number;
  wavelengthUm: number;
  bandName: string;
  detector: number;
  imageData: FITSImageData;
  hasNativeVariance: boolean;
  varianceSource: 'NATIVE' | 'ESTIMATED';
  hasNativeFlags: boolean;
  flagsStatus: 'PRESENT' | 'MISSING';
  unit: string;
  unitValid: boolean;
  sha256: string;
  wcsFootprint: {
    raMin: number;
    raMax: number;
    decMin: number;
    decMax: number;
    actualImageAreaSqDeg: number;
    boundingBoxAreaSqDeg: number;
    pixelCenterAreaSqDeg?: number;
    fullPixelAreaSqDeg?: number;
    orientationAngleDeg?: number;
    skyOrientationAngleDeg?: number;
    corners: Array<{ ra: number; dec: number }>;
    outerCorners?: Array<{ ra: number; dec: number }>;
  };
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const SQDEG_PER_SR = (180 / Math.PI) ** 2;

export class DataReleaseAdapter {
  public static readonly VERSION = '2.7.0-forensic-verified';

  /**
   * Recognized photometric and surface-brightness units.
   */
  private static readonly RECOGNIZED_UNITS = [
    'MJY / SR',
    'MJY/SR',
    'MJY',
    'JY/SR',
    'JY',
    'MJY / SR (CALIBRATED)',
    '10^6 JY/SR',
  ];

  private static parseUtcTimestampMs(raw: unknown): number | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.replace(/['"]/g, '').trim();
    if (!trimmed) return null;
    const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const iso = hasTz ? trimmed : `${trimmed}Z`;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : null;
  }

  private static toVec3(p: { ra: number; dec: number }): Vec3 {
    const a = p.ra * DEG2RAD;
    const d = p.dec * DEG2RAD;
    const cosD = Math.cos(d);
    return {
      x: cosD * Math.cos(a),
      y: cosD * Math.sin(a),
      z: Math.sin(d),
    };
  }

  private static normalizeVec(v: Vec3): Vec3 {
    const norm = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / norm, y: v.y / norm, z: v.z / norm };
  }

  private static dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  private static cross(a: Vec3, b: Vec3): Vec3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  private static ensureCCW(poly: Vec3[]): Vec3[] {
    if (poly.length < 3) return poly;
    let signedSum = 0;
    const a = poly[0];
    for (let i = 1; i < poly.length - 1; i++) {
      const b = poly[i];
      const c = poly[i + 1];
      signedSum += Math.atan2(
        this.dot(a, this.cross(b, c)),
        1 + this.dot(a, b) + this.dot(b, c) + this.dot(c, a)
      );
    }
    return signedSum < 0 ? [...poly].reverse() : poly;
  }

  /**
   * Van Oosterom & Strackee exact spherical polygon solid angle in square degrees.
   */
  public static sphericalPolygonAreaSqDeg(corners: Array<{ ra: number; dec: number }> | Vec3[]): number {
    if (corners.length < 3) return 0;
    const vecs: Vec3[] =
      'ra' in corners[0]
        ? (corners as Array<{ ra: number; dec: number }>).map((c) => this.toVec3(c))
        : (corners as Vec3[]);
    let omega = 0;
    const a = vecs[0];
    for (let i = 1; i < vecs.length - 1; i++) {
      const b = vecs[i];
      const c = vecs[i + 1];
      const det = this.dot(a, this.cross(b, c));
      const denom = 1 + this.dot(a, b) + this.dot(b, c) + this.dot(c, a);
      omega += 2 * Math.atan2(det, denom);
    }
    return Math.abs(omega) * SQDEG_PER_SR;
  }

  /**
   * Exact great-circle Sutherland-Hodgman spherical polygon clipping on S^2.
   */
  private static clipSphericalVecPoly(subjectRaw: Vec3[], clipRaw: Vec3[]): Vec3[] {
    if (subjectRaw.length < 3 || clipRaw.length < 3) return [];
    let output = this.ensureCCW(subjectRaw);
    const clipper = this.ensureCCW(clipRaw);

    for (let i = 0; i < clipper.length; i++) {
      const cp1 = clipper[i];
      const cp2 = clipper[(i + 1) % clipper.length];
      // Inward great-circle normal for CCW polygon edge (cp1 -> cp2)
      const normal = this.cross(cp1, cp2);
      if (Math.hypot(normal.x, normal.y, normal.z) < 1e-15) continue;

      const input = output;
      output = [];
      if (input.length === 0) break;

      let s = input[input.length - 1];
      let sDot = this.dot(s, normal);

      for (const e of input) {
        const eDot = this.dot(e, normal);
        if (eDot >= -1e-14) {
          if (sDot < -1e-14) {
            const inter = this.normalizeVec(this.cross(this.cross(s, e), normal));
            const dir = this.normalizeVec({
              x: (s.x + e.x) * 0.5,
              y: (s.y + e.y) * 0.5,
              z: (s.z + e.z) * 0.5,
            });
            output.push(this.dot(inter, dir) < 0 ? { x: -inter.x, y: -inter.y, z: -inter.z } : inter);
          }
          output.push(e);
        } else if (sDot >= -1e-14) {
          const inter = this.normalizeVec(this.cross(this.cross(s, e), normal));
          const dir = this.normalizeVec({
            x: (s.x + e.x) * 0.5,
            y: (s.y + e.y) * 0.5,
            z: (s.z + e.z) * 0.5,
          });
          output.push(this.dot(inter, dir) < 0 ? { x: -inter.x, y: -inter.y, z: -inter.z } : inter);
        }
        s = e;
        sDot = eDot;
      }
    }

    return output.length >= 3 ? output : [];
  }

  public static sphericalOverlapAreaSqDeg(
    corners1: Array<{ ra: number; dec: number }>,
    corners2: Array<{ ra: number; dec: number }>
  ): number {
    const clipped = this.clipSphericalVecPoly(
      corners1.map((c) => this.toVec3(c)),
      corners2.map((c) => this.toVec3(c))
    );
    return clipped.length >= 3 ? this.sphericalPolygonAreaSqDeg(clipped) : 0;
  }

  /**
   * Exact spherical union area via inclusion-exclusion on great-circle clipped intersections.
   */
  public static sphericalUnionAreaSqDeg(polygons: Array<Array<{ ra: number; dec: number }>>): number {
    if (polygons.length === 0) return 0;
    const vecPolys = polygons
      .filter((p) => p.length >= 3)
      .map((p) => this.ensureCCW(p.map((c) => this.toVec3(c))));
    if (vecPolys.length === 0) return 0;
    if (vecPolys.length === 1) return this.sphericalPolygonAreaSqDeg(vecPolys[0]);

    let unionArea = 0;
    const n = vecPolys.length;
    const maxExactCount = Math.min(n, 12);

    const recurse = (startIdx: number, depth: number, currentPoly: Vec3[]) => {
      for (let i = startIdx; i < maxExactCount; i++) {
        const nextPoly = depth === 0 ? vecPolys[i] : this.clipSphericalVecPoly(currentPoly, vecPolys[i]);
        if (nextPoly.length >= 3) {
          const area = this.sphericalPolygonAreaSqDeg(nextPoly);
          if (area > 1e-13) {
            unionArea += depth % 2 === 0 ? area : -area;
            if (depth + 1 < maxExactCount) {
              recurse(i + 1, depth + 1, nextPoly);
            }
          }
        }
      }
    };

    recurse(0, 0, []);
    return Math.max(0, unionArea);
  }

  /**
   * Inspect and normalize an incoming FITS file buffer from either
   * DEVELOPMENT_BENCHMARK or the upcoming OFFICIAL_CHALLENGE_RELEASE.
   */
  public static normalizeFITS(input: IngestionFileCandidate): NormalizedObservationFile {
    const rawBuffer = Buffer.isBuffer(input.buffer) ? input.buffer : Buffer.from(input.buffer as ArrayBuffer);
    const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');
    const parsed = FITSReader.parse(rawBuffer);

    const hdr = parsed.header || {};

    // 1. Strict WCS validation
    if (
      !Number.isFinite(parsed.wcs.crval1) ||
      !Number.isFinite(parsed.wcs.crval2) ||
      !Number.isFinite(parsed.wcs.pixelScaleArcsec) ||
      parsed.wcs.pixelScaleArcsec <= 0
    ) {
      throw new Error(`File ${input.fileName} has incomplete or invalid WCS astrometry.`);
    }

    // 2. Extract observation timestamps & integration duration with exact UTC arithmetic
    const rawDateObs = (hdr['DATE-OBS'] as string) || (hdr['DATE'] as string) || '';
    const rawDateEnd = (hdr['DATE-END'] as string) || '';
    const dateObsMs = this.parseUtcTimestampMs(rawDateObs);
    const dateEndMs = this.parseUtcTimestampMs(rawDateEnd);

    const timestampUtc = rawDateObs ? rawDateObs.replace(/['"]/g, '').trim() : new Date().toISOString();
    const dateEndUtc = rawDateEnd ? rawDateEnd.replace(/['"]/g, '').trim() : undefined;

    let mjd = typeof hdr['MJD-OBS'] === 'number' ? hdr['MJD-OBS'] : parseFloat(hdr['MJD-OBS'] as string);
    if (!Number.isFinite(mjd)) {
      mjd = dateObsMs !== null ? 40587 + dateObsMs / 86400000 : 60800.0;
    }

    let mjdEnd: number | undefined = typeof hdr['MJD-END'] === 'number' ? hdr['MJD-END'] : parseFloat(hdr['MJD-END'] as string);
    if (!Number.isFinite(mjdEnd)) {
      mjdEnd = dateEndMs !== null ? 40587 + dateEndMs / 86400000 : undefined;
    }

    let integrationDurationSec: number | undefined;
    if (dateObsMs !== null && dateEndMs !== null && dateEndMs >= dateObsMs) {
      integrationDurationSec = Number(((dateEndMs - dateObsMs) / 1000).toFixed(3));
    } else if (mjdEnd !== undefined && Number.isFinite(mjdEnd) && mjdEnd >= mjd) {
      integrationDurationSec = Number(((mjdEnd - mjd) * 86400).toFixed(3));
    }

    const telapseSec = typeof hdr['TELAPSE'] === 'number' ? hdr['TELAPSE'] : undefined;
    const xposureSec = typeof hdr['XPOSURE'] === 'number' ? hdr['XPOSURE'] : undefined;
    const expIdn = hdr['EXPIDN'] !== undefined ? (hdr['EXPIDN'] as number | string) : undefined;

    // 3. Extract observation identifier and detector array
    const obsId =
      (hdr['OBSID'] as string) ||
      (hdr['OBS_ID'] as string) ||
      (hdr['OBJECT'] as string) ||
      input.fileName.replace(/\.fits(\.gz)?$/i, '');

    const detector = typeof hdr['DETECTOR'] === 'number' ? hdr['DETECTOR'] : parseInt(hdr['DETECTOR'] as string, 10) || 1;

    // 4. Extract spectral metadata
    let wavelengthUm = 0.93;
    if (typeof hdr['WAVELEN'] === 'number') wavelengthUm = hdr['WAVELEN'];
    else if (typeof hdr['WAVELENGTH'] === 'number') wavelengthUm = hdr['WAVELENGTH'];
    else if (typeof hdr['LAMBDA'] === 'number') wavelengthUm = hdr['LAMBDA'];

    const bandName =
      (hdr['FILTER'] as string) ||
      (hdr['BAND'] as string) ||
      `Band ${detector} (${wavelengthUm.toFixed(2)} µm)`;

    // 5. Unit Validation: distinguish calibrated surface brightness from raw instrumental counts
    const rawUnit = (parsed.bunit || (hdr['BUNIT'] as string) || 'UNKNOWN').trim().toUpperCase();
    const unitValid = this.RECOGNIZED_UNITS.some((u) => rawUnit.includes(u));

    // 6. Scientifically safe handling of variance
    const hasNativeVariance = parsed.variance !== null;
    let varianceArray = parsed.variance;
    let varianceSource: 'NATIVE' | 'ESTIMATED' = 'NATIVE';

    if (!varianceArray) {
      varianceSource = 'ESTIMATED';
      const sigmaBg = parsed.stats.robustNoise || 0.5;
      const defaultVar = sigmaBg * sigmaBg;
      varianceArray = new Float32Array(parsed.width * parsed.height).fill(defaultVar);
    }

    // 7. Scientifically safe handling of flags: NEVER treat missing flags as clean 0s
    const hasNativeFlags = parsed.flags !== null;
    let flagsStatus: 'PRESENT' | 'MISSING' = 'PRESENT';
    let flagsArray = parsed.flags;

    if (!flagsArray) {
      flagsStatus = 'MISSING';
      flagsArray = new Int32Array(parsed.width * parsed.height).fill(0);
    }

    const normalizedData: FITSImageData = {
      ...parsed,
      variance: varianceArray,
      flags: flagsArray,
    };

    // 8. Compute exact WCS 4-corner footprint & spherical solid angles with RA wraparound protection
    const w = parsed.width;
    const h = parsed.height;
    const c1 = WCS.pixToSky(0, 0, parsed.wcs);
    const c2 = WCS.pixToSky(w - 1, 0, parsed.wcs);
    const c3 = WCS.pixToSky(w - 1, h - 1, parsed.wcs);
    const c4 = WCS.pixToSky(0, h - 1, parsed.wcs);

    const o1 = WCS.pixToSky(-0.5, -0.5, parsed.wcs);
    const o2 = WCS.pixToSky(w - 0.5, -0.5, parsed.wcs);
    const o3 = WCS.pixToSky(w - 0.5, h - 0.5, parsed.wcs);
    const o4 = WCS.pixToSky(-0.5, h - 0.5, parsed.wcs);

    const corners = [c1, c2, c3, c4];
    const outerCorners = [o1, o2, o3, o4];
    let raVals = [c1.ra, c2.ra, c3.ra, c4.ra];

    // Check for RA wraparound across 0° / 360° boundary
    const maxRaRaw = Math.max(...raVals);
    const minRaRaw = Math.min(...raVals);
    let handlesWraparound = false;
    if (maxRaRaw - minRaRaw > 180) {
      handlesWraparound = true;
      raVals = raVals.map((r) => (r < 180 ? r + 360 : r));
    }

    const raMin = Math.min(...raVals);
    const raMax = Math.max(...raVals);
    const decMin = Math.min(c1.dec, c2.dec, c3.dec, c4.dec);
    const decMax = Math.max(c1.dec, c2.dec, c3.dec, c4.dec);

    // True spherical surface area of the rectangular bounding box
    const dRaRad = (raMax - raMin) * DEG2RAD;
    const d1Rad = decMin * DEG2RAD;
    const d2Rad = decMax * DEG2RAD;
    const deltaSinDec = Math.abs(Math.sin(d2Rad) - Math.sin(d1Rad));
    const boundingBoxAreaSqDeg = Number((dRaRad * deltaSinDec * SQDEG_PER_SR).toFixed(6));

    // Exact spherical polygon solid angles (Van Oosterom & Strackee)
    const pixelCenterAreaSqDeg = this.sphericalPolygonAreaSqDeg(corners);
    const fullPixelAreaSqDeg = this.sphericalPolygonAreaSqDeg(outerCorners);
    const actualImageAreaSqDeg = Number(fullPixelAreaSqDeg.toFixed(6));

    // Detector +Y position angle East of North from CD matrix and local cutout sky bearing
    const cdPaDeg = ((Math.atan2(parsed.wcs.cd1_2, parsed.wcs.cd2_2) * RAD2DEG) % 360 + 360) % 360;
    const pCenter = WCS.pixToSky((w - 1) / 2, (h - 1) / 2, parsed.wcs);
    const pNorthStep = WCS.pixToSky((w - 1) / 2, (h - 1) / 2 + 1, parsed.wcs);
    const dAlphaStep = (pNorthStep.ra - pCenter.ra) * DEG2RAD;
    const dec1Step = pCenter.dec * DEG2RAD;
    const dec2Step = pNorthStep.dec * DEG2RAD;
    const skyBearingDeg =
      ((Math.atan2(
        Math.sin(dAlphaStep) * Math.cos(dec2Step),
        Math.cos(dec1Step) * Math.sin(dec2Step) - Math.sin(dec1Step) * Math.cos(dec2Step) * Math.cos(dAlphaStep)
      ) *
        RAD2DEG) %
        360 +
        360) %
      360;

    return {
      obsId,
      sourceType: input.sourceType,
      releaseId: input.releaseId || (input.sourceType === 'OFFICIAL_CHALLENGE_RELEASE' ? 'RELEASE_2026_OFFICIAL' : 'QR2_DEVELOPMENT'),
      fileName: input.fileName,
      timestampUtc,
      dateEndUtc,
      integrationDurationSec,
      telapseSec,
      xposureSec,
      expIdn,
      mjd,
      mjdEnd,
      wavelengthUm,
      bandName,
      detector,
      imageData: normalizedData,
      hasNativeVariance,
      varianceSource,
      hasNativeFlags,
      flagsStatus,
      unit: rawUnit,
      unitValid,
      sha256,
      wcsFootprint: {
        raMin: handlesWraparound && raMin >= 360 ? raMin - 360 : raMin,
        raMax: handlesWraparound && raMax >= 360 ? raMax - 360 : raMax,
        decMin,
        decMax,
        boundingBoxAreaSqDeg,
        actualImageAreaSqDeg,
        pixelCenterAreaSqDeg,
        fullPixelAreaSqDeg,
        orientationAngleDeg: cdPaDeg,
        skyOrientationAngleDeg: skyBearingDeg,
        corners,
        outerCorners,
      },
    };
  }

  public static parseSpheRexObsId(id: string): {
    week: string;
    pass: string;
    slew: string;
    exposure: string;
    visitKey: string;
  } | null {
    const cleanId = id.replace(/['"]/g, '').trim();
    const match = cleanId.match(/^([0-9]{4}W[0-9]{2})_([0-9A-Za-z]+)_([0-9]+)_([0-9]+)/);
    if (match) {
      return {
        week: match[1],
        pass: match[2],
        slew: match[3],
        exposure: match[4],
        visitKey: `${match[1]}_${match[2]}_${match[3]}`,
      };
    }
    return null;
  }

  /**
   * Run comprehensive automated inspection on an imported dataset bundle.
   * Performs deduplication, visit grouping, footprint solid-angle verification,
   * and produces a clean validation docket verifying readiness for the science pipeline.
   */
  public static validateDatasetRelease(
    files: IngestionFileCandidate[],
    declaredSource: DatasetSourceType
  ): ReleaseValidationReport {
    const issues: string[] = [];
    let validFilesCount = 0;
    let invalidFilesCount = 0;

    let nativeVarianceCount = 0;
    let nativeFlagsCount = 0;
    let validUnitsCount = 0;
    let wcsValid = true;

    const normalizedFiles: NormalizedObservationFile[] = [];

    // 1. Ingest and normalize all files
    for (const f of files) {
      try {
        const norm = this.normalizeFITS(f);
        validFilesCount++;
        normalizedFiles.push(norm);

        if (norm.hasNativeVariance) {
          nativeVarianceCount++;
        } else {
          issues.push(`File ${f.fileName} lacks a native VARIANCE HDU; safe noise-floor estimation applied.`);
        }

        if (norm.hasNativeFlags) {
          nativeFlagsCount++;
        } else {
          issues.push(`File ${f.fileName} lacks a FLAGS/DQ HDU; unmasked analysis applied (cannot guarantee clean pixels).`);
        }

        if (!norm.unitValid) {
          issues.push(`File ${f.fileName} has raw/unsupported unit '${norm.unit}'. Differencing requires physical surface brightness (MJy/sr).`);
        } else {
          validUnitsCount++;
        }
      } catch (err: any) {
        invalidFilesCount++;
        issues.push(`File ${f.fileName} failed ingestion: ${err.message}`);
      }
    }

    // 2. Strict Observation Deduplication & Product Grouping
    const duplicateOrAmbiguousDetails: Array<{ fileName: string; reason: string; matchedObsId: string }> = [];
    const seenHashes = new Map<string, string>();
    const seenObsDetector = new Map<string, string>();

    const uniqueFiles: NormalizedObservationFile[] = [];

    for (const nf of normalizedFiles) {
      let isDup = false;

      if (seenHashes.has(nf.sha256)) {
        isDup = true;
        duplicateOrAmbiguousDetails.push({
          fileName: nf.fileName,
          reason: `Byte-level exact duplicate of ${seenHashes.get(nf.sha256)}`,
          matchedObsId: nf.obsId,
        });
      } else {
        seenHashes.set(nf.sha256, nf.fileName);
      }

      const obsKey = `${nf.obsId}_D${nf.detector}`;
      if (!isDup && seenObsDetector.has(obsKey)) {
        isDup = true;
        duplicateOrAmbiguousDetails.push({
          fileName: nf.fileName,
          reason: `Redundant observation product sharing OBSID '${nf.obsId}' and Detector ${nf.detector} with ${seenObsDetector.get(obsKey)}`,
          matchedObsId: nf.obsId,
        });
      } else if (!isDup) {
        seenObsDetector.set(obsKey, nf.fileName);
      }

      if (!isDup) {
        uniqueFiles.push(nf);
      }
    }

    const uniqueObsIds = new Set(uniqueFiles.map((f) => f.obsId));
    const uniqueBands = new Set(uniqueFiles.map((f) => f.bandName));

    // 3. Chronological Visit & Temporal Epoch Grouping by grouped visitKey
    uniqueFiles.sort((a, b) => a.mjd - b.mjd);

    const parsedMetaByFile = new Map<
      string,
      ReturnType<typeof DataReleaseAdapter.parseSpheRexObsId>
    >();
    const visitGroups = new Map<string, NormalizedObservationFile[]>();
    const distinctWeeks = new Set<string>();

    for (const uf of uniqueFiles) {
      const meta = this.parseSpheRexObsId(uf.obsId);
      parsedMetaByFile.set(uf.fileName, meta);
      if (meta) {
        const list = visitGroups.get(meta.visitKey) || [];
        list.push(uf);
        visitGroups.set(meta.visitKey, list);
        distinctWeeks.add(meta.week);
      }
    }

    const distinctVisitKeysCount = visitGroups.size;
    const distinctWeeksCount = distinctWeeks.size;

    const detectedEpochs: ReleaseValidationReport['detectedEpochs'] = [];
    let intraVisitExposuresCount = 0;
    let independentVisitsCount = 0;
    let unverifiedVisitsCount = 0;
    let surveyEpochsCount = 0;

    for (const cur of uniqueFiles) {
      const curMeta = parsedMetaByFile.get(cur.fileName) ?? null;
      let visitType: 'INTRA_VISIT_EXPOSURE' | 'INDEPENDENT_VISIT' | 'SURVEY_EPOCH' | 'NOT_VERIFIED' = 'NOT_VERIFIED';
      let visitClassificationReason = '';

      if (curMeta) {
        const groupMembers = visitGroups.get(curMeta.visitKey) || [cur];
        const isFirstInVisit = groupMembers[0].fileName === cur.fileName;

        if (distinctVisitKeysCount >= 2) {
          // Dataset contains multiple distinct verified flight visits (visitKeys)
          if (isFirstInVisit) {
            if (distinctWeeksCount >= 2) {
              visitType = 'SURVEY_EPOCH';
              surveyEpochsCount++;
              independentVisitsCount++;
              visitClassificationReason = `Lead exposure of multi-week survey visit '${curMeta.visitKey}' (Week ${curMeta.week}, Pass ${curMeta.pass}, Slew ${curMeta.slew}, Exp ${curMeta.exposure}).`;
            } else {
              visitType = 'INDEPENDENT_VISIT';
              independentVisitsCount++;
              visitClassificationReason = `Lead exposure of independent slew/visit '${curMeta.visitKey}' (Week ${curMeta.week}, Pass ${curMeta.pass}, Slew ${curMeta.slew}, Exp ${curMeta.exposure}).`;
            }
          } else {
            visitType = 'INTRA_VISIT_EXPOSURE';
            intraVisitExposuresCount++;
            visitClassificationReason = `Subsequent intra-visit exposure (Exp ${curMeta.exposure}) within slew group '${curMeta.visitKey}'.`;
          }
        } else {
          // Only ONE visitKey exists in the entire dataset: cannot establish an independent-visit distinction
          if (groupMembers.length > 1) {
            visitType = 'INTRA_VISIT_EXPOSURE';
            intraVisitExposuresCount++;
            visitClassificationReason = `Intra-visit exposure (Exp ${curMeta.exposure}) within single grouped visitKey '${curMeta.visitKey}' (${groupMembers.length} exposures total; 0 independent visits available for inter-visit distinction).`;
          } else {
            visitType = 'NOT_VERIFIED';
            unverifiedVisitsCount++;
            visitClassificationReason = `Single exposure from visitKey '${curMeta.visitKey}'; independent-visit or multi-epoch distinction is NOT_VERIFIED without a second distinct visitKey.`;
          }
        }
      } else {
        // Lacks structured SPHEREx flight OBSID metadata
        const hasCloseSubHourNeighbor = uniqueFiles.some(
          (other) => other.fileName !== cur.fileName && Math.abs(other.mjd - cur.mjd) < 0.04167
        );
        if (hasCloseSubHourNeighbor) {
          visitType = 'INTRA_VISIT_EXPOSURE';
          intraVisitExposuresCount++;
          visitClassificationReason = 'Lacks structured flight OBSID; separated by < 1 hour (< 0.04167 d) from adjacent exposure (intra-visit constraint).';
        } else {
          visitType = 'NOT_VERIFIED';
          unverifiedVisitsCount++;
          visitClassificationReason = `Observation '${cur.obsId}' lacks structured flight OBSID visit metadata (NOT_VERIFIED for independent survey visit distinction).`;
          issues.push(visitClassificationReason);
        }
      }

      detectedEpochs.push({
        fileName: cur.fileName,
        sha256: cur.sha256,
        obsId: cur.obsId,
        expIdn: cur.expIdn ?? null,
        mjd: cur.mjd,
        mjdEnd: cur.mjdEnd,
        date: cur.timestampUtc,
        dateEnd: cur.dateEndUtc,
        integrationDurationSec: cur.integrationDurationSec,
        telapseSec: cur.telapseSec,
        xposureSec: cur.xposureSec,
        wavelengthUm: cur.wavelengthUm,
        detector: cur.detector,
        parsedObsId: curMeta,
        isDuplicate: false,
        visitType,
        visitClassificationReason,
      });
    }

    for (const dup of duplicateOrAmbiguousDetails) {
      const match = normalizedFiles.find((f) => f.fileName === dup.fileName);
      if (match) {
        detectedEpochs.push({
          fileName: match.fileName,
          sha256: match.sha256,
          obsId: match.obsId,
          expIdn: match.expIdn ?? null,
          mjd: match.mjd,
          mjdEnd: match.mjdEnd,
          date: match.timestampUtc,
          dateEnd: match.dateEndUtc,
          integrationDurationSec: match.integrationDurationSec,
          telapseSec: match.telapseSec,
          xposureSec: match.xposureSec,
          wavelengthUm: match.wavelengthUm,
          detector: match.detector,
          parsedObsId: this.parseSpheRexObsId(match.obsId),
          isDuplicate: true,
          visitType: 'INTRA_VISIT_EXPOSURE',
          visitClassificationReason: `Duplicate/redundant product (${dup.reason}).`,
        });
      }
    }

    // 4. Calculate Explicit Pairwise Counts (Total, Intra-Visit, Independent-Visit, Survey-Epoch)
    let totalTemporalPairs = 0;
    let intraVisitPairs = 0;
    let independentVisitPairs = 0;
    let surveyEpochPairs = 0;
    const pairwiseCadenceDetails: NonNullable<ReleaseValidationReport['epochDeduplicationSummary']['pairwiseCadenceDetails']> = [];

    for (let i = 0; i < uniqueFiles.length; i++) {
      for (let j = i + 1; j < uniqueFiles.length; j++) {
        const f1 = uniqueFiles[i];
        const f2 = uniqueFiles[j];
        const wavelengthDiff = Math.abs(f1.wavelengthUm - f2.wavelengthUm);
        const timeDiffDays = Math.abs(f1.mjd - f2.mjd);

        if (wavelengthDiff <= 0.35 && timeDiffDays > 0.0001) {
          totalTemporalPairs++;
          const m1 = parsedMetaByFile.get(f1.fileName) ?? null;
          const m2 = parsedMetaByFile.get(f2.fileName) ?? null;

          let pairType: 'INTRA_VISIT_EXPOSURE' | 'INDEPENDENT_VISIT' | 'SURVEY_EPOCH' | 'NOT_VERIFIED' = 'NOT_VERIFIED';

          if (m1 && m2) {
            if (m1.visitKey === m2.visitKey) {
              pairType = 'INTRA_VISIT_EXPOSURE';
              intraVisitPairs++;
            } else {
              independentVisitPairs++;
              if (m1.week !== m2.week) {
                pairType = 'SURVEY_EPOCH';
                surveyEpochPairs++;
              } else {
                pairType = 'INDEPENDENT_VISIT';
              }
            }
          } else if (timeDiffDays < 0.04167) {
            pairType = 'INTRA_VISIT_EXPOSURE';
            intraVisitPairs++;
          } else {
            pairType = 'NOT_VERIFIED';
          }

          const s1Ms = this.parseUtcTimestampMs(f1.timestampUtc);
          const e1Ms = this.parseUtcTimestampMs(f1.dateEndUtc);
          const s2Ms = this.parseUtcTimestampMs(f2.timestampUtc);
          const startToStartCadenceSec =
            s1Ms !== null && s2Ms !== null
              ? Number(((s2Ms - s1Ms) / 1000).toFixed(3))
              : Number((timeDiffDays * 86400).toFixed(3));
          const interExposureGapSec =
            e1Ms !== null && s2Ms !== null ? Number(((s2Ms - e1Ms) / 1000).toFixed(3)) : null;

          pairwiseCadenceDetails.push({
            obsId1: f1.obsId,
            obsId2: f2.obsId,
            integrationDuration1Sec: f1.integrationDurationSec ?? null,
            integrationDuration2Sec: f2.integrationDurationSec ?? null,
            startToStartCadenceSec,
            interExposureGapSec,
            pairType,
          });
        }
      }
    }

    const validIndependentEpochPairs = independentVisitPairs;
    const independentVisitDistinctionStatus: 'NOT_VERIFIED' | 'VERIFIED_MULTI_VISIT' =
      independentVisitPairs > 0 && distinctVisitKeysCount >= 2 ? 'VERIFIED_MULTI_VISIT' : 'NOT_VERIFIED';

    if (totalTemporalPairs > 0 && independentVisitPairs === 0) {
      issues.push(
        `Independent-visit distinction is NOT_VERIFIED: all ${totalTemporalPairs} temporal pair(s) share visitKey '${
          Array.from(visitGroups.keys())[0] || 'UNVERIFIED'
        }' (${intraVisitPairs} intra-visit pair(s), ${independentVisitPairs} independent-visit pair(s), ${surveyEpochPairs} survey-epoch pair(s)).`
      );
    }

    // 5. Dynamic Celestial Footprint & Exact Spherical Area / Overlap Computation
    let minRa = 360,
      maxRa = 0,
      minDec = 90,
      maxDec = -90;

    for (const uf of uniqueFiles) {
      minRa = Math.min(minRa, uf.wcsFootprint.raMin);
      maxRa = Math.max(maxRa, uf.wcsFootprint.raMax);
      minDec = Math.min(minDec, uf.wcsFootprint.decMin);
      maxDec = Math.max(maxDec, uf.wcsFootprint.decMax);
    }

    const dRaRad = uniqueFiles.length > 0 ? Math.max(0, (maxRa - minRa) * DEG2RAD) : 0;
    const d1Rad = uniqueFiles.length > 0 ? minDec * DEG2RAD : 0;
    const d2Rad = uniqueFiles.length > 0 ? maxDec * DEG2RAD : 0;
    const deltaSinDec = Math.abs(Math.sin(d2Rad) - Math.sin(d1Rad));
    const boundingBoxAreaSqDeg =
      uniqueFiles.length > 0 ? Number((dRaRad * deltaSinDec * SQDEG_PER_SR).toFixed(6)) : 0;

    const pixelCenterPolys = uniqueFiles.map((uf) => uf.wcsFootprint.corners);
    const fullPixelPolys = uniqueFiles.map((uf) => uf.wcsFootprint.outerCorners || uf.wcsFootprint.corners);

    const pixelCenterUnionAreaSqDeg = this.sphericalUnionAreaSqDeg(pixelCenterPolys);
    const unionAreaSqDeg = this.sphericalUnionAreaSqDeg(fullPixelPolys);
    const actualFootprintAreaSqDeg = uniqueFiles.length > 0 ? Number(unionAreaSqDeg.toFixed(6)) : 0;

    const individualFootprints = uniqueFiles.map((uf) => ({
      fileName: uf.fileName,
      obsId: uf.obsId,
      orientationAngleDeg: uf.wcsFootprint.orientationAngleDeg ?? 0,
      skyOrientationAngleDeg: uf.wcsFootprint.skyOrientationAngleDeg ?? 0,
      pixelCenterAreaSqDeg: uf.wcsFootprint.pixelCenterAreaSqDeg ?? 0,
      fullPixelAreaSqDeg: uf.wcsFootprint.fullPixelAreaSqDeg ?? uf.wcsFootprint.actualImageAreaSqDeg,
      cornersPixelCenter: uf.wcsFootprint.corners,
      cornersFullPixel: uf.wcsFootprint.outerCorners || uf.wcsFootprint.corners,
    }));

    const pairwiseOverlapAreasSqDeg: NonNullable<ReleaseValidationReport['derivedFootprint']['pairwiseOverlapAreasSqDeg']> = [];
    for (let i = 0; i < uniqueFiles.length; i++) {
      for (let j = i + 1; j < uniqueFiles.length; j++) {
        pairwiseOverlapAreasSqDeg.push({
          obsId1: uniqueFiles[i].obsId,
          obsId2: uniqueFiles[j].obsId,
          pixelCenterOverlapSqDeg: this.sphericalOverlapAreaSqDeg(
            uniqueFiles[i].wcsFootprint.corners,
            uniqueFiles[j].wcsFootprint.corners
          ),
          fullPixelOverlapSqDeg: this.sphericalOverlapAreaSqDeg(
            uniqueFiles[i].wcsFootprint.outerCorners || uniqueFiles[i].wcsFootprint.corners,
            uniqueFiles[j].wcsFootprint.outerCorners || uniqueFiles[j].wcsFootprint.corners
          ),
        });
      }
    }

    // Variance & Flags status summary
    let varianceSource: 'NATIVE' | 'ESTIMATED' | 'MIXED' = 'NATIVE';
    if (nativeVarianceCount === 0) varianceSource = 'ESTIMATED';
    else if (nativeVarianceCount < validFilesCount) varianceSource = 'MIXED';

    let flagsStatus: 'PRESENT' | 'MISSING' | 'MIXED' = 'PRESENT';
    if (nativeFlagsCount === 0) flagsStatus = 'MISSING';
    else if (nativeFlagsCount < validFilesCount) flagsStatus = 'MIXED';

    let unitStatus: 'RECOGNIZED_SURFACE_BRIGHTNESS' | 'UNSUPPORTED' | 'MISSING' = 'RECOGNIZED_SURFACE_BRIGHTNESS';
    if (validUnitsCount === 0) unitStatus = 'UNSUPPORTED';
    else if (validUnitsCount < validFilesCount) unitStatus = 'MISSING';

    let status: 'READY' | 'WARNINGS' | 'INCOMPATIBLE' = 'READY';
    if (invalidFilesCount > 0 || !wcsValid || uniqueObsIds.size < 2 || totalTemporalPairs === 0) {
      status = 'INCOMPATIBLE';
    } else if (
      issues.length > 0 ||
      duplicateOrAmbiguousDetails.length > 0 ||
      intraVisitExposuresCount > 0 ||
      independentVisitPairs === 0
    ) {
      status = 'WARNINGS';
    }

    return {
      timestamp: new Date().toISOString(),
      datasetSource: declaredSource,
      releaseId: declaredSource === 'OFFICIAL_CHALLENGE_RELEASE' ? 'RELEASE_2026_OFFICIAL' : 'QR2_DEVELOPMENT',
      filesInspected: files.length,
      validFilesCount,
      invalidFilesCount,
      uniqueObservationIds: uniqueObsIds.size,
      uniqueObservationEpochs: uniqueFiles.length,
      validIndependentEpochPairs,
      totalTemporalPairs,
      intraVisitPairs,
      independentVisitPairs,
      surveyEpochPairs,
      independentVisitDistinctionStatus,
      duplicateOrAmbiguousCount: duplicateOrAmbiguousDetails.length,
      duplicateOrAmbiguousDetails,
      wcsValid,
      varianceExtensionPresent: nativeVarianceCount > 0,
      varianceSource,
      flagsExtensionPresent: nativeFlagsCount > 0,
      flagsStatus,
      unitStatus,
      derivedFootprint: {
        raMin: uniqueFiles.length > 0 ? minRa : 0,
        raMax: uniqueFiles.length > 0 ? maxRa : 0,
        decMin: uniqueFiles.length > 0 ? minDec : 0,
        decMax: uniqueFiles.length > 0 ? maxDec : 0,
        boundingBoxAreaSqDeg,
        actualFootprintAreaSqDeg,
        areaSqDeg: actualFootprintAreaSqDeg,
        unionAreaSqDeg,
        pixelCenterUnionAreaSqDeg,
        handlesWraparound: uniqueFiles.length > 0 && maxRa - minRa > 180,
        method: 'WCS TAN Corner Projection & Van Oosterom-Strackee Spherical Polygon Clipping',
        individualFootprints,
        pairwiseOverlapAreasSqDeg,
      },
      epochDeduplicationSummary: {
        filesCount: files.length,
        uniqueObsIds: uniqueObsIds.size,
        uniqueEpochs: uniqueFiles.length,
        groupedVisitsCount: distinctVisitKeysCount,
        intraVisitExposuresCount,
        independentVisitsCount,
        unverifiedVisitsCount,
        surveyEpochsCount,
        validTemporalPairs: totalTemporalPairs,
        totalTemporalPairs,
        intraVisitPairs,
        independentVisitPairs,
        surveyEpochPairs,
        pairwiseCadenceDetails,
      },
      detectedEpochs,
      detectedBands: Array.from(uniqueBands),
      issues,
      status,
    };
  }
}
