/** Validate content/blist.json and content/retcon.json; print issues. Used while building content. */
import blist from '../content/blist.json' with { type: 'json' }
import retcon from '../content/retcon.json' with { type: 'json' }
import type { BlistPrompt, RetconRecord } from '../src/content/types'
import { validateBlist, validateRetcon } from '../src/content/validateGames'

const issues = [...validateBlist(blist as BlistPrompt[]), ...validateRetcon(retcon as RetconRecord[])]
const errors = issues.filter((i) => i.level === 'error')
for (const i of issues.slice(0, 40)) console.log(`${i.level} ${i.path}: ${i.message}`)
console.log(`${errors.length} errors, ${issues.length - errors.length} warnings`)
