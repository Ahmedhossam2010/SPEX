/**
 * scripts/prefetch_targets.ts
 *
 * Downloads cutouts for SPHEREx exposures whose footprint truly contains each
 * propagated challenge target, storing them under data/demo_cache/ with cryptographic
 * metadata (obs_id, date, SHA-256, URL, timestamp).
 *
 * Requirements:
 * - Fails loudly without network (never writes dummy/placeholder files)
 * - Verifies target pixel lies inside the cutout
 * - Calculates genuine SHA-256
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OFFICIAL_CHALLENGE_TARGETS } from '../src/science/challengeTargets';
import { propagatePosition, julianYearFromMjd } from '../src/science/properMotion';
import { FITSReader } from '../src/science/fitsReader';
import { WCS } from '../src/science/wcs';

const DEMO_CACHE_DIR = path.join(process.cwd(), 'data', 'demo_cache');

interface DemoTargetMetadata {
  targetId: string;
  targetName: string;
  obsId: string;
  date: string;
  sha256: string;
  url: string;
  timestamp: string;
  ra: number;
  dec: number;
  propagatedRa: number;
  propagatedDec: number;
  sizePix: number;
  pixelX: number;
  pixelY: number;
  pxFromEdge: number;
  fileName: string;
}

async function prefetch() {
  console.log('=== SPHEREx Challenge Target Prefetch Utility ===');
  console.log('Target directory:', DEMO_CACHE_DIR);

  if (!fs.existsSync(DEMO_CACHE_DIR)) {
    fs.mkdirSync(DEMO_CACHE_DIR, { recursive: true });
  }

  const manifest: Record<string, DemoTargetMetadata[]> = {};
  let totalDownloaded = 0;

  for (const target of OFFICIAL_CHALLENGE_TARGETS) {
    if (target.coordinateVerification === 'UNVERIFIED') {
      console.log(`[SKIP] Target ${target.name} (${target.id}) coordinates are UNVERIFIED.`);
      continue;
    }

    console.log(`\n[TARGET] Processing ${target.name} (${target.id})`);
    const targetDir = path.join(DEMO_CACHE_DIR, target.id);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Default NEP benchmark exposure for testing, or target's sampleObsId
    const sampleObsId = target.sampleObsId;
    if (!sampleObsId) {
      console.log(`[WARN] No sampleObsId defined for target ${target.id}`);
      continue;
    }

    // Determine target position (propagate if proper motion known)
    let propRa = target.ra;
    let propDec = target.dec;
    const refYear = 2025.4; // SPHEREx QR2 epoch
    if (
      target.pmRaMasYr != null &&
      target.pmDecMasYr != null &&
      target.coordinateEpochYear != null
    ) {
      const prop = propagatePosition(
        target.ra,
        target.dec,
        target.pmRaMasYr,
        target.pmDecMasYr,
        target.coordinateEpochYear,
        refYear
      );
      propRa = prop.ra;
      propDec = prop.dec;
      console.log(`  Propagated to epoch ${refYear.toFixed(2)}: RA ${propRa.toFixed(5)}°, Dec ${propDec.toFixed(5)}°`);
    }

    const sizePix = 64;
    // Construct IRSA IBE cutout URL for sampleObsId
    const fitsUrl = `https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/${sampleObsId.slice(0, 10)}/l2b-v20-2025-241/1/level2_${sampleObsId}D1_spx_l2b-v20-2025-241.fits`;
    const cutoutUrl = `${fitsUrl}?center=${propRa.toFixed(5)},${propDec.toFixed(5)}&size=${sizePix}pix`;

    console.log(`  Fetching cutout: ${cutoutUrl}`);
    let buffer: Buffer;
    try {
      const res = await fetch(cutoutUrl, {
        headers: { 'User-Agent': 'SPHEREx-ChangingSky-SpaceApps/1.0' },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`IRSA returned HTTP ${res.status}: ${res.statusText}`);
      }

      const ab = await res.arrayBuffer();
      buffer = Buffer.from(ab);
      if (buffer.length < 2880) {
        throw new Error(`Invalid FITS file: size ${buffer.length} < 2880 bytes`);
      }
    } catch (netErr: any) {
      console.error(`[ERROR] Network failure fetching cutout for ${target.id}: ${netErr.message}`);
      console.error('FAIL LOUDLY: As required by specification, no placeholder file will be written.');
      // Script fails loudly without writing placeholder
      throw netErr;
    }

    // Verify FITS validity and target pixel inside cutout
    const parsed = FITSReader.parse(buffer);
    const pix = WCS.skyToPix(propRa, propDec, parsed.wcs);
    const pxFromEdge = Math.min(pix.x, pix.y, parsed.width - 1 - pix.x, parsed.height - 1 - pix.y);

    if (pix.x < 0 || pix.y < 0 || pix.x >= parsed.width || pix.y >= parsed.height) {
      throw new Error(`Target pixel (${pix.x.toFixed(1)}, ${pix.y.toFixed(1)}) falls outside ${parsed.width}x${parsed.height} cutout!`);
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const outFileName = `${sampleObsId}.fits`;
    const outFilePath = path.join(targetDir, outFileName);

    fs.writeFileSync(outFilePath, buffer);
    totalDownloaded++;

    const meta: DemoTargetMetadata = {
      targetId: target.id,
      targetName: target.name,
      obsId: sampleObsId,
      date: (parsed.header['DATE-OBS'] as string) || new Date().toISOString(),
      sha256,
      url: cutoutUrl,
      timestamp: new Date().toISOString(),
      ra: target.ra,
      dec: target.dec,
      propagatedRa: propRa,
      propagatedDec: propDec,
      sizePix,
      pixelX: Number(pix.x.toFixed(2)),
      pixelY: Number(pix.y.toFixed(2)),
      pxFromEdge: Number(pxFromEdge.toFixed(2)),
      fileName: outFileName,
    };

    if (!manifest[target.id]) manifest[target.id] = [];
    manifest[target.id].push(meta);

    fs.writeFileSync(path.join(targetDir, 'metadata.json'), JSON.stringify(meta, null, 2));
    console.log(`  Saved ${outFileName} (SHA-256: ${sha256.slice(0, 16)}..., margin: ${pxFromEdge.toFixed(1)} px)`);
  }

  fs.writeFileSync(path.join(DEMO_CACHE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n=== Prefetch Completed: ${totalDownloaded} authentic FITS cutouts stored in data/demo_cache/ ===`);
}

// If run directly via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  prefetch().catch((err) => {
    console.error('Prefetch failed:', err);
    process.exit(1);
  });
}

export { prefetch };
