import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { FitsCacheManager, computeBufferSha256 } from './fitsCacheManager';
import {
  SourceClassification,
  canClaimDiscovery,
  evaluateDiscoveryEligibility,
  normalizeSourceClassification,
} from '../science/provenance';
import { buildSpexSystemInstruction, SpexExplainContext } from '../science/spexExplain';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Generates a real, parseable 64x64 FLOAT32 FITS file with TAN WCS centered at (ra, dec)
 * and a synthetic point source near center so centroid/photometry pipelines execute cleanly.
 */
function buildSyntheticValidFitsBuffer(params: {
  ra: number;
  dec: number;
  mjdObs: number;
  dateObs: string;
  obsId: string;
  width?: number;
  height?: number;
}): Buffer {
  const width = params.width ?? 64;
  const height = params.height ?? 64;
  const cards: string[] = [];
  const pushCard = (key: string, formattedVal: string, comment = '') => {
    const left = `${key.padEnd(8, ' ')}= ${formattedVal}`;
    const withComment = comment ? `${left} / ${comment}` : left;
    cards.push(withComment.slice(0, 80).padEnd(80, ' '));
  };

  pushCard('SIMPLE', '                   T', 'Standard FITS');
  pushCard('BITPIX', '                 -32', 'IEEE single precision');
  pushCard('NAXIS', '                   2', 'Number of axes');
  pushCard('NAXIS1', String(width).padStart(20, ' '), 'Width');
  pushCard('NAXIS2', String(height).padStart(20, ' '), 'Height');
  pushCard('BUNIT', "'MJy / sr'", 'Surface brightness unit');
  pushCard('CTYPE1', "'RA---TAN'", 'TAN projection RA');
  pushCard('CTYPE2', "'DEC--TAN'", 'TAN projection Dec');
  pushCard('CRVAL1', params.ra.toFixed(8).padStart(20, ' '), 'Ref RA deg');
  pushCard('CRVAL2', params.dec.toFixed(8).padStart(20, ' '), 'Ref Dec deg');
  pushCard('CRPIX1', ((width + 1) / 2).toFixed(3).padStart(20, ' '), 'Ref pixel X');
  pushCard('CRPIX2', ((height + 1) / 2).toFixed(3).padStart(20, ' '), 'Ref pixel Y');
  pushCard('CDELT1', (-6.2 / 3600).toExponential(6).padStart(20, ' '), 'Deg/px X');
  pushCard('CDELT2', (6.2 / 3600).toExponential(6).padStart(20, ' '), 'Deg/px Y');
  pushCard('MJD-OBS', params.mjdObs.toFixed(6).padStart(20, ' '), 'Obs MJD');
  pushCard('DATE-OBS', `'${params.dateObs}'`, 'Obs UTC');
  pushCard('OBS_ID', `'${params.obsId}'`, 'Observation ID');
  cards.push('END'.padEnd(80, ' '));

  const headerRaw = cards.join('');
  const headerPaddedLen = Math.ceil(headerRaw.length / 2880) * 2880;
  const headerBuf = Buffer.alloc(headerPaddedLen, 0x20);
  headerBuf.write(headerRaw, 0, 'ascii');

  const nPix = width * height;
  const dataRawBytes = nPix * 4;
  const dataPaddedLen = Math.ceil(dataRawBytes / 2880) * 2880;
  const dataBuf = Buffer.alloc(dataPaddedLen, 0);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      // Clean background ~ 0.12 + Gaussian PSF peak ~ 4.5
      const val = 0.12 + 4.5 * Math.exp(-r2 / (2 * 1.4 * 1.4));
      dataBuf.writeFloatBE(val, (y * width + x) * 4);
    }
  }
  return Buffer.concat([headerBuf, dataBuf]);
}

