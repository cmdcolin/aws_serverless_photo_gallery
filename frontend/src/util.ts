import type { DixieFile } from './types'

//from https://stackoverflow.com/questions/43083993/
export function parseExifDate(s: string) {
  const [year, month, date, hour, min, sec] = s.split(/\D/).map(Number)
  return new Date(year, month - 1, date, hour, min, sec)
}

// seeded so that the shuffled order survives a reload and the page number in
// the URL keeps pointing at the same photos
export function shuffle<T>(array: readonly T[], seed: number) {
  const result = [...array]
  let state = seed
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0
    return (state >>> 0) / 2 ** 32
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
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
  return file.exifTimestamp ? new Date(file.exifTimestamp) : undefined
}

export function getDisplayName(file: DixieFile) {
  return file.originalFilename ? file.originalFilename : file.filename
}

export function getCaption(file: DixieFile) {
  const { user, message, timestamp } = file
  const exifDate = getExifDate(file)
  const byline = [user, message].filter(Boolean).join(' - ')
  const taken = exifDate ? ` | taken ${exifDate.toLocaleDateString()}` : ''
  return `${byline} posted ${new Date(timestamp).toLocaleDateString()}${taken}`
}
