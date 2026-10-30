import fs from 'node:fs';
import assert from 'node:assert/strict';
import { defaultSettings, generatePlan, taskSteps, addDays, parseWindows, readBackup } from '../site/src/finals/engine.js';

const data = JSON.parse(fs.readFileSync(new URL('../site/public/data/final-plan.json', import.meta.url)));
const settings = defaultSettings(data);
const plan = generatePlan(data, settings);
assert.equal(plan.backlog.length, 0, `Default schedule leaves tasks unplaced: ${plan.backlog.map((t) => t.id)}`);
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
assert.equal(plan.tasks.length, data.courses.reduce((n, c) => n + c.units.length * 3 + 3 + (c.slug === 'emwaves' ? 5 : 0), 0));
for (const t of plan.tasks) assert(scheduled.has(t.id));
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
assert.throws(() => readBackup(JSON.stringify({ ...backup, version: 2 }), data.courses));
assert.throws(() => readBackup(JSON.stringify({ ...backup, records: { broken: { done: true, note: '', actual: -1 } } }), data.courses));
console.log(`Final plan OK: ${plan.days.length} days, ${plan.tasks.length} core blocks; no overlaps, exam-day study, or missing tasks.`);
