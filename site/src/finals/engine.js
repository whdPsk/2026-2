// Pure scheduling functions, shared by the UI and schedule checks.
export const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const DAY = 86400000;
export const dayNumber = (s) => Date.parse(s + 'T00:00:00Z') / DAY;
export const isoDay = (n) => new Date(n * DAY).toISOString().slice(0, 10);
export const addDays = (s, n) => isoDay(dayNumber(s) + n);
export const weekday = (s) => new Date(s + 'T00:00:00Z').getUTCDay();
export const clock = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const kstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

export function parseWindows(text) {
  if (!text.trim()) return [];
  const windows = text.split(',').map((s) => {
    const m = /^\s*([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)\s*$/.exec(s);
    if (!m) throw new Error('시간은 20:30-23:30처럼 입력하세요. 여러 구간은 쉼표로 나눕니다.');
    const start = +m[1] * 60 + +m[2], end = +m[3] * 60 + +m[4];
    if (end <= start) throw new Error('종료 시각은 시작 시각보다 늦어야 합니다. 자정을 넘는 구간은 사용할 수 없습니다.');
    return { start, end };
  }).sort((a, b) => a.start - b.start);
  if (windows.some((w, i) => i && w.start < windows[i - 1].end)) throw new Error('같은 요일의 공부 시간이 겹칩니다.');
  return windows;
}

export function defaultSettings(data) {
  return { start: data.defaults.start, availability: { ...data.defaults.availability }, blocked: '',
    exams: Object.fromEntries(data.courses.map((c) => [c.slug, { ...c.exam }])) };
}

export function addCourseExams(settings, courses) {
  const exams = { ...Object.fromEntries(courses.map((c) => [c.slug, { ...c.exam }])), ...settings.exams };
  const confirmed = courses.find((c) => c.slug === 'advmech')?.exam;
  const previous = settings.exams?.advmech;
  if (confirmed?.confirmedAt === '2026-11-23' && !previous?.confirmedAt && ['2026-12-09', '2026-12-14'].includes(previous?.date)) {
    exams.advmech = { ...previous, ...confirmed };
  }
  const astro = courses.find((c) => c.slug === 'astro1')?.exam;
  const oldAstro = settings.exams?.astro1;
  if (astro?.confirmedAt === '2026-11-27' && oldAstro?.date === '2026-12-10' && (!oldAstro.confirmedAt || oldAstro.confirmedAt < astro.confirmedAt)) {
    exams.astro1 = { ...oldAstro, ...astro };
  }
  return { ...settings, exams };
}

export function validateSettings(settings, courses) {
  const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(dayNumber(s)) && isoDay(dayNumber(s)) === s;
  if (!validDate(settings.start)) throw new Error('시작일을 확인하세요.');
  for (const c of courses) {
    const e = settings.exams?.[c.slug];
    if (!e || !validDate(e.date) || typeof e.tentative !== 'boolean' || e.date <= settings.start || dayNumber(e.date) - dayNumber(settings.start) > 180) throw new Error('시험일은 시작일 이후 180일 이내로 입력하세요.');
  }
  for (let i = 0; i < 7; i++) parseWindows(settings.availability[String(i)] ?? '');
  for (const s of settings.blocked.split(',').map((s) => s.trim()).filter(Boolean)) if (!validDate(s)) throw new Error('제외일은 2026-11-15처럼 입력하세요.');
}

export function readBackup(raw, courses) {
  const incoming = JSON.parse(raw);
  if (incoming.version !== 1 || !incoming.records || typeof incoming.records !== 'object' || Array.isArray(incoming.records)) throw new Error('기말 계획표 백업 파일을 선택하세요.');
  incoming.settings = addCourseExams(incoming.settings, courses);
  validateSettings(incoming.settings, courses);
  const records = {};
  for (const [id, r] of Object.entries(incoming.records)) {
    if (!/^[\w가-힣:.-]{1,160}$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id) || !r || typeof r.done !== 'boolean' || typeof r.note !== 'string' || r.note.length > 5000 || !Number.isInteger(r.actual) || r.actual < 0 || r.actual > 1440) throw new Error('백업 기록 형식이 올바르지 않습니다.');
    records[id] = { done: r.done, note: r.note, actual: r.actual };
  }
  return { settings: incoming.settings, records };
}

