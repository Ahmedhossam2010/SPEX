export type SourceClassification =
  | 'LIVE_ARCHIVE_DATA'
  | 'VERIFIED_FITS_CACHE'
  | 'STALE_TAP_CACHE'
  | 'SAVED_BENCHMARK'
  | 'SYNTHETIC_DEMO'
  | 'UNAVAILABLE';

export type TapFreshness =
  | 'live'
  | 'fresh_cache'
  | 'stale_cache'
  | 'offline'
  | 'snapshot'
  | 'unavailable';

export type FitsOrigin =
  | 'live_ibe'
  | 'verified_fits_cache'
  | 'seeded_fixture_cache'
  | 'saved_snapshot'
  | 'synthetic_demo'
  | 'unavailable';

export interface FitsChecksumRecord {
  obsId: string;
  detector?: string;
  sha256: string;
  origin: FitsOrigin;
  verified: boolean;
  cachedAt?: string;
  sizeBytes?: number;
}

export interface DiscoveryEligibilityDecision {
  discoveryEligible: boolean;
  reason: string;
  blockedReasonCode?:
    | 'NON_LIVE_SNAPSHOT'
    | 'STALE_TAP_METADATA'
    | 'SYNTHETIC_DEMO_FIELD'
    | 'UNVERIFIED_CACHE_CHECKSUM'
    | 'DATA_UNAVAILABLE';
}

export interface ProvenanceBadgeMeta {
  classification: SourceClassification;
  badgeLabel: string;
  shortTag: string;
  description: string;
  tone: 'emerald' | 'cyan' | 'amber' | 'indigo' | 'orange' | 'rose';
  discoveryEligible: boolean;
}

export interface ClassificationInputContext {
  sourceMode?: string | null;
  isSnapshot?: boolean;
  isDemoCopy?: boolean;
  isSimulated?: boolean;
  tapFreshness?: string | null;
  cacheIntegrityVerified?: boolean;
  someCached?: boolean;
  allCached?: boolean;
  status?: string | null;
  state?: string | null;
  offlineFixture?: boolean;
  availabilityStatus?: { isAvailable?: boolean } | null;
}

export function isCanonicalSourceClassification(value: unknown): value is SourceClassification {
  return (
    value === 'LIVE_ARCHIVE_DATA' ||
    value === 'VERIFIED_FITS_CACHE' ||
    value === 'STALE_TAP_CACHE' ||
    value === 'SAVED_BENCHMARK' ||
    value === 'SYNTHETIC_DEMO' ||
    value === 'UNAVAILABLE'
  );
}

/**
 * Normalizes any new or legacy source label / flags into one of the 6 canonical
 * SPEX source classifications. Never infers live provenance from HTTP status codes.
 */
export function normalizeSourceClassification(
  raw?: string | null,
  context: ClassificationInputContext = {}
): SourceClassification {
  if (isCanonicalSourceClassification(raw)) {
    return raw;
  }

  if (
    raw === 'DATA_UNAVAILABLE' ||
    context.availabilityStatus?.isAvailable === false ||
    context.status === 'error' ||
    context.state === 'CUTOUT_FAILED' ||
    context.state === 'NETWORK_ERROR' ||
    context.state === 'ARCHIVE_ZERO_ROWS'
  ) {
    return 'UNAVAILABLE';
  }

  if (context.isDemoCopy || context.isSimulated || raw === 'EDUCATIONAL_SIMULATION') {
    return 'SYNTHETIC_DEMO';
  }

  if (
    context.tapFreshness === 'stale_cache'
  ) {
    return 'STALE_TAP_CACHE';
  }

  if (
    context.isSnapshot ||
    context.offlineFixture ||
    context.tapFreshness === 'snapshot' ||
    context.tapFreshness === 'offline' ||
    raw === 'REFERENCE_DATA' ||
    context.sourceMode === 'saved_benchmark'
  ) {
    return 'SAVED_BENCHMARK';
  }

  if (context.someCached || context.allCached) {
    if (context.cacheIntegrityVerified === false) {
      return 'UNAVAILABLE';
    }
    return 'VERIFIED_FITS_CACHE';
  }

  if (raw === 'REAL_SPHEREX_DATA' || context.sourceMode === 'live') {
    if (context.cacheIntegrityVerified === false) {
      return 'UNAVAILABLE';
    }
    return 'LIVE_ARCHIVE_DATA';
  }

  return 'UNAVAILABLE';
}

/**
 * Determines whether data with a given classification & metadata is eligible
 * to support authentic scientific discovery claims or Discovery Passports.
 */
