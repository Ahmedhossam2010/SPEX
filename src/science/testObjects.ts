import { TestObject } from './types';

/**
 * NASA Space Apps Challenge 2025: Pre-Configured Test Objects
 * Required benchmark targets for "SPHEREx: The Changing Sky" challenge.
 */
export const NASA_TEST_OBJECTS: TestObject[] = [
  {
    id: 'barnards-star',
    name: "Barnard's Star",
    type: 'star',
    typeLabel: 'Fast-Moving Star',
    ra: 269.4521,
    dec: 4.6933,
    raHms: '17h 57m 48.8s',
    decDms: "+04° 41' 36.0\"",
    description: 'Fast-moving nearby star (2nd closest to Sun, highest proper motion: 10.3"/yr)',
    icon: '🌟',
    category: 'High Proper Motion',
  },
  {
    id: 'wise-0855',
    name: 'WISE 0855-0714',
    type: 'brown_dwarf',
    typeLabel: 'Cold Brown Dwarf',
    ra: 133.7951,
    dec: -7.2451,
    raHms: '08h 55m 10.8s',
    decDms: "-07° 14' 42.5\"",
    description: 'Coldest known sub-stellar brown dwarf (~250 K) with large proper motion (8.1"/yr)',
    icon: '🪐',
    category: 'Sub-stellar Object',
  },
  {
    id: 'epsilon-indi-b',
    name: 'Epsilon Indi B',
    type: 'brown_dwarf',
    typeLabel: 'Brown Dwarf Binary',
    ra: 330.84,
    dec: -56.785,
    raHms: '22h 03m 21.6s',
    decDms: "-56° 47' 06.0\"",
    description: 'Nearby T-dwarf binary pair (Ba + Bb) with significant infrared flux variation',
    icon: '🪐',
    category: 'Sub-stellar Binary',
  },
  {
    id: 'rw-aurigae',
    name: 'RW Aurigae',
    type: 'variable_star',
    typeLabel: 'T Tauri Variable Star',
    ra: 76.8283,
    dec: 30.4003,
    raHms: '05h 07m 18.8s',
    decDms: "+30° 24' 01.0\"",
    description: 'Young T Tauri pre-main-sequence star with periodic tidal dimming and circumstellar disk accretion',
    icon: '✨',
    category: 'Young Stellar Object',
  },
  {
    id: 'r-draconis',
    name: 'R Draconis',
    type: 'variable_star',
    typeLabel: 'Mira-Type Variable Star',
    ra: 245.0,
    dec: 66.7458,
    raHms: '16h 20m 00.0s',
    decDms: "+66° 44' 45.0\"",
    description: 'Pulsating asymptotic giant branch (AGB) Mira variable star with ~245-day period and large infrared ΔF',
    icon: '💫',
    category: 'Pulsating Giant',
  },
];

/**
 * Find matching test object by coordinates within tolerance
 */
export function findMatchingTestObject(ra: number, dec: number, toleranceDeg = 0.05): TestObject | undefined {
  return NASA_TEST_OBJECTS.find((obj) => {
    const dra = Math.abs(obj.ra - ra);
    const ddec = Math.abs(obj.dec - dec);
    return dra <= toleranceDeg && ddec <= toleranceDeg;
  });
}

