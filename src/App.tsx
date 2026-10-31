import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { ExploreView } from './components/ExploreView';
import { CasesView } from './components/CasesView';
import { AboutView } from './components/AboutView';
import { InvestigationResult } from './science/types';
import { Language } from './utils/translations';

export function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'cases' | 'about'>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [cases, setCases] = useState<any[]>([]);
  const [currentResult, setCurrentResult] = useState<InvestigationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [failedQuery, setFailedQuery] = useState<{ caseId: string; customCoords?: { ra: number; dec: number } } | null>(null);

  // Check URL query parameters (e.g. ?case=case-cal-stable-02 or ?ra=276.2614&dec=64.8258 or ?tab=explore or ?lang=ar)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const caseParam = params.get('case');
    const raParam = params.get('ra');
    const decParam = params.get('dec');
    const tabParam = params.get('tab');
    const autostartParam = params.get('autostart');
    const langParam = params.get('lang');

    if (langParam === 'ar') {
      setLanguage('ar');
    }

    if (autostartParam === '1' || tabParam === 'explore' || caseParam || (raParam && decParam)) {
      setActiveTab('explore');
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

  // Process a case by ID
  const loadCase = async (caseId: string, customCoords?: { ra: number; dec: number }) => {
    setIsLoading(true);
    setErrorMsg(null);
    setFailedQuery(null);
    try {
      const res = await fetch('/api/spherex/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, customCoords }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Pipeline returned HTTP status ${res.status}`);
      }
      const data: InvestigationResult = await res.json();
      setCurrentResult(data);
    } catch (err: any) {
      console.error('Case processing failed:', err);
      setErrorMsg('Failed to process SPHEREx observation: ' + err.message);
      setFailedQuery({ caseId, customCoords });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExplore = (caseId?: string) => {
    if (caseId) {
      loadCase(caseId);
    }
    setActiveTab('explore');
  };

  const handleSelectCase = (caseId: string) => {
    loadCase(caseId);
    setActiveTab('explore');
  };

  const handleSearchTarget = (ra: number, dec: number) => {
    loadCase(cases[0]?.id || 'case-nep-var-01', { ra, dec });
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#02040a] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200 ${
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
      />

      <main className="flex-1 w-full relative">
        {errorMsg && (
          <div className="w-full bg-rose-950/90 border-b border-rose-500/40 px-4 py-3 text-xs text-rose-200 flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-rose-400">⚠️ Error:</span>
              <span>{errorMsg}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              {failedQuery && (
                <button
                  onClick={() => loadCase(failedQuery.caseId, failedQuery.customCoords)}
                  className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-bold transition-colors"
                >
                  Retry Investigation
                </button>
              )}
              <button
                onClick={() => {
                  setErrorMsg(null);
                  loadCase('case-nep-var-01');
                }}
                className="px-3 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-bold transition-colors"
              >
                Inspect Saved Benchmark Case
              </button>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-slate-400 hover:text-slate-200 ml-2 font-bold underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <HomeView
            onStartExplore={handleStartExplore}
            onOpenAbout={() => setActiveTab('about')}
            onOpenCases={() => setActiveTab('cases')}
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
