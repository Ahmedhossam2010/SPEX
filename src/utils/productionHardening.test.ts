import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  FitsCacheManager,
  INTENTIONAL_FITS_FIXTURES,
  DEFAULT_FITS_CACHE_MAX_BYTES,
  resolveFitsCacheMaxBytes,
} from './fitsCacheManager';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeFakeFitsBuffer(tag: string, sizeBytes: number): Buffer {
  const buf = Buffer.alloc(sizeBytes, 0x20);
  const header = `SIMPLE  =                    T / ${tag.slice(0, 32).padEnd(32)} `;
  buf.write(header, 0, 'ascii');
  return buf;
}

async function waitForHttpReady(url: string, timeoutMs = 15_000): Promise<Response> {
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

test('Docker ignore rules exclude runtime FITS caches and preserve exact 3 intentional fixtures', () => {
  const dockerignore = fs.readFileSync(path.join(process.cwd(), '.dockerignore'), 'utf-8');
  const lines = dockerignore
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  assert.ok(lines.includes('node_modules'));
  assert.ok(lines.includes('.env'));
  assert.ok(lines.includes('*.fits') || lines.includes('**/*.fits'));
  assert.ok(lines.includes('data/spherex_cache/*.fits'));

  const excludeIdx = Math.max(
    lines.indexOf('data/spherex_cache/*.fits'),
    lines.indexOf('**/*.fits'),
    lines.indexOf('*.fits')
  );

  for (const fixture of INTENTIONAL_FITS_FIXTURES) {
    const negRule = `!data/spherex_cache/${fixture}`;
    const negIdx = lines.indexOf(negRule);
    assert.ok(negIdx > excludeIdx, `${negRule} must appear AFTER wildcard *.fits exclusions`);
    const diskPath = path.join(process.cwd(), 'data', 'spherex_cache', fixture);
    assert.equal(fs.existsSync(diskPath), true, `Intentional fixture missing on disk: ${fixture}`);
  }
});

test('resolveFitsCacheMaxBytes provides safe default and honors SPHEREX_CACHE_MAX_BYTES / MB', () => {
  assert.equal(resolveFitsCacheMaxBytes({}), DEFAULT_FITS_CACHE_MAX_BYTES);
  assert.equal(resolveFitsCacheMaxBytes({ SPHEREX_CACHE_MAX_MB: '64' }), 64 * 1024 * 1024);
  assert.equal(
    resolveFitsCacheMaxBytes({ SPHEREX_CACHE_MAX_BYTES: '123456', SPHEREX_CACHE_MAX_MB: '64' }),
    123456
  );
  assert.equal(resolveFitsCacheMaxBytes({ SPHEREX_CACHE_MAX_MB: '-5' }), DEFAULT_FITS_CACHE_MAX_BYTES);
});

test('Bounded startup seeding stops strictly within maxBytes and prioritizes intentional fixtures', () => {
  const root = makeTempDir('spex-seed-');
  try {
    const cacheDir = path.join(root, 'cache');
    const persistentDir = path.join(root, 'persistent');
    fs.mkdirSync(persistentDir, { recursive: true });

    // Create 3 intentional fixtures (1000 bytes each) + 5 runtime FITS (1000 bytes each)
    for (const f of INTENTIONAL_FITS_FIXTURES) {
      fs.writeFileSync(path.join(persistentDir, f), makeFakeFitsBuffer(f, 1000));
    }
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(persistentDir, `runtime_${i}.fits`), makeFakeFitsBuffer(`rt_${i}`, 1000));
    }

    const mgr = new FitsCacheManager({
      cacheDir,
      persistentDir,
      maxBytes: 4500, // Enough for 4 files (all 3 fixtures + 1 runtime), NOT all 8
    });

    const summary = mgr.seedFromPersistent();
    assert.equal(summary.seededCount, 4);
    assert.equal(summary.skippedBudgetCount, 4);
    assert.equal(summary.totalBytes, 4000);
    assert.ok(summary.totalBytes <= 4500);
    assert.equal(mgr.measureDiskBytes(), 4000);

    for (const f of INTENTIONAL_FITS_FIXTURES) {
      assert.equal(mgr.has(f), true, `Priority fixture ${f} must be seeded first`);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('LRU eviction evicts least recently used unlocked files and respects exact byte accounting', () => {
  const root = makeTempDir('spex-lru-');
  try {
    const cacheDir = path.join(root, 'cache');
    const mgr = new FitsCacheManager({ cacheDir, maxBytes: 2500 });

    mgr.writeFileSync('a.fits', makeFakeFitsBuffer('A', 1000));
    mgr.writeFileSync('b.fits', makeFakeFitsBuffer('B', 1000));
    // Touch a.fits so b.fits becomes the least recently used entry
    const readA = mgr.readFileSync('a.fits');
    assert.ok(readA && readA.buffer.length === 1000);

    // Writing c.fits (1000 bytes) requires 3000 > 2500 -> must evict b.fits, keeping a.fits and c.fits
    const writeC = mgr.writeFileSync('c.fits', makeFakeFitsBuffer('C', 1000));
    assert.deepEqual(writeC.evictedFiles, ['b.fits']);
    assert.equal(mgr.has('a.fits'), true);
    assert.equal(mgr.has('b.fits'), false);
    assert.equal(mgr.has('c.fits'), true);

    const stats = mgr.getStats();
    assert.equal(stats.totalBytes, 2000);
    assert.equal(stats.fileCount, 2);
    assert.equal(stats.evictionsCount, 1);
    assert.equal(mgr.measureDiskBytes(), 2000);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('In-use file lease protects active files from eviction and concurrent atomic writes stay consistent', async () => {
  const root = makeTempDir('spex-conc-');
  try {
    const cacheDir = path.join(root, 'cache');
    const mgr = new FitsCacheManager({ cacheDir, maxBytes: 2500 });

    mgr.writeFileSync('locked.fits', makeFakeFitsBuffer('LOCKED', 1000));
    mgr.writeFileSync('evictable.fits', makeFakeFitsBuffer('EVICTABLE', 1000));

    // Acquire lease on locked.fits (oldest entry!)
    const release = mgr.acquireLease('locked.fits');
    try {
      // Writing new.fits must skip locked.fits and evict evictable.fits instead
      const res = mgr.writeFileSync('new.fits', makeFakeFitsBuffer('NEW', 1000));
      assert.equal(mgr.has('locked.fits'), true, 'Leased file must NEVER be evicted');
      assert.equal(mgr.has('evictable.fits'), false);
      assert.ok(res.evictedFiles.includes('evictable.fits'));

      // Even if a single larger file forces temporary over-budget while locked.fits is pinned,
      // locked.fits remains intact until release() runs
      mgr.writeFileSync('big.fits', makeFakeFitsBuffer('BIG', 2000));
      assert.equal(mgr.has('locked.fits'), true, 'Leased file must survive even temporary budget pressure');
    } finally {
      release();
    }

    // After releasing the lease, over-budget cache reconciles cleanly
    assert.ok(mgr.getStats().totalBytes <= 2500);
    assert.equal(mgr.getStats().totalBytes, mgr.measureDiskBytes());

    // Concurrent async atomic writes (mixed overwrites + distinct files)
    const writes: Promise<unknown>[] = [];
    for (let i = 0; i < 16; i++) {
      const target = i % 2 === 0 ? `conc_${i % 4}.fits` : `conc_shared.fits`;
      writes.push(mgr.writeFile(target, makeFakeFitsBuffer(`CONC_${i}`, 800)));
    }
    await Promise.all(writes);

    const files = fs.readdirSync(cacheDir);
    assert.equal(
      files.some((f) => f.startsWith('.tmp-')),
      false,
      'No orphaned temp files may remain after concurrent atomic writes'
    );
    const finalStats = mgr.getStats();
    assert.ok(finalStats.totalBytes <= 2500);
    assert.equal(finalStats.totalBytes, mgr.measureDiskBytes());
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('SpherexLogo uses existing eye_logo.svg asset with inline SVG fallback preserved', () => {
  const logoSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'SpherexLogo.tsx'), 'utf-8');
  assert.ok(logoSrc.includes('/assets/aistudio/eye_logo.svg'), 'SpherexLogo must use /assets/aistudio/eye_logo.svg');
  assert.equal(
    logoSrc.includes('eye_logo_no_text_centered_e772aeab.png'),
    false,
    'SpherexLogo must not reference the missing PNG file'
  );
  assert.ok(logoSrc.includes('onError='), 'Inline SVG error fallback must be preserved');
  assert.ok(logoSrc.includes('<svg'), 'Inline SVG vector fallback must be preserved');
  assert.equal(
    fs.existsSync(path.join(process.cwd(), 'public', 'assets', 'aistudio', 'eye_logo.svg')),
    true,
    'public/assets/aistudio/eye_logo.svg must exist'
  );
});

test('server.ts only imports Vite dynamically outside production', () => {
  const serverSrc = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');
  assert.equal(
    /^\s*import\s+.*from\s+['"]vite['"]/m.test(serverSrc),
    false,
    'server.ts must not import vite at top-level module scope'
  );
  assert.ok(
    serverSrc.includes("await import('vite')"),
    'server.ts must dynamically import vite inside development startup branch'
  );
});

test('Production server starts without initializing Vite, seeds bounded cache, serves SVG logo with image/svg+xml, and returns 404 for missing assets', async () => {
  const port = 3191;
  const isolatedCacheDir = makeTempDir('spex-prod-srv-cache-');
  // ESM loader hook that throws immediately if 'vite' is ever resolved or loaded in production
  const viteBlockerHook = `
    import { registerHooks } from 'node:module';
    registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier === 'vite' || specifier.startsWith('vite/')) {
          throw new Error('FORBIDDEN_VITE_IMPORT_IN_PRODUCTION: ' + specifier);
        }
        return nextResolve(specifier, context);
      }
    });
  `;
  const hookUrl = `data:text/javascript;base64,${Buffer.from(viteBlockerHook).toString('base64')}`;

  const child = spawn(process.execPath, ['--import', hookUrl, '--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      SPHEREX_SKIP_WARMUP: '1',
      SPHEREX_OFFLINE: '1',
      SPHEREX_CACHE_DIR: isolatedCacheDir,
      SPHEREX_CACHE_MAX_MB: '32',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr?.on('data', (d) => {
    stderr += d.toString();
  });

  try {
    const statusRes = await waitForHttpReady(`http://127.0.0.1:${port}/api/status`);
    assert.equal(statusRes.status, 200);
    const statusJson = (await statusRes.json()) as Record<string, any>;
    assert.equal(statusJson.cacheMaxBytes, 32 * 1024 * 1024);
    assert.ok(statusJson.cacheBytes > 0, 'Must seed priority FITS files into ephemeral cache');
    assert.ok(statusJson.cacheBytes <= statusJson.cacheMaxBytes, 'Seeded cache must obey 32 MiB cap');
    assert.ok(statusJson.cachedFITSFiles < 20, 'Bounded seeding must not copy all 140 FITS files');

    // All 3 intentional fixtures (~23.5 MB total) fit inside 32 MiB and must be seeded first
    for (const fixture of INTENTIONAL_FITS_FIXTURES) {
      assert.equal(fs.existsSync(path.join(isolatedCacheDir, fixture)), true, `Seeded cache must include ${fixture}`);
    }

    // Valid SVG logo must return 200 image/svg+xml
    const logoRes = await fetch(`http://127.0.0.1:${port}/assets/aistudio/eye_logo.svg`);
    assert.equal(logoRes.status, 200);
    assert.ok((logoRes.headers.get('content-type') || '').includes('image/svg+xml'));

    // Genuinely missing assets (including legacy PNG path) must return 404, never SPA index.html
    const missingPngRes = await fetch(`http://127.0.0.1:${port}/assets/aistudio/eye_logo_no_text_centered_e772aeab.png`);
    assert.equal(missingPngRes.status, 404);

    const missingOtherRes = await fetch(`http://127.0.0.1:${port}/assets/does-not-exist.svg`);
    assert.equal(missingOtherRes.status, 404);

    // If dist/ exists, built bundle JS asset must still serve 200 (not shadowed by /assets 404 handler)
    const distHtmlPath = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(distHtmlPath)) {
      const distHtml = fs.readFileSync(distHtmlPath, 'utf-8');
      const jsMatch = distHtml.match(/src="(\/assets\/[^"]+\.js)"/);
      if (jsMatch) {
        const jsRes = await fetch(`http://127.0.0.1:${port}${jsMatch[1]}`);
        assert.equal(jsRes.status, 200);
        assert.ok((jsRes.headers.get('content-type') || '').includes('javascript'));
      }
    }

    assert.equal(stderr.includes('FORBIDDEN_VITE_IMPORT_IN_PRODUCTION'), false);
  } finally {
    await stopChildProcess(child);
    fs.rmSync(isolatedCacheDir, { recursive: true, force: true });
  }
});

test('Development server initializes Vite middleware cleanly and preserves 404 on missing /assets/*', async () => {
  const port = 3192;
  const isolatedCacheDir = makeTempDir('spex-dev-srv-cache-');
  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      SPHEREX_SKIP_WARMUP: '1',
      SPHEREX_OFFLINE: '1',
      DISABLE_HMR: 'true',
      SPHEREX_CACHE_DIR: isolatedCacheDir,
      SPHEREX_CACHE_MAX_MB: '32',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    const statusRes = await waitForHttpReady(`http://127.0.0.1:${port}/api/status`, 20_000);
    assert.equal(statusRes.status, 200);

    // Vite middleware must serve /@vite/client as JS in development
    const viteClientRes = await fetch(`http://127.0.0.1:${port}/@vite/client`);
    assert.equal(viteClientRes.status, 200);
    assert.ok((viteClientRes.headers.get('content-type') || '').includes('javascript'));

    // Logo SVG still serves cleanly in dev
    const logoRes = await fetch(`http://127.0.0.1:${port}/assets/aistudio/eye_logo.svg`);
    assert.equal(logoRes.status, 200);
    assert.ok((logoRes.headers.get('content-type') || '').includes('image/svg+xml'));

    // Missing /assets/* returns 404 rather than Vite HTML fallback
    const missingRes = await fetch(`http://127.0.0.1:${port}/assets/nonexistent-test-asset.png`);
    assert.equal(missingRes.status, 404);
  } finally {
    await stopChildProcess(child);
    fs.rmSync(isolatedCacheDir, { recursive: true, force: true });
  }
});

test('IRSA TAP 502 Proxy Error skips startup warmup cleanly, isolates detector errors, and emits zero TAP stderr warnings', async () => {
  const port = 3193;
  const mockIrsaPort = 3194;
  const isolatedCacheDir = makeTempDir('spex-tap-502-cache-');

  const mockIrsa = http.createServer((_req, res) => {
    res.writeHead(502, 'Proxy Error', { 'Content-Type': 'text/plain' });
    res.end('Proxy Error');
  });
  await new Promise<void>((resolve) => mockIrsa.listen(mockIrsaPort, '127.0.0.1', resolve));

  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      SPHEREX_IRSA_HOST: `http://127.0.0.1:${mockIrsaPort}`,
      SPHEREX_OFFLINE: '0',
      SPHEREX_SKIP_WARMUP: '0',
      SPHEREX_CACHE_DIR: isolatedCacheDir,
      SPHEREX_CACHE_MAX_MB: '32',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (d) => {
    stdout += d.toString();
  });
  child.stderr?.on('data', (d) => {
    stderr += d.toString();
  });

  try {
    const statusRes = await waitForHttpReady(`http://127.0.0.1:${port}/api/status`);
    assert.equal(statusRes.status, 200);

    // Wait briefly for 1500ms warmup timer + preflight to complete
    await new Promise((r) => setTimeout(r, 2200));
    assert.ok(
      stdout.includes('[WarmCache] Skipped startup warmup: IRSA TAP returned HTTP 502'),
      `Expected warmup preflight skip log, got stdout: ${stdout}`
    );

    // Request Barnard's Star timeseries against failing 502 mock IRSA -> fast clean snapshot fallback
    const tsRes = await fetch(`http://127.0.0.1:${port}/api/spherex/timeseries?caseId=case-barnards-star&maxFrames=5`);
    assert.equal(tsRes.status, 200);
    const tsJson = (await tsRes.json()) as Record<string, any>;
    assert.equal(tsJson.sourceMode, 'saved_benchmark');
    assert.equal(tsJson.isSnapshot, true);

    assert.equal(
      stderr.includes('[TAP] Attempt'),
      false,
      `Expected zero [TAP] stderr warnings, got stderr: ${stderr}`
    );
  } finally {
    await stopChildProcess(child);
    await new Promise<void>((resolve) => mockIrsa.close(() => resolve()));
    fs.rmSync(isolatedCacheDir, { recursive: true, force: true });
  }
});
