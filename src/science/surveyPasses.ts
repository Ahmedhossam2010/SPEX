import { TimeSeriesFrame } from './timeSeriesPipeline';

export interface SurveyPassGroup {
  passIndex: number;
  passLabel: string;
  visitCount: number;
  startMjd: number;
  endMjd: number;
  combinedFrame: TimeSeriesFrame;
}

const DQ_ARTIFACT_MASK = 0x01 | 0x02 | 0x04 | 0x10 | 0x20 | 0x80000;

/**
 * Groups chronologically ordered SPHEREx frames into real survey passes.
 * SPHEREx maps a sky region repeatedly inside one pass (hours/days apart)
 * and revisits roughly every ~6 months. We split passes only on real MJD gaps
 * exceeding `passGapDays` (default 45 days) and NEVER invent fixed 6-month spacing.
 */
export function groupFramesBySurveyPass(
  frames: TimeSeriesFrame[],
  passGapDays = 45
): SurveyPassGroup[] {
  if (!frames || frames.length === 0) return [];

  const sorted = [...frames].sort((a, b) => (a.mjd || 0) - (b.mjd || 0));
  const rawGroups: TimeSeriesFrame[][] = [];

  for (const frame of sorted) {
    const lastGroup = rawGroups[rawGroups.length - 1];
    if (!lastGroup) {
      rawGroups.push([frame]);
    } else {
      const prevMjd = lastGroup[lastGroup.length - 1].mjd || 0;
      const gap = (frame.mjd || 0) - prevMjd;
      if (gap > passGapDays) {
        rawGroups.push([frame]);
      } else {
        lastGroup.push(frame);
      }
    }
  }

  return rawGroups.map((group, passIdx) => {
    const midIdx = Math.floor(group.length / 2);
    const rep = group[midIdx] || group[0];
    const width = rep.width || 64;
    const height = rep.height || 64;
    const nPix = width * height;

    // Combine matching release/version frames inside the pass using per-pixel median
    const repReleaseKey = `${(rep.release || 'public').toLowerCase()}::${rep.version || 'unknown'}`;
    const compatibleFrames = group.filter(
      (f) => `${(f.release || 'public').toLowerCase()}::${f.version || 'unknown'}` === repReleaseKey
    );
    const pool = compatibleFrames.length > 0 ? compatibleFrames : [rep];

    const combinedFlux = new Array<number>(nPix);
    const combinedFlags = new Array<number>(nPix).fill(0);

    for (let p = 0; p < nPix; p++) {
      const vals: number[] = [];
      let allFlagged = true;
      for (const f of pool) {
        const arr = f.reprojectedFlux?.length === nPix ? f.reprojectedFlux : f.flux;
        const val = arr[p];
        const flag = f.flags?.[p] ?? 0;
        const isArtifact = (flag & DQ_ARTIFACT_MASK) !== 0;
        if (!isArtifact) allFlagged = false;
        if (Number.isFinite(val) && !isArtifact) {
          vals.push(val);
        }
      }
      if (vals.length > 0) {
        vals.sort((a, b) => a - b);
        combinedFlux[p] = vals[Math.floor(vals.length / 2)];
      } else {
        const fallbackArr = rep.reprojectedFlux?.length === nPix ? rep.reprojectedFlux : rep.flux;
        combinedFlux[p] = Number.isFinite(fallbackArr[p]) ? fallbackArr[p] : 0;
        if (allFlagged && rep.flags?.[p] != null) {
          combinedFlags[p] = rep.flags[p];
        }
      }
    }

    // Average valid measured centroids within this pass
    const validCentroids = group
      .map((f) => f.measuredCentroid)
      .filter((c): c is NonNullable<TimeSeriesFrame['measuredCentroid']> => Boolean(c && c.valid));

    let measuredCentroid = rep.measuredCentroid;
    if (validCentroids.length > 0) {
      const n = validCentroids.length;
      const avgX = validCentroids.reduce((s, c) => s + c.x, 0) / n;
      const avgY = validCentroids.reduce((s, c) => s + c.y, 0) / n;
      const avgDx = validCentroids.reduce((s, c) => s + c.dxArcsec, 0) / n;
      const avgDy = validCentroids.reduce((s, c) => s + c.dyArcsec, 0) / n;
      const avgUnc =
        validCentroids.reduce((s, c) => s + c.uncertaintyArcsec, 0) / (n * Math.sqrt(n));
      measuredCentroid = {
        ...validCentroids[0],
        x: avgX,
        y: avgY,
        dxArcsec: avgDx,
        dyArcsec: avgDy,
        uncertaintyArcsec: Number(avgUnc.toFixed(3)),
        stacked: n > 1,
        valid: true,
      };
    }

    const startMjd = group[0].mjd;
    const endMjd = group[group.length - 1].mjd;
    const midMjd = (startMjd + endMjd) / 2;
    const passLabel = `Pass ${passIdx + 1} (${group.length}v)`;

    const combinedFrame: TimeSeriesFrame = {
      ...rep,
      index: passIdx,
      obsId: passLabel,
      mjd: midMjd,
      dateObs: rep.dateObs,
      flux: combinedFlux,
      reprojectedFlux: combinedFlux,
      flags: combinedFlags,
      measuredCentroid,
    };

    return {
      passIndex: passIdx,
      passLabel,
      visitCount: group.length,
      startMjd,
      endMjd,
      combinedFrame,
    };
  });
}
