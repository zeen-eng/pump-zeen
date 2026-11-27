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
import { renderScene, setLevels, PRIME_TOTAL } from '../ui/scene.js';
import { renderInspector, readout } from '../ui/inspector.js';
import { buildingPicker, pumpPicker } from '../ui/pickers.js';
import { openAnalysis } from '../ui/analysis.js';
import { openSaved } from '../ui/saved.js';
import { toast, confirmButton, closeDialog, ICON, LOGO } from '../ui/common.js';
import { t, langButton } from '../i18n/index.js';
import { cleanDesign } from '../core/sanitize.js';

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
  $('#run').querySelector('span').textContent = ui.running ? t('إيقاف') : t('تشغيل');
}
function paintStatus(s, ui) {
  const lamp = $('#lamp'), msg = $('#statusMsg');
  let k = '', m = !s.building ? t('ابدأ بإضافة المبنى من المربع المنقّط.') : !s.roof ? t('أضف الخزان العلوي فوق السطح.') : !s.ground ? t('أضف الخزان الأرضي.') : t('أضف المضخة لتوصيل الخزانين.');
  if (R) {
    if (ui.running) {
      if (R.noLift) { k = 'bad'; m = t('المحرك يدور والماء لا يصعد: ضاغط المضخة أقل من الرفع.'); }
      else if (R.air) { k = 'bad'; m = t('فقاعات هواء — ماسورة السحب لا تصل إلى سطح الماء.'); }
      else if (R.leak) { k = 'bad'; m = t('تسرّب — ماسورة الدفع لا تصل إلى الخزان العلوي.'); }
      else if (R.cavitation) { k = 'bad'; m = t('تكهف — صوت حصى داخل المضخة، NPSH المتاح أقل من المطلوب.'); }
      else { k = 'ok'; m = t('يضخ {0} م³/س عند {1} م — يمتلئ الخزان العلوي في {2} دقيقة.', [n2(R.q), n1(R.h), n0(R.fillMin)]); }
    } else {
      const v = verdict(runChecks(R, s)); k = v.level;
      m = v.bad ? t('مشكلات حرجة: {0} — افتح المذكرة الحسابية لإصلاحها.', [v.bad]) : v.warn ? t('يعمل، مع ملاحظات: {0}.', [v.warn]) : t('التصميم سليم — {0} م³/س عند {1} م.', [n2(R.q), n1(R.h)]);
    }
  }
  lamp.className = 'lamp ' + k; msg.textContent = m;
}
function paintTitle(s) {
  $('#tbProject').textContent = s.name || t('بدون اسم');
  $('#tbBuilding').textContent = s.building ? t('{0} · {1} أدوار', [BUILDINGS[s.building.type].name, s.building.floors]) : '—';
  $('#tbPump').textContent = s.pump ? byId(s.pump.id).model : '—';
  $('#tbDate').textContent = date(Date.now());
}
subscribe(paint);

// ── أحداث المشهد ──
scene.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (!t) return; const a = t.dataset.act; actions[a] ? actions[a]() : select(a); });
scene.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const t = e.target.closest('[data-act]'); if (!t) return; e.preventDefault(); const a = t.dataset.act; actions[a] ? actions[a]() : select(a); });

