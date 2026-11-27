export const DATED_RECORD_KEY = 'final-plan.2026-2.dated.v2';
export const LEGACY_DATED_RECORD_KEY = 'final-plan.2026-2.dated.v1';
export const isTask = (row) => ['study', 'assignment', 'project', 'experiment', 'meeting'].includes(row.kind);
export const studyMinutes = (row) => row.kind === 'study' && row.phase !== '과제' ? row.end - row.start : 0;

export function validateSchedule(schedule) {
  const ids = new Set();
  let previousDate;
  for (const day of schedule.days) {
    if (previousDate && Date.parse(day.date) - Date.parse(previousDate) !== 86400000) throw new Error('계획 날짜가 연속되지 않습니다.');
    let cursor = 0;
    for (const row of day.rows) {
      if (row.start !== cursor || row.end <= row.start || row.end > 1440) throw new Error(`${day.date} 시간표에 겹침 또는 누락이 있습니다.`);
      if (ids.has(row.id)) throw new Error('계획 항목 ID가 중복됩니다.');
      ids.add(row.id);
      cursor = row.end;
    }
    if (cursor !== 1440) throw new Error(`${day.date} 하루 일정이 완성되지 않았습니다.`);
    previousDate = day.date;
  }
  if (schedule.days[0]?.date !== schedule.start || previousDate !== schedule.end) throw new Error('계획 기간이 일치하지 않습니다.');
}

export function readDatedRecords(raw) {
  const saved = JSON.parse(raw);
  if (![1, 2].includes(saved.version) || saved.type !== 'dated-final-plan' || !saved.records || Array.isArray(saved.records) || typeof saved.records !== 'object') throw new Error('날짜별 계획표의 기록 파일을 선택하세요.');
  const records = {};
  for (const [id, record] of Object.entries(saved.records)) {
    if (!/^dated:[\w:.-]+$/.test(id) || !record || typeof record.done !== 'boolean' || !Number.isInteger(record.actual) || record.actual < 0 || record.actual > 1440 || typeof record.note !== 'string' || record.note.length > 5000) throw new Error('기록 형식이 올바르지 않습니다.');
    records[id] = { done: record.done, actual: record.actual, note: record.note };
  }
  return records;
}

export function validateTodoFields(value) {
  if (!value || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 300 || typeof value.details !== 'string' || value.details.length > 5000 || !['astro1', 'emwaves', 'advmech', 'mechexp', 'project'].includes(value.slug)) throw new Error('제목·과목·상세 내용 형식을 확인하세요.');
  const date = value.date;
  if (typeof date !== 'string' || date && (!/^20\d{2}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error('올바른 날짜를 입력하거나 비워 두세요.');
  return { title: value.title.trim(), slug: value.slug, date, details: value.details };
}

export function readDatedBackup(raw) {
  const records = readDatedRecords(raw), saved = JSON.parse(raw);
  const customTodos = [], todoEdits = {};
  if (saved.version === 2) {
    if (!Array.isArray(saved.customTodos) || saved.customTodos.length > 1000 || !saved.todoEdits || typeof saved.todoEdits !== 'object' || Array.isArray(saved.todoEdits)) throw new Error('할 일 백업 형식이 올바르지 않습니다.');
    const ids = new Set();
    for (const task of saved.customTodos) {
      if (!task || !/^dated:custom:[\w-]+$/.test(task.id) || ids.has(task.id)) throw new Error('직접 추가한 할 일 ID가 올바르지 않습니다.');
      ids.add(task.id);
      customTodos.push({ id: task.id, ...validateTodoFields(task) });
    }
    for (const [id, edit] of Object.entries(saved.todoEdits)) {
      if (!/^dated:[\w:.-]+$/.test(id) || id.startsWith('dated:custom:')) throw new Error('수정한 할 일 ID가 올바르지 않습니다.');
      todoEdits[id] = validateTodoFields(edit);
    }
  }
  return { records, customTodos, todoEdits };
}
