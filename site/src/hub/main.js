// 허브(첫 화면): 과목 카드 목록. 데이터는 컴파일러가 만든 data/site.json
// (title·markSub·mark는 content의 course.json에 HTML로 들어 있으므로 이스케이프하지 않는다)
import '../styles/base.css';
import '../styles/app.css';
import './hub.css';
import { esc, asset } from '../course/util.js';

function dday(exams) {
  const now = new Date();
  let best = null;
  for (const x of exams || []) {
    const n = Math.ceil((new Date(x.date + 'T00:00:00+09:00') - now) / 864e5);
    if (n >= 0 && (!best || n < best.n)) best = { n, x };
  }
  return best ? `<span class="hb-dday">${esc(best.x.name)} <b>D-${best.n}</b></span>` : '';
}

function card(c) {
  const last = c.lastLecture ? `<div class="hb-last"><span>최근 강의</span> ${esc(c.lastLecture.date)} · ${c.lastLecture.title}</div>` : '';
  return `<a class="hb-card" href="./${c.slug}/">
  <div class="hb-top"><i>${c.mark}</i><div><h2>${c.title}</h2><p class="hb-sub">${c.markSub}</p></div>${dday(c.exams)}</div>
  <p class="hb-blurb">${esc(c.blurb || '')}</p>
  <div class="hb-meta"><span>${esc(c.prof)} 교수</span><span>${esc(c.schedule || '')}</span></div>
  ${last}
  <div class="hb-nums"><span><b>${c.units}</b> 단원</span><span><b>${c.examples}</b> 예제</span><span><b>${c.lectures}</b> 강의 반영</span>${c.frontier ? `<span>진도 ▸ ${esc(c.frontier)}</span>` : ''}</div>
</a>`;
}

async function boot() {
  const S = await fetch(asset('data/site.json'), { cache: 'no-cache' }).then((r) => r.json());
  document.title = S.title;
  document.getElementById('hub').innerHTML = `
<div class="hb-head"><div><h1>${esc(S.title)}</h1><p>${esc(S.subtitle)}</p></div><button class="tool" id="t-dark" aria-label="테마 전환">◐</button></div>
<main class="hb-main">${S.courses.map(card).join('')}</main>
<footer class="hb-foot">마지막 빌드 ${esc(S.built)} · 진도와 메모는 각자의 브라우저에만 저장됩니다.</footer>`;
  const tD = document.getElementById('t-dark');
  const cur = () => document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const paint = () => { tD.textContent = cur() === 'dark' ? '☀' : '◐'; };
  tD.onclick = () => {
    const t = cur() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('hub.theme', t); } catch { /* ignore */ }
    paint();
  };
  paint();
}

boot().catch((e) => { document.getElementById('hub').innerHTML = `<p class="boot err">불러오지 못했습니다: ${esc(e.message)}</p>`; });
