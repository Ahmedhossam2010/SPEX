import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { FITSReader } from './src/science/fitsReader';
import { ScientificPipeline } from './src/science/pipeline';
import { CatalogMatcher } from './src/science/catalogMatcher';
import { WCS } from './src/science/wcs';
import {
  InvestigationResult,
  SPHERExObservation,
  ProvenanceRecord,
  CandidateDetection,
  ChallengeTarget,
} from './src/science/types';
import { SPEXMood } from './src/spex/spexAssets';
import {
  OFFICIAL_CHALLENGE_TARGETS,
  SPHEREX_QR2_FOOTPRINT,
} from './src/science/challengeTargets';
import {
  SPHEREX_DETECTOR_ARRAYS,
  SPHEREX_102_CHANNELS,
  generateCandidateSED,
} from './src/science/spectralBands';
import { DataReleaseAdapter } from './src/science/dataReleaseAdapter';
import { ArchiveAdapter } from './src/science/archiveAdapter';
import {
  resolveFitsUrl,
  buildCutoutRequestUrl,
  ResolvedFitsUrl,
  extractVisitKey,
  decodeBitmaskFlags,
  computeDetectorStacks,
  extractApertureSpectrum,
  TimeSeriesFrame,
  TemporalPairInfo,
  DetectorStack,
  SpectrumPoint,
  CatalogOverlayItem,
  AvailableDetectorSummary,
  LightCurvePoint,
} from './src/science/timeSeriesPipeline';
import { parseCoordinateInput } from './src/science/coordinates';
import {
  propagatePosition,
  julianYearFromMjd,
  computeExpectedProperMotionOffset,
} from './src/science/properMotion';
import { FAMOUS_OBJECTS_CATALOG, getFamousObjectById } from './src/science/famousObjects';
import {
  selectIsolatedReferenceStars,
  fitFrameAstrometryCorrection,
  measureFrameTargetDifferential,
  fitSaturatedPsfWing,
  measureFrameApertureFlux,
  isCorePixelUnsaturated,
  measureControlResidualScatter,
  computeDetectorAndBrightnessFloor,
  evaluateAstrometryErrorBudget,
  findNearbyCatalogNeighbors,
  wrapDeltaRaDeg,
  ControlScatterReport,
  FrameAstrometrySolution,
  FrameTargetAstrometry,
  LeaveOneOutResidual,
} from './src/science/astrometry';

const CONTROL_FLOOR_FILE = path.join(process.cwd(), 'data', 'snapshots', 'control-floor.json');
const controlScatterStore = new Map<string, ControlScatterReport>();
try {
  if (fs.existsSync(CONTROL_FLOOR_FILE)) {
    const savedFloor = JSON.parse(fs.readFileSync(CONTROL_FLOOR_FILE, 'utf-8'));
    if (Array.isArray(savedFloor?.reports)) {
      for (const rep of savedFloor.reports) {
        // Scope control scatter strictly per detector (skip legacy untyped entries)
        if (rep?.targetId && rep?.detector) {
          controlScatterStore.set(`${rep.detector}::${rep.targetId}`, rep);
        }
      }
    }
  }
} catch {}

function saveControlFloorCache() {
  try {
    const dir = path.dirname(CONTROL_FLOOR_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      CONTROL_FLOOR_FILE,
      JSON.stringify({ updatedAt: new Date().toISOString(), reports: Array.from(controlScatterStore.values()) }, null, 2)
    );
  } catch {}
}

const CATALOG_CACHE_FILE = path.join(process.cwd(), 'data', 'catalog_cache.json');
const persistedNeighborsStore = new Map<string, any[]>();
try {
  if (fs.existsSync(CATALOG_CACHE_FILE)) {
    const savedCat = JSON.parse(fs.readFileSync(CATALOG_CACHE_FILE, 'utf-8'));
    if (savedCat?.overlays && typeof savedCat.overlays === 'object') {
      CatalogMatcher.seedOverlayCache(savedCat.overlays);
    }
    if (savedCat?.neighbors && typeof savedCat.neighbors === 'object') {
      for (const [k, v] of Object.entries(savedCat.neighbors)) {
        if (Array.isArray(v)) persistedNeighborsStore.set(k, v);
      }
    }
  }
} catch {}

function saveCatalogDiskCache() {
  try {
    const dir = path.dirname(CATALOG_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const neighborsObj: Record<string, any[]> = {};
    for (const [k, v] of persistedNeighborsStore.entries()) {
      neighborsObj[k] = v;
    }
    fs.writeFileSync(
      CATALOG_CACHE_FILE,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          overlays: CatalogMatcher.exportOverlayCache(),
          neighbors: neighborsObj,
        },
        null,
        2
      )
    );
  } catch {}
}

function getRecommendedDetectorsForTarget(
  target?: ChallengeTarget,
  wlMinFilter?: number | null,
  wlMaxFilter?: number | null
): string[] {
  if (wlMinFilter != null && wlMaxFilter != null) {
    const matching = SPHEREX_DETECTOR_ARRAYS
      .filter((d) => d.wavelengthRangeUm[1] >= wlMinFilter && d.wavelengthRangeUm[0] <= wlMaxFilter)
      .map((d) => `D${d.detectorNumber}`);
    if (matching.length > 0) return matching;
  }
  const tid = (target?.id || '').toLowerCase();
  // Task 4: Pick detector order from target catalog brightness & spectral peak
  // WISE 0855 (~250 K Y dwarf, extremely faint < 2.4 um, bright near 4.5 um): try D5 & D6 first.
  if (tid.includes('wise-0855') || tid.includes('0855')) {
    return ['D5', 'D6', 'D4', 'D3', 'D2', 'D1'];
  }
  // Barnard's Star (M4V, H=4.83 mag): D2 core saturates; D3/D1/D5 give unsaturated frames across ~400d.
  if (tid.includes('barnard')) {
    return ['D3', 'D1', 'D5', 'D6', 'D4', 'D2'];
  }
  // Epsilon Indi Ba/Bb (T1+T6, J=11.9, K=11.2): bright & clean in D3/D2 without saturation.
  if (tid.includes('epsilon-indi')) {
    return ['D3', 'D2', 'D4', 'D5', 'D1', 'D6'];
  }
  // RW Aurigae (G=10.42 CTTS): D1/D3 avoid D2 core saturation.
  if (tid.includes('rw-aur')) {
    return ['D1', 'D3', 'D4', 'D2', 'D5', 'D6'];
  }
  // R Draconis (bright Mira giant): shorter bands saturate heavily; try D6/D5 first, then D1.
  if (tid.includes('r-dra')) {
    return ['D6', 'D5', 'D1', 'D3', 'D4', 'D2'];
  }
  return ['D3', 'D2', 'D4', 'D1', 'D5', 'D6'];
}

function findTargetDefinition(identifier?: string, ra?: number, dec?: number): ChallengeTarget | undefined {
  const cleanId = (identifier || '').replace(/^(case|target)-/, '').toLowerCase().replace(/[-_]/g, '');
  if (cleanId) {
    const byId = OFFICIAL_CHALLENGE_TARGETS.find((t) => {
      const tClean = t.id.replace(/^(case|target)-/, '').toLowerCase().replace(/[-_]/g, '');
      return tClean.includes(cleanId) || cleanId.includes(tClean);
    });
    if (byId) return byId;
  }
  if (Number.isFinite(ra) && Number.isFinite(dec)) {
    return OFFICIAL_CHALLENGE_TARGETS.find((t) => WCS.angularSeparationArcsec(t.ra, t.dec, ra!, dec!) < 300);
  }
  return undefined;
}

function getTapQueryCoords(ra: number, dec: number, target?: ChallengeTarget): { queryRa: number; queryDec: number } {
  if (target && target.pmRaMasYr != null && target.pmDecMasYr != null && target.coordinateEpochYear != null) {
    // Always propagate from canonical J2000 target coordinates so propagated inputs are never double-shifted
    const prop = propagatePosition(target.ra, target.dec, target.pmRaMasYr, target.pmDecMasYr, target.coordinateEpochYear, 2025.6);
    return { queryRa: prop.ra, queryDec: prop.dec };
  }
  return { queryRa: ra, queryDec: dec };
}

const app = express();

function resolvePort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

function resolveHost(): string {
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return '0.0.0.0';
}

const PORT = resolvePort();
const HOST = resolveHost();

process.on('unhandledRejection', (reason) => {
  console.warn('[SPHEREx Engine] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[SPHEREx Engine] Uncaught Exception:', err);
});
const CACHE_DIR = path.join('/tmp', 'spherex_cache');

// Concurrency limit for IRSA cutout downloads (max 6 parallel)
class Semaphore {
  private running = 0;
  private queue: (() => void)[] = [];
  constructor(private max: number) {}
  async acquire(): Promise<() => void> {
    if (this.running < this.max) {
      this.running++;
      return () => this.release();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve(() => this.release());
      });
    });
  }
  private release() {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}
const cutoutSemaphore = new Semaphore(6);

// Configurable Data Release Paths via Environment Variables (B1, B12)
const SPHEREX_IRSA_HOST = (process.env.SPHEREX_IRSA_HOST || 'https://irsa.ipac.caltech.edu').replace(/\/+$/, '');
const SPHEREX_DATA_RELEASE =
  process.env.SPHEREX_DATA_RELEASE || 'SPHEREx Public Archive (DR1 / QR3 / QR2 Level 2B)';
const SPHEREX_RELEASE_ID = process.env.SPHEREX_RELEASE_ID || 'SPHEREx-Public-Level2B';
const SPHEREX_BASE_URL = process.env.SPHEREX_BASE_URL || `${SPHEREX_IRSA_HOST}/ibe/data/spherex`;
const SPHEREX_PLANE_TABLE = process.env.SPHEREX_PLANE_TABLE || process.env.SPHEREX_TAP_TABLE || 'spherex.plane';
const SPHEREX_ARTIFACT_TABLE = process.env.SPHEREX_ARTIFACT_TABLE || 'spherex.artifact';
const SPHEREX_TAP_TABLE = SPHEREX_PLANE_TABLE;
const SPHEREX_RELEASE_PREFERENCE = (process.env.SPHEREX_RELEASE_PREFERENCE || 'dr1,qr3,qr2')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function parseReleaseFromUri(uri: string): string {
  const m = String(uri || '').match(/\/spherex\/([a-z0-9_-]+)\//i);
  return m ? m[1].toLowerCase() : '';
}

function compareSemver(a: string, b: string): number {
  const pa = String(a || '').replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '').replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return String(a || '').localeCompare(String(b || ''));
}

function releasePreferenceRank(release: string): number {
  const idx = SPHEREX_RELEASE_PREFERENCE.indexOf(String(release || '').toLowerCase());
  return idx >= 0 ? idx : SPHEREX_RELEASE_PREFERENCE.length + 1;
}

interface TapObsRow {
  obs_id: string;
  s_ra: number;
  s_dec: number;
  instrument_name: string;
  detector: string;
  t_min: number;
  t_max: number;
  em_min: number;
  em_max: number;
  access_url: string;
  uri: string;
  release: string;
  provenance_version: string;
  datarelease?: string;
}

interface TapDetectorSummaryRow {
  detector: string;
  bandpass: string;
  exposureCount: number;
  minMjd: number;
  maxMjd: number;
}

function dedupeByNewestRelease(rows: TapObsRow[]): TapObsRow[] {
  const bestByKey = new Map<string, TapObsRow>();
  for (const r of rows) {
    const det = r.detector || 'D1';
    const key = `${r.obs_id}__${det}`;
    const prev = bestByKey.get(key);
    if (!prev) {
      bestByKey.set(key, r);
      continue;
    }
    const rankDiff = releasePreferenceRank(r.release) - releasePreferenceRank(prev.release);
    if (rankDiff < 0) {
      bestByKey.set(key, r);
    } else if (rankDiff === 0) {
      const verDiff = compareSemver(r.provenance_version, prev.provenance_version);
      if (verDiff > 0 || (verDiff === 0 && r.uri && !prev.uri)) {
        bestByKey.set(key, r);
      }
    }
  }
  return Array.from(bestByKey.values()).sort((a, b) => a.t_min - b.t_min);
}

const tapSummaryCache = new Map<string, { ts: number; rows: TapDetectorSummaryRow[] }>();
const tapQueryCache = new Map<string, { ts: number; rows: TapObsRow[] }>();
const tapInflightCache = new Map<string, Promise<TapObsRow[]>>();
const TAP_CACHE_TTL_MS = 30 * 60 * 1000;

function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n').filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];
  const splitCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };
  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, ''));
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? '').replace(/^"|"$/g, '');
    });
    result.push(obj);
  }
  return result;
}

/**
 * Fast detector-first summary query (B8) using GROUP BY p.energy_bandpassname.
 * Returns per-detector counts and MJD bounds in ~1-2s even on 2,500-exposure fields like R Dra.
 */
async function queryDetectorSummary(ra: number, dec: number, deadlineMs = 120000): Promise<TapDetectorSummaryRow[]> {
  if (process.env.SPHEREX_OFFLINE === '1') return [];
  const cacheKey = `${ra.toFixed(5)}_${dec.toFixed(5)}`;
  const cached = tapSummaryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TAP_CACHE_TTL_MS) {
    return cached.rows;
  }

  const adql = `SELECT p.energy_bandpassname, COUNT(DISTINCT p.obsid) AS exposure_count, MIN(p.time_bounds_lower) AS min_mjd, MAX(p.time_bounds_upper) AS max_mjd FROM ${SPHEREX_ARTIFACT_TABLE} a JOIN ${SPHEREX_PLANE_TABLE} p ON a.planeid = p.planeid WHERE CONTAINS(POINT('ICRS',${ra},${dec}),p.poly)=1 GROUP BY p.energy_bandpassname`;
  const tapUrl = `${SPHEREX_IRSA_HOST}/TAP/sync?QUERY=${encodeURIComponent(adql)}&FORMAT=csv`;

  const MAX_RETRIES = 4;
  const startedAt = Date.now();
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const remainingMs = deadlineMs - (Date.now() - startedAt);
    if (remainingMs <= 2000) break;
    const perAttemptMs = Math.min(45000, remainingMs);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), perAttemptMs);
    try {
      const res = await fetch(tapUrl, {
        headers: { 'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err: any = new Error(`IRSA TAP HTTP ${res.status}: ${res.statusText}`);
        err.statusCode = res.status;
        throw err;
      }
      const csv = await res.text();
      if (csv.trim().startsWith('<')) throw new Error('IRSA TAP returned VOTable error instead of CSV');
      const rawRows = parseCsvRows(csv);
      const summary: TapDetectorSummaryRow[] = rawRows
        .map((r) => {
          const bp = r.energy_bandpassname || '';
          const m = bp.match(/D([1-6])/i);
          const detector = m ? `D${m[1]}` : 'D1';
          return {
            detector,
            bandpass: bp || `SPHEREx-${detector}`,
            exposureCount: parseInt(r.exposure_count || '0', 10) || 0,
            minMjd: parseFloat(r.min_mjd || '0') || 0,
            maxMjd: parseFloat(r.max_mjd || '0') || 0,
          };
        })
        .filter((s) => s.exposureCount > 0)
        .sort((a, b) => a.detector.localeCompare(b.detector));
      tapSummaryCache.set(cacheKey, { ts: Date.now(), rows: summary });
      return summary;
    } catch (err: any) {
      clearTimeout(timeout);
      lastErr = err;
      const status = err?.statusCode;
      if (status && status >= 400 && status < 500) break;
      if (attempt < MAX_RETRIES) {
        const backoff = Math.min(8000, 1500 * Math.pow(2, attempt - 1));
        if (Date.now() - startedAt + backoff < deadlineMs - 2000) {
          await new Promise((r) => setTimeout(r, backoff));
        } else {
          break;
        }
      }
    }
  }
  throw new Error(`IRSA TAP detector summary failed: ${lastErr?.message || 'network error'}`);
}

/**
 * Authoritative IRSA TAP query joining spherex.artifact and spherex.plane on planeid.
 * Retries on 5xx / network timeouts with exponential backoff up to 120s budget,
 * supports single-detector filtering, and deduplicates across releases.
 */
async function queryIrsaTapObs(
  ra: number,
  dec: number,
  options: number | { limit?: number; detector?: string | null; deadlineMs?: number } = 3000
): Promise<TapObsRow[]> {
  if (process.env.SPHEREX_OFFLINE === '1') {
    return [];
  }

  const limit = typeof options === 'number' ? options : options.limit ?? 3000;
  const detectorFilter = typeof options === 'object' && options.detector ? options.detector.toUpperCase() : null;
  const deadlineMs = typeof options === 'object' && options.deadlineMs ? options.deadlineMs : 120000;
  const cacheKey = `${ra.toFixed(5)}_${dec.toFixed(5)}_${detectorFilter || 'ALL'}_${limit}`;
  const cached = tapQueryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TAP_CACHE_TTL_MS) {
    return cached.rows;
  }

  const existingInflight = tapInflightCache.get(cacheKey);
  if (existingInflight) {
    return existingInflight;
  }

  const runPromise = (async (): Promise<TapObsRow[]> => {
    const detClause = detectorFilter ? ` AND p.energy_bandpassname = 'SPHEREx-${detectorFilter}'` : '';
    const adql = `SELECT TOP ${limit} p.obsid, p.energy_bandpassname, p.time_bounds_lower, p.time_bounds_upper, p.energy_bounds_lower, p.energy_bounds_upper, p.provenance_version, p.datarelease, a.uri FROM ${SPHEREX_ARTIFACT_TABLE} a JOIN ${SPHEREX_PLANE_TABLE} p ON a.planeid = p.planeid WHERE CONTAINS(POINT('ICRS',${ra},${dec}),p.poly)=1${detClause} ORDER BY p.time_bounds_lower ASC`;
    const tapUrl = `${SPHEREX_IRSA_HOST}/TAP/sync?QUERY=${encodeURIComponent(adql)}&FORMAT=csv`;

    const MAX_RETRIES = 4;
    const startedAt = Date.now();
    let lastErr: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const remainingMs = deadlineMs - (Date.now() - startedAt);
      if (remainingMs <= 2000) break;
      const perAttemptMs = Math.min(45000, remainingMs);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), perAttemptMs);
      try {
        const res = await fetch(tapUrl, {
          headers: { 'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const err: any = new Error(`IRSA TAP HTTP ${res.status}: ${res.statusText}`);
          err.statusCode = res.status;
          throw err;
        }
        const csv = await res.text();
        if (csv.trim().startsWith('<')) {
          throw new Error('IRSA TAP returned VOTable error instead of CSV');
        }
        const rawObjs = parseCsvRows(csv);
        const mapped: TapObsRow[] = rawObjs.map((obj) => {
          const uri = String(obj.uri || obj.access_url || '');
          const cleanPath = uri.replace(/^\/+/, '');
          const accessUrl = uri.startsWith('http') ? uri : cleanPath ? `${SPHEREX_IRSA_HOST}/${cleanPath}` : '';
          const bandpass = String(obj.energy_bandpassname || 'SPHEREx-D1');
          const detM = bandpass.match(/D([1-6])/i) || uri.match(/\/([1-6])\/level2/i);
          const detector = detM ? `D${detM[1]}` : 'D1';
          const release = parseReleaseFromUri(uri) || String(obj.datarelease || '').toLowerCase() || 'unknown';
          return {
            obs_id: String(obj.obsid || obj.obs_id || ''),
            s_ra: ra,
            s_dec: dec,
            instrument_name: bandpass,
            detector,
            t_min: parseFloat(obj.time_bounds_lower || obj.t_min || '0') || 0,
            t_max: parseFloat(obj.time_bounds_upper || obj.t_max || '0') || 0,
            em_min: parseFloat(obj.energy_bounds_lower || obj.em_min || '0') || 0,
            em_max: parseFloat(obj.energy_bounds_upper || obj.em_max || '0') || 0,
            access_url: accessUrl,
            uri,
            release,
            provenance_version: String(obj.provenance_version || ''),
            datarelease: obj.datarelease ? String(obj.datarelease) : undefined,
          };
        });
        const deduped = dedupeByNewestRelease(mapped);
        tapQueryCache.set(cacheKey, { ts: Date.now(), rows: deduped });
        return deduped;
      } catch (err: any) {
        clearTimeout(timeout);
        lastErr = err;
        const status = err?.statusCode;
        console.warn(`[TAP] Attempt ${attempt}/${MAX_RETRIES} failed for RA ${ra}, Dec ${dec} (${detectorFilter || 'ALL'}): ${err.message}`);
        if (status && status >= 400 && status < 500) break;
        if (attempt < MAX_RETRIES) {
          const backoff = Math.min(8000, 1500 * Math.pow(2, attempt - 1));
          if (Date.now() - startedAt + backoff < deadlineMs - 2000) {
            await new Promise((r) => setTimeout(r, backoff));
          } else {
            break;
          }
        }
      }
    }

    throw new Error(`IRSA TAP query failed: ${lastErr?.message || 'network error'}`);
  })();

  tapInflightCache.set(cacheKey, runPromise);
  try {
    return await runPromise;
  } finally {
    tapInflightCache.delete(cacheKey);
  }
}

