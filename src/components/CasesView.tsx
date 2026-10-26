import React from 'react';
import { ArrowRight, ShieldCheck, Telescope, ExternalLink } from 'lucide-react';
import { Language, translations } from '../utils/translations';

interface CaseItem {
  id: string;
  title: string;
  subtitle: string;
  ra: number;
  dec: number;
  category: 'Variable Candidate' | 'Stability Reference' | 'Artifact Rejection' | 'Channel Incompatibility';
  expectedClassification: string;
  description: string;
}

interface CasesViewProps {
  cases: CaseItem[];
  onSelectCase: (caseId: string) => void;
  language: Language;
}

export const CasesView: React.FC<CasesViewProps> = ({ cases, onSelectCase, language }) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  return (
    <div
      className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-amber-400 uppercase mb-2">
            <span>NASA/IPAC IRSA SPHEREx QR2</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Ground Truth Investigations</span>
          </div>
          <h2 className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-slate-100">
            {language === 'ar' ? 'ملفات الحالات الفلكية الموثقة' : 'Verified Astronomical Case Files'}
          </h2>
        </div>
        <p className="text-xs text-slate-400 max-w-md font-mono">
          {language === 'ar'
            ? 'أربعة تحقيقات مبنية على بيانات SPHEREx الحقيقية. من اكتشاف النجوم المتغيرة، إلى إثبات الثبات الضوئي، وتصفية تشويش المستشعر والـ208σ persistence.'
            : 'Four genuine multi-epoch SPHEREx investigations. Demonstrating verified variable stars, photometric null stability, and automated bitmask artifact rejection.'}
        </p>
      </div>

      {/* Grid of Case Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cases.map((c) => {
          let badgeBorder = 'border-amber-500/40 bg-amber-500/10 text-amber-300';
          if (c.expectedClassification.includes('NO SIGNIFICANT CHANGE')) {
            badgeBorder = 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300';
          } else if (c.expectedClassification.includes('ARTIFACT')) {
            badgeBorder = 'border-rose-500/40 bg-rose-500/10 text-rose-300';
          } else if (c.expectedClassification.includes('INSUFFICIENT')) {
            badgeBorder = 'border-purple-500/40 bg-purple-500/10 text-purple-300';
          }

          return (
            <div
              key={c.id}
              className="group relative flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-2xl p-6 transition-all duration-300 hover:border-amber-400/40 shadow-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]"
            >
              <div>
                {/* Category & Astrometric Coordinates */}
                <div className="flex items-center justify-between text-xs mb-3 font-mono">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${badgeBorder}`}>
                    {c.category}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    RA {c.ra.toFixed(4)}° · Dec {c.dec >= 0 ? `+${c.dec.toFixed(4)}°` : `${c.dec.toFixed(4)}°`}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-['Outfit'] text-xl font-bold text-slate-100 group-hover:text-amber-300 transition-colors mb-2">
                  {c.title}
                </h3>

                {/* Subtitle */}
                <p className="text-xs font-mono text-slate-300 mb-3 font-medium">
                  {c.subtitle}
                </p>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  {c.description}
                </p>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 border-t border-white/[0.06] pt-3 mb-6">
                  <span className="text-slate-500">Classification:</span>
                  <span className="text-slate-200 font-semibold">{c.expectedClassification}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectCase(c.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.06] hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-xs tracking-wider uppercase transition-all duration-200 border border-white/[0.1] hover:border-transparent active:scale-98 shadow-sm"
              >
                <span>{language === 'ar' ? 'فحص الحالة في المستكشف' : 'Investigate Case in Explorer'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
