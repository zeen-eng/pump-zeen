// ═══════════════════════════════════════════════════════════════
// صفحة المصمم — تربط الحالة بالمشهد والمفتش والنوافذ
// ═══════════════════════════════════════════════════════════════
import { $, el, reduceMotion } from '../core/dom.js';
import { n1, n2, n0, date } from '../core/format.js';
import { getState, getUI, subscribe, update, setUI, replace, fresh, isComplete } from '../core/store.js';
import { LIMITS } from '../core/sanitize.js';
import { auth, watchIdle, requireUser } from '../auth/index.js';
import { solve } from '../engine/solve.js';
import { demand } from '../engine/demand.js';
import { runChecks, verdict } from '../engine/checks.js';
import { requiredLengths, defaultPipes, fitToCurve } from '../engine/recommend.js';
import { BUILDINGS } from '../data/buildings.js';
import { byId } from '../data/pumps.js';
import { renderScene } from '../ui/scene.js';
import { renderInspector, readout } from '../ui/inspector.js';
import { buildingPicker, pumpPicker } from '../ui/pickers.js';
import { openAnalysis } from '../ui/analysis.js';
import { openSaved } from '../ui/saved.js';
import { toast, confirmButton, closeDialog, ICON, LOGO } from '../ui/common.js';

let currentId = null, R = null;
const GEOMETRY_KEYS = /^(building\.|site|ground\.depth|pump\.)/;

// ── أيقونات الأزرار والشعار ──
document.querySelectorAll('[data-logo]').forEach(n => n.innerHTML = LOGO);
document.querySelectorAll('[data-icon]').forEach(n => n.insertAdjacentHTML('afterbegin', ICON[n.dataset.icon] || ''));

// ── الحساب ──
const compute = s => (isComplete(s) ? solve(s) : null);

function autoLengths(s) {
  if (!s.pump || !s.autoLength) return;
  const L = requiredLengths(s, byId(s.pump.id).type);
  s.suction.L = L.suction; s.discharge.L = L.discharge;
  fitToCurve(s);
}

function setPump(id) {
  update(s => {
    const prevType = s.pump && byId(s.pump.id).type;
    s.pump = { id, x: s.pump ? s.pump.x : Math.round(s.site * 0.35 * 2) / 2, z: s.pump ? s.pump.z : 0.3 };
    if (!s.suction) Object.assign(s, defaultPipes(s, id));
    if (!prevType || prevType !== byId(id).type || s.autoLength) {
      const L = requiredLengths(s, byId(id).type); s.suction.L = L.suction; s.discharge.L = L.discharge; s.autoLength = true;
    }
    fitToCurve(s);
  }, 'structure');
  setUI({ selected: 'pump' }, 'select');
}

// ── الإجراءات من المشهد والمفتش ──
const actions = {
  addBuilding: () => buildingPicker(type => {
    const T = BUILDINGS[type];
    update(s => { s.building = { type, floors: T.floors, floorH: T.floorH, perFloor: T.perFloor }; }, 'structure');
    setUI({ selected: 'building' }, 'select');
  }),
  addRoof: () => { update(s => { s.roof = { vol: demand(s).roofRec }; }, 'structure'); setUI({ selected: 'roof' }, 'select'); },
  addGround: () => { update(s => { s.ground = { vol: demand(s).groundRec, depth: 1.5 }; }, 'structure'); setUI({ selected: 'ground' }, 'select'); },
  addPump: () => pumpPicker(getState(), null, setPump),
  pickPump: () => pumpPicker(getState(), byId(getState().pump.id), setPump),
  buildingType: t => { const T = BUILDINGS[t]; update(s => { Object.assign(s.building, { type: t, floorH: T.floorH, perFloor: T.perFloor }); autoLengths(s); }, 'structure'); },
  autoLength: on => update(s => { s.autoLength = on; autoLengths(s); }, 'value'),
};
function select(what) { setUI({ selected: what }, 'select'); }

function onChange(key, value) {
  const [a, b] = LIMITS[key] || [-Infinity, Infinity];
  update(s => {
    const parts = key.split('.'); let o = s;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts.at(-1)] = typeof value === 'number' ? Math.min(b, Math.max(a, value)) : value;
    if (key === 'site' && s.pump) s.pump.x = Math.min(s.pump.x, s.site - 0.5);
    if (key.endsWith('.L') || key === 'discharge.valveK') s.autoLength = false;
    else if (GEOMETRY_KEYS.test(key) || /\.(d|mat|elbows)$|^env\./.test(key)) autoLengths(s);
  }, 'value');
}

