// 해시 라우팅: #/u03 (단원) · #/lecture?l=0922 · #/examples?e=5.4 · #/formulas · #/hw?p=2.3 · #/status · #/lab
// 해시 방식이라 GitHub Pages 하위 경로에서도 새로고침/직접 링크가 404 없이 동작한다.
import { $ } from '../util.js';

export function initRouter(ctx, lab) {
  const { ST, units, rail } = ctx;
  const ids = ctx.ids;
  const VIEWS = ['study', 'lecture', 'examples', 'formulas', 'hw', 'status'];
  if ($('v-lab')) VIEWS.push('lab');

  function showView(v) {
    ctx.activeView = v;
    document.querySelectorAll('.view').forEach((e) => e.classList.toggle('active', e.id === 'v-' + v));
    document.querySelectorAll('#modes button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.view === v)));
    rail.hidden = v !== 'study';
    document.querySelector('.shell').style.gridTemplateColumns = v === 'study' ? '' : '1fr';
    if (v !== 'study') ctx.texNow(document.querySelector('#v-' + v + ' .page'));
    if (v === 'examples') ctx.filterEx();
    if (v === 'formulas') ctx.buildFormulas();
    if (v === 'hw') ctx.filterProbs();
    if (v === 'status') { ctx.paint(); ctx.buildGrid(); ctx.buildWeak(); }
    if (v === 'lab' && lab) lab.open();
  }

  function showUnit(id) {
    if (!ids.includes(id)) id = ids[0];
    ctx.activeId = id;
    units.forEach((u) => u.classList.toggle('active', u.id === id));
    rail.querySelectorAll('a[data-u]').forEach((a) => a.setAttribute('aria-current', String(a.dataset.u === id)));
    const cur = rail.querySelector(`a[data-u="${id}"]`);
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    ctx.texNow(document.getElementById(id));
    if (!ST.st[id]) ctx.setState(id, 1); else ctx.paint();
    window.scrollTo(0, 0);
  }

  function route() {
    let h = (location.hash || '#/' + (ctx.D.frontier || ids[0])).replace(/^#\/?/, '');
    const qi = h.indexOf('?'), qs = qi >= 0 ? h.slice(qi + 1) : '';
    if (qi >= 0) h = h.slice(0, qi);
    if (VIEWS.indexOf(h) > 0) {
      showView(h);
      if (h === 'hw' && qs) { const m = /p=([^&]+)/.exec(qs); if (m) ctx.focusProb(decodeURIComponent(m[1])); }
      if (h === 'examples' && qs) { const m = /e=([\w.\-]+)/.exec(qs); if (m) ctx.focusEx(m[1]); }
      if (h === 'lecture' && qs) {
        const m = /l=([\w-]+)/.exec(qs);
        if (m) { const t = document.getElementById('lec-' + m[1]); if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 60); }
      }
    } else if (h === 'study') { showView('study'); showUnit(ctx.activeId); }
    else { showView('study'); showUnit(h || ids[0]); }
  }

  window.addEventListener('hashchange', route);
  $('modes').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]');
    if (!b) return;
    location.hash = b.dataset.view === 'study' ? '#/' + ctx.activeId : '#/' + b.dataset.view;
  });

  // 키보드: / 검색, 1–7 모드, ←→ 단원 이동
  document.addEventListener('keydown', (e) => {
    const t = e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') {
      e.preventDefault();
      if (ctx.activeView !== 'study') location.hash = '#/' + ctx.activeId;
      setTimeout(() => ctx.railSearch.focus(), 50);
      return;
    }
    const mv = { 1: 'study', 2: 'lecture', 3: 'examples', 4: 'formulas', 5: 'hw', 6: 'status', 7: 'lab' }[e.key];
    if (mv && VIEWS.includes(mv)) { location.hash = mv === 'study' ? '#/' + ctx.activeId : '#/' + mv; return; }
    if (ctx.activeView !== 'study') return;
    const i = ids.indexOf(ctx.activeId);
    if (e.key === 'ArrowRight' && i < ids.length - 1) location.hash = '#/' + ids[i + 1];
    if (e.key === 'ArrowLeft' && i > 0) location.hash = '#/' + ids[i - 1];
  });

  // 해시가 없으면 강의 진도 단원으로
  if (!location.hash && ctx.D.frontier) {
    try { history.replaceState(null, '', '#/' + ctx.D.frontier); } catch { ctx.activeId = ctx.D.frontier; }
  }
  return { route };
}
