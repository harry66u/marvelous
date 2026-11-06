import type { Archetype } from '../../content/types'

/**
 * Original generic head-and-shoulders silhouettes in a 160x190 box, base at y=190.
 * Paths are layered back to front: every path but the last is drawn in the dark
 * tone, the last one (the head) in the lighter tone. Only absolute M/L/C/Z
 * commands are used so `mirror` can flip them. Holes use even-odd fill.
 */

/** Flip absolute path data left to right across x=80. */
function mirror(d: string): string {
  return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${160 - Number(x)} ${y}`)
}
const both = (d: string) => `${d} ${mirror(d)}`

const SHOULDERS = 'M8 190 C12 142 36 122 62 116 L98 116 C124 122 148 142 152 190 Z'
const NECK = 'M65 90 L95 90 L95 126 L65 126 Z'
const HEAD = 'M58 68 C58 50 68 41 80 41 C92 41 102 50 102 68 C102 86 92 98 80 98 C68 98 58 86 58 68 Z'

export const ARCHETYPE_PATHS: Record<Archetype, string[]> = {
  caped: [
    // raised collar and a cape flaring past the shoulders
    'M62 114 C30 120 8 150 0 190 L160 190 C152 150 130 120 98 114 Z',
    'M44 140 L32 84 C48 104 62 112 80 116 C98 112 112 104 128 84 L116 140 Z',
    'M22 190 C24 146 42 124 62 116 L98 116 C118 124 136 146 138 190 Z',
    NECK,
    HEAD,
  ],
  cowl: [
    SHOULDERS,
    NECK,
    // full cowl with swept-back side fins and slanted eye slits cut out
    `M58 68 C58 50 66 41 80 41 C94 41 102 50 102 68 C102 86 92 98 80 98 C68 98 58 86 58 68 Z ${both('M54 50 L44 38 L60 54 Z')} ${both('M64 66 L77 70 L77 74 L66 72 Z')}`,
  ],
  armored: [
    SHOULDERS,
    // square pauldrons and a collar plate
    both('M4 160 L8 138 L36 126 L58 134 L58 158 Z'),
    'M62 120 L98 120 L104 134 L56 134 Z',
    NECK,
    // flat-faced helm with a long visor slit
    'M58 52 L66 42 L94 42 L102 52 L102 82 L92 98 L68 98 L58 82 Z M64 62 L96 62 L96 68 L64 68 Z',
  ],
  helmeted: [
    SHOULDERS,
    NECK,
    // domed helmet with crest ridge, wide visor and chin guard
    'M54 72 C54 42 66 32 80 32 C94 32 106 42 106 72 L106 90 L96 100 L64 100 L54 90 Z M62 60 L98 60 L98 74 L62 74 Z',
    'M77 22 L83 22 L84 36 L76 36 Z',
  ],
  hooded: [
    // hood draped over the shoulders, face lit inside
    'M80 12 C50 12 38 44 38 82 C38 104 30 120 14 138 L146 138 C130 120 122 104 122 82 C122 44 110 12 80 12 Z',
    SHOULDERS,
    'M64 72 C64 54 70 46 80 46 C90 46 96 54 96 72 C96 90 90 100 80 100 C70 100 64 90 64 72 Z',
  ],
  horned: [
    SHOULDERS,
    NECK,
    // two curved horns sweeping up and out
    both('M62 54 C46 48 36 32 40 8 C48 28 58 34 68 40 Z'),
    HEAD,
  ],
  winged: [
    // feathered wings spread behind the shoulders
    both('M62 136 C42 118 20 92 0 46 C20 52 32 58 38 66 C30 52 24 38 18 20 C36 38 52 62 60 90 Z'),
    SHOULDERS,
    NECK,
    HEAD,
  ],
  longhair: [
    // hair to the shoulder blades
    'M52 72 C46 36 64 24 80 24 C96 24 114 36 108 72 C112 100 120 126 132 150 L96 140 L64 140 L28 150 C40 126 48 100 52 72 Z',
    SHOULDERS,
    NECK,
    'M60 66 C60 50 69 43 80 43 C91 43 100 50 100 66 C100 84 92 98 80 98 C68 98 60 84 60 66 Z',
  ],
  shorthair: [
    // cropped cap of hair with a side part, ears out
    'M54 66 C48 40 64 28 80 28 C96 28 112 40 106 66 L106 76 L54 76 Z',
    SHOULDERS,
    NECK,
    'M60 68 C60 56 68 50 80 50 C92 50 100 56 100 68 C100 86 92 98 80 98 C68 98 60 86 60 68 Z',
  ],
  bald: [SHOULDERS, NECK, both('M58 66 L54 70 L56 80 L60 80 Z'), HEAD],
  synthetic: [
    SHOULDERS,
    // jointed neck column and a seamed head with a visor band and ear discs
    'M72 92 L88 92 L88 132 L72 132 Z M72 104 L88 104 L88 108 L72 108 Z',
    both('M54 62 C50 62 48 66 48 70 C48 74 50 78 54 78 Z'),
    'M58 54 C58 46 66 42 80 42 C94 42 102 46 102 54 L102 84 C102 94 94 100 80 100 C66 100 58 94 58 84 Z M66 62 L94 62 L94 70 L66 70 Z',
  ],
  brute: [
    // massive hunched shoulders, thick neck, heavy brow and jaw
    'M0 190 C0 156 22 130 56 122 L104 122 C138 130 160 156 160 190 Z',
    'M60 88 L100 88 L108 130 L52 130 Z',
    'M56 58 C56 46 66 42 80 42 C94 42 104 46 104 58 L106 80 C106 94 94 102 80 102 C66 102 54 94 54 80 Z M60 60 L100 60 L100 66 L60 66 Z',
  ],
  creature: [
    SHOULDERS,
    NECK,
    // long muzzle in profile-forward view, tall pointed ears, no human jaw
    both('M60 56 L52 20 L74 44 Z'),
    'M62 58 C62 46 70 42 80 42 C90 42 98 46 98 58 L96 78 L88 102 L72 102 L64 78 Z M70 70 L76 74 L70 76 Z M90 70 L84 74 L90 76 Z',
  ],
}
