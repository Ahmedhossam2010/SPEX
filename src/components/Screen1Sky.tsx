import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OFFICIAL_CHALLENGE_TARGETS } from '../science/challengeTargets';
import { ChallengeTarget } from '../science/types';
import { parseCoordinateInput } from '../science/coordinates';
import { Language, translations } from '../utils/translations';
import { Search, ChevronDown, ChevronUp, Sparkles, Compass } from 'lucide-react';

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

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Exactly the 5 official challenge targets
const FIVE_OFFICIAL_TARGET_IDS = [
  'target-barnards-star',
  'target-epsilon-indi-bab',
  'target-wise-0855',
  'target-rw-aurigae',
  'target-r-draconis',
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

  // Sphere orientation and animation (starts with Barnard's star facing front)
  const rotationRef = useRef(4.7);
  const tiltRef = useRef(0.38);
  const isDraggingRef = useRef(false);
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

  // Collapsed manual coordinates toggle
  const [showCoordsForm, setShowCoordsForm] = useState(false);
  const [coordInput, setCoordInput] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);

  const reducedMotionRef = useRef(false);

  // The 5 official targets in order
  const targets = useMemo<ChallengeTarget[]>(() => {
    return FIVE_OFFICIAL_TARGET_IDS.map(
      (id) => OFFICIAL_CHALLENGE_TARGETS.find((tgt) => tgt.id === id)!
    ).filter(Boolean);
  }, []);

  const targetVectors = useMemo(
    () => targets.map((tgt) => raDecToVector(tgt.ra, tgt.dec)),
    [targets]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('hover') === '1' && targets.length > 0) {
        setHoveredTarget(targets[0]);
      }
    }
  }, [targets]);

  // Real astronomical names for the 5 official targets
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
        return isRtl ? 'نجم قزم أحمر سريع الحركة يندفع عبر الفضاء.' : 'A tiny star that races across the sky.';
      case 'target-epsilon-indi-bab':
        return isRtl ? 'زوج من الأقزام البنية الباردة المتجمدة.' : 'Twin frigid worlds lost in the darkness.';
      case 'target-wise-0855':
        return isRtl ? 'أبرد جرم شبه نجمي مكتشف خارج المجموعة الشمسية.' : 'The coldest known world outside our solar system.';
      case 'target-rw-aurigae':
        return isRtl ? 'نجم فتي تحيط به أقراص غبارية متغيرة.' : 'A violent newborn star shedding dust clouds.';
      case 'target-r-draconis':
        return isRtl ? 'نجم عملاق أحمر ينبض ويتنفس عبر الشهور.' : 'A giant red star breathing in and out over months.';
      default:
        return tgt.scienceType;
    }
  };

  // Generate realistic, consistent background starfield
  const backgroundStars = useMemo<SphereStar[]>(() => {
    const rand = mulberry32(420779);
    const stars: SphereStar[] = [];
    for (let i = 0; i < 480; i++) {
      const u = rand() * 2 - 1;
      const phi = rand() * Math.PI * 2;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      stars.push({
        x: s * Math.cos(phi),
        y: u,
        z: s * Math.sin(phi),
        mag: 0.15 + rand() * 0.85,
        twinklePhase: rand() * Math.PI * 2,
      });
    }
    return stars;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  // Main Canvas 3D Celestial Render Loop
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
      // Rotate around Y-axis (celestial RA spin)
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const x1 = v.x * cosY - v.z * sinY;
      const z1 = v.x * sinY + v.z * cosY;

      // Rotate around X-axis (celestial tilt)
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);
      const y2 = v.y * cosX - z1 * sinX;
      const z2 = v.y * sinX + z1 * cosX;
      return { x: x1, y: y2, z: z2 };
    };

    const draw = (now: number) => {
      if (disposed) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;

      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const cx = cssW / 2;
      const cy = cssH / 2;
      const baseR = Math.min(cssW, cssH) * (cssW < 640 ? 0.38 : 0.40);

      // Handle 1-Second Cinematic Zoom
      const zoomState = zoomRef.current;
      let zoomScale = 1;
      let zoomOrigin = { x: cx, y: cy };

      if (zoomState) {
        const duration = reducedMotionRef.current ? 350 : 1000;
        const progress = Math.min(1, (now - zoomState.start) / duration);
        zoomScale = 1 + 6.5 * easeInOutCubic(progress);

        // Find current target projection
        const tgtIdx = targets.findIndex((t) => t.id === zoomState.target.id);
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

      // Apply cinematic zoom transformation around target center
      if (zoomScale > 1.001) {
        ctx.translate(zoomOrigin.x, zoomOrigin.y);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(-zoomOrigin.x, -zoomOrigin.y);
      }

      // 1. Celestial Sphere Atmospheric Glow
      const glowGrad = ctx.createRadialGradient(cx, cy, baseR * 0.15, cx, cy, baseR * 1.15);
      glowGrad.addColorStop(0, 'rgba(0, 211, 243, 0.08)');
      glowGrad.addColorStop(0.7, 'rgba(255, 185, 0, 0.04)');
      glowGrad.addColorStop(0.95, 'rgba(0, 211, 243, 0.02)');
      glowGrad.addColorStop(1, 'rgba(2, 4, 10, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // 2. Subtle Equator and Meridian Guide Rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
      ctx.stroke();

      const timeSec = now / 1000;
      const angleY = rotationRef.current;
      const tiltX = tiltRef.current;

      // 3. Background Stars
      for (const s of backgroundStars) {
        const r = rotatePoint(s, angleY, tiltX);
        if (r.z <= 0.02) continue; // Behind sphere horizon

        const sx = cx + r.x * baseR;
        const sy = cy - r.y * baseR;
        const twinkle = reducedMotionRef.current
          ? 1
          : 0.72 + 0.28 * Math.sin(timeSec * 2.1 + s.twinklePhase);
        const depthAlpha = Math.max(0.1, r.z);
        const alpha = Math.min(1, s.mag * twinkle * depthAlpha);

        ctx.fillStyle = `rgba(226, 232, 240, ${alpha.toFixed(3)})`;
        const radius = 0.65 + s.mag * 1.1;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. The 5 Official Challenge Targets
      let activePos: { x: number; y: number } | null = null;

      targets.forEach((tgt, idx) => {
        const r = rotatePoint(targetVectors[idx], angleY, tiltX);
        if (r.z <= 0.02) return; // Behind horizon

        const sx = cx + r.x * baseR;
        const sy = cy - r.y * baseR;

        const isHovered = hoveredTargetRef.current?.id === tgt.id || hoveredTarget?.id === tgt.id;
        const isZooming = zoomState?.target.id === tgt.id;
        const isCurrentActive = activeTargetRef.current?.id === tgt.id || activeTarget?.id === tgt.id || isHovered;

        if (isCurrentActive) {
          activePos = { x: sx, y: sy };
        }

        const pulse = reducedMotionRef.current
          ? 1
          : 0.85 + 0.25 * Math.sin(timeSec * 3.2 + idx * 1.4);

        const baseColor = '255, 185, 0'; // Amber #FFB900
        const accentCyan = '0, 211, 243'; // Cyan #00D3F3
        const coreRadius = (isHovered || isZooming ? 7.5 : 5.8) * pulse;

        // Outer Coronal Bloom
        const auraRadius = (isHovered || isZooming ? 36 : 24) * pulse;
        const bloom = ctx.createRadialGradient(sx, sy, 0, sx, sy, auraRadius);
        bloom.addColorStop(0, `rgba(${baseColor}, ${(0.6 * pulse).toFixed(3)})`);
        bloom.addColorStop(0.45, `rgba(${accentCyan}, ${(0.25 * pulse).toFixed(3)})`);
        bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(sx, sy, auraRadius, 0, Math.PI * 2);
        ctx.fill();

        // Focused Targeting Rings on Hover or Touch
        if (isHovered || isZooming) {
          ctx.strokeStyle = `rgba(${accentCyan}, 0.85)`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, coreRadius + 9, 0, Math.PI * 2);
          ctx.stroke();

          // Reticle tick marks
          const tickLen = 5;
          ctx.beginPath();
          ctx.moveTo(sx - (coreRadius + 14), sy);
          ctx.lineTo(sx - (coreRadius + 9), sy);
          ctx.moveTo(sx + (coreRadius + 9), sy);
          ctx.lineTo(sx + (coreRadius + 14), sy);
          ctx.moveTo(sx, sy - (coreRadius + 14));
          ctx.lineTo(sx, sy - (coreRadius + 9));
          ctx.moveTo(sx, sy + (coreRadius + 9));
          ctx.lineTo(sx, sy + (coreRadius + 14));
          ctx.stroke();
        }

        // Inner Brilliant Core
        const coreGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreRadius);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.4, '#FFE680');
        coreGrad.addColorStop(1, '#FFB900');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // In-Canvas Real Name Label (only visible on hover / tap)
        if (isHovered || isZooming || isCurrentActive) {
          const realName = getTargetRealName(tgt);
          ctx.font = 'bold 12px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';

          const labelY = sy + coreRadius + 18;

          // Soft backdrop badge
          const textWidth = ctx.measureText(realName).width;
          ctx.fillStyle = 'rgba(2, 4, 10, 0.90)';
          ctx.fillRect(sx - textWidth / 2 - 8, labelY - 12, textWidth + 16, 20);

          ctx.strokeStyle = 'rgba(255, 185, 0, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx - textWidth / 2 - 8, labelY - 12, textWidth + 16, 20);

          // Text color
          ctx.fillStyle = '#FFB900';
          ctx.fillText(realName, sx, labelY + 2);
        }
      });

      ctx.restore();

      if (activePos) {
        setTargetScreenPos(activePos);
      } else {
        setTargetScreenPos(null);
      }

      // Continuous sphere rotation
      if (!reducedMotionRef.current && !zoomState && !isDraggingRef.current) {
        rotationRef.current += 0.0009 * 16.7; // ~85 seconds per full revolution
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [backgroundStars, targets, targetVectors, hoveredTarget, activeTarget, isRtl]);

  // Target Hit Detection (min 52px hit radius for easy finger tap)
  const hitTest = useCallback(
    (clientX: number, clientY: number): ChallengeTarget | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const baseR = Math.min(rect.width, rect.height) * (rect.width < 640 ? 0.38 : 0.40);

      const angleY = rotationRef.current;
      const tiltX = tiltRef.current;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);

      let best: { tgt: ChallengeTarget; dist: number } | null = null;
      const hitRadius = 52; // Large 52px touch area (greater than 48px minimum)

      targets.forEach((tgt, idx) => {
        const v = targetVectors[idx];
        const x1 = v.x * cosY - v.z * sinY;
        const z1 = v.x * sinY + v.z * cosY;
        const y2 = v.y * cosX - z1 * sinX;
        const z2 = v.y * sinX + z1 * cosX;

        if (z2 <= 0.02) return; // Star is on back hemisphere

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

  // Pointer Interaction
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (zoomRef.current) return;
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      setActiveTarget(hit);
      // Initiate 1s cinematic zoom into target
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

      // Drag to rotate sphere
      rotationRef.current += dx * 0.005;
      tiltRef.current = Math.max(-0.9, Math.min(0.9, tiltRef.current - dy * 0.005));
    } else {
      const hit = hitTest(e.clientX, e.clientY);
      setHoveredTarget(hit);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Submit manual coordinates
  const handleCoordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCoordinateInput(coordInput);
    if (!parsed) {
      setCoordError(
        isRtl
          ? 'تعذر قراءة الإحداثيات. جرّب صيغة: 269.452, 4.693 أو 17h57m48s +04d41m36s'
          : 'Could not read coordinates. Try: 269.452, 4.693 or 17h57m48s +04d41m36s'
      );
      return;
    }
    setCoordError(null);
    onSelectCoords(parsed.ra, parsed.dec);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-64px)] min-h-[580px] bg-[#02040A] text-slate-100 flex flex-col items-center justify-between overflow-hidden select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Background celestial glow motif */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/40 via-[#02040A] to-[#02040A]" />

      {/* TOP: One Big Line */}
      <div className="relative z-10 w-full pt-8 sm:pt-12 px-4 text-center pointer-events-none">
        <h1
          className={`text-2xl sm:text-4xl md:text-5xl text-slate-100 font-normal tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] ${
            isRtl ? 'font-cairo font-bold' : 'font-serif-hero italic'
          }`}
        >
          {t.screen1BigTitle}
        </h1>
      </div>

      {/* CENTER: Full-Screen Interactive Rotating Celestial Sphere */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center my-auto">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            isDraggingRef.current = false;
            setHoveredTarget(null);
          }}
          className="w-full h-full max-h-[72vh] touch-none cursor-pointer"
          aria-label={t.screen1BigTitle}
          role="img"
        />

        {/* Floating Target Details Tooltip on Active / Hovered Target */}
        {hoveredTarget && targetScreenPos && !zoomRef.current && (
          <div
            className="absolute pointer-events-none z-20 px-4 py-2.5 rounded-2xl bg-[#0C0E14]/90 backdrop-blur-xl border border-[#FFB900]/30 shadow-[0_8px_32px_rgba(0,0,0,0.7)] text-center transition-all animate-fade-in"
            style={{
              left: `${targetScreenPos.x}px`,
              top: `${Math.max(20, targetScreenPos.y - 75)}px`,
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
            <span className="inline-block mt-1 text-[9px] font-mono text-[#00D3F3] tracking-wider">
              {isRtl ? 'اضغط للبدء' : 'Tap to start hunt'}
            </span>
          </div>
        )}
      </div>

      {/* BOTTOM: Small collapsed "Enter coordinates" link */}
      <div className="relative z-10 pb-6 sm:pb-8 px-4 flex flex-col items-center">
        {!showCoordsForm ? (
          <button
            type="button"
            onClick={() => setShowCoordsForm(true)}
            className="inline-flex items-center gap-2 px-5 py-3 min-h-[48px] text-xs font-mono text-slate-400 hover:text-slate-100 transition-colors cursor-pointer group"
          >
            <Compass className="w-4 h-4 text-slate-500 group-hover:text-[#FFB900] transition-colors" />
            <span className="underline decoration-slate-600 underline-offset-4 group-hover:decoration-[#FFB900]">
              {t.screen1EnterCoords}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
          </button>
        ) : (
          <div className="w-full max-w-md p-3.5 rounded-2xl bg-[#0C0E14]/90 backdrop-blur-xl border border-white/10 shadow-2xl animate-fade-in">
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
                  className="w-full min-h-[48px] bg-slate-950/80 border border-slate-700/80 focus:border-[#FFB900] rounded-xl py-2 ps-9 pe-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition"
                  aria-label={t.screen1EnterCoords}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 min-h-[48px] min-w-[56px] rounded-xl bg-[#FFB900] hover:bg-[#FB9600] text-slate-950 text-xs font-bold transition shadow-[0_0_12px_rgba(255,185,0,0.3)] cursor-pointer"
              >
                {isRtl ? 'بحث' : 'Go'}
              </button>
              <button
                type="button"
                onClick={() => setShowCoordsForm(false)}
                className="p-2 min-h-[48px] min-w-[48px] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
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
