import classes from './Pagination.module.css'

export default function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  return (
    <div className={classes.pagination}>
      <button disabled={page === 1} onClick={() => onChange(1)}>
        &lt;&lt; First
      </button>
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>
        &lt; Previous
      </button>
      <span>
        {page} / {pageCount}
      </span>
      <button disabled={page === pageCount} onClick={() => onChange(page + 1)}>
        Next &gt;
      </button>
      <button disabled={page === pageCount} onClick={() => onChange(pageCount)}>
        &gt;&gt; Last
      </button>
    </div>
  )
}
