import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { ExploreView } from './components/ExploreView';
import { CasesView } from './components/CasesView';
import { AboutView } from './components/AboutView';
import { SpexAdventureGame } from './game/SpexAdventureGame';
import { Screen1Sky } from './components/Screen1Sky';
import { InvestigationResult, ChallengeTarget } from './science/types';
import { parseCoordinateInput } from './science/challengeTargets';
import { Language, translations } from './utils/translations';
import { SpexSpaceDictionaryModal } from './components/SpexSpaceDictionaryModal';
import { FamousObjectsView } from './components/FamousObjectsView';
import { FamousObject, getFamousObjectById } from './science/famousObjects';

export type AppTab = 'home' | 'explore' | 'famous' | 'game' | 'cases' | 'about';

function resolveCaseIdFromTargetSlug(slug?: string | null): string | null {
  if (!slug) return null;
  const s = slug.toLowerCase();
  if (s.includes('wise-0855') || s.includes('0855')) return 'case-wise-0855';
  if (s.includes('barnard')) return 'case-barnards-star';
  if (s.includes('epsilon-indi') || s.includes('indi')) return 'case-epsilon-indi';
  if (s.includes('rw-aur')) return 'case-rw-aur';
  if (s.includes('r-dra')) return 'case-r-dra';
  return null;
}

