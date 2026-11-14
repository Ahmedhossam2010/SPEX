import React from 'react';

export type AcademyDiagramType =
  | 'allsky'
  | 'infrared'
  | 'blinking'
  | 'spectra'
  | 'browndwarf'
  | 'discovery';

interface AcademyDiagramProps {
  type: AcademyDiagramType;
  isRtl?: boolean;
}

export const AcademyDiagram: React.FC<AcademyDiagramProps> = ({ type, isRtl = false }) => {
  return (
    <div className="w-full rounded-2xl bg-[#040711] border border-sky-400/20 p-4 flex items-center justify-center overflow-hidden">
      {type === 'allsky' && (
        <svg viewBox="0 0 420 150" className="w-full max-w-md h-auto" aria-label="SPHEREx All-Sky Survey Sweep Diagram">
          <defs>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="rgba(251,191,36,0)" />
            </radialGradient>
          </defs>
          <circle cx="210" cy="75" r="24" fill="url(#sunGlow)" />
          <circle cx="210" cy="75" r="10" fill="#FBBF24" />
          <ellipse cx="210" cy="75" rx="135" ry="46" fill="none" stroke="#38BDF8" strokeDasharray="4 4" strokeWidth="1.5" />
          <circle cx="88" cy="60" r="8" fill="#38BDF8" />
          <circle cx="332" cy="90" r="8" fill="#F59E0B" />
          <text x="88" y="38" textAnchor="middle" fill="#BAE6FD" fontSize="10" fontFamily="monospace">
            {isRtl ? 'التمريرة ١' : 'Pass 1'}
          </text>
          <text x="332" y="116" textAnchor="middle" fill="#FDE68A" fontSize="10" fontFamily="monospace">
            {isRtl ? 'التمريرة ٢ (~٦ أشهر)' : 'Pass 2 (~6 mo)'}
          </text>
          <text x="210" y="138" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="sans-serif">
            {isRtl ? 'مسح كامل للسماء بنحو ٦ أشهر • ٦.٢″ لكل بكسل' : 'Full-sky coverage ≈ every 6 months • 6.2″/px'}
          </text>
        </svg>
      )}

      {type === 'infrared' && (
        <svg viewBox="0 0 420 150" className="w-full max-w-md h-auto" aria-label="Infrared Dust Penetration Diagram">
          <rect x="175" y="20" width="70" height="105" rx="18" fill="rgba(148,163,184,0.16)" stroke="#64748B" strokeDasharray="3 3" />
          <text x="210" y="138" textAnchor="middle" fill="#94A3B8" fontSize="10">
            {isRtl ? 'سحابة غبار كوني' : 'Cosmic Dust Cloud'}
          </text>
          <circle cx="65" cy="72" r="14" fill="#F97316" opacity="0.85" />
          <circle cx="65" cy="72" r="7" fill="#FEF08A" />
          {/* Optical ray blocked */}
          <line x1="82" y1="54" x2="175" y2="54" stroke="#60A5FA" strokeWidth="2.5" />
          <line x1="170" y1="47" x2="182" y2="61" stroke="#F43F5E" strokeWidth="2.5" />
          <line x1="182" y1="47" x2="170" y2="61" stroke="#F43F5E" strokeWidth="2.5" />
          <text x="128" y="45" textAnchor="middle" fill="#93C5FD" fontSize="9.5">
            {isRtl ? 'ضوء مرئي محجوب' : 'Visible blocked'}
          </text>
          {/* Infrared ray passes */}
          <path d="M82 90 Q110 82 135 90 T185 90 T235 90 T285 90 T335 90" fill="none" stroke="#FBBF24" strokeWidth="2.5" />
          <polygon points="348,90 335,84 335,96" fill="#FBBF24" />
          <text x="305" y="75" textAnchor="middle" fill="#FDE68A" fontSize="9.5">
            {isRtl ? 'تحت حمراء تنفذ' : 'IR passes through'}
          </text>
        </svg>
      )}

      {type === 'blinking' && (
        <svg viewBox="0 0 420 150" className="w-full max-w-md h-auto" aria-label="Blinking Epoch Trail Diagram">
          <circle cx="70" cy="42" r="2.2" fill="#E2E8F0" opacity="0.6" />
          <circle cx="350" cy="36" r="2.2" fill="#E2E8F0" opacity="0.6" />
          <circle cx="115" cy="112" r="2" fill="#E2E8F0" opacity="0.5" />
          <circle cx="310" cy="108" r="2.5" fill="#E2E8F0" opacity="0.5" />
          {/* Significant Solid Trail */}
          <line x1="95" y1="74" x2="185" y2="56" stroke="#38BDF8" strokeWidth="2.5" />
          <circle cx="95" cy="74" r="4" fill="#38BDF8" opacity="0.35" />
          <circle cx="140" cy="65" r="5" fill="#38BDF8" opacity="0.65" />
          <circle cx="185" cy="56" r="7" fill="#38BDF8" />
          <text x="140" y="98" textAnchor="middle" fill="#7DD3FC" fontSize="9.5">
            {isRtl ? 'متصل = حركة مؤكدة (>3σ)' : 'Solid = measured motion'}
          </text>
          {/* Below threshold Dashed Expected Trail */}
          <line x1="245" y1="84" x2="325" y2="66" stroke="#FBBF24" strokeWidth="2" strokeDasharray="5 4" />
          <circle cx="245" cy="84" r="5" fill="#FBBF24" opacity="0.45" />
          <circle cx="325" cy="66" r="5" fill="none" stroke="#FBBF24" strokeWidth="1.8" />
          <text x="285" y="106" textAnchor="middle" fill="#FDE68A" fontSize="9.5">
            {isRtl ? 'متقطع = متوقع فلكياً' : 'Dashed = expected track'}
          </text>
        </svg>
      )}

      {type === 'spectra' && (
        <svg viewBox="0 0 420 150" className="w-full max-w-md h-auto" aria-label="102-Band Absorption Spectrum Diagram">
          <line x1="40" y1="118" x2="385" y2="118" stroke="#475569" strokeWidth="1.2" />
          <line x1="40" y1="22" x2="40" y2="118" stroke="#475569" strokeWidth="1.2" />
          <path
            d="M48 48 L125 46 L150 86 L175 48 L225 48 L250 96 L275 52 L315 50 L338 78 L368 44"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.4"
          />
          <circle cx="150" cy="86" r="3.5" fill="#FBBF24" />
          <circle cx="250" cy="96" r="3.5" fill="#F43F5E" />
          <circle cx="338" cy="78" r="3.5" fill="#34D399" />
          <text x="150" y="103" textAnchor="middle" fill="#FDE68A" fontSize="9">H₂O 3.05µm</text>
          <text x="250" y="112" textAnchor="middle" fill="#FDA4AF" fontSize="9">CO₂ 4.27µm</text>
          <text x="338" y="95" textAnchor="middle" fill="#6EE7B7" fontSize="9">CO 4.67µm</text>
          <text x="212" y="138" textAnchor="middle" fill="#94A3B8" fontSize="10">
            0.75 µm (D1) ────────── 5.00 µm (D6)
          </text>
        </svg>
      )}

      {type === 'browndwarf' && (
        <svg viewBox="0 0 420 150" className="w-full max-w-md h-auto" aria-label="Brown Dwarf WISE 0855 Uncertainty Diagram">
          <circle cx="120" cy="70" r="28" fill="#78350F" opacity="0.4" />
          <circle cx="120" cy="70" r="14" fill="#B45309" />
          <circle cx="120" cy="70" r="5" fill="#FDE68A" />
          <text x="120" y="114" textAnchor="middle" fill="#FDE68A" fontSize="10" fontFamily="monospace">
            WISE 0855 (~250 K)
          </text>
          {/* Error bar illustration */}
          <line x1="230" y1="70" x2="360" y2="70" stroke="#64748B" strokeWidth="1.5" />
          <line x1="255" y1="60" x2="255" y2="80" stroke="#FBBF24" strokeWidth="2" />
          <line x1="335" y1="60" x2="335" y2="80" stroke="#FBBF24" strokeWidth="2" />
          <circle cx="295" cy="70" r="6" fill="#38BDF8" />
          <text x="295" y="45" textAnchor="middle" fill="#BAE6FD" fontSize="10" fontFamily="monospace">
            6.1″ ± 4.4″ (~1.4σ)
          </text>
          <text x="295" y="102" textAnchor="middle" fill="#FCD34D" fontSize="10">
            {isRtl ? 'دون حد 3σ = غير دالة إحصائياً بعد' : 'Below 3σ = motion not significant'}
          </text>
        </svg>
      )}

      {type === 'discovery' && (
        <svg viewBox="0 0 420 150" className="w-full max-w-md h-auto" aria-label="Citizen Science Discovery Checklist Diagram">
          {[
            { x: 55, label: isRtl ? '١. وميض' : '1. Blink', color: '#FBBF24' },
            { x: 155, label: isRtl ? '٢. فحص DQ' : '2. DQ Check', color: '#F43F5E' },
            { x: 255, label: isRtl ? '٣. كتالوج' : '3. Catalogs', color: '#38BDF8' },
            { x: 355, label: isRtl ? '٤. مشاركة' : '4. Share', color: '#34D399' },
          ].map((step, i) => (
            <g key={step.label}>
              {i > 0 && <line x1={step.x - 68} y1="62" x2={step.x - 28} y2="62" stroke="#475569" strokeWidth="2" />}
              <circle cx={step.x} cy="62" r="22" fill="rgba(15,23,42,0.9)" stroke={step.color} strokeWidth="2.2" />
              <text x={step.x} y="66" textAnchor="middle" fill={step.color} fontSize="13" fontWeight="bold" fontFamily="monospace">
                0{i + 1}
              </text>
              <text x={step.x} y="106" textAnchor="middle" fill="#E2E8F0" fontSize="10">
                {step.label}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
};
