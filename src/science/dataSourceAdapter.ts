import { SPHEREX_DETECTOR_ARRAYS } from './spectralBands';
import { extractVisitKey } from './timeSeriesPipeline';

/**
 * Normalized Observation Row
 * Canonical internal data shape for all SPHEREx archive rows.
 */
export interface NormalizedObservationRow {
  obs_id: string;
  mjd: number;
  wavelength: number;
  band: string;
  detector: string;
  access_url: string;
  s_region?: string;
  s_ra?: number;
  s_dec?: number;
  date?: string;
  date_end?: string;
  visitKey: string;
  fits_url?: string;
  source: 'LIVE_TAP' | 'OFFLINE_FIXTURE' | 'DEMO_CACHE';
}

/**
 * Configurable Column Mapping
 * Accommodates column renames between data releases without modifying application code.
 */
export interface ColumnMapping {
  obs_id?: string;
  s_ra?: string;
  s_dec?: string;
  instrument_name?: string;
  t_min?: string;
  t_max?: string;
  mjd?: string;
  em_min?: string;
  em_max?: string;
  wavelength?: string;
  access_url?: string;
  s_region?: string;
  dataproduct_type?: string;
}

export const DEFAULT_COLUMN_MAPPING: Required<ColumnMapping> = {
  obs_id: 'obs_id',
  s_ra: 's_ra',
  s_dec: 's_dec',
  instrument_name: 'instrument_name',
  t_min: 't_min',
  t_max: 't_max',
  mjd: 'mjd',
  em_min: 'em_min',
  em_max: 'em_max',
  wavelength: 'wavelength',
  access_url: 'access_url',
  s_region: 's_region',
  dataproduct_type: 'dataproduct_type',
};

/**
 * Result of querying or mapping archive data.
 * Crucial Rule: NETWORK_ERROR is NEVER converted into ARCHIVE_ZERO_ROWS.
 */
export type DataSourceResult =
  | {
      status: 'OK';
      rows: NormalizedObservationRow[];
      count: number;
      releaseName: string;
      queryUrl: string;
      source: 'LIVE_TAP' | 'OFFLINE_FIXTURE' | 'DEMO_CACHE';
      isOffline?: boolean;
    }
  | {
      status: 'ARCHIVE_ZERO_ROWS';
      message: string;
      releaseName: string;
      queryUrl: string;
      targetCoords?: { ra: number; dec: number };
    }
  | {
      status: 'NETWORK_ERROR';
      error: string;
      statusCode?: number;
      queryUrl: string;
      canRetry: boolean;
      targetCoords?: { ra: number; dec: number };
    };

/**
 * Reads archive configuration strictly from environment variables.
 */
export function getArchiveEnv() {
  return {
    releaseName: process.env.SPHEREX_RELEASE_NAME || 'SPHEREx Quick Release 2 (QR2, Level 2B)',
    baseUrl: process.env.SPHEREX_RELEASE_BASE_URL || 'https://irsa.ipac.caltech.edu',
    tapTable: process.env.SPHEREX_TAP_TABLE || 'spherex.obscore',
    isOffline: process.env.SPHEREX_OFFLINE === '1',
  };
}

/**
 * Normalizes a detector code (e.g. "D1".."D6") and band name.
 */
export function normalizeDetectorAndBand(
  rawDetector: string | undefined,
  rawAccessUrl: string,
  rawInstrument: string | undefined
): { detector: string; band: string } {
  let det = 'D1';
  if (rawDetector && /D?[1-6]/i.test(rawDetector)) {
    const m = rawDetector.match(/([1-6])/);
    if (m) det = `D${m[1]}`;
  } else {
    const match = rawAccessUrl.match(/_([1-6])\/level2|_([1-6])D([1-6])_|\/D([1-6])|_D([1-6])|D([1-6])_/i);
    if (match) {
      det = `D${match[1] || match[2] || match[3] || match[4] || match[5] || match[6]}`;
    } else if (rawInstrument && rawInstrument.includes('D')) {
      const im = rawInstrument.match(/D([1-6])/i);
      if (im) det = `D${im[1]}`;
    }
  }

  const detNum = parseInt(det.replace(/\D/g, ''), 10) || 1;
  const detArray = SPHEREX_DETECTOR_ARRAYS.find((d) => d.detectorNumber === detNum);
  const band = detArray ? detArray.name : `Band ${det}`;

  return { detector: det, band };
}

/**
 * Maps a single raw row object or column array to a NormalizedObservationRow.
 */
