(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (x) => x * x * (3 - 2 * x);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================================================
     1. SLOW-MOTION SMOKE  (WebGL shader, with a 2D fallback)
     ========================================================= */
  const SMOKE_FRAG = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uDensity;

    float hash(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
      return v;
    }
    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;
      vec2 p = vec2(uv.x * aspect * 1.9, uv.y * 1.25);
      float t = uTime * 0.035;                 /* slow motion */
      p.y -= t * 1.3;                          /* smoke rises */
      vec2 q = vec2(fbm(p + vec2(0.0, t * 0.6)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.4, 0.0)));
      vec2 r = vec2(fbm(p + 3.4 * q + vec2(1.7, 9.2) + 0.15 * t),
                    fbm(p + 3.4 * q + vec2(8.3, 2.8) + 0.12 * t));
      float f = fbm(p + 2.8 * r);
      float wisps = smoothstep(0.44, 0.98, f * 1.1 + 0.2 * r.x - 0.04);
      float low = smoothstep(1.15, 0.0, uv.y);                       /* thicker near the bottom */
      vec2 c = (uv - vec2(0.5, 0.56)) * vec2(1.4, 1.0);
      float aroundTitle = smoothstep(0.10, 0.75, length(c));         /* lighter behind the title */
      float a = wisps * (0.38 + 0.62 * low) * mix(0.4, 1.0, aroundTitle) * uDensity * 0.66;
      vec3 col = mix(vec3(0.31, 0.27, 0.25), vec3(0.6, 0.55, 0.52), f);
      gl_FragColor = vec4(col * a, a);
    }`;

  function createGLSmoke(canvas) {
    let gl = null;
    try {
      gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    } catch (e) { gl = null; }
    if (!gl) return null;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}");
    const fs = compile(gl.FRAGMENT_SHADER, SMOKE_FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uDensity = gl.getUniformLocation(prog, "uDensity");
    const SCALE = 0.5; // smoke is soft, so half resolution looks the same and is much lighter

    return {
      resize() {
        canvas.width = Math.max(1, Math.round(canvas.clientWidth * SCALE));
        canvas.height = Math.max(1, Math.round(canvas.clientHeight * SCALE));
        gl.viewport(0, 0, canvas.width, canvas.height);
      },
      draw(t, density) {
        if (gl.isContextLost()) return;
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, t);
        gl.uniform1f(uDensity, density);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  }

  function create2DSmoke(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return { resize() {}, draw() {} };
    const tex = document.createElement("canvas");
    tex.width = tex.height = 256;
    const t2 = tex.getContext("2d");
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * 70;
      const x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d * 0.6, r = 18 + Math.random() * 46;
      const g = t2.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(90, 80, 74, 0.10)");
      g.addColorStop(1, "rgba(90, 80, 74, 0)");
      t2.fillStyle = g;
      t2.beginPath(); t2.arc(x, y, r, 0, Math.PI * 2); t2.fill();
    }
    let W = 0, H = 0, puffs = [];
    return {
      resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        W = canvas.clientWidth; H = canvas.clientHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const n = Math.round(clamp(W / 28, 16, 46));
        puffs = Array.from({ length: n }, () => ({
          x: Math.random(), y0: Math.random(), s: 0.35 + Math.random() * 0.65,
          v: 0.006 + Math.random() * 0.012, rot: Math.random() * 6.28,
          vr: (Math.random() - 0.5) * 0.05, a: 0.3 + Math.random() * 0.5, ph: Math.random() * 6.28
        }));
      },
      draw(t, density) {
        ctx.clearRect(0, 0, W, H);
        const big = Math.max(W, H) * 0.55;
        for (const p of puffs) {
          const size = p.s * big, span = H + size * 1.2;
          const y = H + size * 0.6 - ((p.y0 + p.v * t) % 1) * span;
          const x = p.x * W + Math.sin(t * 0.18 + p.ph) * 24;
          const life = clamp((H + size * 0.6 - y) / (H * 0.35), 0, 1) * clamp((y + size * 0.6) / (H * 0.35), 0, 1);
          ctx.globalAlpha = p.a * life * density;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(p.rot + p.vr * t);
          ctx.drawImage(tex, -size / 2, -size / 2, size, size);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    };
  }

  /* =========================================================
     2. GOLD DUST  (a diagonal band of glitter, like the cover)
     ========================================================= */
  function createDust(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return { resize() {}, draw() {} };
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const s2 = sprite.getContext("2d");
    const g = s2.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255, 226, 150, 1)");
    g.addColorStop(0.25, "rgba(232, 178, 64, .85)");
    g.addColorStop(1, "rgba(201, 147, 40, 0)");
    s2.fillStyle = g;
    s2.fillRect(0, 0, 32, 32);

    let W = 0, H = 0, parts = [];
    const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
    function seed() {
      const n = Math.round(clamp((W * H) / 7000, 70, 230));
      parts = Array.from({ length: n }, () => {
        const inBand = Math.random() < 0.82;
        return {
          inBand,
          u0: Math.random(),
          off: gauss() * (0.05 + Math.random() * 0.06),
          x0: Math.random(), y0: Math.random(),
          speed: 0.004 + Math.random() * 0.008,
          r: 1.2 + Math.pow(Math.random(), 3) * 7,
          a: 0.35 + Math.random() * 0.65,
          tw: 0.5 + Math.random() * 1.6,
          ph: Math.random() * 6.28
        };
      });
    }
    return {
      resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const nw = canvas.clientWidth, nh = canvas.clientHeight;
        const reseed = Math.abs(nw - W) > 2 || Math.abs(nh - H) > 140 || !parts.length;
        W = nw; H = nh;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (reseed) seed();
      },
      draw(t, density) {
        ctx.clearRect(0, 0, W, H);
        for (const p of parts) {
          let x, y;
          if (p.inBand) {
            const u = (p.u0 + p.speed * t) % 1;          // drift along the band
            x = u * (W + 40) - 20;
            y = H * (0.80 - 0.44 * u + p.off);
          } else {
            x = p.x0 * W;
            y = ((p.y0 - p.speed * 0.6 * t) % 1 + 1) % 1 * H;
          }
          const tw = 0.5 + 0.5 * Math.sin(t * p.tw + p.ph);
          ctx.globalAlpha = p.a * (0.35 + 0.65 * tw) * density;
          ctx.drawImage(sprite, x - p.r, y - p.r, p.r * 2, p.r * 2);
        }
        ctx.globalAlpha = 1;
      }
    };
  }

  /* =========================================================
     3. BURNT CORNER  (glowing crack, like the cover's top right)
     ========================================================= */
  function buildBurnCorner(svg) {
    if (!svg) return;
    const NS = "http://www.w3.org/2000/svg";
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const P0 = [104, -6], C = [262, 150], P2 = [406, 292];
    const pts = [];
    const N = 40;
    let j = 0;
    for (let i = 0; i <= N; i++) {
      const t = i / N, mt = 1 - t;
      const x = mt * mt * P0[0] + 2 * mt * t * C[0] + t * t * P2[0];
      const y = mt * mt * P0[1] + 2 * mt * t * C[1] + t * t * P2[1];
      const dx = 2 * mt * (C[0] - P0[0]) + 2 * t * (P2[0] - C[0]);
      const dy = 2 * mt * (C[1] - P0[1]) + 2 * t * (P2[1] - C[1]);
      const len = Math.hypot(dx, dy) || 1;
      const notch = rnd() < 0.1 ? (rnd() - 0.3) * 14 : 0;
      j = j * 0.55 + (rnd() - 0.5) * 8 + notch;
      pts.push([x + (-dy / len) * j, y + (dx / len) * j]);
    }
    const line = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
    const area = line + " L 406 -6 Z";
    const el = (name, attrs) => {
      const e = document.createElementNS(NS, name);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };
    const defs = el("defs", {});
    const blur = el("filter", { id: "bc-blur", x: "-30%", y: "-30%", width: "160%", height: "160%" });
    blur.appendChild(el("feGaussianBlur", { stdDeviation: "5" }));
    const grad = el("linearGradient", { id: "bc-singe", x1: "0", y1: "1", x2: "1", y2: "0" });
    grad.appendChild(el("stop", { offset: "0", "stop-color": "#9a5a24", "stop-opacity": ".22" }));
    grad.appendChild(el("stop", { offset: ".5", "stop-color": "#b8773a", "stop-opacity": ".10" }));
    grad.appendChild(el("stop", { offset: "1", "stop-color": "#c98f52", "stop-opacity": ".04" }));
    defs.append(blur, grad);
    svg.appendChild(defs);
    svg.appendChild(el("path", { d: area, fill: "url(#bc-singe)" }));
    svg.appendChild(el("path", { d: line, class: "glow", fill: "none", stroke: "#ef6a1c", "stroke-width": "14", "stroke-opacity": ".6", filter: "url(#bc-blur)" }));
    svg.appendChild(el("path", { d: line, fill: "none", stroke: "#2a170d", "stroke-width": "5", "stroke-linejoin": "round", "stroke-linecap": "round" }));
    svg.appendChild(el("path", { d: line, class: "embers", fill: "none", stroke: "#ffb347", "stroke-width": "2.2", "stroke-linecap": "round", "stroke-dasharray": "7 11 2 16 10 7 3 12" }));
    [0.14, 0.3, 0.47, 0.62, 0.78, 0.9].forEach((t, i) => {
      const p = pts[Math.round(t * N)];
      const c = el("circle", { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: (1.4 + (i % 3) * 0.6).toFixed(1), fill: "#ffc861", class: "spark" });
      c.style.animationDelay = (i * 0.7).toFixed(1) + "s";
      svg.appendChild(c);
    });
  }

  /* =========================================================
     4. OPENING STAGE: wiring smoke, dust, scroll effects
     ========================================================= */
  const stage = $(".stage");
  const smokeCanvas = $("#smoke");
  const dustCanvas = $("#dust");
  const heroContent = $("#heroContent");
  const ready = $("#ready");
  const topbar = $("#topbar");

  buildBurnCorner($("#burnCorner"));
  const smoke = (smokeCanvas && (createGLSmoke(smokeCanvas) || create2DSmoke(smokeCanvas))) || { resize() {}, draw() {} };
  const dust = dustCanvas ? createDust(dustCanvas) : { resize() {}, draw() {} };

  let density = 1;
  let running = false;
  let raf = 0;
  const T_OFFSET = 30; // start mid-stream so the smoke is already there on load
  const t0 = performance.now();

  function render(now) {
    const t = (now - t0) / 1000 + T_OFFSET;
    smoke.draw(t, density);
    dust.draw(t, density);
  }
  function loop(now) {
    render(now);
    if (running) raf = requestAnimationFrame(loop);
  }
  function startLoop() {
    if (running) return;
    if (reduceMotion) { render(t0); return; }
    running = true;
    raf = requestAnimationFrame(loop);
  }
  function stopLoop() { running = false; cancelAnimationFrame(raf); }

  function resizeAll() {
    smoke.resize();
    dust.resize();
    if (!running) render(performance.now());
  }
  resizeAll();
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeAll, 120);
  });

  if ("IntersectionObserver" in window && stage) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? startLoop() : stopLoop()));
    }).observe(stage);
  } else {
    startLoop();
  }

  // Split the "ready" lines into words that appear one by one while scrolling
  const words = [];
  $$("[data-words]").forEach((line, lineIndex) => {
    const parts = line.textContent.trim().split(/\s+/);
    line.textContent = "";
    parts.forEach((w, i) => {
      const span = document.createElement("span");
      span.className = "w";
      span.textContent = w;
      line.appendChild(span);
      if (i < parts.length - 1) line.appendChild(document.createTextNode(" "));
      words.push({ el: span, line: lineIndex });
    });
  });
  words.forEach((w, i) => {
    w.start = (i / Math.max(1, words.length - 1)) * 0.6 + w.line * 0.08;
  });

  function setWord(w, o) {
    const e = smooth(clamp(o, 0, 1));
    w.el.style.opacity = e.toFixed(3);
    w.el.style.transform = e >= 1 ? "none" : `translateY(${((1 - e) * 30).toFixed(1)}px)`;
    w.el.style.filter = e >= 1 ? "none" : `blur(${((1 - e) * 10).toFixed(1)}px)`;
  }

  function onScroll() {
    const vh = window.innerHeight;
    const y = window.scrollY || window.pageYOffset;

    // Title drifts up and fades as you scroll
    if (heroContent && !reduceMotion) {
      const k = clamp(y / (vh * 0.75), 0, 1);
      heroContent.style.opacity = (1 - k).toFixed(3);
      heroContent.style.transform = `translateY(${(y * 0.3).toFixed(1)}px)`;
      heroContent.style.visibility = k >= 1 ? "hidden" : "visible";
    }

    // Words appear slowly while the message is pinned
    if (ready && words.length) {
      if (reduceMotion) {
        words.forEach((w) => setWord(w, 1));
      } else {
        const r = ready.getBoundingClientRect();
        const begin = vh * 0.45;
        const span = begin + (r.height - vh) * 0.75;
        const p = clamp((begin - r.top) / span, 0, 1);
        words.forEach((w) => setWord(w, (p - w.start) / 0.24));
      }
    }

    // Smoke slowly clears as the journey starts
    if (stage) {
      const sr = stage.getBoundingClientRect();
      const s = clamp(-sr.top / Math.max(1, stage.offsetHeight - vh), 0, 1);
      density = s < 0.5 ? 1 : 1 - smooth((s - 0.5) / 0.5) * 0.82;
      if (!running) render(performance.now());
      if (topbar) topbar.classList.toggle("show", sr.bottom < 80);
    }
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  }, { passive: true });
  onScroll();

  /* =========================================================
     5. REVEAL ON SCROLL + THE LAST CIGARETTE
     ========================================================= */
  const revealEls = $$(".reveal");
  const cig = $("#cig");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        if (e.target === cig) setTimeout(() => cig.classList.add("done"), 7000);
        io.unobserve(e.target);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach((el) => io.observe(el));
    if (cig) io.observe(cig);
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
    if (cig) cig.classList.add("in", "done");
  }

  /* =========================================================
     6. TRAILER PLAYER
     ========================================================= */
  const player = $("#player");
  const video = $("#trailerVideo");
  const playBtn = $("#playBtn");
  if (player && video && playBtn) {
    const tallQuery = window.matchMedia("(max-width: 640px) and (orientation: portrait)");
    const layout = () => {
      if (video.getAttribute("src")) return; // don't swap once it has started
      const tall = tallQuery.matches;
      player.classList.toggle("tall", tall);
      video.poster = tall ? video.dataset.posterTall : video.dataset.posterWide;
    };
    layout();
    if (tallQuery.addEventListener) tallQuery.addEventListener("change", layout);

    const startTrailer = () => {
      if (!video.getAttribute("src")) {
        video.src = player.classList.contains("tall") ? video.dataset.srcTall : video.dataset.srcWide;
      }
      video.controls = true;
      player.classList.add("playing");
      const p = video.play();
      if (p && p.catch) p.catch(() => { player.classList.remove("playing"); video.controls = false; });
    };
    playBtn.addEventListener("click", startTrailer);
    $$("[data-play-trailer]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      $("#trailer").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      startTrailer();
    }));
    video.addEventListener("ended", () => {
      player.classList.remove("playing");
      video.controls = false;
      video.load(); // back to the poster
    });
  }

  /* =========================================================
     7. COVER CLUES
     ========================================================= */
  const frame = $("#coverFrame");
  const clueList = $("#clues");
  if (frame && clueList) {
    const activate = (n) => {
      $$(".hotspot", frame).forEach((h) => h.classList.toggle("active", h.dataset.clue === n));
      $$("li", clueList).forEach((li) => li.classList.toggle("active", li.dataset.clue === n));
    };
    $$(".hotspot", frame).forEach((h) => {
      h.addEventListener("mouseenter", () => activate(h.dataset.clue));
      h.addEventListener("focus", () => activate(h.dataset.clue));
      h.addEventListener("click", () => {
        activate(h.dataset.clue);
        if (window.matchMedia("(max-width: 900px)").matches) {
          const li = clueList.querySelector(`[data-clue="${h.dataset.clue}"]`);
          if (li) li.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
        }
      });
    });
    $$("li", clueList).forEach((li) => {
      li.addEventListener("mouseenter", () => activate(li.dataset.clue));
      li.addEventListener("click", () => activate(li.dataset.clue));
    });
    activate("1");
  }

  /* =========================================================
     8. COST CALCULATOR
     ========================================================= */
  const perDay = $("#perDay");
  const perDayOut = $("#perDayOut");
  const packPrice = $("#packPrice");
  const perPack = $("#perPack");
  const currency = $("#currency");
  if (perDay && packPrice && perPack && currency) {
    // Starting guesses only; visitors type in their own price.
    const typicalPrice = { USD: 9, EUR: 8, GBP: 15, SAR: 25, AED: 25, KWD: 1.5, QAR: 20, BHD: 2, OMR: 2, EGP: 100, JOD: 2.5, TRY: 100 };
    const byRegion = {
      US: "USD", GB: "GBP", SA: "SAR", AE: "AED", KW: "KWD", QA: "QAR", BH: "BHD", OM: "OMR", EG: "EGP", JO: "JOD", TR: "TRY",
      DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", PT: "EUR", FI: "EUR", GR: "EUR"
    };
    const lang = (navigator.languages && navigator.languages[0]) || navigator.language || "en-US";
    const region = (lang.split("-")[1] || "").toUpperCase();
    if (byRegion[region]) {
      currency.value = byRegion[region];
      packPrice.value = typicalPrice[currency.value];
    }
    const fmt = (v) => {
      try {
        return new Intl.NumberFormat("en", { style: "currency", currency: currency.value, maximumFractionDigits: 0 }).format(v);
      } catch (e) {
        return currency.value + " " + Math.round(v).toLocaleString("en");
      }
    };
    const update = () => {
      const n = Number(perDay.value) || 0;
      const price = Math.max(0, Number(packPrice.value) || 0);
      const pack = Math.max(1, Number(perPack.value) || 20);
      const daily = (n / pack) * price;
      perDayOut.textContent = n;
      $("#rMonth").textContent = fmt(daily * 30.44);
      $("#rYear").textContent = fmt(daily * 365);
      $("#rTen").textContent = fmt(daily * 3652.5);
      $("#rCigs").textContent = (n * 365).toLocaleString("en");
    };
    currency.addEventListener("change", () => {
      packPrice.value = typicalPrice[currency.value] || packPrice.value;
      update();
    });
    [perDay, packPrice, perPack].forEach((el) => el.addEventListener("input", update));
    update();
  }

  /* =========================================================
     9. "NOTIFY ME" FORM
     To collect emails, create a free form at formspree.io and
     paste its address below, e.g. "https://formspree.io/f/abcdwxyz".
     ========================================================= */
    const AR = document.documentElement.lang === "ar";
  const MSG = AR ? {
    bad: "يرجى إدخال بريد إلكتروني صحيح، مثل name@example.com.",
    sending: "جارٍ الإرسال…",
    fail: "لم تنجح العملية. تحقّق من اتصالك وحاول مرة أخرى.",
    ok: "شكرًا لك! سنخبرك فور صدور الكتاب."
  } : {
    bad: "Please enter a valid email address, like name@example.com.",
    sending: "Sending…",
    fail: "That didn't go through. Please check your connection and try again.",
    ok: "Thank you! We'll let you know as soon as the book is out."
  };
  const NOTIFY_ENDPOINT = "";
  const form = $("#notifyForm");
  const msg = $("#formMsg");
  if (form && msg) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#email");
      msg.classList.remove("err");
      if (!email.value || !email.checkValidity()) {
        msg.textContent = MSG.bad;
        msg.classList.add("err");
        email.focus();
        return;
      }
      if (NOTIFY_ENDPOINT) {
        msg.textContent = MSG.sending;
        try {
          const res = await fetch(NOTIFY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ email: email.value })
          });
          if (!res.ok) throw new Error(String(res.status));
        } catch (err) {
          msg.textContent = MSG.fail;
          msg.classList.add("err");
          return;
        }
      }
      msg.textContent = MSG.ok;
      form.reset();
    });
  }

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();
