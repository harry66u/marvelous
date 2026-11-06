import type { Team, TeamId } from './types'
import teamsJson from '../../content/teams.json' with { type: 'json' }

export const TEAMS: Team[] = teamsJson as Team[]

const byId = new Map(TEAMS.map((t) => [t.id, t]))

export function teamName(id: TeamId): string {
  if (id === 'none') return 'None'
  return byId.get(id)?.name ?? id
}

export function teamShort(id: TeamId): string {
  if (id === 'none') return 'None'
  return byId.get(id)?.short ?? id
}
