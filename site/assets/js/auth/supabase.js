// ═══════════════════════════════════════════════════════════════
// عميل Supabase مصغّر بدون مكتبات خارجية (Auth + REST + RPC)
// • رمز الدخول (access token) في الذاكرة فقط
// • رمز التجديد في sessionStorage — يُمسح بإغلاق التبويب
// • كل صلاحية حقيقية تُفرض في قاعدة البيانات عبر RLS، لا في المتصفح
// ═══════════════════════════════════════════════════════════════
import { CONFIG } from '../config.js';

const RT_KEY = 'pz.rt';
let session = null; // { access, exp, user }
let refreshTimer = null;

const base = () => CONFIG.supabaseUrl.replace(/\/+$/, '');
const headers = (auth = true) => {
  const h = { apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json' };
  if (auth && session) h.Authorization = 'Bearer ' + session.access;
  return h;
};
const store = {
  get: () => { try { return sessionStorage.getItem(RT_KEY); } catch { return null; } },
  set: v => { try { v ? sessionStorage.setItem(RT_KEY, v) : sessionStorage.removeItem(RT_KEY); } catch {} },
};

// رسائل الأخطاء بالعربية دون كشف تفاصيل داخلية
function friendly(status, body) {
  const m = String(body?.error_code || body?.msg || body?.message || body?.error_description || '').toLowerCase();
  if (m.includes('invalid') && m.includes('credential') || m.includes('invalid_grant') || m.includes('invalid login')) return 'البريد أو كلمة المرور غير صحيحة.';
  if (m.includes('email_not_confirmed') || m.includes('not confirmed')) return 'فعّل حسابك من الرابط المرسل إلى بريدك أولاً.';
  if (m.includes('already') && m.includes('registered') || m.includes('user_already_exists')) return 'هذا البريد مسجّل مسبقاً.';
  if (m.includes('weak') || m.includes('password should')) return 'كلمة المرور ضعيفة: 10 أحرف على الأقل وتشمل حروفاً وأرقاماً.';
  if (status === 429 || m.includes('rate')) return 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.';
  if (m.includes('database error saving new user') || m.includes('signups')) return 'التسجيل مغلق حالياً.';
  return 'تعذّر إكمال الطلب. حاول مرة أخرى.';
}

async function call(path, { method = 'GET', body, auth = true, prefer } = {}) {
  const h = headers(auth);
  if (prefer) h.Prefer = prefer;
  let res;
  try {
    res = await fetch(base() + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, credentials: 'omit', cache: 'no-store' });
  } catch { throw new Error('لا يوجد اتصال بالخادم.'); }
  const txt = await res.text();
  let data = null; try { data = txt ? JSON.parse(txt) : null; } catch {}
  if (!res.ok) { const e = new Error(friendly(res.status, data)); e.status = res.status; throw e; }
  return data;
}

function accept(tok) {
  if (!tok?.access_token) return null;
  const u = tok.user || {};
  session = {
    access: tok.access_token,
    exp: Date.now() + (tok.expires_in || 3600) * 1000,
    user: { id: u.id, email: u.email, name: u.user_metadata?.full_name || (u.email || '').split('@')[0] },
  };
  store.set(tok.refresh_token);
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => refresh().catch(() => {}), Math.max(30e3, (tok.expires_in || 3600) * 1000 - 120e3));
  return session.user;
}

async function refresh() {
  const rt = store.get();
  if (!rt) return null;
  try { return accept(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: rt } })); }
  catch { store.set(null); session = null; return null; }
}

export const supabaseAuth = {
  name: 'supabase',
  configured: () => !!(CONFIG.supabaseUrl && CONFIG.supabaseKey),
  async init() { return session?.user || refresh(); },
  user: () => session?.user || null,
  async signIn(email, password) {
    return accept(await call('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } }));
  },
  async signUp(email, password, fullName) {
    const r = await call('/auth/v1/signup', { method: 'POST', auth: false, body: { email, password, data: { full_name: fullName } } });
    return r?.access_token ? { user: accept(r), confirm: false } : { user: null, confirm: true };
  },
  async resetPassword(email) {
    await call('/auth/v1/recover?redirect_to=' + encodeURIComponent(location.origin + '/reset.html'), { method: 'POST', auth: false, body: { email } });
  },
  async signOut() {
    try { if (session) await call('/auth/v1/logout', { method: 'POST' }); } catch {}
    clearTimeout(refreshTimer); session = null; store.set(null);
  },
  // من رابط «نسيت كلمة المرور»: الرمز يصل في عنوان الصفحة بعد #
  async setPasswordWithToken(token, password) {
    const r = await fetch(base() + '/auth/v1/user', { method: 'PUT', credentials: 'omit', cache: 'no-store',
      headers: { apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ password }) });
    if (!r.ok) { let b = null; try { b = await r.json(); } catch {} throw new Error(friendly(r.status, b)); }
  },
  async isAdmin() { try { return (await call('/rest/v1/rpc/is_admin', { method: 'POST', body: {} })) === true; } catch { return false; } },
  rpc: (fn, args = {}) => call('/rest/v1/rpc/' + encodeURIComponent(fn), { method: 'POST', body: args }),
  rest: call,
};
