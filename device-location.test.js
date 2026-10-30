const assert=require('node:assert/strict'),{startDeviceLocation}=require('./device-location');
function fixture(){
  const callbacks={},requests=[],fixes=[],states=[],errors=[],cleared=[];
  const geo={watchPosition(ok,fail,opts){callbacks.ok=ok;callbacks.fail=fail;callbacks.options=opts;return 7},clearWatch:id=>cleared.push(id),getCurrentPosition(ok,fail,opts){requests.push({ok,fail,opts})}};
  let now=100000;const tracker=startDeviceLocation(geo,{onPosition:p=>fixes.push(p),onStatus:(s,m)=>states.push([s,m]),onError:e=>errors.push(e)},{clock:()=>now});
  return{callbacks,requests,fixes,states,errors,cleared,tracker,tick(ms){now+=ms},fix(accuracy=10,age=0){return{coords:{latitude:31.16,longitude:121.41,accuracy},timestamp:now-age}}};
}
let f=fixture();
assert.equal(f.callbacks.options.timeout,45000);
assert.equal(f.requests[0].opts.enableHighAccuracy,false);
assert.equal(f.requests[0].opts.timeout,12000);
f.callbacks.fail({code:3});
assert.equal(f.requests.length,2);assert.equal(f.requests[1].opts.enableHighAccuracy,false);
assert.equal(f.errors.length,0);assert.equal(f.tracker.active,true);
f.requests[1].ok(f.fix(30));assert.equal(f.fixes.length,1);
f.callbacks.ok(f.fix(8));assert.equal(f.fixes.length,2);
f.tracker.stop();f.callbacks.ok(f.fix());f.requests[0].ok(f.fix());
assert.equal(f.fixes.length,2);assert.equal(f.tracker.active,false);assert.deepEqual(f.cleared,[7]);
f=fixture();f.requests[0].fail({code:1});
assert.equal(f.errors[0].code,1);assert.equal(f.tracker.active,false);assert.equal(f.requests.length,1);
f=fixture();f.requests[0].fail({code:2});assert.equal(f.errors.length,0);
f.callbacks.fail({code:3});f.requests[1].fail({code:3});assert.equal(f.errors.length,1);assert.equal(f.tracker.active,false);
f=fixture();f.callbacks.ok(f.fix());f.callbacks.fail({code:3});
assert.equal(f.errors.length,0);assert.equal(f.requests.length,1);assert.equal(f.tracker.active,true);
f.callbacks.ok(f.fix(500));assert.equal(f.fixes.length,1);
f.tick(16000);f.callbacks.ok(f.fix(30));assert.equal(f.fixes.length,2);
f.callbacks.ok(f.fix(5,61000));assert.equal(f.fixes.length,2);
f=fixture();f.tracker.stop();f.callbacks.fail({code:3});assert.equal(f.requests.length,1);
console.log('Device location: fast fix, timeout fallback, permission errors, cancellation and stale fixes passed');
