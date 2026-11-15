export type PuzzleBoard = number[]; // 0 = empty space, 1..(size*size-1) = sky tiles

export function getSolvedBoard(size = 3): PuzzleBoard {
  const total = size * size;
  const board: number[] = [];
  for (let i = 1; i < total; i++) board.push(i);
  board.push(0);
  return board;
}

export const SOLVED_BOARD: PuzzleBoard = getSolvedBoard(3);

export function isPuzzleSolved(board: PuzzleBoard, size = 3): boolean {
  const total = size * size;
  if (board.length !== total) return false;
  for (let i = 0; i < total - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[total - 1] === 0;
}

export function countAlignedTiles(board: PuzzleBoard): number {
  let count = 0;
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] === i + 1) count++;
  }
  return count;
}

export function getValidMoves(emptyIndex: number, size = 3): number[] {
  const row = Math.floor(emptyIndex / size);
  const col = emptyIndex % size;
  const moves: number[] = [];
  if (row > 0) moves.push(emptyIndex - size);
  if (row < size - 1) moves.push(emptyIndex + size);
  if (col > 0) moves.push(emptyIndex - 1);
  if (col < size - 1) moves.push(emptyIndex + 1);
  return moves;
}

export function canMoveTile(board: PuzzleBoard, tileIndex: number, size = 3): boolean {
  const total = size * size;
  if (tileIndex < 0 || tileIndex >= total || board.length !== total) return false;
  const emptyIndex = board.indexOf(0);
  if (emptyIndex === -1 || tileIndex === emptyIndex) return false;
  return getValidMoves(emptyIndex, size).includes(tileIndex);
}

export function moveTile(board: PuzzleBoard, tileIndex: number, size = 3): PuzzleBoard {
  if (!canMoveTile(board, tileIndex, size)) return board;
  const emptyIndex = board.indexOf(0);
  const next = [...board];
  next[emptyIndex] = next[tileIndex];
  next[tileIndex] = 0;
  return next;
}

/**
 * Generates a guaranteed solvable NxN sliding puzzle by executing legal random empty-slot walks
 * starting from the solved state. Never produces an unsolvable parity!
 */
export function createShuffledBoard(steps = 34, size = 3): PuzzleBoard {
  const total = size * size;
  const board = getSolvedBoard(size);
  let emptyIndex = total - 1;
  let lastEmpty = -1;

  for (let i = 0; i < steps; i++) {
    const candidates = getValidMoves(emptyIndex, size).filter((idx) => idx !== lastEmpty);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0];
    lastEmpty = emptyIndex;
    board[emptyIndex] = board[chosen];
    board[chosen] = 0;
    emptyIndex = chosen;
  }

  // Ensure it didn't accidentally land back on solved
  if (isPuzzleSolved(board, size)) {
    return moveTile(board, total - 2, size);
  }
  return board;
}
