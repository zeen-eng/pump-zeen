// ═══════════════════════════════════════════════════════════════
// حالة التصميم — مصدر واحد للحقيقة
// كل تعديل يمر عبر update() فيُعاد رسم الواجهات المشتركة تلقائياً
// ═══════════════════════════════════════════════════════════════
import { CONFIG } from '../config.js';

export const fresh = () => ({
  name: '',
  building: null,       // { type, floors, floorH, perFloor }
  roof: null,           // { vol }
  ground: null,         // { vol, depth }
  pump: null,           // { id, x, z }
  suction: null,        // { L, d, mat, elbows }
  discharge: null,
  site: 10,             // المسافة بين الخزان الأرضي والمبنى (م)
  autoLength: true,
  env: {
    waterTempC: CONFIG.defaults.waterTempC,
    altitudeM: CONFIG.defaults.altitudeM,
    pumpingHours: CONFIG.defaults.pumpingHours,
    tariff: CONFIG.defaults.tariffSarPerKwh,
  },
});

let state = fresh();
const ui = { selected: null, running: false, primed: false, fill: 0.15, ground: 1 };
const subs = new Set();

export const getState = () => state;
export const getUI = () => ui;
export const subscribe = fn => (subs.add(fn), () => subs.delete(fn));
const emit = why => subs.forEach(fn => fn(state, ui, why));

export function update(mutator, why = 'state') { mutator(state); emit(why); }
export function setUI(patch, why = 'ui') { Object.assign(ui, patch); emit(why); }
export function replace(next, why = 'load') { state = next; Object.assign(ui, { selected: null, running: false, primed: false, fill: 0.15, ground: 1 }); emit(why); }
export const isComplete = s => !!(s.building && s.roof && s.ground && s.pump && s.suction);
