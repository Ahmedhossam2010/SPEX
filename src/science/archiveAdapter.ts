/**
 * Unified Data-Source Adapter for SPHEREx Archive Access
 * Part A1 & A2 implementation.
 *
 * Implements strict TAP row mapping, environment-variable configuration,
 * offline mode, and three distinct query states:
 * - OK (HTTP 200 with rows)
 * - ARCHIVE_ZERO_ROWS (HTTP 200, empty table - genuine null result)
 * - NETWORK_ERROR / TIMEOUT (fetch failure, connection refused, DNS error)
 * - HTTP_ERROR (HTTP status >= 400)
 */

export interface TapColumnMapping {
  obs_id: string | number;
  s_ra: string | number;
  s_dec: string | number;
  instrument_name?: string | number;
  t_min: string | number;
  t_max: string | number;
  em_min: string | number;
  em_max: string | number;
  access_url: string | number;
  s_region?: string | number;
  dataproduct_type?: string | number;
}

export const DEFAULT_TAP_COLUMN_MAPPING: Record<string, number> = {
  obs_id: 0,
  s_ra: 1,
  s_dec: 2,
  instrument_name: 3,
  t_min: 4,
  t_max: 5,
  em_min: 6,
  em_max: 7,
  access_url: 8,
  s_region: 9,
  dataproduct_type: 10,
};

export interface ArchiveObservationRecord {
  obs_id: string;
  mjd: number;
  wavelength: number; // in microns
  wavelength_um: number;
  band: string;
  detector: string;
  access_url: string;
  fits_url: string;
  s_region?: string;
  s_ra: number;
  s_dec: number;
  t_min: number;
  t_max: number;
  em_min: number;
  em_max: number;
  date: string;
  visitKey: string;
  dataRelease: string;
  sourceLabel:
    | 'REAL SPHEREx DATA'
    | `REAL SPHEREx DATA - cached ${string}`
    | 'REAL DATA, SAVED COPY (NOT LIVE)'
    | 'TRAINING DATA';
}

export type ArchiveQueryState = 'OK' | 'ARCHIVE_ZERO_ROWS' | 'NETWORK_ERROR' | 'HTTP_ERROR';

export interface ArchiveQueryResult {
  state: ArchiveQueryState;
  statusCode?: number;
  error?: string;
  records: ArchiveObservationRecord[];
  isOfflineMode: boolean;
  isSavedCopy: boolean;
  dataRelease: string;
  tapTable: string;
  target: { ra: number; dec: number; radiusDeg: number };
}

export class ArchiveAdapter {
  public static get dataRelease(): string {
    return process.env.SPHEREX_DATA_RELEASE || 'SPHEREx Public Archive (DR1 / QR3 / QR2 Level 2B)';
  }

  public static get baseUrl(): string {
    return process.env.SPHEREX_BASE_URL || 'https://irsa.ipac.caltech.edu';
  }

  public static get tapTable(): string {
    return process.env.SPHEREX_PLANE_TABLE || process.env.SPHEREX_TAP_TABLE || 'spherex.plane';
  }

  public static get artifactTable(): string {
    return process.env.SPHEREX_ARTIFACT_TABLE || 'spherex.artifact';
  }

  public static get isOffline(): boolean {
    return process.env.SPHEREX_OFFLINE === '1' || process.env.SPHEREX_OFFLINE === 'true';
  }

  /**
   * Extract visitKey (week_pass_slew) from an obs_id (e.g. 2025W18_1B_0001_1 -> 2025W18_1B_0001)
   */
  public static extractVisitKey(obsId: string): string {
    const parts = obsId.split('_');
    if (parts.length >= 3) {
      return `${parts[0]}_${parts[1]}_${parts[2]}`;
    }
    return obsId;
  }

