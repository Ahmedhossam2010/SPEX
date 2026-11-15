import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, MinusCircle, ArrowUpRight, Sparkles, Loader2 } from 'lucide-react';
import { Modal } from '../../design/components/Modal';
import { Language, translations } from '../../utils/translations';
import { TimeSeriesResponse } from '../TimeLens/FramePlayer';
import { groupFramesBySurveyPass } from '../../science/surveyPasses';
import { normalizeSourceClassification } from '../../science/provenance';

export interface FindingPresetMeta {
  caseId: string;
  label: string;
  labelAr: string;
  ra: number;
  dec: number;
}

export const FINDINGS_PRESETS: readonly FindingPresetMeta[] = [
  { caseId: 'case-barnards-star', label: "Barnard's Star", labelAr: 'نجم برنارد', ra: 269.45207695, dec: 4.69336497 },
  { caseId: 'case-epsilon-indi', label: 'Epsilon Indi', labelAr: 'إبسيلون إندي', ra: 331.04414659, dec: -56.7828442 },
  { caseId: 'case-wise-0855', label: 'WISE 0855', labelAr: 'WISE 0855', ra: 133.81890825, dec: -7.247048 },
  { caseId: 'case-rw-aur', label: 'RW Aurigae', labelAr: 'RW Aurigae', ra: 76.95652603, dec: 30.40143817 },
  { caseId: 'case-r-dra', label: 'R Draconis', labelAr: 'R Draconis', ra: 248.16761083, dec: 66.75497942 },
];

export type FindingVerdictKind = 'confirmed' | 'candidate' | 'none';

export function classifyFindingVerdict(data: TimeSeriesResponse): FindingVerdictKind {
  const aSum = data.astrometrySummary;
  if (!aSum) return 'none';
  const sigma =
    aSum.sigma ??
    (aSum.measuredDisplacementErrorArcsec > 0
      ? aSum.measuredDisplacementArcsec / aSum.measuredDisplacementErrorArcsec
      : 0);
  const expTotal = aSum.expectedOffset?.totalArcsec ?? 0;

  if (aSum.motionSignificant) {
    if (expTotal > 0.5 && (aSum.diffFromExpectedSigma == null || aSum.diffFromExpectedSigma <= 3.5)) {
      return 'confirmed';
    }
    return 'candidate';
  }
  if (expTotal > 1.5 || (sigma >= 1.2 && expTotal > 0.2)) {
    return 'candidate';
  }
  return 'none';
}

export interface FindingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  activeCaseId?: string | null;
  loadedByKey: Record<string, TimeSeriesResponse>;
  onSelectTarget: (target: { caseId?: string; ra: number; dec: number }) => void;
}

