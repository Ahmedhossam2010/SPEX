import React, { useState } from 'react';
import {
  Compass,
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
} from 'lucide-react';
import { SpherexLogo } from './SpherexLogo';
import { Language, translations } from '../utils/translations';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface HeaderProps {
  activeTab: 'home' | 'explore' | 'game' | 'cases' | 'about';
  setActiveTab: (tab: 'home' | 'explore' | 'game' | 'cases' | 'about') => void;
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
  targetCoords,
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

  useModalBehavior(mobileMenuOpen, () => setMobileMenuOpen(false));

  interface NavItem {
    id: 'home' | 'explore' | 'cases' | 'game' | 'about';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
    badge?: string;
  }

  const navItems: NavItem[] = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'explore', label: t.navExplore, icon: Sparkles, highlight: true },
    { id: 'cases', label: t.navCases, icon: Layers },
    { id: 'game', label: t.navGame, icon: Telescope, badge: 'New' },
    { id: 'about', label: t.navAbout, icon: BookOpen },
  ];

  const handleSelectTab = (tab: 'home' | 'explore' | 'game' | 'cases' | 'about') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#07090e]/95 backdrop-blur-2xl transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Official Brand with Celestial Eye Logo */}
        <button
          type="button"
          onClick={() => handleSelectTab('home')}
          className="flex items-center gap-2.5 sm:gap-3 text-left transition-transform active:scale-95 group flex-shrink-0 cursor-pointer"
          aria-label="SPEX Home"
        >
          <SpherexLogo size={36} />
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-['Outfit'] text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-slate-100">
                SPEX
              </span>
              <span className="text-slate-400 dark:text-slate-600 text-xs">·</span>
              <span className="text-[10px] sm:text-xs font-mono tracking-wider text-amber-600 dark:text-amber-400 uppercase font-semibold">
                SPHEREx
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight">
              {isRtl ? 'منصة استكشاف التغيرات الفلكية' : 'Astronomical Transient & Variability Workspace'}
            </p>
          </div>
        </button>

        {/* Center: Coordinates Readout (Desktop only) */}
        {targetCoords && targetCoords.ra != null && targetCoords.dec != null ? (
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.04] px-3 py-1 rounded-full border border-slate-200 dark:border-white/10">
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

        {/* Desktop Navigation in the Center */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? item.highlight
                      ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold shadow-xs'
                      : 'bg-white dark:bg-white/[0.14] text-amber-600 dark:text-amber-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-amber-500' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {'badge' in item && item.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop Quick Controls */}
        <div className="hidden md:flex items-center gap-2">
          {/* Scientist Mode Toggle */}
          {onToggleScientistMode && (
            <button
              type="button"
              onClick={onToggleScientistMode}
              title={t.scientistModeToggle}
              aria-label={t.scientistModeToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl border text-xs font-mono transition-all cursor-pointer shadow-xs active:scale-95 ${
                isScientistMode
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(0,211,243,0.3)] font-bold'
                  : 'border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40'
              }`}
            >
              <Microscope className={`h-4 w-4 ${isScientistMode ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{t.scientistModeToggle}</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle color theme"
            className="flex items-center justify-center p-2 min-h-[38px] min-w-[38px] rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {/* Bilingual Toggle */}
          <button
            type="button"
            onClick={onToggleLanguage}
            title={language === 'en' ? 'التحويل للعربية' : 'Switch to English'}
            aria-label="Toggle language"
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-all text-xs font-mono cursor-pointer shadow-xs active:scale-95"
          >
            <Languages className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-bold text-xs">{t.langToggle}</span>
          </button>
        </div>

        {/* Mobile Header Controls: Current Page Pill + Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {/* Active Tab Pill Indicator */}
          <div className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-[11px] font-mono text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-white/10">
            {navItems.find((n) => n.id === activeTab)?.label}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open mobile navigation menu"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 active:scale-95 cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-md flex flex-col justify-end transition-opacity cursor-pointer animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full bg-white dark:bg-[#070b16] border-t border-slate-200 dark:border-white/15 rounded-t-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto cursor-default ${
              isRtl ? 'font-cairo' : 'font-sans'
            }`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <SpherexLogo size={32} />
                <span className="font-['Outfit'] font-black tracking-wider text-base text-slate-900 dark:text-white">
                  SPEX NAVIGATION
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

            {/* Navigation List */}
            <div className="flex flex-col gap-1.5 py-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl min-h-[50px] transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 shadow-xs'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          isActive
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {isActive ? (
                      <CheckCircle2 className="h-4 w-4 text-amber-500" />
                    ) : 'badge' in item && item.badge ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold border border-cyan-500/30">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Footer: Scientist Mode, Theme and Language */}
            {onToggleScientistMode && (
              <button
                type="button"
                onClick={() => {
                  onToggleScientistMode();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3.5 min-h-[48px] rounded-2xl border text-xs font-mono transition-all cursor-pointer active:scale-95 ${
                  isScientistMode
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                    : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Microscope className={`h-4 w-4 ${isScientistMode ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{t.scientistModeToggle}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isScientistMode ? 'bg-cyan-500 text-slate-950' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}>
                  {isScientistMode ? 'ON' : 'OFF'}
                </span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex items-center justify-center gap-2 p-3 min-h-[46px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer active:scale-95"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-400" />
                    <span>{isRtl ? 'الوضع الفاتح' : 'Light Mode'}</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-slate-700" />
                    <span>{isRtl ? 'الوضع الداكن' : 'Dark Mode'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onToggleLanguage}
                className="flex items-center justify-center gap-2 p-3 min-h-[46px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold cursor-pointer active:scale-95"
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
