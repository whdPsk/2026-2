# 2026-2 학습 노트

서울대학교 2026년 2학기 과목별 학습 콘솔. GitHub Pages로 배포되는 정적 사이트이고, **이 저장소가 원본(source of truth)** 이다.

- 허브: `https://<github-id>.github.io/notes-2026-2/`
- 과목: `…/notes-2026-2/astro1/` (천체물리학개론1) · `…/emwaves/` (전자기파와 광학) · `…/advmech/` (고급역학)

`main`에 push하면 GitHub Actions가 빌드해서 자동으로 다시 배포한다. 매일 00:05 KST에도 한 번 다시 빌드한다(D-day 갱신).

## 구조

```
content/                  ← 학습 콘텐츠 원본 (내용 추가는 여기만 고치면 된다)
  site.json               허브에 보일 과목 순서·교수·시간표
  <slug>/
    course.json           콘솔 문구·라벨·MathJax 매크로·선택 뷰(lab)
    meta.json             시험 일정, 장(chapters), 단원 목록(units)
    profile.json          출제 스타일(강의 탭·도움말에 표시)
    lectures.json         강의 로그 (날짜별 요약·단원 메모·지정 예제)
    examples.json         예제 메타          ex/<num>.html   예제 본문
    units/uNN.html        단원 본문 (HTML 조각)
    hw.json               과제 세트          hw/<num>.html   문항 (stmt / sol)
    sources.json          원자료 목록(PPT·속기·녹음·플립 영상)
    ledger/<ID>.json      원자료 반영 장부 (무누락 검사용)
    lab/                  (선택) 과목 전용 뷰: lab.html · lab.js · lab.css

scripts/                  ← 빌드 도구 (Node)
  compile.mjs             content/ → site/public/data/<slug>/{course,cites}.json + 과목 페이지 생성, 장부 검사
  lib/cite.mjs            [[ID]] 인용 → 원자료 칩, 장부 커버리지
  lib/qz.mjs              체크포인트 약식(::qz) 펼치기
  check-ledger.mjs        부분 장부 검사 (작업을 나눠 할 때)
  merge-parts.mjs         나눠 쓴 예제·강의 메타(content/<slug>/parts/) 병합
  texlint.mjs             모든 수식을 MathJax로 파싱해 오류 검사

site/                     ← UI (Vite root)
  index.html              허브 페이지
  course.template.html    과목 페이지 틀 (compile이 site/<slug>/index.html로 복사)
  src/
    course/main.js        과목 콘솔 진입점: 데이터 로드 → 렌더 → 기능 연결
    course/render/        화면 조립 (shell · units · examples · lecture · hw · status)
    course/features/      기능 (store 진도저장 · router · rail · progress · checkpoints · examples ·
                          problems · formulas · status · chrome(D-day·도움말·테마) · citepop · mathjax · lab)
    hub/                  허브 화면
    styles/               base.css(레이아웃·토큰) · blocks.css(본문 블록·칩) · app.css(독립 사이트 보정)

.github/workflows/deploy.yml   빌드 → Pages 배포
docs/                     콘텐츠 작성 규칙 · 업데이트 절차
```

생성물(`site/public/data/`, `site/<slug>/index.html`, `dist/`)은 git에 올리지 않는다.

## 처음 한 번: 배포 설정

1. GitHub에서 빈 저장소 `notes-2026-2`를 만들고 이 폴더를 push한다.
   ```bash
   git init && git add . && git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<github-id>/notes-2026-2.git
   git push -u origin main
   ```
2. 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Actions 탭에서 첫 배포가 끝나면 `https://<github-id>.github.io/notes-2026-2/` 로 접속.

저장소 이름을 바꿔도 된다. 워크플로가 `BASE_PATH=/<저장소 이름>/` 으로 빌드하므로 asset 경로가 자동으로 맞춰진다.

## 로컬에서

```bash
npm install
npm run dev        # http://localhost:5173/notes-2026-2/  — content/ 를 고치면 자동 재컴파일·새로고침
npm run build      # 배포와 같은 빌드 (장부 누락이 있으면 실패)
npm run preview    # 빌드 결과 확인
npm run lint:tex   # 수식 오류 검사
npm run check -- astro1 --src L09,D1001 --files "units/u17.html,units/u18.html,ex/6.*.html"
```

Node 22 이상.

## 내용 추가하기 (UI 코드는 건드리지 않음)

| 하고 싶은 것 | 고칠 파일 |
|---|---|
| 새 강의 반영 | `content/<slug>/lectures.json`에 항목 추가 + 해당 `units/uNN.html` 본문 수정 |
| 단원 본문 수정 | `content/<slug>/units/uNN.html` |
| 예제 추가 | `content/<slug>/examples.json`에 메타 + `ex/<num>.html` |
| 과제 추가 | `content/<slug>/hw.json`에 세트(`due`는 마감일 표시용, 풀이는 항상 공개) + `hw/<num>.html` |
| 원자료 추가 | `sources.json`에 ID + `ledger/<ID>.json` 장부 → 본문에 `[[ID.항목]]` 인용 |
| 시험 일정 | `content/<slug>/meta.json`의 `exams` |
| 과목 추가 | `content/<새 slug>/` 폴더 + `content/site.json`의 `courses`에 한 줄 |

본문 HTML에서 쓰는 블록·인용·체크포인트 문법은 [`docs/CONTENT_GUIDE.md`](docs/CONTENT_GUIDE.md), 강의 반영 절차는 [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## 진도 저장

진도(봤음/숙달)·체크포인트 채점·메모는 **각 브라우저의 localStorage**에 저장된다(과목별 키 `<slug>.v1`). 다른 기기로 옮기려면 **현황 → 진도 내보내기**로 받은 `.json`을 그 기기에서 **진도 불러오기**(기존 기록과 합침). Claude Artifact 안에서 열리면(`window.claude` 런타임) 예전처럼 계정 동기화도 동작한다.

## 수정 작업 원칙 (사람·Claude 공통)

- 변경은 **필요한 파일만** 고친다. 전체 프로젝트를 다시 만들지 않는다.
- 콘텐츠 = `content/`, 화면 조립 = `site/src/course/render/`, 동작 = `site/src/course/features/`, 모양 = `site/src/styles/`, 빌드 = `scripts/`.
- 단원 id(`u01`…)와 체크포인트 id(`data-q`)는 사용자 진도 저장 키이므로 바꾸지 않는다.
- push 전 `npm run build`가 통과해야 한다(장부 100%, 모르는 인용 0).
