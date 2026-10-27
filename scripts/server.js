import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const port = Number(process.env.PORT ?? 4318);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json'};
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(root + path.sep)) {res.writeHead(403).end('Forbidden'); return;}
    const data = await readFile(target);
    res.writeHead(200, {'Content-Type':mime[path.extname(target)] ?? 'application/octet-stream','X-Content-Type-Options':'nosniff'}).end(data);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') res.writeHead(404).end('Not found');
    else { console.error('Request failed:', error); res.writeHead(500).end('Unable to load file; see server log.'); }
  }
});
server.on('error', error => {console.error(`Cannot start loopback server on ${port}:`, error.message); process.exitCode = 1;});
server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address !== 'string') console.log(`Tavern Workshop: http://127.0.0.1:${address.port}`);
});
