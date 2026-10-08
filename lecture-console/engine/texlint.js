// 사용: NODE_PATH=$(npm root -g) node texlint.js <course_dir>  — 페이지의 모든 \( \) · \[ \] 수식을 MathJax로 조판해 오류 목록 출력
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const dir = path.resolve(process.argv[2]);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + dir + '/out/preview.html'); await p.waitForFunction(() => window.MathJax && MathJax.tex2svg, null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const src = document.querySelector('main').innerHTML.replace(/<script[\s\S]*?<\/script>/g, '');
    const txt = src.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const re = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g; let m, n = 0; const bad = [];
    while ((m = re.exec(txt))) { n++; const tex = m[1] !== undefined ? m[1] : m[2];
      const node = MathJax.tex2svg(tex, { display: m[2] !== undefined });
      const e = node.querySelector('[data-mml-node="merror"]'); if (e) bad.push((e.getAttribute('data-mjx-error') || '') + ' :: ' + tex.slice(0, 120)); }
    return { n, bad };
  });
  console.log('math', r.n, 'errors', r.bad.length); r.bad.slice(0, 40).forEach(x => console.log(' ', x));
  await b.close();
})();
