/* eslint-disable */
import React, { useMemo, useState, useReducer, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import DialogTitle from "@material-ui/core/DialogTitle";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import Link from "@material-ui/core/Link";
import DialogContent from "@material-ui/core/DialogContent";
import IconButton from "@material-ui/core/IconButton";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Button from "@material-ui/core/Button";
import PublishIcon from "@material-ui/icons/Publish";
import CreateIcon from "@material-ui/icons/Create";
import { NumberParam, StringParam, useQueryParam } from "use-query-params";
import ExifReader from "exifreader";

import ImageBlobReduce from "image-blob-reduce";
import Pica from "pica";

// this is needed to disable the default features including webworkers, which
// cra has trouble with currently
const pica = Pica({ features: ["js", "wasm", "cib"] });
const reduce = new ImageBlobReduce({ pica });

// generated with ls | jq -R -s -c 'split("\n")[:-1]' > gifs.json
import gifs from "./gifs.json";
import borders from "./borders.json";

const myimages = shuffle(gifs);
const myborders = shuffle(borders);

const PAGE_SIZE = 10;
const API_ENDPOINT = "https://fjgbqj4324.execute-api.us-east-2.amazonaws.com";
const BUCKET =
  "https://sam-app-s3uploadbucket-1fyrebt7g2tr3.s3.us-east-2.amazonaws.com";

//from https://stackoverflow.com/questions/43083993/javascript-how-to-convert-exif-date-time-data-to-timestamp
const parseExifDate = (s: string) => {
  const [year, month, date, hour, min, sec] = s.split(/\D/);
  return new Date(+year, +month - 1, +date, +hour, +min, +sec);
};

const useStyles = makeStyles(() => ({
  app: {
    color: "white",
    backgroundColor: "#927EE4",
    textAlign: "center",
    padding: "0.5em",
  },
  embeddedGuestbook: {
    display: "block",
    borderStyle: "solid",
    borderColor: "black",
    borderWidth: "0 0 1px 1px",
    borderRadius: 25,
    position: "relative",
    float: "right",
    width: "25%",
    minWidth: 300,
    padding: "1em",
  },
  posts: {
    background: "#ddd",
  },
  gallery: {
    textAlign: "center",
    borderRadius: 25,
    border: "1px solid black",
  },
  post: {
    padding: "0.5em",
  },
  space: {
    padding: "2em",
  },
  error: {
    color: "red",
  },
  rainbow: {
    backgroundImage:
      "linear-gradient(to left, violet, indigo, blue, green, yellow, orange, red);   -webkit-background-clip: text",
    color: "transparent",
  },
}));

function shuffle<T>(array: T[]) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

async function myfetch(params: string, opts?: any) {
  const response = await fetch(params, opts);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return response;
}

async function myfetchjson(params: string, opts?: any) {
  const res = await myfetch(params, opts);
  return res.json();
}

interface Comment {
  timestamp: number;
  user?: string;
  message: string;
  date: string;
}

function CommentForm({
  filename,
  forceRefresh,
}: {
  filename: string;
  forceRefresh: Function;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();
  const [user, setUser] = useState("");
  const [message, setMessage] = useState("");
  const [password] = useQueryParam("password", StringParam);
  const classes = useStyles();

  return (
    <div>
      {error ? (
        <div className={classes.error}>{`${error}`}</div>
      ) : loading ? (
        <p>Loading...</p>
      ) : (
        <p>Write a comment...</p>
      )}

      <CreateIcon />
      <label htmlFor="user">name (optional)</label>
      <input
        id="user"
        type="text"
        value={user}
        onChange={(event) => setUser(event.target.value)}
      />
      <textarea
        style={{ width: "90%", height: 50 }}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <button
        disabled={loading}
        onClick={async () => {
          try {
            if (user || message) {
              setLoading(true);
              setError(undefined);

              const data = new FormData();
              data.append("message", message);
              data.append("user", user);
              data.append("filename", filename);
              data.append("password", password || "");
              await myfetchjson(API_ENDPOINT + "/postComment", {
                method: "POST",
                body: data,
              });
              setUser("");
              setMessage("");
              forceRefresh();
            }
          } catch (e) {
            setError(e);
          } finally {
            setLoading(false);
          }
        }}
      >
        Submit
      </button>
    </div>
  );
}

function PictureDialog({ onClose, file }: { onClose: Function; file?: File }) {
  const [comments, setComments] = useState<Comment[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();
  const [counter, setCounter] = useState(0);
  const [password] = useQueryParam("password", StringParam);
  const classes = useStyles();

  const handleClose = () => {
    setLoading(false);
    setError(undefined);
    onClose();
  };

  useEffect(() => {
    (async () => {
      try {
        if (file) {
          const result = await myfetchjson(
            API_ENDPOINT + `/getComments?filename=${file?.filename}`
          );
          setComments(result);
        }
      } catch (e) {
        setError(e);
      }
    })();
  }, [file, counter]);

  return (
    <Dialog onClose={handleClose} open={Boolean(file)} maxWidth="lg">
      <DialogTitle>{file ? file.filename : ""}</DialogTitle>
      <DialogContent>
        {file ? (
          <Media file={file} style={{ width: "80%", maxHeight: "70%" }}>
            {getCaption(file)}
          </Media>
        ) : null}
        {error ? (
          <div className={classes.error}>{`${error}`}</div>
        ) : loading ? (
          "Loading..."
        ) : comments ? (
          <div className={classes.posts}>
            {comments
              .sort((a, b) => a.timestamp - b.timestamp)
              .map((comment) => {
                const { user, timestamp, message } = comment;
                return (
                  <div
                    key={JSON.stringify(comment)}
                    className={classes.post}
                    style={{ background: "#ddd" }}
                  >
                    <div>
                      {user ? user + " - " : ""}
                      {new Date(timestamp).toLocaleString()}
                    </div>
                    <div>{message}</div>
                  </div>
                );
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
  );
}

function GuestbookDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [password] = useQueryParam("password", StringParam);
  const [user, setUser] = useState<string>("");

  const handleClose = () => {
    setError(undefined);
    onClose();
  };

  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogTitle>write a message about dixie</DialogTitle>

      <DialogContent>
        <label htmlFor="user">Your name:</label>
        <input
          id="user"
          type="text"
          value={user}
          onChange={(event) => setUser(event.target.value)}
        />
        <br />
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          rows={10}
          value={message}
          style={{ width: "100%" }}
          onChange={(event) => setMessage(event.target.value)}
        />

        {loading ? "Uploading..." : null}
        {error ? <div className="error">{`${error}`}</div> : null}

        <DialogActions>
          <Button
            style={{ textTransform: "none" }}
            disabled={loading}
            onClick={async () => {
              try {
                if (user || message) {
                  setLoading(true);

                  const data = new FormData();
                  data.append("message", message);
                  data.append("user", user);
                  data.append("password", password || "");
                  await myfetchjson(API_ENDPOINT + "/postGuestbookComment", {
                    method: "POST",
                    body: data,
                  });

                  setTimeout(() => {
                    handleClose();
                  }, 500);
                }
              } catch (e) {
                setError(e);
              } finally {
                setLoading(false);
              }
            }}
            color="primary"
          >
            submit
          </Button>
          <Button
            onClick={handleClose}
            color="primary"
            style={{ textTransform: "none" }}
          >
            cancel
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [images, setImages] = useState<FileList>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [user, setUser] = useState("");
  const [message, setMessage] = useState("");
  const [password] = useQueryParam("password", StringParam);
  const classes = useStyles();

  const handleClose = () => {
    setError(undefined);
    setLoading(false);
    setImages(undefined);
    setCompleted(0);
    setTotal(0);
    setMessage("");
    onClose();
  };

  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogTitle>upload a dixie (supports picture or video)</DialogTitle>

      <DialogContent>
        <label htmlFor="user">name (optional) </label>
        <input
          type="text"
          value={user}
          onChange={(event) => setUser(event.target.value)}
          id="user"
        />
        <br />
        <label htmlFor="user">album name (optional) </label>
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          id="message"
        />
        <br />
        <input
          multiple
          type="file"
          onChange={(e) => {
            let files = e.target.files;
            if (files && files.length) {
              setImages(files);
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
            style={{ textTransform: "none" }}
            onClick={async () => {
              try {
                if (images) {
                  setLoading(true);
                  setError(undefined);
                  setCompleted(0);
                  setTotal(images.length);
                  for (const image of Array.from(images)) {
                    const exifData: {
                      DateTime?: { description: string };
                    } = await new Promise((resolve, reject) => {
                      var reader = new FileReader();

                      reader.onload = function (e) {
                        if (e.target && e.target.result) {
                          try {
                            resolve(
                              ExifReader.load(e.target.result as ArrayBuffer)
                            );
                          } catch (e) {
                            /* swallow error because exif error not that important maybe */
                          }
                        }
                        resolve({});
                      };
                      reader.onerror = reject;
                      reader.readAsArrayBuffer(image);
                    });

                    const data = new FormData();
                    data.append("message", message);
                    data.append("user", user);
                    data.append("filename", image.name);
                    data.append("contentType", image.type);
                    data.append("password", password || "");

                    if (exifData.DateTime) {
                      const exifTimestamp = +parseExifDate(
                        exifData.DateTime.description
                      );
                      data.append("exifTimestamp", `${exifTimestamp}`);
                    } else {
                      data.append("exifTimestamp", `${+new Date("1960")}`);
                    }

                    const res = await myfetchjson(API_ENDPOINT + "/postFile", {
                      method: "POST",
                      body: data,
                    });
                    if (res.uploadThumbnailURL) {
                      const reducedImage = await reduce.toBlob(image, {
                        max: 500,
                      });
                      await myfetch(res.uploadThumbnailURL, {
                        method: "PUT",
                        body: reducedImage,
                      });
                    }
                    await myfetch(res.uploadURL, {
                      method: "PUT",
                      body: image,
                    });

                    setCompleted((completed) => completed + 1);
                  }
                  setTimeout(() => {
                    handleClose();
                  }, 500);
                }
              } catch (e) {
                setError(e);
              }
            }}
            color="primary"
          >
            upload
          </Button>
          <Button
            onClick={handleClose}
            color="primary"
            style={{ textTransform: "none" }}
          >
            cancel
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
interface Item {
  message: string;
  user: string;
  timestamp: number;
}

function Guestbook({ className }: { className?: string }) {
  const classes = useStyles();
  const [posts, setPosts] = useState<Item[]>();
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<Error>();
  const [password] = useQueryParam("password", StringParam);
  const [counter, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    (async () => {
      try {
        const result = await myfetchjson(
          API_ENDPOINT + "/getGuestbookComments"
        );
        setPosts(result.Items);
      } catch (e) {
        setError(e);
      }
    })();
  }, [counter]);

  return (
    <div className={className}>
      <h2>Guestbook</h2>
      <div>
        {error ? (
          <div className="error">{`${error}`}</div>
        ) : posts ? (
          posts.map((post) => (
            <div className={classes.post} key={JSON.stringify(post)}>
              <div className="user">
                {post.user} wrote on{" "}
                {new Date(post.timestamp).toLocaleDateString()}:
              </div>
              <div className="message">{post.message}</div>
            </div>
          ))
        ) : null}
        {password ? (
          <IconButton
            color="secondary"
            size="small"
            onClick={() => setWriting(true)}
          >
            write a msg
            <CreateIcon />
          </IconButton>
        ) : null}
      </div>

      <GuestbookDialog
        open={writing}
        onClose={() => {
          setWriting(false);
          forceUpdate();
        }}
      />
    </div>
  );
}

interface File {
  timestamp: number;
  filename: string;
  user: string;
  message: string;
  date: string;
  contentType: string;
  comments: unknown[];
  exifTimestamp: number;
}
function Media({
  file,
  style,
  onClick,
  children,
}: {
  file: File;
  onClick?: Function;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const { filename, contentType } = file;
  const src = `${BUCKET}/${filename}`;
  return (
    <figure style={{ display: "inline-block" }}>
      <picture>
        {contentType.startsWith("video") ? (
          <video
            style={style}
            src={src}
            controls
            onClick={(event) => {
              if (onClick) {
                onClick(event);
                event.preventDefault();
              }
            }}
          />
        ) : (
          <img style={style} src={src} onClick={onClick as any} />
        )}
      </picture>
      <figcaption>{children}</figcaption>
    </figure>
  );
}

function getCaption(file: File) {
  const { user, message, timestamp, exifTimestamp } = file;
  return `${
    user || message
      ? `${user ? user + " - " : ""}${message ? message : ""}`
      : " "
  } posted ${new Date(timestamp).toLocaleDateString()} ${
    exifTimestamp
      ? `| taken ${new Date(exifTimestamp).toLocaleDateString()}`
      : ""
  }`;
}

function Gallery({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<File[]>();
  const [error, setError] = useState<Error>();
  const [uploading, setUploading] = useState(false);
  const [initialStart, setParamStart] = useQueryParam("start", NumberParam);
  const [initialSort, setSortParam] = useQueryParam("sort", StringParam);
  const [initialFilter, setFilterParam] = useQueryParam("filter", StringParam);
  const [password] = useQueryParam("password", StringParam);
  const [counter, setCounter] = useState(0);
  const [filter, setFilter] = useState(initialFilter || "all");
  const [sort, setSort] = useState(initialSort || "date_uploaded_asc");
  const [start, setStart] = useState(initialStart || 0);

  const [dialogFile, setDialogFile] = useState<File>();

  const classes = useStyles();

  useEffect(() => {
    (async () => {
      try {
        const result = await myfetchjson(API_ENDPOINT + "/getFiles");
        setFiles(result.Items);
      } catch (e) {
        setError(e);
      }
    })();
  }, [counter]);

  const filteredFiles = useMemo(() => {
    if (files) {
      if (filter === "videos") {
        return files.filter((f) => f.contentType.startsWith("video"));
      } else if (filter === "no_videos") {
        return files.filter((f) => !f.contentType.startsWith("video"));
      } else if (filter === "commented_on") {
        return files.filter(
          (f) => f.comments !== undefined && f.comments.length > 0
        );
      } else return files;
    }
  }, [files, filter]);

  const fileList = useMemo(() => {
    const future = +new Date("3000");
    if (filteredFiles) {
      if (sort === "date_uploaded_asc") {
        return filteredFiles.sort((a, b) => b.timestamp - a.timestamp);
      }
      if (sort === "date_uploaded_dec") {
        return filteredFiles.sort((a, b) => a.timestamp - b.timestamp);
      }
      if (sort === "date_exif_asc") {
        return filteredFiles.sort(
          (a, b) => (b.exifTimestamp || 0) - (a.exifTimestamp || 0)
        );
      }
      if (sort === "date_exif_dec") {
        return filteredFiles.sort(
          (a, b) => (a.exifTimestamp || future) - (b.exifTimestamp || future)
        );
      }
      if (sort === "random") {
        return shuffle(filteredFiles);
      }
    }
  }, [filteredFiles, sort]);

  return (
    <div className={classes.gallery}>
      {children}
      <div>
        <h2>Dixies</h2>
        <p>Click image to open full size</p>
        <InputLabel id="demo-simple-select-label">Filter</InputLabel>
        <Select
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setFilterParam(event.target.value);
            setStart(0);
            setParamStart(0);
          }}
        >
          <MenuItem value={"all"}>all</MenuItem>
          <MenuItem value={"commented_on"}>has been commented on</MenuItem>
          <MenuItem value={"videos"}>videos only</MenuItem>
          <MenuItem value={"no_videos"}>no videos</MenuItem>
        </Select>
        <InputLabel>Sort</InputLabel>
        <Select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value);
            setSortParam(event.target.value);
          }}
        >
          <MenuItem value={"random"}>random</MenuItem>
          <MenuItem value={"date_exif_asc"}>exif date (asc)</MenuItem>
          <MenuItem value={"date_exif_dec"}>exif date (dec)</MenuItem>
          <MenuItem value={"date_uploaded_asc"}>date uploaded (asc)</MenuItem>
          <MenuItem value={"date_uploaded_dec"}>date uploaded (dec)</MenuItem>
        </Select>
        <br />
        {password ? (
          <IconButton
            color="primary"
            size="small"
            onClick={() => setUploading(true)}
          >
            add a dixie pic/video
            <PublishIcon />
          </IconButton>
        ) : null}
      </div>

      <UploadDialog
        open={uploading}
        onClose={() => {
          setUploading(false);
          setCounter(counter + 1);
        }}
      />

      <PictureDialog
        file={dialogFile}
        onClose={() => {
          setDialogFile(undefined);
        }}
      />
      {error ? (
        <div className={classes.error}>{`${error}`}</div>
      ) : fileList ? (
        fileList.slice(start, start + PAGE_SIZE).map((file) => {
          const {
            user,
            comments = [],
            message,
            timestamp,
            exifTimestamp,
          } = file;
          const token = myimages[Math.floor(Math.random() * myimages.length)];
          const border =
            myborders[Math.floor(Math.random() * myborders.length)];
          const mod = 4;
          const useBorder = Math.floor(Math.random() * mod) === 0;
          const useImage = Math.floor(Math.random() * mod) === 0;
          const style: React.CSSProperties = {
            maxWidth: "90%",
            maxHeight: 400,
            boxSizing: "border-box",
            border: useBorder ? "30px solid" : undefined,
            borderImage: useBorder
              ? `url(borders/${border}) 30 round`
              : undefined,
          };
          return (
            <React.Fragment key={JSON.stringify(file)}>
              <Media
                file={{
                  ...file,
                  filename:
                    (file.contentType.startsWith("image") ? "thumbnail-" : "") +
                    file.filename,
                }}
                onClick={() => {
                  setDialogFile(file);
                }}
                style={style}
              >
                {getCaption(file)}
                <Link
                  href="#"
                  onClick={() => {
                    setDialogFile(file);
                  }}
                >
                  {" "}
                  ({comments.length} comments)
                </Link>
              </Media>

              {useImage ? (
                <img
                  style={{
                    maxWidth: "20%",
                    maxHeight: 100 + Math.random() * 50,
                    padding: 20,
                  }}
                  src={`img/${token}`}
                />
              ) : null}
            </React.Fragment>
          );
        })
      ) : null}
      {files ? (
        <>
          <br />
          <button
            onClick={() => {
              setStart(0);
              setParamStart(0);
            }}
            disabled={start === 0}
          >
            &lt;&lt; First
          </button>
          <button
            onClick={() => {
              setStart(start - PAGE_SIZE);
              setParamStart(start - PAGE_SIZE);
            }}
            disabled={start - PAGE_SIZE < 0}
          >
            &lt; Previous
          </button>
          <div style={{ display: "inline" }}>
            {Math.floor(start / PAGE_SIZE)} /{" "}
            {Math.floor(files.length / PAGE_SIZE)}
          </div>
          <button
            onClick={() => {
              setStart(start + PAGE_SIZE);
              setParamStart(start + PAGE_SIZE);
            }}
            disabled={start + PAGE_SIZE >= files.length}
          >
            Next &gt;
          </button>
          <button
            onClick={() => {
              setStart(files.length - (files.length % PAGE_SIZE));
              setParamStart(files.length - (files.length % PAGE_SIZE));
            }}
            disabled={start + PAGE_SIZE >= files.length}
          >
            &gt;&gt; Last
          </button>
        </>
      ) : null}
    </div>
  );
}

function Header() {
  const classes = useStyles();

  return (
    <div>
      <div className={classes.space}>
        <h1>
          <a style={{ color: "white" }} href="/">
            dixie
          </a>
          <img
            src="img/animated-candle-image-0093.gif"
            style={{ height: "1em" }}
          />
        </h1>
        <p>a pig that u never forget</p>
        <h3>2008-2020</h3>
      </div>
    </div>
  );
}

function App() {
  const classes = useStyles();
  const [width, setWidth] = useState(window.innerWidth);
  const breakpoint = 700;

  useEffect(() => {
    const handleWindowResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleWindowResize);

    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  return (
    <div className={classes.app}>
      <Header />

      <div>
        <Gallery>
          {width > breakpoint ? (
            <Guestbook className={classes.embeddedGuestbook} />
          ) : null}
        </Gallery>
        {width < breakpoint ? <Guestbook /> : null}
      </div>
      <div
        style={{
          margin: "0 auto",
          padding: "1em",
          width: "25%",
          minWidth: 300,
        }}
      >
        <p className={classes.rainbow}>
          created with love for the beautiful pig who touched our hearts
        </p>
        <img src="img/unnamed.gif" width={20} />
        <a href="mailto:colin.diesh@gmail.com">contact</a>
      </div>
    </div>
  );
}

export default App;
