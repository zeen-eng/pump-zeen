// منحنى المضخة من نقاط الكتالوج
// • الضاغط H(Q): استيفاء خطي بين النقاط المنشورة، بلا استقراء خارجها
// • قدرة العمود وNPSHr: تقديريتان لأن جداول هذه الموديلات لا تنشرهما
//   قدرة العمود: خطية من ~45٪ من P2 عند Q=0 إلى P2 عند آخر نقطة (سلوك مضخات الطرد المركزي القطرية)
//   الكفاءة = القدرة الهيدروليكية ÷ قدرة العمود
import { G } from './water.js';

const RHO = 998, SHUTOFF_POWER = 0.45;

export function curveOf(pump) {
  const pts = pump.curve.map(([lpm, h]) => [lpm * 0.06, h]); // لتر/دقيقة → م³/س
  const qMax = pts[pts.length - 1][0];
  const H = q => {
    if (q <= 0) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (q <= pts[i][0]) { const [q0, h0] = pts[i - 1], [q1, h1] = pts[i]; return h0 + (h1 - h0) * (q - q0) / (q1 - q0); }
    }
    return pts[pts.length - 1][1];
  };
  const P2 = pump.kw;
  const shaftKw = q => P2 * (SHUTOFF_POWER + (1 - SHUTOFF_POWER) * Math.min(q, qMax) / qMax);
  const eta = q => Math.max(0.05, Math.min(0.85, (RHO * G * (q / 3600) * H(q) / 1000) / shaftKw(q)));
  // BEP: من بيانات الموديل إن وُجدت (pump.qBep م³/س)، وإلا 65٪ من آخر تدفق في الجدول
  // (جداول الكتالوج تمتد عادة إلى نحو 120–130٪ من BEP)
  const qBep = pump.qBep || 0.65 * qMax, etaBep = eta(qBep);
  const npshr = q => pump.type === 'sub' ? 0 : (pump.type === 'selfprime' ? 1.2 : 1.8) + 2.2 * (q / qMax) ** 2;
  return { pts, qMax, H, qBep, etaBep, eta, shaftKw, npshr, H0: pts[0][1] };
}
