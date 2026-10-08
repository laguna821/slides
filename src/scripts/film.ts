import type { Media } from '../lib/schema';
import { validateClip } from '../lib/clip';
const root = document.querySelector<HTMLElement>('[data-film-player]');
if (root) {
  const video = root.querySelector<HTMLVideoElement>('video')!;
  const versions = JSON.parse(root.dataset.versions!) as Media['versions'];
  const params = new URLSearchParams(location.search);
  const current =
    versions.find((v) => v.id === params.get('v')) ||
    versions.find((v) => v.id === root.dataset.currentVersion)!;
  const startInput = root.querySelector<HTMLInputElement>('[data-clip-start]');
  const endInput = root.querySelector<HTMLInputElement>('[data-clip-end]');
  const message = root.querySelector<HTMLElement>('.clip-message');
  let range: { start: number; end: number } | null = null;
  let initialSeek = true;
  const source = video.querySelector('source')!;
  source.src = current.url;
  const track = video.querySelector('track');
  if (track) {
    if (current.captions) track.src = current.captions;
    else track.remove();
  }
  const original = root.querySelector<HTMLAnchorElement>(
    '[data-original-video]',
  )!;
  original.href = current.url;
  const versionLabel = root.querySelector('[data-version-label]');
  if (versionLabel) versionLabel.textContent = current.id;
  const limit = () =>
    Number.isFinite(video.duration) ? video.duration : current.duration || 0;
  let queryStart = Number(params.get('start') || 0),
    queryEnd = Number(params.get('end') || current.duration || 0);
  try {
    range = validateClip(queryStart, queryEnd, current.duration || Infinity);
  } catch {
    range = null;
    queryStart = 0;
    queryEnd = current.duration || 0;
  }
  if (startInput) startInput.value = String(queryStart);
  if (endInput) {
    endInput.value = String(queryEnd);
    if (current.duration) endInput.max = String(current.duration);
  }
  function say(text: string) {
    if (message) message.textContent = text;
  }
  function getRange() {
    return validateClip(
      Number(startInput?.value ?? queryStart),
      Number(endInput?.value ?? queryEnd),
      limit() || Infinity,
    );
  }
  video.addEventListener('loadedmetadata', () => {
    if (endInput) endInput.max = String(video.duration);
    if (initialSeek) {
      initialSeek = false;
      if (range) {
        try {
          range = validateClip(range.start, range.end, video.duration);
          video.currentTime = range.start;
        } catch {
          range = null;
          say('이 영상 길이에 맞게 구간을 다시 지정해 주세요.');
        }
      }
    }
  });
  video.addEventListener('timeupdate', () => {
    if (range && video.currentTime >= range.end) {
      video.pause();
    }
  });
  video.addEventListener('play', () => {
    if (
      range &&
      (video.currentTime >= range.end || video.currentTime < range.start)
    ) {
      video.currentTime = range.start;
    }
  });
  video.addEventListener('error', () => {
    root.querySelector<HTMLElement>('[data-film-error]')!.hidden = false;
    say('영상을 불러오지 못했습니다. 원본 영상 링크를 이용해 주세요.');
  });
  async function play(full: boolean) {
    try {
      const chosen = full ? null : getRange();
      if (video.readyState < 1) {
        await new Promise<void>((resolve, reject) => {
          video.addEventListener('loadedmetadata', () => resolve(), {
            once: true,
          });
          video.addEventListener(
            'error',
            () => reject(Error('영상을 불러오지 못했습니다.')),
            { once: true },
          );
          video.load();
        });
      }
      range = chosen
        ? validateClip(chosen.start, chosen.end, video.duration)
        : null;
      video.currentTime = range?.start || 0;
      await video.play();
      say(
        range
          ? range.start + '초부터 ' + range.end + '초까지 재생합니다.'
          : '전체 영상을 재생합니다.',
      );
    } catch (e) {
      say(e instanceof Error ? e.message : '재생을 시작하지 못했습니다.');
    }
  }
  root
    .querySelector('[data-play-clip]')
    ?.addEventListener('click', () => play(false));
  root
    .querySelector('[data-play-full]')
    ?.addEventListener('click', () => play(true));
  root
    .querySelector('[data-fullscreen]')
    ?.addEventListener('click', async () => {
      try {
        if (video.requestFullscreen) await video.requestFullscreen();
        else (video as any).webkitEnterFullscreen?.();
      } catch {
        say('플레이어의 전체화면 버튼을 사용해 주세요.');
      }
    });
  root.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) =>
    button.addEventListener('click', async () => {
      try {
        const clip = getRange();
        const base = new URL(
          '/motion/' + root.dataset.workSlug + '/',
          document.querySelector<HTMLLinkElement>('link[rel=canonical]')
            ?.href || location.href,
        );
        base.search = new URLSearchParams({
          v: current.id,
          start: String(clip.start),
          end: String(clip.end),
        }).toString();
        let value = base.href;
        if (button.dataset.copy === 'embed') {
          base.pathname += 'embed/';
          value =
            '<iframe src="' +
            base.href.replaceAll('&', '&amp;') +
            '" title="' +
            video.getAttribute('aria-label')!.replaceAll('"', '&quot;') +
            '" width="960" height="540" loading="lazy" allow="fullscreen" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0"></iframe>';
        }
        if (button.dataset.copy === 'json')
          value = JSON.stringify(
            {
              mediaId: root.dataset.mediaId,
              version: current.id,
              start: clip.start,
              end: clip.end,
              url: base.href,
              source: current.url,
              role: 'reference',
            },
            null,
            2,
          );
        try {
          await navigator.clipboard.writeText(value);
          say('복사했습니다.');
        } catch {
          const box =
            root.querySelector<HTMLTextAreaElement>('.copy-fallback')!;
          box.hidden = false;
          box.value = value;
          box.focus();
          box.select();
          say('아래 내용을 선택해 복사해 주세요.');
        }
      } catch (e) {
        say(e instanceof Error ? e.message : '구간을 확인해 주세요.');
      }
    }),
  );
}
