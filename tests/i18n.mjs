// يتحقق أن كل نص داخل t('...') له ترجمة في en.js: node tests/i18n.mjs  (--list لطباعة الناقص فقط)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EN } from '../site/assets/js/i18n/en.js';
const walk = d => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const keys = new Set();
for (const f of walk('site/assets/js').filter(f => f.endsWith('.js'))) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\'/g, "'"));
}
for (const f of walk('site').filter(f => f.endsWith('.html'))) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/<([a-z0-9]+)[^>]*\sdata-i18n[^>]*>([^<]+)</g)) keys.add(m[2].trim().replace(/\s+/g, ' '));
  for (const m of s.matchAll(/data-i18n-ph[^>]*placeholder="([^"]+)"|placeholder="([^"]+)"[^>]*data-i18n-ph/g)) keys.add(m[1] || m[2]);
  for (const m of s.matchAll(/data-i18n-aria[^>]*aria-label="([^"]+)"|aria-label="([^"]+)"[^>]*data-i18n-aria/g)) keys.add(m[1] || m[2]);
}
const missing = [...keys].filter(k => !(k in EN) && /[؀-ۿ]/.test(k));
if (process.argv.includes('--list')) { console.log(JSON.stringify(missing, null, 1)); process.exit(0); }
console.log(`${keys.size} keys, ${missing.length} missing`);
if (missing.length) { missing.slice(0, 40).forEach(k => console.log('  MISSING:', k)); process.exit(1); }
console.log('ALL TRANSLATED');
