export interface SPHERExObservation {
  obs_id: string;
  s_ra: number;
  s_dec: number;
  t_min: number; // MJD start
  t_max: number; // MJD end
  date_obs?: string; // ISO UTC start (DATE-OBS)
  date_end?: string; // ISO UTC end (DATE-END)
  integration_duration_sec?: number; // DATE-END minus DATE-OBS
  em_min: number; // meters
  em_max: number; // meters
  wavelength_um?: number; // central wavelength in microns
  band?: number; // 1-6
  detector?: number;
  dataproduct_type: string;
  access_url: string;
  fits_url: string;
  access_format: string;
  target_name?: string;
  survey?: string;
}

export interface FITSHeaderCard {
  key: string;
  value: string | number | boolean | null;
  comment: string;
}

export interface SIPTerm {
  p: number;
  q: number;
  coeff: number;
}

export interface SIPParams {
  aOrder: number;
  bOrder: number;
  apOrder?: number;
  bpOrder?: number;
  aTerms: SIPTerm[];
  bTerms: SIPTerm[];
  apTerms?: SIPTerm[];
  bpTerms?: SIPTerm[];
}

export interface WCSParams {
  crval1: number;
  crval2: number;
  crpix1: number;
  crpix2: number;
  cdelt1: number;
  cdelt2: number;
  cd1_1: number;
  cd1_2: number;
  cd2_1: number;
  cd2_2: number;
  ctype1: string;
  ctype2: string;
  equinox: number;
  radesys: string;
  pixelScaleArcsec: number;
  sip?: SIPParams;
}

export interface HDUMetadata {
  index: number;
  name: string;
  bitpix: number;
  dimensions: number[];
  dataBytes: number;
  readStatus: 'READ_AND_USED' | 'INGESTED_METADATA_PRESERVED' | 'SKIPPED_NOT_NEEDED';
  headerSummary?: Record<string, string | number | boolean>;
}

export interface FITSImageData {
  width: number;
  height: number;
  data: Float32Array; // Flux in BUNIT (e.g. MJy/sr)
  variance: Float32Array | null; // Variance in (BUNIT)^2
  flags: Int32Array | null; // Data quality bitmask
  bunit: string;
  header: Record<string, string | number | boolean>;
  wcs: WCSParams;
  stats: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
    robustNoise: number; // from median absolute deviation (MAD)
  };
  hdus?: HDUMetadata[];
  zodi?: {
    width: number;
    height: number;
    data?: Float32Array;
  };
  psfMetadata?: {
    dimensions: number[];
    is3DModel: boolean;
    headerCards: Record<string, string | number | boolean>;
  };
  wcsWaveMetadata?: {
    dimensions: number[];
    isTable: boolean;
  };
}

export interface CatalogMatch {
  catalog: 'Gaia DR3' | 'SIMBAD' | '2MASS' | 'AllWISE' | 'SPLICES';
  identifier: string;
  ra: number;
  dec: number;
  separationArcsec: number;
  objectType?: string;
  photometry?: string;
  sourceUrl: string;
  matchProvenance?: 'LIVE_VIZIER_TAP' | 'BENCHMARK_FIXTURE_CACHE';
}

export type CandidateStatus =
  | 'Candidate'
  | 'Significant flux change'
  | 'Likely known source'
  | 'Possible artifact'
  | 'Stationary source residual'
  | 'Insufficient evidence'
  | 'No significant change'
  | 'Moving object candidate';

export type CandidateScientificClassification =
  | 'POSSIBLE_MOVING_OBJECT'
  | 'STATIONARY_SOURCE_RESIDUAL'
  | 'REGISTRATION_OR_PSF_ARTIFACT'
  | 'INSUFFICIENT_EVIDENCE'
  | 'SIGNIFICANT_FLUX_CHANGE'
  | 'KNOWN_CATALOG_SOURCE';

export interface CandidateMotion {
  isMoving: boolean;
  speedArcsecPerDay?: number;
  properMotionMasYr?: number;
  positionAngleDeg?: number;
  separationArcsec?: number;
  counterpart?: {
    x: number;
    y: number;
    ra: number;
    dec: number;
    flux: number;
  };
}

export interface CandidateDetection {
  id: string;
  x: number; // Centroid or primary x position (0-based)
  y: number; // Centroid or primary y position (0-based)
  peakX?: number; // Exact integer pixel peak x
  peakY?: number; // Exact integer pixel peak y
  peakRa?: number; // Sky coordinates of the integer peak
  peakDec?: number;
  centroidX?: number; // Subpixel fitted centroid x
  centroidY?: number; // Subpixel fitted centroid y
  centroidUncertaintyPix?: number; // 1-sigma centroid positional uncertainty in pixels
  ra: number; // Celestial Right Ascension in decimal degrees (ICRS) using subpixel centroid
  dec: number; // Celestial Declination in decimal degrees (ICRS) using subpixel centroid
  peakSignificance: number; // Signal-to-noise ratio S/N of the central peak pixel: |D(x,y)| / sigma_D
  apertureSignificance: number; // Signal-to-noise ratio S/N of integrated aperture flux: |Delta_F| / sigma_Delta_F
  deltaFlux: number; // Residual flux in BUNIT
  deltaFluxUncertainty: number; // 1-sigma uncertainty
  apertureFluxEpoch1: number;
  apertureFluxEpoch2: number;
  apertureUncertainty1: number;
  apertureUncertainty2: number;
  status: CandidateStatus;
  scientificClassification?: CandidateScientificClassification;
  artifactScore: number; // 0.0 (clean point source) to 1.0 (definite artifact)
  artifactFlags: string[];
  whyFlagged?: string;
  catalogMatches: CatalogMatch[];
  fwhmPixels?: number;
  morphology?: 'point-like' | 'extended' | 'sharp-spike' | 'dipole';
  motion?: CandidateMotion;
}

