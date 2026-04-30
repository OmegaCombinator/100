import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = process.cwd();
const distRoot = resolve(root, 'dist');
const contentRoot = resolve(root, 'public', 'content');
const port = Number(process.env.PORT ?? 8100);
const host = process.env.HOST ?? '127.0.0.1';

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith('/content/')) {
    serveFile(response, contentRoot, pathname.replace(/^\/content\/?/, ''), 0);
    return;
  }

  const cacheSeconds = pathname.startsWith('/assets/') ? 31536000 : 300;
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const served = serveFile(response, distRoot, relativePath, cacheSeconds, false);

  if (!served) {
    serveFile(response, distRoot, 'index.html', 300);
  }
}).listen(port, host, () => {
  console.log(`AixMath 100 listening at http://${host}:${port}`);
});

function serveFile(response, baseDir, relativePath, cacheSeconds, write404 = true) {
  const filePath = resolve(baseDir, normalize(relativePath));
  if (!isInside(baseDir, filePath) || !existsSync(filePath)) {
    if (write404) writeNotFound(response);
    return false;
  }

  const stat = statSync(filePath);
  if (!stat.isFile()) {
    if (write404) writeNotFound(response);
    return false;
  }

  response.writeHead(200, {
    'Cache-Control': `public, max-age=${cacheSeconds}`,
    'Content-Length': stat.size,
    'Content-Type': mimeTypes.get(extname(filePath)) ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
  return true;
}

function writeNotFound(response) {
  response.writeHead(404, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end('Not found');
}

function isInside(baseDir, filePath) {
  const normalizedBase = resolve(baseDir);
  const normalizedFile = resolve(filePath);
  return normalizedFile === normalizedBase || normalizedFile.startsWith(normalizedBase + sep);
}
