import React, { useState } from 'react';
import { 
  Eye, Layers, Compass, Activity, ShieldCheck, ChevronDown, 
  ChevronUp, Zap, Sparkles, Sliders, ArrowRight, HelpCircle 
} from 'lucide-react';
import { Language } from '../utils/translations';

interface VisualScienceExplainerProps {
  language: Language;
  onSelectCoordinates?: (ra: number, dec: number) => void;
}

export const VisualScienceExplainer: React.FC<VisualScienceExplainerProps> = ({
  language,
  onSelectCoordinates,
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<'infrared' | 'bands' | 'observation' | 'diff' | 'snr' | 'sky'>('infrared');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // 1. Infrared Dust Slider (0 = Visible, 100 = Infrared)
  const [irSlider, setIrSlider] = useState<number>(65);

  // 2. Selected Band in 102 Bands
  const [selectedArray, setSelectedArray] = useState<number>(3); // 1 to 6

  // 3. Difference Simulator Star Fluxes
  const [starFlux1, setStarFlux1] = useState<number>(40);
  const [starFlux2, setStarFlux2] = useState<number>(95);

  // 4. SNR Noise Level
  const [noiseSigma, setNoiseSigma] = useState<number>(5);

  const detectorArrays = [
    { num: 1, range: '0.75 – 1.11 µm', title: 'Array 1 (Near-IR)', desc: 'Stellar photospheres & cold dwarfs' },
    { num: 2, range: '1.11 – 1.64 µm', title: 'Array 2 (Near-IR)', desc: 'Galactic stellar structure & J/H bands' },
    { num: 3, range: '1.64 – 2.42 µm', title: 'Array 3 (Short-Wave IR)', desc: 'CO gas absorption (2.3 µm) & YSOs' },
    { num: 4, range: '2.42 – 3.82 µm', title: 'Array 4 (Mid-Wave IR)', desc: 'Water ice absorption (3.05 µm) & PAH (3.3 µm)' },
    { num: 5, range: '3.82 – 4.42 µm', title: 'Array 5 (Mid-Wave IR)', desc: 'Carbon dioxide ice (4.27 µm)' },
    { num: 6, range: '4.42 – 5.00 µm', title: 'Array 6 (Mid-Wave IR)', desc: 'Deep cosmic infrared background (CIB)' },
  ];

  return (
    <div 
      className="w-full bg-[#0b1120] border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(6,182,212,0.12)] text-slate-100 space-y-4 mb-6"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Header with Collapsible Toggle (Progressive Disclosure) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-semibold block">
              {isAr ? 'مختبر المفاهيم الفيزيائية البصرية' : 'INTERACTIVE VISUAL SCIENCE LAB'}
            </span>
            <h3 className="text-base font-bold text-white">
              {isAr ? 'كيف نرى الكون بالأشعة تحت الحمراء؟' : 'Visual Explanations: SPHEREx Infrared Science'}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 transition"
        >
          <span>{isExpanded ? (isAr ? 'طي المختبر' : 'Collapse') : (isAr ? 'عرض المختبر' : 'Explore Visuals')}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          {/* Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-medium font-mono select-none">
            {[
              { id: 'infrared', label: isAr ? '1. ما هو الضوء تحت الأحمر؟' : '1. Visible vs Infrared' },
              { id: 'bands', label: isAr ? '2. الحزم الطيفية الـ 102' : '2. 102 Spectral Bands' },
              { id: 'observation', label: isAr ? '3. ما هو الرصد الفلكي؟' : '3. What is an Observation?' },
              { id: 'diff', label: isAr ? '4. صورة الفرق D = I₂ - I₁' : '4. Difference Imaging' },
              { id: 'snr', label: isAr ? '5. نسبة الإشارة إلى الضوضاء SNR' : '5. Uncertainty & SNR' },
              { id: 'sky', label: isAr ? '6. قبة السماء وإحداثيات NEP' : '6. Celestial Coordinates' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer border ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: VISIBLE VS INFRARED */}
          {activeTab === 'infrared' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7 space-y-3">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  {isAr ? 'اختراق الغبار الكوني' : 'Cosmic Dust Penetration'}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAr
                    ? 'يمتلك الغبار الكوني في سحب تشكل النجوم أبعاداً ميكرونية تشتت الضوء المرئي (0.5µm) فتحجبه تماماً. أما الأشعة تحت الحمراء (0.75 - 5.0µm) فتمتلك أطوالاً موجية أطول تنفذ عبر الغبار وتكشف النجوم المحجوبة.'
                    : 'Interstellar dust grains scatter optical visible light (0.5 µm), rendering protostellar nurseries pitch black. Infrared wavelengths (0.75–5.0 µm) pass right through dust grains, unveiling newborn stars and hidden accretion disks.'}
                </p>

                <div className="pt-2">
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                    <span className="text-slate-400">
                      {irSlider < 40 ? 'Visible (Optical 0.5 µm)' : irSlider > 70 ? 'Mid-IR (SPHEREx 4.0 µm)' : 'Near-IR (1.5 µm)'}
                    </span>
                    <span className="text-cyan-400 font-bold">{irSlider}% Infrared</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={irSlider}
                    onChange={(e) => setIrSlider(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>

              {/* Visual simulation of dust transparency */}
              <div className="md:col-span-5 aspect-video sm:aspect-square max-h-52 w-full rounded-2xl bg-black border border-slate-700 relative overflow-hidden flex items-center justify-center p-3">
                {/* Background stars (visible through IR) */}
                <div 
                  className="absolute inset-0 transition-opacity duration-300 flex items-center justify-center"
                  style={{ opacity: 0.15 + (irSlider / 100) * 0.85 }}
                >
                  <div className="w-12 h-12 rounded-full bg-amber-400 blur-[2px] shadow-[0_0_25px_#f59e0b]" />
                  <div className="absolute top-6 left-8 w-2 h-2 rounded-full bg-cyan-300 blur-[1px]" />
                  <div className="absolute bottom-8 right-10 w-3 h-3 rounded-full bg-white blur-[1px]" />
                  <div className="absolute top-10 right-12 w-2 h-2 rounded-full bg-amber-200" />
                </div>

                {/* Dust Cloud Veil (dense at visible, transparent at IR) */}
                <div 
                  className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-stone-900 to-black transition-opacity duration-300"
                  style={{ opacity: 1 - (irSlider / 100) * 0.9 }}
                />

                <div className="absolute bottom-2 inset-x-2 text-center text-[10px] font-mono text-cyan-300/80 bg-black/60 backdrop-blur-xs py-1 rounded">
                  {irSlider < 30 ? 'Optical: Opaque Dust Wall' : irSlider > 70 ? 'SPHEREx IR: Stars Revealed!' : 'Transition: Semi-Transparent'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 102 SPECTRAL BANDS */}
          {activeTab === 'bands' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  {isAr ? 'مصفوفات الكواشف الـ 6 و 102 قناة طيفية' : '6 Linear Variable Filter Arrays (102 Channels)'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  λ = 0.75 µm → 5.00 µm
                </span>
              </div>

              {/* 6 Array selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {detectorArrays.map((arr) => (
                  <button
                    key={arr.num}
                    type="button"
                    onClick={() => setSelectedArray(arr.num)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      selectedArray === arr.num
                        ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[11px] font-mono font-bold text-cyan-400">Array {arr.num}</div>
                    <div className="text-xs font-semibold text-slate-200 mt-0.5">{arr.range}</div>
                  </button>
                ))}
              </div>

              {/* Array Detail Card */}
              {(() => {
                const cur = detectorArrays[selectedArray - 1];
                return (
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-white text-sm">{cur.title} • {cur.range}</div>
                      <div className="text-slate-300 mt-1">{cur.desc}</div>
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-3 py-1.5 rounded-lg border border-cyan-500/30">
                      R = λ / Δλ ≈ 41 – 130
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: WHAT IS AN OBSERVATION? */}
          {activeTab === 'observation' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                {isAr ? 'مسار رصد البيانات الفلكية من التلسكوب إلى التحليل' : 'End-to-End Observation Ingestion Pipeline'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <span className="text-xs font-mono font-bold text-amber-400">STEP 1</span>
                  <div className="font-bold text-white text-xs">Photons Collected</div>
                  <p className="text-[11px] text-slate-400">
                    SPHEREx 20cm telescope sweeps across sky, focusing 0.75–5.0µm infrared light onto focal planes.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <span className="text-xs font-mono font-bold text-cyan-400">STEP 2</span>
                  <div className="font-bold text-white text-xs">LVF Detectors</div>
                  <p className="text-[11px] text-slate-400">
                    Linear Variable Filters disperse light into 102 spectrophotometric channels with zero moving parts.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <span className="text-xs font-mono font-bold text-purple-400">STEP 3</span>
                  <div className="font-bold text-white text-xs">Calibrated Level-2B FITS</div>
                  <p className="text-[11px] text-slate-400">
                    NASA IPAC IRSA pipeline produces HDU 1 (IMAGE MJy/sr), HDU 2 (VARIANCE), and HDU 3 (FLAGS) with WCS.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <span className="text-xs font-mono font-bold text-emerald-400">STEP 4</span>
                  <div className="font-bold text-white text-xs">Transient Science Engine</div>
                  <p className="text-[11px] text-slate-400">
                    Sub-pixel bilinear WCS registration, difference D = I₂ - I₁, and SNR &gt; 5σ candidate detection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DIFFERENCE IMAGING */}
          {activeTab === 'diff' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  {isAr ? 'المعادلة الفلكية: طرح الفيض الضوئي D = I₂ - I₁' : 'Difference Imaging Mathematics: D(x,y) = I₂(x,y) - I₁(x,y)'}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  ΔFlux = {(starFlux2 - starFlux1).toFixed(1)} MJy/sr
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                {/* Epoch 1 Box */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-slate-400">EPOCH 1: I₁(x,y)</div>
                  <div className="h-24 bg-black rounded-lg flex items-center justify-center relative">
                    <div 
                      className="rounded-full bg-cyan-300 blur-[1px] transition-all"
                      style={{ width: `${starFlux1 * 0.4}px`, height: `${starFlux1 * 0.4}px` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={starFlux1}
                    onChange={(e) => setStarFlux1(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Epoch 2 Box */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-slate-400">EPOCH 2: I₂(x,y)</div>
                  <div className="h-24 bg-black rounded-lg flex items-center justify-center relative">
                    <div 
                      className="rounded-full bg-amber-400 blur-[1.5px] transition-all shadow-[0_0_12px_#f59e0b]"
                      style={{ width: `${starFlux2 * 0.4}px`, height: `${starFlux2 * 0.4}px` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={starFlux2}
                    onChange={(e) => setStarFlux2(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Difference D Box */}
                <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-2">
                  <div className="text-xs font-mono text-cyan-300 font-bold">DIFFERENCE: D = I₂ - I₁</div>
                  <div className="h-24 bg-[#1e293b] rounded-lg flex items-center justify-center relative overflow-hidden">
                    {starFlux2 > starFlux1 ? (
                      <div 
                        className="rounded-full bg-amber-400 blur-[1px] shadow-[0_0_15px_#f59e0b]"
                        style={{ width: `${(starFlux2 - starFlux1) * 0.5}px`, height: `${(starFlux2 - starFlux1) * 0.5}px` }}
                      />
                    ) : starFlux2 < starFlux1 ? (
                      <div 
                        className="rounded-full bg-blue-500 blur-[1px] shadow-[0_0_15px_#3b82f6]"
                        style={{ width: `${(starFlux1 - starFlux2) * 0.5}px`, height: `${(starFlux1 - starFlux2) * 0.5}px` }}
                      />
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400">0.0 (Canceled)</span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-300">
                    {starFlux2 > starFlux1 ? 'Positive Peak (Brightened)' : starFlux2 < starFlux1 ? 'Negative Dip (Faded)' : 'Quiet / Unchanged'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: UNCERTAINTY & SNR */}
          {activeTab === 'snr' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                {isAr ? 'معيار الاكتشاف الإحصائي: SNR = ΔI / √(σ₁² + σ₂²)' : 'Statistical Significance: SNR = ΔI / √(σ₁² + σ₂²)'}
              </span>

              <p className="text-xs text-slate-300 leading-relaxed">
                {isAr
                  ? 'أي اختلاف أقل من 3 سيجما قد ينتج عن ضوضاء القراءة أو التقلبات الإحصائية للكواشف. تعتمد معايير ناسا حد 5.0σ لاعتبار الإشارة اكتشافاً فلكياً مؤكداً.'
                  : 'Fluctuations below 3σ can be caused by detector read-noise and cosmic ray residuals. SPEX enforces an authentic 5.0σ significance threshold before promoting a candidate to a confirmed astrophysical transient.'}
              </p>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Simulate Noise Floor (σ):</span>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={noiseSigma}
                    onChange={(e) => setNoiseSigma(parseInt(e.target.value, 10))}
                    className="w-24 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-cyan-400 font-bold">{noiseSigma}</span>
                </div>

                {(() => {
                  const deltaI = Math.abs(starFlux2 - starFlux1);
                  const snrVal = (deltaI / (noiseSigma * 1.414)).toFixed(1);
                  const isConfirmed = parseFloat(snrVal) >= 5.0;
                  return (
                    <div className="flex items-center gap-2">
                      <span>Calculated SNR: <strong className="text-white">{snrVal}σ</strong></span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isConfirmed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}>
                        {isConfirmed ? 'CONFIRMED DISCOVERY (≥ 5.0σ)' : 'REJECTED AS NOISE (< 5.0σ)'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 6: CELESTIAL COORDINATES */}
          {activeTab === 'sky' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                {isAr ? 'الإحداثيات الاستوائية وحقل القطب الشمالي لمسار الشمس (NEP)' : 'Equatorial Coordinates & North Ecliptic Pole Survey'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  <p>
                    {isAr
                      ? 'يقع القطب الشمالي لمسار الشمس (NEP) عند الإحداثيات (RA: 270.0° - 280.0°، Dec: +64.0° - +68.0°). ونظراً لمدار SPHEREx الشمسي المتزامن، يُرصد هذا الحقل مئات المرات سنوياً، مما يجعله الحقل الأفضل عالمياً لكشف التغيرات الفلكية.'
                      : 'The North Ecliptic Pole (NEP) at RA ~276°, Dec ~+65° receives the highest observation redundancy in SPHEREx’s sun-synchronous orbit, making it the premier sky laboratory for transient time-domain discovery.'}
                  </p>

                  <button
                    type="button"
                    onClick={() => onSelectCoordinates && onSelectCoordinates(276.2614, 64.8258)}
                    className="mt-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Load Benchmark NEP Coordinates (RA 276.2614°, Dec +64.8258°)</span>
                  </button>
                </div>

                {/* Celestial Sphere Graphic */}
                <div className="aspect-video bg-black rounded-xl border border-slate-800 p-2 relative flex items-center justify-center overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 300 160">
                    {/* Celestial Sphere outline */}
                    <ellipse cx="150" cy="80" rx="120" ry="65" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                    <line x1="30" y1="80" x2="270" y2="80" stroke="#334155" strokeDasharray="3 3" />
                    <line x1="150" y1="15" x2="150" y2="145" stroke="#334155" strokeDasharray="3 3" />

                    {/* NEP Target Point */}
                    <circle cx="195" cy="42" r="5" fill="#f59e0b" className="animate-ping" />
                    <circle cx="195" cy="42" r="5" fill="#f59e0b" />
                    <text x="205" y="45" fill="#f59e0b" fontSize="10" fontFamily="monospace">NEP Deep Field</text>
                    <text x="150" y="95" fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">Celestial Equator (Dec = 0°)</text>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