export function evaluateDiscoveryEligibility(params: {
  sourceClassification: SourceClassification;
  tapFreshness?: TapFreshness | string | null;
  cacheIntegrityVerified?: boolean | null;
  observationIds?: string[];
  fitsChecksums?: FitsChecksumRecord[];
  explicitDiscoveryEligible?: boolean | null;
}): DiscoveryEligibilityDecision {
  const { sourceClassification, tapFreshness, cacheIntegrityVerified, fitsChecksums, explicitDiscoveryEligible } = params;

  if (explicitDiscoveryEligible === false) {
    if (sourceClassification === 'SAVED_BENCHMARK') {
      return {
        discoveryEligible: false,
        blockedReasonCode: 'NON_LIVE_SNAPSHOT',
        reason: 'Saved benchmark snapshot is preserved for reference/training only and cannot support live discovery claims.',
      };
    }
    if (sourceClassification === 'SYNTHETIC_DEMO') {
      return {
        discoveryEligible: false,
        blockedReasonCode: 'SYNTHETIC_DEMO_FIELD',
        reason: 'Synthetic or substitute demo field does not match the requested sky coordinates.',
      };
    }
    if (sourceClassification === 'STALE_TAP_CACHE') {
      return {
        discoveryEligible: false,
        blockedReasonCode: 'STALE_TAP_METADATA',
        reason: 'Expired TAP metadata cache cannot support fresh scientific discovery claims while IRSA is unavailable.',
      };
    }
    if (sourceClassification === 'UNAVAILABLE') {
      return {
        discoveryEligible: false,
        blockedReasonCode: 'DATA_UNAVAILABLE',
        reason: 'No authentic SPHEREx observation data was retrieved.',
      };
    }
  }

  if (sourceClassification === 'UNAVAILABLE') {
    return {
      discoveryEligible: false,
      blockedReasonCode: 'DATA_UNAVAILABLE',
      reason: 'Observation retrieval failed or returned zero valid FITS cutouts.',
    };
  }

  if (sourceClassification === 'SYNTHETIC_DEMO') {
    return {
      discoveryEligible: false,
      blockedReasonCode: 'SYNTHETIC_DEMO_FIELD',
      reason: 'Demo/substitute sky patch belongs to a different coordinate field and cannot anchor discoveries.',
    };
  }

  if (sourceClassification === 'SAVED_BENCHMARK') {
    return {
      discoveryEligible: false,
      blockedReasonCode: 'NON_LIVE_SNAPSHOT',
      reason: 'Saved benchmark snapshot is a static reference fallback, not a live verified IRSA retrieval.',
    };
  }

  if (
    sourceClassification === 'STALE_TAP_CACHE' ||
    tapFreshness === 'stale_cache' ||
    tapFreshness === 'offline' ||
    tapFreshness === 'snapshot' ||
    tapFreshness === 'unavailable'
  ) {
    return {
      discoveryEligible: false,
      blockedReasonCode: 'STALE_TAP_METADATA',
      reason: 'TAP catalog metadata is stale or offline; live archive verification is required before claiming discoveries.',
    };
  }

  if (cacheIntegrityVerified === false) {
    return {
      discoveryEligible: false,
      blockedReasonCode: 'UNVERIFIED_CACHE_CHECKSUM',
      reason: 'FITS cache checksum or header integrity validation did not pass.',
    };
  }

  if (Array.isArray(fitsChecksums) && fitsChecksums.length > 0 && fitsChecksums.some((r) => !r.verified || !r.sha256)) {
    return {
      discoveryEligible: false,
      blockedReasonCode: 'UNVERIFIED_CACHE_CHECKSUM',
      reason: 'One or more FITS frames lack verified SHA-256 integrity provenance.',
    };
  }

  if (sourceClassification === 'VERIFIED_FITS_CACHE') {
    return {
      discoveryEligible: true,
      reason: 'Verified local FITS cutouts (SHA-256 & FITS header validated) paired with fresh IRSA TAP metadata.',
    };
  }

  return {
    discoveryEligible: true,
    reason: 'Live NASA/IPAC IRSA TAP metadata and freshly downloaded calibrated FITS cutouts verified.',
  };
}

/**
 * Extracts normalized observation IDs and SHA-256 FITS checksum records from
 * any API response, investigation object, provenance block, or time-series payload.
 */
