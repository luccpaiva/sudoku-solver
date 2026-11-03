/**
 * Draws the examples of the strategy guide, docs/STRATEGIES.md, with the
 * real engine.
 *
 *   node tools/strategy-guide.mjs
 *
 * Each example is a position and a strategy. By default the position is the
 * library puzzle named for the strategy, opened where the strategy first
 * comes in, as the app opens it; an example can instead give a position from
 * a sudokuwiki.org article. The strategy is run on it, one of its
 * occurrences is drawn as an SVG board into docs/strategies/, and the
 * guide's block for the example, between `<!-- example:id -->` and
 * `<!-- /example:id -->`, is rewritten: the picture, where the position
 * comes from, and the step as the solver words it. Change the engine or a
 * strategy's wording, run this again, and the guide follows.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { EXAMPLES } from './strategy-guide-examples.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const guidePath = join(root, 'docs', 'STRATEGIES.md')
const pictures = join(root, 'docs', 'strategies')

// ── Drawing ─────────────────────────────────────────────────────────────────

// The light theme of src/workspace.css
const INK = '#1f1d1a'
const MUTED = '#5d574d'
const FAINT = '#8c8579'
const GRID = '#d9d4c9'
const SHEET = '#fdfcf9'
const PEN = '#1f5fd0'
const STRIKE = '#c8401a'
const SCOPE = '#c99700'
const ON_INK = '#fbfaf7'
const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

/** One cell, in pixels. */
const C = 52
/** Room for the row letters and column numbers. */
const AXIS = 24
const ROW_LABELS = 'ABCDEFGHJ'

const fixed = n => +n.toFixed(2)

function unitRect(ref) {
  if (ref.kind === 'row') return { x: 0, y: ref.index, w: 9, h: 1 }
  if (ref.kind === 'col') return { x: ref.index, y: 0, w: 1, h: 9 }
  return { x: (ref.index % 3) * 3, y: Math.floor(ref.index / 3) * 3, w: 3, h: 3 }
}

/** A tie from the ring of one cell to the ring of another (as BoardOverlay draws it). */
function link([a, b]) {
  const reach = 0.5 - 0.04
  const ax = (a % 9) + 0.5, ay = Math.floor(a / 9) + 0.5
  const bx = (b % 9) + 0.5, by = Math.floor(b / 9) + 0.5
  const dx = bx - ax, dy = by - ay
  const out = reach / Math.max(Math.abs(dx), Math.abs(dy))
  const p = (x, y) => `${fixed(x * C)} ${fixed(y * C)}`
  return `M${p(ax + dx * out, ay + dy * out)}L${p(bx - dx * out, by - dy * out)}`
}

/** Ties between the pattern cells along each row or column of the step, when it names none. */
function ties(units, pattern) {
  const paths = []
  for (const ref of units) {
    if (ref.kind === 'box') continue
    const along = []
    for (let place = 0; place < 9; place++) {
      const cell = ref.kind === 'row' ? ref.index * 9 + place : place * 9 + ref.index
      if (pattern.has(cell)) along.push(place)
    }
    for (let i = 1; i < along.length; i++) {
      const from = (along[i - 1] + 1 - 0.04) * C
      const to = (along[i] + 0.04) * C
      const across = (ref.index + 0.5) * C
      paths.push(ref.kind === 'row' ? `M${fixed(from)} ${fixed(across)}H${fixed(to)}` : `M${fixed(across)} ${fixed(from)}V${fixed(to)}`)
    }
  }
  return paths
}

