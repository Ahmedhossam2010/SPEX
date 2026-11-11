import React from 'react';
import {
  Clock,
  Palette,
  ShieldAlert,
  Users,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  SplitSquareVertical,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  ChevronUp,
  X,
} from 'lucide-react';
import { LensButton, LensMode } from '../../design/components/LensButton';
import { Language, translations } from '../../utils/translations';
import { CandidateDetection, InvestigationResult } from '../../science/types';

export interface FourLensesDockProps {
  activeLens: LensMode | null;
  onSelectLens: (lens: LensMode | null) => void;
  // TIME Lens Props
  currentFrameIdx: number; // 0: Visit 1, 1: Visit 2, 2: Difference
  totalFrames: number;
  onSelectFrameIdx: (idx: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isCurtainActive: boolean;
  onToggleCurtain: () => void;
  epoch1Date?: string;
  epoch2Date?: string;
  cadenceSeconds?: number;
  // COLORS Lens Props
  activeBandIdx: number;
  onSelectBandIdx: (idx: number) => void;
  availableBands: Array<{ id: number; name: string; range: string; wavelength: number }>;
  // DOUBT Lens Props
  isDoubtOverlayActive: boolean;
  onToggleDoubtOverlay: () => void;
  selectedFlagPixel: { x: number; y: number; flag: number } | null;
  onClearFlagPixel: () => void;
  // NEIGHBORS Lens Props
  isNeighborsOverlayActive: boolean;
  onToggleNeighborsOverlay: () => void;
  selectedCandidate: CandidateDetection | null;
  language: Language;
  className?: string;
}

export const FourLensesDock: React.FC<FourLensesDockProps> = ({
  activeLens,
  onSelectLens,
  currentFrameIdx,
  totalFrames,
  onSelectFrameIdx,
  isPlaying,
  onTogglePlay,
  isCurtainActive,
  onToggleCurtain,
  epoch1Date,
  epoch2Date,
  cadenceSeconds = 128.9,
  activeBandIdx,
  onSelectBandIdx,
  availableBands,
  isDoubtOverlayActive,
  onToggleDoubtOverlay,
  selectedFlagPixel,
  onClearFlagPixel,
  isNeighborsOverlayActive,
  onToggleNeighborsOverlay,
  selectedCandidate,
  language,
  className = '',
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

  return (
    <div className={`flex flex-col items-center w-full max-w-2xl sm:max-w-3xl mx-auto px-2 sm:px-3 ${className}`}>
      {/* CONTEXTUAL CONTROL DRAWER (Floats immediately above the 4-lens dock) */}
      {activeLens && (
        <div className="w-full mb-2 bg-[#0C0E14]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-3 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.85)] animate-slide-up">
          {/* ========================================================== */}
          {/* LENS 1: TIME CONTROLS */}
          {/* ========================================================== */}
          {activeLens === 'time' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#FFB900]" />
                  <span className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wide">
                    {isRtl ? 'عدسة الزمن والتعاقب الفلكي' : 'TIME LENS · TEMPORAL COMPARISON'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#FFB900] bg-[#FFB900]/10 border border-[#FFB900]/30 px-2 py-0.5 rounded">
                  {cadenceSeconds.toFixed(1)}s {isRtl ? 'بين اللقطتين' : 'Cadence'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Observation Chips */}
                <div data-tour="epoch_selector" className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCurtainActive) onToggleCurtain();
                      onSelectFrameIdx(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer select-none ${
                      !isCurtainActive && currentFrameIdx === 0
                        ? 'bg-[#00D3F3] text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isRtl ? 'الرصدة 1 (قبل)' : 'Visit 1 (Before)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isCurtainActive) onToggleCurtain();
                      onSelectFrameIdx(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer select-none ${
                      !isCurtainActive && currentFrameIdx === 1
                        ? 'bg-[#FFB900] text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isRtl ? 'الرصدة 2 (بعد)' : 'Visit 2 (After)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isCurtainActive) onToggleCurtain();
                      onSelectFrameIdx(2);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer select-none ${
                      !isCurtainActive && currentFrameIdx === 2
                        ? 'bg-purple-400 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isRtl ? 'خريطة الفارق (2 - 1)' : 'Difference (2 - 1)'}
                  </button>
                </div>

                {/* Play / Pause & Curtain Compare */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onTogglePlay}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono transition cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{isPlaying ? (isRtl ? 'إيقاف' : 'Pause') : (isRtl ? 'تشغيل التعاقب' : 'Blink Sequence')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleCurtain}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-semibold transition cursor-pointer select-none ${
                      isCurtainActive
                        ? 'border-[#FFB900] bg-[#FFB900] text-slate-950 shadow-[0_0_16px_rgba(255,185,0,0.5)]'
                        : 'border-white/15 bg-black/40 text-slate-300 hover:border-amber-400/50 hover:text-white'
                    }`}
                  >
                    <SplitSquareVertical className="w-3.5 h-3.5" />
                    <span>{isCurtainActive ? (isRtl ? 'إغلاق الستارة' : 'Close Curtain') : (isRtl ? 'ستارة المقارنة التفاعلية' : 'Compare Curtain')}</span>
                  </button>
                </div>
              </div>

              {/* Timestamp & Scientific Cadence Disclosure */}
              <div className="text-[11px] font-mono text-slate-400 bg-black/30 p-2.5 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-500">{isRtl ? 'توقيت الرصد الفعلي: ' : 'Authentic Timestamps: '}</span>
                  <span className="text-slate-200">
                    {currentFrameIdx === 0 ? epoch1Date || '2025-04-28 13:00:15 UTC' : epoch2Date || '2025-04-28 13:02:24 UTC'}
                  </span>
                </div>
                <div className="text-[10px] text-amber-300/90">
                  {isRtl
                    ? 'الفارق الزمني قصير (~دقيقتان) لقياس الحركة النجمية السريعة وثبات الحقل.'
                    : 'Authentic intra-visit interval (~2.1 min) tracing proper motion & photometric stability.'}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* LENS 2: HIDDEN COLORS CONTROLS */}
          {/* ========================================================== */}
          {activeLens === 'colors' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#00D3F3]" />
                  <span className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wide">
                    {isRtl ? 'الألوان الخفية · طيف الأشعة تحت الحمراء' : 'HIDDEN COLORS · INFRARED SPECTROSCOPY'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#00D3F3] bg-[#00D3F3]/10 border border-[#00D3F3]/30 px-2 py-0.5 rounded">
                  0.75 – 5.0 µm
                </span>
              </div>

              {/* Band Selection Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {availableBands.map((band, idx) => (
                  <button
                    key={band.id}
                    type="button"
                    onClick={() => onSelectBandIdx(idx)}
                    className={`p-2.5 rounded-xl border text-left font-mono transition cursor-pointer select-none ${
                      activeBandIdx === idx
                        ? 'border-[#00D3F3] bg-[#00D3F3]/15 text-[#00D3F3] shadow-[0_0_16px_rgba(0,211,243,0.3)]'
                        : 'border-white/10 bg-black/40 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{band.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {band.range} · λ = {band.wavelength} µm
                    </div>
                  </button>
                ))}
              </div>

              {/* Scientific Color Explanation */}
              <div className="text-xs text-slate-300 bg-black/30 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                <p>
                  <strong className="text-[#00D3F3] font-semibold">
                    {isRtl ? 'لماذا نرى الأشعة تحت الحمراء بألوان كاذبة؟ ' : 'Why Scientific False-Color? '}
                  </strong>
                  {isRtl
                    ? 'عين الإنسان لا ترى فوتونات الأشعة تحت الحمراء. نترجم شدة الإشعاع الحراري عند 0.93–3.84 ميكرومتر إلى ألوان مرئية تكشف الأجرام الباردة كالأقزام البنية وسحب الغبار الكونية.'
                    : 'Human eyes cannot perceive infrared photons. SPHEREx translates thermal photon intensities between 0.75 and 5.0 µm into calibrated visible hues, penetrating interstellar dust to reveal sub-stellar brown dwarfs and icy worlds.'}
                </p>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* LENS 3: DOUBT CONTROLS (DATA QUALITY INSPECTION) */}
          {/* ========================================================== */}
          {activeLens === 'doubt' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#FF637E]" />
                  <span className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wide">
                    {isRtl ? 'عدسة الشك · فحص عيوب الكاشف' : 'DOUBT LENS · DATA QUALITY & ARTIFACT FILTER'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleDoubtOverlay}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-md border font-semibold transition cursor-pointer ${
                    isDoubtOverlayActive
                      ? 'border-[#FF637E] bg-[#FF637E]/20 text-[#FF637E]'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  {isDoubtOverlayActive ? (isRtl ? 'القناع مفعل' : 'DQ Mask Active') : (isRtl ? 'إظهار القناع' : 'Show DQ Mask')}
                </button>
              </div>

              {/* Legend for Flags */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FF637E] shrink-0" />
                  <div>
                    <span className="text-slate-200 block font-semibold">0x02 OVERFLOW</span>
                    <span className="text-[9px] text-slate-400">{isRtl ? 'تشبع البكسل' : 'Sensor Saturated'}</span>
                  </div>
                </div>

                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FB9600] shrink-0" />
                  <div>
                    <span className="text-slate-200 block font-semibold">0x01 TRANSIENT</span>
                    <span className="text-[9px] text-slate-400">{isRtl ? 'أشعة كونية' : 'Cosmic Ray Hit'}</span>
                  </div>
                </div>

                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 shrink-0" />
                  <div>
                    <span className="text-slate-200 block font-semibold">0x80000 OUTLIER</span>
                    <span className="text-[9px] text-slate-400">{isRtl ? 'ضوضاء شاذة' : 'Noise Outlier'}</span>
                  </div>
                </div>

                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shrink-0" />
                  <div>
                    <span className="text-slate-200 block font-semibold">0x00 CLEAN</span>
                    <span className="text-[9px] text-slate-400">{isRtl ? 'قياس نقي' : 'Nominal Quality'}</span>
                  </div>
                </div>
              </div>

              {/* Inspected Flagged Pixel Readout */}
              {selectedFlagPixel && (
                <div className="bg-rose-950/30 border border-rose-500/30 p-2.5 rounded-xl font-mono text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <span className="font-bold text-rose-300">
                        Pixel ({selectedFlagPixel.x}, {selectedFlagPixel.y}) Flag: 0x{selectedFlagPixel.flag.toString(16).toUpperCase()}
                      </span>
                      <p className="text-[10px] text-rose-400/80">
                        {selectedFlagPixel.flag & 0x02 ? 'Detector overflow saturation detected' : 'Cosmic ray / transient hit rejected by pipeline mask'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClearFlagPixel}
                    className="p-1 text-rose-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* LENS 4: NEIGHBORS CONTROLS (CATALOG OVERLAYS) */}
          {/* ========================================================== */}
          {activeLens === 'neighbors' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00D3F3]" />
                  <span className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wide">
                    {isRtl ? 'الجيران الفلكيون · كتالوجات غايا ووايز' : 'NEIGHBORS LENS · GAIA DR3 & ALLWISE CONTEXT'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleNeighborsOverlay}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-md border font-semibold transition cursor-pointer ${
                    isNeighborsOverlayActive
                      ? 'border-[#00D3F3] bg-[#00D3F3]/20 text-[#00D3F3]'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  {isNeighborsOverlayActive ? (isRtl ? 'المطابقات ظاهرة' : 'Markers Visible') : (isRtl ? 'إظهار المطابقات' : 'Show Markers')}
                </button>
              </div>

              {/* Legend for Catalogs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-[#00D3F3] shrink-0" />
                  <div>
                    <span className="text-[#00D3F3] font-bold">Gaia DR3</span>
                    <span className="text-[10px] text-slate-400 block">{isRtl ? 'نجوم مرجعية وموقع' : 'Astrometric Reference'}</span>
                  </div>
                </div>

                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-[#FFB900] shrink-0" />
                  <div>
                    <span className="text-[#FFB900] font-bold">AllWISE</span>
                    <span className="text-[10px] text-slate-400 block">{isRtl ? 'أشعة تحت حمراء متوسطة' : 'Mid-Infrared Sources'}</span>
                  </div>
                </div>

                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-slate-500 border-dashed shrink-0" />
                  <div>
                    <span className="text-slate-300 font-bold">{isRtl ? 'مرشح غير مسجل' : 'Unmatched Candidate'}</span>
                    <span className="text-[10px] text-slate-400 block">{isRtl ? 'احتمال اكتشاف جديد' : 'New Source / Transient'}</span>
                  </div>
                </div>
              </div>

              {/* Selected Candidate Metadata */}
              {selectedCandidate && (
                <div className="bg-[#00D3F3]/10 border border-[#00D3F3]/20 p-2.5 rounded-xl font-mono text-xs flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-[#00D3F3]">
                      Selected: {selectedCandidate.id} · {selectedCandidate.status}
                    </span>
                    <p className="text-[10px] text-slate-300">
                      Significance: {selectedCandidate.peakSignificance.toFixed(1)}σ · RA: {selectedCandidate.ra.toFixed(4)}°, Dec: {selectedCandidate.dec.toFixed(4)}°
                    </p>
                  </div>
                  {selectedCandidate.catalogMatches && selectedCandidate.catalogMatches.length > 0 && (
                    <span className="text-[10px] bg-[#00D3F3]/20 text-[#00D3F3] px-2 py-0.5 rounded border border-[#00D3F3]/30 shrink-0">
                      Matched {selectedCandidate.catalogMatches[0].catalog}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* THE 4 PRIMARY LENS BUTTONS IN FLOATING DOCK */}
      <div className="w-full bg-[#0C0E14]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 sm:p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] flex items-center justify-between gap-1.5 sm:gap-2">
        <LensButton
          id="time"
          label={t.lensTime || 'TIME'}
          sublabel={isRtl ? 'تعاقب اللقطات والمسار' : 'FRAME BLINK & TRAILS'}
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB900]" />}
          isActive={activeLens === 'time'}
          onClick={() => onSelectLens(activeLens === 'time' ? null : 'time')}
          color="amber"
          className="flex-1 justify-center"
        />

        <LensButton
          id="colors"
          label={t.lensColors || 'HIDDEN COLORS'}
          sublabel={isRtl ? 'نطاقات الأشعة تحت الحمراء' : '102 SPECTRAL CHANNELS'}
          icon={<Palette className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D3F3]" />}
          isActive={activeLens === 'colors'}
          onClick={() => onSelectLens(activeLens === 'colors' ? null : 'colors')}
          color="cyan"
          className="flex-1 justify-center"
        />

        <LensButton
          id="doubt"
          label={t.lensDoubt || 'DOUBT'}
          sublabel={isRtl ? 'عيوب الكاشف والشوائب' : 'INSTRUMENT GLITCHES'}
          icon={<ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF637E]" />}
          isActive={activeLens === 'doubt'}
          onClick={() => onSelectLens(activeLens === 'doubt' ? null : 'doubt')}
          color="rose"
          className="flex-1 justify-center"
        />

        <LensButton
          id="neighbors"
          label={t.lensNeighbors || 'NEIGHBORS'}
          sublabel={isRtl ? 'كتالوج غايا ووايز' : 'GAIA DR3 & ALLWISE'}
          icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
          isActive={activeLens === 'neighbors'}
          onClick={() => onSelectLens(activeLens === 'neighbors' ? null : 'neighbors')}
          color="emerald"
          className="flex-1 justify-center"
        />
      </div>
    </div>
  );
};
