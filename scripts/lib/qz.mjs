// 체크포인트 약식 → HTML.  단원/예제 HTML 안에서 그대로 써도 빌드 때 펼쳐진다.
//   ::qz u01-4
//   질문 HTML
//   ::a
//   답 HTML (태그로 시작하지 않으면 <p>로 감쌈)
//   ::end
const RE = /^::qz (\S+)\n([\s\S]*?)\n::a\n([\s\S]*?)\n::end$/gm;

export const qzHtml = (id, q, a) =>
  `<div class="qz" data-q="${id}"><div class="qq">${q}</div><div class="qbar"><button class="rv">답 확인</button>` +
  `<span class="vd"><span>스스로 채점:</span><button data-v="1">맞음</button><button data-v="0">더 볼 것</button></span></div>` +
  `<div class="qa"><div class="alabel">Answer</div>${a}</div></div>`;

export function expandQz(s) {
  if (!s || !s.includes('::qz')) return s;
  return s.replace(RE, (_, id, q, a) => {
    a = a.trim();
    if (!a.startsWith('<')) a = `<p>${a}</p>`;
    return qzHtml(id, q.trim(), a);
  });
}
