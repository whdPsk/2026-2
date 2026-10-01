import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileAll } from './scripts/compile.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(ROOT, 'site');

// GitHub Pages 하위 경로. CI에서는 저장소 이름으로 자동 설정(BASE_PATH=/<repo>/), 로컬 기본값은 아래.
const BASE = process.env.BASE_PATH || '/notes-2026-2/';

/** 허브(site/index.html) + 과목 페이지(site/<slug>/index.html, 컴파일러가 생성) 전부를 빌드 입력으로 */
function pageInputs() {
  const inputs = { index: path.join(SITE, 'index.html') };
  for (const d of fs.readdirSync(SITE, { withFileTypes: true })) {
    const p = path.join(SITE, d.name, 'index.html');
    if (d.isDirectory() && !['src', 'public'].includes(d.name) && fs.existsSync(p)) inputs[d.name] = p;
  }
  return inputs;
}

/** 개발 서버: content/ 를 고치면 다시 컴파일하고 브라우저 새로고침 */
function contentWatch() {
  return {
    name: 'content-watch',
    configureServer(server) {
      const dir = path.join(ROOT, 'content');
      server.watcher.add(dir);
      let t = null;
      server.watcher.on('all', (_, file) => {
        if (!file.startsWith(dir)) return;
        clearTimeout(t);
        t = setTimeout(() => {
          compileAll({ strict: false, log: (...a) => server.config.logger.info(a.join(' ')) });
          server.ws.send({ type: 'full-reload' });
        }, 150);
      });
    },
  };
}

export default defineConfig(({ command }) => {
  // dev/build 모두 시작 전에 한 번 컴파일 (build는 package.json에서 strict 컴파일을 먼저 돌림)
  if (command === 'serve') compileAll({ strict: false });
  return {
    root: SITE,
    base: BASE,
    publicDir: path.join(SITE, 'public'),
    plugins: [contentWatch()],
    build: {
      outDir: path.join(ROOT, 'dist'),
      emptyOutDir: true,
      rollupOptions: { input: pageInputs() },
    },
    server: { open: BASE },
    preview: { open: BASE },
  };
});
