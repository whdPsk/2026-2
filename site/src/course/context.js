// 기능 모듈들이 공유하는 상태와 헬퍼. 각 기능은 init(ctx)에서 필요한 함수를 ctx에 등록한다.
import { $$ } from './util.js';

export const MARK = ['○', '◐', '●'];
export const RLAB = { 1: '중간', 2: '기말' };

export function createContext(D, store, tex) {
  const uMeta = Object.fromEntries(D.units.map((u) => [u.id, u]));
  const CH = D.chapters;
  const rangeOfCh = (c) => (CH[c] || {}).range || 1;
  const ctx = {
    D, store, ST: store.ST, tex, texNow: tex.texNow, uMeta, CH,
    units: $$('article.unit'),
    exs: $$('article.ex'),
    get ids() { return this.units.map((u) => u.id); },
    rangeOfCh,
    rangeOfUnit: (id) => rangeOfCh(uMeta[id].ch),
    /** 장 필터: all | mid | fin | lec | <장번호> */
    chOk(sel, ch) {
      if (sel === 'all') return true;
      if (sel === 'mid') return rangeOfCh(ch) === 1;
      if (sel === 'fin') return rangeOfCh(ch) === 2;
      if (sel === 'lec') return false;
      return String(ch) === sel;
    },
    activeId: null,
    activeView: 'study',
    // 기능 모듈이 채우는 훅 (없으면 no-op)
    paint() {}, paintQz() {}, buildWeak() {}, buildGrid() {}, rehydrate() {},
  };
  ctx.activeId = ctx.ids[0];
  return ctx;
}
