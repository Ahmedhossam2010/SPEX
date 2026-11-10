import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Telescope, Sparkles, Filter, Compass } from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { GlassPanel } from '../design/components/GlassPanel';
import { Badge } from '../design/components/Badge';
import { Button } from '../design/components/Button';

interface CaseItem {
  id: string;
  title: string;
  subtitle: string;
  ra: number;
  dec: number;
  category: 'Variable Candidate' | 'Stability Reference' | 'Artifact Rejection' | 'Channel Incompatibility';
  expectedClassification: string;
  description: string;
  isSimulated?: boolean;
  simulatedLabel?: string;
  difficulty?: 'Beginner' | 'Explorer' | 'Scientist';
  isUnverified?: boolean;
}

interface CasesViewProps {
  cases: CaseItem[];
  onSelectCase: (caseId: string) => void;
  language: Language;
}

export const CasesView: React.FC<CasesViewProps> = ({ cases, onSelectCase, language }) => {
  const isRtl = language === 'ar';
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredCases = cases.filter((c) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'variable') return c.category === 'Variable Candidate';
    if (filterCategory === 'reference') return c.category === 'Stability Reference';
    if (filterCategory === 'artifact') return c.category === 'Artifact Rejection';
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-obs-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-obs-amber uppercase mb-2 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>NASA/IPAC IRSA SPHEREx QR2 & QR3</span>
            <span className="text-slate-600">·</span>
            <span>{isRtl ? 'ملفات قضايا المرصد' : 'Observatory Case Board'}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-wide">
            {isRtl ? 'ملفات الحالات الفلكية الموثقة' : 'Verified Astronomical Case Files'}
          </h1>
        </div>
        <p className="text-xs text-obs-text-dim max-w-md font-mono leading-relaxed">
          {isRtl
            ? 'تحقيقات مبنية على بيانات SPHEREx الحقيقية، تشمل النجوم المتغيرة، نجم برنارد فائق الحركة، وقزم بني بارد، ومعايير الثبات وتصفية أعلام الجودة.'
            : 'Authentic multi-epoch SPHEREx investigations across verified targets including Barnard’s Star, WISE 0855, North Ecliptic Pole deep surveys, and photometric calibration standards.'}
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6 font-mono text-xs">
        <span className="text-slate-500 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          {isRtl ? 'تصفية القضايا:' : 'Filter:'}
        </span>
        {[
          { id: 'all', labelEn: 'All Dossiers', labelAr: 'جميع القضايا' },
          { id: 'variable', labelEn: 'Variables & Transients', labelAr: 'نجوم متغيرة وتوهجات' },
          { id: 'reference', labelEn: 'Calibration Standards', labelAr: 'معايير المعايرة' },
          { id: 'artifact', labelEn: 'Flagged Glitches', labelAr: 'أعلام الكواشف' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterCategory(f.id)}
            className={`px-3 py-1.5 rounded-xl border transition cursor-pointer ${
              filterCategory === f.id
                ? 'bg-obs-amber text-slate-950 border-obs-amber font-bold shadow-[0_0_12px_rgba(245,166,35,0.3)]'
                : 'bg-obs-panel border-obs-border text-obs-text-dim hover:text-white hover:border-obs-border-highlight'
            }`}
          >
            {isRtl ? f.labelAr : f.labelEn}
          </button>
        ))}
      </div>

      {/* Dossier Board Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCases.map((c, idx) => {
          const isReal = !c.isSimulated;
          const isUnverified = c.id.includes('epsilon-indi') || c.id.includes('r-draconis') || c.isUnverified;

          return (
            <GlassPanel
              key={c.id}
              hasCropMarks
              glow
              className="flex flex-col justify-between p-6 group transition-all duration-300 hover:border-obs-amber/60"
            >
              <div>
                {/* Header row: Status badges & Coordinates */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isUnverified ? (
                      <Badge variant="UNVERIFIED" size="sm" />
                    ) : isReal ? (
                      <Badge variant="REAL" size="sm" />
                    ) : (
                      <Badge variant="TRAINING" size="sm" />
                    )}
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-obs-cyan">
                      {c.category}
                    </span>
                  </div>

                  <span className="font-mono text-[11px] text-obs-text-dim">
                    RA {c.ra.toFixed(4)}° · Dec {c.dec >= 0 ? `+${c.dec.toFixed(4)}°` : `${c.dec.toFixed(4)}°`}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-serif text-xl font-bold text-white group-hover:text-obs-amber transition-colors mb-2">
                  {c.title}
                </h3>

                {/* Subtitle */}
                <p className="text-xs font-mono text-obs-cyan mb-3 font-semibold">
                  {c.subtitle}
                </p>

                {/* Description */}
                <p className="text-xs text-obs-text-dim leading-relaxed mb-6 font-sans">
                  {c.description}
                </p>

                {/* Classification info */}
                <div className="flex items-center justify-between text-xs font-mono border-t border-obs-border pt-3 mb-6">
                  <span className="text-slate-400">{isRtl ? 'التصنيف المتوقع:' : 'Expected Verdict:'}</span>
                  <span className="text-white font-bold">{c.expectedClassification}</span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="primary"
                icon={<Compass className="w-4 h-4" />}
                onClick={() => onSelectCase(c.id)}
                className="w-full justify-center"
              >
                {isRtl ? 'افحص هذه الحالة الفلكية في الكاشف' : 'Investigate in Time Lens'}
              </Button>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
};
