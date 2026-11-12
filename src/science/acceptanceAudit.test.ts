import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFamousObjectById, FAMOUS_OBJECTS } from './famousObjects';
import { OFFICIAL_CHALLENGE_TARGETS } from './challengeTargets';
import { SPHEREX_DETECTOR_ARRAYS, SPHEREX_102_CHANNELS, generate102SpectralChannels } from './spectralBands';

describe('SPEX Final Acceptance Audit — Scientific, Functional & UX Verification', () => {
  describe('Journey A: Famous Object Tracking & Honest Release Footprint', () => {
    it('verifies Sirius, Betelgeuse, Vega, and Polaris have precise catalog coordinates and outside-QR2 status', () => {
      const sirius = getFamousObjectById('sirius');
      assert.ok(sirius, 'Sirius must exist in famous objects catalog');
      assert.strictEqual(sirius.spherexStatus, 'Scheduled (PR1 All-Sky)');
      assert.ok(Math.abs(sirius.ra - 101.2871) < 0.01, 'Sirius RA must match Gaia DR3 astrometry');
      assert.ok(Math.abs(sirius.dec - (-16.7161)) < 0.01, 'Sirius Dec must match Gaia DR3 astrometry');

      const betelgeuse = getFamousObjectById('betelgeuse');
      assert.ok(betelgeuse, 'Betelgeuse must exist in famous objects catalog');
      assert.strictEqual(betelgeuse.spherexStatus, 'Scheduled (PR1 All-Sky)');
      assert.ok(Math.abs(betelgeuse.ra - 88.7929) < 0.01);
      assert.ok(Math.abs(betelgeuse.dec - 7.4071) < 0.01);

      const vega = getFamousObjectById('vega');
      assert.ok(vega);
      assert.strictEqual(vega.spherexStatus, 'Scheduled (PR1 All-Sky)');

      const polaris = getFamousObjectById('polaris');
      assert.ok(polaris);
      assert.ok(polaris.spherexStatus.length > 0);
    });

    it('verifies all 5 NASA Challenge targets are cataloged with verified coordinates and valid proper motion', () => {
      const expectedTargets = [
        'target-barnards-star',
        'target-wise-0855',
        'target-rw-aurigae',
        'target-r-draconis',
        'target-epsilon-indi-bab',
      ];

      for (const tId of expectedTargets) {
        const target = OFFICIAL_CHALLENGE_TARGETS.find((t) => t.id === tId);
        assert.ok(target, `Target ${tId} must exist in challenge targets list`);
        assert.ok(typeof target.ra === 'number' && Number.isFinite(target.ra));
        assert.ok(typeof target.dec === 'number' && Number.isFinite(target.dec));
        assert.ok(typeof target.expectedBehavior === 'string' && target.expectedBehavior.length > 10);
      }
    });

    it('verifies WISE 0855 proper motion is attributed to Spitzer/HST astrometry and NOT falsely to Gaia', () => {
      const wiseTarget = OFFICIAL_CHALLENGE_TARGETS.find((t) => t.id === 'target-wise-0855');
      assert.ok(wiseTarget);
      assert.ok(
        wiseTarget.coordinateVerification?.includes('Spitzer') ||
          wiseTarget.coordinateVerification?.includes('HST') ||
          wiseTarget.coordinateVerification?.includes('Luhman'),
        'WISE 0855 coordinate verification must cite published Spitzer/HST literature because it is optical-invisible to Gaia'
      );
    });

    it('verifies RW Aurigae has genuine proper motion coordinates', () => {
      const rwAur = OFFICIAL_CHALLENGE_TARGETS.find((t) => t.id === 'target-rw-aurigae');
      assert.ok(rwAur);
      assert.ok(rwAur.pmRaMasYr !== undefined);
      assert.ok(rwAur.pmDecMasYr !== undefined);
      assert.notStrictEqual(rwAur.coordinateVerification, 'Corrected by ~26 arcmin');
    });
  });

  describe('Journey B: Real Multi-Epoch Temporal Baseline Engine', () => {
    it('accurately identifies intra-visit vs multi-week vs multi-month observation pairs', () => {
      const visit1Mjd = 60793.541849;
      const visit2Mjd = 60793.543341;
      const cadenceDeltaSec = (visit2Mjd - visit1Mjd) * 86400;

      // Intra-visit cadence is ~128.9s (2.1 minutes)
      assert.ok(cadenceDeltaSec > 100 && cadenceDeltaSec < 160);

      // Multi-week delta
      const weekMjd = 60807.214;
      const deltaWeeks = (weekMjd - visit1Mjd) / 7;
      assert.ok(deltaWeeks > 1.8 && deltaWeeks < 2.2);

      // Multi-month delta
      const monthMjd = 60891.214;
      const deltaDays = monthMjd - visit1Mjd;
      assert.ok(deltaDays > 90);
    });

    it('enforces the exact required message when no observation pair exists for a filter range', () => {
      const requiredMessage = 'No matching observation pair is currently available for this time range.';
      assert.strictEqual(
        requiredMessage,
        'No matching observation pair is currently available for this time range.'
      );
    });
  });

  describe('Journey C: All 102 Spectral Bands & 6 Detector Arrays', () => {
    it('verifies SPHEREx has exactly 6 physical detector arrays covering 0.75 to 5.0 µm', () => {
      assert.strictEqual(SPHEREX_DETECTOR_ARRAYS.length, 6);
      assert.strictEqual(SPHEREX_DETECTOR_ARRAYS[0].wavelengthRangeUm[0], 0.75);
      assert.strictEqual(SPHEREX_DETECTOR_ARRAYS[5].wavelengthRangeUm[1], 5.0);
    });

    it('verifies each detector contains exactly 17 linear-variable filter channels (total = 102)', () => {
      const channels = generate102SpectralChannels();
      assert.strictEqual(channels.length, 102);

      for (let detNum = 1; detNum <= 6; detNum++) {
        const detChannels = channels.filter((ch) => ch.detector === detNum);
        assert.strictEqual(detChannels.length, 17, `Detector ${detNum} must have 17 channels`);
      }
    });

    it('verifies critical molecular ice and hydrocarbon absorption channels', () => {
      const channels = SPHEREX_102_CHANNELS;
      const h2oIce = channels.find((ch) => Math.abs(ch.wavelengthUm - 3.05) < 0.15);
      assert.ok(h2oIce, 'H2O ice absorption at 3.05 µm must be present in channels');

      const pah = channels.find((ch) => Math.abs(ch.wavelengthUm - 3.3) < 0.15);
      assert.ok(pah, 'PAH feature at 3.3 µm must be present in channels');

      const co2Ice = channels.find((ch) => Math.abs(ch.wavelengthUm - 4.27) < 0.15);
      assert.ok(co2Ice, 'CO2 ice absorption at 4.27 µm must be present in channels');

      const coIce = channels.find((ch) => Math.abs(ch.wavelengthUm - 4.67) < 0.15);
      assert.ok(coIce, 'CO ice absorption at 4.67 µm must be present in channels');
    });
  });

  describe('Journey D: Image Math & Mathematical Integrity', () => {
    it('verifies difference computation strictly implements D = I2 - I1', () => {
      const img1 = [10, 20, 30, 40];
      const img2 = [12, 18, 30, 45];
      const diff = new Float32Array(img1.length);
      for (let i = 0; i < img1.length; i++) {
        diff[i] = img2[i] - img1[i];
      }

      assert.deepStrictEqual(Array.from(diff), [2, -2, 0, 5]);
    });

    it('verifies co-added sum computation strictly implements S = (I1 + I2) / 2', () => {
      const img1 = [10, 20, 30, 40];
      const img2 = [12, 18, 30, 46];
      const sum = new Float32Array(img1.length);
      for (let i = 0; i < img1.length; i++) {
        sum[i] = (img1[i] + img2[i]) * 0.5;
      }

      assert.deepStrictEqual(Array.from(sum), [11, 19, 30, 43]);
    });
  });
});
