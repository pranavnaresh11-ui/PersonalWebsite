// Wireframe sphere: lat/long grid, rotates continuously and tilts toward the cursor.
(() => {
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('sphere');
  const ctx = canvas.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;

  const LAT = 13, LON = 22, verts = [], edges = [];
  for (let i = 0; i <= LAT; i++) for (let j = 0; j < LON; j++) {
    const p = (i / LAT) * Math.PI, q = (j / LON) * Math.PI * 2;
    verts.push([Math.sin(p) * Math.cos(q), Math.cos(p), Math.sin(p) * Math.sin(q)]);
    const k = i * LON + j;
    if (i > 0 && i < LAT) edges.push([k, i * LON + ((j + 1) % LON)]);
    if (i < LAT) edges.push([k, (i + 1) * LON + j]);
  }

  const mouse = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
  let revealed = false;

  const setRevealed = (v) => { revealed = v; stage.classList.toggle('revealed', v); };

  if (isTouch) {
    stage.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      setRevealed(!revealed);
    });
  } else {
    stage.addEventListener('mouseenter', () => setRevealed(true));
    stage.addEventListener('mouseleave', () => setRevealed(false));
    stage.addEventListener('mousemove', (e) => {
      const r = stage.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width - 0.5;
      mouse.y = (e.clientY - r.top) / r.height - 0.5;
    });
  }

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(resize).observe(canvas);

  const draw = (ts) => {
    const t = reduceMotion ? 0 : ts / 1000;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    ctx.clearRect(0, 0, W, H);

    smooth.x += (mouse.x - smooth.x) * 0.06;
    smooth.y += (mouse.y - smooth.y) * 0.06;

    const ay = t * (revealed ? 0.5 : 0.22) + smooth.x * 1.2;
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
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();
