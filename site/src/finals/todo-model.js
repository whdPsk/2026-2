import { isTask } from './dated-model.js';

export function taskSubject(row) {
  return row.slug || (row.kind === 'assignment' && row.title.includes('전파광') ? 'emwaves' : row.kind === 'assignment' && row.title.includes('기공실') ? 'mechexp' : 'project');
}

// Keep schedule IDs and keep fixed reservations when a task moves to another date.
export function editableTodos(schedule, { customTodos = [], todoEdits = {} } = {}) {
  const rows = schedule.days.flatMap((day) => day.rows.filter(isTask).map((row) => {
    const original = { ...row, slug: taskSubject(row), date: day.date };
    const edit = todoEdits[row.id];
    return { ...original, ...edit, original, edited: !!edit, floating: !!edit && edit.date !== day.date,
      units: edit && edit.slug !== original.slug ? [] : row.units };
  }));
  return [...rows, ...customTodos.map((r) => ({ ...r, custom: true, floating: true, kind: 'project', units: [] }))];
}

export function subjectTodos(schedule, courses, records, { period = 'all', today, subject = 'all', hideDone = false, customTodos = [], todoEdits = {} } = {}) {
  const groups = [...courses.map(({ slug, title }) => ({ slug, title, rows: [] })), { slug: 'project', title: '발표·프로젝트·기타', rows: [] }];
  const bySlug = new Map(groups.map((g) => [g.slug, g]));
  for (const row of editableTodos(schedule, { customTodos, todoEdits })) {
    if (period === 'today' && row.date !== today || period === 'upcoming' && (!row.date || row.date < today)) continue;
    const group = bySlug.get(row.slug) || bySlug.get('project');
    group.rows.push({ ...row, done: !!records[row.id]?.done });
  }
  return groups.filter((g) => subject === 'all' || g.slug === subject).map((g) => ({
    ...g, total: g.rows.length, done: g.rows.filter((r) => r.done).length,
    rows: g.rows.filter((r) => !hideDone || !r.done).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.floating ? 1440 : a.start) - (b.floating ? 1440 : b.start)),
  }));
}
