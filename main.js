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
  let visible = true;

  stage.addEventListener('mousemove', (e) => {
    const r = stage.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width - 0.5;
    mouse.y = (e.clientY - r.top) / r.height - 0.5;
  });
  stage.addEventListener('mouseleave', () => { mouse.x = 0; mouse.y = 0; });

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

    smooth.x += (mouse.x - smooth.x) * 0.06;
    smooth.y += (mouse.y - smooth.y) * 0.06;

    const ay = t * 0.22 + smooth.x * 1.2;
    const ax = 0.35 + smooth.y * 0.8 + Math.sin(t * 0.3) * 0.1;
    const ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax);
    const S = Math.min(W, H) * 0.36, cx = W / 2, cy = H / 2;

    const P = verts.map(([x, y, z]) => {
      const x1 = x * ca - z * sa, z1 = x * sa + z * ca;
      const y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      const f = 3 / (3 + z2);
      return [cx + x1 * S * f, cy + y1 * S * f, z2];
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

// Greeting: type the intro line out when the page opens, then glitch it now and then like a
// hacked terminal. The first glitch briefly turns "robotics research" into an error.
(() => {
  const p = document.querySelector('.typing');
  const text = p.textContent.trim();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PHRASE = 'robotics research', ERROR = 'ERR::BAYESIAN_OPTIMIZATION', GLYPHS = '!<>-_\\/[]{}=+*^?#%01';

  p.innerHTML = '<span class="sr-only"></span><span class="screen" aria-hidden="true"><span class="base"><span class="done"></span><span class="caret"></span><span class="rest"></span></span></span>';
  p.querySelector('.sr-only').textContent = text;
  const screen = p.querySelector('.screen'), base = p.querySelector('.base');
  const typed = p.querySelector('.done'), left = p.querySelector('.rest');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = (cls, txt = '') => Object.assign(document.createElement('span'), { className: cls, textContent: txt });

  let n = 0;
  const render = () => { typed.textContent = text.slice(0, n); left.textContent = text.slice(n); };

  const glitch = async () => {
    // Rebuild the finished line with the phrase wrapped, plus red and cyan ghost copies for the colour split.
    const i = text.indexOf(PHRASE);
    if (i < 0) return;
    base.replaceChildren(text.slice(0, i), el('swap', PHRASE), text.slice(i + PHRASE.length), el('caret'));
    for (const cls of ['ghost r', 'ghost c']) screen.append(Object.assign(base.cloneNode(true), { className: cls }));
    const swaps = screen.querySelectorAll('.swap');
    const setSwap = (s, err) => swaps.forEach((s2) => { s2.textContent = s; s2.classList.toggle('err', err); });
    const scramble = (s) => s.replace(/\S/g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]);

    const burst = async (withError) => {
      p.classList.add('glitch');
      if (withError) {
        for (let k = 0; k < 5; k++) { setSwap(scramble(PHRASE), false); await wait(50); }
        setSwap(ERROR, true);
        await wait(1000);
        for (let k = 0; k < 4; k++) { setSwap(scramble(ERROR), true); await wait(50); }
        setSwap(PHRASE, false);
      } else {
        await wait(160 + Math.random() * 220);
      }
      p.classList.remove('glitch');
    };

    await wait(500);
    for (let count = 0; ; count++) {
      await burst(count === 0);
      await wait(2500 + Math.random() * 3500);
    }
  };

  // Slightly uneven keystrokes, with a beat after punctuation.
  const step = () => {
    n++;
    render();
    const ch = text[n - 1];
    if (n < text.length) return setTimeout(step, /[!.]/.test(ch) ? 420 : ch === ',' ? 220 : 35 + Math.random() * 55);
    p.classList.add('typed-out');
    if (!reduceMotion) glitch();
  };
  if (reduceMotion) { n = text.length - 1; step(); } else { render(); setTimeout(step, 700); }
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
