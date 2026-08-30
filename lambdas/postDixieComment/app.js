import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { requirePassword } from '../lib/auth.js'
import { documentClient } from '../lib/dynamo.js'
import { HttpError, jsonHandler, requireFields } from '../lib/http.js'
import { parseFormFields } from '../lib/multipart.js'

const MAX_MESSAGE_LENGTH = 2000
const MAX_USER_LENGTH = 100

export const handler = jsonHandler(async event => {
  const data = parseFormFields(event)
  requirePassword(data.password)
  const { filename, message, user } = requireFields(data, [
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
          'SET #comments = list_append(if_not_exists(#comments, :empty), :comment)',
        ExpressionAttributeNames: {
          '#filename': 'filename',
          '#comments': 'comments',
        },
        ExpressionAttributeValues: { ':comment': [comment], ':empty': [] },
      }),
    )
  } catch (e) {
    throw e.name === 'ConditionalCheckFailedException'
      ? new HttpError(404, `no such file: ${filename}`)
      : e
  }

  return { success: true }
})
