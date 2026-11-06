import type { ReactNode } from 'react'

export type IconName =
  | 'home' | 'manual' | 'stats' | 'sound-on' | 'sound-off' | 'settings' | 'file' | 'lock' | 'clock-in'

const PATHS: Record<IconName, ReactNode> = {
  home: (<><rect x="3" y="4" width="18" height="12" rx="3" /><path d="M8 20h8M12 16v4" /></>),
  manual: (<><path d="M5 3.5h10l4 4V20.5H5z" /><path d="M15 3.5v4h4M8 12h8M8 16h6" /></>),
  stats: <path d="M5 20V11M10 20V6M15 20v-7M20 20V9" />,
  'sound-off': (<><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9.5l4 5M21 9.5l-4 5" /></>),
  'sound-on': (<><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" /></>),
  settings: (<><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" /></>),
  file: (<><path d="M3.5 7.5h6l2 2h9v10h-17z" /><path d="M3.5 7.5v-2h6l1.5 2" /></>),
  lock: (<><rect x="5" y="10.5" width="14" height="10" rx="1.5" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3M12 14.5v2.5" /></>),
  'clock-in': (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>),
}

/** Decorative 24px line icon; the caller supplies the accessible name. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  )
}
