import fs from 'node:fs';
import assert from 'node:assert/strict';
import { defaultSettings, addCourseExams, generatePlan, taskSteps, addDays, parseWindows, readBackup } from '../site/src/finals/engine.js';
import { validateSchedule, readDatedRecords, studyMinutes } from '../site/src/finals/dated-model.js';

const data = JSON.parse(fs.readFileSync(new URL('../site/public/data/final-plan.json', import.meta.url)));
const dated = data.schedule;
validateSchedule(dated);
assert.equal(dated.start, '2026-11-23');
assert.equal(dated.end, '2026-12-17');
const datedRows = dated.days.flatMap((day) => day.rows.map((r) => ({ ...r, date: day.date })));
const duration = (rows) => rows.reduce((n, r) => n + r.end - r.start, 0);
assert(!datedRows.some((r) => r.slug === 'mechexp' && r.kind === 'study' && r.date < '2026-12-10'), 'Lab quiz study must stay in the final intensive period');
assert.equal(datedRows.filter((r) => r.kind === 'exam' && r.title.includes('기계공학실험')).length, 1);
assert.equal(duration(datedRows.filter((r) => r.kind === 'experiment')), 870, 'Experiment reservation must be separate from lab hours');
assert.equal(duration(datedRows.filter((r) => r.title.startsWith('논문리뷰 준비'))), 360);
for (const day of dated.days) {
  assert(duration(day.rows.filter((r) => r.kind === 'sleep')) >= 300, 'Sleep allocation shortened');
  const dow = new Date(day.date + 'T12:00:00Z').getUTCDay();
  if (dow === 4 && day.date <= '2026-12-10') assert.equal(duration(day.rows.filter((r) => r.title.startsWith('기공실 보고서'))), day.date === '2026-11-26' ? 0 : 300);
  if (day.date >= '2026-12-10') assert(!day.rows.some((r) => r.slug === 'astro1' && r.kind === 'study'), 'Astro study after exam');
}
for (const c of data.courses) {
  for (const unit of c.units) assert(datedRows.some((r) => r.slug === c.slug && r.units?.includes(unit.id)), `Dated plan omitted ${c.slug}/${unit.id}`);
  const meta = JSON.parse(fs.readFileSync(new URL(`../content/${c.slug}/meta.json`, import.meta.url)));
  for (const row of datedRows.filter((r) => r.slug === c.slug)) {
    for (const id of row.units || []) assert(meta.units.some((u) => u.id === id), `Broken unit link ${c.slug}/${id}`);
  }
}
for (const date of ['2026-11-23', '2026-11-30', '2026-12-02', '2026-12-07', '2026-12-09']) {
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
