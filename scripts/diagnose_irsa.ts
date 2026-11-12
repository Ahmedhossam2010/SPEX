import fs from 'fs';

interface TargetDef {
  id: string;
  name: string;
  ra: number;
  dec: number;
  pmRaMasYr: number;
  pmDecMasYr: number;
  epochYear: number;
}

const TARGETS: TargetDef[] = [
  {
    id: 'barnards-star',
    name: "Barnard's Star (GJ 699)",
    ra: 269.45208,
    dec: 4.69339,
    pmRaMasYr: -801.551,
    pmDecMasYr: 10362.394,
    epochYear: 2000.0,
  },
  {
    id: 'wise-0855',
    name: 'WISE 0855-0714',
    ra: 133.79514,
    dec: -7.24515,
    pmRaMasYr: -8127.0,
    pmDecMasYr: 727.0,
    epochYear: 2010.0,
  },
  {
    id: 'epsilon-indi',
    name: 'Epsilon Indi (HD 209100 / Eps Ind Ba/Bb)',
    ra: 330.84042,
    dec: -56.78601,
    pmRaMasYr: 3961.41,
    pmDecMasYr: -2538.33,
    epochYear: 2000.0,
  },
  {
    id: 'rw-aur',
    name: 'RW Aurigae',
    ra: 76.95607,
    dec: 30.40133,
    pmRaMasYr: 1.13,
    pmDecMasYr: -19.78,
    epochYear: 2000.0,
  },
  {
    id: 'r-dra',
    name: 'R Draconis',
    ra: 248.3308,
    dec: 66.7533,
    pmRaMasYr: 18.23,
    pmDecMasYr: -16.48,
    epochYear: 2000.0,
  },
];

function propagate(ra: number, dec: number, pmRa: number, pmDec: number, fromYear: number, toYear = 2025.6) {
  const dt = toYear - fromYear;
  const cosDec = Math.cos((dec * Math.PI) / 180.0);
  const newRa = ra + (pmRa * dt) / (1000.0 * 3600.0 * (cosDec || 1));
  const newDec = dec + (pmDec * dt) / (1000.0 * 3600.0);
  return { ra: Number(newRa.toFixed(5)), dec: Number(newDec.toFixed(5)) };
}

async function diagnose() {
  console.log('========================================================================');
  console.log('NASA/IPAC IRSA ARCHIVE DIAGNOSTIC REPORT: ALL 5 CHALLENGE TARGETS');
  console.log('========================================================================\n');

  for (const t of TARGETS) {
    const coords = propagate(t.ra, t.dec, t.pmRaMasYr, t.pmDecMasYr, t.epochYear);
    console.log(`------------------------------------------------------------------------`);
    console.log(`TARGET: ${t.name} (${t.id})`);
    console.log(`Propagated Coordinates (2025.6): RA ${coords.ra}°, Dec ${coords.dec}°`);

    // Top 5 exposures where target is within physical detector footprint s_region
    const adql = `SELECT obs_id, s_ra, s_dec, instrument_name, t_min, t_max, em_min, em_max, access_url FROM spherex.obscore WHERE CONTAINS(POINT('ICRS',${coords.ra},${coords.dec}),s_region)=1 ORDER BY t_min ASC`;
    console.log(`Exact ADQL Sent:\n${adql}`);

    const tapUrl = `https://irsa.ipac.caltech.edu/TAP/sync?QUERY=${encodeURIComponent(adql)}&FORMAT=csv`;
    const tapRes = await fetch(tapUrl, {
      headers: { 'User-Agent': 'SPHEREx-ChangingSky-QA/1.0' },
      signal: AbortSignal.timeout(25000),
    });

    console.log(`TAP Raw HTTP Status: ${tapRes.status} ${tapRes.statusText}`);
    const rawCsv = await tapRes.text();
    console.log(`TAP Response Sample (First 300 chars):\n${rawCsv.slice(0, 300).replace(/\n/g, ' ')}`);

    const lines = rawCsv.trim().split('\n');
    const rowCount = Math.max(0, lines.length - 1);
    console.log(`Parsed Row Count: ${rowCount} real exposures in archive`);

    if (rowCount > 0) {
      // Parse first row
      const firstRow = lines[1].split(',');
      const obsId = firstRow[0];
      const dataLinkUrl = firstRow[8]?.replace(/"/g, '');
      console.log(`Selected ObsID: ${obsId}`);
      console.log(`DataLink URL: ${dataLinkUrl}`);

      // Resolve DataLink to true science Level-2B FITS URL
      let scienceFitsUrl = '';
      if (dataLinkUrl) {
        try {
          const dlRes = await fetch(dataLinkUrl, {
            headers: { 'User-Agent': 'SPHEREx-ChangingSky-QA/1.0' },
            signal: AbortSignal.timeout(15000),
          });
          const dlXml = await dlRes.text();
          // Find the URL associated with #this or science image
          const matches = dlXml.match(/https:\/\/irsa\.ipac\.caltech\.edu\/ibe\/data\/spherex\/[^\s"'<>]+level2[^\s"'<>]+\.fits/gi);
          if (matches && matches.length > 0) {
            scienceFitsUrl = matches[0];
          }
        } catch (dlErr: any) {
          console.warn(`DataLink resolution error: ${dlErr.message}`);
        }
      }

      if (scienceFitsUrl) {
        const cutoutUrl = `${scienceFitsUrl}?center=${coords.ra},${coords.dec}&size=64pix`;
        console.log(`Constructed Cutout URL:\n${cutoutUrl}`);

        // Probe cutout URL with retries
        let cutoutStatus = 0;
        let cutoutBytes = 0;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const cRes = await fetch(cutoutUrl, {
              headers: { 'User-Agent': 'SPHEREx-ChangingSky-QA/1.0' },
              signal: AbortSignal.timeout(25000),
            });
            cutoutStatus = cRes.status;
            if (cRes.ok) {
              const buf = await cRes.arrayBuffer();
              cutoutBytes = buf.byteLength;
              break;
            } else if (cRes.status === 503) {
              await new Promise((r) => setTimeout(r, 2000));
            }
          } catch (cErr: any) {
            console.warn(`Cutout attempt ${attempt} failed: ${cErr.message}`);
          }
        }
        console.log(`Cutout Final HTTP Status: ${cutoutStatus} (${cutoutBytes} bytes downloaded)`);
      }
    }
  }
}

diagnose().catch(console.error);
