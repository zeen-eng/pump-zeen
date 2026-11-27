// ═══════════════════════════════════════════════════════════════
// يبني Worker واحداً يقدّم ملفات site/ مع ترويسات الأمان من site/_headers
// التشغيل: node tools/build-worker.mjs  → deploy/worker.js (يُرفع مع المستودع ليُنشر منه)
// النشر: npx wrangler deploy  (أو عبر Cloudflare API كما في docs/DEPLOY.md)
// ═══════════════════════════════════════════════════════════════
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = join(ROOT, 'site');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon',
};
const SKIP = new Set(['_headers', '_redirects']);
const walk = dir => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

// معرّف مشروع Supabase من config.js لسياسة CSP
const cfg = readFileSync(join(SITE, 'assets/js/config.js'), 'utf8');
const supaUrl = (cfg.match(/supabaseUrl:\s*'([^']*)'/) || [])[1] || '';
const supaHost = supaUrl.replace(/^https:\/\//, '').replace(/\/+$/, '');

// قراءة _headers (نفس صيغة Cloudflare Pages)
const rules = []; let cur = null;
for (const line of readFileSync(join(SITE, '_headers'), 'utf8').split('\n')) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: {} }; rules.push(cur); continue; }
  const i = line.indexOf(':');
  let v = line.slice(i + 1).trim();
  v = supaHost ? v.replace('https://YOUR-PROJECT.supabase.co', `https://${supaHost} wss://${supaHost}`) : v.replace(' https://YOUR-PROJECT.supabase.co', '');
  cur.headers[line.slice(0, i).trim()] = v;
}

const files = {};
for (const p of walk(SITE)) {
  const rel = '/' + relative(SITE, p).split('\\').join('/');
  if (SKIP.has(rel.slice(1))) continue;
  const type = TYPES[extname(p)] || 'application/octet-stream';
  const isText = type.startsWith('text/') || type.includes('svg') || type.includes('json');
  files[rel] = isText ? { type, text: readFileSync(p, 'utf8') } : { type, b64: readFileSync(p).toString('base64') };
}

const worker = `// مولَّد تلقائياً من site/ بواسطة tools/build-worker.mjs — لا تعدّله يدوياً
const FILES = ${JSON.stringify(files).replace(/</g, '\\u003c')};
const RULES = ${JSON.stringify(rules)};
const CANONICAL = 'zeenpumps.com';
const esc = s => s.replace(/[.+?^\${}()|[\\]\\\\]/g, '\\\\$&');
const match = (pat, path) => new RegExp('^' + esc(pat).replace(/\\*/g, '.*') + '$').test(path);
const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (url.hostname === 'www.' + CANONICAL) { url.hostname = CANONICAL; return Response.redirect(url.toString(), 301); }
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { return new Response('Bad Request', { status: 400 }); }
    if (path.endsWith('/')) path += 'index.html';
    if (!FILES[path] && FILES[path + '.html']) path += '.html';
    const f = FILES[path];
    const headers = new Headers();
    for (const r of RULES) if (match(r.pattern, path) || match(r.pattern, url.pathname)) for (const [k, v] of Object.entries(r.headers)) headers.set(k, v);
    if (!f) {
      headers.set('Content-Type', 'text/html; charset=utf-8');
      return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>404</title><p>الصفحة غير موجودة — <a href="/">الرئيسية</a></p></html>', { status: 404, headers });
    }
    headers.set('Content-Type', f.type);
    return new Response(req.method === 'HEAD' ? null : (f.b64 ? bytes(f.b64) : f.text), { headers });
  },
};
`;
mkdirSync(join(ROOT, 'deploy'), { recursive: true });
writeFileSync(join(ROOT, 'deploy/worker.js'), worker);
console.log(`deploy/worker.js ${(worker.length / 1024).toFixed(0)} KB, ${Object.keys(files).length} files, supabase: ${supaHost || '(not set)'}`);
