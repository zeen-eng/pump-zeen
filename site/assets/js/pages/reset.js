// تعيين كلمة مرور جديدة من رابط البريد
import { $, $$ } from '../core/dom.js';
import { supabaseAuth } from '../auth/supabase.js';
import { LOGO } from '../ui/common.js';
import { t } from '../i18n/index.js';

$$('[data-logo]').forEach(n => n.innerHTML = LOGO);
const params = new URLSearchParams(location.hash.slice(1));
const token = params.get('type') === 'recovery' ? params.get('access_token') : null;
history.replaceState(null, '', location.pathname); // إزالة الرمز من شريط العنوان والسجل
const msg = (t, k = '') => { const m = $('#msg'); m.textContent = t; m.className = 'msg ' + k; };
if (!token) msg(t('الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً من صفحة الدخول.'), 'bad');

$('#f').addEventListener('submit', async e => {
  e.preventDefault();
  const a = $('#p1').value, b = $('#p2').value;
  if (!token) return;
  if (a.length < 10 || !/[a-z]/i.test(a) || !/\d/.test(a)) { msg(t('كلمة المرور ضعيفة.'), 'bad'); return; }
  if (a !== b) { msg(t('الكلمتان غير متطابقتين.'), 'bad'); return; }
  try { await supabaseAuth.setPasswordWithToken(token, a); location.replace('index.html?m=' + encodeURIComponent(t('تم تغيير كلمة المرور. سجّل الدخول.'))); }
  catch (er) { msg(er.message, 'bad'); }
});
