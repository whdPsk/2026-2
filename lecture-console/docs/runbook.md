# 강의 학습 콘솔 — 운영 절차 (공통)

과목마다 같은 엔진으로 만든 Artifact 학습 콘솔을 운영한다. 과목 목록·URL·Drive 폴더·수업 요일은 `claude/consoles/registry.json`, **과목별 출제 스타일·챙길 것은 `claude/consoles/profiles.json`**.

- 원칙: Google Drive·로컬 파일은 **읽기만**. 생성·수정·삭제는 사용자 허락 후에만.
- 쓰는 곳은 Artifact와 이 Project 문서뿐.
- **2026-10-01부터 무누락 원칙**: 원자료(PPT·속기·녹음·교재·과제·공지)를 원자 단위로 쪼갠 "반영 장부"를 만들고, 모든 항목이 본문 어딘가에 원문 인용 칩으로 연결돼야 빌드가 통과한다. "겹친다"는 이유로 빼지 않는다 — 겹치면 같은 문장에 출처 칩을 여러 개 단다.

## 0. 환경 복원 (새 세션)

> **천물개 번들(`astro1.json`)은 용량 때문에 gzip+base64**: `{"gz": …}` → `json.loads(gzip.decompress(base64.b64decode(gz)))`이 bundle.py pack 형식. `out/`은 빠져 있으니 build.py로 다시 만든다. 프로젝트 용량 한도(약 2M 토큰)에 가까우므로 큰 번들은 삭제 후 다시 쓴다.

```
project_read claude/consoles/engine.json / <slug>.json / profiles.json
# 내용이 인라인으로 오면: 세션 기록(~/.claude/projects/*/*.jsonl)에서 project_read 결과 문자열을 파이썬으로 뽑아 파일로 저장
python3 -c "…"  # engine.json → /home/claude/engine, <slug>.json → /home/claude/courses/<slug>
profiles.json의 <slug> 항목 → courses/<slug>/profile.json
cd /home/claude/engine && mkdir -p node_tmp && (cd node_tmp && npm i mathjax@3.2.2)
```

- Drive 파일 원본(PDF·txt)은 `download_file_content`로 받으면 크기 초과 시 tool-results 폴더에 JSON(base64)으로 저장된다 → base64 디코드해서 `src/`에 둔다(컨텍스트 소모 없음).
- PPT PDF는 `pdftotext -layout` + `pdftoppm`(수식·지수는 이미지로 확인). 2-up 핸드아웃이면 슬라이드 번호를 페이지×2로 다시 센다.

## 파일 구조

### 엔진 (`engine.json`)
| 파일 | 역할 |
|---|---|
| `build.py <course_dir>` | → `out/<slug>.html`. **장부 미인용 항목·모르는 인용 id가 있으면 FAIL(exit 1) — 게시 금지** |
| `cite.py` | `[[ID]]` 인용 → 원자료 칩, 팝업 데이터, 장부 커버리지 검사·현황표 |
| `tpl/` | `shell.html`, `app.js`(칩 팝업 포함), `base.css`, `extra.css`(칩·`.intuit/.trap/.apply/.prof` 블록) |
| `expand_qz.py`, `preview.py`, `texlint.js`(0 오류 필수), `check.js`, `bundle.py` | 기존과 동일 |

### 과목 폴더 (추가된 것)
| 파일 | 역할 |
|---|---|
| `profile.json` | `examStyle`(HTML, 강의 탭 상단·도움말에 표시), `sources`, `focus`, `blocks` |
| `sources.json` | 원자료 목록 `{ID: {title, short, kind(ppt/transcript/book/hw/notice/video), url, date}}`. 아직 장부 없는 자료도 넣어 두면 현황 탭에 "장부 미작성"으로 뜬다 |
| `ledger/<ID>.json` | `[{id:"L07.s3a", loc:"슬라이드 3 ①", raw:"원문", note:"STT 교정·수치 확인 메모", skip?:"표지"}]` |