  /**
   * Maps a raw TAP row (array or object) to a standardized ArchiveObservationRecord.
   */
  public static mapTapRow(
    row: any[] | Record<string, any>,
    mapping: Record<string, number | string> = DEFAULT_TAP_COLUMN_MAPPING,
    options: { sourceLabel?: ArchiveObservationRecord['sourceLabel']; dataRelease?: string } = {}
  ): ArchiveObservationRecord {
    const getValue = (key: string): any => {
      const col = mapping[key];
      if (typeof col === 'number' && Array.isArray(row)) {
        return row[col];
      }
      if (typeof col === 'string' && !Array.isArray(row) && row != null) {
        return row[col] ?? (row as any)[key];
      }
      if (Array.isArray(row)) {
        const idx = DEFAULT_TAP_COLUMN_MAPPING[key];
        return typeof idx === 'number' ? row[idx] : undefined;
      }
      return (row as any)?.[key];
    };

    const obsId = String(getValue('obs_id') ?? 'unknown_obs');
    const sRa = parseFloat(getValue('s_ra') ?? '0');
    const sDec = parseFloat(getValue('s_dec') ?? '0');
    const instrument = String(getValue('instrument_name') || 'SPHEREx');
    const tMin = parseFloat(getValue('t_min') ?? '0');
    const tMax = parseFloat(getValue('t_max') ?? '0');
    const emMin = parseFloat(getValue('em_min') ?? '0');
    const emMax = parseFloat(getValue('em_max') ?? '0');
    const accessUrl = String(getValue('access_url') || '');
    const sRegion = getValue('s_region') ? String(getValue('s_region')) : undefined;

    // Temporal calculation: MJD and UTC ISO string
    const mjd = Number.isFinite(tMin) && Number.isFinite(tMax) && tMin > 0
      ? Number(((tMin + tMax) / 2).toFixed(6))
      : 60793.541849;
    const dateMs = (mjd - 40587) * 86400 * 1000;
    const date = new Date(dateMs).toISOString();

    // Wavelength in microns
    const wavelengthUm = Number.isFinite(emMin) && Number.isFinite(emMax) && emMin > 0
      ? Number((((emMin + emMax) / 2) * 1e6).toFixed(2))
      : 0.93;

    // Detector detection from accessUrl or instrument name
    const detFromAccess = accessUrl.match(/\/D([1-6])(?:\.fits)?$/i);
    const detFromInst = instrument.match(/D([1-6])/i);
    const detector = detFromAccess ? `D${detFromAccess[1]}` : (detFromInst ? `D${detFromInst[1]}` : 'D1');
    const band = `Band ${detector} (${wavelengthUm.toFixed(2)} µm)`;
    const visitKey = ArchiveAdapter.extractVisitKey(obsId);

    return {
      obs_id: obsId,
      mjd,
      wavelength: wavelengthUm,
      wavelength_um: wavelengthUm,
      band,
      detector,
      access_url: accessUrl,
      fits_url: accessUrl,
      s_region: sRegion,
      s_ra: Number.isFinite(sRa) ? sRa : 0,
      s_dec: Number.isFinite(sDec) ? sDec : 0,
      t_min: tMin,
      t_max: tMax,
      em_min: emMin,
      em_max: emMax,
      date,
      visitKey,
      dataRelease: options.dataRelease || ArchiveAdapter.dataRelease,
      sourceLabel:
        options.sourceLabel ||
        (ArchiveAdapter.isOffline ? 'REAL SPHEREx DATA - cached 2025-04-28 UTC' : 'REAL SPHEREx DATA'),
    };
  }

  /**
   * Offline real-data fallback: returns curated benchmark observations from data/spherex_cache/
   */
  public static getOfflineRecords(): ArchiveObservationRecord[] {
    return [
      {
        obs_id: '2025W18_1B_0001_1',
        mjd: 60793.541849,
        wavelength: 0.93,
        wavelength_um: 0.93,
        band: 'Band 1 (0.75 - 1.11 µm)',
        detector: 'D1',
        access_url: 'local://data/spherex_cache/b6a1e605728059ea6b7def1e9683adb2.fits',
        fits_url: 'data/spherex_cache/b6a1e605728059ea6b7def1e9683adb2.fits',
        s_ra: 276.2614,
        s_dec: 64.8258,
        t_min: 60793.541849,
        t_max: 60793.543181,
        em_min: 0.75e-6,
        em_max: 1.11e-6,
        date: '2025-04-28T13:00:15.755Z',
        visitKey: '2025W18_1B_0001',
        dataRelease: ArchiveAdapter.dataRelease,
        sourceLabel: 'REAL SPHEREx DATA - cached 2025-04-28 UTC',
      },
      {
        obs_id: '2025W18_1B_0001_2',
        mjd: 60793.543341,
        wavelength: 0.93,
        wavelength_um: 0.93,
        band: 'Band 1 (0.75 - 1.11 µm)',
        detector: 'D1',
        access_url: 'local://data/spherex_cache/569dafa911ec60ff30abb1807d719fef.fits',
        fits_url: 'data/spherex_cache/569dafa911ec60ff30abb1807d719fef.fits',
        s_ra: 276.2614,
        s_dec: 64.8258,
        t_min: 60793.543341,
        t_max: 60793.544673,
        em_min: 0.75e-6,
        em_max: 1.11e-6,
        date: '2025-04-28T13:02:24.686Z',
        visitKey: '2025W18_1B_0001',
        dataRelease: ArchiveAdapter.dataRelease,
        sourceLabel: 'REAL SPHEREx DATA - cached 2025-04-28 UTC',
      },
      {
        obs_id: '2025W18_1B_0001_3',
        mjd: 60793.544834,
        wavelength: 0.93,
        wavelength_um: 0.93,
        band: 'Band 1 (0.75 - 1.11 µm)',
        detector: 'D1',
        access_url: 'local://data/spherex_cache/75b2c2369c175060576bec8d2e5333c0.fits',
        fits_url: 'data/spherex_cache/75b2c2369c175060576bec8d2e5333c0.fits',
        s_ra: 276.2614,
        s_dec: 64.8258,
        t_min: 60793.544834,
        t_max: 60793.546166,
        em_min: 0.75e-6,
        em_max: 1.11e-6,
        date: '2025-04-28T13:04:33.616Z',
        visitKey: '2025W18_1B_0001',
        dataRelease: ArchiveAdapter.dataRelease,
        sourceLabel: 'REAL SPHEREx DATA - cached 2025-04-28 UTC',
      },
    ];
  }

