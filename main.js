document.documentElement.classList.add('js');

// Top bar: a hairline appears under it once the page scrolls.
(() => {
  const bar = document.getElementById('bar');
  const update = () => bar.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', update, { passive: true });
  update();
})();

// Nav pill: underline the section you're reading.
(() => {
  const links = [...document.querySelectorAll('.pill a')];
  const targets = links.map((a) => document.querySelector(a.getAttribute('href')));
  const update = () => {
    const line = innerHeight * 0.35;
    let cur = -1;
    targets.forEach((t, i) => { if (t.getBoundingClientRect().top < line) cur = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === cur));
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

// Research index: each row opens an inline drawer with specs, a photo slot and links.
(() => {
  document.querySelectorAll('.row-head').forEach((head) => {
    const drawer = document.getElementById(head.getAttribute('aria-controls'));
    head.addEventListener('click', () => {
      const open = head.getAttribute('aria-expanded') !== 'true';
      head.setAttribute('aria-expanded', String(open));
      drawer.classList.toggle('open', open);
    });
  });
})();

// Fade content in as it scrolls into view.
(() => {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.fade').forEach((el) => io.observe(el));
})();
