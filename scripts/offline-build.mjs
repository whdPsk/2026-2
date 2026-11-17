import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function filesIn(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix + entry.name;
    return entry.isDirectory() ? filesIn(path.join(dir, entry.name), name + '/') : [name];
  }).sort();
}

export function offlineBuild(root, base) {
  return {
    name: 'offline-notes', apply: 'build',
    closeBundle() {
      const out = path.join(root, 'dist');
      const vendor = path.join(out, 'vendor/mathjax');
      const source = path.join(root, 'node_modules/mathjax-full');
      fs.mkdirSync(vendor, { recursive: true });
      // Include lazy-loaded menu, accessibility and TeX extensions as well as SVG rendering.
      fs.cpSync(path.join(source, 'es5'), vendor, { recursive: true });
      fs.copyFileSync(path.join(source, 'LICENSE'), path.join(vendor, 'LICENSE'));
      const assets = filesIn(out).filter((name) => !['sw.js', 'offline-meta.json'].includes(name)).map((name) => {
        const bytes = fs.readFileSync(path.join(out, name));
        return { url: base + name, sha256: hash(bytes), bytes: bytes.length };
      });
      const worker = fs.readFileSync(path.join(root, 'site/src/offline/sw.js'), 'utf8');
      const metadata = {
        revision: hash(JSON.stringify(assets) + worker).slice(0, 20),
        builtAt: new Date().toISOString(), count: assets.length,
        bytes: assets.reduce((n, asset) => n + asset.bytes, 0),
      };
      fs.writeFileSync(path.join(out, 'offline-meta.json'), JSON.stringify(metadata));
      fs.writeFileSync(path.join(out, 'sw.js'), `const CONFIG = ${JSON.stringify({ ...metadata, base, assets })};\n${worker}`);
      console.log(`Offline bundle: ${assets.length} files, ${(metadata.bytes / 1048576).toFixed(1)} MB`);
    },
  };
}
