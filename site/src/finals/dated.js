import { asset, esc } from '../course/util.js';
import { clock, weekday, WEEK, kstToday } from './engine.js';
import { DATED_RECORD_KEY, isTask, studyMinutes, validateSchedule, readDatedRecords } from './dated-model.js';

const labels = { study: '시험 공부', assignment: '과제·보고서', project: '발표·프로젝트', experiment: '실험 예약', meeting: '회의 예약', class: '수업', lab: '랩인턴', sleep: '수면', meal: '식사', travel: '이동', break: '휴식', recovery: '회복·준비', exam: '시험·예약' };
const hours = (minutes) => `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ''}`;
const dateLabel = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))} (${WEEK[weekday(date)]})`;
const lifeKinds = new Set(['sleep', 'meal', 'travel', 'break', 'recovery']);

export function mountDatedPlan(root, data) {
  const schedule = data.schedule;
  validateSchedule(schedule);
  const courses = new Map(data.courses.map((c) => [c.slug, c]));
  const allRows = schedule.days.flatMap((day) => day.rows);
  let records = {}, message = '', view = 'day', showRoutine = true;
  let selected = schedule.days.findIndex((day) => day.date >= kstToday());
  if (selected < 0) selected = schedule.days.length - 1;
  try {
    const raw = localStorage.getItem(DATED_RECORD_KEY);
    if (raw) records = readDatedRecords(raw);
  } catch { message = '저장된 기록을 읽지 못했습니다. 백업 파일을 가져오거나 새 기록을 시작하세요.'; }

  const subjectName = (row) => courses.get(row.slug)?.title || labels[row.kind];
  const payload = () => ({ type: 'dated-final-plan', version: 1, records });
  function save() {
    try { localStorage.setItem(DATED_RECORD_KEY, JSON.stringify(payload())); message = '기록을 이 브라우저에 저장했습니다.'; }
    catch { message = '브라우저 저장에 실패했습니다. 기록 백업을 내려받으세요.'; }
    root.querySelector('#dated-status').textContent = message;
  }
  function refs(row) {
    if (!row.slug) return '';
    const links = (row.units || []).map((id) => {
      const unit = courses.get(row.slug).units.find((u) => u.id === id);
      return `<a href="${asset(`${row.slug}/#/${id}`)}">${esc(id.toUpperCase())}${unit ? ` · ${esc(unit.title)}` : ' · 연결 개념'} ↗</a>`;
    });
    const route = row.slug === 'mechexp' ? 'examples' : row.phase === '새 강의 복습' ? 'lecture' : 'hw';
    links.push(`<a href="${asset(`${row.slug}/#/${route}`)}">${row.slug === 'mechexp' ? '예상 퀴즈·풀이' : route === 'lecture' ? '강의·공지' : '지정 과제'} ↗</a>`);
    return `<div class="fp-refs">${links.join('')}</div>`;
  }
  function rowHTML(row) {
    if (!isTask(row)) return `<div class="dp-routine" data-kind="${row.kind}"><time>${clock(row.start)}–${clock(row.end)}</time><div><b>${esc(row.title)}</b>${row.details ? `<small>${esc(row.details)}</small>` : ''}</div><span>${labels[row.kind]}</span></div>`;
    const record = records[row.id] || {};
    return `<article class="fp-task ${record.done ? 'is-done' : ''}" data-subject="${row.slug || 'project'}"><div class="fp-task-time"><time>${clock(row.start)}<span>— ${clock(row.end)}</span></time><b>${row.end - row.start}분</b></div><div class="fp-task-body"><div class="fp-task-meta"><span>${esc(subjectName(row))}</span><span>${esc(row.phase || labels[row.kind])}</span></div><h3>${esc(row.title)}</h3><p class="dp-goal">${esc(row.details)}</p>${refs(row)}<details><summary>실제 시간·메모</summary><div class="fp-record"><label>실제 작업 시간 (분)<input type="number" min="0" max="1440" step="1" data-actual="${row.id}" value="${record.actual ?? ''}"></label><label>막힌 지점·다음 할 일<textarea rows="2" maxlength="5000" data-note="${row.id}">${esc(record.note || '')}</textarea></label></div></details></div><label class="fp-check"><input type="checkbox" data-complete="${row.id}" ${record.done ? 'checked' : ''}><span>완료</span></label></article>`;
  }
  function dayHTML(day) {
    const total = day.rows.reduce((n, row) => n + studyMinutes(row), 0);
    const visible = day.rows.filter((row) => showRoutine || isTask(row) || row.kind === 'exam');
    return `<div class="fp-day-head"><h2>${dateLabel(day.date)}</h2><span>시험 공부 ${hours(total)}</span></div>${visible.map(rowHTML).join('')}`;
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
        const row = group.rows[0];
        if (group.life) {
          const names = [...new Set(group.rows.map((r) => labels[r.kind]))].join('·');
          return `<details class="dp-week-life"><summary><time>${clock(row.start)}–${clock(group.rows.at(-1).end)}</time><span>${names}</span></summary><div>${group.rows.map((r) => `<p><time>${clock(r.start)}–${clock(r.end)}</time> ${esc(r.title)}</p>`).join('')}</div></details>`;
        }
        const routine = !isTask(row) && row.kind !== 'exam';
        return `<button class="fp-week-task ${routine ? 'dp-week-routine' : ''} ${records[row.id]?.done ? 'is-done' : ''}" data-date="${day.date}" data-subject="${row.slug || 'project'}" data-kind="${row.kind}"><time>${clock(row.start)}–${clock(row.end)}</time><span>${esc(subjectName(row))}</span><b>${esc(row.title)}</b></button>`;
      }).join('');
      return `<section><button class="fp-week-date" data-date="${day.date}">${dateLabel(day.date)}</button><p>공부 ${hours(day.rows.reduce((n, row) => n + studyMinutes(row), 0))}</p>${cards}</section>`;
    });
    return `<div class="fp-week">${days.join('')}</div>`;
  }
  function renderTotals() {
    const total = allRows.reduce((n, row) => n + studyMinutes(row), 0);
    const done = allRows.reduce((n, row) => n + (records[row.id]?.done ? studyMinutes(row) : 0), 0);
    const actual = allRows.filter(isTask).reduce((n, row) => n + (records[row.id]?.actual || 0), 0);
    root.querySelector('#dated-progress').innerHTML = `<h2>시험 공부 ${hours(total)}</h2><p>새 강의 복습·자율 휴식 여유 포함 · 과제·보고서 별도</p><progress value="${done}" max="${total}" aria-label="시험 공부 완료 시간"></progress><p>완료 ${hours(done)} · 전체 작업 실제 기록 ${hours(actual)}</p><div class="fp-subject-totals">${data.courses.map((c) => `<div><span>${esc(c.title)}</span><b>${hours(allRows.filter((r) => r.slug === c.slug).reduce((n, r) => n + studyMinutes(r), 0))}</b></div>`).join('')}</div>`;
  }
  function render() {
    root.innerHTML = `<div class="fp-top"><a href="${asset('')}">← 학습 노트</a><span>2026–2 / FINALS</span><button class="tool" id="dated-theme" aria-label="테마 전환">◐</button></div><div class="fp-heading"><div><p class="fp-eyebrow">${schedule.start} — ${schedule.end} · KST</p><h1>기말·퀴즈 날짜별 공부계획</h1><p>오늘의 공부, 제출 과제, 연구실과 실험 예약을 시간순으로 확인하세요.</p></div><button class="fp-primary" id="dated-today">오늘 일정</button></div><div class="fp-layout"><aside class="fp-sidebar"><section class="fp-panel"><h2>시험과 마감</h2>${schedule.deadlines.map((d) => `<div class="fp-exam"><strong>${dateLabel(d.date)}</strong><p>${esc(d.title)}</p></div>`).join('')}</section><section class="fp-panel fp-progress" id="dated-progress"></section><div class="fp-backup"><button class="tool" id="dated-backup">기록 백업</button><button class="tool" id="dated-restore">기록 가져오기</button><input type="file" id="dated-file" accept="application/json,.json" hidden><p id="dated-status" role="status">${esc(message || '기록은 이 브라우저에 저장됩니다.')}</p></div></aside><main class="fp-main"><div class="fp-notice">11/23 시작 · 실험·조원 회의는 조율 전 예약입니다. 천물개 시험 시각과 고급역학 저녁 시험은 공지 확인 후 조정하세요.</div><section class="fp-panel fp-schedule"><div class="fp-schedule-top"><div class="fp-tabs"><button data-plan-view="day" aria-pressed="${view === 'day'}">일간</button><button data-plan-view="week" aria-pressed="${view === 'week'}">주간</button></div><div class="fp-date-nav"><button id="dated-prev" aria-label="이전 날짜 또는 주" ${selected === 0 ? 'disabled' : ''}>←</button><input type="date" id="dated-date" aria-label="계획 날짜" min="${schedule.start}" max="${schedule.end}" value="${schedule.days[selected].date}"><button id="dated-next" aria-label="다음 날짜 또는 주" ${selected === schedule.days.length - 1 ? 'disabled' : ''}>→</button></div><label class="dp-toggle"><input type="checkbox" id="dated-routine" ${showRoutine ? 'checked' : ''}>수업·출근·생활 표시</label><button class="tool" id="dated-print">인쇄</button></div><div id="schedule">${view === 'day' ? dayHTML(schedule.days[selected]) : weekHTML()}</div></section><details class="fp-panel fp-details"><summary>계획 기준·예약 가정</summary><ul>${schedule.notes.map((note) => `<li>${esc(note)}</li>`).join('')}</ul><p>시험·강의 자료 기준 ${esc(data.built)}. 실제 진행에 따라 일정 수정을 요청하세요.</p></details><details class="fp-panel fp-details"><summary>기존 자동 배치 계획과 기록</summary><p>이전에 저장한 자동 배치 계획·완료 기록은 아래 화면에서 확인할 수 있습니다. 날짜별 계획은 별도 완료 기록을 사용합니다.</p><a href="${asset('finals/?mode=auto')}">기존 자동 배치 계획 열기 ↗</a></details></main></div>`;
    renderTotals();
    bind();
  }
  function bind() {
    root.querySelector('#dated-theme').onclick = () => {
      const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('hub.theme', theme); } catch { /* Theme still changes in this tab. */ }
    };
    root.querySelector('#dated-today').onclick = () => { const index = schedule.days.findIndex((day) => day.date >= kstToday()); selected = index < 0 ? schedule.days.length - 1 : index; render(); };
    for (const [id, direction] of [['dated-prev', -1], ['dated-next', 1]]) root.querySelector('#' + id).onclick = () => { selected = Math.max(0, Math.min(schedule.days.length - 1, selected + direction * (view === 'day' ? 1 : 7))); render(); };
    root.querySelector('#dated-date').onchange = (e) => { const index = schedule.days.findIndex((day) => day.date === e.target.value); if (index >= 0) selected = index; render(); };
    root.querySelectorAll('[data-plan-view]').forEach((button) => button.onclick = () => { view = button.dataset.planView; render(); });
    root.querySelectorAll('[data-date]').forEach((button) => button.onclick = () => { selected = schedule.days.findIndex((day) => day.date === button.dataset.date); view = 'day'; render(); });
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
        const incoming = readDatedRecords(await file.text());
        records = { ...records, ...incoming }; save(); render();
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
    event.target.closest('.fp-task').classList.toggle('is-done', event.target.checked);
    save(); renderTotals();
  });
  render();
}
