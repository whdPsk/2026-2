# 업데이트 절차 (강의·과제가 생겼을 때)

원본은 이 저장소. 원칙: Google Drive·사용자 로컬 파일은 **읽기만**(생성·수정·삭제는 사용자 허락 후). 결과물은 이 저장소에 commit → push하면 자동 배포.

## 1. 수집 (읽기만)
- **Drive** 과목 폴더(최근 7일 수정): PPT PDF, 속기 txt, 강의노트. `pdftotext -layout` + `pdftoppm`(수식·지수는 이미지로 확인).
- **eTL**(Canvas API GET, 로그인된 Chrome): 과제·공지·파일·모듈.
- **다글로**: 녹음·플립 영상 스크립트. Chrome 페이지 JS에서 `localStorage.accessToken`으로 `GET backend.daglo.ai/file-meta/<id>/script?page=N`(deflate base64) → 텍스트. 토큰은 절대 출력하지 않는다.
- 교재 전자책(알라딘): 사용자가 뷰어를 열고 컴퓨터 사용을 켜 두면 화면으로만 읽는다(로그인은 사용자가).

## 2. 장부
`content/<slug>/sources.json`에 ID(PPT `LNN`, 속기 `SMMDD`, 녹음 `DMMDD`, 플립 `FNN`, 과제 `HWn`, 공지 `NMMDD`) → `ledger/<ID>.json` 작성. 규칙은 `docs/CONTENT_GUIDE.md` §1.

## 3. 본문 반영
- 강의가 다룬 단원은 본문을 **다시 쓴다**(덧붙이기 금지): PPT 원문(`.slide`) + 부가설명(`.explain`) + 강조(`.hl`/`.star`) + 플립 유도(`.slide.flip`) + 직관·함정·적용·교수님 말 블록.
- PPT Q·수업 문제 → 예제(수치 python 재계산, 변형 2개). Review Questions → 체크포인트.
- `lectures.json`에 그날 항목(요약 불릿마다 칩, 공지 포함).
- 녹음 수치가 의심스러우면 `.trap`에 녹음값·표준값 둘 다.
- 여러 단원을 나눠 쓸 때는 작업자마다 소스·파일을 겹치지 않게 나누고 `npm run check`로 부분 검사.

## 4. 검증 → 배포
```bash
npm run build      # 장부 100%·모르는 인용 0 이어야 통과
npm run lint:tex   # 수식 오류 0
npm run preview    # 바뀐 단원·예제·칩 팝업 눈으로 확인
git add -A && git commit -m "astro1: 10/1 강의 반영" && git push
```
push 후 Actions가 실패하면(장부 누락 등) 배포되지 않는다 — 로그의 `MISSING` 항목을 본문에 인용하고 다시 push.

## 5. 보고
반영한 날짜·자료, 장부 커버리지(n/n), STT·수치가 불확실해 사용자가 확인할 것만 짧게.

## 과목별 출제 스타일 (`content/<slug>/profile.json`)
- **천물개**: 유도보다 물리적·직관적 이해 + 적용(PPT Q·예제) 위주(사용자 확인, 강의평). → Review Q·PPT Q 전부, 직관/함정 블록, 천체 적용 사례.
- **전파광**: 시험의 80% 이상이 교과서 Example + (optional 포함) 숙제 Problem 원형/변형, 약 20% 강의노트. 과제로 안 낸 Problem은 출제 안 함. 계산기 불가. 기말에 중간고사 문제 변형 포함(강의안내 PDF). → Example 전부 + 과제 Problem 전부(풀이 상시 공개) + 강의노트 고유 내용 별도 표시.
- **고역**: 숙제 + 강의에서 소개한 내용을 성실히 하면 A- 수준(강의 안내 5쪽). 숙제 40%. → 강의노트 유도를 판서 순서대로, 소개한 예제 전부, 숙제 풀이·변형, T&M 오타 반영.


## 버전 기록
- 2026-10-01 (4): **GitHub Pages로 이전.** Artifact 단일 HTML → Vite 정적 사이트(허브 + 과목 3개). content/ 원본, scripts/compile.mjs(build.py·cite.py 포팅), UI 모듈 분리, 진도는 localStorage + 내보내기/불러오기, Actions 자동 배포·매일 재빌드.
- 2026-10-01 (3): 천물개 10/1 반영 — Lecture09(싱크로트론) PPT, 10/1 다글로 녹음(D1001), 플립 17–20. U17·U18 전면 재작성, U15·U16 보강(플립17·18, 냉각시간·쿨링 플로우). 예제 6.10–6.16. 장부 39개 100%.
- 2026-10-01 (2): **천물개 전면 재작성.** PPT L00–L08 슬라이드 원문 전사(`.slide`) + 부가설명(`.explain`) + 강조(`.hl`/`.star`) + 플립 유도(`.slide.flip`) 형식. 장부 33개(PPT 9·속기 7·녹음 1·플립 16) 전부 100% 인용. 예제 44→89(PPT Q 전부). 병렬 작업용 `engine/groupcheck.py`(소스·파일 부분 검사)와 `engine/REWRITE_SPEC.md`(작업자 지침) 추가. 교재 쪽수 없는 예제는 '강의 문제'로 표시.
- 2026-10-01: **무누락 체계 도입.** 엔진에 `cite.py`(원자료 인용 칩·팝업·장부 검사, 미인용 시 빌드 실패), 프로필 블록(.intuit/.trap/.apply/.prof), 출제 스타일 표시. 과목별 profiles.json 신설. 천물개 9/22(PPT07 9항목 + 속기 31구간) 전수 재반영: U13·U15 본문 재작성, PPT Q1–Q4 예제(5.1·5.4·2.3) — 기존엔 Q3·Review Q④⑤·HII/ICM/코로나·진동자 세기 f 등이 빠져 있었음.
- 2026-09-29 (2): eTL 연동(Canvas API, 읽기 전용). 전파광 과제 8회 반영. 천물개 실험실 뷰. 엔진에 선택 뷰(lab).
- 2026-09-29: 엔진 분리. 고급역학 v4, 전자기파와 광학 v1, 천체물리학개론1 v1.
