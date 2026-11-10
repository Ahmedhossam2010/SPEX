import React, { useCallback, useEffect, useRef, useState } from 'react';
import { OFFICIAL_CHALLENGE_TARGETS } from '../../science/challengeTargets';
import { parseCoordinateInput } from '../../science/coordinates';
import { Language, translations } from '../../utils/translations';
import { Search, MousePointerClick, Orbit } from 'lucide-react';

/**
 * TIME LENS - Step 1: Sky-sphere entry.
 *
 * A lightweight Canvas-2D rotating sky sphere with the official challenge
 * targets as pulsing stars. Clicking/tapping a target triggers a cinematic
 * zoom into that patch of sky and launches the SPHEREx lab for it. A manual
 * coordinate entry remains available (URL params keep working via App.tsx).
 *
 * Accessibility: honors prefers-reduced-motion (no auto-rotation, fast
 * crossfade instead of the zoom), keyboard-operable target list, EN/AR.
 */

interface SkySphereEntryProps {
  language: Language;
  onLaunchTarget: (targetId: string, ra: number, dec: number) => void;
  onLaunchCoords: (ra: number, dec: number) => void;
}

interface SphereStar {
  x: number;
  y: number;
  z: number;
  mag: number; // 0..1 brightness
  twinklePhase: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function raDecToVector(raDeg: number, decDeg: number): { x: number; y: number; z: number } {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  return {
    x: Math.cos(dec) * Math.sin(ra),
    y: Math.sin(dec),
    z: Math.cos(dec) * Math.cos(ra),
  };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export const SkySphereEntry: React.FC<SkySphereEntryProps> = ({
  language,
  onLaunchTarget,
  onLaunchCoords,
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef(0);
  const zoomRef = useRef<{ targetIdx: number; start: number; launched: boolean } | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [coordInput, setCoordInput] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);
  const reducedMotionRef = useRef(false);

  const backgroundStars = useMemo<SphereStar[]>(() => {
    const rand = mulberry32(20251109);
    const stars: SphereStar[] = [];
    for (let i = 0; i < 420; i++) {
      // Uniform-ish sphere distribution
      const u = rand() * 2 - 1;
      const phi = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      stars.push({
        x: s * Math.cos(phi),
        y: u,
        z: s * Math.sin(phi),
        mag: 0.25 + rand() * 0.75,
        twinklePhase: rand() * Math.PI * 2,
      });
    }
    return stars;
  }, []);

  const targetVectors = useMemo(
    () => OFFICIAL_CHALLENGE_TARGETS.map((tgt) => raDecToVector(tgt.ra, tgt.dec)),
    []
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let disposed = false;

    const rotate = (v: { x: number; y: number; z: number }, angle: number, tilt: number) => {
      // Rotate around Y (sky rotation), then tilt around X (viewing latitude)
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const x1 = v.x * cosA - v.z * sinA;
      const z1 = v.x * sinA + v.z * cosA;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      const y2 = v.y * cosT - z1 * sinT;
      const z2 = v.y * sinT + z1 * cosT;
      return { x: x1, y: y2, z: z2 };
    };

    const draw = (now: number) => {
      if (disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const cx = cssW / 2;
      const cy = cssH / 2;
      const R = Math.min(cssW, cssH) * 0.42;

      // Zoom animation state
      const zoomState = zoomRef.current;
      let zoom = 1;
      let zoomFocus: { x: number; y: number } | null = null;
      if (zoomState) {
        const dur = reducedMotionRef.current ? 260 : 950;
        const tt = Math.min(1, (now - zoomState.start) / dur);
        zoom = 1 + 5.5 * easeInOut(tt);
        if (tt >= 1 && !zoomState.launched) {
          zoomState.launched = true;
          const tgt = OFFICIAL_CHALLENGE_TARGETS[zoomState.targetIdx];
          if (tgt) onLaunchTarget(tgt.id, tgt.ra, tgt.dec);
        }
      }

      const angle = rotationRef.current;
      const tilt = 0.55;
      ctx.save();
      if (zoomState && zoom > 1.001) {
        const tv = rotate(targetVectors[zoomState.targetIdx], angle, tilt);
        if (tv.z > 0) {
          zoomFocus = { x: cx + tv.x * R, y: cy - tv.y * R };
          ctx.translate(zoomFocus.x, zoomFocus.y);
          ctx.scale(zoom, zoom);
          ctx.translate(-zoomFocus.x, -zoomFocus.y);
        }
      }

      // Sphere limb glow
      const grad = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.05);
      grad.addColorStop(0, 'rgba(56,189,248,0.10)');
      grad.addColorStop(0.85, 'rgba(56,189,248,0.04)');
      grad.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2);
      ctx.fill();

      // Background stars
      const timeSec = now / 1000;
      for (const s of backgroundStars) {
        const r = rotate(s, angle, tilt);
        if (r.z <= 0.05) continue;
        const sx = cx + r.x * R;
        const sy = cy - r.y * R;
        const twinkle = reducedMotionRef.current ? 1 : 0.75 + 0.25 * Math.sin(timeSec * 1.7 + s.twinklePhase);
        const alpha = Math.min(1, s.mag * twinkle * (0.35 + 0.65 * r.z));
        ctx.fillStyle = `rgba(226,232,240,${alpha.toFixed(3)})`;
        const size = 0.6 + s.mag * 1.3;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Challenge targets
      OFFICIAL_CHALLENGE_TARGETS.forEach((tgt, idx) => {
        const r = rotate(targetVectors[idx], angle, tilt);
        if (r.z <= 0.03) return;
        const sx = cx + r.x * R;
        const sy = cy - r.y * R;
        const pulse = reducedMotionRef.current ? 1 : 0.8 + 0.2 * Math.sin(timeSec * 2.2 + idx * 1.3);
        const isRef = tgt.role === 'reference_star';
        const unverified = tgt.coordinateVerification === 'UNVERIFIED';
        const baseColor = isRef ? '103,232,249' : '251,191,36';
        const radius = (isRef ? 3.4 : 5.2) * pulse;

        // Glow
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * 4.2);
        glow.addColorStop(0, `rgba(${baseColor},${(0.5 * pulse).toFixed(3)})`);
        glow.addColorStop(1, `rgba(${baseColor},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, radius * 4.2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgb(${baseColor})`;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();

        if (unverified) {
          // Honesty cue: dashed ring + question mark for unverified coordinates
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = 'rgba(248,113,113,0.9)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(sx, sy, radius + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(248,113,113,0.95)';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('?', sx + radius + 7, sy - radius - 2);
        }

        if (isRef) {
          ctx.strokeStyle = 'rgba(103,232,249,0.55)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, sy, radius + 3.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label (short name)
        const shortName = tgt.name.replace(/ \(.*\)$/, '');
        ctx.font = `${hoverIdx === idx || (zoomState && zoomState.targetIdx === idx) ? 'bold ' : ''}10px sans-serif`;
        ctx.fillStyle = 'rgba(241,245,249,0.92)';
        ctx.textAlign = 'center';
        ctx.fillText(shortName, sx, sy + radius + 13);
      });

      ctx.restore();

      if (!reducedMotionRef.current && !zoomState) {
        rotationRef.current += 0.0011 * 16.7; // slow drift (~full turn in ~95 s)
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [backgroundStars, targetVectors, hoverIdx, onLaunchTarget]);

  const hitTest = useCallback(
    (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const R = Math.min(rect.width, rect.height) * 0.42;
      const angle = rotationRef.current;
      const tilt = 0.55;
      let best: { idx: number; d: number } | null = null;
      targetVectors.forEach((v, idx) => {
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const x1 = v.x * cosA - v.z * sinA;
        const z1 = v.x * sinA + v.z * cosA;
        const cosT = Math.cos(tilt);
        const sinT = Math.sin(tilt);
        const y2 = v.y * cosT - z1 * sinT;
        const z2 = v.y * sinT + z1 * cosT;
        if (z2 <= 0.03) return;
        const sx = cx + x1 * R;
        const sy = cy - y2 * R;
        const d = Math.hypot(clientX - rect.left - sx, clientY - rect.top - sy);
        if (d < 30 && (!best || d < best.d)) best = { idx, d };
      });
      return best ? (best as { idx: number }).idx : null;
    },
    [targetVectors]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (zoomRef.current) return;
    const idx = hitTest(e.clientX, e.clientY);
    if (idx != null) {
      zoomRef.current = { targetIdx: idx, start: performance.now(), launched: false };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const idx = hitTest(e.clientX, e.clientY);
    setHoverIdx(idx);
  };

  const submitCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCoordinateInput(coordInput);
    if (!parsed) {
      setCoordError(
        isRtl
          ? 'لم نتمكن من قراءة الإحداثيات. جرّب صيغة مثل 17h57m48.5s +04d41m36.1s أو 269.452, 4.693'
          : 'Could not read the coordinates. Try 17h57m48.5s +04d41m36.1s or 269.452, 4.693'
      );
      return;
    }
    setCoordError(null);
    onLaunchCoords(parsed.ra, parsed.dec);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 mb-1 text-cyan-300">
        <Orbit className="w-5 h-5" />
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100">{t.skyEntryTitle}</h2>
      </div>
      <p className="text-xs sm:text-sm text-slate-400 mb-3">{t.skyEntrySubtitle}</p>

      <div className="relative rounded-3xl border border-cyan-500/20 bg-[#050914] overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.08)]">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIdx(null)}
          className="w-full h-[300px] sm:h-[420px] block touch-none cursor-pointer"
          aria-label={t.skyEntryTitle}
        />
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-950/70 rounded-full px-2.5 py-1 border border-slate-800">
            <MousePointerClick className="w-3 h-3" />
            {isRtl ? 'انقر على نجم وامض للتحليق إليه' : 'Tap a pulsing star to zoom in'}
          </span>
        </div>
      </div>

      {/* Keyboard-accessible target list (same launch behavior as the sphere) */}
      <div className="flex flex-wrap gap-2 mt-3">
        {OFFICIAL_CHALLENGE_TARGETS.map((tgt) => (
          <button
            key={tgt.id}
            type="button"
            onClick={() => onLaunchTarget(tgt.id, tgt.ra, tgt.dec)}
            title={tgt.sexagesimal || undefined}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
              tgt.role === 'reference_star'
                ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/10'
                : 'border-amber-500/30 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            {tgt.name}
            {tgt.coordinateVerification === 'UNVERIFIED' && (
              <span className="ms-1 text-rose-400" title={t.skyEntryUnverifiedTag}>?</span>
            )}
          </button>
        ))}
      </div>

      {/* Manual coordinate entry */}
      <form onSubmit={submitCoords} className="mt-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={coordInput}
            onChange={(e) => {
              setCoordInput(e.target.value);
              setCoordError(null);
            }}
            placeholder={t.skyEntryCoordPlaceholder}
            className="w-full bg-slate-950/80 border border-slate-700 focus:border-cyan-500 rounded-xl py-2.5 ps-9 pe-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition"
            aria-label={t.skyEntryCoordPlaceholder}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-[0_0_14px_rgba(6,182,212,0.35)] cursor-pointer"
        >
          {t.skyEntryGo}
        </button>
      </form>
      {coordError && <p className="mt-2 text-[11px] text-rose-400">{coordError}</p>}
    </div>
  );
};

export default SkySphereEntry;
