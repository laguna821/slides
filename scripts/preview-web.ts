import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('web-dist');
const config = JSON.parse(await fs.readFile('vercel.json', 'utf8'));
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.vtt': 'text/vtt',
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const redirect = config.redirects?.find(
        (r: any) => r.source === decodeURIComponent(url.pathname),
      );
      if (redirect) {
        res.writeHead(307, { Location: redirect.destination });
        res.end();
        return;
      }
      const target = path.resolve(
        root,
        '.' +
          decodeURIComponent(url.pathname) +
          (url.pathname.endsWith('/') ? 'index.html' : ''),
      );
      if (!target.startsWith(root + path.sep)) throw Error('Outside output');
      const bytes = await fs.readFile(target);
      res.writeHead(200, {
        'Content-Type':
          mime[path.extname(target)] || 'application/octet-stream',
      });
      res.end(bytes);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  })
  .listen(4331, '127.0.0.1', () =>
    console.log('Web output: http://127.0.0.1:4331'),
  );
