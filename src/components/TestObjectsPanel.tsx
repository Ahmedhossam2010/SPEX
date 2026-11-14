import React from 'react';
import { Target, Sparkles, Telescope, Compass, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { NASA_TEST_OBJECTS } from '../science/testObjects';
import { TestObject } from '../science/types';

interface TestObjectsPanelProps {
  selectedObjectId?: string | null;
  onSelectObject: (obj: TestObject) => void;
  onClose?: () => void;
  language?: 'en' | 'ar';
}

export const TestObjectsPanel: React.FC<TestObjectsPanelProps> = ({
  selectedObjectId,
  onSelectObject,
  onClose,
  language = 'en',
}) => {
  return (
    <div className="w-full rounded-3xl border border-white/15 bg-[#030712]/95 backdrop-blur-2xl p-4 sm:p-6 shadow-2xl text-slate-100 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-400/30 text-amber-300">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-['Outfit'] text-base sm:text-lg font-bold text-slate-100">
                {language === 'ar'
                  ? 'أجرام الاختبار المعيارية — تحدي ناسا سبيس آبس 2025'
                  : 'NASA Space Apps 2025: Pre-Configured Test Objects'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">
                5 Required Targets
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'ar'
                ? 'انقر على أي جرم لملء الإحداثيات وبدء التحليل الفلكي فوراً'
                : 'Click any object card to auto-populate celestial coordinates and trigger multi-epoch analysis'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 5 Test Objects Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {NASA_TEST_OBJECTS.map((obj) => {
          const isSelected = selectedObjectId === obj.id;

          return (
            <button
              key={obj.id}
              type="button"
              onClick={() => onSelectObject(obj)}
              className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between group active:scale-[0.98] ${
                isSelected
                  ? 'bg-gradient-to-br from-amber-500/15 via-white/[0.04] to-black/40 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/40'
                  : 'bg-white/[0.02] border-white/10 hover:border-amber-400/40 hover:bg-white/[0.05] shadow-md'
              }`}
            >
              {/* Card Header: Icon, Name & Type Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl filter drop-shadow">{obj.icon}</span>
                    <div>
                      <h3 className="font-['Outfit'] font-bold text-sm text-slate-100 group-hover:text-amber-200 transition-colors">
                        {obj.name}
                      </h3>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-mono font-semibold text-slate-300">
                        {obj.typeLabel}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {obj.description}
                </p>
              </div>

              {/* Coordinates Pill Footer */}
              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <div>
                  <div className="text-slate-200 font-bold">
                    RA {obj.ra.toFixed(4)}° · Dec {obj.dec >= 0 ? '+' : ''}{obj.dec.toFixed(4)}°
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {obj.raHms} / {obj.decDms}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-amber-400 group-hover:translate-x-0.5 transition-transform font-bold text-[10px]">
                  <span>Investigate</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

