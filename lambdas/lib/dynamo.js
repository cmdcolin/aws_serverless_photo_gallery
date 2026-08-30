import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

export const documentClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({}),
  { marshallOptions: { removeUndefinedValues: true } },
)

export async function scanAll(TableName) {
  const items = []
  let ExclusiveStartKey
  do {
    const result = await documentClient.send(
      new ScanCommand({ TableName, ExclusiveStartKey }),
    )
    items.push(...result.Items)
    ExclusiveStartKey = result.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return items
}
