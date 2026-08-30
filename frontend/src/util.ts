import { NO_EXIF_TIMESTAMP } from './constants'
import type { DixieFile } from './types'

//from https://stackoverflow.com/questions/43083993/
export function parseExifDate(s: string) {
  const [year, month, date, hour, min, sec] = s.split(/\D/).map(Number)
  return new Date(year, month - 1, date, hour, min, sec)
}

export function shuffle<T>(array: readonly T[]) {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// stable per-string pseudo-random value, so a given photo keeps the same
// decorations across re-renders instead of flickering
export function hash(s: string) {
  let result = 0
  for (let i = 0; i < s.length; i++) {
    result = (Math.imul(31, result) + s.charCodeAt(i)) | 0
  }
  return Math.abs(result)
}

export function getExifDate(file: DixieFile) {
  return file.exifTimestamp && file.exifTimestamp !== NO_EXIF_TIMESTAMP
    ? new Date(file.exifTimestamp)
    : undefined
}

export function getCaption(file: DixieFile) {
  const { user, message, timestamp } = file
  const exifDate = getExifDate(file)
  const byline = [user, message].filter(Boolean).join(' - ')
  const taken = exifDate ? ` | taken ${exifDate.toLocaleDateString()}` : ''
  return `${byline} posted ${new Date(timestamp).toLocaleDateString()}${taken}`
}
