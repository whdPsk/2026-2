"""Expand shorthand checkpoint blocks in unit/example HTML files.
::qz ID            (question html lines)
::a                (answer html lines)
::end
"""
import re, sys, pathlib
T = ('<div class="qz" data-q="{id}"><div class="qq">{q}</div><div class="qbar"><button class="rv">답 확인</button>'
     '<span class="vd"><span>스스로 채점:</span><button data-v="1">맞음</button><button data-v="0">더 볼 것</button></span></div>'
     '<div class="qa"><div class="alabel">Answer</div>{a}</div></div>')
pat = re.compile(r'^::qz (\S+)\n(.*?)\n::a\n(.*?)\n::end$', re.S | re.M)
def rep(m):
    a = m.group(3).strip()
    if not a.startswith('<'): a = '<p>' + a + '</p>'
    return T.format(id=m.group(1), q=m.group(2).strip(), a=a)
for f in sys.argv[1:]:
    p = pathlib.Path(f); s = p.read_text()
    n = pat.sub(rep, s)
    if n != s: p.write_text(n); print('expanded', f, s.count('::qz'))
