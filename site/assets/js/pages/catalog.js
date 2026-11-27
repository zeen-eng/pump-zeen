// صفحة الكتالوج: تعرض PUMPS و SOURCES من data/pumps.js كما هي
import { $, $$, el } from '../core/dom.js';
import { n1, n2 } from '../core/format.js';
import { PUMPS, PUMP_TYPES, SOURCES } from '../data/pumps.js';
import { LOGO } from '../ui/common.js';
import { langButton } from '../i18n/index.js';
import { sparkline } from '../ui/chart.js';
import { t } from '../i18n/index.js';

$$('[data-logo]').forEach(n => n.innerHTML = LOGO);
$('#langSlot').append(langButton());
const list = $('#list'), toc = $('#toc');

for (const [type, T] of Object.entries(PUMP_TYPES)) {
  const pumps = PUMPS.filter(p => p.type === type), src = SOURCES[pumps[0].src];
  toc.append(el('a', { href: '#t-' + type, text: T.name }));
  const sec = el('section', { class: 'cat-sec', id: 't-' + type },
    el('h2', { text: T.name }), el('p', { class: 'muted', text: T.note }),
    el('div', { class: 'src' },
      el('div', {}, el('small', { text: t('المصدر') }), el('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer', text: src.title })),
      el('div', {}, el('small', { text: t('الناشر') }), el('span', { text: src.publisher })),
      el('div', {}, el('small', { text: t('التردد / السرعة') }), el('span', { class: 'num', text: `${src.hz} Hz · ${src.rpm} rpm` })),
      el('p', { class: 'small muted', text: src.notes })));
  for (const p of pumps) {
    const qs = p.curve.map(c => c[0]);
    const tbl = el('table', { class: 'table' },
      el('thead', {}, el('tr', {}, el('th', { text: t('Q لتر/دقيقة') }), ...qs.map(q => el('th', { class: 'n', text: String(q) })))),
      el('tbody', {},
        el('tr', {}, el('td', { class: 'muted', text: t('Q م³/س') }), ...qs.map(q => el('td', { class: 'n', text: n2(q * 0.06) }))),
        el('tr', {}, el('td', { text: t('H متر') }), ...p.curve.map(c => el('td', { class: 'n', text: n1(c[1]) })))));
    const card = el('article', { class: 'pump-card', id: p.id },
      el('header', {}, el('div', {}, el('h3', { text: p.model }), el('span', { class: 'muted small', text: t('{0} ك.واط · منافذ {1}{2} · حرارة حتى {3}°م{4}{5}', [p.kw, p.ports, p.stages ? ' · ' + p.stages + t(' مراحل') : '', p.tMax, p.maxLift ? t(' · سحب حتى ') + p.maxLift + t(' م') : '', p.maxBar ? t(' · جسم ') + p.maxBar + t(' بار') : '']) })), el('span', { class: 'spark' })),
      el('div', { class: 'scroll-x' }, tbl));
    card.querySelector('.spark').innerHTML = sparkline(p, 120, 40);
    sec.append(card);
  }
  list.append(sec);
}
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
