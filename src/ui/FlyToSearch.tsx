import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Dices,
  Compass,
  Flame,
  Snowflake,
  Orbit,
  Sparkles,
  Activity,
  MapPin,
  ArrowRight,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import {
  OFFICIAL_CHALLENGE_TARGETS,
  parseCoordinateInput,
} from '../science/challengeTargets';
import { FAMOUS_OBJECTS_CATALOG, FamousObject } from '../science/famousObjects';
import { Language, translations } from '../utils/translations';
import { AitoffSkyMap, SkyCoverageMarker } from './AitoffSkyMap';
import { usePrefersReducedMotion } from '../design/motionKit';
import { gameAudio } from '../game/utils/gameAudio';

export interface FlyTargetSelection {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  ra: number;
  dec: number;
  caseId?: string;
  sizePix?: number;
  knownCovered?: boolean;
  source: 'curated' | 'famous' | 'coords' | 'simbad';
}

interface FlyToSearchProps {
  language: Language;
  onFlyToTarget: (selection: FlyTargetSelection) => void;
  compact?: boolean;
  className?: string;
}

interface CoveragePreviewState {
  checking: boolean;
  covered: boolean | null;
  coverageCount: number | null;
  reason?: string;
  nearestCovered?: FlyTargetSelection;
}

const COVERED_CASE_TARGETS: FlyTargetSelection[] = [
  {
    id: 'case-barnards-star',
    caseId: 'case-barnards-star',
    name: "Barnard's Star",
    nameAr: 'نجم بارنارد',
    description: 'Fastest-moving neighbor star (10.36″/yr)',
    ra: 269.45207695,
    dec: 4.69336497,
    sizePix: 64,
    knownCovered: true,
    source: 'curated',
  },
  {
    id: 'case-wise-0855',
    caseId: 'case-wise-0855',
    name: 'WISE 0855-0714',
    nameAr: 'وايز 0855-0714',
    description: 'Coldest known brown dwarf (~250 K, glowing in infrared)',
    ra: 133.81890825,
    dec: -7.247048,
    sizePix: 64,
    knownCovered: true,
    source: 'curated',
  },
  {
    id: 'case-epsilon-indi',
    caseId: 'case-epsilon-indi',
    name: 'Epsilon Indi Ba/Bb',
    nameAr: 'إبسيلون الهندي Ba/Bb',
    description: 'Cold methane binary brown dwarf pair (4.7″/yr)',
    ra: 331.04414659,
    dec: -56.7828442,
    sizePix: 64,
    knownCovered: true,
    source: 'curated',
  },
  {
    id: 'case-rw-aur',
    caseId: 'case-rw-aur',
    name: 'RW Aurigae',
    nameAr: 'نجم RW ممسك الأعنة',
    description: 'Young eruptive star in glowing circumstellar dust',
    ra: 76.95652603,
    dec: 30.40143817,
    sizePix: 64,
    knownCovered: true,
    source: 'curated',
  },
  {
    id: 'case-r-dra',
    caseId: 'case-r-dra',
    name: 'R Draconis',
    nameAr: 'نجم R التنين',
    description: 'Pulsating red giant near the North Ecliptic Pole',
    ra: 248.16761083,
    dec: 66.75497942,
    sizePix: 64,
    knownCovered: true,
    source: 'curated',
  },
];

