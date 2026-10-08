import {
  readFilters,
  writeFilters,
  runSearch,
  type SearchEntry,
} from '../lib/search';
const root = document.querySelector<HTMLElement>('[data-archive]');
if (root) {
  const form = root.querySelector<HTMLFormElement>('form')!;
  const grid = root.querySelector<HTMLElement>('.archive-grid')!;
  const cards = [...grid.querySelectorAll<HTMLElement>('[data-work-id]')];
  const count = root.querySelector<HTMLElement>('.result-count')!;
  const empty = root.querySelector<HTMLElement>('.empty-state')!;
  let entries: SearchEntry[] = [];
  let ready = false;
  let timer: ReturnType<typeof setTimeout>;
  let state = readFilters(new URLSearchParams(location.search));
  if (!new URLSearchParams(location.search).has('view')) {
    try {
      if (localStorage.getItem('achmage-view') === 'list') {
        state.view = 'list';
        history.replaceState(
          null,
          '',
          location.pathname + '?' + writeFilters(state),
        );
      }
    } catch {}
  }
  function sync() {
    for (const key of [
      'q',
      'kind',
      'year',
      'topic',
      'course',
      'sort',
    ] as const) {
      const el = form.elements.namedItem(key) as
        HTMLInputElement | HTMLSelectElement;
      if (el) el.value = state[key];
    }
    grid.dataset.view = state.view;
    root!
      .querySelectorAll<HTMLButtonElement>('[data-view-button]')
      .forEach((b) =>
        b.setAttribute(
          'aria-pressed',
          String(b.dataset.viewButton === state.view),
        ),
      );
  }
  function read() {
    const f = new FormData(form);
    for (const key of ['q', 'kind', 'year', 'topic', 'course', 'sort'] as const)
      state[key] = String(f.get(key) || '');
  }
  function render(push = false) {
    sync();
    if (!ready) return;
    const result = runSearch(entries, state);
    const found = new Map(result.map((r) => [r.entry.workId, r]));
    cards.forEach((card) => {
      const hit = found.get(card.dataset.workId!);
      card.hidden = !hit;
      const line = card.querySelector<HTMLElement>('.search-match')!;
      line.replaceChildren();
      line.hidden = !state.q || !hit;
      if (state.q && hit) {
        const text = document.createElement('span');
        text.textContent = (hit.excerpt || hit.entry.summary || '').slice(
          0,
          210,
        );
        line.append(text);
        if (hit.segmentTitle) {
          const link = document.createElement('a');
          link.href = hit.href;
          link.textContent = ' — ' + hit.segmentTitle + ' 읽기';
          line.append(link);
        }
      }
    });
    result.forEach((hit) => {
      const card = cards.find((c) => c.dataset.workId === hit.entry.workId);
      if (card) grid.append(card);
    });
    empty.hidden = result.length > 0;
    count.textContent =
      (state.q ? '“' + state.q + '” · ' : '') +
      result.length +
      '개 자료 / 전체 ' +
      cards.length +
      '개';
    if (push) {
      const query = writeFilters(state);
      const next = location.pathname + (query ? '?' + query : '');
      if (next !== location.pathname + location.search)
        history.pushState(null, '', next);
    }
  }
  sync();
  fetch('/search-index.json')
    .then((r) => {
      if (!r.ok) throw Error('index');
      return r.json();
    })
    .then((data) => {
      entries = data.entries;
      ready = true;
      render();
    })
    .catch(() => {
      count.textContent =
        '검색 데이터를 불러오지 못했습니다. 전체 자료를 둘러보거나 새로고침해 주세요.';
      form
        .querySelectorAll<HTMLInputElement>('input,select,button')
        .forEach((e) => (e.disabled = true));
    });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(timer);
    read();
    render(true);
  });
  form.addEventListener('input', (e) => {
    if ((e.target as HTMLInputElement).name !== 'q') return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      read();
      render(true);
    }, 250);
  });
  form.addEventListener('change', () => {
    read();
    render(true);
  });
  const reset = () => {
    clearTimeout(timer);
    state = {
      q: '',
      kind: '',
      year: '',
      topic: '',
      course: '',
      sort: '',
      view: state.view,
    };
    sync();
    render(true);
  };
  form.addEventListener('reset', (e) => {
    e.preventDefault();
    reset();
  });
  root.querySelector('[data-reset]')?.addEventListener('click', reset);
  root.querySelectorAll<HTMLButtonElement>('[data-view-button]').forEach((b) =>
    b.addEventListener('click', () => {
      state.view = b.dataset.viewButton!;
      try {
        localStorage.setItem('achmage-view', state.view);
      } catch {}
      render(true);
    }),
  );
  window.addEventListener('popstate', () => {
    clearTimeout(timer);
    state = readFilters(new URLSearchParams(location.search));
    render();
  });
}
