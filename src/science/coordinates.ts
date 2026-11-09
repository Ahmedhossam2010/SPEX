/**
 * Celestial Coordinate Parsing and Sexagesimal Conversion Utilities.
 * Strictly adheres to IAU and FITS astrometry conventions.
 */

export interface ParsedCoordinates {
  ra: number; // Decimal degrees [0, 360)
  dec: number; // Decimal degrees [-90, +90]
  raSexagesimal: string; // e.g. "08h55m10.83s"
  decSexagesimal: string; // e.g. "-07d14m42.53s"
}

/**
 * Converts Right Ascension sexagesimal (hours, minutes, seconds) and
 * Declination sexagesimal (degrees, arcminutes, arcseconds) into decimal degrees.
 */
export function sexagesimalToDecimal(raStr: string, decStr: string): { ra: number; dec: number } {
  // Normalize RA: match hours, minutes, seconds (delimited by h/m/s, colons, or spaces)
  const raMatch = raStr.trim().match(/^([+]?\d+(?:\.\d+)?)\s*(?:h|:|\s)\s*(\d+(?:\.\d+)?)\s*(?:m|:|\s)\s*(\d+(?:\.\d+)?)\s*s?$/i);
  let raDeg = NaN;
  if (raMatch) {
    const h = parseFloat(raMatch[1]);
    const m = parseFloat(raMatch[2]);
    const s = parseFloat(raMatch[3]);
    if (Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(s)) {
      raDeg = (h + m / 60 + s / 3600) * 15;
    }
  } else {
    // Maybe plain decimal degrees
    const val = parseFloat(raStr.trim());
    if (Number.isFinite(val)) raDeg = val;
  }

  // Normalize Dec: handle signs carefully (including -00d...)
  const decTrim = decStr.trim();
  const isNegative = decTrim.startsWith('-');
  const unsignedDec = isNegative ? decTrim.slice(1).trim() : (decTrim.startsWith('+') ? decTrim.slice(1).trim() : decTrim);

  const decMatch = unsignedDec.match(/^(\d+(?:\.\d+)?)\s*(?:d|°|:|\s)\s*(\d+(?:\.\d+)?)\s*(?:m|'|:|\s)\s*(\d+(?:\.\d+)?)\s*(?:s|")?$/i);
  let decDeg = NaN;
  if (decMatch) {
    const d = parseFloat(decMatch[1]);
    const m = parseFloat(decMatch[2]);
    const s = parseFloat(decMatch[3]);
    if (Number.isFinite(d) && Number.isFinite(m) && Number.isFinite(s)) {
      const mag = d + m / 60 + s / 3600;
      decDeg = isNegative ? -mag : mag;
    }
  } else {
    const val = parseFloat(decTrim);
    if (Number.isFinite(val)) decDeg = val;
  }

  // Normalize RA into [0, 360)
  if (Number.isFinite(raDeg)) {
    raDeg = ((raDeg % 360) + 360) % 360;
    // Round to 5 decimal places (~0.36 arcsec precision)
    raDeg = Number(raDeg.toFixed(5));
  }

  if (Number.isFinite(decDeg)) {
    decDeg = Number(decDeg.toFixed(5));
  }

  return { ra: raDeg, dec: decDeg };
}

/**
 * Formats decimal degrees into standard astronomical sexagesimal notation.
 */
export function decimalToSexagesimal(raDeg: number, decDeg: number): { raStr: string; decStr: string } {
  const normRa = ((raDeg % 360) + 360) % 360;
  const totalHours = normRa / 15;
  const h = Math.floor(totalHours);
  const mRemainder = (totalHours - h) * 60;
  const m = Math.floor(mRemainder);
  const s = (mRemainder - m) * 60;

  const raStr = `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}m${s.toFixed(3).padStart(6, '0')}s`;

  const sign = decDeg < 0 ? '-' : '+';
  const absDec = Math.abs(decDeg);
  const d = Math.floor(absDec);
  const dmRemainder = (absDec - d) * 60;
  const dm = Math.floor(dmRemainder);
  const ds = (dmRemainder - dm) * 60;

  const decStr = `${sign}${String(d).padStart(2, '0')}d${String(dm).padStart(2, '0')}m${ds.toFixed(2).padStart(5, '0')}s`;

  return { raStr, decStr };
}

/**
 * Parses user input in either sexagesimal or decimal format.
 * Supports:
 * - "08h55m10.831s, -07d14m42.53s"
 * - "08:55:10.831 -07:14:42.53"
 * - "133.79513, -7.24515"
 * - "133.79513 -7.24515"
 */
export function parseCoordinateInput(input: string): ParsedCoordinates | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Try split by comma first
  let parts: string[] = [];
  if (trimmed.includes(',')) {
    parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    // Check if there's a sign separating RA and Dec (e.g. "17h57m48.50s +04d41m36.2s" or "133.79513 -7.24515")
    const signSplit = trimmed.match(/^(.+?)\s+([+-].+)$/);
    if (signSplit) {
      parts = [signSplit[1].trim(), signSplit[2].trim()];
    } else {
      // Split by whitespace
      parts = trimmed.split(/\s+/).filter(Boolean);
      if (parts.length === 6) {
        // e.g. "08 55 10.83 -07 14 42.5"
        parts = [
          `${parts[0]} ${parts[1]} ${parts[2]}`,
          `${parts[3]} ${parts[4]} ${parts[5]}`,
        ];
      }
    }
  }

  if (parts.length !== 2) return null;

  const { ra, dec } = sexagesimalToDecimal(parts[0], parts[1]);
  if (!Number.isFinite(ra) || !Number.isFinite(dec)) return null;
  if (dec < -90 || dec > 90) return null;

  const { raStr, decStr } = decimalToSexagesimal(ra, dec);

  return {
    ra,
    dec,
    raSexagesimal: raStr,
    decSexagesimal: decStr,
  };
}
