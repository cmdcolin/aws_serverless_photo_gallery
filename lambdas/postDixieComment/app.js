import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { requirePassword } from '../lib/auth.js'
import { documentClient } from '../lib/dynamo.js'
import {
  HttpError,
  jsonHandler,
  parseJsonBody,
  requireTextFields,
} from '../lib/http.js'

const MAX_MESSAGE_LENGTH = 2000
const MAX_USER_LENGTH = 100

// comments live inside the file row, and a DynamoDB item cannot exceed 400KB.
// this many comments of the maximum length still fits with room to spare, so
// the append below fails as a 409 rather than as a validation error at the cap
const MAX_COMMENTS = 150

// the condition cannot say which half of it failed, and both cases are rare
// enough to be worth one extra read to tell an unknown file from a full one
async function describeFailure(filename) {
  const { Item } = await documentClient.send(
    new GetCommand({
      TableName: process.env.FilesTable,
      Key: { filename },
      ProjectionExpression: '#filename',
      ExpressionAttributeNames: { '#filename': 'filename' },
    }),
  )
  return Item
    ? new HttpError(409, `${filename} already has ${MAX_COMMENTS} comments`)
    : new HttpError(404, `no such file: ${filename}`)
}

export const handler = jsonHandler(async event => {
  requirePassword(event)
  const { filename, message, user } = requireTextFields(parseJsonBody(event), [
    'filename',
    'message',
  ])

  const comment = {
    timestamp: Date.now(),
    message: message.slice(0, MAX_MESSAGE_LENGTH),
    user: user ? user.slice(0, MAX_USER_LENGTH) : undefined,
  }

  try {
    await documentClient.send(
      new UpdateCommand({
        TableName: process.env.FilesTable,
        Key: { filename },
        // without the first test a comment on an unknown filename would insert
        // a row that has no contentType, which the gallery cannot render. rows
        // written before commentCount existed have none until backfill.js runs
        ConditionExpression:
          'attribute_exists(#filename) AND (attribute_not_exists(#commentCount) OR #commentCount < :max)',
        UpdateExpression:
          'SET #comments = list_append(if_not_exists(#comments, :empty), :comment) ADD #commentCount :one',
        ExpressionAttributeNames: {
          '#filename': 'filename',
          '#comments': 'comments',
          '#commentCount': 'commentCount',
        },
        ExpressionAttributeValues: {
          ':comment': [comment],
          ':empty': [],
          ':one': 1,
          ':max': MAX_COMMENTS,
        },
      }),
    )
  } catch (e) {
    throw e.name === 'ConditionalCheckFailedException'
      ? await describeFailure(filename)
      : e
  }

  return { success: true }
})