인용 문법: 본문 어디든 `[[L07.s3d, S0922.22]]`. 칩을 누르면 원문(raw)·메모(note)·원본 파일 링크가 팝업으로 뜬다.

## 1. 업데이트 절차 (강의·과제가 생겼을 때)

1. **수집** — registry의 Drive 폴더(최근 7일 수정), eTL(Canvas API GET), 다글로. 새 자료마다 `sources.json`에 ID를 단다(PPT `LNN`, 속기 `SMMDD`, 다글로 `DMMDD`, 플립 `FNN`, 과제 `HWn`, 공지 `NMMDD`).
2. **장부 만들기(원자 단위, 빠짐없이)**
   - PPT: 슬라이드 1장 = 1항목. 한 슬라이드에 질문·불릿이 여러 개면 불릿마다 쪼갠다(`s3a…`). 표지·"Questions?" 같은 무내용만 skip.
   - 속기/녹음: 타임스탬프 블록을 주제 단위 구간(보통 강의당 25–35개)으로 묶는다. raw에 원문 그대로, note에 주제 요약 + STT 교정/수치 의심.
   - **skip 구간은 순수 잡담만.** 내용이 섞인 블록(예: 잡담 끝에 문제 답)은 반드시 쪼개서 내용 쪽을 별도 항목(`.28a`)으로.
   - 교재(파일이 있으면): 절·식 번호·Example·Problem 단위. 파일이 없으면(천물개 전자책) 절 단위로 사용자가 준 쪽만.
3. **본문 반영** — 과목 프로필의 `focus`를 체크리스트로 쓴다.
   - 강의가 다룬 단원은 **본문을 다시 쓴다**(노트 덧붙이기 금지). 판서/설명 순서대로, 각 문단 끝에 인용 칩.
   - 교수 말의 성격별 블록: 직관·비유 → `<div class="intuit"><b>직관 · 제목</b>…</div>`, 함정·흔한 오답·녹음 수치 의심 → `.trap`, 천체 적용·수치 척도 → `.apply`, 수업 중 질문과 답 → `.prof`.
   - PPT의 Review Questions → 단원 h4 구조/체크포인트로 전부, PPT Q·예제 → 예제(`examtag`로 "PPT Qn" 표시, 수치 검산 + 변형 2개).
   - 녹음 수치가 의심스러우면 표준값으로 검산하고 `.trap`에 "녹음상 X / 표준 Y / 확인 필요"로 둘 다 적는다(조용히 고치지 않는다).
   - `lectures.json` 그날 항목: 요약 불릿마다 칩, 마지막에 공지(휴강 등)도 칩.
4. **빌드·검증** — `build.py`가 `ledger …: n/n cited`로 100%여야 한다. FAIL이면 MISSING 항목을 본문에 반영한 뒤 다시. → `preview.py` → `texlint.js` 0 → `check.js`/스크린샷으로 칩 팝업 확인.
5. **게시** — Artifact publish(`url`=registry, capabilities 생략, label "M/D 강의 전수 반영"). 다른 대화면 먼저 live 버전을 읽어 merge.
6. **저장** — `bundle.py pack` → `project_write claude/consoles/<slug>.json`(local_path). 엔진을 고쳤으면 `engine.json`, 프로필을 고쳤으면 `profiles.json`.
7. **보고** — 반영한 날짜·자료, 장부 커버리지(n/n), 녹음 수치 의심 항목만 짧게.

