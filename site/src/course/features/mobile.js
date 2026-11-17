export function initMobileNavigation() {
  const rail = document.getElementById('rail');
  const toggle = document.getElementById('mobile-index');
  const open = (value) => {
    rail.classList.toggle('mobile-open', value);
    toggle.setAttribute('aria-expanded', String(value));
    toggle.textContent = value ? '단원 목록 닫기' : '단원 목록·검색';
  };
  toggle.onclick = () => open(!rail.classList.contains('mobile-open'));
  rail.addEventListener('click', (event) => { if (event.target.closest('a[data-u]')) open(false); });
  window.addEventListener('hashchange', () => open(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !/INPUT|TEXTAREA/.test(event.target.tagName) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      setTimeout(() => { open(true); document.getElementById('q').focus(); }, 60);
    }
    if (event.key === 'Escape') open(false);
  });
}
