export type CommunityRank = 'Cadet' | 'Observer' | 'Navigator' | 'Analyst' | 'Discoverer';

export interface CommunityComment {
  id: string;
  nickname: string;
  text: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  nickname: string;
  rank: CommunityRank;
  xp: number;
  target: string;
  caseId?: string;
  ra?: number;
  dec?: number;
  note: string;
  createdAt: string;
  reports: number;
  comments: CommunityComment[];
}

export interface CommunityFlagEntry {
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

export interface CommunityStoreData {
  version: 1;
  posts: CommunityPost[];
  flags: CommunityFlagEntry[];
}

export const COMMUNITY_NICKNAME_REGEX = /^[A-Za-z0-9 _-]{2,20}$/;

const VALID_RANKS = new Set<CommunityRank>([
  'Cadet',
  'Observer',
  'Navigator',
  'Analyst',
  'Discoverer',
]);

// Light word-boundary profanity filter for kid-safe citizen science board
const BLOCKED_TERMS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'dick',
  'porn',
  'nazi',
  'kill yourself',
];

export function sanitizePlainText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function containsProfanityOrUnsafe(text: string): boolean {
  const lower = text.toLowerCase();
  if (lower.includes('@') || lower.includes('http://') || lower.includes('https://')) {
    return true;
  }
  return BLOCKED_TERMS.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(lower));
}

export function validateCommunityNickname(raw: unknown): { ok: true; nickname: string } | { ok: false; error: string } {
  const nickname = typeof raw === 'string' ? raw.trim() : '';
  if (!COMMUNITY_NICKNAME_REGEX.test(nickname)) {
    return {
      ok: false,
      error: 'Nickname must be 2–20 alphanumeric characters, spaces, underscores, or hyphens (no email/links).',
    };
  }
  if (containsProfanityOrUnsafe(nickname)) {
    return { ok: false, error: 'Nickname contains disallowed words or symbols.' };
  }
  return { ok: true, nickname };
}

export function validatePostInput(body: Record<string, unknown>):
  | {
      ok: true;
      post: Omit<CommunityPost, 'id' | 'createdAt' | 'reports' | 'comments'>;
    }
  | { ok: false; error: string } {
  const nickRes = validateCommunityNickname(body?.nickname);
  if (!nickRes.ok) return nickRes;

  const target = sanitizePlainText(body?.target, 80);
  if (target.length < 2) {
    return { ok: false, error: 'Target or sky coordinates must be at least 2 characters.' };
  }
  if (containsProfanityOrUnsafe(target)) {
    return { ok: false, error: 'Target field contains disallowed text or links.' };
  }

  const note = sanitizePlainText(body?.note, 280);
  if (note.length < 4) {
    return { ok: false, error: 'Discovery note must be 4–280 characters.' };
  }
  if (containsProfanityOrUnsafe(note)) {
    return { ok: false, error: 'Note contains disallowed words, emails, or external links.' };
  }

  const rawXp = Number(body?.xp);
  const xp = Number.isFinite(rawXp) ? Math.max(0, Math.min(100000, Math.floor(rawXp))) : 0;
  const rawRank = body?.rank as CommunityRank;
  const rank: CommunityRank = VALID_RANKS.has(rawRank) ? rawRank : 'Cadet';

  const caseId =
    typeof body?.caseId === 'string' && /^[a-z0-9-]{2,48}$/i.test(body.caseId)
      ? body.caseId
      : undefined;
  const ra = typeof body?.ra === 'number' && Number.isFinite(body.ra) ? body.ra : undefined;
  const dec = typeof body?.dec === 'number' && Number.isFinite(body.dec) ? body.dec : undefined;

  return {
    ok: true,
    post: {
      nickname: nickRes.nickname,
      rank,
      xp,
      target,
      caseId,
      ra,
      dec,
      note,
    },
  };
}

