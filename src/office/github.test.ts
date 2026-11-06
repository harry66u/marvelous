import { GitHubError, readJsonFile, writeJsonFile, getDefaultBranch, loadToken, saveToken, clearToken, TOKEN_KEY } from './github'

const ref = { owner: 'harry66u', repo: 'marvelous', branch: 'main' }
const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))

function mockFetch(res: { status?: number; body?: unknown }) {
  const fn = vi.fn(async () => new Response(JSON.stringify(res.body ?? {}), { status: res.status ?? 200 }))
  vi.stubGlobal('fetch', fn)
  return fn
}
afterEach(() => vi.unstubAllGlobals())

describe('github', () => {
  it('readJsonFile decodes base64 UTF-8 and returns the sha', async () => {
    const text = JSON.stringify({ name: 'Ms. Marvel — Kamala Khan, Ünïcode ✓' })
    const fn = mockFetch({ body: { content: b64(text).replace(/(.{20})/g, '$1\n'), sha: 'abc', encoding: 'base64' } })
    const out = await readJsonFile<{ name: string }>(ref, 'content/schedule.json')
    expect(out).toEqual({ data: { name: 'Ms. Marvel — Kamala Khan, Ünïcode ✓' }, sha: 'abc' })
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/repos/harry66u/marvelous/contents/content/schedule.json?ref=main')
    const h = init.headers as Record<string, string>
    expect(h.Accept).toBe('application/vnd.github+json')
    expect(h['X-GitHub-Api-Version']).toBe('2022-11-28')
    expect(h.Authorization).toBeUndefined()
  })

  it('sends the token when given', async () => {
    const fn = mockFetch({ body: { content: b64('{}'), sha: 's' } })
    await readJsonFile(ref, 'x.json', 'tok')
    expect(((fn.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('writeJsonFile sends sha, branch and message, and returns the commit url', async () => {
    const fn = mockFetch({ body: { content: { sha: 'new' }, commit: { html_url: 'https://github.com/c/1' } } })
    const out = await writeJsonFile(ref, 'content/schedule.json', { a: 1 }, 'old', 'office: update schedule', 'tok')
    expect(out).toEqual({ sha: 'new', commitUrl: 'https://github.com/c/1' })
    const [, init] = fn.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.method).toBe('PUT')
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({ sha: 'old', branch: 'main', message: 'office: update schedule' })
    expect(atob(body.content)).toBe('{\n  "a": 1\n}\n')
  })

  it('surfaces a 409 as GitHubError(409)', async () => {
    mockFetch({ status: 409, body: { message: 'conflict' } })
    await expect(writeJsonFile(ref, 'x.json', {}, 's', 'm', 't')).rejects.toMatchObject({ name: 'GitHubError', status: 409 })
    await expect(writeJsonFile(ref, 'x.json', {}, 's', 'm', 't')).rejects.toBeInstanceOf(GitHubError)
  })

  it('getDefaultBranch reads default_branch', async () => {
    mockFetch({ body: { default_branch: 'trunk' } })
    expect(await getDefaultBranch('harry66u', 'marvelous')).toBe('trunk')
  })

  it('stores the token under marvelous:office:token', () => {
    saveToken('abc')
    expect(localStorage.getItem('marvelous:office:token')).toBe('abc')
    expect(TOKEN_KEY).toBe('marvelous:office:token')
    expect(loadToken()).toBe('abc')
    clearToken()
    expect(loadToken()).toBeNull()
  })
})
