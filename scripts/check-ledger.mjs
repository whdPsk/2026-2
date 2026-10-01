// 부분 장부 검사 (여러 작업자가 나눠 쓸 때): 지정 파일 안의 [[ID]] 인용만 세어 지정 소스의 반영률을 본다.
// 사용: npm run check -- astro1 --src L09,D1001 --files "units/u17.html,units/u18.html,ex/6.*.html"
// 전체 검사는 그냥 npm run compile (장부 100%가 아니면 실패).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Citer } from './lib/cite.mjs';
import { expandQz } from './lib/qz.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const slug = a[0];
const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
if (!slug || !opt('--src') || !opt('--files')) {
  console.log('사용: npm run check -- <slug> --src ID1,ID2 --files "units/u01.html,ex/1.*.html"');
  process.exit(2);
}
const R = path.join(ROOT, 'content', slug);
const files = opt('--files').split(',').flatMap((g) => fs.globSync(g, { cwd: R })).sort();
const C = new Citer(R);
let bad = false;
const qids = new Map();
for (const f of files) {
  const t = expandQz(fs.readFileSync(path.join(R, f), 'utf8'));
  C.sub(t, f);
  if (f.endsWith('.html')) {
    for (const [o, c] of [['\\(', '\\)'], ['\\[', '\\]']]) {
      const no = t.split(o).length - 1, nc = t.split(c).length - 1;
      if (no !== nc) { console.log(`MATH ${f}: ${o} ${no} vs ${c} ${nc}`); bad = true; }
    }
    for (const m of t.matchAll(/data-q="([^"]+)"/g)) {
      if (qids.has(m[1])) { console.log(`DUPQ ${m[1]} in ${f} and ${qids.get(m[1])}`); bad = true; }
      qids.set(m[1], f);
    }
  } else {
    try { JSON.parse(t); } catch (e) { console.log('JSON', f, e.message); bad = true; }
  }
}
for (const [i, w] of C.unknown) { console.log('UNKNOWN', i, w); bad = true; }
for (const s of opt('--src').split(',')) {
  const its = Object.values(C.items).filter((x) => x.id.split('.')[0] === s);
  if (!its.length) { console.log(`${s}: NO LEDGER`); bad = true; continue; }
  const cont = its.filter((x) => !x.skip);
  const miss = cont.filter((x) => !C.used.has(x.id)).map((x) => x.id);
  console.log(`${s}: ${cont.length - miss.length}/${cont.length} cited (skip ${its.length - cont.length})` + (miss.length ? `  MISSING ${miss.join(', ')}` : ''));
  if (miss.length) bad = true;
}
console.log(bad ? 'NOT OK' : 'OK');
process.exitCode = bad ? 1 : 0;
