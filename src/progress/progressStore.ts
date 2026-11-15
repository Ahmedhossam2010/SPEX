import { useEffect, useState } from 'react';

export type ExplorerRank = 'Cadet' | 'Observer' | 'Navigator' | 'Analyst' | 'Discoverer';
export type XpSource = 'learning' | 'solving' | 'game';

export interface RankTier {
  rank: ExplorerRank;
  minXp: number;
  chapterUnlock: number;
}

export const RANK_TIERS: readonly RankTier[] = [
  { rank: 'Cadet', minXp: 0, chapterUnlock: 1 },
  { rank: 'Observer', minXp: 100, chapterUnlock: 2 },
  { rank: 'Navigator', minXp: 250, chapterUnlock: 3 },
  { rank: 'Analyst', minXp: 450, chapterUnlock: 4 },
  { rank: 'Discoverer', minXp: 700, chapterUnlock: 5 },
] as const;

export interface XpBreakdown {
  learning: number;
  solving: number;
  game: number;
  legacy: number;
}

export interface BadDataReport {
  id: string;
  frameId: string;
  obsId: string;
  detector: string;
  targetName: string;
  x: number;
  y: number;
  ra?: number;
  dec?: number;
  reason: string;
  reportedAt: string;
}

export interface ViewerActionsState {
  playedBlink: boolean;
  toggledDiff: boolean;
  inspectedSpot: boolean;
  changedBand: boolean;
  toggledSurveyPass: boolean;
  visitedWise0855: boolean;
  visitedBarnard: boolean;
}

export interface ProgressState {
  version: 1;
  xp: number;
  xpBreakdown: XpBreakdown;
  completedLevels: number[];
  completedChapters: number[];
  starsByChapter: Record<number, number>;
  completedMiniGames: string[];
  achievements: string[];
  badDataReports: BadDataReport[];
  migratedMissions: string[];
  migratedMilestones: string[];
  migratedLegacy: boolean;
  viewerActions: ViewerActionsState;
  updatedAt: string;
}

export const PROGRESS_STORAGE_KEY = 'spex_progress_v1';
export const LEGACY_MISSIONS_KEY = 'spex_explorer_missions';
export const LEGACY_MILESTONES_KEY = 'spex_explorer_milestones';
export const PROGRESS_UPDATED_EVENT = 'spex-progress-updated';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function createInitialProgressState(): ProgressState {
  return {
    version: 1,
    xp: 0,
    xpBreakdown: {
      learning: 0,
      solving: 0,
      game: 0,
      legacy: 0,
    },
    completedLevels: [],
    completedChapters: [],
    starsByChapter: {},
    completedMiniGames: [],
    achievements: [],
    badDataReports: [],
    migratedMissions: [],
    migratedMilestones: [],
    migratedLegacy: false,
    viewerActions: {
      playedBlink: false,
      toggledDiff: false,
      inspectedSpot: false,
      changedBand: false,
      toggledSurveyPass: false,
      visitedWise0855: false,
      visitedBarnard: false,
    },
    updatedAt: new Date(0).toISOString(),
  };
}

export function getRankForXp(xp: number): ExplorerRank {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  let current: ExplorerRank = 'Cadet';
  for (const tier of RANK_TIERS) {
    if (safeXp >= tier.minXp) {
      current = tier.rank;
    }
  }
  return current;
}

export function getMaxUnlockedChapter(xp: number): number {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  let chapter = 1;
  for (const tier of RANK_TIERS) {
    if (safeXp >= tier.minXp) {
      chapter = tier.chapterUnlock;
    }
  }
  return chapter;
}

export function getNextRankProgress(xp: number): {
  currentRank: ExplorerRank;
  nextRank: ExplorerRank | null;
  currentMinXp: number;
  nextMinXp: number | null;
  xpIntoTier: number;
  xpNeededForNext: number;
  progressRatio: number;
} {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  let idx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (safeXp >= RANK_TIERS[i].minXp) idx = i;
  }
  const current = RANK_TIERS[idx];
  const next = RANK_TIERS[idx + 1] ?? null;
  if (!next) {
    return {
      currentRank: current.rank,
      nextRank: null,
      currentMinXp: current.minXp,
      nextMinXp: null,
      xpIntoTier: safeXp - current.minXp,
      xpNeededForNext: 0,
      progressRatio: 1,
    };
  }
  const span = Math.max(1, next.minXp - current.minXp);
  const into = Math.max(0, safeXp - current.minXp);
  return {
    currentRank: current.rank,
    nextRank: next.rank,
    currentMinXp: current.minXp,
    nextMinXp: next.minXp,
    xpIntoTier: into,
    xpNeededForNext: Math.max(0, next.minXp - safeXp),
    progressRatio: Math.min(1, into / span),
  };
}

function sanitizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return Array.from(new Set(val.filter((v): v is string => typeof v === 'string' && v.length > 0)));
}

function sanitizeNumberArray(val: unknown): number[] {
  if (!Array.isArray(val)) return [];
  return Array.from(
    new Set(val.filter((v): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0))
  ).sort((a, b) => a - b);
}

function sanitizeBreakdown(raw: unknown, fallbackXp: number): XpBreakdown {
  if (!raw || typeof raw !== 'object') {
    return { learning: 0, solving: fallbackXp, game: 0, legacy: 0 };
  }
  const b = raw as Record<string, unknown>;
  const safeNum = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  return {
    learning: safeNum(b.learning),
    solving: safeNum(b.solving),
    game: safeNum(b.game),
    legacy: safeNum(b.legacy),
  };
}

function sanitizeStarsMap(raw: unknown): Record<number, number> {
  const out: Record<number, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const ch = Number(k);
    const st = Number(v);
    if (Number.isInteger(ch) && ch > 0 && Number.isFinite(st)) {
      out[ch] = Math.max(1, Math.min(3, Math.floor(st)));
    }
  }
  return out;
}

function sanitizeReports(raw: unknown): BadDataReport[] {
  if (!Array.isArray(raw)) return [];
  const valid: BadDataReport[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (typeof r.frameId !== 'string' || typeof r.obsId !== 'string') continue;
    valid.push({
      id: typeof r.id === 'string' ? r.id : `${r.frameId}-${valid.length}`,
      frameId: r.frameId,
      obsId: r.obsId,
      detector: typeof r.detector === 'string' ? r.detector : 'D1',
      targetName: typeof r.targetName === 'string' ? r.targetName : 'Target',
      x: typeof r.x === 'number' && Number.isFinite(r.x) ? r.x : 0,
      y: typeof r.y === 'number' && Number.isFinite(r.y) ? r.y : 0,
      ra: typeof r.ra === 'number' && Number.isFinite(r.ra) ? r.ra : undefined,
      dec: typeof r.dec === 'number' && Number.isFinite(r.dec) ? r.dec : undefined,
      reason: typeof r.reason === 'string' ? r.reason.slice(0, 140) : 'Artifact / bad frame',
      reportedAt: typeof r.reportedAt === 'string' ? r.reportedAt : new Date().toISOString(),
    });
    if (valid.length >= 100) break;
  }
  return valid;
}

export function normalizeProgressState(raw: unknown): ProgressState {
  const base = createInitialProgressState();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  const rawActions = (obj.viewerActions && typeof obj.viewerActions === 'object'
    ? obj.viewerActions
    : {}) as Record<string, unknown>;

  const safeXp =
    typeof obj.xp === 'number' && Number.isFinite(obj.xp) ? Math.max(0, Math.floor(obj.xp)) : 0;

  return {
    version: 1,
    xp: safeXp,
    xpBreakdown: sanitizeBreakdown(obj.xpBreakdown, safeXp),
    completedLevels: sanitizeNumberArray(obj.completedLevels),
    completedChapters: sanitizeNumberArray(obj.completedChapters),
    starsByChapter: sanitizeStarsMap(obj.starsByChapter),
    completedMiniGames: sanitizeStringArray(obj.completedMiniGames),
    achievements: sanitizeStringArray(obj.achievements),
    badDataReports: sanitizeReports(obj.badDataReports),
    migratedMissions: sanitizeStringArray(obj.migratedMissions),
    migratedMilestones: sanitizeStringArray(obj.migratedMilestones),
    migratedLegacy: Boolean(obj.migratedLegacy),
    viewerActions: {
      playedBlink: Boolean(rawActions.playedBlink),
      toggledDiff: Boolean(rawActions.toggledDiff),
      inspectedSpot: Boolean(rawActions.inspectedSpot),
      changedBand: Boolean(rawActions.changedBand),
      toggledSurveyPass: Boolean(rawActions.toggledSurveyPass),
      visitedWise0855: Boolean(rawActions.visitedWise0855),
      visitedBarnard: Boolean(rawActions.visitedBarnard),
    },
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
  };
}

