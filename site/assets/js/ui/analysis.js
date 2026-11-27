// المذكرة الحسابية: الحكم، المؤشرات، المنحنى، الفحوصات، التفاصيل
import { el } from '../core/dom.js';
import { n0, n1, n2 } from '../core/format.js';
import { openDialog, toast, ICON } from './common.js';
import { runChecks, verdict } from '../engine/checks.js';
import { curveChart } from './chart.js';
import { BUILDINGS } from '../data/buildings.js';
import { MATERIALS } from '../data/materials.js';
import { PUMP_TYPES, SOURCES } from '../data/pumps.js';
import { t } from '../i18n/index.js';

const LEVEL = { ok: t('سليم'), warn: t('ملاحظة'), bad: t('حرج'), info: t('معلومة') };

function sec(no, title, sub, ...kids) {
  return el('section', { class: 'memo-sec' }, el('h3', {}, document.createTextNode(no + '. ' + title), sub ? el('span', { text: sub }) : null), ...kids);
}
function kpis(items) {
  return el('div', { class: 'kpi-grid' }, ...items.map(([k, v, u]) => el('div', {}, el('small', { text: k }), el('b', { class: 'num', text: v }), u ? el('i', { text: u }) : null)));
}

export function reportText(s, R) {
  const list = runChecks(R, s);
  return [t('pump.zeen — مذكرة حسابية'), t('المبنى: {0}، {1} أدوار، الطلب {2} م³/يوم', [BUILDINGS[s.building.type].name, s.building.floors, n1(R.D.daily)]),
    t('المضخة: {0} ({1}، {2} ك.واط) — {3}', [R.pump.model, PUMP_TYPES[R.pump.type].name, R.pump.kw, SOURCES[R.pump.src].title]),
    t('السحب: L={0} م، Ø{1} مم، {2} | الدفع: L={3} م، Ø{4} مم، {5}', [s.suction.L, s.suction.d, MATERIALS[s.suction.mat].name, s.discharge.L, s.discharge.d, MATERIALS[s.discharge.mat].name]),
    t('نقطة التشغيل: Q={0} م³/س، H={1} م، Hs={2} م', [n2(R.q), n1(R.h), n2(R.g.Hs)]), '',
    ...list.map(c => `[${LEVEL[c.level]}] ${c.title}: ${c.detail}`)].join('\n');
}

export function openAnalysis(s, R, { onFix, canPrint }) {
  const list = runChecks(R, s), v = verdict(list);
  const head = {
    bad: [t('التصميم لن يعمل كما يجب'), t('مشكلات حرجة: {0}. ابدأ من أعلى الجدول؛ لكل مشكلة زر إصلاح.', [v.bad])],
    warn: [t('يعمل، مع ملاحظات'), t('ملاحظات: {0}. تحسّن العمر والكفاءة.', [v.warn])],
    ok: [t('تصميم سليم'), t('كل الفحوصات ضمن الحدود الهندسية.')],
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
    sec(1, t('نقطة التشغيل'), R.pump.model, kpis([
      [t('التدفق Q'), n2(R.q), t('م³/س')], [t('الضاغط الكلي H'), n1(R.h), t('م')], [t('الرفع الساكن Hs'), n2(R.g.Hs), t('م')], [t('الكفاءة ≈'), n0(R.eta * 100) + '%', t('تقديري')],
      [t('قدرة العمود ≈'), n2(R.shaftKw), t('ك.واط')], [t('هامش NPSH'), R.sub ? '—' : n2(R.margin), R.sub ? t('غاطسة') : t('م')],
      [t('ملء الخزان العلوي'), R.flows ? n0(R.fillMin) : '—', t('دقيقة')], [t('تشغيل يومي'), Number.isFinite(R.runH) ? n1(R.runH) : '—', t('ساعة')],
      [t('كهرباء سنوياً ≈'), Number.isFinite(R.runH) ? n0(R.costYear) : '—', t('ريال')], [t('أقصى ضغط'), n1(R.pMaxBar), t('بار')],
    ])),
    sec(2, t('منحنى المضخة والنظام'), t('تقاطعهما = نقطة التشغيل'), chart),
    sec(3, t('الفحوصات'), t('{0} بنداً', [list.length]), el('div', { class: 'scroll-x' }, el('table', { class: 'table checks' }, el('tbody', {}, ...rows)))),
    sec(4, t('تفاصيل الحساب'), 'Darcy–Weisbach · Swamee–Jain · Joukowsky', kpis([
      [t('فقد الدفع: احتكاك + موضعي'), n2(R.L.d.hf) + ' + ' + n2(R.L.d.hm), t('م')],
      ...(R.L.s ? [[t('فقد السحب: احتكاك + موضعي'), n2(R.L.s.hf) + ' + ' + n2(R.L.s.hm), t('م')]] : []),
      [t('رينولدز (الدفع)'), n0(R.L.d.Re), 'f = ' + R.L.d.f.toFixed(4)], [t('ΣK سحب / دفع'), (R.sub ? '—' : n1(R.Ks)) + ' / ' + n1(R.Kd)],
      [t('كثافة الماء'), n1(R.w.rho), t('كغ/م³')], [t('ضغط البخار'), n2(R.w.pv / 1000), t('ك.باسكال')], [t('الضغط الجوي'), n1(R.pa / 1000), t('ك.باسكال')],
      [t('ارتفاع الطرق المائي'), n1(R.surge), t('م')], [t('تدفق BEP التقديري'), n2(R.C.qBep), t('م³/س')], [t('قدرة محرك الخدمة ≥'), n2(R.serviceKw), t('ك.واط')],
    ])),
    sec(5, t('المراجع'), '', el('p', { class: 'small muted' },
      el('span', { text: t('منحنى المضخة: ') }), el('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer', text: src.title }),
      el('span', { text: t(' ({0} Hz، {1} rpm). {2} الكفاءة وNPSHr تقديريتان لأن الكتالوج لا ينشرهما لهذه الموديلات؛ راجع منحنيات المورد قبل الشراء.', [src.hz, src.rpm, src.notes]) }))),
    el('div', { class: 'no-print', style: 'display:flex;gap:10px;flex-wrap:wrap;margin-top:22px' },
      (() => { const b = el('button', { class: 'btn' }); b.innerHTML = ICON.copy + t('<span>نسخ الملخص</span>'); b.onclick = () => navigator.clipboard.writeText(reportText(s, R)).then(() => toast(t('نُسخ الملخص')), () => toast(t('تعذّر النسخ'))); return b; })(),
      canPrint ? (() => { const b = el('button', { class: 'btn' }); b.innerHTML = ICON.print + t('<span>طباعة / PDF</span>'); b.onclick = () => print(); return b; })() : null));

  openDialog({ title: t('المذكرة الحسابية'), sub: t('{0} · {1} · ماء {2}°م · ارتفاع {3} م', [R.pump.model, PUMP_TYPES[R.pump.type].name, n0(s.env.waterTempC), n0(s.env.altitudeM)]), body, wide: true });
}
