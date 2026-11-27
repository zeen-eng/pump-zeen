// تنسيق الأرقام — أرقام لاتينية كما في المخططات الهندسية
const f = d => new Intl.NumberFormat('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const F0 = f(0), F1 = f(1), F2 = f(2);
const safe = (fmt, v) => Number.isFinite(v) ? fmt.format(v) : '—';
export const n0 = v => safe(F0, v);
export const n1 = v => safe(F1, v);
export const n2 = v => safe(F2, v);
export const pct = v => safe(F0, v * 100) + '%';
export const date = t => new Date(t).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });
