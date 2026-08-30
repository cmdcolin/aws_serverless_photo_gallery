import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { requirePassword } from '../lib/auth.js'
import { documentClient } from '../lib/dynamo.js'
import {
  HttpError,
  jsonHandler,
  parseJsonBody,
  requireTextFields,
} from '../lib/http.js'

const URL_EXPIRATION_SECONDS = 300
const MAX_FILENAME_LENGTH = 100

// every key is prefixed with the upload time, so an object at a given key never
// changes and the browser never needs to revalidate it
const CACHE_CONTROL = 'public, max-age=31536000, immutable'

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
      CacheControl: CACHE_CONTROL,
    }),
    { expiresIn: URL_EXPIRATION_SECONDS },
  )
}

export const handler = jsonHandler(async event => {
  requirePassword(event)
  const { filename, contentType, user, message, exifTimestamp } =
    requireTextFields(parseJsonBody(event), ['filename', 'contentType'])

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

  try {
    await documentClient.send(
      new PutCommand({
        TableName: process.env.FilesTable,
        Item: {
          timestamp,
          filename: Key,
          originalFilename: filename,
          message,
          user,
          contentType,
          commentCount: 0,
          exifTimestamp: Number.isFinite(exif) ? exif : undefined,
        },
        // two uploads of the same name inside one millisecond would otherwise
        // replace the earlier row and orphan its object
        ConditionExpression: 'attribute_not_exists(#filename)',
        ExpressionAttributeNames: { '#filename': 'filename' },
      }),
    )
  } catch (e) {
    throw e.name === 'ConditionalCheckFailedException'
      ? new HttpError(409, `already uploaded: ${Key}`)
      : e
  }

  return { uploadURL, uploadThumbnailURL, cacheControl: CACHE_CONTROL, Key }
})
