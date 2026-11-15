import { WCS } from './wcs';
import { WCSParams } from './types';
import { CatalogOverlayItem, TimeSeriesFrame } from './timeSeriesPipeline';

export interface AlignedTimeSeriesFrame extends TimeSeriesFrame {
  isUnaligned: boolean;
  nativeWidth: number;
  nativeHeight: number;
  nativeFlux: number[];
  nativeVariance?: number[];
  nativeFlags?: number[];
  nativeWcs: WCSParams;
}

export interface AlignedDatasetResult {
  frames: AlignedTimeSeriesFrame[];
  displayWcs: WCSParams | null;
  gridWidth: number;
  gridHeight: number;
  catalogOverlays: CatalogOverlayItem[];
  alignedCount: number;
  unalignedCount: number;
  hasAnyUnaligned: boolean;
}

export function isValidWcs(wcs: WCSParams | null | undefined): wcs is WCSParams {
  if (!wcs) return false;
  try {
    WCS.validateWCS(wcs);
    return true;
  } catch {
    return false;
  }
}

function medianFinite(values: number[], flags?: number[]): number {
  const sample: number[] = [];
  const step = values.length > 2048 ? 2 : 1;
  for (let i = 0; i < values.length; i += step) {
    const v = values[i];
    const flag = flags?.[i] ?? 0;
    if (Number.isFinite(v) && (flag & 0x07) === 0) {
      sample.push(v);
    }
  }
  if (sample.length === 0) {
    for (let i = 0; i < values.length; i++) {
      if (Number.isFinite(values[i])) sample.push(values[i]);
    }
  }
  if (sample.length === 0) return 0;
  sample.sort((a, b) => a - b);
  return sample[Math.floor(sample.length * 0.5)] ?? 0;
}

function mapPointViaWcs(
  pt: { x: number; y: number } | undefined,
  fromWcs: WCSParams | null | undefined,
  toWcs: WCSParams | null
): { x: number; y: number } | undefined {
  if (!pt || !fromWcs || !toWcs) return pt;
  try {
    const sky = WCS.pixToSky(pt.x, pt.y, fromWcs);
    return WCS.skyToPix(sky.ra, sky.dec, toWcs);
  } catch {
    return pt;
  }
}