/**
 * Sample up to `maxFrames` rows evenly spanning the full chronological baseline [0 .. length-1],
 * prioritizing distinct visits/epochs so proper motion over months is preserved.
 */
function sampleAcrossEpochs<T extends { t_min: number; obs_id: string }>(rows: T[], maxFrames: number): T[] {
  if (rows.length <= maxFrames) return rows;
  const sorted = [...rows].sort((a, b) => a.t_min - b.t_min);
  const picked: T[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < maxFrames; i++) {
    const idx = Math.round((i * (sorted.length - 1)) / (maxFrames - 1));
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      picked.push(sorted[idx]);
    }
  }
  // Fill any remaining slots if rounding collided
  for (let idx = 0; idx < sorted.length && picked.length < maxFrames; idx++) {
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      picked.push(sorted[idx]);
    }
  }
  return picked.sort((a, b) => a.t_min - b.t_min);
}

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Ensure persistent benchmark FITS are copied into ephemeral cache on container boot
const PERSISTENT_CACHE_DIR = path.join(process.cwd(), 'data', 'spherex_cache');
if (fs.existsSync(PERSISTENT_CACHE_DIR)) {
  try {
    const pFiles = fs.readdirSync(PERSISTENT_CACHE_DIR).filter((f) => f.endsWith('.fits'));
    for (const pf of pFiles) {
      const destFile = path.join(CACHE_DIR, pf);
      if (!fs.existsSync(destFile)) {
        fs.copyFileSync(path.join(PERSISTENT_CACHE_DIR, pf), destFile);
      }
    }
  } catch (seedErr) {
    console.warn('[Cache] Could not seed cache from persistent storage:', seedErr);
  }
}

app.use(express.json({ limit: '20mb' }));

// Initialize Google GenAI safely when GEMINI_API_KEY is available
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface CuratedEpoch {
  obs_id: string;
  fits_url: string;
  mjd: number;
  band: string;
  wavelength_um: number;
  date: string;
  date_end?: string;
  integration_duration_sec?: number;
}

// Curated Real Cases from SPHEREx Archive
interface CuratedCase {
  id: string;
  title: string;
  subtitle: string;
  ra: number;
  dec: number;
  targetName: string;
  category: 'Variable Candidate' | 'Stability Reference' | 'Artifact Rejection' | 'Channel Incompatibility';
  expectedClassification: string;
  description: string;
  epoch1: CuratedEpoch;
  epoch2: CuratedEpoch;
  epochs?: CuratedEpoch[];
  isSimulated?: boolean;
  simulatedLabel?: string;
}

const CURATED_CASES: CuratedCase[] = [
  {
    id: 'case-wise-0855',
    title: 'WISE 0855-0714 Sub-Brown Dwarf Series',
    subtitle: 'Coldest Known Y-Dwarf (T ~ 250 K) · ~8.15″/yr Proper Motion',
    ra: 133.81890825,
    dec: -7.247048,
    targetName: 'WISE 0855-0714',
    category: 'Variable Candidate',
    expectedClassification: 'SIGNIFICANT CHANGE DETECTED',
    description: 'Coldest known substellar object outside the Solar System (~7.2 ly, T ~ 250 K). Multi-epoch SPHEREx cutout series reveals its rapid ~8.15″/yr infrared proper motion.',
    epoch1: {
      obs_id: 'LIVE_TAP_RESOLVED',
      fits_url: '',
      mjd: 60800.7,
      band: 'Band 3 (1.64 - 2.42 µm)',
      wavelength_um: 2.03,
      date: '2025-05-05T16:48:00.000Z',
    },
    epoch2: {
      obs_id: 'LIVE_TAP_RESOLVED',
      fits_url: '',
      mjd: 60990.0,
      band: 'Band 3 (1.64 - 2.42 µm)',
      wavelength_um: 2.03,
      date: '2025-11-11T00:00:00.000Z',
    },
  },
  {
    id: 'case-barnards-star',
    title: "Barnard's Star Multi-Epoch Infrared Series",
    subtitle: 'High Proper Motion M4V Dwarf (~10.36″/yr) in SPHEREx',
    ra: 269.45207695,
    dec: 4.69336497,
    targetName: 'GJ 699 (Barnard Star)',
    category: 'Variable Candidate',
    expectedClassification: 'SIGNIFICANT CHANGE DETECTED',
    description: "Closest single star to the Sun (~5.96 ly) with the highest proper motion of any known star (10.36″/yr). Live IRSA multi-epoch cutouts track its sub-pixel centroid trajectory.",
    epoch1: {
      obs_id: 'LIVE_TAP_RESOLVED',
      fits_url: '',
      mjd: 60912.448553,
      band: 'Band 2 (1.11 - 1.64 µm)',
      wavelength_um: 1.38,
      date: '2025-08-25T10:45:55.000Z',
    },
    epoch2: {
      obs_id: 'LIVE_TAP_RESOLVED',
      fits_url: '',
      mjd: 60912.450045,
      band: 'Band 2 (1.11 - 1.64 µm)',
      wavelength_um: 1.38,
      date: '2025-08-25T10:48:03.900Z',
    },
  },
  {
    id: 'case-epsilon-indi',
    title: 'Epsilon Indi Ba/Bb Binary Methane Brown Dwarf',
    subtitle: 'SIMBAD * eps Ind B (T1V + T6V, ~4.7″/yr)',
    ra: 331.04414659,
    dec: -56.7828442,
    targetName: 'Epsilon Indi Ba/Bb',
    category: 'Variable Candidate',
    expectedClassification: 'SIGNIFICANT CHANGE DETECTED',
    description: 'High proper motion binary methane brown dwarf system at ~11.8 ly (~4.7″/yr). Multi-band SPHEREx exposures probe its motion and methane absorption.',
    epoch1: {
      obs_id: 'LIVE_TAP_RESOLVED',
      fits_url: '',
      mjd: 60793.68211,
      band: 'Band 3 (1.64 - 2.42 µm)',
      wavelength_um: 2.03,
      date: '2025-04-28T16:22:14.304Z',
    },
    epoch2: {
      obs_id: 'LIVE_TAP_RESOLVED',
      fits_url: '',
      mjd: 60793.6836,
      band: 'Band 3 (1.64 - 2.42 µm)',
      wavelength_um: 2.03,
      date: '2025-04-28T16:24:23.040Z',
    },
  },
  {
    id: 'case-rw-aur',
    title: 'RW Aurigae Young Stellar Variable System',
    subtitle: 'CTTS Binary Accretion & Circumstellar Dust Dimming',
    ra: 76.95652603,
    dec: 30.40143817,
    targetName: 'RW Aurigae (RW Aur)',
    category: 'Variable Candidate',
    expectedClassification: 'SIGNIFICANT CHANGE DETECTED',
    description: 'Classical T Tauri star system exhibiting intense accretion outbursts and circumstellar dust occultation events in Taurus-Auriga.',
    epoch1: {
      obs_id: 'LIVE_TAP_RESOLVED',
      fits_url: '',
      mjd: 60982.3112,
      band: 'Band 3 (1.64 - 2.42 µm)',
      wavelength_um: 2.03,
      date: '2025-11-03T07:28:07.680Z',
    },
    epoch2: {
      obs_id: 'LIVE_TAP_RESOLVED',
      fits_url: '',
      mjd: 60982.31269,
      band: 'Band 3 (1.64 - 2.42 µm)',
      wavelength_um: 2.03,
      date: '2025-11-03T07:30:16.416Z',
    },
  },
  {
    id: 'case-r-dra',
    title: 'R Draconis Mira Long-Period Variable',
    subtitle: 'Pulsational Asymptotic Giant Branch (AGB) Star (Period ~245 days)',
    ra: 248.16761083,
    dec: 66.75497942,
    targetName: 'R Draconis (HD 149214)',
    category: 'Variable Candidate',
    expectedClassification: 'SIGNIFICANT CHANGE DETECTED',
    description: 'Pulsating red giant star with large-amplitude infrared variations (~245.5 day cycle) near the SPHEREx North Ecliptic Pole deep monitoring zone.',
    epoch1: {
      obs_id: 'LIVE_TAP_RESOLVED',
      fits_url: '',
      mjd: 60807.214,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-05-12T05:08:09.600Z',
    },
    epoch2: {
      obs_id: 'LIVE_TAP_RESOLVED',
      fits_url: '',
      mjd: 60807.21549,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-05-12T05:10:18.336Z',
    },
  },
  {
    id: 'case-nep-var-01',
    title: 'North Ecliptic Pole Deep Survey Field',
    subtitle: 'Intra-Visit Flux Residual & Source Analysis in SPHEREx',
    ra: 276.2614,
    dec: 64.8258,
    targetName: 'SPX-NEP-DEEP-01',
    category: 'Variable Candidate',
    expectedClassification: 'SIGNIFICANT CHANGE DETECTED',
    description: 'Deep survey field at the North Ecliptic Pole with high-cadence SPHEREx coverage cross-matched with Gaia DR3 and AllWISE.',
    epoch1: {
      obs_id: '2025W18_1B_0001_1',
      fits_url: 'local://data/spherex_cache/b6a1e605728059ea6b7def1e9683adb2.fits',
      mjd: 60793.541849016,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-04-28T13:00:15.755',
      date_end: '2025-04-28T13:02:10.872',
      integration_duration_sec: 115.117,
    },
    epoch2: {
      obs_id: '2025W18_1B_0001_2',
      fits_url: 'local://data/spherex_cache/569dafa911ec60ff30abb1807d719fef.fits',
      mjd: 60793.543341273,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-04-28T13:02:24.686',
      date_end: '2025-04-28T13:04:19.804',
      integration_duration_sec: 115.118,
    },
  },
  {
    id: 'case-cal-stable-02',
    title: 'Photometric Stability Calibration Standard',
    subtitle: 'No Statistically Significant Change Detected',
    ra: 275.9265,
    dec: 64.9585,
    targetName: 'SPX-CAL-FIELD-02',
    category: 'Stability Reference',
    expectedClassification: 'NO SIGNIFICANT CHANGE DETECTED',
    description: 'Null detection check across intra-visit exposures: difference residuals match the propagated variance noise floor.',
    epoch1: {
      obs_id: '2025W18_1B_0001_2',
      fits_url: 'local://data/spherex_cache/569dafa911ec60ff30abb1807d719fef.fits',
      mjd: 60793.543341273,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-04-28T13:02:24.686',
      date_end: '2025-04-28T13:04:19.804',
      integration_duration_sec: 115.118,
    },
    epoch2: {
      obs_id: '2025W18_1B_0001_3',
      fits_url: 'local://data/spherex_cache/75b2c2369c175060576bec8d2e5333c0.fits',
      mjd: 60793.544833519,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-04-28T13:04:33.616',
      date_end: '2025-04-28T13:06:28.734',
      integration_duration_sec: 115.118,
    },
  },
  {
    id: 'case-artifact-flag-03',
    title: 'Level-2 Quality Mask & Artifact Filter',
    subtitle: 'Automated Artifact Filtering via SPHEREx DQ Bitmask',
    ra: 276.1391,
    dec: 64.8361,
    targetName: 'SPX-PERSISTENCE-TEST',
    category: 'Artifact Rejection',
    expectedClassification: 'POSSIBLE ARTIFACT',
    description: 'Automated pipeline inspects FITS HDU 2 flags, identifying detector saturation (bit 0x02 OVERFLOW), cosmic rays (bit 0x01 TRANSIENT), and statistical outliers (bit 0x80000 OUTLIER).',
    epoch1: {
      obs_id: '2025W18_1B_0001_1',
      fits_url: 'local://data/spherex_cache/b6a1e605728059ea6b7def1e9683adb2.fits',
      mjd: 60793.541849016,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-04-28T13:00:15.755',
      date_end: '2025-04-28T13:02:10.872',
      integration_duration_sec: 115.117,
    },
    epoch2: {
      obs_id: '2025W18_1B_0001_2',
      fits_url: 'local://data/spherex_cache/569dafa911ec60ff30abb1807d719fef.fits',
      mjd: 60793.543341273,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-04-28T13:02:24.686',
      date_end: '2025-04-28T13:04:19.804',
      integration_duration_sec: 115.118,
    },
  },
];

// Helper: Download or read cached FITS cutout from IRSA with retry, persistent cache, and fallback
interface CutoutFetchResult {
  buffer: Buffer;
  checksum: string;
  isCached?: boolean;
  cachedAt?: string;
  isDemoCopy?: boolean;
  trueCenter?: { ra: number; dec: number };
  trueObsId?: string;
}

const cutoutInflightMap = new Map<string, Promise<CutoutFetchResult>>();

function buildDirectCutoutUrl(
  fitsSource: ResolvedFitsUrl | string,
  ra: number,
  dec: number,
  sizePix: number
): string {
  const sizeDeg = Math.max(0.01, (sizePix * 6.2) / 3600);
  if (typeof fitsSource === 'string') {
    if (fitsSource.startsWith('local://') || fitsSource.includes('?')) {
      return fitsSource;
    }
    if (fitsSource.includes('/ibe/data/spherex/')) {
      return `${fitsSource}?center=${ra.toFixed(6)},${dec.toFixed(6)}d&size=${sizeDeg.toFixed(5)}`;
    }
    return buildCutoutRequestUrl(fitsSource, ra, dec, sizePix);
  }
  if (fitsSource.url && fitsSource.url.includes('/ibe/data/spherex/') && !fitsSource.cutoutService) {
    return `${fitsSource.url}?center=${ra.toFixed(6)},${dec.toFixed(6)}d&size=${sizeDeg.toFixed(5)}`;
  }
  return buildCutoutRequestUrl(fitsSource, ra, dec, sizePix);
}

// Helper: Download or read cached FITS cutout from IRSA with sha256(cutoutUrl) cache, in-flight dedup, 60s timeout & Semaphore(6)
async function getFITSCutout(
  fitsSource: ResolvedFitsUrl | string,
  ra: number,
  dec: number,
  sizePix = 64,
  obsId?: string,
  options?: { allowDemoFallback?: boolean }
): Promise<CutoutFetchResult> {
  const cutoutUrl = buildDirectCutoutUrl(fitsSource, ra, dec, sizePix);

  // Handle local file URLs (only for explicit NEP local fixtures)
  if (typeof fitsSource === 'string' && fitsSource.startsWith('local://')) {
    const localRel = fitsSource.replace('local://', '');
    const localPath = path.isAbsolute(localRel) ? localRel : path.join(process.cwd(), localRel);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const stat = fs.statSync(localPath);
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
      return { buffer, checksum, isCached: true, cachedAt: stat.mtime.toISOString() };
    }
  }

  // Offline / explicit demo fallback mode
  if (process.env.SPHEREX_OFFLINE === '1') {
    const sourceKey = typeof fitsSource === 'string' ? fitsSource : fitsSource.cutoutService?.path || fitsSource.url;
    const matchedFixture = findMatchingFixtureForUrl(obsId || sourceKey);
    const isExactNepField = WCS.angularSeparationArcsec(ra, dec, 276.2614, 64.8258) < 1800;
    if (matchedFixture && isExactNepField && fs.existsSync(matchedFixture)) {
      const buffer = fs.readFileSync(matchedFixture);
      const stat = fs.statSync(matchedFixture);
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
      return { buffer, checksum, isCached: true, cachedAt: stat.mtime.toISOString() };
    }
    const cachedFiles = fs.existsSync(CACHE_DIR) ? fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.fits')) : [];
    if (cachedFiles.length > 0) {
      const fallbackPath = path.join(CACHE_DIR, cachedFiles[0]);
      const buffer = fs.readFileSync(fallbackPath);
      const stat = fs.statSync(fallbackPath);
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
      return {
        buffer,
        checksum,
        isCached: true,
        cachedAt: stat.mtime.toISOString(),
        isDemoCopy: true,
        trueCenter: { ra: 276.2614, dec: 64.8258 },
        trueObsId: '2025W18_1B_0001_1',
      };
    }
    throw new Error('Offline mode active and no local cached FITS files found.');
  }

  const cacheKey = crypto.createHash('sha256').update(cutoutUrl).digest('hex');
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.fits`);
  const persistentFile = path.join(PERSISTENT_CACHE_DIR, `${cacheKey}.fits`);

  if (fs.existsSync(cacheFile)) {
    const buffer = fs.readFileSync(cacheFile);
    const stat = fs.statSync(cacheFile);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    return { buffer, checksum, isCached: true, cachedAt: stat.mtime.toISOString() };
  }

  if (fs.existsSync(persistentFile)) {
    const buffer = fs.readFileSync(persistentFile);
    const stat = fs.statSync(persistentFile);
    try {
      fs.writeFileSync(cacheFile, buffer);
    } catch {}
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    return { buffer, checksum, isCached: true, cachedAt: stat.mtime.toISOString() };
  }

  // Deduplicate concurrent requests for the exact same cutout URL
  const existingInflight = cutoutInflightMap.get(cutoutUrl);
  if (existingInflight) {
    return existingInflight;
  }

  const downloadPromise = (async (): Promise<CutoutFetchResult> => {
    console.log(`[IRSA Cutout] Downloading: ${cutoutUrl}`);
    let lastError: any = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const release = await cutoutSemaphore.acquire();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      try {
        const res = await fetch(cutoutUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0',
          },
        });
        clearTimeout(timeout);

        if (!res.ok) {
          if (res.status === 422) {
            throw new Error(
              `IRSA Cutout: Celestial coordinates (RA ${ra.toFixed(4)}°, Dec ${dec.toFixed(4)}°) do not overlap with this observation's detector coverage.`
            );
          }
          throw new Error(`IRSA Cutout HTTP ${res.status}: ${res.statusText}`);
        }

        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        fs.writeFileSync(cacheFile, buffer);
        if (fs.existsSync(PERSISTENT_CACHE_DIR)) {
          try {
            fs.writeFileSync(persistentFile, buffer);
          } catch {}
        }
        const nowIso = new Date().toISOString();
        const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
        console.log(`[IRSA Cutout] Downloaded FITS sha256=${checksum.slice(0, 12)} bytes=${buffer.length} obs=${obsId || 'n/a'}`);

        return { buffer, checksum, isCached: false, cachedAt: nowIso };
      } catch (err: any) {
        clearTimeout(timeout);
        lastError = err;
        if (err.message?.includes('overlap') || err.message?.includes('422')) {
          throw err;
        }
        console.warn(`[IRSA Cutout] Attempt ${attempt}/${MAX_RETRIES} failed (${obsId || cutoutUrl}): ${err.message}`);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        }
      } finally {
        release();
      }
    }

    if (options?.allowDemoFallback) {
      const cachedFiles = fs.existsSync(CACHE_DIR) ? fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.fits')) : [];
      if (cachedFiles.length > 0) {
        const fallbackPath = path.join(CACHE_DIR, cachedFiles[0]);
        const buffer = fs.readFileSync(fallbackPath);
        const stat = fs.statSync(fallbackPath);
        const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
        return {
          buffer,
          checksum,
          isCached: true,
          cachedAt: stat.mtime.toISOString(),
          isDemoCopy: true,
          trueCenter: { ra: 276.2614, dec: 64.8258 },
          trueObsId: '2025W18_1B_0001_1',
        };
      }
    }

    throw lastError || new Error(`Failed to retrieve SPHEREx FITS cutout from NASA IRSA (${obsId || cutoutUrl})`);
  })();

  cutoutInflightMap.set(cutoutUrl, downloadPromise);
  try {
    return await downloadPromise;
  } finally {
    cutoutInflightMap.delete(cutoutUrl);
  }
}

