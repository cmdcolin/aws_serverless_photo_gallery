import { HttpError } from './http.js'

// This app only posts simple text fields; the actual media bypasses the lambda
// and goes straight to S3 with a pre-signed URL, so there is no file part to
// handle here.

function getContentType(headers) {
  const key = Object.keys(headers).find(
    header => header.toLowerCase() === 'content-type',
  )
  if (!key) {
    throw new HttpError(400, 'request has no content-type header')
  }
  return headers[key]
}

export function parseFormFields(event) {
  const contentType = getContentType(event.headers)
  const boundary = /boundary="?([^";]+)"?/i.exec(contentType)
  if (!boundary) {
    throw new HttpError(400, `no multipart boundary in "${contentType}"`)
  }
  const body = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body

  const fields = {}
  for (const part of body.split(`--${boundary[1]}`)) {
    const [headers, ...value] = part.split('\r\n\r\n')
    const name = /name="([^"]*)"/.exec(headers)
    if (name && value.length) {
      fields[name[1]] = value.join('\r\n\r\n').replace(/\r\n$/, '')
    }
  }
  return fields
}
