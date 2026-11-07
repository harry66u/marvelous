import { commitJsonFiles, GitHubError } from './github'

const ref = { owner: 'o', repo: 'r', branch: 'main' }
const b64 = (s: string) => btoa(s)

function mockGitHub(opts: { currentSha?: string; refUpdateStatus?: number } = {}) {
  const calls: { method: string; url: string; body?: unknown }[] = []
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method, url, body })
    const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status })
    if (method === 'GET' && url.includes('/git/ref/heads/main')) return json(200, { object: { sha: 'head1' } })
    if (method === 'GET' && url.includes('/git/commits/head1')) return json(200, { tree: { sha: 'tree1' } })
    if (method === 'GET' && url.includes('/contents/') && url.includes('ref=head1'))
      return json(200, { sha: opts.currentSha ?? (url.includes('schedule') ? 's-old' : 'c-old'), content: b64('{}') })
    if (method === 'POST' && url.endsWith('/git/trees')) return json(201, { sha: 'tree2' })
    if (method === 'POST' && url.endsWith('/git/commits')) return json(201, { sha: 'commit2', html_url: 'https://github.com/o/r/commit/commit2' })
    if (method === 'PATCH' && url.includes('/git/refs/heads/main')) return json(opts.refUpdateStatus ?? 200, { object: { sha: 'commit2' } })
    if (method === 'GET' && url.includes('/contents/') && url.includes('ref=commit2'))
      return json(200, { sha: url.includes('schedule') ? 's-new' : 'c-new', content: b64('{}') })
    return json(404, { message: `unexpected ${method} ${url}` })
  })
  vi.stubGlobal('fetch', fn)
  return calls
}

afterEach(() => vi.unstubAllGlobals())

describe('commitJsonFiles', () => {
  it('writes both files in one commit and returns their new shas', async () => {
    const calls = mockGitHub()
    const out = await commitJsonFiles(ref, [
      { path: 'content/characters.json', data: [1], sha: 'c-old' },
      { path: 'content/schedule.json', data: { a: 1 }, sha: 's-old' },
    ], 'office: update content', 'tok')
    expect(out.commitUrl).toBe('https://github.com/o/r/commit/commit2')
    expect(out.shas).toEqual({ 'content/characters.json': 'c-new', 'content/schedule.json': 's-new' })
    const tree = calls.find((c) => c.method === 'POST' && c.url.endsWith('/git/trees'))?.body as { base_tree: string; tree: { path: string }[] }
    expect(tree.base_tree).toBe('tree1')
    expect(tree.tree.map((t) => t.path)).toEqual(['content/characters.json', 'content/schedule.json'])
    expect(calls.filter((c) => c.method === 'POST' && c.url.endsWith('/git/commits'))).toHaveLength(1)
    const patch = calls.find((c) => c.method === 'PATCH')?.body as { force: boolean }
    expect(patch.force).toBe(false)
  })

  it('refuses with a 409 when a file changed since it was loaded', async () => {
    mockGitHub({ currentSha: 'someone-else' })
    await expect(commitJsonFiles(ref, [{ path: 'content/schedule.json', data: {}, sha: 's-old' }], 'm', 'tok'))
      .rejects.toMatchObject({ status: 409 })
  })

  it('surfaces a branch that moved during the save as a GitHubError', async () => {
    mockGitHub({ refUpdateStatus: 422 })
    await expect(commitJsonFiles(ref, [{ path: 'content/schedule.json', data: {}, sha: 's-old' }], 'm', 'tok'))
      .rejects.toBeInstanceOf(GitHubError)
  })
})
