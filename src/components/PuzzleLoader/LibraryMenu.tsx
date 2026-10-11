import { useEffect, useRef, useState } from 'react'
import { TEST_BOARDS, type TestBoard } from '@/data/testBoards'
import { CheckIcon, ChevronIcon } from '@/components/icons'

type Props = {
  /** Name of the library puzzle on the board, or null when it came from elsewhere. */
  current: string | null
  onPick: (board: TestBoard) => void
}

/**
 * The library as a button that opens a list. Drawn by the workspace rather
 * than left to a native select, whose list belongs to the operating system:
 * it ignores the workspace's size and colours when the page is scaled.
 */
export function LibraryMenu({ current, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const byKeyboard = useRef(false)

  // a press anywhere else, or Escape, puts the list away
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      root.current?.querySelector('button')?.focus({ preventScroll: true })
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  // Opened from the keyboard, the list takes the focus at the puzzle in use.
  // Opened with the pointer it leaves the focus alone: inside a frame, taking
  // it would also take the keyboard from the page around.
  useEffect(() => {
    if (!open || !byKeyboard.current || !root.current) return
    const options = root.current.querySelectorAll<HTMLElement>('[role="option"]')
    const at = TEST_BOARDS.findIndex(b => b.name === current)
    options[Math.max(0, at)]?.focus({ preventScroll: true })
  }, [open, current])

  const walk = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const by = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (by === 0) return
    e.preventDefault()
    const options = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]')]
    const at = options.indexOf(document.activeElement as HTMLElement)
    options[Math.max(0, Math.min(options.length - 1, at + by))]?.focus()
  }

  return (
    <div className="sd-menu" ref={root}>
      <button
        type="button"
        id="library"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="library-label library"
        className={open ? 'is-open' : undefined}
        onClick={e => {
          // a click made with Enter or Space carries no click count
          byKeyboard.current = e.detail === 0
          setOpen(!open)
        }}
      >
        <span>{current ?? 'Choose a puzzle'}</span>
        <ChevronIcon />
      </button>

      {open && (
        <ul role="listbox" aria-labelledby="library-label" onKeyDown={walk}>
          {TEST_BOARDS.map(board => (
            <li key={board.name} role="none">
              <button
                type="button"
                role="option"
                aria-selected={board.name === current}
                data-puzzle={board.name}
                onClick={() => {
                  setOpen(false)
                  onPick(board)
                }}
              >
                {board.name}
                {board.name === current && <CheckIcon small />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
