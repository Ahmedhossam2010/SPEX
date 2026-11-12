import test from 'node:test';
import assert from 'node:assert/strict';
import {
  queryArchiveTap,
  parseTapJsonResponse,
  mapRowToNormalized,
  DEFAULT_COLUMN_MAPPING,
  DataSourceResult,
} from './dataSourceAdapter';

// Ensure test execution environment
process.env.NODE_ENV = 'test';

test('DataSourceAdapter: maps normal VOTable rows to canonical internal shape', () => {
  const mockVotableJson = {
    VOTABLE: {
      RESOURCE_ARRAY: [
        {
          TABLE: {
            FIELD: [
              { name: 'obs_id' },
              { name: 's_ra' },
              { name: 's_dec' },
              { name: 'instrument_name' },
              { name: 't_min' },
              { name: 't_max' },
              { name: 'em_min' },
              { name: 'em_max' },
              { name: 'access_url' },
              { name: 'dataproduct_type' },
            ],
            DATA: {
              TABLEDATA: [
                [
                  '2025W18_1B_0001_1',
                  276.2614,
                  64.8258,
                  'SPHEREx-D1',
                  60793.541,
                  60793.543,
                  0.75e-6,
                  1.11e-6,
                  'https://irsa.ipac.caltech.edu/datalink/links/spherex?ID=2025W18_1B_0001_1_D1',
                  'image',
                ],
                [
                  '2025W18_1B_0001_2',
                  276.2615,
                  64.8259,
                  'SPHEREx-D2',
                  60793.544,
                  60793.546,
                  1.11e-6,
                  1.65e-6,
                  'https://irsa.ipac.caltech.edu/datalink/links/spherex?ID=2025W18_1B_0001_2_D2',
                  'image',
                ],
              ],
            },
          },
        },
      ],
    },
  };

  const result = parseTapJsonResponse(mockVotableJson, 'https://irsa.ipac.caltech.edu/TAP');
  assert.equal(result.status, 'OK');
  if (result.status === 'OK') {
    assert.equal(result.count, 2);
    assert.equal(result.rows[0].obs_id, '2025W18_1B_0001_1');
    assert.equal(result.rows[0].detector, 'D1');
    assert.equal(result.rows[0].wavelength, 0.93);
    assert.equal(result.rows[0].visitKey, '2025W18_1B_0001');
    assert.equal(result.rows[1].obs_id, '2025W18_1B_0001_2');
    assert.equal(result.rows[1].detector, 'D2');
  }
});

test('DataSourceAdapter: empty table produces ARCHIVE_ZERO_ROWS (never masked as error)', () => {
  const emptyVotableJson = {
    VOTABLE: {
      RESOURCE_ARRAY: [
        {
          TABLE: {
            FIELD: [{ name: 'obs_id' }, { name: 'access_url' }],
            DATA: {
              TABLEDATA: [],
            },
          },
        },
      ],
    },
  };

  const result = parseTapJsonResponse(emptyVotableJson, 'https://irsa.ipac.caltech.edu/TAP', { ra: 100, dec: 20 });
  assert.equal(result.status, 'ARCHIVE_ZERO_ROWS');
  if (result.status === 'ARCHIVE_ZERO_ROWS') {
    assert.ok(result.message.includes('0 observations found'));
    assert.deepEqual(result.targetCoords, { ra: 100, dec: 20 });
  }
});

test('DataSourceAdapter: handles rows with missing optional columns gracefully', () => {
  // Missing s_ra, s_dec, instrument_name, t_max, em_max, s_region
  const minimalRow = {
    obs_id: '2025W35_1A_0444_3',
    access_url: 'https://irsa.ipac.caltech.edu/ibe/data/level2_2025W35_1A_0444_3D3_spx.fits',
    t_min: 60912.448,
  };

  const normalized = mapRowToNormalized(minimalRow, null, DEFAULT_COLUMN_MAPPING);
  assert.ok(normalized);
  assert.equal(normalized.obs_id, '2025W35_1A_0444_3');
  assert.equal(normalized.detector, 'D3');
  assert.equal(normalized.mjd, 60912.448);
  assert.equal(normalized.s_ra, undefined);
  assert.equal(normalized.s_region, undefined);
  assert.equal(normalized.visitKey, '2025W35_1A_0444');
  assert.ok(normalized.wavelength > 0, 'Central band wavelength inferred when em_min is absent');
});

test('DataSourceAdapter: custom column mapping overrides work seamlessly', () => {
  const renamedRow = {
    observation_identifier: 'SPX-9988',
    file_download_link: 'https://archive.nasa.gov/data/spx_D4_test.fits',
    julian_mjd: 60800.125,
    center_wavelength_microns: 2.85,
  };

  const customMap = {
    obs_id: 'observation_identifier',
    access_url: 'file_download_link',
    mjd: 'julian_mjd',
    wavelength: 'center_wavelength_microns',
  };

  const normalized = mapRowToNormalized(renamedRow, null, customMap);
  assert.ok(normalized);
  assert.equal(normalized.obs_id, 'SPX-9988');
  assert.equal(normalized.access_url, 'https://archive.nasa.gov/data/spx_D4_test.fits');
  assert.equal(normalized.mjd, 60800.125);
  assert.equal(normalized.wavelength, 2.85);
  assert.equal(normalized.detector, 'D4');
});

test('DataSourceAdapter: queryArchiveTap classifies HTTP 500 as NETWORK_ERROR (never zero rows)', async () => {
  const mockFetch500: any = async () => ({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
  });

  const prevOffline = process.env.SPHEREX_OFFLINE;
  delete process.env.SPHEREX_OFFLINE;

  try {
    const result = await queryArchiveTap(276.26, 64.82, 0.5, mockFetch500);
    assert.equal(result.status, 'NETWORK_ERROR');
    if (result.status === 'NETWORK_ERROR') {
      assert.equal(result.statusCode, 500);
      assert.ok(result.error.includes('HTTP 500'));
      assert.equal(result.canRetry, true);
    }
  } finally {
    if (prevOffline != null) process.env.SPHEREX_OFFLINE = prevOffline;
  }
});

test('DataSourceAdapter: queryArchiveTap classifies connection throw as NETWORK_ERROR', async () => {
  const mockFetchFail: any = async () => {
    throw new TypeError('fetch failed: ECONNREFUSED 134.4.24.12:443');
  };

  const prevOffline = process.env.SPHEREX_OFFLINE;
  delete process.env.SPHEREX_OFFLINE;

  try {
    const result = await queryArchiveTap(276.26, 64.82, 0.5, mockFetchFail);
    assert.equal(result.status, 'NETWORK_ERROR');
    if (result.status === 'NETWORK_ERROR') {
      assert.ok(result.error.includes('fetch failed'));
      assert.equal(result.canRetry, true);
    }
  } finally {
    if (prevOffline != null) process.env.SPHEREX_OFFLINE = prevOffline;
  }
});
