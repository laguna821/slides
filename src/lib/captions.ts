export function parseVtt(vtt: string) {
  const seconds = (value: string) =>
    value.split(':').reduce((n, v) => n * 60 + Number(v), 0);
  return vtt
    .replace(/^\uFEFF/, '')
    .replaceAll('\r', '')
    .split(/\n\s*\n/)
    .flatMap((block, i) => {
      const lines = block.split('\n');
      const at = lines.findIndex((l) =>
        /^\s*(?:\d{2}:)?\d{2}:\d{2}\.\d{3}\s+-->/.test(l),
      );
      if (at < 0 || /^(NOTE|STYLE|REGION)\b/.test(lines[0])) return [];
      const match = lines[at].match(
        /((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s+-->\s+((?:\d{2}:)?\d{2}:\d{2}\.\d{3})/,
      );
      if (!match) return [];
      const start = seconds(match[1]),
        end = seconds(match[2]);
      const text = lines
        .slice(at + 1)
        .join(' ')
        .replace(/<[^>]+>/g, '')
        .replaceAll('&amp;', '&')
        .trim();
      return text && end > start ? [{ id: 'cue-' + i, start, end, text }] : [];
    });
}
