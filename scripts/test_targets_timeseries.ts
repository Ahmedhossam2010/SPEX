import http from 'http';

interface TargetDef {
  id: string;
  name: string;
  ra: number;
  dec: number;
}

const TARGETS: TargetDef[] = [
  { id: 'barnards-star', name: "Barnard's Star", ra: 269.45208, dec: 4.69339 },
  { id: 'wise-0855', name: 'WISE 0855-0714', ra: 133.79514, dec: -7.24515 },
  { id: 'epsilon-indi', name: 'Epsilon Indi', ra: 330.84042, dec: -56.78601 },
  { id: 'rw-aur', name: 'RW Aurigae', ra: 76.95607, dec: 30.40133 },
  { id: 'r-dra', name: 'R Draconis', ra: 248.33080, dec: 66.75330 },
];

async function fetchTimeseries(t: TargetDef): Promise<any> {
  const url = `http://localhost:3000/api/spherex/timeseries?ra=${t.ra}&dec=${t.dec}&caseId=${t.id}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}

async function main() {
  console.log('Testing /api/spherex/timeseries for all 5 challenge targets...\n');
  for (const t of TARGETS) {
    const start = Date.now();
    try {
      console.log(`Querying ${t.name} (RA ${t.ra}, Dec ${t.dec})...`);
      const data = await fetchTimeseries(t);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const frames = data.frames || [];
      const bands = [...new Set(frames.map((f: any) => f.detector))].join(', ');
      const dates = frames.map((f: any) => f.dateObs || f.date).filter(Boolean).sort();
      const dateRange = dates.length > 0 ? `${dates[0].slice(0, 10)} to ${dates[dates.length - 1].slice(0, 10)}` : 'N/A';
      console.log(`SUCCESS [${elapsed}s]: ${t.name} -> ${frames.length} frames loaded, detectors: [${bands}], dates: ${dateRange}`);
      console.log(`Sample Frame 1: ObsID=${frames[0]?.obsId}, wavelength=${frames[0]?.wavelengthUm}µm, size=${frames[0]?.width}x${frames[0]?.height}, fluxLen=${frames[0]?.flux?.length}\n`);
    } catch (err: any) {
      console.error(`FAILED: ${t.name}:`, err.message, '\n');
    }
  }
}

main().catch(console.error);
