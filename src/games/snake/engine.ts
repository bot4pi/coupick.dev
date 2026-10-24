// the rules of the snake, with no idea of how it is drawn or controlled

export type Direction = 'up' | 'down' | 'left' | 'right'

// walls end the run, portals let the snake leave on one side and come back on the other
export type SnakeMode = 'walls' | 'portal'

export type SnakeStatus = 'ready' | 'playing' | 'paused' | 'over'

export interface Point {
  x: number
  y: number
}

export interface SnakeState {
  cols: number
  rows: number
  mode: SnakeMode
  // head first
  body: Point[]
  // where every segment was one step ago: the renderer slides each one from there
  from: Point[]
  direction: Direction
  // turns pressed faster than the snake moves wait here, so quick double turns aren't lost
  queue: Direction[]
  food: Point | null
  score: number
  steps: number
  status: SnakeStatus
  // set on the step the snake ate, died or filled the whole board
  ate: boolean
  won: boolean
}

const DELTAS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
}

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }

const MAX_QUEUE = 3

export const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

export const delta = (direction: Direction) => DELTAS[direction]

const randomFreeCell = (state: Pick<SnakeState, 'cols' | 'rows' | 'body'>): Point | null => {
  const taken = new Set(state.body.map(p => p.y * state.cols + p.x))
  const free = state.cols * state.rows - taken.size

  if (free <= 0) {
    return null
  }

  // pick the n-th free cell instead of retrying random ones: stays fast on a nearly full board
  let n = Math.floor(Math.random() * free)

  for (let i = 0; i < state.cols * state.rows; i++) {
    if (!taken.has(i) && n-- === 0) {
      return { x: i % state.cols, y: Math.floor(i / state.cols) }
    }
  }

  return null
}

export const createSnake = (cols: number, rows: number, mode: SnakeMode, length = 4): SnakeState => {
  const y = Math.floor(rows / 2)
  const head = Math.min(cols - 1, Math.floor(cols / 2) + 1)
  const body = Array.from({ length }, (_, i) => ({ x: Math.max(0, head - i), y }))
  const state: SnakeState = {
    cols,
    rows,
    mode,
    body,
    from: body.map(p => ({ ...p })),
    direction: 'right',
    queue: [],
    food: null,
    score: 0,
    steps: 0,
    status: 'ready',
    ate: false,
    won: false
  }

  state.food = randomFreeCell(state)

  return state
}

/** Queues a turn; reversing into its own neck or repeating the current direction is ignored. */
export const turn = (state: SnakeState, direction: Direction) => {
  const last = state.queue.at(-1) ?? state.direction

  if (direction === last || direction === OPPOSITE[last] || state.queue.length >= MAX_QUEUE) {
    return false
  }

  state.queue.push(direction)

  return true
}

// the cell the head would move into, or null when that is outside the board in walls mode
export const nextHead = (state: SnakeState, direction: Direction): Point | null => {
  const head = state.body[0]
  const d = DELTAS[direction]
  let x = head.x + d.x
  let y = head.y + d.y

  if (state.mode === 'portal') {
    x = (x + state.cols) % state.cols
    y = (y + state.rows) % state.rows
  } else if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) {
    return null
  }

  return { x, y }
}

// whether moving into a cell kills the snake (the tail moves out of the way unless it is growing)
export const isDeadly = (state: SnakeState, cell: Point) => {
  const growing = state.food !== null && samePoint(cell, state.food)
  const body = growing ? state.body : state.body.slice(0, -1)

  return body.some(p => samePoint(p, cell))
}

export const step = (state: SnakeState) => {
  state.ate = false

  if (state.status !== 'playing') {
    return
  }

  state.direction = state.queue.shift() ?? state.direction
  state.from = state.body.map(p => ({ ...p }))

  const head = nextHead(state, state.direction)

  if (head === null || isDeadly(state, head)) {
    state.status = 'over'

    return
  }

  state.steps += 1
  state.body.unshift(head)

  if (state.food !== null && samePoint(head, state.food)) {
    state.ate = true
    state.score += 1
    state.food = randomFreeCell(state)

    if (state.food === null) {
      state.won = true
      state.status = 'over'
    }
  } else {
    state.body.pop()
  }
}

// the snake speeds up as it eats, down to a floor that is still playable on a phone
export const stepInterval = (score: number) => Math.max(68, 150 - score * 3)
