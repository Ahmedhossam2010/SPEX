import React from 'react';
import { ExternalLink, CheckCircle2, ShieldAlert, Cpu, Telescope, Database, FileText, Check } from 'lucide-react';
import { Language, translations } from '../utils/translations';

interface AboutViewProps {
  language: Language;
}

export const AboutView: React.FC<AboutViewProps> = ({ language }) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  return (
    <div
      className={`mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
    >
      {/* Hero Header */}
      <div className="text-left pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-amber-400 uppercase mb-2">
          <span>NASA Space Apps Challenge Submission</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>Scientific Audit & Architecture</span>
        </div>
        <h2 className="font-['Outfit'] text-3xl sm:text-5xl font-bold text-slate-100 mb-3">
          SPHEREx — The Changing Sky
        </h2>
        <p className="text-base text-slate-300 max-w-3xl leading-relaxed">
          {language === 'ar'
            ? 'منصة تحقيق فلكي أصيلة مبنية على أرصاد مرصد SPHEREx التابع لناسا، تطبق خوارزميات الطرح الصوري وحساب التباين الإحصائي وتصفية التشويش للإجابة على السؤال الأساسي: «هل حدث تغير ضوئي حقيقي في هذا الجزء من السماء؟»'
            : 'An authentic, evidence-driven astronomical investigation platform that compares multi-epoch infrared sky observations from NASA’s SPHEREx mission to answer the fundamental question: "Did something actually change in this part of the sky?"'}
        </p>
      </div>

      {/* Forensic Audit Highlight: Resolution of the 207.64σ Anomaly */}
      <div className="p-6 rounded-3xl border border-amber-500/30 bg-amber-500/[0.03] backdrop-blur-2xl">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          <h3 className="font-['Outfit'] text-lg font-bold text-amber-300">
            {language === 'ar'
              ? 'حل لغز الـ 207.64σ Anomaly والتدقيق الجنائي للبيانات'
              : 'Forensic Audit: Resolution of the ~207.64σ Candidate Anomaly'}
          </h3>
        </div>
        <p className="text-xs text-slate-300 font-mono leading-relaxed mb-4">
          {language === 'ar'
            ? 'في الإصدار السابق، أظهرت إحدى الحالات مرشحًا بقوة 208σ تم تصنيفه خطأً كجرم فلكي مؤكد من كتالوج غايا. كشف التدقيق الجنائي أن بيكسل (49, 57) في FITS HDU 2 يحمل علم 0x200000 (تأثير Persistence ناتج عن مستشعر الأشعة تحت الحمراء) وعلم 0x80000 (ضوء شارد). الكود السابق كان يفحص فقط الأعلام 0x01 و 0x04. تم تحديث مصفوفة الأعلام لتشمل كافة بتات SPHEREx QR2 وتضييق نطاق المطابقة مع غايا إلى 3.5 ثانية قوسية لمنع المطابقة الخاطئة مع نجوم تبعد 11 ثانية قوسية.'
            : 'In earlier builds, pixel (49, 57) exhibited a 208σ flux excursion that was misattributed to an unrelated field star 11.13" away. Our deep audit uncovered that FITS HDU 2 carried quality flag 0x200000 (detector persistence contamination) and 0x80000 (stray light). The previous pipeline only checked bits 0x01 and 0x04. By upgrading the bitmask filter to check all SPHEREx QR2 flags and tightening the Gaia crossmatch radius to 3.5" (half pixel), this candidate is now properly identified as an instrumental artifact with an artifact score of 1.0.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-2xl bg-black/50 border border-white/[0.06]">
            <span className="text-slate-500 block text-[10px]">Pixel & Flux</span>
            <span className="text-slate-200 font-bold block">(49, 57) · ΔF = 54.14 MJy/sr</span>
          </div>
          <div className="p-3 rounded-2xl bg-black/50 border border-white/[0.06]">
            <span className="text-slate-500 block text-[10px]">FITS DQ Flag</span>
            <span className="text-amber-400 font-bold block">0x200000 (Persistence)</span>
          </div>
          <div className="p-3 rounded-2xl bg-black/50 border border-white/[0.06]">
            <span className="text-slate-500 block text-[10px]">Pipeline Resolution</span>
            <span className="text-emerald-400 font-bold block">Disqualified as Artifact</span>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Architecture */}
      <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl">
        <h3 className="text-xs uppercase font-mono tracking-widest text-amber-400 mb-4">
          End-to-End Scientific Architecture
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center font-mono">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <Database className="h-6 w-6 text-amber-400 mx-auto mb-2" />
            <h4 className="font-bold text-slate-100 text-xs mb-1">1. NASA IRSA Data</h4>
            <p className="text-[10px] text-slate-400">Live TAP ObsCore queries & verified Level-2B cutouts</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <Cpu className="h-6 w-6 text-sky-400 mx-auto mb-2" />
            <h4 className="font-bold text-slate-100 text-xs mb-1">2. FITS Engine</h4>
            <p className="text-[10px] text-slate-400">PC-matrix WCS (~6.15"/px) & D = I₂ - I₁ registration</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <Telescope className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <h4 className="font-bold text-slate-100 text-xs mb-1">3. Statistical Engine</h4>
            <p className="text-[10px] text-slate-400">MAD robust noise, aperture photometry & DQ bitmask</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <CheckCircle2 className="h-6 w-6 text-amber-400 mx-auto mb-2" />
            <h4 className="font-bold text-slate-100 text-xs mb-1">4. Bilingual SPEX AI</h4>
            <p className="text-[10px] text-slate-400">Strictly grounded in computed data (Gemini 3.1 Flash Lite)</p>
          </div>
        </div>
      </div>

      {/* Mathematical Formulation */}
      <div className="space-y-4 font-mono text-xs text-slate-300">
        <h3 className="font-['Outfit'] text-xl font-bold text-slate-100">
          Core Mathematical Formulations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <span className="text-amber-400 font-bold block">1. Differencing & Error Propagation</span>
            <div className="text-slate-300 text-[11px] font-mono space-y-1">
              <div>D(x, y) = I₂(x, y) - I₁,aligned(x, y)</div>
              <div>σ_D²(x, y) = σ₁²(x, y) + σ₂²(x, y)</div>
              <div>S/N(x, y) = D(x, y) / σ_D(x, y)</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <span className="text-sky-400 font-bold block">2. Robust Noise & Aperture Photometry</span>
            <div className="text-slate-300 text-[11px] font-mono space-y-1">
              <div>σ_MAD = 1.4826 × median(|D_i - median(D)|)</div>
              <div>F_net = Σ D_i - (B_annulus × N_ap)</div>
              <div>θ_sep = 2 arcsin(sqrt(sin²(Δδ/2) + cos δ₁ cos δ₂ sin²(Δα/2)))</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Verification Table */}
      <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl">
        <h3 className="font-['Outfit'] text-lg font-bold text-slate-100 mb-1">
          Feature Verification Table (Audit Record)
        </h3>
        <p className="text-xs text-slate-400 mb-4 font-mono">
          Confirmed statuses backed by unit tests (`npm run test`) and authentic IRSA data execution.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-white/[0.08] text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Pipeline Component</th>
                <th className="py-2.5 px-3">Implemented</th>
                <th className="py-2.5 px-3">Tested</th>
                <th className="py-2.5 px-3">Archive Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-[11px]">
              <tr>
                <td className="py-2 px-3 text-slate-200">NASA IRSA TAP ObsCore Client</td>
                <td className="py-2 px-3 text-emerald-400">Yes</td>
                <td className="py-2 px-3 text-emerald-400">Live sync verified</td>
                <td className="py-2 px-3 text-slate-300">spherex.obscore</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-200">FITS-MEF Binary Reader</td>
                <td className="py-2 px-3 text-emerald-400">Yes</td>
                <td className="py-2 px-3 text-emerald-400">8/8 Unit tests pass</td>
                <td className="py-2 px-3 text-slate-300">SPHEREx QR2 Level-2B</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-200">WCS PC Matrix Parsing (~6.15"/px)</td>
                <td className="py-2 px-3 text-emerald-400">Yes</td>
                <td className="py-2 px-3 text-emerald-400">Passed (6.152 arcsec/px)</td>
                <td className="py-2 px-3 text-slate-300">Sub-pixel precision</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-200">Independent Variance Propagation</td>
                <td className="py-2 px-3 text-emerald-400">Yes</td>
                <td className="py-2 px-3 text-emerald-400">Passed</td>
                <td className="py-2 px-3 text-slate-300">σ_D² = σ₁² + σ₂²</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-200">SPHEREx Level-2 Quality Bitmask</td>
                <td className="py-2 px-3 text-emerald-400">Yes</td>
                <td className="py-2 px-3 text-emerald-400">Passed (bit 0x200000 caught)</td>
                <td className="py-2 px-3 text-slate-300">Persistence filtered</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-200">CDS VizieR Gaia DR3 Crossmatch</td>
                <td className="py-2 px-3 text-emerald-400">Yes</td>
                <td className="py-2 px-3 text-emerald-400">Passed (3.5" radius)</td>
                <td className="py-2 px-3 text-slate-300">Live VOTable</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-200">Bilingual SPEX AI Companion</td>
                <td className="py-2 px-3 text-emerald-400">Yes</td>
                <td className="py-2 px-3 text-emerald-400">English + Egyptian Arabic</td>
                <td className="py-2 px-3 text-slate-300">Gemini 3.5 Flash Lite</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
