# aws_serverless_photo_gallery

This is an extension of
https://aws.amazon.com/blogs/compute/uploading-to-amazon-s3-directly-from-a-web-or-mobile-application/

This repo has extended the concept to include the following features

- Commenting on photos
- Uploading both videos and photos
- Upload multiple files at a time
- Some simple sorting and filtering

## Architecture

```

                     +------------------------------------------------------+
                     |                                                      |
+--------------------+-+   +----------------------------------------+   +---v-----------------------------------+
|                      |   |                                        |   |                                       |
|   Client side        |   |   AWS Lambda "postFile"                |   |  AWS Lambda "postComment"             |
|   React app (CRA)    +--->                                        |   |                                       |
|                      |   |  - Generates pre-signed URL that the   |   |  - Updates the row in the "files"     |
|                      |   |  client side uses to upload directly   |   |  table with a new comment (there is a |
+---------+------------+   |  to S3                                 |   |  list of comments for each entry in   |
          |                |  - Also inserts a row in the "files"   |   |  the files table)                     |
          |                |  DynamoDB                              |   |                                       |
          |                +----------------------------------------+   +---------------------------------------+
          |
+---------v-------------+  +----------------------------------------+
|                       |  |                                        |
|                       |  | AWS DynamoDB Table "files"             |
|  AWS S3 bucket        |  | Each file has a filename that matches  |
|  - The client talks   |  | filename in S3 bucket                  |
|   directly to the S3  |  |                                        |
|   bucket using the    |  | Each row in the "files" table also     |
|   pre-signed URL that |  | has a list of comments (no separate    |
|   "postFile" generates|  | comments table because no joins in     |
|                       |  | DynamoDB)                              |
+-----------------------+  +----------------------------------------+
```

## Blogposts

The process of making this was pretty involved so I made several blogposts about it

- Part 1: Initial experimentation with serverless architecture following the AWS tutorial https://searchvoidstar.tumblr.com/post/638408397901987840/making-a-serverless-website-for-photo-upload-pt-1

- Part 2: Converting the Vue demo code to React and demo lambda+cloudformation template https://searchvoidstar.tumblr.com/post/638602799897329664/making-a-serverless-website-for-photo-and-video

- Part 3: registering a domain, using Route 53, and making the S3 static website hooked up to CloudFront to make it https compatible https://searchvoidstar.tumblr.com/post/638618421776515072/making-a-https-accessible-s3-powered-static-site

```

```

### Note

There is no security on this app, it is meant for a small circle of friends to
trust, so that is an exercise for the reader (PRs also welcome)