export type InvestigationClassification =
  | 'SIGNIFICANT CHANGE DETECTED'
  | 'POSSIBLE CHANGE — NEEDS REVIEW'
  | 'NO SIGNIFICANT CHANGE DETECTED'
  | 'POSSIBLE ARTIFACT'
  | 'INSUFFICIENT DATA';

export interface EvidenceSummary {
  classification: InvestigationClassification;
  maxSignificance: number;
  candidateCount: number;
  timeBaselineDays: number;
  integrationDuration1Sec?: number;
  integrationDuration2Sec?: number;
  startToStartCadenceSec?: number;
  interExposureGapSec?: number;
  summaryProse: string;
  statisticalJustification: string;
  whatWeKnow: string[];
  whatWeDontKnow: string[];
}

export interface ProvenanceRecord {
  caseId: string;
  sourceMode: 'live' | 'saved_benchmark';
  investigationType?: 'Curated Archival Case' | 'Live IRSA Query';
  timestamp: string;
  irsaArchiveSource: string;
  obsId1: string;
  obsId2: string;
  fitsUrl1: string;
  fitsUrl2: string;
  fitsChecksum1: string;
  fitsChecksum2: string;
  dataRelease: string;
  pipelineVersion: string;
  algorithms: {
    fitsParser: string;
    wcsReprojection: string;
    differenceMethod: string;
    noiseEstimation: string;
    photometry: string;
    artifactFilter: string;
    catalogMatcher: string;
  };
}

export interface ChallengeTarget {
  id: string;
  name: string;
  ra: number;
  dec: number;
  constellation: string;
  scienceType: string;
  description: string;
  qr2Coverage: 'outside_footprint' | 'inside_footprint' | 'covered';
  angularDistanceDegToNEP: number;
  recommendedBenchmarkId: string;
  expectedBehavior: string;
  observationsCount?: number;
  sampleObsId?: string;
  sexagesimal?: string;
}

export interface SpectralBandInfo {
  channelIndex: number; // 1 to 102
  detector: number; // 1 to 6
  bandName: string;
  wavelengthUm: number;
  bandwidthUm: number;
  resolvingPower: number; // R = lambda / delta_lambda
  primaryScienceFeatures: string;
}

export interface MultiEpochVisit {
  epochIndex: number;
  obsId: string;
  dateStr: string;
  mjd: number;
  wavelengthUm: number;
  band: string;
  fitsUrl: string;
}

export interface InvestigationResult {
  caseId: string;
  sourceMode?: 'live' | 'saved_benchmark';
  title: string;
  description: string;
  targetCoords: { ra: number; dec: number };
  fovArcmin?: number;
  sizePix?: number;
  epoch1: {
    metadata: SPHERExObservation;
    width: number;
    height: number;
    flux: number[]; // serialized for client transfer
    variance?: number[];
    flags?: number[];
    bunit: string;
    stats: FITSImageData['stats'];
    wcs: WCSParams;
  };
  epoch2: {
    metadata: SPHERExObservation;
    width: number;
    height: number;
    flux: number[];
    variance?: number[];
    flags?: number[];
    bunit: string;
    stats: FITSImageData['stats'];
    wcs: WCSParams;
  };
  epochs?: Array<{
    epochIndex: number;
    obsId: string;
    date: string;
    dateEnd?: string;
    integrationDurationSec?: number;
    mjd: number;
    flux: number[];
    width: number;
    height: number;
    wcs: WCSParams;
  }>;
  difference: {
    width: number;
    height: number;
    diff: number[];
    variance: number[];
    significance: number[]; // S/N per pixel
    stats: {
      min: number;
      max: number;
      std: number;
      noiseSigma: number;
    };
  };
  compatibility: {
    isCompatible: boolean;
    reason?: string;
    timeBaselineDays: number;
    wavelengthDiffUm: number;
    timeBaselineType?: 'SAME_EXPOSURE' | 'INTRA_VISIT_EXPOSURES' | 'INDEPENDENT_VISIT' | 'SURVEY_EPOCH';
    timeBaselineHuman?: string;
    integrationDuration1Sec?: number;
    integrationDuration2Sec?: number;
    startToStartCadenceSec?: number;
    interExposureGapSec?: number;
  };
  registration: {
    dxPixels: number;
    dyPixels: number;
    method: string;
    quality: string;
    runtimeMs?: number;
    maxSpatialWarpPixels?: number;
    reprojectionMode?: 'PIXEL_BY_PIXEL_WCS' | 'RIGID_TRANSLATION';
    dqPropagationPolicy?: string;
  };
  candidates: CandidateDetection[];
  evidence: EvidenceSummary;
  provenance: ProvenanceRecord;
  datasetSource?: DatasetSourceType;
  releaseId?: string;
  observationIds?: string[];
  fileIdentifiers?: string[];
  observationTimestamps?: string[];
  processingVersion?: string;
  isSimulated?: boolean;
  simulatedLabel?: string;
  timeSeries?: any;
  detectorStacks?: any;
  spectrumAtCenter?: any;
  timeSeriesFramesCount?: number;
}

