import { ChallengeTarget, WCSParams } from './types';
import { WCS } from './wcs';
export {
  sexagesimalToDecimal,
  decimalToSexagesimal,
  parseCoordinateInput,
  type ParsedCoordinates,
} from './coordinates';

/**
 * SPHEREx Survey Coverage Definition:
 * NASA/IPAC IRSA SPHEREx All-Sky & Deep Survey exposures indexed in
 * spherex.artifact JOIN spherex.plane (DR1/QR3/QR2).
 */
export const SPHEREX_QR2_FOOTPRINT = {
  name: 'SPHEREx All-Sky & Deep Survey Coverage (IRSA TAP)',
  raMin: 0,
  raMax: 360,
  decMin: -90,
  decMax: 90,
  centerRa: 276.15,
  centerDec: 64.85,
  areaSqDeg: 41253,
  mosaicAreaSqDeg: 41253,
  totalVisitsPerYear: 180,
  dataRelease: 'SPHEREx Public Archive (NASA/IPAC IRSA spherex.artifact / spherex.plane)',
  archiveSource: 'NASA/IPAC Infrared Science Archive (IRSA)',
};

/**
 * The 5 Official Challenge Benchmark Targets:
 * Verified J2000 celestial coordinates (SIMBAD / Gaia DR3 / Spitzer-HST),
 * proper motions, and astrophysical characteristics.
 */
