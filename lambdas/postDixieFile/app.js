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
    const {
      filename,
      contentType,
      user,
      message,
      password,
      exifTimestamp,
    } = data;
    if (password !== process.env.Password) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Access denied" }),
      };
    }
    const timestamp = +Date.now();
    const Key = `${timestamp}-${filename}`;

    const uploadThumbnailURL = contentType.startsWith("image")
      ? await s3.getSignedUrlPromise("putObject", {
          Bucket: process.env.UploadBucket,
          Key: `thumbnail-${Key}`,
          Expires: URL_EXPIRATION_SECONDS,
          ContentType: contentType,
          ACL: "public-read",
        })
      : undefined;

    const uploadURL = await s3.getSignedUrlPromise("putObject", {
      Bucket: process.env.UploadBucket,
      Key,
      Expires: URL_EXPIRATION_SECONDS,
      ContentType: contentType,
      ACL: "public-read",
    });

    await DB.put({
      TableName: "files",
      Item: {
        timestamp,
        filename: Key,
        message,
        user,
        contentType,
        exifTimestamp: +exifTimestamp,
      },
    }).promise();

    return JSON.stringify({
      uploadURL,
      uploadThumbnailURL,
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
