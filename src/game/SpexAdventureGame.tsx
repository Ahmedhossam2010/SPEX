import React, { useState } from 'react';
import { Spex3DGame } from './3d/Spex3DGame';
import { SpexTaskStationGame } from './SpexTaskStationGame';
import { CosmicDetectiveGame } from './CosmicDetectiveGame';
import { Language } from '../utils/translations';
import { Gamepad2, Box, BookOpen, Compass, ArrowLeft } from 'lucide-react';
import { gameAudio } from './utils/gameAudio';

interface SpexAdventureGameProps {
  language: Language;
  onExitToExplore: (caseId?: string) => void;
  onBackToHome: () => void;
}

export const SpexAdventureGame: React.FC<SpexAdventureGameProps> = ({
  language,
  onExitToExplore,
  onBackToHome,
}) => {
  const isAr = language === 'ar';
  // Default mode: '3d' for the 3D Space Station Game, '2d' for the 2D Task Station, 'cases' for Detective Case files
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'cases'>('3d');

  return (
    <div className="relative w-full max-w-7xl mx-auto px-2 sm:px-4 py-3" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-[#070C18] p-2.5 rounded-2xl border border-obs-border-highlight">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition border border-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isAr ? 'الرئيسية' : 'Home'}</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Mode Toggles */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                setViewMode('3d');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-obs-amber text-slate-950 shadow-[0_0_12px_rgba(245,166,35,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{isAr ? 'محطة الفضاء 3D' : '3D Station'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                setViewMode('2d');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'محطة المهام 2D' : '2D Station (Classic)'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                setViewMode('cases');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'cases'
                  ? 'bg-obs-cyan text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isAr ? 'ملفات القضايا' : 'Detective Cases'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onExitToExplore()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-slate-950" />
            <span>{isAr ? 'الانتقال إلى مرصد SPHEREx الحقيقي' : 'Open Real SPHEREx Lab'}</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === '3d' ? (
        <Spex3DGame
          language={language}
          onBackToExplore={onExitToExplore}
          onBackToHome={onBackToHome}
        />
      ) : viewMode === '2d' ? (
        <SpexTaskStationGame
          language={language}
          onExitToExplore={onExitToExplore}
          onBackToHome={onBackToHome}
        />
      ) : (
        <CosmicDetectiveGame
          language={language}
          onExitToExplore={onExitToExplore}
          onBackToHome={onBackToHome}
        />
      )}
    </div>
  );
};

export default SpexAdventureGame;
