import { fits, preview, SIZE, type BlockState } from './engine'

export interface Move {
  slot: number
  row: number
  col: number
}

// how many sides of the piece touch a block or a wall: snug placements leave fewer holes
const snugness = (board: Int8Array, cells: number[]) => {
  const own = new Set(cells)
  let touching = 0

  for (const i of cells) {
    const r = Math.floor(i / SIZE)
    const c = i % SIZE

    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr
      const nc = c + dc

      if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE || (board[nr * SIZE + nc] !== -1 && !own.has(nr * SIZE + nc))) {
        touching += 1
      }
    }
  }

  return touching
}

/**
 * A decent move for a board that plays by itself (the preview on the main page): clear lines when it can,
 * otherwise put the piece where it fits most snugly. A bit of noise keeps it from looking like a machine.
 */
export const pickMove = (state: BlockState, random: () => number = Math.random): Move | null => {
  let best: Move | null = null
  let bestScore = -Infinity

  state.tray.forEach((piece, slot) => {
    if (piece === null) {
      return
    }

    for (let row = 0; row + piece.rows <= SIZE; row++) {
      for (let col = 0; col + piece.cols <= SIZE; col++) {
        if (!fits(state.board, piece, row, col)) {
          continue
        }

        const result = preview(state.board, piece, row, col)!
        const score = result.cleared.length * 3 + snugness(state.board, result.placed) + random() * 2

        if (score > bestScore) {
          bestScore = score
          best = { slot, row, col }
        }
      }
    }
  })

  return best
}