function findMatchingFixtureForUrl(fitsUrl: string): string | null {
  const mapping: Record<string, string> = {
    '2025W18_1B_0001_1': 'b6a1e605728059ea6b7def1e9683adb2.fits',
    '2025W18_1B_0001_2': '569dafa911ec60ff30abb1807d719fef.fits',
    '2025W18_1B_0001_3': '75b2c2369c175060576bec8d2e5333c0.fits',
    '2025W35_1A_0444_3': '451e0b4e48d26ef4d497e3757aa3f609.fits',
    '2025W35_1A_0444_4': 'b5855b6c1396c2454fae043e25431bd9.fits',
    'b6a1e605728059ea6b7def1e9683adb2': 'b6a1e605728059ea6b7def1e9683adb2.fits',
    '569dafa911ec60ff30abb1807d719fef': '569dafa911ec60ff30abb1807d719fef.fits',
    '75b2c2369c175060576bec8d2e5333c0': '75b2c2369c175060576bec8d2e5333c0.fits',
    '451e0b4e48d26ef4d497e3757aa3f609': '451e0b4e48d26ef4d497e3757aa3f609.fits',
    'b5855b6c1396c2454fae043e25431bd9': 'b5855b6c1396c2454fae043e25431bd9.fits',
  };

  for (const [key, fileName] of Object.entries(mapping)) {
    if (fitsUrl.includes(key)) {
      const p1 = path.join(CACHE_DIR, fileName);
      if (fs.existsSync(p1)) return p1;
      const p2 = path.join(PERSISTENT_CACHE_DIR, fileName);
      if (fs.existsSync(p2)) return p2;
    }
  }
  return null;
}

// API: Query SPHEREx ObsCore via IRSA TAP (Task 2: Individual fits_url resolution & per-row metadata)
app.get('/api/spherex/query', async (req: Request, res: Response) => {
  const coordParam = (req.query.coords || req.query.target) as string;
  let ra = parseFloat(req.query.ra as string);
  let dec = parseFloat(req.query.dec as string);
  const radius = parseFloat(req.query.radius as string) || 0.5;

  if (coordParam) {
    const parsed = parseCoordinateInput(coordParam);
    if (parsed) {
      ra = parsed.ra;
      dec = parsed.dec;
    }
  }

  if (!Number.isFinite(ra) || !Number.isFinite(dec)) {
    ra = 276.2614;
    dec = 64.8258;
  }

  try {
    const tapRes = await ArchiveAdapter.queryTap({ ra, dec, radiusDeg: radius });

    if (tapRes.state === 'NETWORK_ERROR') {
      return res.status(503).json({
        state: 'NETWORK_ERROR',
        status: 'NETWORK_ERROR',
        error: tapRes.error || 'Network error communicating with NASA IRSA TAP archive.',
        canRetry: true,
        target: { ra, dec, radius },
      });
    }

    if (tapRes.state === 'HTTP_ERROR') {
      return res.status(tapRes.statusCode || 500).json({
        state: 'HTTP_ERROR',
        status: 'HTTP_ERROR',
        error: tapRes.error || 'NASA IRSA TAP archive returned HTTP error.',
        statusCode: tapRes.statusCode,
        target: { ra, dec, radius },
      });
    }

    if (tapRes.state === 'ARCHIVE_ZERO_ROWS') {
      return res.status(200).json({
        state: 'ARCHIVE_ZERO_ROWS',
        status: 'ARCHIVE_ZERO_ROWS',
        target: { ra, dec, radius },
        count: 0,
        observations: [],
        message: `IRSA TAP: 0 observations found for requested coordinates (RA ${ra.toFixed(4)}°, Dec ${dec.toFixed(4)}°). This celestial field has not yet been observed in ${tapRes.dataRelease}.`,
        dataRelease: tapRes.dataRelease,
      });
    }

    const observations: any[] = await Promise.all(
      tapRes.records.map(async (rec) => {
        const resolvedFits = await resolveFitsUrl(rec.access_url, rec.obs_id, rec.detector);
        return {
          obs_id: rec.obs_id,
          s_ra: rec.s_ra,
          s_dec: rec.s_dec,
          mjd: rec.mjd,
          date: rec.date,
          wavelength_um: rec.wavelength_um,
          wavelength: rec.wavelength,
          band: rec.band,
          detector: rec.detector,
          visitKey: rec.visitKey,
          access_url: rec.access_url,
          fits_url: resolvedFits.url,
          fits_resolved_by: resolvedFits.resolvedBy,
          s_region: rec.s_region,
          sourceLabel: rec.sourceLabel,
          survey: tapRes.dataRelease,
        };
      })
    );

    const groupedByDetector: Record<string, number> = {};
    const groupedByVisit: Record<string, number> = {};
    for (const obs of observations) {
      groupedByDetector[obs.detector] = (groupedByDetector[obs.detector] || 0) + 1;
      groupedByVisit[obs.visitKey] = (groupedByVisit[obs.visitKey] || 0) + 1;
    }

    return res.json({
      state: 'OK',
      status: 'OK',
      target: { ra, dec, radius },
      count: observations.length,
      observations,
      groupedByDetector,
      groupedByVisit,
      isOfflineMode: tapRes.isOfflineMode,
      isSavedCopy: tapRes.isSavedCopy,
      dataRelease: tapRes.dataRelease,
    });
  } catch (err: any) {
    console.error('IRSA TAP query failure:', err);
    return res.status(500).json({
      state: 'HTTP_ERROR',
      status: 'FAILED',
      error: 'Failed to contact NASA/IPAC IRSA TAP service: ' + err.message,
    });
  }
});

// API: Get Curated Real Cases
app.get('/api/spherex/cases', (_req: Request, res: Response) => {
  return res.json(CURATED_CASES);
});

// API: Famous Astronomical Objects Catalog
app.get('/api/spherex/famous-objects', (req: Request, res: Response) => {
  const category = (req.query.category as string) || 'All';
  const query = ((req.query.q as string) || '').toLowerCase().trim();
  let results = FAMOUS_OBJECTS_CATALOG;

  if (category && category !== 'All') {
    results = results.filter((obj) => obj.categories.includes(category as any));
  }
  if (query) {
    results = results.filter(
      (obj) =>
        obj.name.toLowerCase().includes(query) ||
        obj.nameAr.includes(query) ||
        obj.designation.toLowerCase().includes(query) ||
        obj.constellation.toLowerCase().includes(query) ||
        obj.classification.toLowerCase().includes(query)
    );
  }
  return res.json({
    total: results.length,
    objects: results,
  });
});

// API: Official NASA Space Apps Challenge Targets
app.get('/api/spherex/targets', (req: Request, res: Response) => {
  const raQuery = parseFloat(req.query.ra as string);
  const decQuery = parseFloat(req.query.dec as string);

  const targets = OFFICIAL_CHALLENGE_TARGETS.map((tgt) => {
    let customSeparationDeg = tgt.angularDistanceDegToNEP;
    if (Number.isFinite(raQuery) && Number.isFinite(decQuery)) {
      customSeparationDeg = Number((WCS.angularSeparationArcsec(raQuery, decQuery, tgt.ra, tgt.dec) / 3600).toFixed(1));
    }
    return {
      ...tgt,
      userSeparationDeg: customSeparationDeg,
    };
  });

  return res.json({
    footprint: SPHEREX_QR2_FOOTPRINT,
    targets,
  });
});

// API: Survey Footprint & Sky Coverage Explorer
app.get('/api/spherex/coverage', async (req: Request, res: Response) => {
  const ra = parseFloat(req.query.ra as string);
  const dec = parseFloat(req.query.dec as string);

  let userCoordCheck = null;
  if (Number.isFinite(ra) && Number.isFinite(dec)) {
    try {
      const targetDef = findTargetDefinition(undefined, ra, dec);
      const { queryRa, queryDec } = getTapQueryCoords(ra, dec, targetDef);
      const tapRows = await queryIrsaTapObs(queryRa, queryDec, 100);
      const inside = tapRows.length > 0;
      userCoordCheck = {
        inside,
        coverageCount: tapRows.length,
        distanceDeg: 0,
        reason: inside
          ? `Coordinates (RA ${ra.toFixed(4)}°, Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(4)}°) are verified with ${tapRows.length}+ live exposures in IRSA SPHEREx (${SPHEREX_ARTIFACT_TABLE} + ${SPHEREX_PLANE_TABLE}).`
          : `Coordinates (RA ${ra.toFixed(4)}°, Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(4)}°) currently have 0 observations in ${SPHEREX_DATA_RELEASE}.`,
      };
    } catch (err: any) {
      return res.status(503).json({
        state: 'NETWORK_ERROR',
        status: 'NETWORK_ERROR',
        error: err?.message || 'Failed to query NASA/IPAC IRSA TAP service.',
      });
    }
  }

  return res.json({
    footprint: SPHEREX_QR2_FOOTPRINT,
    userQuery: Number.isFinite(ra) && Number.isFinite(dec) ? { ra, dec, ...userCoordCheck } : null,
    benchmarks: CURATED_CASES.map((c) => ({
      id: c.id,
      title: c.title,
      ra: c.ra,
      dec: c.dec,
      category: c.category,
      insideFootprint: true,
    })),
    challengeTargets: OFFICIAL_CHALLENGE_TARGETS,
  });
});

// API: 102 Spectral Channels & Detector Arrays
app.get('/api/spherex/spectral-bands', (_req: Request, res: Response) => {
  return res.json({
    mission: 'SPHEREx (Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer)',
    detectors: SPHEREX_DETECTOR_ARRAYS,
    totalChannels: SPHEREX_102_CHANNELS.length,
    channels: SPHEREX_102_CHANNELS,
  });
});

let lastProcessingTimestamp: string = new Date().toISOString();

// API: Live Mission Status for Mission Control Telemetry
app.get('/api/status', (_req: Request, res: Response) => {
  const cachedFiles = fs.existsSync(CACHE_DIR)
    ? fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.fits')).length
    : 0;
  return res.json({
    status: 'ONLINE',
    mission: 'NASA SPHEREx',
    dataAvailability: 'OPERATIONAL',
    dataSource: 'NASA IPAC IRSA Level-2B Calibrated FITS (NEP Deep Field)',
    scienceEngine: {
      status: 'ACTIVE',
      wcsRegistration: 'Sub-Pixel Bilinear Surface Spline',
      variancePropagation: 'Read-Noise & Sky Background Covariance (D = I2 - I1)',
      transientDetection: 'PSF-Convolved Difference Significance > 5.0σ',
    },
    aiStatus: process.env.GEMINI_API_KEY
      ? 'ONLINE (GEMINI MULTI-MODEL)'
      : 'FALLBACK ENGINE (ASTROPHYSICAL RULES & GAIA XMATCH)',
    activeRelease: 'SPHEREx-QR2-Level2B',
    benchmarkCasesCount: CURATED_CASES.length,
    cachedFITSFiles: cachedFiles,
    lastProcessingRun: lastProcessingTimestamp,
  });
});

// API: Live Health & Release Readiness Check (B7)
let cachedHealthPayload: { ts: number; data: any } | null = null;
app.get('/api/health', async (req: Request, res: Response) => {
  const envVars = {
    SPHEREX_DATA_RELEASE,
    SPHEREX_RELEASE_ID,
    SPHEREX_ARTIFACT_TABLE,
    SPHEREX_PLANE_TABLE,
    SPHEREX_RELEASE_PREFERENCE: SPHEREX_RELEASE_PREFERENCE.join(','),
  };

  if (process.env.SPHEREX_OFFLINE === '1') {
    return res.json({
      status: 'offline_mode',
      irsaTapReachable: false,
      latestObservationMjd: null,
      latestObservationDate: null,
      availableReleases: [],
      releaseId: SPHEREX_RELEASE_ID,
      envVars,
    });
  }

  if (req.query.fresh !== '1' && cachedHealthPayload && Date.now() - cachedHealthPayload.ts < 5 * 60 * 1000) {
    return res.json(cachedHealthPayload.data);
  }

  try {
    const maxAdql = `SELECT MAX(p.time_bounds_upper) AS max_mjd FROM ${SPHEREX_PLANE_TABLE} p`;
    const relAdql = `SELECT TOP 25 a.uri FROM ${SPHEREX_ARTIFACT_TABLE} a JOIN ${SPHEREX_PLANE_TABLE} p ON a.planeid = p.planeid WHERE p.time_bounds_upper > 60900`;
    const maxUrl = `${SPHEREX_IRSA_HOST}/TAP/sync?QUERY=${encodeURIComponent(maxAdql)}&FORMAT=csv`;
    const relUrl = `${SPHEREX_IRSA_HOST}/TAP/sync?QUERY=${encodeURIComponent(relAdql)}&FORMAT=csv`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    const [maxRes, relRes] = await Promise.all([
      fetch(maxUrl, {
        headers: { 'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0' },
        signal: controller.signal,
      }),
      fetch(relUrl, {
        headers: { 'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0' },
        signal: controller.signal,
      }).catch(() => null),
    ]);
    clearTimeout(timer);

    if (!maxRes.ok) {
      return res.status(503).json({
        status: 'degraded',
        irsaTapReachable: false,
        latestObservationMjd: null,
        latestObservationDate: null,
        availableReleases: [],
        releaseId: SPHEREX_RELEASE_ID,
        error: `IRSA TAP HTTP ${maxRes.status}`,
        envVars,
      });
    }

    const csv = await maxRes.text();
    const lines = csv.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    const rawMjd = lines.length > 1 ? parseFloat(lines[1].replace(/"/g, '').trim()) : NaN;
    const latestObservationMjd = Number.isFinite(rawMjd) ? Number(rawMjd.toFixed(6)) : null;
    const latestObservationDate =
      latestObservationMjd !== null
        ? new Date((latestObservationMjd - 40587) * 86400 * 1000).toISOString()
        : null;

    const releaseSet = new Set<string>();
    if (relRes && relRes.ok) {
      const relCsv = await relRes.text();
      for (const row of parseCsvRows(relCsv)) {
        const rel = parseReleaseFromUri(row.uri || '');
        if (rel) releaseSet.add(rel);
      }
    }
    const availableReleases = Array.from(releaseSet).sort(
      (a, b) => releasePreferenceRank(a) - releasePreferenceRank(b)
    );

    const payload = {
      status: 'ok',
      irsaTapReachable: true,
      latestObservationMjd,
      latestObservationDate,
      availableReleases,
      releaseId: availableReleases[0] ? `SPHEREx-${availableReleases[0].toUpperCase()}-Level2B` : SPHEREX_RELEASE_ID,
      envVars,
    };
    cachedHealthPayload = { ts: Date.now(), data: payload };
    return res.json(payload);
  } catch (err: any) {
    return res.status(503).json({
      status: 'degraded',
      irsaTapReachable: false,
      latestObservationMjd: null,
      latestObservationDate: null,
      availableReleases: [],
      releaseId: SPHEREX_RELEASE_ID,
      error: err?.message || 'IRSA TAP unreachable',
      envVars,
    });
  }
});

// API: Release Validation & Ingestion Engine (November 13 Challenge Release Readiness)
app.get('/api/spherex/validate-release', async (_req: Request, res: Response) => {
  try {
    const cachedFiles = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.fits'));
    const candidates = cachedFiles.map((f) => ({
      fileName: f,
      buffer: fs.readFileSync(path.join(CACHE_DIR, f)),
      sourceType: 'DEVELOPMENT_BENCHMARK' as const,
      releaseId: 'SPHEREx-QR2-Level2B',
    }));

    const report = DataReleaseAdapter.validateDatasetRelease(candidates, 'DEVELOPMENT_BENCHMARK');
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: 'Release validation failed: ' + err.message });
  }
});

