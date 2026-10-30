/* Shared validation also runs in Node for regression checks. */
function parseCourseText(text) {
  const issues = [], result = [];
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
  let rows;
  try {
    rows = text.trim().startsWith('[') ? JSON.parse(text) : text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line, index) => {
      if (!line.trim()) return null;
      const p = line.split(/[,，\t]/).map(s => s.trim());
      if (index === 0 && /星期|周次/.test(p[0]) && /开始/.test(p[1])) return null;
      const d = p[0].replace(/星期|周/g, '').replace('天', '日');
      return {day: /^[1-7]$/.test(d) ? +d : '一二三四五六日'.indexOf(d) + 1, start:p[1], end:p[2], name:p[3], building:p[4], room:p[5] || '', teacher:p[6] || '', line:index+1};
    });
    if (!Array.isArray(rows)) throw Error();
  } catch { return {courses:[], issues:['文件格式不正确，请使用课程 JSON 数组或每行一节的文本。']}; }
  const seen = new Set();
  rows.forEach((c, i) => {
    if (!c) return;
    const line = c.line || i+1;
    if (!Number.isInteger(c.day) || c.day < 1 || c.day > 7 || !validTime.test(c.start) || !validTime.test(c.end) || c.end <= c.start || typeof c.name !== 'string' || !c.name.trim() || typeof c.building !== 'string' || !c.building.trim()) {
      issues.push(`第 ${line} 行：请检查星期、起止时间、课程名和教学楼。`); return;
    }
    const clean = {day:c.day, start:c.start, end:c.end, name:c.name.trim(), building:c.building.trim(), room:String(c.room || '').trim(), teacher:String(c.teacher || '').trim()};
    const key = JSON.stringify(clean);
    if (seen.has(key)) return;
    seen.add(key); result.push(clean);
  });
  if (!result.length && !issues.length) issues.push('请先填写或上传课程表。');
  return {courses:result, issues};
}
function courseConflicts(list) {
  const conflicts = [];
  for (let i=0; i<list.length; i++) for (let j=i+1; j<list.length; j++) {
    const a=list[i], b=list[j];
    if (a.day===b.day && a.start<b.end && b.start<a.end) conflicts.push(`周${'一二三四五六日'[a.day-1]}：${a.name} 与 ${b.name} 时间重叠`);
  }
  return conflicts;
}
if (typeof module !== 'undefined') module.exports = {parseCourseText, courseConflicts};