export function App() {
  const getInitialTab = (): AppTab => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const hasDeepLink = Boolean(
      params.get('target') ||
        params.get('case') ||
        params.get('coords') ||
        (params.get('ra') && params.get('dec')) ||
        params.get('band') ||
        params.get('detector') ||
        params.get('fov')
    );
    const tabParam = params.get('tab');
    if (tabParam === 'explore' || path === 'explore' || hasDeepLink) return 'explore';
    if (tabParam === 'famous' || path === 'famous') return 'famous';
    if (tabParam === 'game' || path === 'game') return 'game';
    if (tabParam === 'cases' || path === 'cases') return 'cases';
    if (tabParam === 'about' || path === 'about') return 'about';
    if (tabParam === 'home' || path === 'home') return 'home';
    return 'home';
  };

  const [activeTab, setActiveTabState] = useState<AppTab>(getInitialTab);

  // Navigate tab and synchronize browser history pathname
  const setActiveTab = (tab: AppTab, replace = false) => {
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

  const [isScientistMode, setIsScientistMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    if (modeParam === 'scientist') return true;
    if (modeParam === 'explorer') return false;
    try {
      return localStorage.getItem('spherex_explore_mode') === 'scientist';
    } catch {
      return false;
    }
  });
  const [exploreScreen, setExploreScreen] = useState<'sky' | 'hunt'>('hunt');
  const [selectedTarget, setSelectedTarget] = useState<ChallengeTarget | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeDetector, setActiveDetector] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get('band') || params.get('detector') || '').toUpperCase();
    const m = raw.match(/D?([1-6])/);
    return m ? `D${m[1]}` : undefined;
  });
  const [activeSizePix, setActiveSizePix] = useState<number>(() => {
    if (typeof window === 'undefined') return 64;
    const params = new URLSearchParams(window.location.search);
    const fov = parseFloat(params.get('fov') || '');
    if (Number.isFinite(fov) && fov > 0) {
      const approx = Math.round((fov * 60) / 6.2);
      const valid = [32, 64, 112, 160];
      return valid.reduce((prev, curr) => (Math.abs(curr - approx) < Math.abs(prev - approx) ? curr : prev), 64);
    }
    return 64;
  });

  const [failedQuery, setFailedQuery] = useState<{ caseId: string; customCoords?: { ra: number; dec: number } } | null>(null);
  const [fallbackQuery, setFallbackQuery] = useState<{ ra: number; dec: number } | null>(null);
  const [globalDictionaryOpen, setGlobalDictionaryOpen] = useState(false);
  const [globalDictionaryTermId, setGlobalDictionaryTermId] = useState<string | null>(null);

  // Global listener for dictionary requests from anywhere in the app
  useEffect(() => {
    const handleOpenDict = (e: Event) => {
      const customEvt = e as CustomEvent<{ termId?: string }>;
      if (customEvt.detail?.termId) {
        setGlobalDictionaryTermId(customEvt.detail.termId);
      }
      setGlobalDictionaryOpen(true);
    };

    window.addEventListener('open-spex-dictionary', handleOpenDict);
    return () => {
      window.removeEventListener('open-spex-dictionary', handleOpenDict);
    };
  }, []);

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
      const hasDeepLink = Boolean(
        params.get('target') ||
          params.get('case') ||
          params.get('coords') ||
          (params.get('ra') && params.get('dec')) ||
          params.get('band') ||
          params.get('detector') ||
          params.get('fov')
      );
      if (tabParam === 'explore' || path === 'explore' || (path === '' && hasDeepLink)) setActiveTabState('explore');
      else if (tabParam === 'famous' || path === 'famous') setActiveTabState('famous');
      else if (tabParam === 'game' || path === 'game') setActiveTabState('game');
      else if (tabParam === 'cases' || path === 'cases') setActiveTabState('cases');
      else if (tabParam === 'about' || path === 'about') setActiveTabState('about');
      else setActiveTabState('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check URL query parameters and load initial data (Task 7)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const caseParam = params.get('case');
    const coordsParam = params.get('coords');
    const raParam = params.get('ra');
    const decParam = params.get('dec');
    const langParam = params.get('lang');
    const targetParam = params.get('target');
    const fovParam = params.get('fov');
    const sizePixParam = fovParam ? Math.round((parseFloat(fovParam) * 60) / 6.2) : undefined;
    const epochAParam = params.get('epochA') || '1';
    const epochBParam = params.get('epochB') || '3';
    const epochPair = `${epochAParam}-${epochBParam}`;

    if (langParam === 'ar' || langParam === 'en') {
      setLanguage(langParam);
      localStorage.setItem('spherex_lang', langParam);
    }

    let parsedCoords: { ra: number; dec: number } | null = null;
    const targetCaseFromSlug = resolveCaseIdFromTargetSlug(targetParam);
    if (coordsParam) {
      const p = parseCoordinateInput(coordsParam);
      if (p) parsedCoords = { ra: p.ra, dec: p.dec };
    } else if (raParam && decParam) {
      const p = parseCoordinateInput(`${raParam}, ${decParam}`);
      if (p) parsedCoords = { ra: p.ra, dec: p.dec };
    } else if (targetParam && !targetCaseFromSlug) {
      const fam = getFamousObjectById(targetParam);
      if (fam) {
        parsedCoords = { ra: fam.ra, dec: fam.dec };
      }
    }

    // Fetch curated real cases on startup and preload requested target or WISE 0855
    fetch('/api/spherex/cases')
      .then((r) => {
        if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) {
          throw new Error(`Failed to fetch curated cases (HTTP ${r.status})`);
        }
        return r.json();
      })
      .then((data) => {
        setCases(data);
        if (parsedCoords) {
          loadCase(targetCaseFromSlug || data[0]?.id || 'case-wise-0855', parsedCoords, { sizePix: sizePixParam, epochPair });
        } else if (caseParam && data.some((c: any) => c.id === caseParam)) {
          loadCase(caseParam, undefined, { sizePix: sizePixParam, epochPair });
        } else if (targetCaseFromSlug && data.some((c: any) => c.id === targetCaseFromSlug)) {
          loadCase(targetCaseFromSlug, undefined, { sizePix: sizePixParam, epochPair });
        } else if (data && data.length > 0) {
          const wiseDefault = data.find((c: any) => c.id === 'case-wise-0855')?.id || data[0].id;
          loadCase(wiseDefault, undefined, { sizePix: sizePixParam, epochPair });
        }
      })
      .catch((err) => {
        console.error('Failed to load curated SPHEREx cases:', err);
      });
  }, []);

  // Process a case by ID with optional custom coordinates, FOV sizePix, and epochPair (Task 1 & 7)
  const loadCase = async (
    caseId: string,
    customCoords?: { ra: number; dec: number },
    options?: { sizePix?: number; epochPair?: string; mode?: string; detector?: string }
  ) => {
    if (!customCoords && caseId) setActiveCaseId(caseId);
    else if (customCoords) setActiveCaseId(null);
    setIsLoading(true);
    setErrorMsg(null);
    setFailedQuery(null);

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

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        console.warn(`[SPEX] Non-JSON response received from /api/spherex/process (HTTP ${res.status}):`, text.slice(0, 100));
        setErrorMsg('Data service temporarily unavailable or returned unexpected response. Please retry.');
        setFailedQuery({ caseId, customCoords });
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 404 || res.status === 422) {
          // Honest reporting: field has not yet been observed in current release
          const msg = errorData.error || `IRSA TAP: 0 SPHEREx observations found for requested coordinates.`;
          setErrorMsg(msg);
          setFailedQuery({ caseId, customCoords });
          return;
        }
        throw new Error(errorData.error || `Pipeline returned HTTP status ${res.status}`);
      }

      const data: InvestigationResult = await res.json();
      setCurrentResult(data);

      // Update URL query parameters so any view can be bookmarked or shared (Task 7)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (customCoords) {
          params.set('ra', customCoords.ra.toFixed(5));
          params.set('dec', customCoords.dec.toFixed(5));
          params.delete('case');
        } else {
          params.set('case', caseId);
          params.delete('ra');
          params.delete('dec');
          params.delete('coords');
        }
        if (options?.sizePix) {
          const fov = Number(((options.sizePix * 6.2) / 60).toFixed(1));
          params.set('fov', String(fov));
        }
        if (options?.epochPair) {
          const [eA, eB] = options.epochPair.split('-');
          if (eA) params.set('epochA', eA);
          if (eB) params.set('epochB', eB);
        }
        if (options?.mode) {
          params.set('mode', options.mode);
        }
        if (options?.detector) {
          params.set('detector', options.detector);
        }
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({ ...window.history.state }, '', newUrl);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to process SPHEREx observation';
      console.error('Case processing failed:', err);
      setErrorMsg(msg);
      setFailedQuery({ caseId, customCoords });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExplore = (caseId?: string) => {
    setFallbackQuery(null);
    setExploreScreen('hunt');
    if (caseId) {
      loadCase(caseId);
    }
    setActiveTab('explore');
  };

  const handleSelectCase = (caseId: string, options?: { sizePix?: number; epochPair?: string }) => {
    setFallbackQuery(null);
    if (options?.sizePix) setActiveSizePix(options.sizePix);
    setExploreScreen('hunt');
    loadCase(caseId, undefined, options);
    setActiveTab('explore');
  };

  const handleSelectFamousObject = (obj: FamousObject) => {
    setFallbackQuery(null);
    const sizePix = Math.round((obj.suggestedFovArcmin * 60) / 6.2);
    const coords = { ra: obj.ra, dec: obj.dec };

    // Create a ChallengeTarget compatibility object
    const targetObj: ChallengeTarget = {
      id: obj.challengeTargetId || `target-${obj.id}`,
      name: obj.name,
      ra: obj.ra,
      dec: obj.dec,
      constellation: obj.constellation,
      scienceType: obj.classification,
      description: obj.shortDescriptionEn,
      qr2Coverage: obj.spherexStatus === 'Covered (Archive)' ? 'covered' : 'outside_footprint',
      angularDistanceDegToNEP: 0,
      recommendedBenchmarkId: obj.id,
      expectedBehavior: obj.scientificExplanationEn,
      pmRaMasYr: obj.pmRaMasYr,
      pmDecMasYr: obj.pmDecMasYr,
      coordinateEpochYear: obj.coordinateEpochYear,
      coordinateVerification: obj.coordinateVerification,
    };

    setSelectedTarget(targetObj);
    setExploreScreen('hunt');
    setActiveTab('explore');

    const objId = obj.id.toLowerCase();
    if (objId.includes('barnard')) {
      loadCase('case-barnards-star', undefined, { sizePix });
    } else if (objId.includes('wise-0855') || objId.includes('0855')) {
      loadCase('case-wise-0855', undefined, { sizePix });
    } else if (objId.includes('rw-aur')) {
      loadCase('case-rw-aur', undefined, { sizePix });
    } else if (objId.includes('r-dra')) {
      loadCase('case-r-dra', undefined, { sizePix });
    } else if (objId.includes('epsilon-indi') || objId.includes('indi')) {
      loadCase('case-epsilon-indi', undefined, { sizePix });
    } else {
      loadCase(obj.id, coords, { sizePix });
    }

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('target', obj.id);
      urlParams.set('ra', obj.ra.toFixed(5));
      urlParams.set('dec', obj.dec.toFixed(5));
      urlParams.set('fov', String(obj.suggestedFovArcmin));
      window.history.replaceState({ tab: 'explore' }, '', `/explore?${urlParams.toString()}`);
    }
  };

  const handleClearFallback = () => {
    setFallbackQuery(null);
  };

  const handleSearchTarget = (ra: number, dec: number, sizePix?: number) => {
    if (sizePix) setActiveSizePix(sizePix);
    loadCase('', { ra, dec }, { sizePix });
  };

  const handleDetectorChange = (det: string) => {
    setActiveDetector(det);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('band', det);
      window.history.replaceState({ ...window.history.state }, '', `${window.location.pathname}?${params.toString()}`);
    }
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('spherex_lang', next);
      return next;
    });
  };

  const handleToggleScientistMode = () => {
    setIsScientistMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('spherex_explore_mode', next ? 'scientist' : 'explorer');
        } catch {}
        const params = new URLSearchParams(window.location.search);
        if (next) params.set('mode', 'scientist');
        else params.delete('mode');
        const qs = params.toString();
        const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
        window.history.replaceState({ ...window.history.state }, '', newUrl);
      }
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
        isScientistMode={isScientistMode}
        onToggleScientistMode={handleToggleScientistMode}
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

        {activeTab === 'explore' && exploreScreen === 'sky' && (
          <Screen1Sky
            language={language}
            onSelectTarget={(target) => {
              setSelectedTarget(target);
              setExploreScreen('hunt');
              const tId = target.id.toLowerCase();
              if (tId.includes('barnard')) {
                loadCase('case-barnards-star');
              } else if (tId.includes('wise-0855') || tId.includes('0855')) {
                loadCase('case-wise-0855');
              } else if (tId.includes('rw-aur')) {
                loadCase('case-rw-aur');
              } else if (tId.includes('r-dra')) {
                loadCase('case-r-dra');
              } else if (tId.includes('epsilon-indi') || tId.includes('indi')) {
                loadCase('case-epsilon-indi');
              } else {
                loadCase(target.id, { ra: target.ra, dec: target.dec });
              }
            }}
            onSelectCoords={(ra, dec) => {
              setSelectedTarget(null);
              setExploreScreen('hunt');
              loadCase(cases[0]?.id || 'case-nep-var-01', { ra, dec });
            }}
          />
        )}

        {activeTab === 'explore' && exploreScreen === 'hunt' && (
          <ExploreView
            currentResult={currentResult}
            isLoading={isLoading}
            onSearchTarget={handleSearchTarget}
            onSelectCase={handleSelectCase}
            cases={cases}
            language={language}
            fallbackQuery={fallbackQuery}
            onClearFallback={handleClearFallback}
            onBackToSky={() => setExploreScreen('sky')}
            isScientistMode={isScientistMode}
            onToggleScientistMode={handleToggleScientistMode}
            selectedTarget={selectedTarget}
            initialDetector={activeDetector}
            onDetectorChange={handleDetectorChange}
            activeSizePix={activeSizePix}
            activeCaseId={activeCaseId}
          />
        )}

        {activeTab === 'famous' && (
          <FamousObjectsView
            language={language}
            onSelectObject={handleSelectFamousObject}
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

      <footer className="w-full border-t border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#05070C] px-4 py-3 text-center text-[11px] font-mono text-slate-500 dark:text-slate-400">
        Data: NASA/IPAC IRSA SPHEREx, ESA Gaia DR3, NASA AllWISE, CDS SIMBAD &amp; Aladin Lite. NASA does not endorse this project.
      </footer>

      {/* Global SPEX Space Dictionary Modal */}
      <SpexSpaceDictionaryModal
        isOpen={globalDictionaryOpen}
        onClose={() => setGlobalDictionaryOpen(false)}
        language={language}
        initialTermId={globalDictionaryTermId}
        onSelectTerm={(termId) => setGlobalDictionaryTermId(termId)}
      />
    </div>
  );
}

export default App;
