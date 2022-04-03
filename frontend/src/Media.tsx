import { DixieFile } from './util'
import { BUCKET } from './constants'

export default function Media({
  file,
  style,
  onClick,
  children,
}: {
  file: DixieFile
  onClick?: Function
  style?: React.CSSProperties
  children?: React.ReactNode
}) {
  const { filename, contentType } = file
  const src = `${BUCKET}/${filename}`
  return (
    <figure style={{ display: 'inline-block' }}>
      <picture>
        {contentType.startsWith('video') ? (
          <video
            style={style}
            src={src}
            controls
            onClick={event => {
              if (onClick) {
                onClick(event)
                event.preventDefault()
              }
            }}
          />
        ) : (
          <img style={style} src={src} onClick={onClick as any} />
        )}
      </picture>
      <figcaption>{children}</figcaption>
    </figure>
  )
}
