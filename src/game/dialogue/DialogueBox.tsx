import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ChevronRight, Volume2, VolumeX, Sparkles, MessageSquare } from 'lucide-react';
import { SpexPortrait, SpexExpression } from '../../spex/SpexPortrait';
import { gameAudio } from '../utils/gameAudio';
import { Language } from '../../utils/translations';

export interface DialogueChoice {
  id: string;
  text: string;
  textAr: string;
  responseExpression?: SpexExpression;
  onSelect: () => void;
}

interface DialogueBoxProps {
  speakerName: string;
  speakerNameAr?: string;
  expression: SpexExpression;
  text: string;
  textAr: string;
  language: Language;
  choices?: DialogueChoice[];
  onContinue?: () => void;
  continueLabel?: string;
  continueLabelAr?: string;
  isThinking?: boolean;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  speakerName,
  speakerNameAr,
  expression,
  text,
  textAr,
  language,
  choices,
  onContinue,
  continueLabel,
  continueLabelAr,
  isThinking = false,
}) => {
  const isArabic = language === 'ar';
  const fullText = isArabic ? textAr : text;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const typingIntervalRef = useRef<number | null>(null);

  // Typewriter effect
  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;

    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
    }

    typingIntervalRef.current = window.setInterval(() => {
      index++;
      if (index <= fullText.length) {
        setDisplayedText(fullText.slice(0, index));
        if (index % 3 === 0 && soundEnabled) {
          gameAudio.playTypewriter();
        }
      } else {
        setIsTyping(false);
        if (typingIntervalRef.current) {
          window.clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }
    }, 22);

    return () => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
      }
    };
  }, [fullText, soundEnabled]);

  const handleSkipTyping = () => {
    if (isTyping) {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setDisplayedText(fullText);
      setIsTyping(false);
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    gameAudio.enabled = nextState;
  };

  return (
    <div
      className="relative w-full rounded-2xl bg-[#0b1220]/95 border border-cyan-500/30 p-4 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden cursor-pointer select-none transition-all duration-300 hover:border-cyan-400/50"
      onClick={handleSkipTyping}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Cat Avatar with expression */}
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gradient-to-b from-[#111d33] to-[#0a1120] border-2 border-cyan-400/40 shadow-lg shadow-cyan-900/30">
            <SpexPortrait expression={expression} size={96} />
            {/* Expression badge */}
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 uppercase">
              {expression}
            </div>
          </div>
        </div>

        {/* Speech content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-cyan-300 tracking-wide uppercase flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                {isArabic ? speakerNameAr || speakerName : speakerName}
              </span>
              <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/50">
                {isArabic ? 'الحارس الميكانيكي' : 'Mech Cat Guardian'}
              </span>
            </div>

            {/* Sound toggle button */}
            <button
              onClick={toggleSound}
              className="p-1 text-slate-400 hover:text-cyan-300 rounded transition"
              title={soundEnabled ? 'Mute typing audio' : 'Unmute typing audio'}
              aria-label="Toggle typing sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>

          {/* Dialogue text box */}
          <div className="min-h-[56px] text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
            {displayedText}
            {isTyping && (
              <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
            )}
          </div>

          {/* Choice buttons or continue prompt */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            {choices && choices.length > 0 ? (
              <div className="flex flex-wrap gap-2 w-full">
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      gameAudio.playClick();
                      choice.onSelect();
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-800/70 border border-cyan-500/40 hover:border-cyan-400 text-xs sm:text-sm font-medium text-cyan-200 transition-all shadow-sm hover:shadow-cyan-900/50 flex items-center justify-between gap-2"
                  >
                    <span>{isArabic ? choice.textAr : choice.text}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                ))}
              </div>
            ) : onContinue ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] text-slate-500 italic">
                  {isTyping
                    ? isArabic
                      ? 'انقر للإسراع...'
                      : 'Click to skip text...'
                    : isArabic
                    ? 'اضغط للمتابعة'
                    : 'Press button or click to proceed'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    gameAudio.playClick();
                    onContinue();
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs sm:text-sm shadow-md hover:shadow-cyan-500/25 transition-all flex items-center gap-2 group"
                >
                  <span>
                    {isArabic
                      ? continueLabelAr || 'متابعة'
                      : continueLabel || 'Continue'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
