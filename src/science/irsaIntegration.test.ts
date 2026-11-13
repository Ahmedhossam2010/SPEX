import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OFFICIAL_CHALLENGE_TARGETS } from './challengeTargets';
import { propagatePosition } from './properMotion';
import { buildCutoutRequestUrl, parseDataLinkXml } from './timeSeriesPipeline';
import { FITSReader } from './fitsReader';

const OFFLINE = process.env.SPHEREX_OFFLINE === '1';

describe('Live IRSA TAP + Direct Cutout + FITS MEF/WCS-WAVE Integration', { skip: OFFLINE }, () => {
  it('queries IRSA TAP spherex.artifact JOIN spherex.plane for all 5 targets and validates cutout + WCS-WAVE for WISE 0855', async () => {
    const benchmarkTargets = [
      'target-barnards-star',
      'target-epsilon-indi-bab',
      'target-wise-0855',
      'target-rw-aurigae',
      'target-r-draconis',
    ];

    const host = process.env.SPHEREX_IRSA_HOST || 'https://irsa.ipac.caltech.edu';
    const artifactTable = process.env.SPHEREX_ARTIFACT_TABLE || 'spherex.artifact';
    const planeTable = process.env.SPHEREX_PLANE_TABLE || 'spherex.plane';

    for (const id of benchmarkTargets) {
      const t = OFFICIAL_CHALLENGE_TARGETS.find((item) => item.id === id);
      assert.ok(t, `Missing target ${id}`);

      const prop =
        t.pmRaMasYr != null && t.pmDecMasYr != null && t.coordinateEpochYear != null
          ? propagatePosition(t.ra, t.dec, t.pmRaMasYr, t.pmDecMasYr, t.coordinateEpochYear, 2025.6)
          : { ra: t.ra, dec: t.dec };

      const adql = `SELECT TOP 5 p.obsid, a.uri, p.time_bounds_lower FROM ${artifactTable} a JOIN ${planeTable} p ON a.planeid = p.planeid WHERE CONTAINS(POINT('ICRS',${prop.ra},${prop.dec}),p.poly)=1 ORDER BY p.time_bounds_lower ASC`;
      const url = `${host}/TAP/sync?QUERY=${encodeURIComponent(adql)}&FORMAT=csv`;
      const res = await fetch(url, { signal: AbortSignal.timeout(75000) });
      assert.strictEqual(res.status, 200, `${t.name} TAP status should be 200`);
      const csv = await res.text();
      assert.ok(!csv.trim().startsWith('<'), `${t.name} TAP should return CSV, not XML error`);
      const rows = csv.trim().split('\n').filter(Boolean);
      assert.ok(rows.length > 1, `${t.name} must have live observations in ${artifactTable} JOIN ${planeTable}`);

      if (id === 'target-wise-0855') {
        const firstCols = rows[1].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const rawUri = firstCols[1];
        assert.ok(rawUri.length > 0, `uri expected, got ${rawUri}`);
        const baseUri = rawUri.startsWith('http') ? rawUri : `${host}/ibe/data/spherex/${rawUri.replace(/^\/+/, '')}`;
        const sizeDeg = (64 * 6.2) / 3600;
        const cutoutUrl = `${baseUri}?center=${prop.ra.toFixed(6)},${prop.dec.toFixed(6)}d&size=${sizeDeg.toFixed(6)}d`;

        let fitsRes: Response | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          fitsRes = await fetch(cutoutUrl, { signal: AbortSignal.timeout(60000) });
          if (fitsRes.ok) break;
          await new Promise((r) => setTimeout(r, 800 * attempt));
        }
        assert.ok(fitsRes && fitsRes.status === 200, `Direct FITS cutout must return 200 (got ${fitsRes?.status})`);
        const buf = Buffer.from(await fitsRes.arrayBuffer());
        const parsedFits = FITSReader.parse(buf);
        assert.ok(parsedFits.width >= 32 && parsedFits.height >= 32, 'FITS cutout must have valid dimensions');
        assert.ok(parsedFits.data.length === parsedFits.width * parsedFits.height, 'FITS flux length matches WxH');
        assert.ok(parsedFits.variance && parsedFits.flags, 'FITS cutout must provide VARIANCE and FLAGS HDUs');
        if (parsedFits.wcsWaveMetadata?.table) {
          const wave = FITSReader.evaluateWaveWcs(parsedFits.wcsWaveMetadata.table, Math.floor(parsedFits.width / 2), Math.floor(parsedFits.height / 2));
          assert.ok(wave && wave.wavelengthUm >= 0.7 && wave.wavelengthUm <= 5.2, 'WCS-WAVE must evaluate a physical wavelength');
        }
      }
    }
  });
});
