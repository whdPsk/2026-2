// 과제 · 문제 뷰. 마감 전 풀이는 컴파일 단계에서 이미 빠져 있다(sol=null).
const TAGS = {
  req: '<span class="hwst req">필수</span>',
  opt: '<span class="hwst">선택</span>',
  ex: '<span class="hwst ex">강의 Exercise</span>',
  hw: '<span class="hwst req">과제</span>',
};

export function renderHwView(D, chBtns) {
  const out = [
    '<h1 class="vh">과제 · 문제</h1>',
    `<p class="vsub">${D.hwIntro}</p>`,
    `<div class="policy">${D.policy}</div>`,
    `<div class="filters" id="pf"><button data-ch="all" aria-pressed="true">전체</button>${chBtns}<input id="pq" type="search" placeholder="번호·키워드" autocomplete="off"><span class="cnt" id="pcnt"></span></div>`,
  ];
  if (!D.hw.length) out.push(`<div class="soon">${D.hwEmpty}</div>`);
  for (const S of D.hw) {
    let hm = S.meta;
    if (S.due) hm += ` · 마감 ${S.due}` + (S.open ? ' · 풀이 공개됨' : ' · 풀이는 마감 후 공개');
    out.push(`<section class="hwset" id="hw-${S.id}"><h3>${S.title}</h3><div class="hm">${hm}</div>`);
    for (const P of S.probs) {
      const ans = P.sol ? `<div class="ans">${P.sol}</div>` : '<div class="lock">풀이는 마감 후 공개됩니다. 먼저 관련 단원을 보고 스스로 풀어보세요.</div>';
      out.push(`<details class="prob" data-num="${P.num}" data-ch="${P.ch}"><summary>${TAGS[P.tag] || ''}<span class="ub">${P.unit.toUpperCase()}</span><b>${P.num}</b>${P.title}</summary><div class="stmt">${P.stmt}</div>${ans}</details>`);
    }
    out.push('</section>');
  }
  return out.join('\n');
}