/** The board as the app shows a found step, in the light theme. */
function drawBoard(snapshot, instance) {
  const { values, candidates } = snapshot
  const clues = snapshot.clues ?? values.map(v => v !== null)
  const marks = new Map(instance.candidateAnnotations.map(a => [`${a.cell}:${a.digit}`, a.kind]))
  const pattern = new Set(instance.patternCells)
  const size = 9 * C
  const out = []

  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${size + AXIS + 8}" height="${size + AXIS + 8}" viewBox="${-AXIS} ${-AXIS} ${size + AXIS + 8} ${size + AXIS + 8}" font-family="${FONT}">`)
  out.push(`<rect x="${-AXIS}" y="${-AXIS}" width="${size + AXIS + 8}" height="${size + AXIS + 8}" fill="#f8f6f2"/>`)

  // the row letters and column numbers
  for (let i = 0; i < 9; i++) {
    out.push(`<text x="${-AXIS / 2}" y="${fixed((i + 0.5) * C)}" fill="${FAINT}" font-size="13" font-weight="600" text-anchor="middle" dominant-baseline="central">${ROW_LABELS[i]}</text>`)
    out.push(`<text x="${fixed((i + 0.5) * C)}" y="${-AXIS / 2}" fill="${FAINT}" font-size="13" font-weight="600" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`)
  }

  out.push(`<rect width="${size}" height="${size}" fill="${SHEET}"/>`)

  // the highlighter over the units the step works in
  for (const ref of instance.units) {
    const r = unitRect(ref)
    out.push(`<rect x="${fixed((r.x + 0.03) * C)}" y="${fixed((r.y + 0.03) * C)}" width="${fixed((r.w - 0.06) * C)}" height="${fixed((r.h - 0.06) * C)}" rx="${fixed(0.07 * C)}" fill="${SCOPE}" fill-opacity=".1" stroke="${SCOPE}" stroke-opacity=".55"/>`)
  }

  // the grid: thin lines, then the boxes
  for (let i = 1; i < 9; i++) {
    if (i % 3 === 0) continue
    out.push(`<path d="M${i * C} 0V${size}M0 ${i * C}H${size}" stroke="${GRID}" stroke-width="1"/>`)
  }
  out.push(`<path d="M${3 * C} 0V${size}M${6 * C} 0V${size}M0 ${3 * C}H${size}M0 ${6 * C}H${size}" stroke="${FAINT}" stroke-width="2"/>`)
  out.push(`<rect x="1" y="1" width="${size - 2}" height="${size - 2}" fill="none" stroke="${MUTED}" stroke-width="2"/>`)

  // the ties of the pattern, strong ones solid and weak ones dashed
  const strong = instance.links || instance.weakLinks ? (instance.links ?? []).map(link) : ties(instance.units, pattern)
  for (const d of strong) out.push(`<path d="${d}" fill="none" stroke="${PEN}" stroke-opacity=".55" stroke-width="2"/>`)
  for (const d of (instance.weakLinks ?? []).map(link)) {
    out.push(`<path d="${d}" fill="none" stroke="${PEN}" stroke-opacity=".55" stroke-width="2" stroke-dasharray="6 4"/>`)
  }

  for (let cell = 0; cell < 81; cell++) {
    const x = (cell % 9) * C
    const y = Math.floor(cell / 9) * C

    if (pattern.has(cell)) {
      out.push(`<rect x="${fixed(x + 0.04 * C + 1)}" y="${fixed(y + 0.04 * C + 1)}" width="${fixed(0.92 * C - 2)}" height="${fixed(0.92 * C - 2)}" rx="${fixed(0.12 * C)}" fill="none" stroke="${PEN}" stroke-width="2"/>`)
    }

    const value = values[cell]
    if (value !== null) {
      const clue = clues[cell]
      out.push(`<text x="${fixed(x + C / 2)}" y="${fixed(y + C / 2 + 1)}" fill="${clue ? INK : PEN}" font-size="${fixed(0.52 * C)}" font-weight="${clue ? 600 : 500}" text-anchor="middle" dominant-baseline="central">${value}</text>`)
      continue
    }

    // the candidates, each in its own place of a 3 by 3 block
    const slot = (0.76 * C) / 3
    const r = (1.22 * 0.215 * C) / 2
    for (let d = 1; d <= 9; d++) {
      if (!candidates[cell].has(d)) continue
      const cx = fixed(x + 0.12 * C + (((d - 1) % 3) + 0.5) * slot)
      const cy = fixed(y + 0.12 * C + (Math.floor((d - 1) / 3) + 0.5) * slot)
      const kind = marks.get(`${cell}:${d}`)
      const text = (fill, weight) =>
        `<text x="${cx}" y="${fixed(cy + 0.5)}" fill="${fill}" font-size="${fixed(0.215 * C)}" font-weight="${weight}" text-anchor="middle" dominant-baseline="central">${d}</text>`

      if (kind === 'highlight') {
        out.push(`<circle cx="${cx}" cy="${cy}" r="${fixed(r)}" fill="${PEN}"/>`, text(ON_INK, 700))
      } else if (kind === 'alternate') {
        out.push(`<circle cx="${cx}" cy="${cy}" r="${fixed(r - 0.75)}" fill="none" stroke="${PEN}" stroke-width="1.5"/>`, text(INK, 700))
      } else if (kind === 'eliminate') {
        const h = r * 1.08
        out.push(text(INK, 700))
        out.push(`<path d="M${fixed(cx - h * 0.7071)} ${fixed(cy + h * 0.7071)}L${fixed(cx + h * 0.7071)} ${fixed(cy - h * 0.7071)}" stroke="${STRIKE}" stroke-width="2" stroke-linecap="round"/>`)
      } else {
        out.push(text(MUTED, 500))
      }
    }
  }

  out.push('</svg>')
  return out.join('\n') + '\n'
}

