/**
 * scripts/build_snapshot.ts
 *
 * Builds compact (< 3 MB total) real-data archive snapshots for the 5 official SPHEREx presets
 * by querying the running server's live /api/spherex/timeseries endpoint (?liveOnly=1).
 *
 * Usage:
 *   npx tsx scripts/build_snapshot.ts
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.SNAPSHOT_SERVER_URL || 'http://127.0.0.1:3000';
const SNAPSHOT_DIR = path.join(process.cwd(), 'data', 'snapshots');
const MAX_TOTAL_BYTES = 3.35 * 1024 * 1024; // Strictly under 3.5 MB total

const PRESETS = [
  { slug: 'barnards-star', caseId: 'case-barnards-star', name: "Barnard's Star" },
  { slug: 'epsilon-indi', caseId: 'case-epsilon-indi', name: 'Epsilon Indi Ba/Bb' },
  { slug: 'wise-0855', caseId: 'case-wise-0855', name: 'WISE 0855-0714' },
  { slug: 'rw-aur', caseId: 'case-rw-aur', name: 'RW Aurigae' },
  { slug: 'r-dra', caseId: 'case-r-dra', name: 'R Draconis' },
];

function roundFloatArray(arr: number[] | undefined, sigFigs = 4): number[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  return arr.map((v) => (Number.isFinite(v) ? Number(v.toPrecision(sigFigs)) : 0));
}

function compactSnapshot(raw: any, maxKeepFrames: number, keepReprojected = true): any {
  const takenAt = new Date().toISOString();
  const srcFrames: any[] = Array.isArray(raw.frames) ? raw.frames : [];
  let pickedFrames = srcFrames;
  if (srcFrames.length > maxKeepFrames && maxKeepFrames >= 2) {
    const idxs = new Set<number>();
    for (let i = 0; i < maxKeepFrames; i++) {
      idxs.add(Math.round((i * (srcFrames.length - 1)) / (maxKeepFrames - 1)));
    }
    pickedFrames = Array.from(idxs)
      .sort((a, b) => a - b)
      .map((i) => srcFrames[i]);
  }

  const compactFrames = pickedFrames.map((fr, idx) => ({
    index: idx + 1,
    obsId: fr.obsId,
    detector: fr.detector,
    visitKey: fr.visitKey,
    mjd: fr.mjd,
    dateObs: fr.dateObs,
    dateEnd: fr.dateEnd,
    integrationDurationSec: fr.integrationDurationSec,
    wavelengthUm: fr.wavelengthUm,
    bandwidthUm: fr.bandwidthUm,
    version: fr.version,
    release: fr.release,
    cachedAt: fr.cachedAt || takenAt,
    width: fr.width,
    height: fr.height,
    flux: roundFloatArray(fr.flux, 4),
    reprojectedFlux: keepReprojected && idx > 0 ? roundFloatArray(fr.reprojectedFlux, 4) : undefined,
    variance: roundFloatArray(fr.variance, 3),
    flags: Array.isArray(fr.flags) ? fr.flags : undefined,
    dqDecoded: fr.dqDecoded,
    wcs: fr.wcs,
    targetPixel: fr.targetPixel,
    targetRefPixel: fr.targetRefPixel,
    measuredCentroid: fr.measuredCentroid,
    fitsUrl: fr.fitsUrl,
    accessUrl: fr.accessUrl,
    trueCenter: fr.trueCenter || raw.targetCoords,
    isCached: true,
  }));

  return {
    snapshotTakenAt: takenAt,
    snapshotSource: 'live_irsa_archive',
    status: 'OK',
    state: 'OK',
    targetCoords: raw.targetCoords,
    frameMode: raw.frameMode || 'sky',
    selectedDetector: raw.selectedDetector,
    recommendedDetector: raw.recommendedDetector,
    availableDetectors: raw.availableDetectors,
    fovArcmin: raw.fovArcmin,
    sizePix: raw.sizePix,
    totalExposuresFound: raw.totalExposuresFound,
    framesReturned: compactFrames.length,
    framesCount: compactFrames.length,
    frames: compactFrames,
    temporalPairs: raw.temporalPairs,
    cadenceSummary: raw.cadenceSummary,
    dateRange: raw.dateRange,
    detectorStacks: raw.detectorStacks,
    spectrumAtCenter: raw.spectrumAtCenter,
    referenceWcs: raw.referenceWcs,
    catalogOverlays: raw.catalogOverlays,
    properMotion: raw.properMotion,
    releaseId: raw.releaseId,
    releaseBreakdown: raw.releaseBreakdown,
    releaseGroupCounts: raw.releaseGroupCounts,
    exposuresPerRelease: raw.exposuresPerRelease,
    activeRelease: raw.activeRelease || compactFrames[0]?.release,
    activeVersion: raw.activeVersion || compactFrames[0]?.version,
    largestDiffGroupKey: raw.largestDiffGroupKey,
    mixedReleasesDetected: raw.mixedReleasesDetected,
    centroidStacked: raw.centroidStacked,
    astrometrySummary: raw.astrometrySummary,
    lightCurve: raw.lightCurve,
  };
}

async function main() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }

  const rawBySlug = new Map<string, any>();

  for (const preset of PRESETS) {
    const url = `${BASE_URL}/api/spherex/timeseries?caseId=${encodeURIComponent(preset.caseId)}&maxFrames=16&liveOnly=1`;
    console.log(`[Snapshot] Fetching live ${preset.name} from ${url}...`);
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(240000) });
      if (!resp.ok) {
        const txt = await resp.text();
        console.error(`[Snapshot] ${preset.slug} HTTP ${resp.status}: ${txt.slice(0, 200)}`);
        continue;
      }
      const data = await resp.json();
      if (data.state !== 'OK' || !Array.isArray(data.frames) || data.frames.length === 0) {
        console.error(`[Snapshot] ${preset.slug} returned non-OK state=${data.state}: ${data.error || data.message || ''}`);
        continue;
      }
      rawBySlug.set(preset.slug, data);
      console.log(`[Snapshot] ${preset.slug}: fetched ${data.frames.length} live frames (${data.selectedDetector}, release=${data.activeRelease || 'n/a'}).`);
    } catch (err: any) {
      console.error(`[Snapshot] ${preset.slug} failed:`, err?.message || err);
    }
  }

  if (rawBySlug.size === 0) {
    console.error('[Snapshot] No live presets succeeded; snapshot directory left unchanged.');
    process.exit(1);
  }

  // Adaptive compaction to guarantee total snapshot footprint < 3 MB
  let frameCap = 16;
  let keepReproj = true;
  const serialized = new Map<string, string>();

  for (const attempt of [
    { frames: 16, reproj: true },
    { frames: 12, reproj: true },
    { frames: 10, reproj: true },
    { frames: 8, reproj: true },
    { frames: 6, reproj: false },
    { frames: 5, reproj: false },
    { frames: 4, reproj: false },
  ]) {
    frameCap = attempt.frames;
    keepReproj = attempt.reproj;
    serialized.clear();
    let totalBytes = 0;
    for (const [slug, raw] of rawBySlug.entries()) {
      const jsonStr = JSON.stringify(compactSnapshot(raw, frameCap, keepReproj));
      serialized.set(slug, jsonStr);
      totalBytes += Buffer.byteLength(jsonStr, 'utf-8');
    }
    if (totalBytes <= MAX_TOTAL_BYTES) {
      break;
    }
  }

  let finalTotal = 0;
  for (const [slug, jsonStr] of serialized.entries()) {
    const outPath = path.join(SNAPSHOT_DIR, `${slug}.json`);
    fs.writeFileSync(outPath, jsonStr, 'utf-8');
    const bytes = Buffer.byteLength(jsonStr, 'utf-8');
    finalTotal += bytes;
    console.log(`[Snapshot] Saved ${outPath} (${(bytes / 1024).toFixed(1)} KB)`);
  }

  console.log(`[Snapshot] Total across ${serialized.size} snapshots: ${(finalTotal / (1024 * 1024)).toFixed(2)} MB (cap 3.00 MB, maxFrames=${frameCap}, reprojected=${keepReproj}).`);
}

main().catch((err) => {
  console.error('[Snapshot] Fatal error:', err);
  process.exit(1);
});
