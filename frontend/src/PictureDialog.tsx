import { useState, useEffect } from 'react'
import { useQueryState } from 'nuqs'
import { makeStyles } from '@mui/styles'
import { Dialog, DialogTitle, DialogContent } from '@mui/material'
import { Create } from '@mui/icons-material'

//locals
import Media from './Media'
import { API_ENDPOINT } from './constants'
import { myfetchjson, getCaption, DixieFile } from './util'

interface Comment {
  timestamp: number
  user?: string
  message: string
  date: string
}

const useStyles = makeStyles(() => ({
  posts: {
    background: '#ddd',
  },
  post: {
    padding: '0.5em',
  },

  error: {
    color: 'red',
  },
}))

function CommentForm({
  filename,
  forceRefresh,
}: {
  filename: string
  forceRefresh: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>()
  const [user, setUser] = useState('')
  const [message, setMessage] = useState('')
  const [password] = useQueryState('password')
  const classes = useStyles()

  return (
    <div>
      {error ? (
        <div className={classes.error}>{`${error}`}</div>
      ) : loading ? (
        <p>Loading...</p>
      ) : (
        <p>Write a comment...</p>
      )}

      <Create />
      <label htmlFor="user">name (optional)</label>
      <input
        id="user"
        type="text"
        value={user}
        onChange={event => setUser(event.target.value)}
      />
      <textarea
        style={{ width: '90%', height: 50 }}
        value={message}
        onChange={event => setMessage(event.target.value)}
      />
      <button
        disabled={loading}
        onClick={async () => {
          try {
            if (user || message) {
              setLoading(true)
              setError(undefined)

              const data = new FormData()
              data.append('message', message)
              data.append('user', user)
              data.append('filename', filename)
              data.append('password', password || '')
              await myfetchjson(API_ENDPOINT + '/postDixieComment', {
                method: 'POST',
                body: data,
              })
              setUser('')
              setMessage('')
              forceRefresh()
            }
          } catch (e) {
            setError(e)
          } finally {
            setLoading(false)
          }
        }}
      >
        Submit
      </button>
    </div>
  )
}

export default function PictureDialog({
  onClose,
  file,
}: {
  onClose: Function
  file?: DixieFile
}) {
  const [comments, setComments] = useState<Comment[]>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>()
  const [counter, setCounter] = useState(0)
  const [password] = useQueryState('password')
  const classes = useStyles()

  const handleClose = () => {
    setLoading(false)
    setError(undefined)
    onClose()
  }

  useEffect(() => {
    ;(async () => {
      try {
        if (file) {
          const result = await myfetchjson(
            API_ENDPOINT + `/getDixieComments?filename=${file?.filename}`,
          )
          setComments(result)
        }
      } catch (e) {
        setError(e)
      }
    })()
  }, [file, counter])

  return (
    <Dialog onClose={handleClose} open={Boolean(file)} maxWidth="lg">
      <DialogTitle>{file ? file.filename : ''}</DialogTitle>
      <DialogContent>
        {file ? (
          <Media file={file} style={{ width: '80%', maxHeight: '70%' }}>
            {getCaption(file)}
          </Media>
        ) : null}
        {error ? (
          <div className={classes.error}>{`${error}`}</div>
        ) : loading ? (
          'Loading...'
        ) : comments ? (
          <div className={classes.posts}>
            {comments
              .sort((a, b) => a.timestamp - b.timestamp)
              .map(comment => {
                const { user, timestamp, message } = comment
                return (
                  <div
                    key={JSON.stringify(comment)}
                    className={classes.post}
                    style={{ background: '#ddd' }}
                  >
                    <div>
                      {user ? user + ' - ' : ''}
                      {new Date(timestamp).toLocaleString()}
                    </div>
                    <div>{message}</div>
                  </div>
                )
              })}
          </div>
        ) : null}
        {file && password ? (
          <CommentForm
            filename={file.filename}
            forceRefresh={() => setCounter(counter + 1)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
