// AMap JS API 2.0 is the only live-map provider. No undocumented tile URLs.
// The browser Key is public and restricted by AMap's domain whitelist.
// The security code is held only by the proxy's encrypted environment binding.
const deployedAMap=typeof location!=='undefined'&&location.origin==='https://cd-png.github.io'
 ?{key:'aeb122811962bdd0ef1c76663242c081',serviceHost:'https://campus-amap-proxy.3815790653.workers.dev/_AMapService'}
 :{key:'',serviceHost:''};
let amapSession={...deployedAMap,securityJsCode:''},amapLoading;
const amapMaps=new Set();
const amapPoint=p=>{const q=AMapCoordinates.forward(p);return[q[1],q[0]]};
const fromAMap=p=>AMapCoordinates.inverse([p.getLat?p.getLat():+p.lat,p.getLng?p.getLng():+p.lng]);
async function loadCampusMap(){
 if(window.AMap?.Map)return;if(amapLoading)return amapLoading;
 if(!amapSession.key||!amapSession.securityJsCode&&!amapSession.serviceHost)throw Error('请先配置高德地图 Key 与安全密钥（或安全代理地址）');
 window._AMapSecurityConfig=amapSession.serviceHost?{serviceHost:amapSession.serviceHost}:{securityJsCode:amapSession.securityJsCode};
 amapLoading=new Promise((resolve,reject)=>{const script=document.createElement('script');let done=false;const finish=error=>{if(done)return;done=true;clearTimeout(timer);if(error){amapLoading=null;script.remove();reject(error)}else resolve()};const timer=setTimeout(()=>finish(Error('高德地图加载超时，请检查网络、Key和域名白名单')),20000);script.src='https://webapi.amap.com/maps?v=2.0&key='+encodeURIComponent(amapSession.key)+'&plugin=AMap.Walking,AMap.PlaceSearch';script.onload=()=>finish(window.AMap?.Map?null:Error('高德地图未初始化，请核对 Key'));script.onerror=()=>finish(Error('无法连接高德地图，请检查网络'));document.head.appendChild(script)});return amapLoading;
}
let amapProxyHealthyAt=0,amapProxyCheck;
async function checkAMapProxy(){
 if(!amapSession.serviceHost)return;
 if(Date.now()-amapProxyHealthyAt<30000)return;
 if(amapProxyCheck)return amapProxyCheck;
 amapProxyCheck=(async()=>{try{const base=amapSession.serviceHost.replace(/\/_AMapService\/?$/,'');const response=await fetch(base+'/health',{signal:AbortSignal.timeout(6000),cache:'no-store'});if(!response.ok)throw Error();amapProxyHealthyAt=Date.now()}catch{throw Error('高德路线与检索服务暂时无法连接，底图仍可浏览；请稍后重试，或在地图上校正教学楼位置')}finally{amapProxyCheck=null}})();return amapProxyCheck;
}
const CampusMapAPI={
 map(container){const raw=new AMap.Map(container,{viewMode:'2D',resizeEnable:true,zoom:16,mapStyle:'amap://styles/normal',features:['bg','road','building','point'],showIndoorMap:false});const map={raw,setView(p,z){raw.setZoomAndCenter(z,amapPoint(p));return map},panTo(p){raw.setCenter(amapPoint(p));return map},zoomIn(){raw.zoomIn()},zoomOut(){raw.zoomOut()},invalidateSize(){raw.resize?.()},on(event,fn){raw.on(event,e=>{if(e.lnglat){const p=fromAMap(e.lnglat);fn({latlng:{lat:p[0],lng:p[1]}})}});return map},fitBounds(points,opts={}){if(!points?.length)return;const markers=points.map(p=>new AMap.Marker({position:amapPoint(p)}));raw.setFitView(markers,false,opts.padding?[opts.padding[1],opts.padding[0],opts.padding[1],opts.padding[0]]:[80,60,80,60],opts.maxZoom||18)},remove(){raw.destroy();amapMaps.delete(map)}};amapMaps.add(map);return map},
 divIcon(options){return options},latLngBounds(points){return points},
 marker(p,options={}){const icon=options.icon;const raw=new AMap.Marker({position:amapPoint(p),anchor:'bottom-center',...(icon?{content:'<div class="amap-classroom-pin">▥</div>'}:{})});return wrapAMapOverlay(raw,p)},
 circleMarker(p,options={}){return wrapAMapOverlay(new AMap.CircleMarker({center:amapPoint(p),radius:options.radius||8,strokeColor:options.color,strokeWeight:options.weight,fillColor:options.fillColor,fillOpacity:options.fillOpacity}),p)},
 circle(p,options={}){return wrapAMapOverlay(new AMap.Circle({center:amapPoint(p),radius:options.radius,strokeColor:options.color,strokeWeight:options.weight,fillOpacity:options.fillOpacity}),p)},
 polyline(points,options={}){const overlay=wrapAMapOverlay(new AMap.Polyline({path:points.map(amapPoint),strokeColor:options.color,strokeWeight:options.weight,strokeOpacity:options.opacity,lineJoin:'round'}));overlay.getBounds=()=>points;return overlay}
};
function wrapAMapOverlay(raw,p){return{raw,addTo(map){raw.setMap(map.raw);return this},remove(){raw.setMap(null)},setLatLng(point){p=point;if(raw.setPosition)raw.setPosition(amapPoint(point));else raw.setCenter(amapPoint(point));return this},bindTooltip(label,options={}){if(raw.setLabel)raw.setLabel({content:label.textContent||label, direction:'top',offset:new AMap.Pixel(0,-12)});return this},bindPopup(label){return this.bindTooltip(label)}}}
function attachCampusTiles(map,onStatus){onStatus('ready','高德道路地图 · 支持拖动与缩放');if(typeof schoolHeader==='function')schoolHeader();const update=()=>onStatus('ready','高德道路地图');return{retry:update,switch:update,destroy(){}}}
let mainCampusTiles;
function initializeCampusTiles(map){let panel=$('#map-network');if(!panel){panel=document.createElement('div');panel.id='map-network';panel.className='map-network';panel.innerHTML='<span role="status"></span><button type="button">高德设置</button>';$('#map').appendChild(panel)}mainCampusTiles=attachCampusTiles(map,(_,message)=>panel.querySelector('span').textContent=message);panel.querySelector('button').onclick=amapSettings}
function amapSettings(){
 modal('高德地图设置',`<p>主地图、学校预览、地点检索和步行规划统一使用高德 JS API 2.0。当前${amapSession.key?'已填写配置，实际可用性以加载结果为准':'尚未配置，真实地图暂不可用'}。</p><p>在高德开放平台创建「Web端（JS API）」Key，并配置 localhost 与正式网站域名白名单。</p><label>JS API Key<input id="amap-key" type="password" autocomplete="off" value="${esc(amapSession.key)}"></label><label>安全密钥 securityJsCode（本地试用）<input id="amap-code" type="password" autocomplete="off" value="${esc(amapSession.securityJsCode)}"></label><label>安全代理 serviceHost（生产部署建议使用；填写后优先使用）<input id="amap-proxy" type="url" placeholder="https://你的服务/_AMapService" value="${esc(amapSession.serviceHost)}"></label><p class="muted">正式网站已预设公开 Key 和安全代理，刷新后自动恢复。此处手动覆盖仅用于当前标签页；安全密钥保存在代理服务中，不公开到 GitHub。</p><div class="modal-actions"><button class="primary" id="save-amap">应用并加载高德地图</button><a href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener noreferrer">前往高德开放平台 ↗</a></div><p id="amap-settings-status" role="status"></p>`);
 const status=$('#amap-settings-status');$('#save-amap').onclick=async()=>{const key=$('#amap-key').value.trim(),code=$('#amap-code').value.trim(),proxy=$('#amap-proxy').value.trim();if(!key||!code&&!proxy){status.textContent='请填写 Key 和安全密钥，或 Key 和安全代理地址';return}if(proxy){try{const u=new URL(proxy);if(u.protocol!=='https:')throw Error()}catch{status.textContent='代理地址必须使用 HTTPS';return}}if(window.AMap?.Map&&key!==amapSession.key){status.textContent='切换 Key 前请刷新页面，再重新填写配置';return}amapSession={key,securityJsCode:code,serviceHost:proxy};status.textContent='正在加载高德地图…';try{await loadCampusMap();if(status.isConnected)$('#modal').close();if(typeof buildingCache!=='undefined'){buildingCache.clear();buildingMatch=null;buildingRequest=null;buildingState='';activeCourseKey=''}if(school)await showRealMap();else toast('高德组件已加载，请设置学校')}catch(e){if(status.isConnected)status.textContent=e.message}};
}
let campusEditState=null,campusPolicyOverlay=null;
searchSchoolLocations=async function(name,campus){
 try{await loadCampusMap();await checkAMapProxy();return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('高德地点检索超时')),15000);new AMap.PlaceSearch({pageSize:10,extensions:'all'}).search([name,campus].filter(Boolean).join(' '),(status,result)=>{clearTimeout(timer);if(status!=='complete'){resolve({results:[],error:'高德未返回匹配地点，请补充学校和校区名称'});return}resolve({results:(result.poiList?.pois||[]).filter(p=>p.location).map(p=>{const coord=fromAMap(p.location);return{lat:coord[0],lon:coord[1],display_name:[p.name,p.address].filter(Boolean).join(' · '),name:p.name,source:'高德地图地点检索'}})})})})}catch(e){return{results:[],error:e.message}}
};
