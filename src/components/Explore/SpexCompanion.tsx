import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Compass,
  ArrowRight,
  BookOpen,
  Minus,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Language, translations } from '../../utils/translations';
import { SpexPortrait } from '../../spex/SpexPortrait';
import { SPEXMood } from '../../spex/spexAssets';
import { CandidateDetection, InvestigationResult } from '../../science/types';
import { TimeSeriesResponse } from '../TimeLens/FramePlayer';
import { unlockAchievement } from '../../progress/progressStore';

export interface ExploreStoryState {
  pickedStar: boolean;
  watchedBlink: boolean;
  spottedMover: boolean;
  checkedTelescopes: boolean;
  sharedResult: boolean;
}

export interface SpexCompanionProps {
  currentResult: InvestigationResult | null;
  timeSeriesMeta?: TimeSeriesResponse | null;
  targetName?: string;
  storyState?: ExploreStoryState;
  activeLens: 'time' | 'colors' | 'doubt' | 'neighbors' | null;
  currentFrameIdx: number;
  isCurtainActive: boolean;
  selectedCandidate: CandidateDetection | null;
  selectedFlagPixel: { x: number; y: number; flag: number } | null;
  language: Language;
  onOpenTour: () => void;
  onHighlightElement?: (targetId: string) => void;
  onOpenScientistMode?: () => void;
  onOpenDictionary?: (termId?: string) => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'spex';
  text: string;
  mood?: SPEXMood;
  action?: string | null;
}

