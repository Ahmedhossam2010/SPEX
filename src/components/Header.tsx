import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Languages,
  Sun,
  Moon,
  Telescope,
  Menu,
  X,
  Home,
  CheckCircle2,
  GraduationCap,
  Trophy,
  Volume2,
  VolumeX,
  Users,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import { SpherexLogo } from './SpherexLogo';
import { Language, translations } from '../utils/translations';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { gameAudio } from '../game/utils/gameAudio';
import { useProgress } from '../progress/progressStore';

export type AppTab =
  | 'home'
  | 'academy'
  | 'explore'
  | 'famous'
  | 'game'
  | 'cases'
  | 'about'
  | 'community';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  targetCoords?: { ra: number; dec: number };
  language: Language;
  onToggleLanguage: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenAchievements?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
  onOpenAchievements,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => gameAudio.isEnabled());
  const { progress, rank } = useProgress();

  useModalBehavior(mobileMenuOpen, () => setMobileMenuOpen(false));
  useModalBehavior(moreMenuOpen, () => setMoreMenuOpen(false));

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [moreMenuOpen]);

  interface NavItem {
    id: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
  }

  // Strictly 4 primary items in header nav: Home, Explore, Academy, Play
  const navItems: NavItem[] = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'explore', label: t.navExploreShort, icon: Sparkles, highlight: true },
    { id: 'academy', label: t.navAcademy, icon: GraduationCap },
    { id: 'game', label: t.navPlay, icon: Telescope },
  ];

  const handleSelectTab = (tab: AppTab) => {
    gameAudio.playClick();
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
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
          title={t.navHome}
          className="flex items-center gap-2 text-start transition-transform active:scale-95 group shrink-0 cursor-pointer select-none min-h-[44px]"
          aria-label="SPEX Home"
        >
          <SpherexLogo size={32} />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-display text-base sm:text-lg font-extrabold tracking-wide text-slate-900 dark:text-slate-50">
                SPEX
              </span>
              <span className="hidden sm:inline text-slate-400 dark:text-slate-600 text-xs font-mono" aria-hidden="true">
                ·
              </span>
              <span className="hidden sm:inline text-[10px] sm:text-xs font-mono tracking-wider text-amber-600 dark:text-amber-400 uppercase font-bold">
                SPHEREx
              </span>
            </div>
            <p className="hidden xl:block text-[11px] text-slate-500 dark:text-slate-400 tracking-tight leading-tight mt-0.5">
              {t.tagline}
            </p>
          </div>
        </button>

        {/* Center Navigation (Desktop lg+, strictly 4 items) */}
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
                className={`flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? item.highlight
                      ? 'bg-sky-500/15 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/35 font-bold shadow-xs'
                      : 'bg-white dark:bg-white/[0.12] text-amber-600 dark:text-amber-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.05]'
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isActive ? (item.highlight ? 'text-sky-400' : 'text-amber-400') : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Utility Actions: Rank + XP Badge, Language Toggle, Compact "More" Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Always-visible Rank & XP Badge */}
          {onOpenAchievements && (
            <button
              type="button"
              data-testid="header-rank-badge"
              onClick={() => {
                gameAudio.playClick();
                onOpenAchievements();
              }}
              title={t.headerRankBadgeTooltip}
              aria-label={`${rank} ${progress.xp} XP`}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 min-h-[38px] rounded-xl border border-sky-500/35 bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-200 text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap tabular-nums"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{rank}</span>
              <span className="text-amber-500 dark:text-amber-300">{progress.xp} XP</span>
            </button>
          )}

          {/* Single Shared Language Toggle */}
          <button
            type="button"
            data-testid="header-lang-toggle"
            onClick={onToggleLanguage}
            title={language === 'en' ? 'التحويل للعربية' : 'Switch to English'}
            aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] rounded-xl border border-slate-200 dark:border-white/[0.12] bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 transition-all text-xs font-mono cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
          >
            <Languages className="hidden sm:block h-4 w-4 text-amber-500 shrink-0" />
            <span className="font-bold text-xs">{language === 'en' ? 'عربي' : 'EN'}</span>
          </button>

          {/* Compact Secondary "More" Dropdown (Desktop lg+) */}
          <div ref={moreMenuRef} className="relative hidden lg:block">
            <button
              type="button"
              data-testid="header-more-btn"
              onClick={() => setMoreMenuOpen((v) => !v)}
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              aria-label={t.headerMoreTooltip}
              title={t.headerMoreTooltip}
              className={`flex items-center gap-1 px-2.5 py-1.5 min-h-[38px] rounded-xl border text-xs font-medium transition-all cursor-pointer active:scale-95 shrink-0 ${
                moreMenuOpen || activeTab === 'community'
                  ? 'border-amber-400/50 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                  : 'border-slate-200 dark:border-white/[0.12] bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300'
              }`}
            >
              <MoreHorizontal className="h-4 w-4 shrink-0" />
              <span className="hidden xl:inline">{t.headerMoreLabel}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {moreMenuOpen && (
              <div
                role="menu"
                className="absolute end-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#090F1E] shadow-2xl p-1.5 space-y-1 z-50 backdrop-blur-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  data-testid="header-community-btn"
                  onClick={() => handleSelectTab('community')}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                    activeTab === 'community'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-sky-400 shrink-0" />
                    <span>{t.navCommunity}</span>
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    gameAudio.playClick();
                    setMoreMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('open-spex-dictionary', { detail: {} }));
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>{t.explorerLearnWords}</span>
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-white/10" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleToggleSound}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4 text-sky-400 shrink-0" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                    <span>{soundEnabled ? t.soundEnabled : t.soundMuted}</span>
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={onToggleTheme}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {theme === 'dark' ? (
                      <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                    ) : (
                      <Moon className="h-4 w-4 text-slate-600 shrink-0" />
                    )}
                    <span>{theme === 'dark' ? t.themeToggleLight : t.themeToggleDark}</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile / Tablet Menu Drawer Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            title={isRtl ? 'فتح القائمة' : 'Open navigation menu'}
            aria-label="Open mobile navigation menu"
            className="flex lg:hidden p-2 min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 active:scale-95 cursor-pointer"
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
                    {isActive && <CheckCircle2 className="h-4 w-4 text-sky-400" />}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => handleSelectTab('community')}
                className={`w-full flex items-center justify-between p-3 rounded-2xl min-h-[48px] transition-all cursor-pointer ${
                  activeTab === 'community'
                    ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/35'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-sky-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">{t.navCommunity}</span>
                </div>
                {activeTab === 'community' && <CheckCircle2 className="h-4 w-4 text-amber-400" />}
              </button>
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
