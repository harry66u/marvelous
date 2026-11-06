/**
 * Canonical form for comparing names typed by players with names on file.
 * "Spider-Man" -> "spider man", "M.O.D.O.K." -> "modok", "The Thing" -> "thing".
 */
export function normalizeName(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’‘`.]/g, '') // apostrophes and periods vanish: O'Lantern, M.O.D.O.K.
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return base.startsWith('the ') ? base.slice(4) : base
}
