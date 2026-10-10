import { z } from 'zod';
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const safeUrl = z
  .string()
  .refine(
    (v) => (v.startsWith('/') && !v.startsWith('//')) || /^https:\/\//.test(v),
    'HTTPS 또는 사이트 경로가 필요합니다.',
  );
export const artifactSchema = z
  .object({
    type: z.enum(['html', 'markdown', 'pdf', 'link', 'image']),
    id: slug.optional(),
    role: z.enum(['slides', 'report', 'kit', 'reference']).optional(),
    url: safeUrl,
    label: z.string(),
    version: z.string(),
    modes: z.array(z.enum(['present', 'read', 'download'])).default([]),
  })
  .strict();
export const workSchema = z
  .object({
    id: slug,
    slug,
    title: z.string().min(1),
    summary: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateKind: z.enum(['published', 'registered']).default('published'),
    registeredAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    audience: z.string().optional(),
    takeaways: z.array(z.string()).default([]),
    productionNote: z.string().optional(),
    featuredReason: z.string().optional(),
    kind: z.enum(['talk', 'lecture', 'motion', 'note', 'poster']),
    topics: z.array(z.string()).min(1),
    visibility: z.enum(['listed', 'unlisted', 'draft']),
    seo: z.enum(['index', 'noindex']),
    status: z.enum(['selected', 'study']),
    featuredOrder: z.number().int().positive().optional(),
    poster: safeUrl,
    posterAlt: z.string(),
    body: z.string().default(''),
    htmlSource: z.string().optional(),
    markdownSource: z.string().optional(),
    reader: z.object({version:z.literal('1.0.0'),source:z.string(),sourceVersion:z.string(),manifest:z.string()}).strict().optional(),
    course: z
      .object({
        id: slug,
        title: z.string(),
        term: z.string(),
        week: z.number().int().positive().optional(),
      })
      .optional(),
    event: z.string().optional(),
    artifacts: z.array(artifactSchema).default([]),
    mediaIds: z.array(slug).default([]),
    resourceIds: z.array(slug).default([]),
    provenance: z.string().optional(),
  })
  .strict();
export const mediaSchema = z
  .object({
    id: slug,
    workId: slug,
    title: z.string(),
    currentVersion: z.string(),
    versions: z
      .array(
        z
          .object({
            id: z.string(),
            url: safeUrl,
            duration: z.number().positive().optional(),
            label: z.string(),
            captions: safeUrl.optional(),
            creditsUrl: safeUrl.optional(),
          })
          .strict(),
      )
      .min(1),
    poster: safeUrl,
    credits: z.string(),
    external: z.boolean().default(false),
  })
  .strict();
export const usageSchema = z
  .object({
    workId: slug,
    mediaId: slug,
    version: z.string(),
    slideId: z.string().optional(),
    start: z.number().nonnegative(),
    end: z.number().positive(),
    role: z.enum([
      'opening',
      'explanation',
      'transition',
      'closing',
      'reference',
    ]),
    label: z.string(),
  })
  .strict();