export function mapRowToNormalized(
  row: any,
  fields: string[] | null,
  customMapping?: Partial<ColumnMapping>,
  source: 'LIVE_TAP' | 'OFFLINE_FIXTURE' | 'DEMO_CACHE' = 'LIVE_TAP'
): NormalizedObservationRow | null {
  const map: Required<ColumnMapping> = { ...DEFAULT_COLUMN_MAPPING, ...(customMapping || {}) };

  // Helper to extract by field name
  const getValue = (keyName: string): any => {
    if (!row) return undefined;
    if (Array.isArray(row) && fields) {
      const idx = fields.indexOf(keyName);
      return idx >= 0 ? row[idx] : undefined;
    }
    if (typeof row === 'object') {
      return row[keyName];
    }
    return undefined;
  };

  const obsIdRaw = getValue(map.obs_id);
  const accessUrlRaw = getValue(map.access_url);

  if (!obsIdRaw && !accessUrlRaw) {
    return null;
  }

  const obs_id = String(obsIdRaw || 'UNKNOWN_OBS');
  const access_url = String(accessUrlRaw || '');

  // MJD & Timestamps
  let mjd = 0;
  const rawMjd = getValue(map.mjd);
  const rawTmin = getValue(map.t_min);
  const rawTmax = getValue(map.t_max);

  if (rawMjd != null && Number.isFinite(parseFloat(rawMjd))) {
    mjd = parseFloat(rawMjd);
  } else if (rawTmin != null && Number.isFinite(parseFloat(rawTmin))) {
    const tMin = parseFloat(rawTmin);
    const tMax = rawTmax != null && Number.isFinite(parseFloat(rawTmax)) ? parseFloat(rawTmax) : tMin;
    mjd = Number(((tMin + tMax) / 2).toFixed(6));
  }

  let date: string | undefined;
  if (mjd > 0) {
    const dateMs = (mjd - 40587) * 86400 * 1000;
    date = new Date(dateMs).toISOString();
  }

  // Wavelength
  let wavelength = 0;
  const rawWl = getValue(map.wavelength);
  const rawEmMin = getValue(map.em_min);
  const rawEmMax = getValue(map.em_max);

  if (rawWl != null && Number.isFinite(parseFloat(rawWl))) {
    wavelength = parseFloat(rawWl);
  } else if (rawEmMin != null && Number.isFinite(parseFloat(rawEmMin))) {
    const emMin = parseFloat(rawEmMin);
    const emMax = rawEmMax != null && Number.isFinite(parseFloat(rawEmMax)) ? parseFloat(rawEmMax) : emMin;
    wavelength = Number((((emMin + emMax) / 2) * 1e6).toFixed(2));
  }

  // Detector and Band
  const rawInst = getValue(map.instrument_name);
  const { detector, band } = normalizeDetectorAndBand(undefined, access_url, rawInst);

  // If wavelength is still 0, use central band wavelength
  if (wavelength === 0) {
    const detNum = parseInt(detector.replace(/\D/g, ''), 10) || 1;
    const detArray = SPHEREX_DETECTOR_ARRAYS.find((d) => d.detectorNumber === detNum);
    wavelength = detArray ? (detArray.wavelengthRangeUm[0] + detArray.wavelengthRangeUm[1]) / 2 : 1.0;
  }

  // Coordinates & Spatial footprint (optional)
  const rawRa = getValue(map.s_ra);
  const rawDec = getValue(map.s_dec);
  const s_ra = rawRa != null && Number.isFinite(parseFloat(rawRa)) ? parseFloat(rawRa) : undefined;
  const s_dec = rawDec != null && Number.isFinite(parseFloat(rawDec)) ? parseFloat(rawDec) : undefined;

  const rawRegion = getValue(map.s_region);
  const s_region = rawRegion != null ? String(rawRegion) : undefined;

  const visitKey = extractVisitKey(obs_id);

  return {
    obs_id,
    mjd,
    wavelength,
    band,
    detector,
    access_url,
    s_region,
    s_ra,
    s_dec,
    date,
    visitKey,
    source,
  };
}

/**
 * Parses raw TAP JSON (VOTable structure or object array) and returns DataSourceResult.
 */
