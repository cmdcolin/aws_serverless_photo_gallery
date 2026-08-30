import { scanAll } from '../lib/dynamo.js'
import { jsonHandler } from '../lib/http.js'

// the gallery never renders comment bodies from this endpoint, so projecting
// the fields it does use keeps the response flat as the comment count grows.
// the scan still reads whole items, so this is a payload saving, not a read one
const FIELDS = [
  'filename',
  'originalFilename',
  'timestamp',
  'exifTimestamp',
  'contentType',
  'user',
  'message',
  'commentCount',
]

const names = Object.fromEntries(FIELDS.map(field => [`#${field}`, field]))

// uploads used to store this sentinel rather than omitting the attribute;
// delete once lambdas/scripts/backfill.js has run against the table
const LEGACY_NO_EXIF_TIMESTAMP = +new Date('1960')

function toApiItem({ exifTimestamp, commentCount, ...rest }) {
  return {
    ...rest,
    commentCount: commentCount ? commentCount : 0,
    exifTimestamp:
      exifTimestamp && exifTimestamp !== LEGACY_NO_EXIF_TIMESTAMP
        ? exifTimestamp
        : undefined,
  }
}

// every load of the gallery is a full table scan, so let a reload inside the
// window reuse the last one. the upload path refetches past the cache, which is
// the only time a visitor knows the listing changed
const CACHE_CONTROL = 'public, max-age=60'

export const handler = jsonHandler(
  async () => {
    const items = await scanAll({
      TableName: process.env.FilesTable,
      ProjectionExpression: Object.keys(names).join(', '),
      ExpressionAttributeNames: names,
    })
    return { Items: items.map(item => toApiItem(item)) }
  },
  { cacheControl: CACHE_CONTROL },
)
