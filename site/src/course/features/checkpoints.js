// 체크포인트(.qz): 답 확인 · 스스로 채점(맞음/더 볼 것) · "다시 볼 체크포인트" 목록
import { $, $$ } from '../util.js';

export function initCheckpoints(ctx) {
  const { ST, store } = ctx;

  ctx.paintQz = function paintQz() {
    $$('.qz').forEach((q) => {
      const v = ST.qz[q.dataset.q];
      q.classList.toggle('flag', v === 0);
      q.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', v === +b.dataset.v));
    });
  };

  ctx.buildWeak = function buildWeak() {
    let h = '';
    $$('.qz').forEach((q) => {
      if (ST.qz[q.dataset.q] !== 0) return;
      const u = q.closest('article.unit'), x = q.closest('article.ex');
      const t = ((q.querySelector('.qq') || {}).textContent || '').replace(/\s+/g, ' ').slice(0, 110);
      if (u) h += `<a href="#/${u.id}"><em>${u.id.toUpperCase()}</em>${t}…</a>`;
      else if (x) h += `<a href="#/examples?e=${x.dataset.num}"><em>Ex ${x.dataset.num}</em>${t}…</a>`;
    });
    const el = $('st-weak');
    if (el) el.innerHTML = h || '<div class="empty">아직 없습니다. 체크포인트를 풀고 <b>더 볼 것</b>을 누르면 여기 모입니다.</div>';
  };

  document.addEventListener('click', (e) => {
    const q = e.target.closest('.qz');
    if (!q) return;
    if (e.target.closest('.rv')) { q.classList.add('open'); ctx.texNow(q); return; }
    const v = e.target.closest('button[data-v]');
    if (v) {
      const id = q.dataset.q, val = +v.dataset.v;
      if (ST.qz[id] === val) delete ST.qz[id]; else ST.qz[id] = val;
      store.persist(); ctx.paintQz(); ctx.paint(); ctx.buildWeak();
    }
  });
}