export function alignFramesToDisplayWcs(
  rawFrames: TimeSeriesFrame[],
  options: {
    referenceWcs?: WCSParams;
    targetCoords: { ra: number; dec: number };
    sizePix?: number;
    catalogOverlays?: CatalogOverlayItem[];
  }
): AlignedDatasetResult {
  if (!rawFrames || rawFrames.length === 0) {
    return {
      frames: [],
      displayWcs: null,
      gridWidth: options.sizePix || 64,
      gridHeight: options.sizePix || 64,
      catalogOverlays: options.catalogOverlays || [],
      alignedCount: 0,
      unalignedCount: 0,
      hasAnyUnaligned: false,
    };
  }

  const gridWidth = Math.max(32, Math.min(256, options.sizePix || rawFrames[0]?.width || 64));
  const gridHeight = gridWidth;

  const refWcs: WCSParams | null = isValidWcs(options.referenceWcs)
    ? options.referenceWcs
    : (rawFrames.find((f) => isValidWcs(f.wcs))?.wcs ?? null);

  let centerSky = options.targetCoords;
  if (refWcs) {
    const rw0 = rawFrames[0]?.width || gridWidth;
    const rh0 = rawFrames[0]?.height || gridHeight;
    try {
      centerSky = WCS.pixToSky((rw0 - 1) / 2, (rh0 - 1) / 2, refWcs);
    } catch {
      centerSky = options.targetCoords;
    }
  }

  const pixelScaleArcsec =
    refWcs?.pixelScaleArcsec && Number.isFinite(refWcs.pixelScaleArcsec) && refWcs.pixelScaleArcsec > 0.1
      ? refWcs.pixelScaleArcsec
      : 6.2;
  const scaleDeg = pixelScaleArcsec / 3600;

  // Canonical North-up (+Dec at y=0), East-left (+RA at x=0) tangent projection for top-down canvas coordinates
  const displayWcs: WCSParams = {
    crval1: centerSky.ra,
    crval2: centerSky.dec,
    crpix1: (gridWidth + 1) / 2,
    crpix2: (gridHeight + 1) / 2,
    cdelt1: -scaleDeg,
    cdelt2: -scaleDeg,
    cd1_1: -scaleDeg,
    cd1_2: 0,
    cd2_1: 0,
    cd2_2: -scaleDeg,
    ctype1: 'RA---TAN',
    ctype2: 'DEC--TAN',
    equinox: 2000,
    radesys: 'ICRS',
    pixelScaleArcsec,
  };

  let alignedCount = 0;
  let unalignedCount = 0;

  const alignedFrames: AlignedTimeSeriesFrame[] = rawFrames.map((fr) => {
    const srcW = fr.width || gridWidth;
    const srcH = fr.height || gridHeight;
    const nativeFlux = fr.flux || [];
    const frameWcsValid = isValidWcs(fr.wcs) && nativeFlux.length >= srcW * srcH;

    if (!frameWcsValid) {
      unalignedCount++;
      const fallbackFlux = new Array<number>(gridWidth * gridHeight).fill(0);
      const copyW = Math.min(gridWidth, srcW);
      const copyH = Math.min(gridHeight, srcH);
      for (let y = 0; y < copyH; y++) {
        for (let x = 0; x < copyW; x++) {
          fallbackFlux[y * gridWidth + x] = nativeFlux[y * srcW + x] ?? 0;
        }
      }
      return {
        ...fr,
        width: gridWidth,
        height: gridHeight,
        flux: fallbackFlux,
        reprojectedFlux: fallbackFlux,
        wcs: displayWcs,
        isUnaligned: true,
        nativeWidth: srcW,
        nativeHeight: srcH,
        nativeFlux,
        nativeVariance: fr.variance,
        nativeFlags: fr.flags,
        nativeWcs: fr.wcs,
      };
    }

    alignedCount++;
    const grid = WCS.getReprojectionGrid(displayWcs, fr.wcs, gridWidth, gridHeight);
    const total = gridWidth * gridHeight;
    const bgFill = medianFinite(nativeFlux, fr.flags);
    const reprojFlux = new Array<number>(total);
    const reprojFlags = fr.flags ? new Array<number>(total) : undefined;
    const reprojVar = fr.variance ? new Array<number>(total) : undefined;
    const varFill = fr.variance ? medianFinite(fr.variance) : 1;

    for (let p = 0; p < total; p++) {
      const sx = grid.srcX[p];
      const sy = grid.srcY[p];
      if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx < -0.5 || sy < -0.5 || sx > srcW - 0.5 || sy > srcH - 0.5) {
        reprojFlux[p] = bgFill;
        if (reprojFlags) reprojFlags[p] = 0;
        if (reprojVar) reprojVar[p] = varFill;
        continue;
      }

      const csx = Math.max(0, Math.min(srcW - 1, sx));
      const csy = Math.max(0, Math.min(srcH - 1, sy));
      const x0 = Math.floor(csx);
      const y0 = Math.floor(csy);
      const x1 = Math.min(srcW - 1, x0 + 1);
      const y1 = Math.min(srcH - 1, y0 + 1);
      const fx = csx - x0;
      const fy = csy - y0;

      const v00 = nativeFlux[y0 * srcW + x0];
      const v10 = nativeFlux[y0 * srcW + x1];
      const v01 = nativeFlux[y1 * srcW + x0];
      const v11 = nativeFlux[y1 * srcW + x1];

      let wSum = 0;
      let valSum = 0;
      const addSample = (val: number, w: number) => {
        if (Number.isFinite(val)) {
          valSum += val * w;
          wSum += w;
        }
      };
      addSample(v00, (1 - fx) * (1 - fy));
      addSample(v10, fx * (1 - fy));
      addSample(v01, (1 - fx) * fy);
      addSample(v11, fx * fy);

      reprojFlux[p] = wSum > 0 ? valSum / wSum : bgFill;

      if (reprojFlags && fr.flags) {
        const nx = Math.round(csx);
        const ny = Math.round(csy);
        reprojFlags[p] = fr.flags[ny * srcW + nx] ?? 0;
      }
      if (reprojVar && fr.variance) {
        const nx = Math.round(csx);
        const ny = Math.round(csy);
        const vv = fr.variance[ny * srcW + nx];
        reprojVar[p] = Number.isFinite(vv) ? vv : varFill;
      }
    }

    const mappedTargetRef = mapPointViaWcs(fr.targetRefPixel, refWcs || fr.wcs, displayWcs);
    const mappedTargetPixRaw = mapPointViaWcs(fr.targetPixel, fr.wcs, displayWcs);
    const mappedTargetPix = mappedTargetPixRaw
      ? {
          x: mappedTargetPixRaw.x,
          y: mappedTargetPixRaw.y,
          insideCutout:
            mappedTargetPixRaw.x >= 0 &&
            mappedTargetPixRaw.x < gridWidth &&
            mappedTargetPixRaw.y >= 0 &&
            mappedTargetPixRaw.y < gridHeight,
          pxFromEdge: Math.min(
            mappedTargetPixRaw.x,
            gridWidth - 1 - mappedTargetPixRaw.x,
            mappedTargetPixRaw.y,
            gridHeight - 1 - mappedTargetPixRaw.y
          ),
        }
      : fr.targetPixel;

    let mappedCentroid = fr.measuredCentroid;
    if (mappedCentroid) {
      if (mappedCentroid.valid && Number.isFinite(mappedCentroid.ra) && Number.isFinite(mappedCentroid.dec)) {
        try {
          const p = WCS.skyToPix(mappedCentroid.ra!, mappedCentroid.dec!, displayWcs);
          mappedCentroid = { ...mappedCentroid, x: p.x, y: p.y };
        } catch {
          // keep original if projection fails
        }
      } else {
        const p = mapPointViaWcs({ x: mappedCentroid.x, y: mappedCentroid.y }, refWcs || fr.wcs, displayWcs);
        if (p) {
          mappedCentroid = { ...mappedCentroid, x: p.x, y: p.y };
        }
      }
    }

    return {
      ...fr,
      width: gridWidth,
      height: gridHeight,
      flux: reprojFlux,
      reprojectedFlux: reprojFlux,
      flags: reprojFlags,
      variance: reprojVar,
      wcs: displayWcs,
      targetRefPixel: mappedTargetRef,
      targetPixel: mappedTargetPix,
      measuredCentroid: mappedCentroid,
      isUnaligned: false,
      nativeWidth: srcW,
      nativeHeight: srcH,
      nativeFlux,
      nativeVariance: fr.variance,
      nativeFlags: fr.flags,
      nativeWcs: fr.wcs,
    };
  });

  const mappedCatalogs: CatalogOverlayItem[] = (options.catalogOverlays || []).map((cat) => {
    const catRa = cat.raPropagated ?? cat.raRaw;
    const catDec = cat.decPropagated ?? cat.decRaw;
    if (Number.isFinite(catRa) && Number.isFinite(catDec)) {
      try {
        const p = WCS.skyToPix(catRa, catDec, displayWcs);
        return { ...cat, x: p.x, y: p.y };
      } catch {
        // fallback below
      }
    }
    const fallbackP = mapPointViaWcs({ x: cat.x, y: cat.y }, refWcs, displayWcs);
    return fallbackP ? { ...cat, x: fallbackP.x, y: fallbackP.y } : cat;
  });

  return {
    frames: alignedFrames,
    displayWcs,
    gridWidth,
    gridHeight,
    catalogOverlays: mappedCatalogs,
    alignedCount,
    unalignedCount,
    hasAnyUnaligned: unalignedCount > 0,
  };
}

