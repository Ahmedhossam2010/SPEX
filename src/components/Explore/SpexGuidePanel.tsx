import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Send, Sparkles, MapPin, Trash2, Info } from 'lucide-react';
import { Language, translations } from '../../utils/translations';
import { SpexPortrait } from '../../spex/SpexPortrait';
import { ScienceTerm } from '../ScienceTerm';
import {
  SpexExplainContext,
  SpexExplainLevel,
  SpexExplainResponse,
  SpexHighlight,
  SpexSpotSelection,
} from '../../science/spexExplain';

export interface SpexGuideMessage {
  id: string;
  role: 'user' | 'spex';
  text: string;
  offlineMode?: boolean;
  modeLabel?: string;
  followUps?: string[];
  terms?: string[];
}

export interface SpexGuidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  context: SpexExplainContext | null;
  selectedSpot: SpexSpotSelection | null;
  onClearSpot: () => void;
  onHighlightsChange: (highlights: SpexHighlight[]) => void;
  onOpenDictionary: (termKey?: string) => void;
  onSpexAsked?: () => void;
  autoAskToken?: number;
  autoAskQuestion?: string | null;
  defaultLevel?: SpexExplainLevel;
}

export const SpexGuidePanel: React.FC<SpexGuidePanelProps> = ({
  isOpen,
  onClose,
  language,
  context,
  selectedSpot,
  onClearSpot,
  onHighlightsChange,
  onOpenDictionary,
  onSpexAsked,
  autoAskToken = 0,
  autoAskQuestion = null,
  defaultLevel = 'beginner',
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];
  const [level, setLevel] = useState<SpexExplainLevel>(defaultLevel);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [offlineModeActive, setOfflineModeActive] = useState(false);
  const [offlineLabel, setOfflineLabel] = useState<string>('');
  const [messages, setMessages] = useState<SpexGuideMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastHandledTokenRef = useRef<number>(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const askSpex = useCallback(
    async (
      questionText: string,
      opts?: { levelOverride?: SpexExplainLevel; spotOverride?: SpexSpotSelection | null; silentUserBubble?: boolean }
    ) => {
      const cleanQ = questionText.trim();
      if (!cleanQ) return;
      const effLevel = opts?.levelOverride ?? level;
      const effSpot = opts?.spotOverride !== undefined ? opts.spotOverride : selectedSpot;

      // Clear previous highlights on next question
      onHighlightsChange([]);
      onSpexAsked?.();

      if (!opts?.silentUserBubble) {
        setMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}-${Math.random()}`, role: 'user', text: cleanQ },
        ]);
      }

      setLoading(true);
      try {
        const res = await fetch('/api/spex/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language,
            level: effLevel,
            question: cleanQ,
            selection: effSpot,
            context,
          }),
        });

        const data: SpexExplainResponse | null = res.ok
          ? await res.json().catch(() => null)
          : null;

        if (data && typeof data.answer === 'string') {
          setOfflineModeActive(Boolean(data.offlineMode));
          setOfflineLabel(
            data.modeLabel || (isRtl ? 'سبيكس في الوضع غير المتصل' : 'SPEX offline mode')
          );
          onHighlightsChange(Array.isArray(data.highlights) ? data.highlights : []);
          setMessages((prev) => [
            ...prev,
            {
              id: `s-${Date.now()}-${Math.random()}`,
              role: 'spex',
              text: data.answer,
              offlineMode: data.offlineMode,
              modeLabel: data.modeLabel,
              followUps: data.followUps || [],
              terms: data.terms || [],
            },
          ]);
        } else {
          setOfflineModeActive(true);
          setOfflineLabel(isRtl ? 'سبيكس في الوضع غير المتصل' : 'SPEX offline mode');
          setMessages((prev) => [
            ...prev,
            {
              id: `s-${Date.now()}-fallback`,
              role: 'spex',
              text: isRtl
                ? 'أهلاً! أنا هنا لمساعدتك في قراءة هذه الصورة السماوية. جرب الضغط على أحد الأزرار السريعة بالأسفل أو انقر على أي بقعة مضيئة.'
                : 'Hi! I am here to help you read this real sky image. Try tapping one of the quick questions below or tapping a glowing dot on the sky.',
              offlineMode: true,
              followUps: [],
              terms: [],
            },
          ]);
        }
      } catch {
        setOfflineModeActive(true);
        setOfflineLabel(isRtl ? 'سبيكس في الوضع غير المتصل' : 'SPEX offline mode');
        setMessages((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}-catch`,
            role: 'spex',
            text: isRtl
              ? 'أعمل حالياً في الوضع غير المتصل باستخدام البيانات المحفوظة أمامك. اسألني عن الحركة أو النقاط المضيئة!'
              : 'I am working in offline mode using the verified sky data loaded on your screen. Ask me about motion or any spot you tap!',
            offlineMode: true,
            followUps: [],
            terms: [],
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [level, selectedSpot, context, language, isRtl, onHighlightsChange, onSpexAsked]
  );

  // Trigger explanation automatically when user taps a spot on canvas or clicks "Explain this spot"
  useEffect(() => {
    if (!isOpen || autoAskToken === 0 || autoAskToken === lastHandledTokenRef.current) return;
    lastHandledTokenRef.current = autoAskToken;
    const defaultQ =
      autoAskQuestion ||
      (selectedSpot
        ? isRtl
          ? 'ما هذه البقعة في الصورة؟'
          : 'What is this spot?'
        : isRtl
        ? 'ماذا أرى في هذه الصورة؟'
        : 'What is this?');
    askSpex(defaultQ, { spotOverride: selectedSpot });
  }, [isOpen, autoAskToken, autoAskQuestion, selectedSpot, isRtl, askSpex]);

  if (!isOpen) return null;

  const quickChips = [
    { label: t.spexChipWhatIsThis, query: t.spexChipWhatIsThis, levelOverride: undefined },
    { label: t.spexChipWhyBlink, query: t.spexChipWhyBlink, levelOverride: undefined },
    { label: t.spexChipHowSure, query: t.spexChipHowSure, levelOverride: undefined },
    { label: t.spexChipReallyMoving, query: t.spexChipReallyMoving, levelOverride: undefined },
    {
      label: t.spexChipLikeTen,
      query: t.spexChipLikeTen,
      levelOverride: 'kid' as SpexExplainLevel,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    askSpex(q);
  };

  return (
    <aside
      data-testid="spex-guide-panel"
      aria-label={isRtl ? 'مرشد سبيكس الفلكي' : 'SPEX AI Guide'}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`fixed z-40 inset-x-0 bottom-0 max-h-[82vh] rounded-t-3xl md:inset-x-auto md:bottom-4 ${
        isRtl ? 'md:left-4' : 'md:right-4'
      } md:w-[400px] md:max-h-[640px] md:rounded-2xl bg-[#0B101C]/98 backdrop-blur-xl border border-cyan-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-slate-100`}
    >
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-white/10 bg-[#0F1627]/95 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0 overflow-hidden">
            <SpexPortrait mood={loading ? 'thinking' : 'explaining'} size={32} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white">SPEX</span>
              {offlineModeActive && (
                <span
                  data-testid="spex-offline-badge"
                  className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-semibold"
                >
                  {offlineLabel || t.spexOfflineModeLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {context?.targetName || (isRtl ? 'مساعد استكشاف السماء' : 'Sky Exploration Guide')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={isRtl ? 'إغلاق سبيكس' : 'Close SPEX'}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Level Switch + Source-of-truth disclaimer */}
      <div className="shrink-0 px-4 py-2 border-b border-white/10 bg-black/30 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] bg-black/50 p-0.5 rounded-lg border border-white/10">
            {(['kid', 'beginner', 'scientist'] as SpexExplainLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                  level === lvl
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl === 'kid'
                  ? t.spexLevelKid
                  : lvl === 'beginner'
                  ? t.spexLevelBeginner
                  : t.spexLevelScientist}
              </button>
            ))}
          </div>

          {selectedSpot && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[10px] font-mono">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>
                ({selectedSpot.x.toFixed(0)}, {selectedSpot.y.toFixed(0)})
              </span>
              <button
                type="button"
                onClick={onClearSpot}
                title={isRtl ? 'إلغاء تحديد النقطة' : 'Clear spot'}
                className="hover:text-white cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>{t.spexAiSourceTruthNote}</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 min-h-[160px] overflow-y-auto px-4 py-3 space-y-3 text-sm">
        {messages.length === 0 && (
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 text-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.spexGuideWelcomeTitle}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{t.spexGuideWelcomeBody}</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            data-testid={msg.role === 'spex' ? 'spex-answer-bubble' : 'spex-user-bubble'}
            className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-500 text-slate-950 font-medium'
                  : 'bg-white/[0.06] border border-white/10 text-slate-100'
              }`}
            >
              {msg.text}
            </div>

            {msg.role === 'spex' && msg.terms && msg.terms.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-1">
                {msg.terms.map((termKey) => (
                  <span
                    key={termKey}
                    className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-400/25 text-[11px] text-amber-200"
                  >
                    <ScienceTerm
                      termKey={termKey}
                      language={language}
                      onOpenDictionary={onOpenDictionary}
                    />
                  </span>
                ))}
              </div>
            )}

            {msg.role === 'spex' && msg.followUps && msg.followUps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {msg.followUps.map((fq) => (
                  <button
                    key={fq}
                    type="button"
                    disabled={loading}
                    onClick={() => askSpex(fq)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-[11px] transition cursor-pointer disabled:opacity-50"
                  >
                    {fq}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{isRtl ? 'سبيكس يفحص الإطار...' : 'SPEX is reading this sky frame...'}</span>
          </div>
        )}
      </div>

      {/* Quick Question Chips */}
      <div className="shrink-0 px-3 pt-2 pb-1 border-t border-white/10 bg-[#080C15] flex flex-wrap gap-1.5">
        {quickChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={loading}
            onClick={() => {
              if (chip.levelOverride) setLevel(chip.levelOverride);
              askSpex(chip.query, { levelOverride: chip.levelOverride });
            }}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-[11px] transition cursor-pointer disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 p-3 bg-[#080C15] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.spexGuideInputPlaceholder}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-cyan-400 outline-none text-xs sm:text-sm text-white placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label={t.spexSendButton}
          className="px-3 py-2 rounded-xl bg-[#FFB900] hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.spexSendButton}</span>
        </button>
      </form>
    </aside>
  );
};
