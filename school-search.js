// Compatible with both a Node deployment and static GitHub Pages hosting.
async function searchSchoolLocations(name,campus){
 const query=encodeURIComponent(name+' '+campus);
 const providers=location.hostname.endsWith('.github.io')?[]:[{url:'./api/schools?name='+encodeURIComponent(name)+'&campus='+encodeURIComponent(campus),parse:d=>d}];
 providers.push({url:'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q='+query,parse:d=>({results:d})},{url:'https://photon.komoot.io/api/?limit=5&q='+query,parse:d=>({results:(d.features||[]).map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],display_name:[f.properties.name,f.properties.city,f.properties.street].filter(Boolean).join(' · ')}))})});
 let connected=false;
 for(const provider of providers){try{const response=await fetch(provider.url,{signal:AbortSignal.timeout(4000)});if(!response.ok)continue;const payload=provider.parse(await response.json());if(!Array.isArray(payload.results))continue;connected=true;const results=payload.results.filter(p=>Number.isFinite(+p.lat)&&Number.isFinite(+p.lon));if(results.length)return{results};}catch{}}
 return{results:[],error:connected?'没有找到匹配学校，请使用学校全称。':'在线检索服务暂时无法连接。上海师范大学徐汇、奉贤校区仍可直接离线选择。'};
}
