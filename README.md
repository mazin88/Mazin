# The Slave and the Master

Website for the book *The Slave and the Master: How Nicotine Enslaves You… and How to Break Free for Good*.

It is a plain static site (HTML, CSS, JavaScript). There is nothing to install or build.

## What's in it

| File | What it is |
| --- | --- |
| `index.html` | All the page text and sections |
| `styles.css` | Colours (from the book cover), fonts, layout for phone and desktop |
| `script.js` | Slow-motion smoke, gold dust, scroll effects, trailer player, cover clues, cost calculator, sign-up form |
| `assets/cover.jpg` | The book cover. Replace it with the final cover (same file name) |
| `assets/trailer.mp4` | 32-second trailer, wide (16:9), shown on computers |
| `assets/trailer-vertical.mp4` | Same trailer, vertical (9:16), shown on phones. Also ready for Instagram Reels, TikTok and YouTube Shorts |
| `assets/trailer-poster*.jpg` | The still image shown before the trailer plays |
| `trailer/` | The source used to make the trailer videos (see below) |

## See it on your phone or computer

**Put it online with GitHub Pages (free):**

1. Open <https://github.com/mazin88/Mazin> and tap **Settings** (on a phone, use the browser's "Desktop site" option if you don't see it).
2. In the left menu, choose **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set **Branch** to `claude/sharp-dijkstra-1gd1ph` (or `main` once the site is merged there) and the folder to `/ (root)`. Tap **Save**.
5. Wait one or two minutes. Your site will be at **https://mazin88.github.io/Mazin/**

**Open it on a computer without hosting:** on the GitHub page tap **Code → Download ZIP**, unzip it, then double-click `index.html`.

Clicking `index.html` inside GitHub only shows the code, not the website. That is normal.

## Collecting emails

The "Notify me" form does not save emails yet. To collect them:

1. Create a free form at <https://formspree.io>.
2. Copy its address (it looks like `https://formspree.io/f/abcdwxyz`).
3. In `script.js`, paste it into `const NOTIFY_ENDPOINT = "";` between the quotes.

## Remaking the trailer

Change the words or the ending line in `trailer/trailer.html` (for example `END_LINE = "OUT NOW"`), then run:

```bash
python3 trailer/make_audio.py trailer/build/trailer-audio.wav
node trailer/render.js video 1280 720 assets/trailer.mp4 trailer/build/trailer-audio.wav
node trailer/render.js video 1080 1920 assets/trailer-vertical.mp4 trailer/build/trailer-audio.wav
node trailer/render.js stills 1280 720 trailer/build/poster 31.5
node trailer/render.js stills 1080 1920 trailer/build/poster-vertical 31.5
```

This needs Node.js with Playwright, Python 3 with NumPy, and ffmpeg. To watch the trailer play live in a browser, open `trailer/trailer.html?w=1280&h=720&preview=1`.
