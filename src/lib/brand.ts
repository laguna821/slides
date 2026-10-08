// User-selected Arc / Rune concept. 2026-10-08.
export const brandA = 'M49.8 6.5 16 73 33 67 50.8 30 67 65 84.5 72Z';
export const brandArc =
  'M6.5 62.5C28 72 55.5 55.5 89 31L84.5 47C59 68 27 84 8 74Z';
export const brandStar = 'M83 10 86 19 95 22 86 25 83 34 80 25 71 22 80 19Z';

// Navy carries the lettering; blue and restrained teal follow its rise/fall.
export const brandFlowStops = [
  ['0%', '#0066b3', '#8ec8ed'],
  ['23%', '#008a9d', '#62bcc8'],
  ['52%', '#002e6e', '#d8eafa'],
  ['70%', '#004b8d', '#a5cfee'],
  ['100%', '#009b9d', '#65c8c6'],
] as const;
export const brandGradient = (id: string, reversed = false) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0.16" y2="1">${brandFlowStops.map(([offset, light, dark]) => `<stop offset="${offset}" stop-color="${reversed ? dark : light}"/>`).join('')}</linearGradient>`;
