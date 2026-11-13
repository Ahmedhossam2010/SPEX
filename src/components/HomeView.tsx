import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Compass, Gamepad2, Sparkles, Eye, ShieldCheck, Waves, CheckCircle2 } from 'lucide-react';
import { Button } from '../design/components/Button';
import { Badge } from '../design/components/Badge';
import { GlassPanel } from '../design/components/GlassPanel';
import { Language, translations } from '../utils/translations';
import { SPEX_HERO_IMAGE, SPEX_ASSETS } from '../spex/spexAssets';

interface HomeViewProps {
  onStartExplore: (caseId?: string) => void;
  onOpenAbout: () => void;
  onOpenCases: () => void;
  onPlayGame?: () => void;
  cases?: Array<{ id: string; title: string; category?: string; ra: number; dec: number }>;
  language: Language;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartExplore,
  onOpenAbout,
  onOpenCases,
  onPlayGame,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Collapsible SPEX guide card state (non-blocking)
  const [spexMinimized, setSpexMinimized] = useState<boolean>(false);

  // Card 1 mini-blink state
  const [blinkEpoch, setBlinkEpoch] = useState<0 | 1>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkEpoch((prev) => (prev === 0 ? 1 : 0));
    }, 900);
    return () => clearInterval(interval);
  }, []);

  const homePresets = [
    { caseId: 'case-barnards-star', label: "Barnard's Star", sub: '10.4″/yr' },
    { caseId: 'case-epsilon-indi', label: 'Epsilon Indi', sub: 'T1+T6' },
    { caseId: 'case-wise-0855', label: 'WISE 0855', sub: '8.15″/yr' },
    { caseId: 'case-rw-aur', label: 'RW Aurigae', sub: 'YSO' },
    { caseId: 'case-r-dra', label: 'R Draconis', sub: 'Mira' },
  ];

  // Parallax Starfield Canvas with slow drifting camera
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Star generation
    const starCount = Math.min(180, Math.floor((width * height) / 8000));
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.7 + 0.3,
      speed: (Math.random() * 0.15 + 0.05) * (Math.random() > 0.5 ? 1 : -1),
      twinkle: Math.random() * Math.PI * 2,
    }));

    let driftOffset = 0;

    const render = () => {
      driftOffset += 0.08;
      ctx.fillStyle = '#02040A';
      ctx.fillRect(0, 0, width, height);

      // Faint infrared nebula gradient
      const grad = ctx.createRadialGradient(
        width * 0.55,
        height * 0.38,
        50,
        width * 0.55,
        height * 0.38,
        width * 0.65
      );
      grad.addColorStop(0, 'rgba(255, 185, 0, 0.045)');
      grad.addColorStop(0.35, 'rgba(0, 211, 243, 0.03)');
      grad.addColorStop(0.7, 'rgba(251, 150, 0, 0.015)');
      grad.addColorStop(1, 'rgba(2, 4, 10, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render stars
      for (const s of stars) {
        s.twinkle += 0.02;
        const currentAlpha = Math.max(0.1, s.alpha + Math.sin(s.twinkle) * 0.2);
        const curY = (s.y + driftOffset * s.speed * 0.5) % height;
        const finalY = curY < 0 ? curY + height : curY;

        ctx.fillStyle = `rgba(241, 245, 249, ${currentAlpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(s.x, finalY, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      className={`relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-x-hidden ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Background Starfield Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none -z-10 w-full h-full"
        aria-hidden="true"
      />

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-12 pb-16 max-w-5xl mx-auto w-full">
        {/* Real Ticker of SPHEREx specs */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-[#00D3F3] font-mono tracking-wider mb-8 shadow-[0_0_15px_rgba(0,211,243,0.15)] animate-in fade-in duration-500">
          <span className="w-2 h-2 rounded-full bg-[#00D3F3] animate-pulse" />
          <span>{t.homeLiveTicker}</span>
        </div>

        {/* 10-Second Hook Headline in Playfair Display */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-serif-hero font-bold tracking-tight text-[#F1F5F9] leading-[1.05] mb-4 select-none max-w-4xl text-balance"
          style={{ textShadow: '0 0 40px rgba(255, 185, 0, 0.2)' }}
        >
          {t.homeHeroPlayfair}
        </h1>

        {/* Subline in Inter */}
        <p className="text-lg sm:text-2xl text-[#94A3B8] font-sans font-light tracking-wide max-w-2xl mb-10 text-balance">
          {t.homeHeroInter}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-8">
          <Button
            variant="primary"
            size="lg"
            icon={<Compass className="w-5 h-5" />}
            onClick={() => onStartExplore('case-wise-0855')}
            className="w-full sm:w-auto shadow-[0_0_30px_rgba(255,185,0,0.35)]"
          >
            {t.homeBtnOpenExplorer}
          </Button>

          {onPlayGame && (
            <Button
              variant="secondary"
              size="lg"
              icon={<Gamepad2 className="w-5 h-5 text-[#00D3F3]" />}
              onClick={onPlayGame}
              className="w-full sm:w-auto"
            >
              {t.homeBtnPlayCase}
            </Button>
          )}
        </div>

        {/* Compact Row of 5 Challenge Presets (One-Click Demo) */}
        <div className="w-full max-w-3xl mx-auto mb-10">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8] mb-2.5">
            {t.homePresetsHeading}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {homePresets.map((preset) => (
              <button
                key={preset.caseId}
                type="button"
                onClick={() => onStartExplore(preset.caseId)}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#FFB900]/15 border border-white/10 hover:border-[#FFB900]/45 text-xs text-[#F1F5F9] hover:text-[#FFB900] transition flex items-center gap-1.5 cursor-pointer"
              >
                <span className="font-semibold">{preset.label}</span>
                <span className="font-mono text-[10px] text-[#00D3F3]">{preset.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SPEX Cat Guide Greeting Peek-in Card (Collapsible & Non-blocking) */}
        <div className="w-full max-w-2xl mx-auto">
          <GlassPanel hasCropMarks glow className="p-4 sm:p-5 flex items-center gap-4 text-left">
            <div className="shrink-0 relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/10 border border-[#FFB900]/30 overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(255,185,0,0.2)]">
              <img
                src={SPEX_HERO_IMAGE}
                alt="SPEX Cat Guide"
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-[#00D3F3] ring-2 ring-slate-950" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FFB900]">
                    SPEX AI COMPANION
                  </span>
                  <span className="text-[10px] text-[#94A3B8] font-mono">· ASTROPHYSICAL GUIDE</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSpexMinimized((v) => !v)}
                  aria-expanded={!spexMinimized}
                  className="text-[10px] font-mono text-[#94A3B8] hover:text-white underline cursor-pointer"
                >
                  {spexMinimized ? (isRtl ? 'عرض' : 'Show') : (isRtl ? 'طي' : 'Collapse')}
                </button>
              </div>
              {!spexMinimized && (
                <p className="text-xs sm:text-sm text-[#F1F5F9] leading-relaxed font-sans">
                  {t.homeCatGreeting}
                </p>
              )}
            </div>
          </GlassPanel>
        </div>
      </section>

      {/* Below the Fold: 3 Short Cards with Looping Mini-Animations */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-16 bg-[#040711]/85 border-t border-white/[0.06] backdrop-blur-md">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Card 1: See it move */}
            <GlassPanel hasCropMarks className="p-6 flex flex-col justify-between group hover:border-[#FFB900]/30 transition-all">
              <div>
                <div className="relative w-full h-32 rounded-xl bg-[#080B14] border border-white/10 overflow-hidden mb-5 flex items-center justify-center">
                  <div className="absolute inset-0 detector-grid opacity-30" />
                  <div className="crop-mark-tl" />
                  <div className="crop-mark-tr" />
                  <div className="crop-mark-bl" />
                  <div className="crop-mark-br" />

                  {/* Looping blink animation */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 relative flex items-center justify-center">
                      {/* Fixed background stars */}
                      <span className="absolute top-4 left-6 w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span className="absolute bottom-5 right-7 w-1 h-1 rounded-full bg-slate-500" />
                      <span className="absolute top-10 right-4 w-1.5 h-1.5 rounded-full bg-slate-400" />

                      {/* Moving source jumping between two positions */}
                      <div
                        className="absolute w-3 h-3 rounded-full bg-[#FFB900] shadow-[0_0_12px_#FFB900] transition-all duration-300"
                        style={{
                          transform: blinkEpoch === 0 ? 'translate(-14px, -10px)' : 'translate(16px, 12px)',
                        }}
                      />
                    </div>

                    <span className="absolute bottom-2 font-mono text-[10px] text-[#00D3F3] bg-black/60 px-2 py-0.5 rounded">
                      EPOCH {blinkEpoch + 1} OF 2 (BLINKING)
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-serif font-bold text-[#F1F5F9] mb-2 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#FFB900]" />
                  <span>{t.homeCard1Title}</span>
                </h3>

                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {t.homeCard1Desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#00D3F3] font-mono">
                <span>INTRA-VISIT RESIDUALS</span>
                <span className="text-slate-500">D = I₂ - I₁</span>
              </div>
            </GlassPanel>

            {/* Card 2: Read the hidden colors */}
            <GlassPanel hasCropMarks className="p-6 flex flex-col justify-between group hover:border-[#00D3F3]/30 transition-all">
              <div>
                <div className="relative w-full h-32 rounded-xl bg-[#080B14] border border-white/10 overflow-hidden mb-5 flex flex-col items-center justify-center p-3">
                  <div className="absolute inset-0 detector-grid opacity-30" />
                  
                  {/* Mini spectral curve with absorption dip */}
                  <svg className="w-full h-20 overflow-visible" viewBox="0 0 200 80">
                    <defs>
                      <linearGradient id="spectrumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00D3F3" />
                        <stop offset="50%" stopColor="#FFB900" />
                        <stop offset="100%" stopColor="#FF637E" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 10 50 Q 50 20, 80 40 T 130 65 T 170 30 T 190 45"
                      fill="none"
                      stroke="url(#spectrumGrad)"
                      strokeWidth="2.5"
                    />
                    {/* Absorption dip indicator */}
                    <circle cx="130" cy="65" r="4" fill="#FF637E" className="animate-ping opacity-75" />
                    <circle cx="130" cy="65" r="3" fill="#FF637E" />
                    <text x="135" y="75" fill="#FF637E" fontSize="9" fontFamily="JetBrains Mono">
                      CH₄ ICE (3.3 µm)
                    </text>
                  </svg>

                  <span className="font-mono text-[10px] text-[#00D3F3] mt-1">
                    102 SPECTRAL CHANNELS (0.75 - 5.0 µm)
                  </span>
                </div>

                <h3 className="text-lg font-serif font-bold text-[#F1F5F9] mb-2 flex items-center gap-2">
                  <Waves className="w-4 h-4 text-[#00D3F3]" />
                  <span>{t.homeCard2Title}</span>
                </h3>

                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {t.homeCard2Desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#00D3F3] font-mono">
                <span>R ~ 40 - 150</span>
                <span className="text-slate-500">6 DETECTOR ARRAYS</span>
              </div>
            </GlassPanel>

            {/* Card 3: Solve the case */}
            <GlassPanel hasCropMarks className="p-6 flex flex-col justify-between group hover:border-[#FF637E]/30 transition-all">
              <div>
                <div className="relative w-full h-32 rounded-xl bg-[#080B14] border border-white/10 overflow-hidden mb-5 flex items-center justify-center p-3">
                  <div className="absolute inset-0 detector-grid opacity-30" />

                  {/* Quality Filter Visual */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                      <span className="text-[10px] font-mono">FLAG 0x01</span>
                      <span className="text-xs font-bold">GLITCH REJECTED</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#FFB900]/10 border border-[#FFB900]/30 text-[#FFB900]">
                      <span className="text-[10px] font-mono">GAIA DR3</span>
                      <span className="text-xs font-bold">REAL SOURCE</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-serif font-bold text-[#F1F5F9] mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF637E]" />
                  <span>{t.homeCard3Title}</span>
                </h3>

                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {t.homeCard3Desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#00D3F3] font-mono">
                <span>5.0σ THRESHOLD</span>
                <span className="text-slate-500">CROSS-MATCHED</span>
              </div>
            </GlassPanel>
          </div>

          {/* Data Honesty Strip */}
          <div className="rounded-2xl bg-[#080B14] border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-[#00D3F3]" />
                <h4 className="text-sm sm:text-base font-bold text-[#F1F5F9] font-sans">
                  {t.homeHonestyTitle}
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl leading-relaxed">
                {t.homeHonestyDesc}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Badge variant="REAL" size="sm" />
              <Badge variant="SAVED" size="sm" />
              <Badge variant="TRAINING" size="sm" />
              <Badge variant="UNVERIFIED" size="sm" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
