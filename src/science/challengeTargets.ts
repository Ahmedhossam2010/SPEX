import { ChallengeTarget, WCSParams } from './types';
import { WCS } from './wcs';

/**
 * SPHEREx QR2 Survey Coverage Definition:
 * NASA/IPAC IRSA SPHEREx Quick Release 2 covers the deep North Ecliptic Pole (NEP)
 * verification strip:
 * RA range:  275.5° to 276.8°
 * Dec range: +64.5° to +65.2°
 * Ecliptic Latitude: ~ +90.0° (Deep Survey High-Redundancy Field)
 */
export const SPHEREX_QR2_FOOTPRINT = {
  name: 'SPHEREx QR2 North Ecliptic Pole (NEP) Deep Survey Field',
  raMin: 275.5,
  raMax: 276.8,
  decMin: 64.5,
  decMax: 65.2,
  centerRa: 276.15,
  centerDec: 64.85,
  areaSqDeg: 0.39, // Exact spherical solid angle: ΔRA * (sin(DecMax) - sin(DecMin)) * (180/π)^2 = 0.3867 sq deg (~0.39 sq deg)
  mosaicAreaSqDeg: 0.55, // Total dithered mosaic field including calibration margins spans ~0.55 sq deg
  totalVisitsPerYear: 180, // High cadence at ecliptic pole
  dataRelease: 'SPHEREx Quick Release 2 (QR2, Level 2B)',
  archiveSource: 'NASA/IPAC Infrared Science Archive (IRSA)',
};

export interface VerifiedBenchmarkObservation {
  obsId: string;
  fileName: string;
  width: number;
  height: number;
  wcs: WCSParams;
}

/**
 * Authentic WCS header definitions for the 3 SPHEREx QR2 benchmark cutouts
 * (derived directly from FITS headers of 2025W18_1B_0001_1, _2, and _3).
 */
