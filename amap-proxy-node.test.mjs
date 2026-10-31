import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createProxyServer} from './amap-proxy-node.mjs';
const server=createProxyServer({AMAP_KEY:'test',AMAP_SECURITY_CODE:'secret'});
server.listen(0,'127.0.0.1');
await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
try {
 assert.equal((await fetch(base+'/health')).status,200);
 assert.equal((await fetch(base+'/_AMapService/v3/place/text')).status,403);
 assert.equal((await fetch(base+'/_AMapService/v3/ip',{headers:{Origin:'https://cd-png.github.io'}})).status,404);
 const options=await fetch(base+'/_AMapService/v3/place/text',{method:'OPTIONS',headers:{Origin:'https://cd-png.github.io'}});
 assert.equal(options.status,204);
 assert.equal(options.headers.get('Access-Control-Allow-Origin'),'https://cd-png.github.io');
 console.log('Node proxy HTTP health, access control, and CORS checks passed');
} finally {server.closeAllConnections();server.close();}
