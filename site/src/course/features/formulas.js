// 공식집: 각 단원의 .formula(암기) 상자를 장별로 모음 (처음 열 때 한 번 생성)
import { $ } from '../util.js';

export function initFormulas(ctx) {
  let built = false;
  ctx.buildFormulas = function buildFormulas() {
    if (built) return;
    built = true;
    const out = $('fx-out');
    out.innerHTML = '<p class="note">단원 수식을 불러오는 중…</p>';
    Promise.all(ctx.units.map((u) => ctx.texNow(u))).then(() => {
      let cur = null;
      const frag = document.createElement('div');
      for (const u of ctx.units) {
        const boxes = u.querySelectorAll('.formula');
        if (!boxes.length) continue;
        const c = ctx.uMeta[u.id].ch;
        if (c !== cur) { cur = c; frag.insertAdjacentHTML('beforeend', `<div class="fx-group"><h3>Ch.${c} · ${ctx.CH[c].ko}</h3></div>`); }
        const g = frag.lastElementChild;
        boxes.forEach((b) => {
          const w = document.createElement('div');
          w.className = 'fx-item';
          w.innerHTML = `<div class="src"><a href="#/${u.id}">${u.id.toUpperCase()} · ${ctx.uMeta[u.id].title}</a></div>`;
          const cl = b.cloneNode(true);
          cl.removeAttribute('data-tex');
          w.appendChild(cl);
          g.appendChild(w);
        });
      }
      out.innerHTML = '';
      out.appendChild(frag);
    });
  };
}
