# 천물개(astro1) 콘솔 전면 재작성 — 작업자 지침

과목 폴더: `/home/claude/courses/astro1` · 원자료: `/home/claude/src` · 엔진: `/home/claude/engine`
사용자 요구(그대로): "내용이 이렇게 빠지면 안돼. PPT내용 그대로 추가하고 부가설명하는식으로 + 강조할내용강조하기. 전체 다 갈아엎어서라도 내용 빠진거 있으면 안됨."
출제 스타일(천물개): 공식 유도 하나하나보다 **물리적·직관적 이해 + 적용(PPT Q 문제 같은 계산)**. 시험 AI 금지, 계산기 지참.

## 원자료
- PPT: `src/LectureNN_*.pdf`, 텍스트 `src/LectureNN_*.txt`, 페이지 이미지 `src/img_LectureNN-P.png`(L00은 `img_L00-P.png`). PDF 1페이지에 슬라이드가 여러 장(2-up/4-up)일 수 있다 → **반드시 이미지를 Read로 직접 보고** 슬라이드 번호·수식·지수·그림 설명을 확정. 텍스트 추출은 지수가 깨진다.
- 속기: `src/MMDD.flat.txt` (한 줄 = `idx|타임스탬프|텍스트`, STT라 오인식 많음). 원본 `src/MMDD_천물개1.txt`.
- 플립 영상 스크립트: `src/FNN.txt` (한 줄 = `[m:ss] 텍스트`). 장부 `ledger/FNN.json`은 이미 줄 단위로 만들어져 있음(`FNN.01`…). 고치지 말고 그대로 인용만.
- 9/29 녹음: `src/D0929.txt`.
- 교재(구본철·김웅태 2022)는 파일 없음 — 인용 불가. 교재 문장 지어내지 말 것.

## 1) 장부 작성 — `ledger/<ID>.json` (당신 그룹 소스만)
형식: `[{"id":"L01.s3","loc":"슬라이드 3","raw":"원문","note":"메모"}, ...]`, 내용 없는 항목만 `"skip":"표지"` 등.
- PPT `LNN`: 슬라이드 1장 = 1항목(`LNN.sK`), 질문·불릿·Q/A가 여러 개면 쪼갬(`s3a, s3b…`; 문제와 답 슬라이드는 각각). raw = 슬라이드 텍스트를 **영어 원문 그대로**(수식은 읽을 수 있게 유니코드/LaTeX), 그림은 `[그림: …]`으로 무엇이 그려졌는지. 표지·"Questions?"만 skip.
- 속기 `SMMDD` / 녹음: 주제 단위 구간 25–35개(`S0901.01`…), loc `"MM:SS–MM:SS"`, raw = 해당 줄들 원문 그대로(`[MM:SS] 텍스트` 줄바꿈 연결), note = 주제 요약 + STT 교정(예: "로렌즈→로렌츠") + 수치 의심. 출석·순수 잡담만 skip, 섞이면 쪼갬. **모든 줄이 어느 항목엔가 들어가야 함**(빠진 줄 없음).
- `sources.json`에는 이미 당신 소스 ID가 있음(수정 불필요).

## 2) 단원 본문 다시 쓰기 — `units/uNN.html` (당신 그룹 단원만)
기존 본문은 내용이 너무 빈약 → **새로 쓴다**. 단, 기존 `data-q="uNN-k"` 체크포인트 id는 진도 키라 **삭제·변경 금지**(질문 내용은 고쳐도 됨, 새 것은 다음 번호로 추가). 기존 문서 끝 `<p class="note">출처…</p>` 줄은 갱신.
구성 순서(강의 흐름대로):
1. `<div class="predict"><b>◈ 학습 목표.</b> …</div>`
2. `<h4>소제목 <span class="en">English</span></h4>` 단위로 진행.
3. **PPT 슬라이드 전사 블록** — 슬라이드 내용을 그대로:
```html
<div class="slide"><div class="sh">L01 · 슬라이드 3 <span class="st">Specific Intensity</span></div>
<ul><li>원문 불릿 그대로 (수식은 \( \))</li>…</ul>
<div class="ans"><b>ANSWER</b> (Q/A 슬라이드면 답 슬라이드 내용 그대로)</div> [[L01.s3]]</div>
<div class="explain"><b>부가설명</b> 한국어로 풀어 설명 — 강의(속기)·플립에서 교수님이 한 설명을 모두 반영, 칩 [[S0901.12, F02.03]]</div>
```
4. **플립 영상 유도** — 생략 없이 단계별:
```html
<div class="slide flip"><div class="sh">플립 02 · 2:10–4:30 <span class="st">복사세기의 보존</span></div>
<ol><li>단계 … \(…\) [[F02.04]]</li>…</ol></div>
```
   또는 기존 `.derive`/`.formula`(암기 박스) 블록도 사용 가능: `<div class="derive"><div class="dtitle"><span class="tag">유도</span>제목</div><ol><li>…</li></ol></div>`, `<div class="formula"><div class="ftitle">암기 — …</div>\[…\]<p class="note">조건…</p></div>`
