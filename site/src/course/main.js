// 과목 콘솔 진입점: 데이터 불러오기 → 골격 렌더 → 기능 모듈 연결
import '../styles/base.css';
import '../styles/blocks.css';
import '../styles/app.css';
import { $, $$, asset } from './util.js';
import { renderShell } from './render/shell.js';
import { createStore } from './features/store.js';
import { loadMathJax, createTex } from './features/mathjax.js';
import { createContext } from './context.js';
import { initRail } from './features/rail.js';
import { initProgress } from './features/progress.js';
import { initCheckpoints } from './features/checkpoints.js';
import { initExamples } from './features/examples.js';
import { initProblems } from './features/problems.js';
import { initFormulas } from './features/formulas.js';
import { initStatus } from './features/status.js';
import { initDday, initHelp, initTheme } from './features/chrome.js';
import { initCitePop } from './features/citepop.js';
import { createLab } from './features/lab.js';
import { initRouter } from './features/router.js';

const slug = document.querySelector('meta[name="course"]').content;

async function boot() {
  const res = await fetch(asset(`data/${slug}/course.json`), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`data/${slug}/course.json ${res.status}`);
  const D = await res.json();
  document.title = `${D.title} 학습 콘솔`;
  loadMathJax(D.macros);
  if (D.css) { const st = document.createElement('style'); st.textContent = D.css; document.head.appendChild(st); }

  const app = $('app');
  app.outerHTML = renderShell(D);

  const store = createStore(D.storageKey);
  store.connect();
  const tex = createTex();
  const ctx = createContext(D, store, tex);

  initRail(ctx);
  initProgress(ctx);
  initCheckpoints(ctx);
  initProblems(ctx);
  initExamples(ctx);
  initFormulas(ctx);
  initStatus(ctx);
  initDday(D);
  initHelp();
  initTheme(store, D.storageKey);
  initCitePop(slug);
  const router = initRouter(ctx, createLab(D));

  ctx.rehydrate = function rehydrate() {
    $$('textarea[data-note]').forEach((ta) => { ta.value = ctx.ST.note[ta.dataset.note] || ''; });
    ctx.paintQz(); ctx.paint();
    if (ctx.activeView === 'status') { ctx.buildGrid(); ctx.buildWeak(); }
  };
  store.onReplace(ctx.rehydrate);

  tex.queue([...ctx.units, ...ctx.exs, ...$$('.view:not(#v-study) .page')]);
  ctx.rehydrate();
  router.route();
  tex.whenReady();
}

boot().catch((e) => {
  console.error(e);
  const app = $('app');
  if (app) app.innerHTML = `<p class="boot err">콘솔을 불러오지 못했습니다: ${e.message}</p>`;
});