// API: Process Multi-Epoch Investigation
app.all('/api/spherex/process', async (req: Request, res: Response) => {
  try {
    lastProcessingTimestamp = new Date().toISOString();
    const caseId = (req.body?.caseId || req.query.caseId || req.query.case) as string;
    const requestedSizePix = req.body?.sizePix !== undefined
      ? parseInt(req.body.sizePix, 10)
      : (req.query.sizePix ? parseInt(req.query.sizePix as string, 10) : undefined);
    const epochPair = (req.body?.epochPair || req.query.epochPair || '1-3') as string;
    const validSizes = [32, 64, 112, 160];
    const sizePix: number = requestedSizePix !== undefined && validSizes.includes(requestedSizePix) ? requestedSizePix : 64;
    const fovArcmin = Number(((sizePix * 6.2) / 60).toFixed(1));

    const allowDemoFallback = req.query.demoFallback === '1' || req.body?.demoFallback === true;
    const requestedDetectorRaw = String(req.body?.detector || req.query.detector || req.query.band || '').toUpperCase();
    const cleanDetMatch = requestedDetectorRaw.match(/D?([1-6])/);
    const requestedDet = cleanDetMatch ? `D${cleanDetMatch[1]}` : null;

    let customCoords = req.body?.customCoords;
    if (!customCoords && (req.query.ra !== undefined || req.query.coords !== undefined)) {
      if (req.query.coords) {
        const p = parseCoordinateInput(req.query.coords as string);
        if (p) customCoords = { ra: p.ra, dec: p.dec };
      } else if (req.query.ra !== undefined && req.query.dec !== undefined) {
        const raNum = parseFloat(req.query.ra as string);
        const decNum = parseFloat(req.query.dec as string);
        if (Number.isFinite(raNum) && Number.isFinite(decNum)) {
          customCoords = { ra: raNum, dec: decNum };
        }
      }
    }
    const isCustomSearch = !!customCoords;
    let selectedCase = CURATED_CASES.find((c) => c.id === caseId);
    const targetDef = findTargetDefinition(caseId, customCoords?.ra ?? selectedCase?.ra, customCoords?.dec ?? selectedCase?.dec);

    let ra = customCoords?.ra ?? targetDef?.ra ?? selectedCase?.ra ?? 133.795132;
    let dec = customCoords?.dec ?? targetDef?.dec ?? selectedCase?.dec ?? -7.245146;

    if (!selectedCase) {
      selectedCase = CURATED_CASES[0];
    }

    if (
      typeof ra !== 'number' ||
      typeof dec !== 'number' ||
      !Number.isFinite(ra) ||
      !Number.isFinite(dec) ||
      dec < -90 ||
      dec > 90
    ) {
      return res.status(400).json({
        error: 'Invalid celestial coordinates: RA and Dec must be finite decimal degree numbers (Dec between -90° and +90°).',
        status: 'FAILED',
        canRetry: false,
      });
    }

    let ep1: CuratedEpoch | undefined;
    let ep2: CuratedEpoch | undefined;
    let resolvedFits1Obj: ResolvedFitsUrl | string = '';
    let resolvedFits2Obj: ResolvedFitsUrl | string = '';
    let liveEpochs: Array<CuratedEpoch & { resolvedFits?: ResolvedFitsUrl | string }> | undefined;

    const isLocalNepOfflineCase =
      process.env.SPHEREX_OFFLINE === '1' &&
      !customCoords &&
      (caseId === 'case-nep-var-01' || caseId === 'case-cal-stable-02' || caseId === 'case-artifact-flag-03');

    if (!isLocalNepOfflineCase && process.env.SPHEREX_OFFLINE !== '1') {
      const { queryRa, queryDec } = getTapQueryCoords(ra, dec, targetDef);
      let tapObsList: TapObsRow[] = [];
      try {
        tapObsList = await queryIrsaTapObs(queryRa, queryDec, 3000);
      } catch (tapErr: any) {
        return res.status(503).json({
          error: tapErr?.message || 'Failed to reach NASA/IPAC IRSA TAP archive.',
          status: 'NETWORK_ERROR',
          state: 'NETWORK_ERROR',
          canRetry: true,
        });
      }

      if (tapObsList.length === 0) {
        const famousObj =
          getFamousObjectById(caseId) ||
          FAMOUS_OBJECTS_CATALOG.find((o) => WCS.angularSeparationArcsec(ra, dec, o.ra, o.dec) <= 3600);
        return res.json({
          caseId: caseId || `target-${famousObj?.id || 'unobserved'}`,
          sourceMode: 'live',
          sourceClassification: 'DATA_UNAVAILABLE',
          title: famousObj
            ? `${famousObj.name}${famousObj.designation ? ` (${famousObj.designation})` : ''}`
            : `Target at RA ${ra.toFixed(4)}°, Dec ${dec.toFixed(4)}°`,
          description: famousObj
            ? famousObj.scientificExplanationEn
            : `0 SPHEREx observations found for RA ${ra.toFixed(4)}°, Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(4)}° in ${SPHEREX_DATA_RELEASE}.`,
          targetCoords: { ra, dec },
          fovArcmin: fovArcmin || 6.6,
          sizePix,
          availabilityStatus: {
            isAvailable: false,
            reasonEn: `IRSA TAP: 0 SPHEREx observations found for coordinates RA ${ra.toFixed(4)}°, Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(4)}° in ${SPHEREX_DATA_RELEASE}.`,
            reasonAr: `لم يتم العثور على أرصاد لمرصد SPHEREx في إصدار ${SPHEREX_DATA_RELEASE} للإحداثيات (${ra.toFixed(4)}°، ${dec >= 0 ? '+' : ''}${dec.toFixed(4)}°).`,
            scheduledRelease: 'SPHEREx Public Release (NASA/IPAC IRSA)',
            catalogSource: famousObj?.catalogReferences?.[0] || 'SIMBAD / Gaia DR3',
            verifiedCoordinates: { ra, dec },
          },
          properMotion:
            famousObj?.pmRaMasYr != null && famousObj?.pmDecMasYr != null
              ? {
                  targetId: famousObj.id,
                  pmRaMasYr: famousObj.pmRaMasYr,
                  pmDecMasYr: famousObj.pmDecMasYr,
                  fromEpochYear: famousObj.coordinateEpochYear || 2000.0,
                  toEpochYear: 2025.6,
                  separationArcsec: (Math.hypot(famousObj.pmRaMasYr, famousObj.pmDecMasYr) * 25.6) / 1000,
                }
              : undefined,
          epoch1: null,
          epoch2: null,
          difference: null,
          candidates: [],
          evidence: {
            classification: 'INSUFFICIENT DATA',
            maxSignificance: 0,
            candidateCount: 0,
            timeBaselineDays: 0,
            summaryProse: `No SPHEREx observations are currently available for this celestial position in ${SPHEREX_DATA_RELEASE}.`,
            statisticalJustification: `Field coverage: 0 observations in ${SPHEREX_DATA_RELEASE}.`,
            whatWeKnow: [
              `Verified celestial coordinates: RA ${ra.toFixed(4)}°, Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(4)}°`,
              famousObj?.classification
                ? `Astrophysical classification: ${famousObj.classification}`
                : 'Coordinates verified against astronomical reference catalogs',
            ],
            whatWeDontKnow: [`Near-infrared multi-epoch difference photometry awaits SPHEREx coverage of this field`],
          },
          provenance: {
            caseId: caseId || 'unavailable-target',
            sourceMode: 'live',
            investigationType: 'Live IRSA Query',
            timestamp: new Date().toISOString(),
            irsaArchiveSource: `NASA/IPAC Infrared Science Archive (IRSA) — SPHEREx (${SPHEREX_ARTIFACT_TABLE} + ${SPHEREX_PLANE_TABLE})`,
            obsId1: 'NONE',
            obsId2: 'NONE',
            fitsUrl1: '',
            fitsUrl2: '',
            fitsChecksum1: '',
            fitsChecksum2: '',
            dataRelease: SPHEREX_DATA_RELEASE,
            pipelineVersion: 'SPHEREx-ChangingSky-v1.5.0',
            algorithms: {
              fitsParser: 'FITSReader-v2.0-Scientific',
              wcsReprojection: 'TAN-SIP-Subpixel-Bilinear',
              differenceMethod: 'Numerical-Subtraction-D=I2-I1',
              noiseEstimation: 'Robust-MAD-Sigma',
              photometry: 'Aperture-Photometry-R=2.5px',
              artifactFilter: 'DQ-Bitmask-L2-Filter',
              catalogMatcher: 'GaiaDR3-AllWISE-CrossMatch',
            },
          },
        });
      }

      // Group by detector to select a physically compatible same-band epoch pair spanning full baseline
      const rowsByDet: Record<string, TapObsRow[]> = {};
      for (const obs of tapObsList) {
        const det = obs.detector || 'D1';
        if (!rowsByDet[det]) rowsByDet[det] = [];
        rowsByDet[det].push(obs);
      }

      const chosenDet =
        (requestedDet && rowsByDet[requestedDet]?.length ? requestedDet : null) ||
        Object.keys(rowsByDet).sort((a, b) => {
          const spanA =
            rowsByDet[a].length > 1
              ? rowsByDet[a][rowsByDet[a].length - 1].t_min - rowsByDet[a][0].t_min
              : 0;
          const spanB =
            rowsByDet[b].length > 1
              ? rowsByDet[b][rowsByDet[b].length - 1].t_min - rowsByDet[b][0].t_min
              : 0;
          if (Math.abs(spanB - spanA) > 1) return spanB - spanA;
          return rowsByDet[b].length - rowsByDet[a].length;
        })[0] ||
        'D1';
      const detList = (rowsByDet[chosenDet] || tapObsList).slice().sort((a, b) => a.t_min - b.t_min);

      const row1 = detList[0];
      const row2 = detList.length > 1 ? detList[detList.length - 1] : detList[0];

      const resolvedFits1 = await resolveFitsUrl(row1.access_url, row1.obs_id, chosenDet);
      const resolvedFits2 = await resolveFitsUrl(row2.access_url, row2.obs_id, chosenDet);
      resolvedFits1Obj = resolvedFits1;
      resolvedFits2Obj = resolvedFits2;

      const detNum = parseInt(chosenDet.replace(/\D/g, ''), 10) || 1;
      const detArray = SPHEREX_DETECTOR_ARRAYS.find((d) => d.detectorNumber === detNum);
      const bandName = detArray ? detArray.name : `Detector ${chosenDet}`;
      const em1 = ((row1.em_min + row1.em_max) / 2) * 1e6;
      const em2 = ((row2.em_min + row2.em_max) / 2) * 1e6;

      ep1 = {
        obs_id: row1.obs_id,
        fits_url: resolvedFits1.url,
        mjd: Number(((row1.t_min + row1.t_max) / 2).toFixed(6)),
        band: bandName,
        wavelength_um: Number(em1.toFixed(2)),
        date: new Date((row1.t_min - 40587) * 86400 * 1000).toISOString(),
      };

      ep2 = {
        obs_id: row2.obs_id,
        fits_url: resolvedFits2.url,
        mjd: Number(((row2.t_min + row2.t_max) / 2).toFixed(6)),
        band: bandName,
        wavelength_um: Number(em2.toFixed(2)),
        date: new Date((row2.t_min - 40587) * 86400 * 1000).toISOString(),
      };

      if (detList.length >= 3) {
        const sampledRows = sampleAcrossEpochs(detList, 6);
        try {
          liveEpochs = await Promise.all(
            sampledRows.map(async (row) => {
              const rEm = ((row.em_min + row.em_max) / 2) * 1e6;
              const resolved = await resolveFitsUrl(row.access_url, row.obs_id, chosenDet);
              return {
                obs_id: row.obs_id,
                fits_url: resolved.url,
                resolvedFits: resolved,
                mjd: Number(((row.t_min + row.t_max) / 2).toFixed(6)),
                band: bandName,
                wavelength_um: Number(rEm.toFixed(2)),
                date: new Date((row.t_min - 40587) * 86400 * 1000).toISOString(),
              };
            })
          );
        } catch (liveErr) {
          console.info('[Process] Could not resolve all live multi-epoch URLs:', liveErr);
        }
      }
    }

    // Offline / local NEP fallback only when offline or no live TAP data resolved for local NEP case
    if (!ep1 || !ep2) {
      ep1 = selectedCase.epoch1;
      ep2 = selectedCase.epoch2;

      if (selectedCase.epochs && selectedCase.epochs.length >= 2) {
        const match = typeof epochPair === 'string' ? epochPair.match(/^(\d+)-(\d+)$/) : null;
        if (match) {
          const idx1 = parseInt(match[1], 10) - 1;
          const idx2 = parseInt(match[2], 10) - 1;
          if (selectedCase.epochs[idx1] && selectedCase.epochs[idx2]) {
            ep1 = selectedCase.epochs[idx1];
            ep2 = selectedCase.epochs[idx2];
          }
        } else if (epochPair === '1-2' && selectedCase.epochs.length >= 2) {
          ep1 = selectedCase.epochs[0];
          ep2 = selectedCase.epochs[1];
        } else if (epochPair === '2-3' && selectedCase.epochs.length >= 3) {
          ep1 = selectedCase.epochs[1];
          ep2 = selectedCase.epochs[2];
        } else if (selectedCase.epochs.length >= 3) {
          ep1 = selectedCase.epochs[0];
          ep2 = selectedCase.epochs[2];
        }
      }
      resolvedFits1Obj = ep1.fits_url;
      resolvedFits2Obj = ep2.fits_url;
    }

    // Proper-motion propagation: SPHEREx exposures are 2025+; center cutout on propagated epoch
    const matchedTarget = targetDef || OFFICIAL_CHALLENGE_TARGETS.find(
      (t) =>
        t.pmRaMasYr != null &&
        t.pmDecMasYr != null &&
        t.coordinateEpochYear != null &&
        WCS.angularSeparationArcsec(t.ra, t.dec, ra, dec) < 5
    );
    const obsEpochYear = julianYearFromMjd(ep1.mjd);
    let centerRa = ra;
    let centerDec = dec;
    let properMotionInfo: InvestigationResult['properMotion'] | undefined;
    if (
      matchedTarget &&
      matchedTarget.pmRaMasYr != null &&
      matchedTarget.pmDecMasYr != null &&
      matchedTarget.coordinateEpochYear != null
    ) {
      const prop = propagatePosition(
        ra,
        dec,
        matchedTarget.pmRaMasYr,
        matchedTarget.pmDecMasYr,
        matchedTarget.coordinateEpochYear,
        obsEpochYear
      );
      centerRa = prop.ra;
      centerDec = prop.dec;
      properMotionInfo = {
        targetId: matchedTarget.id,
        pmRaMasYr: matchedTarget.pmRaMasYr,
        pmDecMasYr: matchedTarget.pmDecMasYr,
        fromEpochYear: matchedTarget.coordinateEpochYear,
        toEpochYear: obsEpochYear,
        separationArcsec: prop.separationArcsec,
      };
    }

    // Download real FITS cutouts via DataLink-resolved cutout service
    const fits1Res = await getFITSCutout(resolvedFits1Obj, centerRa, centerDec, sizePix, ep1.obs_id, { allowDemoFallback });
    const fits2Res = await getFITSCutout(resolvedFits2Obj, centerRa, centerDec, sizePix, ep2.obs_id, { allowDemoFallback });

    const isDemoCopy = Boolean(fits1Res.isDemoCopy || fits2Res.isDemoCopy);
    if (isDemoCopy) {
      const demoTrueCenter = fits1Res.trueCenter || fits2Res.trueCenter || { ra: 276.2614, dec: 64.8258 };
      centerRa = demoTrueCenter.ra;
      centerDec = demoTrueCenter.dec;
      ra = demoTrueCenter.ra;
      dec = demoTrueCenter.dec;
    }

    const sourceMode: 'live' | 'saved_benchmark' =
      isDemoCopy || isLocalNepOfflineCase ? 'saved_benchmark' : 'live';
    const caseIdToUse = caseId || (isCustomSearch ? 'custom-irsa-target' : selectedCase.id);
    const caseTitle = isDemoCopy
      ? `DEMO COPY (Different Field: RA ${centerRa.toFixed(4)}°, Dec ${centerDec.toFixed(4)}°)`
      : isCustomSearch
      ? `Live IRSA Cutout (RA ${ra.toFixed(4)}°, Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(4)}°)`
      : selectedCase.title;
    const caseDescription = isDemoCopy
      ? `Demo fallback showing a cached North Ecliptic Pole FITS cutout (true center RA ${centerRa.toFixed(4)}°, Dec ${centerDec.toFixed(4)}°).`
      : isCustomSearch
      ? `Live query retrieving NASA/IPAC IRSA calibrated Level-2B FITS cutouts at RA ${ra.toFixed(4)}°, Dec ${dec.toFixed(4)}°.`
      : selectedCase.description;

    // Parse FITS HDUs with real scientific parser
    const fitsData1 = FITSReader.parse(fits1Res.buffer);
    const fitsData2 = FITSReader.parse(fits2Res.buffer);

    // Footprint containment check (Phase 1 verification): where does the propagated
    // target actually land inside the downloaded cutout, and how far from the edge?
    let targetPixel: InvestigationResult['targetPixel'];
    try {
      const pix = WCS.skyToPix(centerRa, centerDec, fitsData1.wcs);
      const x = pix.x;
      const y = pix.y;
      const pxFromEdge = Math.min(x, y, fitsData1.width - 1 - x, fitsData1.height - 1 - y);
      targetPixel = {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        width: fitsData1.width,
        height: fitsData1.height,
        insideCutout: x >= 0 && y >= 0 && x <= fitsData1.width - 1 && y <= fitsData1.height - 1,
        pxFromEdge: Number(pxFromEdge.toFixed(2)),
      };
      if (!targetPixel.insideCutout || targetPixel.pxFromEdge < 20) {
        console.warn(
          `[Process] Target pixel ${targetPixel.x},${targetPixel.y} is ${targetPixel.insideCutout ? `only ${targetPixel.pxFromEdge.toFixed(1)} px` : 'NOT'} inside the ${targetPixel.width}x${targetPixel.height} cutout (margin warning threshold: 20 px)`
        );
      }
    } catch (pixErr) {
      console.warn('[Process] Could not compute target pixel position from WCS:', pixErr);
    }

    // Extract authentic physical observation timestamps from FITS headers
    const mjd1 =
      typeof fitsData1.header['MJD-OBS'] === 'number'
        ? fitsData1.header['MJD-OBS']
        : parseFloat(fitsData1.header['MJD-OBS'] as string) || ep1.mjd;
    const mjd2 =
      typeof fitsData2.header['MJD-OBS'] === 'number'
        ? fitsData2.header['MJD-OBS']
        : parseFloat(fitsData2.header['MJD-OBS'] as string) || ep2.mjd;

    const dateObs1 =
      (typeof fitsData1.header['DATE-OBS'] === 'string' && fitsData1.header['DATE-OBS']) ||
      ep1.date;
    const dateEnd1 =
      (typeof fitsData1.header['DATE-END'] === 'string' && fitsData1.header['DATE-END']) ||
      ep1.date_end;
    const dateObs2 =
      (typeof fitsData2.header['DATE-OBS'] === 'string' && fitsData2.header['DATE-OBS']) ||
      ep2.date;
    const dateEnd2 =
      (typeof fitsData2.header['DATE-END'] === 'string' && fitsData2.header['DATE-END']) ||
      ep2.date_end;

    const computeIntegrationSec = (
      startStr?: string,
      endStr?: string,
      fallbackSec?: number
    ): number | undefined => {
      if (startStr && endStr && startStr.includes('T') && endStr.includes('T')) {
        const sMs = Date.parse(startStr.endsWith('Z') ? startStr : `${startStr}Z`);
        const eMs = Date.parse(endStr.endsWith('Z') ? endStr : `${endStr}Z`);
        if (Number.isFinite(sMs) && Number.isFinite(eMs) && eMs >= sMs) {
          return Number(((eMs - sMs) / 1000).toFixed(3));
        }
      }
      return fallbackSec;
    };

    const intDuration1Sec = computeIntegrationSec(dateObs1, dateEnd1, ep1.integration_duration_sec ?? 115.117);
    const intDuration2Sec = computeIntegrationSec(dateObs2, dateEnd2, ep2.integration_duration_sec ?? 115.118);

    const mjdEnd1 =
      typeof fitsData1.header['MJD-END'] === 'number'
        ? fitsData1.header['MJD-END']
        : parseFloat(fitsData1.header['MJD-END'] as string) ||
          mjd1 + ((intDuration1Sec ?? 115.117) / 86400);
    const mjdEnd2 =
      typeof fitsData2.header['MJD-END'] === 'number'
        ? fitsData2.header['MJD-END']
        : parseFloat(fitsData2.header['MJD-END'] as string) ||
          mjd2 + ((intDuration2Sec ?? 115.118) / 86400);

    const obs1: SPHERExObservation = {
      obs_id: ep1.obs_id,
      s_ra: ra,
      s_dec: dec,
      t_min: mjd1,
      t_max: mjdEnd1,
      date_obs: dateObs1,
      date_end: dateEnd1,
      integration_duration_sec: intDuration1Sec,
      em_min: (ep1.wavelength_um - 0.15) * 1e-6,
      em_max: (ep1.wavelength_um + 0.15) * 1e-6,
      wavelength_um: ep1.wavelength_um,
      dataproduct_type: 'image',
      access_url: ep1.fits_url,
      fits_url: ep1.fits_url,
      access_format: 'application/fits',
    };

    const obs2: SPHERExObservation = {
      obs_id: ep2.obs_id,
      s_ra: ra,
      s_dec: dec,
      t_min: mjd2,
      t_max: mjdEnd2,
      date_obs: dateObs2,
      date_end: dateEnd2,
      integration_duration_sec: intDuration2Sec,
      em_min: (ep2.wavelength_um - 0.15) * 1e-6,
      em_max: (ep2.wavelength_um + 0.15) * 1e-6,
      wavelength_um: ep2.wavelength_um,
      dataproduct_type: 'image',
      access_url: ep2.fits_url,
      fits_url: ep2.fits_url,
      access_format: 'application/fits',
    };

    // If case has multi-epoch visits, load all available visits for sequential timeline viewer.
    // Scientifically crucial: Use curated case epochs ONLY when coordinates correspond to that case
    // (!isCustomSearch || matchingCase). Unmatched custom coordinates must NEVER be queried
    // against an unrelated benchmark case's FITS files, avoiding IRSA 422 survey footprint mismatches.
    let multiEpochArray: Array<{
      epochIndex: number;
      obsId: string;
      date: string;
      dateEnd?: string;
      integrationDurationSec?: number;
      mjd: number;
      flux: number[];
      width: number;
      height: number;
      wcs: any;
    }> | undefined = undefined;

    const epochsToUse: Array<CuratedEpoch & { resolvedFits?: ResolvedFitsUrl | string }> | undefined =
      liveEpochs && liveEpochs.length >= 3
        ? liveEpochs
        : isLocalNepOfflineCase
        ? selectedCase.epochs
        : undefined;

    if (epochsToUse && epochsToUse.length >= 3) {
      try {
        const visitPromises = epochsToUse.map(async (ep, idx) => {
          const resF = await getFITSCutout(ep.resolvedFits || ep.fits_url, centerRa, centerDec, sizePix, ep.obs_id, { allowDemoFallback });
          const parsed = FITSReader.parse(resF.buffer);
          const epDateObs =
            (typeof parsed.header['DATE-OBS'] === 'string' && parsed.header['DATE-OBS']) || ep.date;
          const epDateEnd =
            (typeof parsed.header['DATE-END'] === 'string' && parsed.header['DATE-END']) || ep.date_end;
          const epMjd =
            typeof parsed.header['MJD-OBS'] === 'number'
              ? parsed.header['MJD-OBS']
              : parseFloat(parsed.header['MJD-OBS'] as string) || ep.mjd;
          const epIntSec = computeIntegrationSec(epDateObs, epDateEnd, ep.integration_duration_sec);
          return {
            epochIndex: idx + 1,
            obsId: ep.obs_id,
            date: epDateObs,
            dateEnd: epDateEnd,
            integrationDurationSec: epIntSec,
            mjd: epMjd,
            flux: Array.from(parsed.data),
            width: parsed.width,
            height: parsed.height,
            wcs: parsed.wcs,
          };
        });
        const settled = await Promise.allSettled(visitPromises);
        const validVisits = settled
          .filter((s): s is PromiseFulfilledResult<any> => s.status === 'fulfilled')
          .map((s) => s.value);

        if (validVisits.length >= 2) {
          multiEpochArray = validVisits;
        }
      } catch (multiErr: any) {
        console.info('[Process] Multi-epoch sequence unavailable; continuing with 2-epoch difference:', multiErr?.message || multiErr);
      }
    }

    // Run scientific difference imaging pipeline
    const diffResult = ScientificPipeline.processDifference(obs1, obs2, fitsData1, fitsData2);

    // Cross-match top candidate detections with Gaia DR3 and AllWISE (3.5" radius) concurrently
    const topCandidates = diffResult.candidates.slice(0, 6);
    await Promise.allSettled(
      topCandidates.map(async (cand) => {
        try {
          const matches = await CatalogMatcher.crossmatch(cand.ra, cand.dec, 3.5);
          cand.catalogMatches = matches;
          if (matches.length > 0 && cand.status === 'Candidate') {
            cand.status = 'Likely known source';
          }
        } catch {
          // Gracefully default to empty catalog matches without failing pipeline
        }
      })
    );

    const provenance: ProvenanceRecord = {
      caseId: caseIdToUse,
      sourceMode,
      investigationType: isCustomSearch ? 'Live IRSA Query' : 'Curated Archival Case',
      timestamp: new Date().toISOString(),
      irsaArchiveSource: 'NASA/IPAC Infrared Science Archive (IRSA) — SPHEREx Public Data Release QR2',
      obsId1: obs1.obs_id,
      obsId2: obs2.obs_id,
      fitsUrl1: ep1.fits_url,
      fitsUrl2: ep2.fits_url,
      fitsChecksum1: fits1Res.checksum,
      fitsChecksum2: fits2Res.checksum,
      dataRelease: 'SPHEREx QR2 (Level 2B Processed Science Frames)',
      pipelineVersion: 'SPHEREx-ChangingSky-v1.5.0 (astronomical difference imaging engine)',
      algorithms: {
        fitsParser: 'FITS-MEF IEEE-754 Big-Endian HDU extractor',
        wcsReprojection: diffResult.registration.method,
        differenceMethod: 'D = I2 - I1 (Subpixel Bilinear Registration)',
        noiseEstimation: 'Robust Median Absolute Deviation (MAD: 1.4826 * MAD)',
        photometry: 'Aperture Photometry (r=2.5px, annulus 4.0-6.0px)',
        artifactFilter: 'Quality Bitmask + Dipole Residual + Sharp Spike Morphology',
        catalogMatcher: 'CDS VizieR Multi-Catalog Cross-Match (Gaia DR3 optical + AllWISE mid-IR, 3.5" cone)',
      },
    };

    const responseData: InvestigationResult = {
      caseId: caseIdToUse,
      sourceMode,
      title: caseTitle,
      description: caseDescription,
      targetCoords: { ra: centerRa, dec: centerDec },
      targetCoordsCatalog: properMotionInfo ? { ra, dec } : undefined,
      properMotion: properMotionInfo,
      targetPixel,
      fovArcmin,
      sizePix,
      epoch1: {
        metadata: obs1,
        width: fitsData1.width,
        height: fitsData1.height,
        flux: Array.from(fitsData1.data),
        bunit: fitsData1.bunit,
        stats: fitsData1.stats,
        wcs: fitsData1.wcs,
      },
      epoch2: {
        metadata: obs2,
        width: fitsData2.width,
        height: fitsData2.height,
        flux: Array.from(fitsData2.data),
        bunit: fitsData2.bunit,
        stats: fitsData2.stats,
        wcs: fitsData2.wcs,
      },
      epochs: multiEpochArray,
      difference: {
        width: diffResult.width,
        height: diffResult.height,
        diff: Array.from(diffResult.diff),
        variance: Array.from(diffResult.variance),
        significance: Array.from(diffResult.significance),
        stats: diffResult.stats,
      },
      compatibility: diffResult.compatibility,
      registration: diffResult.registration,
      candidates: diffResult.candidates,
      evidence: diffResult.evidence,
      provenance,
      datasetSource: 'DEVELOPMENT_BENCHMARK',
      releaseId: 'SPHEREx-QR2-Level2B',
      isSimulated: selectedCase.isSimulated ?? false,
      simulatedLabel: selectedCase.simulatedLabel,
      observationIds: [obs1.obs_id, obs2.obs_id],
      fileIdentifiers: [ep1.fits_url, ep2.fits_url],
      observationTimestamps: [obs1.date_obs || ep1.date, obs2.date_obs || ep2.date],
      processingVersion: '2.7.0-forensic-verified',
    };

    return res.json(responseData);
  } catch (err: any) {
    const isCoverageError =
      err.message?.includes('422') ||
      err.message?.includes('footprint') ||
      err.message?.includes('survey coverage');
    if (isCoverageError) {
      console.warn('[Coverage Notice]', err.message);
    } else {
      console.error('Scientific pipeline execution failed:', err);
    }
    const statusCode = isCoverageError ? 422 : 500;
    return res.status(statusCode).json({
      error: err.message || 'Scientific pipeline execution error',
      status: 'FAILED',
      sourceMode: req.body?.customCoords ? 'live' : 'saved_benchmark',
      canRetry: true,
      suggestedCaseId: 'case-nep-var-01',
    });
  }
});

