(() => {
  const rgba = (value) => {
    const m = value.match(/[\d.]+/g);
    return m
      ? [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]]
      : [0, 0, 0, 0];
  };
  const blend = (a, b) => [0, 1, 2].map((i) => a[i] * a[3] + b[i] * (1 - a[3]));
  const lum = (c) =>
    c
      .map((x) => x / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
      .reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
  const bg = (el) => {
    const ancestors = [];
    for (let n = el; n; n = n.parentElement) ancestors.push(n);
    return ancestors
      .reverse()
      .reduce(
        (b, n) => blend(rgba(getComputedStyle(n).backgroundColor), b),
        [255, 255, 255],
      );
  };
  const contrast = [],
    overflow = [];
  const elements = [
    ...document.querySelectorAll(
      'h1,h2,h3,p,a,button,label,span,dt,dd,figcaption,input,select',
    ),
  ];
  for (const el of elements) {
    const r = el.getBoundingClientRect(),
      s = getComputedStyle(el);
    if (
      !r.width ||
      !r.height ||
      s.visibility === 'hidden' ||
      s.display === 'none' ||
      el.closest('[hidden]')
    )
      continue;
    if (r.right > innerWidth + 1 && s.position !== 'fixed')
      overflow.push({
        text: el.textContent?.trim().slice(0, 45),
        right: r.right,
      });
    if (
      !el.textContent?.trim() ||
      el.matches('input,select') ||
      el.querySelector('img,svg') ||
      el.classList.contains('skip-link')
    )
      continue;
    const fg = rgba(s.color),
      background = bg(el),
      l1 = lum(blend(fg, background)),
      l2 = lum(background),
      ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05),
      size = +s.fontSize.replace('px', ''),
      large = size >= 24 || (size >= 18.66 && +s.fontWeight >= 700),
      minimum = large ? 3 : 4.5;
    if (ratio < minimum - 0.05)
      contrast.push({
        tag: el.tagName,
        text: el.textContent.trim().slice(0, 55),
        ratio: +ratio.toFixed(2),
        minimum,
        color: s.color,
        bg: background,
      });
  }
  const buttons = [...document.querySelectorAll('button')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width && r.height && !el.closest('[hidden]');
    })
    .map((el) => ({
      name: el.getAttribute('aria-label') || el.textContent.trim(),
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
    }));
  return {
    url: location.pathname + location.search + location.hash,
    width: innerWidth,
    height: innerHeight,
    theme: document.documentElement.dataset.theme,
    scrollWidth: document.documentElement.scrollWidth,
    contrast,
    overflow,
    smallButtons: buttons.filter((b) => b.width < 43.9 || b.height < 43.9),
    sections: [...document.querySelectorAll('main>section')].map((s) => ({
      id: s.id,
      height: s.getBoundingClientRect().height,
      title: s.querySelector('h1,h2')?.textContent,
    })),
    images: [...document.images].map((i) => ({
      src: i.getAttribute('src'),
      loaded: i.complete && i.naturalWidth > 0,
    })),
    videos: [...document.querySelectorAll('video')].map((v) => ({
      preload: v.preload,
      readyState: v.readyState,
      currentSrc: v.currentSrc,
      paused: v.paused,
    })),
  };
})();
