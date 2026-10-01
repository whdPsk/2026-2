// 진도 저장소: localStorage(기본) + JSON 내보내기/불러오기.
// window.claude(Claude Artifact 런타임)가 있으면 계정 DB 동기화도 그대로 동작한다.
import { $ } from '../util.js';

export function createStore(key) {
  let LS = null;
  try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); LS = localStorage; } catch { LS = null; }
  const lget = (k) => { try { return LS ? LS.getItem(k) : null; } catch { return null; } };
  const lset = (k, v) => { try { if (LS) LS.setItem(k, v); } catch { /* ignore */ } };

  const ST = { st: {}, qz: {}, note: {}, t: 0 };
  try {
    const raw = lget(key);
    if (raw) { const o = JSON.parse(raw); ST.st = o.st || {}; ST.qz = o.qz || {}; ST.note = o.note || {}; ST.t = o.t || 0; }
  } catch { /* ignore */ }

  let dbRef = null, saveT = null;
  const listeners = [];
  const sync = (txt, cls = '') => { const e = $('sync'); if (e) { e.textContent = txt; e.className = cls; } };
  const local = () => sync(LS ? '이 기기에만 저장' : '');

  function persist() {
    ST.t = Date.now();
    lset(key, JSON.stringify(ST));
    if (!dbRef) return;
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      dbRef.set({ st: ST.st, qz: ST.qz, note: ST.note, t: ST.t }).then(() => sync('동기화됨', 'on')).catch(local);
    }, 1200);
  }

  function replace(d) {
    ST.st = { ...(d.st || {}) }; ST.qz = { ...(d.qz || {}) }; ST.note = { ...(d.note || {}) }; ST.t = d.t || Date.now();
    lset(key, JSON.stringify(ST));
    listeners.forEach((f) => f());
  }

  /** Claude Artifact 런타임이 있을 때만: 계정 DB와 동기화 */
  function connect() {
    const C = window.claude;
    if (!C || !C.use) return local();
    Promise.all([C.use('db'), C.use('user')]).then(([db, user]) => {
      if (!db || !user) return local();
      return user.id().then((uid) => {
        if (!uid) return local();
        dbRef = db.doc('data/users/' + uid + '/progress');
        return dbRef.get().then((snap) => {
          const d = snap.exists ? snap.data() : null;
          if (d && (d.t || 0) >= (ST.t || 0)) replace(d);
          else if (ST.t) persist();
          sync('동기화됨', 'on');
        });
      });
    }).catch(local);
  }

  function exportJson(meta) {
    const blob = new Blob([JSON.stringify({ format: 'study-console-progress', version: 1, course: meta.slug, title: meta.title, exported: new Date().toISOString(), data: ST }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${meta.slug}-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /** 불러오기: 같은 과목 파일만 허용, 기존 기록과 병합(같은 키는 파일 쪽 우선) */
  function importJson(text, slug) {
    const o = JSON.parse(text);
    const d = o.data || o;
    if (o.course && o.course !== slug) throw new Error(`다른 과목(${o.course})의 파일입니다`);
    if (!d || typeof d !== 'object' || !('st' in d || 'qz' in d || 'note' in d)) throw new Error('진도 파일 형식이 아닙니다');
    replace({ st: { ...ST.st, ...d.st }, qz: { ...ST.qz, ...d.qz }, note: { ...ST.note, ...d.note }, t: Date.now() });
    persist();
  }

  return { ST, persist, connect, lget, lset, hasLS: !!LS, onReplace: (f) => listeners.push(f), exportJson, importJson };
}
