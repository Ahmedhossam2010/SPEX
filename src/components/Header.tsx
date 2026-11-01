import React from 'react';
import { Compass, BookOpen, Layers, Sparkles, Languages, Sun, Moon } from 'lucide-react';
import { SpherexLogo } from './SpherexLogo';
import { Language, translations } from '../utils/translations';

interface HeaderProps {
  activeTab: 'home' | 'explore' | 'cases' | 'about';
  setActiveTab: (tab: 'home' | 'explore' | 'cases' | 'about') => void;
  targetCoords?: { ra: number; dec: number };
  language: Language;
  onToggleLanguage: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  targetCoords,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#07090e]/90 backdrop-blur-2xl transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Official Brand with Celestial Eye Logo */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 sm:gap-3 text-left transition-transform active:scale-95 group flex-shrink-0"
        >
          <SpherexLogo size={36} />
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-['Outfit'] text-sm sm:text-base font-bold tracking-wider text-slate-900 dark:text-slate-100">
                {t.appName}
              </span>
              <span className="text-slate-400 dark:text-slate-600 text-xs hidden xs:inline">·</span>
              <span className="text-[10px] sm:text-xs font-mono tracking-wider text-amber-600 dark:text-amber-400 uppercase hidden xs:inline font-semibold">
                {t.tagline}
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight">
              {isRtl ? 'منصة استكشاف التغيرات الفلكية' : 'Astronomical Transient & Variability Workspace'}
            </p>
          </div>
        </button>

        {/* Center: Coordinates or Guidance */}
        {targetCoords && targetCoords.ra != null && targetCoords.dec != null ? (
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-300">
            <Compass className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-slate-400">RA</span>
            <span className="text-slate-900 dark:text-amber-300 font-semibold">{targetCoords.ra.toFixed(4)}°</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-slate-400">Dec</span>
            <span className="text-slate-900 dark:text-amber-300 font-semibold">
              {targetCoords.dec >= 0 ? `+${targetCoords.dec.toFixed(4)}°` : `${targetCoords.dec.toFixed(4)}°`}
            </span>
          </div>
        ) : null}

        {/* Navigation & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <nav className="flex items-center gap-0.5 sm:gap-1 rounded-xl p-0.5 sm:p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`px-2.5 sm:px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-all flex items-center justify-center ${
                activeTab === 'home'
                  ? 'bg-white dark:bg-white/[0.12] text-amber-600 dark:text-amber-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <span>{t.navHome}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-all ${
                activeTab === 'explore'
                  ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>{t.navExplore}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cases')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-all ${
                activeTab === 'cases'
                  ? 'bg-white dark:bg-white/[0.12] text-amber-600 dark:text-amber-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="h-3.5 w-3.5 hidden xs:inline-block" />
              <span>{t.navCases}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-all ${
                activeTab === 'about'
                  ? 'bg-white dark:bg-white/[0.12] text-amber-600 dark:text-amber-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 hidden xs:inline-block" />
              <span>{t.navAbout}</span>
            </button>
          </nav>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="flex items-center justify-center p-2 min-h-[36px] min-w-[36px] rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-all shadow-xs active:scale-95 flex-shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {/* Bilingual Toggle Button */}
          <button
            type="button"
            onClick={onToggleLanguage}
            title={language === 'en' ? 'التحويل للعربية' : 'Switch to English'}
            className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-all text-xs font-mono shadow-xs active:scale-95 flex-shrink-0"
          >
            <Languages className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-xs">{t.langToggle}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
