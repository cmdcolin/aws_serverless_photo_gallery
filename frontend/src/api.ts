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

function postJson<T>(path: string, password: string, body: unknown) {
  return fetchJson<T>(apiUrl(path), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${password}`,
    },
    body: JSON.stringify(body),
  })
}

// the listing is served with a short max-age, so a caller that just changed it
// asks for a fresh one rather than reading back the response it already has
export async function fetchFiles(signal: AbortSignal, reload: boolean) {
  const { Items } = await fetchJson<{ Items: DixieFile[] }>(
    apiUrl('/getDixieFiles'),
    { signal, cache: reload ? 'reload' : 'default' },
  )
  return Items
}

export function fetchComments(filename: string, signal: AbortSignal) {
  return fetchJson<Comment[]>(apiUrl('/getDixieComments', { filename }), {
    signal,
  })
}

export function postComment({
  password,
  ...fields
}: {
  filename: string
  message: string
  user: string
  password: string
}) {
  return postJson<{ success: boolean }>('/postDixieComment', password, fields)
}

export function postFile({
  password,
  ...fields
}: {
  filename: string
  contentType: string
  message: string
  user: string
  password: string
  exifTimestamp?: number
}) {
  return postJson<{
    uploadURL: string
    uploadThumbnailURL?: string
    cacheControl: string
  }>('/postDixieFile', password, fields)
}

// only the host is signed into the presigned URL, so S3 stores whatever
// cache-control the PUT actually sends. taking it from the lambda response
// keeps the value in one place rather than duplicating the string here
export function putToBucket(url: string, cacheControl: string, body: Blob) {
  return fetchOk(url, {
    method: 'PUT',
    headers: { 'cache-control': cacheControl },
    body,
  })
}