export function makeTasks(courses, settings) {
  const tasks = [];
  const examDates = new Set(Object.values(settings.exams).map((e) => e.date));
  const blocked = new Set(settings.blocked.split(',').map((s) => s.trim()));
  for (const c of courses) {
    const exam = settings.exams[c.slug].date;
    const start = c.planStart > settings.start ? c.planStart : settings.start;
    const days = Math.max(1, dayNumber(exam) - dayNumber(start) - 18);
    c.units.forEach((u, i) => {
      const first = addDays(start, Math.floor(i * days / c.units.length));
      const base = { slug: c.slug, unit: u.id, title: u.title, deadline: addDays(exam, -1), lec: u.lec, studyMode: c.studyMode };
      const id = `${c.slug}:${u.id}`;
      tasks.push({ ...base, id: id + ':learn', phase: '개념·유도', minutes: 50, release: first, target: first,
        after: i ? `${c.slug}:${c.units[i - 1].id}:learn` : null, gap: 0 });
      tasks.push({ ...base, id: id + ':solve', phase: '백지 풀이', minutes: 50, release: addDays(first, 4), target: addDays(first, 4), after: id + ':learn', gap: 2 });
      tasks.push({ ...base, id: id + ':recall', phase: '간격 복습', minutes: 25, release: addDays(first, 10), target: addDays(first, 10), after: id + ':solve', gap: 2 });
    });
    for (const [phase, offset, minutes] of [['모의 풀이', -6, 100], ['모의 오답', -5, 50], ['최종 회상', -1, 50]]) {
      let date = addDays(exam, offset);
      if (phase === '최종 회상') {
        while (date > settings.start && (examDates.has(date) || blocked.has(date) || !parseWindows(settings.availability[weekday(date)]).some((w) => w.end - w.start >= minutes))) date = addDays(date, -1);
      }
      const code = { '모의 풀이': 'mock', '모의 오답': 'correction', '최종 회상': 'final' }[phase];
      tasks.push({ slug: c.slug, id: `${c.slug}:${code}`, studyMode: c.studyMode, title: phase === '모의 풀이' ? (c.studyMode === 'quiz' ? '실험 퀴즈 혼합 문제 · 연습용 100분' : '기말 범위 혼합 문제 · 연습용 100분') : phase === '모의 오답' ? '모의 풀이 첫 오류부터 재현' : '조건·부호·단위와 핵심 유도 확인', phase, minutes, release: date < settings.start ? settings.start : date, target: date, deadline: addDays(exam, -1),
        after: phase === '모의 오답' ? `${c.slug}:mock` : null, gap: phase === '모의 오답' ? 1 : 0 });
    }
  }
  return tasks;
}

export function generatePlan(data, settings) {
  validateSettings(settings, data.courses);
  const tasks = makeTasks(data.courses, settings), placed = new Map(), days = [];
  const end = Object.values(settings.exams).map((e) => e.date).sort().at(-1);
  const examDates = new Set(Object.values(settings.exams).map((e) => e.date));
  const blocked = new Set(settings.blocked.split(',').map((s) => s.trim()));
  for (let date = settings.start; date <= end; date = addDays(date, 1)) {
    const dow = weekday(date), rows = [];
    const fixed = data.defaults.fixed.filter((f) => f.days.includes(dow)).sort((a, b) => (a.start ?? 1440) - (b.start ?? 1440));
    // Every exam day stays free: two courses have no confirmed exam time yet.
    let windows = blocked.has(date) || examDates.has(date) ? [] : parseWindows(settings.availability[dow]);
    for (const f of fixed.filter((f) => f.start !== null)) {
      windows = windows.flatMap((w) => w.end <= f.start || w.start >= f.end ? [w] : [
        ...(w.start < f.start ? [{ start: w.start, end: f.start }] : []),
        ...(w.end > f.end ? [{ start: f.end, end: w.end }] : []),
      ]);
    }
    for (const window of windows) {
      let cursor = window.start;
      const available = data.courses.filter((c) => settings.exams[c.slug].date > date);
      if (!available.length) continue;
      while (cursor + 10 <= window.end) {
        const candidates = tasks.filter((t) => !placed.has(t.id) && t.release <= date && date <= t.deadline && t.minutes <= window.end - cursor && (!t.after || (placed.has(t.after) && addDays(placed.get(t.after), t.gap) <= date)));
        const score = (t) => {
          // Leave room for later spaced reviews, rather than exhausting the last days on prerequisites.
          const chainDays = t.phase === '개념·유도' ? 4 : t.phase === '백지 풀이' ? 2 : 0;
          const slack = dayNumber(t.deadline) - dayNumber(date) - chainDays;
          return (dayNumber(date) - dayNumber(t.target)) * 5 +
            (slack <= 2 ? 2000 / Math.max(1, slack + 1) : 30 / slack) +
            (['모의 풀이', '모의 오답', '최종 회상'].includes(t.phase) ? 1000 : 0);
        };
        candidates.sort((a, b) => score(b) - score(a) || a.target.localeCompare(b.target) || a.id.localeCompare(b.id));
        let task = candidates[0];
        if (!task) {
          const c = [...available].sort((a, b) => settings.exams[a.slug].date.localeCompare(settings.exams[b.slug].date))[days.length % available.length];
          const minutes = Math.min(25, window.end - cursor);
          task = { id: `buffer:${c.slug}:${date}:${cursor}`, slug: c.slug, studyMode: c.studyMode, title: c.studyMode === 'quiz' ? '실험 원리·퀴즈 오답 보완' : '새 강의·지정 과제 확인 / 미완료·오답 보완', phase: '보완', minutes };
        }
        rows.push({ ...task, date, start: cursor, end: cursor + task.minutes });
        placed.set(task.id, date);
        cursor += task.minutes;
        if (cursor < window.end) {
          const rest = Math.min(10, window.end - cursor);
          rows.push({ id: `rest:${date}:${cursor}`, date, start: cursor, end: cursor + rest, minutes: rest, phase: '휴식', title: '눈·손목 쉬기, 물 마시기' });
          cursor += rest;
        }
      }
      if (cursor < window.end) rows.push({ id: `rest:${date}:${cursor}`, date, start: cursor, end: window.end, minutes: window.end - cursor, phase: '휴식', title: '마무리·이동 여유' });
    }
    days.push({ date, dow, rows, fixed, exams: data.courses.filter((c) => settings.exams[c.slug].date === date), blocked: blocked.has(date) });
  }
  return { days, tasks, backlog: tasks.filter((t) => !placed.has(t.id)) };
}

