import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOLVED_BOARD,
  canMoveTile,
  countAlignedTiles,
  createShuffledBoard,
  isPuzzleSolved,
  moveTile,
} from './slidingPuzzleLogic';

describe('SlidingSkyPuzzleGame Logic', () => {
  test('createShuffledBoard creates a valid permutation of 0..8 that is not already solved', () => {
    const board = createShuffledBoard(28);
    assert.strictEqual(board.length, 9);
    const sorted = [...board].sort((a, b) => a - b);
    assert.deepStrictEqual(sorted, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    assert.strictEqual(isPuzzleSolved(board), false);
  });

  test('canMoveTile & moveTile enforce orthogonally adjacent sliding rules', () => {
    // SOLVED_BOARD has 0 at index 8 (bottom-right), so indices 5 and 7 are movable
    assert.strictEqual(canMoveTile(SOLVED_BOARD, 7), true);
    assert.strictEqual(canMoveTile(SOLVED_BOARD, 5), true);
    assert.strictEqual(canMoveTile(SOLVED_BOARD, 0), false);
    assert.strictEqual(canMoveTile(SOLVED_BOARD, 8), false);

    const swapped = moveTile(SOLVED_BOARD, 7);
    assert.strictEqual(swapped[8], 8);
    assert.strictEqual(swapped[7], 0);
    assert.strictEqual(isPuzzleSolved(swapped), false);
    assert.strictEqual(countAlignedTiles(swapped), 7);

    // Sliding back restores solved state
    const restored = moveTile(swapped, 8);
    assert.strictEqual(isPuzzleSolved(restored), true);
    assert.strictEqual(countAlignedTiles(restored), 8);
  });
});
