// 사용: NODE_PATH=$(npm root -g) node check.js <course_dir> [#/hash ...]  → 각 뷰의 MathJax 오류·미렌더 수식·JS 오류 + 첫 화면 스크린샷
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const dir = path.resolve(process.argv[2]); const hs = process.argv.slice(3);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('' + e)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file://' + dir + '/out/preview.html'); await p.waitForTimeout(4000);
  for (const h of hs) {
    await p.evaluate(h => { location.hash = h }, h); await p.waitForTimeout(h.includes('examples') || h.includes('hw') || h.includes('formulas') ? 45000 : 12000);
    const r = await p.evaluate(() => { const v = [...document.querySelectorAll('.view')].find(x => x.offsetParent);
      return { merr: [...v.querySelectorAll('mjx-merror,[data-mml-node="merror"]')].slice(0, 5).map(e => e.getAttribute('data-mjx-error') || e.textContent), raw: (v.innerText.match(/\\\(|\\\[/g) || []).length } });
    console.log(h, JSON.stringify(r));
    await p.screenshot({ path: dir + '/out/shot-' + h.replace(/[^a-z0-9]/gi, '') + '.png' });
  }
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