async function waitForHttpReady(url: string, timeoutMs = 20_000): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Timed out waiting for ${url}: ${String(lastErr)}`);
}

async function stopChildProcess(child: ReturnType<typeof spawn>): Promise<void> {
  if (child.exitCode !== null || child.killed) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {}
      resolve();
    }, 3000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    try {
      child.kill('SIGTERM');
    } catch {
      clearTimeout(timer);
      resolve();
    }
  });
}

interface MockEpochSpec {
  obsId: string;
  mjd: number;
  dateObs: string;
  detector: string;
  uri: string;
  ra: number;
  dec: number;
}

function createControllableMockIrsa(specs: MockEpochSpec[]) {
  const mode = {
    tapStatus: 200 as number,
    tapEmpty: false,
    fitsStatus: 200 as number,
    tapHits: 0,
    fitsHits: 0,
  };

  const fitsByObsId = new Map<string, { buf: Buffer; sha256: string }>();
  for (const s of specs) {
    const buf = buildSyntheticValidFitsBuffer({
      ra: s.ra,
      dec: s.dec,
      mjdObs: s.mjd,
      dateObs: s.dateObs,
      obsId: s.obsId,
    });
    fitsByObsId.set(s.obsId, { buf, sha256: computeBufferSha256(buf) });
  }

  const server = http.createServer((req, res) => {
    const urlStr = req.url || '/';
    if (urlStr.startsWith('/TAP/sync')) {
      mode.tapHits += 1;
      if (mode.tapStatus !== 200) {
        // Use HTTP status configured by test (e.g. 502 Proxy Error or 404/503)
        res.writeHead(mode.tapStatus, 'Mock TAP Error', { 'Content-Type': 'text/plain' });
        res.end('Proxy Error');
        return;
      }

      const decodedQuery = decodeURIComponent(urlStr);
      const isJsonFormat = /FORMAT=json/i.test(urlStr);

      if (isJsonFormat) {
        const rows = mode.tapEmpty
          ? []
          : specs.map((s) => [
              s.obsId,
              s.ra,
              s.dec,
              `SPHEREx-${s.detector}`,
              s.mjd,
              s.mjd + 0.00133,
              3.6e-6,
              4.2e-6,
              `http://127.0.0.1:${(server.address() as any)?.port || ''}${s.uri}`,
              `CIRCLE ${s.ra} ${s.dec} 0.1`,
              'image',
            ]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            VOTABLE: {
              RESOURCE_ARRAY: [{ TABLE: { DATA: { TABLEDATA: rows } } }],
            },
          })
        );
        return;
      }

      // Detector summary query (GROUP BY)
      if (/GROUP BY/i.test(decodedQuery)) {
        if (mode.tapEmpty) {
          res.writeHead(200, { 'Content-Type': 'text/csv' });
          res.end('energy_bandpassname,exposure_count,min_mjd,max_mjd\n');
          return;
        }
        const det = specs[0]?.detector || 'D5';
        const minMjd = Math.min(...specs.map((s) => s.mjd));
        const maxMjd = Math.max(...specs.map((s) => s.mjd)) + 0.00133;
        res.writeHead(200, { 'Content-Type': 'text/csv' });
        res.end(
          `energy_bandpassname,exposure_count,min_mjd,max_mjd\n` +
            `SPHEREx-${det},${specs.length},${minMjd},${maxMjd}\n`
        );
        return;
      }

      // Artifact+plane observation rows query
      const header =
        'obsid,energy_bandpassname,time_bounds_lower,time_bounds_upper,energy_bounds_lower,energy_bounds_upper,provenance_version,datarelease,uri\n';
      if (mode.tapEmpty) {
        res.writeHead(200, { 'Content-Type': 'text/csv' });
        res.end(header);
        return;
      }
      const rows = specs
        .map(
          (s) =>
            `${s.obsId},SPHEREx-${s.detector},${s.mjd},${(s.mjd + 0.00133).toFixed(6)},3.6e-6,4.2e-6,1.0.0,qr2,${s.uri}`
        )
        .join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      res.end(header + rows + '\n');
      return;
    }

    if (urlStr.startsWith('/ibe/data/spherex/')) {
      mode.fitsHits += 1;
      if (mode.fitsStatus !== 200) {
        res.writeHead(mode.fitsStatus, 'Mock FITS Error', { 'Content-Type': 'text/plain' });
        res.end('Cutout Proxy Error');
        return;
      }
      const matched = specs.find((s) => urlStr.includes(s.obsId));
      const payload = matched ? fitsByObsId.get(matched.obsId) : fitsByObsId.get(specs[0].obsId);
      if (!payload) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/fits' });
      res.end(payload.buf);
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  return { server, mode, fitsByObsId };
}

