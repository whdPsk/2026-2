import { isTask } from './dated-model.js';

// Keep schedule IDs: checking a task updates the same record in every view.
export function subjectTodos(schedule, courses, records, { period = 'all', today, subject = 'all', hideDone = false } = {}) {
  const groups = [...courses.map(({ slug, title }) => ({ slug, title, rows: [] })), { slug: 'project', title: '발표·프로젝트·기타', rows: [] }];
  const bySlug = new Map(groups.map((g) => [g.slug, g]));
  for (const day of schedule.days) {
    if (period === 'today' && day.date !== today || period === 'upcoming' && day.date < today) continue;
    for (const row of day.rows.filter(isTask)) {
      const group = bySlug.get(row.slug) || bySlug.get('project');
      group.rows.push({ ...row, date: day.date, done: !!records[row.id]?.done });
    }
  }
  return groups.filter((g) => subject === 'all' || g.slug === subject).map((g) => ({
    ...g, total: g.rows.length, done: g.rows.filter((r) => r.done).length,
    rows: g.rows.filter((r) => !hideDone || !r.done),
  }));
}
