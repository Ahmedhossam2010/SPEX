import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const DEFAULT_FITS_CACHE_MAX_BYTES = 256 * 1024 * 1024; // 256 MiB safe container /tmp bound

export const INTENTIONAL_FITS_FIXTURES = [
  'b6a1e605728059ea6b7def1e9683adb2.fits',
  '569dafa911ec60ff30abb1807d719fef.fits',
  '75b2c2369c175060576bec8d2e5333c0.fits',
] as const;

export function resolveFitsCacheMaxBytes(env: NodeJS.ProcessEnv = process.env): number {
  const rawBytes = env.SPHEREX_CACHE_MAX_BYTES;
  if (rawBytes !== undefined && rawBytes.trim() !== '') {
    const parsed = Number(rawBytes);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }
  const rawMb = env.SPHEREX_CACHE_MAX_MB;
  if (rawMb !== undefined && rawMb.trim() !== '') {
    const parsedMb = Number(rawMb);
    if (Number.isFinite(parsedMb) && parsedMb > 0) {
      return Math.floor(parsedMb * 1024 * 1024);
    }
  }
  return DEFAULT_FITS_CACHE_MAX_BYTES;
}

export interface FitsCacheEntry {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  mtimeMs: number;
  seq: number;
}

export interface FitsCacheMetadata {
  sha256: string;
  origin?: 'live_ibe' | 'seeded_fixture_cache' | 'persistent_cache';
  obsId?: string;
  sourceUrl?: string;
  recordedAt: string;
  sizeBytes: number;
}

export interface FitsVerifiedReadResult {
  status: 'verified' | 'missing' | 'checksum_mismatch' | 'corrupt_header' | 'missing_sidecar';
  buffer?: Buffer;
  sizeBytes?: number;
  mtime?: Date;
  computedSha256?: string;
  expectedSha256?: string;
  meta?: FitsCacheMetadata | null;
}

export interface FitsCacheStats {
  cacheDir: string;
  fileCount: number;
  totalBytes: number;
  maxBytes: number;
  inUseCount: number;
  evictionsCount: number;
  integrityFailuresCount: number;
}

export interface FitsCacheSeedResult {
  seededCount: number;
  skippedExistingCount: number;
  skippedBudgetCount: number;
  seededBytes: number;
  totalBytes: number;
  fileCount: number;
  maxBytes: number;
}

export interface FitsCacheManagerOptions {
  cacheDir: string;
  persistentDir?: string;
  maxBytes?: number;
  priorityFixtures?: readonly string[];
}

export function isValidFitsHeaderBuffer(buffer: Buffer): boolean {
  if (!Buffer.isBuffer(buffer) || buffer.length < 80) return false;
  return buffer.subarray(0, 9).toString('ascii') === 'SIMPLE  =';
}

export function computeBufferSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function atomicWriteFileSync(targetPath: string, buffer: Buffer): void {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const base = path.basename(targetPath);
  const tmpPath = path.join(dir, `.tmp-${base}-${process.pid}-${crypto.randomUUID()}`);
  try {
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, targetPath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
    throw err;
  }
}

export class FitsCacheManager {
  public readonly cacheDir: string;
  public readonly persistentDir?: string;
  public readonly maxBytes: number;
  private readonly priorityFixtures: readonly string[];

  private entries = new Map<string, FitsCacheEntry>();
  private inUseCounts = new Map<string, number>();
  private totalBytes = 0;
  private accessSeq = 0;
  private evictionsCount = 0;
  private integrityFailuresCount = 0;
  private commitChain: Promise<void> = Promise.resolve();

  constructor(options: FitsCacheManagerOptions) {
    this.cacheDir = path.resolve(options.cacheDir);
    this.persistentDir = options.persistentDir ? path.resolve(options.persistentDir) : undefined;
    this.maxBytes =
      typeof options.maxBytes === 'number' && Number.isFinite(options.maxBytes) && options.maxBytes > 0
        ? Math.floor(options.maxBytes)
        : DEFAULT_FITS_CACHE_MAX_BYTES;
    this.priorityFixtures = options.priorityFixtures ?? INTENTIONAL_FITS_FIXTURES;

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    this.syncFromDisk();
  }

