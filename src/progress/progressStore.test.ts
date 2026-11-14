import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROGRESS_STORAGE_KEY,
  LEGACY_MISSIONS_KEY,
  LEGACY_MILESTONES_KEY,
  StorageLike,
  getRankForXp,
  getNextRankProgress,
  getMaxUnlockedChapter,
  loadProgress,
  awardXp,
  completeAcademyLevel,
  completeMiniGame,
  completeChapter,
  recordViewerAction,
  addBadDataReport,
} from './progressStore';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

describe('progressStore: XP, Ranks, Legacy Migration, Corrupted Storage', () => {
  test('computes rank thresholds accurately across all 5 ranks', () => {
    assert.strictEqual(getRankForXp(-25), 'Cadet');
    assert.strictEqual(getRankForXp(0), 'Cadet');
    assert.strictEqual(getRankForXp(99), 'Cadet');
    assert.strictEqual(getRankForXp(100), 'Observer');
    assert.strictEqual(getRankForXp(249), 'Observer');
    assert.strictEqual(getRankForXp(250), 'Navigator');
    assert.strictEqual(getRankForXp(449), 'Navigator');
    assert.strictEqual(getRankForXp(450), 'Analyst');
    assert.strictEqual(getRankForXp(699), 'Analyst');
    assert.strictEqual(getRankForXp(700), 'Discoverer');
    assert.strictEqual(getRankForXp(5000), 'Discoverer');
  });

  test('computes next rank progress ratio and chapter unlocks cleanly', () => {
    const info = getNextRankProgress(175);
    assert.strictEqual(info.currentRank, 'Observer');
    assert.strictEqual(info.nextRank, 'Navigator');
    assert.strictEqual(info.xpIntoTier, 75);
    assert.strictEqual(info.xpNeededForNext, 75);
    assert.strictEqual(info.progressRatio, 0.5);

    assert.strictEqual(getMaxUnlockedChapter(0), 1);
    assert.strictEqual(getMaxUnlockedChapter(100), 2);
    assert.strictEqual(getMaxUnlockedChapter(250), 3);
    assert.strictEqual(getMaxUnlockedChapter(450), 4);
    assert.strictEqual(getMaxUnlockedChapter(700), 5);
  });

  test('migrates legacy spex_explorer_missions and spex_explorer_milestones idempotently', () => {
    const store = createMemoryStorage({
      [LEGACY_MISSIONS_KEY]: JSON.stringify(['motion', 'brown_dwarf']),
      [LEGACY_MILESTONES_KEY]: JSON.stringify(['first_look', 'infrared_light', 'comparing_observations']),
    });

    const first = loadProgress(store);
    // 2 missions * 40 XP + 3 milestones * 20 XP = 140 XP -> Observer
    assert.strictEqual(first.xp, 140);
    assert.strictEqual(first.xpBreakdown.legacy, 140);
    assert.strictEqual(getRankForXp(first.xp), 'Observer');
    assert.strictEqual(first.migratedLegacy, true);
    assert.deepStrictEqual(first.migratedMissions, ['motion', 'brown_dwarf']);
    assert.strictEqual(first.migratedMilestones.length, 3);

    // Loading again must NOT double-award XP
    const second = loadProgress(store);
    assert.strictEqual(second.xp, 140);
  });

  test('recovers safely from corrupted JSON in progress and legacy keys', () => {
    const store = createMemoryStorage({
      [PROGRESS_STORAGE_KEY]: '{not-valid-json!!!',
      [LEGACY_MISSIONS_KEY]: 'corrupt[[',
      [LEGACY_MILESTONES_KEY]: '12345',
    });

    const state = loadProgress(store);
    assert.strictEqual(state.version, 1);
    assert.strictEqual(state.xp, 0);
    assert.deepStrictEqual(state.completedLevels, []);

    const updated = awardXp(120, 'first_pass', store);
    assert.strictEqual(updated.xp, 120);
    assert.ok(updated.achievements.includes('first_pass'));
  });

  test('tracks 3 XP sources (Learning, Solving, Game), chapter stars, and prevents double-awards', () => {
    const store = createMemoryStorage();

    const lvl1 = completeAcademyLevel(0, 120, store);
    assert.strictEqual(lvl1.newlyCompleted, true);
    assert.strictEqual(lvl1.state.xp, 120);
    assert.strictEqual(lvl1.state.xpBreakdown.learning, 120);

    const lvl1Repeat = completeAcademyLevel(0, 120, store);
    assert.strictEqual(lvl1Repeat.newlyCompleted, false);
    assert.strictEqual(lvl1Repeat.state.xp, 120);

    const mg = completeMiniGame('constellation', 75, store);
    assert.strictEqual(mg.newlyCompleted, true);
    assert.strictEqual(mg.state.xp, 195);
    assert.strictEqual(mg.state.xpBreakdown.game, 75);

    const ch = completeChapter(1, 60, store, 2);
    assert.strictEqual(ch.newlyCompleted, true);
    assert.strictEqual(ch.state.xp, 255);
    assert.strictEqual(ch.state.xpBreakdown.game, 135);
    assert.strictEqual(ch.state.starsByChapter[1], 2);
    assert.strictEqual(getRankForXp(ch.state.xp), 'Navigator');

    // Replaying with 3 stars upgrades stars without re-awarding XP
    const chUp = completeChapter(1, 60, store, 3);
    assert.strictEqual(chUp.state.xp, 255);
    assert.strictEqual(chUp.state.starsByChapter[1], 3);

    const acted = recordViewerAction('playedBlink', store);
    assert.strictEqual(acted.viewerActions.playedBlink, true);
    assert.strictEqual(acted.xp, 270);
    assert.strictEqual(acted.xpBreakdown.solving, 15);

    // Repeat viewer action does not duplicate XP
    const actedAgain = recordViewerAction('playedBlink', store);
    assert.strictEqual(actedAgain.xp, 270);

    // Reporting bad data awards +15 solving XP once and records report locally
    const reported = addBadDataReport(
      {
        frameId: 'OBS-1-D5',
        obsId: 'OBS-1',
        detector: 'D5',
        targetName: 'WISE 0855',
        x: 32,
        y: 31,
        reason: 'Cosmic ray spike',
      },
      store
    );
    assert.strictEqual(reported.badDataReports.length, 1);
    assert.strictEqual(reported.xpBreakdown.solving, 30);
    assert.strictEqual(
      reported.xpBreakdown.learning +
        reported.xpBreakdown.solving +
        reported.xpBreakdown.game +
        reported.xpBreakdown.legacy,
      reported.xp
    );
  });

  test('handles throwing storage gracefully without crashing', () => {
    const throwingStorage: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const s = loadProgress(throwingStorage);
    assert.strictEqual(s.xp, 0);
    const s2 = awardXp(50, 'offline_ok', throwingStorage);
    assert.strictEqual(s2.xp, 50);
  });
});
