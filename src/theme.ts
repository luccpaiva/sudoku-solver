/**
 * Two-palette theme, one semantic vocabulary.
 * Light — "Puzzle Page": newsprint, printed ink, pencil candidates,
 * red pen marks, highlighter unit tint.
 * Dark — "Instrument": blue-black panels, gold for what the solver
 * found, signal red for removals.
 * Values live as CSS variables in index.css; the `dark` class on <html>
 * swaps them. `--radius` and the font stacks swap with the palette too.
 */
export const theme = {
  // ── App shell ────────────────────────────────────────────────────────────────
  app: {
    bg: 'bg-paper',
    text: 'text-ink',
    border: 'border-line/70',
    muted: 'text-soft',
  },

  // ── Board grid ───────────────────────────────────────────────────────────────
  board: {
    outerBorder: 'border-2 border-ink/90',
    boxDividerRight: 'border-r-2 border-r-ink/70',
    boxDividerBottom: 'border-b-2 border-b-ink/70',
    cellDividerRight: 'border-r border-r-line/80',
    cellDividerBottom: 'border-b border-b-line/80',
  },

  // ── Board axis labels ────────────────────────────────────────────────────────
  label: 'text-[11px] tracking-wider text-soft select-none',

  // ── Cell backgrounds (mutually exclusive, descending priority) ───────────────
  cell: {
    default: 'bg-surface',
    peer: 'bg-wash/60',
    sameValue: 'bg-wash',
    selected: 'bg-ink/15',
    pattern: 'bg-wash/80',
  },

  // ── Cell value text ──────────────────────────────────────────────────────────
  value: {
    given: 'font-display font-semibold text-ink',
    input: 'font-display text-entry',
  },

  // ── Candidate digit colors ───────────────────────────────────────────────────
  candidate: {
    normal: 'text-ink/60',
    highlight: 'text-pat font-bold',
    eliminate: 'text-soft',
    eliminateSlash: 'bg-removal/90',
    patternRing: 'border-[1.3px] border-pat',
  },

  // ── SVG overlay colors ───────────────────────────────────────────────────────
  // CSS variables (index.css) applied via style — SVG attributes can't
  // resolve var(), inline styles can.
  overlay: {
    unitFill: 'var(--ov-unit-fill)',
    unitStroke: 'var(--ov-unit-stroke)',
    patternStroke: 'var(--ov-ring)',
    patternGlow: 'drop-shadow(0 0 5px var(--ov-ring-glow))',
  },

  // ── Buttons ──────────────────────────────────────────────────────────────────
  button: {
    base: 'px-3 py-2 rounded-[var(--radius)] text-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed',
    default: 'border border-line text-ink hover:bg-wash/60',
    primary: 'bg-accent text-paper hover:opacity-90 font-medium',
    ghost: 'border border-line/70 text-soft hover:text-ink hover:bg-wash/50',
  },

  // ── Form controls (select, input) ────────────────────────────────────────────
  formControl: 'rounded-[var(--radius)] bg-surface border border-line text-ink placeholder:text-soft/70 focus:outline-none focus:ring-1 focus:ring-ink/40',
  formButton: 'rounded-[var(--radius)] border border-line text-ink text-xs hover:bg-wash/60 transition-colors disabled:opacity-50',

  // ── Strategy panel ───────────────────────────────────────────────────────────
  strategy: {
    sectionLabel: 'text-[10px] font-semibold uppercase tracking-[0.25em] text-soft',
    itemActive: 'text-accent font-medium',
    itemEnabled: 'text-ink/80 group-hover:text-ink',
    itemDisabled: 'text-soft/60',
    stoneOn: 'bg-ink border-ink',
    stoneOff: 'border-line bg-transparent',
    stoneActive: 'bg-accent border-accent',
    badge: 'text-[10px] font-bold text-accent uppercase tracking-wider',
  },

  // ── Explainer ────────────────────────────────────────────────────────────────
  explainer: {
    empty: 'rounded-[var(--radius)] border border-line bg-surface p-4 text-sm text-soft',
    kbd: 'rounded-[var(--radius)] border border-line bg-wash px-1 py-0.5 font-mono text-xs text-ink',
    container: 'rounded-[var(--radius)] border border-line bg-surface p-5 text-sm space-y-3',
    name: 'font-display font-semibold text-ink text-base tracking-wide',
    summary: 'text-soft mt-0.5 text-xs',
    narrative: 'text-ink/90 leading-relaxed',
    label: 'font-mono text-[11px] text-soft',
    stepper: 'flex items-center gap-1 shrink-0 text-xs text-soft',
    stepperButton:
      'rounded-[var(--radius)] border border-line text-ink w-6 h-6 leading-none hover:bg-wash/60 transition-colors disabled:opacity-35 disabled:cursor-not-allowed',
    stepperCount: 'tabular-nums px-1',
    legend: 'flex gap-4 text-[11px] text-soft',
    legendHighlight: 'border-[1.3px] border-pat',
    legendEliminate: 'bg-removal',
  },

  // ── Puzzle loader ────────────────────────────────────────────────────────────
  loader: {
    title: 'text-[10px] font-semibold uppercase tracking-[0.25em] text-soft',
    label: 'text-xs text-soft',
    divider: 'border-line/60',
  },
} as const
