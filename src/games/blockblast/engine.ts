import { PIECES, randomPiece, type Piece } from './pieces'

// the rules of block blast: drop shapes on the board, full rows and columns disappear

export const SIZE = 8
export const TRAY = 3

// how many placements in a row may go without clearing a line before the combo is lost
const COMBO_GRACE = 3
const BOARD_CLEAR_BONUS = 300

export interface BlockState {
  // -1 for an empty cell, otherwise the style of the block in it
  board: Int8Array
  tray: (Piece | null)[]
  score: number
  combo: number
  sinceClear: number
  moves: number
  over: boolean
}

export interface Placement {
  piece: Piece
  row: number
  col: number
  // board indices of the new blocks
  placed: number[]
  rows: number[]
  cols: number[]
  // board indices that were cleared, each once, and the style of the block that was there
  cleared: number[]
  clearedStyles: number[]
  points: number
  combo: number
  boardCleared: boolean
}

export const fits = (board: Int8Array, piece: Piece, row: number, col: number) => {
  if (row < 0 || col < 0 || row + piece.rows > SIZE || col + piece.cols > SIZE) {
    return false
  }

  return piece.cells.every(([r, c]) => board[(row + r) * SIZE + col + c] === -1)
}

export const fitsAnywhere = (board: Int8Array, piece: Piece) => {
  for (let row = 0; row + piece.rows <= SIZE; row++) {
    for (let col = 0; col + piece.cols <= SIZE; col++) {
      if (fits(board, piece, row, col)) {
        return true
      }
    }
  }

  return false
}

export const fullLines = (board: Int8Array) => {
  const rows: number[] = []
  const cols: number[] = []

  for (let i = 0; i < SIZE; i++) {
    let row = true
    let col = true

    for (let j = 0; j < SIZE; j++) {
      row &&= board[i * SIZE + j] !== -1
      col &&= board[j * SIZE + i] !== -1
    }

    if (row) {
      rows.push(i)
    }

    if (col) {
      cols.push(i)
    }
  }

  return { rows, cols }
}

// drops a piece and clears what it completes, on a copy-free board; returns what happened
const drop = (board: Int8Array, piece: Piece, row: number, col: number) => {
  const placed = piece.cells.map(([r, c]) => (row + r) * SIZE + col + c)

  for (const i of placed) {
    board[i] = piece.style
  }

  const { rows, cols } = fullLines(board)
  const cleared = new Set<number>()

  for (const r of rows) {
    for (let c = 0; c < SIZE; c++) {
      cleared.add(r * SIZE + c)
    }
  }

  for (const c of cols) {
    for (let r = 0; r < SIZE; r++) {
      cleared.add(r * SIZE + c)
    }
  }

  const list = [...cleared]
  // the renderer still needs to know what the cleared blocks looked like
  const styles = list.map(i => board[i])

  for (const i of list) {
    board[i] = -1
  }

  return { placed, rows, cols, cleared: list, styles }
}

/**
 * Whether all the pieces can still be placed one after another in some order. Searching every order and
 * position can get expensive on a crowded board, so after `budget` tries it gives the benefit of the doubt.
 */
const canPlaceAll = (board: Int8Array, pieces: Piece[], budget = { left: 4000 }): boolean => {
  if (pieces.length === 0) {
    return true
  }

  for (let p = 0; p < pieces.length; p++) {
    const piece = pieces[p]
    const rest = pieces.filter((_, i) => i !== p)

    for (let row = 0; row + piece.rows <= SIZE; row++) {
      for (let col = 0; col + piece.cols <= SIZE; col++) {
        if (!fits(board, piece, row, col)) {
          continue
        }

        if (--budget.left <= 0) {
          return true
        }

        const next = new Int8Array(board)

        drop(next, piece, row, col)

        if (canPlaceAll(next, rest, budget)) {
          return true
        }
      }
    }
  }

  return false
}

/**
 * Deals three new pieces. It tries for a set that can be placed completely, so a loss is the player's
 * doing and not the dealer's; when the board is too full for that, at least one piece has to fit.
 */
export const deal = (board: Int8Array, random: () => number = Math.random): Piece[] => {
  for (let attempt = 0; attempt < 30; attempt++) {
    const pieces = Array.from({ length: TRAY }, () => randomPiece(random))

    if (canPlaceAll(board, pieces)) {
      return pieces
    }
  }

  const small = PIECES.filter(p => p.cells.length <= 3)

  for (let attempt = 0; attempt < 30; attempt++) {
    const pieces = Array.from({ length: TRAY }, () => randomPiece(random))

    if (pieces.some(p => fitsAnywhere(board, p))) {
      return pieces
    }
  }

  return [small[Math.floor(random() * small.length)], randomPiece(random), randomPiece(random)]
}

export const createBlockBlast = (random: () => number = Math.random): BlockState => {
  const board = new Int8Array(SIZE * SIZE).fill(-1)

  return { board, tray: deal(board, random), score: 0, combo: 0, sinceClear: 0, moves: 0, over: false }
}

export const isStuck = (state: BlockState) => state.tray.every(p => p === null || !fitsAnywhere(state.board, p))

/** Places the piece from a tray slot with its top left cell at `row`, `col`; null if it doesn't fit. */
export const place = (state: BlockState, slot: number, row: number, col: number, random: () => number = Math.random): Placement | null => {
  const piece = state.tray[slot]

  if (state.over || piece === null || piece === undefined || !fits(state.board, piece, row, col)) {
    return null
  }

  const { placed, rows, cols, cleared, styles } = drop(state.board, piece, row, col)
  const lines = rows.length + cols.length
  let points = piece.cells.length

  if (lines > 0) {
    state.combo += 1
    state.sinceClear = 0
    // more lines at once pay a lot more than the same lines one by one, and a combo multiplies that
    points += 10 * lines * lines * state.combo
  } else {
    state.sinceClear += 1

    if (state.sinceClear >= COMBO_GRACE) {
      state.combo = 0
    }
  }

  const boardCleared = lines > 0 && state.board.every(cell => cell === -1)

  if (boardCleared) {
    points += BOARD_CLEAR_BONUS
  }

  state.score += points
  state.moves += 1
  state.tray[slot] = null

  if (state.tray.every(p => p === null)) {
    state.tray = deal(state.board, random)
  }

  state.over = isStuck(state)

  return { piece, row, col, placed, rows, cols, cleared, clearedStyles: styles, points, combo: lines > 0 ? state.combo : 0, boardCleared }
}

/** Where a piece would land and what it would clear, for the preview under the dragged piece. */
export const preview = (board: Int8Array, piece: Piece, row: number, col: number) => {
  if (!fits(board, piece, row, col)) {
    return null
  }

  const next = new Int8Array(board)
  const { placed, cleared } = drop(next, piece, row, col)

  return { placed, cleared }
}
