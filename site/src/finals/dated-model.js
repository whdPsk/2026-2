export const DATED_RECORD_KEY = 'final-plan.2026-2.dated.v1';
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
  if (saved.version !== 1 || saved.type !== 'dated-final-plan' || !saved.records || Array.isArray(saved.records) || typeof saved.records !== 'object') throw new Error('날짜별 계획표의 기록 파일을 선택하세요.');
  const records = {};
  for (const [id, record] of Object.entries(saved.records)) {
    if (!/^dated:[\w:.-]+$/.test(id) || typeof record.done !== 'boolean' || !Number.isInteger(record.actual) || record.actual < 0 || record.actual > 1440 || typeof record.note !== 'string' || record.note.length > 5000) throw new Error('기록 형식이 올바르지 않습니다.');
    records[id] = { done: record.done, actual: record.actual, note: record.note };
  }
  return records;
}
