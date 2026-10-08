import {
  prepareHomeSearchEntries,
  searchPreparedHomeEntries,
  type HomeSearchEntry,
} from '../vendor/home-search';
import type { PublicWork } from './schema';
export type SearchEntry = HomeSearchEntry & {
  workId: string;
  href: string;
  kind: string;
  topics: string[];
  year: string;
  course: string;
  segmentTitle?: string;
};
export type Filters = {
  q: string;
  kind: string;
  year: string;
  topic: string;
  course: string;
  sort: string;
  view: string;
};
export const defaultFilters: Filters = {
  q: '',
  kind: '',
  year: '',
  topic: '',
  course: '',
  sort: '',
  view: 'grid',
};
export function readFilters(params: URLSearchParams): Filters {
  const out = { ...defaultFilters };
  for (const key of Object.keys(out) as (keyof Filters)[])
    out[key] = params.get(key) || out[key];
  out.view = out.view === 'list' ? 'list' : 'grid';
  out.sort = ['latest', 'oldest', 'title', 'relevance'].includes(out.sort)
    ? out.sort
    : '';
  return out;
}
export function writeFilters(filters: Filters) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters))
    if (v && !(k === 'view' && v === 'grid')) p.set(k, v);
  return p.toString();
}
export function makeSearchEntries(works: PublicWork[]): SearchEntry[] {
  return works
    .filter((w) => w.visibility === 'listed')
    .flatMap((w, i) => {
      const base = {
        slug: w.id,
        title: w.title,
        docType: w.kind,
        date: w.date,
        outputs: w.artifacts.map((a) => a.type),
        summary: w.summary,
        frontmatterText: w.topics.join(' '),
        frontmatterTags: w.topics,
        inlineTags: [],
        originalOrder: i,
        workId: w.id,
        href: w.href,
        kind: w.kind,
        topics: w.topics,
        year: w.date.slice(0, 4),
        course: w.course?.id || '',
      };
      return [
        { ...base, plainBody: w.body },
        ...w.segments.map((s) => ({
          ...base,
          slug: w.id + ':' + s.id,
          title: w.title + ' · ' + s.title,
          plainBody: s.text,
          href: w.href + 'read/#' + encodeURIComponent(s.id),
          segmentTitle: s.title,
        })),
      ];
    });
}
export function runSearch(entries: SearchEntry[], filters: Filters) {
  const selected = entries.filter(
    (e) =>
      (!filters.kind || e.kind === filters.kind) &&
      (!filters.year || e.year === filters.year) &&
      (!filters.topic || e.topics.includes(filters.topic)) &&
      (!filters.course || e.course === filters.course),
  );
  const matches = searchPreparedHomeEntries(
    prepareHomeSearchEntries(selected),
    { query: filters.q, tags: [] },
  );
  const grouped = new Map<
    string,
    {
      entry: SearchEntry;
      score: number;
      excerpt?: string;
      href: string;
      segmentTitle?: string;
    }
  >();
  for (const m of matches) {
    const e = m.entry as SearchEntry;
    const prev = grouped.get(e.workId);
    const moreSpecific =
      prev &&
      m.score === prev.score &&
      e.segmentTitle &&
      !prev.segmentTitle &&
      m.matchedFields.includes('body') &&
      !m.matchedFields.includes('title');
    if (!prev || m.score > prev.score || moreSpecific)
      grouped.set(e.workId, {
        entry: e,
        score: m.score,
        excerpt: m.excerpt,
        href: e.href,
        segmentTitle: e.segmentTitle,
      });
  }
  const out = [...grouped.values()];
  const sort = filters.sort || (filters.q ? 'relevance' : 'latest');
  return out.sort((a, b) =>
    sort === 'title'
      ? a.entry.title.localeCompare(b.entry.title, 'ko')
      : sort === 'oldest'
        ? (a.entry.date || '').localeCompare(b.entry.date || '')
        : sort === 'latest'
          ? (b.entry.date || '').localeCompare(a.entry.date || '')
          : b.score - a.score,
  );
}
