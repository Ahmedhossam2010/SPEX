import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  Compass,
  Telescope,
  Share2,
  ExternalLink,
  BookOpen,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  Star,
  Award,
} from 'lucide-react';
import { FAMOUS_OBJECTS_CATALOG, FamousCategory, FamousObject } from '../science/famousObjects';
import { Language, translations } from '../utils/translations';
import { GlassPanel } from '../design/components/GlassPanel';
import { Badge } from '../design/components/Badge';

export interface FamousObjectsViewProps {
  onSelectObject: (target: FamousObject) => void;
  language: Language;
}

export const FamousObjectsView: React.FC<FamousObjectsViewProps> = ({
  onSelectObject,
  language,
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FamousCategory>('All');
  const [onlyChallengeTargets, setOnlyChallengeTargets] = useState(false);
  const [expandedObjectId, setExpandedObjectId] = useState<string | null>(null);
  const [copiedObjectId, setCopiedObjectId] = useState<string | null>(null);

  const categories: { id: FamousCategory; labelEn: string; labelAr: string }[] = [
    { id: 'All', labelEn: 'All Objects', labelAr: 'جميع الأجرام' },
    { id: 'Famous Stars', labelEn: 'Famous Stars', labelAr: 'نجوم شهيرة' },
    { id: 'Variable Stars', labelEn: 'Variable Stars', labelAr: 'نجوم متغيرة' },
    { id: 'Nearby Stars', labelEn: 'Nearby Stars', labelAr: 'نجوم قريبة' },
    { id: 'Brown Dwarfs', labelEn: 'Brown Dwarfs', labelAr: 'أقزام بنية' },
    { id: 'Young Stellar Objects', labelEn: 'Young Stellar Objects', labelAr: 'أجرام نجمية فتية' },
    { id: 'Galaxies', labelEn: 'Galaxies', labelAr: 'مجرات' },
    { id: 'Solar-System Objects', labelEn: 'Solar-System Objects', labelAr: 'أجرام النظام الشمسي' },
  ];

  const filteredObjects = useMemo(() => {
    return FAMOUS_OBJECTS_CATALOG.filter((obj) => {
      // Challenge filter
      if (onlyChallengeTargets && !obj.isOfficialChallengeTarget) return false;

      // Category filter
      if (selectedCategory !== 'All' && !obj.categories.includes(selectedCategory)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName =
          obj.name.toLowerCase().includes(q) ||
          obj.nameAr.includes(q) ||
          obj.designation.toLowerCase().includes(q) ||
          obj.constellation.toLowerCase().includes(q) ||
          obj.constellationAr.includes(q) ||
          obj.classification.toLowerCase().includes(q);
        if (!matchesName) return false;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, onlyChallengeTargets]);

  const handleShareObject = (e: React.MouseEvent, obj: FamousObject) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.origin + '/explore');
      url.searchParams.set('target', obj.id);
      url.searchParams.set('ra', obj.ra.toFixed(5));
      url.searchParams.set('dec', obj.dec.toFixed(5));
      url.searchParams.set('fov', obj.suggestedFovArcmin.toString());
      navigator.clipboard.writeText(url.toString()).then(() => {
        setCopiedObjectId(obj.id);
        setTimeout(() => setCopiedObjectId(null), 2500);
      });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedObjectId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className={`min-h-[calc(100vh-64px)] bg-[#02040A] text-slate-100 py-8 px-4 sm:px-6 lg:px-8 select-none ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs uppercase tracking-wider font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRtl ? 'دليل الأجرام الكونية المعتمد' : 'Authoritative Cosmic Catalog'}</span>
              <span className="text-slate-600">·</span>
              <span>{isRtl ? 'تتبع تغيرات السماء' : 'Follow The Changing Sky'}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif-hero font-bold text-white tracking-tight">
              {isRtl ? 'استكشف الأجرام الفلكية الشهيرة' : 'Explore Famous Astronomical Objects'}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
              {isRtl
                ? 'دليل تفاعلي معتمد يربط ألمع نجوم السماء، الأقزام البنية، النجوم المتغيرة، وأهداف تحدي ناسا برصدات تلسكوب SPHEREx الحقيقية بالأشعة تحت الحمراء.'
                : 'Discover, follow, and inspect famous astronomical objects using verified catalog data and real NASA/IPAC SPHEREx multi-epoch infrared observations.'}
            </p>
          </div>

          {/* Quick Challenge Filter Badge */}
          <button
            type="button"
            onClick={() => setOnlyChallengeTargets(!onlyChallengeTargets)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-mono font-semibold transition cursor-pointer self-start md:self-auto shrink-0 ${
              onlyChallengeTargets
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-[0_0_16px_rgba(255,185,0,0.4)]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:border-amber-500/40 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>{isRtl ? 'أهداف تحدي ناسا الـ 5 الرسمية' : '5 Official NASA Challenge Targets'}</span>
            {onlyChallengeTargets && <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />}
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-3.5' : 'left-3.5'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'ابحث باسم الجرم، الكوكبة، أو التصنيف الفلكي (مثال: بارنارد، وايز، الجبار)...' : 'Search by name, constellation, or designation (e.g., Barnard, Betelgeuse, Orion)...'}
              className={`w-full h-11 bg-slate-900/80 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition font-mono ${
                isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-white ${isRtl ? 'left-3' : 'right-3'}`}
              >
                Clear
              </button>
            )}
          </div>

          {/* Result Count */}
          <div className="shrink-0 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-300 flex items-center justify-between gap-2">
            <span className="text-slate-500">{isRtl ? 'الأجرام المطابقة:' : 'Matching Objects:'}</span>
            <span className="font-bold text-amber-400">{filteredObjects.length}</span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition cursor-pointer shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold shadow-[0_0_12px_rgba(0,211,243,0.3)]'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
              }`}
            >
              {isRtl ? cat.labelAr : cat.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredObjects.map((obj) => {
          const isExpanded = expandedObjectId === obj.id;
          const isCopied = copiedObjectId === obj.id;

          return (
            <GlassPanel
              key={obj.id}
              hasCropMarks
              className="flex flex-col justify-between p-5 bg-[#0C0E14]/90 border border-white/10 hover:border-amber-500/50 transition-all duration-300 rounded-2xl group shadow-lg"
            >
              <div>
                {/* Header: Status badges, Challenge badge, Constellation */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {obj.isOfficialChallengeTarget && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-400" />
                        <span>NASA Challenge</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-semibold">
                      {isRtl ? obj.spherexStatusAr : obj.spherexStatus}
                    </span>
                  </div>

                  <span className="font-mono text-[11px] text-slate-400">
                    {isRtl ? obj.constellationAr : obj.constellation}
                  </span>
                </div>

                {/* Object Names */}
                <div className="mb-2">
                  <h3 className="font-serif-hero text-xl font-bold text-white group-hover:text-amber-400 transition-colors flex items-center justify-between gap-2">
                    <span>{isRtl ? obj.nameAr : obj.name}</span>
                    {isRtl && <span className="text-xs font-sans text-slate-400 font-normal">({obj.name})</span>}
                  </h3>
                  <p className="font-mono text-[11px] text-cyan-400 truncate mt-0.5">
                    {obj.designation}
                  </p>
                </div>

                {/* Classification & Distance */}
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300 mb-3 pb-2 border-b border-white/10">
                  <span className="text-amber-300/90 font-medium">
                    {isRtl ? obj.classificationAr : obj.classification}
                  </span>
                  {obj.distanceLightYears != null && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">{obj.distanceLightYears.toLocaleString()} ly</span>
                    </>
                  )}
                </div>

                {/* Short Description */}
                <p className="text-xs text-slate-300 leading-relaxed font-sans mb-4">
                  {isRtl ? obj.shortDescriptionAr : obj.shortDescriptionEn}
                </p>

                {/* Coordinates & Proper Motion Badges */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-black/40 p-2.5 rounded-xl border border-white/5 mb-3">
                  <div>
                    <span className="text-slate-500 block">RA / Dec</span>
                    <span className="text-slate-200">
                      {obj.ra.toFixed(4)}°, {obj.dec >= 0 ? `+${obj.dec.toFixed(4)}°` : `${obj.dec.toFixed(4)}°`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{isRtl ? 'الحركة الخاصة' : 'Proper Motion'}</span>
                    <span className="text-amber-300">
                      {obj.pmRaMasYr != null && obj.pmDecMasYr != null
                        ? `${(Math.hypot(obj.pmRaMasYr, obj.pmDecMasYr) / 1000).toFixed(2)}″/yr`
                        : (isRtl ? 'ثابت ظاهريًا' : 'Stationary')}
                    </span>
                  </div>
                </div>

                {/* Expandable Dossier Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-3 animate-slide-up text-xs font-sans">
                    {/* Scientific Explanation */}
                    <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                      <h4 className="font-mono text-[11px] font-bold text-cyan-300 uppercase mb-1 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isRtl ? 'التفسير الفيزيائي الفلكي' : 'Astrophysical Insight'}</span>
                      </h4>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {isRtl ? obj.scientificExplanationAr : obj.scientificExplanationEn}
                      </p>
                    </div>

                    {/* Time Baseline Disclosure */}
                    <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
                      <h4 className="font-mono text-[11px] font-bold text-amber-400 uppercase mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{isRtl ? 'سلوك الفارق الزمني المطلوب' : 'Required Temporal Baseline'}</span>
                      </h4>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {isRtl ? obj.timeBaselineExplanationAr : obj.timeBaselineExplanationEn}
                      </p>
                    </div>

                    {/* Available Infrared Bands */}
                    <div>
                      <span className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                        {isRtl ? 'نطاقات SPHEREx المتاحة:' : 'Available SPHEREx Bands:'}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {obj.availableBands.map((band) => (
                          <span
                            key={band}
                            className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300"
                          >
                            {band}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Catalog References */}
                    <div>
                      <span className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                        {isRtl ? 'مراجع الكتالوجات المعتمدة:' : 'Authoritative Catalog Cross-Match:'}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {obj.catalogReferences.map((ref) => (
                          <span
                            key={ref}
                            className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleExpand(obj.id)}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <span>{isExpanded ? (isRtl ? 'إخفاء التفاصيل' : 'Less') : (isRtl ? 'الملف العلمي' : 'Scientific Dossier')}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <div className="flex items-center gap-1.5">
                  {/* Share Target URL */}
                  <button
                    type="button"
                    onClick={(e) => handleShareObject(e, obj)}
                    title={isRtl ? 'نسخ رابط الجرم' : 'Copy shareable URL'}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-amber-400 hover:bg-white/10 transition cursor-pointer active:scale-95"
                  >
                    {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  </button>

                  {/* Explore Target in Telescope */}
                  <button
                    type="button"
                    onClick={() => onSelectObject(obj)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition cursor-pointer shadow-[0_0_12px_rgba(255,185,0,0.3)] active:scale-95"
                  >
                    <Telescope className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'رصد في المقراب' : 'Track Target'}</span>
                  </button>
                </div>
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
};
