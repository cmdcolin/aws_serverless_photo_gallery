import {
  CopyObjectCommand,
  GetObjectAclCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3'

// objects uploaded before postDixieFile signed a cache-control header have
// none, so every visitor revalidates every image on every load
const CACHE_CONTROL = 'public, max-age=31536000, immutable'
const CONCURRENCY = 16

const ALL_USERS = 'http://acs.amazonaws.com/groups/global/AllUsers'

const Bucket = process.env.UploadBucket
const apply = process.argv.includes('--apply')
const s3 = new S3Client({})

// a copy resets the object ACL, so on a bucket still old enough to publish
// through per-object grants the copy has to re-request the public one
async function getPublicReadAcl(Key) {
  try {
    const { Grants } = await s3.send(new GetObjectAclCommand({ Bucket, Key }))
    const isPublic = Grants.some(
      grant => grant.Grantee.URI === ALL_USERS && grant.Permission === 'READ',
    )
    return isPublic ? 'public-read' : undefined
  } catch {
    // BucketOwnerEnforced buckets have no object ACLs to preserve
    return undefined
  }
}

async function listKeys() {
  const keys = []
  let ContinuationToken
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket, ContinuationToken }),
    )
    keys.push(...page.Contents.map(object => object.Key))
    ContinuationToken = page.NextContinuationToken
  } while (ContinuationToken)
  return keys
}

async function repair(Key) {
  const head = await s3.send(new HeadObjectCommand({ Bucket, Key }))
  if (head.CacheControl === CACHE_CONTROL) {
    return false
  }
  if (apply) {
    await s3.send(
      new CopyObjectCommand({
        Bucket,
        Key,
        CopySource: `${Bucket}/${encodeURIComponent(Key)}`,
        MetadataDirective: 'REPLACE',
        CacheControl: CACHE_CONTROL,
        ContentType: head.ContentType,
        Metadata: head.Metadata,
        StorageClass: head.StorageClass,
        ACL: await getPublicReadAcl(Key),
      }),
    )
  }
  return true
}

const keys = await listKeys()
let repaired = 0
for (let i = 0; i < keys.length; i += CONCURRENCY) {
  const done = await Promise.all(keys.slice(i, i + CONCURRENCY).map(repair))
  repaired += done.filter(Boolean).length
}

console.log(`${keys.length} objects, ${repaired} without ${CACHE_CONTROL}`)
console.log(apply ? 'done' : 'dry run, pass --apply to write')
