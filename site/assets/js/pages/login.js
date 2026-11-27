// صفحة الدخول والتسجيل + رسم المثال الحي + شاشة «تحقق من بريدك»
import { $, $$ } from '../core/dom.js';
import { auth } from '../auth/index.js';
import { LOGO } from '../ui/common.js';
import { renderScene, setLevels } from '../ui/scene.js';
import { solve } from '../engine/solve.js';
import { fresh } from '../core/store.js';
import { requiredLengths, defaultPipes } from '../engine/recommend.js';
import { t, langButton } from '../i18n/index.js';

$$('[data-logo]').forEach(n => n.innerHTML = LOGO);
$('#langSlot').append(langButton());

// مثال حي في الواجهة: بيت من دورين بمضخة CPm 610 في حالة تشغيل
(function hero() {
  const s = fresh();
  s.building = { type: 'house', floors: 2, floorH: 3.2, perFloor: 5 };
  s.roof = { vol: 1 }; s.ground = { vol: 2, depth: 1.5 };
  s.pump = { id: 'cpm610', x: 3.5, z: 0.3 };
  Object.assign(s, defaultPipes(s, 'cpm610'));
  const L = requiredLengths(s, 'surface'); s.suction.L = L.suction; s.discharge.L = L.discharge;
  const R = solve(s), svg = $('#hero');
  let fill = 0.25, ground = 0.9, last = 0;
  const draw = () => { svg.innerHTML = renderScene(s, { selected: null, running: true, primed: true, fill, ground }, R); svg.querySelectorAll('[tabindex]').forEach(n => n.removeAttribute('tabindex')); };
  draw();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const tick = ts => {
      const dt = last ? (ts - last) / 1000 : 0; last = ts;
      fill += dt / 16; ground -= dt / 60;
      if (fill > 0.95) { fill = 0.25; ground = 0.9; draw(); }
      else setLevels(svg, { fill, ground });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
})();

const msg = (text, k = '') => { const m = $('#msg'); m.textContent = text; m.className = 'msg ' + k; };
const q = new URLSearchParams(location.search).get('m');
if (q) msg(q.slice(0, 160), 'ok');

// ── شاشة «تحقق من بريدك» ──
const MAIL = { 'gmail.com': ['Gmail', 'https://mail.google.com/mail/u/0/#search/from%3Asupabase'], 'googlemail.com': ['Gmail', 'https://mail.google.com/'],
  'outlook.com': ['Outlook', 'https://outlook.live.com/mail/'], 'hotmail.com': ['Outlook', 'https://outlook.live.com/mail/'], 'live.com': ['Outlook', 'https://outlook.live.com/mail/'],
  'yahoo.com': ['Yahoo Mail', 'https://mail.yahoo.com/'], 'icloud.com': ['iCloud Mail', 'https://www.icloud.com/mail'] };
let sentEmail = '', cooldown = 0, cdTimer;
function showSent(email) {
  sentEmail = email;
  $('#forms').classList.add('hidden'); $('#sent').classList.remove('hidden'); msg('');
  $('#sentTo').textContent = email;
  const m = MAIL[email.split('@')[1]?.toLowerCase()];
  const a = $('#openMail');
  if (m) { a.href = m[1]; a.textContent = t('افتح {0}', [m[0]]); a.classList.remove('hidden'); } else a.classList.add('hidden');
  startCooldown(60);
}
function startCooldown(sec) {
  cooldown = sec; clearInterval(cdTimer);
  const b = $('#resend'), tick = () => {
    if (cooldown <= 0) { b.disabled = false; b.textContent = t('إعادة إرسال الرسالة'); clearInterval(cdTimer); return; }
    b.disabled = true; b.textContent = t('إعادة الإرسال بعد {0} ث', [cooldown--]);
  };
  tick(); cdTimer = setInterval(tick, 1000);
}
$('#resend').addEventListener('click', async () => {
  try { await auth.resendSignup(sentEmail); $('#resendNote').textContent = t('أُرسلت رسالة جديدة. قد تستغرق دقيقة.'); startCooldown(60); }
  catch (e) { $('#resendNote').textContent = e.message; startCooldown(e.code === 'rate' ? 120 : 20); }
});
$('#changeEmail').addEventListener('click', () => { $('#sent').classList.add('hidden'); $('#forms').classList.remove('hidden'); switchTab('up'); $('#upEmail').focus(); });
$('#toSignIn').addEventListener('click', () => { $('#sent').classList.add('hidden'); $('#forms').classList.remove('hidden'); switchTab('in'); $('#inEmail').value = sentEmail; $('#inPass').focus(); });

// ── الوصول من رابط التفعيل، أو جلسة قائمة ──
if (!auth.configured()) msg(t('الموقع لم يُربط بقاعدة البيانات بعد: أضف supabaseUrl وsupabaseKey في assets/js/config.js.'), 'bad');
else (async () => {
  const h = await auth.fromHash?.();
  if (h?.error) { msg(h.error.includes('expired') ? t('انتهت صلاحية رابط التفعيل. سجّل الدخول ببريدك وسنرسل لك رابطاً جديداً.') : t('رابط التفعيل غير صالح.'), 'bad'); return; }
  if (h?.user) { msg(t('تم تفعيل حسابك. جارٍ الدخول…'), 'ok'); setTimeout(() => location.replace('app.html'), 900); return; }
  if (await auth.init()) location.replace('app.html');
})();

// ── التبويبات ──
function switchTab(tab) {
  $$('[data-tab]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.tab === tab)));
  $('#fIn').classList.toggle('hidden', tab !== 'in');
  $('#fUp').classList.toggle('hidden', tab !== 'up');
  msg('');
}
$$('[data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const strength = p => (p.length >= 10) + (/[a-z]/i.test(p)) + (/\d/.test(p)) + (/[^a-z0-9]/i.test(p)) + (p.length >= 14);

$('#upPass').addEventListener('input', e => {
  const n = strength(e.target.value), i = $('#meter');
  i.style.width = (n * 20) + '%'; i.style.background = n >= 4 ? 'var(--ok)' : n >= 3 ? 'var(--warn)' : 'var(--fault)';
});

// قفل بسيط بعد محاولات فاشلة متتالية (الحماية الأساسية في الخادم)
let fails = 0, lockUntil = 0;
async function guarded(form, fn) {
  if (Date.now() < lockUntil) { msg(t('انتظر {0} ثانية ثم أعد المحاولة.', [Math.ceil((lockUntil - Date.now()) / 1000)]), 'bad'); return; }
  const btn = form.querySelector('[type=submit]'); btn.disabled = true;
  try { await fn(); fails = 0; }
  catch (e) {
    if (e.code === 'unconfirmed') { showSent(form.querySelector('[type=email]').value.trim()); $('#resendNote').textContent = t('حسابك لم يُفعَّل بعد. افتح رسالة التفعيل، أو أعد إرسالها.'); startCooldown(0); return; }
    fails++; if (fails >= 5) lockUntil = Date.now() + 60e3 * Math.min(10, fails - 4);
    msg(e.message || t('تعذّر الطلب.'), 'bad');
  }
  finally { btn.disabled = false; }
}

$('#fIn').addEventListener('submit', e => {
  e.preventDefault();
  const email = $('#inEmail').value.trim(), pass = $('#inPass').value;
  if (!emailOk(email) || !pass) { msg(t('أدخل بريداً صحيحاً وكلمة المرور.'), 'bad'); return; }
  guarded(e.target, async () => { msg(t('جارٍ الدخول…')); await auth.signIn(email, pass); location.replace('app.html'); });
});

$('#fUp').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#upName').value.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 60), email = $('#upEmail').value.trim(), pass = $('#upPass').value;
  if (!name) { msg(t('اكتب اسمك.'), 'bad'); return; }
  if (!emailOk(email)) { msg(t('البريد غير صحيح.'), 'bad'); return; }
  if (strength(pass) < 3 || pass.length < 10) { msg(t('كلمة المرور ضعيفة: 10 أحرف على الأقل وتشمل حروفاً وأرقاماً.'), 'bad'); return; }
  guarded(e.target, async () => {
    msg(t('جارٍ إنشاء الحساب…'));
    const r = await auth.signUp(email, pass, name);
    if (r.confirm) showSent(email);
    else location.replace('app.html');
  });
});

$('#forgot').addEventListener('click', async () => {
  const email = $('#inEmail').value.trim();
  if (!emailOk(email)) { msg(t('اكتب بريدك في الحقل أولاً.'), 'bad'); return; }
  try { await auth.resetPassword(email); } catch {}
  msg(t('إن كان البريد مسجّلاً فستصلك رسالة لإعادة تعيين كلمة المرور.'), 'ok'); // نفس الرد دائماً لمنع كشف الحسابات
});
