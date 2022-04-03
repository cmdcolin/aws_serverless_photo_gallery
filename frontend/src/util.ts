export interface DixieFile {
  timestamp: number
  filename: string
  user: string
  message: string
  date: string
  contentType: string
  comments: unknown[]
  exifTimestamp: number
}

//from https://stackoverflow.com/questions/43083993/
export function parseExifDate(s: string) {
  const [year, month, date, hour, min, sec] = s.split(/\D/)
  return new Date(+year, +month - 1, +date, +hour, +min, +sec)
}

export async function myfetch(params: string, opts?: any) {
  const response = await fetch(params, opts)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }
  return response
}

export async function myfetchjson(params: string, opts?: any) {
  const res = await myfetch(params, opts)
  return res.json()
}

export function getCaption(file: DixieFile) {
  const { user, message, timestamp, exifTimestamp } = file
  return `${
    user || message
      ? `${user ? user + ' - ' : ''}${message ? message : ''}`
      : ' '
  } posted ${new Date(timestamp).toLocaleDateString()} ${
    exifTimestamp && exifTimestamp !== +new Date('1960')
      ? `| taken ${new Date(exifTimestamp).toLocaleDateString()}`
      : ''
  }`
}

export function shuffle<T>(array: T[]) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1

    // And swap it with the current element.
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }
  return array
}
