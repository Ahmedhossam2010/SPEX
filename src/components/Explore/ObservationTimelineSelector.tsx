import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Filter,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Language, translations } from '../../utils/translations';
import { TimeSeriesFrame, TemporalPairInfo } from '../../science/timeSeriesPipeline';

export type TimeRangeFilter = 'ALL' | 'LONGEST' | 'MONTHS' | 'WEEKS' | 'DAYS' | 'CADENCE';
export type ImageMathMode = 'subtraction' | 'addition' | 'blink';

export interface ObservationItem {
  index: number;
  obsId: string;
  mjd: number;
  date: string;
  dateEnd?: string;
  band: string;
  wavelengthUm: number;
  detector: string;
  durationSec?: number;
  qualityStatus?: 'CLEAN' | 'FLAGGED_ARTIFACT' | 'OUTLIER';
  flux?: number[];
  reprojectedFlux?: number[];
  flags?: number[];
  variance?: number[];
  width?: number;
  height?: number;
}

export interface ObservationTimelineSelectorProps {
  observations: ObservationItem[];
  epochAIdx: number;
  epochBIdx: number;
  onSelectEpochA: (idx: number) => void;
  onSelectEpochB: (idx: number) => void;
  currentPlayIdx: number;
  onSelectPlayIdx: (idx: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  mathMode: ImageMathMode;
  onChangeMathMode: (mode: ImageMathMode) => void;
  language: Language;
  targetName: string;
  dataRelease?: string;
}

export const ObservationTimelineSelector: React.FC<ObservationTimelineSelectorProps> = ({
  observations,
  epochAIdx,
  epochBIdx,
  onSelectEpochA,
  onSelectEpochB,
  currentPlayIdx,
  onSelectPlayIdx,
  isPlaying,
  onTogglePlay,
  mathMode,
  onChangeMathMode,
  language,
  targetName,
  dataRelease = 'SPHEREx QR2 (Level 2B)',
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

  const [activeFilter, setActiveFilter] = useState<TimeRangeFilter>('LONGEST');
  const [isExpanded, setIsExpanded] = useState(false);
  const [unavailableFilterNotice, setUnavailableFilterNotice] = useState<string | null>(null);

  // Chronologically sort all observations
  const sortedObs = useMemo(() => {
    return [...observations].sort((a, b) => a.mjd - b.mjd);
  }, [observations]);

  // Selected observations
  const obsA = sortedObs[epochAIdx] || sortedObs[0];
  const obsB = sortedObs[epochBIdx] || sortedObs[sortedObs.length - 1];

  // Calculate honest temporal baseline
  const baselineInfo = useMemo(() => {
    if (!obsA || !obsB) {
      return {
        deltaDays: 0,
        deltaHours: 0,
        deltaSeconds: 0,
        humanStringEn: '0 seconds',
        humanStringAr: '0 ثانية',
        baselineCategory: 'SAME_EXPOSURE',
        isMeaningfulSeparation: false,
        bandCompatible: true,
      };
    }

    const deltaMjd = Math.abs(obsB.mjd - obsA.mjd);
    const deltaDays = deltaMjd;
    const deltaHours = deltaMjd * 24;
    const deltaSeconds = deltaMjd * 86400;

    let humanStringEn = '';
    let humanStringAr = '';
    let baselineCategory: 'INTRA_VISIT' | 'SHORT_TERM' | 'MULTI_WEEK' | 'MULTI_MONTH' = 'INTRA_VISIT';

    if (deltaDays >= 30) {
      const months = (deltaDays / 30.4375).toFixed(1);
      humanStringEn = `${deltaDays.toFixed(1)} days (~${months} months)`;
      humanStringAr = `${deltaDays.toFixed(1)} يوم (~${months} شهر)`;
      baselineCategory = 'MULTI_MONTH';
    } else if (deltaDays >= 7) {
      const weeks = (deltaDays / 7).toFixed(1);
      humanStringEn = `${deltaDays.toFixed(1)} days (~${weeks} weeks)`;
      humanStringAr = `${deltaDays.toFixed(1)} يوم (~${weeks} أسبوع)`;
      baselineCategory = 'MULTI_WEEK';
    } else if (deltaHours >= 1) {
      humanStringEn = `${deltaHours.toFixed(1)} hours (${deltaDays.toFixed(2)} days)`;
      humanStringAr = `${deltaHours.toFixed(1)} ساعة (${deltaDays.toFixed(2)} يوم)`;
      baselineCategory = 'SHORT_TERM';
    } else {
      humanStringEn = `${deltaSeconds.toFixed(1)} seconds (${(deltaSeconds / 60).toFixed(1)} min cadence)`;
      humanStringAr = `${deltaSeconds.toFixed(1)} ثانية (~${(deltaSeconds / 60).toFixed(1)} دقيقة)`;
      baselineCategory = 'INTRA_VISIT';
    }

    const isMeaningfulSeparation = deltaDays >= 1;
    const bandCompatible = Math.abs(obsA.wavelengthUm - obsB.wavelengthUm) < 0.35;

    return {
      deltaDays,
      deltaHours,
      deltaSeconds,
      humanStringEn,
      humanStringAr,
      baselineCategory,
      isMeaningfulSeparation,
      bandCompatible,
    };
  }, [obsA, obsB]);

  // Find longest available baseline pair across all observations
  const longestPair = useMemo(() => {
    if (sortedObs.length < 2) return null;
    let maxDelta = -1;
    let bestA = 0;
    let bestB = 1;
    for (let i = 0; i < sortedObs.length; i++) {
      for (let j = i + 1; j < sortedObs.length; j++) {
        // Prefer compatible bands
        const bandCompat = Math.abs(sortedObs[i].wavelengthUm - sortedObs[j].wavelengthUm) < 0.35;
        const delta = Math.abs(sortedObs[j].mjd - sortedObs[i].mjd);
        if (bandCompat && delta > maxDelta) {
          maxDelta = delta;
          bestA = i;
          bestB = j;
        }
      }
    }
    return { bestA, bestB, maxDelta };
  }, [sortedObs]);

  // Intelligent preset selector
  const handleApplyPreset = (filter: TimeRangeFilter) => {
    setActiveFilter(filter);
    setUnavailableFilterNotice(null);
    if (sortedObs.length < 2) return;

    if (filter === 'LONGEST' && longestPair) {
      onSelectEpochA(longestPair.bestA);
      onSelectEpochB(longestPair.bestB);
      return;
    }

    if (filter === 'CADENCE') {
      // Find two observations in the same visit or closest in time
      let minDelta = Infinity;
      let minA = 0;
      let minB = 1;
      for (let i = 0; i < sortedObs.length - 1; i++) {
        const delta = Math.abs(sortedObs[i + 1].mjd - sortedObs[i].mjd);
        if (delta < minDelta && delta > 0.0001) {
          minDelta = delta;
          minA = i;
          minB = i + 1;
        }
      }
      onSelectEpochA(minA);
      onSelectEpochB(minB);
      return;
    }

    if (filter === 'MONTHS') {
      const pair = findPairWithDelta(28, Infinity);
      if (pair) {
        onSelectEpochA(pair.a);
        onSelectEpochB(pair.b);
      } else {
        setUnavailableFilterNotice('No matching observation pair is currently available for this time range.');
      }
      return;
    }

    if (filter === 'WEEKS') {
      const pair = findPairWithDelta(7, 28);
      if (pair) {
        onSelectEpochA(pair.a);
        onSelectEpochB(pair.b);
      } else {
        setUnavailableFilterNotice('No matching observation pair is currently available for this time range.');
      }
      return;
    }

    if (filter === 'DAYS') {
      const pair = findPairWithDelta(0.04, 7); // ~1 hr to 7 days
      if (pair) {
        onSelectEpochA(pair.a);
        onSelectEpochB(pair.b);
      } else {
        setUnavailableFilterNotice('No matching observation pair is currently available for this time range.');
      }
      return;
    }

    if (filter === 'ALL') {
      if (longestPair) {
        onSelectEpochA(longestPair.bestA);
        onSelectEpochB(longestPair.bestB);
      }
      return;
    }
  };

  const findPairWithDelta = (minDays: number, maxDays: number) => {
    for (let i = 0; i < sortedObs.length; i++) {
      for (let j = i + 1; j < sortedObs.length; j++) {
        const deltaDays = Math.abs(sortedObs[j].mjd - sortedObs[i].mjd);
        const bandCompat = Math.abs(sortedObs[i].wavelengthUm - sortedObs[j].wavelengthUm) < 0.35;
        if (bandCompat && deltaDays >= minDays && deltaDays <= maxDays) {
          return { a: i, b: j };
        }
      }
    }
    return null;
  };

  // Format date helper
  const formatDateUtc = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="w-full bg-[#0C0E14]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-3 sm:p-4 shadow-xl">
      {/* Top Header: Title, Total Baseline badge, and Collapsible Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wide">
            {isRtl ? 'الخط الزمني الذكي للرصدات والفارق الزمني الحقيقي' : 'Observation Timeline & Intelligent Baseline'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Total Baseline of entire dataset */}
          {sortedObs.length >= 2 && (
            <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              {sortedObs.length} {isRtl ? 'رصدات متاحة' : 'Observations'} ·{' '}
              {Math.abs(sortedObs[sortedObs.length - 1].mjd - sortedObs[0].mjd) >= 1
                ? `${Math.abs(sortedObs[sortedObs.length - 1].mjd - sortedObs[0].mjd).toFixed(1)} ${isRtl ? 'يوم' : 'days span'}`
                : `${(Math.abs(sortedObs[sortedObs.length - 1].mjd - sortedObs[0].mjd) * 1440).toFixed(1)} ${isRtl ? 'دقيقة' : 'min span'}`}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand detailed table'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Intelligent Time Range Presets Filter Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs">
          <span className="text-slate-500 text-[11px] flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{isRtl ? 'فلتر الفارق:' : 'Baseline Filter:'}</span>
          </span>

          {[
            { id: 'LONGEST' as TimeRangeFilter, labelEn: 'Longest Baseline', labelAr: 'أطول فارق زمني' },
            { id: 'MONTHS' as TimeRangeFilter, labelEn: 'Months (≥30d)', labelAr: 'أشهر (≥30 يوم)' },
            { id: 'WEEKS' as TimeRangeFilter, labelEn: 'Weeks (7-30d)', labelAr: 'أسابيع (7-30 يوم)' },
            { id: 'DAYS' as TimeRangeFilter, labelEn: 'Hours / Days', labelAr: 'ساعات / أيام' },
            { id: 'CADENCE' as TimeRangeFilter, labelEn: 'Short Cadence (~2 min)', labelAr: 'تتابع سريع (~2 د)' },
            { id: 'ALL' as TimeRangeFilter, labelEn: 'All Frames', labelAr: 'جميع اللقطات' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer select-none ${
                activeFilter === preset.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {isRtl ? preset.labelAr : preset.labelEn}
            </button>
          ))}
        </div>

        {/* Image Arithmetic Mode Toggle (Subtraction vs Addition vs Blink) */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono">
          <button
            type="button"
            onClick={() => onChangeMathMode('subtraction')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
              mathMode === 'subtraction'
                ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Difference Image: D = I2 - I1"
          >
            {isRtl ? 'الفارق (D = I2 - I1)' : 'Diff (I2 - I1)'}
          </button>
          <button
            type="button"
            onClick={() => onChangeMathMode('addition')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
              mathMode === 'addition'
                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Co-added Stack: S = I1 + I2"
          >
            {isRtl ? 'المجموع (S = I1 + I2)' : 'Sum (I1 + I2)'}
          </button>
          <button
            type="button"
            onClick={() => onChangeMathMode('blink')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
              mathMode === 'blink'
                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Alternate frames"
          >
            {isRtl ? 'تعاقب (وميض)' : 'Blink'}
          </button>
        </div>
      </div>

      {/* Unavailable Filter Interval Notice */}
      {unavailableFilterNotice && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center justify-between gap-2 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              {isRtl
                ? 'لا يتوفر حالياً زوج رصدات متطابق ضمن هذا النطاق الزمني.'
                : unavailableFilterNotice}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setUnavailableFilterNotice(null)}
            className="text-[11px] underline text-slate-400 hover:text-white cursor-pointer px-1 shrink-0"
          >
            {isRtl ? 'إغلاق' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Manual Epoch Pair Comparison Selectors & Honest Baseline Disclosure Card */}
      <div data-tour="epoch_selector" className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Epoch 1 (Earlier / Reference) Selector */}
        <div className="md:col-span-4 bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-cyan-400 font-bold">{isRtl ? 'الرصدة الأولى (قبل):' : 'Epoch A (Before):'}</span>
            <span className="text-slate-400 text-[10px]">#{epochAIdx + 1} of {sortedObs.length}</span>
          </div>
          <select
            value={epochAIdx}
            onChange={(e) => onSelectEpochA(parseInt(e.target.value, 10))}
            className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs font-mono text-slate-100 focus:outline-hidden focus:border-cyan-400 cursor-pointer"
          >
            {sortedObs.map((obs, idx) => (
              <option key={obs.obsId} value={idx} disabled={idx === epochBIdx}>
                #{idx + 1}: {obs.obsId} ({obs.detector} {obs.wavelengthUm}µm) — {formatDateUtc(obs.date).substring(0, 16)}
              </option>
            ))}
          </select>
          <div className="text-[10px] font-mono text-slate-400 truncate">
            {obsA ? `${formatDateUtc(obsA.date)} · MJD ${obsA.mjd.toFixed(4)}` : ''}
          </div>
        </div>

        {/* Center: Exact Elapsed Baseline Badge */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
          <span className="text-[10px] font-mono uppercase text-slate-400">
            {isRtl ? 'الفارق الزمني الفعلي الصادق' : 'Authentic Elapsed Baseline'}
          </span>
          <span className="text-sm font-mono font-bold text-amber-300 mt-0.5">
            {isRtl ? baselineInfo.humanStringAr : baselineInfo.humanStringEn}
          </span>
          <span className="text-[10px] font-mono text-slate-400 mt-0.5">
            ΔMJD = {Math.abs((obsB?.mjd || 0) - (obsA?.mjd || 0)).toFixed(6)}
          </span>
        </div>

        {/* Epoch 2 (Later / Follow-up) Selector */}
        <div className="md:col-span-4 bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-amber-400 font-bold">{isRtl ? 'الرصدة الثانية (بعد):' : 'Epoch B (After):'}</span>
            <span className="text-slate-400 text-[10px]">#{epochBIdx + 1} of {sortedObs.length}</span>
          </div>
          <select
            value={epochBIdx}
            onChange={(e) => onSelectEpochB(parseInt(e.target.value, 10))}
            className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs font-mono text-slate-100 focus:outline-hidden focus:border-amber-400 cursor-pointer"
          >
            {sortedObs.map((obs, idx) => (
              <option key={obs.obsId} value={idx} disabled={idx === epochAIdx}>
                #{idx + 1}: {obs.obsId} ({obs.detector} {obs.wavelengthUm}µm) — {formatDateUtc(obs.date).substring(0, 16)}
              </option>
            ))}
          </select>
          <div className="text-[10px] font-mono text-slate-400 truncate">
            {obsB ? `${formatDateUtc(obsB.date)} · MJD ${obsB.mjd.toFixed(4)}` : ''}
          </div>
        </div>
      </div>

      {/* Scientific Warnings & Integrity Notice */}
      <div className="mt-3 space-y-1.5">
        {!baselineInfo.bandCompatible && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              {isRtl
                ? `تحذير علمي: النطاقات الطيفية غير متوافقة (${obsA.band} مقابل ${obsB.band}). الطرح الفيزيائي المباشر غير موثوق بين أطوال موجية متباعدة!`
                : `Scientific Warning: Incompatible spectral bands (${obsA.band} vs ${obsB.band}). Direct image subtraction between distinct thermal infrared bands is scientifically invalid.`}
            </span>
          </div>
        )}

        {baselineInfo.baselineCategory === 'INTRA_VISIT' && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[11px] font-mono">
            <Info className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              {isRtl
                ? `تنبيه الأمانة العلمية: هاتان الرصدتان التُقطتا في نفس الزيارة بفارق ${baselineInfo.deltaSeconds.toFixed(1)} ثانية فقط (cadence ~2.1 min). لم يتوفر بعد رصد متعدد الشهور لهذا الجرم في إصدار ${dataRelease}.`
                : `Scientific Integrity Notice: These two exposures were acquired in the same visit just ${baselineInfo.deltaSeconds.toFixed(1)}s apart (~2.1 min cadence). A multi-month baseline is not yet available for this target in ${dataRelease}.`}
            </span>
          </div>
        )}

        {baselineInfo.baselineCategory === 'MULTI_MONTH' && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              {isRtl
                ? `فارق زمني طويل معتمد: ${baselineInfo.humanStringAr}. مثالي لاكتشاف الحركة الخاصة الملحوظة وتغيرات السطوع الحقيقية!`
                : `Verified Long Baseline: ${baselineInfo.humanStringEn}. Ideal for detecting measurable stellar proper motion and celestial variability!`}
            </span>
          </div>
        )}
      </div>

      {/* Chronological Playback Strip */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
        {/* Playback Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => onSelectPlayIdx(Math.max(0, currentPlayIdx - 1))}
            disabled={currentPlayIdx <= 0}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 transition cursor-pointer"
            title="Step Back"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isPlaying ? (isRtl ? 'إيقاف' : 'Pause') : (isRtl ? 'تشغيل تتابع زمني' : 'Play Sequence')}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPlayIdx(Math.min(sortedObs.length - 1, currentPlayIdx + 1))}
            disabled={currentPlayIdx >= sortedObs.length - 1}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 transition cursor-pointer"
            title="Step Forward"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <span className="text-slate-400 text-[11px] ml-2">
            {isRtl ? 'الإطار المعروض:' : 'Frame:'} <strong className="text-white">#{currentPlayIdx + 1}</strong> / {sortedObs.length}
          </span>
        </div>

        {/* Quick jump to inspect single frame */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-[50%]">
          {sortedObs.map((obs, idx) => (
            <button
              key={obs.obsId}
              type="button"
              onClick={() => onSelectPlayIdx(idx)}
              className={`h-6 px-2 rounded font-mono text-[10px] shrink-0 transition cursor-pointer ${
                currentPlayIdx === idx
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : idx === epochAIdx
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : idx === epochBIdx
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
              title={`${obs.obsId} (${obs.date})`}
            >
              #{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Table: Full list of all available observations with timestamps & bands */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-white/10 max-h-56 overflow-y-auto font-mono text-xs animate-slide-up">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase border-b border-white/10">
                <th className="p-1.5">#</th>
                <th className="p-1.5">{isRtl ? 'معرف الرصدة' : 'Observation ID'}</th>
                <th className="p-1.5">{isRtl ? 'توقيت الرصد UTC' : 'DATE-OBS (UTC)'}</th>
                <th className="p-1.5">MJD</th>
                <th className="p-1.5">{isRtl ? 'الكاشف / الطول' : 'Band'}</th>
                <th className="p-1.5 text-right">{isRtl ? 'إجراء' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px]">
              {sortedObs.map((obs, idx) => (
                <tr
                  key={obs.obsId}
                  className={`hover:bg-white/5 transition ${
                    idx === epochAIdx ? 'bg-cyan-500/10' : idx === epochBIdx ? 'bg-amber-500/10' : ''
                  }`}
                >
                  <td className="p-1.5 font-bold text-slate-400">#{idx + 1}</td>
                  <td className="p-1.5 font-mono text-slate-200">{obs.obsId}</td>
                  <td className="p-1.5 text-slate-300">{formatDateUtc(obs.date)}</td>
                  <td className="p-1.5 text-slate-400">{obs.mjd.toFixed(4)}</td>
                  <td className="p-1.5 text-cyan-400">{obs.detector} ({obs.wavelengthUm} µm)</td>
                  <td className="p-1.5 text-right space-x-1">
                    <button
                      type="button"
                      onClick={() => onSelectEpochA(idx)}
                      disabled={idx === epochBIdx}
                      className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 text-[10px] disabled:opacity-20 cursor-pointer"
                    >
                      Set A
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectEpochB(idx)}
                      disabled={idx === epochAIdx}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 text-[10px] disabled:opacity-20 cursor-pointer"
                    >
                      Set B
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
