// 강의 진도 뷰 (lectures.json 날짜 역순 타임라인)
import { esc } from '../util.js';

export function renderLectureView(D) {
  const out = [`<h1 class="vh">강의 진도</h1><p class="vsub">${D.lectureIntro}</p>`];
  if (!D.lectures.length) out.push('<div class="soon">아직 반영된 강의자료가 없습니다. 강의노트·녹음이 들어오면 날짜순으로 여기에 쌓입니다.</div>');
  if (D.examStyle) out.push(`<div class="callout exam"><b class="head">출제 스타일 — 이 콘솔이 무게를 두는 곳</b>${D.examStyle}</div>`);
  if (D.course.info) out.push(`<div class="callout"><b class="head">과목 정보</b>${D.course.info}</div>`);
  out.push('<div class="tl">');
  const uTitle = Object.fromEntries(D.units.map((u) => [u.id, u.title]));
  for (const L of D.lectures) {
    const cls = L.kind === 'cancel' ? ' cancel' : '';
    const chips = Object.keys(L.unitNotes || {}).map((u) => `<a href="#/${u}">${u.toUpperCase()} · ${uTitle[u] ?? ''}</a>`).join('');
    const exch = (L.examples || []).map((e) => `<a class="lx" href="#/examples?e=${e}">${D.exampleLabel} ${e}</a>`).join('');
    const summ = (L.summary || []).map((s) => `<li>${s}</li>`).join('');
    const src = L.url ? ` · <a class="srclink" href="${L.url}" target="_blank" rel="noopener">${esc(L.file)} ↗</a>` : '';
    let eqt = '';
    if (L.eqs?.length) {
      const rows = L.eqs.map((q) => `<tr><td>${q.eq}</td><td>${q.what}</td><td>${q.tm || ''}</td><td><a href="#/${q.unit}">${q.unit.toUpperCase()}</a></td></tr>`).join('');
      eqt = `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px;color:var(--lec)">강의노트 식 번호 ↔ 교재 대응표 (${L.eqs.length}개)</summary><div class="tblwrap"><table class="eqmap"><tr><th>강의노트</th><th>내용</th><th>교재</th><th>단원</th></tr>${rows}</table></div></details>`;
    }
    out.push(`<div class="tl-item${cls}" id="lec-${L.id}"><div class="tm">${L.date} (${L.dow || ''})${src}</div><h3>${L.title}</h3>
<div class="tb"><ul>${summ}</ul>${chips || exch ? `<div class="chips">${chips}${exch}</div>` : ''}${eqt}</div></div>`);
  }
  out.push('</div>');
  return out.join('\n');
}
