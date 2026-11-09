import type { PublicCharacter } from '../../../content/types'

export function ch(id: string, name: string, over: Partial<PublicCharacter> = {}): PublicCharacter {
  return {
    id, name, aliases: [], realName: null, primaryTeam: 'none', teams: [], world: 'avengers', debutYear: 1970,
    debutIssue: 'X #1', debutDate: '1970', alignment: 'hero', origin: 'mutant', gender: 'male',
    mcu: false, mcuFirst: null, caseNote: '', archetype: 'caped',
    ...over,
  }
}

export const storm = ch('storm', 'Storm', { realName: 'Ororo Munroe', primaryTeam: 'x-men', teams: ['x-men'], world: 'x-men', debutYear: 1975, gender: 'female', origin: 'mutant' })
export const rogue = ch('rogue', 'Rogue', { realName: 'Anna Marie', primaryTeam: 'x-men', teams: ['x-men'], world: 'x-men', debutYear: 1981, gender: 'female', origin: 'mutant' })
export const galactus = ch('galactus', 'Galactus', { primaryTeam: 'none', teams: [], world: 'cosmic', debutYear: 1966, alignment: 'villain', origin: 'cosmic' })
export const peter = ch('spider-man-peter', 'Spider-Man (Peter Parker)', { realName: 'Peter Parker', primaryTeam: 'avengers', teams: ['avengers'], world: 'spider-man', debutYear: 1962, origin: 'mutate' })
export const miles = ch('spider-man-miles', 'Spider-Man (Miles Morales)', { realName: 'Miles Morales', debutYear: 2011, origin: 'mutate' })
export const modok = ch('modok', 'M.O.D.O.K.', { realName: 'George Tarleton', alignment: 'villain', origin: 'tech' })
export const strange = ch('doctor-strange', 'Doctor Strange', { aliases: ['Dr. Strange'], realName: 'Stephen Strange', origin: 'magic' })
export const filler = Array.from({ length: 12 }, (_, i) => ch(`x-filler-${i}`, `Xavier Clone ${i}`))
