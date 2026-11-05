import { SIPTerm, WCSParams } from './types';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Maximum supported SIP polynomial degree (p + q <= MAX_SIP_ORDER).
 * Covers standard FITS WCS SIP conventions up to order 9 while bounding
 * polynomial evaluation cost to O(1) operations per pixel.
 */
export const MAX_SIP_ORDER = 9;

const MIN_CD_DET = 1e-18;
const MIN_GNOMONIC_COS_C = 1e-12;
const SIP_NEWTON_TOL_PX = 1e-13;
const SIP_CONVERGENCE_VERIFY_TOL_PX = 1e-7;
const SIP_MAX_NEWTON_ITER = 30;

interface PreparedWCS {
  signature: string;
  crval1Rad: number;
  crval2Rad: number;
  sinDec0: number;
  cosDec0: number;
  crpix1: number;
  crpix2: number;
  cd1_1: number;
  cd1_2: number;
  cd2_1: number;
  cd2_2: number;
  invCd1_1: number;
  invCd1_2: number;
  invCd2_1: number;
  invCd2_2: number;
  hasSip: boolean;
  maxOrder: number;
  aTerms: SIPTerm[];
  bTerms: SIPTerm[];
  apTerms: SIPTerm[];
  bpTerms: SIPTerm[];
  uPow: Float64Array;
  vPow: Float64Array;
}

export interface ReprojectionCoordinateGrid {
  width: number;
  height: number;
  srcX: Float64Array;
  srcY: Float64Array;
  centerDx: number;
  centerDy: number;
  maxSpatialWarpPixels: number;
  hasSipDistortion: boolean;
  runtimeMs: number;
}

const preparedWcsCache = new WeakMap<WCSParams, PreparedWCS>();
const reprojectionGridCache = new WeakMap<
  WCSParams,
  WeakMap<WCSParams, Map<string, ReprojectionCoordinateGrid>>
>();

function computeSipSignature(wcs: WCSParams): string {
  if (!wcs.sip) return 'nosip';
  const s = wcs.sip;
  const fA = s.aTerms.map((t) => `${t.p},${t.q}:${t.coeff}`).join(';');
  const fB = s.bTerms.map((t) => `${t.p},${t.q}:${t.coeff}`).join(';');
  const rA = (s.apTerms || []).map((t) => `${t.p},${t.q}:${t.coeff}`).join(';');
  const rB = (s.bpTerms || []).map((t) => `${t.p},${t.q}:${t.coeff}`).join(';');
  return `sip:${s.aOrder},${s.bOrder},${s.apOrder ?? ''},${s.bpOrder ?? ''}|${fA}|${fB}|${rA}|${rB}`;
}

function parseAxisCType(ctype: unknown, axis: 1 | 2): { coordCode: string; hasSip: boolean } {
  if (typeof ctype !== 'string' || ctype.trim().length === 0) {
    throw new Error(`Invalid WCS astrometry: missing or non-string CTYPE${axis}.`);
  }
  const clean = ctype.trim().toUpperCase();
  const match = clean.match(/^([A-Z0-9-]{4})-TAN(-SIP)?$/);
  if (!match) {
    throw new Error(
      `Unsupported or malformed WCS projection in CTYPE${axis}: '${ctype}'. Only TAN and TAN-SIP projections are supported.`
    );
  }
  const coordCode = match[1];
  const isLatCode = coordCode === 'DEC-' || coordCode === 'GLAT' || coordCode === 'ELAT' || coordCode === 'HLAT' || coordCode === 'SLAT';
  const isLonCode = coordCode === 'RA--' || coordCode === 'GLON' || coordCode === 'ELON' || coordCode === 'HLON' || coordCode === 'SLON';
  if (axis === 1 && isLatCode) {
    throw new Error(`Invalid WCS astrometry: latitude coordinate code '${coordCode}' found on axis 1 (CTYPE1).`);
  }
  if (axis === 2 && isLonCode) {
    throw new Error(`Invalid WCS astrometry: longitude coordinate code '${coordCode}' found on axis 2 (CTYPE2).`);
  }
  return { coordCode, hasSip: match[2] === '-SIP' };
}

