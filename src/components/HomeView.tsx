import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Gamepad2,
  Sparkles,
  Flame,
  Snowflake,
  Orbit,
  Activity,
  Star,
  ArrowRight,
  Play,
  Eye,
  CheckCircle2,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Badge } from '../design/components/Badge';
import { Language, translations } from '../utils/translations';
import { SpexPortrait } from '../spex/SpexPortrait';
import { usePrefersReducedMotion } from '../design/motionKit';
import { gameAudio } from '../game/utils/gameAudio';
import { FlyToSearch, FlyTargetSelection } from '../ui/FlyToSearch';
import { drawPsfStar, getCanvasDpr } from '../utils/smoothCanvas';

interface HomeViewProps {
  onStartAcademy: () => void;
  onStartExplore: (caseId?: string) => void;
  onQuickDemoWise: () => void;
  onFlySelection?: (selection: FlyTargetSelection) => void;
  onOpenAbout: () => void;
  onOpenCases: () => void;
  onPlayGame?: () => void;
  onOpenCommunity?: () => void;
  cases?: Array<{ id: string; title: string; category?: string; ra: number; dec: number }>;
  language: Language;
}

interface CreatureTargetCard {
  caseId: string;
  name: string;
  nameAr: string;
  nickname: string;
  hook: string;
  difficulty: 1 | 2 | 3;
  accent: 'amber' | 'cyan' | 'emerald' | 'rose' | 'sky';
  metric: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartAcademy,
  onStartExplore,
  onQuickDemoWise,
  onFlySelection,
  onPlayGame,
  onOpenCommunity,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const reducedMotion = usePrefersReducedMotion();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [blinkEpoch, setBlinkEpoch] = useState<0 | 1>(0);
  const [showDiffPreview, setShowDiffPreview] = useState<boolean>(false);
  const [flyTargetId, setFlyTargetId] = useState<string | null>(null);
  const [spexMood, setSpexMood] = useState<'greeting' | 'curious' | 'happy'>('greeting');

