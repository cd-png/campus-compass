const assert=require('node:assert/strict');const {findLocalSchools}=require('./schools');
assert.equal(findLocalSchools('上海师范大学').length,2);
assert.equal(findLocalSchools('上师大','徐汇校区')[0].campus,'徐汇校区');
assert.equal(findLocalSchools('SHNU','奉贤')[0].campus,'奉贤校区');
assert.equal(findLocalSchools('上海师范大学','不存在的校区').length,0);
assert.equal(findLocalSchools('').length,0);
assert.equal(findLocalSchools('不存在的学校').length,0);
console.log('School search: 6 checks passed');
