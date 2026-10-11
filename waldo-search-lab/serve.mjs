import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };
const args = process.argv.slice(2);
const port = args.length === 0 ? 4174 : args.length === 2 && args[0] === '--port' && /^\d+$/.test(args[1]) ? Number(args[1]) : NaN;
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('Usage: node serve.mjs [--port 0..65535]. Port 0 chooses a free local port.');
  process.exit(1);
}
const server = http.createServer(async (req, res) => {
  try {
    const request = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (request === '/' ? '/index.html' : request));
    if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) throw new Error('Missing file');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Reuse the running preview or choose another port: node serve.mjs --port 4178`
    : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log('Local: http://127.0.0.1:' + server.address().port));
