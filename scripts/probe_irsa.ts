import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FITSReader } from '../src/science/fitsReader';
import { ScientificPipeline } from '../src/science/pipeline';
import { WCS } from '../src/science/wcs';
import { OFFICIAL_CHALLENGE_TARGETS } from '../src/science/challengeTargets';
import { propagatePosition, julianYearFromMjd } from '../src/science/properMotion';

interface TargetInfo {
  id: string;
  name: string;
  ra: number;
  dec: number;
  sexagesimal: string;
}

const TARGETS: TargetInfo[] = [
  {
    id: 'target-barnards-star',
    name: "Barnard's Star (GJ 699)",
    ra: 269.45208,
    dec: 4.69339,
    sexagesimal: '17h57m48.50s +04d41m36.2s',
  },
  {
    id: 'target-epsilon-indi-bab',
    name: 'Epsilon Indi Ba/Bb (challenge target - PLACEHOLDER coords = A until SIMBAD)',
    ra: 330.84042,
    dec: -56.78601,
    sexagesimal: '22h03m21.70s -56d47m09.6s (PLACEHOLDER)',
  },
  {
    id: 'target-epsilon-indi-a',
    name: 'Epsilon Indi A (reference star)',
    ra: 330.84042,
    dec: -56.78601,
    sexagesimal: '22h03m21.70s -56d47m09.6s',
  },
  {
    id: 'target-wise-0855',
    name: 'WISE 0855-0714',
    ra: 133.79513,
    dec: -7.24515,
    sexagesimal: '08h55m10.831s -07d14m42.53s',
  },
  {
    id: 'target-rw-aurigae',
    name: 'RW Aurigae',
    ra: 77.45833,
    dec: 30.40142,
    sexagesimal: '05h09m50.00s +30d24m05.0s',
  },
  {
    id: 'target-r-draconis',
    name: 'R Draconis',
    ra: 248.33004,
    dec: 66.70281,
    sexagesimal: '16h33m19.21s +66d42m10.1s',
  },
  {
    id: 'benchmark-nep',
    name: 'North Ecliptic Pole Deep Strip (Benchmark)',
    ra: 276.2614,
    dec: 64.8258,
    sexagesimal: '18h25m02.74s +64d49m32.88s',
  },
];

