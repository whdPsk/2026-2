import '../styles/base.css';
import '../styles/app.css';
import './planner.css';
import { asset, esc } from '../course/util.js';
import { WEEK, addDays, weekday, clock, kstToday, defaultSettings, validateSettings, generatePlan, taskSteps, readBackup } from './engine.js';

const KEY = 'final-plan.2026-2.v1';
const root = document.getElementById('planner');
const $ = (id) => document.getElementById(id);
const fmt = (date) => `${+date.slice(5, 7)}/${+date.slice(8)} (${WEEK[weekday(date)]})`;
const hours = (n) => `${Math.floor(n / 60)}시간${n % 60 ? ` ${n % 60}분` : ''}`;
let data, settings, records = {}, plan, selected, view = 'day', saveProblem = '';
let toastTimer;
let storageWarning = '';
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    settings = saved.settings; records = saved.records || {};
  }
} catch { storageWarning = '저장된 기록을 읽지 못했습니다. 기록 백업 파일이 있으면 가져오세요.'; }

const course = (slug) => data.courses.find((c) => c.slug === slug);
const courseLink = (slug, route = '') => asset(`${slug}/#/${route}`);
const workRows = () => plan.days.flatMap((d) => d.rows.filter((r) => r.slug));
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 1, settings, records })); saveProblem = ''; }
  catch { saveProblem = '브라우저 저장에 실패했습니다. 창을 닫기 전에 JSON 백업을 내려받으세요.'; }
  $('save-status').textContent = saveProblem || '기록은 이 브라우저에 저장됩니다';
  $('save-status').classList.toggle('fp-warning', !!saveProblem);
}

