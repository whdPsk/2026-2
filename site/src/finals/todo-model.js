import { isTask } from './dated-model.js';

export function taskSubject(row) {
  return row.slug || (row.kind === 'assignment' && row.title.includes('전파광') ? 'emwaves' : row.kind === 'assignment' && row.title.includes('기공실') ? 'mechexp' : 'project');
}

// Keep schedule IDs and keep fixed reservations when a task moves to another date.
export function editableTodos(schedule, { customTodos = [], todoEdits = {}, deletedTodos = [], includeDeleted = false } = {}) {
  const rows = schedule.days.flatMap((day) => day.rows.filter(isTask).map((row) => {
    const original = { ...row, slug: taskSubject(row), date: day.date };
    const edit = todoEdits[row.id];
    return { ...original, ...edit, original, edited: !!edit, floating: !!edit && edit.date !== day.date,
      units: edit?.units ?? (edit && edit.slug !== original.slug ? [] : row.units) };
  }));
  return [...rows, ...customTodos.map((r) => ({ ...r, custom: true, floating: true, kind: 'project', units: r.units || [] }))].filter((r) => includeDeleted || !deletedTodos.includes(r.id));
}

export function examTodos(catalog, { customTodos = [], todoEdits = {}, deletedTodos = [], includeDeleted = false } = {}) {
  const rows = catalog.map((original) => {
    const edit = todoEdits[original.id];
    const changedSubject = edit && edit.slug !== original.slug;
    return { ...original, ...edit, original, edited: !!edit, floating: true,
      units: edit?.units ?? (changedSubject ? [] : original.units), sources: changedSubject ? [] : original.sources };
  });
  return [...rows, ...customTodos.map((r) => ({ ...r, custom: true, floating: true, kind: 'study', category: '직접 추가', units: r.units || [] }))]
    .filter((r) => includeDeleted || !deletedTodos.includes(r.id));
}

export function subjectTodos(schedule, courses, records, { period = 'all', today, subject = 'all', hideDone = false, customTodos = [], todoEdits = {}, deletedTodos = [], rows = null, sourceOrder = false } = {}) {
  const groups = [...courses.map(({ slug, title }) => ({ slug, title, rows: [] })), { slug: 'project', title: '발표·프로젝트·기타', rows: [] }];
  const bySlug = new Map(groups.map((g) => [g.slug, g]));
  for (const row of rows || editableTodos(schedule, { customTodos, todoEdits, deletedTodos })) {
    if (period === 'today' && row.date !== today || period === 'upcoming' && (!row.date || row.date < today)) continue;
    const group = bySlug.get(row.slug) || bySlug.get('project');
    group.rows.push({ ...row, done: !!records[row.id]?.done });
  }
  return groups.filter((g) => subject === 'all' || g.slug === subject).map((g) => ({
    ...g, total: g.rows.length, done: g.rows.filter((r) => r.done).length,
    rows: g.rows.filter((r) => !hideDone || !r.done).sort((a, b) => sourceOrder ? 0 : (a.date || '9999').localeCompare(b.date || '9999') || (a.floating ? 1440 : a.start) - (b.floating ? 1440 : b.start)),
  }));
}

export function todoReading(row, course) {
  const catalog = course?.referenceUnits || course?.units || [];
  const units = (row.units || []).map((id) => catalog.find((u) => u.id === id)).filter(Boolean);
  const book = course?.bookAbbrev || '교재';
  const sections = [...new Set(units.map((u) => `${u.ch}장${u.secs && u.secs !== String(u.ch) ? ' §' + u.secs : ''}`))];
  const summary = [units.length ? `노트 ${units.map((u) => u.id.toUpperCase()).join('·')} · ${book} ${sections.join(', ')}` : '', row.reading || ''].filter(Boolean).join(' · ');
  return { units, book, summary: summary || (row.slug === 'project' ? '프로젝트 작업 · 교재 단원 해당 없음' : '읽을 범위 미지정 · 수정에서 단원 선택') };
}
