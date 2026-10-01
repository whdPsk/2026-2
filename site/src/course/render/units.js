// 단원 article (본문은 content/<slug>/units/uNN.html → 컴파일된 body)
export function renderUnit(D, u) {
  const rng = D.chapters[String(u.ch)].range;
  const body = u.body;
  const nd = (body?.match(/class="derive"/g) || []).length;
  const nq = (body?.match(/class="qz"/g) || []).length;
  let lecb;
  if (u.lecNotes.length) {
    const dates = u.lecNotes.map((L) => `<a class="d" href="#/lecture?l=${L.id}" style="text-decoration:none">${L.md}</a>`).join('');
    const items = u.lecNotes.flatMap((L) => L.notes).map((n) => `<li>${n}</li>`).join('');
    lecb = `<div class="lec"><div class="lh">강의노트 반영 ${dates}</div><ul>${items}</ul></div>`;
  } else {
    lecb = '<div class="lec none"><div class="lh">아직 강의에서 다루지 않음 — 강의노트가 올라오면 교수님 전개와 강조점이 여기 붙습니다.</div></div>';
  }
  const star = u.star ? ' <span class="exam-tag">★ 최중요</span>' : '';
  const lecstar = u.lec ? ' <span class="lecstar">강의 진행</span>' : '';
  const book = D.drive.textbook
    ? `<a class="srclink" href="${D.drive.textbook}" target="_blank" rel="noopener">${D.pageLabel}${u.page} ↗</a>` : `${D.pageLabel}${u.page}`;
  const head = `<div class="unit-head"><span class="num">${u.id.toUpperCase()}</span><div class="titles">
<h3>${u.title} <span class="en">${u.en}</span></h3>
<div class="sub">${D.bookAbbrev} §${u.secs} · ${u.sub}</div>
<div class="meta"><span class="rngbadge r${rng}">${D.rangeShort[String(rng)]}</span>${lecstar} 핵심 유도 ${nd} · 체크포인트 ${nq} · ${book}${star}</div>
</div></div>`;
  return `<article class="unit" id="${u.id}">${head}<div class="unit-body">${lecb}${body ?? '<div class="soon">이 단원 본문은 작성 중입니다.</div>'}</div></article>`;
}

export const renderUnits = (D) => D.units.map((u) => renderUnit(D, u)).join('\n');
