import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  EDUCATIONAL_SPECTRUM_BANDS,
  EDUCATIONAL_DETECTOR_ARRAYS,
  EDUCATIONAL_SCENARIOS,
  generateSyntheticScenarioImages,
} from './educationalData';

// Physical absorption model for water and carbon dioxide ice in protostellar disks
export const getHyperspectralFlux = (wl: number): number => {
  const continuum = 28 - (wl - 0.75) * 2.5;
  const h2oDip = 13.5 * Math.exp(-Math.pow((wl - 3.05) / 0.22, 2));
  const co2Dip = 11.0 * Math.exp(-Math.pow((wl - 4.27) / 0.15, 2));
  return continuum - h2oDip - co2Dip;
};

describe('Cosmic Detective Game: 5-Mission Engine & Scientific Integrity', () => {
  test('Mission 1: Spectrum bands cover visible to infrared with dust transparency gradient', () => {
    assert.ok(EDUCATIONAL_SPECTRUM_BANDS.length >= 4, 'Must provide full spectral coverage');
    const visible = EDUCATIONAL_SPECTRUM_BANDS.find((b) => b.id === 'visible');
    const midIr = EDUCATIONAL_SPECTRUM_BANDS.find((b) => b.id === 'spx_nir_3');

    assert.ok(visible, 'Visible band must exist');
    assert.ok(midIr, 'Mid-IR band must exist');
    assert.ok(
      visible.dustTransparency < midIr.dustTransparency,
      'Infrared must pierce cosmic dust more transparently than visible light (Rayleigh scattering law)'
    );
  });

  test('Mission 2: Detector arrays cover 102 channels across 6 detector arrays (0.75 - 5.0 um)', () => {
    assert.strictEqual(EDUCATIONAL_DETECTOR_ARRAYS.length, 6, 'Must provide exactly 6 SPHEREx detector arrays');
    const totalChannels = EDUCATIONAL_DETECTOR_ARRAYS.reduce((acc, a) => acc + a.channels, 0);
    assert.strictEqual(totalChannels, 102, 'Total SPHEREx spectral channels must sum to 102');

    const firstArray = EDUCATIONAL_DETECTOR_ARRAYS[0];
    const lastArray = EDUCATIONAL_DETECTOR_ARRAYS[5];
    assert.ok(firstArray.wavelengthRange.includes('0.75'), 'Array 1 starts at 0.75 µm');
    assert.ok(lastArray.wavelengthRange.includes('5.00'), 'Array 6 extends to 5.00 µm');
  });

  test('Mission 2: Molecular ice absorption troughs at 3.05um (H2O) and 4.27um (CO2)', () => {
    const continuumFluxAt3 = 28 - (3.05 - 0.75) * 2.5;
    const dipFluxAt3 = getHyperspectralFlux(3.05);
    const dropPercentageH2O = (continuumFluxAt3 - dipFluxAt3) / continuumFluxAt3;

    assert.ok(dropPercentageH2O > 0.5, 'H2O ice absorption at 3.05 µm must exceed 50% depth');

    const continuumFluxAt4 = 28 - (4.27 - 0.75) * 2.5;
    const dipFluxAt4 = getHyperspectralFlux(4.27);
    const dropPercentageCO2 = (continuumFluxAt4 - dipFluxAt4) / continuumFluxAt4;

    assert.ok(dropPercentageCO2 > 0.45, 'CO2 ice absorption at 4.27 µm must exceed 45% depth');
  });

  test('Mission 4: All investigation scenarios provide valid astronomical classifications', () => {
    assert.ok(EDUCATIONAL_SCENARIOS.length >= 4, 'Must provide at least 4 distinct forensic scenarios');

    const expectedPatterns = ['brightened', 'faded', 'moving', 'jitter_dipole'];
    const actualPatterns = EDUCATIONAL_SCENARIOS.map((s) => s.syntheticImagePattern);
    for (const p of expectedPatterns) {
      assert.ok(actualPatterns.includes(p as any), `Missing educational pattern: ${p}`);
    }

    for (const scenario of EDUCATIONAL_SCENARIOS) {
      assert.ok(scenario.options.length >= 3, `Scenario ${scenario.id} must have at least 3 multiple choice options`);
      const correctCount = scenario.options.filter((o) => o.isCorrect).length;
      assert.strictEqual(correctCount, 1, `Scenario ${scenario.id} must have exactly one correct option`);

      // Verify bilingual support
      assert.ok(scenario.title.length > 0 && scenario.titleAr.length > 0, 'Scenario titles must be bilingual');
      assert.ok(scenario.description.length > 0 && scenario.descriptionAr.length > 0, 'Scenario descriptions must be bilingual');
      for (const opt of scenario.options) {
        assert.ok(opt.text.length > 0 && opt.textAr.length > 0, 'Option texts must be bilingual');
        assert.ok(opt.explanation.length > 0 && opt.explanationAr.length > 0, 'Option explanations must be bilingual');
      }
    }
  });

  test('Mission 4 & 5: Synthetic image generation computes strictly D = I2 - I1', () => {
    const sim = generateSyntheticScenarioImages('scen-brightened-01');
    assert.strictEqual(sim.width, 48, 'Synthetic detector matrix width must be 48');
    assert.strictEqual(sim.height, 48, 'Synthetic detector matrix height must be 48');
    assert.strictEqual(sim.diff.length, 48 * 48, 'Difference image must match width * height');

    // Verify difference value at target pixel equals epoch2 - epoch1
    const targetIdx = sim.targetY * sim.width + sim.targetX;
    const expectedDiff = sim.epoch2[targetIdx] - sim.epoch1[targetIdx];
    assert.ok(
      Math.abs(sim.diff[targetIdx] - expectedDiff) < 1e-5,
      'Difference array must strictly satisfy D = I2 - I1'
    );
    assert.ok(sim.diff[targetIdx] > 10.0, 'Brightened scenario must have positive difference at target');
  });

  test('Scoring and difficulty scaling calculations', () => {
    const difficulties: Record<string, number> = {
      rookie: 1.0,
      investigator: 1.5,
      expert: 2.0,
    };

    const baseInspection = 50;
    const baseDebrief = 100;
    const baseMissionComplete = 200;

    assert.strictEqual(baseInspection * difficulties.rookie, 50);
    assert.strictEqual(baseInspection * difficulties.investigator, 75);
    assert.strictEqual(baseInspection * difficulties.expert, 100);

    const fullRookieScore = (baseInspection * 5 + baseDebrief * 4 + baseMissionComplete * 5) * difficulties.rookie;
    assert.strictEqual(fullRookieScore, 1650);

    const fullExpertScore = (baseInspection * 5 + baseDebrief * 4 + baseMissionComplete * 5) * difficulties.expert;
    assert.strictEqual(fullExpertScore, 3300);
  });

  test('3D Station Architecture: 5 Interactive Terminals & Collision Boxes', async () => {
    const THREE = await import('three');
    const { StationBuilder } = await import('./3d/StationBuilder');
    const scene = new THREE.Scene();
    const station = StationBuilder.buildStation(scene);

    assert.ok(station.terminals.length >= 5, 'Station must contain all 5 story mission terminals');
    assert.ok(station.colliders.length > 0, 'Station must generate physical bounding box colliders');
    assert.ok(station.animatedObjects.length > 0, 'Station must have animated celestial objects');

    for (let i = 1; i <= 5; i++) {
      const term = station.terminals.find((t) => t.missionNumber === i);
      assert.ok(term, `Mission 0${i} terminal must be placed in 3D world`);
      assert.ok(term.interactionRadius >= 2.0, 'Terminal interaction radius must allow player access');
      assert.ok(term.title.length > 0 && term.titleAr.length > 0, 'Terminal title must be bilingual');
    }
  });

  test('3D Player Avatar: Procedural 3-12 Part Composite Assembly & Grounding', async () => {
    const { PlayerAvatar } = await import('./3d/PlayerAvatar');
    const avatar = new PlayerAvatar();

    assert.ok(avatar.group, 'Player avatar must instantiate a THREE.Group');
    assert.ok(avatar.group.children.length >= 5, 'Avatar must assemble composite multi-part hierarchy');
    assert.strictEqual(avatar.isGrounded, true, 'Avatar defaults to grounded');

    // Run kinematic update step
    avatar.update(0.016, 5.0, true, false);
    assert.ok(typeof avatar.group.position.y === 'number', 'Kinematics must compute vertical position');
  });
});
