import React from 'react';
import { ExternalLink, CheckCircle2, ShieldAlert, Cpu, Telescope, Database, Sparkles, Compass, Eye, ShieldCheck, Share2 } from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { GlassPanel } from '../design/components/GlassPanel';
import { Badge } from '../design/components/Badge';

interface AboutViewProps {
  language: Language;
}

export const AboutView: React.FC<AboutViewProps> = ({ language }) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero Header */}
      <div className="text-left pb-6 border-b border-obs-border">
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-obs-amber uppercase mb-2 font-bold">
          <Sparkles className="w-4 h-4" />
          <span>NASA Space Apps Challenge 2024–2026</span>
          <span className="text-slate-600">·</span>
          <span>Planet X & SPHEREx</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mb-3 tracking-wide">
          SPHEREx — The Changing Sky
        </h1>
        <p className="text-sm sm:text-base text-obs-text-dim max-w-3xl leading-relaxed font-sans">
          {isRtl
            ? 'منصة تحقيق فلكي أصيلة مبنية على أرصاد مرصد SPHEREx التابع لناسا، تطبق خوارزميات الطرح الصوري وحساب التباين الإحصائي وتصفية التشويش للإجابة على السؤال الأساسي: «هل حدث تغير ضوئي حقيقي في هذا الجزء من السماء؟»'
            : 'An authentic, evidence-driven astronomical investigation platform that compares multi-epoch infrared sky observations from NASA’s SPHEREx mission to answer the fundamental question: "Did something actually change in this part of the sky?"'}
        </p>
      </div>

      {/* 4 Visual Steps Pipeline */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-white mb-4">
          {isRtl ? 'كيف يعمل المرصد: 4 خطوات نحو الاكتشاف' : 'How It Works: 4 Steps to Discovery'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          {/* Step 1 */}
          <GlassPanel hasCropMarks className="p-5 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-obs-amber/40 flex items-center justify-center text-obs-amber mb-3 font-bold text-xs">
                01
              </div>
              <h3 className="font-serif font-bold text-white text-base mb-1">
                {isRtl ? 'اختر رقعة' : 'Pick a Patch'}
              </h3>
              <p className="text-xs text-obs-text-dim leading-relaxed font-sans">
                {isRtl
                  ? 'تصفح الكرة السماوية أو أدخل إحداثيات RA/Dec للوصول الفوري إلى بيانات FITS من أرشيف IRSA.'
                  : 'Navigate the celestial sky sphere or input coordinates to retrieve authentic FITS data from the IRSA archive.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-obs-border text-[10px] text-obs-cyan flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              <span>Sky Sphere & Coordinates</span>
            </div>
          </GlassPanel>

          {/* Step 2 */}
          <GlassPanel hasCropMarks className="p-5 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-obs-cyan/40 flex items-center justify-center text-obs-cyan mb-3 font-bold text-xs">
                02
              </div>
              <h3 className="font-serif font-bold text-white text-base mb-1">
                {isRtl ? 'راقب التغير' : 'Watch It Change'}
              </h3>
              <p className="text-xs text-obs-text-dim leading-relaxed font-sans">
                {isRtl
                  ? 'طبق طرح الصور وحساب الدلالة الإحصائية σ واستخدم مشغل الأزمنة لمشاهدة الحركة وتغير السطوع.'
                  : 'Apply difference imaging, statistical sigma significance, and the cadence player to spot motion and flaring.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-obs-border text-[10px] text-obs-cyan flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>Time Lens & Blink Player</span>
            </div>
          </GlassPanel>

          {/* Step 3 */}
          <GlassPanel hasCropMarks className="p-5 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-obs-rose/40 flex items-center justify-center text-obs-rose mb-3 font-bold text-xs">
                03
              </div>
              <h3 className="font-serif font-bold text-white text-base mb-1">
                {isRtl ? 'افحص الشك' : 'Check the Doubt'}
              </h3>
              <p className="text-xs text-obs-text-dim leading-relaxed font-sans">
                {isRtl
                  ? 'تحقق من قناع جودة البيانات (DQ bitmask) لاستبعاد الأشعة الكونية وأخطاء الكاشف والتشوهات البصرية.'
                  : 'Inspect Data Quality bitmasks to purge single-frame cosmic rays, hot pixels, and dipole registration artifacts.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-obs-border text-[10px] text-obs-cyan flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>DQ Mask & Audit</span>
            </div>
          </GlassPanel>

          {/* Step 4 */}
          <GlassPanel hasCropMarks className="p-5 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 font-bold text-xs">
                04
              </div>
              <h3 className="font-serif font-bold text-white text-base mb-1">
                {isRtl ? 'شارك الاكتشاف' : 'Share the Find'}
              </h3>
              <p className="text-xs text-obs-text-dim leading-relaxed font-sans">
                {isRtl
                  ? 'صدر بطاقة اكتشاف مصورة (Postcard) أو ملف تحقيق علمي مفصل لمشاركته مع المجتمع الفلكي.'
                  : 'Export a visual discovery postcard PNG or a signed Markdown dossier to share with the research community.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-obs-border text-[10px] text-obs-cyan flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" />
              <span>Postcard & Dossier Export</span>
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* Scientific Honesty & Forensic Audit Section */}
      <GlassPanel glow className="p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="h-5 w-5 text-obs-amber" />
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
            {isRtl ? 'النزاهة العلمية والتدقيق الجنائي للبيانات' : 'Scientific Integrity & Data Honesty Audit'}
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-obs-text-dim leading-relaxed font-sans">
          {isRtl
            ? 'يلتزم المرصد بمعايير الصدق العلمي الصارمة: لا يتم تقديم بيانات مصطنعة على أنها حقيقية، ويتم تصنيف البيانات بوضوح تام (بيانات SPHEREx حقيقية، أو نسخة محفوظة، أو بيانات تدريبية). كما يوضح النظام بدقة أن اللقطات المتتابعة في نفس التمريرة التي يفصل بينها دقائق لا يمكن أن تظهر حركة خاصة بطيئة للأقزام البنية، ويتم الإفصاح عن ذلك للمستخدم.'
            : 'SPEX enforces absolute scientific honesty: synthetic data is never disguised as real, data sources are explicitly badged (REAL SPHEREx DATA, REAL DATA SAVED COPY, TRAINING DATA), and network failures are never converted into empty results. Intra-visit frames minutes apart cannot physically show slow brown dwarf proper motion, and the UI communicates this directly.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-2">
          <div className="p-3 rounded-xl bg-black/50 border border-obs-border">
            <span className="text-slate-500 block text-[10px]">Archive State Discipline</span>
            <span className="text-obs-cyan font-bold block">Distinct Zero-Rows vs Network Timeout</span>
          </div>
          <div className="p-3 rounded-xl bg-black/50 border border-obs-border">
            <span className="text-slate-500 block text-[10px]">Data Quality</span>
            <span className="text-obs-amber font-bold block">Full FITS HDU 2 Bitmask Decoding</span>
          </div>
          <div className="p-3 rounded-xl bg-black/50 border border-obs-border">
            <span className="text-slate-500 block text-[10px]">Astrometric Registration</span>
            <span className="text-emerald-400 font-bold block">Rigid Translation + Cross-Correlation</span>
          </div>
        </div>
      </GlassPanel>

      {/* Credits & Mission Attribution */}
      <div className="p-6 rounded-2xl bg-black/40 border border-obs-border text-center space-y-2 font-mono text-xs text-obs-text-dim">
        <p className="text-white font-semibold">
          SPHEREx — The Changing Sky • NASA Space Apps Challenge
        </p>
        <p>
          Data provided by NASA/IPAC Infrared Science Archive (IRSA) • SPHEREx Public Archive (DR1 / QR3 / QR2, weekly updates)
        </p>
        <p className="text-[10px] text-slate-600">
          Built for astronomers, students, and citizen scientists worldwide. Fully bilingual (EN / AR RTL).
        </p>
      </div>
    </div>
  );
};
