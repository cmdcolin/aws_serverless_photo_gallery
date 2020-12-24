"use strict";

const AWS = require("aws-sdk");
const multipart = require("./multipart");

const s3 = new AWS.S3();
const DB = new AWS.DynamoDB.DocumentClient();

// Change this value to adjust the signed URL's expiration
const URL_EXPIRATION_SECONDS = 300;

// Main Lambda entry point
exports.handler = async (event) => {
  return await getUploadURL(event);
};

const getUploadURL = async function (event) {
  try {
    const data = multipart.parse(event);
    const { filename, contentType, user, message } = data;
    const timestamp = +Date.now();
    const Key = `${timestamp}-${filename}`;

    // Get signed URL from S3
    const s3Params = {
      Bucket: process.env.UploadBucket,
      Key,
      Expires: URL_EXPIRATION_SECONDS,
      ContentType: contentType,

      // This ACL makes the uploaded object publicly readable. You must also uncomment
      // the extra permission for the Lambda function in the SAM template.

      ACL: "public-read",
    };

    const uploadURL = await s3.getSignedUrlPromise("putObject", s3Params);

    await DB.put({
      TableName: "myfiles",
      Item: {
        timestamp,
        filename: Key,
        message,
        user,
        contentType,
      },
    }).promise();

    return JSON.stringify({
      uploadURL,
      Key,
    });
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: `${e}` }),
    };
    return response;
  }
};
