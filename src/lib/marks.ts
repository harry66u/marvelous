/** Feedback marks shared by Unmasked logic, the share report and the UI. */
export type Mark = 'exact' | 'close' | 'no'

/** What the share report needs from one Unmasked game. */
export interface UnmaskedShare {
  /** guesses filed (1–6) */
  attempts: number
  solved: boolean
  /** one row per guess: six marks in ATTRIBUTE_ORDER */
  rows: Mark[][]
}

/** Stored result of a filed Unmasked game. */
export interface UnmaskedResult {
  attempts: number
  solved: boolean
}