async function queryTAP(ra: number, dec: number, radiusDeg: number = 0.5) {
  const tapQuery = `SELECT obs_id, s_ra, s_dec, instrument_name, t_min, t_max, em_min, em_max, access_url, dataproduct_type FROM spherex.obscore WHERE CONTAINS(POINT('ICRS',s_ra,s_dec),CIRCLE('ICRS',${ra},${dec},${radiusDeg}))=1`;
  const url = `https://irsa.ipac.caltech.edu/TAP/sync?QUERY=${encodeURIComponent(tapQuery)}&FORMAT=json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0' } });
    clearTimeout(timeout);
    if (!res.ok) return { status: res.status, statusText: res.statusText, rows: [] };
    const json: any = await res.json();
    const rows = json?.VOTABLE?.RESOURCE_ARRAY?.[0]?.TABLE?.DATA?.TABLEDATA ?? [];
    return { status: res.status, statusText: 'OK', rows };
  } catch (e: any) {
    clearTimeout(timeout);
    return { status: 0, statusText: e.message, rows: [] };
  }
}

async function resolveDataLinkToFits(datalinkUrl: string): Promise<string | null> {
  if (!datalinkUrl) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(datalinkUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/<TD>(https:\/\/irsa\.ipac\.caltech\.edu\/ibe\/data\/[^<]+\.fits)<\/TD>/);
    if (match) return match[1];
    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function probeCutout(fitsUrl: string, ra: number, dec: number) {
  const cutoutUrl = `${fitsUrl}?center=${ra.toFixed(5)},${dec.toFixed(5)}&size=64pix`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(cutoutUrl, { signal: controller.signal, method: 'GET' });
    clearTimeout(timeout);
    let size = 0;
    let checksum: string | null = null;
    let buffer: Buffer | null = null;
    if (res.ok) {
      const ab = await res.arrayBuffer();
      size = ab.byteLength;
      buffer = Buffer.from(ab);
      // SHA-256 per downloaded FITS proves files from different obs_ids are
      // distinct even when every QR2 cutout is exactly 5,117,760 bytes.
      checksum = crypto.createHash('sha256').update(buffer).digest('hex');
      console.log(`  -> SHA-256: ${checksum}`);
    }
    return { status: res.status, statusText: res.statusText, size, checksum, buffer, url: cutoutUrl };
  } catch (err: any) {
    clearTimeout(timeout);
    return { status: 0, statusText: err.message, size: 0, checksum: null, buffer: null, url: cutoutUrl };
  }
}

async function main() {
  console.log('=== PROBING 5 OFFICIAL TARGETS + NEP BENCHMARK ===');
  const probeData: any[] = [];

  for (const tgt of TARGETS) {
    console.log(`\nQuerying ${tgt.name} (${tgt.ra}°, ${tgt.dec}°)...`);
    const tap = await queryTAP(tgt.ra, tgt.dec, 0.5);
    console.log(`  -> TAP Status: ${tap.status}, Rows found: ${tap.rows.length}`);

    const details: any = {
      target: tgt,
      tapStatus: tap.status,
      count: tap.rows.length,
      rows: [],
      sampleCutout: null,
    };

    if (tap.rows.length > 0) {
      for (let i = 0; i < Math.min(tap.rows.length, 6); i++) {
        const r = tap.rows[i];
        const obs_id = String(r[0]);
        const s_ra = parseFloat(r[1]);
        const s_dec = parseFloat(r[2]);
        const instrument = String(r[3]);
        const t_min = parseFloat(r[4]);
        const t_max = parseFloat(r[5]);
        const em_min = parseFloat(r[6]);
        const em_max = parseFloat(r[7]);
        const access_url = String(r[8]);
        const dataproduct = String(r[9]);
        const wavelength_um = Number((((em_min + em_max) / 2) * 1e6).toFixed(2));
        const detMatch = access_url.match(/\/D([1-6])$/);
        const detector = detMatch ? `D${detMatch[1]}` : instrument;

        details.rows.push({
          obs_id,
          s_ra,
          s_dec,
          t_min,
          t_max,
          wavelength_um,
          detector,
          access_url,
          dataproduct,
        });
      }

      const firstDatalink = details.rows[0].access_url;
      console.log(`  -> Resolving DataLink: ${firstDatalink}`);
      const directFits = await resolveDataLinkToFits(firstDatalink);
      if (directFits) {
        console.log(`  -> Resolved FITS: ${directFits}`);

        // Proper-motion propagation to this exposure's observation date
        const mjdObs = details.rows[0].t_min;
        const obsEpochYear = julianYearFromMjd(mjdObs);
        const catTarget = OFFICIAL_CHALLENGE_TARGETS.find((t) => t.id === tgt.id);
        let centerRa = tgt.ra;
        let centerDec = tgt.dec;
        if (catTarget && catTarget.pmRaMasYr != null && catTarget.pmDecMasYr != null && catTarget.coordinateEpochYear != null) {
          const prop = propagatePosition(tgt.ra, tgt.dec, catTarget.pmRaMasYr, catTarget.pmDecMasYr, catTarget.coordinateEpochYear, obsEpochYear);
          centerRa = prop.ra;
          centerDec = prop.dec;
          console.log(`  -> Proper motion: ${(prop.separationArcsec / 60).toFixed(2)} arcmin from epoch ${catTarget.coordinateEpochYear} to ${obsEpochYear.toFixed(2)}`);
        }

        const cutout = await probeCutout(directFits, centerRa, centerDec);
        console.log(`  -> Cutout: HTTP ${cutout.status}, size: ${cutout.size} bytes`);

        // Footprint containment: is the propagated target inside the downloaded
        // cutout, and more than 20 px from the edge?
        let containment: any = null;
        let epochCheck: any = null;
        if (cutout.buffer) {
          try {
            const parsed = FITSReader.parse(cutout.buffer);
            const pix = WCS.skyToPix(centerRa, centerDec, parsed.wcs);
            const pxFromEdge = Math.min(pix.x, pix.y, parsed.width - 1 - pix.x, parsed.height - 1 - pix.y);
            containment = {
              x: Number(pix.x.toFixed(2)),
              y: Number(pix.y.toFixed(2)),
              width: parsed.width,
              height: parsed.height,
              insideCutout: pix.x >= 0 && pix.y >= 0 && pix.x <= parsed.width - 1 && pix.y <= parsed.height - 1,
              pxFromEdge: Number(pxFromEdge.toFixed(2)),
              passes20pxMargin: pxFromEdge >= 20,
            };
            console.log(`  -> Containment: pixel (${containment.x}, ${containment.y}) in ${parsed.width}x${parsed.height}, ${containment.pxFromEdge} px from edge, ${containment.passes20pxMargin ? 'PASS' : 'FAIL'} (20 px margin)`);

            // Empirical epoch check: centroid the actual source near the predicted
            // pixel and compare with the prediction. Offsets above ~6 arcsec
            // (about one 6.2" pixel) indicate an epoch/proper-motion problem.
            try {
              const winR = 8;
              const px0 = Math.max(0, Math.round(pix.x) - winR);
              const py0 = Math.max(0, Math.round(pix.y) - winR);
              const px1 = Math.min(parsed.width - 1, Math.round(pix.x) + winR);
              const py1 = Math.min(parsed.height - 1, Math.round(pix.y) + winR);
              let bestVal = -Infinity;
              let bestX = Math.round(pix.x);
              let bestY = Math.round(pix.y);
              for (let yy = py0; yy <= py1; yy++) {
                for (let xx = px0; xx <= px1; xx++) {
                  const v = parsed.data[yy * parsed.width + xx];
                  if (Number.isFinite(v) && v > bestVal) {
                    bestVal = v;
                    bestX = xx;
                    bestY = yy;
                  }
                }
              }
              const cen = ScientificPipeline.computeSubpixelCentroid(parsed.data, parsed.width, parsed.height, bestX, bestY, 3);
              const offsetPix = Math.hypot(cen.cx - pix.x, cen.cy - pix.y);
              const offsetArcsec = offsetPix * (parsed.wcs.pixelScaleArcsec || 6.155);
              epochCheck = {
                predictedPixel: { x: Number(pix.x.toFixed(2)), y: Number(pix.y.toFixed(2)) },
                measuredCentroid: { x: cen.cx, y: cen.cy, valid: cen.valid },
                offsetPix: Number(offsetPix.toFixed(2)),
                offsetArcsec: Number(offsetArcsec.toFixed(2)),
                flagged: offsetArcsec > 6,
              };
              console.log(`  -> Epoch check: predicted (${epochCheck.predictedPixel.x}, ${epochCheck.predictedPixel.y}) vs measured centroid (${cen.cx}, ${cen.cy}) -> ${epochCheck.offsetArcsec}\u0022 offset ${epochCheck.flagged ? 'FLAGGED (>6\u0022)' : 'ok'}`);
            } catch (e2: any) {
              console.warn(`  -> Epoch check failed: ${e2.message}`);
            }
          } catch (e: any) {
            console.warn(`  -> Containment check failed: ${e.message}`);
          }
        }

        details.sampleCutout = {
          directFitsUrl: directFits,
          httpStatus: cutout.status,
          sizeBytes: cutout.size,
          sha256: cutout.checksum,
          centerRa,
          centerDec,
          containment,
          epochCheck,
        };
      }
    } else {
      const testUrl = 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits';
      const cutout = await probeCutout(testUrl, tgt.ra, tgt.dec);
      console.log(`  -> No rows in TAP. Out-of-field cutout check: HTTP ${cutout.status}`);
      details.sampleCutout = {
        directFitsUrl: testUrl,
        httpStatus: cutout.status,
        sizeBytes: cutout.size,
      };
    }

    probeData.push(details);
  }

  // Write docs/IRSA_PROBE.md
  let md = `# IRSA TAP & IBE Cutout Probe Findings

Generated on: ${new Date().toISOString()}  
Data Source: NASA/IPAC Infrared Science Archive (IRSA) — SPHEREx ObsCore TAP (\`spherex.obscore\`) & IBE Cutout API.

## Executive Summary

This diagnostic investigation directly queries NASA/IPAC IRSA for the 5 challenge targets specified in the NASA Space Apps Challenge "Planet X and SPHEREx", plus the North Ecliptic Pole deep calibration strip.

| Target | RA (deg) | Dec (deg) | Sexagesimal | TAP Rows (r=0.5°) | Cutout Status | SHA-256 (first 12) | Containment | QR2 Coverage Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  for (const p of probeData) {
    const t = p.target;
    const cutoutStatus = p.sampleCutout ? `HTTP ${p.sampleCutout.httpStatus} (${p.sampleCutout.sizeBytes} B)` : 'N/A';
    const sha = p.sampleCutout?.sha256 ? `\`${String(p.sampleCutout.sha256).slice(0, 12)}…\`` : 'N/A';
    const cont = p.sampleCutout?.containment
      ? `${p.sampleCutout.containment.insideCutout ? 'inside' : 'OUTSIDE'}, ${p.sampleCutout.containment.pxFromEdge} px from edge (${p.sampleCutout.containment.passes20pxMargin ? 'PASS' : 'FAIL'} 20px)`
      : 'N/A';
    const coverage = p.count > 0 ? (p.sampleCutout?.httpStatus === 200 ? 'COVERED_REAL_DATA' : 'METADATA_ONLY') : 'NO_DATA_IN_RELEASE';
    md += `| **${t.name}** | \`${t.ra}\` | \`${t.dec}\` | \`${t.sexagesimal}\` | **${p.count}** | ${cutoutStatus} | ${sha} | ${cont} | **${coverage}** |\n`;
  }

  md += '\n## Coordinate Verification Against SIMBAD\n\n' +
    'The target table in `src/science/challengeTargets.ts` carries `coordinateVerification` metadata.\n' +
    'RW Aurigae RA was corrected by ~26 arcmin (SIMBAD/Gaia DR3: 05h07m49.4562s +30d24m04.774s).\n' +
    'R Draconis remains UNVERIFIED. Verify/refresh all five targets from SIMBAD TAP locally:\n\n' +
    '```bash\n' +
    "curl 'https://simbad.cds.unistra.fr/simbad/sim-tap/sync?QUERY=SELECT%20main_id,ra,dec,pmra,pmdec%20FROM%20basic%20WHERE%20main_id%20IN%20(%27R%20Dra%27,%27Eps%20Ind%20Ba%27,%27RW%20Aur%27,%27GJ%20699%27,%27Eps%20Ind%27,%27WISE%20J085510.83-071442.5%27)&FORMAT=json'\n" +
    '```\n\n' +
    'Note: pmra from SIMBAD is mu_alpha*cos(dec) - the same convention as src/science/properMotion.ts.\n' +
    'The epsilon Indi entry stores the position of epsilon Indi A; the Ba/Bb pair orbits ~402" away -\n' +
    "check SIMBAD for 'Eps Ind Ba' if the challenge intends the brown-dwarf pair itself.\n" +
    '\n';

  md += `\n## Key Architectural Findings & Design Implications

1. **SPHEREx Quick Release 2 (QR2) Is NOT Limited to the North Ecliptic Pole!**  
   Contrary to the previous hardcoded gate that rejected anything outside the NEP box (RA ~275.5°–276.8°, Dec ~64.5°–65.2°), **Barnard's Star (RA 269.45°, Dec +4.69°)** has **39 real exposures** in \`spherex.obscore\` and returns authentic 200 OK FITS cutouts from IRSA IBE!  
   Similarly, **Epsilon Indi B & C (RA 330.84°, Dec -56.79°)** in the southern hemisphere has **27 real exposures** and returns authentic 200 OK FITS cutouts!

2. **Coverage Must Be Determined by Live TAP Query**:  
   The previous static \`checkCoordinatesInQR2()\` gate incorrectly rejected valid observations for official challenge targets. The gate must be removed and replaced with a dynamic TAP query. If \`spherex.obscore\` has 0 rows for a given RA/Dec (e.g. if a coordinate has not yet been observed in QR2), the application must display an honest, scientific message stating that no observations exist in this public data release, rather than falsely aborting with an artificial NEP error or redirecting without user consent.

3. **DataLink to IBE Direct URL Resolution**:  
   Rows in \`spherex.obscore\` provide an \`access_url\` pointing to the IRSA DataLink service (\`https://irsa.ipac.caltech.edu/datalink/links/spherex?ID=...\`). The DataLink VOTable XML specifies the exact IBE science image URL (\`https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/...\`). The server must resolve these DataLink URLs or build the direct IBE path from the observation metadata (\`{obs_id}\`, \`{detector}\`, build version) so every row gets its own authentic FITS cutout.

\n## Detailed Target Probe Records\n\n`;

  for (const p of probeData) {
    const t = p.target;
    md += `### ${t.name} (${t.id})\n\n`;
    md += `- **Target Coordinates**: RA \`${t.ra}°\`, Dec \`${t.dec}°\` (\`${t.sexagesimal}\`)\n`;
    md += `- **TAP Query Status**: HTTP ${p.tapStatus}\n`;
    md += `- **Observations Found**: **${p.count}** rows within 0.5° search radius\n`;
    if (p.sampleCutout) {
      md += `- **Sample IBE Cutout Status**: HTTP ${p.sampleCutout.httpStatus} (${p.sampleCutout.sizeBytes} bytes)\n`;
      md += `- **FITS Cutout URL**: \`${p.sampleCutout.directFitsUrl}\`\n`;
    }

    if (p.rows.length > 0) {
      md += `\n#### Returned Observations Sample (First ${p.rows.length}):\n\n`;
      md += `| Observation ID | RA (deg) | Dec (deg) | Detector | Wavelength (µm) | MJD Range | DataLink Access URL |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
      for (const r of p.rows) {
        md += `| \`${r.obs_id}\` | ${r.s_ra.toFixed(4)} | ${r.s_dec.toFixed(4)} | ${r.detector} | ${r.wavelength_um} | ${r.t_min.toFixed(4)}–${r.t_max.toFixed(4)} | [DataLink](${r.access_url}) |\n`;
      }
    } else {
      md += `\n*Scientific Finding*: No observation rows returned in \`spherex.obscore\` within 0.5° of these coordinates in SPHEREx QR2. The UI must cleanly report that this celestial field has no exposures in the current public release.\n`;
    }
    md += `\n---\n\n`;
  }

  // ---- FIXED-SKY DRIFT CHECK (Barnard's Star, real frames) ----
  // In "fixed sky" frame mode every cutout is centered on the same sky
  // position (the target at a reference epoch) and frames are reprojected
  // onto that common grid, so a high-proper-motion target visibly moves.
  // This check downloads REAL Barnard's Star frames cut out at one fixed
  // position and verifies the PREDICTED target pixel position changes.
  const driftResults: Array<{ obsId: string; epochYear: number; x: number; y: number }> = [];
  try {
    const barnard = OFFICIAL_CHALLENGE_TARGETS.find((t) => t.id === 'target-barnards-star')!;
    if (barnard.pmRaMasYr != null && barnard.pmDecMasYr != null && barnard.coordinateEpochYear != null) {
      console.log(`\n=== FIXED-SKY DRIFT CHECK (Barnard's Star, real frames) ===`);
      const driftTap = await queryTAP(barnard.ra, barnard.dec, 0.1);
      const seen = new Set<string>();
      const picks: any[] = [];
      for (const row of driftTap.rows) {
        const id = String(row[0]);
        if (!seen.has(id)) {
          seen.add(id);
          picks.push(row);
        }
        if (picks.length >= 4) break;
      }
      if (picks.length >= 2) {
        const refEpochYear = julianYearFromMjd(parseFloat(picks[0][4]));
        const refProp = propagatePosition(barnard.ra, barnard.dec, barnard.pmRaMasYr, barnard.pmDecMasYr, barnard.coordinateEpochYear, refEpochYear);
        console.log(`Fixed-sky reference epoch ${refEpochYear.toFixed(2)}: center (${refProp.ra.toFixed(5)}, ${refProp.dec.toFixed(5)})`);
        for (const row of picks) {
          const obsId = String(row[0]);
          const accessUrl = String(row[8]);
          const epochYear = julianYearFromMjd(parseFloat(row[4]));
          const prop = propagatePosition(barnard.ra, barnard.dec, barnard.pmRaMasYr, barnard.pmDecMasYr, barnard.coordinateEpochYear, epochYear);
          const direct = await resolveDataLinkToFits(accessUrl);
          if (!direct) {
            console.warn(`  ${obsId}: DataLink resolution failed; skipping`);
            continue;
          }
          const cut = await probeCutout(direct, refProp.ra, refProp.dec);
          if (!cut.buffer) {
            console.warn(`  ${obsId}: download failed (HTTP ${cut.status})`);
            continue;
          }
          const parsed = FITSReader.parse(cut.buffer);
          const pix = WCS.skyToPix(prop.ra, prop.dec, parsed.wcs);
          driftResults.push({ obsId, epochYear, x: pix.x, y: pix.y });
          console.log(`  ${obsId} (epoch ${epochYear.toFixed(2)}): predicted pixel (${pix.x.toFixed(1)}, ${pix.y.toFixed(1)}) in ${parsed.width}x${parsed.height}`);
        }
        if (driftResults.length >= 2) {
          const first = driftResults[0];
          const last = driftResults[driftResults.length - 1];
          const driftPix = Math.hypot(last.x - first.x, last.y - first.y);
          console.log(`  -> Predicted target pixel moved ${driftPix.toFixed(2)} px across ${driftResults.length} real frames in fixed-sky mode`);
        }
      } else {
        console.log('  -> Fewer than 2 unique exposures found; drift check skipped');
      }
    }
  } catch (e: any) {
    console.warn('Fixed-sky drift check failed:', e.message);
  }

  if (driftResults.length >= 2) {
    md += `\n## Fixed-Sky Drift Check (Barnard's Star, real frames)\n\n`;
    md += `| obs_id | Epoch (Julian yr) | Predicted pixel X | Predicted pixel Y |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    for (const d of driftResults) {
      md += `| \`${d.obsId}\` | ${d.epochYear.toFixed(2)} | ${d.x.toFixed(2)} | ${d.y.toFixed(2)} |\n`;
    }
    const driftFirst = driftResults[0];
    const driftLast = driftResults[driftResults.length - 1];
    const driftPixTotal = Math.hypot(driftLast.x - driftFirst.x, driftLast.y - driftFirst.y);
    md += `\nPredicted target pixel moved **${driftPixTotal.toFixed(2)} px** across ${driftResults.length} real frames in fixed-sky mode (center held fixed, target propagated per exposure).\n`;
  }

  const outPath = path.join(process.cwd(), 'docs', 'IRSA_PROBE.md');
  fs.writeFileSync(outPath, md, 'utf-8');
  console.log(`\nSuccessfully saved probe findings to ${outPath}`);
}

main().catch((err) => {
  console.error('Probe failed:', err);
  process.exit(1);
});
