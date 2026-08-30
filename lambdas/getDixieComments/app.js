import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { documentClient } from '../lib/dynamo.js'
import { jsonHandler, requireFields } from '../lib/http.js'

export const handler = jsonHandler(async event => {
  const { filename } = requireFields(event.queryStringParameters, ['filename'])
  const { Item } = await documentClient.send(
    new GetCommand({ TableName: process.env.FilesTable, Key: { filename } }),
  )
  return Item?.comments ?? []
})
