// 원자료 칩 팝업. 원문 데이터(cites.json, 큼)는 처음 칩을 누를 때만 불러온다.
import { $, esc, asset } from '../util.js';

export function initCitePop(slug) {
  const pop = $('citepop');
  if (!pop) return;
  let C = null, loading = null;
  const load = () => (C ? Promise.resolve(C) : (loading ||= fetch(asset(`data/${slug}/cites.json`)).then((r) => r.json()).then((d) => (C = d))));
  // 미리 받아 두기(유휴 시간)
  (window.requestIdleCallback || ((f) => setTimeout(f, 2500)))(() => load().catch(() => {}));

  function show(a) {
    const it = (C.cites || {})[a.dataset.c];
    if (!it) return;
    const s = (C.sources || {})[it.s] || {};
    $('cp-t').textContent = s.title || it.s;
    $('cp-l').textContent = (s.date ? s.date + ' · ' : '') + it.l;
    $('cp-r').innerHTML = esc(it.r).replace(/\n/g, '<br>');
    const n = $('cp-n'); n.textContent = it.n || ''; n.hidden = !it.n;
    const l = $('cp-a'); if (s.url) { l.href = s.url; l.hidden = false; } else l.hidden = true;
    pop.hidden = false;
    const r = a.getBoundingClientRect(), w = Math.min(520, window.innerWidth - 24);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + 'px';
    let top = r.bottom + 8;
    if (top + 320 > window.innerHeight) top = Math.max(12, r.top - 330);
    pop.style.top = top + 'px';
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.cite');
    if (!a) { if (!e.target.closest('#citepop')) pop.hidden = true; return; }
    e.preventDefault();
    load().then(() => show(a)).catch(() => { $('cp-t').textContent = '원자료를 불러오지 못했습니다'; pop.hidden = false; });
  });
  $('cp-x').onclick = () => { pop.hidden = true; };
  window.addEventListener('hashchange', () => { pop.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') pop.hidden = true; });
}