  private getSidecarPath(cleanFileName: string): string {
    return path.join(this.cacheDir, '.integrity', `${cleanFileName}.sha256.json`);
  }

  private writeSidecarSync(cleanFileName: string, buffer: Buffer, meta?: Partial<Omit<FitsCacheMetadata, 'sha256' | 'sizeBytes' | 'recordedAt'>> & { recordedAt?: string }): void {
    const sidecarPath = this.getSidecarPath(cleanFileName);
    const payload: FitsCacheMetadata = {
      sha256: computeBufferSha256(buffer),
      origin: meta?.origin || 'live_ibe',
      obsId: meta?.obsId,
      sourceUrl: meta?.sourceUrl,
      recordedAt: meta?.recordedAt || new Date().toISOString(),
      sizeBytes: buffer.length,
    };
    atomicWriteFileSync(sidecarPath, Buffer.from(JSON.stringify(payload), 'utf-8'));
  }

  public readMetadata(fileName: string): FitsCacheMetadata | null {
    try {
      const clean = this.normalizeFileName(fileName);
      const sidecarPath = this.getSidecarPath(clean);
      if (!fs.existsSync(sidecarPath)) return null;
      const parsed = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'));
      if (!parsed || typeof parsed.sha256 !== 'string') return null;
      return parsed as FitsCacheMetadata;
    } catch {
      return null;
    }
  }

  private unlinkSidecarSync(cleanFileName: string): void {
    try {
      const sidecarPath = this.getSidecarPath(cleanFileName);
      if (fs.existsSync(sidecarPath)) fs.unlinkSync(sidecarPath);
    } catch {}
  }

  private normalizeFileName(fileName: string): string {
    const base = path.basename(fileName);
    if (!base || base !== fileName || base.startsWith('.tmp-')) {
      throw new Error(`Invalid cache file name: ${fileName}`);
    }
    return base;
  }

  private nextSeq(): number {
    this.accessSeq += 1;
    return this.accessSeq;
  }

