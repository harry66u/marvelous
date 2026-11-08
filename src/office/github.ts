/** Minimal GitHub contents-API client for the Scheduling Office. */
export interface RepoRef { owner: string; repo: string; branch: string }

export const OWNER = 'harry66u'
export const REPO = 'marvelous'
export const TOKEN_KEY = 'marvelous:office:token'
export const BRANCH_KEY = 'marvelous:office:branch'

const API = 'https://api.github.com'

export class GitHubError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

export function loadToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function saveToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token) } catch { /* storage unavailable: token lasts this page view only */ }
}
export function clearToken(): void {
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* nothing stored */ }
}

function headers(token?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init })
  const body = (await res.json().catch(() => ({}))) as { message?: string }
  if (!res.ok) throw new GitHubError(res.status, body.message ?? `GitHub returned ${res.status}`)
  return body as T
}

const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
const fromBase64 = (b64: string) => {
  const bin = atob(b64.replace(/\s/g, ''))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export async function getDefaultBranch(owner: string, repo: string, token?: string | null): Promise<string> {
  const r = await request<{ default_branch: string }>(`${API}/repos/${owner}/${repo}`, { headers: headers(token) })
  return r.default_branch
}

export async function readJsonFile<T>(ref: RepoRef, path: string, token?: string | null): Promise<{ data: T; sha: string }> {
  const url = `${API}/repos/${ref.owner}/${ref.repo}/contents/${path}?ref=${encodeURIComponent(ref.branch)}`
  const r = await request<{ content?: string; sha: string }>(url, { headers: headers(token) })
  if (r.content) return { data: JSON.parse(fromBase64(r.content)) as T, sha: r.sha }
  // Files over 1 MB come back without content; ask for the raw bytes instead (up to 100 MB).
  const res = await fetch(url, { cache: 'no-store', headers: { ...headers(token), Accept: 'application/vnd.github.raw+json' } })
  if (!res.ok) throw new GitHubError(res.status, `${path}: GitHub returned ${res.status}`)
  return { data: (await res.json()) as T, sha: r.sha }
}

export async function writeJsonFile(
  ref: RepoRef, path: string, data: unknown, sha: string, message: string, token: string,
): Promise<{ sha: string; commitUrl: string }> {
  const url = `${API}/repos/${ref.owner}/${ref.repo}/contents/${path}`
  const r = await request<{ content: { sha: string }; commit: { html_url: string } }>(url, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: toBase64(JSON.stringify(data, null, 2) + '\n'),
      sha,
      branch: ref.branch,
    }),
  })
  return { sha: r.content.sha, commitUrl: r.commit.html_url }
}

export interface FileWrite {
  path: string
  data: unknown
  /** blob sha the editor loaded; the commit is refused if the file changed since */
  sha: string
}

/**
 * Commit several JSON files as ONE commit (Git Data API), so the schedule and the character
 * file can never land half-saved. Refuses with GitHubError(409) when a file changed since it
 * was loaded; a branch that moves mid-save fails the fast-forward update (GitHubError 422).
 */
export async function commitJsonFiles(
  ref: RepoRef, files: FileWrite[], message: string, token: string,
): Promise<{ commitUrl: string; shas: Record<string, string> }> {
  const base = `${API}/repos/${ref.owner}/${ref.repo}`
  const auth = { headers: headers(token) }
  const json = (method: string, body: unknown): RequestInit => ({
    method, headers: { ...headers(token), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const shaAt = async (path: string, at: string) =>
    (await request<{ sha: string }>(`${base}/contents/${path}?ref=${encodeURIComponent(at)}`, auth)).sha

  const head = (await request<{ object: { sha: string } }>(`${base}/git/ref/heads/${encodeURIComponent(ref.branch)}`, auth)).object.sha
  for (const f of files) {
    if ((await shaAt(f.path, head)) !== f.sha) {
      throw new GitHubError(409, `${f.path} changed on GitHub since you loaded it.`)
    }
  }
  const baseTree = (await request<{ tree: { sha: string } }>(`${base}/git/commits/${head}`, auth)).tree.sha
  const tree = await request<{ sha: string }>(`${base}/git/trees`, json('POST', {
    base_tree: baseTree,
    tree: files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: JSON.stringify(f.data, null, 2) + '\n' })),
  }))
  const commit = await request<{ sha: string; html_url: string }>(`${base}/git/commits`, json('POST', {
    message, tree: tree.sha, parents: [head],
  }))
  await request(`${base}/git/refs/heads/${encodeURIComponent(ref.branch)}`, json('PATCH', { sha: commit.sha, force: false }))
  const shas: Record<string, string> = {}
  for (const f of files) shas[f.path] = await shaAt(f.path, commit.sha)
  return { commitUrl: commit.html_url, shas }
}
