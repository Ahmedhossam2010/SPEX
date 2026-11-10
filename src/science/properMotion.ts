/**
 * Proper-motion propagation for challenge targets.
 *
 * Convention (Gaia DR3 / SIMBAD):
 * - pmRaMasYr is mu_alpha* in mas/yr, i.e. the RA proper motion ALREADY
 *   multiplied by cos(dec). RA is therefore advanced by pmRa*t directly and
 *   must NOT be divided by cos(dec) again.
 * - pmDecMasYr is mu_delta in mas/yr.
 * - Coordinate epochs are Julian years (J2000.0 = 2000.0).
 *
 * NOTE: CatalogMatcher.propagateProperMotion divides by cos(dec) and is only
 * correct if its pmRa inputs are raw mu_alpha. All values stored on
 * ChallengeTarget / CuratedCase follow THIS module's mu_alpha* convention.
 *
 * Positions are propagated linearly (parallax-free). For the targets used here
 * (|pm| up to ~10.4"/yr over <= 26 yr) the linear model is accurate to well
 * under an arcsecond, far below the SPHEREx 6.2"/pixel scale.
 */

export interface PropagatedPosition {
  ra: number
  dec: number
  /** toEpochYear - fromEpochYear */
  deltaYears: number
  /** Great-circle separation between original and propagated position, arcsec */
  separationArcsec: number
}

/** Converts an MJD to a Julian year (J2000.0 = MJD 51544.5 = year 2000.0). */
export function julianYearFromMjd(mjd: number): number {
  return 2000 + (mjd - 51544.5) / 365.25
}

/**
 * Propagates a position from one Julian epoch to another using a linear
 * proper-motion vector. RA wraps into [0, 360).
 */
export function propagatePosition(
  raDeg: number,
  decDeg: number,
  pmRaMasYr: number,
  pmDecMasYr: number,
  fromEpochYear: number,
  toEpochYear: number
): PropagatedPosition {
  const deltaYears = toEpochYear - fromEpochYear
  if (!Number.isFinite(deltaYears) || deltaYears === 0 ||
      (pmRaMasYr === 0 && pmDecMasYr === 0)) {
    return { ra: raDeg, dec: decDeg, deltaYears: 0, separationArcsec: 0 };
  }

  // pmRaMasYr is mu_alpha* (already includes cos(dec)) -> advance RA directly.
  const deltaRaDeg = (pmRaMasYr * deltaYears) / 3.6e6;
  const deltaDecDeg = (pmDecMasYr * deltaYears) / 3.6e6;

  let ra = raDeg + deltaRaDeg;
  // Wrap RA into [0, 360)
  ra = ((ra % 360) + 360) % 360;
  const dec = Math.min(90, Math.max(-90, decDeg + deltaDecDeg));

  // Great-circle separation (arcsec) between original and propagated position
  const ra1 = raDeg * (Math.PI / 180);
  const dec1 = decDeg * (Math.PI / 180);
  const ra2 = ra * (Math.PI / 180);
  const dec2 = dec * (Math.PI / 180);
  const h = Math.sin((dec2 - dec1) / 2) ** 2 +
    Math.cos(dec1) * Math.cos(dec2) * Math.sin((ra2 - ra1) / 2) ** 2;
  const separationRad = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  const separationArcsec = (separationRad * 180 / Math.PI) * 3600;

  return {
    ra: Number(ra.toFixed(8)),
    dec: Number(dec.toFixed(8)),
    deltaYears: Number(deltaYears.toFixed(4)),
    separationArcsec: Number(separationArcsec.toFixed(3)),
  };
}

/** Convenience: propagate from J2000 (epoch 2000.0) to an MJD-derived epoch. */
export function propagateFromJ2000ToMjd(
  raDeg: number,
  decDeg: number,
  pmRaMasYr: number,
  pmDecMasYr: number,
  mjd: number
): PropagatedPosition {
  return propagatePosition(raDeg, decDeg, pmRaMasYr, pmDecMasYr, 2000.0, julianYearFromMjd(mjd));
}
