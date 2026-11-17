import './offline.css';

const base = import.meta.env.BASE_URL;
let mounted = false;
export function initOffline() {
  if (mounted) return;
  mounted = true;
  const panel = document.createElement('div');
  panel.id = 'offline-tools';
  panel.innerHTML = `<button type="button" class="offline-launch" aria-haspopup="dialog">오프라인 저장</button>
    <dialog aria-labelledby="offline-title"><h2 id="offline-title">인터넷 없이 공부하기</h2>
    <p>네 과목의 강의 정리·예제·공식·수식 표시 기능과 공부계획을 이 기기에 저장합니다.</p>
    <p class="offline-state" role="status" aria-live="polite">저장 상태를 확인하고 있습니다.</p>
    <progress hidden aria-label="오프라인 다운로드 진행률"></progress>
    <p class="offline-version"></p>
    <p class="offline-help">처음에는 인터넷에 연결한 상태에서 저장을 완료하세요. 완료 후 같은 브라우저에서 사이트 주소를 다시 열면 됩니다. eTL·Drive 원본 PDF와 외부 영상은 저장 대상이 아닙니다.</p>
    <p class="offline-help">완료 체크·메모는 이 브라우저에 보관됩니다. 브라우저 데이터 삭제 시 저장 자료와 기록도 지워질 수 있으니 중요한 기록은 백업하세요.</p>
    <div class="offline-actions"><button type="button" class="offline-save">전체 자료 저장</button><button type="button" class="offline-close">닫기</button></div></dialog>`;
  document.body.append(panel);
  const dialog = panel.querySelector('dialog'), launch = panel.querySelector('.offline-launch');
  const status = panel.querySelector('.offline-state'), version = panel.querySelector('.offline-version');
  const progress = panel.querySelector('progress'), button = panel.querySelector('.offline-save');
  let registration, busy = false, saved = null, applyUpdate = false;
  const setStatus = (text) => { status.textContent = text; };
  const date = (iso) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  launch.onclick = () => dialog.showModal();
  panel.querySelector('.offline-close').onclick = () => dialog.close();

  function paint() {
    const waiting = registration?.waiting;
    launch.textContent = busy ? '자료 저장 중…' : waiting ? '새 자료 적용' : saved?.ready ? (navigator.onLine ? '오프라인 준비 완료' : '오프라인 · 저장본') : '오프라인 저장';
    button.disabled = busy;
    button.textContent = waiting ? '새 자료 적용·새로고침' : saved?.ready ? '새 자료 확인' : '전체 자료 저장';
    if (saved?.ready) version.textContent = `저장본: ${date(saved.builtAt)} KST · ${(saved.bytes / 1048576).toFixed(1)} MB`;
  }
  function query(worker) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('저장 상태를 확인하지 못했습니다. 다시 시도하세요.')); }, 8000);
      channel.port1.onmessage = (e) => { clearTimeout(timer); channel.port1.close(); resolve(e.data); };
      worker.postMessage({ type: 'STATUS' }, [channel.port2]);
    });
  }
  async function refresh() {
    try {
      saved = registration?.active ? await query(registration.active) : null;
      if (!busy) setStatus(registration?.waiting ? '새 자료 저장 완료. 적용하면 최신 저장본으로 전환됩니다.' : saved?.ready ? '저장 완료. 인터넷 없이 새로고침하거나 다른 과목을 열 수 있습니다.' : '아직 전체 자료가 저장되지 않았습니다.');
      paint();
    } catch (error) { setStatus(error.message); paint(); }
  }
  function watch(worker) {
    if (!worker) return;
    busy = true; paint();
    const changed = async () => {
      if (worker.state === 'installed' || worker.state === 'activated') {
        busy = false; progress.hidden = true; await refresh();
      } else if (worker.state === 'redundant') {
        busy = false; progress.hidden = true;
        await refresh(); setStatus('저장을 완료하지 못했습니다. 연결·기기 여유 공간을 확인하고 다시 시도하세요. 기존 저장본은 유지됩니다.');
      }
    };
    worker.addEventListener('statechange', changed);
    changed();
  }
  function bind(reg) {
    registration = reg;
    reg.addEventListener('updatefound', () => watch(reg.installing));
    if (reg.installing) watch(reg.installing);
  }
  if (!('serviceWorker' in navigator) || !window.isSecureContext || import.meta.env.DEV) {
    setStatus('이 환경에서는 오프라인 저장을 사용할 수 없습니다. 게시된 HTTPS 사이트를 Chrome 또는 Safari에서 열어주세요.'); button.disabled = true; return;
  }
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data;
    if (!data?.offlineNotes) return;
    if (data.type === 'progress') {
      busy = true; progress.hidden = false; progress.max = data.total; progress.value = data.done;
      setStatus(`자료 저장 중 ${data.done}/${data.total} · 완료될 때까지 이 탭을 열어두세요.`); paint();
    } else if (data.type === 'error') {
      busy = false; progress.hidden = true; setStatus(`저장 실패: ${data.message} 기존 저장본은 유지됩니다.`); paint();
    } else if (data.type === 'ready') { busy = false; progress.hidden = true; refresh(); }
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applyUpdate) location.reload(); else refresh();
  });
  window.addEventListener('online', paint); window.addEventListener('offline', paint);
  button.onclick = async () => {
    if (registration?.waiting) { applyUpdate = true; registration.waiting.postMessage({ type: 'SKIP_WAITING' }); return; }
    busy = true; setStatus('자료를 확인하고 있습니다…'); paint();
    try {
      if (registration?.active && !saved?.ready) {
        registration.active.postMessage({ type: 'REPAIR' });
        return;
      }
      if (registration) await registration.update();
      else bind(await navigator.serviceWorker.register(base + 'sw.js', { scope: base, updateViaCache: 'none' }));
      if (!registration.installing) { busy = false; await refresh(); }
    } catch (error) {
      busy = false; setStatus('저장하지 못했습니다. 인터넷 연결과 기기 여유 공간을 확인한 뒤 다시 시도하세요.'); paint();
    }
  };
  navigator.serviceWorker.getRegistration(base).then(async (reg) => {
    if (reg) bind(reg);
    await refresh();
    if (reg && navigator.onLine) reg.update().catch(() => {});
  }).catch(() => { setStatus('저장 상태를 확인하지 못했습니다. 전체 자료 저장을 눌러 다시 시도하세요.'); });
}
