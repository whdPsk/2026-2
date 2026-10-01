// 과목 전용 선택 뷰(content/<slug>/lab/). 처음 열 때 lab.css·lab.js를 불러오고 window.labInit()을 호출한다.
import { asset } from '../util.js';

export function createLab(D) {
  if (!D.lab) return null;
  let ready = null;
  function load() {
    if (ready) return ready;
    if (D.lab.css) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = asset(`data/${D.slug}/lab/lab.css`);
      document.head.appendChild(l);
    }
    ready = D.lab.js
      ? new Promise((res, rej) => { const s = document.createElement('script'); s.src = asset(`data/${D.slug}/lab/lab.js`); s.onload = res; s.onerror = rej; document.head.appendChild(s); })
      : Promise.resolve();
    return ready;
  }
  return { open: () => load().then(() => { if (window.labInit) window.labInit(); }) };
}
