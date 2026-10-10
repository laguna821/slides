import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { policy } from '../src/lib/policy';
import works from '../content/works.json';
import experiments from '../content/experiments.json';
import { workHref } from '../src/lib/schema';
export const reviewRoutes = [
  ...new Set([
    '/',
    '/archive/',
    '/posters/',
    '/motion/',
    '/videos/',
    '/about/',
    '/courses/',
    '/brand/',
    ...experiments.items.map((x) => x.path),
    ...works
      .filter((w) => w.visibility !== 'draft')
      .flatMap((w) => [
        workHref(w as any),
        ...('reader' in w ? [workHref(w as any) + 'read/'] : []),
      ]),
  ]),
];
export async function builtReviewRoutes(root = process.cwd()) {
  const generated: string[] = [];
  for (const f of (
    await fs.readdir(path.join(root, 'dist'), { recursive: true })
  ).filter((f) => f.endsWith('.html'))) {
    const rel = f.replaceAll('\\', '/');
    try {
      await fs.access(path.join(root, 'public', f));
      continue;
    } catch {}
    generated.push('/' + rel.replace(/index\.html$/, ''));
  }
  return [...new Set([...reviewRoutes, ...generated])].sort();
}
export function canonicalJson(value: any): string {
  if (Array.isArray(value))
    return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key]))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export async function releaseManifest(root = process.cwd()) {
  const files = [
    'package.json',
    'package-lock.json',
    'astro.config.mjs',
    'tsconfig.json',
    'vercel.json',
    'AGENTS.md',
    '.gitattributes',
  ];
  const works = JSON.parse(
    await fs.readFile(path.join(root, 'content/works.json'), 'utf8'),
  );
  for (const work of works)
    if (work.reader) {
      const m = JSON.parse(
        await fs.readFile(path.join(root, work.reader.manifest), 'utf8'),
      );
      files.push(m.works[work.id].source);
    }
  for (const work of works)
    for (const source of [work.htmlSource, work.markdownSource].filter(
      Boolean,
    )) {
      const absolute = path.resolve(root, source);
      if (!absolute.startsWith(path.resolve(root) + path.sep))
        throw Error('Source outside repository');
      files.push(path.relative(root, absolute).replaceAll('\\', '/'));
    }
  for (const dir of [
    'src',
    'content',
    'public',
    'scripts',
    'tests',
    'docs',
    '.github',
  ])
    for (const file of await fs.readdir(path.join(root, dir), {
      recursive: true,
    })) {
      const rel = dir + '/' + file.replaceAll('\\', '/');
      if (
        rel.startsWith('src/generated/') ||
        [
          'public/search-index.json',
          'public/catalogue.json',
          'public/AI_reading_3week_pilot_20261008.html',
        ].includes(rel)
      )
        continue;
      if ((await fs.stat(path.join(root, rel))).isFile()) files.push(rel);
    }
  const result: Record<string, string> = {};
  for (const file of [...new Set(files)].sort()) {
    const bytes = await fs.readFile(path.join(root, file));
    const content =
      file === 'vercel.json'
        ? canonicalJson(JSON.parse(bytes.toString('utf8')))
        : file === '.gitattributes' ||
            /\.(?:ts|js|mjs|astro|css|json|md|html|svg|vtt|txt|yaml|yml)$/.test(
              file,
            )
          ? bytes.toString('utf8').replaceAll('\r\n', '\n')
          : bytes;
    result[file] = createHash('sha256').update(content).digest('hex');
  }
  return result;
}
export async function releaseDigest(root = process.cwd()) {
  return createHash('sha256')
    .update(JSON.stringify(await releaseManifest(root)))
    .digest('hex');
}
export function validatePosterGeometry(
  rows: any,
  route: string,
  pageCount: number,
  requireMobileWidth = false,
) {
  if (!Number.isInteger(pageCount) || pageCount < 1)
    throw Error('Poster page count missing');
  for (const width of [375, 768, 1440])
    for (const theme of ['light', 'dark']) {
      const row = rows?.find(
        (r: any) => r.route === route && r.width === width && r.theme === theme,
      );
      if (
        !row ||
        !Number.isFinite(row.actualWidth) ||
        Math.abs(row.actualWidth - width) > 1 ||
        !Array.isArray(row.pages) ||
        row.pages.length !== pageCount ||
        new Set(row.pages).size !== row.pages.length ||
        row.sameScale !== true ||
        row.sameLogicalWidth !== true ||
        row.clipped !== 0 ||
        !['boxMaxDelta', 'headingMaxDelta', 'factsMaxDelta'].every(
          (k) => Number.isFinite(row[k]) && row[k] >= 0 && row[k] <= 0.5,
        )
      )
        throw Error(
          '순환 장 사이 기하 검토 누락/불일치: ' +
            route +
            '/' +
            width +
            '/' +
            theme,
        );
      if (
        requireMobileWidth &&
        width === 375 &&
        (!Number.isFinite(row.actualHeight) ||
          row.actualHeight < row.actualWidth ||
          !Number.isFinite(row.minContentWidthRatio) ||
          row.minContentWidthRatio < 0.9 ||
          row.minContentWidthRatio > 1)
      )
        throw Error(
          '모바일 포스터 본문 가로 점유율 검토 실패: ' + route + '/' + theme,
        );
    }
}
export function validateReview(
  review: any,
  digest: string,
  routes = reviewRoutes,
) {
  if (
    review.readers &&
    new Set(review.readers.map((r: any) => r.route)).size !==
      review.readers.length
  )
    throw Error('Duplicate reader review receipt');
  if (
    review.policyVersion !== policy.version ||
    review.digest !== digest ||
    review.status !== 'passed'
  )
    throw Error(
      '미리보기 검토가 없거나 변경 후 오래되었습니다. 같은 파일 해시의 검토를 갱신하세요.',
    );
  for (const route of routes)
    for (const width of [375, 768, 1440])
      for (const theme of ['light', 'dark'])
        if (
          !review.views?.some(
            (v: any) =>
              v.route === route &&
              v.width === width &&
              Math.abs(v.actualWidth - width) <= 1 &&
              v.theme === theme &&
              v.overflow === false &&
              v.brokenImages?.length === 0,
          )
        )
          throw Error('화면 검토 누락: ' + route + '/' + width + '/' + theme);
  for (const item of experiments.items.filter((x) =>
    ['1.2.0-rc.3', '1.2.0-rc.4', '1.2.0-rc.5'].includes(x.viewerVersion),
  ))
    validatePosterGeometry(
      review.posterGeometry,
      item.path,
      item.screenScenes!,
      ['1.2.0-rc.4', '1.2.0-rc.5'].includes(item.viewerVersion),
    );
  if (!review.functional?.posterSeries)
    throw Error('순환 포스터 기능 검토 누락');
  if (
    !review.functional?.search ||
    !review.functional?.posterFixture ||
    !review.functional?.keyboard
  )
    throw Error('기능 검토 누락');
  for (const route of routes.filter((r) => r.endsWith('/read/'))) {
    const result = review.readers?.find((r: any) => r.route === route);
    if (
      result?.version !== policy.readerVersion ||
      ![
        'toc',
        'copyText',
        'copyMarkdown',
        'download',
        'imageZoom',
        'graph',
        'anchors',
        'print',
      ].every((k) => result[k] === true)
    )
      throw Error('읽기 기능 검토 누락: ' + route);
  }
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/release-gate.ts')) {
  const digest = await releaseDigest();
  if (process.argv.includes('--digest')) console.log(digest);
  else {
    const review = JSON.parse(
      await fs.readFile('validation/release-review.json', 'utf8'),
    );
    if (review.digest !== digest) {
      const actual = await releaseManifest();
      const expected = review.sourceFiles || {};
      console.error(
        'Review file differences',
        [...new Set([...Object.keys(actual), ...Object.keys(expected)])].filter(
          (file) => actual[file] !== expected[file],
        ),
      );
    }
    validateReview(review, digest, await builtReviewRoutes());
    console.log('Release review matches policy and content digest');
  }
}
