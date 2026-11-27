// صفحة الدخول والتسجيل + رسم المثال الحي
import { $, $$ } from '../core/dom.js';
import { auth } from '../auth/index.js';
import { LOGO } from '../ui/common.js';
import { renderScene } from '../ui/scene.js';
import { solve } from '../engine/solve.js';
import { fresh } from '../core/store.js';
import { requiredLengths, defaultPipes } from '../engine/recommend.js';

$$('[data-logo]').forEach(n => n.innerHTML = LOGO);

// مثال حي في الواجهة: بيت من دورين بمضخة CPm 610
(function hero() {
  const s = fresh();
  s.building = { type: 'house', floors: 2, floorH: 3.2, perFloor: 5 };
  s.roof = { vol: 1 }; s.ground = { vol: 2, depth: 1.5 };
  s.pump = { id: 'cpm610', x: 3.5, z: 0.3 };
  Object.assign(s, defaultPipes(s, 'cpm610'));
  const L = requiredLengths(s, 'surface'); s.suction.L = L.suction; s.discharge.L = L.discharge;
  $('#hero').innerHTML = renderScene(s, { selected: null, running: true, fill: 0.55 }, solve(s));
  $('#hero').querySelectorAll('[tabindex]').forEach(n => n.removeAttribute('tabindex'));
})();

const msg = (t, k = '') => { const m = $('#msg'); m.textContent = t; m.className = 'msg ' + k; };
const q = new URLSearchParams(location.search).get('m');
if (q) msg(q.slice(0, 120), 'ok');

if (!auth.configured()) msg('الموقع لم يُربط بقاعدة البيانات بعد: أضف supabaseUrl وsupabaseKey في assets/js/config.js.', 'bad');
else auth.init().then(u => { if (u) location.replace('app.html'); });

// التبويبات
$$('[data-tab]').forEach(b => b.addEventListener('click', () => {
  $$('[data-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  $('#fIn').classList.toggle('hidden', b.dataset.tab !== 'in');
  $('#fUp').classList.toggle('hidden', b.dataset.tab !== 'up');
  msg('');
}));

const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const strength = p => (p.length >= 10) + (/[a-z]/i.test(p)) + (/\d/.test(p)) + (/[^a-z0-9]/i.test(p)) + (p.length >= 14);

$('#upPass').addEventListener('input', e => {
  const n = strength(e.target.value), i = $('#meter');
  i.style.width = (n * 20) + '%'; i.style.background = n >= 4 ? 'var(--ok)' : n >= 3 ? 'var(--warn)' : 'var(--fault)';
});

// قفل بسيط بعد محاولات فاشلة متتالية (الحماية الأساسية في الخادم)
let fails = 0, lockUntil = 0;
async function guarded(form, fn) {
  if (Date.now() < lockUntil) { msg(`انتظر ${Math.ceil((lockUntil - Date.now()) / 1000)} ثانية ثم أعد المحاولة.`, 'bad'); return; }
  const btn = form.querySelector('[type=submit]'); btn.disabled = true;
  try { await fn(); fails = 0; }
  catch (e) { fails++; if (fails >= 5) { lockUntil = Date.now() + 60e3 * Math.min(10, fails - 4); } msg(e.message || 'تعذّر الطلب.', 'bad'); }
  finally { btn.disabled = false; }
}

$('#fIn').addEventListener('submit', e => {
  e.preventDefault();
  const email = $('#inEmail').value.trim(), pass = $('#inPass').value;
  if (!emailOk(email) || !pass) { msg('أدخل بريداً صحيحاً وكلمة المرور.', 'bad'); return; }
  guarded(e.target, async () => { msg('جارٍ الدخول…'); await auth.signIn(email, pass); location.replace('app.html'); });
});

$('#fUp').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#upName').value.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 60), email = $('#upEmail').value.trim(), pass = $('#upPass').value;
  if (!name) { msg('اكتب اسمك.', 'bad'); return; }
  if (!emailOk(email)) { msg('البريد غير صحيح.', 'bad'); return; }
  if (strength(pass) < 3 || pass.length < 10) { msg('كلمة المرور ضعيفة: 10 أحرف على الأقل وتشمل حروفاً وأرقاماً.', 'bad'); return; }
  guarded(e.target, async () => {
    const r = await auth.signUp(email, pass, name);
    if (r.confirm) msg('أرسلنا رابط تفعيل إلى بريدك. فعّل الحساب ثم سجّل الدخول.', 'ok');
    else location.replace('app.html');
  });
});

$('#forgot').addEventListener('click', async () => {
  const email = $('#inEmail').value.trim();
  if (!emailOk(email)) { msg('اكتب بريدك في الحقل أولاً.', 'bad'); return; }
  try { await auth.resetPassword(email); } catch {}
  msg('إن كان البريد مسجّلاً فستصلك رسالة لإعادة تعيين كلمة المرور.', 'ok'); // نفس الرد دائماً لمنع كشف الحسابات
});
