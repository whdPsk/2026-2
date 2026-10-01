// 좌측 단원 레일: 목록 · 검색(/) · 범위 선택(전체/강의 진도/중간/기말)
import { $ } from '../util.js';
import { RLAB } from '../context.js';

export function initRail(ctx) {
  const { uMeta, CH, D } = ctx;
  const rail = $('rail');
  ctx.rail = rail;
  let cur = null, html = '';
  for (const id of ctx.ids) {
    const m = uMeta[id], c = m.ch;
    if (c !== cur) {
      cur = c;
      const rr = ctx.rangeOfCh(c);
      html += `<h6 data-ch="${c}">Ch.${c} · ${CH[c].ko} <span class="rngbadge r${rr}">${RLAB[rr]}</span></h6>`;
    }
    html += `<a href="#/${id}" data-u="${id}"><span class="st">○</span><span class="ix">${id.slice(1)}</span><span class="tt">${m.title}${m.lec ? '<span class="lecdot" title="강의에서 다룸"></span>' : ''}</span></a>`;
  }
  rail.insertAdjacentHTML('beforeend', html);

  // 검색
  const q = $('q');
  ctx.railSearch = q;
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase();
    rail.classList.toggle('filtering', !!v);
    rail.querySelectorAll('a[data-u]').forEach((a) => a.classList.toggle('hit', !!v && a.textContent.toLowerCase().includes(v)));
  });
  q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { q.value = ''; q.blur(); rail.classList.remove('filtering'); } });

  // 범위 선택
  let railR = 'all';
  function applyRail() {
    rail.querySelectorAll('a[data-u]').forEach((a) => {
      const m = uMeta[a.dataset.u];
      a.classList.toggle('rout', railR === 'lec' ? !m.lec : railR !== 'all' && ctx.rangeOfUnit(a.dataset.u) !== +railR);
    });
    rail.querySelectorAll('h6[data-ch]').forEach((h) => {
      const c = +h.dataset.ch;
      const anyLec = D.units.some((u) => u.ch === c && u.lec);
      h.classList.toggle('rout', railR === 'lec' ? !anyLec : railR !== 'all' && ctx.rangeOfCh(c) !== +railR);
    });
  }
  $('rsel').addEventListener('click', function (e) {
    const b = e.target.closest('button[data-r]');
    if (!b) return;
    railR = b.dataset.r;
    this.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    applyRail();
  });
  applyRail();
}
