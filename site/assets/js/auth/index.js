// اختيار مزوّد الدخول ومراقبة الخمول — واجهة واحدة لكل الصفحات
import { CONFIG } from '../config.js';
import { supabaseAuth } from './supabase.js';
import { claudeAuth } from './claude.js';

function pick() {
  if (CONFIG.authProvider === 'supabase') return supabaseAuth;
  if (CONFIG.authProvider === 'claude') return claudeAuth;
  return claudeAuth.configured() ? claudeAuth : supabaseAuth;
}
export const auth = pick();

// إغلاق الجلسة بعد مدة خمول
export function watchIdle(onTimeout) {
  let t;
  const reset = () => { clearTimeout(t); t = setTimeout(onTimeout, CONFIG.idleMinutes * 60e3); };
  ['pointerdown', 'keydown', 'pointermove', 'touchstart', 'scroll'].forEach(e => addEventListener(e, reset, { passive: true }));
  reset();
  return () => clearTimeout(t);
}

// صفحات محمية: إن لم توجد جلسة → صفحة الدخول
export async function requireUser() {
  if (auth.name === 'claude') return auth.user();
  const u = await auth.init();
  if (!u) { location.replace('index.html'); return null; }
  return u;
}
