import { TestObject } from './types';

/**
 * Constructs a standard Big-Endian IEEE-754 FITS binary buffer for NASA test objects
 * when coordinates are outside the NEP QR2 footprint.
 */
export function generateTestObjectFITSBuffer(
  testObj: TestObject,
  ra: number,
  dec: number,
  sizePix = 64,
  isEpoch2 = false
): Buffer {
  const width = sizePix;
  const height = sizePix;
  const numPixels = width * height;

  const makeCard = (key: string, value: string | number) => {
    let str = key.padEnd(8, ' ') + '= ';
    if (typeof value === 'number') {
      str += String(value).padStart(20, ' ');
    } else {
      str += `'${value}'`.padEnd(20, ' ');
    }
    return str.padEnd(80, ' ');
  };

  const primaryCards = [
    makeCard('SIMPLE', 'T'),
    makeCard('BITPIX', -32),
    makeCard('NAXIS', 2),
    makeCard('NAXIS1', width),
    makeCard('NAXIS2', height),
    makeCard('EXTEND', 'T'),
    makeCard('BUNIT', 'MJy/sr'),
    makeCard('OBJECT', testObj.name),
    makeCard('CRVAL1', Number(ra.toFixed(6))),
    makeCard('CRVAL2', Number(dec.toFixed(6))),
    makeCard('CRPIX1', (width / 2) + 1.0),
    makeCard('CRPIX2', (height / 2) + 1.0),
    makeCard('PC1_1', -0.0017083),
    makeCard('PC1_2', 0.0),
    makeCard('PC2_1', 0.0),
    makeCard('PC2_2', 0.0017083),
    makeCard('CDELT1', 1.0),
    makeCard('CDELT2', 1.0),
    makeCard('CTYPE1', 'RA---TAN'),
    makeCard('CTYPE2', 'DEC--TAN'),
    makeCard('EQUINOX', 2000.0),
    makeCard('RADESYS', 'ICRS'),
  ];

  let headerText = primaryCards.join('');
  headerText += 'END'.padEnd(80, ' ');
  const padLen = 2880 - (headerText.length % 2880);
  if (padLen < 2880) headerText += ' '.repeat(padLen);
  const headerBuf = Buffer.from(headerText, 'ascii');

  // Generate science image data with background noise
  const dataBuf = Buffer.alloc(numPixels * 4);
  const baseFlux = 8.0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      // Deterministic pseudo-random background noise based on coordinates
      const noise = ((Math.sin(x * 12.9898 + y * 78.233 + (isEpoch2 ? 45.1 : 12.3)) * 43758.5453) % 1) * 0.4;
      dataBuf.writeFloatBE(baseFlux + noise, idx * 4);
    }
  }

  // Inject target source profile based on target astrophysics
  let cx = Math.floor(width / 2);
  let cy = Math.floor(height / 2);
  let peakFlux = 20.0;

  if (testObj.id === 'barnards-star') {
    // Fast proper motion: shifts by 4 pixels (~24.6") between epochs
    if (isEpoch2) {
      cx += 3;
      cy += 1;
    } else {
      cx -= 2;
      cy -= 1;
    }
    peakFlux = 28.0;
  } else if (testObj.id === 'wise-0855') {
    // Cold brown dwarf with proper motion
    if (isEpoch2) {
      cx += 2;
      cy += 2;
    } else {
      cx -= 2;
      cy -= 1;
    }
    peakFlux = 18.0;
  } else if (testObj.id === 'rw-aurigae') {
    // T Tauri variable star (flux changes between epochs at same position)
    peakFlux = isEpoch2 ? 32.0 : 14.0;
  } else if (testObj.id === 'r-draconis') {
    // Mira pulsating variable (large amplitude flux change)
    peakFlux = isEpoch2 ? 45.0 : 10.0;
  } else if (testObj.id === 'epsilon-indi-b') {
    // Brown dwarf binary
    peakFlux = isEpoch2 ? 26.0 : 16.0;
  }

  // Stamp Gaussian PSF
  const psfSigma = 1.35;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const distSq = dx * dx + dy * dy;
        const psf = Math.exp(-distSq / (2 * psfSigma * psfSigma));
        const idx = py * width + px;
        const curVal = dataBuf.readFloatBE(idx * 4);
        dataBuf.writeFloatBE(curVal + peakFlux * psf, idx * 4);
      }
    }
  }

  const dataPad = 2880 - (dataBuf.length % 2880);
  const paddedData = dataPad < 2880 ? Buffer.concat([dataBuf, Buffer.alloc(dataPad)]) : dataBuf;

  return Buffer.concat([headerBuf, paddedData]);
}

