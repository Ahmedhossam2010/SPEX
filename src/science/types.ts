export interface SPHERExObservation {
  obs_id: string;
  s_ra: number;
  s_dec: number;
  t_min: number; // MJD start
  t_max: number; // MJD end
  date_obs?: string; // ISO UTC
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
}

export type CandidateStatus =
  | 'Candidate'
  | 'Likely known source'
  | 'Possible artifact'
  | 'Insufficient evidence'
  | 'No significant change'
  | 'Moving object candidate';

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
  x: number; // 0-based pixel index
  y: number;
  ra: number;
  dec: number;
  peakSignificance: number; // Signal-to-noise ratio S/N of the central peak pixel: |D(x,y)| / sigma_D
  apertureSignificance: number; // Signal-to-noise ratio S/N of integrated aperture flux: |Delta_F| / sigma_Delta_F
  deltaFlux: number; // Residual flux in BUNIT
  deltaFluxUncertainty: number; // 1-sigma uncertainty
  apertureFluxEpoch1: number;
  apertureFluxEpoch2: number;
  apertureUncertainty1: number;
  apertureUncertainty2: number;
  status: CandidateStatus;
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

export interface InvestigationResult {
  caseId: string;
  sourceMode?: 'live' | 'saved_benchmark';
  title: string;
  description: string;
  targetCoords: { ra: number; dec: number };
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
  };
  registration: {
    dxPixels: number;
    dyPixels: number;
    method: string;
    quality: string;
  };
  candidates: CandidateDetection[];
  evidence: EvidenceSummary;
  provenance: ProvenanceRecord;
}
