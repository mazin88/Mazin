(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Slow-motion smoke (canvas) ---------- */
  const canvas = document.getElementById("smoke");
  const ctx = canvas.getContext("2d");
  let W, H, dpr, puffs = [];

  // Pre-render one soft smoke puff texture
  const tex = document.createElement("canvas");
  tex.width = tex.height = 256;
  (() => {
    const t = tex.getContext("2d");
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * 70;
      const x = 128 + Math.cos(a) * d;
      const y = 128 + Math.sin(a) * d * 0.6;
      const r = 18 + Math.random() * 46;
      const g = t.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(225,235,228,0.10)");
      g.addColorStop(1, "rgba(235,240,236,0)");
      t.fillStyle = g;
      t.beginPath(); t.arc(x, y, r, 0, Math.PI * 2); t.fill();
    }
  })();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(60, Math.max(24, W / 24)));
    puffs = Array.from({ length: count }, () => newPuff(true));
  }

  function newPuff(initial) {
    const size = (0.35 + Math.random() * 0.65) * Math.max(W, H) * 0.55;
    return {
      x: Math.random() * W,
      y: initial ? Math.random() * H * 1.2 : H + size * 0.4,
      size,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -(0.08 + Math.random() * 0.18),      // very slow rise = slow motion
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.0012,
      alpha: 0.12 + Math.random() * 0.28,
      phase: Math.random() * Math.PI * 2,
    };
  }

  let scrollFade = 1;
  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    for (const p of puffs) {
      p.x += p.vx + Math.sin(time * 0.00018 + p.phase) * 0.15;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y < -p.size * 0.6) Object.assign(p, newPuff(false));

      const life = Math.min(1, (H + p.size * 0.4 - p.y) / (H * 0.4)); // fade in from bottom
      ctx.save();
      ctx.globalAlpha = p.alpha * life * scrollFade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.drawImage(tex, -p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);

  // Hero content drifts & fades as user scrolls (parallax)
  const heroContent = document.querySelector(".hero-content");
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    const h = window.innerHeight;
    const k = Math.min(1, y / h);
    heroContent.style.transform = `translateY(${y * 0.35}px)`;
    heroContent.style.opacity = String(1 - k * 1.3);
    scrollFade = 1 - k * 0.5;
  }, { passive: true });

  /* ---------- "Your journey starts now" word-by-word ---------- */
  document.querySelectorAll("[data-words]").forEach((el, lineIdx) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map((w, i) => `<span class="w" style="transition-delay:${lineIdx * 1.6 + i * 0.45}s">${w}</span>`)
      .join(" ");
  });

  /* ---------- Scroll reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add(e.target.matches("[data-words]") ? "show" : "in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.35 });
  document.querySelectorAll(".reveal, [data-words], .cig").forEach((el) => io.observe(el));

  /* ---------- Notify form (placeholder: no backend yet) ---------- */
  const form = document.getElementById("notifyForm");
  const msg = document.getElementById("formMsg");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.textContent = "Thank you! We'll let you know as soon as the book is out.";
    form.reset();
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