export const OFFICIAL_CHALLENGE_TARGETS: ChallengeTarget[] = [
  {
    id: 'target-barnards-star',
    name: "Barnard's Star (GJ 699)",
    // SIMBAD ICRS J2000: 17h57m48.49847s +04d41'36.1139"
    ra: 269.45207695,
    dec: 4.69336497,
    sexagesimal: '17h57m48.498s +04d41m36.114s',
    pmRaMasYr: -801.551,
    pmDecMasYr: 10362.394,
    coordinateEpochYear: 2000.0,
    coordinateEpochKnown: true,
    coordinateVerification: 'VERIFIED_GAIA_DR3',
    coordinateSource: 'SIMBAD / Gaia DR3 (ICRS J2000)',
    constellation: 'Ophiuchus',
    scienceType: 'High-Proper-Motion M4V Red Dwarf',
    description:
      'The second-closest known stellar system to the Sun (~5.96 ly), celebrated for having the highest known proper motion of any star (10.36″/year). Ideal for testing stellar dipole detection across multi-epoch infrared surveys.',
    qr2Coverage: 'covered',
    observationsCount: 359,
    sampleObsId: '2025W33_2C_0321_1',
    angularDistanceDegToNEP: 60.2,
    recommendedBenchmarkId: 'case-nep-var-01',
    expectedBehavior:
      'Verified in IRSA SPHEREx archive with 359+ real exposures. Multi-epoch series allows visual inspection of fast proper motion and flux stability across passes.',
  },
  {
    id: 'target-epsilon-indi-bab',
    name: 'Epsilon Indi Ba/Bb (challenge target)',
    // SIMBAD * eps Ind B (J2000): 22h04m10.595s -56d46m58.24"
    ra: 331.04414659,
    dec: -56.78284420,
    sexagesimal: '22h04m10.595s -56d46m58.24"',
    constellation: 'Indus',
    scienceType: 'Cold Binary Brown Dwarf (T1V + T6V)',
    description:
      'A benchmark binary methane-dwarf system at ~11.8 ly (Ba T1 + Bb T6, ~0.6″ apart), orbiting ~402″ (~6.7\') from epsilon Indi A. Its methane absorption at 1.6 and 3.3 µm makes it a key SPHEREx 102-band target.',
    qr2Coverage: 'covered',
    observationsCount: 445,
    sampleObsId: '2025W17_4B_0017_1',
    angularDistanceDegToNEP: 125.8,
    recommendedBenchmarkId: 'case-nep-var-01',
    expectedBehavior:
      'Verified in IRSA SPHEREx archive with 445+ real exposures in the southern celestial hemisphere.',
    role: 'challenge_target',
    coordinateEpochKnown: true,
    coordinateEpochYear: 2000.0,
    pmRaMasYr: 3981.977,
    pmDecMasYr: -2466.832,
    coordinateVerification: 'VERIFIED_GAIA_DR3',
    coordinateSource: 'SIMBAD * eps Ind B / Gaia DR3',
  },
  {
    // Reference star in the same field (verified). Not the challenge target.
    id: 'target-epsilon-indi-a',
    name: 'Epsilon Indi A (reference star)',
    // SIMBAD * eps Ind (J2000): 22h03m21.65s -56d47m09.5"
    ra: 330.840229,
    dec: -56.78598,
    sexagesimal: '22h03m21.65s -56d47m09.5"',
    constellation: 'Indus',
    scienceType: 'K4.5V Main-Sequence Star (system primary)',
    description:
      'The K-dwarf primary of the epsilon Indi system, kept as a verified astrometric reference for the field.',
    qr2Coverage: 'covered',
    observationsCount: 445,
    sampleObsId: '2025W17_4B_0017_1',
    angularDistanceDegToNEP: 125.8,
    recommendedBenchmarkId: 'case-nep-var-01',
    expectedBehavior:
      'Verified in IRSA TAP with 445+ real exposures across multiple detectors (including D3 at ~2.0 µm) in the southern celestial hemisphere.',
    role: 'reference_star',
    pmRaMasYr: 3966.661,
    pmDecMasYr: -2536.192,
    coordinateEpochYear: 2000.0,
    coordinateEpochKnown: true,
    coordinateEpochNote:
      'Position quoted at epoch J2000.0 (SIMBAD convention); proper motion measured by Gaia DR3.',
    coordinateVerification: 'VERIFIED_GAIA_DR3',
    coordinateSource: 'SIMBAD * eps Ind / Gaia DR3',
  },
  {
    id: 'target-wise-0855',
    name: 'WISE 0855-0714',
    // SIMBAD WISEA J085510.74-071442.5 (J2000): 08h55m16.538s -07d14'49.37"
    ra: 133.81890825,
    dec: -7.24704800,
    sexagesimal: '08h55m16.538s -07d14m49.37s',
    pmRaMasYr: -8123.7,
    pmDecMasYr: 673.2,
    coordinateEpochYear: 2000.0,
    coordinateEpochKnown: true,
    coordinateEpochNote:
      'J2000 ICRS coordinate and proper motion from Kirkpatrick et al. (2021ApJS..253....7K) Spitzer/HST astrometry; optical-invisible to Gaia DR3.',
    coordinateVerification: 'VERIFIED_SPITZER_HST',
    coordinateSource: 'SIMBAD / Kirkpatrick et al. 2021 Spitzer/HST astrometry (absent from Gaia DR3)',
    constellation: 'Hydra',
    scienceType: 'Sub-Brown Dwarf (Y-Dwarf, ~250 K)',
    description:
      'The coldest known sub-stellar object outside the Solar System (~7.2 ly, T ~ 225–260 K), exhibiting atmospheric water-ice clouds. Optical-invisible to Gaia; astrometry from Spitzer/HST (~8.15″/yr motion).',
    qr2Coverage: 'covered',
    observationsCount: 256,
    sampleObsId: '2025W19_1B_0116_1',
    angularDistanceDegToNEP: 118.4,
    recommendedBenchmarkId: 'case-nep-var-01',
    expectedBehavior:
      'Verified in IRSA SPHEREx archive with 256+ real exposures. Key substellar target for detecting cold brown dwarf motion and thermal IR emission.',
    needsPrimaryCheck: true,
  },
  {
    id: 'target-rw-aurigae',
    name: 'RW Aurigae (RW Aur)',
    // SIMBAD V* RW Aur (J2000): 05h07m49.566s +30d24'05.18"
    ra: 76.95652603,
    dec: 30.40143817,
    sexagesimal: '05h07m49.566s +30d24m05.18s',
    pmRaMasYr: 7.23,
    pmDecMasYr: -20.33,
    coordinateEpochYear: 2000.0,
    coordinateEpochKnown: true,
    coordinateEpochNote:
      'Position at epoch J2000.0 (SIMBAD V* RW Aur / Hipparcos).',
    coordinateVerification: 'VERIFIED_SIMBAD',
    coordinateSource: 'SIMBAD V* RW Aur / van Leeuwen 2007',
    constellation: 'Auriga',
    scienceType: 'Young Stellar Object (Classical T Tauri Star Binary)',
    description:
      'A complex pre-main-sequence binary star with a protoplanetary circumstellar disk undergoing dramatic multi-magnitude occultations and infrared accretion outbursts.',
    qr2Coverage: 'covered',
    observationsCount: 333,
    sampleObsId: '2025W38_2C_0023_1',
    angularDistanceDegToNEP: 71.6,
    recommendedBenchmarkId: 'case-nep-var-01',
    expectedBehavior:
      'Verified in IRSA SPHEREx archive with 333+ real exposures in Taurus-Auriga. Time series captures young stellar variability and accretion dynamics.',
    needsPrimaryCheck: true,
  },
  {
    id: 'target-r-draconis',
    name: 'R Draconis (R Dra)',
    // SIMBAD V* R Dra (J2000): 16h32m40.227s +66d45'17.93"
    ra: 248.16761083,
    dec: 66.75497942,
    sexagesimal: '16h32m40.227s +66d45m17.93s',
    pmRaMasYr: -20.643,
    pmDecMasYr: 6.149,
    coordinateEpochYear: 2000.0,
    coordinateEpochKnown: true,
    coordinateEpochNote: 'SIMBAD V* R Dra / Gaia DR3 J2000 position and proper motion.',
    coordinateVerification: 'VERIFIED_GAIA_DR3',
    coordinateSource: 'SIMBAD V* R Dra / Gaia DR3',
    constellation: 'Draco',
    scienceType: 'Mira-Type Pulsating Variable Giant (M5e-M9e)',
    description:
      'A long-period asymptotic giant branch (AGB) pulsating variable star with a 245-day period, varying by over 6 magnitudes between maximum and minimum as circumstellar dust cools and condensates.',
    qr2Coverage: 'covered',
    observationsCount: 2499,
    sampleObsId: '2025W24_2D_0534_1',
    angularDistanceDegToNEP: 11.3,
    recommendedBenchmarkId: 'case-nep-var-01',
    expectedBehavior:
      'Verified in IRSA SPHEREx archive with 2,499+ real exposures in Draco. Time series captures large-amplitude Mira pulsation cycle.',
  },
];
