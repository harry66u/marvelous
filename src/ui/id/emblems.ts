import type { Origin } from '../../content/types'

/** 24x24 line icons, drawn with a round-capped stroke and no fill. */
export const EMBLEMS: Record<Origin, string[]> = {
  // double helix with rungs
  mutant: ['M8 3c0 5 8 5 8 9s-8 4-8 9', 'M16 3c0 5-8 5-8 9s8 4 8 9', 'M9.2 6.6h5.6M9.2 17.4h5.6'],
  // faceted crystal
  inhuman: ['M12 2l7 7-7 13L5 9z', 'M5 9h14', 'M10 9l2-7 2 7', 'M10 9l2 13 2-13'],
  // nucleus and three tilted orbits
  mutate: [
    'M3 12a9 3.5 0 1 0 18 0a9 3.5 0 1 0-18 0',
    'M7.5 4.2a9 3.5 60 1 0 9 15.6a9 3.5 60 1 0-9-15.6',
    'M16.5 4.2a9 3.5 120 1 0-9 15.6a9 3.5 120 1 0 9-15.6',
    'M12 10.8a1.2 1.2 0 1 0 .01 0',
  ],
  // five-point star over a chevron
  'super-soldier': ['M12 2.5l2.4 5.2 5.6.6-4.2 3.8 1.2 5.5L12 14.8 7 17.6l1.2-5.5L4 8.3l5.6-.6z', 'M7 21l5-2.6 5 2.6'],
  // gear
  tech: [
    'M10.5 2.5h3l.5 2.6 1.8.8 2.2-1.5 2.1 2.1-1.5 2.2.8 1.8 2.6.5v3l-2.6.5-.8 1.8 1.5 2.2-2.1 2.1-2.2-1.5-1.8.8-.5 2.6h-3l-.5-2.6-1.8-.8-2.2 1.5-2.1-2.1 1.5-2.2-.8-1.8-2.6-.5v-3l2.6-.5.8-1.8-1.5-2.2 2.1-2.1 2.2 1.5 1.8-.8z',
    'M12 8.8a3.2 3.2 0 1 0 .01 0',
  ],
  // circled hexagram sigil
  magic: ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M12 3l7.8 13.5H4.2z', 'M12 21L4.2 7.5h15.6z'],
  // star burst
  cosmic: ['M12 2v6M12 16v6M2 12h6M16 12h6', 'M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4', 'M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0'],
  // crown
  deity: ['M3 18L2.5 8l5 4 4.5-7 4.5 7 5-4L21 18z', 'M4 21h16'],
  // ringed planet
  alien: ['M7 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0', 'M2.6 15.4a10 3 -20 1 0 18.8-6.8a10 3 -20 1 0-18.8 6.8'],
  // chip with traces
  synthetic: ['M8 8h8v8H8z', 'M10 10h4v4h-4z', 'M10 8V5H6M14 8V4h4M8 14H4M16 10h4M10 16v3h-4M14 16v4h4'],
  // target
  trained: ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M7 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0', 'M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0', 'M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4'],
}
