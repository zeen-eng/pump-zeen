// ═══════════════════════════════════════════════════════════════
// يبني Worker صغيراً يقدّم ملفات site/ من GitHub مثبتةً على commit محدد
//   node tools/build-edge.mjs <commit-sha>   → deploy/edge.js
// • الملفات تُجلب من raw.githubusercontent.com عند commit ثابت، فلا يمكن تغيير محتواها بعد النشر
// • تُخزَّن في ذاكرة Cloudflare المؤقتة سنة كاملة (لأن الـ commit لا يتغير)
// • ترويسات الأمان تُقرأ من site/_headers عند البناء
// النشر: أي تحديث = git push ثم إعادة بناء هذا الملف بالـ commit الجديد ورفعه إلى Worker «pump-zeen»
// ═══════════════════════════════════════════════════════════════
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const COMMIT = process.argv[2];
if (!/^[0-9a-f]{40}$/.test(COMMIT || '')) { console.error('usage: node tools/build-edge.mjs <full 40-char commit sha>'); process.exit(1); }
const REPO = 'zeen-eng/pump-zeen';

const rules = []; let cur = null;
for (const line of readFileSync(join(ROOT, 'site/_headers'), 'utf8').split('\n')) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: {} }; rules.push(cur); continue; }
  const i = line.indexOf(':');
  cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const code = `// مولَّد بواسطة tools/build-edge.mjs — لا تعدّله يدوياً
const ORIGIN = 'https://raw.githubusercontent.com/${REPO}/${COMMIT}/site';
const RULES = ${JSON.stringify(rules)};
const VERSION = '${COMMIT.slice(0, 12)}';
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', svg: 'image/svg+xml', txt: 'text/plain; charset=utf-8', json: 'application/json', png: 'image/png', ico: 'image/x-icon' };
const CANONICAL = 'zeenpumps.com';
const esc = s => s.replace(/[.+?^$(){}|[\\]\\\\]/g, '\\\\$&');
const match = (pat, p) => new RegExp('^' + esc(pat).replace(/\\*/g, '.*') + '$').test(p);
const SAFE = /^\\/(?:[A-Za-z0-9_-]+\\/)*[A-Za-z0-9_-]+\\.(html|css|js|svg|txt|json|png|ico)$/;

function secure(path, h) { for (const r of RULES) if (match(r.pattern, path)) for (const [k, v] of Object.entries(r.headers)) h.set(k, v); return h; }

export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (url.hostname === 'www.' + CANONICAL) { url.hostname = CANONICAL; return Response.redirect(url.toString(), 301); }
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    let path = url.pathname;
    if (path.endsWith('/')) path += 'index.html';
    else if (!/\\.[a-z]+$/.test(path)) path += '.html';
    if (!SAFE.test(path) || path.split('/').some(s => s.startsWith('_'))) return notFound(path);
    const res = await fetch(ORIGIN + path, { cf: { cacheTtl: 31536000, cacheEverything: true } });
    if (!res.ok) return notFound(path);
    const h = secure(path, new Headers({ 'Content-Type': TYPES[path.split('.').pop()] }));
    if (!h.has('Cache-Control')) h.set('Cache-Control', 'no-cache');
    const etag = '"' + VERSION + '"';   // يتغير مع كل نشر، فيعرف المتصفح أن لديه نسخة قديمة
    h.set('ETag', etag);
    if ((req.headers.get('If-None-Match') || '').includes(etag)) return new Response(null, { status: 304, headers: h });
    return new Response(req.method === 'HEAD' ? null : res.body, { headers: h });
  },
};
function notFound(path) {
  const h = secure(path, new Headers({ 'Content-Type': 'text/html; charset=utf-8' }));
  return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>404</title><p>الصفحة غير موجودة — <a href="/">الرئيسية</a></p></html>', { status: 404, headers: h });
}
`;
mkdirSync(join(ROOT, 'deploy'), { recursive: true });
writeFileSync(join(ROOT, 'deploy/edge.js'), code);
console.log(`deploy/edge.js ${(code.length / 1024).toFixed(1)} KB → ${REPO}@${COMMIT.slice(0, 7)}`);
