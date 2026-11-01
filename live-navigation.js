// Embedded walking guidance; geolocation begins only after an explicit click.
let followNext=true,buildingMatch=null,buildingRequest=null,routeRequest=null,routeLine=null,accuracyRing=null;
let routeResult=null,lastRouteStart=null,lastRouteTime=0,locationTime=0,locationState='尚未开启定位',routeState='开启定位后，显示步行路线和预计时间',activeCourseKey='',buildingState='',fitOnRoute=true;
let activeDestinationCoordinate='';
let locationTracker=null;
let locationFailure='';
const buildingCache=new Map();
const externalNavigation=$('#navigate').onclick;
const guidance=document.createElement('section');guidance.id='live-guidance';guidance.innerHTML=`<div class="guidance-title"><b>本页步行导航</b><button id="follow-next">跟随下节课</button></div><div class="guidance-stats"><span><small>我的位置</small><b id="live-location">尚未开启定位</b></span><span><small>步行距离</small><b id="walk-distance">—</b></span><span><small>预计用时</small><b id="walk-duration">—</b></span></div><p id="walking-status" role="status"></p><div id="building-choices" aria-live="polite"></div><div class="guidance-actions"><button class="primary" id="start-live-location">开启定位并规划</button><button id="retry-walking">重新规划</button><button id="fit-walking">查看全程</button><button id="correct-building">校正教学楼</button><button id="external-navigation">其他地图</button></div><p class="guidance-note">定位点与教学楼坐标会发送至腾讯步行服务。未设置校园范围时直接使用腾讯步行路线，可能经过校外道路；设置范围后检查边界与禁行区。实际通行情况请现场确认。</p>`;
$('.map-panel').after(guidance);
function currentCoordinate(c=visible[selected]) {
  if(!c||!school)return null;
  const stored=bindings[bindingKey(c)];if(validCoordinate(stored))return stored;
  // Reuse an already confirmed location for another room in the same building.
  const sameBuilding=Object.entries(bindings).find(([key,coord])=>{try{const p=JSON.parse(key);return p[0]===school.name&&p[1]===school.campus&&p[2]===c.building&&validCoordinate(coord)}catch{return false}});
  return sameBuilding?.[1]||buildingMatch;
}
function clearWalkingRoute(){routeRequest?.abort();routeRequest=null;if(routeLine){routeLine.remove();routeLine=null}routeResult=null;lastRouteStart=null;$('#walk-distance').textContent='—';$('#walk-duration').textContent='—'}
function clearDevicePosition(){position=null;locationTime=0;if(userPin){userPin.remove();userPin=null}if(accuracyRing){accuracyRing.remove();accuracyRing=null}}
function updateGuidance() {
  guidance.hidden=!school;
  $('#live-location').textContent=locationState;
  $('#walking-status').textContent=locationFailure||buildingState||routeState;
  $('#follow-next').classList.toggle('active',followNext);
  $('#start-live-location').textContent=watch!==null?'停止实时定位':'开启定位并规划';
  $('#locate').title=watch!==null?'停止实时定位':'开启实时定位并规划';
  if(school){$('.destination p').textContent=routeResult?`${Math.round(routeResult.distance)} 米 · 步行约 ${Math.max(1,Math.ceil(routeResult.duration/60))} 分钟`:locationFailure||buildingState||routeState}
}
function revealGeographicMap(){geoMap?.invalidateSize()}
function markDestination(c,coord) {
  if(roomPin){roomPin.remove();roomPin=null}
  if(!geoMap||!coord)return;
  roomPin=CampusMapAPI.marker(coord,{icon:CampusMapAPI.divIcon({className:'classroom-location',html:'<span>▥</span>',iconSize:[36,36],iconAnchor:[18,36]})}).addTo(geoMap);
  const label=document.createElement('span');label.textContent=c.building+' · '+(c.room||'教学楼');roomPin.bindTooltip(label,{permanent:true,direction:'top',offset:[0,-33],className:'classroom-label'});
}
function drawLivePosition(){
  if(!geoMap||!position)return;const point=[position.latitude,position.longitude];
  if(!userPin)userPin=CampusMapAPI.circleMarker(point,{radius:8,color:'#fff',weight:3,fillColor:'#357fca',fillOpacity:1}).addTo(geoMap).bindTooltip('我的实时位置');else userPin.setLatLng(point);
  if(accuracyRing)accuracyRing.remove();accuracyRing=CampusMapAPI.circle(point,{radius:Math.min(position.accuracy,1000),weight:1,color:'#357fca',fillOpacity:.07}).addTo(geoMap);
}
function normalizeBuildingName(value){
  const digits={'零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
  return String(value||'').normalize('NFKC').toLowerCase().replace(/[零一二两三四五六七八九十]+/g,n=>{if(!n.includes('十'))return [...n].map(x=>digits[x]).join('');const [a,b]=n.split('十');return String((a?digits[a]:1)*10+(b?digits[b]:0))}).replace(/第(?=\d)/g,'').replace(/号(?=教学楼|楼)/g,'').replace(/[\s·｜（）()\-]/g,'');
}
function buildingTitleMatches(title,target){return [target,target.replace(/教学楼$/,'教')].some(t=>title===t||(title.endsWith(t)&&!(/\d/.test(t[0])&&/\d/.test(title[title.length-t.length-1]||''))))}
function centerCourseDestination(){const coord=currentCoordinate();if(coord){revealGeographicMap();geoMap?.panTo(coord)}}
function buildingChoices(list,c,key){
  const panel=$('#building-choices');if(!panel)return;
  panel.innerHTML=list.map((p,i)=>`<button type="button" class="school-result" data-building-choice="${i}"><b>${esc(p.name||p.display_name)}</b><br><small>${esc(p.display_name)} · 选择此教学楼</small></button>`).join('');
  document.querySelectorAll('[data-building-choice]').forEach(button=>button.onclick=()=>{if(key!==activeCourseKey)return;applyBuildingMatch(list[+button.dataset.buildingChoice],c,key)});
}
function applyBuildingMatch(p,c,key){
  if(key!==activeCourseKey)return;
  buildingMatch=[+p.lat,+(p.lon??p.lng)];buildingCache.set(JSON.stringify([school.name,school.campus,c.building]),buildingMatch);buildingState='';
  buildingChoices([],c,key);markDestination(c,buildingMatch);centerCourseDestination();routeState='已按地图名称匹配教学楼 · 开启定位后规划步行路线';updateGuidance();planWalking();
}
async function findCourseBuilding(c) {
  if(!school||!c||currentCoordinate(c))return;
  const key=activeCourseKey,cacheKey=JSON.stringify([school.name,school.campus,c.building]);
  if(buildingRequest?.key===key)return;
  if(buildingCache.has(cacheKey)){buildingMatch=buildingCache.get(cacheKey);markDestination(c,buildingMatch);centerCourseDestination();updateGuidance();planWalking();return}
  buildingState='正在按地图名称检索 '+c.building+'…';updateGuidance();
  const request={key};buildingRequest=request;
  try {
    let matches=[];const queries=[c.building,normalizeBuildingName(c.building)].filter((x,i,a)=>x&&a.indexOf(x)===i);
    for(const query of queries){
      const data=await searchSchoolLocations(school.name+' '+school.campus,query);
      if(buildingRequest!==request||key!==activeCourseKey)return;
      if(data.error)throw Error(data.error);
      const target=normalizeBuildingName(c.building);
      matches=(data.results||[]).filter(p=>{
        const point=[+p.lat,+(p.lon??p.lng)],title=normalizeBuildingName(p.name||p.display_name);
        return target&&validCoordinate(point)&&distanceMeters([school.lat,school.lng],point)<4000&&buildingTitleMatches(title,target);
      });
      matches=matches.filter((p,i,list)=>list.findIndex(q=>distanceMeters([+p.lat,+(p.lon??p.lng)],[+q.lat,+(q.lon??q.lng)])<20)===i);
      if(matches.length)break;
    }
    if(matches.length===1)applyBuildingMatch(matches[0],c,key);
    else {buildingState=matches.length?'有多个同名教学楼，请选择下方地图检索结果':'地图暂未收录该教学楼名称，请核对课程中的楼名后点击重新检索';buildingChoices(matches,c,key)}
  }catch(error){if(key===activeCourseKey)buildingState='教学楼检索失败：'+(error.message||'网络未连接')+'；请点击重新检索'}
  if(buildingRequest===request)buildingRequest=null;
  if(key===activeCourseKey)updateGuidance();
}
async function planWalking(force=false) {
  const c=visible[selected],destination=currentCoordinate(c);
  if(!school||!geoMap){updateGuidance();return}
  if(!destination){routeState='正在确定教学楼位置；可点击「重新检索教学楼」按名称查找';updateGuidance();return}
  const coordinateKey=JSON.stringify(destination);
  if(coordinateKey!==activeDestinationCoordinate){activeDestinationCoordinate=coordinateKey;clearWalkingRoute();lastRouteTime=0;fitOnRoute=true}
  if(!position||watch===null){routeState='教学楼已标记 · 点击「开启定位并规划」显示我的位置和路线';updateGuidance();return}
  if(Date.now()-locationTime>60000){clearWalkingRoute();routeState='定位已过期，等待新的设备位置';updateGuidance();return}
  if(position.accuracy>200){clearWalkingRoute();routeState='定位精度超过 200 米，等待更准确的位置后再规划';updateGuidance();return}
  const start=[position.latitude,position.longitude];
  if(!force&&lastRouteStart&&distanceMeters(start,lastRouteStart)<25&&Date.now()-lastRouteTime<45000)return;
  if(!force&&Date.now()-lastRouteTime<12000)return;
  buildingState='';
  routeRequest?.abort();const request=new AbortController();routeRequest=request;const key=activeCourseKey;
  if(routeLine){routeLine.remove();routeLine=null}routeResult=null;$('#walk-distance').textContent='—';$('#walk-duration').textContent='—';
  lastRouteStart=start;lastRouteTime=Date.now();routeState='正在请求腾讯步行路线…';updateGuidance();
  try {
    const result=await fetchWalkingRoute(start,destination,{signal:request.signal});
    if(routeRequest!==request||key!==activeCourseKey||watch===null)return;
    routeResult=result;routeLine=CampusMapAPI.polyline(result.points,{color:'#36876d',weight:6,opacity:.9}).addTo(geoMap);
    $('#walk-distance').textContent=result.distance>=1000?(result.distance/1000).toFixed(1)+' 公里':Math.round(result.distance)+' 米';
    const duration=Math.max(1,Math.ceil(result.duration/60));$('#walk-duration').textContent=duration+' 分钟';
    const arrival=new Date(Date.now()+result.duration*1000);routeState=`预计 ${arrival.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})} 到达教学楼 · 路线来源：${result.source}。${result.safetyMessage||'实际通行情况请现场确认'}`;
    if(fitOnRoute){centerCourseDestination();fitOnRoute=false}
  }catch(error){if(routeRequest===request&&key===activeCourseKey&&!request.signal.aborted)routeState=error.name==='AbortError'?'路线连接超时，请点击重新规划':error.message+'，可点击重新规划';}
  if(routeRequest===request){routeRequest=null;updateGuidance()}
}
function fitWalking(){revealGeographicMap();if(!geoMap)return;if(routeLine)geoMap.fitBounds(routeLine.getBounds(),{padding:[65,100],maxZoom:18});else{const points=[currentCoordinate(),position&&[position.latitude,position.longitude]].filter(Boolean);if(points.length)geoMap.fitBounds(CampusMapAPI.latLngBounds(points),{padding:[70,100],maxZoom:17})}}
const previousMapUpdate=updateMap;
updateMap=function(){
  if(!school){clearWalkingRoute();guidance.hidden=true;previousMapUpdate();return}
  const c=visible[selected],key=c?bindingKey(c):'';
  if(key!==activeCourseKey){activeCourseKey=key;buildingMatch=null;buildingState='';buildingRequest=null;buildingChoices([],c,key);clearWalkingRoute();lastRouteTime=0;fitOnRoute=true;routeState='开启定位后，显示步行路线和预计时间'}
  $('#building-marker').hidden=true;$('#route').style.display='none';
  $('#destination-name').textContent=c?c.building+' · '+c.room:'没有待上课程';
  const coord=currentCoordinate(c);markDestination(c,coord);drawLivePosition();updateGuidance();
  if(c&&!coord)findCourseBuilding(c);else if(coord){buildingState='';centerCourseDestination();planWalking();updateGuidance()}
};
async function toggleLiveLocation(){
  if(watch!==null){locationTracker?.stop();watch=null;locationFailure='';clearWalkingRoute();clearDevicePosition();locationState='实时定位已停止';routeState='定位已停止，路线已清除';$('#location-status').textContent=locationState;updateGuidance();return}
  if(!school){schoolSettings();return}
  const deviceGeo=(typeof window!=='undefined'&&window.nativeCampusGeolocation)||navigator.geolocation;
  if(!deviceGeo){toast('当前浏览器不支持设备定位');return}
  if(typeof isSecureContext!=='undefined'&&!isSecureContext){showLocationHelp('当前网页不是安全环境，请使用 HTTPS 正式网址或 localhost');return}
  revealGeographicMap();centerCourseDestination();if(visible[selected]&&!currentCoordinate())findCourseBuilding(visible[selected]);locationFailure='';locationState='正在等待定位授权…';updateGuidance();
  watch=-1;
  locationTracker=startDeviceLocation(deviceGeo,{onPosition:p=>{
    locationFailure='';
    position={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy};locationTime=p.timestamp||Date.now();
    locationState='定位精度约 '+Math.round(position.accuracy)+' 米'+(Date.now()-locationTime>10000?'（最近位置）':'');$('#location-status').textContent='我的位置 · '+locationState;
    drawLivePosition();centerCourseDestination();updateGuidance();planWalking();
  },onStatus:(state,message)=>{
    locationState=position?'精度约 '+Math.round(position.accuracy)+' 米 · 更新中':message;
    $('#location-status').textContent=locationState;updateGuidance();
  },onError:error=>{
    watch=null;clearWalkingRoute();clearDevicePosition();
    locationState=error.code===1?'浏览器或系统未允许定位':error.code===3?'设备定位超时（已自动重试）':'设备定位服务暂不可用';
    routeState=error.code===1?'请允许此网站定位，并开启系统的位置服务，再点击「开启定位并规划」':error.code===3?'精确定位与网络定位均未及时返回。请检查系统位置服务、网络连接，或在手机上重试；点击「定位帮助」查看步骤':'请检查系统位置服务及网络连接，点击「定位帮助」查看步骤';
    locationFailure=routeState;
    $('#location-status').textContent=locationState;updateGuidance();
  }});
  if(watch!==null)watch=locationTracker.id;
  updateGuidance();
}
function showLocationHelp(message=''){
  modal('为什么定位超时？',`<p>${esc(message||locationState)}</p><p>超时表示设备在等待时间内没有返回位置，并不等同于拒绝授权。网页需要浏览器和系统的位置服务共同提供位置，室内信号或网络定位服务不可用时可能超时。</p><ol><li>点击浏览器地址栏的网站权限图标，确认「位置」允许。</li><li>在电脑或手机的系统设置中开启「定位 / 位置服务」，并允许浏览器使用。</li><li>保持网络连接；手机可尝试靠近窗边或在室外重新定位。</li><li>点击「开启定位并规划」重试，也可以用手机打开正式网址。</li></ol><p class="muted">页面会先尝试快速网络定位，再等待精确定位，必要时自动重试一次。粗定位精度不足时只显示位置范围，不生成误导路线。</p><a href="https://cd-png.github.io/campus-compass/" target="_blank" rel="noopener noreferrer">在正式 HTTPS 网址打开 ↗</a>`);
}
const locationHelpButton=document.createElement('button');locationHelpButton.id='location-help';locationHelpButton.textContent='定位帮助';locationHelpButton.onclick=()=>showLocationHelp();$('.guidance-actions').appendChild(locationHelpButton);
$('#start-live-location').onclick=toggleLiveLocation;$('#locate').onclick=toggleLiveLocation;
$('#retry-walking').onclick=()=>{const c=visible[selected];if(!currentCoordinate(c)&&c){buildingCache.delete(JSON.stringify([school.name,school.campus,c.building]));findCourseBuilding(c)}else planWalking(true)};
$('#fit-walking').onclick=fitWalking;
$('#correct-building').textContent='重新检索教学楼';$('#correct-building').onclick=()=>{const c=visible[selected];if(!c)return toast('请先选择一节课程');buildingCache.delete(JSON.stringify([school.name,school.campus,c.building]));buildingMatch=null;findCourseBuilding(c);centerCourseDestination()};
$('#external-navigation').onclick=externalNavigation;
$('#navigate').textContent='本页规划路线';$('#navigate').onclick=()=>{if(!school)return schoolSettings();revealGeographicMap();if(watch===null)toggleLiveLocation();else planWalking(true);guidance.scrollIntoView({behavior:'smooth',block:'center'})};
function followUpcoming(){const next=nextWeeklyCourse(courses);if(!next)return;day=next.course.day;const list=courses.filter(c=>c.day===day).sort((a,b)=>minutes(a.start)-minutes(b.start));selected=list.indexOf(next.course);render();updateMap();$('#follow-next').textContent=next.ongoing?'正在上课':next.offset===0?'下节课 · 今天':`下节课 · ${next.offset}天后`}
$('#follow-next').onclick=()=>{followNext=true;followUpcoming()};
document.addEventListener('click',e=>{if(e.target.closest('[data-course],[data-day]')){followNext=false;$('#follow-next').textContent='跟随下节课';render();updateMap()}});
const basicCourseRender=render;
render=function(){
  basicCourseRender();
  $('.schedule-title h2').firstChild.textContent='课程表 ';
  if(!followNext)return;
  const upcoming=nextWeeklyCourse(courses);if(!upcoming||upcoming.course.day!==day)return;
  if(upcoming.offset>0){
    const date=new Date();date.setDate(date.getDate()+upcoming.offset);
    $('#date-label').textContent=`${date.getMonth()+1}月${date.getDate()}日 · 星期${'一二三四五六日'[day-1]}`;
    $('#countdown').textContent=`${upcoming.offset}天后 ${upcoming.course.start} 开始`;
    const displayedMonday=new Date(date);displayedMonday.setDate(date.getDate()-(date.getDay()||7)+1);
    document.querySelectorAll('[data-day] b').forEach((e,i)=>{const d=new Date(displayedMonday);d.setDate(d.getDate()+i);e.textContent=d.getDate()});
    document.querySelectorAll('[data-course] em').forEach(e=>e.textContent='待上课');
  }
};
$('#privacy').onclick=()=>modal('隐私说明','<p>课程、学校和教室坐标保存在当前浏览器。点击「开启定位并规划」后，浏览器请求位置授权；停止定位会清除位置标记和路线。</p><p>本页使用在线底图与设备定位，不读取手机地图 App 的内部数据。规划路线时，起点位置和教学楼坐标会发送至腾讯步行服务。位置未授权时不请求路线。</p><p>地图、教学楼检索与 OCR 模型需要网络。选择「其他地图」后才会打开外部地图服务。</p>');
$('#help').onclick=()=>modal('本页步行导航使用方法','<p>① 设置你的学校并导入课表。页面自动跟随当前或下一节课，也可以手动选择课程。<br>② 自动检索教学楼并显示标记；出现同名结果时直接选择楼名；未收录时核对课表楼名后重新检索。<br>③ 点击「开启定位并规划」并允许浏览器定位。蓝点是实时位置，浅蓝圈表示定位精度，绿色线是步行路线。<br>④ 地图下方显示距离、预计时间和到达时间。移动后自动更新，点击「查看全程」可查看起终点。</p><p>路线需要联网；时间不含上楼、等候或临时封路。定位过期或精度不足时会暂停路线。无需跳转外部地图。</p>');
// Location, destination and walking geometry share the geographic main map.
showRealMap=async function(){await geographicShowRealMap();revealGeographicMap();drawLivePosition();updateMap()};
revealGeographicMap();followUpcoming();updateGuidance();
setInterval(()=>{if(followNext)followUpcoming();if(position&&watch!==null&&Date.now()-locationTime>60000){clearWalkingRoute();locationState='位置已过期，等待更新';routeState='定位过期期间不显示路线和预计时间';updateGuidance()}},30000);
