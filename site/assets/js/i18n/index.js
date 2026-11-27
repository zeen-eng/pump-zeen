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
// الإنجليزية هي اللغة الافتراضية؛ العربية عند اختيارها صراحة
export const lang = read() === 'ar' ? 'ar' : 'en';
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
  document.documentElement.removeAttribute('data-i18n-pending');
  if (!isEn) return;
  doc.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.textContent.trim().replace(/\s+/g, ' ')); });
  doc.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = t(e.placeholder); });
  doc.querySelectorAll('[data-i18n-aria]').forEach(e => e.setAttribute('aria-label', t(e.getAttribute('aria-label'))));
  const title = document.querySelector('title'); if (title?.dataset.en) document.title = title.dataset.en;
  const desc = document.querySelector('meta[name=description]'); if (desc?.dataset.en) desc.content = desc.dataset.en;
}

// مبدّل اللغة: زران ظاهران (English | عربي)، الحالي مفعّل، والآخر يحفظ ما يلزم عبر beforeSwitch ثم يعيد التحميل
export function langButton(beforeSwitch) {
  const wrap = document.createElement('div');
  wrap.className = 'lang-switch';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', isEn ? 'Language' : 'اللغة');
  const globe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  globe.setAttribute('viewBox', '0 0 24 24'); globe.setAttribute('aria-hidden', 'true');
  globe.innerHTML = '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18"/>';
  wrap.append(globe);
  for (const [code, label] of [['en', 'English'], ['ar', 'عربي']]) {
    const b = document.createElement('button');
    b.type = 'button'; b.lang = code; b.textContent = label;
    const on = code === lang;
    b.setAttribute('aria-pressed', String(on));
    if (!on) {
      b.className = 'lang-btn';
      b.title = code === 'ar' ? 'التبديل إلى العربية' : 'Switch to English';
      b.addEventListener('click', () => {
        try { beforeSwitch?.(); localStorage.setItem(KEY, code); } catch {}
        location.reload();
      });
    }
    wrap.append(b);
  }
  return wrap;
}

applyStatic();
