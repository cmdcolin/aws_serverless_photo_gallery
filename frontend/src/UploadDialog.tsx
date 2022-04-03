import { useState } from 'react'
import { StringParam, useQueryParam } from 'use-query-params'
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
} from '@mui/material'
import { makeStyles } from '@mui/styles'

import ExifReader from 'exifreader'

import ImageBlobReduce from 'image-blob-reduce'
import Pica from 'pica'

//locals
import { myfetchjson, myfetch, parseExifDate } from './util'
import { API_ENDPOINT } from './constants'

// this is needed to disable the default features including webworkers, which
// cra has trouble with currently
const pica = Pica({ features: ['js', 'wasm', 'cib'] })
const reduce = new ImageBlobReduce({ pica })

const useStyles = makeStyles(() => ({
  error: {
    color: 'red',
  },
}))

export default function UploadDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [images, setImages] = useState<FileList>()
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [user, setUser] = useState('')
  const [message, setMessage] = useState('')
  const [password] = useQueryParam('password', StringParam)
  const classes = useStyles()

  const handleClose = () => {
    setError(undefined)
    setLoading(false)
    setImages(undefined)
    setCompleted(0)
    setTotal(0)
    setMessage('')
    onClose()
  }

  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogTitle>upload a dixie (supports picture or video)</DialogTitle>

      <DialogContent>
        <label htmlFor="user">name (optional) </label>
        <input
          type="text"
          value={user}
          onChange={event => setUser(event.target.value)}
          id="user"
        />
        <br />
        <label htmlFor="user">album name (optional) </label>
        <input
          type="text"
          value={message}
          onChange={event => setMessage(event.target.value)}
          id="message"
        />
        <br />
        <input
          multiple
          type="file"
          onChange={e => {
            let files = e.target.files
            if (files && files.length) {
              setImages(files)
            }
          }}
        />

        {error ? (
          <div className={classes.error}>{`${error}`}</div>
        ) : loading ? (
          `Uploading...${completed}/${total}`
        ) : completed ? (
          <h2>Uploaded </h2>
        ) : null}

        <DialogActions>
          <Button
            style={{ textTransform: 'none' }}
            onClick={async () => {
              try {
                if (images) {
                  setLoading(true)
                  setError(undefined)
                  setCompleted(0)
                  setTotal(images.length)

                  for (const image of Array.from(images)) {
                    const exifData: {
                      DateTime?: { description: string }
                    } = await new Promise((resolve, reject) => {
                      var reader = new FileReader()

                      reader.onload = function (e) {
                        if (e.target && e.target.result) {
                          try {
                            resolve(
                              ExifReader.load(e.target.result as ArrayBuffer),
                            )
                          } catch (e) {
                            /* swallow error because exif error not that
                             * important maybe */
                          }
                        }
                        resolve({})
                      }
                      reader.onerror = reject
                      reader.readAsArrayBuffer(image)
                    })

                    const data = new FormData()
                    data.append('message', message)
                    data.append('user', user)
                    data.append('filename', image.name)
                    data.append('contentType', image.type)
                    data.append('password', password || '')

                    if (exifData.DateTime) {
                      const exifTimestamp = +parseExifDate(
                        exifData.DateTime.description,
                      )
                      data.append('exifTimestamp', `${exifTimestamp}`)
                    } else {
                      data.append('exifTimestamp', `${+new Date('1960')}`)
                    }

                    const res = await myfetchjson(
                      API_ENDPOINT + '/postDixieFile',
                      {
                        method: 'POST',
                        body: data,
                      },
                    )
                    if (res.uploadThumbnailURL) {
                      const reducedImage = await reduce.toBlob(image, {
                        max: 500,
                      })
                      await myfetch(res.uploadThumbnailURL, {
                        method: 'PUT',
                        body: reducedImage,
                      })
                    }
                    await myfetch(res.uploadURL, {
                      method: 'PUT',
                      body: image,
                    })

                    setCompleted(completed => completed + 1)
                  }
                  setTimeout(() => {
                    handleClose()
                  }, 500)
                }
              } catch (e) {
                setError(e)
              }
            }}
            color="primary"
          >
            upload
          </Button>
          <Button
            onClick={handleClose}
            color="primary"
            style={{ textTransform: 'none' }}
          >
            cancel
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  )
}
