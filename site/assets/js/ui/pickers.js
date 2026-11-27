// نافذتا اختيار المبنى واختيار المضخة
import { el } from '../core/dom.js';
import { n1, n2 } from '../core/format.js';
import { openDialog, closeDialog } from './common.js';
import { BUILDINGS } from '../data/buildings.js';
import { PUMP_TYPES, ofType, SOURCES } from '../data/pumps.js';
import { trial, recommendPump } from '../engine/recommend.js';
import { sparkline } from './chart.js';
import { t } from '../i18n/index.js';

const ICONS = {
  house: '<path d="M14 70V38L50 16l36 22v32z" class="s-fill"/><rect x="42" y="48" width="16" height="22" class="s-win"/><rect x="22" y="44" width="12" height="10" class="s-win"/><rect x="66" y="44" width="12" height="10" class="s-win"/>',
  school: '<rect x="6" y="26" width="88" height="44" class="s-fill"/><rect x="4" y="22" width="92" height="5" class="s-slab"/>' + [0, 1, 2, 3].map(i => `<rect x="${12 + i * 21}" y="34" width="12" height="10" class="s-win"/>`).join('') + '<rect x="42" y="52" width="16" height="18" class="s-win"/><path d="M14 22V6h14v8H14" class="s-thin"/>',
  factory: '<path d="M6 70V32l22-12v12l22-12v12l22-12v50z" class="s-fill"/><rect x="80" y="8" width="10" height="62" class="s-fill"/><rect x="30" y="50" width="20" height="20" class="s-win"/>',
};

export function buildingPicker(onPick) {
  const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px' });
  for (const [k, b] of Object.entries(BUILDINGS)) {
    const card = el('button', { class: 'btn', style: 'flex-direction:column;align-items:stretch;text-align:start;padding:14px;height:auto;gap:8px', onclick: () => { closeDialog(); onPick(k); } });
    card.innerHTML = `<svg viewBox="0 0 100 74" style="width:100%;height:84px" aria-hidden="true">${ICONS[k]}<line x1="0" x2="100" y1="70" y2="70" class="s-ground"/></svg>`;
    card.append(el('b', { text: b.name, style: 'font-size:17px' }), el('span', { class: 'muted small', text: b.desc }));
    grid.append(card);
  }
  openDialog({ title: t('نوع المبنى'), sub: t('يحدد الاستهلاك اليومي وارتفاع الدور الافتراضي. تقدر تغيّره لاحقاً.'), body: grid });
}

export function pumpPicker(state, current, onPick) {
  let type = current ? current.type : 'surface';
  const body = el('div');
  const draw = () => {
    const rec = recommendPump(state, type);
    const tabs = el('div', { class: 'seg', role: 'tablist', style: 'margin-bottom:12px' },
      ...Object.entries(PUMP_TYPES).map(([k, t]) => el('button', { role: 'tab', 'aria-pressed': String(k === type), text: t.name, onclick: () => { type = k; draw(); } })));
    const rows = ofType(type).map(p => {
      const R = trial(state, p.id);
      const st = R.noLift ? ['bad', t('لا ترفع')] : R.air ? ['bad', t('السحب لا يصل')] : R.runout ? ['bad', t('بعد نهاية المنحنى')] : R.tempC > p.tMax ? ['bad', t('حرارة عالية')]
        : (!R.sub && (R.margin < 0.5 || R.g.lift > p.maxLift)) ? ['bad', t('تكهف')] : R.q < R.D.qReq ? ['warn', t('تدفق أقل')] : ['ok', t('مناسبة')];
      const tr = el('tr', { class: (p.id === rec ? 'rec ' : '') + (current && current.id === p.id ? 'cur' : ''), tabindex: '0' },
        el('td', {}, el('b', { text: p.model }), el('div', { class: 'muted small', text: p.kw + t(' ك.واط · ') + p.ports })),
        el('td', { class: 'opt' }), el('td', { class: 'n', text: n1(p.curve[0][1]) }), el('td', { class: 'n opt', text: n1(p.curve.at(-1)[0] * 0.06) }),
        el('td', { class: 'n', text: R.noLift ? '—' : n2(R.q) }), el('td', {}, el('span', { class: 'tag ' + st[0], text: st[1] })));
      tr.children[1].innerHTML = sparkline(p);
      const pick = () => { closeDialog(); onPick(p.id); };
      tr.addEventListener('click', pick); tr.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
      return tr;
    });
    const table = el('table', { class: 'table pump-table' },
      el('thead', {}, el('tr', {}, ...[t('الموديل'), t('المنحنى'), t('أقصى ضاغط م'), t('أقصى تدفق م³/س'), t('التشغيل هنا م³/س'), t('الحكم')].map((h, i) => el('th', { class: (i >= 2 && i <= 4 ? 'n ' : '') + (i === 1 || i === 3 ? 'opt' : ''), text: h })))),
      el('tbody', {}, ...rows));
    const src = SOURCES[ofType(type)[0].src];
    body.replaceChildren(tabs, el('p', { class: 'note', text: PUMP_TYPES[type].note }), el('div', { class: 'scroll-x' }, table),
      el('p', { class: 'source-line' }, el('span', { text: t('المصدر: ') + src.title + ' — ' }), el('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer', text: t('ملف الكتالوج') }), el('span', { text: ' · ' }), el('a', { href: 'catalog.html', target: '_blank', rel: 'noopener', text: t('كل الكتالوج') })));
  };
  draw();
  openDialog({ title: t('اختيار المضخة'), sub: t('التشغيل محسوب على تصميمك الحالي من منحنيات الكتالوج الحقيقية. «موصى بها» = أصغر مضخة تحقق الطلب قرب أفضل كفاءة وبلا تكهف.'), body, wide: true });
}
