const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const core=require('./walking-route');
const {startDeviceLocation}=require('./device-location');
const elements=new Map();
function element(){return {textContent:'',hidden:false,style:{},firstChild:{textContent:''},classList:{toggle(){},remove(){}},after(){},appendChild(){},scrollIntoView(){},innerHTML:''}}
function $(key){if(!elements.has(key))elements.set(key,element());return elements.get(key)}
let success,cleared=false,lines=0,centered=null;
const c={day:5,start:'08:00',end:'09:35',building:'教学楼',room:'A101'};
const pin=()=>({addTo(){return this},bindTooltip(){return this},setLatLng(){return this},remove(){},getBounds(){return {}}});
const context={...core,startDeviceLocation,console,Date,AbortController,setInterval(){},setTimeout,clearTimeout,
  $,courses:[c],visible:[c],selected:0,day:5,school:{name:'测试大学',campus:'测试校区',lat:30.833,lng:121.514},bindings:{room:[30.834,121.515]},bindingKey:()=> 'room',
  geoMap:{panTo(point){centered=point;},invalidateSize(){},fitBounds(){}},roomPin:null,userPin:null,position:null,watch:null,
  document:{createElement:element,querySelectorAll:()=>[],addEventListener(){}},navigator:{geolocation:{watchPosition(fn){success=fn;return 1},clearWatch(){cleared=true}}},
  CampusMapAPI:{marker:pin,divIcon:x=>x,circleMarker:pin,circle:pin,polyline(){lines++;return pin()},latLngBounds:x=>x},
  minutes:s=>Number(s.slice(0,2))*60+Number(s.slice(3)),render(){},updateMap(){},schoolSettings(){},geographicShowRealMap:async()=>{},toast(){},modal(){},
  fetchWalkingRoute:async()=>({distance:122.5,duration:98.1,points:[[30.833,121.514],[30.834,121.515]],source:'测试步行服务'})};
vm.createContext(context);vm.runInContext(fs.readFileSync('live-navigation.js','utf8'),context);
(async()=>{
  assert.equal(context.normalizeBuildingName('第二教学楼'),'2教学楼');
  assert.equal(context.normalizeBuildingName('１２号教学楼'),'12教学楼');
  assert.equal(context.buildingTitleMatches('测试大学11教学楼','1教学楼'),false);
  assert.equal(context.buildingTitleMatches('测试大学1教学楼','1教学楼'),true);
  assert.equal(context.watch,null);assert.equal(lines,0);
  await $('#start-live-location').onclick();
  assert.equal(context.watch,1);assert.equal(lines,0);
  success({coords:{latitude:30.833,longitude:121.514,accuracy:10},timestamp:Date.now()});
  await new Promise(setImmediate);
  assert.deepEqual(centered,[30.834,121.515]);
  assert.equal(lines,1);assert.equal($('#walk-distance').textContent,'123 米');assert.equal($('#walk-duration').textContent,'2 分钟');
  await $('#start-live-location').onclick();
  assert.equal(context.watch,null);assert.equal(context.position,null);assert.equal(context.userPin,null);assert.equal($('#walk-distance').textContent,'—');assert.equal(cleared,true);
  context.bindings={};c.building='第二教学楼';
  context.searchSchoolLocations=async()=>({results:[{name:'测试大学2号教学楼',lat:30.834,lon:121.515}]});
  context.updateMap();await new Promise(setImmediate);
  assert.deepEqual(Array.from(context.currentCoordinate(c)),[30.834,121.515]);
  assert.deepEqual(Array.from(centered),[30.834,121.515]);
  console.log('Navigation lifecycle: permission gate, route rendering and stop cleanup passed');
})().catch(e=>{console.error(e);process.exitCode=1});