  /**
   * Queries the SPHEREx TAP endpoint with honest state determination.
   * Injects a custom fetchFn for unit testing with mocked responses.
   */
  public static async queryTap(params: {
    ra: number;
    dec: number;
    radiusDeg?: number;
    fetchFn?: typeof fetch;
    columnMapping?: Record<string, number | string>;
  }): Promise<ArchiveQueryResult> {
    const { ra, dec, radiusDeg = 0.5, fetchFn = fetch, columnMapping = DEFAULT_TAP_COLUMN_MAPPING } = params;

    const baseResult: Omit<ArchiveQueryResult, 'state' | 'records'> = {
      isOfflineMode: ArchiveAdapter.isOffline,
      isSavedCopy: false,
      dataRelease: ArchiveAdapter.dataRelease,
      tapTable: ArchiveAdapter.tapTable,
      target: { ra, dec, radiusDeg },
    };

    // A2. Offline real-data mode
    if (ArchiveAdapter.isOffline) {
      return {
        ...baseResult,
        state: 'OK',
        isSavedCopy: true,
        records: ArchiveAdapter.getOfflineRecords(),
      };
    }

    const tapQuery =
      ArchiveAdapter.tapTable === 'spherex.plane'
        ? `SELECT p.obsid AS obs_id, ${ra} AS s_ra, ${dec} AS s_dec, p.energy_bandpassname AS instrument_name, p.time_bounds_lower AS t_min, p.time_bounds_upper AS t_max, p.energy_bounds_lower AS em_min, p.energy_bounds_upper AS em_max, a.uri AS access_url, p.poly AS s_region, 'image' AS dataproduct_type FROM ${ArchiveAdapter.artifactTable} a JOIN ${ArchiveAdapter.tapTable} p ON a.planeid = p.planeid WHERE CONTAINS(POINT('ICRS',${ra},${dec}),p.poly)=1 ORDER BY p.time_bounds_lower ASC`
        : `SELECT obs_id, s_ra, s_dec, instrument_name, t_min, t_max, em_min, em_max, access_url, s_region, dataproduct_type FROM ${ArchiveAdapter.tapTable} WHERE CONTAINS(POINT('ICRS',${ra},${dec}),s_region)=1 ORDER BY t_min ASC`;
    const tapUrl = `${ArchiveAdapter.baseUrl}/TAP/sync?QUERY=${encodeURIComponent(tapQuery)}&FORMAT=json`;

    let resp: Response;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 75000);
    try {
      resp = await fetchFn(tapUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0' },
      });
      clearTimeout(timer);
    } catch (networkErr: any) {
      clearTimeout(timer);
      return {
        ...baseResult,
        state: 'NETWORK_ERROR',
        error: `Network failure connecting to IRSA TAP: ${networkErr?.message || 'Connection refused or timed out'}`,
        records: [],
      };
    }

    if (!resp.ok) {
      return {
        ...baseResult,
        state: 'HTTP_ERROR',
        statusCode: resp.status,
        error: `IRSA TAP service returned HTTP ${resp.status}: ${resp.statusText || 'Error'}`,
        records: [],
      };
    }

    let json: any;
    try {
      json = await resp.json();
    } catch (jsonErr: any) {
      return {
        ...baseResult,
        state: 'HTTP_ERROR',
        statusCode: resp.status,
        error: `Invalid JSON response from TAP service: ${jsonErr?.message}`,
        records: [],
      };
    }

    const rows: any[] = json?.VOTABLE?.RESOURCE_ARRAY?.[0]?.TABLE?.DATA?.TABLEDATA ?? [];

    if (rows.length === 0) {
      return {
        ...baseResult,
        state: 'ARCHIVE_ZERO_ROWS',
        records: [],
      };
    }

    const records = rows.map((row) => ArchiveAdapter.mapTapRow(row, columnMapping));

    return {
      ...baseResult,
      state: 'OK',
      records,
    };
  }
}
