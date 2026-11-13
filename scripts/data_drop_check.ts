/**
 * scripts/data_drop_check.ts
 *
 * Queries LIVE NASA/IPAC IRSA TAP (spherex.artifact JOIN spherex.plane) per official target
 * at its SIMBAD J2000 position propagated to 2025.6 (NO local fixture files).
 * Reports per-target rows, bands/detectors, releases, and date range.
 */

import { OFFICIAL_CHALLENGE_TARGETS } from '../src/science/challengeTargets';
import { propagatePosition } from '../src/science/properMotion';

interface LiveTapTargetReport {
  targetId: string;
  targetName: string;
  queryRa: number;
  queryDec: number;
  rows: number;
  bands: string[];
  releases: string[];
  dateStart: string;
  dateEnd: string;
  spanDays: number;
  status: 'PASS' | 'FAIL' | 'UNVERIFIED_PENDING';
  error?: string;
}

function mjdToIso(mjd: number): string {
  if (!Number.isFinite(mjd) || mjd <= 0) return '—';
  return new Date((mjd - 40587) * 86400 * 1000).toISOString().slice(0, 10);
}

function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n').filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];
  const splitCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) {
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

async function queryLiveTapTargetSummary(
  irsaHost: string,
  artifactTable: string,
  planeTable: string,
  ra: number,
  dec: number
): Promise<{
  totalRows: number;
  bands: string[];
  releases: string[];
  minMjd: number;
  maxMjd: number;
}> {
  const adql = `SELECT p.energy_bandpassname, p.datarelease, COUNT(DISTINCT p.obsid) AS exposure_count, MIN(p.time_bounds_lower) AS min_mjd, MAX(p.time_bounds_upper) AS max_mjd FROM ${artifactTable} a JOIN ${planeTable} p ON a.planeid = p.planeid WHERE CONTAINS(POINT('ICRS',${ra},${dec}),p.poly)=1 GROUP BY p.energy_bandpassname, p.datarelease`;
  const tapUrl = `${irsaHost}/TAP/sync?QUERY=${encodeURIComponent(adql)}&FORMAT=csv`;

  const MAX_RETRIES = 4;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch(tapUrl, {
        headers: { 'User-Agent': 'SPHEREx-ChangingSky-DataDropCheck/1.0' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err: any = new Error(`HTTP ${res.status} ${res.statusText}`);
        err.statusCode = res.status;
        throw err;
      }
      const csv = await res.text();
      if (csv.trim().startsWith('<')) {
        throw new Error('IRSA TAP returned VOTable error');
      }
      const rows = parseCsvRows(csv);
      let totalRows = 0;
      const bandSet = new Set<string>();
      const releaseSet = new Set<string>();
      let minMjd = Infinity;
      let maxMjd = -Infinity;

      for (const r of rows) {
        const cnt = parseInt(r.exposure_count || '0', 10) || 0;
        totalRows += cnt;
        const bp = r.energy_bandpassname || '';
        const dm = bp.match(/D([1-6])/i);
        if (dm) bandSet.add(`D${dm[1]}`);
        else if (bp) bandSet.add(bp);
        if (r.datarelease) releaseSet.add(r.datarelease.toLowerCase());
        const lo = parseFloat(r.min_mjd || '0');
        const hi = parseFloat(r.max_mjd || '0');
        if (Number.isFinite(lo) && lo > 0 && lo < minMjd) minMjd = lo;
        if (Number.isFinite(hi) && hi > 0 && hi > maxMjd) maxMjd = hi;
      }

      return {
        totalRows,
        bands: Array.from(bandSet).sort(),
        releases: Array.from(releaseSet).sort(),
        minMjd: Number.isFinite(minMjd) ? minMjd : 0,
        maxMjd: Number.isFinite(maxMjd) ? maxMjd : 0,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      lastErr = err;
      if (err?.statusCode && err.statusCode >= 400 && err.statusCode < 500) break;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500 * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastErr || new Error('IRSA TAP request failed');
}

export async function runDataDropCheck(): Promise<{
  allPassed: boolean;
  results: LiveTapTargetReport[];
}> {
  const irsaHost = (process.env.SPHEREX_IRSA_HOST || 'https://irsa.ipac.caltech.edu').replace(/\/+$/, '');
  const artifactTable = process.env.SPHEREX_ARTIFACT_TABLE || 'spherex.artifact';
  const planeTable = process.env.SPHEREX_PLANE_TABLE || 'spherex.plane';

  console.log('====================================================================');
  console.log('  SPHEREx Live Archive Data Drop Check (SIMBAD -> Live IRSA TAP)   ');
  console.log(`  IRSA: ${irsaHost} | ${artifactTable} JOIN ${planeTable}`);
  console.log('====================================================================\n');

  const results: LiveTapTargetReport[] = [];

  for (const target of OFFICIAL_CHALLENGE_TARGETS) {
    if (target.coordinateVerification === 'UNVERIFIED') {
      results.push({
        targetId: target.id,
        targetName: target.name,
        queryRa: target.ra,
        queryDec: target.dec,
        rows: 0,
        bands: [],
        releases: [],
        dateStart: '—',
        dateEnd: '—',
        spanDays: 0,
        status: 'UNVERIFIED_PENDING',
      });
      continue;
    }

    let evalRa = target.ra;
    let evalDec = target.dec;
    if (target.pmRaMasYr != null && target.pmDecMasYr != null && target.coordinateEpochYear != null) {
      const prop = propagatePosition(
        target.ra,
        target.dec,
        target.pmRaMasYr,
        target.pmDecMasYr,
        target.coordinateEpochYear,
        2025.6
      );
      evalRa = prop.ra;
      evalDec = prop.dec;
    }

    try {
      const summary = await queryLiveTapTargetSummary(irsaHost, artifactTable, planeTable, evalRa, evalDec);
      const dateStart = mjdToIso(summary.minMjd);
      const dateEnd = mjdToIso(summary.maxMjd);
      const spanDays =
        summary.minMjd > 0 && summary.maxMjd >= summary.minMjd
          ? Number((summary.maxMjd - summary.minMjd).toFixed(1))
          : 0;
      results.push({
        targetId: target.id,
        targetName: target.name,
        queryRa: evalRa,
        queryDec: evalDec,
        rows: summary.totalRows,
        bands: summary.bands,
        releases: summary.releases,
        dateStart,
        dateEnd,
        spanDays,
        status: summary.totalRows > 0 ? 'PASS' : 'FAIL',
      });
    } catch (err: any) {
      results.push({
        targetId: target.id,
        targetName: target.name,
        queryRa: evalRa,
        queryDec: evalDec,
        rows: 0,
        bands: [],
        releases: [],
        dateStart: '—',
        dateEnd: '—',
        spanDays: 0,
        status: 'FAIL',
        error: err?.message || 'TAP query failed',
      });
    }
  }

  console.log('| Target | Query (RA, Dec) | Rows | Bands | Releases | Date Range | Status |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of results) {
    const coordStr = `${r.queryRa.toFixed(4)}, ${r.queryDec.toFixed(4)}`;
    const bandStr = r.bands.length ? r.bands.join(',') : '—';
    const relStr = r.releases.length ? r.releases.join(',') : '—';
    const rangeStr = r.rows > 0 ? `${r.dateStart}..${r.dateEnd} (${r.spanDays}d)` : r.error || '0 rows';
    console.log(
      `| ${r.targetName} | ${coordStr} | ${r.rows} | ${bandStr} | ${relStr} | ${rangeStr} | ${r.status} |`
    );
  }

  const allPassed = results.every((r) => r.status === 'PASS' || r.status === 'UNVERIFIED_PENDING');
  console.log(`\nOverall Result: ${allPassed ? 'ALL TARGETS VERIFIED ON LIVE IRSA TAP' : 'ARCHIVE FAILURES DETECTED'}\n`);
  return { allPassed, results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDataDropCheck().then(({ allPassed }) => {
    process.exit(allPassed ? 0 : 1);
  });
}
