// ═══════════════════════════════════════════════════════════════
// المفتش: لوحة خصائص العنصر المحدد في المشهد
// يرسل التعديلات عبر onChange(key, value) ولا يكتب في الحالة مباشرة
// ═══════════════════════════════════════════════════════════════
import { el } from '../core/dom.js';
import { n0, n1, n2 } from '../core/format.js';
import { LIMITS } from '../core/sanitize.js';
import { BUILDINGS } from '../data/buildings.js';
import { MATERIALS, DIAMETERS } from '../data/materials.js';
import { PUMP_TYPES, byId, SOURCES } from '../data/pumps.js';
import { demand } from '../engine/demand.js';
import { t } from '../i18n/index.js';

const get = (s, k) => k.split('.').reduce((o, p) => o && o[p], s);

function rangeField(s, label, key, unit, onChange, maxOverride) {
  const [a, b, st] = LIMITS[key], max = maxOverride ?? b, v = get(s, key);
  const range = el('input', { type: 'range', min: a, max, step: st, value: v, id: 'r-' + key, 'aria-label': label });
  const box = el('input', { class: 'input', type: 'number', inputmode: 'decimal', min: a, max, step: st, value: v, 'aria-label': label + ' (' + unit + ')' });
  range.addEventListener('input', () => { box.value = range.value; onChange(key, Number(range.value)); });
  box.addEventListener('change', () => { const n = Math.min(max, Math.max(a, Number(box.value) || a)); box.value = n; range.value = n; onChange(key, n); });
  return el('div', { class: 'field' }, el('label', { for: 'r-' + key, text: label }),
    el('div', { class: 'range-row' }, range, el('div', { class: 'unit-box' }, box, el('span', { text: unit }))));
}
function selectField(s, label, key, options, onChange) {
  const v = String(get(s, key));
  const sel = el('select', { class: 'input', id: 's-' + key },
    ...options.map(([val, name]) => el('option', { value: val, selected: String(val) === v, text: name })));
  sel.addEventListener('change', () => onChange(key, key.endsWith('.d') ? Number(sel.value) : sel.value));
  return el('div', { class: 'field' }, el('label', { for: 's-' + key, text: label }), sel);
}
const head = (kicker, title, sub) => el('div', { class: 'insp-head' }, el('div', { class: 'kicker', text: kicker }), el('h2', { text: title }), sub ? el('p', { text: sub }) : null);
const note = msg => el('p', { class: 'note', text: msg });

function demandNote(s) {
  const D = demand(s);
  return note(t('الطلب اليومي {0} م³ لـ {1} شخص. الموصى به: خزان علوي {2} م³، أرضي {3} م³، وتدفق {4} م³/س.', [n1(D.daily), n0(D.people), n1(D.roofRec), n0(D.groundRec), n2(D.qReq)]));
}

export function readout(R) {
  const cell = (k, v, u) => el('div', {}, el('small', { text: k }), el('b', { class: 'num', text: v }), u ? el('i', { text: u }) : null);
  return el('div', { class: 'readout', id: 'readout' },
    cell(t('التدفق'), n2(R.q), t('م³/س')), cell(t('الضاغط'), n1(R.h), t('م')),
    cell(t('الكفاءة ≈'), n0(R.eta * 100) + '%'), cell(t('ملء الخزان العلوي'), R.flows ? n0(R.fillMin) : '—', t('دقيقة')));
}

const STEPS = [[t('المبنى'), s => !!s.building], [t('الخزان العلوي'), s => !!s.roof], [t('الخزان الأرضي'), s => !!s.ground], [t('المضخة والمواسير'), s => !!s.pump]];

