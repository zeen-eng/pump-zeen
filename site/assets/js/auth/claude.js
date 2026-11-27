// مزوّد المعاينة داخل Claude: الهوية من حساب Claude، والحفظ في مساحة خاصة لكل مستخدم
import { t } from '../i18n/index.js';
let user = null, db = null;

export const claudeAuth = {
  name: 'claude',
  configured: () => !!(window.claude && typeof window.claude.use === 'function'),
  async init() { return user; },
  user: () => user,
  async signIn() {
    const u = await window.claude.use('user');
    if (!u) throw new Error(t('تعذّر التحقق من الهوية. افتح الصفحة من claude.ai وأنت مسجّل الدخول.'));
    const id = await u.id();
    if (!id || typeof id !== 'string') throw new Error(t('تعذّر التحقق من الهوية.'));
    const me = await u.me();
    user = { id, email: '', name: (me && me.name) || t('مهندس') };
    db = await window.claude.use('db');
    return user;
  },
  async signOut() { user = null; db = null; },
  async isAdmin() { return false; },
  db: () => db,
};