// API: Real Multi-Epoch Time Series & Blink Video Engine (Phase B: Artifact+Plane TAP, WCS-WAVE, Variance-gated Centroids)
app.all('/api/spherex/timeseries', async (req: Request, res: Response) => {
  const isStreamNdjson = req.query.stream === 'ndjson' || req.body?.stream === 'ndjson';
  const emitProgress = (payload: Record<string, any>) => {
    if (!isStreamNdjson || res.writableEnded) return;
    res.write(JSON.stringify(payload) + '\n');
  };
  const sendJsonOrStream = (statusCode: number, body: Record<string, any>) => {
    if (isStreamNdjson) {
      if (!res.headersSent) {
        res.status(statusCode);
        res.setHeader('Content-Type', 'application/x-ndjson');
      }
      res.write(JSON.stringify({ type: 'result', statusCode, data: body }) + '\n');
      return res.end();
    }
    return res.status(statusCode).json(body);
  };

  if (isStreamNdjson) {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    emitProgress({ type: 'progress', phase: 'tap', loaded: 0, total: 0 });
  }

  try {
    const coordParam = (req.query.coords || req.body?.coords) as string;
    let ra = parseFloat((req.query.ra ?? req.body?.ra) as string);
    let dec = parseFloat((req.query.dec ?? req.body?.dec) as string);
    const caseId = (req.query.caseId || req.body?.caseId) as string;
    const allowDemoFallback = req.query.demoFallback === '1' || req.body?.demoFallback === true;
    const requestedSizePix = parseInt((req.query.sizePix ?? req.body?.sizePix) as string, 10);
    const validSizes = [32, 64, 112, 160];
    const sizePix = validSizes.includes(requestedSizePix) ? requestedSizePix : 64;
    const fovArcmin = Number(((sizePix * 6.2) / 60).toFixed(1));

    const requestedMaxFrames = parseInt((req.query.maxFrames ?? req.body?.maxFrames) as string, 10);
    // Task 3: Sample 10 to 20 frames evenly by default (16 frames inside 10..20)
    const maxFrames = Number.isFinite(requestedMaxFrames) ? Math.max(5, Math.min(40, requestedMaxFrames)) : 16;
    const sameReleaseOnly = req.query.sameReleaseOnly === '1' || req.body?.sameReleaseOnly === true;

    // Optional wavelength window filter (e.g. ?wlWindow=1.65-3.84)
    const wlWindowRaw = String(req.query.wlWindow ?? req.body?.wlWindow ?? '').trim().toLowerCase();
    let wlMinFilter: number | null = null;
    let wlMaxFilter: number | null = null;
    const wlMatch = wlWindowRaw.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
    if (wlMatch) {
      wlMinFilter = parseFloat(wlMatch[1]);
      wlMaxFilter = parseFloat(wlMatch[2]);
    }

    if (coordParam) {
      const parsed = parseCoordinateInput(coordParam);
      if (parsed) {
        ra = parsed.ra;
        dec = parsed.dec;
      }
    }

    const selectedCase = CURATED_CASES.find((c) => c.id === caseId);
    const targetDef = findTargetDefinition(caseId, ra, dec);
    if (targetDef) {
      if (!Number.isFinite(ra) || !Number.isFinite(dec) || targetDef.pmRaMasYr != null) {
        ra = targetDef.ra;
        dec = targetDef.dec;
      }
    } else if (!Number.isFinite(ra) || !Number.isFinite(dec)) {
      const fallbackCase = selectedCase || CURATED_CASES[0];
      ra = fallbackCase.ra;
      dec = fallbackCase.dec;
    }

    const matchedTargetTs = targetDef;
    const { queryRa, queryDec } = getTapQueryCoords(ra, dec, targetDef);

    // Support optional detector/band filter from query or body (e.g. ?band=3 or ?detector=D3)
    const requestedDetector = String(req.query.detector || req.query.band || req.body?.detector || req.body?.band || '').toUpperCase();
    const cleanDet = requestedDetector.match(/D([1-6])/)
      ? `D${requestedDetector.match(/D([1-6])/)![1]}`
      : requestedDetector.match(/^[1-6]$/)
      ? `D${requestedDetector}`
      : null;

    // P0-2 Snapshot Loader: only used when live archive fails or exceeds 25s (unless ?liveOnly=1)
    const SNAPSHOT_DIR = path.join(process.cwd(), 'data', 'snapshots');
    const resolveSnapshotSlug = (): string | null => {
      const idSource = (targetDef?.id || caseId || '').toLowerCase();
      if (idSource.includes('barnard')) return 'barnards-star';
      if (idSource.includes('epsilon-indi') || idSource.includes('indi')) return 'epsilon-indi';
      if (idSource.includes('wise-0855') || idSource.includes('0855')) return 'wise-0855';
      if (idSource.includes('rw-aur')) return 'rw-aur';
      if (idSource.includes('r-dra')) return 'r-dra';
      return null;
    };
    const loadSnapshotResponse = (): Record<string, any> | null => {
      const slug = resolveSnapshotSlug();
      if (!slug) return null;
      const snapPath = path.join(SNAPSHOT_DIR, `${slug}.json`);
      if (!fs.existsSync(snapPath)) return null;
      try {
        const snap = JSON.parse(fs.readFileSync(snapPath, 'utf-8'));
        const takenAtIso = snap.snapshotTakenAt || new Date(fs.statSync(snapPath).mtimeMs).toISOString();
        const takenDateStr = `${takenAtIso.replace('T', ' ').slice(0, 16)} UTC`;
        return {
          ...snap,
          status: 'OK',
          state: 'OK',
          sourceMode: 'saved_benchmark',
          isSnapshot: true,
          snapshotTakenAt: takenAtIso,
          cachedAt: takenAtIso,
          sourceLabel: `REAL SPHEREx DATA - archive snapshot taken ${takenDateStr} (live archive slow or unreachable)`,
        };
      } catch (snapErr: any) {
        console.warn(`[Snapshot] Failed to parse ${snapPath}:`, snapErr?.message);
        return null;
      }
    };

    const liveOnly = req.query.liveOnly === '1' || req.body?.liveOnly === true;
    const snapshotAvailable = !liveOnly && !cleanDet ? loadSnapshotResponse() : null;
    if (process.env.SPHEREX_OFFLINE === '1' && snapshotAvailable) {
      return sendJsonOrStream(200, snapshotAvailable);
    }

    const runLivePipeline = async (): Promise<{ statusCode: number; body: Record<string, any> }> => {
    const recommendedDetOrder = getRecommendedDetectorsForTarget(targetDef, wlMinFilter, wlMaxFilter);
    const candidateDetectors = cleanDet ? [cleanDet] : recommendedDetOrder;

    // Fetch Gaia DR3 + AllWISE field sources once (served instantly from disk/memory cache when present)
    const overlayRadiusArcsec = Math.max(210, fovArcmin * 34);
    const overlayCacheKey = CatalogMatcher.getOverlayCacheKey(queryRa, queryDec, overlayRadiusArcsec);
    const hadCachedOverlay = Boolean(CatalogMatcher.exportOverlayCache()[overlayCacheKey]?.length);
    const catalogOverlaysField = await CatalogMatcher.getOverlaySources(
      queryRa,
      queryDec,
      overlayRadiusArcsec,
      2025.6
    );
    if (!hadCachedOverlay && catalogOverlaysField.some((c) => !c.isStaticFixture)) {
      saveCatalogDiskCache();
    }

    const frameModeRaw = String((req.query.frameMode ?? req.query.frame ?? req.body?.frameMode ?? req.body?.frame) ?? '').toLowerCase();
    const frameMode: 'sky' | 'target' = frameModeRaw === 'target' ? 'target' : 'sky';

    let detectorSummary: TapDetectorSummaryRow[] = [];
    const availableDetectors: AvailableDetectorSummary[] = [];

    const buildResponseForDetector = async (
      chosenDet: string,
      prefetchedRows?: TapObsRow[],
      sampleOverrideMaxFrames?: number
    ): Promise<{
      statusCode: number;
      body: Record<string, any>;
      validDetections: number;
      unsaturatedCoreCount: number;
      unsatSpanDays: number;
      wingFitCount: number;
      allSaturated: boolean;
      meanSnr: number;
      totalTapRows: number;
    }> => {
      let tapRows: TapObsRow[] = prefetchedRows || [];

      if (process.env.SPHEREX_OFFLINE !== '1' && !prefetchedRows) {
        tapRows = await queryIrsaTapObs(queryRa, queryDec, { detector: chosenDet, limit: 3000 });
        if (tapRows.length === 0 && !cleanDet) {
          detectorSummary = await queryDetectorSummary(queryRa, queryDec);
        }
      }

      const cachedSummary = tapSummaryCache.get(`${queryRa.toFixed(5)}_${queryDec.toFixed(5)}`)?.rows;
      if (detectorSummary.length === 0 && cachedSummary) {
        detectorSummary = cachedSummary;
      }
      if (availableDetectors.length === 0) {
        if (detectorSummary.length > 0) {
          for (const sumRow of detectorSummary) {
            const detNum = parseInt(sumRow.detector.replace(/\D/g, ''), 10) || 1;
            const detMeta = SPHEREX_DETECTOR_ARRAYS.find((d) => d.detectorNumber === detNum);
            availableDetectors.push({
              detector: sumRow.detector,
              bandName: detMeta ? detMeta.name : `Band ${detNum}`,
              wavelengthRangeUm: detMeta ? detMeta.wavelengthRangeUm : [0.75, 5.0],
              exposureCount: sumRow.exposureCount,
              minMjd: Number(sumRow.minMjd.toFixed(6)),
              maxMjd: Number(sumRow.maxMjd.toFixed(6)),
              dateStart: new Date((sumRow.minMjd - 40587) * 86400 * 1000).toISOString(),
              dateEnd: new Date((sumRow.maxMjd - 40587) * 86400 * 1000).toISOString(),
            });
          }
        } else if (tapRows.length > 0) {
          const detNum = parseInt(chosenDet.replace(/\D/g, ''), 10) || 1;
          const detMeta = SPHEREX_DETECTOR_ARRAYS.find((d) => d.detectorNumber === detNum);
          const minMjd = Math.min(...tapRows.map((r) => r.t_min));
          const maxMjd = Math.max(...tapRows.map((r) => r.t_max));
          availableDetectors.push({
            detector: chosenDet,
            bandName: detMeta ? detMeta.name : `Band ${detNum}`,
            wavelengthRangeUm: detMeta ? detMeta.wavelengthRangeUm : [0.75, 5.0],
            exposureCount: tapRows.length,
            minMjd: Number(minMjd.toFixed(6)),
            maxMjd: Number(maxMjd.toFixed(6)),
            dateStart: new Date((minMjd - 40587) * 86400 * 1000).toISOString(),
            dateEnd: new Date((maxMjd - 40587) * 86400 * 1000).toISOString(),
          });
        }
      }

      const exposuresPerRelease: Record<string, number> = {};
      for (const r of tapRows) {
        const relKey = (r.release || r.datarelease || 'public').toLowerCase();
        exposuresPerRelease[relKey] = (exposuresPerRelease[relKey] || 0) + 1;
      }
      const totalExposuresAllDetectors =
        detectorSummary.reduce((sum, d) => sum + d.exposureCount, 0) || tapRows.length;

      let candidateRows = tapRows;
      if (wlMinFilter !== null && wlMaxFilter !== null) {
        const filtered = tapRows.filter((row) => {
          const emUm = ((row.em_min + row.em_max) / 2) * 1e6;
          return emUm >= wlMinFilter! - 0.5 && emUm <= wlMaxFilter! + 0.5;
        });
        if (filtered.length > 0) candidateRows = filtered;
      }

      // Task 3: Group first to find the largest valid (release, provenance_version) group for Diff/Stack;
      // for Astrometry & Blink allow ALL releases/VERSIONs across the full MJD span (10..20 frames).
      const tapGroups = new Map<string, TapObsRow[]>();
      for (const r of candidateRows) {
        const gKey = `${(r.release || 'public').toLowerCase()}::${r.provenance_version || 'default'}`;
        const list = tapGroups.get(gKey) || [];
        list.push(r);
        tapGroups.set(gKey, list);
      }
      const rankedTapGroups = Array.from(tapGroups.entries()).sort((a, b) => {
        if (b[1].length !== a[1].length) return b[1].length - a[1].length;
        const spanA = a[1][a[1].length - 1].t_min - a[1][0].t_min;
        const spanB = b[1][b[1].length - 1].t_min - b[1][0].t_min;
        if (Math.abs(spanB - spanA) > 1) return spanB - spanA;
        return releasePreferenceRank(a[0].split('::')[0]) - releasePreferenceRank(b[0].split('::')[0]);
      });
      const largestTapGroup = rankedTapGroups[0];
      const samplingPool =
        sameReleaseOnly && largestTapGroup && largestTapGroup[1].length > 0
          ? largestTapGroup[1]
          : candidateRows;

      let exposures: Array<{
        obsId: string;
        detector: string;
        accessUrl: string;
        fitsUrl: string;
        resolvedFits: ResolvedFitsUrl | string;
        tMin: number;
        tMax: number;
        mjd: number;
        date: string;
        wavelengthUm: number;
        visitKey: string;
        release?: string;
        provenanceVersion?: string;
      }> = [];

      if (samplingPool.length > 0) {
        const effectiveSampleCap = sampleOverrideMaxFrames ?? maxFrames;
        const targetRows = sampleAcrossEpochs(samplingPool, effectiveSampleCap);
        exposures = targetRows.map((row) => {
          const obsId = row.obs_id;
          const detector = row.detector || chosenDet;
          const mjd = Number(((row.t_min + row.t_max) / 2).toFixed(6));
          const date = new Date((mjd - 40587) * 86400 * 1000).toISOString();
          const wavelengthUm = Number((((row.em_min + row.em_max) / 2) * 1e6).toFixed(2));
          const visitKey = extractVisitKey(obsId);
          return {
            obsId,
            detector,
            accessUrl: row.access_url,
            fitsUrl: row.access_url,
            resolvedFits: row.access_url,
            tMin: row.t_min,
            tMax: row.t_max,
            mjd,
            date,
            wavelengthUm,
            visitKey,
            release: row.release,
            provenanceVersion: row.provenance_version,
          };
        });
      } else if (process.env.SPHEREX_OFFLINE === '1' && selectedCase && selectedCase.id.includes('nep')) {
        const caseEpochs = selectedCase.epochs || [selectedCase.epoch1, selectedCase.epoch2];
        exposures = caseEpochs.map((ep: CuratedEpoch) => {
          const detMatch = ep.fits_url.match(/_([1-6])\/level2|D([1-6])_/);
          const det = detMatch ? `D${detMatch[1] || detMatch[2]}` : 'D1';
          return {
            obsId: ep.obs_id,
            detector: det,
            accessUrl: ep.fits_url,
            fitsUrl: ep.fits_url,
            resolvedFits: ep.fits_url,
            tMin: ep.mjd,
            tMax: ep.mjd + 0.00133,
            mjd: ep.mjd,
            date: ep.date,
            wavelengthUm: ep.wavelength_um,
            visitKey: extractVisitKey(ep.obs_id),
          };
        });
      }

      if (exposures.length === 0) {
        return {
          statusCode: 200,
          validDetections: 0,
          unsaturatedCoreCount: 0,
          unsatSpanDays: 0,
          wingFitCount: 0,
          allSaturated: false,
          meanSnr: 0,
          totalTapRows: samplingPool.length,
          body: {
            status: 'ARCHIVE_ZERO_ROWS',
            state: 'ARCHIVE_ZERO_ROWS',
            framesCount: 0,
            framesReturned: 0,
            totalExposuresFound: totalExposuresAllDetectors,
            frames: [],
            availableDetectors,
            selectedDetector: chosenDet,
            targetCoords: { ra, dec },
            message: `IRSA TAP: 0 SPHEREx observations found in ${chosenDet} for RA ${ra.toFixed(4)}°, Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(4)}°.`,
          },
        };
      }

      const selectedExposures = exposures;
      const refMjdTs = selectedExposures[Math.floor((selectedExposures.length - 1) / 2)].mjd;
      const refEpochYearTs = julianYearFromMjd(refMjdTs);
      const refPropTs =
        matchedTargetTs &&
        matchedTargetTs.pmRaMasYr != null &&
        matchedTargetTs.pmDecMasYr != null &&
        matchedTargetTs.coordinateEpochYear != null
          ? propagatePosition(ra, dec, matchedTargetTs.pmRaMasYr, matchedTargetTs.pmDecMasYr, matchedTargetTs.coordinateEpochYear, refEpochYearTs)
          : null;

      let completedCount = 0;
      emitProgress({ type: 'progress', phase: 'cutout', loaded: 0, total: selectedExposures.length });

      interface LoadedFrameInternal extends TimeSeriesFrame {
        _targetSky: { ra: number; dec: number };
        _epochYear: number;
        _nativeData: Float32Array;
        _nativeVar: Float32Array | null;
        _nativeFlags: Int32Array | null;
        _astrometry?: FrameAstrometrySolution;
        _targetMeas?: FrameTargetAstrometry;
      }

      const framePromises = selectedExposures.map(async (exp, idx) => {
        try {
          const expEpochYear = julianYearFromMjd(exp.mjd);
          const propExp =
            matchedTargetTs &&
            matchedTargetTs.pmRaMasYr != null &&
            matchedTargetTs.pmDecMasYr != null &&
            matchedTargetTs.coordinateEpochYear != null
              ? propagatePosition(
                  ra,
                  dec,
                  matchedTargetTs.pmRaMasYr,
                  matchedTargetTs.pmDecMasYr,
                  matchedTargetTs.coordinateEpochYear,
                  expEpochYear
                )
              : null;
          const targetRa = propExp ? propExp.ra : ra;
          const targetDec = propExp ? propExp.dec : dec;
          const cutoutCenterRa = frameMode === 'sky' && refPropTs ? refPropTs.ra : targetRa;
          const cutoutCenterDec = frameMode === 'sky' && refPropTs ? refPropTs.dec : targetDec;
          const cutout = await getFITSCutout(exp.resolvedFits, cutoutCenterRa, cutoutCenterDec, sizePix, exp.obsId, { allowDemoFallback });
          const parsed = FITSReader.parse(cutout.buffer);
          const pix = WCS.skyToPix(targetRa, targetDec, parsed.wcs);
          const pxFromEdge = Math.min(pix.x, pix.y, parsed.width - 1 - pix.x, parsed.height - 1 - pix.y);
          const dq = decodeBitmaskFlags(parsed.flags, parsed.width * parsed.height);
          const dateObs = (typeof parsed.header['DATE-OBS'] === 'string' && parsed.header['DATE-OBS']) || exp.date;
          const dateEnd = (typeof parsed.header['DATE-END'] === 'string' && parsed.header['DATE-END']) || undefined;
          let intSec: number | undefined = undefined;
          if (dateObs && dateEnd) {
            const s = Date.parse(dateObs.endsWith('Z') ? dateObs : `${dateObs}Z`);
            const e = Date.parse(dateEnd.endsWith('Z') ? dateEnd : `${dateEnd}Z`);
            if (Number.isFinite(s) && Number.isFinite(e) && e >= s) {
              intSec = Number(((e - s) / 1000).toFixed(3));
            }
          }

          const waveEval = parsed.wcsWaveMetadata?.table
            ? FITSReader.evaluateWaveWcs(parsed.wcsWaveMetadata.table, pix.x, pix.y)
            : null;
          const exactWavelengthUm = waveEval ? Number(waveEval.wavelengthUm.toFixed(4)) : exp.wavelengthUm;
          const exactBandwidthUm = waveEval ? Number(waveEval.bandwidthUm.toFixed(4)) : undefined;

          completedCount++;
          emitProgress({
            type: 'progress',
            phase: 'cutout',
            loaded: completedCount,
            total: selectedExposures.length,
            obsId: exp.obsId,
          });

          return {
            index: idx + 1,
            obsId: exp.obsId,
            detector: exp.detector,
            visitKey: exp.visitKey,
            mjd: exp.mjd,
            dateObs,
            dateEnd,
            integrationDurationSec: intSec,
            wavelengthUm: exactWavelengthUm,
            bandwidthUm: exactBandwidthUm,
            version: parsed.version || exp.provenanceVersion || undefined,
            release: exp.release || parsed.release || undefined,
            cachedAt: cutout.cachedAt,
            wcsWave: parsed.wcsWaveMetadata?.table,
            width: parsed.width,
            height: parsed.height,
            flux: Array.from(parsed.data),
            variance: parsed.variance ? Array.from(parsed.variance) : undefined,
            flags: parsed.flags ? Array.from(parsed.flags) : undefined,
            dqDecoded: dq,
            wcs: parsed.wcs,
            reprojectedFlux: Array.from(parsed.data),
            targetPixel: {
              x: Number(pix.x.toFixed(2)),
              y: Number(pix.y.toFixed(2)),
              insideCutout: pix.x >= 0 && pix.y >= 0 && pix.x <= parsed.width - 1 && pix.y <= parsed.height - 1,
              pxFromEdge: Number(pxFromEdge.toFixed(2)),
            },
            fitsUrl: exp.fitsUrl,
            accessUrl: exp.accessUrl,
            isCached: cutout.isCached,
            isDemoCopy: cutout.isDemoCopy,
            trueCenter: cutout.trueCenter,
            trueObsId: cutout.trueObsId,
            _targetSky: { ra: targetRa, dec: targetDec },
            _epochYear: expEpochYear,
            _nativeData: parsed.data,
            _nativeVar: parsed.variance,
            _nativeFlags: parsed.flags,
          } as LoadedFrameInternal;
        } catch (frameErr: any) {
          completedCount++;
          emitProgress({
            type: 'progress',
            phase: 'cutout',
            loaded: completedCount,
            total: selectedExposures.length,
            obsId: exp.obsId,
            failed: true,
          });
          console.info(`[TimeSeries] Frame unavailable for ${exp.obsId}:`, frameErr.message);
          return null;
        }
      });

      const loadedRawAll = (await Promise.all(framePromises)).filter(
        (f): f is LoadedFrameInternal => f !== null
      );

      if (loadedRawAll.length === 0) {
        return {
          statusCode: 503,
          validDetections: 0,
          unsaturatedCoreCount: 0,
          unsatSpanDays: 0,
          wingFitCount: 0,
          allSaturated: false,
          meanSnr: 0,
          totalTapRows: samplingPool.length,
          body: {
            status: 'CUTOUT_FAILED',
            state: 'CUTOUT_FAILED',
            error: 'Could not retrieve any FITS cutouts from NASA/IPAC IRSA for this position.',
            targetCoords: { ra, dec },
            availableDetectors,
            selectedDetector: chosenDet,
            totalExposuresFound: totalExposuresAllDetectors,
            canRetry: true,
          },
        };
      }

      // Track release/version groups for Diff/Stack strict homogeneity while preserving ALL frames for Astrometry/Blink
      const versionGroups = new Map<string, LoadedFrameInternal[]>();
      for (const f of loadedRawAll) {
        const vKey = `${(f.release || 'public').toLowerCase()}::${f.version || 'default'}`;
        const list = versionGroups.get(vKey) || [];
        list.push(f);
        versionGroups.set(vKey, list);
      }
      const sortedVersionKeys = Array.from(versionGroups.keys()).sort((a, b) => {
        const countDiff = (versionGroups.get(b)?.length || 0) - (versionGroups.get(a)?.length || 0);
        if (countDiff !== 0) return countDiff;
        const [relA, verA] = a.split(':');
        const [relB, verB] = b.split(':');
        const rDiff = releasePreferenceRank(relA) - releasePreferenceRank(relB);
        if (rDiff !== 0) return rDiff;
        return compareSemver(verB, verA);
      });

      const releaseBreakdown = sortedVersionKeys.map((k) => k.replace('::', ':'));
      const releaseGroupCounts: Record<string, number> = {};
      for (const [k, v] of versionGroups.entries()) {
        releaseGroupCounts[k] = v.length;
      }

      // Optional strict wlWindow post-filter using exact evaluated WCS-WAVE wavelength
      const filteredLoaded =
        wlMinFilter !== null && wlMaxFilter !== null
          ? loadedRawAll.filter((f) => f.wavelengthUm >= wlMinFilter! && f.wavelengthUm <= wlMaxFilter!)
          : loadedRawAll;
      const activeRaw = (filteredLoaded.length > 0 ? filteredLoaded : loadedRawAll).slice();

      activeRaw.sort((a, b) => a.mjd - b.mjd);
      activeRaw.forEach((f, idx) => {
        f.index = idx + 1;
      });

      const failedDownloadCount = selectedExposures.length - loadedRawAll.length;
      const partialFailures =
        failedDownloadCount > 0
          ? {
              failedCount: failedDownloadCount,
              attemptedCount: selectedExposures.length,
              failed: failedDownloadCount,
              total: selectedExposures.length,
              notice: `${failedDownloadCount} of ${selectedExposures.length} frames could not be downloaded`,
            }
          : undefined;

      const anyDemoCopy = activeRaw.some((f) => f.isDemoCopy);
      const allCached = activeRaw.every((f) => f.isCached);
      const trueDemoCenter = activeRaw.find((f) => f.trueCenter)?.trueCenter;
      const newestCachedIso = activeRaw
        .map((f) => f.cachedAt)
        .filter((d): d is string => Boolean(d))
        .sort()
        .pop();

      const refWcs = activeRaw[0].wcs;
      const refW = activeRaw[0].width;
      const refH = activeRaw[0].height;
      const alignedVarByIdx: (Float32Array | null)[] = new Array(activeRaw.length).fill(null);
      const alignedFlagsByIdx: (Int32Array | null)[] = new Array(activeRaw.length).fill(null);

      // Reproject onto refWcs for display/Blink/Diff/Stack
      for (let i = 0; i < activeRaw.length; i++) {
        const fr = activeRaw[i];
        if (i === 0) {
          alignedVarByIdx[0] = fr._nativeVar;
          alignedFlagsByIdx[0] = fr._nativeFlags;
        } else {
          try {
            const reproj = ScientificPipeline.reprojectPixelByPixel(
              {
                width: fr.width,
                height: fr.height,
                data: fr._nativeData,
                variance: fr._nativeVar,
                flags: fr._nativeFlags,
                wcs: fr.wcs,
              } as any,
              refWcs,
              refW,
              refH
            );
            fr.reprojectedFlux = Array.from(reproj.alignedData);
            alignedVarByIdx[i] = reproj.alignedVariance;
            alignedFlagsByIdx[i] = reproj.alignedFlags;
          } catch {
            fr.reprojectedFlux = fr.flux;
            alignedVarByIdx[i] = fr._nativeVar;
            alignedFlagsByIdx[i] = fr._nativeFlags;
          }
        }
        const refPix = WCS.skyToPix(fr._targetSky.ra, fr._targetSky.dec, refWcs);
        fr.targetRefPixel = {
          x: Number(refPix.x.toFixed(3)),
          y: Number(refPix.y.toFixed(3)),
        };
      }

      // Tasks 1, 2, 3, 4: Measure differential astrometry (+ wing fit if core saturated) and native aperture photometry
      let unsaturatedCoreCount = 0;
      const allLooResiduals: LeaveOneOutResidual[] = [];
      const lightCurve: LightCurvePoint[] = [];

      for (let i = 0; i < activeRaw.length; i++) {
        const fr = activeRaw[i];
        const refStars = selectIsolatedReferenceStars(
          catalogOverlaysField,
          fr.wcs,
          fr.width,
          fr.height,
          fr._epochYear,
          fr._targetSky.ra,
          fr._targetSky.dec,
          { targetJ2000Ra: ra, targetJ2000Dec: dec, targetId: targetDef?.id, isolationRadiusPix: 3.0 }
        );
        const sol = fitFrameAstrometryCorrection(
          fr._nativeData,
          fr._nativeVar,
          fr._nativeFlags,
          fr.width,
          fr.height,
          fr.wcs,
          refStars
        );
        fr._astrometry = sol;
        if (sol.leaveOneOutResiduals?.length) {
          allLooResiduals.push(...sol.leaveOneOutResiduals);
        }

        const predPixFrame = WCS.skyToPix(
          sol.invertToRawSky(fr._targetSky.ra, fr._targetSky.dec).ra,
          sol.invertToRawSky(fr._targetSky.ra, fr._targetSky.dec).dec,
          fr.wcs
        );
        if (isCorePixelUnsaturated(fr._nativeData, fr._nativeFlags, fr.width, fr.height, predPixFrame.x, predPixFrame.y, 2.0)) {
          unsaturatedCoreCount++;
        }

        let meas = measureFrameTargetDifferential({
          flux: fr._nativeData,
          variance: fr._nativeVar,
          flags: fr._nativeFlags,
          width: fr.width,
          height: fr.height,
          wcs: fr.wcs,
          epochYear: fr._epochYear,
          targetEpochRa: fr._targetSky.ra,
          targetEpochDec: fr._targetSky.dec,
          targetJ2000Ra: ra,
          targetJ2000Dec: dec,
          targetId: targetDef?.id,
          catalogSources: catalogOverlaysField,
          astrometry: sol,
        });

        // Task 3: Where core is saturated/flagged, attempt 2..6 px PSF wing fit
        if (!meas.valid && meas.maskedReason === 'saturation_or_flag') {
          const wingMeas = fitSaturatedPsfWing({
            flux: fr._nativeData,
            variance: fr._nativeVar,
            flags: fr._nativeFlags,
            width: fr.width,
            height: fr.height,
            wcs: fr.wcs,
            epochYear: fr._epochYear,
            targetEpochRa: fr._targetSky.ra,
            targetEpochDec: fr._targetSky.dec,
            targetJ2000Ra: ra,
            targetJ2000Dec: dec,
            targetId: targetDef?.id,
            catalogSources: catalogOverlaysField,
            astrometry: sol,
          });
          if (wingMeas.valid) {
            meas = wingMeas;
          }
        }
        fr._targetMeas = meas;

        // Task 4: Per-frame aperture photometry (or 2..5 px wing-annulus photometry if core saturated)
        const photCx = meas.valid ? meas.x : predPixFrame.x;
        const photCy = meas.valid ? meas.y : predPixFrame.y;
        const phot = measureFrameApertureFlux({
          flux: fr._nativeData,
          variance: fr._nativeVar,
          flags: fr._nativeFlags,
          width: fr.width,
          height: fr.height,
          cx: photCx,
          cy: photCy,
        });
        lightCurve.push({
          frameIndex: fr.index,
          obsId: fr.obsId,
          mjd: fr.mjd,
          dateObs: fr.dateObs,
          detector: fr.detector,
          wavelengthUm: fr.wavelengthUm,
          fluxMjySr: phot.fluxMjySr,
          uncertaintyMjySr: phot.uncertaintyMjySr,
          snr: phot.snr,
          valid: phot.valid,
          isWingAnnulus: phot.isWingAnnulus,
          unmaskedPixels: phot.unmaskedPixels,
          maskedReason: phot.maskedReason,
        });
      }

      // Short-window co-add fallback ONLY when single frames are faint (maskedReason === 'low_snr')
      let centroidStacked = false;
      const singleValidCount = activeRaw.filter((f) => f._targetMeas?.valid).length;
      const hasSaturatedOrNeighborOnly = activeRaw.every(
        (f) => f._targetMeas?.maskedReason === 'neighbor_contaminated' || f._targetMeas?.maskedReason === 'saturation_or_flag' || f._targetMeas?.wingFit
      );
      if (activeRaw.length >= 4 && singleValidCount < Math.ceil(activeRaw.length * 0.5) && !hasSaturatedOrNeighborOnly) {
        const numPix = refW * refH;
        const bins: number[][] = [];
        let currentBin: number[] = [];
        for (let i = 0; i < activeRaw.length; i++) {
          if (currentBin.length === 0) {
            currentBin.push(i);
          } else if (activeRaw[i].mjd - activeRaw[currentBin[0]].mjd <= 5.0 && currentBin.length < 4) {
            currentBin.push(i);
          } else {
            bins.push(currentBin);
            currentBin = [i];
          }
        }
        if (currentBin.length > 0) bins.push(currentBin);

        for (const bin of bins) {
          if (bin.length < 2) continue;
          const wFlux = new Float32Array(numPix);
          const wSum = new Float32Array(numPix);
          const stackVar = new Float32Array(numPix);
          const stackFlags = new Int32Array(numPix);
          for (const idx of bin) {
            const fData = activeRaw[idx].reprojectedFlux;
            const vData = alignedVarByIdx[idx];
            const flData = alignedFlagsByIdx[idx];
            for (let p = 0; p < numPix; p++) {
              if (flData && ((flData[p] & 0x02) !== 0 || (flData[p] & 0x10) !== 0)) continue;
              const val = fData[p];
              if (!Number.isFinite(val)) continue;
              const v = vData && vData[p] > 1e-12 ? vData[p] : 1.0;
              const w = 1.0 / v;
              wFlux[p] += val * w;
              wSum[p] += w;
            }
          }
          for (let p = 0; p < numPix; p++) {
            if (wSum[p] > 0) {
              wFlux[p] /= wSum[p];
              stackVar[p] = 1.0 / wSum[p];
            } else {
              stackFlags[p] = 0x02;
              stackVar[p] = 1.0;
            }
          }
          const midIdx = bin[Math.floor(bin.length / 2)];
          const midFrame = activeRaw[midIdx];
          const stackRefStars = selectIsolatedReferenceStars(
            catalogOverlaysField,
            refWcs,
            refW,
            refH,
            midFrame._epochYear,
            midFrame._targetSky.ra,
            midFrame._targetSky.dec,
            { targetJ2000Ra: ra, targetJ2000Dec: dec, targetId: targetDef?.id, isolationRadiusPix: 3.0 }
          );
          const stackSol = fitFrameAstrometryCorrection(wFlux, stackVar, stackFlags, refW, refH, refWcs, stackRefStars);
          const stackMeas = measureFrameTargetDifferential({
            flux: wFlux,
            variance: stackVar,
            flags: stackFlags,
            width: refW,
            height: refH,
            wcs: refWcs,
            epochYear: midFrame._epochYear,
            targetEpochRa: midFrame._targetSky.ra,
            targetEpochDec: midFrame._targetSky.dec,
            targetJ2000Ra: ra,
            targetJ2000Dec: dec,
            targetId: targetDef?.id,
            catalogSources: catalogOverlaysField,
            astrometry: stackSol,
          });
          if (stackMeas.valid) {
            centroidStacked = true;
            for (const idx of bin) {
              if (!activeRaw[idx]._targetMeas?.valid || stackMeas.snr > (activeRaw[idx]._targetMeas?.snr ?? 0)) {
                activeRaw[idx]._targetMeas = stackMeas;
              }
            }
          }
        }
      }

      // Compute offsets strictly relative to the FIRST valid calibrated frame
      const firstValidFrame = activeRaw.find((f) => f._targetMeas?.valid && f._targetMeas.ra != null && f._targetMeas.dec != null);
      const anchorRa = firstValidFrame?._targetMeas?.ra ?? activeRaw[0]._targetSky.ra;
      const anchorDec = firstValidFrame?._targetMeas?.dec ?? activeRaw[0]._targetSky.dec;
      const anchorSky0 = firstValidFrame?._targetSky ?? activeRaw[0]._targetSky;
      const cosAnchorDec = Math.max(1e-6, Math.cos((anchorDec * Math.PI) / 180));

      const loadedFrames: TimeSeriesFrame[] = activeRaw.map((fr) => {
        const m = fr._targetMeas!;
        let dxArcsec = 0;
        let dyArcsec = 0;
        if (m.valid && m.ra != null && m.dec != null) {
          dxArcsec = Number((wrapDeltaRaDeg(m.ra, anchorRa) * cosAnchorDec * 3600).toFixed(3));
          dyArcsec = Number(((m.dec - anchorDec) * 3600).toFixed(3));
        }
        const { _targetSky, _epochYear, _nativeData, _nativeVar, _nativeFlags, _astrometry, _targetMeas, ...cleanFrame } = fr;
        return {
          ...cleanFrame,
          measuredCentroid: {
            x: m.x,
            y: m.y,
            ra: m.ra,
            dec: m.dec,
            dxArcsec,
            dyArcsec,
            uncertaintyArcsec: m.uncertaintyArcsec,
            centroidErrorArcsec: m.centroidErrorArcsec,
            refFitErrorArcsec: m.refFitErrorArcsec,
            snr: m.snr,
            stacked: undefined as boolean | undefined,
            valid: m.valid,
            wingFit: m.wingFit,
            refStarsUsed: m.refStarsUsed,
            refScatterArcsec: m.refScatterArcsec,
            astrometryMethod: m.astrometryMethod,
            lowConfidence: m.lowConfidence,
            lowConfidenceReason: m.lowConfidenceReason,
            maskedReason: m.maskedReason,
            distToPredictedPix: m.distToPredictedPix,
          },
        };
      });

      // Populate stacked badge accurately
      loadedFrames.forEach((lf) => {
        if (lf.measuredCentroid && centroidStacked && singleValidCount < Math.ceil(activeRaw.length * 0.5)) {
          if (lf.measuredCentroid.valid) lf.measuredCentroid.stacked = true;
        }
      });

      const validFrames = loadedFrames.filter((f) => f.measuredCentroid?.valid);
      const validCount = validFrames.length;
      const wingFitCount = validFrames.filter((f) => f.measuredCentroid?.wingFit).length;
      const allSaturated =
        validCount === 0 &&
        loadedFrames.length > 0 &&
        loadedFrames.every((f) => f.measuredCentroid?.maskedReason === 'saturation_or_flag');
      const meanSnr =
        validCount > 0
          ? validFrames.reduce((s, f) => s + (f.measuredCentroid?.snr || 0), 0) / validCount
          : 0;

      // Update stationary-control error floor store scoped strictly to chosenDet (use unsaturated frames when >= 2 exist)
      const targetIdLower = (targetDef?.id || caseId || '').toLowerCase();
      const isControlTarget = targetIdLower.includes('rw-aur') || targetIdLower.includes('r-dra');
      const unsatValidFrames = validFrames.filter((f) => !f.measuredCentroid?.wingFit);
      const unsatSpanDays =
        unsatValidFrames.length >= 2
          ? Number((unsatValidFrames[unsatValidFrames.length - 1].mjd - unsatValidFrames[0].mjd).toFixed(4))
          : 0;

      if (isControlTarget && loadedFrames.length >= 2) {
        const useUnsatOnlyForControl = unsatValidFrames.length >= 2;
        const controlInputs = activeRaw.map((fr, idx) => {
          const cent = loadedFrames[idx].measuredCentroid;
          const pRa = wrapDeltaRaDeg(fr._targetSky.ra, anchorSky0.ra) * cosAnchorDec * 3600;
          const pDec = (fr._targetSky.dec - anchorSky0.dec) * 3600;
          return {
            dxArcsec: cent?.dxArcsec ?? 0,
            dyArcsec: cent?.dyArcsec ?? 0,
            predDxArcsec: pRa,
            predDyArcsec: pDec,
            valid: Boolean(cent?.valid) && (!useUnsatOnlyForControl || !cent?.wingFit),
          };
        });
        const report = measureControlResidualScatter(targetDef?.id || caseId, controlInputs);
        report.detector = chosenDet;
        if (report.residualScatterArcsec != null) {
          controlScatterStore.set(`${chosenDet}::${report.targetId}`, report);
          saveControlFloorCache();
        }
      }

      // Task 1: Per-detector & per-brightness-class floor (Gaia LOO + same-detector stationary controls)
      const controlReportsInDetector = Array.from(controlScatterStore.values()).filter(
        (r) => r.detector === chosenDet
      );
      const floorInfo = computeDetectorAndBrightnessFloor({
        detector: chosenDet,
        looResiduals: allLooResiduals,
        targetMeanSnr: meanSnr,
        controlReportsInDetector,
      });
      const astrometricFloorArcsec = floorInfo.floorArcsec;

      // Requirement 1: Error budget computed twice ((a) unsaturated-only, (b) all frames weighted by 1/sigma^2)
      const budgetInputs = loadedFrames.map((f) => ({
        mjd: f.mjd,
        dxArcsec: f.measuredCentroid?.dxArcsec ?? 0,
        dyArcsec: f.measuredCentroid?.dyArcsec ?? 0,
        uncertaintyArcsec: f.measuredCentroid?.uncertaintyArcsec ?? astrometricFloorArcsec,
        valid: Boolean(f.measuredCentroid?.valid),
        wingFit: f.measuredCentroid?.wingFit,
      }));
      const errorBudget = evaluateAstrometryErrorBudget(budgetInputs, astrometricFloorArcsec);
      const chosenFit = errorBudget.chosen;
      const measuredNetDxArcsec = chosenFit.valid ? chosenFit.netDxArcsec : 0;
      const measuredNetDyArcsec = chosenFit.valid ? chosenFit.netDyArcsec : 0;
      const measuredDisplacementArcsec = chosenFit.valid ? chosenFit.displacementArcsec : 0;
      const measuredDisplacementErrorArcsec = chosenFit.valid
        ? chosenFit.displacementErrorArcsec
        : astrometricFloorArcsec;

      // Task 2: Canonical expected offset (dRA*cos(dec), dDec) over the chosen fit subset's baseline [mjdStart, mjdEnd]
      const mjdStartOffset = chosenFit.valid
        ? chosenFit.mjdStart
        : validFrames.length >= 2
        ? validFrames[0].mjd
        : (loadedFrames[0]?.mjd ?? 0);
      const mjdEndOffset = chosenFit.valid
        ? chosenFit.mjdEnd
        : validFrames.length >= 2
        ? validFrames[validFrames.length - 1].mjd
        : (loadedFrames[loadedFrames.length - 1]?.mjd ?? mjdStartOffset);
      const hasCanonicalPm =
        !anyDemoCopy &&
        matchedTargetTs &&
        matchedTargetTs.pmRaMasYr != null &&
        matchedTargetTs.pmDecMasYr != null;
      const expectedOffset = hasCanonicalPm
        ? computeExpectedProperMotionOffset(
            matchedTargetTs!.pmRaMasYr!,
            matchedTargetTs!.pmDecMasYr!,
            mjdStartOffset,
            mjdEndOffset
          )
        : computeExpectedProperMotionOffset(0, 0, mjdStartOffset, mjdEndOffset);

      const targetSigmaArcsec = Math.max(0.05, measuredDisplacementErrorArcsec);
      const sigma = chosenFit.valid
        ? Number((measuredDisplacementArcsec / targetSigmaArcsec).toFixed(2))
        : 0;
      const diffFromExpectedArcsec = Number(
        Math.hypot(
          measuredNetDxArcsec - expectedOffset.dxArcsec,
          measuredNetDyArcsec - expectedOffset.dyArcsec
        ).toFixed(3)
      );
      const diffFromExpectedSigma = chosenFit.valid
        ? Number((diffFromExpectedArcsec / targetSigmaArcsec).toFixed(2))
        : 0;

      const activeSubsetFrames =
        errorBudget.chosenOption === 'a' ? unsatValidFrames : validFrames;
      const refCountsValid = activeSubsetFrames
        .map((f) => f.measuredCentroid?.refStarsUsed ?? 0)
        .sort((a, b) => a - b);
      const medianRefStarsUsed =
        refCountsValid.length > 0
          ? refCountsValid[Math.floor(refCountsValid.length / 2)]
          : (loadedFrames[0]?.measuredCentroid?.refStarsUsed ?? 0);
      const usesWingFits = errorBudget.methodLabel === 'includes wing-fit frames, low confidence';
      const astrometryLowConfidence = medianRefStarsUsed < 3 || usesWingFits;
      const astrometryLowConfidenceReason = usesWingFits
        ? 'includes wing-fit frames, low confidence'
        : medianRefStarsUsed < 3
        ? `Fewer than 3 usable Gaia DR3 reference stars (median ${medianRefStarsUsed})`
        : undefined;

      const significanceRatio =
        astrometricFloorArcsec > 0
          ? Number((measuredDisplacementArcsec / astrometricFloorArcsec).toFixed(2))
          : 0;
      const targetDetectedInDetector = validCount > 0;
      // Significant ONLY if displacement >= 3 sigma AND |measured - expected| <= 2 sigma
      const motionSignificant =
        targetDetectedInDetector &&
        chosenFit.valid &&
        sigma >= 3.0 &&
        (!hasCanonicalPm && !isControlTarget ? true : diffFromExpectedSigma <= 2.0);
      const motionVerdict = allSaturated
        ? `saturated in ${chosenDet}`
        : !targetDetectedInDetector
        ? `not detected in ${chosenDet}`
        : motionSignificant
        ? 'significant motion detected'
        : 'motion not significant';

      const midFrameForNb = activeRaw[Math.floor(activeRaw.length / 2)];
      const neighborCacheKey = `${targetDef?.id || queryRa.toFixed(4)}_${queryDec.toFixed(4)}`;
      const nearbyNeighbors15Arcsec = findNearbyCatalogNeighbors(
        catalogOverlaysField,
        midFrameForNb._epochYear,
        midFrameForNb._targetSky.ra,
        midFrameForNb._targetSky.dec,
        { targetJ2000Ra: ra, targetJ2000Dec: dec, targetId: targetDef?.id, radiusArcsec: 15.0 }
      );
      if (nearbyNeighbors15Arcsec.length > 0 || !persistedNeighborsStore.has(neighborCacheKey)) {
        persistedNeighborsStore.set(neighborCacheKey, nearbyNeighbors15Arcsec);
        saveCatalogDiskCache();
      }

      // Pairwise temporal classification
      const pairs: TemporalPairInfo[] = [];
      let intraVisitPairs = 0;
      let independentVisitPairs = 0;
      let surveyEpochPairs = 0;
      for (let i = 0; i < loadedFrames.length - 1; i++) {
        const fA = loadedFrames[i];
        const fB = loadedFrames[i + 1];
        const deltaMjd = Math.abs(fB.mjd - fA.mjd);
        const deltaSec = deltaMjd * 86400;
        const deltaDays = deltaMjd;
        let baselineType: 'INTRA_VISIT' | 'INDEPENDENT_VISIT' | 'SURVEY_EPOCH' = 'INTRA_VISIT';
        if (deltaDays > 30) {
          baselineType = 'SURVEY_EPOCH';
          surveyEpochPairs++;
        } else if (fA.visitKey !== fB.visitKey || deltaSec > 3600) {
          baselineType = 'INDEPENDENT_VISIT';
          independentVisitPairs++;
        } else {
          baselineType = 'INTRA_VISIT';
          intraVisitPairs++;
        }
        const humanBaseline =
          deltaSec < 3600
            ? `${deltaSec.toFixed(1)}s (start-to-start cadence)`
            : deltaDays < 2
            ? `${(deltaSec / 3600).toFixed(1)} hours`
            : `${deltaDays.toFixed(1)} days (~${(deltaDays / 30.4).toFixed(1)} months)`;
        pairs.push({
          frameAIndex: fA.index,
          frameBIndex: fB.index,
          obsIdA: fA.obsId,
          obsIdB: fB.obsId,
          baselineType,
          deltaMjd,
          deltaSeconds: deltaSec,
          deltaDays,
          humanBaseline,
          startToStartCadenceSec: deltaSec < 3600 ? Number(deltaSec.toFixed(1)) : undefined,
        });
      }

      const spanDays =
        loadedFrames.length > 1
          ? Number((loadedFrames[loadedFrames.length - 1].mjd - loadedFrames[0].mjd).toFixed(4))
          : 0;
      const dateRange = {
        start: loadedFrames[0].dateObs,
        end: loadedFrames[loadedFrames.length - 1].dateObs,
        spanDays,
      };

      const detectorStacks = computeDetectorStacks(loadedFrames);
      const midTargetPix = loadedFrames[Math.floor(loadedFrames.length / 2)]?.targetRefPixel;
      const centerX = midTargetPix ? midTargetPix.x : Math.floor(refW / 2);
      const centerY = midTargetPix ? midTargetPix.y : Math.floor(refH / 2);
      const spectrumAtCenter = extractApertureSpectrum(loadedFrames, centerX, centerY, 2.5);

      const obsEpochYear = 2025.0 + (loadedFrames[0].mjd - 60676.0) / 365.25;
      const catalogOverlays = catalogOverlaysField.map((cat) => {
        let px = cat.x;
        let py = cat.y;
        try {
          const pix = WCS.skyToPix(cat.raPropagated, cat.decPropagated, refWcs);
          px = Number(pix.x.toFixed(2));
          py = Number(pix.y.toFixed(2));
        } catch {}
        return { ...cat, x: px, y: py };
      });

      const sourceMode: 'live' | 'saved_benchmark' =
        anyDemoCopy || process.env.SPHEREX_OFFLINE === '1' ? 'saved_benchmark' : 'live';
      const cachedDateFormatted = newestCachedIso
        ? `${newestCachedIso.replace('T', ' ').slice(0, 16)} UTC`
        : 'local cache';
      const sourceLabel = anyDemoCopy
        ? 'DEMO COPY (DIFFERENT FIELD)'
        : allCached
        ? (`REAL SPHEREx DATA - cached ${cachedDateFormatted}` as `REAL SPHEREx DATA - cached ${string}`)
        : 'REAL SPHEREx DATA';

      return {
        statusCode: 200,
        validDetections: validCount,
        unsaturatedCoreCount,
        unsatSpanDays,
        wingFitCount,
        allSaturated,
        meanSnr,
        totalTapRows: samplingPool.length,
        body: {
          status: 'OK',
          state: 'OK',
          sourceMode,
          sourceLabel,
          cachedAt: newestCachedIso,
          releaseBreakdown,
          releaseGroupCounts,
          exposuresPerRelease,
          mixedReleasesDetected: versionGroups.size > 1,
          activeRelease: sortedVersionKeys[0]?.split('::')[0] || loadedFrames[0]?.release || undefined,
          activeVersion: sortedVersionKeys[0]?.split('::')[1] || loadedFrames[0]?.version || undefined,
          largestDiffGroupKey: sortedVersionKeys[0],
          centroidStacked: centroidStacked || undefined,
          astrometrySummary: {
            method: errorBudget.methodLabel,
            chosenOption: errorBudget.chosenOption,
            errorBudgetLabel: errorBudget.methodLabel,
            annualMotion: {
              pmRaArcsecYr: chosenFit.pmRaArcsecYr,
              pmDecArcsecYr: chosenFit.pmDecArcsecYr,
              totalArcsecYr: chosenFit.annualMotionArcsecYr,
              errorArcsecYr: chosenFit.annualMotionErrorArcsecYr,
              reducedChi2: chosenFit.reducedChi2,
            },
            optionA: errorBudget.optionA,
            optionB: errorBudget.optionB,
            medianRefStarsUsed,
            lowConfidence: astrometryLowConfidence,
            lowConfidenceReason: astrometryLowConfidenceReason,
            astrometricFloorArcsec,
            detectorLooFloorArcsec: floorInfo.detectorLooFloorArcsec,
            controlFloorInDetectorArcsec: floorInfo.controlFloorInDetectorArcsec,
            floorByBrightnessClass: floorInfo.floorByBrightnessClass,
            brightnessClassUsed: floorInfo.brightnessClassUsed,
            looSampleCount: floorInfo.looSampleCount,
            controlsUsed: floorInfo.controlsUsedInDetector,
            perControlScatterArcsec: Object.fromEntries(
              controlReportsInDetector.map((r) => [r.targetId, r.residualScatterArcsec])
            ),
            measuredNetDxArcsec,
            measuredNetDyArcsec,
            measuredDisplacementArcsec,
            measuredDisplacementErrorArcsec,
            targetSigmaArcsec: Number(targetSigmaArcsec.toFixed(3)),
            sigma,
            expectedOffset,
            diffFromExpectedArcsec,
            diffFromExpectedSigma,
            significanceRatio,
            motionSignificant,
            motionVerdict,
            targetDetectedInDetector,
            unsaturatedCoreCount,
            unsatValidFramesCount: unsatValidFrames.length,
            unsatSpanDays,
            wingFitCount,
            saturatedAllDetectors: false,
            detectorDetectionNote: !targetDetectedInDetector
              ? allSaturated
                ? `saturated in ${chosenDet}`
                : `not detected in ${chosenDet}`
              : undefined,
            nearbyNeighbors15Arcsec,
          },
          lightCurve,
          partialFailures,
          isDemoCopy: anyDemoCopy || undefined,
          demoNotice: anyDemoCopy
            ? `Showing cached demo cutout from a different field (RA ${trueDemoCenter?.ra.toFixed(4)}°, Dec ${trueDemoCenter?.dec.toFixed(4)}°), NOT your requested coordinates.`
            : undefined,
          trueCenter: anyDemoCopy ? trueDemoCenter : undefined,
          targetCoords: anyDemoCopy && trueDemoCenter ? trueDemoCenter : { ra, dec },
          frameMode,
          selectedDetector: chosenDet,
          recommendedDetector: recommendedDetOrder[0],
          availableDetectors,
          properMotion:
            !anyDemoCopy &&
            matchedTargetTs &&
            matchedTargetTs.pmRaMasYr != null &&
            matchedTargetTs.pmDecMasYr != null &&
            matchedTargetTs.coordinateEpochYear != null
              ? {
                  targetId: matchedTargetTs.id,
                  pmRaMasYr: matchedTargetTs.pmRaMasYr,
                  pmDecMasYr: matchedTargetTs.pmDecMasYr,
                  fromEpochYear: matchedTargetTs.coordinateEpochYear,
                  toEpochYear: obsEpochYear,
                  separationArcsec: propagatePosition(
                    ra,
                    dec,
                    matchedTargetTs.pmRaMasYr,
                    matchedTargetTs.pmDecMasYr,
                    matchedTargetTs.coordinateEpochYear,
                    obsEpochYear
                  ).separationArcsec,
                }
              : undefined,
          fovArcmin,
          sizePix,
          totalExposuresFound: totalExposuresAllDetectors,
          framesReturned: loadedFrames.length,
          framesCount: loadedFrames.length,
          frames: loadedFrames,
          temporalPairs: pairs,
          pairs,
          cadenceSummary: {
            totalFrames: loadedFrames.length,
            totalPairs: pairs.length,
            intraVisitPairs,
            independentVisitPairs,
            surveyEpochPairs,
          },
          dateRange,
          detectorStacks,
          spectrumAtCenter,
          referenceWcs: refWcs,
          catalogOverlays,
          releaseId: loadedFrames[0]?.release ? `SPHEREx-${loadedFrames[0].release.toUpperCase()}-Level2B` : SPHEREX_RELEASE_ID,
        },
      };
    };

    try {
      // Probe first recommended detector at full maxFrames; if it lacks >=4 unsaturated frames >=180d,
      // screen all remaining detectors across D1..D6 with 6 evenly-spaced epochs, then upgrade the winner to full maxFrames.
      const maxAttempts = cleanDet ? 1 : candidateDetectors.length;
      let bestResult: {
        statusCode: number;
        body: Record<string, any>;
        validDetections: number;
        unsaturatedCoreCount: number;
        unsatSpanDays: number;
        wingFitCount: number;
        allSaturated: boolean;
        meanSnr: number;
        totalTapRows: number;
      } | null = null;
      let allDetectorsSaturated = true;
      let probedOkDetectors = 0;

      for (let i = 0; i < maxAttempts; i++) {
        const det = candidateDetectors[i];
        const sampleCap = i === 0 || cleanDet ? maxFrames : Math.min(6, maxFrames);
        const resDet = await buildResponseForDetector(det, undefined, sampleCap);
        if (resDet.body.status === 'OK') {
          probedOkDetectors++;
          if (!resDet.allSaturated && resDet.validDetections > 0) {
            allDetectorsSaturated = false;
          }
          if (resDet.unsaturatedCoreCount > 0) {
            allDetectorsSaturated = false;
          }
        }
        const bestHasOptA = bestResult ? bestResult.unsaturatedCoreCount >= 4 && bestResult.unsatSpanDays >= 180 : false;
        const curHasOptA = resDet.unsaturatedCoreCount >= 4 && resDet.unsatSpanDays >= 180;
        const bestScore = bestResult
          ? (bestHasOptA ? 10000 : 0) +
            bestResult.unsaturatedCoreCount * 100 +
            bestResult.validDetections * 10 -
            bestResult.wingFitCount * 2
          : -1;
        const curScore =
          (curHasOptA ? 10000 : 0) +
          resDet.unsaturatedCoreCount * 100 +
          resDet.validDetections * 10 -
          resDet.wingFitCount * 2;
        if (
          !bestResult ||
          (bestResult.body.status !== 'OK' && resDet.body.status === 'OK') ||
          (resDet.body.status === 'OK' &&
            (curScore > bestScore || (curScore === bestScore && resDet.meanSnr > bestResult.meanSnr)))
        ) {
          bestResult = resDet;
        }
        // Stop early ONLY when first/current detector already gives clean >=4 unsaturated cores spanning >=180d
        if (
          resDet.body.status === 'OK' &&
          resDet.unsaturatedCoreCount >= 4 &&
          resDet.unsatSpanDays >= 180
        ) {
          break;
        }
      }

      // If winning detector was screened at 6 frames and more TAP exposures exist, upgrade it to full maxFrames
      if (
        bestResult &&
        bestResult.body.status === 'OK' &&
        (bestResult.body.framesReturned || 0) < maxFrames &&
        bestResult.totalTapRows > (bestResult.body.framesReturned || 0)
      ) {
        bestResult = await buildResponseForDetector(bestResult.body.selectedDetector, undefined, maxFrames);
      }

      if (bestResult) {
        if (
          !cleanDet &&
          probedOkDetectors === candidateDetectors.length &&
          allDetectorsSaturated &&
          bestResult.validDetections === 0 &&
          bestResult.body.astrometrySummary
        ) {
          bestResult.body.astrometrySummary.saturatedAllDetectors = true;
          bestResult.body.astrometrySummary.errorBudgetLabel =
            'saturated in all frames of all detectors: predicted track only';
          bestResult.body.astrometrySummary.motionVerdict =
            'saturated in all frames of all detectors: predicted track only';
          bestResult.body.astrometrySummary.detectorDetectionNote =
            'saturated in all frames of all detectors: predicted track only';
        }
        return { statusCode: bestResult.statusCode, body: bestResult.body };
      }
      return {
        statusCode: 200,
        body: {
          status: 'ARCHIVE_ZERO_ROWS',
          state: 'ARCHIVE_ZERO_ROWS',
          framesCount: 0,
          framesReturned: 0,
          totalExposuresFound: 0,
          frames: [],
          availableDetectors,
          targetCoords: { ra, dec },
          message: `IRSA TAP: 0 SPHEREx observations found for RA ${ra.toFixed(4)}°, Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(4)}°.`,
        },
      };
    } catch (tapErr: any) {
      return {
        statusCode: 503,
        body: {
          status: 'NETWORK_ERROR',
          state: 'NETWORK_ERROR',
          error: tapErr?.message || 'Failed to reach NASA/IPAC IRSA TAP archive.',
          targetCoords: { ra, dec },
          canRetry: true,
        },
      };
    }
    }; // end runLivePipeline

    if (snapshotAvailable) {
      let liveResult: { statusCode: number; body: Record<string, any> } | null = null;
      try {
        liveResult = await Promise.race([
          runLivePipeline(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 25000)),
        ]);
      } catch {
        liveResult = null;
      }
      if (liveResult && liveResult.statusCode === 200 && liveResult.body?.state === 'OK') {
        return sendJsonOrStream(200, liveResult.body);
      }
      console.warn(`[Snapshot] Live query slow (>25s) or failed for ${caseId || `${ra},${dec}`}; serving archive snapshot.`);
      return sendJsonOrStream(200, snapshotAvailable);
    }

    const liveResult = await runLivePipeline();
    return sendJsonOrStream(liveResult.statusCode, liveResult.body);
  } catch (tsErr: any) {
    console.error('Time series pipeline error:', tsErr);
    return sendJsonOrStream(500, { error: 'Failed to process time series: ' + tsErr.message });
  }
});

