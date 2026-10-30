// Tile providers fail over automatically; attribution stays visible on every map.
function attachCampusTiles(map, onStatus) {
  const providers=[
    {name:'卫星底图',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',attribution:'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'},
    {name:'标准底图',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; OpenStreetMap contributors'}
  ];
  let layer, timer, attempt=0, loaded=false, disposed=false, errors=0;
  function start(index) {
    clearTimeout(timer); if(layer)map.removeLayer(layer);
    attempt=index;loaded=false;errors=0;
    const provider=providers[index];
    onStatus('loading',`正在加载${provider.name}…`);
    layer=L.tileLayer(provider.url,{maxZoom:19,attribution:provider.attribution,subdomains:provider.subdomains || 'abc'});
    function fail() {
      if(disposed || loaded)return;
      clearTimeout(timer);
      if(attempt+1<providers.length)start(attempt+1);
      else onStatus('error','底图连接失败，请重试或切换底图。学校位置已保留。');
    }
    layer.on('tileload',()=>{if(disposed)return;loaded=true;clearTimeout(timer);onStatus('ready',provider.name+' · 可拖动、缩放查看校园')});
    layer.on('tileerror',()=>{if(++errors>=3)fail()});
    layer.addTo(map);timer=setTimeout(fail,6500);
  }
  start(0);
  return {retry(){start(0)},switch(){start((attempt+1)%providers.length)},destroy(){disposed=true;clearTimeout(timer);if(layer)map.removeLayer(layer)}};
}
let mainCampusTiles;
const SHNU_PLAN={image:'shnu-fengxian-plan.jpg',source:'https://lwh.shnu.edu.cn/a4/95/c17257a435349/page.htm',date:'2025-04-04'};
function hasCampusPlan(value){return value?.name==='上海师范大学' && value?.campus==='奉贤校区'}
function campusPlanHTML(){return `<div class="plan-note">上海师范大学奉贤校区 · 官方平面图（2025）<br><small>可放大查看建筑，平面图不显示 GPS 位置或步行路线。</small></div><div class="plan-toolbar"><button type="button" data-plan-zoom="-1" aria-label="缩小校园平面图">－</button><button type="button" data-plan-zoom="1" aria-label="放大校园平面图">＋</button><a href="${SHNU_PLAN.source}" target="_blank" rel="noopener noreferrer">学校官网原图 ↗</a></div><div class="plan-scroll"><img src="${SHNU_PLAN.image}" alt="上海师范大学奉贤校区官方校园平面图" draggable="false"></div>`}
function wireCampusPlan(container){let scale=1;container.querySelectorAll('[data-plan-zoom]').forEach(b=>b.onclick=()=>{scale=Math.max(1,Math.min(4,scale+Number(b.dataset.planZoom)*.5));const img=container.querySelector('img');img.style.width=scale*100+'%';img.style.maxWidth='none'})}
function showMainCampusPlan(){
  let plan=document.querySelector('#local-campus-plan');
  if(!plan){plan=document.createElement('div');plan.id='local-campus-plan';document.querySelector('#map').appendChild(plan)}
  plan.hidden=!hasCampusPlan(school);if(plan.hidden)return;
  plan.innerHTML=campusPlanHTML()+'<button id="switch-to-geographic" class="primary">切换实时地理地图，定位与绑定教室 ↗</button>';
  wireCampusPlan(plan);document.querySelector('#switch-to-geographic').onclick=()=>{plan.hidden=true;geoMap?.invalidateSize()};
}
function initializeCampusTiles(map) {
  if(mainCampusTiles)mainCampusTiles.destroy();
  let panel=document.querySelector('#map-network');
  if(!panel) {panel=document.createElement('div');panel.id='map-network';panel.className='map-network';panel.innerHTML='<span role="status"></span><button type="button">切换底图</button>';document.querySelector('#map').appendChild(panel)}
  mainCampusTiles=attachCampusTiles(map,(state,message)=>{panel.dataset.state=state;panel.querySelector('span').textContent=message;panel.querySelector('button').textContent=state==='error'?'重新加载':'切换底图'});
  panel.querySelector('button').onclick=()=>panel.dataset.state==='error'?mainCampusTiles.retry():mainCampusTiles.switch();
}