export function validateCommentInput(body: Record<string, unknown>):
  | { ok: true; nickname: string; text: string }
  | { ok: false; error: string } {
  const nickRes = validateCommunityNickname(body?.nickname);
  if (!nickRes.ok) return nickRes;

  const text = sanitizePlainText(body?.text, 240);
  if (text.length < 2) {
    return { ok: false, error: 'Comment must be 2–240 characters.' };
  }
  if (containsProfanityOrUnsafe(text)) {
    return { ok: false, error: 'Comment contains disallowed words, emails, or links.' };
  }
  return { ok: true, nickname: nickRes.nickname, text };
}

export function validateFlagInput(body: Record<string, unknown>):
  | { ok: true; flag: Omit<CommunityFlagEntry, 'id' | 'reportedAt'> }
  | { ok: false; error: string } {
  const frameId = sanitizePlainText(body?.frameId, 80);
  const obsId = sanitizePlainText(body?.obsId, 80);
  if (!frameId || !obsId) {
    return { ok: false, error: 'frameId and obsId are required.' };
  }
  const detector = sanitizePlainText(body?.detector, 12) || 'D1';
  const targetName = sanitizePlainText(body?.targetName, 80) || 'Unknown Target';
  const reason = sanitizePlainText(body?.reason, 140) || 'Cosmic-ray / detector artifact';
  if (containsProfanityOrUnsafe(reason)) {
    return { ok: false, error: 'Reason contains disallowed words or links.' };
  }
  const x = typeof body?.x === 'number' && Number.isFinite(body.x) ? Number(body.x.toFixed(2)) : 0;
  const y = typeof body?.y === 'number' && Number.isFinite(body.y) ? Number(body.y.toFixed(2)) : 0;
  const ra = typeof body?.ra === 'number' && Number.isFinite(body.ra) ? body.ra : undefined;
  const dec = typeof body?.dec === 'number' && Number.isFinite(body.dec) ? body.dec : undefined;

  return {
    ok: true,
    flag: { frameId, obsId, detector, targetName, x, y, ra, dec, reason },
  };
}

export function createSeedCommunityStore(): CommunityStoreData {
  return {
    version: 1,
    posts: [
      {
        id: 'seed-barnard-01',
        nickname: 'OrionScout',
        rank: 'Discoverer',
        xp: 740,
        target: "Barnard's Star",
        caseId: 'case-barnards-star',
        ra: 269.4485,
        dec: 4.7394,
        note: 'Clear north-northwest proper motion hop visible when blinking Survey Pass 1 vs Pass 2 in D1.',
        createdAt: '2026-04-02T14:15:00.000Z',
        reports: 0,
        comments: [
          {
            id: 'seed-c1',
            nickname: 'VegaCadet',
            text: 'Checked Show changes mode — crisp white/cyan dipole right at center!',
            createdAt: '2026-04-02T15:10:00.000Z',
          },
        ],
      },
      {
        id: 'seed-wise-02',
        nickname: 'LyraIR',
        rank: 'Analyst',
        xp: 510,
        target: 'WISE 0855',
        caseId: 'case-wise-0855',
        ra: 133.786,
        dec: -7.244,
        note: 'Faint in D1 optical edge, brightens dramatically in D6 (4.7 um) and stays honestly marked below 3-sigma gate.',
        createdAt: '2026-04-03T10:30:00.000Z',
        reports: 0,
        comments: [],
      },
    ],
    flags: [],
  };
}

export class SlidingRateLimiter {
  private hits = new Map<string, number[]>();

  public checkAndRecord(key: string, maxRequests = 12, windowMs = 60_000, now = Date.now()): boolean {
    const prev = this.hits.get(key) || [];
    const recent = prev.filter((ts) => now - ts < windowMs);
    if (recent.length >= maxRequests) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 1000) {
      const oldestKey = this.hits.keys().next().value;
      if (oldestKey) this.hits.delete(oldestKey);
    }
    return true;
  }
}
