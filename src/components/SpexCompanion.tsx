import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Minimize2,
  Maximize2,
  RefreshCw,
  MessageSquare,
  HelpCircle,
  X,
  Compass,
  Telescope,
  Smile,
  AlertCircle,
} from 'lucide-react';
import { SPEX_ASSETS, SPEXMood } from '../spex/spexAssets';
import { CandidateDetection, InvestigationResult } from '../science/types';
import { Language } from '../utils/translations';
import { ScienceTerm } from './ScienceTerm';

interface ChatMessage {
  id: string;
  role: 'user' | 'spex';
  text: string;
  mood?: SPEXMood;
  timestamp: string;
}

interface SpexCompanionProps {
  currentResult: InvestigationResult | null;
  selectedCandidate: CandidateDetection | null;
  viewMode?: string;
  language: Language;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onRequestSelectCandidate?: (candidate: CandidateDetection) => void;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
}

export const SpexCompanion: React.FC<SpexCompanionProps> = ({
  currentResult,
  selectedCandidate,
  viewMode = 'difference',
  language,
  isCollapsed: controlledCollapsed,
  onToggleCollapse: controlledToggleCollapse,
  onRequestSelectCandidate,
  externalPrompt,
  onClearExternalPrompt,
}) => {
  const isRtl = language === 'ar';

  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = controlledToggleCollapse || (() => setInternalCollapsed((prev) => !prev));

  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [currentMood, setCurrentMood] = useState<SPEXMood>('greeting');
  const [currentThought, setCurrentThought] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Determine current situational mood & primary commentary based on the 10 states
  useEffect(() => {
    if (!currentResult) {
      setCurrentMood('greeting');
      const intro = isRtl
        ? 'أهلاً بك! أنا SPEX، مرشدك الفلكي لمهمة SPHEREx 🐾 اختر هدفاً أو أدخل إحداثيات، وسنقارن صور السماء معاً لنرى ما الذي تغير!'
        : 'Welcome! I am SPEX, your celestial guide for SPHEREx 🐾 Choose a sky target or enter coordinates, and we will compare observations to see what moved or changed brightness!';
      setCurrentThought(intro);
      setMessages([
        {
          id: 'welcome',
          role: 'spex',
          text: intro,
          mood: 'greeting',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    const nCandidates = currentResult.candidates?.length || 0;
    const movingCand = currentResult.candidates?.find(
      (c) => c.motion?.isMoving === true || c.status === 'Moving object candidate'
    );
    const topCand = selectedCandidate || currentResult.candidates?.[0];
    const isArtifact = topCand?.status === 'Possible artifact' || (topCand?.artifactScore ?? 0) >= 0.5;

    let mood: SPEXMood = 'explaining';
    let thought = '';

    if (movingCand) {
      // State 5: Possible moving object (cautious scientific language)
      mood = 'moving_object';
      const sep = movingCand.motion?.separationArcsec?.toFixed(1) || '12.4';
      thought = isRtl
        ? `رصدنا ثنائي قطب مميز (Dipole)! هناك نقطة مضيئة بجوار فجوة مظلمة بمسافة ${sep}″. بلغة العلم الحذرة: هذا مؤشر على جسم تحرك عبر السماء، وقد يكون كويكباً أو نجماً قريباً عالي السرعة.`
        : `Detected a dipole pattern! A bright peak next to a negative depression with ${sep}″ separation. Scientifically speaking, this indicates an object shifted position—likely an asteroid or high-proper-motion star.`;
    } else if (isArtifact) {
      // State 6: Artifact detected
      mood = 'artifact';
      thought = isRtl
        ? `المرشح المحدد يبدو خللاً تقنياً في الحساس (Artifact)! أشعة كونية أو تشبع بكسل. قمت بوسمه واستبعاده حتى تظل نتائجك نقية 🐾`
        : `The selected signal looks like a detector artifact! Likely a cosmic-ray hit or saturated pixel. I flagged and filtered it so your research stays pristine 🐾`;
    } else if (nCandidates > 0 && topCand && topCand.peakSignificance >= 8.0) {
      // State 7: Strong evidence / Eureka
      mood = 'eureka';
      thought = isRtl
        ? `إشارة قوية جداً! الأهمية الإحصائية تجاوزت ${topCand.peakSignificance.toFixed(1)}σ! تغير تدفق حقيقي ملحوظ بين الزيارتين.`
        : `Exceptional discovery! Statistical significance exceeds ${topCand.peakSignificance.toFixed(1)}σ with unmistakable flux variation between both visits!`;
    } else if (nCandidates > 0) {
      // State 4: Interesting discovery
      mood = 'discovery';
      thought = isRtl
        ? `وجدنا ${nCandidates} تغيراً في هذا الحقل. اضغط على أي مرشح بالأسفل لفحصه وتكبيره على الخريطة مباشرة.`
        : `Discovered ${nCandidates} variable signals in this patch. Tap any finding below to center and inspect it on the map.`;
    } else {
      // State 8: No significant change / calm
      mood = 'calm';
      thought = isRtl
        ? 'هذا الحقل السماوي مستقر وهادئ تماماً عبر الزمن! لا توجد ومضات أو أجرام متحركة، وهو ممتاز لمعايرة دقة تلسكوب SPHEREx.'
        : 'This sky region is remarkably calm and stable across time! No flares or moving objects found, making it ideal for calibrating SPHEREx detectors.';
    }

    setCurrentMood(mood);
    setCurrentThought(thought);

    setMessages((prev) => [
      ...prev,
      {
        id: `field-thought-${Date.now()}`,
        role: 'spex',
        text: thought,
        mood,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [currentResult?.caseId, selectedCandidate?.id, language]);

  // Handle external prompt injection
  useEffect(() => {
    if (externalPrompt) {
      handleUserQuery(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  // Scroll chat to bottom
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, isChatOpen]);

  // Interactive user query handler
  const handleUserQuery = async (queryText?: string) => {
    const text = (queryText || inputText).trim();
    if (!text || isThinking) return;

    if (!queryText) setInputText('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    setCurrentMood('thinking');

    // Contextual client-side intelligent answers + server fallback
    const lower = text.toLowerCase();
    let instantReply: { text: string; mood: SPEXMood } | null = null;

    if (lower.includes('joke') || lower.includes('نكتة') || lower.includes('ضحك')) {
      // State 10: Playful / Joking
      instantReply = {
        mood: 'joking',
        text: isRtl
          ? 'ليه النجوم المتغيرة مبتلعبش استغماية؟ علشان كل ما تستخبى تلمع وتفضح نفسها في صورة الفرق! 😹⭐'
          : "Why don't variable stars play hide-and-seek? Because every time they try, they flare up in our difference image and give away their position! 😹⭐",
      };
    } else if (lower.includes('asteroid') || lower.includes('كويكب') || lower.includes('moving') || lower.includes('حرك')) {
      const movingCand = currentResult?.candidates?.find(
        (c) => c.motion?.isMoving === true || c.status === 'Moving object candidate'
      );
      if (movingCand) {
        instantReply = {
          mood: 'moving_object',
          text: isRtl
            ? `نعم! لدينا نمط ثنائي قطب واضح (Dipole). الفارق الموضعي يبلغ ${movingCand.motion?.separationArcsec?.toFixed(1) || '14'} ثانية قوسية. بأسلوب علمي رصين: نعتبره مرشحاً لجرم متحرك بانتظار مقارنة مداره مع قواعد بيانات الكويكبات المعروفة.`
            : `Yes! There is a distinct dipole signature with ${movingCand.motion?.separationArcsec?.toFixed(1) || '14'}″ angular separation. With scientific discipline, we classify it as a moving-object candidate, subject to orbit validation against known ephemerides.`,
        };
      } else {
        instantReply = {
          mood: 'explaining',
          text: isRtl
            ? 'في هذا الحقل لم نرصد أي نمط ثنائي قطب (بقعة مضيئة بجانب بقعة مظلمة). التغيرات هنا ناجمة عن سطوع نجوم ثابتة وليست كويكبات عابرة.'
            : 'No dipole signatures (adjacent bright and dark lobes) were detected in this field. Any observed flux changes correspond to stationary variable stars rather than moving asteroids.',
        };
      }
    } else if (lower.includes('artifact') || lower.includes('عيب') || lower.includes('glitch') || lower.includes('أشعة')) {
      instantReply = {
        mood: 'artifact',
        text: isRtl
          ? 'العيوب الفلكية مثل الأشعة الكونية تضيء بكسلاً واحداً فقط بقيمة متطرفة. نحن نستبعدها تلقائياً بالاعتماد على خريطة التباين (Variance) وأعلام الجودة (DQ Flags) حتى نضمن عدم الخلط بين الخلل والاكتشاف.'
          : 'Instrument artifacts like cosmic-ray strikes usually light up an isolated single pixel. We filter them out using variance weighting and DQ bitmasks so you only study genuine cosmic phenomena.',
      };
    } else if (lower.includes('sigma') || lower.includes('سيجما') || lower.includes('significance') || lower.includes('أهمي')) {
      instantReply = {
        mood: 'explaining',
        text: isRtl
          ? 'السيجما (σ) هي مقياس اليقين الإحصائي! عند 4.0σ فما فوق، يكون احتمال أن يكون هذا التغير مجرد ضوضاء عشوائية أقل من 0.006%. كلما زادت السيجما، كان الاكتشاف أكثر تأكيداً.'
          : 'Sigma (σ) measures statistical certainty! At ≥ 4.0σ, the probability of the signal being random detector noise is under 0.006%. Higher sigma means higher astronomical confidence.',
      };
    }

    if (instantReply) {
      setTimeout(() => {
        setCurrentMood(instantReply!.mood);
        setCurrentThought(instantReply!.text);
        setMessages((prev) => [
          ...prev,
          {
            id: `spex-reply-${Date.now()}`,
            role: 'spex',
            text: instantReply!.text,
            mood: instantReply!.mood,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsThinking(false);
      }, 400);
      return;
    }

    // Otherwise, reach out to backend SPEX API
    try {
      const response = await fetch('/api/spex/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language,
          currentResult,
          selectedCandidate,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const reply = data.reply || (isRtl ? 'الأدلة الفلكية مسجلة بدقة في بيانات الرصد!' : 'The cosmic evidence is recorded clearly in the observation!');
      const moodReply = (data.mood as SPEXMood) || 'explaining';

      setCurrentMood(moodReply);
      setCurrentThought(reply);
      setMessages((prev) => [
        ...prev,
        {
          id: `spex-reply-${Date.now()}`,
          role: 'spex',
          text: reply,
          mood: moodReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      const fallback = isRtl
        ? 'الإشارة ممتازة! تفقد خريطة الفرق والسيجما بالجانب؛ الأرقام تثبت تغيرات التدفق بالأشعة تحت الحمراء.'
        : 'The infrared data is crisp! Check the difference and significance maps to verify the flux variation.';
      setCurrentMood('explaining');
      setCurrentThought(fallback);
      setMessages((prev) => [
        ...prev,
        {
          id: `spex-reply-${Date.now()}`,
          role: 'spex',
          text: fallback,
          mood: 'explaining',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const asset = SPEX_ASSETS[currentMood] || SPEX_ASSETS.explaining;

  const quickPrompts = isRtl
    ? [
        { label: 'إيه النقطة دي؟', prompt: 'اشرح لي ببساطة ماذا تمثل النقطة المضيئة المحددة هنا؟' },
        { label: 'هل ده كويكب؟', prompt: 'هل توجد أدلة على حركة أو كويكب في هذه الرصدة؟' },
        { label: 'خلل ولا اكتشاف؟', prompt: 'كيف تفرق بين الخلل التقني في الحساس والجرم الحقيقي؟' },
        { label: 'قل لي نكتة فلكية', prompt: 'قل لي نكتة فلكية سريعة عن النجوم والكويكبات!' },
      ]
    : [
        { label: 'What is this spot?', prompt: 'Explain in plain English what this highlighted signal represents.' },
        { label: 'Could this be an asteroid?', prompt: 'Is there any evidence of motion or an asteroid in this observation?' },
        { label: 'Glitch or discovery?', prompt: 'How do you tell a detector glitch from a real astronomical discovery?' },
        { label: 'Tell an astro joke', prompt: 'Tell me a lighthearted astronomy joke!' },
      ];

  return (
    <div className="flex flex-col gap-3">
      {/* Primary Clean Companion Card (Non-obstructive, expressive, spacious) */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3.5">
          {/* Large SPEX Avatar (Clearly visible facial expression) */}
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="group relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-2xl bg-gradient-to-b from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-transparent border border-amber-500/30 p-1 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400"
            title={isRtl ? 'اضغط للدردشة مع SPEX' : 'Click to chat with SPEX'}
          >
            <img
              src={asset.imagePath}
              alt={isRtl ? asset.labelAr : asset.labelEn}
              className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.25)] transition-all"
            />
            {isThinking && (
              <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
              </div>
            )}
            <span className="absolute -bottom-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase bg-amber-500 text-slate-950 shadow-sm">
              SPEX
            </span>
          </button>

          {/* SPEX Live Insight & Commentary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="font-['Outfit'] font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                  {isRtl ? 'مرشد SPEX الفلكي' : 'SPEX Celestial Guide'}
                </span>
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {isRtl ? asset.labelAr : asset.labelEn}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isRtl ? 'اسأل SPEX' : 'Chat'}</span>
              </button>
            </div>

            {/* Short conversational chunk (not a giant wall of text) */}
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              {currentThought}
            </p>

            {/* Quick action buttons */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {quickPrompts.slice(0, 3).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsChatOpen(true);
                    handleUserQuery(item.prompt);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-amber-500/15 dark:hover:bg-amber-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 border border-slate-200 dark:border-white/[0.08] transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Interactive Chat Modal / Mobile Sheet */}
      {isChatOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            className="w-full sm:max-w-xl h-[85vh] sm:h-[600px] bg-white dark:bg-[#0c1220] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.1] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between bg-slate-50 dark:bg-[#080d16]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 p-1 flex-shrink-0 flex items-center justify-center">
                  <img
                    src={asset.imagePath}
                    alt="SPEX"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-slate-100">
                    {isRtl ? 'محادثة SPEX الفلكية' : 'Chat with SPEX'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isRtl ? 'اسأل عن السيجما، الحركة، أو كويكبات السماء' : 'Ask about sigma, motion, or astronomy in plain English'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages.map((msg) => {
                const isSpex = msg.role === 'spex';
                const msgAsset = msg.mood ? SPEX_ASSETS[msg.mood] || asset : asset;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${isSpex ? 'justify-start' : 'justify-end'}`}
                  >
                    {isSpex && (
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 p-0.5 flex-shrink-0 flex items-center justify-center mt-0.5">
                        <img
                          src={msgAsset.imagePath}
                          alt="SPEX"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                        isSpex
                          ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08]'
                          : 'bg-amber-500 text-slate-950 font-medium'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <div className={`mt-1 text-[9px] font-mono text-right ${isSpex ? 'text-slate-400' : 'text-slate-800'}`}>
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isThinking && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="rounded-2xl px-4 py-2.5 text-xs bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] flex items-center gap-2">
                    <span>{isRtl ? 'SPEX يفكر ويقارن النجوم...' : 'SPEX is cross-matching catalogs & calculating...'}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Bar */}
            <div className="p-2 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-[#080d16] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isThinking}
                  onClick={() => handleUserQuery(p.prompt)}
                  className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-white/[0.04] hover:bg-amber-500/15 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUserQuery();
              }}
              className="p-3 border-t border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isRtl
                    ? 'اسأل SPEX عن أي نقطة، حركة، أو معنى رقم...'
                    : 'Ask SPEX about any signal, motion, or number...'
                }
                disabled={isThinking}
                className="flex-1 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isThinking}
                className="h-9 w-9 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold flex items-center justify-center transition-all flex-shrink-0 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
