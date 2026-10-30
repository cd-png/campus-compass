// Cloudflare Worker. Set AMAP_KEY and AMAP_SECURITY_CODE as encrypted secrets.
// Official proxy contract: https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode
const SITE = 'https://cd-png.github.io';
const REST_PATHS = new Set(['/v3/place/text', '/v3/place/around', '/v3/place/detail', '/v3/direction/walking', '/v5/direction/walking']);
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  const headers = {'Access-Control-Allow-Origin': SITE, 'Vary': 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'};
  const reply = (text, status) => new Response(text, {status, headers});
  if (url.pathname === '/health') return reply('Campus map proxy', 200);
  const origin = request.headers.get('Origin');
  let referer;
  try { referer = new URL(request.headers.get('Referer')); } catch {}
  if (origin !== SITE && !(referer?.origin === SITE && referer.pathname.startsWith('/campus-compass/'))) return reply('Forbidden', 403);
  if (origin && origin !== SITE) return reply('Forbidden', 403);
  if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: {...headers, 'Access-Control-Allow-Methods':'GET, OPTIONS'}});
  if (request.method !== 'GET') return reply('Method not allowed', 405);
  if (!env.AMAP_KEY || !env.AMAP_SECURITY_CODE) return reply('Map proxy not configured', 503);
  const path = url.pathname.replace(/^\/_AMapService(?=\/)/, '');
  if (!url.pathname.startsWith('/_AMapService/') || !REST_PATHS.has(path) && path !== '/v4/map/styles') return reply('Not found', 404);
  if (url.search.length > 10000) return reply('Request too large', 414);
  if (url.searchParams.has('key') && url.searchParams.get('key') !== env.AMAP_KEY) return reply('Invalid map key', 403);
  const target = new URL(path, path === '/v4/map/styles' ? 'https://webapi.amap.com' : 'https://restapi.amap.com');
  target.search = url.search;
  target.searchParams.set('key', env.AMAP_KEY);
  target.searchParams.set('jscode', env.AMAP_SECURITY_CODE);
  try {
   const upstream = await fetch(target, {redirect:'error', signal:AbortSignal.timeout(15000)});
   if (!upstream.ok) return reply('Map provider unavailable', 502);
   const body = await upstream.text();
   if (body.includes(env.AMAP_SECURITY_CODE)) return reply('Invalid provider response', 502);
   return new Response(body, {headers:{...headers, 'Content-Type':upstream.headers.get('Content-Type') || 'application/json; charset=utf-8'}});
  } catch { return reply('Map provider unavailable', 502); }
 }
};