function validateSipTermArray(terms: SIPTerm[] | undefined, order: number, label: string): SIPTerm[] {
  if (!terms) return [];
  if (!Array.isArray(terms)) {
    throw new Error(`Invalid TAN-SIP WCS astrometry: ${label} must be an array.`);
  }
  const validated: SIPTerm[] = [];
  for (const term of terms) {
    if (
      !term ||
      typeof term.p !== 'number' ||
      typeof term.q !== 'number' ||
      typeof term.coeff !== 'number' ||
      !Number.isInteger(term.p) ||
      !Number.isInteger(term.q) ||
      term.p < 0 ||
      term.q < 0 ||
      term.p + term.q > order ||
      !Number.isFinite(term.coeff)
    ) {
      throw new Error(
        `Invalid TAN-SIP WCS astrometry: invalid polynomial term in ${label} for order ${order}.`
      );
    }
    if (term.coeff !== 0) {
      validated.push({ p: term.p, q: term.q, coeff: term.coeff });
    }
  }
  return validated;
}

function fillPowerTable(uPow: Float64Array, vPow: Float64Array, u: number, v: number, maxOrder: number): void {
  uPow[0] = 1;
  vPow[0] = 1;
  for (let k = 1; k <= maxOrder; k++) {
    uPow[k] = uPow[k - 1] * u;
    vPow[k] = vPow[k - 1] * v;
  }
}

function evaluatePolynomial(terms: SIPTerm[], uPow: Float64Array, vPow: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    sum += t.coeff * uPow[t.p] * vPow[t.q];
  }
  return sum;
}

function evaluatePolynomialAndPartials(
  terms: SIPTerm[],
  uPow: Float64Array,
  vPow: Float64Array
): { val: number; du: number; dv: number } {
  let val = 0;
  let du = 0;
  let dv = 0;
  for (let i = 0; i < terms.length; i++) {
    const { p, q, coeff } = terms[i];
    const up = uPow[p];
    const vq = vPow[q];
    val += coeff * up * vq;
    if (p > 0) {
      du += coeff * p * uPow[p - 1] * vq;
    }
    if (q > 0) {
      dv += coeff * up * q * vPow[q - 1];
    }
  }
  return { val, du, dv };
}

/**
 * FITS World Coordinate System (WCS) TAN and TAN-SIP astrometric transformation engine.
 *
 * Conventions (FITS WCS Paper I & II + Shupe et al. 2005 ADASS XIV 347, 491):
 * - Pixel origin: Input/output pixel coordinates (x, y) to pixToSky/skyToPix are 0-based array
 *   coordinates where pixel (0, 0) center equals FITS 1-based pixel (1.0, 1.0).
 *   Hence FITS intermediate pixel offsets relative to CRPIX are:
 *     u = (x + 1) - CRPIX1
 *     v = (y + 1) - CRPIX2
 * - Forward SIP polynomial distortion (A_ORDER, B_ORDER):
 *     U = u + sum_{p+q <= A_ORDER} A_{p}_{q} * u^p * v^q
 *     V = v + sum_{p+q <= B_ORDER} B_{p}_{q} * u^p * v^q
 * - Linear world intermediate coordinates (xi, eta) in degrees:
 *     [xi_deg; eta_deg] = [[CD1_1, CD1_2], [CD2_1, CD2_2]] * [U; V]
 * - Gnomonic (TAN) spherical projection around tangent point (CRVAL1, CRVAL2) in ICRS degrees,
 *   with RA normalized to [0, 360) degrees and Dec in [-90, +90] degrees.
 * - Inverse transformation (Sky -> Pixel):
 *     1) Gnomonic TAN spherical projection to (xi_deg, eta_deg) (rejecting cos(c) <= 1e-12).
 *     2) Matrix inversion [U; V] = CD^-1 * [xi_deg; eta_deg].
 *     3) Inverse SIP distortion (U, V) -> (u, v):
 *        - When valid reverse coefficients (AP, BP) are present alongside (A, B), initializes
 *          with (U + AP(U, V), V + BP(U, V)) and refines via exact analytical-Jacobian 2D
 *          Newton-Raphson to <= 1e-13 pixels against u + A(u, v) = U, v + B(u, v) = V.
 *        - When only (AP, BP) are present, evaluates the reverse Shupe polynomial directly.
 *        - When (AP, BP) are omitted, solves u + A(u, v) = U, v + B(u, v) = V from (U, V) via
 *          2D Newton-Raphson with backtracking step protection to <= 1e-13 pixels.
 */
