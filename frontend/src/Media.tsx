import { BUCKET } from './constants'
import { isVideo } from './files'
import type { DixieFile } from './types'
import { getCaption } from './util'
import classes from './Media.module.css'

export default function Media({
  file,
  filename = file.filename,
  className,
  style,
  onClick,
  children,
}: {
  file: DixieFile
  filename?: string
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  children?: React.ReactNode
}) {
  const src = `${BUCKET}/${filename}`
  return (
    <figure className={classes.figure}>
      {isVideo(file) ? (
        <video
          className={className}
          style={style}
          src={src}
          controls
          playsInline
          preload="metadata"
          onClick={() => {
            onClick?.()
          }}
        />
      ) : (
        <img
          className={className}
          style={style}
          src={src}
          alt={getCaption(file)}
          loading="lazy"
          decoding="async"
          onClick={() => {
            onClick?.()
          }}
        />
      )}
      <figcaption className={classes.caption}>{children}</figcaption>
    </figure>
  )
}
