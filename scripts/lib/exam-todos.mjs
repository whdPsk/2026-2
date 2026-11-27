// Source-based exam checklist. Dates below identify materials, not study slots.
const config = {
  advmech: {
    first: 23, preview: 35,
    lectures: [['m1102'], ['m1103'], ['m1109'], ['m1111'], ['dm1116'], ['dm1123'], ['dm1125']],
    homework: [['HW3', '2026-11-24']],
    goal: '가정과 좌표를 적고 운동방정식부터 결과까지 백지 유도. 경계조건·초기조건을 바꾼 문제를 다시 풀고 오류를 메모한다.',
  },
  emwaves: {
    first: 20, preview: 27,
    lectures: [['de1116'], ['de1123a', 'de1123b'], ['de1125']],
    homework: [['eh1102', '2026-11-02'], ['eh1104', '2026-11-04'], ['eh1109', '2026-11-09'], ['eh1116', '2026-11-16'], ['eh1118', '2026-11-18'], ['eh1123', '2026-11-23'], ['eh1125', '2026-11-25']],
    goal: '가정·근사·좌표계를 먼저 쓰고 시작 식부터 마지막 식까지 유도한다. 해당 단원 예제를 답 없이 풀고 차원·극한·물리적 의미를 확인한다. 중간고사 복기는 출제 방식만 참고한다.',
  },
  astro1: {
    first: 22, preview: 34,
    lectures: [['1022'], ['a15'], ['a16'], ['a17'], ['a18'], ['a19'], ['da1117', 'a20'], ['a21'], ['da1124', 'a22'], ['da1126', 'a23']],
    homework: [['HW5', '2026-11-10'], ['HW6', '2026-11-19']],
    goal: '가정과 지배방정식을 적고 핵심 유도·극한·안정 조건을 설명한다. 사이트 예제의 조건을 바꿔 계산하고 물리적 해석까지 쓴다.',
  },
  mechexp: {
    first: 1, preview: Infinity, lectures: [], homework: [],
    goal: '실험 원리·장치 역할·측정량·식의 가정을 설명하고 그래프 해석과 계산을 연습한다. 12/12 단 한 번의 4대역학 통합 퀴즈 대비용이며 집중 학습 시점은 퀴즈 직전이다.',
  },
};
const clean = (text = '') => text.replace(/\[\[[^\]]+\]\]/g, '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const md = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
const link = (route, key, label) => ({ route, key, label });

