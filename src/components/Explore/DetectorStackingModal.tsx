import React, { useState, useEffect, useRef } from 'react';
import { X, Layers, Sparkles, Activity, ShieldCheck, Info, Zap } from 'lucide-react';
import { DetectorStack } from '../../science/timeSeriesPipeline';
import { AstronomyRenderer, ColormapMode, StretchMode } from '../../utils/astronomyRender';
import { Language, translations } from '../../utils/translations';
import { useModalBehavior } from '../../hooks/useModalBehavior';

export interface DetectorStackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  stacks?: Record<string, DetectorStack>;
  language: Language;
}

export const DetectorStackingModal: React.FC<DetectorStackingModalProps> = ({
  isOpen,
  onClose,
  stacks = {},
  language,
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

  useModalBehavior(isOpen, onClose);

  const availableDetectors = Object.keys(stacks);
  const [selectedDet, setSelectedDet] = useState<string>(availableDetectors[0] || 'D1');
  const [stretch, setStretch] = useState<StretchMode>('asinh');
  const [colormap, setColormap] = useState<ColormapMode>('infrared_warm');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeStack: DetectorStack | undefined = stacks[selectedDet] || Object.values(stacks)[0];

  useEffect(() => {
    if (!isOpen || !activeStack || !canvasRef.current) return;
    const canvas = canvasRef.current;
    AstronomyRenderer.renderToCanvas(canvas, activeStack.stackedFlux, activeStack.width, activeStack.height, {
      stretch,
      colormap,
      displayMode: 'presentation',
      renderSize: 320,
    });
  }, [isOpen, activeStack, stretch, colormap]);

  if (!isOpen) return null;

  const frameCount = activeStack?.frameCount || 1;
  const snrImprovementFactor = Math.sqrt(frameCount).toFixed(2);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#0C1220] shadow-2xl p-5 sm:p-7 space-y-5 text-slate-100 cursor-default ${
          isRtl ? 'font-cairo' : 'font-sans'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-['Outfit'] text-white">
                  {isRtl ? 'تجميع كواشف SPHEREx الست ومضاعفة نسبة الإشارة للضجيج (SNR)' : 'Six Detector Arrays Inverse-Variance Stacking'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Bonus A
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {isRtl
                  ? 'دمج فيزيائي دقيق للتعريضات عبر أوزان التباين العكسي (Inverse-Variance Weighting)'
                  : 'Optimal Co-addition & Propagation of Noise Covariance Across Identical Detector Channels'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detector Tabs (D1 to D6) */}
        <div>
          <label className="text-xs font-mono text-slate-400 block mb-2 uppercase font-semibold">
            {isRtl ? 'اختر مصفوفة الكاشف للتجميع:' : 'Select Detector Array:'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].map((det) => {
              const hasData = !!stacks[det];
              const isSelected = selectedDet === det;
              return (
                <button
                  key={det}
                  type="button"
                  disabled={!hasData}
                  onClick={() => setSelectedDet(det)}
                  className={`p-2.5 rounded-xl border font-mono text-left transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold shadow-[0_0_12px_rgba(255,185,0,0.3)]'
                      : hasData
                      ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                      : 'border-white/5 bg-black/20 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold">{det}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {hasData ? `${stacks[det].frameCount} frames` : (isRtl ? 'غير متاح' : 'No data')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stacking Canvas & Statistical Improvements Grid */}
        {activeStack ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Left: Rendered Stacking Canvas */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black p-2 shadow-inner">
                <canvas ref={canvasRef} className="rounded-xl block max-w-full" />
                <div className="absolute top-4 left-4 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-amber-400 border border-white/10">
                  {selectedDet} Stack ({activeStack.frameCount} frames)
                </div>
              </div>

              {/* Stretch & Palette Controls */}
              <div className="mt-3 flex items-center gap-2 font-mono text-xs">
                <select
                  value={stretch}
                  onChange={(e) => setStretch(e.target.value as StretchMode)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-slate-200 cursor-pointer"
                >
                  <option value="asinh">Asinh</option>
                  <option value="linear">Linear</option>
                  <option value="sqrt">Sqrt</option>
                  <option value="log">Log</option>
                </select>
                <select
                  value={colormap}
                  onChange={(e) => setColormap(e.target.value as ColormapMode)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-slate-200 cursor-pointer"
                >
                  <option value="infrared_warm">Infrared Warm</option>
                  <option value="inferno">Inferno</option>
                  <option value="viridis">Viridis</option>
                  <option value="grayscale">Grayscale</option>
                </select>
              </div>
            </div>

            {/* Right: Scientific Metrics & Explanation */}
            <div className="md:col-span-7 space-y-3 font-mono text-xs">
              {/* SNR Metric Highlight Card */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">
                      {isRtl ? 'معدل تحسن نسبة الإشارة إلى الضجيج (SNR)' : 'Theoretical SNR Improvement Factor'}
                    </span>
                    <span className="text-xl font-bold text-emerald-300">
                      ~{snrImprovementFactor}x (√{frameCount} scaling)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">{isRtl ? 'التعريضات المجمعة' : 'Stacked Frames'}</span>
                  <span className="text-sm font-bold text-white">{frameCount}</span>
                </div>
              </div>

              {/* Physical Parameters Table */}
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'اسم النطاق والطول الموجي:' : 'Band Name & Wavelength:'}</span>
                  <span className="text-cyan-300 font-bold">{activeStack.bandName} ({activeStack.wavelengthRange})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'أبعاد الصورة المجمعة:' : 'Pixel Dimensions:'}</span>
                  <span className="text-slate-200">{activeStack.width} × {activeStack.height} px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'المتوسط الحسابي للتدفق:' : 'Mean Stack Flux:'}</span>
                  <span className="text-slate-200">{activeStack.stats.mean.toFixed(3)} MJy/sr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'الانحراف المعياري للضجيج:' : 'Residual Noise (Std):'}</span>
                  <span className="text-slate-200">{activeStack.stats.std.toFixed(4)} MJy/sr</span>
                </div>
              </div>

              {/* Scientific Integrity Principle */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] font-sans text-slate-300 leading-relaxed">
                <strong className="text-amber-400 font-mono block mb-0.5">
                  {isRtl ? 'قاعدة النزاهة العلمية لتجميع الكواشف:' : 'Scientific Principle of Detector Stacking:'}
                </strong>
                {isRtl
                  ? 'يتم التجميع فقط بين الإطارات التي تنتمي لنفس مصفوفة الكواشف ونفس الطول الموجي، مع وزن كل بكسل بعكس تباينه (w = 1/σ²). يُحظر دمج كواشف بأطوال موجية مختلفة (مثل D1 مع D4) لتجنب تشويه التوزيع الطيفي للأجرام.'
                  : 'Frames are combined strictly within the same detector array and compatible spectral band using optimal inverse-variance weights (w = 1/σ²), masking pixels with saturation (0x02) or bad-pixel flags (0x10). Combining incompatible detectors without physical SED models is forbidden.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">
            {isRtl ? 'لا تتوفر تعريضات مجمعة متعددة لهذا الهدف في الإصدار الحالي.' : 'No multi-frame detector stack available for this target in current release.'}
          </div>
        )}
      </div>
    </div>
  );
};
