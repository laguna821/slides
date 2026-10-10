const body = document.querySelector<HTMLElement>('#reader-body');
const status = document.querySelector<HTMLElement>('.reader-status');
let noticeTimer: ReturnType<typeof setTimeout>;
function notice(s: string) {
  if (status) {
    status.textContent = s;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (status.textContent = ''), 3500);
  }
}
const fallback = document.querySelector<HTMLDialogElement>(
  '#reader-copy-fallback',
)!;
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    notice('복사했습니다.');
  } catch {
    fallback.querySelector('textarea')!.value = text;
    fallback.showModal();
    fallback.querySelector('textarea')!.select();
  }
}
document
  .querySelector('[data-close-copy]')
  ?.addEventListener('click', () => fallback.close());
document
  .querySelectorAll<HTMLButtonElement>('[data-copy-reader]')
  .forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        const r = await fetch(b.dataset.url!);
        if (!r.ok) throw Error();
        await copy(await r.text());
      } catch {
        notice('본문을 불러오지 못했습니다. Markdown 저장을 이용해 주세요.');
      }
    }),
  );
document
  .querySelector('[data-reader-print]')
  ?.addEventListener('click', () => window.print());
const backdrop = document.querySelector<HTMLElement>('.reader-backdrop')!;
let opener: HTMLElement | null = null,
  activePanel: HTMLElement | null = null;
function closePanel() {
  activePanel?.classList.remove('panel-open');
  activePanel = null;
  backdrop.hidden = true;
  document
    .querySelectorAll('[data-open-panel]')
    .forEach((b) => b.setAttribute('aria-expanded', 'false'));
  opener?.focus();
}
document.querySelectorAll<HTMLButtonElement>('[data-open-panel]').forEach((b) =>
  b.addEventListener('click', () => {
    const panel = document.getElementById(b.dataset.openPanel!)!;
    if (activePanel === panel) {
      closePanel();
      return;
    }
    closePanel();
    opener = b;
    activePanel = panel;
    panel.classList.add('panel-open');
    b.setAttribute('aria-expanded', 'true');
    backdrop.hidden = false;
    panel.focus();
  }),
);
document
  .querySelectorAll('[data-close-panel]')
  .forEach((b) => b.addEventListener('click', closePanel));
backdrop.addEventListener('click', closePanel);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activePanel) closePanel();
  if (e.key === 'Tab' && activePanel) {
    const items = [
      ...activePanel.querySelectorAll<HTMLElement>('button,a[href],summary'),
    ].filter((x) => x.getClientRects().length);
    const first = items[0],
      last = items.at(-1);
    if (
      e.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === activePanel)
    ) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
const headings = body?.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6') || [];
const toc = [
  ...document.querySelectorAll<HTMLAnchorElement>('.reader-toc nav a'),
];
toc.forEach((a) =>
  a.addEventListener('click', (event) => {
    event.preventDefault();
    if (activePanel) closePanel();
    location.hash = a.hash;
    const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    target?.setAttribute('tabindex', '-1');
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'start' });
  }),
);
headings.forEach((h) => {
  const a = document.createElement('a');
  a.href = '#' + h.id;
  a.className = 'heading-permalink';
  a.textContent = '#';
  a.setAttribute('aria-label', '문단 링크 복사');
  a.addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState(null, '', a.hash);
    copy(location.href);
  });
  h.append(a);
});
body?.querySelectorAll('pre').forEach((pre) => {
  const b = document.createElement('button');
  b.className = 'code-copy';
  b.textContent = '코드 복사';
  b.addEventListener('click', () =>
    copy(pre.querySelector('code')?.textContent || ''),
  );
  pre.prepend(b);
});
const imageDialog = document.querySelector<HTMLDialogElement>('#reader-image')!;
body?.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
  const b = document.createElement('button');
  b.className = 'reader-image-button';
  b.setAttribute('aria-label', img.alt + ' 확대');
  img.replaceWith(b);
  b.append(img);
  b.addEventListener('click', () => {
    const large = imageDialog.querySelector('img')!;
    large.src = img.src;
    large.alt = img.alt;
    imageDialog.querySelector('p')!.textContent = img.alt;
    imageDialog.querySelector('a')!.href = img.src;
    imageDialog.showModal();
  });
});
document
  .querySelector('[data-close-image]')
  ?.addEventListener('click', () => imageDialog.close());
imageDialog.addEventListener('click', (e) => {
  if (e.target === imageDialog) imageDialog.close();
});
let queued = false;
function position() {
  queued = false;
  if (!body) return;
  let current = headings[0]?.id;
  for (const h of headings) {
    if (h.getBoundingClientRect().top <= 190) current = h.id;
    else break;
  }
  toc.forEach((a) => {
    if (decodeURIComponent(a.hash.slice(1)) === current)
      a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });
  const r = body.getBoundingClientRect();
  const p = document.querySelector<HTMLProgressElement>('#reader-progress');
  if (p)
    p.value = Math.max(
      0,
      Math.min(
        100,
        ((190 - r.top) / Math.max(1, r.height - window.innerHeight + 190)) *
          100,
      ),
    );
}
window.addEventListener(
  'scroll',
  () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(position);
    }
  },
  { passive: true },
);
window.addEventListener('resize', () => {
  if (activePanel) closePanel();
  position();
});
position();
export {};