export function buildExamTodos(courses) {
  const rows = [];
  for (const { slug, data: d, lectures, homework } of courses) {
    const c = config[slug];
    if (!c) continue;
    const add = (key, fields) => rows.push({ id: `dated:exam:${slug}:${key}`, slug, date: '', kind: 'study', units: [], reading: '', details: '', sources: [], ...fields });
    const findLecture = (id) => {
      const l = lectures.find((l) => l.id === id);
      if (!l) throw new Error(`Missing exam lecture ${slug}/${id}`);
      return l;
    };
    for (const u of d.units.filter((u) => Number(u.id.slice(1)) >= c.first)) {
      const planned = Number(u.id.slice(1)) >= c.preview;
      const examples = slug === 'mechexp' ? [] : d.examples.filter((e) => e.unit === u.id);
      add(`unit:${u.id}`, {
        category: '교재·사이트 노트', units: [u.id],
        title: `${u.ch}장 §${u.secs} · ${clean(u.title)}${planned ? ' [예정 범위]' : ''}`,
        reading: planned ? '기말 계획상 범위 · 실제 강의 완료 미확인' : '',
        details: `${c.goal}${planned ? ' 현재 강의 완료로 체크하지 않은 예정 단원이다. 추후 진도·시험 공지에 따라 범위를 확인한다.' : ''}${examples.length ? ' 연결 예제: ' + examples.map((e) => e.num).join(', ') + '.' : ''}`,
        sources: examples.map((e) => link('examples', e.num, `예제 ${e.num} · ${clean(e.title)}`)),
      });
    }
    for (const ids of c.lectures) {
      const ls = ids.map(findLecture), first = ls[0];
      const title = clean(first.title).replace(/^\d{1,2}\/\d{1,2}\s*/, '');
      const recorded = /다글로/.test(first.file || '');
      const label = /결석/.test(title) ? '결석 보충 자료' : recorded ? '수업 필기' : '강의자료';
      add(`lecture:${first.id}`, {
        category: '수업 필기·강의자료', sourceDate: first.date,
        title: `${md(first.date)} ${label} · ${first.id === 'de1123a' ? '전·후반 · Lorentz 변환·속도 합성·4-벡터' : title.replace(/^(실제 강의|결석 보충)\s*·\s*/, '')}`,
        units: [...new Set(ls.flatMap((l) => Object.keys(l.unitNotes || {})))],
        reading: ls.map((l) => `${md(l.date)} ${clean(l.file || '강의자료')}`).filter((v, i, a) => a.indexOf(v) === i).join(' + '),
        details: `${recorded ? '수업에서 다룬 유도와 예제를 필기를 가리고 재현한다.' : '해당 날짜의 자료를 읽고 핵심 유도·예제를 재현한다. 자료 날짜가 실제 수업일·완료 진도를 보장하지 않는다.'} ${ls.flatMap((l) => l.summary || []).map(clean).join(' ')}`,
        sources: ls.map((l) => link('lecture', l.id, `${md(l.date)} · ${clean(l.title)}`)),
      });
    }
    for (const [id, date] of c.homework) {
      const h = homework.find((h) => h.id === id);
      if (!h || ['bank', 'ref'].includes(h.kind)) throw new Error(`Missing assigned homework ${slug}/${id}`);
      const prefix = `${md(date)} 과제${/^HW/.test(id) ? ' ' + id : ''}`;
      if (id === 'eh1102' || id === 'eh1104') {
        const electric = id === 'eh1102';
        add(`hw:${id}:derive`, {
          category: '지정 과제 재풀이', sourceDate: date, units: [electric ? 'u20' : 'u21'],
          title: `${prefix} · ${electric ? '전기' : '자기'} 쌍극자 복사 유도`,
          reading: `${md(date)} 출제 · Griffiths 11장 · 문항 번호 없는 유도 과제`,
          details: `퍼텐셜, E·B, Poynting 벡터, 시간평균과 총 복사 출력을 시작 식부터 끝까지 답을 가리고 유도한다.${electric ? '' : ' 자기·전기 쌍극자의 평균 출력비까지 구한다.'} 제출 여부와 별도로 시험 대비 재풀이를 체크한다.`,
          sources: [link('hw', '', `${prefix} · 지정 과제 목록`)],
        });
      }
      for (const p of h.probs) {
        add(`hw:${id}:${p.num}`, {
          category: p.tag === 'opt' ? '선택 문제 연습' : '지정 과제 재풀이', sourceDate: date,
          title: `${prefix} · ${/^HW/.test(p.num) || p.num === 'D1118' ? clean(p.title) : p.num === '12.160-proof' ? '식 (12.160) 직교성 증명' : '문제 ' + p.num}${p.tag === 'opt' ? ' [선택]' : ''}`,
          units: p.unit ? [p.unit] : [],
          reading: `${md(date)} 출제 · ${/^HW/.test(id) ? id + ' · ' : ''}${/^HW/.test(p.num) || p.num === 'D1118' ? clean(p.title) : p.num === '12.160-proof' ? '교재 식 (12.160) 증명' : '교재 문제 ' + p.num}${p.tag === 'opt' ? ' · 선택 문제' : ''}`,
          details: `문항은 아래 지정 과제 링크에서 확인하고 풀이를 가린 채 처음부터 다시 푼다. 틀린 단계와 적용 조건을 메모한다. 제출 완료와 별도의 시험 공부 체크다.${!p.unit ? ' 문항 원문과 단원 연결은 미확인: 임의로 단원을 배정하지 않았다.' : ''}`,
          sources: [link('hw', p.num, `${prefix} · ${p.num}`)],
        });
      }
    }
    if (slug === 'mechexp') {
      for (const e of d.examples.filter((e) => /^Q\d+$/.test(e.num))) {
        add(`quiz:${e.num}`, { category: '예상 퀴즈 풀이', units: [e.unit],
          title: `${e.num} · ${clean(e.title)}`, reading: `${e.num === 'Q12' ? '교재 기반 보충 예상문항' : '기출·복기 경향을 반영한 예상문항'} · 12/12 통합 퀴즈`,
          details: '퀴즈 직전 집중 풀이. 풀이를 가리고 서술·계산을 완성한 뒤 예상 풀이와 비교한다. 실제 기출 원문이 아닌 사이트 예상문항이다.',
          sources: [link('examples', e.num, `예상 퀴즈 ${e.num} · 문제·풀이`)],
        });
      }
    }
  }
  return rows;
}
