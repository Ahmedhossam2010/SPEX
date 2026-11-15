import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OFFICIAL_CHALLENGE_TARGETS } from '../science/challengeTargets';
import { ChallengeTarget } from '../science/types';
import { parseCoordinateInput } from '../science/coordinates';
import { Language, translations } from '../utils/translations';
import { getCanvasDpr, drawPsfStar } from '../utils/smoothCanvas';
import { AladinLitePanel } from './Explore/AladinLitePanel';
import { Search, ChevronDown, ChevronUp, Sparkles, Compass, Globe, X } from 'lucide-react';

interface Screen1SkyProps {
  language: Language;
  onSelectTarget: (target: ChallengeTarget) => void;
  onSelectCoords: (ra: number, dec: number) => void;
}

interface SphereStar {
  x: number;
  y: number;
  z: number;
  mag: number;
  twinklePhase: number;
  warm: boolean;
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

function inverseProjectScreenToRaDec(
  nx: number,
  ny: number,
  angleY: number,
  tiltX: number
): { ra: number; dec: number } | null {
  const r2 = nx * nx + ny * ny;
  if (r2 > 0.995) return null;
  const z2 = Math.sqrt(Math.max(0, 1 - r2));
  const x2 = nx;
  const y2 = ny;

  // Undo tiltX
  const cosX = Math.cos(tiltX);
  const sinX = Math.sin(tiltX);
  const vy = y2 * cosX + z2 * sinX;
  const z1 = -y2 * sinX + z2 * cosX;
  const x1 = x2;

  // Undo angleY
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const vx = x1 * cosY + z1 * sinY;
  const vz = -x1 * sinY + z1 * cosY;

  const decRad = Math.asin(Math.max(-1, Math.min(1, vy)));
  const raRad = Math.atan2(vx, vz);
  const ra = ((raRad * 180) / Math.PI + 360) % 360;
  const dec = (decRad * 180) / Math.PI;
  return { ra, dec };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const FIVE_OFFICIAL_TARGET_IDS = [
  'target-barnards-star',
  'target-epsilon-indi-bab',
  'target-wise-0855',
  'target-rw-aurigae',
  'target-r-draconis',
];

// Minimal sky constellation guide polygons connecting bright sphere nodes
const CONSTELLATION_ARCS: Array<Array<{ ra: number; dec: number }>> = [
  // Orion belt & shoulders
  [
    { ra: 88.79, dec: 7.4 },
    { ra: 84.05, dec: -1.2 },
    { ra: 83.0, dec: -0.3 },
    { ra: 81.28, dec: -0.3 },
    { ra: 78.63, dec: -8.2 },
  ],
  // Big Dipper
  [
    { ra: 206.88, dec: 49.3 },
    { ra: 200.98, dec: 54.9 },
    { ra: 193.5, dec: 55.9 },
    { ra: 183.85, dec: 57.0 },
    { ra: 178.45, dec: 53.7 },
    { ra: 165.46, dec: 56.4 },
    { ra: 165.93, dec: 61.75 },
    { ra: 183.85, dec: 57.0 },
  ],
  // Cassiopeia W
  [
    { ra: 2.29, dec: 59.1 },
    { ra: 10.12, dec: 56.5 },
    { ra: 14.17, dec: 60.7 },
    { ra: 21.45, dec: 60.2 },
    { ra: 28.59, dec: 63.6 },
  ],
  // Cygnus cross
  [
    { ra: 310.35, dec: 45.28 },
    { ra: 305.55, dec: 40.25 },
    { ra: 292.68, dec: 27.95 },
  ],
];

export const Screen1Sky: React.FC<Screen1SkyProps> = ({
  language,
  onSelectTarget,
  onSelectCoords,
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rotationRef = useRef(4.7);
  const tiltRef = useRef(0.38);
  const isDraggingRef = useRef(false);
  const downPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<{ target: ChallengeTarget; start: number; launched: boolean } | null>(null);

  const hoveredTargetRef = useRef<ChallengeTarget | null>(null);
  const activeTargetRef = useRef<ChallengeTarget | null>(null);

  const [hoveredTarget, setHoveredTargetState] = useState<ChallengeTarget | null>(null);
  const setHoveredTarget = (tgt: ChallengeTarget | null) => {
    hoveredTargetRef.current = tgt;
    setHoveredTargetState(tgt);
  };

  const [activeTarget, setActiveTargetState] = useState<ChallengeTarget | null>(null);
  const setActiveTarget = (tgt: ChallengeTarget | null) => {
    activeTargetRef.current = tgt;
    setActiveTargetState(tgt);
  };

  const [targetScreenPos, setTargetScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [showCoordsForm, setShowCoordsForm] = useState(false);
  const [showAladinView, setShowAladinView] = useState(false);
  const [coordInput, setCoordInput] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);

  const reducedMotionRef = useRef(false);

  const targets = useMemo<ChallengeTarget[]>(() => {
    return FIVE_OFFICIAL_TARGET_IDS.map(
      (id) => OFFICIAL_CHALLENGE_TARGETS.find((tgt) => tgt.id === id)!
    ).filter(Boolean);
  }, []);

  const targetVectors = useMemo(
    () => targets.map((tgt) => raDecToVector(tgt.ra, tgt.dec)),
    [targets]
  );

  const constellationVectors = useMemo(
    () => CONSTELLATION_ARCS.map((arc) => arc.map((pt) => raDecToVector(pt.ra, pt.dec))),
    []
  );

  const getTargetRealName = (tgt: ChallengeTarget): string => {
    switch (tgt.id) {
      case 'target-barnards-star':
        return isRtl ? 'نجم بارنارد (GJ 699)' : "Barnard's Star (GJ 699)";
      case 'target-epsilon-indi-bab':
        return isRtl ? 'إبسيلون الهندي Ba/Bb' : 'Epsilon Indi Ba/Bb';
      case 'target-wise-0855':
        return 'WISE 0855-0714';
      case 'target-rw-aurigae':
        return isRtl ? 'آر دبليو ممسك الأعنة (RW Aur)' : 'RW Aurigae';
      case 'target-r-draconis':
        return isRtl ? 'آر التنين (R Dra)' : 'R Draconis';
      default:
        return tgt.name.replace(/ \(.*\)$/, '');
    }
  };

  const getTargetSummary = (tgt: ChallengeTarget): string => {
    switch (tgt.id) {
      case 'target-barnards-star':
        return isRtl ? 'نجم قزم أحمر سريع الحركة يندفع عبر الفضاء.' : 'A fast-moving red dwarf racing across the sky.';
      case 'target-epsilon-indi-bab':
        return isRtl ? 'زوج من الأقزام البنية الباردة.' : 'Twin frigid brown dwarfs in motion.';
      case 'target-wise-0855':
        return isRtl ? 'أبرد قزم بني معروف قرب الشمس.' : 'The coldest known brown dwarf near our Sun.';
      case 'target-rw-aurigae':
        return isRtl ? 'نجم شاب تحيط به أقراص غبارية متغيرة.' : 'A young star with shifting dusty accretion.';
      case 'target-r-draconis':
        return isRtl ? 'عملاق أحمر ينبض ويتنفس عبر الشهور.' : 'A giant red star pulsating over months.';
      default:
        return tgt.scienceType;
    }
  };

  const backgroundStars = useMemo<SphereStar[]>(() => {
    const rand = mulberry32(420779);
    const stars: SphereStar[] = [];
    for (let i = 0; i < 460; i++) {
      const u = rand() * 2 - 1;
      const phi = rand() * Math.PI * 2;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      stars.push({
        x: s * Math.cos(phi),
        y: u,
        z: s * Math.sin(phi),
        mag: 0.2 + rand() * 0.8,
        twinklePhase: rand() * Math.PI * 2,
        warm: rand() > 0.72,
      });
    }
    return stars;
  }, []);

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

    const rotatePoint = (
      v: { x: number; y: number; z: number },
      angleY: number,
      tiltX: number
    ) => {
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const x1 = v.x * cosY - v.z * sinY;
      const z1 = v.x * sinY + v.z * cosY;

      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);
      const y2 = v.y * cosX - z1 * sinX;
      const z2 = v.y * sinX + z1 * cosX;
      return { x: x1, y: y2, z: z2 };
    };

    const draw = (now: number) => {
      if (disposed) return;

      const dpr = getCanvasDpr();
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;

      if (cssW > 0 && cssH > 0) {
        const targetW = Math.round(cssW * dpr);
        const targetH = Math.round(cssH * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, cssW, cssH);

      const cx = cssW / 2;
      const cy = cssH / 2;
      const baseR = Math.min(cssW, cssH) * (cssW < 640 ? 0.38 : 0.41);

      const zoomState = zoomRef.current;
      let zoomScale = 1;
      let zoomOrigin = { x: cx, y: cy };

      if (zoomState) {
        const duration = reducedMotionRef.current ? 320 : 850;
        const progress = Math.min(1, (now - zoomState.start) / duration);
        zoomScale = 1 + 6.5 * easeInOutCubic(progress);

        const tgtIdx = targets.findIndex((tItem) => tItem.id === zoomState.target.id);
        if (tgtIdx >= 0) {
          const projected = rotatePoint(targetVectors[tgtIdx], rotationRef.current, tiltRef.current);
          zoomOrigin = {
            x: cx + projected.x * baseR,
            y: cy - projected.y * baseR,
          };
        }

        if (progress >= 1 && !zoomState.launched) {
          zoomState.launched = true;
          onSelectTarget(zoomState.target);
        }
      }

      ctx.save();
      if (zoomScale > 1.001) {
        ctx.translate(zoomOrigin.x, zoomOrigin.y);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(-zoomOrigin.x, -zoomOrigin.y);
      }

      // Sphere atmospheric glow
      const glowGrad = ctx.createRadialGradient(cx, cy, baseR * 0.15, cx, cy, baseR * 1.15);
      glowGrad.addColorStop(0, 'rgba(0, 211, 243, 0.09)');
      glowGrad.addColorStop(0.7, 'rgba(255, 185, 0, 0.045)');
      glowGrad.addColorStop(0.95, 'rgba(0, 211, 243, 0.025)');
      glowGrad.addColorStop(1, 'rgba(2, 4, 10, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // Sphere rim & subtle RA/Dec guide rings
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
      ctx.stroke();

      const timeSec = now / 1000;
      const angleY = rotationRef.current;
      const tiltX = tiltRef.current;

      // Equator & meridian guides
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const ra = (i / 48) * 360;
        const p = rotatePoint(raDecToVector(ra, 0), angleY, tiltX);
        if (p.z > 0) {
          const sx = cx + p.x * baseR;
          const sy = cy - p.y * baseR;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        } else {
          ctx.stroke();
          ctx.beginPath();
        }
      }
      ctx.stroke();

      // Subtle constellation lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 1;
      for (const arc of constellationVectors) {
        ctx.beginPath();
        let started = false;
        for (const v of arc) {
          const p = rotatePoint(v, angleY, tiltX);
          if (p.z <= 0.02) {
            started = false;
            continue;
          }
          const sx = cx + p.x * baseR;
          const sy = cy - p.y * baseR;
          if (!started) {
            ctx.moveTo(sx, sy);
            started = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.stroke();
      }

      // Smooth PSF background stars
      for (const s of backgroundStars) {
        const r = rotatePoint(s, angleY, tiltX);
        if (r.z <= 0.02) continue;
        const sx = cx + r.x * baseR;
        const sy = cy - r.y * baseR;
        const twinkle = reducedMotionRef.current
          ? 1
          : 0.72 + 0.28 * Math.sin(timeSec * 2.0 + s.twinklePhase);
        const alpha = Math.min(1, s.mag * twinkle * Math.max(0.15, r.z));
        drawPsfStar(ctx, sx, sy, 0.8 + s.mag * 1.15, s.warm ? '253, 224, 155' : '226, 232, 240', alpha);
      }

      // 5 official target pins
      let activePos: { x: number; y: number } | null = null;

      targets.forEach((tgt, idx) => {
        const r = rotatePoint(targetVectors[idx], angleY, tiltX);
        if (r.z <= 0.02) return;

        const sx = cx + r.x * baseR;
        const sy = cy - r.y * baseR;
        const isHovered = hoveredTargetRef.current?.id === tgt.id;
        const isZooming = zoomState?.target.id === tgt.id;
        const isCurrentActive = activeTargetRef.current?.id === tgt.id || isHovered;
        if (isCurrentActive) activePos = { x: sx, y: sy };

        const pulse = reducedMotionRef.current
          ? 1
          : 0.88 + 0.2 * Math.sin(timeSec * 3.0 + idx * 1.4);
        const coreRadius = (isHovered || isZooming ? 7.5 : 5.8) * pulse;
        const auraRadius = (isHovered || isZooming ? 34 : 22) * pulse;

        const bloom = ctx.createRadialGradient(sx, sy, 0, sx, sy, auraRadius);
        bloom.addColorStop(0, `rgba(255, 185, 0, ${(0.62 * pulse).toFixed(3)})`);
        bloom.addColorStop(0.45, `rgba(0, 211, 243, ${(0.25 * pulse).toFixed(3)})`);
        bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(sx, sy, auraRadius, 0, Math.PI * 2);
        ctx.fill();

        if (isHovered || isZooming) {
          ctx.strokeStyle = 'rgba(0, 211, 243, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, coreRadius + 9, 0, Math.PI * 2);
          ctx.stroke();
        }

        const coreGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreRadius);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.4, '#FFE680');
        coreGrad.addColorStop(1, '#FFB900');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // Always render a subtle pin label so users see all visible targets clearly
        const realName = getTargetRealName(tgt);
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        const labelY = sy + coreRadius + 16;
        const textWidth = ctx.measureText(realName).width;
        ctx.fillStyle = 'rgba(2, 4, 10, 0.85)';
        ctx.fillRect(sx - textWidth / 2 - 6, labelY - 11, textWidth + 12, 17);
        ctx.strokeStyle = isHovered ? 'rgba(0, 211, 243, 0.75)' : 'rgba(255, 185, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - textWidth / 2 - 6, labelY - 11, textWidth + 12, 17);
        ctx.fillStyle = isHovered ? '#38BDF8' : '#FFB900';
        ctx.fillText(realName, sx, labelY + 1);
      });

      ctx.restore();

      setTargetScreenPos(activePos);

      if (!reducedMotionRef.current && !zoomState && !isDraggingRef.current) {
        rotationRef.current += 0.0007 * 16.7;
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [backgroundStars, constellationVectors, targets, targetVectors, isRtl, onSelectTarget]);

  const hitTest = useCallback(
    (clientX: number, clientY: number): ChallengeTarget | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const baseR = Math.min(rect.width, rect.height) * (rect.width < 640 ? 0.38 : 0.41);

      const cosY = Math.cos(rotationRef.current);
      const sinY = Math.sin(rotationRef.current);
      const cosX = Math.cos(tiltRef.current);
      const sinX = Math.sin(tiltRef.current);

      let best: { tgt: ChallengeTarget; dist: number } | null = null;
      const hitRadius = 48;

      targets.forEach((tgt, idx) => {
        const v = targetVectors[idx];
        const x1 = v.x * cosY - v.z * sinY;
        const z1 = v.x * sinY + v.z * cosY;
        const y2 = v.y * cosX - z1 * sinX;
        const z2 = v.y * sinX + z1 * cosX;
        if (z2 <= 0.02) return;

        const sx = cx + x1 * baseR;
        const sy = cy - y2 * baseR;
        const dist = Math.hypot(clientX - rect.left - sx, clientY - rect.top - sy);
        if (dist <= hitRadius && (!best || dist < best.dist)) {
          best = { tgt, dist };
        }
      });

      return best ? (best as { tgt: ChallengeTarget }).tgt : null;
    },
    [targets, targetVectors]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (zoomRef.current) return;
    isDraggingRef.current = true;
    downPosRef.current = { x: e.clientX, y: e.clientY };
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      setActiveTarget(hit);
      zoomRef.current = {
        target: hit,
        start: performance.now(),
        launched: false,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (zoomRef.current) return;
    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      rotationRef.current += dx * 0.005;
      tiltRef.current = Math.max(-0.9, Math.min(0.9, tiltRef.current - dy * 0.005));
    } else {
      const hit = hitTest(e.clientX, e.clientY);
      setHoveredTarget(hit);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;
    if (!wasDragging || zoomRef.current) return;

    const moved = Math.hypot(
      e.clientX - downPosRef.current.x,
      e.clientY - downPosRef.current.y
    );
    if (moved < 6) {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) {
        onSelectTarget(hit);
        return;
      }
      // Click anywhere on the empty celestial sphere -> open that (RA, Dec)
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const baseR = Math.min(rect.width, rect.height) * (rect.width < 640 ? 0.38 : 0.41);
      const nx = (e.clientX - rect.left - cx) / baseR;
      const ny = (cy - (e.clientY - rect.top)) / baseR;
      const coords = inverseProjectScreenToRaDec(nx, ny, rotationRef.current, tiltRef.current);
      if (coords) {
        onSelectCoords(coords.ra, coords.dec);
      }
    }
  };

  const handleCoordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCoordinateInput(coordInput);
    if (!parsed) {
      setCoordError(t.coordSearchError);
      return;
    }
    setCoordError(null);
    onSelectCoords(parsed.ra, parsed.dec);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-4rem)] min-h-[580px] bg-[#02040A] text-slate-100 flex flex-col items-center justify-between overflow-hidden select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/40 via-[#02040A] to-[#02040A]" />

      {/* Top Title & Optional Aladin Toggle */}
      <div className="relative z-10 w-full pt-5 sm:pt-7 px-4 text-center space-y-2">
        <h1
          data-testid="sky-map-title"
          className={`text-2xl sm:text-4xl font-bold text-slate-50 tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] ${
            isRtl ? 'font-cairo' : 'font-display'
          }`}
        >
          {t.skyPickStarTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          {t.skyTapAnywhereHint}
        </p>

        {/* Quick 5 Target Chips + Aladin Survey Overlay Toggle */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          {targets.map((tgt) => (
            <button
              key={tgt.id}
              type="button"
              onClick={() => onSelectTarget(tgt)}
              className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-amber-400 hover:text-slate-950 border border-white/15 text-xs font-semibold text-amber-200 transition cursor-pointer"
            >
              {getTargetRealName(tgt)}
            </button>
          ))}
          <button
            type="button"
            data-testid="sky-aladin-toggle"
            onClick={() => setShowAladinView((v) => !v)}
            aria-pressed={showAladinView}
            className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showAladinView
                ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                : 'bg-white/[0.05] border-white/15 text-slate-300 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.skyToggleAladin}</span>
          </button>
        </div>
      </div>

      {/* Center Interactive Celestial Sphere */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center my-auto min-h-0">
        <canvas
          ref={canvasRef}
          data-testid="sky-sphere-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            isDraggingRef.current = false;
            setHoveredTarget(null);
          }}
          className="w-full h-full max-h-[68vh] touch-none cursor-pointer"
          aria-label={t.skyPickStarTitle}
          role="img"
        />

        {hoveredTarget && targetScreenPos && !zoomRef.current && (
          <div
            className="absolute pointer-events-none z-20 px-3.5 py-2 rounded-2xl bg-[#0C0E14]/92 backdrop-blur-xl border border-[#FFB900]/35 shadow-2xl text-center"
            style={{
              left: `${targetScreenPos.x}px`,
              top: `${Math.max(20, targetScreenPos.y - 68)}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#FFB900]">
              <Sparkles className="w-3.5 h-3.5 text-[#00D3F3]" />
              <span>{getTargetRealName(hoveredTarget)}</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 max-w-[220px] leading-tight">
              {getTargetSummary(hoveredTarget)}
            </p>
          </div>
        )}

        {/* Optional Floating Aladin Survey Preview */}
        {showAladinView && (
          <div className="absolute end-4 top-4 z-30 w-72 sm:w-80 rounded-2xl border border-white/20 bg-[#070B16]/95 backdrop-blur-xl p-2.5 shadow-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-sky-300">{t.skyToggleAladin}</span>
              <button
                type="button"
                onClick={() => setShowAladinView(false)}
                aria-label="Close Aladin"
                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <AladinLitePanel
              ra={targets[0]?.ra ?? 269.45}
              dec={targets[0]?.dec ?? 4.69}
              fovArcmin={180}
              targetName="All-Sky Survey"
            />
          </div>
        )}
      </div>

      {/* Bottom Coordinates Form */}
      <div className="relative z-10 pb-5 px-4 flex flex-col items-center">
        {!showCoordsForm ? (
          <button
            type="button"
            data-testid="sky-enter-coords-btn"
            onClick={() => setShowCoordsForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer group"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="underline decoration-slate-600 underline-offset-4 group-hover:decoration-amber-400">
              {t.screen1EnterCoords}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <div className="w-full max-w-md p-3 rounded-2xl bg-[#0C0E14]/92 backdrop-blur-xl border border-white/15 shadow-2xl">
            <form onSubmit={handleCoordSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={coordInput}
                  onChange={(e) => {
                    setCoordInput(e.target.value);
                    setCoordError(null);
                  }}
                  placeholder={t.skyEntryCoordPlaceholder}
                  autoFocus
                  className="w-full min-h-[44px] bg-slate-950/80 border border-slate-700/80 focus:border-[#FFB900] rounded-xl py-2 ps-9 pe-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition"
                  aria-label={t.screen1EnterCoords}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 min-h-[44px] min-w-[56px] rounded-xl bg-[#FFB900] hover:bg-[#FB9600] text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                {isRtl ? 'بحث' : 'Go'}
              </button>
              <button
                type="button"
                onClick={() => setShowCoordsForm(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 cursor-pointer"
                title={t.screen1EnterCoordsCollapse}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </form>
            {coordError && (
              <p className="mt-1.5 text-[11px] text-rose-400 text-center font-mono">
                {coordError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Screen1Sky;
