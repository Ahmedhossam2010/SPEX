import fs from 'fs';
import path from 'path';
import { DataReleaseAdapter, IngestionFileCandidate } from './dataReleaseAdapter';
import { DatasetSourceType } from './types';

/**
 * Automated Official Dataset Release Validator:
 * Ready to execute on November 13 when the official challenge dataset is released.
 *
 * Scans an input directory, inspects all FITS headers, verifies HDU structure,
 * derives the dynamic sky footprint, checks timestamps, and produces a
 * machine-readable JSON docket.
 */
export async function runReleaseValidation(
  targetDir = '/tmp/spherex_cache',
  sourceType: DatasetSourceType = 'DEVELOPMENT_BENCHMARK'
) {
  console.log('================================================================');
  console.log('SPEX — AUTOMATED DATASET RELEASE VALIDATION');
  console.log(`Source Type:   ${sourceType}`);
  console.log(`Target Dir:    ${targetDir}`);
  console.log(`Timestamp:     ${new Date().toISOString()}`);
  console.log('================================================================\n');

  if (!fs.existsSync(targetDir)) {
    console.error(`ERROR: Directory not found: ${targetDir}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(targetDir);
  const fitsFiles = allFiles.filter((f) => f.endsWith('.fits') || f.endsWith('.fits.gz'));

  console.log(`Discovered ${fitsFiles.length} FITS candidate file(s)...\n`);

  if (fitsFiles.length === 0) {
    console.error('ERROR: No .fits or .fits.gz files discovered in target directory.');
    process.exit(1);
  }

  const candidates: IngestionFileCandidate[] = fitsFiles.map((file) => ({
    fileName: file,
    buffer: fs.readFileSync(path.join(targetDir, file)),
    sourceType,
    releaseId: sourceType === 'OFFICIAL_CHALLENGE_RELEASE' ? 'RELEASE_2026_OFFICIAL' : 'QR2_DEVELOPMENT',
  }));

  const report = DataReleaseAdapter.validateDatasetRelease(candidates, sourceType);

  console.log('--- VALIDATION SUMMARY ---');
  console.log(`Status:                   ${report.status}`);
  console.log(`Files Inspected:          ${report.filesInspected}`);
  console.log(`Valid Ingestions:         ${report.validFilesCount}`);
  console.log(`Invalid Ingestions:       ${report.invalidFilesCount}`);
  console.log(`WCS Astrometry Valid:     ${report.wcsValid}`);
  console.log(`Native Variance Present:  ${report.varianceExtensionPresent}`);
  console.log(`Native Flags Present:     ${report.flagsExtensionPresent}`);
  console.log(`Derived Sky Footprint:    RA ${report.derivedFootprint.raMin.toFixed(2)}°–${report.derivedFootprint.raMax.toFixed(2)}°, Dec ${report.derivedFootprint.decMin.toFixed(2)}°–${report.derivedFootprint.decMax.toFixed(2)}°`);
  console.log(`Derived Bounding Area:    ${report.derivedFootprint.areaSqDeg} sq deg`);
  console.log(`Chronological Epochs:     ${report.detectedEpochs.length} visit(s)`);
  report.detectedEpochs.forEach((ep, idx) => {
    console.log(`   [Visit ${idx + 1}] ID: ${ep.obsId} | MJD: ${ep.mjd.toFixed(4)} | Date: ${ep.date}`);
  });
  console.log(`Detected Bands:           ${report.detectedBands.join(', ') || 'Default NIR'}`);

  if (report.issues.length > 0) {
    console.log('\n--- ISSUES / NOTICES ---');
    report.issues.forEach((issue) => console.log(` * ${issue}`));
  }

  console.log('\n================================================================');
  if (report.status === 'INCOMPATIBLE') {
    console.error('VERDICT: DATASET INCOMPATIBLE WITH SCIENCE PIPELINE');
    process.exit(1);
  } else {
    console.log('VERDICT: DATASET FULLY VALIDATED & PIPELINE READY');
  }

  return report;
}

// Direct execution from CLI
if (process.argv[1]?.endsWith('releaseValidator.ts') || process.argv[1]?.endsWith('releaseValidator.js')) {
  const dirArg = process.argv[2] || '/tmp/spherex_cache';
  const sourceArg: DatasetSourceType = (process.argv[3] as DatasetSourceType) || 'DEVELOPMENT_BENCHMARK';
  runReleaseValidation(dirArg, sourceArg);
}
