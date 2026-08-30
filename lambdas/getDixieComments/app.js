import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { documentClient } from '../lib/dynamo.js'
import { jsonHandler, requireTextFields } from '../lib/http.js'

export const handler = jsonHandler(async event => {
  const { filename } = requireTextFields(event.queryStringParameters, [
    'filename',
  ])
  const { Item } = await documentClient.send(
    new GetCommand({
      TableName: process.env.FilesTable,
      Key: { filename },
      ProjectionExpression: '#comments',
      ExpressionAttributeNames: { '#comments': 'comments' },
    }),
  )
  return Item?.comments ?? []
})
