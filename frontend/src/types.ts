export interface Comment {
  timestamp: number
  user?: string
  message?: string
}

export interface DixieFile {
  timestamp: number
  filename: string
  originalFilename?: string
  contentType: string
  user?: string
  message?: string
  commentCount: number
  exifTimestamp?: number
}
