// فقد الاحتكاك والفقد الموضعي في المواسير
import { G } from './water.js';
import { MATERIALS, FITTINGS } from '../data/materials.js';

// معامل الاحتكاك: صفائحي 64/Re، مضطرب Swamee–Jain
export function frictionFactor(Re, relRough) {
  if (Re < 1) return 0;
  if (Re < 2300) return 64 / Re;
  return 0.25 / Math.log10(relRough / 3.7 + 5.74 / Re ** 0.9) ** 2;
}

// مجموع K لماسورة السحب والدفع
export function suctionK(pipe, selfPriming) {
  return (selfPriming ? 0 : FITTINGS.footValve) + FITTINGS.entrance + pipe.elbows * FITTINGS.elbow90;
}
export function dischargeK(pipe) {
  return FITTINGS.checkValve + FITTINGS.gateValve + FITTINGS.exit + pipe.elbows * FITTINGS.elbow90 + (pipe.valveK || 0);
}

// Q بـ م³/ث → الفقد Darcy–Weisbach
export function pipeLoss(Q, pipe, K, w) {
  const D = pipe.d / 1000, A = Math.PI * D * D / 4, V = Q / A;
  const Re = w.rho * V * D / w.mu;
  const f = frictionFactor(Re, MATERIALS[pipe.mat].e / 1000 / D);
  const hv = V * V / (2 * G);
  const hf = f * pipe.L / D * hv, hm = K * hv;
  return { V, Re, f, hf, hm, h: hf + hm };
}

// أصغر قطر يحقق سرعة لا تتجاوز vmax عند تدفق q (م³/س)
export function sizeDiameter(qM3h, vmax, list) {
  const Q = qM3h / 3600;
  return list.find(d => Q / (Math.PI * (d / 1000) ** 2 / 4) <= vmax) || list[list.length - 1];
}
