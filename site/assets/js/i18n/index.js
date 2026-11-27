// ═══════════════════════════════════════════════════════════════
// الترجمة: النص العربي هو المفتاح، والإنجليزي في en.js
//   t('نص')                 → النص باللغة الحالية
//   t('التدفق {0} م³/س', [q]) → مع إدراج القيم
// اللغة ثابتة طوال عمر الصفحة؛ التبديل يحفظ التصميم مؤقتاً ثم يعيد التحميل.
// لإضافة نص: اكتبه بالعربية داخل t()، ثم أضف ترجمته في en.js (اختبار tests/i18n.mjs يكشف الناقص)
// ═══════════════════════════════════════════════════════════════
import { EN } from './en.js';

const KEY = 'pz.lang';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const lang = read() === 'en' ? 'en' : 'ar';
export const isEn = lang === 'en';

export function t(s, vars) {
  let out = isEn ? (EN[s] ?? s) : s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return out;
}

// تطبيق اللغة على عناصر HTML الثابتة: data-i18n (النص)، data-i18n-ph (placeholder)، data-i18n-aria
export function applyStatic(root) {
  if (typeof document === 'undefined') return;
  const doc = root || document;
  document.documentElement.lang = lang;
  document.documentElement.dir = isEn ? 'ltr' : 'rtl';
  if (!isEn) return;
  doc.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.textContent.trim().replace(/\s+/g, ' ')); });
  doc.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = t(e.placeholder); });
  doc.querySelectorAll('[data-i18n-aria]').forEach(e => e.setAttribute('aria-label', t(e.getAttribute('aria-label'))));
  const title = document.querySelector('title'); if (title?.dataset.en) document.title = title.dataset.en;
  const desc = document.querySelector('meta[name=description]'); if (desc?.dataset.en) desc.content = desc.dataset.en;
}

// زر التبديل: يحفظ ما يلزم عبر beforeSwitch ثم يعيد التحميل
export function langButton(beforeSwitch) {
  const b = document.createElement('button');
  b.className = 'btn quiet lang-btn';
  b.type = 'button';
  b.textContent = isEn ? 'عربي' : 'English';
  b.lang = isEn ? 'ar' : 'en';
  b.setAttribute('aria-label', isEn ? 'التبديل إلى العربية' : 'Switch to English');
  b.addEventListener('click', () => {
    try { beforeSwitch?.(); localStorage.setItem(KEY, isEn ? 'ar' : 'en'); } catch {}
    location.reload();
  });
  return b;
}

applyStatic();
