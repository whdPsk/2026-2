// 과제 뷰: 장 필터 · 번호·키워드 검색 · 특정 문항 펼치기
import { $, $$, setT } from '../util.js';

export function initProblems(ctx) {
  const probs = $$('details.prob');
  for (const p of probs) {
    p.dataset.txt = (p.textContent || '').toLowerCase();
    p.addEventListener('toggle', () => { if (p.open) ctx.texNow(p); });
  }
  let pfCh = 'all';
  ctx.filterProbs = function filterProbs() {
    const qe = $('pq');
    if (!qe) return;
    const q = (qe.value || '').trim().toLowerCase();
    let n = 0;
    for (const p of probs) {
      const ok = ctx.chOk(pfCh, p.dataset.ch) && (!q || p.dataset.num.toLowerCase().indexOf(q) === 0 || p.dataset.txt.includes(q));
      p.hidden = !ok;
      if (ok) n++;
    }
    $$('section.hwset').forEach((s) => { s.hidden = !s.querySelector('details.prob:not([hidden])'); });
    setT('pcnt', n + ' / ' + probs.length + '문항');
  };
  const pf = $('pf');
  if (pf) {
    pf.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-ch]');
      if (!b) return;
      pfCh = b.dataset.ch;
      this.querySelectorAll('button[data-ch]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      ctx.filterProbs();
    });
    $('pq').addEventListener('input', ctx.filterProbs);
  }
  ctx.focusProb = function focusProb(num) {
    const qe = $('pq');
    if (!qe) return;
    qe.value = ''; pfCh = 'all';
    document.querySelectorAll('#pf button[data-ch]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.ch === 'all')));
    ctx.filterProbs();
    const t = probs.find((p) => p.dataset.num === num);
    if (t) { t.open = true; ctx.texNow(t); setTimeout(() => t.scrollIntoView({ block: 'center' }), 60); }
  };
}
