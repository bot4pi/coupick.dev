// every shape the tray can deal, as [row, col] cells

export interface Piece {
  id: string
  cells: [number, number][]
  rows: number
  cols: number
  // how often it shows up compared to the others
  weight: number
  // which of STYLES its blocks are drawn with
  style: number
}

// every family of shapes has its own shade of gray and a glyph engraved on its blocks: still monochrome,
// still glyphs, like the rest of the site
export const STYLES = [
  { fill: '#ededed', glyph: '#' },
  { fill: '#d4d4d4', glyph: '=' },
  { fill: '#b8b8b8', glyph: '%' },
  { fill: '#9e9e9e', glyph: '&' },
  { fill: '#c6c6c6', glyph: '+' },
  { fill: '#8a8a8a', glyph: '~' },
  { fill: '#ffffff', glyph: '*' }
]

// a shape drawn with '#' for blocks, rows split by '/'
const shape = (id: string, art: string, weight: number, style: number): Piece => {
  const cells: [number, number][] = []
  const lines = art.split('/')

  lines.forEach((line, r) => [...line].forEach((ch, c) => {
    if (ch === '#') {
      cells.push([r, c])
    }
  }))

  return { id, cells, rows: lines.length, cols: Math.max(...lines.map(l => l.length)), weight, style }
}

// every rotation of a shape, without repeats
const rotations = (id: string, art: string, weight: number, style: number) => {
  let grid = art.split('/').map(line => [...line])
  const seen = new Set<string>()
  const pieces: Piece[] = []

  for (let i = 0; i < 4; i++) {
    const key = grid.map(row => row.join('')).join('/')

    if (!seen.has(key)) {
      seen.add(key)
      pieces.push(shape(`${id}${i}`, key, weight, style))
    }

    // rotate a quarter turn clockwise
    grid = grid[0].map((_, c) => grid.map(row => row[c] ?? '.').reverse())
  }

  // a shape with several rotations shouldn't show up several times as often
  return pieces.map(p => ({ ...p, weight: p.weight / pieces.length }))
}

export const PIECES: Piece[] = [
  shape('dot', '#', 0.6, 6),
  ...rotations('i2', '##', 1, 1),
  ...rotations('i3', '###', 1.4, 1),
  ...rotations('i4', '####', 1.2, 1),
  ...rotations('i5', '#####', 0.9, 1),
  shape('o2', '##/##', 1.3, 0),
  shape('o3', '###/###/###', 0.7, 0),
  ...rotations('r23', '###/###', 1, 0),
  ...rotations('v3', '##/#.', 1.3, 2),
  ...rotations('v5', '###/#../#..', 1, 2),
  ...rotations('l4', '#./#./##', 1.2, 3),
  ...rotations('j4', '.#/.#/##', 1.2, 3),
  ...rotations('t4', '###/.#.', 1.2, 4),
  ...rotations('s4', '.##/##.', 0.9, 5),
  ...rotations('z4', '##./.##', 0.9, 5)
]

const TOTAL = PIECES.reduce((sum, p) => sum + p.weight, 0)

export const randomPiece = (random: () => number = Math.random) => {
  let n = random() * TOTAL

  for (const piece of PIECES) {
    n -= piece.weight

    if (n <= 0) {
      return piece
    }
  }

  return PIECES[PIECES.length - 1]
}
