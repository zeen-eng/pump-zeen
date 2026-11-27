// صفحة الكتالوج: تعرض PUMPS و SOURCES من data/pumps.js كما هي
import { $, $$, el } from '../core/dom.js';
import { n1, n2 } from '../core/format.js';
import { PUMPS, PUMP_TYPES, SOURCES } from '../data/pumps.js';
import { LOGO } from '../ui/common.js';
import { sparkline } from '../ui/chart.js';

$$('[data-logo]').forEach(n => n.innerHTML = LOGO);
const list = $('#list'), toc = $('#toc');

for (const [type, T] of Object.entries(PUMP_TYPES)) {
  const pumps = PUMPS.filter(p => p.type === type), src = SOURCES[pumps[0].src];
  toc.append(el('a', { href: '#t-' + type, text: T.name }));
  const sec = el('section', { class: 'cat-sec', id: 't-' + type },
    el('h2', { text: T.name }), el('p', { class: 'muted', text: T.note }),
    el('div', { class: 'src' },
      el('div', {}, el('small', { text: 'المصدر' }), el('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer', text: src.title })),
      el('div', {}, el('small', { text: 'الناشر' }), el('span', { text: src.publisher })),
      el('div', {}, el('small', { text: 'التردد / السرعة' }), el('span', { class: 'num', text: `${src.hz} Hz · ${src.rpm} rpm` })),
      el('p', { class: 'small muted', text: src.notes })));
  for (const p of pumps) {
    const qs = p.curve.map(c => c[0]);
    const tbl = el('table', { class: 'table' },
      el('thead', {}, el('tr', {}, el('th', { text: 'Q لتر/دقيقة' }), ...qs.map(q => el('th', { class: 'n', text: String(q) })))),
      el('tbody', {},
        el('tr', {}, el('td', { class: 'muted', text: 'Q م³/س' }), ...qs.map(q => el('td', { class: 'n', text: n2(q * 0.06) }))),
        el('tr', {}, el('td', { text: 'H متر' }), ...p.curve.map(c => el('td', { class: 'n', text: n1(c[1]) })))));
    const card = el('article', { class: 'pump-card', id: p.id },
      el('header', {}, el('div', {}, el('h3', { text: p.model }), el('span', { class: 'muted small', text: `${p.kw} ك.واط · منافذ ${p.ports}${p.stages ? ' · ' + p.stages + ' مراحل' : ''} · حرارة حتى ${p.tMax}°م${p.maxLift ? ' · سحب حتى ' + p.maxLift + ' م' : ''}${p.maxBar ? ' · جسم ' + p.maxBar + ' بار' : ''}` })), el('span', { class: 'spark' })),
      el('div', { class: 'scroll-x' }, tbl));
    card.querySelector('.spark').innerHTML = sparkline(p, 120, 40);
    sec.append(card);
  }
  list.append(sec);
}
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