export function parseTapJsonResponse(
  json: any,
  queryUrl: string,
  targetCoords?: { ra: number; dec: number },
  customMapping?: Partial<ColumnMapping>,
  source: 'LIVE_TAP' | 'OFFLINE_FIXTURE' | 'DEMO_CACHE' = 'LIVE_TAP'
): DataSourceResult {
  const { releaseName } = getArchiveEnv();

  if (!json || typeof json !== 'object') {
    return {
      status: 'ARCHIVE_ZERO_ROWS',
      message: `Archive query returned empty or malformed JSON payload.`,
      releaseName,
      queryUrl,
      targetCoords,
    };
  }

  // Handle standard IRSA VOTable JSON response
  let fields: string[] | null = null;
  let rawRows: any[] = [];

  const table = json?.VOTABLE?.RESOURCE_ARRAY?.[0]?.TABLE;
  if (table) {
    if (Array.isArray(table.FIELD)) {
      fields = table.FIELD.map((f: any) => f.name || f.id || '');
    }
    rawRows = table?.DATA?.TABLEDATA ?? [];
  } else if (Array.isArray(json.rows)) {
    rawRows = json.rows;
  } else if (Array.isArray(json)) {
    rawRows = json;
  }

  if (rawRows.length === 0) {
    return {
      status: 'ARCHIVE_ZERO_ROWS',
      message: `IRSA TAP: 0 observations found in ${releaseName} for requested position.`,
      releaseName,
      queryUrl,
      targetCoords,
    };
  }

  const normalizedRows: NormalizedObservationRow[] = [];
  for (const raw of rawRows) {
    const row = mapRowToNormalized(raw, fields, customMapping, source);
    if (row) {
      normalizedRows.push(row);
    }
  }

  if (normalizedRows.length === 0) {
    return {
      status: 'ARCHIVE_ZERO_ROWS',
      message: `IRSA TAP: ${rawRows.length} raw record(s) found but none could be mapped to valid observation products.`,
      releaseName,
      queryUrl,
      targetCoords,
    };
  }

  return {
    status: 'OK',
    rows: normalizedRows,
    count: normalizedRows.length,
    releaseName,
    queryUrl,
    source,
  };
}

/**
 * Performs a TAP query through the adapter with full error classification.
 * Strictly guarantees that network failures never mask as ARCHIVE_ZERO_ROWS.
 */
export async function queryArchiveTap(
  ra: number,
  dec: number,
  radiusDeg = 0.5,
  fetchFn: typeof fetch = fetch,
  customMapping?: Partial<ColumnMapping>
): Promise<DataSourceResult> {
  const { baseUrl, tapTable, releaseName, isOffline } = getArchiveEnv();

  // If in OFFLINE mode, return fixture or throw network offline error
  if (isOffline) {
    return {
      status: 'OK',
      rows: [
        {
          obs_id: '2025W18_1B_0001_1',
          mjd: 60793.541849,
          wavelength: 0.93,
          band: 'Band 1 (0.75 - 1.11 µm)',
          detector: 'D1',
          access_url: 'local://data/spherex_cache/b6a1e605728059ea6b7def1e9683adb2.fits',
          visitKey: '2025W18_1B_0001',
          source: 'OFFLINE_FIXTURE',
        },
        {
          obs_id: '2025W18_1B_0001_2',
          mjd: 60793.543341,
          wavelength: 0.93,
          band: 'Band 1 (0.75 - 1.11 µm)',
          detector: 'D1',
          access_url: 'local://data/spherex_cache/569dafa911ec60ff30abb1807d719fef.fits',
          visitKey: '2025W18_1B_0001',
          source: 'OFFLINE_FIXTURE',
        },
        {
          obs_id: '2025W18_1B_0001_3',
          mjd: 60793.544834,
          wavelength: 0.93,
          band: 'Band 1 (0.75 - 1.11 µm)',
          detector: 'D1',
          access_url: 'local://data/spherex_cache/75b2c2369c175060576bec8d2e5333c0.fits',
          visitKey: '2025W18_1B_0001',
          source: 'OFFLINE_FIXTURE',
        },
      ],
      count: 3,
      releaseName: `${releaseName} [OFFLINE MODE]`,
      queryUrl: 'local://offline_fixtures',
      source: 'OFFLINE_FIXTURE',
      isOffline: true,
    };
  }

  const tapQuery = `SELECT obs_id, s_ra, s_dec, instrument_name, t_min, t_max, em_min, em_max, access_url, dataproduct_type FROM ${tapTable} WHERE CONTAINS(POINT('ICRS',s_ra,s_dec),CIRCLE('ICRS',${ra},${dec},${radiusDeg}))=1 ORDER BY t_min ASC`;
  const queryUrl = `${baseUrl}/TAP/sync?QUERY=${encodeURIComponent(tapQuery)}&FORMAT=json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const resp = await fetchFn(queryUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0',
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      return {
        status: 'NETWORK_ERROR',
        error: `Archive query returned HTTP ${resp.status} ${resp.statusText}`,
        statusCode: resp.status,
        queryUrl,
        canRetry: true,
        targetCoords: { ra, dec },
      };
    }

    const json = await resp.json();
    return parseTapJsonResponse(json, queryUrl, { ra, dec }, customMapping, 'LIVE_TAP');
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    return {
      status: 'NETWORK_ERROR',
      error: isTimeout
        ? `Network timeout connecting to archive at ${baseUrl}`
        : `Network connection failure: ${err.message || String(err)}`,
      queryUrl,
      canRetry: true,
      targetCoords: { ra, dec },
    };
  }
}
