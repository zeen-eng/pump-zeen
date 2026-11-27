// المذكرة الحسابية: الحكم، المؤشرات، المنحنى، الفحوصات، التفاصيل
import { el } from '../core/dom.js';
import { n0, n1, n2 } from '../core/format.js';
import { openDialog, toast, ICON } from './common.js';
import { runChecks, verdict } from '../engine/checks.js';
import { curveChart } from './chart.js';
import { BUILDINGS } from '../data/buildings.js';
import { MATERIALS } from '../data/materials.js';
import { PUMP_TYPES, SOURCES } from '../data/pumps.js';

const LEVEL = { ok: 'سليم', warn: 'ملاحظة', bad: 'حرج', info: 'معلومة' };

function sec(no, title, sub, ...kids) {
  return el('section', { class: 'memo-sec' }, el('h3', {}, document.createTextNode(no + '. ' + title), sub ? el('span', { text: sub }) : null), ...kids);
}
function kpis(items) {
  return el('div', { class: 'kpi-grid' }, ...items.map(([k, v, u]) => el('div', {}, el('small', { text: k }), el('b', { class: 'num', text: v }), u ? el('i', { text: u }) : null)));
}

export function reportText(s, R) {
  const list = runChecks(R, s);
  return [`pump.zeen — مذكرة حسابية`, `المبنى: ${BUILDINGS[s.building.type].name}، ${s.building.floors} أدوار، الطلب ${n1(R.D.daily)} م³/يوم`,
    `المضخة: ${R.pump.model} (${PUMP_TYPES[R.pump.type].name}، ${R.pump.kw} ك.واط) — ${SOURCES[R.pump.src].title}`,
    `السحب: L=${s.suction.L} م، Ø${s.suction.d} مم، ${MATERIALS[s.suction.mat].name} | الدفع: L=${s.discharge.L} م، Ø${s.discharge.d} مم، ${MATERIALS[s.discharge.mat].name}`,
    `نقطة التشغيل: Q=${n2(R.q)} م³/س، H=${n1(R.h)} م، Hs=${n2(R.g.Hs)} م`, '',
    ...list.map(c => `[${LEVEL[c.level]}] ${c.title}: ${c.detail}`)].join('\n');
}

export function openAnalysis(s, R, { onFix, canPrint }) {
  const list = runChecks(R, s), v = verdict(list);
  const head = {
    bad: ['التصميم لن يعمل كما يجب', `مشكلات حرجة: ${v.bad}. ابدأ من أعلى الجدول؛ لكل مشكلة زر إصلاح.`],
    warn: ['يعمل، مع ملاحظات', `ملاحظات: ${v.warn}. تحسّن العمر والكفاءة.`],
    ok: ['تصميم سليم', 'كل الفحوصات ضمن الحدود الهندسية.'],
  }[v.level];

  const rows = list.map(c => {
    const td = el('td', {}, el('b', { text: c.title }), el('p', { text: c.detail }));
    if (c.fixes.length) td.append(el('div', { class: 'fixes no-print' }, ...c.fixes.map(f => el('button', { class: 'btn sm', text: f.label, onclick: () => onFix(f) }))));
    return el('tr', {}, el('td', {}, el('span', { class: 'tag ' + c.level, text: LEVEL[c.level] })), td);
  });

  const chart = el('div', { class: 'chart' }); chart.innerHTML = curveChart(R);
  const src = SOURCES[R.pump.src];

  const body = el('div', {},
    el('div', { class: 'verdict ' + v.level }, el('span', { class: 'lamp ' + v.level }), el('b', { text: head[0] }), el('p', { text: head[1] })),
    sec(1, 'نقطة التشغيل', R.pump.model, kpis([
      ['التدفق Q', n2(R.q), 'م³/س'], ['الضاغط الكلي H', n1(R.h), 'م'], ['الرفع الساكن Hs', n2(R.g.Hs), 'م'], ['الكفاءة ≈', n0(R.eta * 100) + '%', 'تقديري'],
      ['قدرة العمود ≈', n2(R.shaftKw), 'ك.واط'], ['هامش NPSH', R.sub ? '—' : n2(R.margin), R.sub ? 'غاطسة' : 'م'],
      ['ملء الخزان العلوي', R.flows ? n0(R.fillMin) : '—', 'دقيقة'], ['تشغيل يومي', Number.isFinite(R.runH) ? n1(R.runH) : '—', 'ساعة'],
      ['كهرباء سنوياً ≈', Number.isFinite(R.runH) ? n0(R.costYear) : '—', 'ريال'], ['أقصى ضغط', n1(R.pMaxBar), 'بار'],
    ])),
    sec(2, 'منحنى المضخة والنظام', 'تقاطعهما = نقطة التشغيل', chart),
    sec(3, 'الفحوصات', `${list.length} بنداً`, el('div', { class: 'scroll-x' }, el('table', { class: 'table checks' }, el('tbody', {}, ...rows)))),
    sec(4, 'تفاصيل الحساب', 'Darcy–Weisbach · Swamee–Jain · Joukowsky', kpis([
      ['فقد الدفع: احتكاك + موضعي', n2(R.L.d.hf) + ' + ' + n2(R.L.d.hm), 'م'],
      ...(R.L.s ? [['فقد السحب: احتكاك + موضعي', n2(R.L.s.hf) + ' + ' + n2(R.L.s.hm), 'م']] : []),
      ['رينولدز (الدفع)', n0(R.L.d.Re), 'f = ' + R.L.d.f.toFixed(4)], ['ΣK سحب / دفع', (R.sub ? '—' : n1(R.Ks)) + ' / ' + n1(R.Kd)],
      ['كثافة الماء', n1(R.w.rho), 'كغ/م³'], ['ضغط البخار', n2(R.w.pv / 1000), 'ك.باسكال'], ['الضغط الجوي', n1(R.pa / 1000), 'ك.باسكال'],
      ['ارتفاع الطرق المائي', n1(R.surge), 'م'], ['تدفق BEP التقديري', n2(R.C.qBep), 'م³/س'], ['قدرة محرك الخدمة ≥', n2(R.serviceKw), 'ك.واط'],
    ])),
    sec(5, 'المراجع', '', el('p', { class: 'small muted' },
      el('span', { text: 'منحنى المضخة: ' }), el('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer', text: src.title }),
      el('span', { text: ` (${src.hz} Hz، ${src.rpm} rpm). ${src.notes} الكفاءة وNPSHr تقديريتان لأن الكتالوج لا ينشرهما لهذه الموديلات؛ راجع منحنيات المورد قبل الشراء.` }))),
    el('div', { class: 'no-print', style: 'display:flex;gap:10px;flex-wrap:wrap;margin-top:22px' },
      (() => { const b = el('button', { class: 'btn' }); b.innerHTML = ICON.copy + '<span>نسخ الملخص</span>'; b.onclick = () => navigator.clipboard.writeText(reportText(s, R)).then(() => toast('نُسخ الملخص'), () => toast('تعذّر النسخ')); return b; })(),
      canPrint ? (() => { const b = el('button', { class: 'btn' }); b.innerHTML = ICON.print + '<span>طباعة / PDF</span>'; b.onclick = () => print(); return b; })() : null));

  openDialog({ title: 'المذكرة الحسابية', sub: `${R.pump.model} · ${PUMP_TYPES[R.pump.type].name} · ماء ${n0(s.env.waterTempC)}°م · ارتفاع ${n0(s.env.altitudeM)} م`, body, wide: true });
}
