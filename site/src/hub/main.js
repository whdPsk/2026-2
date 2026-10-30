// 허브(첫 화면): 과목 카드 목록. 데이터는 컴파일러가 만든 data/site.json
// (title·markSub·mark는 content의 course.json에 HTML로 들어 있으므로 이스케이프하지 않는다)
import '../styles/base.css';
import '../styles/app.css';
import './hub.css';
import { esc, asset } from '../course/util.js';
import { orbitMap, disciplines, disciplineIcon } from '../science.js';

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
  const subject = disciplines[c.slug] || disciplines.astro1;
  const last = c.lastLecture ? `<div class="hb-last"><span>최근 반영</span> ${esc(c.lastLecture.date)} · ${c.lastLecture.title}</div>` : '';
  return `<a class="hb-card" data-subject="${c.slug}" href="./${c.slug}/">
  <div class="hb-card-index"><span>${subject.name}</span><span aria-hidden="true">↗</span></div>
  <div class="hb-illustration">${disciplineIcon(c.slug)}<span>${subject.formula}</span></div>
  <div class="hb-top"><div><h2>${c.title}</h2><p class="hb-sub">${c.markSub}</p></div></div>
  <p class="hb-blurb">${esc(c.blurb || '')}</p>
  <div class="hb-meta"><span>${esc(c.prof)} 교수</span><span>${esc(c.schedule || '')}</span></div>
  ${last}
  <div class="hb-nums"><span><b>${c.units}</b> 단원</span><span><b>${c.examples}</b> 예제</span><span><b>${c.lectures}</b> 강의</span></div>
  <div class="hb-card-foot">${dday(c.exams)}<span>노트 열기 <span aria-hidden="true">→</span></span></div>
</a>`;
}

async function boot() {
  const S = await fetch(asset('data/site.json'), { cache: 'no-cache' }).then((r) => r.json());
  document.title = S.title;
  document.getElementById('hub').innerHTML = `
<div class="hb-head"><a class="hb-wordmark" href="./"><span aria-hidden="true">✳</span> PHYSICS / NOTES</a><div class="hb-head-tools"><span>SEOUL NATIONAL UNIVERSITY · 2026.2</span><button class="tool" id="t-dark" aria-label="테마 전환">◐</button></div></div>
<section class="hb-hero" aria-labelledby="hub-title"><div class="hb-hero-copy"><p class="hb-eyebrow">COURSE NOTES / 2026–2</p><h1 id="hub-title">${esc(S.title)}</h1><p class="hb-hero-sub">${esc(S.subtitle)}</p><div class="hb-hero-stats"><span><b>0${S.courses.length}</b> 과목</span><span><b>${S.courses.reduce((n,c)=>n+c.units,0)}</b> 단원</span><span><b>${S.courses.reduce((n,c)=>n+c.examples,0)}</b> 예제</span></div></div><div class="hb-hero-art">${orbitMap()}<span class="hb-art-caption">FIG. 01 / ORBITS & INTERACTIONS</span></div></section>
<div class="hb-section-head"><h2>과목별 학습 노트</h2><span>COURSE INDEX / 01—03</span></div>
<nav class="hb-shortcuts" aria-label="학습 도구"><span class="hb-exam-ended">중간고사 종료 · 10/30</span><a class="hb-plan" href="${asset('exam-plan.html')}">중간고사 계획·기록 <span aria-hidden="true">→</span></a></nav>
<main class="hb-main">${S.courses.map(card).join('')}</main>
<footer class="hb-foot"><span>2026–2 / PHYSICS NOTEBOOK</span><span>마지막 빌드 ${esc(S.built)} · 진도와 메모는 각자의 브라우저에만 저장됩니다.</span></footer>`;
  const tD = document.getElementById('t-dark');
  const cur = () => document.documentElement.getAttribute('data-theme') || 'dark';
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
