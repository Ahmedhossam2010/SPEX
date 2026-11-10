import test from 'node:test';
import assert from 'node:assert/strict';
import { ArchiveAdapter, DEFAULT_TAP_COLUMN_MAPPING } from './archiveAdapter';

test('ArchiveAdapter: normal rows mapped to {obs_id, mjd, wavelength, band, detector, access_url, s_region}', async () => {
  const mockRows = [
    [
      '2025W18_1B_0001_1',
      276.2614,
      64.8258,
      'SPHEREx_D1',
      60793.541849,
      60793.543181,
      0.75e-6,
      1.11e-6,
      'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits',
      'POLYGON 276.0 64.0 277.0 64.0 277.0 65.0 276.0 65.0',
      'image',
    ],
  ];

  const mockFetch = async () => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        VOTABLE: {
          RESOURCE_ARRAY: [{ TABLE: { DATA: { TABLEDATA: mockRows } } }],
        },
      }),
    } as unknown as Response;
  };

  const res = await ArchiveAdapter.queryTap({
    ra: 276.2614,
    dec: 64.8258,
    fetchFn: mockFetch as any,
  });

  assert.equal(res.state, 'OK');
  assert.equal(res.records.length, 1);
  const rec = res.records[0];
  assert.equal(rec.obs_id, '2025W18_1B_0001_1');
  assert.equal(rec.mjd, 60793.542515);
  assert.equal(rec.wavelength, 0.93);
  assert.equal(rec.wavelength_um, 0.93);
  assert.equal(rec.band, 'Band D1 (0.93 µm)');
  assert.equal(rec.detector, 'D1');
  assert.equal(rec.access_url, mockRows[0][8]);
  assert.equal(rec.s_region, mockRows[0][9]);
  assert.equal(rec.visitKey, '2025W18_1B_0001');
  assert.equal(rec.sourceLabel, 'REAL SPHEREx DATA');
});

test('ArchiveAdapter: empty table returns ARCHIVE_ZERO_ROWS (HTTP 200, no rows)', async () => {
  const mockFetch = async () => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        VOTABLE: {
          RESOURCE_ARRAY: [{ TABLE: { DATA: { TABLEDATA: [] } } }],
        },
      }),
    } as unknown as Response;
  };

  const res = await ArchiveAdapter.queryTap({
    ra: 100.0,
    dec: 0.0,
    fetchFn: mockFetch as any,
  });

  assert.equal(res.state, 'ARCHIVE_ZERO_ROWS');
  assert.equal(res.records.length, 0);
});

test('ArchiveAdapter: connection failure returns NETWORK_ERROR (never converted to empty zero rows)', async () => {
  const mockFetch = async () => {
    throw new Error('fetch failed: getaddrinfo ENOTFOUND irsa.ipac.caltech.edu');
  };

  const res = await ArchiveAdapter.queryTap({
    ra: 276.2614,
    dec: 64.8258,
    fetchFn: mockFetch as any,
  });

  assert.equal(res.state, 'NETWORK_ERROR');
  assert.equal(res.records.length, 0);
  assert.ok(res.error?.includes('Network failure connecting to IRSA TAP'));
});

test('ArchiveAdapter: HTTP 500 returns HTTP_ERROR with status code 500', async () => {
  const mockFetch = async () => {
    return {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as unknown as Response;
  };

  const res = await ArchiveAdapter.queryTap({
    ra: 276.2614,
    dec: 64.8258,
    fetchFn: mockFetch as any,
  });

  assert.equal(res.state, 'HTTP_ERROR');
  assert.equal(res.statusCode, 500);
  assert.equal(res.records.length, 0);
  assert.ok(res.error?.includes('HTTP 500'));
});

test('ArchiveAdapter: handles missing optional columns gracefully', () => {
  // Missing s_region and dataproduct_type
  const minimalRow = [
    '2025W18_1B_0001_1', // obs_id
    276.2614, // s_ra
    64.8258, // s_dec
    'SPHEREx', // instrument_name
    60793.541849, // t_min
    60793.543181, // t_max
    0.75e-6, // em_min
    1.11e-6, // em_max
    'https://example.com/obs1.fits', // access_url
    // No s_region
    // No dataproduct_type
  ];

  const rec = ArchiveAdapter.mapTapRow(minimalRow);
  assert.equal(rec.obs_id, '2025W18_1B_0001_1');
  assert.equal(rec.s_region, undefined);
  assert.equal(rec.wavelength, 0.93);
  assert.equal(rec.access_url, 'https://example.com/obs1.fits');
});

test('ArchiveAdapter: offline mode serves 3 real FITS records with REAL DATA, SAVED COPY label', async () => {
  const origOffline = process.env.SPHEREX_OFFLINE;
  process.env.SPHEREX_OFFLINE = '1';
  try {
    const res = await ArchiveAdapter.queryTap({
      ra: 276.2614,
      dec: 64.8258,
    });

    assert.equal(res.state, 'OK');
    assert.equal(res.isOfflineMode, true);
    assert.equal(res.isSavedCopy, true);
    assert.equal(res.records.length, 3);
    for (const r of res.records) {
      assert.equal(r.sourceLabel, 'REAL DATA, SAVED COPY (NOT LIVE)');
    }
  } finally {
    process.env.SPHEREX_OFFLINE = origOffline;
  }
});