// ── التشغيل ──
// الماء يمتلئ في المواسير أولاً (PRIME_TOTAL)، ثم يرتفع العلوي وينخفض الأرضي بنفس الحجم
let last = 0, startedAt = 0;
function loop(ts) {
  const ui = getUI(); if (!ui.running) return;
  const dt = last ? (ts - last) / 1000 : 0; last = ts;
  if (!ui.primed && performance.now() - startedAt >= (reduceMotion() ? 0 : PRIME_TOTAL * 1000)) ui.primed = true;
  if (ui.primed && R && R.flows) {
    const s = getState(), span = Math.min(24, Math.max(6, R.fillMin / 6));
    const dFill = dt / span;
    ui.fill = Math.min(1, ui.fill + dFill);
    ui.ground = Math.max(0, ui.ground - dFill * s.roof.vol / s.ground.vol);
    setLevels(scene, ui);
    if (ui.fill >= 1) { setUI({ running: false, fill: 1 }, 'fill'); toast(t('امتلأ الخزان العلوي — العوّامة فصلت المضخة.')); return; }
    if (ui.ground <= 0.03) { setUI({ running: false }, 'fill'); toast(t('الخزان الأرضي فارغ — حساس المستوى فصل المضخة لحمايتها.')); return; }
  }
  requestAnimationFrame(loop);
}
$('#run').addEventListener('click', () => {
  const ui = getUI();
  if (!ui.running && (ui.fill >= 0.98 || ui.ground <= 0.05)) { ui.fill = 0.15; ui.ground = 1; }
  setUI({ running: !ui.running }, 'fill');
  if (getUI().running) { last = 0; startedAt = performance.now(); requestAnimationFrame(loop); }
});
if (reduceMotion()) document.documentElement.classList.add('reduce');

// ── الأزرار العلوية ──
$('#analyze').addEventListener('click', () => {
  const open = () => openAnalysis(getState(), R, { canPrint: auth.name !== 'claude', onFix: f => { update(s => f.apply(s), 'structure'); closeDialog(); toast(t('طُبّق الإصلاح')); open(); } });
  if (R) open();
});
$('#envBtn').addEventListener('click', () => select('env'));
$('#savedBtn').addEventListener('click', () => openSaved(getState, { currentId, onOpen: (d, id) => { currentId = id; replace(d); }, onSaved: id => { currentId = id; paintTitle(getState()); } }));
confirmButton($('#newBtn'), t('تأكيد المسح؟'), () => { currentId = null; replace(fresh()); });
$('#projName').addEventListener('input', e => { update(s => { s.name = e.target.value.slice(0, 60); }, 'value'); });
$('#outBtn').addEventListener('click', () => signOut(t('تم تسجيل الخروج.')));

async function signOut(msg) {
  await auth.signOut();
  if (auth.name === 'claude') { replace(fresh()); $('#app').classList.add('hidden'); $('#gate').classList.remove('hidden'); $('#gateMsg').textContent = msg; }
  else location.replace('index.html?m=' + encodeURIComponent(msg));
}

// ── اللغة: نحفظ التصميم مؤقتاً قبل إعادة التحميل ──
const DRAFT = 'pz.draft';
$('#langSlot').append(langButton(() => {
  sessionStorage.setItem(DRAFT, JSON.stringify({ s: getState(), id: currentId, sel: getUI().selected }));
  if (auth.name === 'claude') sessionStorage.setItem('pz.autologin', '1');
}));
function restoreDraft() {
  let d = null; try { d = JSON.parse(sessionStorage.getItem(DRAFT) || 'null'); sessionStorage.removeItem(DRAFT); } catch {}
  if (!d) return false;
  currentId = typeof d.id === 'string' ? d.id : null;
  replace(cleanDesign(d.s));
  $('#projName').value = getState().name || '';
  return true;
}

// ── الدخول ──
async function start(user) {
  $('#uname').textContent = user.name;
  $('#gate')?.classList.add('hidden'); $('#app').classList.remove('hidden');
  const admin = await auth.isAdmin(); $('#adminLink')?.classList.toggle('hidden', !admin);
  watchIdle(() => signOut(t('أُغلقت الجلسة تلقائياً بعد فترة دون نشاط.')));
  if (!restoreDraft()) replace(fresh());
}
if (auth.name === 'claude') {
  $('#gate').classList.remove('hidden');
  const go = async () => {
    const b = $('#gateBtn'); b.disabled = true; $('#gateMsg').textContent = t('جارٍ التحقق من هويتك…');
    try { start(await auth.signIn()); } catch (e) { $('#gateMsg').textContent = e.message; } finally { b.disabled = false; }
  };
  $('#gateBtn').addEventListener('click', go);
  let auto = false; try { auto = sessionStorage.getItem('pz.autologin') === '1'; sessionStorage.removeItem('pz.autologin'); } catch {}
  if (auto) go();
} else {
  requireUser().then(u => u && start(u));
}