// API: On-the-fly Spectral Extraction (Task 5)
app.post('/api/spherex/spectrum', async (req: Request, res: Response) => {
  try {
    const { targetX, targetY, apertureRadiusPix = 2.5, frames } = req.body;
    if (!Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({ error: 'Frames array is required for on-the-fly spectral extraction' });
    }
    const x = typeof targetX === 'number' ? targetX : 32;
    const y = typeof targetY === 'number' ? targetY : 32;
    const radius = typeof apertureRadiusPix === 'number' ? apertureRadiusPix : 2.5;

    const spectrum = extractApertureSpectrum(frames, x, y, radius);
    return res.json({
      targetX: x,
      targetY: y,
      apertureRadiusPix: radius,
      channelCount: spectrum.length,
      spectrum,
    });
  } catch (specErr: any) {
    return res.status(500).json({ error: 'Spectral extraction failed: ' + specErr.message });
  }
});

// API: Live Catalog Overlay with Proper Motion Propagation (Task 6)
app.get('/api/spherex/catalog-overlay', async (req: Request, res: Response) => {
  try {
    const ra = parseFloat(req.query.ra as string);
    const dec = parseFloat(req.query.dec as string);
    const radiusArcsec = parseFloat(req.query.radiusArcsec as string) || 180;
    const epochYear = parseFloat(req.query.epochYear as string) || 2025.35;

    if (!Number.isFinite(ra) || !Number.isFinite(dec)) {
      return res.status(400).json({ error: 'RA and Dec must be finite numbers' });
    }

    const overlays = await CatalogMatcher.getOverlaySources(ra, dec, radiusArcsec, epochYear);
    return res.json({
      ra,
      dec,
      radiusArcsec,
      epochYear,
      count: overlays.length,
      overlays,
    });
  } catch (catErr: any) {
    return res.status(500).json({ error: 'Catalog overlay query failed: ' + catErr.message });
  }
});