const INTENT_RULES: Array<{
  keywords: string[];
  targetId: string;
  hintEn: string;
  hintAr: string;
}> = [
  {
    keywords: ['fast', 'fastest', 'speed', 'runner', 'motion', 'سريع', 'أسرع', 'متحرك'],
    targetId: 'case-barnards-star',
    hintEn: 'Fastest star in the sky',
    hintAr: 'أسرع نجم في السماء',
  },
  {
    keywords: ['brown dwarf', 'cold', 'coldest', 'ice', 'nomad', 'قزم', 'بارد', 'أبرد', 'جليد'],
    targetId: 'case-wise-0855',
    hintEn: 'Coldest brown dwarf (~250 K)',
    hintAr: 'أبرد قزم بني معروف',
  },
  {
    keywords: ['twin', 'binary', 'pair', 'methane', 'توأم', 'ثنائي', 'ميثان'],
    targetId: 'case-epsilon-indi',
    hintEn: 'Twin brown dwarf pair',
    hintAr: 'توأم من الأقزام البنية',
  },
  {
    keywords: ['young', 'disk', 'dust', 'newborn', 'تراكم', 'شاب', 'غبار'],
    targetId: 'case-rw-aur',
    hintEn: 'Young dusty binary star',
    hintAr: 'نجم شاب مغطى بالغبار',
  },
  {
    keywords: ['pulse', 'pulsating', 'giant', 'breath', 'عملاق', 'نابض', 'تنين'],
    targetId: 'case-r-dra',
    hintEn: 'Breathing red giant',
    hintAr: 'عملاق أحمر نابض',
  },
  {
    keywords: ['pole', 'north', 'polaris', 'قطب', 'شمال'],
    targetId: 'polaris',
    hintEn: 'Northern pole star & Cepheid',
    hintAr: 'نجم الشمال القطبي',
  },
  {
    keywords: ['galaxy', 'spiral', 'andromeda', 'm31', 'm51', 'مجرة'],
    targetId: 'andromeda-galaxy',
    hintEn: 'Nearest major spiral galaxy',
    hintAr: 'أقرب مجرة حلزونية كبرى',
  },
  {
    keywords: ['asteroid', 'planet', 'dwarf planet', 'ceres', 'solar', 'كويكب', 'كوكب'],
    targetId: 'ceres',
    hintEn: 'Moving main-belt dwarf planet',
    hintAr: 'كوكب قزم في حزام الكويكبات',
  },
];

function angularSeparationDeg(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const r1 = (ra1 * Math.PI) / 180;
  const d1 = (dec1 * Math.PI) / 180;
  const r2 = (ra2 * Math.PI) / 180;
  const d2 = (dec2 * Math.PI) / 180;
  const cosAngle = Math.max(
    -1,
    Math.min(1, Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2))
  );
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

function findNearestCoveredTarget(ra: number, dec: number): FlyTargetSelection {
  let best = COVERED_CASE_TARGETS[0];
  let bestSep = Infinity;
  for (const item of COVERED_CASE_TARGETS) {
    const sep = angularSeparationDeg(ra, dec, item.ra, item.dec);
    if (sep < bestSep) {
      bestSep = sep;
      best = item;
    }
  }
  return best;
}

function famousToSelection(obj: FamousObject, language: Language): FlyTargetSelection {
  const cleanId = obj.id.toLowerCase();
  let matchedCaseId: string | undefined;
  if (cleanId.includes('barnard')) matchedCaseId = 'case-barnards-star';
  else if (cleanId.includes('wise-0855') || cleanId.includes('0855')) matchedCaseId = 'case-wise-0855';
  else if (cleanId.includes('epsilon-indi') || cleanId.includes('indi')) matchedCaseId = 'case-epsilon-indi';
  else if (cleanId.includes('rw-aur')) matchedCaseId = 'case-rw-aur';
  else if (cleanId.includes('r-dra')) matchedCaseId = 'case-r-dra';

  return {
    id: obj.id,
    name: language === 'ar' ? obj.nameAr : obj.name,
    nameAr: obj.nameAr,
    description: language === 'ar' ? obj.shortDescriptionAr : obj.shortDescriptionEn,
    ra: obj.ra,
    dec: obj.dec,
    caseId: matchedCaseId,
    sizePix: Math.round((obj.suggestedFovArcmin * 60) / 6.2),
    knownCovered:
      Boolean(matchedCaseId) ||
      obj.spherexStatus === 'Covered (Archive)' ||
      obj.spherexStatus === 'High-Cadence Survey',
    source: matchedCaseId ? 'curated' : 'famous',
  };
}

