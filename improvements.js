// Course management uses the same validation for imports and manual edits.
function persistCourses(list) {
  localStorage.setItem('ke-jian-courses', JSON.stringify(list));
  courses=list; custom=true; selected=0; reminded.clear(); render(); updateMap();
}
function courseTable(list) {
  return `<div class="course-preview">${list.map(c=>`<div class="saved-row"><div><b>${esc(c.name)}</b><br>周${'一二三四五六日'[c.day-1]} ${esc(c.start)}–${esc(c.end)}<br>${esc(c.building)} · ${esc(c.room || '教室待补充')}</div></div>`).join('')}</div>`;
}
const basicImportModal=importModal;
importModal=function() {
  basicImportModal();
  const save=$('#save-import'); save.textContent='预览并检查课程';
  const feedback=document.createElement('div'); feedback.id='import-feedback'; feedback.setAttribute('aria-live','polite'); save.before(feedback);
  save.onclick=()=>{
    const parsed=parseCourseText($('#import-text').value);
    if(parsed.issues.length) { feedback.innerHTML=`<div class="validation-error">${parsed.issues.map(esc).join('<br>')}</div>`; return; }
    const clashes=courseConflicts(parsed.courses);
    feedback.innerHTML=`<p>识别到 <b>${parsed.courses.length}</b> 节课程，完全重复的行已合并。</p>${clashes.length?`<div class="validation-error">请核对时间冲突：<br>${clashes.map(esc).join('<br>')}</div>`:''}${courseTable(parsed.courses)}<p class="muted">确认后将替换当前课表。学校和已绑定教室位置会保留。</p><button class="primary" id="confirm-import">确认导入 ${parsed.courses.length} 节课程</button>`;
    const source=$('#import-text').value;
    $('#confirm-import').onclick=()=>{
      if($('#import-text').value!==source) { feedback.textContent='内容已修改，请重新点击预览检查。'; return; }
      try { persistCourses(parsed.courses); $('#modal').close(); toast('课表已保存'); } catch { toast('保存失败，浏览器存储空间不足或不可用'); }
    };
  };
};
document.querySelectorAll('.upload').forEach(b=>b.onclick=importModal);
fullSchedule=function() {
  modal('我的完整课表',`<p>${custom?'课程保存在当前浏览器，可导出后在其他设备导入。':'当前为演示课表，添加或编辑后保存为你的课表。'}</p><div class="modal-actions"><button class="primary" id="add-course">＋ 添加课程</button><button id="manage-import">导入课表</button><button id="export-courses">导出备份</button></div>${[...courses].map((c,i)=>`<div class="saved-row"><div><b>${esc(c.name)}</b><br>周${'一二三四五六日'[c.day-1]} ${esc(c.start)}–${esc(c.end)}<br>${esc(c.building)} · ${esc(c.room)}</div><button data-edit-course="${i}" aria-label="编辑 ${esc(c.name)}">编辑 ↗</button></div>`).join('') || '<p>还没有课程，点击添加开始。</p>'}`);
  $('#add-course').onclick=()=>editCourse(); $('#manage-import').onclick=importModal;
  document.querySelectorAll('[data-edit-course]').forEach(b=>b.onclick=()=>editCourse(+b.dataset.editCourse));
  $('#export-courses').onclick=()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(courses,null,2)],{type:'application/json'}));
    const a=document.createElement('a'); a.href=url; a.download='课间课表备份.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); toast('课表备份已导出，可在另一台设备导入');
  };
};
function editCourse(index) {
  const c=courses[index] || {day:day,start:'08:00',end:'09:35',name:'',building:'',room:'',teacher:''};
  modal(index===undefined?'添加课程':'编辑课程',`<form id="course-form"><div class="edit-grid"><label>星期<select id="edit-day">${Array.from({length:7},(_,i)=>`<option value="${i+1}" ${c.day===i+1?'selected':''}>星期${'一二三四五六日'[i]}</option>`).join('')}</select></label>${[['start','开始时间','time'],['end','结束时间','time'],['name','课程名称','text'],['building','教学楼','text'],['room','教室','text'],['teacher','教师','text']].map(([key,label,type])=>`<label>${label}<input id="edit-${key}" type="${type}" value="${esc(c[key])}" ${['room','teacher'].includes(key)?'':'required'} maxlength="120"></label>`).join('')}</div><div id="edit-feedback" aria-live="polite"></div><div class="modal-actions"><button class="primary" type="submit">保存课程</button><button type="button" id="cancel-edit">返回课表</button>${index!==undefined?'<button type="button" id="delete-course">删除课程</button>':''}</div></form>`);
  $('#cancel-edit').onclick=fullSchedule;
  $('#course-form').onsubmit=e=>{e.preventDefault(); const row={day:+$('#edit-day').value}; ['start','end','name','building','room','teacher'].forEach(k=>row[k]=$('#edit-'+k).value); const parsed=parseCourseText(JSON.stringify([row])); if(parsed.issues.length){$('#edit-feedback').textContent=parsed.issues.join(' ');return}const list=courses.slice(); if(index===undefined)list.push(parsed.courses[0]);else list[index]=parsed.courses[0]; try{persistCourses(list);fullSchedule();toast('课程已保存')}catch{toast('保存失败，请检查浏览器存储设置')}};
  if($('#delete-course'))$('#delete-course').onclick=()=>{modal('删除这节课程？',`<p>${esc(c.name)} · 周${'一二三四五六日'[c.day-1]} ${esc(c.start)}</p><p>删除后可重新添加，也可提前导出课表备份。</p><div class="modal-actions"><button id="confirm-delete" class="primary">确认删除</button><button id="cancel-delete">返回</button></div>`);$('#cancel-delete').onclick=()=>editCourse(index);$('#confirm-delete').onclick=()=>{try{persistCourses(courses.filter((_,i)=>i!==index));fullSchedule();toast('已删除课程')}catch{toast('删除未能保存')}}};
}
$('#all-courses').onclick=fullSchedule;
document.querySelector('[data-view="schedule"]').onclick=fullSchedule;
// Keep the user's manual selection, but choose the current/next lesson on launch.
function selectUpcomingCourse() {
  const n=new Date(), current=n.getHours()*60+n.getMinutes();
  const list=courses.filter(c=>c.day===day).sort((a,b)=>minutes(a.start)-minutes(b.start));
  const next=day===(n.getDay()||7)?list.findIndex(c=>minutes(c.end)>current):0;
  selected=next<0?Math.max(0,list.length-1):next; render(); updateMap();
}
selectUpcomingCourse();
$('#help').onclick=()=>modal('如何使用课间','<p>① 点击地图顶部校名，选择学校和校区。<br>② 导入课表后点击预览，检查错误及时间冲突，再确认保存。也可在「我的课表」中手动添加、编辑或删除课程。<br>③ 在真实地图点击教学楼，为所选课程绑定教室位置。<br>④ 点击 ⌖ 获取实时位置，再点击开始导航，选择腾讯、百度或腾讯地图。</p><p>「我的课表 → 导出备份」可下载 JSON 文件，在其他设备导入。图片识别仅提取文字，需核对整理；页面关闭后不发送课程提醒。</p>');

