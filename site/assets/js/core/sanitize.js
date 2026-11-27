// ═══════════════════════════════════════════════════════════════
// التحقق من أي تصميم قادم من التخزين أو الخادم قبل استخدامه
// لا يُقبل إلا الحقول المعروفة، وكل رقم يُحصر في حدوده
// ═══════════════════════════════════════════════════════════════
import { fresh } from './store.js';
import { BUILDINGS } from '../data/buildings.js';
import { MATERIALS, DIAMETERS } from '../data/materials.js';
import { PUMPS } from '../data/pumps.js';

export const LIMITS = {
  'building.floors': [1, 20, 1], 'building.floorH': [2.6, 6, 0.1], 'building.perFloor': [1, 400, 1],
  'ground.vol': [1, 400, 1], 'ground.depth': [0.5, 4, 0.1], 'roof.vol': [0.5, 60, 0.5],
  'site': [3, 40, 0.5], 'pump.x': [0.5, 39.5, 0.5], 'pump.z': [0, 3, 0.1],
  'suction.L': [0.5, 80, 0.5], 'discharge.L': [1, 300, 0.5], 'suction.elbows': [0, 10, 1], 'discharge.elbows': [0, 20, 1], 'discharge.valveK': [0, 400, 0.5],
  'env.waterTempC': [1, 90, 1], 'env.altitudeM': [0, 3000, 50], 'env.pumpingHours': [1, 24, 1], 'env.tariff': [0, 2, 0.01],
};

export const num = (v, [a, b], d) => { v = Number(v); return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d; };
const pick = (v, list, d) => (list.includes(v) ? v : d);
const text = (v, max) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

export function cleanDesign(o) {
  const s = fresh();
  if (!o || typeof o !== 'object') return s;
  s.name = text(o.name, 60);
  s.site = num(o.site, LIMITS.site, 10);
  s.autoLength = o.autoLength !== false;
  if (o.env) s.env = {
    waterTempC: num(o.env.waterTempC, LIMITS['env.waterTempC'], s.env.waterTempC),
    altitudeM: num(o.env.altitudeM, LIMITS['env.altitudeM'], s.env.altitudeM),
    pumpingHours: num(o.env.pumpingHours, LIMITS['env.pumpingHours'], s.env.pumpingHours),
    tariff: num(o.env.tariff, LIMITS['env.tariff'], s.env.tariff),
  };
  const b = o.building;
  if (b) {
    const type = pick(b.type, Object.keys(BUILDINGS), 'house'), T = BUILDINGS[type];
    s.building = { type, floors: Math.round(num(b.floors, LIMITS['building.floors'], T.floors)),
      floorH: num(b.floorH, LIMITS['building.floorH'], T.floorH), perFloor: Math.round(num(b.perFloor, LIMITS['building.perFloor'], T.perFloor)) };
  }
  if (s.building && o.roof) s.roof = { vol: num(o.roof.vol, LIMITS['roof.vol'], 2) };
  if (s.building && o.ground) s.ground = { vol: num(o.ground.vol, LIMITS['ground.vol'], 4), depth: num(o.ground.depth, LIMITS['ground.depth'], 1.5) };
  if (s.roof && s.ground && o.pump && o.suction && o.discharge) {
    s.pump = { id: pick(o.pump.id, PUMPS.map(p => p.id), PUMPS[0].id),
      x: num(o.pump.x, [0.5, s.site - 0.5], 3), z: num(o.pump.z, LIMITS['pump.z'], 0.3) };
    const pipe = (p, k) => ({ L: num(p.L, LIMITS[k + '.L'], 5), d: pick(Number(p.d), DIAMETERS, 32),
      mat: pick(p.mat, Object.keys(MATERIALS), 'pvc'), elbows: Math.round(num(p.elbows, LIMITS[k + '.elbows'], 2)) });
    s.suction = pipe(o.suction, 'suction'); s.discharge = pipe(o.discharge, 'discharge');
    s.discharge.valveK = num(o.discharge.valveK, LIMITS['discharge.valveK'], 0);
  }
  return s;
}