export function taskSteps(row) {
  if (row.phase === '휴식') return [{ minutes: row.minutes, title: row.title }];
  if (row.phase === '개념·유도') return [{ minutes: 5, title: '선수 개념·오늘의 출발식 확인' }, { minutes: 20, title: `${row.title} · ${row.studyMode === 'quiz' ? '퀴즈 복기와 교재에서 실험 원리 확인' : '강의노트와 교재 읽기'}` }, { minutes: 20, title: '핵심 유도 하나를 종이에 전개' }, { minutes: 5, title: '가정·단위·막힌 지점 기록' }];
  if (row.phase === '백지 풀이') {
    const practice = {
      emwaves: 'Ch.11–12 예제·지정 과제의 원형을 처음부터 유도한 뒤 조건 하나를 바꾸고 달라지는 식 확인',
      advmech: '좌표와 가정을 먼저 적고 운동방정식을 세운 뒤, 앞 소문항 결과를 써서 다음 소문항 풀이',
      mechexp: '해당 단원의 퀴즈 유형에서 장치·그래프를 그리고 가정을 적은 뒤 유도·계산과 단위 확인',
    }[row.slug] ?? '답을 가리고 끝까지 풀기 · 중간식과 검산 포함';
    return [
      { minutes: 5, title: row.studyMode === 'quiz' ? '출발식 회상 · 단원의 퀴즈 유형이나 체크포인트 1문제 선택' : '지난 출발식 회상 · 예제 또는 지정 과제 1문제 선택' },
      { minutes: 30, title: practice },
      { minutes: 10, title: '해설 대조 · 첫 오류를 고친 뒤 다시 전개' },
      { minutes: 5, title: '재현 실패는 미완료로 남기고 재도전 기록' },
    ];
  }
  if (row.phase === '간격 복습') return [{ minutes: 5, title: `${row.title} · 조건과 핵심식 회상` }, { minutes: 15, title: '가장 막혔던 유도·문항을 백지 재현' }, { minutes: 5, title: '책과 대조하고 다음 복습 지점 기록' }];
  if (row.phase === '모의 풀이') {
    const practice = {
      emwaves: 'Ch.11–12 영어 원문과 조건 변형 문제를 시간 제한을 두고 풀기 · 가정부터 최종식과 극한 검산까지',
      advmech: '기말 범위의 연속 소문항을 시간 제한을 두고 풀기 · 앞에서 구한 운동방정식으로 물리량이나 운동까지 계산',
      mechexp: '고체·열·유체·진동의 퀴즈 유형을 섞어 시간 제한 풀이 · 그림·가정·유도·계산과 단위 확인',
    }[row.slug] ?? '조건 해석부터 최종 답까지 시간 제한 풀이';
    return [
      { minutes: 5, title: row.studyMode === 'quiz' ? '퀴즈 복기·기출과 체크포인트에서 문제를 골라 답 가리기' : '실제 지정 과제·예제 중 범위 안 문제를 골라 답 가리기' },
      { minutes: 90, title: practice },
      { minutes: 5, title: '미완성·불확실 문항 표시 · 채점은 다음 블록' },
    ];
  }
  if (row.phase === '모의 오답') return [{ minutes: 15, title: '해설 대조 · 첫 오류의 원인 분류' }, { minutes: 30, title: '실패 문항을 같은 원문으로 다시 풀기' }, { minutes: 5, title: '끝까지 재현한 문항만 완료 기록' }];
  if (row.phase === '최종 회상') return [{ minutes: 10, title: '조건·부호·단위와 출발식 백지 회상' }, { minutes: 30, title: '범위 안 대표 유도·오답 재현' }, { minutes: 10, title: '해설 대조 · 남은 오류·시험 공지 확인' }];
  if (row.studyMode === 'quiz') return [{ minutes: row.minutes, title: '실험 원리·장치·측정 가정과 오차를 설명하고, 퀴즈 오답을 다시 풀기. 범위 공지와 실제 수행 내용은 메모에 기록.' }];
  return [{ minutes: row.minutes, title: '이번 주 강의·범위·새 지정 과제 확인. 미완료 문항을 우선 재도전하고, 사용할 자료가 없으면 다음 단원 예습. 실제 수행 내용은 메모에 기록.' }];
}