  /**
   * Re-indexes cacheDir from disk, removes orphaned temp files, and recalculates exact totalBytes.
   */
  public syncFromDisk(): void {
    if (!fs.existsSync(this.cacheDir)) {
      this.entries.clear();
      this.totalBytes = 0;
      return;
    }

    const dirItems = fs.readdirSync(this.cacheDir);
    const diskFits: Array<{ fileName: string; filePath: string; sizeBytes: number; mtimeMs: number }> = [];

    for (const item of dirItems) {
      const fullPath = path.join(this.cacheDir, item);
      if (item.startsWith('.tmp-')) {
        try {
          fs.unlinkSync(fullPath);
        } catch {}
        continue;
      }
      if (!item.endsWith('.fits')) continue;
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) continue;
        diskFits.push({
          fileName: item,
          filePath: fullPath,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs,
        });
      } catch {}
    }

    // Oldest mtime gets lowest sequence number so LRU order is deterministic after restart
    diskFits.sort((a, b) => a.mtimeMs - b.mtimeMs || a.fileName.localeCompare(b.fileName));

    const prevSeqs = new Map<string, number>();
    for (const [k, v] of this.entries.entries()) {
      prevSeqs.set(k, v.seq);
    }

    this.entries.clear();
    let sumBytes = 0;
    for (const f of diskFits) {
      const seq = prevSeqs.get(f.fileName) ?? this.nextSeq();
      this.entries.set(f.fileName, {
        fileName: f.fileName,
        filePath: f.filePath,
        sizeBytes: f.sizeBytes,
        mtimeMs: f.mtimeMs,
        seq,
      });
      sumBytes += f.sizeBytes;
    }
    this.totalBytes = sumBytes;

    // Enforce bound on pre-existing directory contents
    if (this.totalBytes > this.maxBytes) {
      this.evictToFit(0);
    }
  }

  /**
   * Bounded startup seeding from persistentDir into ephemeral cacheDir.
   * Prioritizes intentional fixtures first, copies atomically, and stops strictly before exceeding maxBytes.
   */
  public seedFromPersistent(maxSeedBytes: number = this.maxBytes): FitsCacheSeedResult {
    const budget = Math.min(this.maxBytes, Math.max(0, Math.floor(maxSeedBytes)));
    const result: FitsCacheSeedResult = {
      seededCount: 0,
      skippedExistingCount: 0,
      skippedBudgetCount: 0,
      seededBytes: 0,
      totalBytes: this.totalBytes,
      fileCount: this.entries.size,
      maxBytes: this.maxBytes,
    };

    if (!this.persistentDir || !fs.existsSync(this.persistentDir)) {
      return result;
    }

    const prioritySet = new Set(this.priorityFixtures);
    const allPersistent = fs
      .readdirSync(this.persistentDir)
      .filter((f) => f.endsWith('.fits') && !f.startsWith('.tmp-'));

    const withStats: Array<{ fileName: string; srcPath: string; sizeBytes: number; mtimeMs: number; isPriority: boolean }> = [];
    for (const f of allPersistent) {
      const srcPath = path.join(this.persistentDir, f);
      try {
        const stat = fs.statSync(srcPath);
        if (!stat.isFile()) continue;
        withStats.push({
          fileName: f,
          srcPath,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs,
          isPriority: prioritySet.has(f),
        });
      } catch {}
    }

    // Priority fixtures first (in fixture list order), then newest files first for determinism
    withStats.sort((a, b) => {
      if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
      if (a.isPriority && b.isPriority) {
        return this.priorityFixtures.indexOf(a.fileName) - this.priorityFixtures.indexOf(b.fileName);
      }
      return b.mtimeMs - a.mtimeMs || a.fileName.localeCompare(b.fileName);
    });

    for (const item of withStats) {
      if (this.entries.has(item.fileName)) {
        result.skippedExistingCount += 1;
        continue;
      }
      if (this.totalBytes + item.sizeBytes > budget) {
        result.skippedBudgetCount += 1;
        continue;
      }

      const destPath = path.join(this.cacheDir, item.fileName);
      const tmpPath = path.join(this.cacheDir, `.tmp-seed-${item.fileName}-${process.pid}-${crypto.randomUUID()}`);
      try {
        fs.copyFileSync(item.srcPath, tmpPath);
        const seededBuf = fs.readFileSync(tmpPath);
        fs.renameSync(tmpPath, destPath);
        const stat = fs.statSync(destPath);
        this.writeSidecarSync(item.fileName, seededBuf, {
          origin: item.isPriority ? 'seeded_fixture_cache' : 'persistent_cache',
          recordedAt: new Date(stat.mtimeMs).toISOString(),
        });
        this.entries.set(item.fileName, {
          fileName: item.fileName,
          filePath: destPath,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs,
          seq: this.nextSeq(),
        });
        this.totalBytes += stat.size;
        result.seededCount += 1;
        result.seededBytes += stat.size;
      } catch {
        try {
          if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch {}
      }
    }

    result.totalBytes = this.totalBytes;
    result.fileCount = this.entries.size;
    return result;
  }

  public isInUse(fileName: string): boolean {
    return (this.inUseCounts.get(fileName) || 0) > 0;
  }

  /**
   * Acquires an active-processing lease on a cached file so LRU eviction will not delete it
   * while it is being read, written, or parsed by the scientific pipeline.
   */
  public acquireLease(fileName: string): () => void {
    const clean = this.normalizeFileName(fileName);
    this.inUseCounts.set(clean, (this.inUseCounts.get(clean) || 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const cur = this.inUseCounts.get(clean) || 0;
      if (cur <= 1) {
        this.inUseCounts.delete(clean);
        // If cache temporarily ran over budget while this file was leased, reconcile now.
        if (this.totalBytes > this.maxBytes) {
          this.evictToFit(0);
        }
      } else {
        this.inUseCounts.set(clean, cur - 1);
      }
    };
  }

  public async withFileLease<T>(fileName: string, fn: (filePath: string) => Promise<T> | T): Promise<T> {
    const clean = this.normalizeFileName(fileName);
    const release = this.acquireLease(clean);
    try {
      return await fn(path.join(this.cacheDir, clean));
    } finally {
      release();
    }
  }

  public has(fileName: string): boolean {
    const clean = this.normalizeFileName(fileName);
    return fs.existsSync(path.join(this.cacheDir, clean));
  }

  public getFilePath(fileName: string): string {
    const clean = this.normalizeFileName(fileName);
    return path.join(this.cacheDir, clean);
  }

  public touch(fileName: string): void {
    const clean = this.normalizeFileName(fileName);
    const entry = this.entries.get(clean);
    if (entry) {
      entry.seq = this.nextSeq();
    }
  }

  public listFiles(): string[] {
    if (!fs.existsSync(this.cacheDir)) return [];
    return fs
      .readdirSync(this.cacheDir)
      .filter((f) => f.endsWith('.fits') && !f.startsWith('.tmp-'));
  }

  public readFileSync(fileName: string): { buffer: Buffer; sizeBytes: number; mtime: Date } | null {
    const clean = this.normalizeFileName(fileName);
    const targetPath = path.join(this.cacheDir, clean);
    const release = this.acquireLease(clean);
    try {
      if (!fs.existsSync(targetPath)) {
        const stale = this.entries.get(clean);
        if (stale) {
          this.totalBytes = Math.max(0, this.totalBytes - stale.sizeBytes);
          this.entries.delete(clean);
        }
        return null;
      }
      const buffer = fs.readFileSync(targetPath);
      const stat = fs.statSync(targetPath);
      const prev = this.entries.get(clean);
      if (prev) {
        if (prev.sizeBytes !== stat.size) {
          this.totalBytes = Math.max(0, this.totalBytes - prev.sizeBytes) + stat.size;
          prev.sizeBytes = stat.size;
        }
        prev.mtimeMs = stat.mtimeMs;
        prev.seq = this.nextSeq();
      } else {
        this.entries.set(clean, {
          fileName: clean,
          filePath: targetPath,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs,
          seq: this.nextSeq(),
        });
        this.totalBytes += stat.size;
      }
      return { buffer, sizeBytes: stat.size, mtime: stat.mtime };
    } finally {
      release();
    }
  }

  /**
   * Reads a cached FITS file and enforces FITS header & SHA-256 sidecar / expected hash validation.
   * Any corrupted or checksum-mismatched entry is quarantined (removed from cache) and rejected.
   */
  public readVerifiedFileSync(
    fileName: string,
    options: { expectedSha256?: string; requireSidecar?: boolean } = {}
  ): FitsVerifiedReadResult {
    const clean = this.normalizeFileName(fileName);
    const targetPath = path.join(this.cacheDir, clean);
    const release = this.acquireLease(clean);
    try {
      if (!fs.existsSync(targetPath)) {
        const stale = this.entries.get(clean);
        if (stale) {
          this.totalBytes = Math.max(0, this.totalBytes - stale.sizeBytes);
          this.entries.delete(clean);
        }
        return { status: 'missing' };
      }

      const buffer = fs.readFileSync(targetPath);
      const stat = fs.statSync(targetPath);
      const computedSha256 = computeBufferSha256(buffer);
      const sidecar = this.readMetadata(clean);
      const expected = options.expectedSha256 || sidecar?.sha256;

      if (options.requireSidecar && !sidecar && !options.expectedSha256) {
        this.integrityFailuresCount += 1;
        this.removeEntrySync(clean);
        return { status: 'missing_sidecar', computedSha256, meta: null };
      }

      if (!isValidFitsHeaderBuffer(buffer)) {
        this.integrityFailuresCount += 1;
        this.removeEntrySync(clean);
        return {
          status: 'corrupt_header',
          computedSha256,
          expectedSha256: expected,
          meta: sidecar,
        };
      }

      if (expected && computedSha256 !== expected) {
        this.integrityFailuresCount += 1;
        this.removeEntrySync(clean);
        return {
          status: 'checksum_mismatch',
          computedSha256,
          expectedSha256: expected,
          meta: sidecar,
        };
      }

      // Record sidecar if missing for legitimate uncorrupted FITS header and no mismatch
      if (!sidecar) {
        this.writeSidecarSync(clean, buffer, {
          origin: 'persistent_cache',
          recordedAt: stat.mtime.toISOString(),
        });
      }

      const prev = this.entries.get(clean);
      if (prev) {
        if (prev.sizeBytes !== stat.size) {
          this.totalBytes = Math.max(0, this.totalBytes - prev.sizeBytes) + stat.size;
          prev.sizeBytes = stat.size;
        }
        prev.mtimeMs = stat.mtimeMs;
        prev.seq = this.nextSeq();
      } else {
        this.entries.set(clean, {
          fileName: clean,
          filePath: targetPath,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs,
          seq: this.nextSeq(),
        });
        this.totalBytes += stat.size;
      }

      return {
        status: 'verified',
        buffer,
        sizeBytes: stat.size,
        mtime: stat.mtime,
        computedSha256,
        expectedSha256: expected || computedSha256,
        meta: sidecar || this.readMetadata(clean),
      };
    } finally {
      release();
    }
  }

  public removeEntrySync(fileName: string): boolean {
    const clean = this.normalizeFileName(fileName);
    const targetPath = path.join(this.cacheDir, clean);
    let removed = false;
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
        removed = true;
      }
    } catch {}
    this.unlinkSidecarSync(clean);
    const existing = this.entries.get(clean);
    if (existing) {
      this.totalBytes = Math.max(0, this.totalBytes - existing.sizeBytes);
      this.entries.delete(clean);
    }
    return removed;
  }

  /**
   * Evicts unlocked entries in strict LRU order (lowest access sequence first)
   * until totalBytes + additionalBytesNeeded <= maxBytes (or no unlocked entries remain).
   */
  public evictToFit(additionalBytesNeeded = 0, protectedFileName?: string): string[] {
    const evicted: string[] = [];
    if (this.totalBytes + additionalBytesNeeded <= this.maxBytes) {
      return evicted;
    }

    const candidates = Array.from(this.entries.values())
      .filter((e) => e.fileName !== protectedFileName && !this.isInUse(e.fileName))
      .sort((a, b) => a.seq - b.seq || a.mtimeMs - b.mtimeMs || a.fileName.localeCompare(b.fileName));

    for (const candidate of candidates) {
      if (this.totalBytes + additionalBytesNeeded <= this.maxBytes) break;
      try {
        if (fs.existsSync(candidate.filePath)) {
          fs.unlinkSync(candidate.filePath);
        }
        this.unlinkSidecarSync(candidate.fileName);
        this.entries.delete(candidate.fileName);
        this.totalBytes = Math.max(0, this.totalBytes - candidate.sizeBytes);
        this.evictionsCount += 1;
        evicted.push(candidate.fileName);
      } catch {
        // Leave accounting unchanged if unlink fails so next pass reconciles safely
      }
    }

    return evicted;
  }

  private commitBufferedTempFile(
    cleanName: string,
    tmpPath: string,
    targetPath: string,
    byteLength: number,
    meta?: Partial<Omit<FitsCacheMetadata, 'sha256' | 'sizeBytes' | 'recordedAt'>> & { recordedAt?: string },
    bufferForMeta?: Buffer
  ): { filePath: string; sizeBytes: number; evictedFiles: string[] } {
    const release = this.acquireLease(cleanName);
    try {
      const existing = this.entries.get(cleanName);
      const prevBytes = existing ? existing.sizeBytes : 0;
      const additionalNeeded = Math.max(0, byteLength - prevBytes);
      const evictedBefore = this.evictToFit(additionalNeeded, cleanName);

      fs.renameSync(tmpPath, targetPath);
      const stat = fs.statSync(targetPath);

      const finalBuffer = bufferForMeta || fs.readFileSync(targetPath);
      this.writeSidecarSync(cleanName, finalBuffer, {
        ...meta,
        recordedAt: meta?.recordedAt || new Date(stat.mtimeMs).toISOString(),
      });

      this.totalBytes = Math.max(0, this.totalBytes - prevBytes) + stat.size;
      this.entries.set(cleanName, {
        fileName: cleanName,
        filePath: targetPath,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
        seq: this.nextSeq(),
      });

      const evictedAfter = this.evictToFit(0, cleanName);
      return {
        filePath: targetPath,
        sizeBytes: stat.size,
        evictedFiles: [...evictedBefore, ...evictedAfter],
      };
    } finally {
      release();
    }
  }

  /**
   * Atomically writes a FITS file into cacheDir via unique temp file + renameSync,
   * updating cache accounting, writing SHA-256 sidecar metadata, and evicting unlocked LRU entries to stay within maxBytes.
   */
  public writeFileSync(
    fileName: string,
    buffer: Buffer,
    meta?: Partial<Omit<FitsCacheMetadata, 'sha256' | 'sizeBytes' | 'recordedAt'>> & { recordedAt?: string }
  ): { filePath: string; sizeBytes: number; evictedFiles: string[] } {
    const clean = this.normalizeFileName(fileName);
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    const targetPath = path.join(this.cacheDir, clean);
    const tmpPath = path.join(this.cacheDir, `.tmp-${clean}-${process.pid}-${crypto.randomUUID()}`);

    try {
      fs.writeFileSync(tmpPath, buffer);
      return this.commitBufferedTempFile(clean, tmpPath, targetPath, buffer.length, meta, buffer);
    } catch (err) {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {}
      throw err;
    }
  }

  /**
   * Async atomic write with serialized commit/eviction step so concurrent writers never
   * corrupt target files or race on totalBytes accounting.
   */
  public async writeFile(
    fileName: string,
    buffer: Buffer,
    meta?: Partial<Omit<FitsCacheMetadata, 'sha256' | 'sizeBytes' | 'recordedAt'>> & { recordedAt?: string }
  ): Promise<{ filePath: string; sizeBytes: number; evictedFiles: string[] }> {
    const clean = this.normalizeFileName(fileName);
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    const targetPath = path.join(this.cacheDir, clean);
    const tmpPath = path.join(this.cacheDir, `.tmp-${clean}-${process.pid}-${crypto.randomUUID()}`);

    await fs.promises.writeFile(tmpPath, buffer);

    const runCommit = async () => {
      try {
        return this.commitBufferedTempFile(clean, tmpPath, targetPath, buffer.length, meta, buffer);
      } catch (err) {
        try {
          if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch {}
        throw err;
      }
    };

    const next = this.commitChain.then(runCommit, runCommit);
    this.commitChain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  public getStats(): FitsCacheStats {
    return {
      cacheDir: this.cacheDir,
      fileCount: this.entries.size,
      totalBytes: this.totalBytes,
      maxBytes: this.maxBytes,
      inUseCount: this.inUseCounts.size,
      evictionsCount: this.evictionsCount,
      integrityFailuresCount: this.integrityFailuresCount,
    };
  }

  /**
   * Computes actual total size directly from disk for consistency audits and tests.
   */
  public measureDiskBytes(): number {
    if (!fs.existsSync(this.cacheDir)) return 0;
    let bytes = 0;
    for (const f of fs.readdirSync(this.cacheDir)) {
      if (!f.endsWith('.fits') || f.startsWith('.tmp-')) continue;
      try {
        const st = fs.statSync(path.join(this.cacheDir, f));
        if (st.isFile()) bytes += st.size;
      } catch {}
    }
    return bytes;
  }
}
