"""로컬 미리보기: python3 preview.py <course_dir>  → <course_dir>/out/preview.html (로컬 MathJax)"""
import sys, os, json
d = os.path.abspath(sys.argv[1]); slug = json.load(open(os.path.join(d, 'course.json')))['slug']
s = open(os.path.join(d, 'out', slug + '.html'), encoding='utf8').read()
mj = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'node_tmp/node_modules/mathjax/es5/tex-svg-full.js')
s = s.replace('https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg-full.js', 'file://' + mj)
open(os.path.join(d, 'out', 'preview.html'), 'w', encoding='utf8').write('<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + s + '</body></html>')
print('preview', os.path.join(d, 'out', 'preview.html'))
