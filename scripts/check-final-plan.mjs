import fs from 'node:fs';
import assert from 'node:assert/strict';
import { defaultSettings, addCourseExams, generatePlan, taskSteps, addDays, parseWindows, readBackup } from '../site/src/finals/engine.js';
import { validateSchedule, readDatedRecords, readDatedBackup, validateTodoFields, studyMinutes } from '../site/src/finals/dated-model.js';
import { subjectTodos, editableTodos, examTodos, todoReading } from '../site/src/finals/todo-model.js';

const data = JSON.parse(fs.readFileSync(new URL('../site/public/data/final-plan.json', import.meta.url)));
const dated = data.schedule;
// Source checklists must remain independent of old schedule completion/edit state.
const examRows = examTodos(data.examTodos);
assert.equal(new Set(examRows.map((r) => r.id)).size, examRows.length);
for (const row of examRows) {
  validateTodoFields(row);
  assert(row.date === '' && row.floating, 'Source dates must not become planned study dates');
  assert(!/오늘.*복습|당일.*복습|기공실 보고서/.test(row.title));
  const course = data.courses.find((c) => c.slug === row.slug);
  assert(row.units.every((id) => course.referenceUnits.some((u) => u.id === id)), `Unknown unit: ${row.id}`);
  assert(row.units.length || row.reading, `Missing source: ${row.id}`);
  const full = JSON.parse(fs.readFileSync(new URL(`../site/public/data/${row.slug}/course.json`, import.meta.url)));
  for (const source of row.sources) {
    assert(['lecture', 'hw', 'examples'].includes(source.route));
    if (!source.key) continue;
    assert(source.route === 'lecture' ? full.lectures.some((l) => l.id === source.key) : source.route === 'hw' ? full.hw.some((h) => h.kind !== 'bank' && h.kind !== 'ref' && h.probs.some((p) => p.num === source.key)) : full.examples.some((e) => e.num === source.key), `Broken source link: ${row.id}/${source.key}`);
  }
}
assert(examRows.some((r) => r.id === 'dated:exam:emwaves:hw:eh1102:derive'), 'Unnumbered assigned derivations must be included');
assert.equal(examRows.filter((r) => r.id.startsWith('dated:exam:advmech:hw:HW3:')).length, 7);
assert.equal(examRows.filter((r) => r.id.startsWith('dated:exam:astro1:hw:HW6:')).length, 4);
assert.equal(examRows.filter((r) => r.id.startsWith('dated:exam:mechexp:quiz:')).length, 12);
assert(!examRows.some((r) => /bank|TE\/TM|Snell|Brewster/.test(r.id + r.title)), 'Do not add midterm or unassigned banks as core final tasks');
const examSample = examRows[0], examEdit = { title: '시험 자료 재풀이', slug: 'advmech', date: '2026-12-01', details: '조건 변경', units: ['u28'], reading: 'T&M 12장' };
const examState = readDatedBackup(JSON.stringify({ type: 'dated-final-plan', version: 3, records: { [examSample.id]: { done: true, actual: 30, note: '오답' } }, todoEdits: { [examSample.id]: examEdit }, customTodos: [], deletedTodos: [examSample.id] }));
assert(!examTodos(data.examTodos, examState).some((r) => r.id === examSample.id));
const restoredExam = examTodos(data.examTodos, { ...examState, deletedTodos: [] });
assert.deepEqual(restoredExam.find((r) => r.id === examSample.id).units, ['u28']);
assert.equal(restoredExam.find((r) => r.id === examSample.id).date, '2026-12-01');
assert.equal(examRows[0].date, '', 'Editing must not mutate the source catalog');
assert.equal(subjectTodos(dated, data.courses, examState.records, { rows: restoredExam, sourceOrder: true }).reduce((n, g) => n + g.done, 0), 1);
assert.equal(subjectTodos(dated, data.courses, examState.records).reduce((n, g) => n + g.done, 0), 0, 'Exam checks must not mark old schedule slots complete');
console.log(`Exam checklist OK: ${examRows.length} source tasks; valid links, independent records, recoverable edits/deletes.`);
validateSchedule(dated);
assert.equal(dated.start, '2026-11-23');
assert.equal(dated.end, '2026-12-17');
const datedRows = dated.days.flatMap((day) => day.rows.map((r) => ({ ...r, date: day.date })));
const todos = subjectTodos(dated, data.courses, {}, { today: '2026-11-27' });
const todoRows = todos.flatMap((g) => g.rows);
assert.equal(todoRows.length, datedRows.filter((r) => ['study', 'assignment', 'project', 'experiment', 'meeting'].includes(r.kind)).length);
assert.equal(new Set(todoRows.map((r) => r.id)).size, todoRows.length, 'Every actionable schedule row must appear once');
assert(todos.find((g) => g.slug === 'mechexp').rows.some((r) => r.title.startsWith('기공실 보고서')), 'Lab reports must be grouped under their course');
assert(!todos.find((g) => g.slug === 'project').rows.some((r) => r.kind === 'assignment' && /전파광|기공실/.test(r.title)), 'Named course assignments must not fall into Other');
assert(todoRows.every((r) => datedRows.some((d) => d.id === r.id && d.start === r.start && d.date === r.date)), 'Todo view must preserve task IDs and times');
const sampleTodo = todoRows[0];
const todoRecords = readDatedRecords(JSON.stringify({ type: 'dated-final-plan', version: 1, records: { [sampleTodo.id]: { done: true, actual: 25, note: '공유 기록' } } }));
const todoCompleted = subjectTodos(dated, data.courses, todoRecords, { hideDone: true });
assert.equal(todoCompleted.reduce((n, g) => n + g.done, 0), 1);
assert(!todoCompleted.flatMap((g) => g.rows).some((r) => r.id === sampleTodo.id));
assert.equal(todoCompleted.flatMap((g) => g.rows).length, todoRows.length - 1);
assert.deepEqual(subjectTodos(dated, data.courses, {}, { period: 'today', today: '2026-11-27' }).flatMap((g) => g.rows).map((r) => r.id).sort(), todoRows.filter((r) => r.date === '2026-11-27').map((r) => r.id).sort());
assert(subjectTodos(dated, data.courses, {}, { period: 'upcoming', today: '2026-11-27' }).flatMap((g) => g.rows).every((r) => r.date >= '2026-11-27'));
assert.equal(subjectTodos(dated, data.courses, {}, { subject: 'astro1' }).length, 1);
assert.equal(subjectTodos(dated, data.courses, {}, { period: 'today', today: '2026-12-18' }).flatMap((g) => g.rows).length, 0);
const customTask = { id: 'dated:custom:test-task', title: '추가 공부 <메모>', slug: 'advmech', date: '2026-12-18', details: '추가 내용' };
const editedTask = { title: '옮긴 할 일', slug: 'emwaves', date: '2026-12-01', details: '새 내용' };
const personalState = readDatedBackup(JSON.stringify({ type: 'dated-final-plan', version: 2, records: todoRecords, customTodos: [customTask], todoEdits: { [sampleTodo.id]: editedTask } }));
const personalRows = editableTodos(dated, personalState);
assert.equal(personalRows.length, todoRows.length + 1);
assert.equal(personalRows.find((r) => r.id === sampleTodo.id).title, editedTask.title);
assert.equal(personalRows.find((r) => r.id === sampleTodo.id).date, '2026-12-01');
assert.equal(personalRows.find((r) => r.id === sampleTodo.id).original.date, sampleTodo.date);
assert(personalRows.find((r) => r.id === sampleTodo.id).floating);
assert.deepEqual(personalRows.find((r) => r.id === sampleTodo.id).units, [], 'Changing a subject must not retain links to old subject units');
assert.equal(subjectTodos(dated, data.courses, personalState.records, { ...personalState, period: 'today', today: '2026-12-18' }).flatMap((g) => g.rows)[0].id, customTask.id);
assert.equal(subjectTodos(dated, data.courses, personalState.records, { ...personalState, hideDone: true }).flatMap((g) => g.rows).some((r) => r.id === sampleTodo.id), false, 'Edits must preserve completion');
assert.deepEqual(readDatedBackup(JSON.stringify({ type: 'dated-final-plan', version: 1, records: todoRecords })).customTodos, [], 'Old record backups still load');
assert.equal(validateTodoFields({ ...customTask, date: '' }).date, '');
assert.throws(() => validateTodoFields({ ...customTask, date: '2026-02-30' }));
assert.throws(() => validateTodoFields({ ...customTask, title: '  ' }));
assert.throws(() => validateTodoFields({ ...customTask, slug: '<script>' }));
assert.throws(() => readDatedBackup(JSON.stringify({ type: 'dated-final-plan', version: 2, records: {}, customTodos: [customTask, customTask], todoEdits: {} })));
assert.equal(editableTodos(dated).find((r) => r.id === sampleTodo.id).title, sampleTodo.title, 'Editing does not mutate the source schedule');
const deletedState = readDatedBackup(JSON.stringify({ type: 'dated-final-plan', version: 3, ...personalState, deletedTodos: [sampleTodo.id, customTask.id] }));
assert.equal(editableTodos(dated, deletedState).length, todoRows.length - 1, 'Both original and personal tasks can be deleted');
assert.equal(editableTodos(dated, { ...deletedState, includeDeleted: true }).length, todoRows.length + 1, 'Deleted tasks remain recoverable');
assert.equal(subjectTodos(dated, data.courses, deletedState.records, deletedState).reduce((n, g) => n + g.total, 0), todoRows.length - 1);
assert.equal(editableTodos(dated, { ...deletedState, deletedTodos: [] }).find((r) => r.id === sampleTodo.id).title, editedTask.title, 'Restoring preserves edits');
assert.equal(deletedState.records[sampleTodo.id].done, true, 'Deleting preserves completion for recovery');
assert.throws(() => readDatedBackup(JSON.stringify({ type: 'dated-final-plan', version: 3, records: {}, customTodos: [], todoEdits: {}, deletedTodos: ['<script>'] })));
const explicitFields = validateTodoFields({ ...customTask, units: ['u28', 'u29'], reading: 'T&M §12.4–12.6' });
assert.deepEqual(explicitFields.units, ['u28', 'u29']);
assert.throws(() => validateTodoFields({ ...customTask, units: ['../bad'] }));
const mechCourse = data.courses.find((c) => c.slug === 'advmech');
const mechReading = todoReading({ slug: 'advmech', units: ['u28', 'u29'] }, mechCourse);
assert(mechReading.summary.includes('U28·U29') && mechReading.summary.includes('12.4') && mechReading.summary.includes('12.5–12.6') && mechReading.summary.includes('T&M'));
assert.equal(todoReading({ units: ['u23'] }, mechCourse).units.length, 1, 'Prerequisite units outside the final-only list must resolve');
assert.equal(todoReading({ units: ['u999'], reading: '교재 p.448 문제 4·5' }, mechCourse).units.length, 0, 'Unknown units cannot create invented references');
for (const row of editableTodos(dated)) {
  const course = data.courses.find((c) => c.slug === row.slug);
  const reading = todoReading(row, course);
  assert.equal(reading.units.length, (row.units || []).length, `Missing reference unit: ${row.id}`);
  if (['study', 'assignment'].includes(row.kind)) assert((row.units || []).length || row.reading, `Missing explicit reading target or uncertainty: ${row.id}`);
}
const duration = (rows) => rows.reduce((n, r) => n + r.end - r.start, 0);
assert(!datedRows.some((r) => r.slug === 'mechexp' && r.kind === 'study' && r.date < '2026-12-10'), 'Lab quiz study must stay in the final intensive period');
assert.equal(datedRows.filter((r) => r.kind === 'exam' && r.title.includes('기계공학실험')).length, 1);
assert.equal(duration(datedRows.filter((r) => r.kind === 'experiment')), 870, 'Experiment reservation must be separate from lab hours');
assert.equal(duration(datedRows.filter((r) => r.title.startsWith('논문리뷰 준비'))), 360);
for (const day of dated.days) {
  assert(duration(day.rows.filter((r) => r.kind === 'sleep')) >= 300, 'Sleep allocation shortened');
  const dow = new Date(day.date + 'T12:00:00Z').getUTCDay();
  if (dow === 4 && day.date <= '2026-12-10') assert.equal(duration(day.rows.filter((r) => r.title.startsWith('기공실 보고서'))), day.date === '2026-11-26' ? 0 : 300);
  assert(!day.rows.some((r) => r.slug === 'astro1' && r.kind === 'study' && (day.date > '2026-12-15' || day.date === '2026-12-15' && r.end > 840)), 'Astro study after exam');
}
for (const c of data.courses) {
  for (const unit of c.units) assert(datedRows.some((r) => r.slug === c.slug && r.units?.includes(unit.id)), `Dated plan omitted ${c.slug}/${unit.id}`);
  const meta = JSON.parse(fs.readFileSync(new URL(`../content/${c.slug}/meta.json`, import.meta.url)));
  for (const row of datedRows.filter((r) => r.slug === c.slug)) {
    for (const id of row.units || []) assert(meta.units.some((u) => u.id === id), `Broken unit link ${c.slug}/${id}`);
  }
}
for (const date of ['2026-11-23', '2026-11-30', '2026-12-02', '2026-12-07']) {
  for (const slug of ['emwaves', 'advmech']) assert(datedRows.some((r) => r.date === date && r.slug === slug && r.phase === '새 강의 복습'));
}
assert(datedRows.some((r) => r.date === '2026-11-26' && r.title === '11/25 전파광 복습 보충'));
assert(datedRows.some((r) => r.date === '2026-12-13' && r.title === '포스터 최종 수정·검수·제출'));
const mechanicsExam = datedRows.filter((r) => r.kind === 'exam' && r.title.includes('고급역학'));
assert.equal(mechanicsExam.length, 1);
assert.equal(mechanicsExam[0].date, '2026-12-17');
assert.equal(mechanicsExam[0].start, 19 * 60);
assert.equal(mechanicsExam[0].end, 22 * 60);
assert.equal(data.courses.find((c) => c.slug === 'advmech').exam.tentative, false);
const focus = [['astro1','2026-12-14','2026-12-15',840],['mechexp','2026-12-11','2026-12-12',1110],['emwaves','2026-12-13','2026-12-14',570],['advmech','2026-12-16','2026-12-17',1140]];
for (const [slug,prev,date,start] of focus) {
  const tasks = datedRows.filter(r => (r.date === prev && (slug !== 'astro1' || r.start >= 650) || r.date === date && r.start < start) && r.slug && ['study','assignment'].includes(r.kind));
  assert(tasks.every(r => r.slug === slug), 'Another subject in exam focus window: '+slug);
}
const astroExam = datedRows.find(r => r.kind === 'exam' && r.title === '천체물리학개론1 기말고사');
assert.equal(astroExam.date,'2026-12-15'); assert.equal(astroExam.start,840); assert.equal(astroExam.end,915);
const hw6 = datedRows.filter(r=>r.title.includes('HW6'));
assert.equal(duration(hw6),300); assert(hw6.every(r=>r.date<'2026-11-26'||r.date==='2026-11-26'&&r.end<=840));
for (const title of ['12/9 전파광 복습 보충','12/9 고급역학 복습 보충','12/9 전파광 과제 풀이·최종 제출']) assert(datedRows.some(r=>r.title===title));
assert.equal(duration(datedRows.filter(r=>r.title==='기공실 150분 통합 모의 퀴즈')),150);
const datedBackup = { type: 'dated-final-plan', version: 1, records: { [datedRows[0].id]: { done: true, actual: 35, note: '다시 풀기' } } };
assert.deepEqual(readDatedRecords(JSON.stringify(datedBackup)), datedBackup.records);
assert.throws(() => readDatedRecords(JSON.stringify({ ...datedBackup, type: 'legacy' })));
assert.throws(() => readDatedRecords(JSON.stringify({ ...datedBackup, records: { '__proto__': {}, bad: { done: true, actual: -1, note: '' } } })));
const overlapping = structuredClone(dated);
overlapping.days[0].rows[1].start -= 1;
assert.throws(() => validateSchedule(overlapping));
console.log(`Dated schedule OK: ${dated.days.length} complete days, ${datedRows.reduce((n, r) => n + studyMinutes(r), 0)} study minutes; all course units covered.`);
const settings = defaultSettings(data);
for (const oldDate of ['2026-12-09', '2026-12-14']) {
  const old = structuredClone(settings);
  old.exams.advmech = { date: oldDate, tentative: true };
  const migrated = addCourseExams(old, data.courses);
  assert.equal(migrated.exams.advmech.date, '2026-12-17');
  assert.equal(migrated.exams.advmech.tentative, false);
  assert.deepEqual(migrated.availability, old.availability);
}
const priorAstro = structuredClone(settings);
priorAstro.exams.astro1 = { ...priorAstro.exams.astro1, date: '2026-12-10', confirmedAt: '2026-11-23' };
assert.equal(addCourseExams(priorAstro, data.courses).exams.astro1.date, '2026-12-15');
assert.deepEqual(addCourseExams(priorAstro, data.courses).availability, priorAstro.availability);
const customAstro = structuredClone(priorAstro); customAstro.exams.astro1.date = '2026-12-18';
assert.equal(addCourseExams(customAstro, data.courses).exams.astro1.date, '2026-12-18');
const hw3 = datedRows.filter(r=>r.title.startsWith('HW3'));
assert.equal(duration(hw3),420); assert(hw3.every(r=>r.date<'2026-12-07'));
assert(datedRows.some(r=>r.kind==='class'&&r.date==='2026-11-27'&&r.title.includes('영상')));
assert(!datedRows.some(r=>r.kind==='class'&&r.date==='2026-12-11'&&r.title==='기계공학실험'));
const plan = generatePlan(data, settings);
assert.equal(new Set(plan.backlog.map((t) => t.id)).size, plan.backlog.length, 'Repeated backlog task');
const scheduled = new Map();
for (const day of plan.days) {
  if (day.exams.length) assert.equal(day.rows.length, 0, 'Exam days must stay free');
  for (const [i, row] of day.rows.entries()) {
    assert(row.end > row.start && row.end - row.start === row.minutes);
    assert(!i || row.start >= day.rows[i - 1].end, 'Overlapping blocks');
    assert(parseWindows(settings.availability[day.dow]).some((w) => row.start >= w.start && row.end <= w.end));
    for (const f of day.fixed.filter((f) => f.start !== null)) assert(row.end <= f.start || row.start >= f.end, 'Class or lab collision');
    if (!row.slug) continue;
    assert(row.date < settings.exams[row.slug].date, 'Study after the course exam');
    assert.equal(taskSteps(row).reduce((n, s) => n + s.minutes, 0), row.minutes, 'Minute breakdown mismatch');
    assert(!scheduled.has(row.id), 'Repeated task');
    if (row.after) assert(scheduled.has(row.after) && row.date >= addDays(scheduled.get(row.after), row.gap), 'Prerequisite or spacing violated');
    scheduled.set(row.id, row.date);
  }
}
assert.equal(plan.tasks.length, data.courses.reduce((n, c) => n + c.units.length * 3 + 3, 0));
for (const t of plan.tasks) {
  assert.equal(Number(scheduled.has(t.id)) + Number(plan.backlog.some((b) => b.id === t.id)), 1, 'Task must be scheduled or explicitly unplaced');
}
const sparse = { ...settings, availability: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, ''])) };
assert.equal(generatePlan(data, sparse).backlog.length, plan.tasks.length, 'Shortfalls must be visible');
const blocked = { ...settings, blocked: '2026-11-01' };
assert.equal(generatePlan(data, blocked).days[0].rows.length, 0);
const conflict = { ...settings, availability: { ...settings.availability, 2: '11:00-12:30,19:30-22:30' } };
for (const d of generatePlan(data, conflict).days.filter((d) => d.dow === 2)) assert(d.rows.every((r) => r.start >= 750 || r.end <= 660));
assert.throws(() => parseWindows('20:30-20:00'));
assert.throws(() => parseWindows('20:30-22:00,21:00-23:00'));
assert.throws(() => generatePlan(data, { ...settings, start: '2026-02-30' }));
const backup = { version: 1, settings, records: { 'advmech:u26:learn': { done: true, note: '다시 볼 식 <조건>', actual: 35 } } };
assert.deepEqual(readBackup(JSON.stringify(backup), data.courses), { settings, records: backup.records });
const olderSettings = structuredClone(settings);
delete olderSettings.exams.mechexp;
olderSettings.availability[1] = '21:30-23:00';
const upgraded = addCourseExams(olderSettings, data.courses);
assert.equal(upgraded.availability[1], '21:30-23:00');
assert.equal(upgraded.exams.mechexp.date, '2026-12-12');
assert.deepEqual(readBackup(JSON.stringify({ ...backup, settings: olderSettings }), data.courses), { settings: upgraded, records: backup.records });
assert.throws(() => readBackup(JSON.stringify({ ...backup, version: 2 }), data.courses));
assert.throws(() => readBackup(JSON.stringify({ ...backup, records: { broken: { done: true, note: '', actual: -1 } } }), data.courses));
console.log(`Final plan OK: ${plan.days.length} days, ${plan.tasks.length} core blocks, ${plan.backlog.length} explicitly unplaced; no overlaps, exam-day study, or unaccounted tasks.`);
