import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { ExploreView } from './components/ExploreView';
import { CasesView } from './components/CasesView';
import { AboutView } from './components/AboutView';
import { SpexAdventureGame } from './game/SpexAdventureGame';
import { InvestigationResult } from './science/types';
import { checkCoordinatesInQR2 } from './science/challengeTargets';
import { Language, translations } from './utils/translations';

export function App() {
  const getInitialTab = (): 'home' | 'explore' | 'game' | 'cases' | 'about' => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'explore' || path === 'explore') return 'explore';
    if (tabParam === 'game' || path === 'game') return 'game';
    if (tabParam === 'cases' || path === 'cases') return 'cases';
    if (tabParam === 'about' || path === 'about') return 'about';
    if (tabParam === 'home' || path === 'home' || path === '') return 'home';
    return 'home';
  };

  const [activeTab, setActiveTabState] = useState<'home' | 'explore' | 'game' | 'cases' | 'about'>(getInitialTab);

  // Navigate tab and synchronize browser history pathname
  const setActiveTab = (tab: 'home' | 'explore' | 'game' | 'cases' | 'about', replace = false) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const targetPath = tab === 'home' ? '/' : `/${tab}`;
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      if (currentPath !== targetPath) {
        if (replace) {
          window.history.replaceState({ tab }, '', targetPath + currentSearch);
        } else {
          window.history.pushState({ tab }, '', targetPath + currentSearch);
        }
      }
    }
  };

  const [language, setLanguage] = useState<Language>(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const langParam = params.get('lang');
    if (langParam === 'ar' || langParam === 'en') return langParam;
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('spherex_lang') as Language | null) : null;
    return saved === 'ar' || saved === 'en' ? saved : 'en';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [cases, setCases] = useState<any[]>([]);
  const [currentResult, setCurrentResult] = useState<InvestigationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [failedQuery, setFailedQuery] = useState<{ caseId: string; customCoords?: { ra: number; dec: number } } | null>(null);
  const [fallbackQuery, setFallbackQuery] = useState<{ ra: number; dec: number } | null>(null);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('spherex_theme') as 'dark' | 'light' | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('spherex_theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'explore' || path === 'explore') setActiveTabState('explore');
      else if (tabParam === 'game' || path === 'game') setActiveTabState('game');
      else if (tabParam === 'cases' || path === 'cases') setActiveTabState('cases');
      else if (tabParam === 'about' || path === 'about') setActiveTabState('about');
      else setActiveTabState('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check URL query parameters and load initial data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const caseParam = params.get('case');
    const raParam = params.get('ra');
    const decParam = params.get('dec');
    const langParam = params.get('lang');

    if (langParam === 'ar' || langParam === 'en') {
      setLanguage(langParam);
      localStorage.setItem('spherex_lang', langParam);
    }

    // Fetch curated real cases on startup
    fetch('/api/spherex/cases')
      .then((r) => r.json())
      .then((data) => {
        setCases(data);
        if (caseParam && data.some((c: any) => c.id === caseParam)) {
          loadCase(caseParam);
        } else if (raParam && decParam && !Number.isNaN(parseFloat(raParam)) && !Number.isNaN(parseFloat(decParam))) {
          loadCase(data[0]?.id || 'case-nep-var-01', {
            ra: parseFloat(raParam),
            dec: parseFloat(decParam),
          });
        } else if (data && data.length > 0) {
          loadCase(data[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load curated SPHEREx cases:', err);
      });
  }, []);

  // Process a case by ID with optional custom coordinates, FOV sizePix, and epochPair
  const loadCase = async (
    caseId: string,
    customCoords?: { ra: number; dec: number },
    options?: { sizePix?: number; epochPair?: string }
  ) => {
    setIsLoading(true);
    setErrorMsg(null);
    setFailedQuery(null);

    // Client-side survey footprint boundary check to avoid uncaught network/pipeline errors
    if (customCoords) {
      const coordCheck = checkCoordinatesInQR2(customCoords.ra, customCoords.dec);
      if (!coordCheck.inside) {
        setIsLoading(false);
        const coverageMsg = `IRSA IBE: Celestial coordinates (RA ${customCoords.ra.toFixed(4)}°, Dec ${customCoords.dec >= 0 ? '+' : ''}${customCoords.dec.toFixed(4)}°) do not overlap with available SPHEREx QR2 survey coverage. Query within the North Ecliptic Pole footprint (RA ~275.5°–276.8°, Dec ~64.5°–65.2°).`;
        setErrorMsg(coverageMsg);
        setFailedQuery({ caseId, customCoords });
        setFallbackQuery({ ra: customCoords.ra, dec: customCoords.dec });
        // Automatically open verified NEP benchmark so the user can inspect a reference field
        loadCase('case-nep-var-01');
        return;
      } else {
        setFallbackQuery(null);
      }
    }

    try {
      const res = await fetch('/api/spherex/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          customCoords,
          sizePix: options?.sizePix,
          epochPair: options?.epochPair,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 422) {
          setErrorMsg(errorData.error || 'Coordinates lie outside SPHEREx QR2 survey coverage.');
          setFailedQuery({ caseId, customCoords });
          if (customCoords) {
            setFallbackQuery({ ra: customCoords.ra, dec: customCoords.dec });
            loadCase('case-nep-var-01');
          }
          return;
        }
        throw new Error(errorData.error || `Pipeline returned HTTP status ${res.status}`);
      }
      const data: InvestigationResult = await res.json();
      setCurrentResult(data);
    } catch (err: any) {
      const msg = err.message || 'Failed to process SPHEREx observation';
      if (msg.includes('coverage') || msg.includes('footprint') || msg.includes('422')) {
        console.warn('[Coverage Notice]', msg);
      } else {
        console.error('Case processing failed:', err);
      }
      setErrorMsg(msg);
      setFailedQuery({ caseId, customCoords });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExplore = (caseId?: string) => {
    setFallbackQuery(null);
    if (caseId) {
      loadCase(caseId);
    }
    setActiveTab('explore');
  };

  const handleSelectCase = (caseId: string, options?: { sizePix?: number; epochPair?: string }) => {
    setFallbackQuery(null);
    loadCase(caseId, undefined, options);
    setActiveTab('explore');
  };

  const handleClearFallback = () => {
    setFallbackQuery(null);
  };

  const handleSearchTarget = (ra: number, dec: number, sizePix?: number) => {
    loadCase(cases[0]?.id || 'case-nep-var-01', { ra, dec }, { sizePix });
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('spherex_lang', next);
      return next;
    });
  };

  const t = translations[language];

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === 'dark' ? 'bg-[#07090e] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      } selection:bg-amber-500/30 selection:text-amber-200 ${
        language === 'ar' ? 'font-cairo' : 'font-sans'
      }`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        targetCoords={currentResult?.targetCoords}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 w-full relative">
        {errorMsg && (
          <div className="w-full bg-amber-500/10 dark:bg-rose-950/80 border-b border-amber-500/30 dark:border-rose-500/40 px-4 py-3 text-xs text-slate-800 dark:text-rose-200 flex flex-wrap items-center justify-between gap-3 shadow-sm backdrop-blur-xl transition-colors">
            <div className="flex items-center gap-2 max-w-2xl">
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {errorMsg.includes('coverage') || errorMsg.includes('footprint')
                  ? t.noticeSurveyCoverage
                  : t.noticeGeneral}
              </span>
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  loadCase('case-nep-var-01');
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-xs cursor-pointer"
              >
                {t.btnInspectNepBenchmark}
              </button>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 ml-2 font-medium underline cursor-pointer"
              >
                {t.btnDismissNotice}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <HomeView
            onStartExplore={handleStartExplore}
            onOpenAbout={() => setActiveTab('about')}
            onOpenCases={() => setActiveTab('cases')}
            onPlayGame={() => setActiveTab('game')}
            cases={cases}
            language={language}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreView
            currentResult={currentResult}
            isLoading={isLoading}
            onSearchTarget={handleSearchTarget}
            onSelectCase={handleSelectCase}
            cases={cases}
            language={language}
            fallbackQuery={fallbackQuery}
            onClearFallback={handleClearFallback}
          />
        )}

        {activeTab === 'game' && (
          <SpexAdventureGame
            language={language}
            onExitToExplore={(caseId) => handleStartExplore(caseId)}
            onBackToHome={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'cases' && (
          <CasesView
            cases={cases}
            onSelectCase={handleSelectCase}
            language={language}
          />
        )}

        {activeTab === 'about' && <AboutView language={language} />}
      </main>
    </div>
  );
}

export default App;
