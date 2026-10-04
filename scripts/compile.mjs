// 콘텐츠 컴파일러: content/<slug>/ (사람이 편집하는 원본) → site/public/data/<slug>/*.json (UI가 읽는 데이터)
//                                                          + site/<slug>/index.html (과목 페이지 엔트리)
// 사용:  node scripts/compile.mjs            # 전체 과목, 장부 누락 시 실패(exit 1)
//        node scripts/compile.mjs --loose    # 장부 누락이 있어도 경고만 (개발 서버용)
//        node scripts/compile.mjs astro1     # 특정 과목만
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Citer } from './lib/cite.mjs';
import { expandQz } from './lib/qz.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const SITE = path.join(ROOT, 'site');
const DATA = path.join(SITE, 'public', 'data');

const readJson = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);
const readText = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
const writeJson = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o)); };

/** 오늘 날짜(KST). 과제 풀이 공개 판정에 쓴다. CONSOLE_TODAY=YYYY-MM-DD 로 덮어쓰기 가능 */
export function todayKST() {
  if (process.env.CONSOLE_TODAY) return process.env.CONSOLE_TODAY;
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}
const md = (iso) => { const [, m, d] = iso.split('-'); return `${+m}/${d}`; };

export function compileCourse(slug, { today = todayKST(), log = console.log } = {}) {
  const R = path.join(CONTENT, slug);
  const cfg = readJson(path.join(R, 'course.json'));
  const meta = readJson(path.join(R, 'meta.json'));
  const lects = readJson(path.join(R, 'lectures.json'), []);
  const exmeta = readJson(path.join(R, 'examples.json'), []);
  const hw = readJson(path.join(R, 'hw.json'), []);
  const prof = readJson(path.join(R, 'profile.json'), {});
  const C = new Citer(R);

  // ── 강의 → 단원/예제 집계 ──
  const unitLec = {};
  const exLec = {};
  const covered = [];
  for (const L of lects) {
    for (const [uid, notes] of Object.entries(L.unitNotes || {})) {
      (unitLec[uid] ||= []).push({ id: L.id, date: L.date, md: md(L.date), notes: C.deep(notes, `lecture ${L.id}`) });
      if (!covered.includes(uid)) covered.push(uid);
    }
    for (const e of L.examples || []) (exLec[e] ||= []).push(md(L.date));
  }
  const order = meta.units.map((u) => u.id);
  covered.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const frontier = covered.length ? covered[covered.length - 1] : order[0];

  // ── 단원 ──
  const units = meta.units.map((u) => {
    const raw = readText(path.join(R, 'units', `${u.id}.html`));
    return {
      id: u.id, ch: u.ch, secs: u.secs || '', page: u.page ?? '', title: u.title, en: u.en || '', sub: u.sub || '', star: !!u.star,
      lec: !!unitLec[u.id], lecNotes: unitLec[u.id] || [],
      body: raw == null ? null : C.sub(expandQz(raw), u.id),
    };
  });

  // ── 예제 ──
  const examples = exmeta.map((e) => {
    const raw = readText(path.join(R, 'ex', `${e.num}.html`));
    const ch = +(e.ch || e.num.split('.')[0]);
    return {
      num: e.num, ch, unit: e.unit, page: e.page || 0,
      title: C.sub(e.title, `ex ${e.num}`), en: e.en || '', summary: C.sub(e.summary || '', `ex ${e.num}`),
      lec: exLec[e.num] || [],
      body: raw == null ? null : C.sub(expandQz(raw), `ex ${e.num}`),
    };
  });

  // ── 강의 로그 ──
  const lectures = [...lects].sort((a, b) => b.date.localeCompare(a.date)).map((L) => C.deep(L, `lecture ${L.id}`));

  // ── 과제: 풀이는 마감과 무관하게 항상 포함한다 ──
  const probmap = {};
  const hwSets = hw.map((S) => {
    const open = true;
    const probs = S.probs.map((P) => {
      probmap[P.num] = P.unit;
      const body = readText(path.join(R, 'hw', `${P.num}.html`)) || '';
      const stmt = (body.match(/<div class="stmt">([\s\S]*?)<\/div>\s*<!--\/stmt-->/) || [])[1] || '';
      const sol = (body.match(/<div class="sol">([\s\S]*)<\/div>\s*<!--\/sol-->/) || [])[1] || '';
      return {
        num: P.num, ch: P.ch, unit: P.unit, tag: P.tag || '', title: C.sub(P.title, `hw ${P.num}`),
        stmt: C.sub(stmt, `hw ${P.num}`), sol: sol ? C.sub(sol, `hw ${P.num}`) : null,
      };
    });
    return { id: S.id, kind: S.kind, title: C.sub(S.title, 'hw'), meta: C.sub(S.meta || '', 'hw'), due: S.due || null, open, probs };
  });

  // ── 선택 뷰: 실험실(lab/) ──
  let lab = null;
  const labDir = path.join(R, 'lab');
  if (cfg.lab && fs.existsSync(path.join(labDir, 'lab.html'))) {
    const out = path.join(DATA, slug, 'lab');
    fs.mkdirSync(out, { recursive: true });
    for (const f of ['lab.js', 'lab.css']) if (fs.existsSync(path.join(labDir, f))) fs.copyFileSync(path.join(labDir, f), path.join(out, f));
    lab = { label: cfg.lab.label, html: readText(path.join(labDir, 'lab.html')), js: fs.existsSync(path.join(labDir, 'lab.js')), css: fs.existsSync(path.join(labDir, 'lab.css')) };
  }

  const ledger = C.report();
  const nmid = meta.units.filter((u) => meta.chapters[String(u.ch)].range === 1).length;
  const data = {
    slug, title: cfg.title, mark: cfg.mark, markSub: cfg.markSub,
    bookAbbrev: cfg.bookAbbrev || '교재', pageLabel: cfg.pageLabel || '교재 p.', exampleLabel: cfg.exampleLabel || 'Example',
    lectureIntro: cfg.lectureIntro || '', exampleIntro: cfg.exampleIntro || '', hwIntro: cfg.hwIntro || '', policy: cfg.policy || '', hwEmpty: cfg.hwEmpty || '',
    helpNote: cfg.helpNote || '', macros: cfg.macros || {}, css: cfg.css || '',
    examStyle: C.sub(prof.examStyle || '', 'profile'),
    built: today,
    course: meta.course || {}, exams: meta.exams || [], rangeLabel: meta.rangeLabel, rangeShort: meta.rangeShort,
    drive: meta.drive || {}, chapters: meta.chapters,
    units, examples, lectures, hw: hwSets, probmap, frontier, covered,
    counts: { mid: nmid, fin: meta.units.length - nmid, units: meta.units.length, lectures: lects.filter((L) => L.kind !== 'cancel').length },
    ledger: { rows: ledger.rows, hasLedger: Object.keys(C.sources).length > 0 },
    lab,
    storageKey: slug + '.v1',
  };
  writeJson(path.join(DATA, slug, 'course.json'), data);
  writeJson(path.join(DATA, slug, 'cites.json'), C.data());

  // 과목 페이지 엔트리
  const entry = fs.readFileSync(path.join(SITE, 'course.template.html'), 'utf8')
    .replaceAll('%%SLUG%%', slug).replaceAll('%%TITLE%%', cfg.title);
  fs.mkdirSync(path.join(SITE, slug), { recursive: true });
  fs.writeFileSync(path.join(SITE, slug, 'index.html'), entry);

  // ── 검사 ──
  const allHtml = units.map((u) => u.body || '').join('') + examples.map((e) => e.body || '').join('');
  const nd = (allHtml.match(/class="derive"/g) || []).length;
  const nq = (allHtml.match(/class="qz"/g) || []).length;
  log(`[${slug}] units ${units.length} · examples ${examples.length} · derive ${nd} · qz ${nq} · lectures ${lects.length} · hw sets ${hw.length} · frontier ${frontier}`);
  const badMath = [];
  for (const m of allHtml.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)) if (/<[A-Za-z/!]/.test(m[0])) badMath.push(m[0].slice(0, 80));
  if (badMath.length) log(`[${slug}] WARN 수식 안 '<'+문자 ${badMath.length}개 (&lt; 로 쓰기):`, badMath.slice(0, 5));
  const qids = new Map();
  for (const m of allHtml.matchAll(/data-q="([^"]+)"/g)) qids.set(m[1], (qids.get(m[1]) || 0) + 1);
  const dup = [...qids].filter(([, n]) => n > 1).map(([k]) => k);
  if (dup.length) log(`[${slug}] WARN 체크포인트 id 중복:`, dup);
  for (const r of ledger.rows) if (r.missing !== null) log(`[${slug}] ledger ${r.sid}: ${r.cited}/${r.content} cited (${r.n - r.content} skip)` + (r.missing.length ? `  MISSING ${r.missing.join(', ')}` : ''));
  const errors = [];
  if (C.unknown.length) errors.push(`unknown cite ids: ${C.unknown.slice(0, 20).map(([i, w]) => `${i}@${w}`).join(', ')}`);
  if (ledger.missing.length) errors.push(`${ledger.missing.length} uncited ledger item(s)`);
  return { slug, data, errors, dupQz: dup };
}

