const toggles = document.querySelectorAll<HTMLButtonElement>('.theme-toggle');
function label() {
  const dark = document.documentElement.dataset.theme === 'dark';
  toggles.forEach((toggle) => {
    const next = dark ? '밝은 화면으로 전환' : '어두운 화면으로 전환';
    toggle.setAttribute('aria-label', next);
    toggle.setAttribute('title', next);
    toggle.setAttribute('aria-pressed', String(dark));
  });
}
label();
toggles.forEach((toggle) =>
  toggle.addEventListener('click', () => {
    const theme =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('achmage-theme', theme);
    } catch {}
    label();
  }),
);
document.querySelectorAll<HTMLMediaElement>('video,audio').forEach((player) =>
  player.addEventListener('play', () =>
    document
      .querySelectorAll<HTMLMediaElement>('video,audio')
      .forEach((other) => {
        if (other !== player) other.pause();
      }),
  ),
);
document.addEventListener('visibilitychange', () => {
  if (document.hidden)
    document
      .querySelectorAll<HTMLMediaElement>('video,audio')
      .forEach((v) => v.pause());
});
