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
  console.log(`Total FITS Files:                           ${report.filesInspected}`);
  console.log(`Unique Observation IDs:                     ${report.uniqueObservationIds}`);
  console.log(`Unique Observation Exposures:               ${report.uniqueObservationEpochs}`);
  console.log(`Grouped Flight Visits (visitKey):           ${report.epochDeduplicationSummary.groupedVisitsCount ?? 0}`);
  console.log(`Independent-Visit Distinction:              ${report.independentVisitDistinctionStatus ?? 'NOT_VERIFIED'}`);
  console.log(`Duplicate / Ambiguous Files:                ${report.duplicateOrAmbiguousCount}`);
  if (report.duplicateOrAmbiguousDetails.length > 0) {
    report.duplicateOrAmbiguousDetails.forEach((d) => {
      console.log(`   * ${d.fileName} -> ${d.reason} (OBSID: ${d.matchedObsId})`);
    });
  }

  console.log('\n--- TEMPORAL PAIR & VISIT CLASSIFICATION ---');
  console.log(`Total Possible Temporal Pairs:              ${report.totalTemporalPairs ?? 0}`);
  console.log(`Intra-Visit Pairs (Same visitKey):          ${report.intraVisitPairs ?? 0}`);
  console.log(`Independent-Visit Pairs:                    ${report.independentVisitPairs ?? 0}`);
  console.log(`Independently Verified Survey-Epoch Pairs:  ${report.surveyEpochPairs ?? 0}`);
  console.log(`Intra-Visit Exposures Count:                ${report.epochDeduplicationSummary.intraVisitExposuresCount}`);
  console.log(`Independent Visits Count:                   ${report.epochDeduplicationSummary.independentVisitsCount}`);
  if (report.epochDeduplicationSummary.unverifiedVisitsCount) {
    console.log(`Unverified Visits Count:                    ${report.epochDeduplicationSummary.unverifiedVisitsCount}`);
  }
  if (report.epochDeduplicationSummary.surveyEpochsCount) {
    console.log(`Multi-Week Survey Epochs Count:             ${report.epochDeduplicationSummary.surveyEpochsCount}`);
  }

  console.log('\n--- PER-EXPOSURE METADATA & INTEGRATION DURATION (DATE-END - DATE-OBS) ---');
  report.detectedEpochs.forEach((ep, idx) => {
    const dupStr = ep.isDuplicate ? ' [DUPLICATE EXCLUDED]' : '';
    const p = ep.parsedObsId;
    const metaStr = p
      ? `Week=${p.week} | Pass=${p.pass} | Slew=${p.slew} | Exp=${p.exposure} | VisitKey=${p.visitKey}`
      : 'ParsedOBSID=NONE';
    const intStr = ep.integrationDurationSec !== undefined ? `${ep.integrationDurationSec.toFixed(3)} s` : 'N/A';
    console.log(
      `   [File ${idx + 1}] ${ep.fileName || ''} | OBSID=${ep.obsId} | Detector=${ep.detector ?? 'N/A'} | EXPIDN=${ep.expIdn ?? 'N/A'} | ${metaStr} | DATE-OBS=${ep.date} | DATE-END=${ep.dateEnd || 'N/A'} | Integration(DATE-END-DATE-OBS)=${intStr} | Class=${ep.visitType}${dupStr}`
    );
    if (ep.sha256) {
      console.log(`      SHA-256: ${ep.sha256}`);
    }
  });

  if (report.epochDeduplicationSummary.pairwiseCadenceDetails && report.epochDeduplicationSummary.pairwiseCadenceDetails.length > 0) {
    console.log('\n--- PAIRWISE CADENCE (ΔDATE-OBS) & INTER-EXPOSURE GAP (next DATE-OBS - prev DATE-END) ---');
    report.epochDeduplicationSummary.pairwiseCadenceDetails.forEach((pair) => {
      const cadStr = pair.startToStartCadenceSec !== null
        ? `${pair.startToStartCadenceSec.toFixed(3)} s (${(pair.startToStartCadenceSec / 60).toFixed(5)} min)`
        : 'N/A';
      const gapStr = pair.interExposureGapSec !== null ? `${pair.interExposureGapSec.toFixed(3)} s` : 'N/A';
      const int1Str = pair.integrationDuration1Sec !== null ? `${pair.integrationDuration1Sec.toFixed(3)} s` : 'N/A';
      const int2Str = pair.integrationDuration2Sec !== null ? `${pair.integrationDuration2Sec.toFixed(3)} s` : 'N/A';
      console.log(
        `   * ${pair.obsId1} -> ${pair.obsId2} [${pair.pairType}]: Integration=${int1Str} / ${int2Str} | Start-to-Start Cadence=${cadStr} | Inter-Exposure Endpoint Gap=${gapStr}`
      );
    });
  }

  console.log('\n--- DATA INTEGRITY & SCIENTIFIC SAFETY ---');
  console.log(`Status:                       ${report.status}`);
  console.log(`WCS Astrometry Valid:         ${report.wcsValid}`);
  console.log(`Native Variance Present:      ${report.varianceExtensionPresent} (Source: ${report.varianceSource})`);
  console.log(`Native Flags Present:         ${report.flagsExtensionPresent} (Status: ${report.flagsStatus})`);
  console.log(`Photometric Units Status:     ${report.unitStatus}`);

  console.log('\n--- CELESTIAL FOOTPRINT & SOLID ANGLE ---');
  console.log(`Derived Sky Footprint:        RA ${report.derivedFootprint.raMin}°–${report.derivedFootprint.raMax}°, Dec ${report.derivedFootprint.decMin}°–${report.derivedFootprint.decMax}°`);
  if (report.derivedFootprint.individualFootprints) {
    report.derivedFootprint.individualFootprints.forEach((fp) => {
      console.log(
        `   * ${fp.obsId} (${fp.fileName}): CD+Y_PA=${fp.orientationAngleDeg}° | Sky+Y_PA=${fp.skyOrientationAngleDeg}° | PixelCenterArea=${fp.pixelCenterAreaSqDeg} sq deg | FullPixelArea=${fp.fullPixelAreaSqDeg} sq deg`
      );
    });
  }
  if (report.derivedFootprint.pairwiseOverlapAreasSqDeg) {
    report.derivedFootprint.pairwiseOverlapAreasSqDeg.forEach((ov) => {
      console.log(
        `   * Overlap (${ov.obsId1} ∩ ${ov.obsId2}): PixelCenter=${ov.pixelCenterOverlapSqDeg} sq deg | FullPixel=${ov.fullPixelOverlapSqDeg} sq deg`
      );
    });
  }
  console.log(`Spherical Union Area:         FullPixel=${report.derivedFootprint.unionAreaSqDeg} sq deg | PixelCenter=${report.derivedFootprint.pixelCenterUnionAreaSqDeg} sq deg`);
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
  } else if (report.status === 'WARNINGS') {
    console.log('VERDICT: DATASET VALIDATED WITH AUDIT WARNINGS');
  } else {
    console.log('VERDICT: MULTI-VISIT DATASET VALIDATED FOR SCIENCE PIPELINE');
  }

  return report;
}

// Direct execution from CLI
if (process.argv[1]?.endsWith('releaseValidator.ts') || process.argv[1]?.endsWith('releaseValidator.js')) {
  const dirArg = process.argv[2] || '/tmp/spherex_cache';
  const sourceArg: DatasetSourceType = (process.argv[3] as DatasetSourceType) || 'DEVELOPMENT_BENCHMARK';
  runReleaseValidation(dirArg, sourceArg);
}
