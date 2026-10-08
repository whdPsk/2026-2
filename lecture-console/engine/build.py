#!/usr/bin/env python3
"""강의 학습 콘솔 공통 빌더.  사용: python3 build.py <course_dir>
<course_dir>/course.json  콘솔 설정(slug, 제목, 문구, MathJax 매크로)
<dir>/meta.json      과목·시험·장·단원 목록
<dir>/lectures.json  강의자료 로그(날짜순) — 새 강의노트가 오면 여기에 한 항목 추가
<dir>/examples.json  교과서 Example 메타 / 본문은 ex/<num>.html
units/<id>.html 단원 본문(unit-body 내부)
<dir>/hw.json        과제 세트 / 문항 본문은 hw/<num>.html (<div class="stmt">, <div class="sol">)
출력: <course_dir>/out/<slug>.html (Artifact로 publish)
"""
import json, os, re, html, datetime
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cite import Citer
E = os.path.dirname(os.path.abspath(__file__))
R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
def rdE(p): return open(os.path.join(E, p), encoding='utf8').read()
def rd(p): return open(os.path.join(R, p), encoding='utf8').read()
def js(p): return json.loads(rd(p))

cfg = js('course.json')
meta = js('meta.json')
lects = js('lectures.json')
exmeta = js('examples.json')
hw = js('hw.json')
C = Citer(R)
prof = js('profile.json') if os.path.exists(os.path.join(R, 'profile.json')) else {}
today = datetime.date.fromisoformat(meta.get('today') or datetime.date.today().isoformat())

# ── 강의 → 단원/Example 집계 ──
unit_lec = {}      # uid -> [(lecture, [html...])]
ex_lec = {}        # exnum -> [lecture ids]
covered = []
for L in lects:
    for uid, notes in (L.get('unitNotes') or {}).items():
        unit_lec.setdefault(uid, []).append((L, notes))
        if uid not in covered: covered.append(uid)
    for e in L.get('examples', []):
        ex_lec.setdefault(e, []).append(L['id'])
units = meta['units']
order = [u['id'] for u in units]
covered.sort(key=order.index)
frontier = covered[-1] if covered else order[0]
for u in units: u['lec'] = u['id'] in unit_lec

def md(L):  # 9/07
    d = datetime.date.fromisoformat(L['date']); return f"{d.month}/{d.day:02d}"

# ── 단원 ──
def unit_html(u):
    body = rd(f"units/{u['id']}.html") if os.path.exists(os.path.join(R, f"units/{u['id']}.html")) else None
    ch = meta['chapters'][str(u['ch'])]
    rng = ch['range']
    nd = len(re.findall(r'class="derive"', body or '')); nq = len(re.findall(r'class="qz"', body or ''))
    lecb = ''
    if u['id'] in unit_lec:
        dates = ''.join(f'<a class="d" href="#/lecture?l={L["id"]}" style="text-decoration:none">{md(L)}</a>' for L, _ in unit_lec[u['id']])
        items = ''.join(f'<li>{n}</li>' for L, notes in unit_lec[u['id']] for n in notes)
        lecb = f'<div class="lec"><div class="lh">강의노트 반영 {dates}</div><ul>{items}</ul></div>'
    else:
        lecb = '<div class="lec none"><div class="lh">아직 강의에서 다루지 않음 — 강의노트가 올라오면 교수님 전개와 강조점이 여기 붙습니다.</div></div>'
    star = ' <span class="exam-tag">★ 최중요</span>' if u.get('star') else ''
    lecstar = ' <span class="lecstar">강의 진행</span>' if u['lec'] else ''
    head = f'''<div class="unit-head"><span class="num">{u['id'].upper()}</span><div class="titles">
<h3>{u['title']} <span class="en">{u['en']}</span></h3>
<div class="sub">{cfg["bookAbbrev"]} §{u['secs']} · {u.get('sub','')}</div>
<div class="meta"><span class="rngbadge r{rng}">{meta['rangeShort'][str(rng)]}</span>{lecstar} 핵심 유도 {nd} · 체크포인트 {nq} · <a class="srclink" href="{meta['drive']['textbook']}" target="_blank" rel="noopener">{cfg.get('pageLabel','교재 p.')}{u['page']} ↗</a>{star}</div>
</div></div>'''
    if body is None:
        body = '<div class="soon">이 단원 본문은 작성 중입니다.</div>'
    return C.sub(f'<article class="unit" id="{u["id"]}">{head}<div class="unit-body">{lecb}{body}</div></article>', u['id'])