export const QR2_BENCHMARK_OBSERVATIONS: VerifiedBenchmarkObservation[] = [
  {
    obsId: '2025W18_1B_0001_1',
    fileName: 'b6a1e605728059ea6b7def1e9683adb2.fits',
    width: 64,
    height: 64,
    wcs: {
      crval1: 276.261385453,
      crval2: 64.825774875,
      crpix1: 32.5,
      crpix2: 31.5,
      cdelt1: 1,
      cdelt2: 1,
      cd1_1: -0.00114381918219,
      cd1_2: -0.0012263998154,
      cd2_1: -0.00127347184824,
      cd2_2: 0.00119028634191,
      ctype1: 'RA---TAN-SIP',
      ctype2: 'DEC--TAN-SIP',
      equinox: 2000,
      radesys: 'ICRS',
      pixelScaleArcsec: 6.155113609631569,
      sip: {
        aOrder: 3,
        bOrder: 3,
        apOrder: 3,
        bpOrder: 3,
        aTerms: [
          { p: 0, q: 0, coeff: 0.32053197961 },
          { p: 0, q: 1, coeff: 0.000770454663755 },
          { p: 0, q: 2, coeff: -0.00000140567674619 },
          { p: 0, q: 3, coeff: -8.03473554893e-12 },
          { p: 1, q: 0, coeff: -0.000702634278197 },
          { p: 1, q: 1, coeff: 0.00000416126544494 },
          { p: 1, q: 2, coeff: 6.29853987403e-10 },
          { p: 2, q: 0, coeff: -0.00000158398966592 },
          { p: 2, q: 1, coeff: -1.19895631104e-10 },
          { p: 3, q: 0, coeff: 5.35700280529e-10 },
        ],
        bTerms: [
          { p: 0, q: 0, coeff: -1.18308696523 },
          { p: 0, q: 1, coeff: -0.0000878400893029 },
          { p: 0, q: 2, coeff: 0.00000198334285935 },
          { p: 0, q: 3, coeff: 4.36819752594e-10 },
          { p: 1, q: 0, coeff: -0.000517450885659 },
          { p: 1, q: 1, coeff: -6.8400234244e-7 },
          { p: 1, q: 2, coeff: -6.55401003621e-11 },
          { p: 2, q: 0, coeff: 0.00000666910407214 },
          { p: 2, q: 1, coeff: 6.3698167619e-10 },
          { p: 3, q: 0, coeff: -5.1958242909e-11 },
        ],
        apTerms: [
          { p: 0, q: 0, coeff: -0.319704597454 },
          { p: 0, q: 1, coeff: -0.000766188638621 },
          { p: 0, q: 2, coeff: 0.00000140644687815 },
          { p: 0, q: 3, coeff: -2.7895991292e-12 },
          { p: 1, q: 0, coeff: 0.000695831602666 },
          { p: 1, q: 1, coeff: -0.00000415086081554 },
          { p: 1, q: 2, coeff: -5.96739055488e-10 },
          { p: 2, q: 0, coeff: 0.00000158286988586 },
          { p: 2, q: 1, coeff: 7.90809839492e-11 },
          { p: 3, q: 0, coeff: -5.02504901844e-10 },
        ],
        bpTerms: [
          { p: 0, q: 0, coeff: 1.17802470489 },
          { p: 0, q: 1, coeff: 0.000081681185754 },
          { p: 0, q: 2, coeff: -0.00000197174264027 },
          { p: 0, q: 3, coeff: -4.26661155856e-10 },
          { p: 1, q: 0, coeff: 0.000523178538555 },
          { p: 1, q: 1, coeff: 6.84789256383e-7 },
          { p: 1, q: 2, coeff: 3.93475035943e-11 },
          { p: 2, q: 0, coeff: -0.00000665879276212 },
          { p: 2, q: 1, coeff: -5.52286286424e-10 },
          { p: 3, q: 0, coeff: 2.54211436202e-11 },
        ],
      },
    },
  },
  {
    obsId: '2025W18_1B_0001_2',
    fileName: '569dafa911ec60ff30abb1807d719fef.fits',
    width: 64,
    height: 64,
    wcs: {
      crval1: 275.923851155,
      crval2: 64.9607176422,
      crpix1: 34.5,
      crpix2: 146.5,
      cdelt1: 1,
      cdelt2: 1,
      cd1_1: -0.00113597038948,
      cd1_2: -0.00123299607749,
      cd2_1: -0.00127892892038,
      cd2_2: 0.00118274690581,
      ctype1: 'RA---TAN-SIP',
      ctype2: 'DEC--TAN-SIP',
      equinox: 2000,
      radesys: 'ICRS',
      pixelScaleArcsec: 6.152188088708227,
      sip: {
        aOrder: 3,
        bOrder: 3,
        apOrder: 3,
        bpOrder: 3,
        aTerms: [
          { p: 0, q: 0, coeff: 0.460012528281 },
          { p: 0, q: 1, coeff: 0.0000228511269025 },
          { p: 0, q: 2, coeff: -0.00000140479039339 },
          { p: 0, q: 3, coeff: -3.11512472593e-11 },
          { p: 1, q: 0, coeff: -0.000012281846162 },
          { p: 1, q: 1, coeff: 0.00000417396816526 },
          { p: 1, q: 2, coeff: 6.54340877716e-10 },
          { p: 2, q: 0, coeff: -0.0000016049287457 },
          { p: 2, q: 1, coeff: -1.21897736403e-10 },
          { p: 3, q: 0, coeff: 5.36462354797e-10 },
        ],
        bTerms: [
          { p: 0, q: 0, coeff: -1.34096951066 },
          { p: 0, q: 1, coeff: 0.000165440953162 },
          { p: 0, q: 2, coeff: 0.00000197029969075 },
          { p: 0, q: 3, coeff: 4.37848415492e-10 },
          { p: 1, q: 0, coeff: -0.0000765408798729 },
          { p: 1, q: 1, coeff: -6.92754961579e-7 },
          { p: 1, q: 2, coeff: -6.54274148358e-11 },
          { p: 2, q: 0, coeff: 0.00000667819519451 },
          { p: 2, q: 1, coeff: 6.39897883284e-10 },
          { p: 3, q: 0, coeff: -2.53542109768e-11 },
        ],
        apTerms: [
          { p: 0, q: 0, coeff: -0.457973223035 },
          { p: 0, q: 1, coeff: -0.0000169308384328 },
          { p: 0, q: 2, coeff: 0.0000013989915465 },
          { p: 0, q: 3, coeff: 1.94985190017e-11 },
          { p: 1, q: 0, coeff: 0.00000423783365446 },
          { p: 1, q: 1, coeff: -0.00000415493243438 },
          { p: 1, q: 2, coeff: -6.19681217706e-10 },
          { p: 2, q: 0, coeff: 0.00000159740637791 },
          { p: 2, q: 1, coeff: 7.94979513749e-11 },
          { p: 3, q: 0, coeff: -5.01631527562e-10 },
        ],
        bpTerms: [
          { p: 0, q: 0, coeff: 1.33568519368 },
          { p: 0, q: 1, coeff: -0.000171873864575 },
          { p: 0, q: 2, coeff: -0.00000195743081136 },
          { p: 0, q: 3, coeff: -4.27296036899e-10 },
          { p: 1, q: 0, coeff: 0.000083781154317 },
          { p: 1, q: 1, coeff: 6.86525409847e-7 },
          { p: 1, q: 2, coeff: 3.91506174258e-11 },
          { p: 2, q: 0, coeff: -0.00000665806926727 },
          { p: 2, q: 1, coeff: -5.54057148117e-10 },
          { p: 3, q: 0, coeff: -9.63338931354e-13 },
        ],
      },
    },
  },
  {
    obsId: '2025W18_1B_0001_3',
    fileName: '75b2c2369c175060576bec8d2e5333c0.fits',
    width: 64,
    height: 64,
    wcs: {
      crval1: 275.58152397,
      crval2: 65.0934469687,
      crpix1: 36.5,
      crpix2: 261.5,
      cdelt1: 1,
      cdelt2: 1,
      cd1_1: -0.00112936147968,
      cd1_2: -0.00123879520159,
      cd2_1: -0.00128482841705,
      cd2_2: 0.00117627478847,
      ctype1: 'RA---TAN-SIP',
      ctype2: 'DEC--TAN-SIP',
      equinox: 2000,
      radesys: 'ICRS',
      pixelScaleArcsec: 6.15176561056101,
      sip: {
        aOrder: 3,
        bOrder: 3,
        apOrder: 3,
        bpOrder: 3,
        aTerms: [
          { p: 0, q: 0, coeff: 0.253411983969 },
          { p: 0, q: 1, coeff: 0.000113698272662 },
          { p: 0, q: 2, coeff: -0.00000139509026615 },
          { p: 0, q: 3, coeff: -1.35933029799e-11 },
          { p: 1, q: 0, coeff: -0.0000337276787342 },
          { p: 1, q: 1, coeff: 0.00000416572337495 },
          { p: 1, q: 2, coeff: 6.49551255794e-10 },
          { p: 2, q: 0, coeff: -0.00000159573412506 },
          { p: 2, q: 1, coeff: -1.33382435692e-10 },
          { p: 3, q: 0, coeff: 5.28496364954e-10 },
        ],
        bTerms: [
          { p: 0, q: 0, coeff: -1.20333674297 },
          { p: 0, q: 1, coeff: 0.000311968426731 },
          { p: 0, q: 2, coeff: 0.00000197584571356 },
          { p: 0, q: 3, coeff: 4.43293618096e-10 },
          { p: 1, q: 0, coeff: -0.0000604891628415 },
          { p: 1, q: 1, coeff: -6.77811679519e-7 },
          { p: 1, q: 2, coeff: -5.06128729529e-11 },
          { p: 2, q: 0, coeff: 0.00000665931677632 },
          { p: 2, q: 1, coeff: 6.59724665305e-10 },
          { p: 3, q: 0, coeff: -7.3006767231e-11 },
        ],
        apTerms: [
          { p: 0, q: 0, coeff: -0.251524459121 },
          { p: 0, q: 1, coeff: -0.000109033015322 },
          { p: 0, q: 2, coeff: 0.00000138955616926 },
          { p: 0, q: 3, coeff: 2.18071420916e-12 },
          { p: 1, q: 0, coeff: 0.0000269344137998 },
          { p: 1, q: 1, coeff: -0.00000414650686545 },
          { p: 1, q: 2, coeff: -6.14951211916e-10 },
          { p: 2, q: 0, coeff: 0.00000158860817643 },
          { p: 2, q: 1, coeff: 9.15308823412e-11 },
          { p: 3, q: 0, coeff: -4.93933390388e-10 },
        ],
        bpTerms: [
          { p: 0, q: 0, coeff: 1.19783497955 },
          { p: 0, q: 1, coeff: -0.000317691617367 },
          { p: 0, q: 2, coeff: -0.00000196184026217 },
          { p: 0, q: 3, coeff: -4.32430637493e-10 },
          { p: 1, q: 0, coeff: 0.0000649132724886 },
          { p: 1, q: 1, coeff: 6.72213189677e-7 },
          { p: 1, q: 2, coeff: 2.47538964028e-11 },
          { p: 2, q: 0, coeff: -0.00000663813189712 },
          { p: 2, q: 1, coeff: -5.73974801798e-10 },
          { p: 3, q: 0, coeff: 4.68022811778e-11 },
        ],
      },
    },
  },
];

