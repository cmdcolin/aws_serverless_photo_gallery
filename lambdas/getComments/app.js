// eslint-disable-next-line import/no-unresolved
const AWS = require("aws-sdk");

const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const { filename } = event.queryStringParameters;
    const result = await docClient
      .scan({
        TableName: "files",
        FilterExpression: "#filename = :filename",
        ExpressionAttributeNames: {
          "#filename": "filename",
        },
        ExpressionAttributeValues: {
          ":filename": filename,
        },
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify(
        (result.Items.length && result.Items[0].comments) || []
      ),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `${e}` }),
    };
  }
};
