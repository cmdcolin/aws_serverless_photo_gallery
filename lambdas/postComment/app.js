// eslint-disable-next-line import/no-unresolved
const AWS = require("aws-sdk");
const multipart = require("./multipart");

// const { AWS_REGION: region } = process.env;

const DB = new AWS.DynamoDB.DocumentClient();

async function uploadComment({ message, user, filename }) {
  const comment = {
    timestamp: Date.now(),
    message,
    user,
    filename,
  };
  return DB.update({
    TableName: "files",
    Key: {
      filename,
    },
    ReturnValues: "ALL_NEW",
    UpdateExpression:
      "SET #comments = list_append(if_not_exists(#comments, :empty_list), :comment)",
    ExpressionAttributeNames: {
      "#comments": "comments",
    },
    ExpressionAttributeValues: {
      ":comment": [comment],
      ":empty_list": [],
    },
  }).promise();
}

exports.handler = async (event) => {
  try {
    const data = multipart.parse(event);
    const { message, user, filename, password } = data;

    if (password !== process.env.Password) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Access denied" }),
      };
    }
    await uploadComment({ message, user, filename });

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
