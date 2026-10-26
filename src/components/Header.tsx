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
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#030712]/75 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <button
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 text-left transition-transform active:scale-95 group"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-sky-500/10 to-indigo-500/15 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)] group-hover:border-amber-400/50 transition-colors">
            <Telescope className="h-5 w-5" />
            <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Outfit'] text-base font-bold tracking-wider text-slate-100">
                {t.appName}
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-400 font-semibold">
                {t.tagline}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">
              {t.subtagline}
            </p>
          </div>
        </button>

        {/* Center Target Telemetry Pill */}
        {targetCoords && targetCoords.ra != null && targetCoords.dec != null && (
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md text-[11px] font-mono text-slate-300 shadow-inner">
            <Compass className="h-3.5 w-3.5 text-amber-400 animate-spin-slow" />
            <span className="text-slate-400">RA</span>
            <span className="text-amber-300 font-semibold">{targetCoords.ra.toFixed(4)}°</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Dec</span>
            <span className="text-amber-300 font-semibold">
              {targetCoords.dec >= 0 ? `+${targetCoords.dec.toFixed(4)}°` : `${targetCoords.dec.toFixed(4)}°`}
            </span>
            <span className="text-slate-600">·</span>
            <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] uppercase tracking-wider font-semibold">
              SPHEREx QR2
            </span>
          </div>
        )}

        {/* Navigation & Language Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center gap-1 rounded-xl p-1 bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'home'
                  ? 'bg-white/[0.12] text-amber-300 border border-white/[0.1] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {t.navHome}
            </button>
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'explore'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              {t.navExplore}
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'cases'
                  ? 'bg-white/[0.12] text-amber-300 border border-white/[0.1] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {t.navCases}
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'about'
                  ? 'bg-white/[0.12] text-amber-300 border border-white/[0.1] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              {t.navAbout}
            </button>
          </nav>

          {/* Bilingual Toggle Button */}
          <button
            onClick={onToggleLanguage}
            title={language === 'en' ? 'Switch to Egyptian Arabic' : 'التحويل للإنجليزية'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-amber-300 transition-all text-xs font-mono shadow-sm active:scale-95"
          >
            <Languages className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-semibold">{t.langToggle}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
