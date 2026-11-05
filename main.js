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
  let visible = true, jelly = 0, start = null, settled = false;

  stage.addEventListener('mousemove', (e) => {
    const r = stage.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width - 0.5;
    mouse.y = (e.clientY - r.top) / r.height - 0.5;
  });
  stage.addEventListener('mouseleave', () => { mouse.x = 0; mouse.y = 0; });
  stage.addEventListener('pointerdown', () => { if (!settled) jelly = 0.09; });

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

    const ay = t * 0.22 + smooth.x * 1.2;
    const ax = 0.35 + smooth.y * 0.8 + Math.sin(t * 0.3) * 0.1;
    const ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax);
    const S = Math.min(W, H) * 0.36, cx = W / 2;

    // Bounce three times when the page opens, each hop lower than the last, squashing wide and
    // flat on landing and stretching a touch in the air; then wobble to rest and just rotate.
    // The bottom stays planted while it squashes.
    if (start === null) start = t;
    const bt = t - start, HOP = Math.PI / 2.2, HEIGHTS = [1, 0.6, 0.32];
    let hop = 0, land = 0;
    if (reduceMotion) {
      // no bounce
    } else if (bt < HOP * 3) {
      const amp = HEIGHTS[Math.floor(bt / HOP)], s = Math.abs(Math.sin(bt * 2.2));
      hop = s * amp;
      land = Math.pow(1 - s, 6) * amp;
    } else {
      const e = bt - HOP * 3;
      land = HEIGHTS[2] * Math.exp(-e * 7) * Math.cos(e * 16);
    }
    // Jelly: while bouncing, moving the cursor (or clicking) sets the surface rippling.
    // Once the bounce has settled the sphere stays firm.
    settled = reduceMotion || bt > HOP * 3 + 0.6;
    jelly = settled ? jelly * 0.85 : Math.min(0.09, jelly * 0.95 + Math.hypot(dx, dy) * 0.02);

    const sy = 1 - 0.13 * land + 0.03 * hop, sx = 1 + 0.09 * land - 0.015 * hop;
    const cy = H / 2 - hop * S * 0.12 + S * (1 - sy);

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
// like a hacked terminal and flashes "tech, robotics, bayesian optimization", then carries on; once typed, it keeps
// glitching briefly every few seconds.
(() => {
  const p = document.querySelector('.typing');
  const text = p.textContent.trim();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WORD = 'portfolio', FLASH = 'tech, robotics, bayesian optimization', GLYPHS = '!<>-_\/[]{}=+*^?#%01';
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
    await wait(750);
    for (let k = 0; k < 3; k++) { swap = { text: scramble(FLASH), err: true }; render(); await wait(50); }
    swap = null;
    setGlitch(false);
  };

  // Typing rhythm: quick runs of letters, a small hitch between words, the odd hesitation,
  // and a longer beat after a sentence ends.
  const delay = (ch) => {
    if (/[!.]/.test(ch)) return 340;
    if (ch === ',') return 200;
    if (ch === ' ') return 70 + Math.random() * 60;
    return 35 + Math.random() * 35 + (Math.random() < 0.06 ? 140 : 0);
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
  else { render(); setTimeout(step, 450); }
})();

// Background: faint electric-cyan and terminal-green streaks flying across the page.
(() => {
  const canvas = document.getElementById('streaks');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  const COLORS = ['25,230,255', '57,255,120'];
  const ANGLE = -0.22, DX = Math.cos(ANGLE), DY = Math.sin(ANGLE);
  let W = 0, H = 0, streaks = [], last = 0;

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  addEventListener('resize', resize);
  resize();

  // Each streak starts off the left edge somewhere along the screen and flies up and to the right.
  const spawn = (anywhere) => ({
    x: anywhere ? Math.random() * W : -300,
    y: Math.random() * (H + W * 0.25),
    len: 80 + Math.random() * 220,
    speed: 350 + Math.random() * 700,
    alpha: 0.12 + Math.random() * 0.3,
    width: Math.random() < 0.25 ? 1.6 : 1,
    color: COLORS[Math.random() < 0.55 ? 0 : 1],
  });
  const COUNT = () => Math.round(Math.min(18, Math.max(8, (W * H) / 70000)));
  for (let i = 0; i < COUNT(); i++) streaks.push(spawn(true));

  const draw = (ts) => {
    requestAnimationFrame(draw);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';

    streaks = streaks.filter((s) => s.x - s.len * DX < W + 50 && s.y - s.len * DY > -50);
    while (streaks.length < COUNT()) streaks.push(spawn(false));

    for (const s of streaks) {
      s.x += DX * s.speed * dt;
      s.y += DY * s.speed * dt;
      const tx = s.x - DX * s.len, ty = s.y - DY * s.len;
      const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
      g.addColorStop(0, `rgba(${s.color},0)`);
      g.addColorStop(1, `rgba(${s.color},${s.alpha})`);
      ctx.strokeStyle = g;
      // A wide faint pass for glow, then the sharp line.
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = s.width * 4;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = s.width;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
    }
  };
  requestAnimationFrame(draw);
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
      if (atEnd || (current === shownIn && scrollY > 10)) return;
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

// Home photo: slides back out of the page as soon as you scroll, and returns at the very top.
(() => {
  const peek = document.querySelector('.peek');
  const update = () => peek.classList.toggle('gone', scrollY > 4);
  addEventListener('scroll', update, { passive: true });
  update();
})();

// About: the first time it scrolls into view it boots like a terminal for about two seconds,
// prints that the profile was retrieved, then clears away to show the section.
(() => {
  const about = document.getElementById('about');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  about.classList.add('booting');
  const term = Object.assign(document.createElement('div'), {
    className: 'term',
    innerHTML: '<div class="term-bar"><i></i><i></i><i></i><span>PRANAV@PORTFOLIO: ~</span></div><div class="term-body"></div>',
  });
  term.setAttribute('aria-hidden', 'true');
  about.querySelector('.sec-body').prepend(term);
  const body = term.querySelector('.term-body');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const line = (html = '') => {
    body.querySelector('.cur')?.remove();
    const l = document.createElement('div');
    l.innerHTML = html;
    body.append(l);
    return l;
  };
  const cursor = (l) => l.append(Object.assign(document.createElement('span'), { className: 'cur' }));
  const bar = (p) => '█'.repeat(Math.round(p * 20)) + '░'.repeat(20 - Math.round(p * 20));

  const boot = async () => {
    const cmd = line('<span class="ps">pranav@portfolio:~$</span> ');
    for (const ch of './about --load') { cmd.append(ch); await wait(22); }
    await wait(120);
    line('connecting to <span class="hi">pranav.local</span> ... ok');
    await wait(180);
    const load = line();
    for (let k = 0; k <= 20; k++) {
      load.textContent = `fetching profile [${bar(k / 20)}] ${String(k * 5).padStart(3)}%`;
      await wait(45 + Math.random() * 25);
    }
    line('decrypting bio.txt ... ok');
    await wait(180);
    cursor(line('<span class="ok">✓ RETRIEVED</span> 200 OK · about.md loaded'));
    await wait(550);
    term.classList.add('done');
    about.classList.remove('booting');
    setTimeout(() => term.remove(), 500);
  };

  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    boot();
  }, { rootMargin: '0px 0px -35% 0px' });
  io.observe(about);
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
