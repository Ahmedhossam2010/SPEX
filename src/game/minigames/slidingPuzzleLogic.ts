export type PuzzleBoard = number[]; // length 9, 0 = empty space, 1..8 = sky tiles

export const SOLVED_BOARD: PuzzleBoard = [1, 2, 3, 4, 5, 6, 7, 8, 0];

export function isPuzzleSolved(board: PuzzleBoard): boolean {
  if (board.length !== 9) return false;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== SOLVED_BOARD[i]) return false;
  }
  return true;
}

export function countAlignedTiles(board: PuzzleBoard): number {
  let count = 0;
  for (let i = 0; i < 8; i++) {
    if (board[i] === i + 1) count++;
  }
  return count;
}

export function getValidMoves(emptyIndex: number): number[] {
  const row = Math.floor(emptyIndex / 3);
  const col = emptyIndex % 3;
  const moves: number[] = [];
  if (row > 0) moves.push(emptyIndex - 3);
  if (row < 2) moves.push(emptyIndex + 3);
  if (col > 0) moves.push(emptyIndex - 1);
  if (col < 2) moves.push(emptyIndex + 1);
  return moves;
}

export function canMoveTile(board: PuzzleBoard, tileIndex: number): boolean {
  if (tileIndex < 0 || tileIndex >= 9) return false;
  const emptyIndex = board.indexOf(0);
  if (emptyIndex === -1 || tileIndex === emptyIndex) return false;
  return getValidMoves(emptyIndex).includes(tileIndex);
}

export function moveTile(board: PuzzleBoard, tileIndex: number): PuzzleBoard {
  if (!canMoveTile(board, tileIndex)) return board;
  const emptyIndex = board.indexOf(0);
  const next = [...board];
  next[emptyIndex] = next[tileIndex];
  next[tileIndex] = 0;
  return next;
}

/**
 * Generates a guaranteed solvable 3x3 sliding puzzle by executing legal random empty-slot walks
 * starting from the solved state. Never produces an unsolvable parity!
 */
export function createShuffledBoard(steps = 34): PuzzleBoard {
  let board = [...SOLVED_BOARD];
  let emptyIndex = 8;
  let lastEmpty = -1;

  for (let i = 0; i < steps; i++) {
    const candidates = getValidMoves(emptyIndex).filter((idx) => idx !== lastEmpty);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0];
    lastEmpty = emptyIndex;
    board[emptyIndex] = board[chosen];
    board[chosen] = 0;
    emptyIndex = chosen;
  }

  // Ensure it didn't accidentally land back on solved
  if (isPuzzleSolved(board)) {
    return moveTile(board, 7);
  }
  return board;
}
