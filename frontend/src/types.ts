export interface Comment {
  timestamp: number
  user?: string
  message?: string
}

export interface DixieFile {
  timestamp: number
  filename: string
  contentType: string
  user?: string
  message?: string
  comments?: Comment[]
  exifTimestamp?: number
}
