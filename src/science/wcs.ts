import { WCSParams } from './types';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export class WCS {
  /**
   * Convert 0-based pixel coordinate (x, y) to Right Ascension and Declination (ICRS degrees)
   * Using standard TAN (gnomonic) projection with CD matrix
   */
  public static pixToSky(x: number, y: number, wcs: WCSParams): { ra: number; dec: number } {
    // FITS pixel coordinates are 1-based in standard WCS conventions
    const p1 = (x + 1) - wcs.crpix1;
    const p2 = (y + 1) - wcs.crpix2;

    // Apply CD matrix (or CDELT if CD is diagonal)
    // xi, eta in degrees
    const xiDeg = wcs.cd1_1 * p1 + wcs.cd1_2 * p2;
    const etaDeg = wcs.cd2_1 * p1 + wcs.cd2_2 * p2;

    const xi = xiDeg * DEG2RAD;
    const eta = etaDeg * DEG2RAD;

    const crval1Rad = wcs.crval1 * DEG2RAD;
    const crval2Rad = wcs.crval2 * DEG2RAD;

    const cosDec0 = Math.cos(crval2Rad);
    const sinDec0 = Math.sin(crval2Rad);

    const denom = cosDec0 - eta * sinDec0;
    const raRad = crval1Rad + Math.atan2(xi, denom);
    const decRad = Math.atan2((sinDec0 + eta * cosDec0) * Math.cos(raRad - crval1Rad), denom);

    let ra = raRad * RAD2DEG;
    let dec = decRad * RAD2DEG;

    // Normalize RA to [0, 360)
    ra = (ra % 360 + 360) % 360;

    return { ra, dec };
  }

  /**
   * Convert Right Ascension and Declination (degrees) to 0-based pixel coordinates (x, y)
   */
  public static skyToPix(ra: number, dec: number, wcs: WCSParams): { x: number; y: number } {
    const alpha = ra * DEG2RAD;
    const delta = dec * DEG2RAD;
    const alpha0 = wcs.crval1 * DEG2RAD;
    const delta0 = wcs.crval2 * DEG2RAD;

    const deltaAlpha = alpha - alpha0;
    const cosDelta = Math.cos(delta);
    const sinDelta = Math.sin(delta);
    const cosDelta0 = Math.cos(delta0);
    const sinDelta0 = Math.sin(delta0);
    const cosDeltaAlpha = Math.cos(deltaAlpha);
    const sinDeltaAlpha = Math.sin(deltaAlpha);

    const cosC = sinDelta0 * sinDelta + cosDelta0 * cosDelta * cosDeltaAlpha;
    if (cosC <= 0) {
      // Point is beyond the celestial horizon for this projection
      return { x: -9999, y: -9999 };
    }

    const xiRad = (cosDelta * sinDeltaAlpha) / cosC;
    const etaRad = (cosDelta0 * sinDelta - sinDelta0 * cosDelta * cosDeltaAlpha) / cosC;

    const xiDeg = xiRad * RAD2DEG;
    const etaDeg = etaRad * RAD2DEG;

    // Invert CD matrix: [p1, p2] = CD^-1 * [xi, eta]
    const det = wcs.cd1_1 * wcs.cd2_2 - wcs.cd1_2 * wcs.cd2_1;
    if (Math.abs(det) < 1e-15) {
      return { x: wcs.crpix1 - 1, y: wcs.crpix2 - 1 };
    }

    const p1 = (wcs.cd2_2 * xiDeg - wcs.cd1_2 * etaDeg) / det;
    const p2 = (-wcs.cd2_1 * xiDeg + wcs.cd1_1 * etaDeg) / det;

    const x = p1 + wcs.crpix1 - 1;
    const y = p2 + wcs.crpix2 - 1;

    return { x, y };
  }

  /**
   * Calculate celestial great-circle separation in arcseconds between two (ra, dec) positions
   */
  public static angularSeparationArcsec(ra1: number, dec1: number, ra2: number, dec2: number): number {
    const phi1 = dec1 * DEG2RAD;
    const phi2 = dec2 * DEG2RAD;
    const deltaPhi = (dec2 - dec1) * DEG2RAD;
    const deltaLambda = (ra2 - ra1) * DEG2RAD;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return c * RAD2DEG * 3600;
  }
}
