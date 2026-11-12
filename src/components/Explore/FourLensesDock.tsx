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
  ChevronDown,
  Eye,
  EyeOff,
  X,
  Activity,
  Layers,
  Sliders,
  Maximize2,
} from 'lucide-react';
import { LensButton, LensMode } from '../../design/components/LensButton';
import { Language, translations } from '../../utils/translations';
import { CandidateDetection } from '../../science/types';
import {
  SPHEREX_DETECTOR_ARRAYS,
  SPHEREX_102_CHANNELS,
} from '../../science/spectralBands';
import {
  ObservationTimelineSelector,
  ObservationItem,
  ImageMathMode,
} from './ObservationTimelineSelector';

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
  // Enhanced Timeline & Baseline props
  observations?: ObservationItem[];
  epochAIdx?: number;
  epochBIdx?: number;
  onSelectEpochA?: (idx: number) => void;
  onSelectEpochB?: (idx: number) => void;
  mathMode?: ImageMathMode;
  onChangeMathMode?: (mode: ImageMathMode) => void;
  targetName?: string;
  dataRelease?: string;
  // COLORS Lens Props
  activeBandIdx: number;
  onSelectBandIdx: (idx: number) => void;
  availableBands: Array<{ id: number; name: string; range: string; wavelength: number }>;
  onOpenSpectrumModal?: () => void;
  onOpenDetectorStackModal?: () => void;
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
  observations = [],
  epochAIdx = 0,
  epochBIdx = 1,
  onSelectEpochA,
  onSelectEpochB,
  mathMode = 'subtraction',
  onChangeMathMode,
  targetName = 'Astronomical Target',
  dataRelease = 'SPHEREx QR2 (Level 2B)',
  activeBandIdx,
  onSelectBandIdx,
  availableBands,
  onOpenSpectrumModal,
  onOpenDetectorStackModal,
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

  // Default observations list if none provided
  const fallbackObs: ObservationItem[] = [
    {
      index: 1,
      obsId: '2025W18_1B_0001_1',
      mjd: 60793.541849,
      date: epoch1Date || '2025-04-28T13:00:15.755Z',
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelengthUm: 0.93,
      detector: 'D1',
      durationSec: 115.1,
    },
    {
      index: 2,
      obsId: '2025W18_1B_0001_2',
      mjd: 60793.543341,
      date: epoch2Date || '2025-04-28T13:02:24.686Z',
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelengthUm: 0.93,
      detector: 'D1',
      durationSec: 115.1,
    },
  ];

  const obsListToUse = observations && observations.length > 0 ? observations : fallbackObs;

  const [isDockCollapsed, setIsDockCollapsed] = React.useState(false);
  const [selectedDetectorTab, setSelectedDetectorTab] = React.useState<number>(1);
  const [selectedChannelIndex, setSelectedChannelIndex] = React.useState<number>(1);

  if (isDockCollapsed) {
    return (
      <div className={`flex justify-center w-full ${className}`}>
        <div className="flex items-center gap-2 bg-[#0C0E14]/90 backdrop-blur-xl border border-white/20 px-3 py-1.5 rounded-full shadow-2xl pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsDockCollapsed(false)}
            className="flex items-center gap-1.5 text-xs font-mono text-amber-400 font-bold hover:text-amber-300 transition cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>{isRtl ? 'إظهار أدوات التحكم' : 'Show Controls'}</span>
          </button>
          <span className="text-white/20">|</span>
          <span className="text-[11px] font-mono text-slate-300">
            {activeLens === 'time'
              ? 'TIME'
              : activeLens === 'colors'
              ? '102 BANDS'
              : activeLens === 'doubt'
              ? 'DOUBT'
              : activeLens === 'neighbors'
              ? 'NEIGHBORS'
              : 'VIEWPORT'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center w-full max-w-2xl sm:max-w-4xl mx-auto px-2 sm:px-3 ${className}`}>
      {/* Dock Header with Collapse Button */}
      <div className="w-full flex items-center justify-between pb-1 px-1 text-[11px] font-mono text-slate-400">
        <span className="text-slate-500 uppercase tracking-wider text-[10px]">
          {isRtl ? 'لوحة تحكم عدسات SPHEREx' : 'SPHEREx Lenses Dock'}
        </span>
        <button
          type="button"
          onClick={() => setIsDockCollapsed(true)}
          className="flex items-center gap-1 hover:text-white transition cursor-pointer"
          title={isRtl ? 'إخفاء أدوات التحكم لتوسيع الرؤية' : 'Hide Controls to Maximize Sky View'}
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>{isRtl ? 'إخفاء التحكم' : 'Hide Controls'}</span>
        </button>
      </div>

      {/* CONTEXTUAL CONTROL DRAWER (Floats immediately above the 4-lens dock) */}
      {activeLens && (
        <div className="w-full mb-2 bg-[#0C0E14]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-3 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.85)] animate-slide-up max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
          {/* ========================================================== */}
          {/* LENS 1: TIME CONTROLS (INTELLIGENT TIMELINE & BASELINE) */}
          {/* ========================================================== */}
          {activeLens === 'time' && (
            <div className="space-y-3">
              <ObservationTimelineSelector
                observations={obsListToUse}
                epochAIdx={epochAIdx}
                epochBIdx={epochBIdx}
                onSelectEpochA={(idx) => onSelectEpochA?.(idx)}
                onSelectEpochB={(idx) => onSelectEpochB?.(idx)}
                currentPlayIdx={currentFrameIdx}
                onSelectPlayIdx={onSelectFrameIdx}
                isPlaying={isPlaying}
                onTogglePlay={onTogglePlay}
                mathMode={mathMode}
                onChangeMathMode={(m) => onChangeMathMode?.(m)}
                language={language}
                targetName={targetName}
                dataRelease={dataRelease}
              />

              {/* Curtain Divider Button */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                <span className="text-xs text-slate-400 font-mono">
                  {isRtl ? 'أدوات المقارنة البصرية المباشرة:' : 'Direct Visual Compare Tools:'}
                </span>

                <button
                  type="button"
                  data-tour="curtain_divider"
                  onClick={onToggleCurtain}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-semibold transition cursor-pointer select-none ${
                    isCurtainActive
                      ? 'border-[#FFB900] bg-[#FFB900] text-slate-950 shadow-[0_0_16px_rgba(255,185,0,0.5)]'
                      : 'border-white/15 bg-black/40 text-slate-300 hover:border-amber-400/50 hover:text-white'
                  }`}
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                  <span>
                    {isCurtainActive
                      ? isRtl
                        ? 'إغلاق الستارة'
                        : 'Close Curtain'
                      : isRtl
                      ? 'ستارة المقارنة التفاعلية'
                      : 'Compare Curtain'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* LENS 2: 102 SPECTRAL BANDS & 6 DETECTOR ARRAYS (0.75 - 5.0 µm) */}
          {/* ========================================================== */}
          {activeLens === 'colors' && (
            <div className="space-y-3 font-sans">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#00D3F3]" />
                  <span className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wide">
                    {isRtl ? 'نطاقات SPHEREx الطيفية الـ 102 (0.75 – 5.0 ميكرون)' : 'SPHEREx 102 Spectral Channels (0.75 – 5.0 µm)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    D1–D4: QR2 Available
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    D5–D6: PR1 Scheduled
                  </span>
                </div>
              </div>

              {/* 6 Detector Array Tabs */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase">
                  {isRtl ? 'مصفوفات الكواشف الست (H2RG Arrays):' : 'Detector Arrays (6 Focal Plane Arrays):'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 font-mono text-xs">
                  {SPHEREX_DETECTOR_ARRAYS.map((det) => (
                    <button
                      key={det.detectorNumber}
                      type="button"
                      onClick={() => setSelectedDetectorTab(det.detectorNumber)}
                      className={`p-1.5 sm:p-2 rounded-xl border text-center transition cursor-pointer ${
                        selectedDetectorTab === det.detectorNumber
                          ? 'border-[#00D3F3] bg-[#00D3F3]/20 text-[#00D3F3] font-bold shadow-xs'
                          : 'border-white/10 bg-black/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-[11px]">Detector {det.detectorNumber}</div>
                      <div className="text-[9px] text-slate-400">{det.wavelengthRangeUm[0]}–{det.wavelengthRangeUm[1]}µm</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 17 Channels for Selected Detector */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                  <span>Channels in Detector {selectedDetectorTab} (17 LVF steps):</span>
                  <span className="text-[#00D3F3]">
                    {selectedDetectorTab <= 4 ? 'Level-2B Calibrated' : 'Scheduled All-Sky'}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-1 max-h-32 overflow-y-auto pr-1">
                  {SPHEREX_102_CHANNELS.filter((ch) => ch.detector === selectedDetectorTab).map((ch) => (
                    <button
                      key={ch.channelIndex}
                      type="button"
                      onClick={() => {
                        setSelectedChannelIndex(ch.channelIndex);
                        if (selectedDetectorTab === 1) onSelectBandIdx(0);
                        else if (selectedDetectorTab === 2) onSelectBandIdx(1);
                        else if (selectedDetectorTab === 4) onSelectBandIdx(2);
                      }}
                      className={`p-1 rounded-lg border text-center font-mono text-[10px] transition cursor-pointer ${
                        selectedChannelIndex === ch.channelIndex
                          ? 'border-amber-400 bg-amber-400/20 text-amber-300 font-bold'
                          : 'border-white/10 bg-black/30 text-slate-300 hover:border-white/20'
                      }`}
                      title={`Channel ${ch.channelIndex}: λ = ${ch.wavelengthUm} µm | ${ch.primaryScienceFeatures}`}
                    >
                      <div className="font-bold">Ch {ch.channelIndex}</div>
                      <div className="text-[9px] text-slate-400">{ch.wavelengthUm}µm</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* False Color Physical Explanation */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-[#00D3F3] font-bold font-mono">
                  <Info className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تفسير الألوان الزائفة للأشعة تحت الحمراء:' : 'Understanding False-Color Infrared:'}</span>
                </div>
                <p className="leading-relaxed">
                  {isRtl
                    ? 'العين البشرية لا ترى الأشعة تحت الحمراء. يقوم SPHEREx بترجمة فوتونات 0.75 - 5.0 µm إلى لوحات ألوان مرئية (الأشعة الدافئة، فيريديس، جحيم) لتمييز درجات حرارة الأقزام البنية، ومواقع جليد الماء والكربون، وسحب الغبار الكوني.'
                    : 'Human eyes cannot perceive infrared radiation. SPHEREx maps 0.75–5.0 µm photons into visible false-color palettes so stellar temperatures, water/CO2 ice absorptions, and interstellar dust bands can be visually identified.'}
                </p>
              </div>

              {/* Bonus Actions: Spectral Extraction & Detector Stacks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {onOpenSpectrumModal && (
                  <button
                    type="button"
                    onClick={onOpenSpectrumModal}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs font-semibold transition cursor-pointer"
                  >
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>{isRtl ? 'استخراج الطيف المباشر (Bonus B)' : 'On-the-Fly Spectrum (Bonus B)'}</span>
                  </button>
                )}

                {onOpenDetectorStackModal && (
                  <button
                    type="button"
                    onClick={onOpenDetectorStackModal}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-xs font-semibold transition cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>{isRtl ? 'تجميع كواشف SPHEREx الست (Bonus A)' : '6 Detector Array Stacks (Bonus A)'}</span>
                  </button>
                )}
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
          sublabel={isRtl ? 'الخط الزمني والتعاقب' : 'TIMELINE & BLINK'}
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
