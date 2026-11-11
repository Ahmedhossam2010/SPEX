import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Sparkles,
  X,
  Send,
  Loader2,
  HelpCircle,
  Compass,
  ArrowRight,
  Maximize2,
  Volume2,
} from 'lucide-react';
import { Language } from '../../utils/translations';
import { SpexPortrait } from '../../spex/SpexPortrait';
import { SPEXMood } from '../../spex/spexAssets';
import { CandidateDetection, InvestigationResult } from '../../science/types';

export interface SpexCompanionProps {
  currentResult: InvestigationResult | null;
  activeLens: 'time' | 'colors' | 'doubt' | 'neighbors' | null;
  currentFrameIdx: number;
  isCurtainActive: boolean;
  selectedCandidate: CandidateDetection | null;
  selectedFlagPixel: { x: number; y: number; flag: number } | null;
  language: Language;
  onOpenTour: () => void;
  onHighlightElement?: (targetId: string) => void;
  onOpenScientistMode?: () => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'spex';
  text: string;
  mood?: SPEXMood;
  action?: string | null;
  timestamp: Date;
}

export const SpexCompanion: React.FC<SpexCompanionProps> = ({
  currentResult,
  activeLens,
  currentFrameIdx,
  isCurtainActive,
  selectedCandidate,
  selectedFlagPixel,
  language,
  onOpenTour,
  onHighlightElement,
  onOpenScientistMode,
  className = '',
}) => {
  const isRtl = language === 'ar';

  // Chat window open/closed
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentMood, setCurrentMood] = useState<SPEXMood>('greeting');

  // Proactive suggestion bubble state
  const [proactiveBubble, setProactiveBubble] = useState<{
    text: string;
    mood: SPEXMood;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Track event triggers so proactive tips only show once per context
  const shownTipsRef = useRef<Set<string>>(new Set());
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Target name and metadata
  const targetName = currentResult?.title || "Target";
  const cadenceSec = currentResult?.compatibility?.startToStartCadenceSec ?? 128.9;

  // Initial welcome greeting on first render
  useEffect(() => {
    if (!shownTipsRef.current.has('welcome')) {
      shownTipsRef.current.add('welcome');
      const timer = setTimeout(() => {
        setProactiveBubble({
          text: isRtl
            ? 'أهلاً! أنا SPEX. هساعدك تستكشف سماء SPHEREx وتفهم إيه اللي اتغير فيها. تحب نعمل جولة سريعة؟'
            : "Welcome! I'm SPEX. I'll help you explore the SPHEREx sky and uncover changes. Want a quick tour?",
          mood: 'greeting',
          actionLabel: isRtl ? 'ابدأ الجولة' : 'Start Tour',
          onAction: onOpenTour,
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isRtl, onOpenTour]);

  // Contextual proactive tip on lens change
  useEffect(() => {
    if (!activeLens) return;
    const key = `lens_${activeLens}`;
    if (shownTipsRef.current.has(key)) return;
    shownTipsRef.current.add(key);

    let text = '';
    let mood: SPEXMood = 'explaining';

    if (activeLens === 'time') {
      text = isRtl
        ? 'عدسة الزمن بتعرض لقطات تفصل بينها 2.1 دقيقة! اسحب الستارة أو شغل المقارنة التلقائية.'
        : 'The TIME lens shows exposures ~2.1 minutes apart! Try dragging the curtain or playing the blinker.';
      mood = 'explaining';
    } else if (activeLens === 'colors') {
      text = isRtl
        ? 'هنا بنشوف الكون بـ 102 طول موجي تحت حمراء بتخترق الغبار وتكشف الأجرام الباردة.'
        : 'Here we view the sky across 102 infrared channels, penetrating dust and uncovering cool brown dwarfs.';
      mood = 'discovery';
    } else if (activeLens === 'doubt') {
      text = isRtl
        ? 'عدسة الشك بتفحص بكسلات الكاشف عشان نتأكد إن الإشارة مش شائبة أو أشعة كونية.'
        : 'The DOUBT lens inspects detector flags to verify signals are genuine celestial objects rather than artifacts.';
      mood = 'investigator';
    } else if (activeLens === 'neighbors') {
      text = isRtl
        ? 'الدوائر دي بتمثل نجوم كتالوج غايا ووايز لمطابقة المواقع الفلكية وحركتها.'
        : 'These circles overlay Gaia DR3 and AllWISE catalog sources to verify astrometry and proper motion.';
      mood = 'explaining';
    }

    if (text) {
      setProactiveBubble({ text, mood });
    }
  }, [activeLens, isRtl]);

  // Contextual proactive tip when candidate is selected
  useEffect(() => {
    if (!selectedCandidate) return;
    const key = `cand_${selectedCandidate.id}`;
    if (shownTipsRef.current.has(key)) return;
    shownTipsRef.current.add(key);

    const isArtifact = selectedCandidate.status === 'Possible artifact';
    const text = isRtl
      ? isArtifact
        ? `المرشح ${selectedCandidate.id} تم استبعاده بسبب تشبع المستشعر؛ ده عيب جهاز مش اكتشاف فلكي.`
        : `رصدنا مرشحًا يظهر فارقًا بدلالة ${selectedCandidate.peakSignificance.toFixed(1)}σ! تعال نفحص دليله سوا.`
      : isArtifact
      ? `Candidate ${selectedCandidate.id} is flagged as an instrumental saturation glitch rather than true variability.`
      : `Detected a candidate showing flux variation at ${selectedCandidate.peakSignificance.toFixed(1)}σ! Want to examine the evidence together?`;

    setProactiveBubble({
      text,
      mood: isArtifact ? 'sassy' : 'eureka',
      actionLabel: isRtl ? 'اسأل سبيكس' : 'Ask SPEX',
      onAction: () => {
        setIsOpen(true);
        handleSendMessage(isRtl ? `احكيلي عن المرشح ${selectedCandidate.id}` : `Tell me about candidate ${selectedCandidate.id}`);
      },
    });
  }, [selectedCandidate, isRtl]);

  // Contextual proactive tip when flagged pixel is tapped
  useEffect(() => {
    if (!selectedFlagPixel) return;
    const isOverflow = (selectedFlagPixel.flag & 0x02) !== 0;
    const text = isRtl
      ? `البكسل ده سجل علامة جودة (${isOverflow ? 'تشبع مستشعر' : 'أشعة كونية'})! مش تغير فلكي حقيقي يا هندسة.`
      : `This pixel has a quality flag (${isOverflow ? 'sensor saturation' : 'cosmic ray'})! It is an instrumental artifact.`;

    setProactiveBubble({
      text,
      mood: 'sassy',
    });
  }, [selectedFlagPixel, isRtl]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Send message to server AI endpoint
  const handleSendMessage = async (textToSend?: string) => {
    const q = (textToSend || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
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
            targetCoords: currentResult?.targetCoords,
            activeLens,
            activeBand: `Band ${activeLens === 'colors' ? 'Active' : '1'}`,
            selectedObservation: currentFrameIdx === 2 ? 'Difference' : `Visit ${currentFrameIdx + 1}`,
            cadenceSeconds: cadenceSec,
            selectedCandidate: selectedCandidate ? selectedCandidate.id : null,
            selectedFlagPixel,
            isCurtainActive,
          },
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const spexMood = (data.mood || 'explaining') as SPEXMood;
      setCurrentMood(spexMood);

      const spexMsg: ChatMessage = {
        id: `spx-${Date.now()}`,
        sender: 'spex',
        text: data.reply || (isRtl ? 'كل الأنظمة تعمل بكفاءة.' : 'All systems nominal.'),
        mood: spexMood,
        action: data.action || null,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, spexMsg]);

      // If reply contains an action, trigger visual highlighting of that element!
      if (data.action && onHighlightElement) {
        onHighlightElement(data.action);
      }
    } catch (err) {
      const fallbackMsg: ChatMessage = {
        id: `spx-${Date.now()}`,
        sender: 'spex',
        text: isRtl
          ? 'البيانات الحقيقية لرصدات SPHEREx QR2 تفصل بينها 2.1 دقيقة بدقة قياس عالية للأشعة تحت الحمراء لتحديد التغيرات الحقيقية واستبعاد عيوب الأجهزة.'
          : 'SPHEREx QR2 observations are separated by ~2.1 minutes in calibrated infrared, enabling precise proper motion tracking while ruling out detector saturation artifacts.',
        mood: 'explaining',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ============================================================== */}
      {/* PERSISTENT FLOATING SPEX MASCOT & PROACTIVE SPEECH BUBBLE */}
      {/* ============================================================== */}
      <div
        className={`fixed bottom-4 sm:bottom-6 z-40 flex flex-col gap-2.5 pointer-events-auto ${
          isRtl ? 'right-4 sm:right-6 items-end' : 'left-4 sm:left-6 items-start'
        } ${className}`}
      >
        {/* Proactive Speech Bubble (Floats cleanly ABOVE the mascot button) */}
        {proactiveBubble && !isOpen && (
          <div
            className={`w-72 sm:w-80 bg-[#0C0E14]/95 backdrop-blur-xl border border-[#FFB900]/40 rounded-2xl p-3 sm:p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] text-slate-100 space-y-2 animate-scale-in ${
              isRtl ? 'origin-bottom-right' : 'origin-bottom-left'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#FFB900] font-bold uppercase">
                <Sparkles className="w-3 h-3" />
                <span>SPEX GUIDE</span>
              </div>
              <button
                type="button"
                onClick={() => setProactiveBubble(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer"
                title={isRtl ? 'إغلاق التنبيه' : 'Dismiss tip'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-200 leading-snug font-sans">
              {proactiveBubble.text}
            </p>

            <div className="flex items-center justify-between gap-2 pt-1">
              {proactiveBubble.actionLabel && (
                <button
                  type="button"
                  onClick={() => {
                    if (proactiveBubble.onAction) proactiveBubble.onAction();
                    setProactiveBubble(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#FFB900] hover:bg-amber-400 text-slate-950 text-[11px] font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>{proactiveBubble.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(true);
                  setProactiveBubble(null);
                }}
                className="text-[11px] font-mono text-[#00D3F3] hover:underline cursor-pointer ml-auto"
              >
                {isRtl ? 'تحدث مع سبيكس' : 'Chat with SPEX'}
              </button>
            </div>
          </div>
        )}

        {/* Persistent Floating SPEX Mascot Avatar Button */}
        <button
          type="button"
          data-tour="spex_companion"
          onClick={() => {
            setIsOpen(!isOpen);
            setProactiveBubble(null);
          }}
          className={`group relative p-1.5 sm:p-2 rounded-2xl bg-gradient-to-b from-[#141824] to-[#07090E] border-2 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.8)] cursor-pointer select-none hover:scale-105 active:scale-95 ${
            isOpen
              ? 'border-[#00D3F3] shadow-[0_0_24px_rgba(0,211,243,0.4)]'
              : 'border-[#FFB900]/50 hover:border-[#FFB900] shadow-[0_0_20px_rgba(255,185,0,0.25)]'
          }`}
          title={isRtl ? 'المرافق الفلكي الذكي SPEX' : 'SPEX Intelligent Space Cat Companion'}
        >
          {/* Subtle Breathing Glow Ring */}
          <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#FFB900]/20 to-[#00D3F3]/20 blur-xs group-hover:opacity-100 opacity-60 transition-opacity" />

          {/* Authentic SPEX Egyptian Mechanical Cat Avatar */}
          <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden flex items-center justify-center">
            <SpexPortrait mood={currentMood} size={48} className="w-full h-full object-contain" />
          </div>

          {/* Active Status Badge */}
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0C0E14] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        </button>
      </div>

      {/* ============================================================== */}
      {/* INTERACTIVE SPEX CHAT PANEL (Responsive Drawer / Window) */}
      {/* ============================================================== */}
      {isOpen && (
        <div
          className={`fixed bottom-24 sm:bottom-20 z-50 w-[92vw] sm:w-[420px] max-h-[580px] h-[520px] bg-[#0C0E14]/98 backdrop-blur-2xl border border-[#FFB900]/40 rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden text-slate-100 animate-slide-up ${
            isRtl ? 'right-4 sm:right-6' : 'left-4 sm:left-6'
          }`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="shrink-0 h-14 bg-white/5 border-b border-white/10 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FFB900]/20 border border-[#FFB900]/40 p-0.5 flex items-center justify-center shrink-0">
                <SpexPortrait mood={currentMood} size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-1.5">
                  <span>SPEX</span>
                  <span className="text-[10px] text-[#FFB900] font-normal uppercase tracking-wider">
                    {isRtl ? 'المرشد الفلكي' : 'AI Companion'}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                  {targetName} ({cadenceSec.toFixed(1)}s cadence)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenTour}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#FFB900] hover:bg-white/10 transition cursor-pointer text-xs font-mono"
                title={isRtl ? 'جولة توضيحية' : 'Start Tour'}
              >
                <Compass className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title={isRtl ? 'إغلاق' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation History */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 font-sans text-xs sm:text-sm">
            {/* Friendly Greeting Message if no history */}
            {messages.length === 0 && (
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 text-slate-200">
                <div className="flex items-center gap-2 text-[#FFB900] font-mono text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'أهلاً بيك يا باشا!' : 'Welcome Explorer!'}</span>
                </div>
                <p className="leading-relaxed">
                  {isRtl
                    ? `أنا SPEX، رفيقك الفلكي في استكشاف ${targetName}. اسألني عن أي حاجة شاغل بالك في الصورة أو دوس على أحد الأسئلة المقترحة!`
                    : `I am SPEX, your astrophysics guide for ${targetName}. Ask me anything about this sky field, or tap any suggestion below!`}
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'spex' && (
                  <div className="w-7 h-7 rounded-lg bg-[#FFB900]/20 border border-[#FFB900]/30 p-0.5 shrink-0">
                    <SpexPortrait mood={m.mood || 'explaining'} size={24} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#FFB900] text-slate-950 font-medium rounded-br-xs'
                      : 'bg-white/10 text-slate-100 border border-white/10 rounded-bl-xs'
                  }`}
                >
                  <p>{m.text}</p>
                  {m.action && onHighlightElement && (
                    <button
                      type="button"
                      onClick={() => onHighlightElement(m.action!)}
                      className="mt-2 text-[11px] font-mono text-[#00D3F3] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isRtl ? '👈 وريني المكان في الموقع!' : '👈 Point me to this control!'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 text-xs text-amber-300 font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-[#FFB900]" />
                <span>{isRtl ? 'سبيكس يحلل بيانات SPHEREx...' : 'SPEX is analyzing telescope data...'}</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Contextual Question Chips */}
          <div className="shrink-0 px-3 py-2 bg-black/40 border-t border-white/5 overflow-x-auto flex gap-1.5 no-scrollbar">
            {[
              isRtl ? 'إزاي أقارن الصورتين؟' : 'How do I compare images?',
              isRtl ? 'فين أشوف الألوان الخفية؟' : 'Where are hidden colors?',
              isRtl ? 'يعني إيه عدسة الشك؟' : 'What is the DOUBT lens?',
              isRtl ? 'مين الجيران في الكتالوج؟' : 'Who are the neighbors?',
              isRtl ? 'إزاي أعمل كارت اكتشاف؟' : 'How do I make a postcard?',
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="shrink-0 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#FFB900]/20 hover:text-[#FFB900] text-slate-300 border border-white/10 transition cursor-pointer whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Custom Message Input */}
          <div className="shrink-0 p-3 bg-black/60 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              placeholder={isRtl ? 'اكتب سؤالك لسبيكس...' : 'Ask SPEX anything about this sky...'}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#FFB900]"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputQuery.trim()}
              className="p-2.5 rounded-xl bg-[#FFB900] hover:bg-amber-400 text-slate-950 font-bold transition disabled:opacity-40 cursor-pointer"
              title={isRtl ? 'إرسال' : 'Send'}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
