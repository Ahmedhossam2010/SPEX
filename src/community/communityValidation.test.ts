import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SlidingRateLimiter,
  createSeedCommunityStore,
  validateCommentInput,
  validateCommunityNickname,
  validateFlagInput,
  validatePostInput,
} from './communityValidation';

describe('Community Validation & Moderation', () => {
  test('Nickname validation allows safe handles and rejects emails/links/XSS', () => {
    assert.strictEqual(validateCommunityNickname('Astro_Kid 01').ok, true);
    assert.strictEqual(validateCommunityNickname('x').ok, false);
    assert.strictEqual(validateCommunityNickname('user@email.com').ok, false);
    assert.strictEqual(validateCommunityNickname('<script>alert(1)</script>').ok, false);
  });

  test('Post validation strips HTML, blocks links/profanity, and preserves clean metadata', () => {
    const good = validatePostInput({
      nickname: 'OrionScout',
      target: 'WISE 0855',
      note: '<b>Clear</b> 4.7 um glow in D6.',
      xp: 320,
      rank: 'Navigator',
      caseId: 'case-wise-0855',
    });
    assert.strictEqual(good.ok, true);
    if (good.ok) {
      assert.strictEqual(good.post.note, 'Clear 4.7 um glow in D6.');
      assert.strictEqual(good.post.rank, 'Navigator');
    }

    const withLink = validatePostInput({
      nickname: 'OrionScout',
      target: 'WISE 0855',
      note: 'Visit https://spam.example.com now!',
    });
    assert.strictEqual(withLink.ok, false);
  });

  test('Comment & Flag validation handle bounds and required identifiers', () => {
    assert.strictEqual(validateCommentInput({ nickname: 'Vega01', text: 'Great find!' }).ok, true);
    assert.strictEqual(validateCommentInput({ nickname: 'Vega01', text: 'a' }).ok, false);

    const flag = validateFlagInput({
      frameId: 'obs-123',
      obsId: 'obs-123',
      detector: 'D5',
      targetName: 'RW Aur',
      x: 31.4,
      y: 28.9,
      reason: 'Cosmic ray streak',
    });
    assert.strictEqual(flag.ok, true);
    assert.strictEqual(validateFlagInput({ frameId: '', obsId: '' }).ok, false);
  });

  test('Rate limiter throttles excessive requests per IP bucket', () => {
    const limiter = new SlidingRateLimiter();
    assert.strictEqual(limiter.checkAndRecord('127.0.0.1', 2, 60_000, 1000), true);
    assert.strictEqual(limiter.checkAndRecord('127.0.0.1', 2, 60_000, 2000), true);
    assert.strictEqual(limiter.checkAndRecord('127.0.0.1', 2, 60_000, 3000), false);
    // Window expires later
    assert.strictEqual(limiter.checkAndRecord('127.0.0.1', 2, 60_000, 65_000), true);
  });

  test('Seed community store contains valid initial entries', () => {
    const seed = createSeedCommunityStore();
    assert.ok(seed.posts.length >= 2);
    assert.strictEqual(seed.version, 1);
  });
});
