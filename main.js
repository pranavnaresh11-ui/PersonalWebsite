document.documentElement.classList.add('js');

// Hero object: opens as a small neural network with signals firing through it, folds up into
// the wireframe sphere, bounces three times, then just rotates and tilts toward the cursor.
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

  // Neural net: layers of nodes, each wired to every node in the next layer.
  const LAYERS = [4, 6, 7, 6, 4], nodes = [], links = [], first = [];
  LAYERS.forEach((n, l) => {
    first.push(nodes.length);
    for (let k = 0; k < n; k++) {
      nodes.push([-0.95 + (l * 1.9) / (LAYERS.length - 1), (k - (n - 1) / 2) * 0.34, 0.18 * Math.sin(l * 1.7 + k * 2.3)]);
    }
  });
  LAYERS.forEach((n, l) => {
    if (l === LAYERS.length - 1) return;
    for (let a = 0; a < n; a++) for (let b = 0; b < LAYERS[l + 1]; b++) links.push([first[l] + a, first[l + 1] + b]);
  });
  // Every sphere vertex starts out on a node, so folding looks like the net spreading into the sphere.
  const home = verts.map((_, v) => {
    const i = Math.floor(v / LON), l = Math.floor(((v % LON) * LAYERS.length) / LON);
    return first[l] + Math.floor((i * LAYERS[l]) / (LAT + 1));
  });

  // Signals hop node to node from the input layer to the output layer; nodes flash as they arrive.
  const glow = nodes.map(() => 0);
  const pick = (l) => first[l] + ((Math.random() * LAYERS[l]) | 0);
  const pulse = (p = 0) => ({ l: 0, a: pick(0), b: pick(1), p, cyan: Math.random() < 0.55 });
  const pulses = Array.from({ length: 9 }, () => pulse(-Math.random() * 1.5));

  const mouse = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
  let visible = true, jelly = 0, start = null, last = 0, settled = false, left = 0;

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
  const measure = () => { resize(); left = canvas.getBoundingClientRect().left; };
  new ResizeObserver(measure).observe(canvas);
  addEventListener('resize', measure);

  const lerp = (a, b, e) => a + (b - a) * e;
  const NET = 4, FOLD = 1.4, HOP = Math.PI / 2.2, HEIGHTS = [1, 0.6, 0.32];

  const draw = (ts) => {
    requestAnimationFrame(draw);
    if (!visible) return;

    const t = reduceMotion ? 0 : ts / 1000;
    const dt = Math.min(0.05, t - last);
    last = t;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    ctx.clearRect(0, 0, W, H);

    const dx = mouse.x - smooth.x, dy = mouse.y - smooth.y;
    smooth.x += dx * 0.06;
    smooth.y += dy * 0.06;

    // Timeline: the net for NET seconds, then the fold (eased 0 to 1), then the bounce.
    if (start === null) start = t;
    const at = t - start;
    const f = reduceMotion ? 1 : Math.min(1, Math.max(0, (at - NET) / FOLD));
    const e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;

    // The net faces you with a gentle sway; it spins up into the sphere's rotation as it folds.
    const ay = lerp(Math.sin(at * 0.5) * 0.35 + smooth.x * 0.8, t * 0.22 + smooth.x * 1.2, e) + e * (1 - e) * 2.5;
    const ax = lerp(0.08 + smooth.y * 0.5, 0.35 + smooth.y * 0.8 + Math.sin(t * 0.3) * 0.1, e);
    const ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax);
    // The canvas is wider than the sphere needs so the net has room. The net sits right of centre,
    // clear of the intro text but inside the window, and slides back to centre as it folds.
    const S = Math.min(W, H) * 0.36;
    const reach = S * 1.42; // half the net's width, with room for the glowing pulses
    const shift = Math.max(0, Math.min(W / 2 - reach, innerWidth - 12 - left - W / 2 - reach));
    const cx = W / 2 + shift * (1 - e);

    // Bounce three times once folded, each hop lower than the last, squashing wide and flat on
    // landing and stretching a touch in the air; then wobble to rest and just rotate.
    // The bottom stays planted while it squashes.
    const bt = at - NET - FOLD;
    let hop = 0, land = 0;
    if (reduceMotion || bt < 0) {
      // not bouncing
    } else if (bt < HOP * 3) {
      const amp = HEIGHTS[Math.floor(bt / HOP)], s = Math.abs(Math.sin(bt * 2.2));
      hop = s * amp;
      land = Math.pow(1 - s, 6) * amp;
    } else {
      const k = bt - HOP * 3;
      land = HEIGHTS[2] * Math.exp(-k * 7) * Math.cos(k * 16);
    }
    // Jelly: while bouncing, moving the cursor (or clicking) sets the surface rippling.
    // Once the bounce has settled the sphere stays firm.
    settled = reduceMotion || bt > HOP * 3 + 0.6;
    jelly = settled || bt < 0 ? jelly * 0.85 : Math.min(0.09, jelly * 0.95 + Math.hypot(dx, dy) * 0.02);

    const sy = 1 - 0.13 * land + 0.03 * hop, sx = 1 + 0.09 * land - 0.015 * hop;
    const cy = H / 2 - hop * S * 0.12 + S * (1 - sy);

    const project = (x, y, z) => {
      const x1 = x * ca - z * sa, z1 = x * sa + z * ca;
      const y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      const p = 3 / (3 + z2);
      return [cx + x1 * S * p * sx, cy + y1 * S * p * sy, z2];
    };
    const depth = (z) => 1 - (z + 1) / 2; // nearer is brighter
    ctx.lineWidth = 1;

    // Net, fading out as it folds.
    const net = Math.pow(1 - e, 1.5);
    if (net > 0.01) {
      const N = nodes.map(([x, y, z]) => project(x, y, z));
      for (const [a, b] of links) {
        ctx.strokeStyle = `rgba(255,255,255,${((0.05 + 0.12 * depth((N[a][2] + N[b][2]) / 2)) * net).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(N[a][0], N[a][1]); ctx.lineTo(N[b][0], N[b][1]); ctx.stroke();
      }
      for (const q of pulses) {
        q.p += dt * 1.8;
        if (q.p >= 1) {
          glow[q.b] = 1;
          if (q.l + 2 < LAYERS.length) Object.assign(q, { l: q.l + 1, a: q.b, b: pick(q.l + 2), p: 0 });
          else Object.assign(q, pulse(-Math.random() * 0.6));
        }
        if (q.p < 0) continue;
        const x = lerp(N[q.a][0], N[q.b][0], q.p), y = lerp(N[q.a][1], N[q.b][1], q.p);
        const c = q.cyan ? '25,230,255' : '57,255,120';
        ctx.fillStyle = `rgba(${c},${(0.18 * net).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${c},${net.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      N.forEach(([x, y, z], n) => {
        glow[n] *= Math.exp(-dt * 3);
        const g = Math.round(glow[n] * 255);
        ctx.fillStyle = `rgba(${g},${g},${g},${net.toFixed(3)})`;
        ctx.strokeStyle = `rgba(255,255,255,${((0.35 + 0.55 * depth(z)) * net).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    }

    // Sphere, spreading out from the net's nodes as it folds.
    if (e > 0) {
      const P = verts.map(([x, y, z], v) => {
        const k = 1 + jelly * Math.sin(y * 5 + t * 11) * Math.cos(x * 3 - t * 7);
        const [nx, ny, nz] = nodes[home[v]];
        return project(lerp(nx, x * k, e), lerp(ny, y * k, e), lerp(nz, z * k, e));
      });
      for (const [i, j] of edges) {
        const alpha = (0.12 + 0.7 * depth((P[i][2] + P[j][2]) / 2)) * e;
        ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke();
      }
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

// Scroll guides: headlines light up word by word as they rise, each section label's rail fills
// as you read through the section, and the About steps follow the part you're on.
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v) => Math.min(1, Math.max(0, v));

  const heads = [...document.querySelectorAll('.section .headline')].map((h) => {
    const text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    h.replaceChildren(...text.split(/\s+/).flatMap((w, i) => {
      const s = Object.assign(document.createElement('span'), { className: 'w', textContent: w });
      s.setAttribute('aria-hidden', 'true');
      return i ? [' ', s] : [s];
    }));
    return [h, [...h.querySelectorAll('.w')]];
  });

  const rails = [...document.querySelectorAll('.section')].map((s) => {
    const rail = Object.assign(document.createElement('span'), { className: 'rail', innerHTML: '<i></i>' });
    s.querySelector('.sec-label').append(rail);
    return [s, rail];
  });

  const about = document.getElementById('about');
  const steps = [...document.querySelectorAll('.steps a')].map((a) => [a, document.querySelector(a.getAttribute('href'))]);

  const update = () => {
    const vh = innerHeight;
    for (const [h, words] of heads) {
      const p = reduceMotion ? 1 : clamp((vh * 0.9 - h.getBoundingClientRect().top) / (vh * 0.45));
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }
    for (const [s, rail] of rails) {
      const r = s.getBoundingClientRect();
      rail.style.setProperty('--p', clamp((vh * 0.5 - r.top) / r.height).toFixed(3));
    }
    const ar = about.getBoundingClientRect(), inAbout = ar.top < vh * 0.6 && ar.bottom > vh * 0.4;
    let cur = 0;
    steps.forEach(([, target], i) => { if (target.getBoundingClientRect().top < vh * 0.55) cur = i; });
    steps.forEach(([a], i) => a.classList.toggle('on', inAbout && i === cur));
  };

  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  addEventListener('resize', update);
  update();
})();

// About mind map: a small force-directed graph built from the list in the HTML. It grows out of
// the centre as you scroll down to it; drag nodes around, hover (or tap) one to read its note.
(() => {
  const stage = document.querySelector('.mind-stage');
  if (!stage) return;
  const canvas = stage.querySelector('.mind-canvas'), ctx = canvas.getContext('2d');
  const info = stage.querySelector('.mind-info');
  const [kicker, title, note] = ['.mind-kicker', '.mind-title', '.mind-note'].map((s) => info.querySelector(s));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SANS = 'Geist, sans-serif', MONO = '"Geist Mono", monospace', RADIUS = [30, 6, 4];

  // Centre node, then a hub per group followed by that group's items.
  const nodes = [{ label: 'PRANAV', kind: 0, angle: 0, kicker: kicker.textContent, title: title.textContent, note: note.textContent }];
  const links = [];
  const groups = [...document.querySelectorAll('.mind-data > li')];
  groups.forEach((g, gi) => {
    const name = g.querySelector('strong').textContent.trim();
    const items = [...g.querySelectorAll('li')].map((li) => [li.textContent.trim(), li.dataset.note || '']);
    const angle = -Math.PI / 2 + (gi * Math.PI * 2) / groups.length;
    const hub = nodes.push({ label: name.toUpperCase(), kind: 1, parent: 0, angle, kicker: 'BRANCH', title: name, note: items.map(([l]) => l).join(' · ') }) - 1;
    links.push([0, hub]);
    items.forEach(([label, text], k) => {
      const spread = items.length > 1 ? (k / (items.length - 1) - 0.5) * 1.3 : 0;
      links.push([hub, nodes.push({ label, kind: 2, parent: hub, angle: angle + spread, kicker: name.toUpperCase(), title: label, note: text }) - 1]);
    });
  });
  nodes.forEach((n) => Object.assign(n, { x: 0, y: 0, vx: 0, vy: 0, grow: 0, born: false, box: null }));

  let W = 0, H = 0, visible = false, t = 0;
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; }, { rootMargin: '200px 0px' }).observe(stage);

  // Pointer: drag any node; the one under the cursor (or last tapped) fills the info panel.
  let drag = null, hover = null, picked = null, shown = nodes[0];
  const hit = (x, y) => {
    let best = null, bd = Infinity;
    for (const n of nodes) {
      if (n.grow < 0.5) continue;
      const d = Math.hypot(n.x - x, n.y - y), b = n.box;
      const onLabel = b && x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
      if ((d < RADIUS[n.kind] + 12 || onLabel) && d < bd) { best = n; bd = d; }
    }
    return best;
  };
  canvas.addEventListener('pointerdown', (e) => {
    const n = hit(e.offsetX, e.offsetY);
    if (!n) return;
    drag = picked = n;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag) { drag.x = e.offsetX; drag.y = e.offsetY; drag.vx = drag.vy = 0; return; }
    hover = hit(e.offsetX, e.offsetY);
    canvas.style.cursor = hover ? 'grab' : 'default';
  });
  const end = () => { drag = null; canvas.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { hover = null; });

  const show = (n) => {
    if (n === shown) return;
    shown = n;
    kicker.textContent = n.kicker; title.textContent = n.title; note.textContent = n.note;
    info.classList.remove('swap');
    void info.offsetWidth;
    info.classList.add('swap');
  };

  const pick = () => (Math.random() * links.length) | 0;
  const pulses = reduceMotion ? [] : Array.from({ length: 7 }, () => ({ link: pick(), p: -Math.random(), cyan: Math.random() < 0.55 }));

  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible || !W) return;
    t += 1 / 60;

    // Grow the map node by node as the stage scrolls up into view.
    const r = stage.getBoundingClientRect(), vh = innerHeight;
    const p = reduceMotion ? 1 : Math.min(1, Math.max(0, (vh * 0.95 - r.top) / (r.height * 0.7)));
    const count = Math.ceil(p * nodes.length);
    const cx = W / 2, cy = H * 0.44, unit = Math.min(W, H);
    nodes.forEach((n, i) => {
      if (i < count && !n.born) {
        const par = nodes[n.parent ?? 0];
        n.born = true;
        n.x = i ? par.x + Math.cos(n.angle) * 8 : cx;
        n.y = i ? par.y + Math.sin(n.angle) * 8 : cy;
        n.vx = Math.cos(n.angle) * 5; n.vy = Math.sin(n.angle) * 5;
      }
      n.grow += ((i < count ? 1 : 0) - n.grow) * 0.12;
    });
    const live = nodes.filter((n) => n.born && n.grow > 0.02);

    // Forces: nodes push each other apart, links pull to a set length, everything drifts gently
    // and is held loosely around the centre.
    for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
      const A = live[a], B = live[b];
      let dx = B.x - A.x, dy = B.y - A.y;
      const d2 = dx * dx + dy * dy + 0.01, d = Math.sqrt(d2), f = Math.min(3, (unit * unit * 0.016) / d2);
      dx /= d; dy /= d;
      A.vx -= dx * f; A.vy -= dy * f; B.vx += dx * f; B.vy += dy * f;
    }
    for (const [a, b] of links) {
      const A = nodes[a], B = nodes[b];
      if (!A.born || !B.born) continue;
      let dx = B.x - A.x, dy = B.y - A.y;
      const d = Math.hypot(dx, dy) || 1, f = (d - (B.kind === 1 ? 0.26 : 0.16) * unit) * 0.02;
      dx /= d; dy /= d;
      A.vx += dx * f; A.vy += dy * f; B.vx -= dx * f; B.vy -= dy * f;
    }
    // Keep nodes out from under the info panel in the bottom-left corner.
    // (On phones the panel sits below the map instead, so there's nothing to avoid.)
    const ib = info.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    const keepX = ib.right - cr.left + 24, keepY = ib.top < cr.bottom ? ib.top - cr.top - 24 : Infinity;
    for (const n of live) {
      if (n === drag) continue;
      if (n.x < keepX && n.y > keepY) n.vy -= Math.min(2.5, (n.y - keepY) * 0.08);
      const k = n.kind === 0 ? 0.03 : 0.0015;
      n.vx += (cx - n.x) * k; n.vy += (cy - n.y) * k;
      if (!reduceMotion) { n.vx += Math.sin(t * 0.7 + n.angle * 3) * 0.02; n.vy += Math.cos(t * 0.6 + n.angle * 2) * 0.02; }
      n.vx *= 0.82; n.vy *= 0.82;
      n.x = Math.min(W - 24, Math.max(24, n.x + n.vx));
      n.y = Math.min(H - 24, Math.max(24, n.y + n.vy));
    }

    const active = drag || hover || picked || nodes[0];
    show(active);

    ctx.clearRect(0, 0, W, H);
    for (const [a, b] of links) {
      const A = nodes[a], B = nodes[b];
      if (!B.born) continue;
      const g = Math.min(A.grow, B.grow), hot = A === active || B === active;
      ctx.strokeStyle = hot ? `rgba(25,230,255,${(0.85 * g).toFixed(3)})` : `rgba(255,255,255,${(0.16 * g).toFixed(3)})`;
      ctx.lineWidth = hot ? 1.4 : 1;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }
    for (const q of pulses) {
      q.p += 0.012;
      if (q.p >= 1) Object.assign(q, { link: pick(), p: -Math.random() * 0.8, cyan: Math.random() < 0.55 });
      const [a, b] = links[q.link], A = nodes[a], B = nodes[b];
      if (q.p < 0 || !B.born || B.grow < 0.5) continue;
      const x = A.x + (B.x - A.x) * q.p, y = A.y + (B.y - A.y) * q.p, c = q.cyan ? '25,230,255' : '57,255,120';
      ctx.fillStyle = `rgba(${c},.2)`; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgb(${c})`; ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill();
    }
    // Items first, so group labels can see where item labels landed.
    for (const n of [...live].sort((a, b) => b.kind - a.kind)) {
      const rad = RADIUS[n.kind] * n.grow, hot = n === active;
      ctx.globalAlpha = Math.min(1, n.grow);
      if (hot) { ctx.fillStyle = 'rgba(25,230,255,.15)'; ctx.beginPath(); ctx.arc(n.x, n.y, rad + 8, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = n.kind === 0 ? '#000' : hot ? '#19e6ff' : n.kind === 1 ? '#fff' : '#000';
      ctx.strokeStyle = n.kind === 0 || hot ? '#19e6ff' : '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(n.x, n.y, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.textBaseline = 'middle';
      if (n.kind === 0) {
        ctx.font = `500 10px ${MONO}`; ctx.letterSpacing = '2px'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
        ctx.fillText(n.label, n.x + 1, n.y);
        n.box = null;
      } else if (n.kind === 1) {
        // Group names sit under their node, or above it if an item label is in the way.
        ctx.font = `500 10px ${MONO}`; ctx.letterSpacing = '2px'; ctx.textAlign = 'center';
        ctx.fillStyle = hot ? '#fff' : '#bbb';
        const w = ctx.measureText(n.label).width;
        const clash = (y) => live.some((o) => o.kind === 2 && o.box && o.box[0] < n.x + w / 2 && o.box[2] > n.x - w / 2 && o.box[1] < y + 8 && o.box[3] > y - 8);
        let ly = n.y + rad + 14;
        if (clash(ly)) ly = n.y - rad - 14;
        ctx.fillText(n.label, n.x, ly);
        n.box = [n.x - w / 2, ly - 8, n.x + w / 2, ly + 8];
      } else {
        // Item labels point away from the centre, flipping sides if they'd run off the edge.
        ctx.font = `300 14px ${SANS}`; ctx.letterSpacing = '0px';
        const w = ctx.measureText(n.label).width;
        let dir = n.x >= cx ? 1 : -1;
        if (dir > 0 && n.x + rad + 9 + w > W - 6) dir = -1;
        else if (dir < 0 && n.x - rad - 9 - w < 6) dir = 1;
        const lx = n.x + dir * (rad + 9);
        ctx.textAlign = dir > 0 ? 'left' : 'right';
        ctx.fillStyle = hot ? '#fff' : '#8a8a8a';
        ctx.fillText(n.label, lx, n.y);
        n.box = dir > 0 ? [lx, n.y - 10, lx + w, n.y + 10] : [lx - w, n.y - 10, lx, n.y + 10];
      }
      ctx.globalAlpha = 1;
    }
  };
  requestAnimationFrame(frame);
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
