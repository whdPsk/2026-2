export const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const $ = (id) => document.getElementById(id);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const setT = (id, v) => { const e = $(id); if (e) e.textContent = v; };
/** 'YYYY-MM-DD' → '9/07' */
export const md = (iso) => { const [, m, d] = iso.split('-'); return `${+m}/${d}`; };
/** GitHub Pages 하위 경로(/repo-name/)를 반영한 public 자원 URL */
export const asset = (p) => import.meta.env.BASE_URL + p.replace(/^\//, '');
