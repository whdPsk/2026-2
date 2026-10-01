// 현황 뷰: KPI · 단원 진도 · 다시 볼 체크포인트 · 원자료 반영 장부 · 백업/초기화
import { esc } from '../util.js';

function ledgerTable(D) {
  const rows = D.ledger.rows;
  if (!rows.length) return '';
  const tr = rows.map((r) => {
    if (r.missing === null) {
      return `<tr><td>${esc(r.date)}</td><td>${esc(r.title)}</td><td colspan=3 style="color:var(--warm)">장부 미작성 — 아직 전수 대조 전(이전 방식 요약만 반영)</td></tr>`;
    }
    const pct = r.content === 0 ? 100 : Math.round((100 * r.cited) / r.content);
    const link = r.url ? `<a class="srclink" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)} ↗</a>` : esc(r.title);
    return `<tr><td>${esc(r.date)}</td><td>${link}</td><td>${r.n}</td><td>${r.n - r.content}</td><td><b>${r.cited}/${r.content}</b> (${pct}%)</td></tr>`;
  }).join('');
  return '<h3 style="font:700 15px/1.4 var(--sans);margin:26px 0 8px">원자료 반영 장부</h3>' +
    '<p class="note">원자료를 슬라이드·속기 구간 단위로 쪼개 전부 본문에 인용했는지 셉니다. 100%가 아니면 빌드가 실패하도록 되어 있습니다. 제외는 표지·출석·잡담처럼 내용이 없는 항목만.</p>' +
    '<div class="tblwrap"><table class="simple"><tr><th>날짜</th><th>자료</th><th>항목</th><th>제외</th><th>반영</th></tr>' + tr + '</table></div>';
}

export function renderStatusView(D) {
  const c = D.counts;
  return `<h1 class="vh">현황</h1>
  <p class="vsub">단원별 진도와, 체크포인트에서 <b>더 볼 것</b>으로 표시한 항목을 모읍니다. 보라색 밑줄은 강의에서 이미 다룬 단원입니다.</p>
  <div class="kpis">
    <div class="kpi"><b id="k-lec">0</b><span>강의 진도 단원 숙달</span></div>
    <div class="kpi"><b id="k-mid">0</b><span>중간범위 숙달 / ${c.mid}</span></div>
    <div class="kpi"><b id="k-fin">0</b><span>기말범위 숙달 / ${c.fin}</span></div>
    <div class="kpi"><b id="k-read">0</b><span>본 단원 / ${c.units}</span></div>
    <div class="kpi"><b id="k-weak">0</b><span>다시 볼 체크포인트</span></div>
    <div class="kpi"><b id="k-done">0</b><span>맞힌 체크포인트</span></div>
  </div>
  <h3 style="font:700 15px/1.4 var(--sans);margin:0 0 8px">단원 진도</h3>
  <div class="grid" id="st-grid"></div>
  <h3 style="font:700 15px/1.4 var(--sans);margin:0 0 8px">다시 볼 체크포인트</h3>
  <div class="weak" id="st-weak"></div>
  ${ledgerTable(D)}
  <div class="backup">
    <button class="tool" id="t-export">진도 내보내기 (.json)</button>
    <button class="tool" id="t-import">진도 불러오기</button>
    <input type="file" id="f-import" accept="application/json,.json" hidden>
    <span class="msg" id="backup-msg"></span>
  </div>
  <p style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="tool" id="t-reset">진도 초기화</button>
  <span class="confirmrow" id="reset-confirm" hidden>진도와 체크포인트 기록을 지웁니다(메모는 유지). <button class="tool" id="reset-yes" style="border-color:var(--bad);color:var(--bad)">지우기</button><button class="tool" id="reset-no">취소</button></span></p>
  <p class="note">마지막 업데이트: ${D.built} · 반영된 강의자료 ${c.lectures}건 · 진도·메모는 이 브라우저에 저장됩니다. 다른 기기로 옮길 때는 <b>내보내기</b>한 파일을 그 기기에서 <b>불러오기</b> 하세요.</p>`;
}
