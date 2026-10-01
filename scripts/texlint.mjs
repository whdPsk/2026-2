// 수식 검사: 컴파일된 데이터의 모든 \( \) · \[ \] 를 MathJax(TeX, 전체 패키지)로 파싱해 오류 목록 출력.
// 사용: npm run lint:tex            (먼저 npm run compile)
//       npm run lint:tex -- astro1  (특정 과목)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'site', 'public', 'data');
const BASE_MACROS = {
  dd: '\\mathrm{d}', ee: '\\mathrm{e}', ii: '\\mathrm{i}', vb: ['\\mathbf{#1}', 1], uv: ['\\hat{\\mathbf{#1}}', 1],
  curl: '\\nabla\\times', divg: '\\nabla\\cdot', grad: '\\nabla', pd: ['\\frac{\\partial #1}{\\partial #2}', 2],
  od: ['\\frac{\\mathrm{d} #1}{\\mathrm{d} #2}', 2], tr: '\\operatorname{tr}', Lag: '\\mathcal{L}',
};
const decode = (s) => s.replace(/<[^>]+>/g, (t) => (t.startsWith('<br') ? ' ' : t)).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const strings = (o) => (typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(strings) : o && typeof o === 'object' ? Object.values(o).flatMap(strings) : []);
const only = process.argv.slice(2);
const site = JSON.parse(fs.readFileSync(path.join(DATA, 'site.json'), 'utf8'));
let totalBad = 0;
for (const c of site.courses) {
  if (only.length && !only.includes(c.slug)) continue;
  const D = JSON.parse(fs.readFileSync(path.join(DATA, c.slug, 'course.json'), 'utf8'));
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const tex = new TeX({ packages: AllPackages, macros: { ...BASE_MACROS, ...D.macros } });
  const doc = mathjax.document('', { InputJax: tex, OutputJax: new SVG({ fontCache: 'none' }) });
  const chunks = [
    ...D.units.map((u) => [u.id, u.body || '']),
    ...D.examples.map((e) => ['ex ' + e.num, (e.body || '') + e.title + e.summary]),
    ...D.lectures.map((L) => ['lecture ' + L.id, strings(L).join(' ')]),
    ...D.hw.flatMap((S) => S.probs.map((P) => ['hw ' + P.num, P.stmt + (P.sol || '')])),
  ];
  let n = 0;
  const bad = [];
  for (const [where, html] of chunks) {
    const txt = decode(html);
    for (const m of txt.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)) {
      n++;
      const src = m[1] !== undefined ? m[1] : m[2];
      try {
        const node = doc.convert(src, { display: m[2] !== undefined });
        const err = adaptor.outerHTML(node).match(/data-mjx-error="([^"]*)"/);
        if (err) bad.push(`${where}: ${err[1]} :: ${src.slice(0, 100)}`);
      } catch (e) {
        bad.push(`${where}: ${e.message} :: ${src.slice(0, 100)}`);
      }
    }
  }
  console.log(`[${c.slug}] math ${n} errors ${bad.length}`);
  bad.slice(0, 40).forEach((x) => console.log('  ', x));
  totalBad += bad.length;
}
process.exitCode = totalBad ? 1 : 0;
