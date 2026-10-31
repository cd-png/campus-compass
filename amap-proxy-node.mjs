import http from 'node:http';
import { pathToFileURL } from 'node:url';
import worker from './amap-proxy-worker.mjs';

// Reuse the same allowlist and secret handling on Node hosting platforms.
export function createProxyServer(env = process.env) {
 return http.createServer(async (req, res) => {
  try {
   const url = new URL(req.url, 'https://proxy.invalid');
   const request = new Request(url, {method: req.method, headers: req.headers});
   const response = await worker.fetch(request, env);
   res.writeHead(response.status, Object.fromEntries(response.headers));
   res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
   res.writeHead(500, {'Content-Type':'text/plain', 'Cache-Control':'no-store'});
   res.end('Map proxy unavailable');
  }
 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 createProxyServer().listen(Number(process.env.PORT) || 3001, '0.0.0.0', () => {
  console.log('Campus map proxy listening');
 });
}