export function renderInspector(root, s, ui, R, { onChange, onAction }) {
  root.replaceChildren();
  const sel = ui.selected, body = el('div', { class: 'insp-body' });

  if (sel === 'building' && s.building) {
    const B = s.building, T = BUILDINGS[B.type];
    const seg = el('div', { class: 'seg', role: 'group', 'aria-label': t('نوع المبنى') },
      ...Object.entries(BUILDINGS).map(([k, b]) => el('button', { 'aria-pressed': String(k === B.type), text: b.name, onclick: () => onAction('buildingType', k) })));
    body.append(el('div', { class: 'field' }, el('span', { class: 'lab', text: t('النوع') }), seg),
      rangeField(s, t('عدد الأدوار'), 'building.floors', t('دور'), onChange),
      rangeField(s, t('ارتفاع الدور'), 'building.floorH', t('م'), onChange),
      rangeField(s, T.people + t(' في الدور'), 'building.perFloor', t('شخص'), onChange),
      rangeField(s, t('المسافة بين الخزان الأرضي والمبنى'), 'site', t('م'), onChange),
      demandNote(s));
    root.append(head(t('المبنى'), T.name, T.desc), body);
  } else if (sel === 'ground' && s.ground) {
    body.append(rangeField(s, t('السعة'), 'ground.vol', t('م³'), onChange), rangeField(s, t('عمق سطح الماء تحت الأرض'), 'ground.depth', t('م'), onChange), demandNote(s));
    root.append(head(t('خزان'), t('الخزان الأرضي'), t('مصدر الماء للمضخة')), body);
  } else if (sel === 'roof' && s.roof) {
    body.append(rangeField(s, t('السعة'), 'roof.vol', t('م³'), onChange), demandNote(s));
    root.append(head(t('خزان'), t('الخزان العلوي'), t('على السطح، يغذّي الأدوار بالجاذبية')), body);
  } else if (sel === 'pump' && s.pump) {
    const p = byId(s.pump.id), src = SOURCES[p.src];
    body.append(
      el('button', { class: 'btn', style: 'width:100%;margin-bottom:16px', text: t('غيّر المضخة'), onclick: () => onAction('pickPump') }),
      rangeField(s, t('بُعد المضخة عن الخزان الأرضي'), 'pump.x', t('م'), onChange, s.site - 0.5),
      p.type === 'sub' ? note(t('المضخة الغاطسة في قاع الخزان الأرضي.')) : rangeField(s, t('ارتفاع محور المضخة فوق الأرض'), 'pump.z', t('م'), onChange),
      (() => { const c = el('input', { type: 'checkbox', checked: s.autoLength }); c.addEventListener('change', () => onAction('autoLength', c.checked));
        return el('label', { class: 'check' }, c, el('span', { text: t('اضبط أطوال المواسير وصمام الخنق تلقائياً') })); })(),
      el('p', { class: 'note' }, el('span', { text: t('المصدر: {0}. ', [src.title]) }), el('a', { href: 'catalog.html#' + p.id, text: t('عرض بيانات الكتالوج') })));
    root.append(head(PUMP_TYPES[p.type].name + ' · ' + p.kw + t(' ك.واط'), p.model, t('أقصى ضاغط {0} م · منافذ {1}', [n1(p.curve[0][1]), p.ports])), body);
  } else if ((sel === 'suction' || sel === 'discharge') && s[sel]) {
    const k = sel;
    body.append(rangeField(s, t('الطول'), k + '.L', t('م'), onChange),
      selectField(s, t('القطر الداخلي'), k + '.d', DIAMETERS.map(d => [d, d + t(' مم')]), onChange),
      selectField(s, t('المادة'), k + '.mat', Object.entries(MATERIALS).map(([m, o]) => [m, t('{0} — خشونة {1} مم، {2} بار', [o.name, o.e, o.pn])]), onChange),
      rangeField(s, t('عدد الأكواع 90°'), k + '.elbows', t('كوع'), onChange),
      k === 'discharge' ? rangeField(s, t('صمام الخنق (معامل K إضافي)'), 'discharge.valveK', 'K', onChange) : null,
      note(k === 'suction' ? t('يُحسب تلقائياً: صمام قدم بمصفاة (K=2.5) ومدخل (K=0.5). ذاتية التحضين بلا صمام قدم.') : t('يُحسب تلقائياً: صمام عدم رجوع (K=2.0) وبوابة (K=0.2) ومخرج (K=1.0).')));
    root.append(head(t('ماسورة'), k === 'suction' ? t('ماسورة السحب') : t('ماسورة الدفع'), k === 'suction' ? t('من الخزان الأرضي إلى المضخة') : t('من المضخة إلى مدخل الخزان العلوي')), body);
  } else if (sel === 'env') {
    body.append(rangeField(s, t('حرارة الماء'), 'env.waterTempC', t('°م'), onChange), rangeField(s, t('الارتفاع عن سطح البحر'), 'env.altitudeM', t('م'), onChange),
      rangeField(s, t('ساعات الضخ اليومية'), 'env.pumpingHours', t('س'), onChange), rangeField(s, t('تعرفة الكهرباء'), 'env.tariff', t('ريال'), onChange),
      note(t('الحرارة تغيّر الكثافة واللزوجة وضغط البخار، والارتفاع يغيّر الضغط الجوي؛ وكلاهما يؤثر على NPSH المتاح.')));
    root.append(head(t('ظروف التشغيل'), t('الموقع والماء'), t('تُطبَّق على الحساب كله')), body);
  } else {
    const list = el('ol', { class: 'sequence' });
    let marked = false;
    for (const [name, done] of STEPS) { const d = done(s); const li = el('li', { text: name }); if (d) li.className = 'done'; else if (!marked) { li.className = 'now'; marked = true; } list.append(li); }
    body.append(list);
    if (R) body.append(readout(R), note(t('اضغط أي عنصر في اللوحة لتعديله: المبنى، الخزانين، المضخة، أو أي ماسورة.')));
    else body.append(note(t('اضغط المربع المنقّط التالي في اللوحة لإضافته.')));
    root.append(head('pump.zeen', R ? t('التصميم مكتمل') : t('خطوات التصميم'), R ? t('شغّل لترى الماء، أو افتح المذكرة الحسابية.') : t('أربع خطوات، وكل خطوة قابلة للتعديل لاحقاً.')), body);
  }
}
