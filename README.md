# The Last Cigarette

Website for the book **The Last Cigarette** (Arabic: **السيجارة الأخيرة**), a book about breaking free from nicotine.

The site is in two languages. It is a plain static site (HTML, CSS and JavaScript), so there is nothing to install or build.

- **English:** `index.html`
- **Arabic (right to left):** `ar.html`

## Files

| File | What it is |
| --- | --- |
| `index.html` | English page |
| `ar.html` | Arabic page |
| `styles.css` | Colours, fonts and layout, shared by both pages |
| `ar.css` | Arabic font and right-to-left changes (loaded only on `ar.html`) |
| `script.js` | Smoke and gold-dust animation, scroll effects, trailer player, cover clue spots, cost calculator, sign-up form. Works for both languages |
| `assets/cover-en.jpg`, `assets/cover-ar.jpg` | The book cover in each language. Replace these files when the final covers are ready |
| `assets/trailer.mp4`, `assets/trailer-vertical.mp4` | English trailer: wide for computers, vertical for phones and for Instagram Reels, TikTok and YouTube Shorts |
| `assets/trailer-ar.mp4`, `assets/trailer-ar-vertical.mp4` | Arabic trailer, in the same two formats |
| `assets/trailer-*poster*.jpg` | Still images shown before each trailer plays |
| `trailer/` | Source used to make the trailers (see below) |

## Putting the site online (GitHub Pages, free)

1. Open <https://github.com/mazin88/Mazin> and tap **Settings**. On a phone, use the browser's "Desktop site" option if you don't see it.
2. In the left menu, choose **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set **Branch** to `claude/sharp-dijkstra-1gd1ph` (or `main` once it is merged there) and the folder to `/ (root)`. Tap **Save**.
5. Wait one or two minutes. The site will be at:
   - English: **https://mazin88.github.io/Mazin/**
   - Arabic: **https://mazin88.github.io/Mazin/ar.html**

To view the site without hosting, download the repository as a ZIP, unzip it and open `index.html` in a browser. Clicking `index.html` inside GitHub only shows the code.

## Email sign-up and the 29% discount

The sign-up form at the bottom of both pages is connected to Formspree (form `mbgozngw`) through the `@formspree/ajax` library, loaded in each page. Each sign-up also records the page language (`en` or `ar`).

The page tells people to check their inbox for a 29% discount code. The email that sends it is set up outside this site, in one of these:

- **Formspree:** turn on the form's automatic reply and paste in the discount email.
- **An email service** (MailerLite or Mailchimp): create a welcome email that goes to each new subscriber.

## Remaking the trailers

The trailers are drawn from `trailer/trailer.html` and rendered with Playwright and ffmpeg. The English and Arabic versions are chosen with `TRAILER_LANG`. To change the words or the end card, edit the `S` text table in `trailer/trailer.html`.

```bash
python3 trailer/make_audio.py trailer/build/trailer-audio.wav
TRAILER_LANG=en node trailer/render.js video 1280 720 assets/trailer.mp4 trailer/build/trailer-audio.wav
TRAILER_LANG=en node trailer/render.js video 1080 1920 assets/trailer-vertical.mp4 trailer/build/trailer-audio.wav
TRAILER_LANG=ar node trailer/render.js video 1280 720 assets/trailer-ar.mp4 trailer/build/trailer-audio.wav
TRAILER_LANG=ar node trailer/render.js video 1080 1920 assets/trailer-ar-vertical.mp4 trailer/build/trailer-audio.wav
```

Each video takes a few minutes. The poster images are single frames from the end card (`stills` mode, time `31.5`). To preview a trailer live in a browser, open `trailer/trailer.html?w=1280&h=720&preview=1`, adding `&lang=ar` for the Arabic version.

The trailers end with a **29% OFF** label (Arabic: **خصم 29%**). To change it, edit `END_PILL` in `trailer/trailer.html`, then render again.

This needs Node.js with Playwright, Python 3 with NumPy, and ffmpeg.

## Before release

- Have a native Arabic speaker proofread `ar.html` and the Arabic trailer text.
- Replace the "Get the book" buttons with the real sales links.
- Switch on the automatic email that sends the 29% discount code (see above).
- Check the FAQ and "Inside the book" questions against the final book.
