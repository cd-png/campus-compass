/* Browser geolocation: fast coarse fix + continuous accurate fix, one fallback. */
function startDeviceLocation(geo,{onPosition,onStatus,onError},{clock=()=>Date.now()}={}) {
  let active=true,id=null,lastFix=null,watchFailed=false,fallbackStarted=false,finished=false;
  function stop(){active=false;if(id!==null)geo.clearWatch(id);id=null}
  function terminal(error){if(!active||finished)return;finished=true;stop();onError(error)}
  function accept(p){
    if(!active)return;
    const c=p?.coords;
    if(!c||!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||Math.abs(c.latitude)>90||Math.abs(c.longitude)>180||!Number.isFinite(c.accuracy)||c.accuracy<0)return;
    const timestamp=p.timestamp||clock();if(clock()-timestamp>60000)return;
    if(lastFix&&clock()-lastFix.timestamp<15000&&c.accuracy>lastFix.coords.accuracy*2)return;
    lastFix={coords:{latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy},timestamp};
    onPosition(lastFix);
  }
  function fresh(){return lastFix&&clock()-lastFix.timestamp<60000}
  function recover(error){
    if(!active)return;
    if(error.code===1){terminal(error);return}
    watchFailed=true;
    if(fresh()){onStatus('recovering','位置更新较慢，正在继续获取精确位置');return}
    if(fallbackStarted||typeof geo.getCurrentPosition!=='function'){terminal(error);return}
    fallbackStarted=true;
    onStatus('recovering','精确定位暂未返回，正在自动尝试网络定位…');
    geo.getCurrentPosition(accept,e=>{if(!active)return;if(e.code===1)terminal(e);else if(!fresh())terminal(e)}, {enableHighAccuracy:false,maximumAge:15000,timeout:20000});
  }
  onStatus('waiting','正在获取设备位置（精确定位最长等待 45 秒）…');
  id=geo.watchPosition(accept,recover,{enableHighAccuracy:true,maximumAge:5000,timeout:45000});
  if(!active&&id!==null){geo.clearWatch(id);id=null}
  if(active&&typeof geo.getCurrentPosition==='function'){
    geo.getCurrentPosition(accept,error=>{
      if(!active)return;
      if(error.code===1)terminal(error);
      else if(!lastFix&&!watchFailed)onStatus('waiting','快速定位未返回，正在继续获取精确位置…');
    },{enableHighAccuracy:false,maximumAge:30000,timeout:12000});
  }
  return {stop,get id(){return id},get active(){return active}};
}
if(typeof module!=='undefined')module.exports={startDeviceLocation};
