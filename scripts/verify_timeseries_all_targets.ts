interface TargetVerify {
  id: string;
  name: string;
  ra: number;
  dec: number;
}

const TARGETS: TargetVerify[] = [
  { id: 'target-barnards-star', name: "Barnard's Star", ra: 269.45208, dec: 4.69339 },
  { id: 'target-wise-0855', name: 'WISE 0855-0714', ra: 133.79513, dec: -7.24515 },
  { id: 'target-rw-aurigae', name: 'RW Aurigae', ra: 76.95607, dec: 30.40133 },
  { id: 'target-r-draconis', name: 'R Draconis', ra: 248.3308, dec: 66.7533 },
  { id: 'target-epsilon-indi-bab', name: 'Epsilon Indi', ra: 330.84042, dec: -56.78601 },
];

async function run() {
  console.log('| Target | Exposures Found | Frames Loaded | Bands | Date Range |');
  console.log('|---|---|---|---|---|');

  for (const t of TARGETS) {
    try {
      const url = `http://localhost:3000/api/spherex/timeseries?caseId=${t.id}&ra=${t.ra}&dec=${t.dec}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) {
        console.log(`| ${t.name} | ERROR (${res.status}) | 0 | N/A | N/A |`);
        continue;
      }
      const data = await res.json();
      const frames = data.frames || [];
      const bands = Array.from(new Set(frames.map((f: any) => f.detector || f.band))).join(', ');
      const dates = frames.map((f: any) => f.dateObs || f.date).filter(Boolean).sort();
      const dateRange = dates.length > 0 ? `${dates[0].slice(0, 10)} to ${dates[dates.length - 1].slice(0, 10)}` : 'N/A';
      const expCount = data.availableExposuresCount || data.totalAvailableExposures || frames.length;
      console.log(`| ${t.name} | ${expCount} | ${frames.length} | ${bands} | ${dateRange} |`);
    } catch (err: any) {
      console.log(`| ${t.name} | FETCH_ERR (${err.message}) | 0 | N/A | N/A |`);
    }
  }
}

run();
