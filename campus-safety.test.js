const assert=require('node:assert/strict'),S=require('./campus-safety'),C=require('./amap-coordinates');
const square=[[30,120],[30,121],[31,121],[31,120]],p={confirmed:true,boundary:square,blocked:[]};
assert.equal(S.check([[30.2,120.2],[30.8,120.8]],p).status,'candidate');assert.equal(S.check([[30.2,120.2],[31.1,120.8]],p).status,'blocked');assert.equal(S.check([[30.2,120.2],[30.8,120.8]],null).status,'unknown');
assert.equal(S.check([[30.2,120.2],[30.8,120.8]],{...p,blocked:[[[30.4,120.4],[30.4,120.6],[30.6,120.6],[30.6,120.4]]]}).status,'blocked');
const concave=[[0,0],[0,4],[4,4],[4,3],[1,3],[1,1],[4,1],[4,0]];assert.equal(S.segmentInside([3,.5],[3,3.5],concave),false);assert.equal(S.validPolygon([[0,0],[1,1],[0,1],[1,0]]),false);
for(const wgs of [[30.833,121.514],[31.163,121.413],[34.1,108.9],[0,0]]){const restored=C.inverse(C.forward(wgs));assert.ok(Math.abs(restored[0]-wgs[0])<1e-7);assert.ok(Math.abs(restored[1]-wgs[1])<1e-7)}
console.log('Campus safety: outside routes, concave boundary excursions, blocked crossings, missing data, invalid polygons, WGS84/GCJ02 roundtrip passed');