function readLegacyArray(storage: StorageLike, key: string): string[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeStringArray(parsed);
  } catch {
    return [];
  }
}

export function migrateLegacyStorage(state: ProgressState, storage: StorageLike | null): ProgressState {
  if (!storage) return state;

  const legacyMissions = readLegacyArray(storage, LEGACY_MISSIONS_KEY);
  const legacyMilestones = readLegacyArray(storage, LEGACY_MILESTONES_KEY);

  const newMissions = legacyMissions.filter((m) => !state.migratedMissions.includes(m));
  const newMilestones = legacyMilestones.filter((m) => !state.migratedMilestones.includes(m));

  if (state.migratedLegacy && newMissions.length === 0 && newMilestones.length === 0) {
    return state;
  }

  const missionXp = newMissions.length * 40;
  const milestoneXp = newMilestones.length * 20;
  const addedXp = missionXp + milestoneXp;
  const newAchievements = [...state.achievements];
  for (const m of newMissions) {
    newAchievements.push(`mission:${m}`);
  }
  if (newMissions.length > 0 && !newAchievements.includes('legacy_explorer')) {
    newAchievements.push('legacy_explorer');
  }

  return {
    ...state,
    xp: state.xp + addedXp,
    xpBreakdown: {
      ...state.xpBreakdown,
      legacy: state.xpBreakdown.legacy + addedXp,
    },
    migratedMissions: Array.from(new Set([...state.migratedMissions, ...newMissions])),
    migratedMilestones: Array.from(new Set([...state.migratedMilestones, ...newMilestones])),
    achievements: Array.from(new Set(newAchievements)),
    migratedLegacy: true,
    updatedAt: new Date().toISOString(),
  };
}

let cachedBrowserRaw: string | null = null;
let cachedBrowserState: ProgressState | null = null;
let emitScheduled = false;

export function loadProgress(storage: StorageLike | null = getDefaultStorage()): ProgressState {
  const isBrowserDefault =
    typeof window !== 'undefined' && storage !== null && storage === getDefaultStorage();
  let state = createInitialProgressState();
  if (storage) {
    try {
      const raw = storage.getItem(PROGRESS_STORAGE_KEY);
      if (raw) {
        if (isBrowserDefault && raw === cachedBrowserRaw && cachedBrowserState) {
          return cachedBrowserState;
        }
        state = normalizeProgressState(JSON.parse(raw));
        if (isBrowserDefault) {
          cachedBrowserRaw = raw;
          cachedBrowserState = state;
        }
      }
    } catch {
      state = createInitialProgressState();
    }
  }
  const migrated = migrateLegacyStorage(state, storage);
  if (migrated !== state && storage) {
    saveProgress(migrated, storage, false);
  }
  return migrated;
}

function emitProgressUpdated() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    if (emitScheduled) return;
    emitScheduled = true;
    const flush = () => {
      emitScheduled = false;
      try {
        window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT));
      } catch {
        // ignore event dispatch errors in non-DOM test environments
      }
    };
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(flush);
    } else {
      flush();
    }
  }
}

export function saveProgress(
  state: ProgressState,
  storage: StorageLike | null = getDefaultStorage(),
  notify = true
): ProgressState {
  const normalized: ProgressState = {
    ...normalizeProgressState(state),
    updatedAt: new Date().toISOString(),
  };
  const isBrowserDefault =
    typeof window !== 'undefined' && storage !== null && storage === getDefaultStorage();
  if (storage) {
    try {
      const serialized = JSON.stringify(normalized);
      storage.setItem(PROGRESS_STORAGE_KEY, serialized);
      if (isBrowserDefault) {
        cachedBrowserRaw = serialized;
        cachedBrowserState = normalized;
      }
    } catch {
      // ignore quota / restricted storage errors
    }
  }
  if (notify) emitProgressUpdated();
  return normalized;
}

