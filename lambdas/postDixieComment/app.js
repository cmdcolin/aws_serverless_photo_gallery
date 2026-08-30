import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
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
        // without this a comment on an unknown filename would insert a row
        // that has no contentType, which the gallery cannot render
        ConditionExpression: 'attribute_exists(#filename)',
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
        },
      }),
    )
  } catch (e) {
    throw e.name === 'ConditionalCheckFailedException'
      ? new HttpError(404, `no such file: ${filename}`)
      : e
  }

  return { success: true }
})
