import { useState } from 'react'
import { useQueryState } from 'nuqs'
import { postComment } from './api'
import { CreateIcon } from './icons'
import classes from './PictureDialog.module.css'

export default function CommentForm({
  filename,
  onPosted,
}: {
  filename: string
  onPosted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>()
  const [user, setUser] = useState('')
  const [message, setMessage] = useState('')
  const [password] = useQueryState('password', { defaultValue: '' })

  return (
    <form
      className={classes.form}
      onSubmit={async event => {
        event.preventDefault()
        try {
          setLoading(true)
          setError(undefined)
          await postComment({ filename, message, user, password })
          setUser('')
          setMessage('')
          onPosted()
        } catch (e) {
          setError(e)
        } finally {
          setLoading(false)
        }
      }}
    >
      <p>
        <CreateIcon /> {loading ? 'Posting...' : 'Write a comment...'}
      </p>
      {error ? <div className={classes.error}>{`${error}`}</div> : null}

      <label htmlFor="comment-user">name (optional)</label>
      <input
        id="comment-user"
        type="text"
        value={user}
        onChange={event => {
          setUser(event.target.value)
        }}
      />
      <textarea
        className={classes.textarea}
        aria-label="comment"
        value={message}
        onChange={event => {
          setMessage(event.target.value)
        }}
      />
      <button type="submit" disabled={loading || !message}>
        Submit
      </button>
    </form>
  )
}
