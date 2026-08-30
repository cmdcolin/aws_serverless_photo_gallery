import { useEffect, useState } from 'react'
import { useQueryState } from 'nuqs'
import { fetchComments } from './api'
import CommentForm from './CommentForm'
import Dialog from './Dialog'
import Media from './Media'
import type { Comment, DixieFile } from './types'
import { getCaption } from './util'
import classes from './PictureDialog.module.css'

export default function PictureDialog({
  onClose,
  file,
}: {
  onClose: () => void
  file: DixieFile
}) {
  const [comments, setComments] = useState<Comment[]>()
  const [error, setError] = useState<unknown>()
  const [refresh, setRefresh] = useState(0)
  const [password] = useQueryState('password', { defaultValue: '' })

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        setComments(await fetchComments(file.filename, controller.signal))
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e)
        }
      }
    })()
    return () => {
      controller.abort()
    }
  }, [file.filename, refresh])

  return (
    <Dialog title={file.filename} onClose={onClose}>
      <Media file={file} className={classes.media}>
        {getCaption(file)}
      </Media>

      {error ? (
        <div className={classes.error}>{`${error}`}</div>
      ) : comments ? (
        <div className={classes.posts}>
          {comments.length ? (
            comments
              .toSorted((a, b) => a.timestamp - b.timestamp)
              .map(comment => (
                <div key={comment.timestamp} className={classes.post}>
                  <div className={classes.byline}>
                    {comment.user ? `${comment.user} - ` : ''}
                    {new Date(comment.timestamp).toLocaleString()}
                  </div>
                  <div className={classes.message}>{comment.message}</div>
                </div>
              ))
          ) : (
            <div className={classes.post}>no comments yet</div>
          )}
        </div>
      ) : (
        <div>Loading comments...</div>
      )}

      {password ? (
        <CommentForm
          filename={file.filename}
          onPosted={() => {
            setRefresh(refresh => refresh + 1)
          }}
        />
      ) : null}
    </Dialog>
  )
}