## 2. 과목별 프로필 요약 (`profiles.json`)
- **천물개**: 유도보다 물리적·직관적 이해 + 적용(PPT Q·예제) 위주(사용자 확인, 강의평). → Review Q·PPT Q 전부, 직관/함정 블록, 천체 적용 사례.
- **전파광**: 시험의 80% 이상이 교과서 Example + (optional 포함) 숙제 Problem 원형/변형, 약 20% 강의노트. 과제로 안 낸 Problem은 출제 안 함. 계산기 불가. 기말에 중간고사 문제 변형 포함(강의안내 PDF). → Example 전부 + 과제 Problem 전부(풀이는 바로 공개) + 강의노트 고유 내용 별도 표시.
- **고역**: 숙제 + 강의에서 소개한 내용을 성실히 하면 A- 수준(강의 안내 5쪽). 숙제 40%. → 강의노트 유도를 판서 순서대로, 소개한 예제 전부, 숙제 풀이·변형, T&M 오타 반영.

## 3. 새 과목 콘솔 만들기
기존 절차 + `profile.json`·`sources.json`·`ledger/` 생성. 강의계획서/강의안내에서 출제 스타일을 먼저 뽑아 profile에 적는다.

## 4. 자동 업데이트 (예약 작업)
- "강의 콘솔 자동 업데이트": 월–토 21:47 KST, 사용자 컴퓨터 필요(Chrome: eTL·다글로).
- 매 실행마다 세 과목, 최근 7일 미반영 자료만 1의 절차로. **장부 100%가 아니면 게시하지 않고 보고만.**

## 5. 재반영 백로그 (장부 미작성 자료)
- 천물개: 9/1–9/29 전 강의 완료(2026-10-01). 남은 것: 교재(알라딘 전자책, 사용자 로그인 필요) 절 단위 대조, 교재는 알라딘 뷰어(Windows 앱) 화면을 컴퓨터 사용으로 읽는 방식 가능(사용자가 컴퓨터 사용 켜고 뷰어 열어 둘 때). 10/1까지 반영 완료.
- 전파광·고역: 전 강의 장부 미작성. 교재 PDF(Griffiths 14.6MB, T&M 22MB)는 커넥터 한도 초과 → 사용자 첨부 필요.

## 버전 기록
- 2026-10-01 (3): 천물개 10/1 반영 — Lecture09(싱크로트론) PPT, 10/1 다글로 녹음(D1001), 플립 17–20. U17·U18 전면 재작성, U15·U16 보강(플립17·18, 냉각시간·쿨링 플로우). 예제 6.10–6.16. 장부 39개 100%.
- 2026-10-01 (2): **천물개 전면 재작성.** PPT L00–L08 슬라이드 원문 전사(`.slide`) + 부가설명(`.explain`) + 강조(`.hl`/`.star`) + 플립 유도(`.slide.flip`) 형식. 장부 33개(PPT 9·속기 7·녹음 1·플립 16) 전부 100% 인용. 예제 44→89(PPT Q 전부). 병렬 작업용 `engine/groupcheck.py`(소스·파일 부분 검사)와 `engine/REWRITE_SPEC.md`(작업자 지침) 추가. 교재 쪽수 없는 예제는 '강의 문제'로 표시.
- 2026-10-01: **무누락 체계 도입.** 엔진에 `cite.py`(원자료 인용 칩·팝업·장부 검사, 미인용 시 빌드 실패), 프로필 블록(.intuit/.trap/.apply/.prof), 출제 스타일 표시. 과목별 profiles.json 신설. 천물개 9/22(PPT07 9항목 + 속기 31구간) 전수 재반영: U13·U15 본문 재작성, PPT Q1–Q4 예제(5.1·5.4·2.3) — 기존엔 Q3·Review Q④⑤·HII/ICM/코로나·진동자 세기 f 등이 빠져 있었음.
- 2026-09-29 (2): eTL 연동(Canvas API, 읽기 전용). 전파광 과제 8회 반영. 천물개 실험실 뷰. 엔진에 선택 뷰(lab).
- 2026-09-29: 엔진 분리. 고급역학 v4, 전자기파와 광학 v1, 천체물리학개론1 v1.
- 2026-10-04: **과제 풀이 잠금 제거.** 풀이는 마감과 무관하게 바로 공개한다(사용자 결정). `hw.json`의 `due`는 마감일 표시에만 쓴다.
