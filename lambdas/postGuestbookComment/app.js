// eslint-disable-next-line import/no-unresolved
const AWS = require("aws-sdk");
const multipart = require("./multipart");

const DB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const data = multipart.parse(event);
    const { message, user, password } = data;

    if (password !== process.env.Password) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Access denied" }),
      };
    }
    await DB.put({
      Item: {
        timestamp: Date.now(),
        message,
        user,
      },
      TableName: "guestbook",
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: "true" }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `${e}` }),
    };
  }
};