# ── Example ──
def ex_html(e):
    p = os.path.join(R, f"ex/{e['num']}.html")
    body = open(p, encoding='utf8').read() if os.path.exists(p) else '<div class="soon">작성 중</div>'
    ch = int(e.get('ch') or e['num'].split('.')[0]); rng = meta['chapters'][str(ch)]['range']
    lec = e['num'] in ex_lec
    lectag = ' <span class="lecstar">★ 강의 지정 ' + ', '.join(md(next(L for L in lects if L['id']==i)) for i in ex_lec[e['num']]) + '</span>' if lec else ''
    en = f'<div class="exen"><b>EN</b> {e["en"]}</div>' if e.get('en') else ''
    return f'''<article class="ex" id="ex-{e['num'].replace('.','-')}" data-num="{e['num']}" data-ch="{ch}" data-unit="{e['unit']}"{' data-lec="1"' if lec else ''}>
<div class="exh"><span class="exn">{cfg.get("exampleLabel","Example")} {e['num']}</span>{lectag}
<h3>{e['title']}</h3>{en}
<div class="exs">{e.get('summary','')}</div>
<div class="exmeta"><span class="rngbadge r{rng}">{meta['rangeShort'][str(rng)]}</span> · {(f'<a class="srclink" href="{meta["drive"]["textbook"]}" target="_blank" rel="noopener">{cfg.get("pageLabel","교재 p.")}{e["page"]} ↗</a> · ') if e.get('page') else '강의 문제 · '}<a href="#/{e['unit']}">{e['unit'].upper()}로 이동</a></div>
</div><div class="exb">{body}</div></article>'''.replace('\x00','')

# ── 강의 뷰 ──
def lecture_view():
    out = ['<h1 class="vh">강의 진도</h1><p class="vsub">' + cfg['lectureIntro'] + '</p>']
    if not lects: out.append('<div class="soon">아직 반영된 강의자료가 없습니다. 강의노트·녹음이 들어오면 날짜순으로 여기에 쌓입니다.</div>')
    c = meta['course']
    if prof.get('examStyle'): out.append(f'''<div class="callout exam"><b class="head">출제 스타일 — 이 콘솔이 무게를 두는 곳</b>{prof['examStyle']}</div>''')
    out.append(f'''<div class="callout"><b class="head">과목 정보</b>{c['info']}</div>''')
    out.append('<div class="tl">')
    for L in sorted(lects, key=lambda x: x['date'], reverse=True):
        cls = ' cancel' if L.get('kind') == 'cancel' else ''
        chips = ''.join(f'<a href="#/{u}">{u.upper()} · {next(x["title"] for x in units if x["id"]==u)}</a>' for u in (L.get('unitNotes') or {}))
        exch = ''.join(f'<a class="lx" href="#/examples?e={e}">{cfg.get("exampleLabel","Example")} {e}</a>' for e in L.get('examples', []))
        summ = ''.join(f'<li>{s}</li>' for s in L.get('summary', []))
        src = f' · <a class="srclink" href="{L["url"]}" target="_blank" rel="noopener">{html.escape(L["file"])} ↗</a>' if L.get('url') else ''
        eqt = ''
        if L.get('eqs'):
            rows = ''.join(f'<tr><td>{q["eq"]}</td><td>{q["what"]}</td><td>{q.get("tm","")}</td><td><a href="#/{q["unit"]}">{q["unit"].upper()}</a></td></tr>' for q in L['eqs'])
            eqt = f'<details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px;color:var(--lec)">강의노트 식 번호 ↔ 교재 대응표 ({len(L["eqs"])}개)</summary><div class="tblwrap"><table class="eqmap"><tr><th>강의노트</th><th>내용</th><th>교재</th><th>단원</th></tr>{rows}</table></div></details>'
        out.append(f'''<div class="tl-item{cls}" id="lec-{L['id']}"><div class="tm">{L['date']} ({L.get('dow','')}){src}</div><h3>{L['title']}</h3>
<div class="tb"><ul>{summ}</ul>{('<div class="chips">'+chips+exch+'</div>') if chips or exch else ''}{eqt}</div></div>''')
    out.append('</div>')
    return '\n'.join(out)

