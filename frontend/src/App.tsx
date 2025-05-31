/* eslint-disable */
import React, { Suspense, useMemo, useState, useEffect, lazy } from 'react'
import { makeStyles } from '@mui/styles'
import { Link, IconButton, InputLabel, MenuItem, Select } from '@mui/material'

import { Publish } from '@mui/icons-material'
import { createParser, useQueryState } from 'nuqs'

import { myfetchjson, getCaption, shuffle, DixieFile } from './util'
import { PAGE_SIZE, API_ENDPOINT } from './constants'
import Media from './Media'

// lazy
const PictureDialog = lazy(() => import('./PictureDialog'))
const UploadDialog = lazy(() => import('./UploadDialog'))

// generated with ls | jq -R -s -c 'split("\n")[:-1]' > gifs.json
import gifs from './gifs.json'
// generated with  ls | jq -R -s -c 'split("\n")[:-1]' > borders.json
import borders from './borders.json'

const myimages = shuffle(gifs)
const myborders = shuffle(borders)

const useStyles = makeStyles(() => ({
  app: {
    color: 'white',
    textAlign: 'center',
    padding: '0.5em',
  },

  gallery: {
    textAlign: 'center',
    borderRadius: 25,
    border: '1px solid black',
  },

  space: {
    padding: '2em',
  },
  error: {
    color: 'red',
  },
  rainbow: {
    backgroundImage:
      'linear-gradient(to left, violet, indigo, blue, green, yellow, orange, red);   -webkit-background-clip: text',
    color: 'transparent',
  },
}))