export function inspectSpotOnRawFrame(
  dispX: number,
  dispY: number,
  displayWcs: WCSParams | null,
  frame: TimeSeriesFrame | AlignedTimeSeriesFrame
): {
  sky: { ra: number; dec: number } | null;
  fluxMjySr: number | null;
  variance: number | null;
  flagsBitmask: number;
} {
  const aligned = frame as Partial<AlignedTimeSeriesFrame>;
  const nativeW = aligned.nativeWidth ?? frame.width ?? 64;
  const nativeH = aligned.nativeHeight ?? frame.height ?? 64;
  const nativeFlux = aligned.nativeFlux ?? frame.flux ?? [];
  const nativeVar = aligned.nativeVariance ?? frame.variance;
  const nativeFlags = aligned.nativeFlags ?? frame.flags;
  const nativeWcs = aligned.nativeWcs ?? frame.wcs;

  let sky: { ra: number; dec: number } | null = null;
  let sampleX = dispX;
  let sampleY = dispY;

  if (displayWcs) {
    try {
      sky = WCS.pixToSky(dispX, dispY, displayWcs);
      if (isValidWcs(nativeWcs)) {
        const nativePix = WCS.skyToPix(sky.ra, sky.dec, nativeWcs);
        sampleX = nativePix.x;
        sampleY = nativePix.y;
      }
    } catch {
      sky = null;
    }
  } else if (isValidWcs(nativeWcs)) {
    try {
      sky = WCS.pixToSky(dispX, dispY, nativeWcs);
    } catch {
      sky = null;
    }
  }

  const rx = Math.round(sampleX);
  const ry = Math.round(sampleY);
  if (rx < 0 || rx >= nativeW || ry < 0 || ry >= nativeH) {
    return { sky, fluxMjySr: null, variance: null, flagsBitmask: 0 };
  }
  const idx = ry * nativeW + rx;
  const fluxRaw = nativeFlux[idx];
  const varRaw = nativeVar?.[idx];
  return {
    sky,
    fluxMjySr: Number.isFinite(fluxRaw) ? fluxRaw : null,
    variance: varRaw != null && Number.isFinite(varRaw) ? varRaw : null,
    flagsBitmask: nativeFlags?.[idx] ?? 0,
  };
}