# ── 과제 뷰 ──
probmap = {}
def hw_view():
    out = ['<h1 class="vh">과제 · 문제</h1>',
           '<p class="vsub">' + cfg['hwIntro'] + '</p>',
           '<div class="policy">' + cfg['policy'] + '</div>',
           '<div class="filters" id="pf"><button data-ch="all" aria-pressed="true">전체</button>' +
           ''.join(f'<button data-ch="{c}" aria-pressed="false">Ch.{c}</button>' for c in meta['chapters']) +
           '<input id="pq" type="search" placeholder="번호·키워드" autocomplete="off"><span class="cnt" id="pcnt"></span></div>']
    if not hw:
        out.append('<div class="soon">' + cfg['hwEmpty'] + '</div>')
    for S in hw:
        due = S.get('due'); open_ = (not due) or (today > datetime.date.fromisoformat(due))
        hm = S.get('meta', '')
        if due: hm += f' · 마감 {due}'
        out.append(f'<section class="hwset" id="hw-{S["id"]}"><h3>{S["title"]}</h3><div class="hm">{hm}</div>')
        for P in S['probs']:
            num = P['num']; probmap[num] = P['unit']
            p = os.path.join(R, f"hw/{num}.html")
            body = open(p, encoding='utf8').read() if os.path.exists(p) else ''
            m = re.search(r'<div class="stmt">(.*?)</div>\s*<!--/stmt-->', body, re.S)
            stmt = m.group(1) if m else ''
            m2 = re.search(r'<div class="sol">(.*)</div>\s*<!--/sol-->', body, re.S)
            sol = m2.group(1) if m2 else ''
            tag = {'req': '<span class="hwst req">필수</span>', 'opt': '<span class="hwst">선택</span>', 'ex': '<span class="hwst ex">강의 Exercise</span>', 'hw': '<span class="hwst req">과제</span>'}.get(P.get('tag', ''), '')
            ans = f'<div class="ans">{sol}</div>' if sol else '<div class="lock">풀이가 아직 작성되지 않았습니다.</div>'
            out.append(f'''<details class="prob" data-num="{num}" data-ch="{P['ch']}"><summary>{tag}<span class="ub">{P['unit'].upper()}</span><b>{num}</b>{P['title']}</summary><div class="stmt">{stmt}</div>{ans}</details>''')
        out.append('</section>')
    return '\n'.join(out)

