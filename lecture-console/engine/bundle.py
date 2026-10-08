"""번들 입출력.
  python3 bundle.py pack   <dir> <out.json>   # dir 아래 파일(out/, node_tmp/ 제외)을 {상대경로: 내용} JSON으로
  python3 bundle.py unpack <in.json> <dir>    # 복원
"""
import json, os, sys
SKIP = {'out', 'node_tmp', '__pycache__'}
if sys.argv[1] == 'pack':
    d = sys.argv[2]; files = {}
    for dp, dn, fs in os.walk(d):
        dn[:] = [x for x in dn if x not in SKIP]
        for f in fs:
            p = os.path.join(dp, f); files[os.path.relpath(p, d)] = open(p, encoding='utf8').read()
    json.dump(files, open(sys.argv[3], 'w', encoding='utf8'), ensure_ascii=False)
    print('packed', len(files), os.path.getsize(sys.argv[3]))
else:
    files = json.load(open(sys.argv[2], encoding='utf8')); d = sys.argv[3]
    for k, v in files.items():
        p = os.path.join(d, k); os.makedirs(os.path.dirname(p) or '.', exist_ok=True); open(p, 'w', encoding='utf8').write(v)
    print('unpacked', len(files), '->', d)
