"""원자료 인용 + 반영 장부(무누락 검사).

<course_dir>/sources.json   {"L07": {"title", "short", "kind": ppt|transcript|book|hw|notice|video, "url", "date"}}
<course_dir>/ledger/<SRC>.json
    [{"id": "L07.s3", "loc": "슬라이드 3", "raw": "원문 그대로", "skip": "표지"?}, ...]
    - 원자료를 빠짐없이 원자 단위로 쪼갠 목록. raw는 원문(속기는 STT 원문, PPT는 슬라이드 텍스트).
    - skip은 내용이 없는 항목(표지·출석·잡담)에만. 내용 있는 항목은 반드시 본문 어딘가에서 인용돼야 함.
본문(units/ex/hw/lectures.json의 HTML)에서  [[L07.s3]]  또는  [[L07.s3, S0922.12]]  로 인용.
  → <a class="cite"> 칩으로 바뀌고, 누르면 원문 팝업 + 원본 파일 링크.
검사: (1) 모르는 id 인용 → 오류  (2) skip 아닌데 한 번도 인용 안 된 항목 → 오류(빌드 실패).
"""
import json, os, re, html, glob

CITE = re.compile(r'\[\[([A-Za-z0-9_.\-,\s]+?)\]\]')


def load(R):
    src_p = os.path.join(R, 'sources.json')
    sources = json.load(open(src_p, encoding='utf8')) if os.path.exists(src_p) else {}
    items = {}
    for f in sorted(glob.glob(os.path.join(R, 'ledger', '*.json'))):
        for it in json.load(open(f, encoding='utf8')):
            sid = it['id'].split('.')[0]
            if sid not in sources:
                raise SystemExit(f'ERROR ledger {f}: source {sid} not in sources.json')
            if it['id'] in items:
                raise SystemExit(f'ERROR duplicate ledger id {it["id"]}')
            items[it['id']] = it
    return sources, items


class Citer:
    def __init__(self, R):
        self.sources, self.items = load(R)
        self.used = {}      # id -> set(where)
        self.unknown = []

    def chip(self, ids, where):
        out = []
        for i in [x.strip() for x in ids.split(',') if x.strip()]:
            it = self.items.get(i)
            if not it:
                self.unknown.append((i, where)); out.append(f'<span class="cite bad">?{html.escape(i)}</span>'); continue
            self.used.setdefault(i, set()).add(where)
            s = self.sources[i.split('.')[0]]
            out.append(f'<a class="cite k-{s.get("kind","x")}" data-c="{i}" href="javascript:void 0">{html.escape(s.get("short", i.split(".")[0]))}·{html.escape(it.get("loc",""))}</a>')
        return '<span class="cites">' + ''.join(out) + '</span>'

    def sub(self, text, where):
        if not text or '[[' not in text:
            return text
        return CITE.sub(lambda m: self.chip(m.group(1), where), text)

    def data(self):
        """팝업용 데이터: 인용된 항목 + 출처 메타."""
        c = {}
        for i, it in self.items.items():
            c[i] = {'s': i.split('.')[0], 'l': it.get('loc', ''), 'r': it.get('raw', ''), 'n': it.get('note', '')}
        return {'cites': c, 'sources': self.sources}

    def report(self):
        rows, missing = [], []
        bysrc = {}
        for i, it in self.items.items():
            bysrc.setdefault(i.split('.')[0], []).append(it)
        for sid, its in bysrc.items():
            content = [x for x in its if not x.get('skip')]
            done = [x for x in content if x['id'] in self.used]
            miss = [x['id'] for x in content if x['id'] not in self.used]
            missing += miss
            rows.append((sid, len(its), len(content), len(done), miss))
        return rows, missing

    def status_html(self):
        rows, _ = self.report()
        have = {r[0] for r in rows}
        for sid in self.sources:
            if sid not in have: rows.append((sid, 0, 0, 0, None))
        if not rows:
            return ''
        tr = ''
        for sid, n, nc, nd, miss in sorted(rows, key=lambda r: (self.sources[r[0]].get('date', ''), r[0])):
            s = self.sources[sid]
            if miss is None:
                tr += f'<tr><td>{html.escape(s.get("date",""))}</td><td>{html.escape(s["title"])}</td><td colspan=3 style="color:var(--warm)">장부 미작성 — 아직 전수 대조 전(이전 방식 요약만 반영)</td></tr>'; continue
            pct = 100 if nc == 0 else round(100 * nd / nc)
            link = f'<a class="srclink" href="{s["url"]}" target="_blank" rel="noopener">{html.escape(s["title"])} ↗</a>' if s.get('url') else html.escape(s['title'])
            tr += f'<tr><td>{html.escape(s.get("date",""))}</td><td>{link}</td><td>{n}</td><td>{n-nc}</td><td><b>{nd}/{nc}</b> ({pct}%)</td></tr>'
        return ('<h3 style="font:700 15px/1.4 var(--sans);margin:26px 0 8px">원자료 반영 장부</h3>'
                '<p class="note">원자료를 슬라이드·속기 구간 단위로 쪼개 전부 본문에 인용했는지 셉니다. 100%가 아니면 빌드가 실패하도록 되어 있습니다. 제외는 표지·출석·잡담처럼 내용이 없는 항목만.</p>'
                '<div class="tblwrap"><table class="simple"><tr><th>날짜</th><th>자료</th><th>항목</th><th>제외</th><th>반영</th></tr>' + tr + '</table></div>')
