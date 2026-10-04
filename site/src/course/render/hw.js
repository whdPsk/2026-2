// 과제 · 문제 뷰. 풀이는 마감과 무관하게 항상 표시한다(풀이 원고가 없으면 sol=null).
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
    if (S.due) hm += ` · 마감 ${S.due}`;
    out.push(`<section class="hwset" id="hw-${S.id}"><h3>${S.title}</h3><div class="hm">${hm}</div>`);
    for (const P of S.probs) {
      const ans = P.sol ? `<div class="ans">${P.sol}</div>` : '<div class="lock">풀이가 아직 작성되지 않았습니다.</div>';
      out.push(`<details class="prob" data-num="${P.num}" data-ch="${P.ch}"><summary>${TAGS[P.tag] || ''}<span class="ub">${P.unit.toUpperCase()}</span><b>${P.num}</b>${P.title}</summary><div class="stmt">${P.stmt}</div>${ans}</details>`);
    }
    out.push('</section>');
  }
  return out.join('\n');
}