export function awardXp(
  amount: number,
  achievementId?: string,
  storage: StorageLike | null = getDefaultStorage(),
  source: XpSource = 'solving'
): ProgressState {
  const cur = loadProgress(storage);
  const delta = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  const achievements = achievementId
    ? Array.from(new Set([...cur.achievements, achievementId]))
    : cur.achievements;
  return saveProgress(
    {
      ...cur,
      xp: cur.xp + delta,
      xpBreakdown: {
        ...cur.xpBreakdown,
        [source]: cur.xpBreakdown[source] + delta,
      },
      achievements,
    },
    storage
  );
}

export function completeAcademyLevel(
  levelId: number,
  xpReward: number,
  storage: StorageLike | null = getDefaultStorage()
): { state: ProgressState; newlyCompleted: boolean } {
  const cur = loadProgress(storage);
  const already = cur.completedLevels.includes(levelId);
  const delta = already ? 0 : Math.max(0, Math.floor(xpReward));
  const nextLevels = already ? cur.completedLevels : [...cur.completedLevels, levelId].sort((a, b) => a - b);
  const nextAchievements = Array.from(
    new Set([
      ...cur.achievements,
      `academy_level_${levelId}`,
      ...(nextLevels.length >= 5 ? ['academy_graduate'] : []),
    ])
  );
  const next = saveProgress(
    {
      ...cur,
      xp: cur.xp + delta,
      xpBreakdown: {
        ...cur.xpBreakdown,
        learning: cur.xpBreakdown.learning + delta,
      },
      completedLevels: nextLevels,
      achievements: nextAchievements,
    },
    storage
  );
  return { state: next, newlyCompleted: !already };
}

export function completeMiniGame(
  gameId: string,
  xpReward: number,
  storage: StorageLike | null = getDefaultStorage()
): { state: ProgressState; newlyCompleted: boolean } {
  const cur = loadProgress(storage);
  const already = cur.completedMiniGames.includes(gameId);
  const delta = already ? 0 : Math.max(0, Math.floor(xpReward));
  const nextGames = already ? cur.completedMiniGames : [...cur.completedMiniGames, gameId];
  const nextAchievements = Array.from(
    new Set([
      ...cur.achievements,
      `minigame:${gameId}`,
      ...(nextGames.length >= 3 ? ['arcade_master'] : []),
    ])
  );
  const next = saveProgress(
    {
      ...cur,
      xp: cur.xp + delta,
      xpBreakdown: {
        ...cur.xpBreakdown,
        game: cur.xpBreakdown.game + delta,
      },
      completedMiniGames: nextGames,
      achievements: nextAchievements,
    },
    storage
  );
  return { state: next, newlyCompleted: !already };
}

export function completeChapter(
  chapterNum: number,
  xpReward: number,
  storage: StorageLike | null = getDefaultStorage(),
  stars = 3
): { state: ProgressState; newlyCompleted: boolean } {
  const cur = loadProgress(storage);
  const already = cur.completedChapters.includes(chapterNum);
  const delta = already ? 0 : Math.max(0, Math.floor(xpReward));
  const clampedStars = Math.max(1, Math.min(3, Math.floor(stars)));
  const prevStars = cur.starsByChapter[chapterNum] || 0;
  const nextChapters = already
    ? cur.completedChapters
    : [...cur.completedChapters, chapterNum].sort((a, b) => a - b);
  const nextAchievements = Array.from(
    new Set([
      ...cur.achievements,
      `chapter_${chapterNum}`,
      ...(nextChapters.length >= 5 ? ['signal_recovered'] : []),
    ])
  );
  const next = saveProgress(
    {
      ...cur,
      xp: cur.xp + delta,
      xpBreakdown: {
        ...cur.xpBreakdown,
        game: cur.xpBreakdown.game + delta,
      },
      completedChapters: nextChapters,
      starsByChapter: {
        ...cur.starsByChapter,
        [chapterNum]: Math.max(prevStars, clampedStars),
      },
      achievements: nextAchievements,
    },
    storage
  );
  return { state: next, newlyCompleted: !already };
}

