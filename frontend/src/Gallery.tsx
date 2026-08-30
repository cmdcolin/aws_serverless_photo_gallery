import { Fragment, Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { parseAsInteger, parseAsStringLiteral, useQueryState } from 'nuqs'
import { fetchFiles } from './api'
import { PAGE_SIZE } from './constants'
import {
  FILTER_OPTIONS,
  FILTER_VALUES,
  SORT_OPTIONS,
  SORT_VALUES,
  filterFiles,
  isImage,
  sortFiles,
} from './files'
import Media from './Media'
import Pagination from './Pagination'
import Select from './Select'
import { PublishIcon } from './icons'
import type { DixieFile } from './types'
import { getCaption, hash } from './util'
// generated with ls | jq -R -s -c 'split("\n")[:-1]' > gifs.json
import gifs from './gifs.json'
// generated with ls | jq -R -s -c 'split("\n")[:-1]' > borders.json
import borders from './borders.json'
import classes from './Gallery.module.css'

const PictureDialog = lazy(() => import('./PictureDialog'))
const UploadDialog = lazy(() => import('./UploadDialog'))

const DECORATION_ODDS = 4

// derived from the filename so a photo keeps the same look between renders
function getDecorations(filename: string) {
  const seed = hash(filename)
  return {
    border:
      seed % DECORATION_ODDS === 0
        ? borders[(seed >> 2) % borders.length]
        : undefined,
    gif:
      (seed >> 8) % DECORATION_ODDS === 0
        ? gifs[(seed >> 10) % gifs.length]
        : undefined,
    gifHeight: 100 + ((seed >> 16) % 50),
  }
}

export default function Gallery() {
  const [files, setFiles] = useState<DixieFile[]>()
  const [error, setError] = useState<unknown>()
  const [refresh, setRefresh] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [dialogFile, setDialogFile] = useState<DixieFile>()
  const [password] = useQueryState('password', { defaultValue: '' })
  const [filter, setFilter] = useQueryState(
    'filter',
    parseAsStringLiteral(FILTER_VALUES).withDefault('all'),
  )
  const [sort, setSort] = useQueryState(
    'sort',
    parseAsStringLiteral(SORT_VALUES).withDefault('date_uploaded_dec'),
  )
  const [pageParam, setPage] = useQueryState(
    'page',
    parseAsInteger.withDefault(1),
  )

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        setFiles(await fetchFiles(controller.signal))
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e)
        }
      }
    })()
    return () => {
      controller.abort()
    }
  }, [refresh])

  const visibleFiles = useMemo(
    () => (files ? sortFiles(filterFiles(files, filter), sort) : undefined),
    [files, filter, sort],
  )

  const pageCount = visibleFiles
    ? Math.max(1, Math.ceil(visibleFiles.length / PAGE_SIZE))
    : 1
  const page = Math.min(Math.max(pageParam, 1), pageCount)
  const start = (page - 1) * PAGE_SIZE

  return (
    <div className={classes.gallery}>
      <h2>Dixies</h2>
      <p>Click image to open full size</p>
      <div className={classes.controls}>
        <Select
          label="Filter"
          value={filter}
          options={FILTER_OPTIONS}
          onChange={value => {
            setFilter(value)
            setPage(1)
          }}
        />
        <Select
          label="Sort"
          value={sort}
          options={SORT_OPTIONS}
          onChange={value => {
            setSort(value)
          }}
        />
        {password ? (
          <button
            onClick={() => {
              setUploading(true)
            }}
          >
            add a dixie pic/video <PublishIcon />
          </button>
        ) : null}
      </div>

      <Suspense fallback={null}>
        {uploading ? (
          <UploadDialog
            onClose={() => {
              setUploading(false)
              setRefresh(refresh => refresh + 1)
            }}
          />
        ) : null}
        {dialogFile ? (
          <PictureDialog
            key={dialogFile.filename}
            file={dialogFile}
            onClose={() => {
              setDialogFile(undefined)
            }}
          />
        ) : null}
      </Suspense>

      {error ? (
        <div className={classes.error}>{`${error}`}</div>
      ) : visibleFiles ? (
        <>
          {visibleFiles.slice(start, start + PAGE_SIZE).map(file => {
            const { border, gif, gifHeight } = getDecorations(file.filename)
            const commentCount = file.comments ? file.comments.length : 0
            return (
              <Fragment key={file.filename}>
                <Media
                  file={file}
                  filename={
                    isImage(file) ? `thumbnail-${file.filename}` : undefined
                  }
                  className={classes.thumbnail}
                  style={
                    border
                      ? {
                          border: '30px solid',
                          borderImage: `url(borders/${border}) 30 round`,
                        }
                      : undefined
                  }
                  onClick={() => {
                    setDialogFile(file)
                  }}
                >
                  {getCaption(file)}{' '}
                  <button
                    onClick={() => {
                      setDialogFile(file)
                    }}
                  >
                    {commentCount} comments
                  </button>
                </Media>

                {gif ? (
                  <img
                    className={classes.decoration}
                    style={{ maxHeight: gifHeight }}
                    src={`img/${gif}`}
                    alt=""
                    loading="lazy"
                  />
                ) : null}
              </Fragment>
            )
          })}
          <Pagination
            page={page}
            pageCount={pageCount}
            onChange={page => {
              setPage(page)
            }}
          />
        </>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  )
}
