// Example 뷰: 장/강의지정 필터 · 번호·키워드 검색 · 특정 예제로 이동
import { $, setT } from '../util.js';

export function initExamples(ctx) {
  const exs = ctx.exs;
  for (const e of exs) {
    e.dataset.txt = ((e.querySelector('.exh') || {}).textContent || '').toLowerCase() + ' ' + ((e.querySelector('.exq') || {}).textContent || '').toLowerCase();
  }
  let efCh = 'all';
  ctx.filterEx = function filterEx() {
    const q = ($('eq').value || '').trim().toLowerCase();
    let n = 0;
    for (const e of exs) {
      const ok = (efCh === 'lec' ? !!e.dataset.lec : ctx.chOk(efCh, e.dataset.ch)) && (!q || e.dataset.num.indexOf(q) === 0 || e.dataset.txt.includes(q));
      e.hidden = !ok;
      if (ok) n++;
    }
    setT('ecnt', n + ' / ' + exs.length + '제');
    exs.filter((e) => !e.hidden).slice(0, 4).forEach(ctx.texNow);
  };
  $('ef').addEventListener('click', function (e) {
    const b = e.target.closest('button[data-ch]');
    if (!b) return;
    efCh = b.dataset.ch;
    this.querySelectorAll('button[data-ch]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    ctx.filterEx();
  });
  $('eq').addEventListener('input', ctx.filterEx);
  ctx.focusEx = function focusEx(num) {
    $('eq').value = ''; efCh = 'all';
    document.querySelectorAll('#ef button[data-ch]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.ch === 'all')));
    ctx.filterEx();
    const t = exs.find((e) => e.dataset.num === num);
    if (t) ctx.texNow(t).then(() => setTimeout(() => t.scrollIntoView({ block: 'start' }), 60));
  };
}
