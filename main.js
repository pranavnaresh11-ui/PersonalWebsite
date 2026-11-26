document.documentElement.classList.add('js');

// Sections: show only the one in view. A section counts as in view once 35% of it, or 35% of
// the screen, is filled by it (so tall sections on phones still qualify). Its parts are
// numbered so the CSS can stagger them.
(() => {
  const sections = [...document.querySelectorAll('.sec')];
  sections.forEach((s) => s.querySelectorAll('.st').forEach((el, i) => el.style.setProperty('--i', i)));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const on = e.isIntersecting && (e.intersectionRatio >= 0.35 || e.intersectionRect.height >= innerHeight * 0.35);
      e.target.classList.toggle('on', on);
    }
  }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
  sections.forEach((s) => io.observe(s));
})();

// "Scroll ↓" fades out as soon as the page moves.
(() => {
  const cue = document.querySelector('.cue');
  const update = () => cue.classList.toggle('gone', scrollY > 8);
  addEventListener('scroll', update, { passive: true });
  update();
})();
