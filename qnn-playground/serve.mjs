import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.map':'application/json', '.png':'image/png', '.svg':'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const request = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (request === '/' ? '/index.html' : request));
    if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + (['.html','.css','.js','.json','.map'].includes(path.extname(file)) ? '; charset=utf-8' : ''), 'Cache-Control':'no-store' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
const port = Number(process.env.PORT) || 4175;
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
