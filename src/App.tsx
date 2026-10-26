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

  // Check URL query parameters (e.g. ?autostart=1 or ?tab=explore or ?lang=ar)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' || params.get('tab') === 'explore') {
      setActiveTab('explore');
    }
    if (params.get('lang') === 'ar') {
      setLanguage('ar');
    }
  }, []);

  // Fetch curated real cases on startup
  useEffect(() => {
    fetch('/api/spherex/cases')
      .then((r) => r.json())
      .then((data) => {
        setCases(data);
        if (data && data.length > 0) {
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
    try {
      const res = await fetch('/api/spherex/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, customCoords }),
      });
      if (!res.ok) {
        throw new Error(`Pipeline returned HTTP status ${res.status}`);
      }
      const data: InvestigationResult = await res.json();
      setCurrentResult(data);
    } catch (err: any) {
      console.error('Case processing failed:', err);
      setErrorMsg('Failed to process SPHEREx observation: ' + err.message);
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
          <div className="w-full bg-rose-950/80 border-b border-rose-500/40 px-4 py-2 text-xs text-rose-200 text-center flex items-center justify-center gap-2">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="underline font-bold text-rose-300 ml-2"
            >
              Dismiss
            </button>
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