// A preview never changes the saved school until the user chooses to apply it.
let previewMap=null,previewTiles=null;
const originalModal=modal;
modal=function(title,body){
  if(previewTiles){previewTiles.destroy();previewTiles=null}
  if(previewMap){previewMap.remove();previewMap=null}
  originalModal(title,body);
};
$('#modal').addEventListener('close',()=>{if(previewTiles){previewTiles.destroy();previewTiles=null}if(previewMap){previewMap.remove();previewMap=null}});
schoolSettings=function() {
  modal('搜索与预览学校地图',`<p>输入学校名称和校区，先查看地图，再决定是否设为我的学校。</p><form id="school-search-form"><label>学校名称<input id="setting-school" required maxlength="120" placeholder="例如：上海师范大学" value="${esc(school?.name || '')}"></label><label>校区或城市<input id="setting-campus" maxlength="80" placeholder="例如：徐汇校区 / 上海" value="${esc(school?.campus || '')}"></label><button class="primary" id="find-school">搜索并预览地图</button></form><div id="school-results" aria-live="polite"></div><div id="campus-preview-area"></div><p class="muted">上海师范大学可直接选择校区；其他学校需要在线检索。预览为校园周边地图，建筑细节以底图数据为准。</p><details><summary>通过已知坐标预览</summary><label>纬度（WGS84）<input id="school-lat" type="number" min="-90" max="90" step="any"></label><label>经度（WGS84）<input id="school-lng" type="number" min="-180" max="180" step="any"></label><button id="preview-coordinate">预览此位置</button></details><button id="use-demo">返回青禾大学演示校园</button>`);
  const results=$('#school-results'),area=$('#campus-preview-area');
  function displayResults(list) {
    results.innerHTML=list.map((p,i)=>`<div class="school-choice"><button type="button" class="school-result" data-preview-school="${i}"><b>${esc(p.display_name)}</b><br><small>${esc(p.source || '在线地图检索')} · 预览地图</small></button><button type="button" class="primary" data-apply-school="${i}">选择此校区</button></div>`).join('');
    results.querySelectorAll('[data-apply-school]').forEach(b=>b.onclick=()=>{
      const p=list[+b.dataset.applySchool];
      $('#setting-school').value=p.name || $('#setting-school').value.trim();
      $('#setting-campus').value=p.campus || $('#setting-campus').value.trim();
      saveSchool(p.lat,p.lon ?? p.lng);
    });
    results.querySelectorAll('[data-preview-school]').forEach(b=>b.onclick=()=>{
      const p=list[+b.dataset.previewSchool];
      preview(p,p.name || $('#setting-school').value.trim(),p.campus || $('#setting-campus').value.trim());
    });
  }
  async function preview(p,name,campus) {
    if(previewTiles){previewTiles.destroy();previewTiles=null}if(previewMap){previewMap.remove();previewMap=null}
    area.innerHTML=`<div class="preview-heading"><b>${esc(name)} ${esc(campus)}</b><small>${esc(p.source || p.display_name || 'WGS84 地图位置')}</small></div><div class="modal-actions"><button id="preview-retry">重试底图</button><button id="preview-switch">腾讯地图设置</button><button class="primary" id="apply-school">设为我的学校</button></div><div id="school-map-preview" aria-label="学校地图预览"></div><p id="preview-map-status" role="status">正在加载地图组件…</p><p class="muted">校区位置不等于教室位置。设置学校后，可在主地图绑定课程教室。</p>`;
    area.scrollIntoView({block:'start',behavior:'smooth'});
    const container=$('#school-map-preview'),status=$('#preview-map-status');
    $('#apply-school').onclick=()=>{$('#setting-school').value=name;$('#setting-campus').value=campus;saveSchool(p.lat,p.lon ?? p.lng)};
    $('#preview-retry').onclick=()=>previewTiles?previewTiles.retry():preview(p,name,campus);
    $('#preview-switch').onclick=amapSettings;
    try {
      await loadCampusMap();if(!container.isConnected)return;
      previewMap=CampusMapAPI.map(container).setView([+p.lat,+(p.lon ?? p.lng)],16);
      CampusMapAPI.marker([+p.lat,+(p.lon ?? p.lng)]).addTo(previewMap).bindPopup(document.createTextNode(name+' '+campus));
      previewTiles=attachCampusTiles(previewMap,(state,message)=>{status.textContent=message;status.className=state==='error'?'validation-error':''});
      previewMap.invalidateSize();
    }catch(error){if(status.isConnected)status.textContent=error.message}
  }
  displayResults(findLocalSchools('上海师范大学'));
  $('#school-search-form').onsubmit=async e=>{
    e.preventDefault(); const name=$('#setting-school').value.trim(),campus=$('#setting-campus').value.trim();
    if(!name)return;
    const local=findLocalSchools(name,campus);if(local.length){displayResults(local);if(local.length===1)preview(local[0],local[0].name,local[0].campus);return}
    const button=$('#find-school');button.disabled=true;results.textContent='正在搜索学校，自动尝试备用服务…';
    try{
      const payload=await searchSchoolLocations(name,campus);if(!results.isConnected)return;
      if(!payload.results.length){results.textContent=payload.error || '未找到学校，请补充城市或校区。';return}
      displayResults(payload.results);
      if(payload.results.length===1)preview(payload.results[0],name,campus);
    }catch{if(results.isConnected)results.textContent='搜索暂时无法连接，请稍后重试。'}finally{button.disabled=false}
  };
  $('#preview-coordinate').onclick=()=>{const lat=$('#school-lat').value,lng=$('#school-lng').value,name=$('#setting-school').value.trim();if(!name || lat==='' || lng==='' || !Number.isFinite(+lat) || !Number.isFinite(+lng) || Math.abs(+lat)>90 || Math.abs(+lng)>180)return toast('请填写学校名称和有效经纬度');preview({lat:+lat,lon:+lng,source:'手动输入位置'},name,$('#setting-campus').value.trim())};
  $('#use-demo').onclick=()=>{school=null;localStorage.removeItem('ke-jian-school');schoolHeader();realContainer.classList.remove('shown');$('#modal').close();updateMap()};
};
schoolButton.onclick=schoolSettings;$('#campus-info').onclick=schoolSettings;
const geographicShowRealMap=showRealMap;