export const SpexCompanion: React.FC<SpexCompanionProps> = ({
  currentResult,
  timeSeriesMeta,
  targetName: propTargetName,
  storyState,
  activeLens,
  currentFrameIdx,
  isCurtainActive,
  selectedCandidate,
  selectedFlagPixel,
  language,
  onOpenTour,
  onHighlightElement,
  onOpenDictionary,
  className = '',
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return true;
    return false;
  });
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentMood, setCurrentMood] = useState<SPEXMood>('greeting');

  const [proactiveBubble, setProactiveBubble] = useState<{
    text: string;
    mood: SPEXMood;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const shownTipsRef = useRef<Set<string>>(new Set());
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const targetName = propTargetName || currentResult?.title || 'SPHEREx Sky Patch';
  const aSum = timeSeriesMeta?.astrometrySummary;
  const completedStepsCount = storyState
    ? [
        storyState.pickedStar,
        storyState.watchedBlink,
        storyState.spottedMover,
        storyState.checkedTelescopes,
        storyState.sharedResult,
      ].filter(Boolean).length
    : 0;

  // Award XP once when all 5 story milestones complete
  useEffect(() => {
    if (completedStepsCount === 5) {
      unlockAchievement('spex_story_complete', 20, undefined, 'solving');
    }
  }, [completedStepsCount]);

  // Grounded welcome / verdict bubble when target loads
  useEffect(() => {
    if (!timeSeriesMeta?.frames?.length) return;
    const key = `verdict_${targetName}_${timeSeriesMeta.frames.length}_${aSum?.measuredDisplacementArcsec ?? 'x'}`;
    if (shownTipsRef.current.has(key)) return;
    shownTipsRef.current.add(key);

    if (aSum) {
      const sig =
        aSum.sigma ??
        (aSum.measuredDisplacementErrorArcsec > 0
          ? aSum.measuredDisplacementArcsec / aSum.measuredDisplacementErrorArcsec
          : 0);
      if (aSum.motionSignificant) {
        setProactiveBubble({
          text: isRtl
            ? `في ${targetName}: قسنا حركة ${aSum.measuredDisplacementArcsec.toFixed(2)}″ (${sig.toFixed(1)}σ) عبر ${timeSeriesMeta.frames.length} لقطات! اضغط تشغيل لمشاهدتها.`
            : `${targetName}: measured ${aSum.measuredDisplacementArcsec.toFixed(2)}″ drift (${sig.toFixed(1)}σ) across ${timeSeriesMeta.frames.length} frames. Press Play to watch it move!`,
          mood: 'eureka',
          actionLabel: t.tourReplayBtn,
          onAction: onOpenTour,
        });
      } else {
        setProactiveBubble({
          text: isRtl
            ? `${targetName}: الإزاحة المقاسة ${aSum.measuredDisplacementArcsec.toFixed(2)}″ ± ${aSum.measuredDisplacementErrorArcsec.toFixed(2)}″ (${sig.toFixed(1)}σ) — الحركة غير دالة إحصائياً حتى الآن.`
            : `${targetName}: measured ${aSum.measuredDisplacementArcsec.toFixed(2)}″ ± ${aSum.measuredDisplacementErrorArcsec.toFixed(2)}″ (${sig.toFixed(1)}σ) — motion not significant yet.`,
          mood: 'explaining',
        });
      }
    } else {
      setProactiveBubble({
        text: isRtl
          ? `مرحباً! أنا سبيكس. اضغط تشغيل لتقليب لقطات ${targetName} الحقيقية أو اسألني أي شيء.`
          : `Hi! I'm SPEX. Press Play to blink real ${targetName} frames or ask me about any star here.`,
        mood: 'greeting',
        actionLabel: t.tourReplayBtn,
        onAction: onOpenTour,
      });
    }
  }, [timeSeriesMeta, targetName, aSum, isRtl, onOpenTour, t.tourReplayBtn]);

  // React to story milestones
  useEffect(() => {
    if (!storyState) return;
    if (storyState.watchedBlink && !shownTipsRef.current.has('story_blink')) {
      shownTipsRef.current.add('story_blink');
      setCurrentMood('discovery');
      setProactiveBubble({
        text: isRtl
          ? 'ممتاز! شاهدت النجوم الخلفية ثابتة. الآن تفقد التلسكوبات الأخرى أو فحص التغير في لوحة متقدم.'
          : 'Nice! Background stars stay put while time flips. Try Other telescopes next!',
        mood: 'discovery',
      });
    }
  }, [storyState?.watchedBlink, isRtl]);

  useEffect(() => {
    if (!storyState?.checkedTelescopes) return;
    if (!shownTipsRef.current.has('story_tel')) {
      shownTipsRef.current.add('story_tel');
      setCurrentMood('proud');
      setProactiveBubble({
        text: isRtl
          ? 'قارنت الآن بين SPHEREx و Gaia/AllWISE! شارك نتيجتك لإتمام قصة الاستكشاف.'
          : 'You compared SPHEREx against Gaia / AllWISE! Share your view to finish the exploration story.',
        mood: 'proud',
      });
    }
  }, [storyState?.checkedTelescopes, isRtl]);

  useEffect(() => {
    if (!selectedFlagPixel) return;
    const isOverflow = (selectedFlagPixel.flag & 0x02) !== 0;
    setProactiveBubble({
      text: isRtl
        ? `هذا البكسل يحمل علم جودة (${isOverflow ? 'تشبع مستشعر' : 'شعاع كوني'}) وليس نجماً متحركاً.`
        : `This pixel has a quality flag (${isOverflow ? 'saturation' : 'cosmic ray'}) rather than astrophysical motion.`,
      mood: 'sassy',
    });
  }, [selectedFlagPixel, isRtl]);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const buildLocalGroundedFallback = (): string => {
    if (aSum) {
      const sig =
        aSum.sigma ??
        (aSum.measuredDisplacementErrorArcsec > 0
          ? aSum.measuredDisplacementArcsec / aSum.measuredDisplacementErrorArcsec
          : 0);
      return isRtl
        ? `للهدف ${targetName}: الإزاحة المقاسة ${aSum.measuredDisplacementArcsec.toFixed(2)}″ ± ${aSum.measuredDisplacementErrorArcsec.toFixed(2)}″ (${sig.toFixed(2)}σ). استخدم زر التشغيل والشريط الزمني أسفل الصورة، وقارن مع Gaia و AllWISE من اللوحة اليمنى.`
        : `For ${targetName}: measured offset is ${aSum.measuredDisplacementArcsec.toFixed(2)}″ ± ${aSum.measuredDisplacementErrorArcsec.toFixed(2)}″ (${sig.toFixed(2)}σ). Use Play and the bottom date timeline, then toggle Gaia/AllWISE/Aladin on the right panel.`;
    }
    return isRtl
      ? `استخدم زر التشغيل أسفل الشاشة لتقليب لقطات ${targetName} عبر الزمن، وقارن مواقع النجوم مع فهارس Gaia DR3 و AllWISE.`
      : `Use Play at the bottom to flip ${targetName} across dates, and toggle Gaia DR3 / AllWISE / Aladin in Telescopes to verify neighbors.`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const q = (textToSend || inputQuery).trim();
    if (!q || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { id: `usr-${Date.now()}`, sender: 'user', text: q },
    ]);
    setInputQuery('');
    setIsLoading(true);
    setProactiveBubble(null);

    try {
      const res = await fetch('/api/spex/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: q,
          language,
          evidence: currentResult?.evidence,
          context: {
            targetName,
            targetCoords: timeSeriesMeta?.targetCoords || currentResult?.targetCoords,
            activeLens,
            selectedObservation: `Frame ${currentFrameIdx + 1}`,
            cadenceSeconds: currentResult?.compatibility?.startToStartCadenceSec ?? 128.9,
            selectedCandidate: selectedCandidate ? selectedCandidate.id : null,
            selectedFlagPixel,
            isCurtainActive,
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const spexMood = (json.mood || 'explaining') as SPEXMood;
      setCurrentMood(spexMood);
      setMessages((prev) => [
        ...prev,
        {
          id: `spx-${Date.now()}`,
          sender: 'spex',
          text: json.reply || buildLocalGroundedFallback(),
          mood: spexMood,
          action: json.action || null,
        },
      ]);
      if (json.action && onHighlightElement) {
        onHighlightElement(json.action);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `spx-${Date.now()}`,
          sender: 'spex',
          text: buildLocalGroundedFallback(),
          mood: 'explaining',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isMinimized) {
    return (
      <div
        className={`fixed bottom-[17rem] sm:bottom-44 z-40 pointer-events-none ${isRtl ? 'right-3' : 'left-3'} ${className}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <button
          type="button"
          data-testid="spex-restore-btn"
          onClick={() => setIsMinimized(false)}
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#090F1E]/90 backdrop-blur-xl border border-[#FFB900]/45 text-amber-200 hover:bg-[#101933] shadow-lg text-xs font-semibold cursor-pointer transition"
          aria-label={t.spexRestore}
          title={t.spexRestore}
        >
          <SpexPortrait mood={currentMood} size={20} />
          <span>{t.spexRestore}</span>
          {storyState && (
            <span className="font-mono text-[10px] text-sky-300 tabular-nums">
              {completedStepsCount}/5
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40" dir={isRtl ? 'rtl' : 'ltr'}>
      <div
        className={`fixed bottom-[17rem] sm:bottom-44 flex flex-col gap-2 pointer-events-none ${
          isRtl ? 'right-3 sm:right-5 items-end' : 'left-3 sm:left-5 items-start'
        } ${className}`}
      >
        {proactiveBubble && !isOpen && (
          <div className="pointer-events-auto w-64 sm:w-72 bg-[#070B16]/90 backdrop-blur-xl border border-[#FFB900]/40 rounded-2xl p-3 shadow-2xl text-slate-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#FFB900] font-bold uppercase">
                <Sparkles className="w-3 h-3" />
                <span>SPEX</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="spex-minimize-btn"
                  onClick={() => setIsMinimized(true)}
                  className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
                  aria-label={t.spexMinimize}
                  title={t.spexMinimize}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setProactiveBubble(null)}
                  className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
                  aria-label="Dismiss tip"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-snug">{proactiveBubble.text}</p>

            {storyState && (
              <div className="pt-1 border-t border-white/10 flex flex-wrap gap-1 text-[10px] font-mono">
                {[
                  { done: storyState.pickedStar, label: t.spexStoryStep1 },
                  { done: storyState.watchedBlink, label: t.spexStoryStep2 },
                  { done: storyState.spottedMover, label: t.spexStoryStep3 },
                  { done: storyState.checkedTelescopes, label: t.spexStoryStep4 },
                  { done: storyState.sharedResult, label: t.spexStoryStep5 },
                ].map((s, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                      s.done
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {s.done ? (
                      <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                    ) : (
                      <Circle className="w-2.5 h-2.5 shrink-0" />
                    )}
                    <span>{s.label}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-0.5">
              {proactiveBubble.actionLabel && proactiveBubble.onAction && (
                <button
                  type="button"
                  onClick={() => {
                    proactiveBubble.onAction?.();
                    setProactiveBubble(null);
                  }}
                  className="px-2 py-1 rounded-lg bg-[#FFB900] hover:bg-amber-400 text-slate-950 text-[11px] font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>{proactiveBubble.actionLabel}</span>
                  <ArrowRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(true);
                  setProactiveBubble(null);
                }}
                className="text-[11px] font-mono text-[#00D3F3] hover:underline cursor-pointer ms-auto"
              >
                {t.spexRestore}
              </button>
            </div>
          </div>
        )}

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            data-tour="spex_companion"
            onClick={() => {
              setIsOpen((prev) => !prev);
              setProactiveBubble(null);
            }}
            className={`group relative p-1.5 rounded-2xl bg-[#0B1020]/90 backdrop-blur-xl border-2 transition cursor-pointer shadow-xl ${
              isOpen ? 'border-[#00D3F3]' : 'border-[#FFB900]/55 hover:border-[#FFB900]'
            }`}
            title={t.spexRestore}
            aria-label={t.spexRestore}
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
              <SpexPortrait mood={currentMood} size={40} className="w-full h-full object-contain" />
            </div>
          </button>

          {!proactiveBubble && !isOpen && (
            <button
              type="button"
              data-testid="spex-minimize-btn"
              onClick={() => setIsMinimized(true)}
              aria-label={t.spexMinimize}
              title={t.spexMinimize}
              className="p-1.5 rounded-lg bg-[#070B16]/85 border border-white/15 text-slate-400 hover:text-white cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className={`pointer-events-auto fixed bottom-40 sm:bottom-40 z-50 w-[calc(100vw-1.5rem)] sm:w-[390px] max-h-[500px] h-[440px] bg-[#070B16]/95 backdrop-blur-2xl border border-[#FFB900]/45 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 ${
            isRtl ? 'right-3 sm:right-5' : 'left-3 sm:left-5'
          }`}
        >
          <div className="shrink-0 h-12 bg-white/5 border-b border-white/10 px-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <SpexPortrait mood={currentMood} size={26} />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-100 truncate">{targetName}</div>
                <div className="text-[10px] font-mono text-amber-300">
                  {t.spexStoryBadge}: {completedStepsCount}/5
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onOpenDictionary && (
                <button
                  type="button"
                  onClick={() => onOpenDictionary()}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-white/10 cursor-pointer"
                  aria-label="Space Dictionary"
                  title="Space Dictionary"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenTour}
                className="p-1.5 rounded-lg text-slate-300 hover:text-[#FFB900] hover:bg-white/10 cursor-pointer"
                aria-label={t.tourReplayBtn}
                title={t.tourReplayBtn}
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(true);
                }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label={t.spexMinimize}
                title={t.spexMinimize}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 text-xs">
            {messages.length === 0 && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 leading-relaxed">
                {buildLocalGroundedFallback()}
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'spex' && <SpexPortrait mood={m.mood || 'explaining'} size={22} />}
                <div
                  className={`max-w-[84%] rounded-2xl px-3 py-2 leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#FFB900] text-slate-950 font-medium'
                      : 'bg-white/10 text-slate-100 border border-white/10'
                  }`}
                >
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 text-amber-300 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <div className="shrink-0 p-2.5 bg-black/50 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              placeholder={t.spexGuideInputPlaceholder}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#FFB900]"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputQuery.trim()}
              aria-label="Send"
              className="p-2 rounded-xl bg-[#FFB900] hover:bg-amber-400 text-slate-950 disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
