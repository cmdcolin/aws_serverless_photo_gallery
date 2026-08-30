import type { DixieFile } from './types'
import { getExifDate, shuffle } from './util'

export const FILTER_OPTIONS = [
  { value: 'all', label: 'all' },
  { value: 'commented_on', label: 'has been commented on' },
  { value: 'videos', label: 'videos only' },
  { value: 'no_videos', label: 'no videos' },
] as const

export const SORT_OPTIONS = [
  { value: 'date_uploaded_dec', label: 'date uploaded (dec)' },
  { value: 'date_uploaded_asc', label: 'date uploaded (asc)' },
  { value: 'date_exif_dec', label: 'exif date (dec)' },
  { value: 'date_exif_asc', label: 'exif date (asc)' },
  { value: 'random', label: 'random' },
] as const

export type Filter = (typeof FILTER_OPTIONS)[number]['value']
export type Sort = (typeof SORT_OPTIONS)[number]['value']

export const FILTER_VALUES = FILTER_OPTIONS.map(option => option.value)
export const SORT_VALUES = SORT_OPTIONS.map(option => option.value)

const DISTANT_FUTURE = +new Date('3000')
const DISTANT_PAST = +new Date('1900')

export function isVideo(file: DixieFile) {
  return file.contentType.startsWith('video')
}

export function isImage(file: DixieFile) {
  return file.contentType.startsWith('image')
}

export function filterFiles(files: DixieFile[], filter: Filter) {
  switch (filter) {
    case 'videos':
      return files.filter(file => isVideo(file))
    case 'no_videos':
      return files.filter(file => !isVideo(file))
    case 'commented_on':
      return files.filter(
        file => file.comments !== undefined && file.comments.length > 0,
      )
    case 'all':
      return files
  }
}

export function sortFiles(files: DixieFile[], sort: Sort) {
  // files with no exif date sort to the end whichever direction we go, using
  // finite sentinels so that comparing two of them yields 0 rather than NaN
  const missingExif = sort === 'date_exif_asc' ? DISTANT_FUTURE : DISTANT_PAST
  const exifTime = (file: DixieFile) => {
    const date = getExifDate(file)
    return date ? date.getTime() : missingExif
  }

  switch (sort) {
    case 'random':
      return shuffle(files)
    case 'date_uploaded_asc':
      return files.toSorted((a, b) => a.timestamp - b.timestamp)
    case 'date_uploaded_dec':
      return files.toSorted((a, b) => b.timestamp - a.timestamp)
    case 'date_exif_asc':
      return files.toSorted((a, b) => exifTime(a) - exifTime(b))
    case 'date_exif_dec':
      return files.toSorted((a, b) => exifTime(b) - exifTime(a))
  }
}
