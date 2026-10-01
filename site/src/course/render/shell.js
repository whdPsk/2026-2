// 콘솔 골격: 헤더 · 단원 레일 · 7개 뷰 · 도움말 · 원자료 팝업
import { renderUnits } from './units.js';
import { renderExamplesView } from './examples.js';
import { renderLectureView } from './lecture.js';
import { renderHwView } from './hw.js';
import { renderStatusView } from './status.js';

export function renderShell(D) {
  const chBtns = Object.keys(D.chapters).map((c) => `<button data-ch="${c}" aria-pressed="false">Ch.${c}</button>`).join('');
  const fr = D.units.find((u) => u.id === D.frontier);
  const frontier = D.covered.length && fr
    ? `<div class="lecfrontier">강의 진도 ▸ <a href="#/${D.frontier}" style="display:inline;padding:0;color:var(--lec)">${D.frontier.toUpperCase()} ${fr.title}</a></div>` : '';
  const examStyle = D.examStyle ? `<br><br><b>출제 스타일.</b> ${D.examStyle}` : '';
  return `
<header>
  <div class="mark"><a class="home" href="../" title="전체 과목으로"><i>${D.mark}</i><div><b>${D.title}</b><s>${D.markSub}</s></div></a></div>
  <nav class="modes" id="modes">
    <button data-view="study" aria-current="true">학습</button>
    <button data-view="lecture">강의</button>
    <button data-view="examples">Example</button>
    <button data-view="formulas">공식집</button>
    <button data-view="hw">과제</button>
    <button data-view="status">현황</button>
    ${D.lab ? `<button data-view="lab">${D.lab.label}</button>` : ''}
  </nav>
  <span class="spacer"></span>
  <span class="dday" id="dday"></span>
  <span id="tex"></span>
  <span id="sync"></span>
  <button class="tool" id="t-help" aria-label="사용법">?</button>
  <button class="tool" id="t-dark" aria-label="테마 전환">◐</button>
</header>
<div class="shell">
<aside class="rail" id="rail">
  <input id="q" class="tool" style="width:100%;padding:7px 10px;font-size:12.5px;margin-bottom:6px" type="search" placeholder="단원 검색  /" autocomplete="off">
  <div class="rangesel" id="rsel"><button data-r="all" aria-pressed="true">전체</button><button data-r="lec" title="강의에서 다룬 단원만">강의 진도</button><button data-r="1" title="${D.rangeLabel['1']}">중간</button><button data-r="2" title="${D.rangeLabel['2']}">기말</button></div>
  ${frontier}
</aside>
<main>
<div class="view active" id="v-study"><div class="page">
${renderUnits(D)}
</div></div>
<div class="view" id="v-lecture"><div class="page wide">
${renderLectureView(D)}
</div></div>
<div class="view" id="v-examples"><div class="page">
${renderExamplesView(D, chBtns)}
</div></div>
<div class="view" id="v-formulas"><div class="page">
  <h1 class="vh">공식집</h1>
  <p class="vsub">각 단원의 <b>암기</b> 상자를 장별로 모았습니다. 항목을 누르면 그 단원으로 이동합니다.</p>
  <div id="fx-out"></div>
</div></div>
<div class="view" id="v-hw"><div class="page">
${renderHwView(D, chBtns)}
</div></div>
<div class="view" id="v-status"><div class="page wide">
${renderStatusView(D)}
</div></div>
${D.lab ? `<div class="view" id="v-lab"><div class="page wide">${D.lab.html}</div></div>` : ''}
</main>
</div>

<dialog id="dlg-help">
  <h3>사용법</h3>
  <div class="tblwrap"><table class="simple">
    <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>이전 / 다음 단원</td></tr>
    <tr><td><kbd>/</kbd></td><td>단원 검색</td></tr>
    <tr><td><kbd>1</kbd>–<kbd>${D.lab ? 7 : 6}</kbd></td><td>학습 · 강의 · ${D.exampleLabel} · 공식집 · 과제 · 현황${D.lab ? ' · ' + D.lab.label : ''}</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>검색 해제 / 창 닫기</td></tr>
  </table></div>
  <p class="note" style="margin:12px 0 0">${D.helpNote}${examStyle}</p>
  <div style="text-align:right;margin-top:14px"><button class="tool" id="help-close">닫기</button></div>
</dialog>
<div id="citepop" role="dialog" aria-label="원자료" hidden><div class="cph"><b id="cp-t"></b><button class="tool" id="cp-x" aria-label="닫기">✕</button></div><div class="cpl" id="cp-l"></div><div class="cpr" id="cp-r"></div><div class="cpn" id="cp-n"></div><a class="srclink" id="cp-a" target="_blank" rel="noopener">원본 파일 열기 ↗</a></div>`;
}
