// 현황 뷰: 단원 진도 격자 · 초기화 · 진도 내보내기/불러오기
import { $ } from '../util.js';
import { MARK } from '../context.js';

export function initStatus(ctx) {
  const { ST, store, D, uMeta } = ctx;

  ctx.buildGrid = function buildGrid() {
    const d = ST.st;
    let h = '', lastR = 0;
    for (const id of ctx.ids) {
      const s = d[id] || 0, r = ctx.rangeOfUnit(id), m = uMeta[id];
      if (r !== lastR) {
        lastR = r;
        h += `<div style="grid-column:1/-1;margin:${r === 1 ? '0' : '14px'} 0 2px;font:700 11.5px/1 var(--sans);color:var(--ink3);letter-spacing:.06em">${D.rangeLabel[r]}</div>`;
      }
      h += `<a class="cell s${s}${ST.note[id] ? ' hasnote' : ''}${m.lec ? ' lecd' : ''}" href="#/${id}"><u>${MARK[s]} ${id.toUpperCase()}${m.lec ? ' · 강의' : ''}</u>${m.title}</a>`;
    }
    $('st-grid').innerHTML = h;
  };

  // 초기화
  const rs = $('t-reset'), rc = $('reset-confirm');
  rs.onclick = () => { rc.hidden = false; rs.hidden = true; };
  $('reset-no').onclick = () => { rc.hidden = true; rs.hidden = false; };
  $('reset-yes').onclick = () => {
    ST.st = {}; ST.qz = {}; // 메모(ST.note)는 유지
    store.persist(); ctx.paintQz(); ctx.paint(); ctx.buildGrid(); ctx.buildWeak();
    rc.hidden = true; rs.hidden = false;
  };

  // 백업
  const msg = (t, cls = '') => { const m = $('backup-msg'); m.textContent = t; m.className = 'msg ' + cls; };
  $('t-export').onclick = () => { store.exportJson(D); msg('파일을 저장했습니다.', 'ok'); };
  const fi = $('f-import');
  $('t-import').onclick = () => fi.click();
  fi.onchange = () => {
    const f = fi.files[0];
    if (!f) return;
    f.text().then((txt) => {
      try { store.importJson(txt, D.slug); msg('불러왔습니다 (기존 기록과 합침).', 'ok'); }
      catch (e) { msg('불러오기 실패: ' + e.message, 'bad'); }
      fi.value = '';
    });
  };
}
