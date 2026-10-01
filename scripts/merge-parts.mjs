// 나눠 작업한 결과 병합: content/<slug>/parts/ex_*.json → examples.json (num 기준 교체·추가, 번호순 정렬)
//                       content/<slug>/parts/lec_*.json → lectures.json (id 기준 교체·추가, 날짜순)
// 사용: node scripts/merge-parts.mjs astro1   (병합 후 parts/ 는 직접 지운다)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(ROOT, 'content', process.argv[2] || '');
const P = path.join(R, 'parts');
if (!process.argv[2] || !fs.existsSync(P)) { console.log('사용: node scripts/merge-parts.mjs <slug>  (content/<slug>/parts/ 필요)'); process.exit(2); }
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const list = (x) => (Array.isArray(x) ? x : [x]);
const files = fs.readdirSync(P).sort();

const ex = new Map(rd(path.join(R, 'examples.json')).map((e) => [e.num, e]));
for (const f of files.filter((f) => f.startsWith('ex_'))) for (const e of list(rd(path.join(P, f)))) ex.set(e.num, { ...(ex.get(e.num) || {}), ...e });
const key = (n) => n.split('.').map(Number);
const exs = [...ex.values()].sort((a, b) => { const x = key(a.num), y = key(b.num); return x[0] - y[0] || x[1] - y[1]; });
fs.writeFileSync(path.join(R, 'examples.json'), JSON.stringify(exs, null, 1));

const lec = new Map(rd(path.join(R, 'lectures.json')).map((l) => [l.id, l]));
for (const f of files.filter((f) => f.startsWith('lec_'))) for (const l of list(rd(path.join(P, f)))) lec.set(l.id, l);
fs.writeFileSync(path.join(R, 'lectures.json'), JSON.stringify([...lec.values()].sort((a, b) => a.date.localeCompare(b.date)), null, 1));

const miss = exs.filter((e) => !fs.existsSync(path.join(R, 'ex', e.num + '.html'))).map((e) => e.num);
console.log(`examples ${exs.length} · lectures ${lec.size}` + (miss.length ? ` · ex html 없음: ${miss.join(', ')}` : ''));