export type DatasetSourceType = 'DEVELOPMENT_BENCHMARK' | 'OFFICIAL_CHALLENGE_RELEASE' | 'SYNTHETIC_INGESTION_FIXTURE';

export interface ReleaseValidationReport {
  timestamp: string;
  datasetSource: DatasetSourceType;
  releaseId: string;
  filesInspected: number;
  validFilesCount: number;
  invalidFilesCount: number;
  uniqueObservationIds: number;
  uniqueObservationEpochs: number;
  validIndependentEpochPairs: number;
  totalTemporalPairs?: number;
  intraVisitPairs?: number;
  independentVisitPairs?: number;
  surveyEpochPairs?: number;
  independentVisitDistinctionStatus?: 'NOT_VERIFIED' | 'VERIFIED_MULTI_VISIT';
  duplicateOrAmbiguousCount: number;
  duplicateOrAmbiguousDetails: Array<{
    fileName: string;
    reason: string;
    matchedObsId: string;
  }>;
  wcsValid: boolean;
  varianceExtensionPresent: boolean;
  varianceSource: 'NATIVE' | 'ESTIMATED' | 'MIXED';
  flagsExtensionPresent: boolean;
  flagsStatus: 'PRESENT' | 'MISSING' | 'MIXED';
  unitStatus: 'RECOGNIZED_SURFACE_BRIGHTNESS' | 'UNSUPPORTED' | 'MISSING';
  derivedFootprint: {
    raMin: number;
    raMax: number;
    decMin: number;
    decMax: number;
    boundingBoxAreaSqDeg: number;
    actualFootprintAreaSqDeg: number;
    areaSqDeg: number;
    unionAreaSqDeg?: number;
    pixelCenterUnionAreaSqDeg?: number;
    handlesWraparound: boolean;
    method: string;
    individualFootprints?: Array<{
      fileName: string;
      obsId: string;
      orientationAngleDeg: number;
      skyOrientationAngleDeg: number;
      pixelCenterAreaSqDeg: number;
      fullPixelAreaSqDeg: number;
      cornersPixelCenter: Array<{ ra: number; dec: number }>;
      cornersFullPixel: Array<{ ra: number; dec: number }>;
    }>;
    pairwiseOverlapAreasSqDeg?: Array<{
      obsId1: string;
      obsId2: string;
      pixelCenterOverlapSqDeg: number;
      fullPixelOverlapSqDeg: number;
    }>;
  };
  epochDeduplicationSummary: {
    filesCount: number;
    uniqueObsIds: number;
    uniqueEpochs: number;
    groupedVisitsCount?: number;
    intraVisitExposuresCount: number;
    independentVisitsCount: number;
    unverifiedVisitsCount?: number;
    surveyEpochsCount?: number;
    validTemporalPairs: number;
    totalTemporalPairs?: number;
    intraVisitPairs?: number;
    independentVisitPairs?: number;
    surveyEpochPairs?: number;
    pairwiseCadenceDetails?: Array<{
      obsId1: string;
      obsId2: string;
      integrationDuration1Sec: number | null;
      integrationDuration2Sec: number | null;
      startToStartCadenceSec: number | null;
      interExposureGapSec: number | null;
      pairType: 'INTRA_VISIT_EXPOSURE' | 'INDEPENDENT_VISIT' | 'SURVEY_EPOCH' | 'NOT_VERIFIED';
    }>;
  };
  detectedEpochs: Array<{
    fileName?: string;
    sha256?: string;
    obsId: string;
    expIdn?: number | string | null;
    mjd: number;
    mjdEnd?: number;
    date: string;
    dateEnd?: string;
    integrationDurationSec?: number;
    telapseSec?: number;
    xposureSec?: number;
    wavelengthUm?: number;
    detector?: number;
    parsedObsId?: {
      week: string;
      pass: string;
      slew: string;
      exposure: string;
      visitKey: string;
    } | null;
    isDuplicate?: boolean;
    visitType?: 'INTRA_VISIT_EXPOSURE' | 'INDEPENDENT_VISIT' | 'SURVEY_EPOCH' | 'NOT_VERIFIED';
    visitClassificationReason?: string;
  }>;
  detectedBands: string[];
  issues: string[];
  status: 'READY' | 'WARNINGS' | 'INCOMPATIBLE';
}