function pickIconForItem(id: string) {
  const lower = id.toLowerCase();
  if (lower.includes('barnard') || lower.includes('sirius')) return Flame;
  if (lower.includes('wise') || lower.includes('polaris')) return Snowflake;
  if (lower.includes('indi') || lower.includes('trappist')) return Orbit;
  if (lower.includes('aur') || lower.includes('galaxy')) return Sparkles;
  if (lower.includes('dra') || lower.includes('betelgeuse')) return Activity;
  return Compass;
}

export const FlyToSearch: React.FC<FlyToSearchProps> = ({
  language,
  onFlyToTarget,
  compact = false,
  className = '',
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const reducedMotion = usePrefersReducedMotion();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [simbadResult, setSimbadResult] = useState<FlyTargetSelection | null>(null);
  const [simbadLoading, setSimbadLoading] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<FlyTargetSelection | null>(null);
  const [coverageState, setCoverageState] = useState<CoveragePreviewState>({
    checking: false,
    covered: null,
    coverageCount: null,
  });
  const [diving, setDiving] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // All sky coverage dots for Aitoff canvas
  const aitoffMarkers: SkyCoverageMarker[] = useMemo(() => {
    const fromChallenge = OFFICIAL_CHALLENGE_TARGETS.map((c) => ({
      id: c.id,
      label: c.name,
      ra: c.ra,
      dec: c.dec,
      covered: c.qr2Coverage === 'covered',
    }));
    return fromChallenge;
  }, []);

  // Build ranked autocomplete suggestions
  const suggestions = useMemo<FlyTargetSelection[]>(() => {
    const trimmed = query.trim();
    const qLower = trimmed.toLowerCase();

    // 1. Empty query -> curated SPHEREx covered highlights
    if (!trimmed) {
      return COVERED_CASE_TARGETS.map((item) => ({
        ...item,
        name: isRtl && item.nameAr ? item.nameAr : item.name,
      }));
    }

    const items: FlyTargetSelection[] = [];
    const seen = new Set<string>();

    // 2. Coordinate detection (decimal / HMS-DMS)
    const parsed = parseCoordinateInput(trimmed);
    if (parsed) {
      items.push({
        id: `coords-${parsed.ra.toFixed(4)}-${parsed.dec.toFixed(4)}`,
        name: `RA ${parsed.ra.toFixed(4)}°, Dec ${parsed.dec >= 0 ? '+' : ''}${parsed.dec.toFixed(4)}°`,
        description: `${parsed.raSexagesimal} ${parsed.decSexagesimal}`,
        ra: parsed.ra,
        dec: parsed.dec,
        sizePix: 64,
        source: 'coords',
      });
    }

    // 3. Intent matching (e.g. "fastest star", "brown dwarf", "أبرد قزم")
    for (const rule of INTENT_RULES) {
      if (rule.keywords.some((kw) => qLower.includes(kw))) {
        const fam = FAMOUS_OBJECTS_CATALOG.find(
          (f) => f.id === rule.targetId || (rule.targetId.startsWith('case-') && f.id === rule.targetId.replace('case-', 'target-').replace('target-epsilon-indi', 'target-epsilon-indi-bab').replace('target-rw-aur', 'target-rw-aurigae').replace('target-r-dra', 'target-r-draconis'))
        );
        const curated = COVERED_CASE_TARGETS.find((c) => c.id === rule.targetId);
        if (curated && !seen.has(curated.id)) {
          seen.add(curated.id);
          items.push({
            ...curated,
            name: isRtl && curated.nameAr ? curated.nameAr : curated.name,
            description: isRtl ? rule.hintAr : rule.hintEn,
          });
        } else if (fam && !seen.has(fam.id)) {
          seen.add(fam.id);
          items.push(famousToSelection(fam, language));
        }
      }
    }

    // 4. Direct local catalog matches (Famous Objects + Curated cases)
    for (const curated of COVERED_CASE_TARGETS) {
      if (
        !seen.has(curated.id) &&
        (curated.name.toLowerCase().includes(qLower) ||
          (curated.nameAr && curated.nameAr.includes(trimmed)) ||
          curated.description.toLowerCase().includes(qLower))
      ) {
        seen.add(curated.id);
        items.push({
          ...curated,
          name: isRtl && curated.nameAr ? curated.nameAr : curated.name,
        });
      }
    }

    for (const fam of FAMOUS_OBJECTS_CATALOG) {
      const sel = famousToSelection(fam, language);
      const idKey = sel.caseId || sel.id;
      if (seen.has(idKey)) continue;
      if (
        fam.name.toLowerCase().includes(qLower) ||
        fam.nameAr.includes(trimmed) ||
        fam.designation.toLowerCase().includes(qLower) ||
        fam.constellation.toLowerCase().includes(qLower) ||
        fam.classification.toLowerCase().includes(qLower) ||
        fam.shortDescriptionEn.toLowerCase().includes(qLower) ||
        fam.shortDescriptionAr.includes(trimmed)
      ) {
        seen.add(idKey);
        items.push(sel);
      }
    }

    // 5. Append live SIMBAD result if available
    if (simbadResult && !seen.has(simbadResult.id)) {
      items.push(simbadResult);
    }

    return items.slice(0, 6);
  }, [query, isRtl, language, simbadResult]);

  // Debounced CDS Sesame SIMBAD name resolver for non-coordinate free text
  useEffect(() => {
    const trimmed = query.trim();
    setSimbadResult(null);
    if (trimmed.length < 3 || parseCoordinateInput(trimmed)) {
      setSimbadLoading(false);
      return;
    }

    // Skip remote call if there's already an exact curated or famous name match
    const qLower = trimmed.toLowerCase();
    const hasExactLocal = FAMOUS_OBJECTS_CATALOG.some(
      (f) => f.name.toLowerCase() === qLower || f.nameAr === trimmed
    );
    if (hasExactLocal) {
      setSimbadLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSimbadLoading(true);
      try {
        const res = await fetch(
          `https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oxp/SNV?${encodeURIComponent(trimmed)}`,
          { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(2500)]) }
        );
        if (!res.ok) throw new Error('Sesame unavailable');
        const xml = await res.text();
        const raMatch = xml.match(/<jradeg>([^<]+)<\/jradeg>/);
        const decMatch = xml.match(/<jdedeg>([^<]+)<\/jdedeg>/);
        const nameMatch = xml.match(/<oname>([^<]+)<\/oname>/);
        if (raMatch && decMatch) {
          const ra = parseFloat(raMatch[1]);
          const dec = parseFloat(decMatch[1]);
          if (Number.isFinite(ra) && Number.isFinite(dec)) {
            setSimbadResult({
              id: `simbad-${ra.toFixed(4)}-${dec.toFixed(4)}`,
              name: nameMatch?.[1]?.trim() || trimmed,
              description: isRtl
                ? `إحداثيات موثقة من SIMBAD (${ra.toFixed(3)}°, ${dec >= 0 ? '+' : ''}${dec.toFixed(3)}°)`
                : `Resolved via CDS SIMBAD (${ra.toFixed(3)}°, ${dec >= 0 ? '+' : ''}${dec.toFixed(3)}°)`,
              ra,
              dec,
              sizePix: 64,
              source: 'simbad',
            });
          }
        }
      } catch {
        // Offline / CORS-restricted fallback cleanly suppressed; local catalog + coordinates remain active
      } finally {
        setSimbadLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isRtl]);

  // Check coverage when previewTarget is set
  const openCoveragePreview = async (selection: FlyTargetSelection) => {
    gameAudio.playClick();
    setPreviewTarget(selection);
    setDropdownOpen(false);

    // Curated test benchmarks always have verified SPHEREx snapshots / coverage
    if (selection.caseId) {
      setCoverageState({
        checking: false,
        covered: true,
        coverageCount: null,
        reason: isRtl ? 'مغطى في أرشيف SPHEREx المعتمد' : 'Verified SPHEREx coverage',
      });
      return;
    }

    setCoverageState({
      checking: true,
      covered: selection.knownCovered ?? null,
      coverageCount: null,
      nearestCovered: findNearestCoveredTarget(selection.ra, selection.dec),
    });

    try {
      const res = await fetch(
        `/api/spherex/coverage?ra=${selection.ra.toFixed(5)}&dec=${selection.dec.toFixed(5)}`,
        { signal: AbortSignal.timeout(4500) }
      );
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const json = await res.json();
        const uq = json?.userQuery;
        const count = Number(uq?.coverageCount ?? 0);
        const inside = Boolean(uq?.inside) && count > 0;
        setCoverageState({
          checking: false,
          covered: inside || Boolean(selection.knownCovered && count > 0),
          coverageCount: count,
          reason: uq?.reason,
          nearestCovered: findNearestCoveredTarget(selection.ra, selection.dec),
        });
        return;
      }
    } catch {
      // Fallback gracefully using known coverage flag
    }

    setCoverageState({
      checking: false,
      covered: selection.knownCovered === true,
      coverageCount: selection.knownCovered ? 1 : 0,
      nearestCovered: findNearestCoveredTarget(selection.ra, selection.dec),
    });
  };

  const executeFly = (selection: FlyTargetSelection) => {
    gameAudio.playClick();
    if (reducedMotion) {
      setPreviewTarget(null);
      onFlyToTarget(selection);
      return;
    }
    setDiving(true);
    setTimeout(() => {
      setDiving(false);
      setPreviewTarget(null);
      onFlyToTarget(selection);
    }, 340);
  };

  const handleSurpriseMe = () => {
    gameAudio.playClick();
    // Pick randomly among covered targets different from current preview if possible
    const pool = COVERED_CASE_TARGETS;
    const pickedRaw = pool[Math.floor(Math.random() * pool.length)];
    const picked: FlyTargetSelection = {
      ...pickedRaw,
      name: isRtl && pickedRaw.nameAr ? pickedRaw.nameAr : pickedRaw.name,
    };
    setQuery(picked.name);
    setPreviewTarget(picked);
    setCoverageState({ checking: false, covered: true, coverageCount: null });
    executeFly(picked);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      openCoveragePreview(suggestions[0]);
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="fly-to-search"
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`relative w-full ${compact ? 'max-w-xl' : 'max-w-2xl mx-auto'} ${className}`}
    >
      {/* Unified Centered Search Bar */}
      <form
        onSubmit={handleSubmit}
        className={`flex flex-col sm:flex-row ${
          compact ? 'sm:flex-wrap lg:flex-nowrap' : ''
        } items-stretch sm:items-center gap-2 rounded-2xl border border-sky-400/35 bg-[#091022]/90 p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl`}
      >
        <div
          className={`relative flex-1 flex items-center ${
            compact ? 'min-w-[175px]' : 'min-w-0'
          }`}
        >
          <Search
            className="w-4 h-4 text-sky-400 absolute start-3.5 pointer-events-none shrink-0"
            aria-hidden="true"
          />
          <input
            type="text"
            data-testid="fly-to-input"
            value={query}
            onFocus={() => setDropdownOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            placeholder={t.flySearchPlaceholder}
            aria-label={t.flySearchLabel}
            className={`w-full min-h-[44px] ps-10 pe-8 py-2 bg-transparent ${
              compact ? 'text-xs sm:text-sm' : 'text-sm'
            } text-slate-100 placeholder:text-slate-400 outline-none`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setPreviewTarget(null);
              }}
              aria-label={t.searchModalClose}
              className="absolute end-2 p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="submit"
            data-testid="fly-to-submit-btn"
            disabled={suggestions.length === 0 && !simbadLoading}
            className={`min-h-[44px] ${
              compact ? 'px-3 text-xs' : 'px-4 text-xs sm:text-sm'
            } py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap flex-1 sm:flex-initial`}
          >
            {simbadLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Compass className="w-4 h-4 shrink-0" />
            )}
            <span>{t.flySearchBtn}</span>
          </button>

          <button
            type="button"
            data-testid="fly-surprise-btn"
            onClick={handleSurpriseMe}
            title={t.flySurpriseMe}
            className={`min-h-[44px] ${
              compact ? 'px-2.5 text-xs' : 'px-3.5 text-xs sm:text-sm'
            } py-2 rounded-xl border border-sky-400/35 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap`}
          >
            <Dices className="w-4 h-4 text-sky-300 shrink-0" />
            <span>{t.flySurpriseMe}</span>
          </button>
        </div>
      </form>

      {/* Live Autocomplete Dropdown */}
      {dropdownOpen && !previewTarget && (
        <div
          data-testid="fly-autocomplete-list"
          role="listbox"
          className="absolute z-40 mt-2 inset-x-0 rounded-2xl border border-white/15 bg-[#080F20]/98 backdrop-blur-xl shadow-2xl overflow-hidden divide-y divide-white/10"
        >
          {suggestions.length > 0 ? (
            suggestions.map((item) => {
              const Icon = pickIconForItem(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  data-testid={`fly-suggestion-${item.id}`}
                  onClick={() => openCoveragePreview(item)}
                  className="w-full min-h-[48px] px-4 py-2.5 flex items-center justify-between gap-3 text-start hover:bg-white/[0.07] transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 text-amber-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-100 truncate">{item.name}</div>
                      <div className="text-xs text-slate-400 truncate">{item.description}</div>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 text-sky-400 shrink-0 ${isRtl ? 'rotate-180' : ''}`}
                  />
                </button>
              );
            })
          ) : (
            <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
              {simbadLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>{t.flyResolvingSimbad}</span>
                </>
              ) : (
                <span>{t.flyNoSuggestions}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pre-Fly Mini Aitoff All-Sky Preview + Coverage Feedback */}
      {previewTarget && (
        <div
          data-testid="fly-preview-card"
          className="mt-3 rounded-2xl border border-sky-400/35 bg-[#070E1E]/95 p-3.5 sm:p-4 shadow-2xl space-y-3 backdrop-blur-xl animate-slide-up"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-50 truncate">
                  {previewTarget.name}
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{previewTarget.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewTarget(null)}
              aria-label={t.searchModalClose}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <AitoffSkyMap
            targetRa={previewTarget.ra}
            targetDec={previewTarget.dec}
            targetLabel={previewTarget.name}
            isCovered={coverageState.covered}
            coverageMarkers={aitoffMarkers}
            diving={diving}
            reducedMotion={reducedMotion}
          />

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
            {coverageState.checking ? (
              <div className="flex items-center gap-2 text-xs text-sky-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.flyCheckingCoverage}</span>
              </div>
            ) : coverageState.covered === false ? (
              <div
                data-testid="fly-uncovered-notice"
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-rose-950/50 border border-rose-500/35 p-3 text-xs"
              >
                <div className="flex items-start gap-2 text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{t.flyNoCoverageHere}</span>
                </div>
                {coverageState.nearestCovered && (
                  <button
                    type="button"
                    data-testid="fly-nearest-covered-btn"
                    onClick={() => executeFly(coverageState.nearestCovered!)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>
                      {t.flyTryNearest}:{' '}
                      {isRtl && coverageState.nearestCovered.nameAr
                        ? coverageState.nearestCovered.nameAr
                        : coverageState.nearestCovered.name}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="text-xs font-mono text-slate-300 tabular-nums">
                  RA {previewTarget.ra.toFixed(3)}° · Dec {previewTarget.dec >= 0 ? '+' : ''}
                  {previewTarget.dec.toFixed(3)}°
                  {coverageState.coverageCount != null && coverageState.coverageCount > 0 && (
                    <span className="text-sky-300"> · {coverageState.coverageCount} obs</span>
                  )}
                </div>
                <button
                  type="button"
                  data-testid="fly-confirm-btn"
                  onClick={() => executeFly(previewTarget)}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center gap-2 transition cursor-pointer shrink-0"
                >
                  <Compass className="w-4 h-4" />
                  <span>{t.flyIntoSkyBtn}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
