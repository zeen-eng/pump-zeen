// الطلب اليومي وسعات الخزانات والهندسة الرأسية للموقع
import { BUILDINGS, TANK_RULES } from '../data/buildings.js';

export function demand(s) {
  const B = s.building, T = BUILDINGS[B.type];
  const people = B.floors * B.perFloor;
  const daily = people * T.rate / 1000;                     // م³/يوم
  const qReq = Math.max(1, daily / s.env.pumpingHours);     // م³/س
  const half = v => Math.ceil(v * 2) / 2;
  return {
    people, daily, qReq,
    roofRec: Math.max(TANK_RULES.roofMin, half(daily * TANK_RULES.roofShare)),
    groundRec: Math.max(TANK_RULES.groundMin, Math.ceil(daily * TANK_RULES.groundShare)),
  };
}

// المناسيب بالنسبة لسطح الأرض ±0.00
export function geometry(s, type) {
  const B = s.building, sub = type === 'sub';
  const roofTop = B.floors * B.floorH;                     // منسوب السطح
  const inlet = roofTop + TANK_RULES.roofInletAboveRoof;   // منسوب مدخل الخزان العلوي
  const d = s.ground.depth;                                // عمق سطح الماء تحت الأرض
  const pumpZ = sub ? -(d + 0.6) : s.pump.z;               // منسوب محور المضخة
  const lift = sub ? -0.6 : pumpZ + d;                     // المضخة فوق سطح الماء (+) أو تحته (−)
  const suctionReq = sub ? 0 : s.pump.x + 1 + pumpZ + d + 0.4;
  const dischargeReq = sub
    ? (d + 0.6) + (s.site + 1) + inlet + 0.8
    : (s.site - s.pump.x) + (inlet - pumpZ) + 1.5;
  return { roofTop, inlet, d, pumpZ, lift, suctionReq, dischargeReq, Hs: inlet + d, sub };
}
