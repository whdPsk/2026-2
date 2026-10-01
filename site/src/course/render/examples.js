// 예제(Example) 뷰
export function renderExample(D, e) {
  const rng = D.chapters[String(e.ch)].range;
  const lectag = e.lec.length ? ` <span class="lecstar">★ 강의 지정 ${e.lec.join(', ')}</span>` : '';
  const en = e.en ? `<div class="exen"><b>EN</b> ${e.en}</div>` : '';
  const page = e.page && D.drive.textbook
    ? `<a class="srclink" href="${D.drive.textbook}" target="_blank" rel="noopener">${D.pageLabel}${e.page} ↗</a> · `
    : e.page ? `${D.pageLabel}${e.page} · ` : '강의 문제 · ';
  return `<article class="ex" id="ex-${e.num.replace(/\./g, '-')}" data-num="${e.num}" data-ch="${e.ch}" data-unit="${e.unit}"${e.lec.length ? ' data-lec="1"' : ''}>
<div class="exh"><span class="exn">${D.exampleLabel} ${e.num}</span>${lectag}
<h3>${e.title}</h3>${en}
<div class="exs">${e.summary}</div>
<div class="exmeta"><span class="rngbadge r${rng}">${D.rangeShort[String(rng)]}</span> · ${page}<a href="#/${e.unit}">${e.unit.toUpperCase()}로 이동</a></div>
</div><div class="exb">${e.body ?? '<div class="soon">작성 중</div>'}</div></article>`;
}

export function renderExamplesView(D, chBtns) {
  return `<h1 class="vh">교과서 Example</h1>
  <p class="vsub">${D.exampleIntro}</p>
  <div class="filters" id="ef">
    <button data-ch="all" aria-pressed="true">전체</button>
    <button data-ch="lec" aria-pressed="false">★ 강의 지정</button>
    ${chBtns}
    <input id="eq" type="search" placeholder="번호·키워드 (예: 9.6)" autocomplete="off">
    <span class="cnt" id="ecnt"></span>
  </div>
${D.examples.map((e) => renderExample(D, e)).join('\n')}`;
}