// API: SPEX AI Grounded Chat (Bilingual: English & Egyptian Arabic, strictly grounded in computed data)
// API: SPEX AI Grounded Chat (Bilingual: English & Egyptian Arabic, strictly grounded in computed data & application context)
app.post('/api/spex/chat', async (req: Request, res: Response) => {
  try {
    const {
      userMessage: rawUserMessage,
      message,
      evidence: rawEvidence,
      topCandidate: rawTopCandidate,
      provenance: rawProvenance,
      compatibility: rawCompatibility,
      targetCoords: rawTargetCoords,
      lang: rawLang,
      language,
      currentResult,
      selectedCandidate,
      context: rawContext,
      simplificationLevel = 0,
      explanationLevel = 'simple',
    } = req.body;

    const userMessage = (rawUserMessage ?? message ?? '').trim();
    const evidence = rawEvidence ?? currentResult?.evidence;
    const topCandidate = rawTopCandidate ?? selectedCandidate ?? currentResult?.candidates?.[0] ?? null;
    const provenance = rawProvenance ?? currentResult?.provenance;
    const compatibility = rawCompatibility ?? currentResult?.compatibility;
    const targetCoords = rawTargetCoords ?? currentResult?.targetCoords ?? rawContext?.targetCoords;
    const lang = rawLang ?? language ?? 'en';
    const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(userMessage || '');

    const targetName = rawContext?.targetName || currentResult?.title || "Astronomical Target";
    const activeLens = rawContext?.activeLens || 'time';
    const activeBand = rawContext?.activeBand || 'Band 1 (0.75 - 1.11 µm)';
    const isCurtainActive = rawContext?.isCurtainActive || false;
    const selectedFlagPixel = rawContext?.selectedFlagPixel || null;

    const lowerQuery = userMessage.toLowerCase();

    // Check for UI-pointing action questions
    let expectedAction: string | null = null;
    if (lowerQuery.includes('مقارنة') || lowerQuery.includes('ستارة') || lowerQuery.includes('أقارن') || lowerQuery.includes('compare') || lowerQuery.includes('curtain') || lowerQuery.includes('difference')) {
      expectedAction = 'curtain_divider';
    } else if (lowerQuery.includes('ألوان') || lowerQuery.includes('طيف') || lowerQuery.includes('لون') || lowerQuery.includes('color') || lowerQuery.includes('band') || lowerQuery.includes('wavelength') || lowerQuery.includes('channel')) {
      expectedAction = 'lens_colors';
    } else if (lowerQuery.includes('شك') || lowerQuery.includes('جودة') || lowerQuery.includes('عيب') || lowerQuery.includes('تشويش') || lowerQuery.includes('doubt') || lowerQuery.includes('flag') || lowerQuery.includes('glitch') || lowerQuery.includes('artifact')) {
      expectedAction = 'lens_doubt';
    } else if (lowerQuery.includes('جيران') || lowerQuery.includes('كتالوج') || lowerQuery.includes('غايا') || lowerQuery.includes('وايز') || lowerQuery.includes('neighbor') || lowerQuery.includes('gaia') || lowerQuery.includes('wise') || lowerQuery.includes('catalog')) {
      expectedAction = 'lens_neighbors';
    } else if (lowerQuery.includes('كارت') || lowerQuery.includes('بطاقة') || lowerQuery.includes('مشاركة') || lowerQuery.includes('postcard') || lowerQuery.includes('share')) {
      expectedAction = 'postcard_button';
    } else if (lowerQuery.includes('زمن') || lowerQuery.includes('وقت') || lowerQuery.includes('لقطة') || lowerQuery.includes('تاريخ') || lowerQuery.includes('time') || lowerQuery.includes('epoch') || lowerQuery.includes('blink')) {
      expectedAction = 'lens_time';
    } else if (lowerQuery.includes('علمي') || lowerQuery.includes('علماء') || lowerQuery.includes('scientist') || lowerQuery.includes('advanced')) {
      expectedAction = 'scientist_toggle';
    }

    const structuredContext = {
      targetName,
      coords: targetCoords,
      activeLens,
      activeBand,
      isCurtainActive,
      selectedFlagPixel,
      classification: evidence?.classification ?? 'UNKNOWN',
      timeBaselineDays: evidence?.timeBaselineDays ?? 0,
      startToStartCadenceSec: compatibility?.startToStartCadenceSec ?? evidence?.startToStartCadenceSec ?? 128.9,
      integrationDuration1Sec: compatibility?.integrationDuration1Sec ?? evidence?.integrationDuration1Sec ?? 115.1,
      integrationDuration2Sec: compatibility?.integrationDuration2Sec ?? evidence?.integrationDuration2Sec ?? 115.1,
      interExposureGapSec: compatibility?.interExposureGapSec ?? evidence?.interExposureGapSec ?? 13.8,
      summaryProse: evidence?.summaryProse ?? '',
      statisticalJustification: evidence?.statisticalJustification ?? '',
      candidate: topCandidate
        ? {
            id: topCandidate.id || 'CAND-01',
            snr: topCandidate.peakSignificance ?? topCandidate.snr ?? 0,
            deltaFlux: topCandidate.deltaFlux ?? 0,
            deltaUncertainty: topCandidate.deltaFluxUncertainty ?? topCandidate.deltaUncertainty ?? 0,
            ra: topCandidate.ra ?? 0,
            dec: topCandidate.dec ?? 0,
            status: topCandidate.status ?? 'Candidate',
            artifactScore: topCandidate.artifactScore ?? 0,
            artifactFlags: Array.isArray(topCandidate.artifactFlags) ? topCandidate.artifactFlags : [],
            whyFlagged: topCandidate.whyFlagged || '',
            catalogMatches: Array.isArray(topCandidate.catalogMatches) ? topCandidate.catalogMatches : [],
          }
        : null,
      isCompatible: compatibility?.isCompatible ?? true,
      provenance: {
        obsId1: provenance?.obsId1,
        obsId2: provenance?.obsId2,
        irsaSource: provenance?.irsaArchiveSource,
      },
    };

    const systemPromptArabic = `You are SPEX, the witty, sharp Egyptian feline-themed astrophysics guide for NASA SPHEREx "The Changing Sky".
STRICT RULES:
1. Respond in EXACTLY 1 to 2 short sentences in warm, witty Egyptian Arabic (اللهجة المصرية العامية الذكية).
2. Ground your answer strictly in the provided astronomical context for ${targetName}.
3. Explain technical concepts in simple, intuitive terms.
4. If guiding the user to a UI feature, mention the control naturally.
5. Never invent fake data or claim false discoveries.
6. Tag format at end of output:
<!--MOOD:{"mood":"greeting"|"explaining"|"thinking"|"investigator"|"eureka"|"sassy"|"serious"}-->
<!--ACTION:{"highlight":"lens_time"|"lens_colors"|"lens_doubt"|"lens_neighbors"|"curtain_divider"|"epoch_selector"|"postcard_button"|"scientist_toggle"|"viewport_canvas"}-->`;

    const systemPromptEnglish = `You are SPEX, the witty, sharp space-cat astrophysicist companion for NASA SPHEREx "The Changing Sky".
STRICT RULES:
1. Respond in EXACTLY 1 to 2 short sentences in clear, conversational English.
2. Ground your answer strictly in the provided astronomical context for ${targetName}.
3. Explain technical concepts in simple, friendly terms.
4. If guiding the user to a UI feature, refer to it naturally.
5. Never invent fake observations or claim false discoveries.
6. Tag format at end of output:
<!--MOOD:{"mood":"greeting"|"explaining"|"thinking"|"investigator"|"eureka"|"sassy"|"serious"}-->
<!--ACTION:{"highlight":"lens_time"|"lens_colors"|"lens_doubt"|"lens_neighbors"|"curtain_divider"|"epoch_selector"|"postcard_button"|"scientist_toggle"|"viewport_canvas"}-->`;

    const systemPrompt = isArabic ? systemPromptArabic : systemPromptEnglish;
    const defaultQuestion = isArabic ? `إيه اللي بنشوفه في ${targetName} يا سبيكس؟` : `What are we looking at in ${targetName}, SPEX?`;

    const userPrompt = `DATA:
${JSON.stringify(structuredContext, null, 2)}

QUESTION: "${userMessage || defaultQuestion}"
Answer in 1-2 concise sentences with mood tag and optional action tag.`;

    const primaryModel = process.env.PRIMARY_MODEL || 'gemini-3.8-flash';
    const secondaryModel = process.env.SECONDARY_MODEL || 'gemini-3.1-flash-lite';
    const candidateModels = [primaryModel, secondaryModel];

    const ai = getGenAIClient();
    if (ai) {
      for (const modelToTry of candidateModels) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AI request timed out after 8000ms')), 8000)
          );

          const generatePromise = ai.models.generateContent({
            model: modelToTry,
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
              },
            ],
          });

          const response: any = await Promise.race([generatePromise, timeoutPromise]);
          const replyText = response?.text || '';
          if (replyText) {
            let mood: SPEXMood = 'explaining';
            let action: string | null = expectedAction;

            const moodMatch = replyText.match(/<!--MOOD:({.*?})-->/);
            const actionMatch = replyText.match(/<!--ACTION:({.*?})-->/);
            let cleanReply = replyText;

            if (moodMatch) {
              try {
                const moodObj = JSON.parse(moodMatch[1]);
                if (moodObj.mood) mood = moodObj.mood as SPEXMood;
              } catch (e) {}
              cleanReply = cleanReply.replace(/<!--MOOD:({.*?})-->/g, '').trim();
            }

            if (actionMatch) {
              try {
                const actionObj = JSON.parse(actionMatch[1]);
                if (actionObj.highlight) action = actionObj.highlight;
              } catch (e) {}
              cleanReply = cleanReply.replace(/<!--ACTION:({.*?})-->/g, '').trim();
            }

            return res.json({
              reply: cleanReply,
              mood,
              action,
              engine: 'gemini',
              model: modelToTry,
            });
          }
        } catch (modelErr: any) {
          console.warn(`[SPEX AI] Model ${modelToTry} attempt failed:`, modelErr.message);
          if (modelErr.message?.includes('401') || modelErr.message?.includes('403') || modelErr.message?.includes('API_KEY_INVALID')) {
            break;
          }
        }
      }
    }

    // Grounded contextual fallback (accurate Egyptian Arabic / English)
    let fallbackReply = '';
    let fallbackMood: SPEXMood = 'explaining';
    let fallbackAction: string | null = expectedAction;

    if (isArabic) {
      if (expectedAction === 'curtain_divider') {
        fallbackMood = 'explaining';
        fallbackReply = 'بص على الخط اللي في نص الصورة! اسحبه يمين وشمال وهتشوف الصورتين بيتغيروا قدامك مباشرة بالعين المجردة.';
      } else if (expectedAction === 'lens_colors') {
        fallbackMood = 'eureka';
        fallbackReply = 'هنا! اضغط على عدسة الألوان الخفية وشوف الكون بـ 102 طول موجي للأشعة تحت الحمراء.';
      } else if (expectedAction === 'lens_doubt') {
        fallbackMood = 'investigator';
        fallbackReply = 'العدسة دي بتساعدك تشوف جودة البيانات وتتأكد إن النقطة اللامعة مش عيب في الكاشف أو تشبع بكسل.';
      } else if (expectedAction === 'lens_neighbors') {
        fallbackMood = 'explaining';
        fallbackReply = 'عدسة الجيران بتعرض النجوم المسجلة في كتالوجات غايا ووايز لمقارنتها مع رصدات SPHEREx.';
      } else if (expectedAction === 'postcard_button') {
        fallbackMood = 'proud';
        fallbackReply = 'اضغط على زرار بطاقة الاكتشاف فوق عشان تصنع كارت فلكي رسمي تشاركه مع أصحابك بالبيانات الحقيقية!';
      } else if (selectedFlagPixel) {
        fallbackMood = 'sassy';
        fallbackReply = `البكسل ده سجل علامة جودة (0x${selectedFlagPixel.flag.toString(16).toUpperCase()})؛ ده تشويش كاشف مش تغير كوني يا هندسة.`;
        fallbackAction = 'lens_doubt';
      } else if (topCandidate) {
        const candSnr = Number(topCandidate.snr || topCandidate.peakSignificance || 14.8);
        if (topCandidate.status === 'Possible artifact') {
          fallbackMood = 'sassy';
          fallbackReply = `المرشح ${topCandidate.id} تم استبعاده بسبب تشبع المستشعر (${topCandidate.artifactFlags?.join('، ') || 'تشبع'}); مفيش اكتشاف كوني هنا.`;
          fallbackAction = 'lens_doubt';
        } else {
          fallbackMood = 'eureka';
          fallbackReply = `رصدنا مرشحًا يظهر فارقًا ضوئيًا بدلالة ${Math.abs(candSnr).toFixed(1)}σ عبر تتابع 2.1 دقيقة!`;
          fallbackAction = 'lens_time';
        }
      } else {
        fallbackMood = 'greeting';
        fallbackReply = `أنت بتتفرج على ${targetName} في الأشعة تحت الحمراء؛ السماء هنا مستقرة والبيانات موثقة من أرشيف SPHEREx العام (DR1 / QR3 / QR2).`;
        fallbackAction = 'viewport_canvas';
      }
    } else {
      if (expectedAction === 'curtain_divider') {
        fallbackMood = 'explaining';
        fallbackReply = 'Look at the line in the center of the image! Drag it left and right to wipe directly between the before and after observations.';
      } else if (expectedAction === 'lens_colors') {
        fallbackMood = 'eureka';
        fallbackReply = 'Right here! Click the Hidden Colors lens to inspect the field across 102 infrared spectral channels.';
      } else if (expectedAction === 'lens_doubt') {
        fallbackMood = 'investigator';
        fallbackReply = 'This lens reveals sensor quality flags to verify whether a suspicious spot is a real source or a detector glitch.';
      } else if (expectedAction === 'lens_neighbors') {
        fallbackMood = 'explaining';
        fallbackReply = 'The Neighbors lens overlays known reference stars from Gaia DR3 and AllWISE onto the field.';
      } else if (expectedAction === 'postcard_button') {
        fallbackMood = 'proud';
        fallbackReply = 'Click the Postcard button in the top bar to create and export an authentic discovery postcard with verified data!';
      } else if (selectedFlagPixel) {
        fallbackMood = 'sassy';
        fallbackReply = `This pixel carries a quality flag (0x${selectedFlagPixel.flag.toString(16).toUpperCase()}); it is an instrumental glitch rather than celestial variability.`;
        fallbackAction = 'lens_doubt';
      } else if (topCandidate) {
        const candSnr = Number(topCandidate.snr || topCandidate.peakSignificance || 14.8);
        if (topCandidate.status === 'Possible artifact') {
          fallbackMood = 'sassy';
          fallbackReply = `Candidate ${topCandidate.id} was flagged as an instrument glitch (${topCandidate.artifactFlags?.join(', ') || 'saturation'}); definitely not a real supernova!`;
          fallbackAction = 'lens_doubt';
        } else {
          fallbackMood = 'eureka';
          fallbackReply = `Detected a candidate showing significant flux change at ${Math.abs(candSnr).toFixed(1)}σ across the ~2.1 min cadence!`;
          fallbackAction = 'lens_time';
        }
      } else {
        fallbackMood = 'greeting';
        fallbackReply = `You are exploring ${targetName} in calibrated infrared; photometric fields are verified against the SPHEREx public archive (DR1 / QR3 / QR2).`;
        fallbackAction = 'viewport_canvas';
      }
    }

    return res.json({
      reply: fallbackReply,
      mood: fallbackMood,
      action: fallbackAction,
      engine: 'grounded_rule_engine',
      model: 'spex-companion-v2',
    });
  } catch (err: any) {
    console.error('SPEX AI chat error:', err);
    return res.json({
      reply: 'Telemetry error in chat engine. Please retry in a second.',
      mood: 'thinking',
      action: null,
    });
  }
});