export function compileAll({ only = null, strict = true, log = console.log } = {}) {
  const site = readJson(path.join(CONTENT, 'site.json'));
  const today = todayKST();
  const results = [];
  for (const c of site.courses) {
    if (only && !only.includes(c.slug)) continue;
    results.push(compileCourse(c.slug, { today, log }));
  }
  // 허브 데이터
  if (!only) {
    const hub = {
      title: site.title, subtitle: site.subtitle, owner: site.owner, built: today,
      courses: site.courses.map((c) => {
        const d = results.find((r) => r.slug === c.slug).data;
        const last = d.lectures.find((L) => L.kind !== 'cancel');
        return {
          ...c, title: d.title, mark: d.mark, markSub: d.markSub, exams: d.exams,
          units: d.units.length, examples: d.examples.length, lectures: d.counts.lectures,
          lastLecture: last ? { date: last.date, title: last.title.replace(/<[^>]+>/g, '') } : null,
          frontier: d.units.find((u) => u.id === d.frontier)?.title || '',
        };
      }),
    };
    writeJson(path.join(DATA, 'site.json'), hub);
  }
  const errs = results.flatMap((r) => r.errors.map((e) => `[${r.slug}] ${e}`));
  if (errs.length) {
    for (const e of errs) log('ERROR', e);
    if (strict) {
      log('FAIL: 원자료 장부 누락/오류 — 게시 금지. 본문에 [[ID]] 인용을 추가하세요. (개발 중엔 --loose)');
      process.exitCode = 1;
    }
  }
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const only = args.filter((a) => !a.startsWith('--'));
  compileAll({ only: only.length ? only : null, strict: !args.includes('--loose') });
}
