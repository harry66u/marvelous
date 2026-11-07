import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Vercel compiles each file under api/ to its own ES module without bundling, and package.json says
 * "type": "module", so Node resolves imports literally. An extensionless relative import
 * ('../lib/time') compiles fine and type-checks, then crashes the function on the first request
 * with ERR_MODULE_NOT_FOUND. Every relative import a function reaches must name its file.
 */
const ROOT = resolve(__dirname, '../..')
const IMPORT = /(?:import|export)\s[^'"]*?from\s+'([^']+)'|import\(\s*'([^']+)'\s*\)/g

function relativeImports(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  return [...source.matchAll(IMPORT)]
    .map((m) => m[1] ?? m[2])
    .filter((spec): spec is string => spec !== undefined && spec.startsWith('.'))
}

function walk(entry: string, seen = new Set<string>(), problems: string[] = []): string[] {
  if (seen.has(entry)) return problems
  seen.add(entry)
  for (const spec of relativeImports(entry)) {
    if (!/\.(js|json)$/.test(spec)) {
      problems.push(`${entry.slice(ROOT.length + 1)} imports '${spec}' without a .js or .json extension`)
      continue
    }
    if (spec.endsWith('.json')) continue
    const target = join(dirname(entry), spec.replace(/\.js$/, '.ts'))
    if (!existsSync(target)) problems.push(`${entry.slice(ROOT.length + 1)} imports '${spec}', which does not exist`)
    else walk(target, seen, problems)
  }
  return problems
}

describe('serverless functions', () => {
  const functions = readdirSync(join(ROOT, 'api')).filter((f) => f.endsWith('.ts'))

  it('keeps only function entry points in api/ (anything there is deployed)', () => {
    expect(functions.filter((f) => f.includes('.test.'))).toEqual([])
  })

  it.each(functions)('api/%s reaches only relative imports Node can resolve', (f) => {
    expect(walk(join(ROOT, 'api', f))).toEqual([])
  })
})
