# lecture-console

강의별 학습 콘솔(Artifact) 소스. 이 폴더는 공개 저장소에 포함되며, 과제 풀이가 마감 전에도 들어 있습니다.

- `engine/` 공통 빌더(build.py, cite.py, tpl/, texlint.js …)
- `courses/advmech` 고급역학 · `courses/emwaves` 전자기파와 광학 · `courses/astro1` 천체물리학개론1
- `docs/runbook.md` 운영 절차 · `docs/registry.json` 과목 목록 · `docs/profiles.json` 과목별 출제 스타일

빌드:

```
cd engine && mkdir -p node_tmp && (cd node_tmp && npm i mathjax@3.2.2)
python3 engine/build.py courses/<slug>      # → courses/<slug>/out/<slug>.html
python3 engine/preview.py courses/<slug>
NODE_PATH=$(npm root -g) node engine/texlint.js courses/<slug>   # 오류 0 필수
```

스냅샷: 2026-10-08 (천물개 Lecture10·11·플립 23–24, 전파광 10/7 강의·과제까지).
