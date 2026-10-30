// Image-space annotation received from the user. It is not a georeferenced polygon.
const CampusAnnotations=(()=>{
 const outline=[[635,782],[678,756],[735,729],[749,740],[821,701],[879,672],[904,650],[935,636],[975,615],[995,647],[1017,682],[1040,724],[1067,771],[1092,822],[1119,873],[1150,929],[1140,945],[1089,974],[987,1015],[917,1048],[817,1095],[694,1151],[681,1151],[636,1090],[574,1019],[694,951],[672,881]];
 const annotation={id:'shnu-fengxian-user-20261030',school:'上海师范大学',campus:'奉贤校区',status:'image-draft',confirmed:false,coordinateSystem:'normalized-image',source:'用户上传的红色闭合边界截图',meaning:'红线内为允许通行范围，线外不得用于校内路线',image:'shnu-fengxian-boundary-draft.png',points:outline.map(([x,y])=>[x/1465,(y-455)/857]),geographicBoundary:null};
 function forSchool(s){return s&&s.name==='上海师范大学'&&/奉贤/.test(s.campus||'')?annotation:null}
 return{forSchool,annotation};
})();
if(typeof module!=='undefined')module.exports=CampusAnnotations;
