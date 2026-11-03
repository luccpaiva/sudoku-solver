import type { ReactNode } from 'react'

// Line icons drawn on a 24-unit grid; `svg.i` in the stylesheet sets the stroke.
function icon(body: ReactNode) {
  return function Icon({ small = false }: { small?: boolean }) {
    return (
      <svg className={small ? 'i small' : 'i'} viewBox="0 0 24 24" aria-hidden="true">
        {body}
      </svg>
    )
  }
}

export const CheckIcon = icon(<path d="M5 12.5l4.5 4.5L19 7.5" />)
export const CheckCircleIcon = icon(<><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.3l2.4 2.4 4.6-5" /></>)
export const WarningIcon = icon(<><path d="M12 4.5l8.5 15h-17z" /><path d="M12 10.5v4M12 17.4v.1" /></>)
export const PlayIcon = icon(<path d="M8 5.5v13l10.5-6.5z" />)
export const PauseIcon = icon(<path d="M8.5 5.5v13M15.5 5.5v13" />)
export const UndoIcon = icon(<><path d="M8.5 5L4 9.5 8.5 14" /><path d="M4 9.5h9.5a6 6 0 010 12H9" /></>)
export const RedoIcon = icon(<><path d="M15.5 5L20 9.5 15.5 14" /><path d="M20 9.5h-9.5a6 6 0 000 12H15" /></>)
export const ResetIcon = icon(<><path d="M5 5v5h5" /><path d="M5.6 10A7.5 7.5 0 1112 19.5" /></>)
export const PrevIcon = icon(<path d="M14.5 6L8.5 12l6 6" />)
export const NextIcon = icon(<path d="M9.5 6l6 6-6 6" />)
export const ChevronIcon = icon(<path d="M7 10l5 5 5-5" />)
export const SunIcon = icon(<><circle cx="12" cy="12" r="3.6" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" /></>)
export const MoonIcon = icon(<path d="M19.5 14.2A8 8 0 019.8 4.5a8 8 0 109.7 9.7z" />)
