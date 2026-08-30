import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { documentClient, scanAll } from '../lib/dynamo.js'

// rows written before commentCount existed have no counter, and rows written
// before the exif attribute could be omitted stored this sentinel instead.
// run with --apply once and the matching workaround in getDixieFiles can go
const LEGACY_NO_EXIF_TIMESTAMP = +new Date('1960')

const TableName = process.env.FilesTable ?? 'files'
const apply = process.argv.includes('--apply')

function getRepairs({ comments, commentCount, exifTimestamp }) {
  const repairs = []
  if (commentCount === undefined) {
    repairs.push({
      expression: 'SET #commentCount = :commentCount',
      names: { '#commentCount': 'commentCount' },
      values: { ':commentCount': comments ? comments.length : 0 },
    })
  }
  if (exifTimestamp === LEGACY_NO_EXIF_TIMESTAMP) {
    repairs.push({
      expression: 'REMOVE #exifTimestamp',
      names: { '#exifTimestamp': 'exifTimestamp' },
      values: {},
    })
  }
  return repairs
}

const items = await scanAll({ TableName })
const pending = items
  .map(item => ({ item, repairs: getRepairs(item) }))
  .filter(({ repairs }) => repairs.length > 0)

console.log(`${items.length} rows scanned, ${pending.length} need repair`)

for (const { item, repairs } of pending) {
  const UpdateExpression = repairs.map(repair => repair.expression).join(' ')
  const ExpressionAttributeNames = Object.assign(
    {},
    ...repairs.map(repair => repair.names),
  )
  const ExpressionAttributeValues = Object.assign(
    {},
    ...repairs.map(repair => repair.values),
  )
  console.log(`${item.filename}: ${UpdateExpression}`)
  if (apply) {
    await documentClient.send(
      new UpdateCommand({
        TableName,
        Key: { filename: item.filename },
        UpdateExpression,
        ExpressionAttributeNames,
        ...(Object.keys(ExpressionAttributeValues).length
          ? { ExpressionAttributeValues }
          : {}),
      }),
    )
  }
}

console.log(apply ? 'done' : 'dry run, pass --apply to write')
