import { ArrayInfo, BandInfo } from './types';

/**
 * SPHEREx 6 Detector Arrays Configuration
 * Exactly configured per NASA Space Apps Challenge 2025 specifications.
 */
export const SPHEREX_ARRAYS: ArrayInfo[] = [
  {
    id: 0,
    label: 'Array 0',
    wavelengthRange: '0.75–1.1 µm',
    channels: [16, 17, 18, 19],
    color: '#64b5f6',
  },
  {
    id: 1,
    label: 'Array 1',
    wavelengthRange: '1.1–1.6 µm',
    channels: [20, 21, 22, 23],
    color: '#4caf50',
  },
  {
    id: 2,
    label: 'Array 2',
    wavelengthRange: '1.6–2.2 µm',
    channels: [24, 25, 26, 27],
    color: '#ff9400',
  },
  {
    id: 3,
    label: 'Array 3',
    wavelengthRange: '2.2–3.2 µm',
    channels: [28, 29, 30, 31],
    color: '#9b59b6',
  },
  {
    id: 4,
    label: 'Array 4',
    wavelengthRange: '3.2–4.2 µm',
    channels: [32, 33, 34, 35],
    color: '#e74c3c',
  },
  {
    id: 5,
    label: 'Array 5',
    wavelengthRange: '4.2–5.0 µm',
    channels: [36, 37, 38, 39],
    color: '#ff6b6b',
  },
];

/**
 * Discrete channel wavelengths for configured challenge channels 16-39
 */
export const SPHEREX_BANDS: BandInfo[] = [
  // Array 0 (0.75 - 1.10 µm)
  { channel: 16, wavelength_um: 0.75, arrayId: 0 },
  { channel: 17, wavelength_um: 0.87, arrayId: 0 },
  { channel: 18, wavelength_um: 0.98, arrayId: 0 },
  { channel: 19, wavelength_um: 1.10, arrayId: 0 },

  // Array 1 (1.10 - 1.60 µm)
  { channel: 20, wavelength_um: 1.10, arrayId: 1 },
  { channel: 21, wavelength_um: 1.27, arrayId: 1 },
  { channel: 22, wavelength_um: 1.43, arrayId: 1 },
  { channel: 23, wavelength_um: 1.60, arrayId: 1 },

  // Array 2 (1.60 - 2.20 µm)
  { channel: 24, wavelength_um: 1.60, arrayId: 2 },
  { channel: 25, wavelength_um: 1.80, arrayId: 2 },
  { channel: 26, wavelength_um: 2.00, arrayId: 2 },
  { channel: 27, wavelength_um: 2.20, arrayId: 2 },

  // Array 3 (2.20 - 3.20 µm)
  { channel: 28, wavelength_um: 2.20, arrayId: 3 },
  { channel: 29, wavelength_um: 2.53, arrayId: 3 },
  { channel: 30, wavelength_um: 2.87, arrayId: 3 },
  { channel: 31, wavelength_um: 3.20, arrayId: 3 },

  // Array 4 (3.20 - 4.20 µm)
  { channel: 32, wavelength_um: 3.20, arrayId: 4 },
  { channel: 33, wavelength_um: 3.53, arrayId: 4 },
  { channel: 34, wavelength_um: 3.87, arrayId: 4 },
  { channel: 35, wavelength_um: 4.20, arrayId: 4 },

  // Array 5 (4.20 - 5.00 µm)
  { channel: 36, wavelength_um: 4.20, arrayId: 5 },
  { channel: 37, wavelength_um: 4.47, arrayId: 5 },
  { channel: 38, wavelength_um: 4.73, arrayId: 5 },
  { channel: 39, wavelength_um: 5.00, arrayId: 5 },
];

/**
 * All configured channels [16..39]
 */
export const ALL_CONFIGURED_CHANNELS = SPHEREX_BANDS.map((b) => b.channel);

/**
 * One representative channel per array (useful for fast multi-wavelength SED sampling)
 */
export const ONE_PER_ARRAY_CHANNELS = [17, 21, 25, 29, 33, 37];

/**
 * Complete 102-Band SPHEREx Spectral Reference (1 to 102, 0.75 to 5.00 µm)
 */
export const ALL_102_BANDS: BandInfo[] = Array.from({ length: 102 }, (_, idx) => {
  const channel = idx + 1;
  // Calculate array ID (0 to 5 for the 6 LVF arrays, 17 channels per array on average)
  const arrayId = Math.min(5, Math.floor((idx / 102) * 6));
  // Non-linear logarithmic step across 0.75 to 5.0 µm
  const wavelength_um = Number(
    (0.75 * Math.pow(5.0 / 0.75, idx / 101)).toFixed(3)
  );
  return { channel, wavelength_um, arrayId };
});

