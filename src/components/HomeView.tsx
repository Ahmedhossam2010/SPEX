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
} from 'lucide-react';
import { Button } from '../design/components/Button';
import { Badge } from '../design/components/Badge';
import { Language, translations } from '../utils/translations';
import { SpexPortrait } from '../spex/SpexPortrait';
import { usePrefersReducedMotion } from '../design/motionKit';
import { gameAudio } from '../game/utils/gameAudio';
import { FlyToSearch, FlyTargetSelection } from '../ui/FlyToSearch';

interface HomeViewProps {
  onStartExplore: (caseId?: string) => void;
  onFlySelection?: (selection: FlyTargetSelection) => void;
  onOpenAbout: () => void;
  onOpenCases: () => void;
  onPlayGame?: () => void;
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
  onStartExplore,
  onFlySelection,
  onPlayGame,
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
      targetOffsetRef.current = { x: nx * 28, y: ny * 22 };
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      const nx = Math.max(-1, Math.min(1, e.gamma / 30));
      const ny = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      targetOffsetRef.current = { x: nx * 24, y: ny * 18 };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [reducedMotion]);

  // Interactive parallax starfield + nebula + shooting stars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const starCount = Math.min(200, Math.floor((width * height) / 7200));
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      depth: 0.25 + Math.random() * 1.15,
      size: Math.random() * 1.6 + 0.45,
      alpha: Math.random() * 0.65 + 0.25,
      twinkle: Math.random() * Math.PI * 2,
      warm: Math.random() > 0.72,
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

      // Subtle infrared nebula glow
      const px = pointerOffsetRef.current.x;
      const py = pointerOffsetRef.current.y;

      const grad1 = ctx.createRadialGradient(
        width * 0.65 + px * 0.4,
        height * 0.34 + py * 0.4,
        40,
        width * 0.65 + px * 0.4,
        height * 0.34 + py * 0.4,
        width * 0.55
      );
      grad1.addColorStop(0, 'rgba(56, 189, 248, 0.09)');
      grad1.addColorStop(0.45, 'rgba(245, 158, 11, 0.045)');
      grad1.addColorStop(1, 'rgba(4, 7, 17, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const tSec = now * 0.001;
      for (const s of stars) {
        const twinkle = reducedMotion ? 1 : 0.72 + 0.28 * Math.sin(tSec * 1.8 + s.twinkle);
        const sx = (s.x + px * s.depth + width) % width;
        const sy = (s.y + py * s.depth + (reducedMotion ? 0 : tSec * 3.5 * s.depth) + height) % height;
        const alpha = Math.min(1, s.alpha * twinkle);
        ctx.fillStyle = s.warm
          ? `rgba(253, 224, 155, ${alpha.toFixed(2)})`
          : `rgba(226, 232, 240, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Occasional shooting star
      if (!reducedMotion && now - lastShootTime > 3800 && shootingStars.length < 2) {
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
        ctx.lineWidth = 1.6;
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
      window.removeEventListener('resize', handleResize);
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

  // Fly-through zoom dive transition into target sky
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
    }, 320);
  };

  return (
    <div
      className={`relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-x-hidden transition-transform duration-300 ${
        flyTargetId ? 'scale-105 opacity-70' : 'scale-100 opacity-100'
      } ${isRtl ? 'font-cairo' : 'font-sans'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Interactive Starfield Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none -z-10 w-full h-full"
        aria-hidden="true"
      />

      {/* HERO SCENE: 10-Second Story + Live Interactive Sky Cutout Preview */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left / Main Story Copy */}
          <div className="lg:col-span-7 space-y-6 text-start">
            <p className="text-xs font-mono tracking-wider uppercase text-sky-400 font-semibold">
              NASA SPHEREx · <span className="normal-case">0.75–5.0 µm</span> · {isRtl ? '102 لوناً خفياً' : '102 Infrared Bands'}
            </p>

            <h1 className="font-display text-3xl sm:text-5xl lg:text-[3.35rem] font-extrabold tracking-tight text-slate-50 leading-[1.08] text-balance">
              {t.heroHeadline}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              {t.heroSubcopy}
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Button
                variant="primary"
                size="lg"
                icon={<Compass className="w-5 h-5" />}
                onClick={() => handleFlyToTarget('case-barnards-star')}
                className="min-h-[50px] px-7 text-base shadow-[0_0_28px_rgba(245,158,11,0.35)]"
              >
                {t.homeBtnOpenExplorer}
              </Button>

              {onPlayGame && (
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<Gamepad2 className="w-5 h-5 text-sky-400" />}
                  onClick={() => {
                    gameAudio.playClick();
                    onPlayGame();
                  }}
                  className="min-h-[50px]"
                >
                  {t.homeBtnPlayCase}
                </Button>
              )}
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

            {/* Reactive SPEX Mascot Greeting Card */}
            <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#0B1120]/85 border border-white/10 backdrop-blur-xl max-w-xl">
              <SpexPortrait
                mood={spexMood}
                size={62}
                interactive
                onClick={() => setSpexMood((m) => (m === 'greeting' ? 'curious' : 'greeting'))}
                alt="SPEX Cat Guide"
                className="shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/25 p-1"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                  SPEX · {isRtl ? 'مرشدك الفلكي' : 'Your Space Guide'}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {t.homeCatGreeting}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Big Interactive Sky Cutout Preview (30-second wow teaser) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border border-sky-400/25 bg-[#090F1E]/90 p-4 sm:p-5 shadow-[0_24px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-sky-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{t.heroPreviewLabel}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {isRtl ? 'نجم بارنارد · لقطة' : "Barnard's Star ·"} {blinkEpoch + 1}/2
                </span>
              </div>

              {/* Animated Cutout Viewport */}
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
                className="relative w-full aspect-square max-h-[300px] mx-auto rounded-2xl bg-[#040711] border border-white/15 overflow-hidden cursor-pointer group"
              >
                <div className="absolute inset-0 detector-grid opacity-40" />
                <div className="crop-mark-tl" />
                <div className="crop-mark-tr" />
                <div className="crop-mark-bl" />
                <div className="crop-mark-br" />

                {/* Background fixed stars (fade in diff mode) */}
                <div className={`transition-opacity duration-300 ${showDiffPreview ? 'opacity-20' : 'opacity-100'}`}>
                  <span className="absolute top-[18%] left-[22%] w-2 h-2 rounded-full bg-slate-200/80 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                  <span className="absolute top-[28%] right-[20%] w-1.5 h-1.5 rounded-full bg-slate-300/70" />
                  <span className="absolute bottom-[24%] left-[28%] w-2.5 h-2.5 rounded-full bg-amber-100/75 shadow-[0_0_8px_rgba(253,230,138,0.5)]" />
                  <span className="absolute bottom-[18%] right-[25%] w-1.5 h-1.5 rounded-full bg-slate-400/75" />
                  <span className="absolute top-[64%] left-[68%] w-1 h-1 rounded-full bg-slate-400/70" />
                </div>

                {/* Self-drawing trail vector when "Show changes" preview is enabled */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                  {showDiffPreview && (
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
                  )}
                  {/* Dipole / Epoch 1 ghost marker in diff view */}
                  {showDiffPreview && (
                    <circle cx="40" cy="56" r="4.5" fill="rgba(56, 189, 248, 0.25)" stroke="#38BDF8" strokeWidth="1.2" />
                  )}
                </svg>

                {/* Moving Star + Pulsing Highlight Ring */}
                <div
                  className="absolute transition-all duration-300 ease-out"
                  style={{
                    left: showDiffPreview || blinkEpoch === 1 ? '62%' : '40%',
                    top: showDiffPreview || blinkEpoch === 1 ? '38%' : '56%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {showDiffPreview && (
                    <span className="spex-target-ring absolute left-1/2 top-1/2 w-11 h-11 rounded-full border-2 border-amber-400 pointer-events-none" />
                  )}
                  <span className="block w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_18px_#F59E0B,0_0_6px_#FFF]" />
                </div>

                {/* Hover Action Pill inside preview */}
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

              {/* Interactive preview toggle buttons */}
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
                  onClick={() => handleFlyToTarget('case-barnards-star')}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span>{t.explorerBtnPlaySky}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 TARGET CARDS AS FRIENDLY "CREATURES TO FIND" */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
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
                className="group relative text-start rounded-2xl border border-white/12 bg-[#0B1120]/85 hover:bg-[#10192E] p-4 flex flex-col justify-between gap-3 transition-all duration-200 hover:-translate-y-1 hover:border-sky-400/50 hover:shadow-[0_14px_30px_rgba(0,0,0,0.45)] cursor-pointer min-h-[172px]"
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
                    {isRtl && (
                      <div className="text-xs text-slate-400">{card.nameAr}</div>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-snug">
                    {card.hook}
                  </p>
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
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-12 max-w-7xl mx-auto w-full">
        <div className="rounded-2xl bg-[#0B1120]/80 border border-white/10 p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
