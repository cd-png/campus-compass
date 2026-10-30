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
function initializeCampusTiles(map) {
  if(mainCampusTiles)mainCampusTiles.destroy();
  let panel=document.querySelector('#map-network');
  if(!panel) {panel=document.createElement('div');panel.id='map-network';panel.className='map-network';panel.innerHTML='<span role="status"></span><button type="button">切换底图</button>';document.querySelector('#map').appendChild(panel)}
  mainCampusTiles=attachCampusTiles(map,(state,message)=>{panel.dataset.state=state;panel.querySelector('span').textContent=message;panel.querySelector('button').textContent=state==='error'?'重新加载':'切换底图'});
  panel.querySelector('button').onclick=()=>panel.dataset.state==='error'?mainCampusTiles.retry():mainCampusTiles.switch();
}