export interface QR2CoverageResult {
  inside: boolean; // true if covered by at least one verified observation
  coverageType:
    | 'FULL_TRIPLE_OVERLAP'
    | 'TEMPORAL_PAIR_COVERAGE'
    | 'SINGLE_EPOCH_ONLY'
    | 'OUTSIDE_FOOTPRINT'
    | 'INVALID_COORDINATES';
  coveredObservations: string[]; // obs_ids of covering exposures
  coverageCount: number; // 0, 1, 2, or 3
  isInsideBoundingBox: boolean; // whether it falls inside the coarse rectangular bounding box
  distanceDeg: number; // separation from benchmark center in degrees
  distanceArcsec: number;
  reason: string;
}

/**
 * Check if given celestial coordinates fall within SPHEREx QR2 survey footprint.
 * Scientifically verifies actual WCS image detector coverage across all authentic
 * benchmark exposures, rejecting coordinates that merely fall inside a bounding box.
 */
export function checkCoordinatesInQR2(ra: number, dec: number): QR2CoverageResult {
  // Validate finite numeric coordinates
  if (
    typeof ra !== 'number' ||
    typeof dec !== 'number' ||
    !Number.isFinite(ra) ||
    !Number.isFinite(dec) ||
    dec < -90 ||
    dec > 90
  ) {
    return {
      inside: false,
      coverageType: 'INVALID_COORDINATES',
      coveredObservations: [],
      coverageCount: 0,
      isInsideBoundingBox: false,
      distanceDeg: NaN,
      distanceArcsec: NaN,
      reason: 'Coordinates are non-finite, out of physical range (Dec must be within [-90°, +90°]), or invalid.',
    };
  }

  // Handle RA wrap-around / normalization into standard [0°, 360°) domain
  const normRa = ((ra % 360) + 360) % 360;

  // Evaluate coarse rectangular bounding box for comparison and diagnostic reporting
  const isInsideBoundingBox =
    normRa >= SPHEREX_QR2_FOOTPRINT.raMin &&
    normRa <= SPHEREX_QR2_FOOTPRINT.raMax &&
    dec >= SPHEREX_QR2_FOOTPRINT.decMin &&
    dec <= SPHEREX_QR2_FOOTPRINT.decMax;

  // Angular distance to benchmark center (Van Oosterom / Great-circle separation)
  const separationArcsec = WCS.angularSeparationArcsec(
    normRa,
    dec,
    SPHEREX_QR2_FOOTPRINT.centerRa,
    SPHEREX_QR2_FOOTPRINT.centerDec
  );
  const distanceDeg = separationArcsec / 3600;

  // Exact WCS detector boundary check across all verified benchmark observations
  // Full pixel extent: [-0.5, width - 0.5] with numerical tolerance epsilon = 1e-7
  const EPSILON = 1e-7;
  const coveredObservations: string[] = [];

  for (const obs of QR2_BENCHMARK_OBSERVATIONS) {
    try {
      const pix = WCS.skyToPix(normRa, dec, obs.wcs);
      if (
        Number.isFinite(pix.x) &&
        Number.isFinite(pix.y) &&
        pix.x >= -0.5 - EPSILON &&
        pix.x <= obs.width - 0.5 + EPSILON &&
        pix.y >= -0.5 - EPSILON &&
        pix.y <= obs.height - 0.5 + EPSILON
      ) {
        coveredObservations.push(obs.obsId);
      }
    } catch {
      // Inversion failure outside TAN projection horizon
    }
  }

  const coverageCount = coveredObservations.length;
  let coverageType: QR2CoverageResult['coverageType'] = 'OUTSIDE_FOOTPRINT';

  if (coverageCount === 3) {
    coverageType = 'FULL_TRIPLE_OVERLAP';
  } else if (coverageCount === 2) {
    coverageType = 'TEMPORAL_PAIR_COVERAGE';
  } else if (coverageCount === 1) {
    coverageType = 'SINGLE_EPOCH_ONLY';
  } else {
    coverageType = 'OUTSIDE_FOOTPRINT';
  }

  const inside = coverageCount > 0;

  let reason = '';
  if (coverageCount === 3) {
    reason =
      'Coordinates fall inside the verified WCS footprint of all 3 SPHEREx QR2 benchmark exposures (full temporal overlap for difference imaging).';
  } else if (coverageCount === 2) {
    reason = `Coordinates fall inside the verified WCS footprint of 2 SPHEREx QR2 benchmark exposures (${coveredObservations.join(', ')}). Sufficient for two-epoch differencing.`;
  } else if (coverageCount === 1) {
    reason = `Coordinates fall inside only 1 SPHEREx QR2 benchmark exposure (${coveredObservations[0]}; single-epoch photometric coverage without temporal baseline).`;
  } else if (isInsideBoundingBox) {
    reason =
      'Coordinates fall within the nominal rectangular NEP bounding box (RA 275.5°–276.8°, Dec +64.5°–65.2°) but lie outside the actual rotated diamond WCS image footprints of the SPHEREx QR2 observations.';
  } else {
    reason = `Coordinates (RA ${normRa.toFixed(4)}°, Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(4)}°) lie ${distanceDeg.toFixed(1)}° away from the SPHEREx QR2 North Ecliptic Pole deep strip. Full all-sky coverage will expand in subsequent NASA/IPAC data releases.`;
  }

  return {
    inside,
    coverageType,
    coveredObservations,
    coverageCount,
    isInsideBoundingBox,
    distanceDeg,
    distanceArcsec: separationArcsec,
    reason,
  };
}

