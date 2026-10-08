import fs from 'node:fs/promises';
import { brandA, brandArc, brandStar, brandAccent } from '../src/lib/brand';
import wordmark from '../src/lib/brand-wordmark.json';

const svg = (
  body: string,
  viewBox = '0 0 100 100',
  label = 'Achmage Arc / Rune',
) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${label}">${body}</svg>\n`;
const symbol = (color: string, mono = false) =>
  `<defs><mask id="arc-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><path fill="white" d="M0 0H100V100H0Z"/><path d="${brandArc}" fill="black" stroke="black" stroke-width="3"/></mask></defs><g class="ink" fill="${color}"><path d="${brandA}" mask="url(#arc-cut)"/><path d="${brandStar}"/></g><path d="${brandArc}" fill="${mono ? color : brandAccent}"/>`;

await fs.mkdir('public/brand', { recursive: true });
for (const [suffix, ink, mono] of [
  ['', '#002e6e', false],
  ['-mono', '#002e6e', true],
  ['-reversed', '#eef5fc', false],
] as const) {
  await fs.writeFile(
    `public/brand/achmage-symbol${suffix}.svg`,
    svg(symbol(ink, mono)),
  );
  const body = `<path d="${wordmark.inkPath}" fill="${ink}" fill-rule="evenodd"/><path d="${wordmark.flowPath}" fill="${ink}" fill-rule="evenodd"/><path d="${wordmark.arcPath}" fill="${mono ? ink : brandAccent}" fill-rule="evenodd"/>`;
  await fs.writeFile(
    `public/brand/achmage-wordmark${suffix}.svg`,
    svg(body, wordmark.viewBox, 'Achmage.'),
  );
}
await fs.writeFile(
  'public/brand/favicon.svg',
  svg(
    '<style>@media(prefers-color-scheme:dark){.ink{fill:#eef5fc}}</style>' +
      symbol('#002e6e'),
  ),
);
for (const [old, current] of [
  ['ach-frame', 'achmage-symbol'],
  ['ach-frame-mono', 'achmage-symbol-mono'],
  ['ach-frame-reversed', 'achmage-symbol-reversed'],
])
  await fs.copyFile(`public/brand/${current}.svg`, `public/brand/${old}.svg`);
console.log(
  'Achmage: navy lettering, teal crossing arc. Vector set generated.',
);