  // Hero sky cutout preview loop
  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setBlinkEpoch((prev) => (prev === 0 ? 1 : 0));
    }, 850);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  // Pointer & device tilt parallax listener
  useEffect(() => {
    if (reducedMotion) return;

    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetOffsetRef.current = { x: nx * 24, y: ny * 18 };
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      const nx = Math.max(-1, Math.min(1, e.gamma / 30));
      const ny = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      targetOffsetRef.current = { x: nx * 20, y: ny * 14 };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [reducedMotion]);

  // High-DPR smooth PSF starfield + soft infrared nebula backdrop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = getCanvasDpr();

    const syncCanvasSize = () => {
      dpr = getCanvasDpr();
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    };
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    const starCount = Math.min(180, Math.floor((width * height) / 7600));
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      depth: 0.25 + Math.random() * 1.15,
      radius: Math.random() * 2.1 + 0.9,
      alpha: Math.random() * 0.65 + 0.25,
      twinkle: Math.random() * Math.PI * 2,
      warm: Math.random() > 0.7,
    }));

    const shootingStars: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
    }> = [];
    let lastShootTime = performance.now();

    const render = (now: number) => {
      pointerOffsetRef.current.x += (targetOffsetRef.current.x - pointerOffsetRef.current.x) * 0.06;
      pointerOffsetRef.current.y += (targetOffsetRef.current.y - pointerOffsetRef.current.y) * 0.06;

      ctx.fillStyle = '#040711';
      ctx.fillRect(0, 0, width, height);

      const px = pointerOffsetRef.current.x;
      const py = pointerOffsetRef.current.y;

      const grad1 = ctx.createRadialGradient(
        width * 0.68 + px * 0.4,
        height * 0.32 + py * 0.4,
        40,
        width * 0.68 + px * 0.4,
        height * 0.32 + py * 0.4,
        width * 0.58
      );
      grad1.addColorStop(0, 'rgba(56, 189, 248, 0.1)');
      grad1.addColorStop(0.45, 'rgba(245, 158, 11, 0.05)');
      grad1.addColorStop(1, 'rgba(4, 7, 17, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const tSec = now * 0.001;
      for (const s of stars) {
        const twinkle = reducedMotion ? 1 : 0.72 + 0.28 * Math.sin(tSec * 1.8 + s.twinkle);
        const sx = (s.x + px * s.depth + width) % width;
        const sy = (s.y + py * s.depth + (reducedMotion ? 0 : tSec * 3.0 * s.depth) + height) % height;
        const alpha = Math.min(1, s.alpha * twinkle);
        drawPsfStar(ctx, sx, sy, s.radius, s.warm ? '253, 224, 155' : '226, 232, 240', alpha);
      }

      if (!reducedMotion && now - lastShootTime > 4200 && shootingStars.length < 2) {
        lastShootTime = now;
        shootingStars.push({
          x: Math.random() * width * 0.75,
          y: Math.random() * height * 0.45,
          vx: 7.5 + Math.random() * 4,
          vy: 3.2 + Math.random() * 2.5,
          life: 0,
          maxLife: 34,
        });
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const st = shootingStars[i];
        st.x += st.vx;
        st.y += st.vy;
        st.life += 1;
        const p = st.life / st.maxLife;
        const op = Math.sin(p * Math.PI) * 0.85;
        const gradLine = ctx.createLinearGradient(st.x, st.y, st.x - st.vx * 8, st.y - st.vy * 8);
        gradLine.addColorStop(0, `rgba(245, 158, 11, ${op.toFixed(2)})`);
        gradLine.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.strokeStyle = gradLine;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(st.x, st.y);
        ctx.lineTo(st.x - st.vx * 8, st.y - st.vy * 8);
        ctx.stroke();

        if (st.life >= st.maxLife) shootingStars.splice(i, 1);
      }

      if (!reducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, [reducedMotion]);

  const creatureTargets: CreatureTargetCard[] = [
    {
      caseId: 'case-barnards-star',
      name: "Barnard's Star",
      nameAr: 'نجم بارنارد',
      nickname: t.creatureTagBarnard,
      hook: t.explorerHookBarnard,
      difficulty: 1,
      accent: 'amber',
      metric: '10.4″/yr',
      icon: Flame,
    },
    {
      caseId: 'case-wise-0855',
      name: 'WISE 0855',
      nameAr: 'قزم WISE 0855',
      nickname: t.creatureTagWise0855,
      hook: t.explorerHookWise0855,
      difficulty: 3,
      accent: 'cyan',
      metric: '8.15″/yr',
      icon: Snowflake,
    },
    {
      caseId: 'case-epsilon-indi',
      name: 'Epsilon Indi B',
      nameAr: 'إبسيلون الهندي B',
      nickname: t.creatureTagEpsilonIndi,
      hook: t.explorerHookEpsilonIndi,
      difficulty: 2,
      accent: 'sky',
      metric: 'T1 + T6',
      icon: Orbit,
    },
    {
      caseId: 'case-rw-aur',
      name: 'RW Aurigae',
      nameAr: 'نجم RW ممسك الأعنة',
      nickname: t.creatureTagRwAur,
      hook: t.explorerHookRwAur,
      difficulty: 2,
      accent: 'emerald',
      metric: 'YSO Disk',
      icon: Sparkles,
    },
    {
      caseId: 'case-r-dra',
      name: 'R Draconis',
      nameAr: 'نجم R التنين',
      nickname: t.creatureTagRDra,
      hook: t.explorerHookRDra,
      difficulty: 1,
      accent: 'rose',
      metric: 'Mira Pulse',
      icon: Activity,
    },
  ];

  const handleFlyToTarget = (caseId: string) => {
    gameAudio.playClick();
    setSpexMood('happy');
    if (reducedMotion) {
      onStartExplore(caseId);
      return;
    }
    setFlyTargetId(caseId);
    setTimeout(() => {
      setFlyTargetId(null);
      onStartExplore(caseId);
    }, 300);
  };

  return (
    <div
      className={`relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-x-hidden transition-transform duration-300 ${
        flyTargetId ? 'scale-105 opacity-70' : 'scale-100 opacity-100'
      } ${isRtl ? 'font-cairo' : 'font-sans'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Interactive High-DPR Smooth Starfield Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none -z-10 w-full h-full"
        aria-hidden="true"
      />

      {/* HERO SCENE: Immediate 60-second clarity + 3 Action Cards + Live Blink Preview */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-7 sm:pt-10 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Story + Search + Mascot */}
          <div className="lg:col-span-7 space-y-5 text-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 text-xs font-mono text-sky-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{t.homePlainHeroTag}</span>
            </div>

            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-50 leading-[1.08] text-balance">
              {t.heroHeadline}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              {t.homePlainSubtitle}
            </p>

            {/* 3 Clear Primary Destination Cards (Start Academy, Explore the Sky, Play) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                type="button"
                data-testid="home-btn-academy"
                onClick={() => {
                  gameAudio.playClick();
                  onStartAcademy();
                }}
                className="group text-start rounded-2xl border border-amber-400/30 bg-[#0B1222]/90 hover:bg-[#111B33] hover:border-amber-400/70 p-4 flex flex-col justify-between gap-2.5 transition-all cursor-pointer min-h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <ArrowRight className={`w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-slate-50">{t.homeBtnStartAcademy}</div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{t.homeCardAcademyDesc}</p>
                </div>
              </button>

              <button
                type="button"
                data-testid="home-btn-explore"
                onClick={() => handleFlyToTarget('case-barnards-star')}
                className="group text-start rounded-2xl border border-sky-400/50 bg-gradient-to-br from-sky-500/20 to-[#0B1222] hover:border-sky-300 p-4 flex flex-col justify-between gap-2.5 shadow-[0_0_24px_rgba(56,189,248,0.18)] transition-all cursor-pointer min-h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/25 border border-sky-400/40 flex items-center justify-center text-sky-300">
                    <Compass className="w-5 h-5" />
                  </div>
                  <ArrowRight className={`w-4 h-4 text-sky-300 group-hover:translate-x-0.5 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-white">{t.homeBtnExploreSky}</div>
                  <p className="text-[11px] text-slate-200 mt-0.5 leading-snug">{t.homeCardExploreDesc}</p>
                </div>
              </button>

              <button
                type="button"
                data-testid="home-btn-play"
                onClick={() => {
                  gameAudio.playClick();
                  onPlayGame?.();
                }}
                className="group text-start rounded-2xl border border-white/15 bg-[#0B1222]/90 hover:bg-[#111B33] hover:border-emerald-400/60 p-4 flex flex-col justify-between gap-2.5 transition-all cursor-pointer min-h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <ArrowRight className={`w-4 h-4 text-emerald-300 group-hover:translate-x-0.5 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-slate-50">{t.homeBtnPlaySimple}</div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{t.homeCardPlayDesc}</p>
                </div>
              </button>
            </div>

            {/* Single Centered "Fly me to..." Search */}
            <FlyToSearch
              language={language}
              onFlyToTarget={(selection) => {
                if (onFlySelection) {
                  onFlySelection(selection);
                } else if (selection.caseId) {
                  handleFlyToTarget(selection.caseId);
                } else {
                  handleFlyToTarget('case-barnards-star');
                }
              }}
              className="pt-1"
            />

            {/* Reactive SPEX Mascot Greeting Card + Community Shortcut */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0B1120]/85 border border-white/10 backdrop-blur-xl max-w-2xl">
              <div className="flex items-center gap-3 min-w-0">
                <SpexPortrait
                  mood={spexMood}
                  size={56}
                  interactive
                  onClick={() => setSpexMood((m) => (m === 'greeting' ? 'curious' : 'greeting'))}
                  alt="SPEX Cat Guide"
                  className="shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/25 p-1"
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                    SPEX · {isRtl ? 'مرشدك الفلكي' : 'Your Space Guide'}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {t.homeCatGreeting}
                  </p>
                </div>
              </div>
              {onOpenCommunity && (
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    onOpenCommunity();
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-xs font-semibold transition cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.navCommunity}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Smooth Interactive Sky Cutout Preview + Quick Demo: WISE 0855 */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border border-sky-400/25 bg-[#090F1E]/92 p-4 sm:p-5 shadow-[0_24px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-sky-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{t.heroPreviewLabel}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {isRtl ? 'نجم بارنارد · لقطة' : "Barnard's Star ·"} {blinkEpoch + 1}/2
                </span>
              </div>

              {/* Soft PSF Animated Cutout Viewport */}
              <div
                onClick={() => handleFlyToTarget('case-barnards-star')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFlyToTarget('case-barnards-star');
                  }
                }}
                aria-label={isRtl ? 'افتح معاينة نجم بارنارد في المستكشف' : "Open Barnard's Star preview in Explorer"}
                className="relative w-full aspect-square max-h-[300px] mx-auto rounded-2xl bg-[radial-gradient(circle_at_center,#0b1328_0%,#040711_75%)] border border-white/15 overflow-hidden cursor-pointer group"
              >
                {/* Soft Background PSF Stars (no sharp squares) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                  <defs>
                    <radialGradient id="preview-psf-white">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                      <stop offset="40%" stopColor="#bae6fd" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="preview-psf-amber">
                      <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
                      <stop offset="35%" stopColor="#fbbf24" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <g className={`transition-opacity duration-300 ${showDiffPreview ? 'opacity-20' : 'opacity-100'}`}>
                    <circle cx="22" cy="18" r="2.8" fill="url(#preview-psf-white)" />
                    <circle cx="78" cy="27" r="2.2" fill="url(#preview-psf-white)" />
                    <circle cx="28" cy="76" r="3.4" fill="url(#preview-psf-amber)" />
                    <circle cx="75" cy="82" r="2.4" fill="url(#preview-psf-white)" />
                    <circle cx="68" cy="64" r="1.8" fill="url(#preview-psf-white)" />
                  </g>

                  {showDiffPreview && (
                    <>
                      <line
                        x1="40"
                        y1="56"
                        x2="62"
                        y2="38"
                        stroke="#38BDF8"
                        strokeWidth="1.4"
                        strokeDasharray="240"
                        className="spex-trail-path"
                      />
                      <circle cx="40" cy="56" r="4.5" fill="rgba(56, 189, 248, 0.22)" stroke="#38BDF8" strokeWidth="1.2" />
                    </>
                  )}
                </svg>

                {/* Moving Star PSF Halo */}
                <div
                  className="absolute transition-all duration-300 ease-out pointer-events-none"
                  style={{
                    left: showDiffPreview || blinkEpoch === 1 ? '62%' : '40%',
                    top: showDiffPreview || blinkEpoch === 1 ? '38%' : '56%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {showDiffPreview && (
                    <span className="spex-target-ring absolute left-1/2 top-1/2 w-11 h-11 rounded-full border-2 border-amber-400" />
                  )}
                  <span className="block w-8 h-8 rounded-full bg-[radial-gradient(circle,#fffbeb_0%,#fbbf24_35%,rgba(245,158,11,0)_72%)]" />
                </div>

                {/* Hover Action Overlay */}
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-[11px] font-mono bg-black/75 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md">
                  <span className="text-slate-200">
                    {showDiffPreview ? (isRtl ? 'شاهد القفزة!' : 'Motion highlighted!') : (isRtl ? 'وميض الزمن' : 'Flipping epochs')}
                  </span>
                  <span className="text-amber-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>{isRtl ? 'افتح' : 'Open'}</span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                  </span>
                </div>
              </div>

              {/* Blink toggle + Quick Demo: loads WISE 0855 & auto-plays */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setShowDiffPreview((v) => !v);
                  }}
                  aria-pressed={showDiffPreview}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    showDiffPreview
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08]'
                  }`}
                >
                  <Eye className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{t.heroPreviewBlinkBtn}</span>
                </button>
                <button
                  type="button"
                  data-testid="home-quick-demo-wise"
                  onClick={() => {
                    gameAudio.playClick();
                    onQuickDemoWise();
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                >
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span>{t.homeBtnQuickDemo}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 OFFICIAL BENCHMARK TARGETS */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-50">
              {t.heroCreaturesTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {t.heroCreaturesHint}
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            5 NASA SPHEREx {isRtl ? 'أهداف' : 'Targets'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {creatureTargets.map((card) => {
            const Icon = card.icon;
            const accentStyles =
              card.accent === 'amber'
                ? 'text-amber-400 bg-amber-500/15 border-amber-500/30 group-hover:border-amber-400'
                : card.accent === 'cyan'
                ? 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30 group-hover:border-cyan-400'
                : card.accent === 'emerald'
                ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30 group-hover:border-emerald-400'
                : card.accent === 'rose'
                ? 'text-rose-300 bg-rose-500/15 border-rose-500/30 group-hover:border-rose-400'
                : 'text-sky-300 bg-sky-500/15 border-sky-500/30 group-hover:border-sky-400';

            return (
              <button
                key={card.caseId}
                type="button"
                onClick={() => handleFlyToTarget(card.caseId)}
                className="group relative text-start rounded-2xl border border-white/12 bg-[#0B1120]/85 hover:bg-[#10192E] p-4 flex flex-col justify-between gap-3 transition-all duration-200 hover:-translate-y-1 hover:border-sky-400/50 hover:shadow-[0_14px_30px_rgba(0,0,0,0.45)] cursor-pointer min-h-[168px]"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${accentStyles}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className="flex items-center gap-0.5 text-amber-400"
                      aria-label={`${t.difficultyLabel} ${card.difficulty}/3`}
                    >
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= card.difficulty ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                        />
                      ))}
                    </span>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono text-sky-400 font-semibold">
                      {card.nickname}
                    </div>
                    <h3 className="font-display text-base font-bold text-slate-50 group-hover:text-amber-300 transition-colors">
                      {card.name}
                    </h3>
                    {isRtl && <div className="text-xs text-slate-400">{card.nameAr}</div>}
                  </div>

                  <p className="text-xs text-slate-300 leading-snug">{card.hook}</p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                  <span>{card.metric}</span>
                  <span className="text-amber-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>{isRtl ? 'ابدأ' : 'Explore'}</span>
                    <ArrowRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Honest Data Provenance Footer Strip */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-10 max-w-7xl mx-auto w-full">
        <div className="rounded-2xl bg-[#0B1120]/80 border border-white/10 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
              <h4 className="text-sm font-bold text-slate-100">{t.homeHonestyTitle}</h4>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">{t.homeHonestyDesc}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Badge variant="REAL" size="sm" />
            <Badge variant="SAVED" size="sm" />
            <Badge variant="TRAINING" size="sm" />
            <Badge variant="UNVERIFIED" size="sm" />
          </div>
        </div>
      </section>
    </div>
  );
};
