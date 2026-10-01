// 단원 진도(○ ◐ ●) · 단원 하단 크롬(관련 예제/과제 · 메모 · 봤음/숙달 · 이전/다음) · 메모 자동 저장
import { $$, setT } from '../util.js';
import { MARK } from '../context.js';

export function initProgress(ctx) {
  const { ST, store, uMeta, D } = ctx;
  const ids = ctx.ids;

  ctx.paint = function paint() {
    const d = ST.st;
    for (const id of ids) {
      const s = d[id] || 0, a = ctx.rail.querySelector(`a[data-u="${id}"]`);
      if (a) { const e = a.querySelector('.st'); e.textContent = MARK[s]; e.className = 'st s' + s; }
    }
    const mb = document.querySelector('article.unit.active .mstbar');
    if (mb) {
      const s = d[ctx.activeId] || 0;
      mb.querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.s === s && s > 0));
    }
    let mid = 0, fin = 0, read = 0, lecm = 0, lect = 0;
    for (const id of ids) {
      const s = d[id] || 0;
      if (s === 2) { if (ctx.rangeOfUnit(id) === 1) mid++; else fin++; }
      if (s >= 1) read++;
      if (uMeta[id].lec) { lect++; if (s === 2) lecm++; }
    }
    let weak = 0, good = 0;
    for (const k in ST.qz) { if (ST.qz[k] === 0) weak++; else if (ST.qz[k] === 1) good++; }
    setT('k-mid', mid); setT('k-fin', fin); setT('k-read', read); setT('k-weak', weak); setT('k-done', good);
    setT('k-lec', lecm + ' / ' + lect);
  };

  ctx.setState = function setState(id, s) {
    if (s) ST.st[id] = s; else delete ST.st[id];
    store.persist(); ctx.paint();
  };

  // 단원 하단 크롬
  const PMAP = D.probmap || {};
  const exLabel = D.exampleLabel || 'Example';
  ctx.units.forEach((u, i) => {
    const body = u.querySelector('.unit-body') || u;
    const rel = Object.keys(PMAP).filter((p) => PMAP[p] === u.id);
    const relHtml = rel.length
      ? '<div class="relprob"><b>이 단원 관련 과제·연습</b> — ' + rel.map((p) => `<a href="#/hw?p=${encodeURIComponent(p)}">${p}</a>`).join('') + '</div>' : '';
    const exl = ctx.exs.filter((e) => e.dataset.unit === u.id)
      .map((e) => `<a href="#/examples?e=${e.dataset.num}">${exLabel} ${e.dataset.num}${e.dataset.lec ? ' ★' : ''}</a>`);
    const exHtml = exl.length
      ? `<div class="exlist"><b>이 단원의 ${exLabel === 'Example' ? '교과서 Example' : exLabel}</b> — ${exl.join('')}` +
        (exLabel === 'Example' ? ' <span class="note">(★ = 강의노트에서 지정 · 각 Example마다 +α 변형 2개)</span>' : '') + '</div>' : '';
    const prev = i > 0 ? ids[i - 1] : null, next = i < ids.length - 1 ? ids[i + 1] : null;
    body.insertAdjacentHTML('beforeend',
      exHtml + relHtml +
      `<div class="unote"><label for="note-${u.id}">내 메모 — 수업에서 교수님이 강조하신 것, 헷갈린 점</label>` +
      `<textarea id="note-${u.id}" data-note="${u.id}" placeholder="강의노트에 없는 판서·구두 강조를 적어두세요."></textarea>` +
      '<div class="hint">자동 저장됩니다.</div></div>' +
      '<div class="mstbar"><strong>이 단원</strong>' +
      '<button data-s="1">봤음</button><button data-s="2">숙달</button>' +
      '<span class="hint">유도를 빈 종이에 처음부터 재구성할 수 있을 때만 숙달로 표시하세요</span></div>' +
      '<div class="unav">' +
      (prev ? `<a class="pv" href="#/${prev}"><small>이전</small>${uMeta[prev].title}</a>` : `<a class="pv off" href="#/${ids[0]}">·</a>`) +
      (next ? `<a class="nx" href="#/${next}"><small>다음</small>${uMeta[next].title}</a>` : `<a class="nx off" href="#/${ids[0]}">·</a>`) +
      '</div>');
    u.querySelector('.mstbar').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-s]');
      if (!b) return;
      const cs = ST.st[u.id] || 0, ns = +b.dataset.s;
      ctx.setState(u.id, cs === ns ? 0 : ns);
    });
  });

  // 메모
  let noteT = null;
  $$('textarea[data-note]').forEach((ta) => {
    ta.addEventListener('input', () => {
      clearTimeout(noteT);
      noteT = setTimeout(() => {
        const v = ta.value.trim();
        if (v) ST.note[ta.dataset.note] = v; else delete ST.note[ta.dataset.note];
        store.persist();
      }, 500);
    });
  });
}