export function extractProvenanceArtifacts(record: any): {
  observationIds: string[];
  fitsChecksums: FitsChecksumRecord[];
} {
  const obsSet = new Set<string>();
  const checksumMap = new Map<string, FitsChecksumRecord>();

  if (Array.isArray(record?.observationIds)) {
    for (const id of record.observationIds) {
      if (typeof id === 'string' && id.trim()) obsSet.add(id.trim());
    }
  }

  if (Array.isArray(record?.fitsChecksums)) {
    for (const entry of record.fitsChecksums) {
      if (!entry || typeof entry !== 'object') continue;
      const obsId = String(entry.obsId || '').trim();
      const sha256 = String(entry.sha256 || '').trim();
      if (!obsId) continue;
      obsSet.add(obsId);
      checksumMap.set(`${obsId}:${entry.detector || ''}`, {
        obsId,
        detector: entry.detector ? String(entry.detector) : undefined,
        sha256,
        origin: entry.origin || 'live_ibe',
        verified: Boolean(entry.verified && sha256),
        cachedAt: entry.cachedAt,
        sizeBytes: typeof entry.sizeBytes === 'number' ? entry.sizeBytes : undefined,
      });
    }
  }

  const prov = record?.provenance;
  if (prov && typeof prov === 'object') {
    if (typeof prov.obsId1 === 'string' && prov.obsId1.trim()) {
      obsSet.add(prov.obsId1.trim());
      const key = `${prov.obsId1.trim()}:`;
      if (!checksumMap.has(key) && typeof prov.fitsChecksum1 === 'string' && prov.fitsChecksum1.trim()) {
        checksumMap.set(key, {
          obsId: prov.obsId1.trim(),
          sha256: prov.fitsChecksum1.trim(),
          origin: record?.sourceClassification === 'SAVED_BENCHMARK' ? 'saved_snapshot' : 'live_ibe',
          verified: !prov.fitsChecksum1.startsWith('unavailable'),
        });
      }
    }
    if (typeof prov.obsId2 === 'string' && prov.obsId2.trim()) {
      obsSet.add(prov.obsId2.trim());
      const key = `${prov.obsId2.trim()}:`;
      if (!checksumMap.has(key) && typeof prov.fitsChecksum2 === 'string' && prov.fitsChecksum2.trim()) {
        checksumMap.set(key, {
          obsId: prov.obsId2.trim(),
          sha256: prov.fitsChecksum2.trim(),
          origin: record?.sourceClassification === 'SAVED_BENCHMARK' ? 'saved_snapshot' : 'live_ibe',
          verified: !prov.fitsChecksum2.startsWith('unavailable'),
        });
      }
    }
  }

  if (Array.isArray(record?.frames)) {
    for (const f of record.frames) {
      const obsId = String(f?.obsId || '').trim();
      if (!obsId) continue;
      obsSet.add(obsId);
      if (typeof f?.fitsSha256 === 'string' && f.fitsSha256.trim()) {
        const key = `${obsId}:${f.detector || ''}`;
        checksumMap.set(key, {
          obsId,
          detector: f.detector,
          sha256: f.fitsSha256.trim(),
          origin: f.fitsOrigin || (f.isCached ? 'verified_fits_cache' : 'live_ibe'),
          verified: f.fitsChecksumVerified !== false,
          cachedAt: f.cachedAt,
        });
      }
    }
  }

  return {
    observationIds: Array.from(obsSet),
    fitsChecksums: Array.from(checksumMap.values()),
  };
}

/**
 * Single authoritative discovery guard used by backend exports, UI discovery cards,
 * Discovery Passport modal, and Postcard exports.
 */
export function canClaimDiscovery(record: any): {
  allowed: boolean;
  sourceClassification: SourceClassification;
  reason: string;
  blockedReasonCode?: DiscoveryEligibilityDecision['blockedReasonCode'];
  observationIds: string[];
  fitsChecksums: FitsChecksumRecord[];
} {
  if (!record || typeof record !== 'object') {
    return {
      allowed: false,
      sourceClassification: 'UNAVAILABLE',
      reason: 'No active investigation payload provided.',
      blockedReasonCode: 'DATA_UNAVAILABLE',
      observationIds: [],
      fitsChecksums: [],
    };
  }

  const classification = normalizeSourceClassification(record.sourceClassification, {
    sourceMode: record.sourceMode ?? record.provenance?.sourceMode,
    isSnapshot: Boolean(record.isSnapshot),
    isDemoCopy: Boolean(record.isDemoCopy),
    isSimulated: Boolean(record.isSimulated),
    tapFreshness: record.tapFreshness ?? record.provenance?.tapFreshness,
    cacheIntegrityVerified: record.cacheIntegrityVerified,
    someCached: Boolean(record.cachedFrameCount && record.cachedFrameCount > 0) ||
      (Array.isArray(record.frames) && record.frames.some((f: any) => f?.isCached)),
    status: record.status,
    state: record.state,
    availabilityStatus: record.availabilityStatus,
  });

  const { observationIds, fitsChecksums } = extractProvenanceArtifacts(record);
  const decision = evaluateDiscoveryEligibility({
    sourceClassification: classification,
    tapFreshness: record.tapFreshness ?? record.provenance?.tapFreshness,
    cacheIntegrityVerified: record.cacheIntegrityVerified,
    observationIds,
    fitsChecksums,
    explicitDiscoveryEligible:
      typeof record.discoveryEligible === 'boolean' ? record.discoveryEligible : null,
  });

  return {
    allowed: decision.discoveryEligible,
    sourceClassification: classification,
    reason: decision.reason,
    blockedReasonCode: decision.blockedReasonCode,
    observationIds,
    fitsChecksums,
  };
}

