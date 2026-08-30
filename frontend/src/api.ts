import { API_ENDPOINT } from './constants'
import type { Comment, DixieFile } from './types'

async function fetchOk(url: string | URL, opts?: RequestInit) {
  const response = await fetch(url, opts)
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText} fetching ${url}: ${await response.text()}`,
    )
  }
  return response
}

async function fetchJson<T>(url: string | URL, opts?: RequestInit) {
  const response = await fetchOk(url, opts)
  return response.json() as Promise<T>
}

function apiUrl(path: string, params: Record<string, string> = {}) {
  const url = new URL(path, API_ENDPOINT)
  url.search = new URLSearchParams(params).toString()
  return url
}

function formData(fields: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    data.append(key, value)
  }
  return data
}

export async function fetchFiles(signal: AbortSignal) {
  const { Items } = await fetchJson<{ Items: DixieFile[] }>(
    apiUrl('/getDixieFiles'),
    { signal },
  )
  return Items
}

export function fetchComments(filename: string, signal: AbortSignal) {
  return fetchJson<Comment[]>(apiUrl('/getDixieComments', { filename }), {
    signal,
  })
}

export function postComment(fields: {
  filename: string
  message: string
  user: string
  password: string
}) {
  return fetchOk(apiUrl('/postDixieComment'), {
    method: 'POST',
    body: formData(fields),
  })
}

export function postFile(fields: {
  filename: string
  contentType: string
  message: string
  user: string
  password: string
  exifTimestamp: string
}) {
  return fetchJson<{ uploadURL: string; uploadThumbnailURL?: string }>(
    apiUrl('/postDixieFile'),
    { method: 'POST', body: formData(fields) },
  )
}

export function putToBucket(url: string, body: Blob) {
  return fetchOk(url, { method: 'PUT', body })
}