function render() {
  const rows = workRows(), doneMinutes = rows.filter((r) => records[r.id]?.done).reduce((n, r) => n + r.minutes, 0);
  const total = rows.reduce((n, r) => n + r.minutes, 0);
  root.innerHTML = `
  <div class="fp-top"><a href="${asset('')}">← 학습 노트</a><span>2026–2 / FINALS</span><button class="tool" id="theme" aria-label="테마 전환">◐</button></div>
  <div class="fp-heading"><div><p class="fp-eyebrow">STUDY PLAN / ${esc(settings.start)} — ${plan.days.at(-1).date}</p><h1>기말고사 분단위 계획표</h1><p>개념·유도 → 백지 풀이 → 간격 복습. 각 시간에서 관련 노트와 예제로 바로 이동합니다.</p></div><button class="fp-primary" id="settings-open">시간·시험일 설정</button></div>
  <div class="fp-layout"><aside class="fp-sidebar" aria-label="기말 일정과 학습 현황">
  <section class="fp-panel"><div class="fp-section-title"><h2>기말 일정</h2><span>KST</span></div>${data.courses.map((c) => {
    const e = settings.exams[c.slug];
    return `<div class="fp-exam" data-subject="${c.slug}"><div><b>${esc(c.title)}</b><span class="fp-badge">${e.tentative ? '가안 · 확인 필요' : '노트 기준'}</span></div><strong>${fmt(e.date)}</strong><p>${esc(c.scope)}</p><small>${esc(c.exam.note)}</small><a href="${courseLink(c.slug, 'lecture')}">강의·공지 확인 ↗</a></div>`;
  }).join('')}</section>
  <section class="fp-panel fp-progress"><h2>학습 기록</h2><div class="fp-big">${Math.round(doneMinutes / Math.max(1, total) * 100)}<small>%</small></div><progress value="${doneMinutes}" max="${total || 1}" aria-label="현재 계획 완료 시간 비율"></progress><p>계획 ${hours(total)} · 완료 표시 ${hours(doneMinutes)}</p><p id="actual-total">실제 기록 ${hours(Object.values(records).reduce((n, r) => n + (Number(r.actual) || 0), 0))}</p><div class="fp-subject-totals">${data.courses.map((c) => `<div><span>${esc(c.title)}</span><b>${hours(rows.filter((r) => r.slug === c.slug).reduce((n, r) => n + r.minutes, 0))}</b></div>`).join('')}</div></section>
  <div class="fp-backup"><button class="tool" id="backup">JSON 백업</button><button class="tool" id="restore">백업 가져오기</button><input type="file" id="restore-file" accept="application/json,.json" hidden><p id="save-status" role="status">${esc(saveProblem || '기록은 이 브라우저에 저장됩니다')}</p></div>
  </aside><main class="fp-main">
  <div class="fp-notice">${esc(storageWarning || '고급역학 날짜·범위는 가안입니다. 시험 당일은 시간을 비워 두었고, 미수강 단원은 예습으로 배치했습니다.')}</div>
  <section class="fp-panel fp-schedule"><div class="fp-schedule-top"><div class="fp-tabs" aria-label="계획표 보기"><button data-view="day" aria-pressed="${view === 'day'}">일간</button><button data-view="week" aria-pressed="${view === 'week'}">주간</button></div><div class="fp-date-nav"><button id="prev" aria-label="이전 ${view === 'day' ? '날짜' : '주'}">←</button><input type="date" id="date" aria-label="계획 날짜" value="${selected}" min="${settings.start}" max="${plan.days.at(-1).date}"><button id="next" aria-label="다음 ${view === 'day' ? '날짜' : '주'}">→</button><button id="today">오늘</button></div><button class="tool" id="print">인쇄</button></div><div id="schedule"></div></section>
  <details class="fp-panel fp-details" ${plan.backlog.length ? 'open' : ''}><summary>범위별 배치 현황 <span>${plan.tasks.length - plan.backlog.length}/${plan.tasks.length}개 핵심 학습 블록 배치</span></summary><p>각 단원에 개념·유도 50분, 백지 풀이 50분, 간격 복습 25분을 배정합니다. 예제는 한 번에 1문제부터, 지정 과제와 실제 오답을 우선합니다. 100분 모의 풀이는 연습 시간이며 실제 시험 시간을 뜻하지 않습니다.</p>${plan.backlog.length ? `<div class="fp-notice fp-warning">시간 부족으로 미배치 ${plan.backlog.length}개 (${hours(plan.backlog.reduce((n, t) => n + t.minutes, 0))}). 아래 작업은 아직 계획에 포함되지 않았습니다. 설정에서 시간을 늘리거나 시작일을 앞당기세요.</div><ul>${plan.backlog.map((t) => `<li>${esc(course(t.slug).title)} · ${esc(t.title)} / ${t.phase} ${t.minutes}분</li>`).join('')}</ul>` : '<p class="fp-success">현재 범위의 모든 핵심 블록을 시험 전 날짜에 배치했습니다. 완료 여부는 직접 기록하세요.</p>'}${data.courses.map((c) => `<details class="fp-scope"><summary>${esc(c.title)} · ${c.units.length}단원 ${settings.exams[c.slug].tentative ? '(예상 범위)' : ''}</summary><ul>${c.units.map((u) => `<li><a href="${courseLink(c.slug, u.id)}">${u.id.toUpperCase()} · ${esc(u.title)}</a> <span>${u.lec ? '강의 반영' : '예습 · 미수강'}</span></li>`).join('')}</ul></details>`).join('')}</details>
  <details class="fp-panel fp-details"><summary>반영한 고정 일정·계획 기준</summary><ul>${data.defaults.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul><p>기준 자료: 저장소의 과목별 시험 일정·단원 목록·예제·지정 과제, 사용자 제공 연구실 일정. 자료 빌드 ${data.built}. 기말 노트가 갱신되면 다음 빌드부터 관련 자료도 갱신됩니다.</p><p>날짜가 지나도 완료 처리하거나 미완료 작업을 자동으로 옮기지 않습니다. 시간 설정을 적용하면 전체 배치가 다시 계산되며, 같은 학습 블록의 완료·메모 기록은 유지됩니다. 백업 가져오기는 현재 설정·기록을 백업 내용으로 교체합니다.</p></details>
  </main></div>
  <dialog id="settings-dialog" aria-labelledby="settings-title"><form id="settings-form"><div class="fp-section-title"><h2 id="settings-title">시간·시험일 설정</h2><button type="button" class="tool" id="settings-close" aria-label="설정 닫기">✕</button></div><p>수업·시각이 확인된 연구실 일정과 겹치는 구간은 자동으로 제외합니다. 금요일 연구실 시작 시각은 미입력 상태입니다. 기본 공부 시간은 20:30 이후입니다.</p><label class="fp-field">계획 시작일<input name="start" type="date" required value="${settings.start}"></label><h3>공부 가능 시간</h3><p>여러 구간은 쉼표로 구분. 공부하지 않는 요일은 비워 두세요. 휴식도 이 시간 안에 포함됩니다.</p><div class="fp-availability">${[1,2,3,4,5,6,0].map((d) => `<label>${WEEK[d]}요일<input name="slot${d}" value="${esc(settings.availability[d])}" placeholder="20:30-23:30" aria-label="${WEEK[d]}요일 공부 시간"></label>`).join('')}</div><label class="fp-field">공부 제외일<input name="blocked" value="${esc(settings.blocked)}" placeholder="2026-11-15,2026-11-22"></label><h3>시험일</h3>${data.courses.map((c) => `<div class="fp-exam-setting"><label>${esc(c.title)}<input type="date" name="exam-${c.slug}" value="${settings.exams[c.slug].date}" required></label><label><input type="checkbox" name="tentative-${c.slug}" ${settings.exams[c.slug].tentative ? 'checked' : ''}>가안</label></div>`).join('')}<p class="fp-warning">날짜를 바꿔도 강의노트 원본의 시험 일정은 바뀌지 않습니다. 이 계획표에만 적용됩니다. 적용 전 JSON 백업을 권합니다.</p><p id="settings-error" role="alert"></p><button type="submit" class="fp-primary">설정 적용 · 전체 배치 다시 계산</button></form></dialog>
  <div class="fp-toast" id="toast" role="status" hidden></div>`;
  renderSchedule(); bind();
}

