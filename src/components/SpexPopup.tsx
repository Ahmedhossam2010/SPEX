import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  Minimize2,
  Sparkles,
  FastForward,
} from 'lucide-react';
import { SPEX_ASSETS, SPEXMood } from '../spex/spexAssets';
import { CandidateDetection, InvestigationResult } from '../science/types';
import { Language, translations } from '../utils/translations';

interface ChatMessage {
  id: string;
  role: 'user' | 'spex';
  fullText: string;
  displayedText: string;
  isRevealing?: boolean;
  mood?: SPEXMood;
  timestamp: string;
}

interface SpexPopupProps {
  currentResult: InvestigationResult | null;
  selectedCandidate: CandidateDetection | null;
  language: Language;
}

export const SpexPopup: React.FC<SpexPopupProps> = React.memo(({
  currentResult,
  selectedCandidate,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [currentMood, setCurrentMood] = useState<SPEXMood>('explaining');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any progressive timer on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  // Progressive sentence-by-sentence reveal helper
  const addProgressiveSpexMessage = (text: string, mood: SPEXMood) => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);

    // Split into sentences
    const rawSentences = text.match(/[^.!?؟\n]+[.!?؟\n]+|[^.!?؟\n]+$/g) || [text];
    const sentences = rawSentences.map((s) => s.trim()).filter(Boolean);

    const messageId = `spex-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (sentences.length <= 1) {
      // Single sentence: display directly
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: 'spex',
          fullText: text,
          displayedText: text,
          isRevealing: false,
          mood,
          timestamp,
        },
      ]);
      return;
    }

    // First sentence visible immediately
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        role: 'spex',
        fullText: text,
        displayedText: sentences[0],
        isRevealing: true,
        mood,
        timestamp,
      },
    ]);

    // Progressive second sentence after 450ms
    revealTimerRef.current = setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, displayedText: text, isRevealing: false }
            : m
        )
      );
    }, 450);
  };

  const handleSkipReveal = (msgId: string) => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, displayedText: m.fullText, isRevealing: false } : m
      )
    );
  };

  // Synchronize initial SPEX briefing when observation case changes
  useEffect(() => {
    if (!currentResult) return;

    let initialMood: SPEXMood = 'explaining';
    let greeting = '';

    if (currentResult.evidence.classification === 'SIGNIFICANT CHANGE DETECTED') {
      initialMood = 'eureka';
      greeting =
        language === 'ar'
          ? `رصدنا تغير تدفق حقيقي بنسبة S/N = ${Math.abs(currentResult.evidence.maxSignificance).toFixed(1)}σ عبر ${currentResult.compatibility.timeBaselineDays.toFixed(1)} يوم بدون تشبع. اسألني عن قياسات التدفق وتطابق Gaia DR3!`
          : `Verified astrophysical flux excursion at S/N = ${Math.abs(currentResult.evidence.maxSignificance).toFixed(1)}σ across ${currentResult.compatibility.timeBaselineDays.toFixed(1)} days. Ask me about the aperture flux and Gaia cross-match!`;
    } else if (currentResult.evidence.classification === 'NO SIGNIFICANT CHANGE DETECTED') {
      initialMood = 'serious';
      greeting =
        language === 'ar'
          ? `السماء هنا مستقرة تمامًا وتتطابق الفروق مع الضوضاء الطبيعية للأجهزة. ده معيار استقرار أساسي لمعايرة سماء SPHEREx.`
          : `Photometric baseline verified stable across ${currentResult.compatibility.timeBaselineDays.toFixed(1)} days. Difference residuals are strictly consistent with the Gaussian noise floor.`;
    } else if (currentResult.evidence.classification === 'POSSIBLE ARTIFACT') {
      initialMood = 'sassy';
      greeting =
        language === 'ar'
          ? `دي إشارة تشويش مستشعر تم استبعادها بالـQuality Bitmask وفحص الـDipole. مفيش أي اكتشاف وهمي هنا يا باشا.`
          : `Signal flagged and disqualified as an instrumental artifact. Saturated detector core and pointing jitter were cleanly filtered out.`;
    } else {
      initialMood = 'investigator';
      greeting = currentResult.evidence.summaryProse;
    }

    setCurrentMood(initialMood);
    setMessages([
      {
        id: 'initial-greeting',
        role: 'spex',
        fullText: greeting,
        displayedText: greeting,
        isRevealing: false,
        mood: initialMood,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (!isOpen) {
      setUnreadCount(1);
    }
  }, [currentResult?.caseId, language]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (msgToSend?: string) => {
    const text = (msgToSend || inputText).trim();
    if (!text || !currentResult || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      fullText: text,
      displayedText: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/spex/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          evidence: currentResult.evidence,
          topCandidate: selectedCandidate || currentResult.candidates[0] || null,
          provenance: currentResult.provenance,
          compatibility: currentResult.compatibility,
          targetCoords: currentResult.targetCoords,
          lang: language,
        }),
      });

      const data = await res.json();
      const mood = (data.mood as SPEXMood) || 'explaining';
      setCurrentMood(mood);
      addProgressiveSpexMessage(data.reply, mood);
    } catch (err: any) {
      console.error('SPEX AI response error:', err);
      const fallbackReply =
        language === 'ar'
          ? 'الاتصال واجه تأخير بسيط؛ البيانات الحسابية كلها دقيقة ومعروضة في الجدول أمامك.'
          : 'Telemetry link jittered briefly; computed values remain fully visible in the science deck.';
      addProgressiveSpexMessage(fallbackReply, 'thinking');
    } finally {
      setIsThinking(false);
    }
  };

  const quickChips =
    language === 'ar'
      ? [
          'ما هو الدليل الإحصائي؟',
          'هل تم فحص الـ Artifacts؟',
          'اشرح قياس الـ Photometry',
          'تطابق Gaia DR3',
        ]
      : [
          'Statistical significance?',
          'Was this an artifact?',
          'Aperture photometry?',
          'Gaia DR3 match?',
        ];

  return (
    <>
      {/* =========================================================================
          SPEX COMPACT FLOATING LAUNCHER (BOTTOM-RIGHT, NON-INTRUSIVE)
          ========================================================================= */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0);
          }}
          className="fixed bottom-16 right-3 md:bottom-5 md:right-5 z-40 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full border border-white/15 bg-[#030712]/85 hover:bg-[#060c1d]/95 backdrop-blur-2xl text-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.7)] hover:border-amber-400/50 transition-all hover:scale-105 active:scale-95 group"
          title="Open SPEX AI Companion"
        >
          <div className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-sky-500/20 flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            <img
              src={SPEX_ASSETS[currentMood]?.imagePath || SPEX_ASSETS.explaining.imagePath}
              alt={currentMood}
              className="w-full h-full object-cover"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-[#030712] shadow-[0_0_5px_#34d399]" />
          </div>

          <div className="text-left font-mono pr-1">
            <div className="flex items-center gap-1.5">
              <span className="font-['Outfit'] text-xs font-bold tracking-wide text-amber-300">
                {t.spexTitle}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-semibold uppercase hidden xs:inline-block">
                {currentMood}
              </span>
            </div>
          </div>

          {unreadCount > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>
      )}

      {/* =========================================================================
          EXPANDABLE FLOATING LIQUID-GLASS CHAT PANEL
          ========================================================================= */}
      {isOpen && (
        <div
          className={`fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-5 sm:bottom-5 z-50 sm:w-[380px] max-h-[82dvh] sm:max-h-[75vh] h-[490px] flex flex-col rounded-3xl border border-white/20 bg-[#030712]/90 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden select-text ${
            isRtl ? 'font-cairo' : 'font-sans'
          }`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Subtle Ambient Space Gradient Glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-2xl overflow-hidden border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-sky-500/20 shadow-[0_0_12px_rgba(245,158,11,0.25)] flex-shrink-0">
                <img
                  src={SPEX_ASSETS[currentMood]?.imagePath || SPEX_ASSETS.explaining.imagePath}
                  alt={currentMood}
                  className="w-full h-full object-cover"
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-[#030712] shadow-[0_0_5px_#34d399]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-['Outfit'] text-xs font-bold tracking-wide text-slate-100">
                    {t.spexTitle}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-semibold uppercase">
                    {currentMood}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] sm:max-w-[180px]">
                  {t.spexRole}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
              title="Minimize SPEX"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Conversation Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-2.5 sm:space-y-3 scrollbar-thin scrollbar-thumb-white/10">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  {!isUser && (
                    <div className="h-6 w-6 rounded-lg overflow-hidden border border-amber-400/30 flex-shrink-0 mt-0.5 shadow-sm">
                      <img
                        src={SPEX_ASSETS[msg.mood || 'explaining']?.imagePath || SPEX_ASSETS.explaining.imagePath}
                        alt="SPEX"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-3 sm:px-3.5 py-2 text-xs font-mono leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-amber-500/25 text-amber-100 border border-amber-400/30 rounded-tr-sm'
                        : 'bg-white/[0.05] text-slate-200 border border-white/10 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.displayedText}</p>
                    {msg.isRevealing && (
                      <button
                        onClick={() => handleSkipReveal(msg.id)}
                        className="mt-1 flex items-center gap-1 text-[9px] text-amber-300 hover:underline opacity-80 min-h-[30px]"
                      >
                        <FastForward className="h-2.5 w-2.5" />
                        <span>Show full response</span>
                      </button>
                    )}
                    <span
                      className={`block text-[9px] mt-1 font-mono opacity-50 ${
                        isUser ? 'text-amber-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="flex items-center gap-2 text-xs font-mono text-amber-300/80 p-2 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                <span>{t.spexThinking}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Scientific Question Chips (Horizontally Scrollable on Mobile) */}
          <div className="px-2.5 sm:px-3 py-1.5 border-t border-white/5 bg-black/40 flex items-center gap-1 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                disabled={isThinking}
                className="px-2.5 py-1 min-h-[32px] rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-amber-400/30 text-[10px] font-mono text-slate-300 hover:text-amber-300 transition-all text-left whitespace-nowrap flex-shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2 sm:p-2.5 border-t border-white/10 bg-white/[0.02] flex items-center gap-1.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.spexPlaceholder}
              disabled={isThinking}
              className="flex-1 px-3 py-2 min-h-[40px] rounded-xl border border-white/10 bg-white/[0.04] text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400/50 transition-colors"
            />
            <button
              type="submit"
              disabled={isThinking || !inputText.trim()}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 disabled:opacity-40 transition-all active:scale-95 shadow-sm"
              title="Send Message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
});
