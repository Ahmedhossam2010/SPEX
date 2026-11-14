import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

export interface DetectorBandRange {
  detector: string;
  wavelengthRangeUm: [number, number];
  exposureCount?: number;
}

export const DEFAULT_SPHEREX_DETECTOR_RANGES: DetectorBandRange[] = [
  { detector: 'D1', wavelengthRangeUm: [0.75, 1.11] },
  { detector: 'D2', wavelengthRangeUm: [1.11, 1.65] },
  { detector: 'D3', wavelengthRangeUm: [1.65, 2.42] },
  { detector: 'D4', wavelengthRangeUm: [2.42, 3.84] },
  { detector: 'D5', wavelengthRangeUm: [3.84, 4.42] },
  { detector: 'D6', wavelengthRangeUm: [4.42, 5.0] },
];

export function detectorToCenterUm(detector: string, ranges = DEFAULT_SPHEREX_DETECTOR_RANGES): number {
  const found = ranges.find((r) => r.detector === detector);
  if (!found) return 1.38;
  return (found.wavelengthRangeUm[0] + found.wavelengthRangeUm[1]) / 2;
}

export function snapWavelengthToDetector(
  um: number,
  ranges: DetectorBandRange[] = DEFAULT_SPHEREX_DETECTOR_RANGES
): { detector: string; centerUm: number; clampedUm: number } {
  const active = ranges.length > 0 ? ranges : DEFAULT_SPHEREX_DETECTOR_RANGES;
  const clampedUm = Math.max(0.75, Math.min(5.0, um));
  let best = active[0];
  let bestDist = Infinity;
  for (const r of active) {
    const [lo, hi] = r.wavelengthRangeUm;
    if (clampedUm >= lo && clampedUm <= hi) {
      return { detector: r.detector, centerUm: (lo + hi) / 2, clampedUm };
    }
    const center = (lo + hi) / 2;
    const dist = Math.abs(clampedUm - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = r;
    }
  }
  return {
    detector: best.detector,
    centerUm: (best.wavelengthRangeUm[0] + best.wavelengthRangeUm[1]) / 2,
    clampedUm,
  };
}

export interface UseSkyGesturesOptions {
  enabled: boolean;
  totalFrames: number;
  currentFrameIdx: number;
  onScrubFrame: (frameIdx: number) => void;
  onUserInteractStart?: () => void;
  availableDetectors?: DetectorBandRange[];
  currentDetector: string;
  currentWavelengthUm: number;
  onPreviewWavelength?: (preview: { um: number; snappedDetector: string } | null) => void;
  onCommitDetector: (detector: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetView: () => void;
  onTapPoint?: (clientX: number, clientY: number) => void;
  isRtl?: boolean;
  reducedMotion?: boolean;
}

export interface UseSkyGesturesResult {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  activeGesture: 'idle' | 'time' | 'wavelength' | 'pinch';
  scrubDeltaFrames: number;
  handlers: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  };
}

