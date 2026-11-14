import React, { useState } from 'react';
import {
  BookOpen,
  Layers,
  Sparkles,
  Languages,
  Sun,
  Moon,
  Telescope,
  Menu,
  X,
  Home,
  CheckCircle2,
  Microscope,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SpherexLogo } from './SpherexLogo';
import { Language, translations } from '../utils/translations';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { gameAudio } from '../game/utils/gameAudio';

export type AppTab = 'home' | 'explore' | 'famous' | 'game' | 'cases' | 'about';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  targetCoords?: { ra: number; dec: number };
  language: Language;
  onToggleLanguage: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isScientistMode?: boolean;
  onToggleScientistMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
  isScientistMode = false,
  onToggleScientistMode,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => gameAudio.isEnabled());

  useModalBehavior(mobileMenuOpen, () => setMobileMenuOpen(false));

  interface NavItem {
    id: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
    badge?: string;
  }

  const navItems: NavItem[] = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'explore', label: t.navExplore, icon: Sparkles, highlight: true },
    { id: 'famous', label: t.navFamous, icon: Star },
    { id: 'cases', label: t.navCases, icon: Layers },
    { id: 'game', label: t.navGame, icon: Telescope, badge: '3D' },
    { id: 'about', label: t.navAbout, icon: BookOpen },
  ];

  const handleSelectTab = (tab: AppTab) => {
    gameAudio.playClick();
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleToggleSound = () => {
    const next = gameAudio.toggle();
    setSoundEnabled(next);
  };

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#050812]/92 backdrop-blur-2xl transition-colors"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-5 lg:px-6 gap-2">
        {/* Brand */}
        <button
          type="button"
          onClick={() => handleSelectTab('home')}
          className="flex items-center gap-2.5 text-start transition-transform active:scale-95 group shrink-0 cursor-pointer select-none min-h-[44px]"
          aria-label="SPEX Home"
        >
          <SpherexLogo size={34} />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-display text-base sm:text-lg font-extrabold tracking-wide text-slate-900 dark:text-slate-50">
                SPEX
              </span>
              <span className="text-slate-400 dark:text-slate-600 text-xs font-mono" aria-hidden="true">·</span>
              <span className="text-[10px] sm:text-xs font-mono tracking-wider text-amber-600 dark:text-amber-400 uppercase font-bold">
                SPHEREx
              </span>
            </div>
            <p className="hidden xl:block text-[11px] text-slate-500 dark:text-slate-400 tracking-tight leading-tight mt-0.5">
              {isRtl ? 'السماء المتغيرة' : 'The Changing Sky'}
            </p>
          </div>
        </button>

        {/* Center Navigation (Desktop lg+) */}
        <nav
          aria-label={isRtl ? 'التنقل الرئيسي' : 'Primary navigation'}
          className="hidden lg:flex items-center gap-1 rounded-2xl p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] shrink-0"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? item.highlight
                      ? 'bg-sky-500/15 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/35 font-bold shadow-xs'
                      : 'bg-white dark:bg-white/[0.12] text-amber-600 dark:text-amber-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? (item.highlight ? 'text-sky-400' : 'text-amber-400') : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Utility Actions (Desktop lg+ & Shared Language + Mobile Drawer) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            {/* Glossary ("Learn the words") */}
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                window.dispatchEvent(new CustomEvent('open-spex-dictionary', { detail: {} }));
              }}
              title={t.explorerLearnWords}
              aria-label="Open SPEX Space Dictionary"
              className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
            >
              <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="font-semibold hidden xl:inline">{t.explorerLearnWords}</span>
            </button>

            {/* Explorer / Scientist Switch */}
            {onToggleScientistMode && (
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  onToggleScientistMode();
                }}
                title={t.scientistModeToggle}
                aria-label={t.scientistModeToggle}
                aria-pressed={isScientistMode}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] rounded-xl border text-xs font-medium transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap ${
                  isScientistMode
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/70 shadow-[0_0_12px_rgba(56,189,248,0.25)] font-bold'
                    : 'border-slate-200 dark:border-white/[0.12] bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 hover:text-sky-300 hover:border-sky-500/40'
                }`}
              >
                <Microscope className={`h-4 w-4 shrink-0 ${isScientistMode ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="hidden xl:inline">{isScientistMode ? t.modeScientist : t.modeExplorer}</span>
              </button>
            )}

            {/* Sound Toggle (Sound-free by default) */}
            <button
              type="button"
              onClick={handleToggleSound}
              title={soundEnabled ? t.soundEnabled : t.soundMuted}
              aria-label={soundEnabled ? t.soundEnabled : t.soundMuted}
              aria-pressed={soundEnabled}
              className={`flex items-center justify-center p-2 min-h-[38px] min-w-[38px] rounded-xl border transition-all cursor-pointer active:scale-95 shrink-0 ${
                soundEnabled
                  ? 'border-sky-400/50 bg-sky-500/15 text-sky-400'
                  : 'border-slate-200 dark:border-white/[0.12] bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle color theme"
              className="flex items-center justify-center p-2 min-h-[38px] min-w-[38px] rounded-xl border border-slate-200 dark:border-white/[0.12] bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>
          </div>

          {/* Single Shared Language Toggle (Visible across Mobile, Tablet, and Desktop) */}
          <button
            type="button"
            onClick={onToggleLanguage}
            title={language === 'en' ? 'التحويل للعربية' : 'Switch to English'}
            aria-label="Toggle language"
            className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[40px] lg:min-h-[38px] rounded-xl border border-slate-200 dark:border-white/[0.12] bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 transition-all text-xs font-mono cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
          >
            <Languages className="hidden lg:block h-4 w-4 text-amber-500 shrink-0" />
            <span className="font-bold text-xs">{language === 'en' ? 'عربي' : 'EN'}</span>
          </button>

          {/* Mobile / Tablet Menu Drawer Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open mobile navigation menu"
            className="flex lg:hidden p-2.5 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 active:scale-95 cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-50 lg:hidden bg-black/80 backdrop-blur-md flex flex-col justify-end transition-opacity cursor-pointer animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full bg-white dark:bg-[#080d1a] border-t border-slate-200 dark:border-white/15 rounded-t-3xl p-5 shadow-2xl flex flex-col gap-3 max-h-[88vh] overflow-y-auto cursor-default ${
              isRtl ? 'font-cairo' : 'font-sans'
            }`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <SpherexLogo size={30} />
                <span className="font-display font-extrabold tracking-wide text-base text-slate-900 dark:text-white">
                  SPEX
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 py-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl min-h-[48px] transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold border border-sky-500/35'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          isActive
                            ? 'bg-sky-500/20 text-sky-400'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold">{item.label}</span>
                    </div>
                    {isActive ? (
                      <CheckCircle2 className="h-4 w-4 text-sky-400" />
                    ) : item.badge ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-300 font-bold">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-spex-dictionary', { detail: {} }));
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 min-h-[48px] rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-500" />
                <span>{t.explorerLearnWords}</span>
              </div>
              <span className="text-[10px] font-mono uppercase">{isRtl ? 'فتح' : 'Open'}</span>
            </button>

            {onToggleScientistMode && (
              <button
                type="button"
                onClick={() => {
                  onToggleScientistMode();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 min-h-[48px] rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  isScientistMode
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400'
                    : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Microscope className={`h-4 w-4 ${isScientistMode ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span>{t.scientistModeToggle}</span>
                </div>
                <span className="text-xs font-mono font-bold">
                  {isScientistMode ? t.modeScientist : t.modeExplorer}
                </span>
              </button>
            )}

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={handleToggleSound}
                className="flex items-center justify-center gap-1.5 p-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4 text-sky-400" /> : <VolumeX className="h-4 w-4" />}
                <span>{soundEnabled ? (isRtl ? 'صوت' : 'Sound') : (isRtl ? 'صامت' : 'Mute')}</span>
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                className="flex items-center justify-center gap-1.5 p-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
                <span>{theme === 'dark' ? (isRtl ? 'فاتح' : 'Light') : (isRtl ? 'داكن' : 'Dark')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleLanguage();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 p-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold cursor-pointer"
              >
                <Languages className="h-4 w-4 text-amber-500" />
                <span>{t.langToggle}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
