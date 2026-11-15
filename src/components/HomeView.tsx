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
  X,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '../design/components/Badge';
import { Language, translations } from '../utils/translations';
import { usePrefersReducedMotion } from '../design/motionKit';
import { gameAudio } from '../game/utils/gameAudio';
import { FlyTargetSelection } from '../ui/FlyToSearch';
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

const HOME_HINT_KEY = 'spex_home_hint_dismissed';

export const HomeView: React.FC<HomeViewProps> = ({
  onStartAcademy,
  onStartExplore,
  onQuickDemoWise,
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
  const [showMoreTargets, setShowMoreTargets] = useState<boolean>(false);
  const [hintDismissed, setHintDismissed] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(HOME_HINT_KEY) === '1';
    } catch {
      return false;
    }
  });

  const handleDismissHint = () => {
    setHintDismissed(true);
    try {
      localStorage.setItem(HOME_HINT_KEY, '1');
    } catch {}
  };

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
    if (reducedMotion) {
      onStartExplore(caseId);
      return;
    }
    setFlyTargetId(caseId);
    setTimeout(() => {
      setFlyTargetId(null);
      onStartExplore(caseId);
    }, 280);
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

      {/* HERO SCENE: Clear 5-second hierarchy: Hint -> 1 Headline -> Big Quick Demo + 3 Cards */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-8">
        {/* First-Visit Dismissible Hint */}
        {!hintDismissed && (
          <div
            data-testid="home-first-visit-hint"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/45 bg-amber-500/15 px-3.5 py-1.5 text-xs font-semibold text-amber-200 backdrop-blur-md shadow-sm"
          >
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                handleDismissHint();
                onQuickDemoWise();
              }}
              className="flex items-center gap-1.5 hover:text-white transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{t.homeFirstVisitHint}</span>
            </button>
            <button
              type="button"
              onClick={handleDismissHint}
              aria-label={t.homeFirstVisitHintDismiss}
              title={t.homeFirstVisitHintDismiss}
              className="p-0.5 rounded-full hover:bg-white/15 text-amber-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Single Headline + Big Quick Demo + 3 Destination Cards */}
          <div className="lg:col-span-7 space-y-6 text-start">
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-50 leading-[1.1] text-balance">
              {t.heroHeadline}
            </h1>

            {/* ONE Primary CTA Button */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-testid="home-quick-demo-wise"
                onClick={() => {
                  gameAudio.playClick();
                  handleDismissHint();
                  onQuickDemoWise();
                }}
                className="min-h-[54px] px-7 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-base sm:text-lg font-extrabold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-[0_0_28px_rgba(245,158,11,0.38)] active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-current shrink-0" />
                <span>{t.homeBtnQuickDemo}</span>
              </button>
            </div>

            {/* 3 Big Clear Destination Cards: Start Academy / Explore the Sky / Play */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <button
                type="button"
                data-testid="home-btn-academy"
                onClick={() => {
                  gameAudio.playClick();
                  onStartAcademy();
                }}
                className="group text-start rounded-2xl border border-amber-400/35 bg-[#0B1222]/90 hover:bg-[#111B33] hover:border-amber-400/75 p-4 flex flex-col justify-between gap-3 transition-all cursor-pointer min-h-[132px]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <ArrowRight className={`w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
                </div>
                <div>
                  <div className="font-display text-base font-bold text-slate-50">{t.homeBtnStartAcademy}</div>
                  <p className="text-xs text-slate-300 mt-1 leading-snug">{t.homeCardAcademyDesc}</p>
                </div>
              </button>

              <button
                type="button"
                data-testid="home-btn-explore"
                onClick={() => handleFlyToTarget('case-barnards-star')}
                className="group text-start rounded-2xl border border-sky-400/50 bg-gradient-to-br from-sky-500/20 to-[#0B1222] hover:border-sky-300 p-4 flex flex-col justify-between gap-3 shadow-[0_0_24px_rgba(56,189,248,0.16)] transition-all cursor-pointer min-h-[132px]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/25 border border-sky-400/40 flex items-center justify-center text-sky-300">
                    <Compass className="w-5 h-5" />
                  </div>
                  <ArrowRight className={`w-4 h-4 text-sky-300 group-hover:translate-x-0.5 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
                </div>
                <div>
                  <div className="font-display text-base font-bold text-white">{t.homeBtnExploreSky}</div>
                  <p className="text-xs text-slate-200 mt-1 leading-snug">{t.homeCardExploreDesc}</p>
                </div>
              </button>

              <button
                type="button"
                data-testid="home-btn-play"
                onClick={() => {
                  gameAudio.playClick();
                  onPlayGame?.();
                }}
                className="group text-start rounded-2xl border border-white/15 bg-[#0B1222]/90 hover:bg-[#111B33] hover:border-emerald-400/60 p-4 flex flex-col justify-between gap-3 transition-all cursor-pointer min-h-[132px]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <ArrowRight className={`w-4 h-4 text-emerald-300 group-hover:translate-x-0.5 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
                </div>
                <div>
                  <div className="font-display text-base font-bold text-slate-50">{t.homeBtnPlaySimple}</div>
                  <p className="text-xs text-slate-300 mt-1 leading-snug">{t.homeCardPlayDesc}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Right: Clean Interactive Sky Cutout Preview */}
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
                className="relative w-full aspect-square max-h-[290px] mx-auto rounded-2xl bg-[radial-gradient(circle_at_center,#0b1328_0%,#040711_75%)] border border-white/15 overflow-hidden cursor-pointer group"
              >
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

              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  setShowDiffPreview((v) => !v);
                }}
                aria-pressed={showDiffPreview}
                className={`mt-3 w-full min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  showDiffPreview
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08]'
                }`}
              >
                <Eye className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{t.heroPreviewBlinkBtn}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BELOW THE FOLD: Short 3-Step "How It Works" Strip + Optional Collapsible Targets Drawer */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-[#0B1120]/85 backdrop-blur-xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wider">
              {t.homeHowItWorksTitle}
            </h2>
            <div className="flex items-center gap-3">
              {onOpenCommunity && (
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    onOpenCommunity();
                  }}
                  className="text-xs text-sky-300 hover:text-sky-200 flex items-center gap-1 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t.navCommunity}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowMoreTargets((v) => !v)}
                aria-expanded={showMoreTargets}
                className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 font-medium cursor-pointer"
              >
                <span>{t.homeMoreTargetsToggle}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreTargets ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-sm text-slate-200 font-medium">
              {t.homeHowStep1}
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-sm text-slate-200 font-medium">
              {t.homeHowStep2}
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-sm text-slate-200 font-medium">
              {t.homeHowStep3}
            </div>
          </div>

          {/* Collapsible 5 Benchmark Targets & Data Policy */}
          {showMoreTargets && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {creatureTargets.map((card) => {
                  const Icon = card.icon;
                  const accentStyles =
                    card.accent === 'amber'
                      ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
                      : card.accent === 'cyan'
                      ? 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30'
                      : card.accent === 'emerald'
                      ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                      : card.accent === 'rose'
                      ? 'text-rose-300 bg-rose-500/15 border-rose-500/30'
                      : 'text-sky-300 bg-sky-500/15 border-sky-500/30';

                  return (
                    <button
                      key={card.caseId}
                      type="button"
                      onClick={() => handleFlyToTarget(card.caseId)}
                      className="group text-start rounded-xl border border-white/12 bg-[#070B16] hover:bg-[#10192E] p-3 flex flex-col justify-between gap-2 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${accentStyles}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="flex items-center gap-0.5 text-amber-400" aria-label={`${t.difficultyLabel} ${card.difficulty}/3`}>
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${s <= card.difficulty ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                            />
                          ))}
                        </span>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-sky-400">{card.nickname}</div>
                        <div className="font-display text-sm font-bold text-slate-50 group-hover:text-amber-300">
                          {card.name}
                        </div>
                        {isRtl && <div className="text-[11px] text-slate-400">{card.nameAr}</div>}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>{card.metric}</span>
                        <span className="text-amber-400 font-semibold">{isRtl ? 'افتح' : 'Explore'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl bg-[#070B16] border border-white/10 p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-slate-100">{t.homeHonestyTitle}</div>
                    <p className="text-[11px] text-slate-400">{t.homeHonestyDesc}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <Badge variant="REAL" size="sm" />
                  <Badge variant="SAVED" size="sm" />
                  <Badge variant="TRAINING" size="sm" />
                  <Badge variant="UNVERIFIED" size="sm" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