export function getSourceClassificationMeta(
  classification: SourceClassification,
  language: 'en' | 'ar' = 'en'
): ProvenanceBadgeMeta {
  const isAr = language === 'ar';
  switch (classification) {
    case 'LIVE_ARCHIVE_DATA':
      return {
        classification,
        badgeLabel: isAr ? 'بيانات أرشيف IRSA المباشرة' : 'LIVE ARCHIVE DATA',
        shortTag: isAr ? 'مباشر من ناسا' : 'LIVE IRSA',
        description: isAr
          ? 'تم سحب بيانات TAP وملفات FITS مباشرة من أرشيف NASA/IPAC IRSA والتحقق منها.'
          : 'Retrieved directly from live NASA/IPAC IRSA TAP & calibrated IBE FITS products.',
        tone: 'emerald',
        discoveryEligible: true,
      };
    case 'VERIFIED_FITS_CACHE':
      return {
        classification,
        badgeLabel: isAr ? 'ذاكرة FITS مؤقتة مُتحقَّق منها' : 'VERIFIED FITS CACHE',
        shortTag: isAr ? 'كاش FITS موثق' : 'VERIFIED CACHE',
        description: isAr
          ? 'ملفات FITS محلية موثقة بتجزئة SHA-256 ورأس FITS سليم مع بيانات TAP حديثة.'
          : 'Locally cached SPHEREx FITS cutouts verified via SHA-256 checksum & header integrity against fresh TAP metadata.',
        tone: 'cyan',
        discoveryEligible: true,
      };
    case 'STALE_TAP_CACHE':
      return {
        classification,
        badgeLabel: isAr ? 'بيانات TAP قديمة (IRSA غير متاح)' : 'STALE TAP CACHE (NOT LIVE)',
        shortTag: isAr ? 'TAP منتهي الصلاحية' : 'STALE TAP',
        description: isAr
          ? 'خادم IRSA متعذر؛ تعرض الواجهة بيانات فهرسة منتهية الصلاحية ولا تصلح لإعلان اكتشافات جديدة.'
          : 'Live IRSA TAP timed out or failed; using expired cached metadata. Not eligible for live discovery claims.',
        tone: 'amber',
        discoveryEligible: false,
      };
    case 'SAVED_BENCHMARK':
      return {
        classification,
        badgeLabel: isAr ? 'لقطة مرجعية محفوظة (ليست مباشرة)' : 'SAVED BENCHMARK SNAPSHOT',
        shortTag: isAr ? 'نسخة مرجعية' : 'SAVED BENCHMARK',
        description: isAr
          ? 'لقطة مرجعية ثابتة محفوظة لأغراض العرض والتدريب وليست رصداً حياً حالياً.'
          : 'Pre-saved reference snapshot bundled for fallback and education — NOT a live IRSA retrieval.',
        tone: 'indigo',
        discoveryEligible: false,
      };
    case 'SYNTHETIC_DEMO':
      return {
        classification,
        badgeLabel: isAr ? 'حقل تجريبي بديل / محاكاة' : 'SYNTHETIC DEMO / SUBSTITUTE FIELD',
        shortTag: isAr ? 'عرض تجريبي' : 'SYNTHETIC DEMO',
        description: isAr
          ? 'بيانات تجريبية أو من حقل سماوي مختلف عن إحداثياتك ولا تمثل رصد هذا الهدف.'
          : 'Educational simulation or substitute field copied for demo purposes — does NOT support discovery claims.',
        tone: 'orange',
        discoveryEligible: false,
      };
    case 'UNAVAILABLE':
    default:
      return {
        classification: 'UNAVAILABLE',
        badgeLabel: isAr ? 'الأرشيف غير متاح حالياً' : 'ARCHIVE DATA UNAVAILABLE',
        shortTag: isAr ? 'غير متاح' : 'UNAVAILABLE',
        description: isAr
          ? 'تعذر استرجاع ملفات FITS صالحة من IRSA ولا يتوفر بديل سليم.'
          : 'No valid SPHEREx FITS observation or verified fallback could be loaded.',
        tone: 'rose',
        discoveryEligible: false,
      };
  }
}