units_html = '\n'.join(unit_html(u) for u in units)
ex_html_all = '\n'.join(C.sub(ex_html(e), 'ex ' + e['num']) for e in exmeta)
lec_html = C.sub(lecture_view(), 'lecture')
hw_html = C.sub(hw_view(), 'hw')
data = {
    'units': [{k: u[k] for k in ('id', 'ch', 'title', 'lec')} for u in units],
    'chapters': {c: {'ko': v['ko'], 'range': v['range']} for c, v in meta['chapters'].items()},
    'rangeLabel': meta['rangeLabel'], 'cite': C.data(), 'storageKey': cfg['slug'] + '.v1', 'exLabel': cfg.get('exampleLabel', 'Example'), 'exams': meta['exams'], 'frontier': frontier, 'probmap': probmap,
}
css = rdE('tpl/base.css') + rdE('tpl/extra.css') + cfg.get('css', '')
# 선택: 과목 전용 추가 뷰(lab.html/.js/.css) → 7번째 모드
LAB = cfg.get('lab') and os.path.exists(os.path.join(R, 'lab.html'))
xnav = f'    <button data-view="lab">{cfg["lab"]["label"]}</button>' if LAB else ''
xview = f'<div class="view" id="v-lab"><div class="page wide">{rd("lab.html")}</div></div>' if LAB else ''
xjs = rd('lab.js') if LAB and os.path.exists(os.path.join(R, 'lab.js')) else ''
if LAB and os.path.exists(os.path.join(R, 'lab.css')): css += rd('lab.css')
nmid = sum(1 for u in units if meta['chapters'][str(u['ch'])]['range'] == 1)
exbtn = ''.join(f'<button data-ch="{c}" aria-pressed="false">Ch.{c}</button>' for c in meta['chapters'])
fr = next(u for u in units if u['id'] == frontier)
frontier_html = f'<div class="lecfrontier">강의 진도 ▸ <a href="#/{frontier}" style="display:inline;padding:0;color:var(--lec)">{frontier.upper()} {fr["title"]}</a></div>' if covered else ''
out = rdE('tpl/shell.html')
rep = {
    '%%CSS%%': css, '%%XNAV%%': xnav, '%%XVIEW%%': xview, '%%XJS%%': xjs, '%%JS%%': rdE('tpl/app.js'),
    '%%TITLE%%': cfg['title'], '%%MARK%%': cfg['mark'], '%%MARKSUB%%': cfg['markSub'], '%%EXINTRO%%': cfg['exampleIntro'], '%%HELPNOTE%%': cfg['helpNote'],
    '%%MACROS%%': ''.join(',' + k + ':' + json.dumps(v) for k, v in cfg.get('macros', {}).items()), '%%DATA%%': json.dumps(data, ensure_ascii=False).replace('</', '<\\/'),
    '%%UNITS%%': units_html, '%%EXAMPLES%%': ex_html_all, '%%LECTURE%%': lec_html, '%%HW%%': hw_html,
    '%%EXCHBTN%%': exbtn, '%%R1%%': meta['rangeLabel']['1'], '%%R2%%': meta['rangeLabel']['2'],
    '%%NMID%%': str(nmid), '%%NFIN%%': str(len(units) - nmid), '%%NU%%': str(len(units)),
    '%%FRONTIER%%': frontier_html, '%%BUILT%%': today.isoformat(), '%%LEDGER%%': C.status_html(), '%%EXAMSTYLE%%': ('<br><br><b>출제 스타일.</b> ' + prof['examStyle']) if prof.get('examStyle') else '', '%%NLEC%%': str(sum(1 for L in lects if L.get('kind') != 'cancel')),
}
for k, v in rep.items(): out = out.replace(k, v)
os.makedirs(os.path.join(R, 'out'), exist_ok=True)
OUT = os.path.join(R, 'out', cfg['slug'] + '.html')
open(OUT, 'w', encoding='utf8').write(out)
tot = lambda pat: len(re.findall(pat, units_html + ex_html_all))
nd_ = tot('class="derive"'); nq_ = tot('class="qz"')
print(f"built {OUT} {len(out)/1e6:.2f}MB · units {len(units)} · examples {len(exmeta)} · derive {nd_} · qz {nq_} · lectures {len(lects)} · hw sets {len(hw)} · frontier {frontier}")

# ── lint: '<' + letter inside math breaks HTML ──
bad = []
for m in re.finditer(r'\\\((.*?)\\\)|\\\[(.*?)\\\]', out, re.S):
    seg = m.group(0)
    if re.search(r'<[A-Za-z/!]', seg): bad.append(seg[:80])
if bad: print('WARN math-with-tag:', len(bad), bad[:5])

# ── 반영 장부 검사 ──
rows, missing = C.report()
for sid, n, nc, nd, miss in rows:
    print(f"ledger {sid}: {nd}/{nc} cited ({n-nc} skip)" + (f"  MISSING {miss}" if miss else ''))
if C.unknown:
    print('ERROR unknown cite ids:', C.unknown[:20])
if missing or C.unknown:
    print(f'FAIL ledger: {len(missing)} uncited item(s), {len(C.unknown)} unknown cite(s) — 원자료 누락. 게시 금지.')
    sys.exit(1)
