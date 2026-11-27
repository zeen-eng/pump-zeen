// لوحة الإدارة — تظهر فقط إذا أكّدت قاعدة البيانات أن المستخدم مدير
import { $, $$, el } from '../core/dom.js';
import { n0, date } from '../core/format.js';
import { auth, watchIdle, requireUser } from '../auth/index.js';
import { LOGO, toast, confirmButton } from '../ui/common.js';
import { langButton } from '../i18n/index.js';
import { t } from '../i18n/index.js';

$$('[data-logo]').forEach(n => n.innerHTML = LOGO);
$('#langSlot').append(langButton());
const ACTIONS = { login: t('دخول'), logout: t('خروج'), user_signedup: t('تسجيل'), token_refreshed: t('تجديد'), user_recovery_requested: t('طلب استعادة'), user_updated_password: t('تغيير كلمة المرور'), user_deleted: t('حذف مستخدم') };
const when = t => t ? date(t) + ' ' + new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

function table(node, heads, rows) {
  node.replaceChildren(el('thead', {}, el('tr', {}, ...heads.map(h => el('th', { text: h })))), el('tbody', {}, ...rows));
  if (!rows.length) node.querySelector('tbody').append(el('tr', {}, el('td', { colspan: heads.length, class: 'muted', text: t('لا توجد بيانات.') })));
}

async function load() {
  const o = await auth.rpc('admin_overview');
  $('#stats').replaceChildren(...[[t('المستخدمون'), o.users], [t('نشطون آخر 7 أيام'), o.active7], [t('جدد آخر 7 أيام'), o.new7], [t('التصاميم'), o.designs]]
    .map(([k, v]) => el('div', {}, el('small', { text: k }), el('b', { class: 'num', text: n0(v) }))));
  $('#signups').checked = !!o.signups_open;

  const me = auth.user();
  const users = await auth.rpc('admin_users');
  table($('#users'), [t('المستخدم'), t('الدور'), t('التسجيل'), t('آخر دخول'), t('التصاميم'), ''], users.map(u => {
    const role = el('select', { class: 'input', style: 'min-height:34px;width:auto', disabled: u.id === me.id },
      el('option', { value: 'user', selected: u.role !== 'admin', text: t('مستخدم') }), el('option', { value: 'admin', selected: u.role === 'admin', text: t('مدير') }));
    role.addEventListener('change', async () => { try { await auth.rpc('admin_set_role', { target: u.id, new_role: role.value }); toast(t('تم تغيير الدور')); } catch (e) { toast(e.message); load(); } });
    const del = el('button', { class: 'btn sm quiet danger', text: t('حذف'), disabled: u.id === me.id });
    confirmButton(del, t('تأكيد الحذف'), async () => { try { await auth.rpc('admin_delete_user', { target: u.id }); toast(t('حُذف المستخدم وتصاميمه')); load(); } catch (e) { toast(e.message); } });
    return el('tr', {},
      el('td', {}, el('b', { text: u.full_name || '—' }), el('div', { class: 'muted small num', text: u.email + (u.confirmed ? '' : t(' · غير مفعّل')) })),
      el('td', {}, role), el('td', { class: 'num', text: when(u.created_at) }), el('td', { class: 'num', text: when(u.last_sign_in_at) }),
      el('td', { class: 'n', text: n0(u.designs) }), el('td', {}, del));
  }));

  const log = await auth.rpc('admin_auth_log');
  table($('#log'), [t('الوقت'), t('الحساب'), t('العملية'), 'IP'], log.filter(r => r.action !== 'token_refreshed').slice(0, 60)
    .map(r => el('tr', {}, el('td', { class: 'num', text: when(r.at) }), el('td', { class: 'num', text: r.email || '—' }), el('td', { text: ACTIONS[r.action] || r.action || '—' }), el('td', { class: 'num', text: r.ip || '—' }))));

  const ds = await auth.rpc('admin_designs');
  table($('#designs'), [t('التصميم'), t('المالك'), t('آخر تعديل')], ds.map(d => el('tr', {}, el('td', { text: d.name }), el('td', { class: 'num', text: d.owner_email }), el('td', { class: 'num', text: when(d.updated_at) }))));
}

$('#signups').addEventListener('change', async e => { try { await auth.rpc('admin_set_signups', { open: e.target.checked }); toast(e.target.checked ? t('التسجيل مفتوح') : t('التسجيل مغلق')); } catch (er) { toast(er.message); e.target.checked = !e.target.checked; } });
$('#outBtn').addEventListener('click', async () => { await auth.signOut(); location.replace('index.html'); });

(async () => {
  const u = await requireUser(); if (!u) return;
  if (!(await auth.isAdmin())) { location.replace('app.html'); return; }
  watchIdle(async () => { await auth.signOut(); location.replace('index.html?m=' + encodeURIComponent(t('أُغلقت الجلسة بعد عدم النشاط.'))); });
  $('#wait').remove(); $('#admin').classList.remove('hidden');
  try { await load(); } catch (e) { toast(e.message); }
})();
