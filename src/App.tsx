import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { Header, AppTab } from './components/Header';
import { HomeView } from './components/HomeView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InvestigationResult, ChallengeTarget } from './science/types';
import { parseCoordinateInput } from './science/challengeTargets';
import { Language, translations } from './utils/translations';
import { FamousObject, getFamousObjectById } from './science/famousObjects';
import { FlyTargetSelection } from './ui/FlyToSearch';

const AcademyView = lazy(() =>
  import('./components/AcademyView').then((m) => ({ default: m.AcademyView }))
);
const ExploreView = lazy(() =>
  import('./components/ExploreView').then((m) => ({ default: m.ExploreView }))
);
const CasesView = lazy(() =>
  import('./components/CasesView').then((m) => ({ default: m.CasesView }))
);
const AboutView = lazy(() =>
  import('./components/AboutView').then((m) => ({ default: m.AboutView }))
);
const SpexAdventureGame = lazy(() =>
  import('./game/SpexAdventureGame').then((m) => ({ default: m.SpexAdventureGame }))
);
const Screen1Sky = lazy(() =>
  import('./components/Screen1Sky').then((m) => ({ default: m.Screen1Sky }))
);
const AchievementsModal = lazy(() =>
  import('./components/AchievementsModal').then((m) => ({ default: m.AchievementsModal }))
);
const SpexSpaceDictionaryModal = lazy(() =>
  import('./components/SpexSpaceDictionaryModal').then((m) => ({ default: m.SpexSpaceDictionaryModal }))
);
const FamousObjectsView = lazy(() =>
  import('./components/FamousObjectsView').then((m) => ({ default: m.FamousObjectsView }))
);
const CommunityView = lazy(() =>
  import('./components/CommunityView').then((m) => ({ default: m.CommunityView }))
);