test('Scenario 5 (Unit): FitsCacheManager detects corrupt headers, checksum mismatches, and missing sidecars & quarantines tainted files', () => {
  const root = makeTempDir('spex-integrity-unit-');
  try {
    const mgr = new FitsCacheManager({ cacheDir: path.join(root, 'cache'), maxBytes: 1024 * 1024 });
    const validBuf = buildSyntheticValidFitsBuffer({
      ra: 210.5,
      dec: 45.2,
      mjdObs: 60850.1,
      dateObs: '2025-06-24T02:24:00.000Z',
      obsId: '2025W26_1A_0001_1',
    });
    const expectedHash = computeBufferSha256(validBuf);

    mgr.writeFileSync('valid.fits', validBuf, { origin: 'live_ibe', obsId: '2025W26_1A_0001_1' });
    const okRead = mgr.readVerifiedFileSync('valid.fits', { requireSidecar: true });
    assert.equal(okRead.status, 'verified');
    assert.equal(okRead.computedSha256, expectedHash);
    assert.equal(okRead.meta?.origin, 'live_ibe');

    // Tamper 1 pixel byte in the cached file while keeping valid 'SIMPLE  =' header
    const cachedPath = mgr.getFilePath('valid.fits');
    const tampered = Buffer.from(fs.readFileSync(cachedPath));
    tampered[tampered.length - 1] ^= 0xff;
    fs.writeFileSync(cachedPath, tampered);

    const badChecksum = mgr.readVerifiedFileSync('valid.fits');
    assert.equal(badChecksum.status, 'checksum_mismatch');
    assert.equal(badChecksum.buffer, undefined);
    assert.equal(badChecksum.expectedSha256, expectedHash);
    assert.notEqual(badChecksum.computedSha256, expectedHash);
    assert.equal(fs.existsSync(cachedPath), false, 'Quarantined mismatch file must be unlinked');
    assert.equal(mgr.has('valid.fits'), false);

    // Corrupt non-FITS header HTML error page accidentally written on disk
    fs.writeFileSync(mgr.getFilePath('html_corrupt.fits'), Buffer.from('<html><body>502 Bad Gateway</body></html>'));
    const badHeader = mgr.readVerifiedFileSync('html_corrupt.fits');
    assert.equal(badHeader.status, 'corrupt_header');
    assert.equal(badHeader.buffer, undefined);
    assert.equal(mgr.has('html_corrupt.fits'), false);

    // requireSidecar rejects unattested files cleanly
    fs.writeFileSync(mgr.getFilePath('no_sidecar.fits'), validBuf);
    const noSidecar = mgr.readVerifiedFileSync('no_sidecar.fits', { requireSidecar: true });
    assert.equal(noSidecar.status, 'missing_sidecar');
    assert.equal(noSidecar.buffer, undefined);
    assert.equal(mgr.has('no_sidecar.fits'), false);

    assert.equal(mgr.getStats().integrityFailuresCount, 3);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Scenario 6: Canonical discovery eligibility gating rejects SAVED_BENCHMARK, STALE_TAP_CACHE, SYNTHETIC_DEMO, UNAVAILABLE & unverified hashes', () => {
  const allClassifications: SourceClassification[] = [
    'LIVE_ARCHIVE_DATA',
    'VERIFIED_FITS_CACHE',
    'STALE_TAP_CACHE',
    'SAVED_BENCHMARK',
    'SYNTHETIC_DEMO',
    'UNAVAILABLE',
  ];

  const expectedAllowed: Record<SourceClassification, boolean> = {
    LIVE_ARCHIVE_DATA: true,
    VERIFIED_FITS_CACHE: true,
    STALE_TAP_CACHE: false,
    SAVED_BENCHMARK: false,
    SYNTHETIC_DEMO: false,
    UNAVAILABLE: false,
  };

  for (const cls of allClassifications) {
    const decision = evaluateDiscoveryEligibility({
      sourceClassification: cls,
      tapFreshness: cls === 'STALE_TAP_CACHE' ? 'stale_cache' : cls === 'SAVED_BENCHMARK' ? 'snapshot' : 'live',
      cacheIntegrityVerified: cls !== 'UNAVAILABLE',
      observationIds: ['2025W26_1A_0001_1'],
      fitsChecksums: [
        {
          obsId: '2025W26_1A_0001_1',
          sha256: 'a'.repeat(64),
          origin: cls === 'VERIFIED_FITS_CACHE' ? 'verified_fits_cache' : 'live_ibe',
          verified: cls !== 'UNAVAILABLE',
        },
      ],
    });
    assert.equal(decision.discoveryEligible, expectedAllowed[cls], `Unexpected eligibility for ${cls}`);
  }

  // Simulated / demo copy is never discovery eligible even if passed legacy flags
  const demoGate = canClaimDiscovery({
    sourceLabel: 'DEMO COPY (DIFFERENT FIELD)',
    isDemoCopy: true,
    discoveryEligible: true,
  });
  assert.equal(demoGate.sourceClassification, 'SYNTHETIC_DEMO');
  assert.equal(demoGate.allowed, false);

  // Unverified checksum inside LIVE_ARCHIVE_DATA must block discovery claim
  const tamperedLiveGate = canClaimDiscovery({
    sourceClassification: 'LIVE_ARCHIVE_DATA',
    tapFreshness: 'live',
    cacheIntegrityVerified: true,
    fitsChecksums: [
      { obsId: 'OBS_1', sha256: 'b'.repeat(64), origin: 'live_ibe', verified: false },
    ],
  });
  assert.equal(tamperedLiveGate.allowed, false);
  assert.equal(tamperedLiveGate.blockedReasonCode, 'UNVERIFIED_CACHE_CHECKSUM');

  // Legacy REAL SPHEREx DATA with stale TAP metadata maps safely to STALE_TAP_CACHE & blocks
  assert.equal(
    normalizeSourceClassification('REAL SPHEREx DATA', { tapFreshness: 'stale_cache' }),
    'STALE_TAP_CACHE'
  );
  const staleGate = canClaimDiscovery({
    sourceMode: 'live',
    tapFreshness: 'stale_cache',
  });
  assert.equal(staleGate.sourceClassification, 'STALE_TAP_CACHE');
  assert.equal(staleGate.allowed, false);

  // Spex explain prompt includes non-live guard when discoveryEligible=false
  const explainCtx: SpexExplainContext = {
    caseId: 'case-barnards-star',
    targetName: "Barnard's Star",
    frameWidth: 64,
    frameHeight: 64,
    detector: 'D5',
    wavelengthUm: 4.1,
    dataSourceType: 'snapshot',
    sourceClassification: 'SAVED_BENCHMARK',
    discoveryEligible: false,
    tapFreshness: 'snapshot',
  };
  const sysPrompt = buildSpexSystemInstruction('en', 'scientist', explainCtx);
  assert.ok(sysPrompt.includes('PROVENANCE HONESTY'));
  assert.ok(sysPrompt.includes('SAVED_BENCHMARK'));
  assert.ok(sysPrompt.includes('discoveryEligible=false'));
});

test('Scenarios 1, 2, 3, 4, 5, 7 (E2E): Live IRSA, Verified FITS Cache, Stale TAP Cache (non-cached!), Snapshot Fallback, Unavailable, and Corrupt Cache Rejection', async () => {
  const port = 3211;
  const mockIrsaPort = 3212;
  const targetRa = 210.5;
  const targetDec = 45.2;

  const epochs: MockEpochSpec[] = [0, 1, 2, 3, 4].map((i) => ({
    obsId: `2025W30_1A_010${i}_1`,
    mjd: 60860 + i * 35,
    dateObs: new Date((60860 + i * 35 - 40587) * 86400 * 1000).toISOString(),
    detector: 'D5',
    uri: `/ibe/data/spherex/qr2/level2b/2025W30_1A_010${i}_1/D5/level2b_2025W30_1A_010${i}_1.fits`,
    ra: targetRa,
    dec: targetDec,
  }));

  const mock = createControllableMockIrsa(epochs);
  await new Promise<void>((resolve) => mock.server.listen(mockIrsaPort, '127.0.0.1', resolve));

  const isolatedCacheDir = makeTempDir('spex-e2e-cache-');
  const isolatedPersistentDir = makeTempDir('spex-e2e-persist-');

  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      SPHEREX_IRSA_HOST: `http://127.0.0.1:${mockIrsaPort}`,
      SPHEREX_BASE_URL: `http://127.0.0.1:${mockIrsaPort}`,
      SPHEREX_OFFLINE: '0',
      SPHEREX_SKIP_WARMUP: '1',
      SPHEREX_TAP_CACHE_TTL_MS: '120', // 120ms TTL to cleanly exercise fresh -> stale TAP transition
      SPHEREX_CACHE_DIR: isolatedCacheDir,
      SPHEREX_PERSISTENT_CACHE_DIR: isolatedPersistentDir,
      SPHEREX_CACHE_MAX_MB: '32',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHttpReady(`http://127.0.0.1:${port}/api/status`);

    // --- Scenario 1: Live IRSA TAP & FITS download -> LIVE_ARCHIVE_DATA ---
    const queryRes = await fetch(`http://127.0.0.1:${port}/api/spherex/query?ra=${targetRa}&dec=${targetDec}`);
    assert.equal(queryRes.status, 200);
    const queryJson = (await queryRes.json()) as Record<string, any>;
    assert.equal(queryJson.sourceClassification, 'LIVE_ARCHIVE_DATA');
    assert.equal(queryJson.discoveryEligible, true);
    assert.equal(queryJson.tapFreshness, 'live');
    assert.equal(queryJson.observationIds.length, 5);

    const liveTsUrl = `http://127.0.0.1:${port}/api/spherex/timeseries?ra=${targetRa}&dec=${targetDec}&detector=D5&maxFrames=5&liveOnly=1`;
    const liveTsRes = await fetch(liveTsUrl);
    assert.equal(liveTsRes.status, 200);
    const liveTs = (await liveTsRes.json()) as Record<string, any>;
    assert.equal(liveTs.sourceClassification, 'LIVE_ARCHIVE_DATA');
    assert.equal(liveTs.discoveryEligible, true);
    assert.equal(liveTs.tapFreshness, 'live');
    assert.equal(liveTs.fitsOrigin, 'live_ibe');
    assert.equal(liveTs.cacheIntegrityVerified, true);
    assert.equal(liveTs.framesReturned, 5);
    assert.equal(liveTs.observationIds.length, 5);
    assert.equal(liveTs.fitsChecksums.length, 5);
    for (const c of liveTs.fitsChecksums) {
      assert.equal(c.verified, true);
      assert.equal(c.origin, 'live_ibe');
      assert.equal(c.sha256, mock.fitsByObsId.get(c.obsId)?.sha256);
    }

    // --- Scenario 7: Verified FITS cache hit + Provenance preservation (fresh TAP + local verified FITS) ---
    // Different wlWindow bypasses timeseriesResponseCache so pipeline runs against warmed FITS cache while TAP cache is still <120ms fresh
    const cachedUrl = `${liveTsUrl}&wlWindow=0.75-5.0`;
    const cachedRes = await fetch(cachedUrl);
    assert.equal(cachedRes.status, 200);
    const cachedTs = (await cachedRes.json()) as Record<string, any>;
    assert.equal(cachedTs.sourceClassification, 'VERIFIED_FITS_CACHE');
    assert.equal(cachedTs.discoveryEligible, true);
    assert.equal(cachedTs.fitsOrigin, 'verified_fits_cache');
    assert.equal(cachedTs.cacheIntegrityVerified, true);
    assert.equal(cachedTs.fitsChecksums.length, 5);
    for (const c of cachedTs.fitsChecksums) {
      assert.equal(c.verified, true);
      assert.equal(c.origin, 'verified_fits_cache');
      assert.equal(c.sha256, mock.fitsByObsId.get(c.obsId)?.sha256);
    }
    const cacheGate = canClaimDiscovery(cachedTs);
    assert.equal(cacheGate.allowed, true);
    assert.equal(cacheGate.observationIds.length, 5);

    // Verify /api/spherex/process preserves provenance on verified FITS cache too
    const procRes = await fetch(`http://127.0.0.1:${port}/api/spherex/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customCoords: { ra: targetRa, dec: targetDec }, detector: 'D5' }),
    });
    assert.equal(procRes.status, 200);
    const procJson = (await procRes.json()) as Record<string, any>;
    assert.equal(procJson.sourceClassification, 'VERIFIED_FITS_CACHE');
    assert.equal(procJson.discoveryEligible, true);
    assert.equal(procJson.provenance.sourceClassification, 'VERIFIED_FITS_CACHE');
    assert.ok(Array.isArray(procJson.observationIds) && procJson.observationIds.length >= 2);
    assert.ok(Array.isArray(procJson.fitsChecksums) && procJson.fitsChecksums.every((r: any) => r.verified && r.sha256));

    // --- Scenario 2: Stale TAP cache used when IRSA fails + NEVER cached as fresh ---
    await new Promise((r) => setTimeout(r, 160)); // Wait past 120ms TAP TTL
    // Use HTTP 404 on mock TAP so TAP fallback triggers immediately without 10s retry backoff
    mock.mode.tapStatus = 404;
    mock.mode.fitsStatus = 502;
    const staleUrl = `${liveTsUrl}&wlWindow=0.80-4.9`;
    const staleRes = await fetch(staleUrl);
    assert.equal(staleRes.status, 200);
    const staleJson = (await staleRes.json()) as Record<string, any>;
    assert.equal(staleJson.sourceClassification, 'STALE_TAP_CACHE');
    assert.equal(staleJson.discoveryEligible, false);
    assert.equal(staleJson.tapFreshness, 'stale_cache');
    assert.equal(staleJson.sourceMode, 'saved_benchmark');
    assert.equal(canClaimDiscovery(staleJson).allowed, false);

    // Recover mock IRSA and hit the EXACT same staleUrl: since STALE_TAP_CACHE was NOT written to
    // timeseriesResponseCache, this must fetch live TAP metadata & return VERIFIED_FITS_CACHE!
    mock.mode.tapStatus = 200;
    mock.mode.fitsStatus = 200;
    const recoveredRes = await fetch(staleUrl);
    assert.equal(recoveredRes.status, 200);
    const recoveredJson = (await recoveredRes.json()) as Record<string, any>;
    assert.equal(recoveredJson.sourceClassification, 'VERIFIED_FITS_CACHE');
    assert.equal(recoveredJson.tapFreshness, 'live');
    assert.equal(recoveredJson.discoveryEligible, true);

    // --- Scenario 3: Saved benchmark snapshot fallback -> SAVED_BENCHMARK ---
    mock.mode.tapStatus = 404;
    const snapRes = await fetch(`http://127.0.0.1:${port}/api/spherex/timeseries?caseId=case-barnards-star&maxFrames=5`);
    assert.equal(snapRes.status, 200);
    const snapJson = (await snapRes.json()) as Record<string, any>;
    assert.equal(snapJson.sourceMode, 'saved_benchmark');
    assert.equal(snapJson.isSnapshot, true);
    assert.equal(snapJson.sourceClassification, 'SAVED_BENCHMARK');
    assert.equal(snapJson.discoveryEligible, false);
    assert.equal(snapJson.tapFreshness, 'snapshot');
    assert.equal(snapJson.fitsOrigin, 'saved_snapshot');
    const snapGate = canClaimDiscovery(snapJson);
    assert.equal(snapGate.allowed, false);
    assert.equal(snapGate.blockedReasonCode, 'NON_LIVE_SNAPSHOT');

    // --- Scenario 4: No valid fallback available -> UNAVAILABLE ---
    const unavailRes = await fetch(
      `http://127.0.0.1:${port}/api/spherex/timeseries?ra=180.123&dec=-80.456&detector=D5&liveOnly=1`
    );
    assert.equal(unavailRes.status, 503);
    const unavailJson = (await unavailRes.json()) as Record<string, any>;
    assert.equal(unavailJson.sourceClassification, 'UNAVAILABLE');
    assert.equal(unavailJson.discoveryEligible, false);
    assert.equal(canClaimDiscovery(unavailJson).allowed, false);

    // Archive zero rows -> UNAVAILABLE
    mock.mode.tapStatus = 200;
    mock.mode.tapEmpty = true;
    const zeroQueryRes = await fetch(`http://127.0.0.1:${port}/api/spherex/query?ra=10.1&dec=-20.2`);
    assert.equal(zeroQueryRes.status, 200);
    const zeroQueryJson = (await zeroQueryRes.json()) as Record<string, any>;
    assert.equal(zeroQueryJson.state, 'ARCHIVE_ZERO_ROWS');
    assert.equal(zeroQueryJson.sourceClassification, 'UNAVAILABLE');
    assert.equal(zeroQueryJson.discoveryEligible, false);
    mock.mode.tapEmpty = false;

    // --- Scenario 5: Tampered cached FITS rejected + quarantined when IRSA cutout fails ---
    // Tamper every cached .fits file in isolatedCacheDir so sha256 fails sidecar verification
    const cachedFitsFiles = fs.readdirSync(isolatedCacheDir).filter((f) => f.endsWith('.fits'));
    assert.ok(cachedFitsFiles.length >= 5, `Expected cached FITS files in ${isolatedCacheDir}`);
    for (const f of cachedFitsFiles) {
      const p = path.join(isolatedCacheDir, f);
      const b = Buffer.from(fs.readFileSync(p));
      b[b.length - 1] ^= 0x5a;
      fs.writeFileSync(p, b);
    }

    // Keep TAP online (200) so server knows observations exist and attempts FITS cutout, while IBE fails (502/422)
    mock.mode.tapStatus = 200;
    mock.mode.fitsStatus = 500;
    const corruptRes = await fetch(`${liveTsUrl}&wlWindow=0.90-4.8`);
    assert.equal(corruptRes.status, 503);
    const corruptJson = (await corruptRes.json()) as Record<string, any>;
    assert.equal(corruptJson.sourceClassification, 'UNAVAILABLE');
    assert.equal(corruptJson.discoveryEligible, false);
    assert.equal(corruptJson.cacheIntegrityVerified, false);
    assert.ok(
      String(corruptJson.discoveryEligibilityReason || corruptJson.error || '').includes('CACHE_CHECKSUM_MISMATCH'),
      `Expected CACHE_CHECKSUM_MISMATCH reason, got: ${JSON.stringify(corruptJson)}`
    );
    const remainingFits = fs.readdirSync(isolatedCacheDir).filter((f) => f.endsWith('.fits'));
    assert.equal(remainingFits.length, 0, 'All tampered FITS files must have been quarantined and unlinked');
  } finally {
    await stopChildProcess(child);
    await new Promise<void>((resolve) => mock.server.close(() => resolve()));
    fs.rmSync(isolatedCacheDir, { recursive: true, force: true });
    fs.rmSync(isolatedPersistentDir, { recursive: true, force: true });
  }
});
