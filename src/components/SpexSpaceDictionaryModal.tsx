import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Search,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  Compass,
  Telescope,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import {
  SCIENTIFIC_GLOSSARY,
  GLOSSARY_CATEGORIES,
  GlossaryTerm,
  GlossaryCategoryId,
  searchGlossaryTerms,
} from '../utils/scientificGlossary';
import { Language } from '../utils/translations';
import { useModalBehavior } from '../hooks/useModalBehavior';

export interface SpexSpaceDictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialTermId?: string | null;
  onSelectTerm?: (termId: string) => void;
}

export const SpexSpaceDictionaryModal: React.FC<SpexSpaceDictionaryModalProps> = ({
  isOpen,
  onClose,
  language,
  initialTermId,
  onSelectTerm,
}) => {
  const isRtl = language === 'ar';
  useModalBehavior(isOpen, onClose);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<GlossaryCategoryId | 'all'>('all');
  const [activeTermId, setActiveTermId] = useState<string>(initialTermId || 'infrared');
  const [activeExplanationLevel, setActiveExplanationLevel] = useState<'all' | 'level1' | 'level2' | 'level3'>('all');

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial term if prop changes
  useEffect(() => {
    if (initialTermId && SCIENTIFIC_GLOSSARY[initialTermId]) {
      setActiveTermId(initialTermId);
      // Auto-switch category to match selected term
      const termCat = SCIENTIFIC_GLOSSARY[initialTermId].category;
      if (termCat) {
        setSelectedCategory(termCat);
      }
    }
  }, [initialTermId]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Filtered terms
  const filteredTerms = useMemo(() => {
    let list = searchGlossaryTerms(searchQuery, language);
    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory);
    }
    return list;
  }, [searchQuery, selectedCategory, language]);

  // Active term object
  const activeTerm: GlossaryTerm = useMemo(() => {
    if (activeTermId && SCIENTIFIC_GLOSSARY[activeTermId]) {
      return SCIENTIFIC_GLOSSARY[activeTermId];
    }
    return filteredTerms[0] || Object.values(SCIENTIFIC_GLOSSARY)[0];
  }, [activeTermId, filteredTerms]);

  // Active term category
  const activeCategory = useMemo(() => {
    return GLOSSARY_CATEGORIES.find((c) => c.id === activeTerm?.category);
  }, [activeTerm]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dictionary-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl h-[92vh] max-h-[820px] bg-[#0A0D14] border border-white/15 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-slate-100"
      >
        {/* ================================================================= */}
        {/* HEADER */}
        {/* ================================================================= */}
        <div className="shrink-0 h-16 sm:h-18 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between gap-3 bg-[#0C101A]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_16px_rgba(255,185,0,0.2)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="dictionary-title"
                  className="font-bold text-base sm:text-lg text-slate-100 tracking-tight"
                >
                  {isRtl ? 'قاموس سبيكس الفلكي' : 'SPEX Space Dictionary'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00D3F3]/15 text-[#00D3F3] border border-[#00D3F3]/30 font-semibold">
                  {Object.keys(SCIENTIFIC_GLOSSARY).length} {isRtl ? 'مصطلحاً' : 'Terms'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans hidden sm:block">
                {isRtl
                  ? 'دليلك المبسط والتفصيلي لفهم فيزياء ومصطلحات استكشاف الفضاء ومرصد SPHEREx'
                  : 'Plain-English and scientific guide to astronomy, space exploration, and SPHEREx terminology'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isRtl ? 'العودة للاستكشاف' : 'Back to Explore'}</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SEARCH & CATEGORY BAR */}
        {/* ================================================================= */}
        <div className="shrink-0 p-3 sm:p-4 border-b border-white/10 bg-[#07090F] space-y-3">
          {/* Search Box */}
          <div className="relative w-full">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-3.5' : 'left-3.5'}`} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'ابحث عن مصطلح (مثال: الأشعة تحت الحمراء، FITS، سيجما، بارنارد)...' : 'Search astronomical terms (e.g., Infrared, FITS, Sigma, Proper Motion)...'}
              className={`w-full h-10 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400 focus:outline-none text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 transition-colors ${
                isRtl ? 'pr-10 pl-9 text-right' : 'pl-10 pr-9 text-left'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 ${isRtl ? 'left-2.5' : 'right-2.5'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Horizontal Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg shrink-0 transition cursor-pointer select-none font-semibold ${
                selectedCategory === 'all'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5'
              }`}
            >
              {isRtl ? 'الكل' : 'All Categories'} ({Object.keys(SCIENTIFIC_GLOSSARY).length})
            </button>

            {GLOSSARY_CATEGORIES.map((cat) => {
              const count = Object.values(SCIENTIFIC_GLOSSARY).filter((t) => t.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#00D3F3] text-slate-950 font-bold shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5'
                  }`}
                >
                  <span>{isRtl ? cat.nameAr : cat.nameEn}</span>
                  <span className="opacity-70 ml-1 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN BODY: 2-COLUMN VIEW (TERMS LIST + DETAILED 3-TIER EXPLANATION) */}
        {/* ================================================================= */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT COLUMN: TERMS LIST (Scrollable) */}
          <div className="w-full md:w-72 lg:w-80 shrink-0 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto p-2 sm:p-3 space-y-1.5 max-h-48 md:max-h-none bg-[#080B12]">
            {filteredTerms.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-mono text-xs">
                <HelpCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p>{isRtl ? 'لم نعثر على مصطلحات مطابقة' : 'No matching terms found'}</p>
              </div>
            ) : (
              filteredTerms.map((term) => {
                const isSelected = term.id === activeTerm?.id;
                return (
                  <button
                    key={term.id}
                    type="button"
                    onClick={() => {
                      setActiveTermId(term.id);
                      if (onSelectTerm) onSelectTerm(term.id);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between gap-2 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate">
                          {isRtl ? term.nameAr : term.nameEn}
                        </span>
                        {term.symbol && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-slate-400">
                            {term.symbol}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {isRtl ? term.simpleNameAr : term.simpleNameEn}
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'text-amber-400 translate-x-0.5' : 'text-slate-600'}`} />
                  </button>
                );
              })
            )}
          </div>

          {/* RIGHT COLUMN: COMPLETE 3-LEVEL EXPLANATION CARD */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5 bg-[#0A0D14]">
            {activeTerm && (
              <>
                {/* Term Header Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 shadow-sm space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {activeCategory && (
                        <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#00D3F3]/15 text-[#00D3F3] border border-[#00D3F3]/30 font-semibold">
                          {isRtl ? activeCategory.nameAr : activeCategory.nameEn}
                        </span>
                      )}
                      {activeTerm.symbol && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {activeTerm.symbol}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isRtl ? activeTerm.simpleNameAr : activeTerm.simpleNameEn}</span>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {isRtl ? activeTerm.nameAr : activeTerm.nameEn}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    {isRtl ? activeTerm.nameEn : activeTerm.nameAr}
                  </div>
                </div>

                {/* Explanation Levels Filter Controls */}
                <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 text-xs font-mono">
                  <span className="text-slate-500 mr-2">{isRtl ? 'مستوى الشرح:' : 'Explanation Depth:'}</span>
                  <button
                    type="button"
                    onClick={() => setActiveExplanationLevel('all')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      activeExplanationLevel === 'all'
                        ? 'bg-white/15 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isRtl ? 'عرض شامل' : 'All Levels'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveExplanationLevel('level1')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      activeExplanationLevel === 'level1'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isRtl ? 'المستوى 1: مبسط' : 'Level 1: Simple'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveExplanationLevel('level2')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      activeExplanationLevel === 'level2'
                        ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isRtl ? 'المستوى 2: مستكشف' : 'Level 2: Explore'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveExplanationLevel('level3')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      activeExplanationLevel === 'level3'
                        ? 'bg-[#00D3F3]/20 text-[#00D3F3] font-bold border border-[#00D3F3]/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isRtl ? 'المستوى 3: علماء' : 'Level 3: Scientist'}
                  </button>
                </div>

                {/* LEVEL 1: SIMPLE BEGINNER EXPLANATION */}
                {(activeExplanationLevel === 'all' || activeExplanationLevel === 'level1') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wide">
                      <Sparkles className="w-4 h-4" />
                      <span>{isRtl ? 'المستوى 1 — المعنى البسيط (للمبتدئين):' : 'LEVEL 1 — SIMPLE DEFINITION (FOR BEGINNERS):'}</span>
                    </div>
                    <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-sans font-medium">
                      {isRtl ? activeTerm.simpleExplanationAr : activeTerm.simpleExplanationEn}
                    </p>
                  </div>
                )}

                {/* LEVEL 2: WHY IT MATTERS & PRACTICAL EXAMPLE */}
                {(activeExplanationLevel === 'all' || activeExplanationLevel === 'level2') && (
                  <div className="space-y-3">
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
                        <Compass className="w-4 h-4" />
                        <span>{isRtl ? 'المستوى 2 — لماذا يهم في استكشاف الفضاء؟' : 'LEVEL 2 — WHY IT MATTERS IN EXPLORATION:'}</span>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed font-sans">
                        {isRtl ? activeTerm.whyItMattersAr : activeTerm.whyItMattersEn}
                      </p>
                    </div>

                    {/* Practical Real-World Example Card */}
                    <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5 font-sans">
                      <div className="text-[11px] font-mono text-[#00D3F3] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Telescope className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'مثال عملي من الواقع / مهمة سبيراكس:' : 'PRACTICAL / SPHEREx MISSION EXAMPLE:'}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {isRtl ? activeTerm.practicalExampleAr : activeTerm.practicalExampleEn}
                      </p>
                    </div>
                  </div>
                )}

                {/* LEVEL 3: DEEP SCIENTIFIC & MATHEMATICAL SPECIFICATION */}
                {(activeExplanationLevel === 'all' || activeExplanationLevel === 'level3') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#00D3F3]/5 border border-[#00D3F3]/25 space-y-2.5 font-mono">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#00D3F3] uppercase tracking-wide">
                      <Layers className="w-4 h-4" />
                      <span>{isRtl ? 'المستوى 3 — المعادلة والتعريف الفيزيائي الدقيق (للعلماء):' : 'LEVEL 3 — ASTROPHYSICAL & MATHEMATICAL SPECIFICATION (SCIENTIST):'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed bg-black/50 p-3 rounded-xl border border-white/5">
                      {isRtl ? activeTerm.technicalDetailsAr : activeTerm.technicalDetailsEn}
                    </p>
                  </div>
                )}

                {/* RELATED TERMS PILLS */}
                {activeTerm.relatedTerms && activeTerm.relatedTerms.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                      {isRtl ? 'مصطلحات ومفاهيم مرتبطة:' : 'Related Terms & Concepts:'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeTerm.relatedTerms.map((relId) => {
                        const relTerm = SCIENTIFIC_GLOSSARY[relId];
                        if (!relTerm) return null;
                        return (
                          <button
                            key={relId}
                            type="button"
                            onClick={() => {
                              setActiveTermId(relId);
                              if (onSelectTerm) onSelectTerm(relId);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-amber-400/15 hover:border-amber-400/40 text-slate-300 hover:text-amber-300 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{isRtl ? relTerm.nameAr : relTerm.nameEn}</span>
                            {relTerm.symbol && <span className="opacity-70 text-[10px]">({relTerm.symbol})</span>}
                            <ArrowRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* FOOTER */}
        {/* ================================================================= */}
        <div className="shrink-0 h-12 px-4 sm:px-6 border-t border-white/10 bg-[#07090F] flex items-center justify-between text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isRtl ? 'قاموس فلكي معتمد ومراجع علمياً' : 'Scientifically peer-reviewed dictionary'}</span>
          </div>
          <div>
            <span>SPEX Space Exploration System</span>
          </div>
        </div>
      </div>
    </div>
  );
};
