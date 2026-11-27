// اختبار المحرك الهندسي بدون متصفح: node tests/engine.mjs
import { fresh } from '../site/assets/js/core/store.js';
import { BUILDINGS } from '../site/assets/js/data/buildings.js';
import { demand } from '../site/assets/js/engine/demand.js';
import { recommendPump, trial, defaultPipes, requiredLengths, fitToCurve } from '../site/assets/js/engine/recommend.js';
import { solve } from '../site/assets/js/engine/solve.js';
import { runChecks, verdict } from '../site/assets/js/engine/checks.js';
import { byId, PUMPS } from '../site/assets/js/data/pumps.js';
import { curveOf } from '../site/assets/js/engine/pumpcurve.js';
let fail = 0;
const expect = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
// المنحنى يمر بنقاط الكتالوج تماماً
for (const p of PUMPS) { const C = curveOf(p); for (const [l, h] of p.curve) expect(Math.abs(C.H(l * 0.06) - h) < 1e-9, p.id + ' curve'); }
for (const t of Object.keys(BUILDINGS)) for (const floors of [1, 2, 4, 6]) for (const type of ['surface', 'selfprime', 'sub']) {
  const s = fresh(); const T = BUILDINGS[t];
  s.building = { type: t, floors, floorH: T.floorH, perFloor: T.perFloor };
  s.roof = { vol: demand(s).roofRec }; s.ground = { vol: demand(s).groundRec, depth: 1.5 };
  const id = recommendPump(s, type);
  s.pump = { id, x: 3.5, z: 0.3 }; Object.assign(s, defaultPipes(s, id));
  const L = requiredLengths(s, type); s.suction.L = L.suction; s.discharge.L = L.discharge; fitToCurve(s);
  const R = solve(s), C = runChecks(R, s), v = verdict(C);
  if (v.bad) for (const c of C.filter(c => c.level === 'bad')) console.log('     ', c.detail.slice(0, 150));
  console.log(`${t.padEnd(8)} ${floors}F ${type.padEnd(9)} ${byId(id).model.padEnd(14)} Q=${R.q.toFixed(2)} H=${R.h.toFixed(1)} Hs=${R.g.Hs.toFixed(1)} K=${s.discharge.valveK} Ø${s.discharge.d} r=${R.r.toFixed(2)} ${v.level}${v.bad ? ' :: ' + C.filter(c => c.level === 'bad').map(c => c.title).join(' | ') : ''}`);
}
// سيناريوهات الأعطال
const base = () => { const s = fresh(); s.building = { type: 'house', floors: 2, floorH: 3.2, perFloor: 5 }; s.roof = { vol: 1 }; s.ground = { vol: 2, depth: 1.5 }; s.pump = { id: 'cpm600', x: 3.5, z: 0.3 }; Object.assign(s, defaultPipes(s, 'cpm600')); const L = requiredLengths(s, 'surface'); s.suction.L = L.suction; s.discharge.L = L.discharge; return s; };
let s = base(); s.discharge.L = 4; expect(solve(s).leak, 'leak detected');
s = base(); s.suction.L = 1; expect(solve(s).air, 'air detected');
s = base(); s.env.waterTempC = 85; s.ground.depth = 4; s.pump.z = 3; s.suction.d = 20; expect(solve(s).cavitation || solve(s).margin < 0.5, 'cavitation detected');
s = base(); s.building.floors = 12; expect(solve(s).noLift, 'no lift detected');
console.log(fail ? `\n${fail} failures` : '\nALL ENGINE TESTS PASSED'); process.exit(fail ? 1 : 0);
