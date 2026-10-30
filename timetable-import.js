/* Local extraction never invents missing days, times or classroom coordinates. */
const ImportEngine=(()=>{
  const weekNames='一二三四五六日';
  function normalize(s){return String(s??'').replace(/[０-９]/g,c=>String(c.charCodeAt(0)-65248)).replace(/：/g,':').replace(/[–—～]/g,'-').trim()}
  function dayOf(s){if(Number.isInteger(s)&&s>=1&&s<=7)return s;const m=normalize(s).match(/(?:星期|周|礼拜)?\s*([一二三四五六日天1-7])(?:$|\s|[,，])/);return m?(/\d/.test(m[1])?+m[1]:weekNames.indexOf(m[1].replace('天','日'))+1):''}
  function findDay(s){const m=normalize(s).match(/(?:星期|周|礼拜)\s*([一二三四五六日天1-7])/);return m?dayOf(m[1]):''}
  function timePair(s){const m=normalize(s).match(/(\d{1,2}):([0-5]\d)\s*(?:-|至|到)\s*(\d{1,2}):([0-5]\d)/);return m?{start:m[1].padStart(2,'0')+':'+m[2],end:m[3].padStart(2,'0')+':'+m[4]}:{start:'',end:''}}
  function periodRange(s){const m=normalize(s).match(/第?\s*(\d{1,2})(?:\s*[-至到,、]\s*(\d{1,2}))?\s*节/);return m?{first:+m[1],last:+(m[2]||m[1]),label:m[1]+(m[2]?'-'+m[2]:'')+'节'}:null}
  function parsePeriods(text){const map={},issues=[];normalize(text).split('\n').filter(Boolean).forEach((line,i)=>{const n=line.match(/^\s*(\d{1,2})\s*/);const t=timePair(line);if(!n||!t.start||t.start>=t.end||+t.start.slice(0,2)>23||+t.end.slice(0,2)>23)issues.push('节次表第 '+(i+1)+' 行无效');else if(map[n[1]])issues.push('节次 '+n[1]+' 重复');else map[n[1]]=t});return{map,issues}}
  function empty(){return{day:'',start:'',end:'',name:'',building:'',room:'',teacher:'',notes:'',periods:''}}
  function field(text,keys){const m=normalize(text).match(new RegExp('(?:'+keys+')\\s*[:=]\\s*([^\\n;；|]+)'));return m?m[1].trim():''}
  function locationFields(s){s=normalize(s).replace(/^(?:地点|教室|上课地点|教学地点)\s*[:=]\s*/,'');if(!s)return{building:'',room:''};let m=s.match(/^(.+?(?:教学楼|实验楼|综合楼|楼|馆|中心|教\b))\s*[-·,， ]*([A-Za-z]?\d{2,5}[A-Za-z]?(?:教室)?)?$/);if(m)return{building:m[1],room:m[2]||''};m=s.match(/^(.+?)\s*[-· ]\s*([A-Za-z]?\d{2,5}[A-Za-z]?(?:教室)?)$/);if(m)return{building:m[1],room:m[2]};if(/^[A-Za-z]?\d{2,5}(?:教室)?$/.test(s))return{building:'',room:s};return{building:s,room:''}}
  function extract(text,context={},periodMap={}){
    text=normalize(text);const c={...empty(),...context};c.day=findDay(text)||c.day;
    const t=timePair(text);if(t.start)Object.assign(c,t);
    const period=periodRange(text)||periodRange(context.periods);if(period){c.periods=period.label;if(!c.start&&periodMap[period.first]&&periodMap[period.last]){c.start=periodMap[period.first].start;c.end=periodMap[period.last].end}}
    c.name=field(text,'课程名称|课程名|科目|课程')||c.name;
    c.teacher=field(text,'任课教师|授课教师|教师|老师')||c.teacher;
    const place=field(text,'上课地点|教学地点|地点|教室');if(place)Object.assign(c,locationFields(place));
    const building=field(text,'教学楼|楼宇');if(building)c.building=building;
    const room=field(text,'房间|教室号');if(room)c.room=room;
    const lines=text.split(/[\n;；|]/).map(s=>s.trim()).filter(Boolean);
    const unlabeled=lines.filter(s=>!/(?:课程名称|课程名|科目|课程|教师|老师|地点|教室|教学楼|楼宇|房间)\s*[:=]/.test(s));
    const notes=lines.filter(s=>/\d+\s*[-至]\s*\d+\s*周|单双周|单周|双周|每周|周次/.test(s));if(notes.length)c.notes=[c.notes,...notes].filter(Boolean).join('；');
    if(!c.building){const placeLine=unlabeled.find(s=>/(?:教学楼|实验楼|综合楼|楼|馆)\s*[-· ]*[A-Za-z]?\d{0,5}(?:教室)?$/.test(s)&&!findDay(s));if(placeLine)Object.assign(c,locationFields(placeLine))}
    if(!c.name){const candidates=unlabeled.filter(s=>!findDay(s)&&!timePair(s).start&&!periodRange(s)&&!notes.includes(s)&&!/(?:教学楼|实验楼|综合楼|楼|馆)\s*[-· ]*[A-Za-z]?\d{0,5}(?:教室)?$/.test(s)&&!/^\d+$/.test(s));c.name=candidates[0]||'';if(!c.teacher&&candidates.length>1&&/^[\u4e00-\u9fa5]{2,4}(?:老师)?$/.test(candidates[candidates.length-1]))c.teacher=candidates[candidates.length-1]}
    return c;
  }
  const aliases={day:['星期','周几','上课星期','day'],start:['开始时间','上课时间','开始','start'],end:['结束时间','下课时间','结束','end'],name:['课程名称','课程名','科目','课程','name','summary'],building:['教学楼','楼宇','building'],room:['教室号','房间','room'],teacher:['教师','任课教师','老师','teacher'],location:['上课地点','教室','地点','location'],periods:['节次','上课节次','periods'],notes:['周次','备注','notes']};
  function fromObject(row,periodMap={}){if(!row||typeof row!=='object')return empty();const c=empty();for(const key of Object.keys(c)){const alias=(aliases[key]||[key]).find(a=>row[a]!==undefined);if(alias)c[key]=String(row[alias]??'').trim()}const location=aliases.location.find(a=>row[a]!==undefined);if(location)Object.assign(c,locationFields(row[location]));c.day=dayOf(c.day)||findDay(c.day);for(const key of ['start','end']){const m=normalize(c[key]).match(/^(\d{1,2}):([0-5]\d)(?::\d{2})?$/);c[key]=m?m[1].padStart(2,'0')+':'+m[2]:''}return extract('',c,periodMap)}
  function unique(list){const seen=new Set();return list.filter(c=>{if(!c.name&&!c.building&&!c.room)return false;const key=JSON.stringify(c);if(seen.has(key))return false;seen.add(key);return true})}
  function matrix(rows,periodMap={}){
    rows=rows.map(row=>row.map(v=>normalize(v)));const header=rows.findIndex(row=>row.filter(v=>findDay(v)).length>=2);
    if(header>=0){const days=rows[header].map(findDay),list=[];for(let r=header+1;r<rows.length;r++)for(let col=0;col<days.length;col++){const value=rows[r][col];if(!days[col]||!value||/^(?:无|空|休息|午休)$/.test(value))continue;const rowLabel=rows[r].slice(0,Math.max(1,days.findIndex(Boolean))).join(' ');list.push(extract(value,{day:days[col],...timePair(rowLabel),periods:periodRange(rowLabel)?.label||''},periodMap))}return unique(list)}
    const head=rows.findIndex(row=>row.some(v=>aliases.name.includes(v))&&row.some(v=>aliases.day.includes(v)||aliases.start.includes(v)));
    if(head>=0)return unique(rows.slice(head+1).map(row=>fromObject(Object.fromEntries(rows[head].map((k,i)=>[k,row[i]||''])),periodMap)));
    return unique(rows.filter(row=>row.some(Boolean)).map(row=>{
      if(dayOf(row[0])&&/^\d{1,2}:\d{2}$/.test(row[1]||'')&&/^\d{1,2}:\d{2}$/.test(row[2]||''))return fromObject({day:dayOf(row[0]),start:row[1],end:row[2],name:row[3],building:row[4],room:row[5],teacher:row[6]},periodMap);
      return extract(row.join('\n'),{},periodMap);
    }));
  }
  function delimited(text){const delimiter=text.includes('\t')?'\t':text.includes('，')?'，':',';const rows=[],row=[];let value='',quoted=false;text=text.replace(/^\uFEFF/,'');for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(ch===delimiter&&!quoted){row.push(value);value=''}else if(ch==='\n'&&!quoted){row.push(value.replace(/\r$/,''));rows.push(row.splice(0));value=''}else value+=ch}row.push(value.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);return rows}
  function text(raw,periodMap={}){
    raw=normalize(raw);
    if(raw.startsWith('[')||raw.startsWith('{')){try{const parsed=JSON.parse(raw),list=Array.isArray(parsed)?parsed:parsed.courses;if(Array.isArray(list))return{courses:unique(list.map(c=>fromObject(c,periodMap))),warnings:[]}}catch{}}
    if(raw.includes('\t')||(/[,，]/.test(raw)&&raw.split('\n').some(line=>line.split(/[,，]/).length>=4)))return{courses:matrix(delimited(raw),periodMap),warnings:[]};
    let context={},pending=[],list=[];
    function flush(){if(!pending.length)return;const c=extract(pending.join('\n'),context,periodMap);if(c.name||c.building)list.push(c);pending=[]}
    for(const line of raw.split('\n')){
      if(!line.trim()){flush();continue}
      const d=findDay(line),t=timePair(line);
      if(d&&normalize(line).match(/^(?:星期|周|礼拜)[一二三四五六日天1-7]$/)){flush();context={day:d};continue}
      if((d||t.start)&&pending.length&&pending.some(s=>timePair(s).start))flush();
      if(/^(?:课程名称|课程名|课程|科目)\s*[:=]/.test(line)&&pending.some(s=>/^(?:课程名称|课程名|课程|科目)\s*[:=]/.test(s)))flush();
      pending.push(line);
    }flush();return{courses:unique(list),warnings:['本地识别依据关键词及相邻上下文，缺失字段不会自动猜测，请在表格中核对。']};
  }
  function calendar(raw){const list=[];for(const block of raw.replace(/\r?\n[ \t]/g,'').split('BEGIN:VEVENT').slice(1)){const fields={};block.split(/\r?\n/).forEach(line=>{const pos=line.indexOf(':');if(pos>0)fields[line.slice(0,pos).split(';')[0]]=line.slice(pos+1).replace(/\\n/g,'\n').replace(/\\,/g,',')});const read=s=>{const m=(s||'').match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);if(!m)return null;const date=m[7]?new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4]+8,+m[5])):new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5]));return{day:date.getUTCDay()||7,time:String(date.getUTCHours()).padStart(2,'0')+':'+String(date.getUTCMinutes()).padStart(2,'0')}};const start=read(fields.DTSTART),end=read(fields.DTEND);if(!start||!end)continue;const days=fields.RRULE?.match(/BYDAY=([^;]+)/)?.[1].split(',').map(d=>['MO','TU','WE','TH','FR','SA','SU'].indexOf(d)+1).filter(Boolean)||[start.day];for(const day of days)list.push({...empty(),day,start:start.time,end:end.time,name:fields.SUMMARY||'',...locationFields(fields.LOCATION||''),notes:fields.RRULE?'日历重复规则：'+fields.RRULE:''})}return{courses:unique(list),warnings:['日历日期与重复规则已作为备注保留，当前软件按每周课表展示；请核对学期和单双周。']}}
  function validate(list){const issues=[];list.forEach((c,i)=>{const missing=[];if(!dayOf(c.day))missing.push('星期');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.end)||c.start>=c.end)missing.push('有效起止时间');if(!c.name.trim())missing.push('课程名');if(!c.building.trim())missing.push('教学楼');if(missing.length)issues.push({row:i,missing})});return issues}
  function move(c,day,start){const m=String(start).match(/^(\d{2}):(\d{2})$/);if(!m||!dayOf(day))throw Error('目标时间无效');const n=s=>+s.slice(0,2)*60 + +s.slice(3),duration=n(c.end)-n(c.start),end=n(start)+duration;if(duration<=0||end>=1440)throw Error('拖动后超出当天，请通过编辑调整');return{...c,day:+day,start,end:String(Math.floor(end/60)).padStart(2,'0')+':'+String(end%60).padStart(2,'0')}}
  return{normalize,dayOf,timePair,periodRange,parsePeriods,extract,locationFields,fromObject,unique,matrix,text,calendar,validate,move};
})();
if(typeof module!=='undefined')module.exports=ImportEngine;
