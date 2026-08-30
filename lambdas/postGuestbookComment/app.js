import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { requirePassword } from '../lib/auth.js'
import { documentClient } from '../lib/dynamo.js'
import { jsonHandler, requireFields } from '../lib/http.js'
import { parseFormFields } from '../lib/multipart.js'

const MAX_MESSAGE_LENGTH = 2000
const MAX_USER_LENGTH = 100

export const handler = jsonHandler(async event => {
  const data = parseFormFields(event)
  requirePassword(data.password)
  const { message, user } = requireFields(data, ['message'])

  await documentClient.send(
    new PutCommand({
      TableName: process.env.GuestbookTable,
      Item: {
        timestamp: Date.now(),
        message: message.slice(0, MAX_MESSAGE_LENGTH),
        user: user ? user.slice(0, MAX_USER_LENGTH) : undefined,
      },
    }),
  )

  return { success: true }
})
