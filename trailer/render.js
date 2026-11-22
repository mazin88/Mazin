/*
  Renders trailer.html into an MP4 with Playwright + ffmpeg.

  node trailer/render.js video <width> <height> <out.mp4> <audio.wav>
  node trailer/render.js stills <width> <height> <outDir> <t1,t2,...>
*/
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const FPS = 30;
const DURATION = 32;
const [, , mode, w, h, out, extra] = process.argv;
const W = Number(w), H = Number(h);

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto("file://" + path.join(__dirname, "trailer.html") + `?w=${W}&h=${H}&lang=${process.env.TRAILER_LANG || "en"}`);
  await page.evaluate(() => window.trailerReady);

  const frame = async (t, type = "jpeg") => {
    await page.evaluate((t) => window.renderAt(t), t);
    return page.screenshot(type === "png" ? { type: "png" } : { type: "jpeg", quality: 94 });
  };

  if (mode === "stills") {
    fs.mkdirSync(out, { recursive: true });
    const asJpeg = /poster/.test(path.basename(out));
    for (const t of extra.split(",").map(Number)) {
      const buf = await frame(t, asJpeg ? "jpeg" : "png");
      const name = path.join(out, `t${String(t).replace(".", "_")}.${asJpeg ? "jpg" : "png"}`);
      fs.writeFileSync(name, buf);
      console.log("wrote", name);
    }
  } else {
    const ff = spawn("ffmpeg", [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
      "-i", extra,
      "-map", "0:v", "-map", "1:a",
      "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-tune", "film",
      "-maxrate", H > W ? "3M" : "2M", "-bufsize", H > W ? "6M" : "4M",
      "-pix_fmt", "yuv420p", "-profile:v", "high",
      "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", out
    ], { stdio: ["pipe", "inherit", "inherit"] });
    const total = Math.round(FPS * DURATION);
    const [first, last] = process.env.RANGE ? process.env.RANGE.split("-").map(Number) : [0, total];
    const started = Date.now();
    for (let i = first; i < last; i++) {
      const buf = await frame(i / FPS);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 120 === 0) console.log(`frame ${i}/${total}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on("close", r));
    console.log("done", out, ((Date.now() - started) / 1000).toFixed(0) + "s");
  }
  await browser.close();
})();