export type Work = z.infer<typeof workSchema>;
export const resourceSchema = z.object({
  id: slug, kind: z.literal('poster'), workId: slug,
  title: z.string().min(1), summary: z.string().min(1), body: z.string().min(1),
  preview: safeUrl.refine(v=>v.startsWith('/'),'Local preview required'), previewAlt: z.string().min(1), currentVersion: z.string().min(1),
  versions: z.array(z.object({
    id: z.string().min(1), html: safeUrl, pdf: safeUrl.optional(), image: safeUrl.optional(),
    engineVersion: z.string().min(1), viewerVersion: z.string().min(1),
    packageSha256: z.string().regex(/^[a-f0-9]{64}$/),
    files: z.record(z.string(),z.string().regex(/^[a-f0-9]{64}$/)),
  }).strict()).min(1),
}).strict();
export type Resource = z.infer<typeof resourceSchema>;
export function validateResources(works: Work[], resources: Resource[]) {
  const byId=new Map(resources.map(r=>[r.id,r]));
  if(byId.size!==resources.length) throw Error('Duplicate resource');
  for(const r of resources){
    if(!works.some(w=>w.id===r.workId)) throw Error('Unknown resource owner');
    if(new Set(r.versions.map(v=>v.id)).size!==r.versions.length || !r.versions.some(v=>v.id===r.currentVersion)) throw Error('Invalid resource version');
  }
  for(const w of works) for(const id of w.resourceIds){
    const r=byId.get(id); if(!r) throw Error('Unknown resource '+id);
    const owner=works.find(x=>x.id===r.workId)!;
    if((w.visibility==='listed' && owner.visibility!=='listed') || (w.visibility==='unlisted' && owner.visibility==='draft')) throw Error('Resource reference exposes hidden work');
  }
}
export type Media = z.infer<typeof mediaSchema>;
export type Usage = z.infer<typeof usageSchema>;
export type Segment = {
  id: string;
  title: string;
  text: string;
  href: string;
  kind?: 'slide' | 'caption' | 'poster';
};
export type PublicWork = Omit<
  Work,
  'htmlSource' | 'markdownSource' | 'provenance' | 'reader'
> & {
  href: string;
  segments: Segment[];
  readingHtml: string;
  reader?: import('./reader').ReaderDocument;
  relations?: import('./reader').ReaderRelation[];
  videoCount: number;
};
export function workHref(w: Pick<Work, 'kind' | 'slug'>) {
  return w.kind === 'motion'
    ? '/motion/' + w.slug + '/'
    : '/talks/' + w.slug + '/';
}
export function isListed(w: Pick<Work, 'visibility'>) {
  return w.visibility === 'listed';
}
export function isPublished(w: Pick<Work, 'visibility'>) {
  return w.visibility !== 'draft';
}
export function validateRelations(
  works: Work[],
  media: Media[],
  usages: Usage[],
) {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const byId = new Map(works.map((w) => [w.id, w]));
  const courses = new Map<string, string>();
  for (const w of works) {
    if (ids.has(w.id) || slugs.has(workHref(w)))
      throw Error('Duplicate work: ' + w.id);
    ids.add(w.id);
    slugs.add(workHref(w));
    if (w.course) {
      const identity = w.course.title + ' / ' + w.course.term;
      if (courses.has(w.course.id) && courses.get(w.course.id) !== identity)
        throw Error('Course ID must identify one title and term');
      courses.set(w.course.id, identity);
    }
  }
  const ms = new Map(media.map((m) => [m.id, m]));
  if (ms.size !== media.length) throw Error('Duplicate media');
  for (const m of media) {
    if (!ids.has(m.workId)) throw Error('Unknown media owner: ' + m.workId);
    if (!m.versions.some((v) => v.id === m.currentVersion))
      throw Error('Unknown current version');
    if (new Set(m.versions.map((v) => v.id)).size !== m.versions.length)
      throw Error('Duplicate version');
  }
  const verifyExposure = (workId: string, mediaId: string) => {
    const w = byId.get(workId);
    const owner = byId.get(ms.get(mediaId)!.workId)!;
    if (
      (w?.visibility === 'listed' && owner.visibility !== 'listed') ||
      (w?.visibility === 'unlisted' && owner.visibility === 'draft')
    )
      throw Error('Media reference exposes unpublished or unlisted work');
  };
  for (const w of works) {
    for (const id of w.mediaIds) {
      if (!ms.has(id)) throw Error('Unknown media ' + id);
      verifyExposure(w.id, id);
    }
    if (w.visibility !== 'listed' && w.featuredOrder)
      throw Error('Hidden work cannot be featured');
  }
  for (const u of usages) {
    const v = ms.get(u.mediaId)?.versions.find((v) => v.id === u.version);
    if (
      !ids.has(u.workId) ||
      !v ||
      u.end <= u.start ||
      (v.duration && u.end > v.duration)
    )
      throw Error('Invalid media usage');
    verifyExposure(u.workId, u.mediaId);
  }
}