function stepsHTML(row) {
  let cursor = row.start;
  return taskSteps(row).map((s) => { const start = cursor; cursor += s.minutes; return `<li><time>${clock(start)}–${clock(cursor)}</time><span>${esc(s.title)} <small>${s.minutes}분</small></span></li>`; }).join('');
}
function refsHTML(row) {
  if (!row.slug) return '';
  const c = course(row.slug), u = c.units.find((u) => u.id === row.unit);
  let links = u ? `<a href="${courseLink(row.slug, u.id)}">단원 ${u.id.toUpperCase()} · §${esc(u.secs)} ↗</a>` : `<a href="${courseLink(row.slug, 'lecture')}">강의·공지 ↗</a><a href="${courseLink(row.slug, 'hw')}">지정 과제 ↗</a>`;
  if (u) links += u.examples.map((e) => `<a href="${courseLink(row.slug, `examples?e=${encodeURIComponent(e.num)}`)}">Ex ${esc(e.num)} ↗</a>`).join('') + u.homework.map((p) => `<a href="${courseLink(row.slug, `hw?p=${encodeURIComponent(p.num)}`)}">과제 ${esc(p.num)} ↗</a>`).join('');
  return `<div class="fp-refs">${links}</div>`;
}
function rowHTML(row) {
  if (!row.slug) return `<div class="fp-rest"><time>${clock(row.start)}–${clock(row.end)}</time><span>${esc(row.title)} · ${row.minutes}분</span></div>`;
  const r = records[row.id] || {}, c = course(row.slug);
  return `<article class="fp-task ${r.done ? 'is-done' : ''}" data-subject="${row.slug}"><div class="fp-task-time"><time>${clock(row.start)}<span>— ${clock(row.end)}</span></time><b>${row.minutes}분</b></div><div class="fp-task-body"><div class="fp-task-meta"><span>${esc(c.title)}</span><span>${row.phase}</span>${row.unit && !row.lec ? '<span>예습 · 미수강</span>' : ''}</div><h3>${esc(row.title)}</h3>${refsHTML(row)}<details><summary>분단위 단계 · 메모</summary><ol class="fp-steps">${stepsHTML(row)}</ol><div class="fp-record"><label>실제 공부 시간 (분)<input type="number" min="0" max="1440" step="1" data-record="actual" data-id="${row.id}" value="${r.actual ?? ''}" inputmode="numeric"></label><label>막힌 지점·다음 할 일<textarea data-record="note" data-id="${row.id}" rows="2" maxlength="5000" placeholder="해설을 봤다면 어디에서 막혔는지 적기">${esc(r.note || '')}</textarea></label></div></details></div><label class="fp-check"><input type="checkbox" data-done="${row.id}" ${r.done ? 'checked' : ''}><span>완료</span></label></article>`;
}
function dayHTML(day) {
  const study = day.rows.filter((r) => r.slug), minutes = study.reduce((n, r) => n + r.minutes, 0);
  return `<div class="fp-day-head"><h2>${fmt(day.date)}</h2><span>공부 ${hours(minutes)} · 휴식 ${day.rows.filter((r) => !r.slug).reduce((n, r) => n + r.minutes, 0)}분</span></div>
  <details class="fp-fixed"><summary>고정 일정 ${day.fixed.length}개 ${day.exams.length ? '· 시험일' : ''}</summary>${day.fixed.map((f) => `<div><time>${f.start === null ? '강의 후' : clock(f.start)}–${clock(f.end)}</time> ${esc(f.title)}</div>`).join('') || '<p>등록된 수업·연구실 고정 일정 없음</p>'}</details>
  ${day.exams.map((c) => `<div class="fp-exam-day" data-subject="${c.slug}"><h3>${esc(c.title)} 기말고사 ${settings.exams[c.slug].tentative ? '· 날짜 가안' : ''}</h3><p>${esc(c.exam.note)}</p><p>시험 시각·장소는 최신 공지 확인. 이날은 공부 블록을 배치하지 않았습니다.</p></div>`).join('')}
  ${day.blocked ? '<p class="fp-empty">공부 제외일입니다.</p>' : ''}${day.rows.map(rowHTML).join('')}${!day.rows.length && !day.exams.length && !day.blocked ? '<p class="fp-empty">이날은 공부 시간이 없습니다. 설정에서 시간을 추가할 수 있습니다.</p>' : ''}`;
}
function renderSchedule() {
  const current = plan.days.find((d) => d.date === selected) || plan.days[0];
  selected = current.date;
  $('date').value = selected;
  const step = view === 'day' ? 1 : 7;
  $('prev').disabled = addDays(selected, -step) < settings.start;
  $('next').disabled = addDays(selected, step) > plan.days.at(-1).date;
  $('schedule').innerHTML = view === 'day' ? dayHTML(current) : `<p class="fp-week-note">날짜를 누르면 분단위 단계와 실제 공부 시간을 기록할 수 있습니다.</p><div class="fp-week">${Array.from({length:7},(_,i)=>plan.days.find((d)=>d.date===addDays(selected,i))).filter(Boolean).map((d)=>`<section><button class="fp-week-date" data-day="${d.date}">${fmt(d.date)}</button><p>${hours(d.rows.filter((r)=>r.slug).reduce((n,r)=>n+r.minutes,0))}</p>${d.exams.map((c)=>`<div class="fp-week-exam">${esc(c.title)} 시험${settings.exams[c.slug].tentative?' (가안)':''}</div>`).join('')}${d.rows.filter((r)=>r.slug).map((r)=>`<button class="fp-week-task ${records[r.id]?.done?'is-done':''}" data-day="${d.date}" data-subject="${r.slug}"><time>${clock(r.start)}–${clock(r.end)}</time><span>${esc(course(r.slug).title)} · ${r.phase}</span><b>${esc(r.title)}</b></button>`).join('')}${!d.rows.length&&!d.exams.length?'<p>공부 시간 없음</p>':''}</section>`).join('')}</div>`;
}
function toast(message) { clearTimeout(toastTimer); $('toast').hidden = false; $('toast').textContent = message; toastTimer = setTimeout(() => { if ($('toast')) $('toast').hidden = true; }, 7000); }
function bind() {
  $('theme').onclick = () => { const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('hub.theme', t); } catch {} };
  $('settings-open').onclick = () => $('settings-dialog').showModal();
  $('settings-close').onclick = () => $('settings-dialog').close();
  $('settings-form').onsubmit = (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const next = { start: f.get('start'), blocked: f.get('blocked'), availability: Object.fromEntries(WEEK.map((_, i) => [i, f.get(`slot${i}`).trim()])), exams: Object.fromEntries(data.courses.map((c) => [c.slug, { ...settings.exams[c.slug], date: f.get(`exam-${c.slug}`), tentative: f.has(`tentative-${c.slug}`) }])) };
    try { const nextPlan = generatePlan(data, next); settings = next; plan = nextPlan; selected = plan.days.some((d) => d.date === selected) ? selected : settings.start; save(); render(); toast('설정을 적용했습니다. 완료·메모 기록은 유지됩니다.'); }
    catch (error) { $('settings-error').textContent = error.message; }
  };
  root.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { view = b.dataset.view; render(); });
  for (const [id, n] of [['prev', -1], ['next', 1]]) $(id).onclick = () => { selected = addDays(selected, n * (view === 'day' ? 1 : 7)); renderSchedule(); };
  $('date').onchange = (e) => { if (plan.days.some((d) => d.date === e.target.value)) { selected = e.target.value; renderSchedule(); } else $('date').value = selected; };
  $('today').onclick = () => { const today = kstToday(); selected = today < settings.start ? settings.start : today > plan.days.at(-1).date ? plan.days.at(-1).date : today; renderSchedule(); };
  $('print').onclick = () => window.print();
  $('backup').onclick = () => { const blob = new Blob([JSON.stringify({ version: 1, settings, records }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `기말계획-기록-${kstToday()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); };
  $('restore').onclick = () => $('restore-file').click();
  $('restore-file').onchange = async (e) => {
    try {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 5000000) throw new Error('백업 파일은 5MB 이하만 가져올 수 있습니다.');
      const incoming = readBackup(await file.text(), data.courses);
      const nextPlan = generatePlan(data, incoming.settings); settings = incoming.settings; records = incoming.records; plan = nextPlan; selected = settings.start; save(); render(); toast('백업의 시간 설정과 기록을 가져왔습니다.');
    } catch (error) { toast(`가져오기 실패: ${error.message}`); }
  };
}
root.addEventListener('click', (e) => { const b = e.target.closest('[data-day]'); if (b) { selected = b.dataset.day; view = 'day'; render(); } });
// Save while typing, so closing the tab before blur does not lose notes.
root.addEventListener('input', (e) => {
  const target = e.target, field = target.dataset.record;
  if (!field) return;
  if (field === 'actual' && (!target.checkValidity() || !Number.isInteger(Number(target.value)))) return;
  const id = target.dataset.id;
  records[id] = { done: false, actual: 0, note: '', ...records[id], [field]: field === 'actual' ? Number(target.value) : target.value.slice(0, 5000) };
  save();
  $('actual-total').textContent = '실제 기록 ' + hours(Object.values(records).reduce((n, r) => n + (Number(r.actual) || 0), 0));
});
root.addEventListener('change', (e) => {
  const target = e.target;
  if (target.dataset.done) {
    const id = target.dataset.done; records[id] = { done: false, actual: 0, note: '', ...records[id], done: target.checked }; save();
    const openIds = [...root.querySelectorAll('.fp-task details[open]')].map((d) => d.closest('.fp-task').querySelector('[data-done]').dataset.done);
    const y = window.scrollY; render();
    for (const d of root.querySelectorAll('.fp-task details')) if (openIds.includes(d.closest('.fp-task').querySelector('[data-done]').dataset.done)) d.open = true;
    window.scrollTo(0, y);
  } else if (target.dataset.record) {
    const id = target.dataset.id, field = target.dataset.record;
    if (field === 'actual' && (!target.checkValidity() || !Number.isInteger(Number(target.value)))) { target.reportValidity(); return; }
    records[id] = { done: false, actual: 0, note: '', ...records[id], [field]: field === 'actual' ? Number(target.value) : target.value.slice(0, 5000) }; save(); $('actual-total').textContent = '실제 기록 ' + hours(Object.values(records).reduce((n, r) => n + (Number(r.actual) || 0), 0));
  }
});

async function boot() {
  const res = await fetch(asset('data/final-plan.json'), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`계획 자료를 읽지 못했습니다 (${res.status}).`);
  data = await res.json();
  try { validateSettings(settings, data.courses); } catch { if (settings) storageWarning = '저장된 시간 설정이 유효하지 않아 기본 시간으로 열었습니다. 기존 완료·메모 기록은 유지합니다.'; settings = defaultSettings(data); }
  plan = generatePlan(data, settings);
  const today = kstToday(); selected = plan.days.find((d) => d.date >= today)?.date || plan.days.at(-1).date;
  render();
}
boot().catch((error) => { root.innerHTML = `<p class="boot err">${esc(error.message)} <a href="${asset('')}">학습 노트로 돌아가기</a></p>`; });