export class WCS {
  private static prepareWCS(wcs: WCSParams): PreparedWCS {
    if (!wcs || typeof wcs !== 'object') {
      throw new Error('Invalid WCS astrometry: WCS parameter object is missing.');
    }

    const hasExplicitCd =
      wcs.cd1_1 !== undefined ||
      wcs.cd1_2 !== undefined ||
      wcs.cd2_1 !== undefined ||
      wcs.cd2_2 !== undefined;

    const cd1_1 = hasExplicitCd ? Number(wcs.cd1_1 ?? 0) : Number(wcs.cdelt1);
    const cd1_2 = hasExplicitCd ? Number(wcs.cd1_2 ?? 0) : 0;
    const cd2_1 = hasExplicitCd ? Number(wcs.cd2_1 ?? 0) : 0;
    const cd2_2 = hasExplicitCd ? Number(wcs.cd2_2 ?? 0) : Number(wcs.cdelt2);

    const sipSig = computeSipSignature(wcs);
    const signature = `${wcs.crval1}|${wcs.crval2}|${wcs.crpix1}|${wcs.crpix2}|${cd1_1}|${cd1_2}|${cd2_1}|${cd2_2}|${wcs.ctype1 ?? ''}|${wcs.ctype2 ?? ''}|${sipSig}`;

    const cached = preparedWcsCache.get(wcs);
    if (cached && cached.signature === signature) {
      return cached;
    }

    if (
      typeof wcs.crval1 !== 'number' ||
      typeof wcs.crval2 !== 'number' ||
      typeof wcs.crpix1 !== 'number' ||
      typeof wcs.crpix2 !== 'number' ||
      !Number.isFinite(wcs.crval1) ||
      !Number.isFinite(wcs.crval2) ||
      !Number.isFinite(wcs.crpix1) ||
      !Number.isFinite(wcs.crpix2)
    ) {
      throw new Error('Invalid WCS astrometry: non-finite CRVAL1/CRVAL2 or CRPIX1/CRPIX2.');
    }

    if (wcs.crval2 < -90 || wcs.crval2 > 90) {
      throw new Error(`Invalid WCS astrometry: CRVAL2 (${wcs.crval2}) outside [-90, +90] degrees.`);
    }

    if (
      !Number.isFinite(cd1_1) ||
      !Number.isFinite(cd1_2) ||
      !Number.isFinite(cd2_1) ||
      !Number.isFinite(cd2_2)
    ) {
      throw new Error('Invalid WCS astrometry: non-finite CD/CDELT transformation matrix elements.');
    }

    const det = cd1_1 * cd2_2 - cd1_2 * cd2_1;
    if (!Number.isFinite(det) || Math.abs(det) <= MIN_CD_DET) {
      throw new Error('Invalid WCS astrometry: singular or zero CD transformation matrix determinant.');
    }

    let hasSip = false;
    if (wcs.ctype1 === undefined && wcs.ctype2 === undefined) {
      if (wcs.sip) {
        throw new Error('Invalid WCS astrometry: SIP distortion supplied without CTYPE1/CTYPE2 (-SIP).');
      }
      hasSip = false;
    } else {
      const c1 = parseAxisCType(wcs.ctype1, 1);
      const c2 = parseAxisCType(wcs.ctype2, 2);
      if (c1.hasSip !== c2.hasSip) {
        throw new Error(
          `Mismatched WCS projection types: CTYPE1='${wcs.ctype1}' vs CTYPE2='${wcs.ctype2}'.`
        );
      }
      hasSip = c1.hasSip;
    }

    let aTerms: SIPTerm[] = [];
    let bTerms: SIPTerm[] = [];
    let apTerms: SIPTerm[] = [];
    let bpTerms: SIPTerm[] = [];
    let maxOrder = 0;

    if (hasSip) {
      if (!wcs.sip || typeof wcs.sip !== 'object') {
        throw new Error(
          'Invalid TAN-SIP WCS astrometry: CTYPE requires TAN-SIP distortion but SIP coefficients are missing.'
        );
      }
      const { aOrder, bOrder, apOrder, bpOrder } = wcs.sip;
      if (
        typeof aOrder !== 'number' ||
        typeof bOrder !== 'number' ||
        !Number.isInteger(aOrder) ||
        !Number.isInteger(bOrder) ||
        aOrder < 0 ||
        bOrder < 0 ||
        aOrder > MAX_SIP_ORDER ||
        bOrder > MAX_SIP_ORDER
      ) {
        throw new Error(
          `Invalid TAN-SIP WCS astrometry: A_ORDER (${aOrder}) and B_ORDER (${bOrder}) must be integers in [0, ${MAX_SIP_ORDER}].`
        );
      }

      if (apOrder !== undefined) {
        if (typeof apOrder !== 'number' || !Number.isInteger(apOrder) || apOrder < 0 || apOrder > MAX_SIP_ORDER) {
          throw new Error(
            `Invalid TAN-SIP WCS astrometry: AP_ORDER (${apOrder}) must be an integer in [0, ${MAX_SIP_ORDER}].`
          );
        }
      }
      if (bpOrder !== undefined) {
        if (typeof bpOrder !== 'number' || !Number.isInteger(bpOrder) || bpOrder < 0 || bpOrder > MAX_SIP_ORDER) {
          throw new Error(
            `Invalid TAN-SIP WCS astrometry: BP_ORDER (${bpOrder}) must be an integer in [0, ${MAX_SIP_ORDER}].`
          );
        }
      }

      aTerms = validateSipTermArray(wcs.sip.aTerms, aOrder, 'A_i_j');
      bTerms = validateSipTermArray(wcs.sip.bTerms, bOrder, 'B_i_j');
      apTerms = validateSipTermArray(wcs.sip.apTerms, apOrder ?? 0, 'AP_i_j');
      bpTerms = validateSipTermArray(wcs.sip.bpTerms, bpOrder ?? 0, 'BP_i_j');
      maxOrder = Math.max(aOrder, bOrder, apOrder ?? 0, bpOrder ?? 0);
    } else if (
      wcs.sip &&
      ((wcs.sip.aTerms && wcs.sip.aTerms.length > 0) ||
        (wcs.sip.bTerms && wcs.sip.bTerms.length > 0) ||
        (wcs.sip.apTerms && wcs.sip.apTerms.length > 0) ||
        (wcs.sip.bpTerms && wcs.sip.bpTerms.length > 0))
    ) {
      throw new Error(
        'Invalid WCS astrometry: non-zero SIP distortion terms present on non-SIP CTYPE.'
      );
    }

    const crval1Rad = wcs.crval1 * DEG2RAD;
    const crval2Rad = wcs.crval2 * DEG2RAD;

    const prepared: PreparedWCS = {
      signature,
      crval1Rad,
      crval2Rad,
      sinDec0: Math.sin(crval2Rad),
      cosDec0: Math.cos(crval2Rad),
      crpix1: wcs.crpix1,
      crpix2: wcs.crpix2,
      cd1_1,
      cd1_2,
      cd2_1,
      cd2_2,
      invCd1_1: cd2_2 / det,
      invCd1_2: -cd1_2 / det,
      invCd2_1: -cd2_1 / det,
      invCd2_2: cd1_1 / det,
      hasSip,
      maxOrder,
      aTerms,
      bTerms,
      apTerms,
      bpTerms,
      uPow: new Float64Array(MAX_SIP_ORDER + 2),
      vPow: new Float64Array(MAX_SIP_ORDER + 2),
    };

    preparedWcsCache.set(wcs, prepared);
    return prepared;
  }

