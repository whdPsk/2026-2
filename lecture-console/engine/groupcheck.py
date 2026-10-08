"""부분 검사: python3 groupcheck.py <course_dir> --src L01,S0901,F01 --files units/u01.html,units/u02.html,ex/1.1.html,parts/ex_A.json,parts/lec_A.json
- 지정 파일 안의 [[ID]] 인용만 세어, 지정 소스의 장부 커버리지(미인용 목록)와 모르는 ID를 보고.
- 수식 구분자 \\( \\) \\[ \\] 짝, qz data-q 중복도 검사."""
import sys, os, re, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cite import Citer
R = sys.argv[1]
a = sys.argv[2:]
srcs = a[a.index('--src') + 1].split(',')
files = []
for g in a[a.index('--files') + 1].split(','):
    files += sorted(glob.glob(os.path.join(R, g)))
C = Citer(R)
bad = 0
qids = {}
for f in files:
    t = open(f, encoding='utf8').read()
    C.sub(t, f)
    if f.endswith('.html'):
        for o, c in (('\\(', '\\)'), ('\\[', '\\]')):
            if t.count(o) != t.count(c):
                print(f'MATH {f}: {o} {t.count(o)} vs {c} {t.count(c)}'); bad = 1
        for q in re.findall(r'data-q="([^"]+)"', t):
            if q in qids: print(f'DUPQ {q} in {f} and {qids[q]}'); bad = 1
            qids[q] = f
    else:
        try: json.loads(t)
        except Exception as e: print('JSON', f, e); bad = 1
for i, w in C.unknown:
    print('UNKNOWN', i, w); bad = 1
for s in srcs:
    its = [x for k, x in C.items.items() if k.split('.')[0] == s]
    if not its: print(f'{s}: NO LEDGER'); bad = 1; continue
    cont = [x for x in its if not x.get('skip')]
    miss = [x['id'] for x in cont if x['id'] not in C.used]
    print(f'{s}: {len(cont)-len(miss)}/{len(cont)} cited (skip {len(its)-len(cont)})' + (f'  MISSING {miss}' if miss else ''))
    bad |= bool(miss)
print('OK' if not bad else 'NOT OK')
sys.exit(bad)