/**
 * The 5 Official Challenge Benchmark Targets:
 * Verified celestial coordinates, astrophysical characteristics, and coverage status.
 */
export const OFFICIAL_CHALLENGE_TARGETS: ChallengeTarget[] = [
  {
    id: 'target-barnards-star',
    name: "Barnard's Star (GJ 699)",
    ra: 269.45208,
    dec: 4.69339,
    constellation: 'Ophiuchus',
    scienceType: 'High-Proper-Motion M4V Red Dwarf',
    description:
      'The second-closest known stellar system to the Sun (~5.96 ly), celebrated for having the highest known proper motion of any star (10.36″/year). Ideal for testing stellar dipole detection across multi-epoch infrared surveys.',
    qr2Coverage: 'outside_footprint',
    angularDistanceDegToNEP: 60.2,
    recommendedBenchmarkId: 'case-nep-var-01',
    expectedBehavior:
      'Located in Ophiuchus (equatorial region), ~60.2° away from the QR2 NEP deep strip. IRSA returns HTTP 422 survey coverage limit. Use the verified NEP high-motion benchmark as analogue.',
  },
  {
    id: 'target-epsilon-indi-b',
    name: 'Epsilon Indi B & C',
    ra: 330.84042,
    dec: -56.78601,
    constellation: 'Indus',
    scienceType: 'Cold Binary Brown Dwarf (T1V + T6V)',
    description:
      'A benchmark binary methane-dwarf system at ~11.8 ly. Its extreme near-infrared spectral features (methane absorption at 1.6 and 3.3 µm) make it a key target for SPHEREx 102-band low-temperature spectroscopy.',
    qr2Coverage: 'outside_footprint',
    angularDistanceDegToNEP: 125.8,
    recommendedBenchmarkId: 'case-nep-var-01',
    expectedBehavior:
      'Located in the Southern Celestial Hemisphere (Dec -56.8°), ~125.8° away from the North Ecliptic Pole. Outside current QR2 release footprint; will be observed in all-sky survey releases.',
  },
  {
    id: 'target-wise-0855',
    name: 'WISE 0855-0714',
    ra: 133.86462,
    dec: -7.24115,
    constellation: 'Hydra',
    scienceType: 'Sub-Brown Dwarf (Y-Dwarf, ~250 K)',
    description:
      'The coldest known sub-stellar object outside the Solar System (~7.2 ly, T ~ 225–260 K), exhibiting atmospheric water-ice clouds. Detectable predominantly in mid-infrared channels (3.5–5.0 µm).',
    qr2Coverage: 'outside_footprint',
    angularDistanceDegToNEP: 118.4,
    recommendedBenchmarkId: 'case-nep-var-01',
    expectedBehavior:
      'Located in Hydra near the celestial equator, ~118.4° away from the NEP deep strip. Outside current QR2 footprint.',
  },
  {
    id: 'target-rw-aurigae',
    name: 'RW Aurigae (RW Aur)',
    ra: 77.45833,
    dec: 30.40142,
    constellation: 'Auriga',
    scienceType: 'Young Stellar Object (Classical T Tauri Star Binary)',
    description:
      'A complex pre-main-sequence binary star with a protoplanetary circumstellar disk undergoing dramatic multi-magnitude occultations and infrared accretion outbursts.',
    qr2Coverage: 'outside_footprint',
    angularDistanceDegToNEP: 71.6,
    recommendedBenchmarkId: 'case-nep-var-01',
    expectedBehavior:
      'Located in Taurus-Auriga star-forming complex (Dec +30.4°), ~71.6° from the NEP footprint. Outside current QR2 release.',
  },
  {
    id: 'target-r-draconis',
    name: 'R Draconis (R Dra)',
    ra: 248.33004,
    dec: 66.70281,
    constellation: 'Draco',
    scienceType: 'Mira-Type Pulsating Variable Giant (M5e-M9e)',
    description:
      'A long-period asymptotic giant branch (AGB) pulsating variable star with a 245-day period, varying by over 6 magnitudes between maximum and minimum as circumstellar dust cools and condensates.',
    qr2Coverage: 'outside_footprint',
    angularDistanceDegToNEP: 11.3,
    recommendedBenchmarkId: 'case-nep-var-01',
    expectedBehavior:
      'Located in Draco at high northern declination (+66.7°), only ~11.3° west of the QR2 North Ecliptic Pole strip boundary. While close, it lies just outside the narrow QR2 calibration corridor.',
  },
];
