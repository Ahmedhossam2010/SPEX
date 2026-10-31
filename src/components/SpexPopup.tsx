import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  Sparkles,
  HelpCircle,
  Minimize2,
  FastForward,
  MessageSquare,
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
  const [showTooltip, setShowTooltip] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);

  // Clear progressive reveal timer on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  // Listen for Escape key to close SPEX dialog effortlessly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Progressive sentence reveal helper
  const addProgressiveSpexMessage = (text: string, mood: SPEXMood) => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);

    const rawSentences = text.match(/[^.!?؟\n]+[.!?؟\n]+|[^.!?؟\n]+$/g) || [text];
    const sentences = rawSentences.map((s) => s.trim()).filter(Boolean);

    const messageId = `spex-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (sentences.length <= 1) {
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
          ? `رصدنا تغير تدفق حقيقي بقوة S/N = ${Math.abs(currentResult.evidence.maxSignificance).toFixed(1)}σ عبر ${currentResult.compatibility.timeBaselineDays.toFixed(1)} يوم. اسألني عن قياسات التدفق وتطابق Gaia!`
          : `Verified real flux variation at S/N = ${Math.abs(currentResult.evidence.maxSignificance).toFixed(1)}σ across ${currentResult.compatibility.timeBaselineDays.toFixed(1)} days. Ask me about the aperture flux and Gaia match!`;
    } else if (currentResult.evidence.classification === 'NO SIGNIFICANT CHANGE DETECTED') {
      initialMood = 'serious';
      greeting =
        language === 'ar'
          ? `السماء هنا مستقرة تمامًا. الفروق متطابقة مع مستوى الضوضاء الطبيعية للأجهزة، وده معيار ممتاز للثبات الضوئي.`
          : `This sky field is completely stable. Difference residuals match the instrumental noise floor, serving as a reliable photometric benchmark.`;
    } else if (currentResult.evidence.classification === 'POSSIBLE ARTIFACT') {
      initialMood = 'sassy';
      greeting =
        language === 'ar'
          ? `الإشارة هنا تشويش مستشعر تم استبعاده فورًا بواسطة قناع الجودة (Quality Bitmask). مفيش أي خداع كوني يعدي علينا!`
          : `Signal flagged and disqualified as an instrumental artifact. Saturated detector pixels and pointing jitter were cleanly rejected.`;
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
          ? 'الاتصال واجه تأخير بسيط؛ البيانات الحسابية كلها دقيقة ومعروضة في لوحة التحقيق.'
          : 'Telemetry link jittered briefly; computed values remain fully visible in the science deck.';
      addProgressiveSpexMessage(fallbackReply, 'thinking');
    } finally {
      setIsThinking(false);
    }
  };

  // Context-aware questions for quick chips
  const quickChips = React.useMemo(() => {
    const cls = currentResult?.evidence.classification;
    if (language === 'ar') {
      if (cls === 'SIGNIFICANT CHANGE DETECTED') {
        return [
          'إيه اللي اتغير في السما هنا؟',
          'هل ده نجم متغير حقيقي ولا انفجار؟',
          'اشرحلي تطابق غايا Gaia DR3',
          'ما معنى 7.8σ إحصائيًا؟',
        ];
      }
      if (cls === 'POSSIBLE ARTIFACT') {
        return [
          'ليه تم استبعاد الإشارة دي كـ Artifact؟',
          'اشرحلي قناع الجودة DQ Bitmask',
          'ما هو تأثير الديبول (Dipole)؟',
          'إزاي نتأكد إنه مش كويكب متحرك؟',
        ];
      }
      return [
        'ليه السماء مستقرة هنا؟',
        'اشرح كيف يعمل طرح الصور',
        'ما هو حد ضوضاء المستشعر MAD؟',
        'كيف أبحث عن هدف جديد؟',
      ];
    }

    if (cls === 'SIGNIFICANT CHANGE DETECTED') {
      return [
        'What changed in this field?',
        'Is this a variable star or transient?',
        'Explain Gaia DR3 cross-match',
        'What does 7.8σ mean practically?',
      ];
    }
    if (cls === 'POSSIBLE ARTIFACT') {
      return [
        'Why was this rejected as an artifact?',
        'Explain SPHEREx DQ bitmasks',
        'What is a subtraction dipole?',
        'How do we know it is not an asteroid?',
      ];
    }
    return [
      'Why is this field stable?',
      'How does difference imaging work?',
      'What is the MAD noise floor?',
      'How do I search another coordinate?',
    ];
  }, [currentResult?.evidence.classification, language]);

  return (
    <>
      {/* =========================================================================
          SPEX FLOATING LAUNCHER (BOTTOM-RIGHT, PROMINENT & FRIENDLY)
          ========================================================================= */}
      {!isOpen && (
        <div className="fixed bottom-16 right-3 md:bottom-5 md:right-5 z-40 flex items-center gap-2">
          {/* Friendly Tooltip for First Time Users */}
          {showTooltip && (
            <div
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-amber-400/30 bg-[#030712]/90 backdrop-blur-xl text-xs text-amber-200 shadow-xl animate-bounce duration-1000 ${
                isRtl ? 'font-cairo' : 'font-sans'
              }`}
            >
              <span>{language === 'ar' ? 'اسأل سبيكس عن التغيرات!' : 'Ask SPEX about changes!'}</span>
              <button
                onClick={() => setShowTooltip(false)}
                className="text-amber-400/60 hover:text-amber-200"
                aria-label="Dismiss tooltip"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setIsOpen(true);
              setUnreadCount(0);
              setShowTooltip(false);
            }}
            className="group flex items-center gap-2.5 px-3 sm:px-4 py-2 rounded-full border border-amber-400/40 bg-[#030712]/90 hover:bg-[#060c1d] backdrop-blur-2xl text-slate-100 shadow-[0_8px_30px_rgba(245,158,11,0.25)] hover:border-amber-400 transition-all hover:scale-105 active:scale-95"
            title={language === 'ar' ? 'افتح سبيكس (المساعد الفلكي)' : 'Open SPEX AI Companion (Esc to close)'}
          >
            {/* Expressive Egyptian Mech Cat Avatar */}
            <div className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/25 to-sky-500/25 flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.35)]">
              <img
                src={SPEX_ASSETS[currentMood]?.imagePath || SPEX_ASSETS.explaining.imagePath}
                alt={currentMood}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              />
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-[#030712] shadow-[0_0_6px_#34d399]" />
            </div>

            <div className="text-left font-mono">
              <div className="flex items-center gap-1.5">
                <span className="font-['Outfit'] text-xs sm:text-sm font-bold tracking-wide text-amber-300">
                  {t.spexTitle}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 font-semibold uppercase">
                  {currentMood}
                </span>
              </div>
            </div>

            {unreadCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>
      )}

      {/* =========================================================================
          SPEX DIALOG / DRAWER (WITH CLEAR, OBVIOUS CLOSE BUTTON & ESC HANDLING)
          ========================================================================= */}
      {isOpen && (
        <>
          {/* Mobile Backdrop Click-to-Dismiss */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs sm:hidden"
            aria-hidden="true"
          />

          <div
            ref={chatPanelRef}
            className={`fixed bottom-2 inset-x-2 sm:inset-x-auto sm:right-5 sm:bottom-5 z-50 sm:w-[410px] max-h-[85dvh] sm:max-h-[80vh] h-[520px] flex flex-col rounded-3xl border-2 border-amber-500/30 bg-[#030712]/95 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden select-text animate-in fade-in slide-in-from-bottom-4 duration-200 ${
              isRtl ? 'font-cairo' : 'font-sans'
            }`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Subtle Space Ambience Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header: Clear Title + Explicit Close Controls */}
            <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2.5">
                <div className="relative h-9 w-9 rounded-2xl overflow-hidden border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/25 to-sky-500/25 shadow-[0_0_12px_rgba(245,158,11,0.3)] flex-shrink-0">
                  <img
                    src={SPEX_ASSETS[currentMood]?.imagePath || SPEX_ASSETS.explaining.imagePath}
                    alt={currentMood}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-[#030712] shadow-[0_0_6px_#34d399]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Outfit'] text-sm font-bold tracking-wide text-slate-100">
                      {t.spexTitle}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 font-semibold uppercase">
                      {currentMood}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                    {language === 'ar' ? 'رفيق فلكي وباحث علمي' : 'Egyptian Mech-Cat Astrophysicist'}
                  </p>
                </div>
              </div>

              {/* HIGH CONTRAST, UNMISTAKABLE CLOSE BUTTON */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-slate-300 hover:text-rose-200 transition-all text-xs font-mono group"
                  title="Close SPEX (Esc)"
                  aria-label="Close SPEX"
                >
                  <span className="hidden xs:inline text-[10px] uppercase font-bold text-slate-400 group-hover:text-rose-300">
                    {language === 'ar' ? 'إغلاق' : 'Close'}
                  </span>
                  <X className="h-4 w-4 text-slate-300 group-hover:text-rose-300" />
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    {!isUser && (
                      <div className="h-7 w-7 rounded-xl overflow-hidden border border-amber-400/40 flex-shrink-0 mt-0.5 shadow-sm">
                        <img
                          src={SPEX_ASSETS[msg.mood || 'explaining']?.imagePath || SPEX_ASSETS.explaining.imagePath}
                          alt="SPEX"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-mono leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-amber-500/20 text-amber-100 border border-amber-400/30 rounded-tr-sm'
                          : 'bg-white/[0.05] text-slate-200 border border-white/10 rounded-tl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.displayedText}</p>
                      {msg.isRevealing && (
                        <button
                          onClick={() => handleSkipReveal(msg.id)}
                          className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-300 hover:underline opacity-80 min-h-[24px]"
                        >
                          <FastForward className="h-2.5 w-2.5" />
                          <span>Show full answer</span>
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
                <div className="flex items-center gap-2 text-xs font-mono text-amber-300/80 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  <span>{t.spexThinking}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Contextual Quick Question Chips */}
            <div className="px-3 py-2 border-t border-white/5 bg-black/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  disabled={isThinking}
                  className="px-2.5 py-1 min-h-[30px] rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-amber-400/30 text-[10px] font-mono text-slate-300 hover:text-amber-300 transition-all text-left whitespace-nowrap flex-shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Form with Clear Send Button */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-2.5 border-t border-white/10 bg-white/[0.02] flex items-center gap-1.5"
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
                className="min-h-[40px] px-3 flex items-center justify-center gap-1 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/40 text-amber-300 disabled:opacity-40 transition-all active:scale-95 shadow-sm font-mono text-xs font-bold"
                title="Send Message"
              >
                <span>{language === 'ar' ? 'إرسال' : 'Send'}</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
});
