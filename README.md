# aws_serverless_photo_gallery

This is an extension of
https://aws.amazon.com/blogs/compute/uploading-to-amazon-s3-directly-from-a-web-or-mobile-application/

This repo has extended the concept to include the following features

- Commenting on photos
- Uploading both videos and photos
- Upload multiple files at a time
- Some simple sorting and filtering
- Client side image resize for thumbnail
- Client side EXIF parse to read date

Example site here https://myloveydove.com/ for our amazing dog dixie (RIP)

You can also see the features for posting/commenting here
https://myloveydove.com/?password=nottherealpassword but this will not let you
actually post (see #security section)

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

- Part 1: Initial experimentation with serverless architecture following the
  AWS tutorial
  https://searchvoidstar.tumblr.com/post/638408397901987840/making-a-serverless-website-for-photo-upload-pt-1

- Part 2: Converting the Vue demo code to React and demo lambda+cloudformation
  template
  https://searchvoidstar.tumblr.com/post/638602799897329664/making-a-serverless-website-for-photo-and-video

- Part 3: registering a domain, using Route 53, and making the S3 static
  website hooked up to CloudFront to make it https compatible
  https://searchvoidstar.tumblr.com/post/638618421776515072/making-a-https-accessible-s3-powered-static-site

### Security

The app only allows someone who visits the page with a special URL format e.g.
`?password=yourSecretPassword` to upload files and post comments. Users without
the right password are not able to post comments or upload files. Having the
password helps prevents drive by spam that would be otherwise hard to moderate

If the password URL parameter is not supplied, the buttons for uploading are
hidden, but if it is supplied they are shown. It still has to match the server
side secret password to succeed posting

### Deployment

Install the aws-sam CLI

```
brew install aws/tap/aws-sam-cli
```

Then use the command

```
sam deploy --guided
```

You can specify the SecretPassword in the guided mode

### What does the deployment do

The deployment will automatically do the following

- Creates lambda functions for posting/reading files and comments
- Creates dynamodb tables for guestbook and files
- Creates an s3 bucket that it puts the photos in. It has a coded name like
  `sam-app-s3uploadbucket-1fyrebt7g2tr3`

Then also update frontend/package.json to do `aws s3 sync` to your website
bucket, and run `yarn deploy`. Note that your website bucket should be
different from the one automatically created by the aws sam template.yaml here

## Database design

This code uses a simple DynamoDB database. I considered using Amazon RDS (e.g.
a real database instead of dynamoDB) but the administration was too
complicated, and so instead I updated the DynamoDB to have comments for the
files directly inside the files table. Storing them separately would imply a
join which DynamoDB does not have

Note that there was a nice recommendation on reddit to use a specialized keys
in DynamoDB to help avoid these problems. See https://github.com/cmdcolin/aws_serverless_photo_gallery/issues/8

## Scalability

The client side currently fetches all photo JSON info and comments for all the
pages of the app in one query. Only the actual img tags on the page download at
a given time though. Unless you have a very large number of photos this is
probably fine. Doing pagination properly would require making a paginated
DynamoDB query but it doesn't use standard LIMIT/OFFSET so it's a little quirky

## Credits

I used a ton of amazing gifs from https://gifcities.org/ and a couple other
places. Thank you to the creators of all those gifs and the internet historians
preserving them. There are many other thanks to give but I'm just grateful to
share :)

## Note

If you are interested in using this and need help, particularly if you want to
use it for a memorial page, feel free to contact me