export type { AppTab };

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
  const isEmbed =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('embed') === '1';

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
    if (tabParam === 'explore' || path === 'explore' || hasDeepLink || isEmbed) return 'explore';
    if (tabParam === 'academy' || path === 'academy') return 'academy';
    if (tabParam === 'famous' || path === 'famous') return 'famous';
    if (tabParam === 'game' || path === 'game') return 'game';
    if (tabParam === 'cases' || path === 'cases') return 'cases';
    if (tabParam === 'community' || path === 'community') return 'community';
    if (tabParam === 'about' || path === 'about') return 'about';
    if (tabParam === 'home' || path === 'home') return 'home';
    return 'home';
  };

  const [activeTab, setActiveTabState] = useState<AppTab>(getInitialTab);

  // Navigate tab and synchronize browser history pathname
  const setActiveTab = (tab: AppTab, replace = false) => {
    if (tab === 'explore' && activeTab !== 'explore') {
      setExploreScreen('sky');
    }
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
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const langParam = params.get('lang');
      if (langParam === 'ar' || langParam === 'en') return langParam;
      const saved = typeof window !== 'undefined' ? (localStorage.getItem('spherex_lang') as Language | null) : null;
      return saved === 'ar' || saved === 'en' ? saved : 'en';
    } catch {
      return 'en';
    }
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
  const [exploreScreen, setExploreScreen] = useState<'sky' | 'hunt'>(() => {
    if (typeof window === 'undefined') return 'sky';
    const params = new URLSearchParams(window.location.search);
    const hasDeepLink = Boolean(
      params.get('target') ||
        params.get('case') ||
        params.get('coords') ||
        (params.get('ra') && params.get('dec')) ||
        params.get('band') ||
        params.get('detector') ||
        params.get('fov') ||
        params.get('embed') === '1'
    );
    return hasDeepLink ? 'hunt' : 'sky';
  });
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
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [autoPlayExplore, setAutoPlayExplore] = useState(false);
  const [exploreResetKey, setExploreResetKey] = useState(0);
  const [academyResetKey, setAcademyResetKey] = useState(0);
  const [exploreFromAcademy, setExploreFromAcademy] = useState(false);
  const loadCaseAbortRef = useRef<AbortController | null>(null);

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
    try {
      const savedTheme = localStorage.getItem('spherex_theme') as 'dark' | 'light' | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    } catch {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Keep document lang & dir synced for accessible RTL mirroring
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('spherex_theme', next);
      } catch {}
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
      else if (tabParam === 'academy' || path === 'academy') setActiveTabState('academy');
      else if (tabParam === 'famous' || path === 'famous') setActiveTabState('famous');
      else if (tabParam === 'game' || path === 'game') setActiveTabState('game');
      else if (tabParam === 'cases' || path === 'cases') setActiveTabState('cases');
      else if (tabParam === 'community' || path === 'community') setActiveTabState('community');
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
      try {
        localStorage.setItem('spherex_lang', langParam);
      } catch {}
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
        const targetId =
          caseParam && data.some((c: any) => c.id === caseParam)
            ? caseParam
            : targetCaseFromSlug && data.some((c: any) => c.id === targetCaseFromSlug)
            ? targetCaseFromSlug
            : data.find((c: any) => c.id === 'case-wise-0855')?.id || data[0]?.id || 'case-wise-0855';
        if (parsedCoords) {
          setSelectedTarget({
            id: targetCaseFromSlug || 'custom-coords',
            name: `${parsedCoords.ra.toFixed(3)}°, ${parsedCoords.dec.toFixed(3)}°`,
            ra: parsedCoords.ra,
            dec: parsedCoords.dec,
            constellation: '',
            scienceType: 'Coordinate search',
            description: 'Custom sky coordinates',
            qr2Coverage: 'covered',
            angularDistanceDegToNEP: 0,
            recommendedBenchmarkId: targetCaseFromSlug || 'custom',
            expectedBehavior: '',
          });
          if (isScientistMode) {
            loadCase(targetCaseFromSlug || targetId, parsedCoords, { sizePix: sizePixParam, epochPair });
          } else if (targetCaseFromSlug) {
            setActiveCaseId(targetCaseFromSlug);
          } else {
            setActiveCaseId(null);
          }
        } else if (isScientistMode) {
          loadCase(targetId, undefined, { sizePix: sizePixParam, epochPair });
        } else {
          setActiveCaseId(targetId);
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
    if (loadCaseAbortRef.current) {
      loadCaseAbortRef.current.abort();
      loadCaseAbortRef.current = null;
    }
    const controller = new AbortController();
    loadCaseAbortRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15000);

    if (!customCoords && caseId) setActiveCaseId(caseId);
    else if (customCoords) setActiveCaseId(null);
    setIsLoading(true);
    setErrorMsg(null);
    setFailedQuery(null);

    try {
      const res = await fetch('/api/spherex/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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
      if (err?.name === 'AbortError' && !timedOut) {
        return;
      }
      const isKnownPreset = Boolean(
        !customCoords &&
          ['case-wise-0855', 'case-barnards-star', 'case-epsilon-indi', 'case-rw-aur', 'case-r-dra'].includes(caseId)
      );
      if (isKnownPreset) {
        // FramePlayer automatically handles saved snapshot fallback for the 5 benchmark targets
        return;
      }
      const msg = timedOut
        ? 'Live archive metadata timed out — viewer will fall back to saved data if available.'
        : err.message || 'Failed to process SPHEREx observation';
      console.error('Case processing failed:', err);
      setErrorMsg(msg);
      setFailedQuery({ caseId, customCoords });
    } finally {
      clearTimeout(timeoutId);
      if (loadCaseAbortRef.current === controller) {
        loadCaseAbortRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleStartExplore = (caseId?: string) => {
    setFallbackQuery(null);
    setExploreScreen(caseId ? 'hunt' : 'sky');
    setExploreFromAcademy(false);
    if (caseId) {
      setSelectedTarget(null);
      if (isScientistMode) {
        loadCase(caseId);
      } else {
        setActiveCaseId(caseId);
      }
    }
    setActiveTabState('explore');
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath !== '/explore') {
        window.history.pushState({ tab: 'explore' }, '', `/explore${window.location.search}`);
      }
    }
  };

  const handleOpenCoordsInExplore = (ra: number, dec: number) => {
    setFallbackQuery(null);
    setExploreFromAcademy(false);
    setActiveCaseId(null);
    setSelectedTarget({
      id: 'custom-coords',
      name: `${ra.toFixed(3)}°, ${dec.toFixed(3)}°`,
      ra,
      dec,
      constellation: '',
      scienceType: 'Coordinate search',
      description: 'Custom sky coordinates',
      qr2Coverage: 'covered',
      angularDistanceDegToNEP: 0,
      recommendedBenchmarkId: 'custom',
      expectedBehavior: '',
    });
    setExploreScreen('hunt');
    setActiveTabState('explore');
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      p.set('ra', ra.toFixed(5));
      p.set('dec', dec.toFixed(5));
      p.delete('case');
      p.delete('target');
      window.history.pushState({ tab: 'explore' }, '', `/explore?${p.toString()}`);
    }
    loadCase('', { ra, dec });
  };

  const handleOpenExploreFromAcademy = (caseId: string) => {
    setFallbackQuery(null);
    setExploreScreen('hunt');
    setExploreFromAcademy(true);
    if (caseId) {
      if (isScientistMode) {
        loadCase(caseId);
      } else {
        setActiveCaseId(caseId);
      }
    }
    setActiveTab('explore');
  };

  const handleQuickDemoWise = () => {
    setFallbackQuery(null);
    setExploreScreen('hunt');
    setAutoPlayExplore(true);
    loadCase('case-wise-0855');
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

  const handleFlySelection = (selection: FlyTargetSelection) => {
    setFallbackQuery(null);
    const sizePix = selection.sizePix || 64;
    setActiveSizePix(sizePix);
    const flyTarget: ChallengeTarget = {
      id: selection.id,
      name: selection.name,
      ra: selection.ra,
      dec: selection.dec,
      constellation: '',
      scienceType: selection.source,
      description: selection.description,
      qr2Coverage: selection.knownCovered ? 'covered' : 'outside_footprint',
      angularDistanceDegToNEP: 0,
      recommendedBenchmarkId: selection.caseId || selection.id,
      expectedBehavior: selection.description,
    };
    setSelectedTarget(flyTarget);
    setExploreScreen('hunt');
    setActiveTab('explore');
    if (selection.caseId) {
      loadCase(selection.caseId, undefined, { sizePix });
    } else {
      loadCase('', { ra: selection.ra, dec: selection.dec }, { sizePix });
    }
  };

  const handleDetectorChange = (det: string) => {
    setActiveDetector(det);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (det) params.set('band', det);
      else params.delete('band');
      const qs = params.toString();
      window.history.replaceState({ ...window.history.state }, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'ar' : 'en';
      try {
        localStorage.setItem('spherex_lang', next);
      } catch {}
      return next;
    });
  };

  const handleToggleScientistMode = () => {
    const next = !isScientistMode;
    setIsScientistMode(next);
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
    if (next && !currentResult && !isLoading) {
      loadCase(activeCaseId || 'case-wise-0855', undefined, { sizePix: activeSizePix });
    }
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
      {!isEmbed && (
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          targetCoords={currentResult?.targetCoords}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenAchievements={() => setAchievementsOpen(true)}
        />
      )}

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

        <Suspense
          fallback={
            <div className="min-h-[45vh] flex items-center justify-center text-xs font-mono text-slate-400">
              {language === 'ar' ? 'جاري تحميل المساحة...' : 'Loading workspace...'}
            </div>
          }
        >
          {activeTab === 'home' && (
            <HomeView
              onStartAcademy={() => setActiveTab('academy')}
              onStartExplore={handleStartExplore}
              onSearchCoords={handleOpenCoordsInExplore}
              onQuickDemoWise={handleQuickDemoWise}
              onFlySelection={handleFlySelection}
              onOpenAbout={() => setActiveTab('about')}
              onOpenCases={() => setActiveTab('cases')}
              onPlayGame={() => setActiveTab('game')}
              onOpenCommunity={() => setActiveTab('community')}
              cases={cases}
              language={language}
            />
          )}

          {activeTab === 'academy' && (
            <ErrorBoundary
              title={t.academyBoundaryTitle}
              description={t.academyBoundaryHint}
              retryLabel={t.academyBackToMapBtn}
              resetKey={academyResetKey}
              onRetry={() => {
                try {
                  window.sessionStorage?.removeItem('spex_academy_session_v1');
                } catch {}
                setAcademyResetKey((k) => k + 1);
              }}
            >
              <AcademyView
                key={academyResetKey}
                language={language}
                onOpenTargetInViewer={handleOpenExploreFromAcademy}
                onGoToPlay={() => {
                  setExploreFromAcademy(false);
                  setActiveTab('game');
                }}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'explore' && (
            <>
              {exploreFromAcademy && !isEmbed && (
                <div className="w-full bg-sky-950/75 border-b border-sky-400/30 px-4 py-2 flex items-center justify-between gap-3 text-xs">
                  <span className="text-sky-200 font-medium">
                    {language === 'ar'
                      ? 'أكمل الفحص في العارض ثم عد إلى الأكاديمية — إجاباتك محفوظة.'
                      : 'Complete your hands-on check here, then jump back — your Academy answers are saved.'}
                  </span>
                  <button
                    type="button"
                    data-testid="explore-back-to-academy"
                    onClick={() => {
                      setExploreFromAcademy(false);
                      setActiveTab('academy');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold whitespace-nowrap cursor-pointer transition"
                  >
                    {t.exploreReturnToAcademy}
                  </button>
                </div>
              )}
            <ErrorBoundary
              title={t.exploreErrorTitle}
              description={t.exploreErrorHint}
              retryLabel={t.exploreRetryBtn}
              secondaryLabel={t.exploreOfflineDemoBtn}
              resetKey={`${activeCaseId || ''}-${exploreScreen}-${exploreResetKey}`}
              onRetry={() => {
                setErrorMsg(null);
                setExploreResetKey((k) => k + 1);
                loadCase(activeCaseId || 'case-wise-0855');
              }}
              onSecondary={() => {
                setErrorMsg(null);
                setExploreScreen('hunt');
                setActiveCaseId('case-wise-0855');
                setExploreResetKey((k) => k + 1);
              }}
            >
              {exploreScreen === 'sky' ? (
                <Screen1Sky
                  language={language}
                  onSelectTarget={(target) => {
                    setSelectedTarget(target);
                    setExploreScreen('hunt');
                    const tId = target.id.toLowerCase();
                    if (tId.includes('barnard')) {
                      setActiveCaseId('case-barnards-star');
                      loadCase('case-barnards-star');
                    } else if (tId.includes('wise-0855') || tId.includes('0855')) {
                      setActiveCaseId('case-wise-0855');
                      loadCase('case-wise-0855');
                    } else if (tId.includes('rw-aur')) {
                      setActiveCaseId('case-rw-aur');
                      loadCase('case-rw-aur');
                    } else if (tId.includes('r-dra')) {
                      setActiveCaseId('case-r-dra');
                      loadCase('case-r-dra');
                    } else if (tId.includes('epsilon-indi') || tId.includes('indi')) {
                      setActiveCaseId('case-epsilon-indi');
                      loadCase('case-epsilon-indi');
                    } else {
                      setActiveCaseId(null);
                      loadCase(target.id, { ra: target.ra, dec: target.dec });
                    }
                  }}
                  onSelectCoords={(ra, dec) => {
                    handleOpenCoordsInExplore(ra, dec);
                  }}
                />
              ) : (
                <div className="spex-flythrough-in" key={exploreResetKey}>
                  <ExploreView
                    currentResult={currentResult}
                    isLoading={isLoading}
                    onSearchTarget={handleSearchTarget}
                    onFlySelection={handleFlySelection}
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
                    autoPlay={autoPlayExplore}
                    onAutoPlayConsumed={() => setAutoPlayExplore(false)}
                    isEmbed={isEmbed}
                  />
                </div>
              )}
            </ErrorBoundary>
            </>
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

          {activeTab === 'community' && (
            <CommunityView
              language={language}
              onOpenTargetInViewer={(caseId) => handleStartExplore(caseId)}
            />
          )}

          {activeTab === 'about' && <AboutView language={language} />}
        </Suspense>
      </main>

      {!isEmbed && (
        <footer className="w-full border-t border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#05070C] px-4 py-3 text-center text-[11px] font-mono text-slate-500 dark:text-slate-400">
          Credits: NASA/IPAC IRSA, SPHEREx, Gaia, WISE, Aladin/CDS. NASA does not endorse this project.
        </footer>
      )}

      {/* Global SPEX Space Dictionary Modal */}
      {globalDictionaryOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 text-xs font-mono text-slate-300">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          }
        >
          <SpexSpaceDictionaryModal
            isOpen={globalDictionaryOpen}
            onClose={() => setGlobalDictionaryOpen(false)}
            language={language}
            initialTermId={globalDictionaryTermId}
            onSelectTerm={(termId) => setGlobalDictionaryTermId(termId)}
          />
        </Suspense>
      )}

      {/* Local Achievements & Nickname Scoreboard Modal */}
      {achievementsOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 text-xs font-mono text-slate-300">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          }
        >
          <AchievementsModal
            isOpen={achievementsOpen}
            onClose={() => setAchievementsOpen(false)}
            language={language}
            onOpenExplore={() => handleStartExplore()}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
