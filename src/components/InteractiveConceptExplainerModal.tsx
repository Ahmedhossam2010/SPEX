import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, ArrowLeft, Play, Pause, Layers, Eye, ShieldCheck, Info } from 'lucide-react';
import { SPEX_ASSETS } from '../spex/spexAssets';
import { Language } from '../utils/translations';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface InteractiveConceptExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const InteractiveConceptExplainerModal: React.FC<InteractiveConceptExplainerModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const isAr = language === 'ar';
  useModalBehavior(isOpen, onClose);

  const [activeStep, setActiveStep] = useState<number>(0);
  const [objectMode, setObjectMode] = useState<'moving' | 'variable'>('moving');
  const [irOpacity, setIrOpacity] = useState<number>(75);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0b1222] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 text-slate-100 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-5"
        dir={isAr ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold block">
                {isAr ? 'مختبر SPEX التعليمي' : 'SPEX INTERACTIVE CONCEPT LAB'}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                {isAr ? 'ما الذي نبحث عنه في السماء؟' : 'What Are We Looking For?'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close explainer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SPEX Cat Commentary */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex items-start gap-3">
          <img
            src={SPEX_ASSETS.explaining.imagePath}
            alt="SPEX Explaining"
            className="w-14 h-14 object-contain shrink-0"
          />
          <div className="space-y-1 text-xs">
            <span className="text-amber-400 font-bold font-mono text-[11px] block">
              SPEX:
            </span>
            <p className="text-slate-200 leading-relaxed">
              {isAr
                ? 'أحياناً، تتحرك الأجرام في الفضاء كالكويكبات، أو تتغير شدة لمعانها كالنجوم المتفجرة! لتسجيل ذلك، يلتقط العلماء صورتين لنفس الرقعة من السماء في وقتين مختلفين.'
                : 'Sometimes objects in space move or change their brightness. Scientists take pictures of the same part of the sky at different times to find those changes.'}
            </p>
          </div>
        </div>

        {/* Step Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveStep(0)}
            className={`flex-1 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeStep === 0
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? '1. الرصدة الأولى' : '1. First Picture'}
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`flex-1 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeStep === 1
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? '2. الرصدة الثانية' : '2. Second Picture'}
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`flex-1 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeStep === 2
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? '3. المقارنة (طرح الفرق)' : '3. What Changed!'}
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`flex-1 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeStep === 3
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? '4. الأشعة تحت الحمراء' : '4. Infrared Light'}
          </button>
        </div>

        {/* Step Visual Stages */}
        {activeStep < 3 ? (
          <div className="space-y-3">
            {/* Mode Toggle: Moving Asteroid vs Flaring Star */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400">
                {isAr ? 'نوع التغير الفلكي في المحاكاة:' : 'Simulated Cosmic Phenomenon:'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setObjectMode('moving')}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] cursor-pointer transition ${
                    objectMode === 'moving'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isAr ? 'كويكب متحرك (Dipole)' : 'Moving Asteroid'}
                </button>
                <button
                  type="button"
                  onClick={() => setObjectMode('variable')}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] cursor-pointer transition ${
                    objectMode === 'variable'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isAr ? 'نجم متغير (توهج)' : 'Flaring Variable Star'}
                </button>
              </div>
            </div>

            {/* Simulated Space Canvas View */}
            <div className="relative aspect-video w-full rounded-2xl bg-black border border-slate-700 overflow-hidden flex items-center justify-center p-4">
              {/* Stationary Background Stars (Never Move) */}
              <div className="absolute top-8 left-12 w-2 h-2 rounded-full bg-slate-400 blur-[0.5px]" />
              <div className="absolute top-14 right-16 w-3 h-3 rounded-full bg-slate-300 blur-[0.5px]" />
              <div className="absolute bottom-10 left-20 w-2.5 h-2.5 rounded-full bg-slate-400 blur-[0.5px]" />
              <div className="absolute bottom-16 right-24 w-2 h-2 rounded-full bg-slate-500" />
              <div className="absolute top-24 left-1/3 w-1.5 h-1.5 rounded-full bg-slate-500" />
              <div className="absolute bottom-8 right-1/3 w-1.5 h-1.5 rounded-full bg-slate-400" />

              {/* Dynamic Target Object */}
              {activeStep === 0 && (
                // Step 0: Object in Position 1
                <div
                  className={`absolute rounded-full transition-all duration-300 ${
                    objectMode === 'moving'
                      ? 'top-1/2 left-[35%] -translate-y-1/2 w-6 h-6 bg-cyan-300 shadow-[0_0_15px_#22d3ee]'
                      : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-amber-400 shadow-[0_0_10px_#f59e0b]'
                  }`}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono text-cyan-300 bg-black/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    {objectMode === 'moving' ? 'Object at Pos A' : 'Baseline Flux (F₁)'}
                  </div>
                </div>
              )}

              {activeStep === 1 && (
                // Step 1: Object in Position 2
                <div
                  className={`absolute rounded-full transition-all duration-300 ${
                    objectMode === 'moving'
                      ? 'top-1/2 left-[65%] -translate-y-1/2 w-6 h-6 bg-amber-400 shadow-[0_0_15px_#f59e0b]'
                      : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-amber-300 shadow-[0_0_25px_#f59e0b]'
                  }`}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono text-amber-300 bg-black/80 px-1.5 py-0.5 rounded border border-amber-500/30">
                    {objectMode === 'moving' ? 'Object shifted to Pos B!' : 'Brightened Surge! (F₂)'}
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                // Step 2: Difference Image D = I₂ - I₁ (Stationary stars vanish!)
                <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center">
                  {/* Grid of canceled stationary stars */}
                  <div className="text-[10px] font-mono text-slate-500 absolute top-3 left-3">
                    All stationary stars canceled to 0 (neutral dark background)
                  </div>

                  {objectMode === 'moving' ? (
                    // Dipole: Negative depression at Pos A, Positive peak at Pos B
                    <>
                      <div className="absolute top-1/2 left-[35%] -translate-y-1/2 w-6 h-6 rounded-full border-2 border-dashed border-blue-400 bg-blue-950/60 shadow-[0_0_12px_#3b82f6]">
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono text-blue-300">
                          -ΔF (Trough at A)
                        </div>
                      </div>
                      <div className="absolute top-1/2 left-[65%] -translate-y-1/2 w-6 h-6 rounded-full bg-amber-400 shadow-[0_0_20px_#f59e0b]">
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono text-amber-300 font-bold">
                          +ΔF (Peak at B)
                        </div>
                      </div>
                      {/* Arrow between them */}
                      <div className="absolute top-1/2 left-[48%] -translate-y-1/2 text-cyan-400 font-mono text-xs font-bold animate-pulse">
                        → Motion Vector
                      </div>
                    </>
                  ) : (
                    // Isolated positive residual
                    <div className="relative flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-amber-400 shadow-[0_0_25px_#f59e0b] animate-pulse" />
                      <span className="text-[10px] font-mono text-amber-300 font-bold mt-2">
                        +ΔF = F₂ - F₁ (Isolated Variable Signal!)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Mandatory Educational Simulation Label */}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                EDUCATIONAL SIMULATION — NOT REAL SPHEREx DATA
              </div>
            </div>

            {/* Explanation card for current step */}
            <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              {activeStep === 0 && (
                <p>
                  {isAr
                    ? 'في الرصدة الأولى، نسجل صورة للموقع السماوي. كل الأجرام والكويكبات والنجوم تظهر في مواقعها في تلك اللحظة.'
                    : 'In the first picture (Epoch 1), the telescope captures an infrared snapshot of this sky patch. All celestial objects appear at their positions for that specific moment.'}
                </p>
              )}
              {activeStep === 1 && (
                <p>
                  {isAr
                    ? 'في الرصدة الثانية (بعد دقائق، أيام، أو أشهر)، نلتقط صورة ثانية لنفس الموقع تماماً. إذا تحرك كويكب، سنجده في موقع جديد! وإذا توهج نجم، سيبدو أكثر سطوعاً.'
                    : 'In the second picture (Epoch 2, minutes or months later), we take a second snapshot of the exact same patch. If an asteroid moved, it appears in a new position! If a star flared, it appears brighter.'}
                </p>
              )}
              {activeStep === 2 && (
                <p>
                  {isAr
                    ? 'هنا يأتي دور SPEX! نقوم بعملية طرح رياضي (الصورة 2 - الصورة 1). النجوم الثابتة تطرح نفسها وتختفي لتصبح صفراً، والشيء الوحيد الذي يبقى في الصورة هو ما تغير أو تحرك!'
                    : 'This is where SPEX shines! We subtract the earlier image from the later image (D = I₂ - I₁). Millions of stationary stars cancel out to zero. The ONLY thing left in the difference image is what changed!'}
                </p>
              )}
            </div>
          </div>
        ) : (
          // Step 3: Infrared Light Explanation
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                {isAr ? 'لماذا ترصد ناسا الأشعة تحت الحمراء؟ (102 حزمة طيفية)' : 'Why Infrared Light? (102 Infrared Spectral Bands)'}
              </span>

              <p className="text-xs text-slate-300 leading-relaxed">
                {isAr
                  ? 'عيون البشر ترى فقط الضوء المرئي. لكن في الفضاء، تحجب سحب الغبار الكوني الضوء المرئي تماماً! الأشعة تحت الحمراء (0.75 إلى 5.0 ميكرون) تمتلك موجات أطول تخترق الغبار وتكشف ولادة النجوم، الكواكب الباردة، وجليد الماء العضوي عبر 102 قناة طيفية دقيقة.'
                  : 'Human eyes only see visible light. But in deep space, thick cosmic dust clouds block visible light completely! Infrared light (0.75 to 5.0 µm) has longer wavelengths that penetrate right through the dust, revealing newborn stars, frozen brown dwarfs, and water-ice molecules across 102 precise spectral channels.'}
              </p>

              {/* Interactive dust transparency slider */}
              <div className="pt-2">
                <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                  <span className="text-slate-400">
                    {irOpacity < 40 ? 'Visible Light (Blocked by Dust)' : 'Infrared Light (Pillars Revealed!)'}
                  </span>
                  <span className="text-cyan-400 font-bold">{irOpacity}% Infrared</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={irOpacity}
                  onChange={(e) => setIrOpacity(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Visual simulation of dust transparency */}
              <div className="relative aspect-video w-full rounded-2xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center">
                {/* Hidden stars revealed by IR */}
                <div
                  className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
                  style={{ opacity: 0.15 + (irOpacity / 100) * 0.85 }}
                >
                  <div className="w-16 h-16 rounded-full bg-amber-400 blur-[2px] shadow-[0_0_35px_#f59e0b]" />
                  <div className="absolute top-6 left-12 w-3 h-3 rounded-full bg-cyan-300 blur-[1px]" />
                  <div className="absolute bottom-10 right-16 w-4 h-4 rounded-full bg-white blur-[1px]" />
                </div>

                {/* Dust Cloud Veil */}
                <div
                  className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-stone-900 to-black transition-opacity duration-300"
                  style={{ opacity: 1 - (irOpacity / 100) * 0.9 }}
                />

                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                  EDUCATIONAL SIMULATION — NOT REAL SPHEREx DATA
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isAr ? 'السابق' : 'Previous'}</span>
          </button>

          {activeStep < 3 ? (
            <button
              type="button"
              onClick={() => setActiveStep((prev) => prev + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              <span>{isAr ? 'التالي' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              <span>{isAr ? 'جاهز! فلنبدأ الاستكشاف' : 'Got it! Let’s Explore'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