// ── The examples ────────────────────────────────────────────────────────────

const vite = await createServer({
  root,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
})

try {
  const { TEST_BOARDS } = await vite.ssrLoadModule('/src/data/testBoards.ts')
  const { loadPuzzle, applyStratResult } = await vite.ssrLoadModule('/src/core/board.ts')
  const { findNextStrategy, stepsBefore, STRATEGY_META } = await vite.ssrLoadModule('/src/core/solver.ts')
  const { fromWiki } = await vite.ssrLoadModule('/src/core/testing.ts')

  const names = new Set(STRATEGY_META.map(meta => meta.name))
  mkdirSync(pictures, { recursive: true })
  let guide = readFileSync(guidePath, 'utf8')
  const missing = []

  for (const example of EXAMPLES) {
    if (!names.has(example.strategy)) throw new Error(`${example.id}: no strategy called ${example.strategy}`)

    // the position: an article's, or the library puzzle opened where the strategy comes in
    let snapshot
    let source
    if (example.wiki) {
      snapshot = fromWiki(example.wiki)
      source = example.source
    } else if (example.start) {
      // a puzzle from its clues, solved up to the strategy's first step
      const start = loadPuzzle(example.start).snapshot
      const lead = stepsBefore(start, example.strategy)
      if (!lead) throw new Error(`${example.id}: the solve of that puzzle never calls on ${example.strategy}`)
      snapshot = lead.reduce(applyStratResult, start)
      source = `${example.source} Opened after ${lead.length} step${lead.length === 1 ? '' : 's'} of the solver.`
    } else {
      const board = TEST_BOARDS.find(b => b.name === (example.puzzle ?? example.strategy))
      if (!board) throw new Error(`${example.id}: no library puzzle for ${example.strategy}`)
      const start = loadPuzzle(board.puzzle).snapshot
      const lead = stepsBefore(start, example.strategy)
      if (!lead) throw new Error(`${example.id}: the library puzzle never calls on ${example.strategy}`)
      snapshot = lead.reduce(applyStratResult, start)
      source =
        `The library puzzle *${board.name}*` +
        (lead.length === 0 ? ', at the start.' : `, after ${lead.length} step${lead.length === 1 ? '' : 's'}.`)
    }

    const result = findNextStrategy(snapshot, new Set([example.strategy]))
    if (!result) throw new Error(`${example.id}: ${example.strategy} finds nothing there`)
    const picked = example.pick
      ? result.instances.find(instance => instance.label.includes(example.pick))
      : result.instances[0]
    if (!picked) throw new Error(`${example.id}: no occurrence whose label has "${example.pick}"`)

    writeFileSync(join(pictures, `${example.id}.svg`), drawBoard(snapshot, picked))

    const others = result.instances.length - 1
    const block = [
      `<!-- example:${example.id} -->`,
      `![${picked.label}](strategies/${example.id}.svg)`,
      '',
      `${source} ${others > 0 ? `The step has ${others + 1} occurrences; this is one of them.` : ''}`.trim(),
      '',
      `\`${picked.label}\``,
      '',
      `> ${picked.narrative}`,
      `<!-- /example:${example.id} -->`,
    ].join('\n')

    const open = `<!-- example:${example.id} -->`
    const close = `<!-- /example:${example.id} -->`
    const from = guide.indexOf(open)
    const to = guide.indexOf(close)
    if (from === -1 || to === -1) missing.push(example.id)
    else guide = guide.slice(0, from) + block + guide.slice(to + close.length)

    console.log(`${example.id}: ${picked.label}`)
  }

  writeFileSync(guidePath, guide)
  if (missing.length) console.log(`\nNo block in the guide for: ${missing.join(', ')}`)
} finally {
  await vite.close()
}
