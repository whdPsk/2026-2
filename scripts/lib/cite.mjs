// 원자료 인용 + 반영 장부(무누락 검사)
//
// content/<slug>/sources.json   {"L07": {title, short, kind: ppt|transcript|book|hw|notice|video, url, date}}
// content/<slug>/ledger/<SRC>.json
//   [{id: "L07.s3", loc: "슬라이드 3", raw: "원문", note?: "메모", skip?: "표지"}]
// 본문 어디서든 [[L07.s3]] 또는 [[L07.s3, S0922.12]] → 원자료 칩(<a class="cite">)
// 검사: 모르는 id 인용 → 오류 / skip 아닌데 한 번도 인용 안 된 항목 → 오류
import fs from 'node:fs';
import path from 'node:path';

export const CITE_RE = /\[\[([A-Za-z0-9_.\-,\s]+?)\]\]/g;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Citer {
  constructor(dir) {
    const sp = path.join(dir, 'sources.json');
    this.sources = fs.existsSync(sp) ? JSON.parse(fs.readFileSync(sp, 'utf8')) : {};
    this.items = {};
    const ld = path.join(dir, 'ledger');
    if (fs.existsSync(ld)) {
      for (const f of fs.readdirSync(ld).filter((x) => x.endsWith('.json')).sort()) {
        for (const it of JSON.parse(fs.readFileSync(path.join(ld, f), 'utf8'))) {
          const sid = it.id.split('.')[0];
          if (!this.sources[sid]) throw new Error(`ledger ${f}: source ${sid} not in sources.json`);
          if (this.items[it.id]) throw new Error(`duplicate ledger id ${it.id}`);
          this.items[it.id] = it;
        }
      }
    }
    this.used = new Map(); // id -> Set(where)
    this.unknown = [];
  }

  chip(ids, where) {
    const out = [];
    for (const i of ids.split(',').map((x) => x.trim()).filter(Boolean)) {
      const it = this.items[i];
      if (!it) {
        this.unknown.push([i, where]);
        out.push(`<span class="cite bad">?${esc(i)}</span>`);
        continue;
      }
      if (!this.used.has(i)) this.used.set(i, new Set());
      this.used.get(i).add(where);
      const s = this.sources[i.split('.')[0]];
      out.push(`<a class="cite k-${s.kind || 'x'}" data-c="${i}" href="javascript:void 0">${esc(s.short || i.split('.')[0])}·${esc(it.loc || '')}</a>`);
    }
    return '<span class="cites">' + out.join('') + '</span>';
  }

  sub(text, where) {
    if (!text || typeof text !== 'string' || !text.includes('[[')) return text;
    return text.replace(CITE_RE, (_, ids) => this.chip(ids, where));
  }

  /** 객체 안의 모든 문자열 필드에 인용 치환 */
  deep(o, where) {
    if (typeof o === 'string') return this.sub(o, where);
    if (Array.isArray(o)) return o.map((x) => this.deep(x, where));
    if (o && typeof o === 'object') {
      const r = {};
      for (const [k, v] of Object.entries(o)) r[k] = this.deep(v, where);
      return r;
    }
    return o;
  }

  /** 팝업용 데이터 (lazy-load 파일로 분리) */
  data() {
    const cites = {};
    for (const [i, it] of Object.entries(this.items)) cites[i] = { s: i.split('.')[0], l: it.loc || '', r: it.raw || '', n: it.note || '' };
    return { cites, sources: this.sources };
  }

  /** 장부 현황: 소스별 반영률 */
  report() {
    const bySrc = {};
    for (const [i, it] of Object.entries(this.items)) (bySrc[i.split('.')[0]] ||= []).push(it);
    const rows = [];
    const missing = [];
    for (const [sid, its] of Object.entries(bySrc)) {
      const content = its.filter((x) => !x.skip);
      const miss = content.filter((x) => !this.used.has(x.id)).map((x) => x.id);
      missing.push(...miss);
      rows.push({ sid, n: its.length, content: content.length, cited: content.length - miss.length, missing: miss });
    }
    for (const sid of Object.keys(this.sources)) if (!bySrc[sid]) rows.push({ sid, n: 0, content: 0, cited: 0, missing: null });
    for (const r of rows) {
      const s = this.sources[r.sid] || {};
      Object.assign(r, { title: s.title || r.sid, date: s.date || '', url: s.url || '' });
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.sid.localeCompare(b.sid));
    return { rows, missing };
  }
}