// Serve public assets explicitly with correct image MIME types
app.use('/assets', express.static(path.join(process.cwd(), 'public', 'assets'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  },
}));

// Ensure all unmatched API requests return JSON rather than falling through to Vite HTML
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Production static file serving or Vite dev middleware
async function warmPresetCache(port: number) {
  if (
    process.env.SPHEREX_OFFLINE === '1' ||
    process.env.SPHEREX_SKIP_WARMUP === '1' ||
    process.env.NODE_ENV === 'test'
  ) {
    return;
  }
  // Warm stationary controls FIRST so astrometric floor is populated empirically for challenge targets
  const presetCaseIds = [
    'case-rw-aur',
    'case-r-dra',
    'case-barnards-star',
    'case-epsilon-indi',
    'case-wise-0855',
  ];
  for (const cid of presetCaseIds) {
    try {
      const resp = await fetch(
        `http://127.0.0.1:${port}/api/spherex/timeseries?caseId=${encodeURIComponent(cid)}&maxFrames=16&liveOnly=1`,
        { signal: AbortSignal.timeout(120000) }
      );
      console.log(`[WarmCache] ${cid}: HTTP ${resp.status}`);
    } catch (err: any) {
      console.warn(`[WarmCache] ${cid} skipped:`, err?.message || err);
    }
  }
}

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`[SPHEREx Engine] Server listening on http://${HOST}:${PORT}`);
    setTimeout(() => {
      warmPresetCache(PORT).catch(() => {});
    }, 1500);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[SPHEREx Engine] Port ${PORT} is already in use.`);
    } else {
      console.error('[SPHEREx Engine] Server listen error:', err);
    }
  });
}

startServer().catch((err) => {
  console.error('[SPHEREx Engine] Failed to start server:', err);
  process.exit(1);
});
