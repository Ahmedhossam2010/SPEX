import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, Sparkles, BookOpen, Layers } from 'lucide-react';
import { SCIENTIFIC_GLOSSARY, GlossaryTerm } from '../utils/scientificGlossary';
import { Language } from '../utils/translations';

interface ScienceTermProps {
  termKey: string;
  language: Language;
  showSimpleLabel?: boolean;
  overrideLabel?: React.ReactNode;
  className?: string;
}

export const ScienceTerm: React.FC<ScienceTermProps> = ({
  termKey,
  language,
  showSimpleLabel = true,
  overrideLabel,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isRtl = language === 'ar';

  const term: GlossaryTerm | undefined = SCIENTIFIC_GLOSSARY[termKey];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        cardRef.current &&
        !cardRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!term) {
    return <span className={className}>{overrideLabel || termKey}</span>;
  }

  const displayName = overrideLabel
    ? overrideLabel
    : showSimpleLabel
    ? isRtl
      ? term.simpleNameAr
      : term.simpleNameEn
    : isRtl
    ? term.nameAr
    : term.nameEn;

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`group inline-flex items-center gap-1 border-b border-dotted border-amber-400/70 hover:border-amber-400 text-inherit hover:text-amber-500 dark:hover:text-amber-300 transition-colors cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-amber-400/50 rounded-xs px-0.5 ${className}`}
        title={isRtl ? 'اضغط لشرح المصطلح الفلكي بلغة مبسطة' : 'Click to explain this scientific term in plain English'}
      >
        <span className="font-medium">{displayName}</span>
        {term.symbol && (
          <span className="text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-300 bg-amber-500/10 px-1 py-0.2 rounded group-hover:bg-amber-500/20 transition-colors">
            {term.symbol}
          </span>
        )}
        <HelpCircle className="w-3 h-3 text-amber-500/70 dark:text-amber-400/70 group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors flex-shrink-0" />
      </button>

      {isOpen && (
        <div
          ref={cardRef}
          role="dialog"
          aria-label={isRtl ? term.nameAr : term.nameEn}
          className={`fixed sm:absolute z-50 bottom-4 sm:bottom-full sm:mb-2 left-4 right-4 sm:left-auto sm:right-auto ${
            isRtl ? 'sm:right-0 sm:text-right' : 'sm:left-0 sm:text-left'
          } sm:w-84 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 dark:border-amber-500/30 bg-white dark:bg-[#0c1220] text-slate-800 dark:text-slate-100 p-4 shadow-2xl shadow-slate-900/20 dark:shadow-black/70 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-white/[0.08] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                  {isRtl ? 'المترجم العلمي المبسط' : 'Plain-English Explainer'}
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {isRtl ? term.nameAr : term.nameEn}
                  {term.symbol && (
                    <span className="text-xs font-mono text-amber-600 dark:text-amber-300 font-semibold bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded">
                      {term.symbol}
                    </span>
                  )}
                </h4>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Simple Explanation */}
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>{isRtl ? 'المعنى البسيط (بدون تعقيد):' : 'What it means (in plain English):'}</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-sans bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-2.5">
              {isRtl ? term.simpleExplanationAr : term.simpleExplanationEn}
            </p>
          </div>

          {/* 2. Why it Matters */}
          <div className="mt-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-1">
              {isRtl ? 'لماذا يهم في هذا البحث؟' : 'Why it matters in this search:'}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isRtl ? term.whyItMattersAr : term.whyItMattersEn}
            </p>
          </div>

          {/* 3. Rigorous Definition / Technical Spec */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <div className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400/90 tracking-wider mb-1 flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" />
              <span>{isRtl ? 'المعادلة والتعريف الفلكي الدقيق:' : 'Astronomical Definition & Metric:'}</span>
            </div>
            <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-black/40 rounded-lg p-2 border border-slate-200 dark:border-white/[0.04]">
              {isRtl ? term.technicalDetailsAr : term.technicalDetailsEn}
            </p>
          </div>
        </div>
      )}
    </span>
  );
};
