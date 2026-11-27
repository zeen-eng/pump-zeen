// اختيار المضخة والأقطار الموصى بها
import { solve } from './solve.js';
import { demand, geometry } from './demand.js';
import { sizeDiameter } from './hydraulics.js';
import { DIAMETERS, VELOCITY } from '../data/materials.js';
import { ofType, byId } from '../data/pumps.js';
import { curveOf } from './pumpcurve.js';

const clone = o => JSON.parse(JSON.stringify(o));
const MAX_THROTTLE_K = 150;

// أطوال المواسير المطلوبة للهندسة الحالية (مقرّبة لأعلى نصف متر)
export function requiredLengths(s, type) {
  const g = geometry(s, type), up = v => Math.ceil(v * 2) / 2;
  return { suction: up(g.suctionReq + 0.3), discharge: up(g.dischargeReq + 0.5) };
}

// معامل صمام الخنق اللازم ليعمل التصميم داخل المنحنى المنشور وقرب BEP
export function throttleK(s) {
  if (!s.pump) return 0;
  const c = clone(s); c.discharge.valveK = 0;
  const R = solve(c), C = R.C;
  if (R.noLift || R.air) return 0;
  if (!R.runout && R.r <= 1.25) return 0;
  const target = Math.min(C.qMax * 0.95, Math.max(R.D.qReq, C.qBep * 1.15));
  const excess = C.H(target) - R.Hsys(target);
  if (excess <= 0) return 0;
  const A = Math.PI * (c.discharge.d / 1000) ** 2 / 4, V = target / 3600 / A;
  const K = Math.ceil(excess * 2 * 9.81 / (V * V) * 2) / 2;
  return K > MAX_THROTTLE_K ? 0 : K;   // خنق أكبر من هذا إهدار للطاقة: الأفضل مضخة أصغر
}

// يجعل التشغيل داخل المنحنى المنشور: صمام خنق، وإن لزم خنق مفرط يُصغَّر قطر الدفع درجة أو أكثر (سرعة ≤ 2.5 م/ث)
export function fitToCurve(s) {
  if (!s.pump || !s.discharge) return;
  s.discharge.valveK = 0;
  const start = DIAMETERS.indexOf(s.discharge.d);
  for (let i = start; i >= 0; i--) {
    s.discharge.d = DIAMETERS[i];
    const R = solve(s);
    if (R.L.d.V > VELOCITY.discharge.max) { s.discharge.d = DIAMETERS[Math.min(start, i + 1)]; break; }
    if (!R.runout && R.r <= 1.25) return;
    const K = throttleK(s);
    if (K > 0) { s.discharge.valveK = K; return; }
  }
  s.discharge.valveK = throttleK(s);
}

export function defaultPipes(s, pumpId) {
  const D = demand(s), C = curveOf(byId(pumpId));
  const qd = Math.max(D.qReq, C.qBep);
  return {
    suction:   { L: 0, d: sizeDiameter(qd, VELOCITY.suction.design, DIAMETERS), mat: 'pvc', elbows: 2 },
    discharge: { L: 0, d: sizeDiameter(qd, VELOCITY.discharge.design, DIAMETERS), mat: 'pvc', elbows: 4 },
  };
}

// تصميم تجريبي بمضخة مختلفة دون المساس بالحالة الأصلية
export function trial(s, pumpId) {
  const c = clone(s), prev = c.pump, p = byId(pumpId);
  c.pump = { id: pumpId, x: prev ? prev.x : Math.round(c.site * 0.35 * 2) / 2, z: prev ? prev.z : 0.3 };
  if (!c.suction) Object.assign(c, defaultPipes(c, pumpId));
  if (!prev || byId(prev.id).type !== p.type || c.autoLength) {
    const L = requiredLengths(c, p.type); c.suction.L = L.suction; c.discharge.L = L.discharge;
  }
  if (c.autoLength || !prev) fitToCurve(c);
  return solve(c);
}

// الأولوية: يعمل بأمان ← يحقق الطلب ← قرب BEP ← أقل خنق ← أصغر محرك
export function score(R) {
  if (R.noLift || R.air) return -1e9;
  let sc = 0;
  if (R.tempC > R.pump.tMax) sc -= 2000;
  if (R.runout) sc -= 500;
  if (!R.sub && (R.margin < 0.5 || R.g.lift > (R.pump.maxLift || 99))) sc -= 800;
  if (R.q < R.D.qReq) sc -= 1000 * (1 - R.q / R.D.qReq);
  sc -= 300 * (R.r < 0.7 ? 0.7 - R.r : R.r > 1.2 ? R.r - 1.2 : 0);
  if (R.pMaxBar > R.pnBar) sc -= 100;
  sc -= 0.5 * (R.s?.discharge?.valveK || 0);
  sc -= 20 * R.pump.kw;
  return sc;
}

export function recommendPump(s, type) {
  let best = null, bs = -Infinity;
  for (const p of ofType(type)) {
    const sc = score(trial(s, p.id));
    if (sc > bs) { bs = sc; best = p.id; }
  }
  return best;
}

export function recommendDiameters(q) {
  return {
    suction: sizeDiameter(q, VELOCITY.suction.design, DIAMETERS),
    discharge: sizeDiameter(q, VELOCITY.discharge.design, DIAMETERS),
  };
}
