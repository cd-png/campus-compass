let timetableUndo=null,calendarPickMode=false,pickedCourse=null;
function commitCalendarMove(index,newDay,start){
  const original=courses[index];if(!original)return;
  try{
    const moved=ImportEngine.move(original,newDay,start);if(moved.day===original.day&&moved.start===original.start)return;
    const others=courses.filter((_,i)=>i!==index),conflicts=courseConflicts([moved,...others]).filter(s=>s.includes(moved.name));
    const apply=()=>{const snapshot=courses.map(c=>({...c})),list=courses.map((c,i)=>i===index?moved:c);persistCourses(list);timetableUndo=snapshot;fullSchedule();toast('已改为周'+ '一二三四五六日'[newDay-1]+' '+start+'，可撤销')};
    if(conflicts.length){modal('移动后存在时间冲突',`<p>${esc(original.name)}：周${'一二三四五六日'[original.day-1]} ${esc(original.start)} → 周${'一二三四五六日'[newDay-1]} ${esc(start)}</p><div class="import-warning">${conflicts.map(esc).join('<br>')}</div><div class="modal-actions"><button class="primary" id="confirm-calendar-move">仍然移动</button><button id="cancel-calendar-move">取消</button></div>`);$('#confirm-calendar-move').onclick=apply;$('#cancel-calendar-move').onclick=fullSchedule}else apply();
  }catch(error){toast(error.message)}
}
fullSchedule=function(){
  const startMinute=Math.max(0,Math.min(420,...courses.map(c=>Math.floor(minutes(c.start)/30)*30))),endMinute=Math.min(1440,Math.max(1320,...courses.map(c=>Math.ceil(minutes(c.end)/30)*30))),slots=Math.ceil((endMinute-startMinute)/30),height=slots*40;
  const timeLabel=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  modal('每周课表 · 拖拽调整',`<div class="calendar-tools"><button class="primary" id="board-import">导入 / AI 识别</button><button id="board-question">问答添加课程</button><button id="board-add">＋ 手动添加</button><button id="calendar-pick" aria-pressed="${calendarPickMode}">${calendarPickMode?'退出点选改时':'点选改时'}</button><button id="calendar-undo" ${timetableUndo?'':'disabled'}>撤销上次移动</button><button id="board-export">导出课表备份</button></div><p class="muted" id="calendar-instructions">拖动课程到新的星期和时间，保持原时长，按 30 分钟吸附。点击课程可编辑精确时间。手机可拖动课程，或开启「点选改时」后选课再点目标时段。</p><div class="calendar-scroll"><div class="calendar-grid"><div class="calendar-head">时间</div>${Array.from({length:7},(_,d)=>`<div class="calendar-head">星期${'一二三四五六日'[d]}</div>`).join('')}<div class="calendar-hours" style="height:${height}px">${Array.from({length:slots},(_,i)=>`<span style="top:${i*40}px">${timeLabel(startMinute+i*30)}</span>`).join('')}</div>${Array.from({length:7},(_,d)=>`<div class="calendar-day" data-calendar-day="${d+1}" style="height:${height}px">${Array.from({length:slots},(_,i)=>`<button class="calendar-slot" data-calendar-time="${timeLabel(startMinute+i*30)}" style="top:${i*40}px" aria-label="星期${'一二三四五六日'[d]} ${timeLabel(startMinute+i*30)}"></button>`).join('')}${courses.map((c,i)=>({c,i})).filter(({c})=>c.day===d+1).map(({c,i})=>`<button class="calendar-course color-${i%4}" draggable="true" data-calendar-course="${i}" style="top:${(minutes(c.start)-startMinute)/30*40}px;height:${Math.max(38,(minutes(c.end)-minutes(c.start))/30*40-4)}px" aria-label="${esc(c.name)}，${esc(c.start)}至${esc(c.end)}，可拖拽或点击编辑"><b>${esc(c.name)}</b><small>${esc(c.start)}–${esc(c.end)}</small><span>${esc(c.building)} ${esc(c.room)}</span></button>`).join('')}</div>`).join('')}</div></div><p class="muted">当前为每周循环课表；原始课表中的学期、周次及单双周请在导入预览中核对，尚不按这些规则自动排除课程。</p>`);
  $('#board-import').onclick=importModal;$('#board-question').onclick=()=>{importTab='questions';importModal()};$('#board-add').onclick=()=>editCourse();
  $('#calendar-pick').onclick=()=>{calendarPickMode=!calendarPickMode;pickedCourse=null;fullSchedule()};
  $('#calendar-undo').onclick=()=>{if(!timetableUndo)return;try{const snapshot=timetableUndo;persistCourses(snapshot);timetableUndo=null;fullSchedule();toast('已撤销上次移动')}catch{toast('撤销未能保存，请检查浏览器存储')}};
  $('#board-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(courses,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='课间课表备份.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  let dragged=null,didDrag=false,touchStart=null,dragOffset=0;
  function targetAt(column,y){const offset=y-column.getBoundingClientRect().top-dragOffset,index=Math.max(0,Math.min(slots-1,Math.floor(offset/40)));return{day:+column.dataset.calendarDay,start:timeLabel(startMinute+index*30)}}
  document.querySelectorAll('[data-calendar-course]').forEach(chip=>{
    const index=+chip.dataset.calendarCourse;
    chip.ondragstart=e=>{dragged=index;dragOffset=e.clientY-chip.getBoundingClientRect().top;didDrag=true;e.dataTransfer.setData('text/plain',String(index));e.dataTransfer.effectAllowed='move';chip.classList.add('moving')};chip.ondragend=()=>{dragged=null;chip.classList.remove('moving');setTimeout(()=>didDrag=false,0)};
    chip.onclick=()=>{if(didDrag)return;if(calendarPickMode){pickedCourse=index;document.querySelectorAll('.calendar-course').forEach(c=>c.classList.toggle('picked',c===chip));$('#calendar-instructions').textContent='已选 '+courses[index].name+'，请点击目标星期的空白时段。'}else editCourse(index)};
    chip.onpointerdown=e=>{if(e.pointerType==='mouse'||calendarPickMode)return;dragOffset=e.clientY-chip.getBoundingClientRect().top;touchStart={x:e.clientX,y:e.clientY,index};chip.setPointerCapture(e.pointerId)};
    chip.onpointermove=e=>{if(!touchStart)return;if(Math.hypot(e.clientX-touchStart.x,e.clientY-touchStart.y)>8){didDrag=true;chip.classList.add('moving');const column=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-calendar-day]');if(column){const target=targetAt(column,e.clientY);$('#calendar-instructions').textContent='松开以移动到周'+ '一二三四五六日'[target.day-1]+' '+target.start}}};
    chip.onpointerup=e=>{if(!touchStart)return;const selected=touchStart.index;touchStart=null;chip.classList.remove('moving');if(didDrag){const column=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-calendar-day]');if(column){const target=targetAt(column,e.clientY);commitCalendarMove(selected,target.day,target.start)}setTimeout(()=>didDrag=false,0)}};
    chip.onpointercancel=()=>{touchStart=null;didDrag=false;chip.classList.remove('moving')};
  });
  document.querySelectorAll('[data-calendar-day]').forEach(column=>{
    column.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move'};
    column.ondrop=e=>{e.preventDefault();if(dragged===null)return;const index=dragged;dragged=null;const target=targetAt(column,e.clientY);commitCalendarMove(index,target.day,target.start)};
    column.querySelectorAll('[data-calendar-time]').forEach(slot=>slot.onclick=()=>{if(!calendarPickMode||pickedCourse===null)return;const index=pickedCourse;pickedCourse=null;commitCalendarMove(index,+column.dataset.calendarDay,slot.dataset.calendarTime)});
  });
};
$('#all-courses').onclick=fullSchedule;document.querySelector('[data-view="schedule"]').onclick=fullSchedule;
