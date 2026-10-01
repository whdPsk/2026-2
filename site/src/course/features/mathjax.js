// MathJax: 보이는 것 먼저 조판, 나머지는 백그라운드로
import { $ } from '../util.js';

const MJ_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg-full.js';
const BASE_MACROS = {
  dd: '\\mathrm{d}', ee: '\\mathrm{e}', ii: '\\mathrm{i}', vb: ['\\mathbf{#1}', 1], uv: ['\\hat{\\mathbf{#1}}', 1],
  curl: '\\nabla\\times', divg: '\\nabla\\cdot', grad: '\\nabla', pd: ['\\frac{\\partial #1}{\\partial #2}', 2],
  od: ['\\frac{\\mathrm{d} #1}{\\mathrm{d} #2}', 2], tr: '\\operatorname{tr}', Lag: '\\mathcal{L}',
};

export function loadMathJax(courseMacros = {}) {
  window.MathJax = {
    tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']], processEscapes: true, macros: { ...BASE_MACROS, ...courseMacros } },
    svg: { fontCache: 'global' }, startup: { typeset: false },
    options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] },
  };
  const s = document.createElement('script');
  s.src = MJ_SRC; s.defer = true;
  document.head.appendChild(s);
}

export function createTex() {
  const pend = [];
  let total = 0, doneN = 0, pumping = false;
  const texEl = () => $('tex');

  function tex(el) {
    if (!el || el.dataset.tex || !window.MathJax || !MathJax.typesetPromise) return Promise.resolve();
    el.dataset.tex = '1';
    return MathJax.typesetPromise([el]).catch(() => {}).then(() => {
      doneN++;
      texEl().textContent = doneN >= total ? '' : '수식 ' + Math.min(99, Math.round((100 * doneN) / total)) + '%';
    });
  }
  function pump() {
    if (pumping) return;
    pumping = true;
    (function step() {
      let el;
      do { el = pend.shift(); } while (el && el.dataset.tex);
      if (!el) { texEl().textContent = ''; pumping = false; return; }
      tex(el).then(() => setTimeout(step, 0));
    })();
  }
  function texNow(el) {
    if (el && !el.dataset.tex) { total++; return tex(el); }
    return Promise.resolve();
  }
  function queue(els) { els.forEach((e) => pend.push(e)); total = pend.length; }
  function whenReady() {
    (function w() {
      if (window.MathJax && MathJax.startup && MathJax.startup.promise) MathJax.startup.promise.then(pump);
      else setTimeout(w, 80);
    })();
  }
  return { texNow, queue, whenReady };
}