export const FindingsModal: React.FC<FindingsModalProps> = ({
  isOpen,
  onClose,
  language,
  activeCaseId,
  loadedByKey,
  onSelectTarget,
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];
  const [snapshotCache, setSnapshotCache] = useState<Record<string, TimeSeriesResponse>>({});
  const [loadingMissing, setLoadingMissing] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const missing = FINDINGS_PRESETS.filter(
      (p) => !loadedByKey[p.caseId] && !snapshotCache[p.caseId]
    );
    if (missing.length === 0) return;

    setLoadingMissing(true);
    Promise.all(
      missing.map(async (preset) => {
        try {
          const res = await fetch(
            `/api/spherex/timeseries?caseId=${encodeURIComponent(preset.caseId)}&ra=${preset.ra.toFixed(6)}&dec=${preset.dec.toFixed(6)}&sizePix=64&offline=1`
          );
          if (!res.ok) return null;
          const json = (await res.json()) as TimeSeriesResponse;
          return json?.frames?.length ? { key: preset.caseId, data: json } : null;
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, TimeSeriesResponse> = {};
      for (const r of results) {
        if (r) next[r.key] = r.data;
      }
      if (Object.keys(next).length > 0) {
        setSnapshotCache((prev) => ({ ...prev, ...next }));
      }
      setLoadingMissing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, loadedByKey, snapshotCache]);

  const rows: Array<{
    key: string;
    caseId?: string;
    name: string;
    ra: number;
    dec: number;
    data: TimeSeriesResponse | null;
  }> = FINDINGS_PRESETS.map((preset) => ({
    key: preset.caseId,
    caseId: preset.caseId,
    name: isRtl ? preset.labelAr : preset.label,
    ra: preset.ra,
    dec: preset.dec,
    data: loadedByKey[preset.caseId] || snapshotCache[preset.caseId] || null,
  }));

  for (const [k, v] of Object.entries(loadedByKey)) {
    if (!k.startsWith('custom:')) continue;
    rows.push({
      key: k,
      name: `Custom (${v.targetCoords.ra.toFixed(3)}°, ${v.targetCoords.dec >= 0 ? '+' : ''}${v.targetCoords.dec.toFixed(3)}°)`,
      ra: v.targetCoords.ra,
      dec: v.targetCoords.dec,
      data: v,
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.findingsDrawerTitle}
      icon={<Sparkles className="w-4 h-4 text-amber-400" />}
      isRtl={isRtl}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-4 text-xs sm:text-sm" data-testid="findings-modal-body">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <p>{t.findingsSubtitle}</p>
          {loadingMissing && (
            <span className="inline-flex items-center gap-1.5 font-mono text-amber-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{t.findingsLoading}</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#050812]">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-white/[0.02]">
                <th className="py-2.5 px-3 text-start">{t.findingsColTarget}</th>
                <th className="py-2.5 px-3 text-start">{t.findingsColSpan}</th>
                <th className="py-2.5 px-3 text-start">{t.findingsColMotion}</th>
                <th className="py-2.5 px-3 text-start">{t.findingsColPasses}</th>
                <th className="py-2.5 px-3 text-start">{t.findingsColVerdict}</th>
                <th className="py-2.5 px-3 text-end" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((row) => {
                const d = row.data;
                const isActive = Boolean(row.caseId && row.caseId === activeCaseId);
                if (!d) {
                  return (
                    <tr key={row.key} className="text-slate-400">
                      <td className="py-3 px-3 font-semibold text-slate-200">{row.name}</td>
                      <td className="py-3 px-3 font-mono text-xs" colSpan={4}>
                        {t.findingsLoading}
                      </td>
                      <td className="py-3 px-3 text-end">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTarget({ caseId: row.caseId, ra: row.ra, dec: row.dec });
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-100 text-xs font-medium cursor-pointer"
                        >
                          {t.findingsOpenTarget}
                        </button>
                      </td>
                    </tr>
                  );
                }

                const aSum = d.astrometrySummary;
                const sigmaVal =
                  aSum?.sigma ??
                  (aSum && aSum.measuredDisplacementErrorArcsec > 0
                    ? aSum.measuredDisplacementArcsec / aSum.measuredDisplacementErrorArcsec
                    : 0);
                const passesCount = groupFramesBySurveyPass(d.frames || []).length;
                const verdictKind = classifyFindingVerdict(d);
                const canonicalClass = normalizeSourceClassification(d.sourceClassification, {
                  sourceMode: d.sourceMode,
                  isSnapshot: Boolean(d.isSnapshot),
                  isDemoCopy: Boolean(d.isDemoCopy),
                  tapFreshness: d.tapFreshness,
                  cacheIntegrityVerified: d.cacheIntegrityVerified,
                  status: d.status,
                  state: d.state,
                });
                const discoveryEligible =
                  typeof d.discoveryEligible === 'boolean'
                    ? d.discoveryEligible
                    : canonicalClass === 'LIVE_ARCHIVE_DATA' || canonicalClass === 'VERIFIED_FITS_CACHE';

                const spanLabel = d.dateRange
                  ? `${d.dateRange.start.slice(0, 10)} → ${d.dateRange.end.slice(0, 10)} (${Math.round(d.dateRange.spanDays)}d)`
                  : `${d.frames.length} frames`;

                const measStr = aSum
                  ? `${aSum.measuredDisplacementArcsec.toFixed(2)} ± ${aSum.measuredDisplacementErrorArcsec.toFixed(2)}″ (${sigmaVal.toFixed(2)}σ)`
                  : '—';
                const expStr = aSum?.expectedOffset
                  ? `${aSum.expectedOffset.totalArcsec.toFixed(2)}″`
                  : '0.00″';

                return (
                  <tr
                    key={row.key}
                    data-testid={`finding-row-${row.caseId || 'custom'}`}
                    className={isActive ? 'bg-amber-500/[0.07]' : 'hover:bg-white/[0.03]'}
                  >
                    <td className="py-3 px-3 align-top">
                      <div className="font-bold text-slate-100 flex flex-wrap items-center gap-1.5">
                        <span>{row.name}</span>
                        {!discoveryEligible && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/35 text-indigo-200 font-mono text-[10px] font-medium">
                            {t.findingsSnapshotNote}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                        RA {row.ra.toFixed(3)}°, Dec {row.dec >= 0 ? '+' : ''}{row.dec.toFixed(3)}°
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap">
                      {spanLabel}
                    </td>
                    <td className="py-3 px-3 align-top font-mono text-xs tabular-nums">
                      <div className="text-slate-100 font-semibold">{measStr}</div>
                      <div className="text-slate-400 text-[11px]">
                        {t.trailExpectedLabel}: {expStr}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap">
                      {passesCount} ({d.frames.length} exp)
                    </td>
                    <td className="py-3 px-3 align-top">
                      {verdictKind === 'confirmed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.findingsVerdictConfirmed}</span>
                        </span>
                      ) : verdictKind === 'candidate' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.findingsVerdictCandidate}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-white/15 text-slate-300 text-xs font-medium">
                          <MinusCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.findingsVerdictNone}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top text-end">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTarget({ caseId: row.caseId, ra: row.ra, dec: row.dec });
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer transition"
                      >
                        <span>{t.findingsOpenTarget}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