export function useSkyGestures({
  enabled,
  totalFrames,
  currentFrameIdx,
  onScrubFrame,
  onUserInteractStart,
  availableDetectors,
  currentDetector,
  currentWavelengthUm,
  onPreviewWavelength,
  onCommitDetector,
  zoom,
  onZoomChange,
  onResetView,
  onTapPoint,
  isRtl = false,
  reducedMotion = false,
}: UseSkyGesturesOptions): UseSkyGesturesResult {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [activeGesture, setActiveGesture] = useState<'idle' | 'time' | 'wavelength' | 'pinch'>('idle');
  const [scrubDeltaFrames, setScrubDeltaFrames] = useState<number>(0);

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    startFrameIdx: number;
    startUm: number;
    axis: 'undecided' | 'time' | 'wavelength' | 'pinch';
    lastX: number;
    lastTime: number;
    vxPxPerMs: number;
    previewUm: number;
    snappedDetector: string;
  } | null>(null);

  const pinchRef = useRef<{ initialDist: number; initialZoom: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const inertiaRafRef = useRef<number | null>(null);

  const ranges =
    availableDetectors && availableDetectors.length > 0
      ? availableDetectors
      : DEFAULT_SPHEREX_DETECTOR_RANGES;

  const stopInertia = useCallback(() => {
    if (inertiaRafRef.current !== null) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
  }, []);

  useEffect(() => stopInertia, [stopInertia]);

  // Non-passive wheel zoom so page does not jump while zooming sky patch
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !enabled) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stopInertia();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const nextZoom = Math.max(1, Math.min(8, Number((zoom * factor).toFixed(2))));
      onZoomChange(nextZoom);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [enabled, zoom, onZoomChange, stopInertia]);

  const computePinchDist = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length < 2) return 0;
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      // Ignore clicks on overlay buttons inside viewport
      const targetEl = e.target as HTMLElement | null;
      if (targetEl && targetEl.closest('button, a, input, select, [data-gesture-ignore="true"]')) {
        return;
      }

      stopInertia();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore capture errors on synthetic test events
      }

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size === 2) {
        const pts = Array.from(pointersRef.current.values());
        pinchRef.current = {
          initialDist: Math.max(10, computePinchDist(pts)),
          initialZoom: zoom,
        };
        if (gestureStartRef.current) {
          gestureStartRef.current.axis = 'pinch';
        }
        setActiveGesture('pinch');
        return;
      }

      const startUm = Number.isFinite(currentWavelengthUm)
        ? Math.max(0.75, Math.min(5.0, currentWavelengthUm))
        : detectorToCenterUm(currentDetector || 'D1', ranges);

      gestureStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: performance.now(),
        startFrameIdx: currentFrameIdx,
        startUm,
        axis: 'undecided',
        lastX: e.clientX,
        lastTime: performance.now(),
        vxPxPerMs: 0,
        previewUm: startUm,
        snappedDetector: currentDetector || 'D1',
      };
      setScrubDeltaFrames(0);
    },
    [enabled, stopInertia, zoom, currentWavelengthUm, currentDetector, ranges, currentFrameIdx]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || !pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size === 2 && pinchRef.current) {
        const pts = Array.from(pointersRef.current.values());
        const dist = computePinchDist(pts);
        const ratio = dist / pinchRef.current.initialDist;
        const nextZoom = Math.max(1, Math.min(8, Number((pinchRef.current.initialZoom * ratio).toFixed(2))));
        onZoomChange(nextZoom);
        setActiveGesture('pinch');
        return;
      }

      const g = gestureStartRef.current;
      if (!g || g.axis === 'pinch') return;

      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      const dist = Math.hypot(dx, dy);

      if (g.axis === 'undecided') {
        if (dist < 8) return;
        onUserInteractStart?.();
        g.axis = Math.abs(dx) >= Math.abs(dy) ? 'time' : 'wavelength';
        setActiveGesture(g.axis);
      }

      const now = performance.now();
      const dt = Math.max(1, now - g.lastTime);

      if (g.axis === 'time' && totalFrames > 1) {
        const instV = (e.clientX - g.lastX) / dt;
        g.vxPxPerMs = g.vxPxPerMs * 0.55 + instV * 0.45;
        g.lastX = e.clientX;
        g.lastTime = now;

        const elWidth = viewportRef.current?.clientWidth || 340;
        const pxPerFrame = Math.max(16, Math.min(34, (elWidth * 0.72) / Math.max(2, totalFrames)));
        const dirSign = isRtl ? -1 : 1;
        const deltaFrames = Math.round((dx * dirSign) / pxPerFrame);
        setScrubDeltaFrames(deltaFrames);
        const clamped = Math.max(0, Math.min(totalFrames - 1, g.startFrameIdx + deltaFrames));
        if (clamped !== currentFrameIdx) {
          onScrubFrame(clamped);
        }
      } else if (g.axis === 'wavelength') {
        const elHeight = viewportRef.current?.clientHeight || 340;
        // Dragging UP (-dy) increases wavelength from 0.75 toward 5.0 um
        const deltaUm = (-dy / Math.max(180, elHeight * 0.7)) * (5.0 - 0.75);
        const rawUm = Math.max(0.75, Math.min(5.0, g.startUm + deltaUm));
        const snapped = snapWavelengthToDetector(rawUm, ranges);
        g.previewUm = snapped.clampedUm;
        g.snappedDetector = snapped.detector;
        onPreviewWavelength?.({ um: snapped.clampedUm, snappedDetector: snapped.detector });
      }
    },
    [
      enabled,
      onZoomChange,
      onUserInteractStart,
      totalFrames,
      isRtl,
      currentFrameIdx,
      onScrubFrame,
      ranges,
      onPreviewWavelength,
    ]
  );

  const handleRelease = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.delete(e.pointerId);

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }

      if (pointersRef.current.size < 2) {
        pinchRef.current = null;
      }

      const g = gestureStartRef.current;
      if (!g) {
        setActiveGesture('idle');
        return;
      }

      if (pointersRef.current.size === 0) {
        gestureStartRef.current = null;
        setActiveGesture('idle');
        setScrubDeltaFrames(0);

        if (cancelled) {
          onPreviewWavelength?.(null);
          return;
        }

        if (g.axis === 'wavelength') {
          const targetDet = g.snappedDetector;
          onPreviewWavelength?.(null);
          if (targetDet && targetDet !== currentDetector) {
            onCommitDetector(targetDet);
          }
          return;
        }

        if (g.axis === 'time' && totalFrames > 1 && !reducedMotion) {
          const dirSign = isRtl ? -1 : 1;
          let velocityPxPerFrame = (g.vxPxPerMs * dirSign) * 16; // px per ~60fps frame
          const elWidth = viewportRef.current?.clientWidth || 340;
          const pxPerFrame = Math.max(16, Math.min(34, (elWidth * 0.72) / Math.max(2, totalFrames)));

          if (Math.abs(velocityPxPerFrame) > 2.5) {
            let accumPx = 0;
            let floatIdx = currentFrameIdx;
            const stepInertia = () => {
              velocityPxPerFrame *= 0.89;
              accumPx += velocityPxPerFrame;
              const nextFloat = floatIdx + velocityPxPerFrame / pxPerFrame;
              floatIdx = Math.max(0, Math.min(totalFrames - 1, nextFloat));
              const rounded = Math.round(floatIdx);
              onScrubFrame(rounded);
              if (
                Math.abs(velocityPxPerFrame) > 0.65 &&
                floatIdx > 0 &&
                floatIdx < totalFrames - 1
              ) {
                inertiaRafRef.current = requestAnimationFrame(stepInertia);
              } else {
                inertiaRafRef.current = null;
              }
            };
            inertiaRafRef.current = requestAnimationFrame(stepInertia);
          }
          return;
        }

        // Stationary tap / click
        if (g.axis === 'undecided') {
          const now = performance.now();
          const prevTap = lastTapRef.current;
          if (
            prevTap &&
            now - prevTap.time < 280 &&
            Math.hypot(e.clientX - prevTap.x, e.clientY - prevTap.y) < 18
          ) {
            lastTapRef.current = null;
            onResetView();
            return;
          }
          lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
          onTapPoint?.(e.clientX, e.clientY);
        }
      }
    },
    [
      onPreviewWavelength,
      currentDetector,
      onCommitDetector,
      totalFrames,
      reducedMotion,
      isRtl,
      currentFrameIdx,
      onScrubFrame,
      onResetView,
      onTapPoint,
    ]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => handleRelease(e, false),
    [handleRelease]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => handleRelease(e, true),
    [handleRelease]
  );

  return {
    viewportRef,
    activeGesture,
    scrubDeltaFrames,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