// ── الرسم ──
const scene = $('#scene'), insp = $('#inspector');
function paint(s, ui, why) {
  R = compute(s);
  scene.innerHTML = renderScene(s, ui, R);
  if (why !== 'value' && why !== 'fill') renderInspector(insp, s, ui, R, { onChange, onAction: (k, v) => actions[k](v) });
  else if (R) { const ro = $('#readout'); if (ro) ro.replaceWith(readout(R)); }
  paintStatus(s, ui);
  paintTitle(s);
  $('#run').disabled = !R; $('#analyze').disabled = !R;
  $('#run').querySelector('span').textContent = ui.running ? 'إيقاف' : 'تشغيل';
}
function paintStatus(s, ui) {
  const lamp = $('#lamp'), msg = $('#statusMsg');
  let k = '', m = !s.building ? 'ابدأ بإضافة المبنى من المربع المنقّط.' : !s.roof ? 'أضف الخزان العلوي فوق السطح.' : !s.ground ? 'أضف الخزان الأرضي.' : 'أضف المضخة لتوصيل الخزانين.';
  if (R) {
    if (ui.running) {
      if (R.noLift) { k = 'bad'; m = 'المحرك يدور والماء لا يصعد: ضاغط المضخة أقل من الرفع.'; }
      else if (R.air) { k = 'bad'; m = 'فقاعات هواء — ماسورة السحب لا تصل إلى سطح الماء.'; }
      else if (R.leak) { k = 'bad'; m = 'تسرّب — ماسورة الدفع لا تصل إلى الخزان العلوي.'; }
      else if (R.cavitation) { k = 'bad'; m = 'تكهف — صوت حصى داخل المضخة، NPSH المتاح أقل من المطلوب.'; }
      else { k = 'ok'; m = `يضخ ${n2(R.q)} م³/س عند ${n1(R.h)} م — يمتلئ الخزان العلوي في ${n0(R.fillMin)} دقيقة.`; }
    } else {
      const v = verdict(runChecks(R, s)); k = v.level;
      m = v.bad ? `مشكلات حرجة: ${v.bad} — افتح المذكرة الحسابية لإصلاحها.` : v.warn ? `يعمل، مع ملاحظات: ${v.warn}.` : `التصميم سليم — ${n2(R.q)} م³/س عند ${n1(R.h)} م.`;
    }
  }
  lamp.className = 'lamp ' + k; msg.textContent = m;
}
function paintTitle(s) {
  $('#tbProject').textContent = s.name || 'بدون اسم';
  $('#tbBuilding').textContent = s.building ? `${BUILDINGS[s.building.type].name} · ${s.building.floors} أدوار` : '—';
  $('#tbPump').textContent = s.pump ? byId(s.pump.id).model : '—';
  $('#tbDate').textContent = date(Date.now());
}
subscribe(paint);

// ── أحداث المشهد ──
scene.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (!t) return; const a = t.dataset.act; actions[a] ? actions[a]() : select(a); });
scene.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const t = e.target.closest('[data-act]'); if (!t) return; e.preventDefault(); const a = t.dataset.act; actions[a] ? actions[a]() : select(a); });

// ── التشغيل ──
let last = 0;
function loop(ts) {
  const ui = getUI(); if (!ui.running) return;
  const dt = last ? (ts - last) / 1000 : 0; last = ts;
  if (R && R.flows) {
    const span = Math.min(24, Math.max(5, R.fillMin / 6));
    ui.fill = Math.min(1, ui.fill + dt / span);
    const w = document.getElementById('roofWater');
    if (w) { const bottom = +w.getAttribute('y') + +w.getAttribute('height'), lv = 50 * ui.fill; w.setAttribute('y', bottom - lv); w.setAttribute('height', lv); }
    if (ui.fill >= 1) { setUI({ running: false, fill: 1 }, 'fill'); toast('امتلأ الخزان العلوي — العوّامة فصلت المضخة.'); return; }
  }
  requestAnimationFrame(loop);
}
$('#run').addEventListener('click', () => {
  const ui = getUI();
  if (!ui.running && ui.fill >= 0.98) ui.fill = 0.15;
  setUI({ running: !ui.running }, 'fill');
  if (getUI().running) { last = 0; requestAnimationFrame(loop); }
});
if (reduceMotion()) document.documentElement.classList.add('reduce');

// ── الأزرار العلوية ──
$('#analyze').addEventListener('click', () => {
  const open = () => openAnalysis(getState(), R, { canPrint: auth.name !== 'claude', onFix: f => { update(s => f.apply(s), 'structure'); closeDialog(); toast('طُبّق الإصلاح'); open(); } });
  if (R) open();
});
$('#envBtn').addEventListener('click', () => select('env'));
$('#savedBtn').addEventListener('click', () => openSaved(getState, { currentId, onOpen: (d, id) => { currentId = id; replace(d); }, onSaved: id => { currentId = id; paintTitle(getState()); } }));
confirmButton($('#newBtn'), 'تأكيد المسح؟', () => { currentId = null; replace(fresh()); });
$('#projName').addEventListener('input', e => { update(s => { s.name = e.target.value.slice(0, 60); }, 'value'); });
$('#outBtn').addEventListener('click', () => signOut('تم تسجيل الخروج.'));

async function signOut(msg) {
  await auth.signOut();
  if (auth.name === 'claude') { replace(fresh()); $('#app').classList.add('hidden'); $('#gate').classList.remove('hidden'); $('#gateMsg').textContent = msg; }
  else location.replace('index.html?m=' + encodeURIComponent(msg));
}

// ── الدخول ──
async function start(user) {
  $('#uname').textContent = user.name;
  $('#gate')?.classList.add('hidden'); $('#app').classList.remove('hidden');
  const admin = await auth.isAdmin(); $('#adminLink')?.classList.toggle('hidden', !admin);
  watchIdle(() => signOut('أُغلقت الجلسة تلقائياً بعد فترة دون نشاط.'));
  replace(fresh());
}
if (auth.name === 'claude') {
  $('#gate').classList.remove('hidden');
  $('#gateBtn').addEventListener('click', async () => {
    const b = $('#gateBtn'); b.disabled = true; $('#gateMsg').textContent = 'جارٍ التحقق من هويتك…';
    try { start(await auth.signIn()); } catch (e) { $('#gateMsg').textContent = e.message; } finally { b.disabled = false; }
  });
} else {
  requireUser().then(u => u && start(u));
}
