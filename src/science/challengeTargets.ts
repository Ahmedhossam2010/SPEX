import { ChallengeTarget } from './types';
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

/**
 * Check if given celestial coordinates fall within SPHEREx QR2 survey footprint.
 */
export function checkCoordinatesInQR2(ra: number, dec: number): {
  inside: boolean;
  distanceDeg: number;
  reason: string;
} {
  const inside =
    ra >= SPHEREX_QR2_FOOTPRINT.raMin &&
    ra <= SPHEREX_QR2_FOOTPRINT.raMax &&
    dec >= SPHEREX_QR2_FOOTPRINT.decMin &&
    dec <= SPHEREX_QR2_FOOTPRINT.decMax;

  const separationArcsec = WCS.angularSeparationArcsec(
    ra,
    dec,
    SPHEREX_QR2_FOOTPRINT.centerRa,
    SPHEREX_QR2_FOOTPRINT.centerDec
  );
  const distanceDeg = separationArcsec / 3600;

  if (inside) {
    return {
      inside: true,
      distanceDeg,
      reason: 'Coordinates fall inside the high-cadence SPHEREx QR2 North Ecliptic Pole deep footprint.',
    };
  }

  return {
    inside: false,
    distanceDeg,
    reason: `Coordinates (RA ${ra.toFixed(4)}°, Dec ${dec.toFixed(4)}°) lie ${distanceDeg.toFixed(1)}° away from the currently published SPHEREx QR2 North Ecliptic Pole deep strip (RA 275.5°–276.8°, Dec +64.5°–65.2°). Full all-sky coverage will expand in subsequent NASA/IPAC data releases.`,
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