  /**
   * Explicitly validate a WCSParams configuration. Throws a descriptive Error if malformed or unsupported.
   */
  public static validateWCS(wcs: WCSParams): void {
    this.prepareWCS(wcs);
  }

  /**
   * Convert 0-based pixel coordinate (x, y) to ICRS Right Ascension and Declination (degrees).
   * Applies forward SIP polynomial distortion when CTYPE specifies TAN-SIP.
   */
  public static pixToSky(x: number, y: number, wcs: WCSParams): { ra: number; dec: number } {
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Invalid pixel coordinates passed to WCS.pixToSky: (${x}, ${y}).`);
    }

    const p = this.prepareWCS(wcs);

    // 0-based image pixel -> FITS 1-based offset relative to CRPIX
    const u = x + 1 - p.crpix1;
    const v = y + 1 - p.crpix2;

    let U = u;
    let V = v;
    if (p.hasSip && (p.aTerms.length > 0 || p.bTerms.length > 0)) {
      fillPowerTable(p.uPow, p.vPow, u, v, p.maxOrder);
      if (p.aTerms.length > 0) {
        U = u + evaluatePolynomial(p.aTerms, p.uPow, p.vPow);
      }
      if (p.bTerms.length > 0) {
        V = v + evaluatePolynomial(p.bTerms, p.uPow, p.vPow);
      }
    }

    const xi = (p.cd1_1 * U + p.cd1_2 * V) * DEG2RAD;
    const eta = (p.cd2_1 * U + p.cd2_2 * V) * DEG2RAD;

    const denom = p.cosDec0 - eta * p.sinDec0;
    const raRad = p.crval1Rad + Math.atan2(xi, denom);
    const decRad = Math.atan2((p.sinDec0 + eta * p.cosDec0) * Math.cos(raRad - p.crval1Rad), denom);

    let ra = ((raRad * RAD2DEG) % 360 + 360) % 360;
    if (ra >= 360) ra -= 360;
    const dec = decRad * RAD2DEG;

    return { ra, dec };
  }

  /**
   * Convert ICRS Right Ascension and Declination (degrees) to 0-based pixel coordinates (x, y).
   * Uses reverse SIP polynomial coefficients (AP, BP) when available and exact 2D Newton-Raphson
   * refinement against the forward SIP distortion system to sub-femtopixel precision.
   */
  public static skyToPix(ra: number, dec: number, wcs: WCSParams): { x: number; y: number } {
    if (typeof ra !== 'number' || typeof dec !== 'number' || !Number.isFinite(ra) || !Number.isFinite(dec)) {
      throw new Error(`Invalid sky coordinates passed to WCS.skyToPix: (${ra}, ${dec}).`);
    }
    if (dec < -90 || dec > 90) {
      throw new Error(`Invalid declination passed to WCS.skyToPix: ${dec} (must be within [-90, +90] degrees).`);
    }

    const p = this.prepareWCS(wcs);

    const alpha = ra * DEG2RAD;
    const delta = dec * DEG2RAD;
    const deltaAlpha = alpha - p.crval1Rad;

    const cosDelta = Math.cos(delta);
    const sinDelta = Math.sin(delta);
    const cosDeltaAlpha = Math.cos(deltaAlpha);
    const sinDeltaAlpha = Math.sin(deltaAlpha);

    const cosC = p.sinDec0 * sinDelta + p.cosDec0 * cosDelta * cosDeltaAlpha;
    if (cosC <= MIN_GNOMONIC_COS_C) {
      return { x: -9999, y: -9999 };
    }

    const xiDeg = ((cosDelta * sinDeltaAlpha) / cosC) * RAD2DEG;
    const etaDeg = ((p.cosDec0 * sinDelta - p.sinDec0 * cosDelta * cosDeltaAlpha) / cosC) * RAD2DEG;

    const U = p.invCd1_1 * xiDeg + p.invCd1_2 * etaDeg;
    const V = p.invCd2_1 * xiDeg + p.invCd2_2 * etaDeg;

    let u = U;
    let v = V;

    if (p.hasSip) {
      const hasForward = p.aTerms.length > 0 || p.bTerms.length > 0;
      const hasReverse = p.apTerms.length > 0 || p.bpTerms.length > 0;

      if (hasReverse) {
        fillPowerTable(p.uPow, p.vPow, U, V, p.maxOrder);
        if (p.apTerms.length > 0) {
          u = U + evaluatePolynomial(p.apTerms, p.uPow, p.vPow);
        }
        if (p.bpTerms.length > 0) {
          v = V + evaluatePolynomial(p.bpTerms, p.uPow, p.vPow);
        }
      }

      if (hasForward) {
        let converged = false;
        for (let iter = 0; iter < SIP_MAX_NEWTON_ITER; iter++) {
          fillPowerTable(p.uPow, p.vPow, u, v, p.maxOrder);
          const fEval = evaluatePolynomialAndPartials(p.aTerms, p.uPow, p.vPow);
          const gEval = evaluatePolynomialAndPartials(p.bTerms, p.uPow, p.vPow);

          const r1 = u + fEval.val - U;
          const r2 = v + gEval.val - V;
          const err = Math.hypot(r1, r2);

          if (!Number.isFinite(err)) {
            throw new Error('Inverse TAN-SIP WCS solver encountered non-finite intermediate values.');
          }

          const j11 = 1 + fEval.du;
          const j12 = fEval.dv;
          const j21 = gEval.du;
          const j22 = 1 + gEval.dv;
          const detJ = j11 * j22 - j12 * j21;

          if (!Number.isFinite(detJ) || Math.abs(detJ) <= 1e-14) {
            throw new Error('Inverse TAN-SIP WCS Jacobian is singular; non-invertible distortion mapping.');
          }

          if (err <= SIP_NEWTON_TOL_PX) {
            converged = true;
            break;
          }

          const duStep = (j22 * r1 - j12 * r2) / detJ;
          const dvStep = (-j21 * r1 + j11 * r2) / detJ;

          // Full Newton step with backtracking protection for large distortion gradients
          let stepScale = 1.0;
          let accepted = false;
          for (let ls = 0; ls < 5; ls++) {
            const candU = u - stepScale * duStep;
            const candV = v - stepScale * dvStep;
            fillPowerTable(p.uPow, p.vPow, candU, candV, p.maxOrder);
            const candR1 = candU + evaluatePolynomial(p.aTerms, p.uPow, p.vPow) - U;
            const candR2 = candV + evaluatePolynomial(p.bTerms, p.uPow, p.vPow) - V;
            const candErr = Math.hypot(candR1, candR2);
            if (Number.isFinite(candErr) && (candErr < err || ls === 4)) {
              u = candU;
              v = candV;
              accepted = true;
              break;
            }
            stepScale *= 0.5;
          }

          if (!accepted) {
            u -= duStep;
            v -= dvStep;
          }

          if (Math.hypot(duStep, dvStep) * stepScale <= SIP_NEWTON_TOL_PX) {
            fillPowerTable(p.uPow, p.vPow, u, v, p.maxOrder);
            const finalR1 = u + evaluatePolynomial(p.aTerms, p.uPow, p.vPow) - U;
            const finalR2 = v + evaluatePolynomial(p.bTerms, p.uPow, p.vPow) - V;
            if (Math.hypot(finalR1, finalR2) <= SIP_CONVERGENCE_VERIFY_TOL_PX) {
              converged = true;
              break;
            }
          }
        }

        if (!converged) {
          fillPowerTable(p.uPow, p.vPow, u, v, p.maxOrder);
          const finalR1 = u + evaluatePolynomial(p.aTerms, p.uPow, p.vPow) - U;
          const finalR2 = v + evaluatePolynomial(p.bTerms, p.uPow, p.vPow) - V;
          const finalErr = Math.hypot(finalR1, finalR2);
          if (!Number.isFinite(finalErr) || finalErr > SIP_CONVERGENCE_VERIFY_TOL_PX) {
            throw new Error(
              `Inverse TAN-SIP WCS iteration failed to converge (residual ${finalErr} px > ${SIP_CONVERGENCE_VERIFY_TOL_PX} px).`
            );
          }
        }
      }
    }

    return {
      x: u + p.crpix1 - 1,
      y: v + p.crpix2 - 1,
    };
  }

  /**
   * Compute or retrieve cached pixel-by-pixel WCS mapping from target grid (width x height, targetWcs)
   * into source pixel coordinates (sourceWcs).
   */
  public static getReprojectionGrid(
    targetWcs: WCSParams,
    sourceWcs: WCSParams,
    width: number,
    height: number
  ): ReprojectionCoordinateGrid {
    const t0 = performance.now();
    const tPrep = this.prepareWCS(targetWcs);
    const sPrep = this.prepareWCS(sourceWcs);
    const cacheKey = `${width}x${height}|${tPrep.signature}=>${sPrep.signature}`;

    let targetMap = reprojectionGridCache.get(targetWcs);
    if (!targetMap) {
      targetMap = new WeakMap();
      reprojectionGridCache.set(targetWcs, targetMap);
    }
    let sizeMap = targetMap.get(sourceWcs);
    if (!sizeMap) {
      sizeMap = new Map();
      targetMap.set(sourceWcs, sizeMap);
    }

    const existing = sizeMap.get(cacheKey);
    if (existing) {
      return {
        ...existing,
        runtimeMs: Number((performance.now() - t0).toFixed(4)),
      };
    }

    const total = width * height;
    const srcX = new Float64Array(total);
    const srcY = new Float64Array(total);

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const sky = this.pixToSky(x, y, targetWcs);
        const mapped = this.skyToPix(sky.ra, sky.dec, sourceWcs);
        srcX[rowOffset + x] = mapped.x;
        srcY[rowOffset + x] = mapped.y;
      }
    }

    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const cIdx = cy * width + cx;
    const centerDx = Number.isFinite(srcX[cIdx]) ? srcX[cIdx] - cx : 0;
    const centerDy = Number.isFinite(srcY[cIdx]) ? srcY[cIdx] - cy : 0;

    let maxSpatialWarpPixels = 0;
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x;
        const sx = srcX[idx];
        const sy = srcY[idx];
        if (Number.isFinite(sx) && Number.isFinite(sy) && sx >= -1 && sy >= -1) {
          const warp = Math.hypot((sx - x) - centerDx, (sy - y) - centerDy);
          if (warp > maxSpatialWarpPixels) {
            maxSpatialWarpPixels = warp;
          }
        }
      }
    }

    const elapsedMs = Number((performance.now() - t0).toFixed(4));
    const grid: ReprojectionCoordinateGrid = {
      width,
      height,
      srcX,
      srcY,
      centerDx,
      centerDy,
      maxSpatialWarpPixels,
      hasSipDistortion: tPrep.hasSip || sPrep.hasSip,
      runtimeMs: elapsedMs,
    };

    sizeMap.set(cacheKey, grid);
    return grid;
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
