import fs from 'fs';
import path from 'path';
import { DataReleaseAdapter, IngestionFileCandidate } from './dataReleaseAdapter';
import { DatasetSourceType } from './types';

/**
 * Automated Official Dataset Release Validator:
 * Ready to execute on November 13 when the official challenge dataset is released.
 *
 * Scans an input directory, inspects all FITS headers, verifies HDU structure,
 * performs rigorous observation deduplication, derives both bounding box and
 * actual image footprint areas, verifies temporal separation, and produces a
 * machine-readable validation report.
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

  console.log('--- OBSERVATION DEDUPLICATION & METRICS ---');
  console.log(`Total FITS Files:             ${report.filesInspected}`);
  console.log(`Unique Observation IDs:       ${report.uniqueObservationIds}`);
  console.log(`Unique Observation Epochs:    ${report.uniqueObservationEpochs}`);
  console.log(`Valid Temporal Pairs:         ${report.validIndependentEpochPairs}`);
  console.log(`Duplicate / Ambiguous Files:  ${report.duplicateOrAmbiguousCount}`);
  if (report.duplicateOrAmbiguousDetails.length > 0) {
    report.duplicateOrAmbiguousDetails.forEach((d) => {
      console.log(`   * ${d.fileName} -> ${d.reason} (OBSID: ${d.matchedObsId})`);
    });
  }

  console.log('\n--- TEMPORAL VISIT BREAKDOWN ---');
  console.log(`Intra-Visit Exposures (<1h):  ${report.epochDeduplicationSummary.intraVisitExposuresCount}`);
  console.log(`Independent Survey Visits:    ${report.epochDeduplicationSummary.independentVisitsCount}`);
  if (report.epochDeduplicationSummary.unverifiedVisitsCount) {
    console.log(`Unverified Visits (No Meta):  ${report.epochDeduplicationSummary.unverifiedVisitsCount}`);
  }
  if (report.epochDeduplicationSummary.surveyEpochsCount) {
    console.log(`Survey Epochs (Multi-Week):   ${report.epochDeduplicationSummary.surveyEpochsCount}`);
  }

  report.detectedEpochs.forEach((ep, idx) => {
    const dupStr = ep.isDuplicate ? ' [DUPLICATE EXCLUDED]' : '';
    let visitStr = ' (Independent Visit)';
    if (ep.visitType === 'INTRA_VISIT_EXPOSURE') visitStr = ' (Intra-visit exposure ~2.15 min)';
    else if (ep.visitType === 'SURVEY_EPOCH') visitStr = ' (Survey Epoch pass)';
    else if (ep.visitType === 'NOT_VERIFIED') visitStr = ' (NOT VERIFIED: Lacks flight metadata)';
    console.log(`   [File ${idx + 1}] ID: ${ep.obsId} | MJD: ${ep.mjd.toFixed(4)} | Date: ${ep.date}${dupStr}${visitStr}`);
  });

  console.log('\n--- DATA INTEGRITY & SCIENTIFIC SAFETY ---');
  console.log(`Status:                       ${report.status}`);
  console.log(`WCS Astrometry Valid:         ${report.wcsValid}`);
  console.log(`Native Variance Present:      ${report.varianceExtensionPresent} (Source: ${report.varianceSource})`);
  console.log(`Native Flags Present:         ${report.flagsExtensionPresent} (Status: ${report.flagsStatus})`);
  console.log(`Photometric Units Status:     ${report.unitStatus}`);

  console.log('\n--- CELESTIAL FOOTPRINT & SOLID ANGLE ---');
  console.log(`Derived Sky Footprint:        RA ${report.derivedFootprint.raMin.toFixed(4)}°–${report.derivedFootprint.raMax.toFixed(4)}°, Dec ${report.derivedFootprint.decMin.toFixed(4)}°–${report.derivedFootprint.decMax.toFixed(4)}°`);
  console.log(`Actual Image Footprint Area:  ${report.derivedFootprint.actualFootprintAreaSqDeg} sq deg (single 64x64 cutout coverage)`);
  console.log(`Bounding-Box Solid Angle:     ${report.derivedFootprint.boundingBoxAreaSqDeg} sq deg`);
  console.log(`Method:                       ${report.derivedFootprint.method}`);
  console.log(`Detected Bands:               ${report.detectedBands.join(', ') || 'Default NIR'}`);

  if (report.issues.length > 0) {
    console.log('\n--- AUDIT NOTICES & WARNINGS ---');
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