function Gallery() {
  const [files, setFiles] = useState<DixieFile[]>()
  const [error, setError] = useState<unknown>()
  const [uploading, setUploading] = useState(false)
  const numberParser = createParser({
    parse: Number,
    serialize: String,
  })
  
  const [initialStart, setParamStart] = useQueryState('start', numberParser)
  const [initialSort, setSortParam] = useQueryState('sort')
  const [initialFilter, setFilterParam] = useQueryState('filter')
  const [password] = useQueryState('password')
  const [counter, setCounter] = useState(0)
  const [filter, setFilter] = useState(initialFilter || 'all')
  const [sort, setSort] = useState(initialSort || 'date_uploaded_dec')
  const [start, setStart] = useState(initialStart || 0)

  const [dialogFile, setDialogFile] = useState<DixieFile>()

  const classes = useStyles()

  useEffect(() => {
    ;(async () => {
      try {
        const result = await myfetchjson(API_ENDPOINT + '/getDixieFiles')
        setFiles(result.Items)
      } catch (e) {
        setError(e)
      }
    })()
  }, [counter])

  const filteredFiles = useMemo(() => {
    if (files) {
      if (filter === 'videos') {
        return files.filter(f => f.contentType.startsWith('video'))
      } else if (filter === 'no_videos') {
        return files.filter(f => !f.contentType.startsWith('video'))
      } else if (filter === 'commented_on') {
        return files.filter(
          f => f.comments !== undefined && f.comments.length > 0,
        )
      } else return files
    }
  }, [files, filter])

  const fileList = useMemo(() => {
    const future = +new Date('3000')
    const past = +new Date('1960')
    function getTimestamp(t: { exifTimestamp?: number }, repl: number) {
      return !t.exifTimestamp || t.exifTimestamp === past
        ? repl
        : t.exifTimestamp
    }
    if (filteredFiles) {
      if (sort === 'date_uploaded_asc') {
        return filteredFiles.sort((a, b) => a.timestamp - b.timestamp)
      }
      if (sort === 'date_uploaded_dec') {
        return filteredFiles.sort((a, b) => b.timestamp - a.timestamp)
      }
      if (sort === 'date_exif_asc') {
        return filteredFiles.sort(
          (a, b) => getTimestamp(a, future) - getTimestamp(b, future),
        )
      }
      if (sort === 'date_exif_dec') {
        return filteredFiles.sort(
          (a, b) => getTimestamp(b, past) - getTimestamp(a, past),
        )
      }
      if (sort === 'random') {
        return shuffle(filteredFiles)
      }
    }
  }, [filteredFiles, sort])

  return (
    <div className={classes.gallery}>
      <div>
        <h2>Dixies</h2>
        <p>Click image to open full size</p>
        <InputLabel id="demo-simple-select-label">Filter</InputLabel>
        <Select
          value={filter}
          onChange={event => {
            setFilter(event.target.value)
            setFilterParam(event.target.value)
            setStart(0)
            setParamStart(0)
          }}
        >
          <MenuItem value={'all'}>all</MenuItem>
          <MenuItem value={'commented_on'}>has been commented on</MenuItem>
          <MenuItem value={'videos'}>videos only</MenuItem>
          <MenuItem value={'no_videos'}>no videos</MenuItem>
        </Select>
        <InputLabel>Sort</InputLabel>
        <Select
          value={sort}
          onChange={event => {
            setSort(event.target.value)
            setSortParam(event.target.value)
          }}
        >
          <MenuItem value={'random'}>random</MenuItem>
          <MenuItem value={'date_exif_asc'}>exif date (asc)</MenuItem>
          <MenuItem value={'date_exif_dec'}>exif date (dec)</MenuItem>
          <MenuItem value={'date_uploaded_asc'}>date uploaded (asc)</MenuItem>
          <MenuItem value={'date_uploaded_dec'}>date uploaded (dec)</MenuItem>
        </Select>
        <br />
        {password ? (
          <IconButton
            color="primary"
            size="small"
            onClick={() => setUploading(true)}
          >
            add a dixie pic/video
            <Publish />
          </IconButton>
        ) : null}
      </div>

      <UploadDialog
        open={uploading}
        onClose={() => {
          setUploading(false)
          setCounter(counter + 1)
        }}
      />

      <Suspense fallback={<div />}>
        <PictureDialog
          file={dialogFile}
          onClose={() => {
            setDialogFile(undefined)
          }}
        />
      </Suspense>

      {error ? (
        <div className={classes.error}>{`${error}`}</div>
      ) : fileList ? (
        fileList.slice(start, start + PAGE_SIZE).map(file => {
          const { comments = [] } = file
          const token = myimages[Math.floor(Math.random() * myimages.length)]
          const border = myborders[Math.floor(Math.random() * myborders.length)]
          const mod = 4
          const useBorder = Math.floor(Math.random() * mod) === 0
          const useImage = Math.floor(Math.random() * mod) === 0
          const style: React.CSSProperties = {
            maxWidth: '90%',
            maxHeight: 400,
            boxSizing: 'border-box',
            border: useBorder ? '30px solid' : undefined,
            borderImage: useBorder
              ? `url(borders/${border}) 30 round`
              : undefined,
          }
          return (
            <React.Fragment key={JSON.stringify(file)}>
              <Media
                file={{
                  ...file,
                  filename:
                    (file.contentType.startsWith('image') ? 'thumbnail-' : '') +
                    file.filename,
                }}
                onClick={() => {
                  setDialogFile(file)
                }}
                style={style}
              >
                {getCaption(file)}
                <Link
                  href="#"
                  onClick={() => {
                    setDialogFile(file)
                  }}
                >
                  {' '}
                  ({comments.length} comments)
                </Link>
              </Media>

              {useImage ? (
                <img
                  style={{
                    maxWidth: '20%',
                    maxHeight: 100 + Math.random() * 50,
                    padding: 20,
                  }}
                  src={`img/${token}`}
                />
              ) : null}
            </React.Fragment>
          )
        })
      ) : null}
      {filteredFiles ? (
        <div>
          <button
            onClick={() => {
              setStart(0)
              setParamStart(0)
            }}
            disabled={start === 0}
          >
            &lt;&lt; First
          </button>
          <button
            onClick={() => {
              setStart(start - PAGE_SIZE)
              setParamStart(start - PAGE_SIZE)
            }}
            disabled={start - PAGE_SIZE < 0}
          >
            &lt; Previous
          </button>
          <div style={{ display: 'inline' }}>
            {Math.floor(start / PAGE_SIZE)} /{' '}
            {Math.floor(filteredFiles.length / PAGE_SIZE)}
          </div>
          <button
            onClick={() => {
              setStart(start + PAGE_SIZE)
              setParamStart(start + PAGE_SIZE)
            }}
            disabled={start + PAGE_SIZE >= filteredFiles.length}
          >
            Next &gt;
          </button>
          <button
            onClick={() => {
              setStart(
                filteredFiles.length - (filteredFiles.length % PAGE_SIZE),
              )
              setParamStart(
                filteredFiles.length - (filteredFiles.length % PAGE_SIZE),
              )
            }}
            disabled={start + PAGE_SIZE >= filteredFiles.length}
          >
            &gt;&gt; Last
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Header() {
  const classes = useStyles()

  return (
    <div>
      <div className={classes.space}>
        <h1>
          <a style={{ color: 'white' }} href="/">
            dixie
          </a>
          <img
            src="img/animated-candle-image-0093.gif.webp"
            style={{ height: '1em' }}
          />
        </h1>
        <p>a pig that u never forget</p>
        <h3>2008-2020</h3>
      </div>
    </div>
  )
}

function App() {
  const classes = useStyles()

  return (
    <div className={classes.app}>
      <Header />

      <div>
        <Gallery />
      </div>
      <div
        style={{
          margin: '0 auto',
          padding: '1em',
          width: '25%',
          minWidth: 300,
        }}
      >
        <p className={classes.rainbow}>
          created with love for the beautiful pig who touched our hearts
        </p>
        <img src="img/unnamed.gif.webp" width={20} />
        <a href="mailto:colin.diesh@gmail.com">contact</a>
      </div>
    </div>
  )
}

export default App
