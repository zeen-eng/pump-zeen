// الحل الكامل للتصميم: نقطة التشغيل وكل المؤشرات
import { G, water, atmPressure } from './water.js';
import { pipeLoss, suctionK, dischargeK } from './hydraulics.js';
import { curveOf } from './pumpcurve.js';
import { demand, geometry } from './demand.js';
import { MATERIALS, pvcDerate } from '../data/materials.js';
import { byId } from '../data/pumps.js';

// معامل خدمة المحرك وكفاءته الكهربائية التقريبية
const SERVICE_FACTOR = 1.15, MOTOR_EFF = 0.8;

export function solve(s, pumpId) {
  const pump = byId(pumpId || s.pump.id);
  const C = curveOf(pump);
  const w = water(s.env.waterTempC), pa = atmPressure(s.env.altitudeM);
  const g = geometry(s, pump.type), sub = g.sub;
  const Ks = suctionK(s.suction, pump.type === 'selfprime'), Kd = dischargeK(s.discharge);

  const losses = q => {
    const Q = Math.max(q, 1e-7) / 3600;
    const d = pipeLoss(Q, s.discharge, Kd, w);
    const su = sub ? null : pipeLoss(Q, s.suction, Ks, w);
    return { d, s: su, h: d.h + (su ? su.h : 0) };
  };
  const Hsys = q => g.Hs + losses(q).h;

  // نقطة التشغيل بالتنصيف على مجال المنحنى المنشور
  const noLift = C.H(0) <= g.Hs;
  let q = 0, runout = false;
  if (!noLift) {
    if (C.H(C.qMax) > Hsys(C.qMax)) { q = C.qMax; runout = true; }
    else {
      let a = 0, b = C.qMax;
      for (let i = 0; i < 60; i++) { const m = (a + b) / 2; (C.H(m) > Hsys(m)) ? a = m : b = m; }
      q = (a + b) / 2;
    }
  }
  const h = C.H(q), L = losses(q), eta = C.eta(q), r = q / C.qBep;
  const shaftKw = q > 0 ? C.shaftKw(q) : 0;

  // NPSH
  const hAtm = (pa - w.pv) / (w.rho * G);
  const npsha = sub ? hAtm + 0.6 : hAtm - g.lift - (L.s ? L.s.h : 0);
  const npshr = C.npshr(q);

  // المواسير القصيرة
  const suctionShort = !sub && s.suction.L < g.suctionReq - 0.05;
  const dischargeShort = s.discharge.L < g.dischargeReq - 0.05;

  // الطرق المائي (جوكوفسكي) وضغط الماسورة
  const mat = MATERIALS[s.discharge.mat];
  const derate = s.discharge.mat === 'pvc' ? pvcDerate(s.env.waterTempC) : 1;
  const surge = mat.a * L.d.V / G;
  const pMaxBar = w.rho * G * Math.max(C.H0, h + (q > 0 ? surge : 0)) / 1e5;
  const pnBar = mat.pn * derate;

  // الطاقة
  const D = demand(s);
  const runH = q > 0 ? D.daily / q : Infinity;
  const kwhDay = shaftKw / MOTOR_EFF * Math.min(runH, 24);
  const costYear = kwhDay * 365 * s.env.tariff;

  return {
    pump, C, w, pa, g, sub, q, h, L, eta, r, shaftKw, runout, noLift,
    hAtm, npsha, npshr, margin: npsha - npshr,
    maxLift: hAtm - (L.s ? L.s.h : 0) - npshr - 0.5,
    suctionShort, dischargeShort,
    air: suctionShort,
    leak: dischargeShort && q > 0 && !suctionShort,
    cavitation: !sub && q > 0 && !suctionShort && npsha < npshr,
    flows: q > 0 && !suctionShort && !dischargeShort,
    surge, pMaxBar, pnBar, derate,
    D, runH, kwhDay, costYear,
    serviceKw: shaftKw * SERVICE_FACTOR,
    fillMin: s.roof ? s.roof.vol / Math.max(q, 1e-6) * 60 : 0,
    Hsys, Ks, Kd, tempC: s.env.waterTempC, s,
  };
}
