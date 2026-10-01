// 헤더 부속: 시험 D-day · 도움말 · 라이트/다크 테마
import { $ } from '../util.js';

export function initDday(D) {
  const el = $('dday');
  if (!el) return;
  const now = new Date();
  let best = null;
  for (const x of D.exams || []) {
    const d = new Date(x.date + 'T00:00:00+09:00');
    const n = Math.ceil((d - now) / 864e5);
    if (n >= 0 && (!best || n < best.n)) best = { n, x };
  }
  if (!best) { el.hidden = true; return; }
  el.innerHTML = `${best.x.name} <b>D-${best.n}</b>${best.x.tentative ? ' (예정)' : ''}`;
  el.title = best.x.note || '';
}

export function initHelp() {
  const dH = $('dlg-help');
  $('t-help').onclick = () => dH.showModal();
  $('help-close').onclick = () => dH.close();
}

export function initTheme(store, key) {
  const tD = $('t-dark');
  const cur = () => document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const apply = (t) => { document.documentElement.setAttribute('data-theme', t); tD.textContent = t === 'dark' ? '☀' : '◐'; };
  tD.onclick = () => { const t = cur() === 'dark' ? 'light' : 'dark'; apply(t); store.lset(key + '.theme', t); };
  const th = store.lget(key + '.theme');
  if (th) apply(th); else tD.textContent = cur() === 'dark' ? '☀' : '◐';
}
