// منحنى المضخة ومنحنى النظام — SVG بمقاسه الحقيقي
import { n0, n1 } from '../core/format.js';

export function curveChart(R, width = 640, height = 320) {
  const l = 46, r = 14, t = 26, b = 40, C = R.C;
  const qM = C.qMax * 1.08, hM = Math.max(C.H0, R.Hsys(C.qMax)) * 1.1;
  const X = q => l + q / qM * (width - l - r), Y = h => height - b - h / hM * (height - t - b);
  const ticks = n => Array.from({ length: n + 1 }, (_, i) => i / n);
  let o = `<svg viewBox="0 0 ${width} ${height}" direction="ltr" role="img" aria-label="منحنى المضخة ومنحنى النظام"><defs><clipPath id="cc"><rect x="${l}" y="${t}" width="${width - l - r}" height="${height - t - b}"/></clipPath></defs>`;
  for (const k of ticks(5)) { const y = Y(hM * k); o += `<line x1="${l}" x2="${width - r}" y1="${y}" y2="${y}" stroke="var(--rule-soft)"/><text x="${l - 6}" y="${y + 4}" font-size="11" text-anchor="end" fill="var(--ink-3)">${n0(hM * k)}</text>`; }
  for (const k of ticks(6)) { const x = X(qM * k); o += `<line x1="${x}" x2="${x}" y1="${t}" y2="${height - b}" stroke="var(--rule-soft)"/><text x="${x}" y="${height - b + 16}" font-size="11" text-anchor="middle" fill="var(--ink-3)">${n1(qM * k)}</text>`; }
  o += `<line x1="${l}" x2="${width - r}" y1="${height - b}" y2="${height - b}" stroke="var(--ink)"/><line x1="${l}" x2="${l}" y1="${t}" y2="${height - b}" stroke="var(--ink)"/>`;
  o += `<text x="${(l + width - r) / 2}" y="${height - 6}" font-size="12" text-anchor="middle" fill="var(--ink-2)">Q (m³/h)</text><text x="${l}" y="14" font-size="12" fill="var(--ink-2)">H (m)</text>`;
  const pc = [], sc = [];
  for (let i = 0; i <= 60; i++) { const q = C.qMax * i / 60; pc.push([X(q), Y(C.H(q))]); }
  for (let i = 0; i <= 60; i++) { const q = qM * i / 60; sc.push([X(q), Y(R.Hsys(q))]); }
  const P = a => 'M' + a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
  o += `<g clip-path="url(#cc)"><path d="${P(sc)}" fill="none" stroke="var(--fault)" stroke-width="2"/><path d="${P(pc)}" fill="none" stroke="var(--water)" stroke-width="2.4"/></g>`;
  o += C.pts.map(([q, h]) => `<circle cx="${X(q)}" cy="${Y(h)}" r="2.6" fill="var(--sheet)" stroke="var(--water)" stroke-width="1.4"/>`).join('');
  o += `<line x1="${X(R.D.qReq)}" x2="${X(R.D.qReq)}" y1="${t}" y2="${height - b}" stroke="var(--ink-2)" stroke-dasharray="4 4"/>`;
  o += `<path d="M${X(C.qBep)} ${Y(C.H(C.qBep)) - 7}l6 7-6 7-6-7z" fill="var(--ok)"/>`;
  if (!R.noLift) o += `<circle cx="${X(R.q)}" cy="${Y(R.h)}" r="7" fill="var(--sheet)" stroke="var(--ink)" stroke-width="2.4"/>`;
  o += `</svg>`;
  return o + `<div class="legend"><span><i style="--c:var(--water)"></i>منحنى المضخة (نقاط الكتالوج)</span><span><i style="--c:var(--fault)"></i>منحنى النظام</span><span><i class="dash" style="--c:var(--ink-2)"></i>التدفق المطلوب</span><span>◆ BEP تقديري</span><span>● نقطة التشغيل</span></div>`;
}

// منحنى مصغر لجدول المضخات
export function sparkline(pump, w = 90, h = 32) {
  const pts = pump.curve, qM = pts[pts.length - 1][0], hM = pts[0][1];
  const d = 'M' + pts.map(([q, hh]) => `${(2 + q / qM * (w - 4)).toFixed(1)},${(h - 2 - hh / hM * (h - 6)).toFixed(1)}`).join('L');
  return `<svg viewBox="0 0 ${w} ${h}" direction="ltr" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--water)" stroke-width="1.6"/></svg>`;
}
