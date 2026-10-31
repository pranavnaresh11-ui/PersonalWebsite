document.documentElement.classList.add('js');

// Wireframe sphere: lat/long grid, rotates continuously and tilts toward the cursor.
(() => {
  const stage = document.getElementById('home');
  const canvas = document.getElementById('sphere');
  const ctx = canvas.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LAT = 13, LON = 22, verts = [], edges = [];
  for (let i = 0; i <= LAT; i++) for (let j = 0; j < LON; j++) {
    const p = (i / LAT) * Math.PI, q = (j / LON) * Math.PI * 2;
    verts.push([Math.sin(p) * Math.cos(q), Math.cos(p), Math.sin(p) * Math.sin(q)]);
    const k = i * LON + j;
    if (i > 0 && i < LAT) edges.push([k, i * LON + ((j + 1) % LON)]);
    if (i < LAT) edges.push([k, (i + 1) * LON + j]);
  }

  const mouse = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
  let visible = true, jelly = 0;

  stage.addEventListener('mousemove', (e) => {
    const r = stage.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width - 0.5;
    mouse.y = (e.clientY - r.top) / r.height - 0.5;
  });
  stage.addEventListener('mouseleave', () => { mouse.x = 0; mouse.y = 0; });
  stage.addEventListener('pointerdown', () => { jelly = 0.09; });

  // Skip drawing while the home section is scrolled out of view.
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(resize).observe(canvas);

  const draw = (ts) => {
    requestAnimationFrame(draw);
    if (!visible) return;

    const t = reduceMotion ? 0 : ts / 1000;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    ctx.clearRect(0, 0, W, H);

    const dx = mouse.x - smooth.x, dy = mouse.y - smooth.y;
    smooth.x += dx * 0.06;
    smooth.y += dy * 0.06;

    // Jelly: moving the cursor (or clicking) sets the surface rippling, then it settles.
    if (!reduceMotion) jelly = Math.min(0.09, jelly * 0.95 + Math.hypot(dx, dy) * 0.02);

    const ay = t * 0.22 + smooth.x * 1.2;
    const ax = 0.35 + smooth.y * 0.8 + Math.sin(t * 0.3) * 0.1;
    const ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax);
    const S = Math.min(W, H) * 0.36, cx = W / 2;

    // Bounce: small hops that squash wide and flat on landing and stretch a touch in the air.
    // The bottom stays planted while it squashes.
    const hop = reduceMotion ? 1 : Math.abs(Math.sin(t * 2.2));
    const land = reduceMotion ? 0 : Math.pow(1 - hop, 6);
    const sy = 1 - 0.13 * land + 0.03 * hop, sx = 1 + 0.09 * land - 0.015 * hop;
    const cy = H / 2 + S * 0.06 - (reduceMotion ? 0 : hop * S * 0.12) + S * (1 - sy);

    const P = verts.map(([x, y, z]) => {
      const k = 1 + jelly * Math.sin(y * 5 + t * 11) * Math.cos(x * 3 - t * 7);
      x *= k; y *= k; z *= k;
      const x1 = x * ca - z * sa, z1 = x * sa + z * ca;
      const y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      const f = 3 / (3 + z2);
      return [cx + x1 * S * f * sx, cy + y1 * S * f * sy, z2];
    });

    ctx.lineWidth = 1;
    for (const [i, j] of edges) {
      const z = (P[i][2] + P[j][2]) / 2;
      const alpha = 0.12 + 0.7 * (1 - (z + 1) / 2); // nearer edges are brighter
      ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(P[i][0], P[i][1]);
      ctx.lineTo(P[j][0], P[j][1]);
      ctx.stroke();
    }
  };
  requestAnimationFrame(draw);
})();

// Greeting: type the intro line out when the page opens. Halfway through "portfolio" it glitches
// like a hacked terminal and flashes "robotics research", then carries on; once typed, it keeps
// glitching briefly every few seconds.
(() => {
  const p = document.querySelector('.typing');
  const text = p.textContent.trim();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WORD = 'portfolio', FLASH = 'robotics research', GLYPHS = '!<>-_\/[]{}=+*^?#%01';
  const wordAt = text.indexOf(WORD), flashAt = wordAt < 0 ? -1 : wordAt + 5;

  p.innerHTML = '<span class="sr-only"></span><span class="screen" aria-hidden="true"><span class="base"></span></span>';
  p.querySelector('.sr-only').textContent = text;
  const screen = p.querySelector('.screen'), base = p.querySelector('.base');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = (cls, txt = '') => Object.assign(document.createElement('span'), { className: cls, textContent: txt });
  const scramble = (s) => s.replace(/\S/g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]);

  // swap, while set, replaces the half-typed word with glitch text.
  let n = 0, swap = null;
  const render = () => {
    const from = swap ? wordAt : n;
    base.replaceChildren(text.slice(0, from), ...(swap ? [el(swap.err ? 'swap err' : 'swap', swap.text)] : []), el('caret'), el('rest', text.slice(n)));
    // Red and cyan ghost copies for the colour split, only while glitching.
    screen.querySelectorAll('.ghost').forEach((g) => g.remove());
    if (p.classList.contains('glitch')) for (const cls of ['ghost r', 'ghost c']) screen.append(Object.assign(base.cloneNode(true), { className: cls }));
  };
  const setGlitch = (v) => { p.classList.toggle('glitch', v); render(); };

  const flash = async () => {
    const partial = text.slice(wordAt, n);
    setGlitch(true);
    for (let k = 0; k < 4; k++) { swap = { text: scramble(partial) }; render(); await wait(50); }
    swap = { text: FLASH, err: true }; render();
    await wait(900);
    for (let k = 0; k < 3; k++) { swap = { text: scramble(FLASH), err: true }; render(); await wait(50); }
    swap = null;
    setGlitch(false);
  };

  // Typing rhythm: quick runs of letters, a small hitch between words, the odd hesitation,
  // and a longer beat after a sentence ends.
  const delay = (ch) => {
    if (/[!.]/.test(ch)) return 520;
    if (ch === ',') return 260;
    if (ch === ' ') return 110 + Math.random() * 90;
    return 50 + Math.random() * 60 + (Math.random() < 0.08 ? 200 : 0);
  };

  const step = async () => {
    n++;
    render();
    if (n === flashAt) { await wait(120); await flash(); }
    if (n < text.length) return setTimeout(step, delay(text[n - 1]));
    p.classList.add('typed-out');
    for (;;) {
      await wait(2500 + Math.random() * 3500);
      setGlitch(true);
      await wait(160 + Math.random() * 220);
      setGlitch(false);
    }
  };

  if (reduceMotion) { n = text.length; render(); p.classList.add('typed-out'); }
  else { render(); setTimeout(step, 700); }
})();

// Navigation: slide in the top bar once the home nav scrolls away, and highlight the section in view.
(() => {
  const topbar = document.getElementById('topbar');
  new IntersectionObserver(([e]) => topbar.classList.toggle('show', !e.isIntersecting))
    .observe(document.querySelector('.stage .nav'));

  const links = document.querySelectorAll('.nav a, .topbar nav a');
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('[data-section]').forEach((s) => spy.observe(s));
})();

// Footer: hide it as soon as the page scrolls, and bring it back only once scrolling settles
// in a different section from the one it was last shown in. It stays hidden at the very
// bottom, where the page's own end footer takes over.
(() => {
  const footer = document.querySelector('.stage .footer');
  let atEnd = false, current = 'home', shownIn = 'home', timer;

  new IntersectionObserver(([e]) => {
    atEnd = e.isIntersecting;
    if (atEnd) footer.classList.add('away');
  }).observe(document.querySelector('.end'));

  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) current = e.target.id;
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('[data-section]').forEach((s) => spy.observe(s));

  addEventListener('scroll', () => {
    footer.classList.add('away');
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (atEnd || current === shownIn) return;
      shownIn = current;
      footer.classList.remove('away');
    }, 350);
  }, { passive: true });
})();

// Project drives: open a drive's card on hover (or keyboard focus); on touch screens a tap toggles it.
(() => {
  const drives = [...document.querySelectorAll('.drive')];
  const art = document.getElementById('hdd-art').content;
  const canHover = matchMedia('(hover: hover)').matches;

  const setOpen = (d, v) => {
    d.classList.toggle('open', v);
    d.querySelector('.hdd').setAttribute('aria-expanded', v);
  };

  drives.forEach((d) => {
    const btn = d.querySelector('.hdd');
    btn.append(art.cloneNode(true));

    if (canHover) {
      d.addEventListener('mouseenter', () => setOpen(d, true));
      d.addEventListener('mouseleave', () => setOpen(d, false));
    } else {
      btn.addEventListener('click', () => {
        const v = !d.classList.contains('open');
        drives.forEach((o) => setOpen(o, false));
        setOpen(d, v);
      });
    }
    d.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) setOpen(d, true); });
    d.addEventListener('focusout', (e) => { if (!d.contains(e.relatedTarget)) setOpen(d, false); });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.drive')) drives.forEach((d) => setOpen(d, false));
  });
})();

// Fade section content in as it scrolls into view.
(() => {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
})();
