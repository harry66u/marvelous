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
  const res = await fetch(url, init)
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
  if (!r.content) throw new GitHubError(0, `${path} came back empty (files over 1 MB are not supported).`)
  return { data: JSON.parse(fromBase64(r.content)) as T, sha: r.sha }
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
