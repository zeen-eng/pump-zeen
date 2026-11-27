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
const note = t => el('p', { class: 'note', text: t });

function demandNote(s) {
  const D = demand(s);
  return note(`الطلب اليومي ${n1(D.daily)} م³ لـ ${n0(D.people)} شخص. الموصى به: خزان علوي ${n1(D.roofRec)} م³، أرضي ${n0(D.groundRec)} م³، وتدفق ${n2(D.qReq)} م³/س.`);
}

export function readout(R) {
  const cell = (k, v, u) => el('div', {}, el('small', { text: k }), el('b', { class: 'num', text: v }), u ? el('i', { text: u }) : null);
  return el('div', { class: 'readout', id: 'readout' },
    cell('التدفق', n2(R.q), 'م³/س'), cell('الضاغط', n1(R.h), 'م'),
    cell('الكفاءة ≈', n0(R.eta * 100) + '%'), cell('ملء الخزان العلوي', R.flows ? n0(R.fillMin) : '—', 'دقيقة'));
}

const STEPS = [['المبنى', s => !!s.building], ['الخزان العلوي', s => !!s.roof], ['الخزان الأرضي', s => !!s.ground], ['المضخة والمواسير', s => !!s.pump]];

export function renderInspector(root, s, ui, R, { onChange, onAction }) {
  root.replaceChildren();
  const sel = ui.selected, body = el('div', { class: 'insp-body' });

  if (sel === 'building' && s.building) {
    const B = s.building, T = BUILDINGS[B.type];
    const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'نوع المبنى' },
      ...Object.entries(BUILDINGS).map(([k, b]) => el('button', { 'aria-pressed': String(k === B.type), text: b.name, onclick: () => onAction('buildingType', k) })));
    body.append(el('div', { class: 'field' }, el('span', { class: 'lab', text: 'النوع' }), seg),
      rangeField(s, 'عدد الأدوار', 'building.floors', 'دور', onChange),
      rangeField(s, 'ارتفاع الدور', 'building.floorH', 'م', onChange),
      rangeField(s, T.people + ' في الدور', 'building.perFloor', 'شخص', onChange),
      rangeField(s, 'المسافة بين الخزان الأرضي والمبنى', 'site', 'م', onChange),
      demandNote(s));
    root.append(head('المبنى', T.name, T.desc), body);
  } else if (sel === 'ground' && s.ground) {
    body.append(rangeField(s, 'السعة', 'ground.vol', 'م³', onChange), rangeField(s, 'عمق سطح الماء تحت الأرض', 'ground.depth', 'م', onChange), demandNote(s));
    root.append(head('خزان', 'الخزان الأرضي', 'مصدر الماء للمضخة'), body);
  } else if (sel === 'roof' && s.roof) {
    body.append(rangeField(s, 'السعة', 'roof.vol', 'م³', onChange), demandNote(s));
    root.append(head('خزان', 'الخزان العلوي', 'على السطح، يغذّي الأدوار بالجاذبية'), body);
  } else if (sel === 'pump' && s.pump) {
    const p = byId(s.pump.id), src = SOURCES[p.src];
    body.append(
      el('button', { class: 'btn', style: 'width:100%;margin-bottom:16px', text: 'غيّر المضخة', onclick: () => onAction('pickPump') }),
      rangeField(s, 'بُعد المضخة عن الخزان الأرضي', 'pump.x', 'م', onChange, s.site - 0.5),
      p.type === 'sub' ? note('المضخة الغاطسة في قاع الخزان الأرضي.') : rangeField(s, 'ارتفاع محور المضخة فوق الأرض', 'pump.z', 'م', onChange),
      (() => { const c = el('input', { type: 'checkbox', checked: s.autoLength }); c.addEventListener('change', () => onAction('autoLength', c.checked));
        return el('label', { class: 'check' }, c, el('span', { text: 'اضبط أطوال المواسير وصمام الخنق تلقائياً' })); })(),
      el('p', { class: 'note' }, el('span', { text: `المصدر: ${src.title}. ` }), el('a', { href: 'catalog.html#' + p.id, text: 'عرض بيانات الكتالوج' })));
    root.append(head(PUMP_TYPES[p.type].name + ' · ' + p.kw + ' ك.واط', p.model, `أقصى ضاغط ${n1(p.curve[0][1])} م · منافذ ${p.ports}`), body);
  } else if ((sel === 'suction' || sel === 'discharge') && s[sel]) {
    const k = sel;
    body.append(rangeField(s, 'الطول', k + '.L', 'م', onChange),
      selectField(s, 'القطر الداخلي', k + '.d', DIAMETERS.map(d => [d, d + ' مم']), onChange),
      selectField(s, 'المادة', k + '.mat', Object.entries(MATERIALS).map(([m, o]) => [m, `${o.name} — خشونة ${o.e} مم، ${o.pn} بار`]), onChange),
      rangeField(s, 'عدد الأكواع 90°', k + '.elbows', 'كوع', onChange),
      k === 'discharge' ? rangeField(s, 'صمام الخنق (معامل K إضافي)', 'discharge.valveK', 'K', onChange) : null,
      note(k === 'suction' ? 'يُحسب تلقائياً: صمام قدم بمصفاة (K=2.5) ومدخل (K=0.5). ذاتية التحضين بلا صمام قدم.' : 'يُحسب تلقائياً: صمام عدم رجوع (K=2.0) وبوابة (K=0.2) ومخرج (K=1.0).'));
    root.append(head('ماسورة', k === 'suction' ? 'ماسورة السحب' : 'ماسورة الدفع', k === 'suction' ? 'من الخزان الأرضي إلى المضخة' : 'من المضخة إلى مدخل الخزان العلوي'), body);
  } else if (sel === 'env') {
    body.append(rangeField(s, 'حرارة الماء', 'env.waterTempC', '°م', onChange), rangeField(s, 'الارتفاع عن سطح البحر', 'env.altitudeM', 'م', onChange),
      rangeField(s, 'ساعات الضخ اليومية', 'env.pumpingHours', 'س', onChange), rangeField(s, 'تعرفة الكهرباء', 'env.tariff', 'ريال', onChange),
      note('الحرارة تغيّر الكثافة واللزوجة وضغط البخار، والارتفاع يغيّر الضغط الجوي؛ وكلاهما يؤثر على NPSH المتاح.'));
    root.append(head('ظروف التشغيل', 'الموقع والماء', 'تُطبَّق على الحساب كله'), body);
  } else {
    const list = el('ol', { class: 'sequence' });
    let marked = false;
    for (const [name, done] of STEPS) { const d = done(s); const li = el('li', { text: name }); if (d) li.className = 'done'; else if (!marked) { li.className = 'now'; marked = true; } list.append(li); }
    body.append(list);
    if (R) body.append(readout(R), note('اضغط أي عنصر في اللوحة لتعديله: المبنى، الخزانين، المضخة، أو أي ماسورة.'));
    else body.append(note('اضغط المربع المنقّط التالي في اللوحة لإضافته.'));
    root.append(head('pump.zeen', R ? 'التصميم مكتمل' : 'خطوات التصميم', R ? 'شغّل لترى الماء، أو افتح المذكرة الحسابية.' : 'أربع خطوات، وكل خطوة قابلة للتعديل لاحقاً.'), body);
  }
}
