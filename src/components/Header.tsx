import React from 'react';
import { Telescope, Compass, BookOpen, Layers, Sparkles, Languages } from 'lucide-react';
import { Language, translations } from '../utils/translations';

interface HeaderProps {
  activeTab: 'home' | 'explore' | 'cases' | 'about';
  setActiveTab: (tab: 'home' | 'explore' | 'cases' | 'about') => void;
  targetCoords?: { ra: number; dec: number };
  language: Language;
  onToggleLanguage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  targetCoords,
  language,
  onToggleLanguage,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#02040a]/90 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Brand */}
        <button
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 sm:gap-3 text-left transition-transform active:scale-95 group flex-shrink-0"
        >
          <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-sky-500/10 to-indigo-500/15 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)] group-hover:border-amber-400/50 transition-colors">
            <Telescope className="h-4 w-4 sm:h-5 sm:w-5" />
            <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Outfit'] text-sm sm:text-base font-bold tracking-wider text-slate-100">
                {t.appName}
              </span>
              <span className="text-slate-500 text-xs hidden xs:inline">·</span>
              <span className="text-[10px] sm:text-xs font-mono tracking-wider text-amber-400 uppercase hidden xs:inline">
                {t.tagline}
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-400 font-mono tracking-tight">
              {language === 'ar' ? 'منصة استكشاف التغيرات الفلكية' : 'Astronomical Transient & Variability Workspace'}
            </p>
          </div>
        </button>

        {/* Center: "You Are Here" Journey Stepper on Explore Mode */}
        {activeTab === 'explore' ? (
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="text-amber-300 font-semibold">1. Field</span>
            <span className="text-slate-600">→</span>
            <span className="text-amber-300 font-semibold">2. Compare</span>
            <span className="text-slate-600">→</span>
            <span className="text-amber-300 font-semibold">3. Residuals</span>
            <span className="text-slate-600">→</span>
            <span className="text-emerald-300 font-semibold">4. Verify Evidence</span>
          </div>
        ) : targetCoords && targetCoords.ra != null && targetCoords.dec != null ? (
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-300">
            <Compass className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-400">RA</span>
            <span className="text-amber-300 font-semibold">{targetCoords.ra.toFixed(4)}°</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Dec</span>
            <span className="text-amber-300 font-semibold">
              {targetCoords.dec >= 0 ? `+${targetCoords.dec.toFixed(4)}°` : `${targetCoords.dec.toFixed(4)}°`}
            </span>
          </div>
        ) : null}

        {/* Navigation & Language Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <nav className="flex items-center gap-0.5 sm:gap-1 rounded-xl p-0.5 sm:p-1 bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-2.5 sm:px-3 py-1.5 min-h-[36px] sm:min-h-[38px] text-xs font-medium rounded-lg transition-all flex items-center justify-center ${
                activeTab === 'home'
                  ? 'bg-white/[0.12] text-amber-300 border border-white/[0.1] font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
              title={t.navHome}
            >
              <span>{t.navHome}</span>
            </button>
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] sm:min-h-[38px] text-xs font-medium rounded-lg transition-all ${
                activeTab === 'explore'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
              title={t.navExplore}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{t.navExplore}</span>
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] sm:min-h-[38px] text-xs font-medium rounded-lg transition-all ${
                activeTab === 'cases'
                  ? 'bg-white/[0.12] text-amber-300 border border-white/[0.1] font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
              title={t.navCases}
            >
              <Layers className="h-3.5 w-3.5 hidden xs:inline-block" />
              <span>{t.navCases}</span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] sm:min-h-[38px] text-xs font-medium rounded-lg transition-all ${
                activeTab === 'about'
                  ? 'bg-white/[0.12] text-amber-300 border border-white/[0.1] font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
              title={t.navAbout}
            >
              <BookOpen className="h-3.5 w-3.5 hidden xs:inline-block" />
              <span>{t.navAbout}</span>
            </button>
          </nav>

          {/* Bilingual Toggle Button */}
          <button
            onClick={onToggleLanguage}
            title={language === 'en' ? 'التحويل للعربية' : 'Switch to English'}
            className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] sm:min-h-[38px] rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-amber-300 transition-all text-xs font-mono shadow-sm active:scale-95 flex-shrink-0"
          >
            <Languages className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-semibold text-xs">{t.langToggle}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
