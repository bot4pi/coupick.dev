import { isDeadly, nextHead, type Direction, type Point, type SnakeState } from './engine'

const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left']

const neighbour = (state: SnakeState, p: Point, direction: Direction): Point | null => {
  const head = state.body[0]

  // nextHead works from the head, so borrow it for any cell
  state.body[0] = p

  const next = nextHead(state, direction)

  state.body[0] = head

  return next
}

// how many cells the snake could still reach from a cell: a cheap way to avoid walking into a dead end
const reachable = (state: SnakeState, start: Point, blocked: Uint8Array) => {
  const seen = new Uint8Array(blocked)
  const queue = [start]
  let count = 0

  seen[start.y * state.cols + start.x] = 1

  while (queue.length > 0 && count < state.body.length * 2) {
    const p = queue.pop()!

    count += 1

    for (const direction of DIRECTIONS) {
      const n = neighbour(state, p, direction)

      if (n !== null && seen[n.y * state.cols + n.x] === 0) {
        seen[n.y * state.cols + n.x] = 1
        queue.push(n)
      }
    }
  }

  return count
}

/**
 * Picks a direction for a snake that plays by itself (the preview on the main page): the shortest path to
 * the money when it doesn't lead into a dead end, otherwise the move with the most room around it.
 */
export const autopilot = (state: SnakeState): Direction => {
  const { cols, rows, body, food } = state
  const blocked = new Uint8Array(cols * rows)

  for (const p of body.slice(0, -1)) {
    blocked[p.y * cols + p.x] = 1
  }

  const moves = DIRECTIONS
    .map(direction => ({ direction, cell: nextHead(state, direction) }))
    .filter((m): m is { direction: Direction, cell: Point } => m.cell !== null && !isDeadly(state, m.cell))

  if (moves.length === 0) {
    return state.direction
  }

  const roomy = moves.map(m => ({ ...m, room: reachable(state, m.cell, blocked) }))
  const enough = roomy.filter(m => m.room >= body.length)

  if (food !== null && enough.length > 0) {
    // breadth-first search from the food back to the head finds every cell's distance to it
    const distance = new Int32Array(cols * rows).fill(-1)
    const queue = [food]

    distance[food.y * cols + food.x] = 0

    for (let i = 0; i < queue.length; i++) {
      const p = queue[i]

      for (const direction of DIRECTIONS) {
        const n = neighbour(state, p, direction)

        if (n !== null && blocked[n.y * cols + n.x] === 0 && distance[n.y * cols + n.x] === -1) {
          distance[n.y * cols + n.x] = distance[p.y * cols + p.x] + 1
          queue.push(n)
        }
      }
    }

    const towards = enough
      .filter(m => distance[m.cell.y * cols + m.cell.x] >= 0)
      .sort((a, b) => distance[a.cell.y * cols + a.cell.x] - distance[b.cell.y * cols + b.cell.x])

    if (towards.length > 0) {
      return towards[0].direction
    }
  }

  return roomy.sort((a, b) => b.room - a.room)[0].direction
}
