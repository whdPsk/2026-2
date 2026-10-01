# 콘텐츠 작성 규칙

모든 학습 내용은 `content/<slug>/` 아래 JSON과 HTML 조각이다. 빌드(`npm run compile`)가 이것을 UI용 데이터로 바꾼다.

## 1. 데이터 파일 형식

### `meta.json`
```jsonc
{
  "course": { "info": "과목 정보 HTML" },
  "exams": [{ "name": "중간고사", "date": "2026-10-27", "tentative": false, "note": "범위" }],
  "rangeLabel": { "1": "중간 범위 설명", "2": "기말 범위 설명" },
  "rangeShort": { "1": "중간", "2": "기말" },
  "drive": { "textbook": "교재 링크(쪽 번호 링크에 사용)" },
  "chapters": { "1": { "ko": "장 제목", "range": 1 } },
  "units": [{ "id": "u01", "ch": 1, "secs": "1.1", "page": 3, "title": "단원 제목", "en": "slug", "sub": "한 줄 설명", "star": false }]
}
```
`units`의 순서 = 레일·이전/다음 순서. **`id`는 진도 키라 바꾸지 않는다.**

### `lectures.json` (강의 로그)
```jsonc
{ "id": "1001", "date": "2026-10-01", "dow": "목", "kind": "note",   // 휴강은 "cancel"
  "title": "10/1 강의 — 주제", "file": "Lecture09 PPT · 녹음", "url": "원본 링크",
  "summary": ["불릿 HTML [[L09.s3a]]", "…"],
  "examples": ["6.10", "6.11"],
  "unitNotes": { "u18": ["<b>10/1</b>: 단원 상단 '강의노트 반영' 상자에 붙는 메모"] },
  "eqs": [{ "eq": "(9.44)", "what": "내용", "tm": "교재 식", "unit": "u07" }] }   // 선택
```
`unitNotes`에 들어간 단원이 "강의 진행"으로 표시되고, 가장 뒤 단원이 강의 진도(frontier)가 된다.

### `examples.json` + `ex/<num>.html`
```json
{ "num": "6.12", "ch": 6, "unit": "u18", "page": 0, "title": "PPT Q3: …", "en": "", "summary": "한 줄 답" }
```
`page`가 0이면 "강의 문제"로 표시. `ch`를 생략하면 번호 앞자리.

### `hw.json` + `hw/<num>.html`
```json
{ "id": "hw2", "kind": "hw", "title": "HW2", "meta": "eTL 과제", "due": "2026-10-06",
  "probs": [{ "num": "2.3", "ch": 2, "unit": "u07", "tag": "req", "title": "문항 제목" }] }
```
- `kind`: `hw`(마감 후 풀이 공개) · `lecture`(강의 지정 연습, 항상 공개) · `bank`
- `tag`: `req` 필수 · `opt` 선택 · `ex` 강의 Exercise · `hw` 과제
- 문항 파일: `<div class="stmt">문제</div><!--/stmt--> <div class="sol">풀이</div><!--/sol-->`
- **마감일까지는 풀이가 빌드 결과에 아예 들어가지 않는다**(강좌 AI 정책). 매일 자정 재빌드로 자동 공개.

### `sources.json` + `ledger/<ID>.json` (원자료 무누락 장부)
```json
{ "L09": { "title": "Lecture09 Synchrotron (PPT)", "short": "L09", "kind": "ppt", "date": "2026-10-01", "url": "…" } }
```
`kind`: `ppt` · `transcript` · `video` · `book` · `hw` · `notice` (칩 색이 다름)
```json
[{ "id": "L09.s3a", "loc": "슬라이드 3 ①", "raw": "원문 그대로", "note": "메모·STT 교정" },
 { "id": "L09.s1", "loc": "슬라이드 1", "raw": "표지", "skip": "표지" }]
```
- PPT: 슬라이드(불릿) 단위. 속기·녹음: 주제 구간 25–35개, 모든 줄 포함. skip은 표지·순수 잡담만.
- skip이 아닌 항목이 본문 어디에서도 인용되지 않으면 **빌드 실패**(게시 안 됨).

## 2. 본문 HTML 문법

### 원자료 인용
문단·불릿·블록 끝에 `[[L09.s3a]]` 또는 `[[L09.s3a, D1001.12]]`. 칩으로 바뀌고 누르면 원문 팝업.
겹치는 내용(PPT = 플립 = 속기)은 빼지 말고 칩을 여러 개 단다.

### 블록
```html
<div class="predict"><b>◈ 학습 목표.</b> …</div>
<h4>소제목 <span class="en">English</span></h4>

<div class="slide"><div class="sh">L09 · 슬라이드 3 <span class="st">제목</span></div>
  <ul><li>슬라이드 원문 그대로</li></ul>
  <div class="ans"><b>ANSWER</b> 답 슬라이드</div> [[L09.s3]]</div>
<div class="explain"><b>부가설명</b> 수업 설명을 풀어 쓴 것 [[D1001.05]]</div>
<div class="slide flip"><div class="sh">플립 20 · 3:13 <span class="st">유도</span></div><ol><li>단계 [[F20.07]]</li></ol></div>

<div class="derive"><div class="dtitle"><span class="tag">유도</span>제목</div><ol><li>…</li></ol></div>
<div class="formula"><div class="ftitle">암기 — 제목</div>\[ … \]<p class="note">조건</p></div>   ← 공식집 탭에 모임

<div class="intuit"><b>직관 · 제목</b>…</div>   <div class="trap"><b>함정</b>…</div>
<div class="apply"><b>적용</b>…</div>          <div class="prof"><b>교수님 말</b>…</div>

<span class="star">시험</span> <span class="hl">강조 문장</span>
```

### 체크포인트
약식으로 써도 빌드 때 펼쳐진다:
```
::qz u18-10
질문 HTML
::a
답 (태그로 시작하지 않으면 <p>로 감쌈)
::end
```
**`data-q` id는 진도 키** — 기존 id는 지우거나 바꾸지 않고, 새 것은 다음 번호.

### 수식
MathJax `\( \)` · `\[ \]`. 수식 안 부등호는 `&lt;` `&gt;`. 과목별 매크로는 `course.json`의 `macros`.

### 예제 본문(`ex/<num>.html`)
`<div class="exq"><span class="examtag">PPT Q3 · 10/1 수업 문제</span><br>문제 [[…]]</div>` → `derive` 풀이 → `formula` 결과 → 변형 qz 두 개(`ex<num>-a`, `-b`).

## 3. 선택 뷰 (lab)
`course.json`에 `"lab": {"label": "실험실"}`, `content/<slug>/lab/lab.html`(마크업) · `lab.js`(`window.labInit = function(){…}`) · `lab.css`. 탭을 처음 열 때 불러온다.
