import Gallery from './Gallery'
import classes from './App.module.css'

function Header() {
  return (
    <header className={classes.header}>
      <h1>
        <a className={classes.headerLink} href="/">
          dixie
        </a>
        <img
          className={classes.candle}
          src="img/animated-candle-image-0093.gif.webp"
          alt=""
        />
      </h1>
      <p>a pig that u never forget</p>
      <h3>2008-2020</h3>
    </header>
  )
}

function Footer() {
  return (
    <footer className={classes.footer}>
      <p className={classes.rainbow}>
        created with love for the beautiful pig who touched our hearts
      </p>
      <img src="img/unnamed.gif.webp" width={20} alt="" />
      <a href="mailto:colin.diesh@gmail.com">contact</a>
    </footer>
  )
}

export default function App() {
  return (
    <div className={classes.app}>
      <Header />
      <Gallery />
      <Footer />
    </div>
  )
}
