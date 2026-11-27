// نوافذ، تنبيهات، أيقونات، الشعار
import { $, el } from '../core/dom.js';

let lastFocus = null;
export function openDialog({ title, sub = '', body, wide = false, onClose }) {
  closeDialog();
  lastFocus = document.activeElement;
  const head = el('div', { class: 'dialog-head' },
    el('div', {}, el('h2', { text: title }), sub ? el('p', { text: sub }) : null),
    el('button', { class: 'x-btn', 'aria-label': 'إغلاق', onclick: closeDialog, text: '×' }));
  const box = el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, style: wide ? 'width:min(1040px,100%)' : '' }, head, el('div', { class: 'dialog-body' }, body));
  const ov = el('div', { class: 'overlay', id: 'overlay', onclick: e => { if (e.target === ov) closeDialog(); } }, box);
  ov._onClose = onClose;
  document.body.append(ov);
  box.querySelector('button')?.focus();
  return box;
}
export function closeDialog() {
  const ov = $('#overlay'); if (!ov) return;
  ov._onClose?.(); ov.remove(); lastFocus?.focus?.();
}
addEventListener('keydown', e => { if (e.key === 'Escape') closeDialog(); });

let tt;
export function toast(msg) {
  let t = $('#toast');
  if (!t) { t = el('div', { id: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(tt); tt = setTimeout(() => t.classList.add('hidden'), 3200);
}

// زر بتأكيد بضغطة ثانية (بديل confirm الممنوع في بعض البيئات)
export function confirmButton(btn, label, run) {
  const orig = btn.textContent;
  btn.addEventListener('click', async () => {
    if (btn.dataset.armed !== '1') { btn.dataset.armed = '1'; btn.textContent = label; setTimeout(() => { btn.dataset.armed = ''; btn.textContent = orig; }, 3000); return; }
    btn.dataset.armed = ''; btn.textContent = orig; await run();
  });
}

const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  play: svg('<path d="M7 5v14l12-7z"/>'),
  stop: svg('<rect x="6" y="6" width="12" height="12"/>'),
  doc: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),
  folder: svg('<path d="M3 6h7l2 2h9v11H3z"/>'),
  save: svg('<path d="M5 3h12l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>'),
  out: svg('<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  book: svg('<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6M20 4v14h-6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  print: svg('<path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/>'),
  shield: svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'),
};

// الشعار: دوّار مضخة بست ريش داخل حلزون
export const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 1 0 13 13h-4a9 9 0 1 1-9-9z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M25 16h4V3h-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><g fill="currentColor">${[0,60,120,180,240,300].map(a=>`<path transform="rotate(${a} 16 16)" d="M16 16c0-3 1.4-5 3.6-5.6-.4 2.4-1.6 4.3-3.6 5.6z"/>`).join('')}<circle cx="16" cy="16" r="1.8"/></g></svg>`;