5. **강조**: 교수님이 "중요/시험/꼭/기억" 등 강조한 것 → `<span class="star">강조</span>` 배지 + `<span class="hl">핵심 문장</span>`. 시험 언급이면 `<span class="star">시험</span>`.
6. 성격별 블록(각 `<b>제목</b>`으로 시작): 직관·비유 `.intuit`, 함정·흔한 오답·STT 수치 의심 `.trap`, 천체 적용·수치 척도 `.apply`, 수업 중 질문과 답 `.prof`.
7. Review Questions(말로 답하기) → 각 질문을 slide 블록으로 전사 + 모범답(explain) + 체크포인트 qz.
8. 체크포인트 `<h4>체크포인트</h4>` + qz (기존 형식 그대로 복사):
`<div class="qz" data-q="u01-4"><div class="qq">질문</div><div class="qbar"><button class="rv">답 확인</button><span class="vd"><span>스스로 채점:</span><button data-v="1">맞음</button><button data-v="0">더 볼 것</button></span></div><div class="qa"><div class="alabel">Answer</div><p>답</p></div></div>`

인용 `[[ID]]` / `[[ID1, ID2]]`: 문단·불릿·블록 끝에. 겹치는 내용(PPT=플립=속기)은 **빼지 말고** 같은 자리에 칩을 여러 개. **당신 그룹 장부의 skip 아닌 모든 항목이 최소 1번 인용**되어야 함. 다른 그룹 소스 ID는 인용하지 말 것(단, 맡은 단원에 이미 있는 기존 인용 `[[L07.*]]`/`[[S0922.*]]`는 그대로 보존).
수식: MathJax `\( \)`/`\[ \]`. 수식 안 부등호는 `&lt;` `&gt;`. HTML 속성 따옴표 주의. 한국어 본문.
정확성: 속기는 STT 오인식 많음 → PPT·플립·물리로 교정, 의심 수치는 `.trap`에 "녹음상 X / 표준 Y" 둘 다. **모든 수치는 python으로 다시 계산**해 확인.

## 3) PPT Q 문제 → 예제
각 PPT Q(및 수업 문제)마다 `ex/<num>.html` + 예제 메타. 번호는 그룹에 배정된 범위만 사용.
`ex/<num>.html` 형식(참고: `ex/5.4.html`):
- `<div class="exq"><span class="examtag">PPT Qn · M/D 수업 문제</span><br>문제 원문(영어 그대로) + 한국어 번역 [[LNN.sK]]</div>`
- `<div class="derive"><div class="dtitle"><span class="tag">풀이</span>…</div><ol><li>…</li></ol></div>` (PPT 답 슬라이드 수치와 대조, 칩)
- `<div class="formula"><div class="ftitle">결과</div><p>…</p></div>`
- 수업 중 설명(속기)은 `.intuit`/`.trap` + 칩
- 변형 2개: `<div class="qz" data-q="ex<num>-a">…<b>+α</b>…</div>`, `-b`.
메타는 `parts/ex_<그룹>.json`에 리스트로: `{"num":"1.10","ch":1,"unit":"u01","page":0,"title":"PPT Q1: …","en":"","summary":"한 줄 답"}`. 기존 예제(예: 1.1)를 고치면 같은 num으로 전체 항목을 넣으면 교체됨(기존 ex html 수정 가능, 기존 qz id 유지).

## 4) 강의 로그 → `parts/lec_<그룹>.json`
해당 날짜 항목 전체(교체됨): `{"id":"0901","date":"2026-09-01","dow":"화","kind":"note","title":"9/1 강의 — 주제 (PPT01 + 속기)","file":"Lecture01 PPT · 0901 속기","url":"(sources.json의 PPT url)","summary":["불릿마다 칩 …"],"examples":["1.10",…],"unitNotes":{"u01":["<b>9/1</b>: …"]}}`. 공지(과제·휴강·시험)도 칩과 함께.

## 5) 검사 (반드시 OK까지 반복)
`python3 /home/claude/engine/groupcheck.py /home/claude/courses/astro1 --src <당신 소스들 쉼표> --files <당신 단원·예제·parts 파일 glob 쉼표>`
→ 모든 소스 `n/n cited`, UNKNOWN·MATH·DUPQ 없음, 마지막 줄 `OK`.
`build.py`는 실행하지 말 것(다른 작업자와 동시 실행 충돌). 다른 그룹 파일은 건드리지 말 것. `course.json`·`meta.json`·`examples.json`·`lectures.json` 직접 수정 금지(parts로만).

## 6) 보고
마지막 메시지: 만든 장부(소스별 항목 수·skip 수), 수정한 파일 목록, 새 예제 번호, 새 qz id, groupcheck 결과 마지막 줄, STT/수치 의심으로 사용자가 확인할 것(짧게).
