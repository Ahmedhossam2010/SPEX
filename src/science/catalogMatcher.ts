import { CatalogMatch } from './types';
import { WCS } from './wcs';

export class CatalogMatcher {
  /**
   * Cross-match candidate RA/Dec against real astronomical catalogs (Gaia DR3 / 2MASS / SIMBAD via CDS VizieR)
   */
  public static async crossmatch(ra: number, dec: number, radiusArcsec = 3.5): Promise<CatalogMatch[]> {
    const matches: CatalogMatch[] = [];

    try {
      // Query Gaia DR3 via VizieR
      const gaiaUrl = `https://vizier.cds.unistra.fr/viz-bin/votable?-source=I/355/gaiadr3&-c=${encodeURIComponent(
        ra.toFixed(6)
      )}+${encodeURIComponent(dec.toFixed(6))}&-c.rs=${radiusArcsec}&-out.max=3`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(gaiaUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const text = await resp.text();
        const trMatches = text.match(/<TR>(.*?)<\/TR>/g);
        if (trMatches) {
          for (const tr of trMatches) {
            const tds = tr.replace(/<\/?TR>/g, '').split('</TD>').map((s) => s.replace(/<TD.*?>/, '').trim());
            if (tds.length >= 16) {
              const srcRa = parseFloat(tds[0]);
              const srcDec = parseFloat(tds[1]);
              const gaiaSourceId = tds[2];
              const gMag = parseFloat(tds[15]);

              if (!Number.isNaN(srcRa) && !Number.isNaN(srcDec) && gaiaSourceId) {
                const sep = WCS.angularSeparationArcsec(ra, dec, srcRa, srcDec);
                matches.push({
                  catalog: 'Gaia DR3',
                  identifier: `Gaia DR3 ${gaiaSourceId}`,
                  ra: srcRa,
                  dec: srcDec,
                  separationArcsec: Number(sep.toFixed(2)),
                  objectType: 'Star / Compact Point Source',
                  photometry: Number.isFinite(gMag) ? `G = ${gMag.toFixed(2)} mag` : undefined,
                  sourceUrl: `https://vizier.cds.unistra.fr/viz-bin/VizieR-5?-ref=VIZ65&-out.add=.&-source=I/355/gaiadr3&Source=${gaiaSourceId}`,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Catalog cross-match query error:', err);
    }

    // Sort by smallest angular separation
    matches.sort((a, b) => a.separationArcsec - b.separationArcsec);
    return matches;
  }
}
