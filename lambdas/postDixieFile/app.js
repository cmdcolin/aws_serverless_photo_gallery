import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { requirePassword } from '../lib/auth.js'
import { documentClient } from '../lib/dynamo.js'
import { HttpError, jsonHandler, requireFields } from '../lib/http.js'
import { parseFormFields } from '../lib/multipart.js'

const URL_EXPIRATION_SECONDS = 300
const MAX_FILENAME_LENGTH = 100

const s3 = new S3Client({})

// the browser fetches these keys straight off the bucket as unescaped URLs, so
// keep them to characters that survive that trip (a '#' would truncate the URL)
function toKeySafeName(filename) {
  return filename.replace(/[^\w.-]+/g, '_').slice(-MAX_FILENAME_LENGTH)
}

function presignPut(Key, ContentType) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: process.env.UploadBucket,
      Key,
      ContentType,
    }),
    { expiresIn: URL_EXPIRATION_SECONDS },
  )
}

export const handler = jsonHandler(async event => {
  const data = parseFormFields(event)
  requirePassword(data.password)
  const { filename, contentType, user, message, exifTimestamp } = requireFields(
    data,
    ['filename', 'contentType'],
  )

  // the bucket is world readable, so do not let it become a host for
  // arbitrary content types
  if (!/^(image|video)\//.test(contentType)) {
    throw new HttpError(400, `unsupported content type: ${contentType}`)
  }

  const timestamp = Date.now()
  const Key = `${timestamp}-${toKeySafeName(filename)}`
  const exif = Number(exifTimestamp)

  const [uploadURL, uploadThumbnailURL] = await Promise.all([
    presignPut(Key, contentType),
    contentType.startsWith('image')
      ? presignPut(`thumbnail-${Key}`, contentType)
      : undefined,
  ])

  await documentClient.send(
    new PutCommand({
      TableName: process.env.FilesTable,
      Item: {
        timestamp,
        filename: Key,
        message,
        user,
        contentType,
        exifTimestamp: Number.isFinite(exif) ? exif : undefined,
      },
    }),
  )

  return { uploadURL, uploadThumbnailURL, Key }
})