export function recordViewerAction(
  action: keyof ViewerActionsState,
  storage: StorageLike | null = getDefaultStorage()
): ProgressState {
  const cur = loadProgress(storage);
  if (cur.viewerActions[action]) return cur;
  const nextViewerActions: ViewerActionsState = {
    ...cur.viewerActions,
    [action]: true,
  };
  const nextAchievements = [...cur.achievements];
  if (action === 'playedBlink' && !nextAchievements.includes('first_blink')) {
    nextAchievements.push('first_blink');
  }
  if (action === 'toggledDiff' && !nextAchievements.includes('diff_detective')) {
    nextAchievements.push('diff_detective');
  }
  if (action === 'toggledSurveyPass' && !nextAchievements.includes('pass_grouper')) {
    nextAchievements.push('pass_grouper');
  }
  return saveProgress(
    {
      ...cur,
      xp: cur.xp + 15,
      xpBreakdown: {
        ...cur.xpBreakdown,
        solving: cur.xpBreakdown.solving + 15,
      },
      viewerActions: nextViewerActions,
      achievements: nextAchievements,
    },
    storage
  );
}

export function addBadDataReport(
  report: Omit<BadDataReport, 'id' | 'reportedAt'>,
  storage: StorageLike | null = getDefaultStorage()
): ProgressState {
  const cur = loadProgress(storage);
  const firstReport = cur.badDataReports.length === 0;
  const bonus = firstReport ? 15 : 0;
  const entry: BadDataReport = {
    ...report,
    id: `${report.frameId}_${Date.now()}`,
    reportedAt: new Date().toISOString(),
  };
  const nextReports = [entry, ...cur.badDataReports].slice(0, 100);
  const achievements = firstReport
    ? Array.from(new Set([...cur.achievements, 'bad_data_reporter']))
    : cur.achievements;
  return saveProgress(
    {
      ...cur,
      xp: cur.xp + bonus,
      xpBreakdown: {
        ...cur.xpBreakdown,
        solving: cur.xpBreakdown.solving + bonus,
      },
      badDataReports: nextReports,
      achievements,
    },
    storage
  );
}

export function unlockAchievement(
  achievementId: string,
  xpBonus = 0,
  storage: StorageLike | null = getDefaultStorage(),
  source: XpSource = 'solving'
): ProgressState {
  const cur = loadProgress(storage);
  if (cur.achievements.includes(achievementId)) return cur;
  const delta = Math.max(0, Math.floor(xpBonus));
  return saveProgress(
    {
      ...cur,
      xp: cur.xp + delta,
      xpBreakdown: {
        ...cur.xpBreakdown,
        [source]: cur.xpBreakdown[source] + delta,
      },
      achievements: [...cur.achievements, achievementId],
    },
    storage
  );
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());

  useEffect(() => {
    const sync = () => {
      const next = loadProgress();
      setProgress((prev) => {
        if (
          prev.updatedAt === next.updatedAt &&
          prev.xp === next.xp &&
          prev.completedLevels.length === next.completedLevels.length &&
          prev.completedChapters.length === next.completedChapters.length &&
          prev.completedMiniGames.length === next.completedMiniGames.length
        ) {
          return prev;
        }
        return next;
      });
    };
    window.addEventListener(PROGRESS_UPDATED_EVENT, sync);
    window.addEventListener('spex-missions-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(PROGRESS_UPDATED_EVENT, sync);
      window.removeEventListener('spex-missions-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const rankInfo = getNextRankProgress(progress.xp);
  const maxUnlockedChapter = getMaxUnlockedChapter(progress.xp);

  return {
    progress,
    rank: rankInfo.currentRank,
    rankInfo,
    maxUnlockedChapter,
    awardXp: (amount: number, achievementId?: string, source: XpSource = 'solving') =>
      setProgress(awardXp(amount, achievementId, undefined, source)),
    completeAcademyLevel: (levelId: number, xpReward: number) => {
      const res = completeAcademyLevel(levelId, xpReward);
      setProgress(res.state);
      return res;
    },
    completeMiniGame: (gameId: string, xpReward: number) => {
      const res = completeMiniGame(gameId, xpReward);
      setProgress(res.state);
      return res;
    },
    completeChapter: (chapterNum: number, xpReward: number, stars = 3) => {
      const res = completeChapter(chapterNum, xpReward, undefined, stars);
      setProgress(res.state);
      return res;
    },
    recordViewerAction: (action: keyof ViewerActionsState) => setProgress(recordViewerAction(action)),
    addBadDataReport: (report: Omit<BadDataReport, 'id' | 'reportedAt'>) =>
      setProgress(addBadDataReport(report)),
    unlockAchievement: (achievementId: string, xpBonus?: number, source: XpSource = 'solving') =>
      setProgress(unlockAchievement(achievementId, xpBonus, undefined, source)),
  };
}
