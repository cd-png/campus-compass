/* Internal coordinates stay WGS84; AMap renders and routes in GCJ-02. */
const AMapCoordinates=(()=>{
 const pi=Math.PI,a=6378245,ee=.006693421622965943;
 function outside([lat,lng]){return lng<72.004||lng>137.8347||lat<.8293||lat>55.8271}
 function forward(p){if(outside(p))return [...p];const [lat,lng]=p,x=lng-105,y=lat-35;
 let dy=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x));dy+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;dy+=(20*Math.sin(y*pi)+40*Math.sin(y/3*pi))*2/3;dy+=(160*Math.sin(y/12*pi)+320*Math.sin(y*pi/30))*2/3;
 let dx=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));dx+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;dx+=(20*Math.sin(x*pi)+40*Math.sin(x/3*pi))*2/3;dx+=(150*Math.sin(x/12*pi)+300*Math.sin(x/30*pi))*2/3;
 const rad=lat/180*pi,magic=1-ee*Math.sin(rad)**2,root=Math.sqrt(magic);return [lat+dy*180/(a*(1-ee)/(magic*root)*pi),lng+dx*180/(a/root*Math.cos(rad)*pi)]}
 function inverse(p){let q=[...p];for(let i=0;i<6;i++){const f=forward(q);q=[q[0]+p[0]-f[0],q[1]+p[1]-f[1]]}return q}
 return{forward,inverse};
})();
if(typeof module!=='undefined')module.exports=AMapCoordinates;
