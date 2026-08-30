import { useState } from 'react'
import { useQueryState } from 'nuqs'
import ExifReader from 'exifreader'
import imageBlobReduce from 'image-blob-reduce'
import { postFile, putToBucket } from './api'
import Dialog from './Dialog'
import { parseExifDate } from './util'
import classes from './UploadDialog.module.css'

const THUMBNAIL_MAX_PIXELS = 500

const reduce = imageBlobReduce()

async function readExifTimestamp(file: File) {
  try {
    const tags = ExifReader.load(await file.arrayBuffer())
    return tags.DateTime ? +parseExifDate(tags.DateTime.description) : undefined
  } catch {
    // an unreadable exif block should not stop the upload
    return undefined
  }
}

export default function UploadDialog({ onClose }: { onClose: () => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [user, setUser] = useState('')
  const [message, setMessage] = useState('')
  const [password] = useQueryState('password', { defaultValue: '' })

  return (
    <Dialog
      title="upload a dixie (supports picture or video)"
      onClose={onClose}
    >
      <div className={classes.form}>
        <div>
          <label htmlFor="upload-user">name (optional) </label>
          <input
            id="upload-user"
            type="text"
            value={user}
            onChange={event => {
              setUser(event.target.value)
            }}
          />
        </div>
        <div>
          <label htmlFor="upload-message">album name (optional) </label>
          <input
            id="upload-message"
            type="text"
            value={message}
            onChange={event => {
              setMessage(event.target.value)
            }}
          />
        </div>
        <input
          multiple
          type="file"
          accept="image/*,video/*"
          aria-label="files to upload"
          onChange={event => {
            setFiles([...(event.target.files ?? [])])
          }}
        />

        {error ? (
          <div className={classes.error}>{`${error}`}</div>
        ) : loading ? (
          <div>{`Uploading...${completed}/${files.length}`}</div>
        ) : null}

        <div className={classes.actions}>
          <button
            disabled={loading || files.length === 0}
            onClick={async () => {
              try {
                setLoading(true)
                setError(undefined)
                setCompleted(0)

                for (const file of files) {
                  const { uploadURL, uploadThumbnailURL, cacheControl } =
                    await postFile({
                      filename: file.name,
                      contentType: file.type,
                      message,
                      user,
                      password,
                      exifTimestamp: await readExifTimestamp(file),
                    })
                  if (uploadThumbnailURL) {
                    const thumbnail = await reduce.toBlob(file, {
                      max: THUMBNAIL_MAX_PIXELS,
                    })
                    await putToBucket(
                      uploadThumbnailURL,
                      cacheControl,
                      thumbnail,
                    )
                  }
                  await putToBucket(uploadURL, cacheControl, file)
                  setCompleted(completed => completed + 1)
                }
                onClose()
              } catch (e) {
                setError(e)
              } finally {
                setLoading(false)
              }
            }}
          >
            upload
          </button>
          <button
            onClick={() => {
              onClose()
            }}
          >
            cancel
          </button>
        </div>
      </div>
    </Dialog>
  )
}
