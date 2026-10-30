/* All coordinates in this application and these walking APIs use WGS84. */
function validCoordinate(p) {return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180}
function distanceMeters(a,b){const r=Math.PI/180,dlat=(b[0]-a[0])*r,dlng=(b[1]-a[1])*r;const h=Math.sin(dlat/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dlng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)))}
function nextWeeklyCourse(list,now=new Date()) {
  const weekday=now.getDay()||7, minute=now.getHours()*60+now.getMinutes();
  return list.map(c=>{let offset=(c.day-weekday+7)%7;const start=Number(c.start.slice(0,2))*60+Number(c.start.slice(3));const end=Number(c.end.slice(0,2))*60+Number(c.end.slice(3));if(!offset&&end<=minute)offset=7;return {course:c,offset,wait:offset*1440+Math.max(0,start-minute),ongoing:offset===0&&start<=minute&&end>minute}}).sort((a,b)=>a.wait-b.wait)[0]||null;
}
function parseWalkingResponse(data,start,end){
  const route=data.routes?.[0],points=route?.geometry?.coordinates?.map(p=>[p[1],p[0]]);
  if(data.code!=='Ok'||!points||points.length<2||!points.every(validCoordinate)||!Number.isFinite(route.distance)||route.distance<0||!Number.isFinite(route.duration)||route.duration<0)throw Error('步行服务未返回有效路线');
  if(distanceMeters(points[0],start)>150||distanceMeters(points[points.length-1],end)>150)throw Error('附近缺少可通行步道，无法生成到教学楼的可靠路线');
  return {points,distance:route.distance,duration:route.duration,source:'FOSSGIS / OpenStreetMap 步行服务'};
}
async function fetchWalkingRoute(start,end,{signal,fetchImpl=fetch}={}) {
  if(!validCoordinate(start)||!validCoordinate(end))throw Error('定位或教室坐标无效');
  if(distanceMeters(start,end)>10000)throw Error('距离教学楼超过 10 公里，请到校园附近再规划步行路线');
  const controller=new AbortController(),abort=()=>controller.abort();
  if(signal?.aborted)throw Error('路线请求已取消');
  signal?.addEventListener('abort',abort,{once:true});const timeout=setTimeout(abort,12000);
  try {
    const url='https://routing.openstreetmap.de/routed-foot/route/v1/foot/'+[start,end].map(p=>p[1]+','+p[0]).join(';')+'?overview=full&geometries=geojson&steps=false';
    try {
      const response=await fetchImpl(url,{signal:controller.signal});if(!response.ok)throw Error('步行路线服务暂时不可用');
      return parseWalkingResponse(await response.json(),start,end);
    }catch(error){
      if(controller.signal.aborted)throw error;
      const query={locations:[{lat:start[0],lon:start[1]},{lat:end[0],lon:end[1]}],costing:'pedestrian',units:'kilometers'};
      const response=await fetchImpl('https://valhalla1.openstreetmap.de/route?json='+encodeURIComponent(JSON.stringify(query)),{signal:controller.signal});
      if(!response.ok)throw Error('步行路线服务暂时不可用');
      const data=await response.json(),trip=data.trip;
      if(!trip||trip.status!==0||!trip.legs?.length)throw Error('未找到可通行的步行路线');
      const points=trip.legs.flatMap(leg=>decodeRouteShape(leg.shape));
      return parseWalkingResponse({code:'Ok',routes:[{distance:trip.summary.length*1000,duration:trip.summary.time,geometry:{coordinates:points.map(p=>[p[1],p[0]])}}]},start,end);
    }
  } finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort)}
}
function decodeRouteShape(shape){
  if(typeof shape!=='string')throw Error('路线数据不完整');
  let index=0,lat=0,lon=0;const points=[];
  function number(){let result=0,shift=0,b;do{if(index>=shape.length||shift>30)throw Error('路线编码无效');b=shape.charCodeAt(index++)-63;result|=(b&31)<<shift;shift+=5}while(b>=32);return result&1?~(result>>1):result>>1}
  while(index<shape.length){lat+=number();lon+=number();points.push([lat/1e6,lon/1e6])}return points;
}
if(typeof module!=='undefined')module.exports={validCoordinate,distanceMeters,nextWeeklyCourse,parseWalkingResponse,fetchWalkingRoute,decodeRouteShape};
