import { asset, esc } from '../course/util.js';
import { clock, weekday, WEEK, kstToday } from './engine.js';
import { DATED_RECORD_KEY, PREVIOUS_DATED_RECORD_KEY, LEGACY_DATED_RECORD_KEY, isTask, studyMinutes, validateSchedule, readDatedBackup, validateTodoFields } from './dated-model.js';
import { subjectTodos, editableTodos, examTodos, todoReading } from './todo-model.js';

const labels = { study: '시험 공부', assignment: '과제·보고서', project: '발표·프로젝트', experiment: '실험 예약', meeting: '회의 예약', class: '수업', lab: '랩인턴', sleep: '수면', meal: '식사', travel: '이동', break: '휴식', recovery: '회복·준비', exam: '시험·예약' };
const hours = (minutes) => `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ''}`;
const dateLabel = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))} (${WEEK[weekday(date)]})`;
const lifeKinds = new Set(['sleep', 'meal', 'travel', 'break', 'recovery']);

export function mountDatedPlan(root, data) {
  const schedule = data.schedule;
  validateSchedule(schedule);
  const courses = new Map(data.courses.map((c) => [c.slug, c]));
  const allRows = schedule.days.flatMap((day) => day.rows);
  let records = {}, message = '', view = new URLSearchParams(location.search).get('view') === 'todo' ? 'todo' : 'day', showRoutine = true;
  let customTodos = [], todoEdits = {}, deletedTodos = [], editingId = null, deletedTodo = null;
  let todoSource = new URLSearchParams(location.search).get('source') === 'schedule' ? 'schedule' : 'exam';
  const state = (includeDeleted = false) => ({ customTodos, todoEdits, deletedTodos, includeDeleted });
  const examTasks = (includeDeleted = false) => examTodos(data.examTodos || [], state(includeDeleted));
  const tasks = (includeDeleted = false) => [...editableTodos(schedule, state(includeDeleted)), ...examTasks(includeDeleted).filter((r) => !r.custom)];
  const visibleTasks = (includeDeleted = false) => todoSource === 'exam' ? examTasks(includeDeleted) : editableTodos(schedule, state(includeDeleted));
  let todoPeriod = 'all', todoSubject = 'all', hideDone = false;
  let selected = schedule.days.findIndex((day) => day.date >= kstToday());
  if (selected < 0) selected = schedule.days.length - 1;
  try {
    const raw = localStorage.getItem(DATED_RECORD_KEY) ?? localStorage.getItem(PREVIOUS_DATED_RECORD_KEY) ?? localStorage.getItem(LEGACY_DATED_RECORD_KEY);
    if (raw) ({ records, customTodos, todoEdits, deletedTodos } = readDatedBackup(raw));
  } catch { message = '저장된 기록을 읽지 못했습니다. 백업 파일을 가져오거나 새 기록을 시작하세요.'; }

  const subjectName = (row) => courses.get(row.slug)?.title || labels[row.kind];
  const payload = () => ({ type: 'dated-final-plan', version: 3, records, customTodos, todoEdits, deletedTodos });
  function save() {
    try { localStorage.setItem(DATED_RECORD_KEY, JSON.stringify(payload())); message = '기록을 이 브라우저에 저장했습니다.'; }
    catch { message = '브라우저 저장에 실패했습니다. 기록 백업을 내려받으세요.'; }
    root.querySelector('#dated-status').textContent = message;
    if (root.querySelector('#todo-status')) root.querySelector('#todo-status').textContent = message;
  }
  function refs(row) {
    if (!courses.has(row.slug)) return '';
    const links = (row.units || []).map((id) => {
      const course = courses.get(row.slug);
      const unit = (course.referenceUnits || course.units).find((u) => u.id === id);
      if (!unit) return "";
      return `<a href="${asset(`${row.slug}/#/${id}`)}">${esc(id.toUpperCase())} · ${esc(unit.title)} · ${esc(courses.get(row.slug).bookAbbrev || '교재')} ${unit.ch}장${unit.secs && unit.secs !== String(unit.ch) ? ` §${esc(unit.secs)}` : ''} ↗</a>`;
    });
    if (row.sources) {
      for (const source of row.sources) {
        const parameter = source.route === 'lecture' ? 'l' : source.route === 'examples' ? 'e' : 'p';
        links.push(`<a href="${asset(`${row.slug}/#/${source.route}${source.key ? '?' + parameter + '=' + encodeURIComponent(source.key) : ''}`)}">${esc(source.label)} ↗</a>`);
      }
      return `<div class="fp-refs">${links.join('')}</div>`;
    }
    const route = row.slug === 'mechexp' ? 'examples' : row.phase === '새 강의 복습' ? 'lecture' : 'hw';
    links.push(`<a href="${asset(`${row.slug}/#/${route}`)}">${row.slug === 'mechexp' ? '예상 퀴즈·풀이' : route === 'lecture' ? '강의·공지' : '지정 과제'} ↗</a>`);
    return `<div class="fp-refs">${links.join('')}</div>`;
  }
  function rowHTML(row, reserved = true) {
    if (isTask(row) && reserved) {
      if (deletedTodos.includes(row.id)) return `<div class="dp-routine"><time>${clock(row.start)}–${clock(row.end)}</time><div><b>빈 작업 예약</b><small>할 일을 삭제했습니다. 과목별 할 일의 삭제 목록에서 복구할 수 있습니다.</small></div></div>`;
      const effective = tasks().find((r) => r.id === row.id);
      if (effective?.floating) return `<div class="dp-routine"><time>${clock(row.start)}–${clock(row.end)}</time><div><b>공부·작업 예약</b><small>${esc(effective.title)}: ${effective.date ? dateLabel(effective.date) : '날짜 미지정'} 할 일로 이동. 이 시간은 비워 둔 예약입니다.</small></div></div>`;
      row = effective || row;
    }
    if (!isTask(row)) return `<div class="dp-routine" data-kind="${row.kind}"><time>${clock(row.start)}–${clock(row.end)}</time><div><b>${esc(row.title)}</b>${row.details ? `<small>${esc(row.details)}</small>` : ''}</div><span>${labels[row.kind]}</span></div>`;
    const record = records[row.id] || {};
    return `<article class="fp-task ${record.done ? 'is-done' : ''}" data-subject="${row.slug || 'project'}"><div class="fp-task-time">${row.floating ? '<time>시간 미지정</time>' : `<time>${clock(row.start)}<span>— ${clock(row.end)}</span></time><b>${row.end - row.start}분</b>`}</div><div class="fp-task-body"><div class="fp-task-meta"><span>${esc(subjectName(row))}</span><span>${esc(row.phase || labels[row.kind])}</span></div><h3>${esc(row.title)}</h3><p class="dp-goal">${esc(row.details)}</p>${refs(row)}<details><summary>실제 시간·메모</summary><div class="fp-record"><label>실제 작업 시간 (분)<input type="number" min="0" max="1440" step="1" data-actual="${row.id}" value="${record.actual ?? ''}"></label><label>막힌 지점·다음 할 일<textarea rows="2" maxlength="5000" data-note="${row.id}">${esc(record.note || '')}</textarea></label></div></details></div><label class="fp-check"><input type="checkbox" data-complete="${row.id}" ${record.done ? 'checked' : ''}><span>완료</span></label></article>`;
  }
  function dayHTML(day) {
    const total = day.rows.reduce((n, row) => n + studyMinutes(row), 0);
    const visible = day.rows.filter((row) => showRoutine || isTask(row) || row.kind === 'exam');
    return `<div class="fp-day-head"><h2>${dateLabel(day.date)}</h2><span>시험 공부 ${hours(total)}</span></div>${tasks().filter((r) => r.floating && r.date === day.date).length ? `<section class="td-day-extra"><h3>직접 추가·옮긴 할 일 · 시간 미지정</h3>${tasks().filter((r) => r.floating && r.date === day.date).map((r) => rowHTML(r, false)).join('')}</section>` : ''}${visible.map((r) => rowHTML(r)).join('')}`;
  }
  function weekHTML() {
    const days = schedule.days.slice(selected, selected + 7).map((day) => {
      const visible = day.rows.filter((row) => showRoutine || isTask(row) || row.kind === 'exam');
      const groups = [];
      for (const row of visible) {
        const last = groups.at(-1);
        if (lifeKinds.has(row.kind) && last?.life && last.rows.at(-1).end === row.start) last.rows.push(row);
        else groups.push({ life: lifeKinds.has(row.kind), rows: [row] });
      }
      const cards = groups.map((group) => {
        const source = group.rows[0];
        const task = tasks().find((r) => r.id === source.id);
        const row = deletedTodos.includes(source.id) ? { ...source, title: '빈 작업 예약 · 할 일 삭제됨', id: '', kind: 'lab' } : task?.floating ? { ...source, title: '공부·작업 예약 · 할 일 날짜 이동', id: '', kind: 'lab' } : task || source;
        if (group.life) {
          const names = [...new Set(group.rows.map((r) => labels[r.kind]))].join('·');
          return `<details class="dp-week-life"><summary><time>${clock(row.start)}–${clock(group.rows.at(-1).end)}</time><span>${names}</span></summary><div>${group.rows.map((r) => `<p><time>${clock(r.start)}–${clock(r.end)}</time> ${esc(r.title)}</p>`).join('')}</div></details>`;
        }
        const routine = !isTask(row) && row.kind !== 'exam';
        return `<button class="fp-week-task ${routine ? 'dp-week-routine' : ''} ${records[row.id]?.done ? 'is-done' : ''}" data-date="${day.date}" data-subject="${row.slug || 'project'}" data-kind="${row.kind}"><time>${clock(row.start)}–${clock(row.end)}</time><span>${esc(subjectName(row))}</span><b>${esc(row.title)}</b></button>`;
      }).join('');
      return `<section><button class="fp-week-date" data-date="${day.date}">${dateLabel(day.date)}</button><p>공부 ${hours(day.rows.reduce((n, row) => n + studyMinutes(row), 0))}</p>${tasks().filter((r) => r.floating && r.date === day.date).map((r) => `<button class="fp-week-task ${records[r.id]?.done ? 'is-done' : ''}" data-date="${day.date}" data-subject="${r.slug}"><time>시간 미지정</time><b>${esc(r.title)}</b></button>`).join('')}${cards}</section>`;
    });
    return `<div class="fp-week">${days.join('')}</div>`;
  }
  function renderTotals() {
    if (view === 'todo' && todoSource === 'exam') {
      const rows = examTasks(), done = rows.filter((r) => records[r.id]?.done).length;
      root.querySelector('#dated-progress').innerHTML = `<h2>시험 자료 체크 ${done}/${rows.length}</h2><progress value="${done}" max="${rows.length || 1}" aria-label="시험 자료 완료"></progress><p>단원 학습 → 수업 필기 확인 → 지정 문제 재풀이. 기존 시간표의 완료 기록과 별도로 체크합니다.</p>`;
      return;
    }
    const activeRows = allRows.filter((r) => !deletedTodos.includes(r.id));
    const total = activeRows.reduce((n, row) => n + studyMinutes(row), 0);
    const done = activeRows.reduce((n, row) => n + (records[row.id]?.done ? studyMinutes(row) : 0), 0);
    const actual = tasks().reduce((n, row) => n + (records[row.id]?.actual || 0), 0);
    root.querySelector('#dated-progress').innerHTML = `<h2>시험 공부 ${hours(total)}</h2><p>새 강의 복습·자율 휴식 여유 포함 · 과제·보고서 별도</p><progress value="${done}" max="${total || 1}" aria-label="시험 공부 완료 시간"></progress><p>완료 ${hours(done)} · 전체 작업 실제 기록 ${hours(actual)}</p><div class="fp-subject-totals">${data.courses.map((c) => `<div><span>${esc(c.title)}</span><b>${hours(activeRows.filter((r) => r.slug === c.slug).reduce((n, r) => n + studyMinutes(r), 0))}</b></div>`).join('')}</div>`;
  }
  function todoHTML() {
    const today = kstToday();
    const groups = subjectTodos(schedule, data.courses, records, { period: todoPeriod, today, subject: todoSubject, hideDone, rows: visibleTasks(), sourceOrder: todoSource === 'exam' });
    const count = groups.reduce((n, g) => n + g.total, 0), done = groups.reduce((n, g) => n + g.done, 0);
    return `<div class="td-heading"><div><p class="fp-eyebrow">SUBJECT TO-DO</p><h2>${todoSource === 'exam' ? '시험 자료별 체크리스트' : '기존 시간표의 할 일'}</h2><p>교재·노트와 날짜별 자료, 지정 문제를 하나씩 공부하세요.</p></div><strong id="todo-count" role="status">${done} / ${count}<small>선택한 범위 완료</small></strong></div>
      <div class="td-source-tabs" role="group" aria-label="할 일 목록 선택"><button class="tool" data-todo-source="exam" aria-pressed="${todoSource === 'exam'}">시험 공부</button><button class="tool" data-todo-source="schedule" aria-pressed="${todoSource === 'schedule'}">기존 시간표 TODO</button></div>
      <p class="td-source-note">${todoSource === 'exam' ? '교재·사이트 노트 → 수업 필기·강의자료 → 지정 과제 재풀이. 제목의 날짜는 자료 날짜이며, 공부 날짜는 수정에서 지정할 수 있어요. ⋯에서 상세 범위와 자료 링크를 확인하세요. 예정 단원·녹음 누락·미확인 범위는 구분해 두었어요.' : '기존 날짜별 공부·과제 목록과 완료 기록을 그대로 보관합니다.'}</p>
      <div class="td-filters"><label>공부 날짜<select id="todo-period"><option value="all" ${todoPeriod === 'all' ? 'selected' : ''}>전체 (날짜 미정 포함)</option><option value="today" ${todoPeriod === 'today' ? 'selected' : ''}>오늘</option><option value="upcoming" ${todoPeriod === 'upcoming' ? 'selected' : ''}>오늘 이후</option></select></label><label>과목<select id="todo-subject"><option value="all">모든 과목</option>${[...data.courses, { slug: 'project', title: '발표·프로젝트·기타' }].map((c) => `<option value="${c.slug}" ${todoSubject === c.slug ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select></label><label class="td-hide"><input type="checkbox" id="todo-hide" ${hideDone ? 'checked' : ''}>완료한 일 숨기기</label></div>
      <p class="td-storage">이 기기·브라우저에 자동 저장 · 다른 기기로 옮길 때는 기록 백업/가져오기 사용</p>
      <div class="td-actions"><button class="fp-primary" id="todo-add">+ 할 일 추가</button><p id="todo-status" role="status">${esc(message)}</p>${deletedTodo ? '<button class="tool" id="todo-undo">삭제 취소</button>' : ''}</div>
      <div class="td-board">${groups.map((g) => `<section class="td-subject" data-subject="${g.slug}" aria-label="${esc(g.title)} 할 일"><div class="td-subject-head"><h3>${esc(g.title)}</h3><span>${g.done}/${g.total}</span><button class="td-mini" data-add-subject="${g.slug}" aria-label="${esc(g.title)} 할 일 추가">+</button></div><progress value="${g.done}" max="${g.total || 1}" aria-label="${esc(g.title)} 할 일 완료"></progress>${g.rows.length ? todoGroupRows(g.rows) : `<p class="td-empty">${g.total && g.done === g.total ? '이 범위의 할 일을 모두 마쳤어요.' : '이 범위에 예정된 할 일이 없어요.'}</p>`}</section>`).join('')}</div>${trashHTML()}`;
  }
  function todoGroupRows(rows) {
    if (todoSource !== 'exam') return rows.map(todoRowHTML).join('');
    const groups = new Map();
    for (const row of rows) { const key = row.category || '직접 추가'; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row); }
    return [...groups].map(([label, items]) => `<h4 class="td-category">${esc(label)} <span>${items.length}</span></h4>${items.map(todoRowHTML).join('')}`).join('');
  }
  function todoRowHTML(row) {
    const reading = todoReading(row, courses.get(row.slug));
    const date = row.date ? `${Number(row.date.slice(5,7))}/${Number(row.date.slice(8))}` : '미정';
    const canOpen = schedule.days.some((d) => d.date === row.date);
    return `<article class="td-item ${row.done ? 'is-done' : ''}" data-task-id="${row.id}"><label class="td-check"><input type="checkbox" data-complete="${row.id}" ${row.done ? 'checked' : ''}><span>${esc(row.title)}</span></label><div class="td-row-tools">${canOpen ? `<button class="td-date" data-date="${row.date}" aria-label="${dateLabel(row.date)} 일간 계획 열기" title="${row.date}${row.floating ? ' · 시간 미지정' : ' · ' + clock(row.start) + '–' + clock(row.end)}">${date}</button>` : `<span class="td-date" title="${row.date || '날짜 미지정'}">${date}</span>`}<button class="td-mini" data-edit="${row.id}" aria-label="${esc(row.title)} 수정">수정</button><button class="td-mini" data-expand="${row.id}" aria-expanded="false" aria-controls="detail-${row.id}" aria-label="${esc(row.title)} 자료·메모">⋯</button></div><div class="td-reading" title="${esc(reading.summary)}">${esc(reading.summary)}</div><div class="td-detail" id="detail-${row.id}" hidden><p><b>읽을 범위:</b> ${esc(reading.summary)}</p><p class="td-detail-meta">${row.date ? dateLabel(row.date) : '날짜 미지정'} · ${row.floating ? '시간 미지정' : clock(row.start) + '–' + clock(row.end)}${row.custom ? ' · 직접 추가' : row.edited ? ' · 직접 수정' : ''}</p><p>${esc(row.details || '')}</p>${refs(row)}<div class="fp-record"><label>실제 작업 시간 (분)<input type="number" min="0" max="1440" step="1" data-actual="${row.id}" value="${records[row.id]?.actual ?? ''}"></label><label>메모<textarea rows="2" maxlength="5000" data-note="${row.id}">${esc(records[row.id]?.note || '')}</textarea></label></div></div></article>`;
  }
  function trashHTML() {
    const removed = visibleTasks(true).filter((r) => deletedTodos.includes(r.id));
    return removed.length ? `<details class="td-trash"><summary>삭제한 할 일 (${removed.length}) · 복구</summary>${removed.map((r) => `<div><span>${esc(courses.get(r.slug)?.title || '기타')} · ${esc(r.title)}</span><button class="tool" data-restore-task="${r.id}" aria-label="${esc(r.title)} 복구">복구</button></div>`).join('')}</details>` : '';
  }
  function restoreTodo(id) {
    const task = tasks(true).find((r) => r.id === id);
    deletedTodos = deletedTodos.filter((value) => value !== id);
    if (deletedTodo === id) deletedTodo = null;
    if (task) { todoSubject = task.slug; todoPeriod = 'all'; hideDone = false; }
    save(); render(); root.querySelector(`[data-edit="${id}"]`)?.focus({ preventScroll: true });
  }
  function unitChoices(slug, chosen = []) {
    const course = courses.get(slug);
    const units = course?.referenceUnits || course?.units || [];
    root.querySelector('#todo-units').innerHTML = units.length ? units.map((u) => `<label><input type="checkbox" name="units" value="${u.id}" ${chosen.includes(u.id) ? 'checked' : ''}><span>${u.id.toUpperCase()} · ${esc(u.title)} <small>${esc(course.bookAbbrev || '교재')} ${u.ch}장 · §${esc(u.secs)}</small></span></label>`).join('') : '<p>교재 범위는 아래 입력란에 직접 적어 주세요.</p>';
    root.querySelector('#todo-unit-picker>summary').textContent = `학습노트 단원 선택 (${chosen.length}개)`;
  }
  function editorHTML() {
    return `<dialog id="todo-editor" class="td-editor" aria-labelledby="todo-editor-title"><form id="todo-form"><div class="td-editor-head"><h2 id="todo-editor-title">할 일 추가</h2><button type="button" class="tool" id="todo-cancel" aria-label="편집 닫기">닫기</button></div><label>제목<input name="title" required maxlength="300" autocomplete="off"></label><div class="td-editor-fields"><label>과목<select name="slug">${[...data.courses, { slug: 'project', title: '발표·프로젝트·기타' }].map((c) => `<option value="${c.slug}">${esc(c.title)}</option>`).join('')}</select></label><label>공부 날짜 (선택)<input type="date" name="date" min="2000-01-01" max="2099-12-31"></label></div><details id="todo-unit-picker"><summary>학습노트 단원 선택</summary><div id="todo-units"></div></details><label>교재·읽을 범위 (선택)<input name="reading" maxlength="1000" placeholder="예: T&M 12장 §12.4–12.6 / 교재 p.375 문제 19"></label><label>목표·상세 내용<textarea name="details" maxlength="5000" rows="4"></textarea></label><p>추가하거나 다른 날짜로 옮긴 할 일은 시간 미지정으로 표시됩니다. 수업·출근 등 기존 시간 예약은 유지됩니다.</p><p id="todo-editor-error" role="alert"></p><div class="td-editor-actions"><button type="button" class="tool" id="todo-remove" hidden>할 일 삭제</button><button type="button" class="tool" id="todo-reset" hidden>원래 계획으로 복원</button><button class="fp-primary" type="submit">저장</button></div></form></dialog>`;
  }
  function openEditor(id = null, slug = null) {
    editingId = id;
    const task = tasks().find((r) => r.id === id);
    const form = root.querySelector('#todo-form'); form.reset();
    root.querySelector('#todo-editor-title').textContent = task ? '할 일 수정' : '할 일 추가';
    form.elements.title.value = task?.title || '';
    form.elements.slug.value = task?.slug || slug || (todoSubject !== 'all' ? todoSubject : data.courses[0].slug);
    form.elements.date.value = task?.date ?? (todoSource === 'exam' ? '' : kstToday());
    form.elements.details.value = task?.details || '';
    form.elements.reading.value = task?.reading || '';
    root.querySelector('#todo-unit-picker').open = false;
    unitChoices(form.elements.slug.value, task?.units || []);
    root.querySelector('#todo-remove').hidden = !task;
    root.querySelector('#todo-reset').hidden = !task?.edited;
    root.querySelector('#todo-editor-error').textContent = '';
    root.querySelector('#todo-editor').showModal();
    form.elements.title.focus();
  }

  function render() {
    root.classList.toggle('is-todo-view', view === 'todo');
    root.innerHTML = `<div class="fp-top"><a href="${asset('')}">← 학습 노트</a><span>2026–2 / FINALS</span><button class="tool" id="dated-theme" aria-label="테마 전환">◐</button></div><div class="fp-heading"><div><p class="fp-eyebrow">${schedule.start} — ${schedule.end} · KST</p><h1>${view === 'todo' ? '과목별 할 일' : '기말·퀴즈 날짜별 공부계획'}</h1><p>${view === 'todo' ? '시험 자료를 과목별로 공부하고 체크하세요.' : '오늘의 공부, 제출 과제, 연구실과 실험 예약을 시간순으로 확인하세요.'}</p></div><button class="fp-primary" id="dated-today">오늘 일정</button></div><div class="fp-layout"><aside class="fp-sidebar"><section class="fp-panel"><h2>시험과 마감</h2>${schedule.deadlines.map((d) => `<div class="fp-exam"><strong>${dateLabel(d.date)}</strong><p>${esc(d.title)}</p></div>`).join('')}</section><section class="fp-panel fp-progress" id="dated-progress"></section><div class="fp-backup"><button class="tool" id="dated-backup">기록 백업</button><button class="tool" id="dated-restore">기록 가져오기</button><input type="file" id="dated-file" accept="application/json,.json" hidden><p id="dated-status" role="status">${esc(message || '기록은 이 브라우저에 저장됩니다.')}</p></div></aside><main class="fp-main"><div class="fp-notice">11/23 시작 · 실험·조원 회의는 조율 전 예약입니다. 고급역학 12/17 19:00–22:00 확정 · 천물개 12/15 14:00–15:15로 변경 · 시험 전날부터 해당 과목 집중(12/14 오전 전파광 시험 우선). 보강 일정은 별도 확인하세요.</div><section class="fp-panel fp-schedule"><div class="fp-schedule-top"><div class="fp-tabs"><button data-plan-view="day" aria-pressed="${view === 'day'}">일간</button><button data-plan-view="week" aria-pressed="${view === 'week'}">주간</button><button data-plan-view="todo" aria-pressed="${view === 'todo'}">과목별 할 일</button></div><div class="fp-date-nav"><button id="dated-prev" aria-label="이전 날짜 또는 주" ${selected === 0 ? 'disabled' : ''}>←</button><input type="date" id="dated-date" aria-label="계획 날짜" min="${schedule.start}" max="${schedule.end}" value="${schedule.days[selected].date}"><button id="dated-next" aria-label="다음 날짜 또는 주" ${selected === schedule.days.length - 1 ? 'disabled' : ''}>→</button></div><label class="dp-toggle"><input type="checkbox" id="dated-routine" ${showRoutine ? 'checked' : ''}>수업·출근·생활 표시</label><button class="tool" id="dated-print">인쇄</button></div><div id="schedule">${view === 'todo' ? todoHTML() : view === 'day' ? dayHTML(schedule.days[selected]) : weekHTML()}</div></section>${schedule.coverageAudit ? `<section class="fp-panel"><h2>${esc(schedule.coverageAudit.date)} 범위 점검</h2><p>${esc(schedule.coverageAudit.basis)}</p>${schedule.coverageAudit.courses.map((c) => `<details class="fp-details"><summary>${esc(courses.get(c.slug)?.title || c.slug)} · ${hours(allRows.filter((r) => r.slug === c.slug).reduce((n, r) => n + studyMinutes(r), 0))}</summary><p><b>${esc(c.verdict)}</b></p><p>${esc(c.scope)}</p><p>${esc(c.check)}</p></details>`).join('')}</section>` : ''}<details class="fp-panel fp-details"><summary>계획 기준·예약 가정</summary><ul>${schedule.notes.map((note) => `<li>${esc(note)}</li>`).join('')}</ul><p>시험·강의 자료 기준 ${esc(data.built)}. 실제 진행에 따라 일정 수정을 요청하세요.</p></details><details class="fp-panel fp-details"><summary>기존 자동 배치 계획과 기록</summary><p>이전에 저장한 자동 배치 계획·완료 기록은 아래 화면에서 확인할 수 있습니다. 날짜별 계획은 별도 완료 기록을 사용합니다.</p><a href="${asset('finals/?mode=auto')}">기존 자동 배치 계획 열기 ↗</a></details></main></div>${editorHTML()}`;
    renderTotals();
    bind();
  }
  function bind() {
    root.querySelector('#todo-cancel').onclick = () => root.querySelector('#todo-editor').close();
    root.querySelectorAll('[data-todo-source]').forEach((button) => button.onclick = () => {
      todoSource = button.dataset.todoSource; todoPeriod = 'all'; todoSubject = 'all'; hideDone = false;
      const url = new URL(location.href); if (todoSource === 'schedule') url.searchParams.set('source', 'schedule'); else url.searchParams.delete('source');
      history.replaceState(null, '', url); render();
    });
    root.querySelector('#todo-add')?.addEventListener('click', () => openEditor());
    root.querySelectorAll('[data-add-subject]').forEach((button) => button.onclick = () => openEditor(null, button.dataset.addSubject));
    root.querySelectorAll('[data-edit]').forEach((button) => button.onclick = () => openEditor(button.dataset.edit));
    root.querySelectorAll('[data-expand]').forEach((button) => button.onclick = () => {
      const detail = document.getElementById(button.getAttribute('aria-controls'));
      detail.hidden = !detail.hidden; button.setAttribute('aria-expanded', String(!detail.hidden));
    });
    root.querySelector('#todo-form [name=slug]').onchange = (event) => { unitChoices(event.target.value); root.querySelector('#todo-form').elements.reading.value = ''; };
    root.querySelector('#todo-units').onchange = () => { root.querySelector('#todo-unit-picker>summary').textContent = `학습노트 단원 선택 (${root.querySelectorAll('#todo-units input:checked').length}개)`; };
    root.querySelectorAll('[data-restore-task]').forEach((button) => button.onclick = () => restoreTodo(button.dataset.restoreTask));
    root.querySelector('#todo-form').onsubmit = (event) => {
      event.preventDefault();
      try {
        const formData = new FormData(event.target);
        const fields = validateTodoFields({ ...Object.fromEntries(formData), units: formData.getAll('units') });
        if (editingId?.startsWith('dated:custom:')) customTodos = customTodos.map((r) => r.id === editingId ? { id: r.id, ...fields } : r);
        else if (editingId) todoEdits[editingId] = fields;
        else {
          if (customTodos.length >= 1000) throw new Error('직접 추가할 수 있는 할 일은 1,000개까지입니다.');
          editingId = 'dated:custom:' + crypto.randomUUID(); customTodos.push({ id: editingId, ...fields });
        }
        todoSubject = fields.slug; todoPeriod = 'all'; hideDone = false;
        root.querySelector('#todo-editor').close(); save(); render();
        root.querySelector(`[data-edit="${editingId}"]`)?.focus({ preventScroll: true });
      } catch (error) { root.querySelector('#todo-editor-error').textContent = error.message; }
    };
    root.querySelector('#todo-remove').onclick = () => {
      deletedTodo = editingId;
      deletedTodos = [...new Set([...deletedTodos, editingId])];
      root.querySelector('#todo-editor').close(); save(); render(); root.querySelector('#todo-undo')?.focus();
    };
    root.querySelector('#todo-undo')?.addEventListener('click', () => { if (deletedTodo) restoreTodo(deletedTodo); });
    root.querySelector('#todo-reset').onclick = () => { delete todoEdits[editingId]; root.querySelector('#todo-editor').close(); save(); render(); };
    root.querySelector('#dated-theme').onclick = () => {
      const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('hub.theme', theme); } catch { /* Theme still changes in this tab. */ }
    };
    root.querySelector('#dated-today').onclick = () => { const index = schedule.days.findIndex((day) => day.date >= kstToday()); selected = index < 0 ? schedule.days.length - 1 : index; view = 'day'; const url = new URL(location.href); url.searchParams.delete('view'); history.replaceState(null, '', url); render(); };
    for (const [id, direction] of [['dated-prev', -1], ['dated-next', 1]]) root.querySelector('#' + id).onclick = () => { selected = Math.max(0, Math.min(schedule.days.length - 1, selected + direction * (view === 'day' ? 1 : 7))); render(); };
    root.querySelector('#dated-date').onchange = (e) => { const index = schedule.days.findIndex((day) => day.date === e.target.value); if (index >= 0) selected = index; render(); };
    root.querySelectorAll('[data-plan-view]').forEach((button) => button.onclick = () => { view = button.dataset.planView; const url = new URL(location.href); if (view === 'todo') url.searchParams.set('view', 'todo'); else url.searchParams.delete('view'); history.replaceState(null, '', url); render(); });
    root.querySelectorAll('[data-date]').forEach((button) => button.onclick = () => { selected = schedule.days.findIndex((day) => day.date === button.dataset.date); view = 'day'; const url = new URL(location.href); url.searchParams.delete('view'); history.replaceState(null, '', url); render(); });
    const period = root.querySelector('#todo-period'), subject = root.querySelector('#todo-subject'), hide = root.querySelector('#todo-hide');
    if (period) period.onchange = (e) => { todoPeriod = e.target.value; render(); root.querySelector('#todo-period').focus(); };
    if (subject) subject.onchange = (e) => { todoSubject = e.target.value; render(); root.querySelector('#todo-subject').focus(); };
    if (hide) hide.onchange = (e) => { hideDone = e.target.checked; render(); root.querySelector('#todo-hide').focus(); };
    root.querySelector('#dated-routine').onchange = (e) => { showRoutine = e.target.checked; render(); };
    root.querySelector('#dated-print').onclick = () => window.print();
    root.querySelector('#dated-backup').onclick = () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload(), null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `날짜별-기말계획-기록-${kstToday()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
    root.querySelector('#dated-restore').onclick = () => root.querySelector('#dated-file').click();
    root.querySelector('#dated-file').onchange = async (e) => {
      try {
        const file = e.target.files[0]; if (!file) return;
        if (file.size > 5000000) throw new Error('기록 파일은 5MB 이하만 가져올 수 있습니다.');
        const incoming = readDatedBackup(await file.text());
        const merged = [...new Map([...customTodos, ...incoming.customTodos].map((r) => [r.id, r])).values()];
        if (merged.length > 1000) throw new Error('합친 직접 추가 할 일이 1,000개를 초과합니다.');
        records = { ...records, ...incoming.records }; customTodos = merged; todoEdits = { ...todoEdits, ...incoming.todoEdits }; deletedTodos = [...new Set([...deletedTodos, ...incoming.deletedTodos])]; save(); render();
      } catch (error) { root.querySelector('#dated-status').textContent = error.message; }
    };
  }
  root.addEventListener('input', (event) => {
    const input = event.target;
    const id = input.dataset.actual || input.dataset.note;
    if (!id) return;
    if (input.dataset.actual && (!input.checkValidity() || !Number.isInteger(Number(input.value)))) return;
    const record = { done: false, actual: 0, note: '', ...records[id] };
    if (input.dataset.actual) record.actual = Number(input.value); else record.note = input.value.slice(0, 5000);
    records[id] = record; save(); renderTotals();
  });
  root.addEventListener('change', (event) => {
    const id = event.target.dataset.complete; if (!id) return;
    records[id] = { actual: 0, note: '', ...records[id], done: event.target.checked };
    event.target.closest('.fp-task, .td-item').classList.toggle('is-done', event.target.checked);
    save(); renderTotals();
    if (view === 'todo') {
      const item = event.target.closest('.td-item');
      const nextId = item.nextElementSibling?.querySelector('[data-complete]')?.dataset.complete;
      render();
      const target = root.querySelector(`[data-complete="${hideDone ? nextId : id}"]`) || root.querySelector('#todo-hide');
      target.focus({ preventScroll: true });
    }
  });
  render();
}
