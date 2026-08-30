import classes from './Dialog.module.css'

export default function Dialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <dialog
      className={classes.dialog}
      // the element is only mounted while open, so showModal on mount and
      // removal from the DOM is what closes it. the open check keeps
      // StrictMode's double ref attach from re-opening an open dialog
      ref={node => {
        if (node && !node.open) {
          node.showModal()
        }
      }}
      onClose={() => {
        onClose()
      }}
      onClick={event => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className={classes.header}>
        <h3 className={classes.title}>{title}</h3>
        <button
          className={classes.close}
          aria-label="close"
          onClick={() => {
            onClose()
          }}
        >
          &times;
        </button>
      </div>
      <div className={classes.content}>{children}</div>
    </dialog>
  )
}
