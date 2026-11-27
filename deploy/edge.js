// مولَّد بواسطة tools/build-edge.mjs — لا تعدّله يدوياً
const ORIGIN = 'https://raw.githubusercontent.com/zeen-eng/pump-zeen/632184b09321dca0859ef085983ce64bd9ef70f0/site';
const RULES = [{"pattern":"/*","headers":{"Content-Security-Policy":"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://rmuwprafvgqwemohrcce.supabase.co; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'; upgrade-insecure-requests","Strict-Transport-Security":"max-age=63072000; includeSubDomains; preload","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","Permissions-Policy":"camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()","Cross-Origin-Opener-Policy":"same-origin","Cross-Origin-Resource-Policy":"same-origin"}},{"pattern":"/admin*","headers":{"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}},{"pattern":"/app*","headers":{"Cache-Control":"no-store"}},{"pattern":"/assets/*","headers":{"Cache-Control":"public, max-age=3600"}}];
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', svg: 'image/svg+xml', txt: 'text/plain; charset=utf-8', json: 'application/json', png: 'image/png', ico: 'image/x-icon' };
const CANONICAL = 'zeenpumps.com';
const esc = s => s.replace(/[.+?^$(){}|[\]\\]/g, '\\$&');
const match = (pat, p) => new RegExp('^' + esc(pat).replace(/\*/g, '.*') + '$').test(p);
const SAFE = /^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(html|css|js|svg|txt|json|png|ico)$/;

function secure(path, h) { for (const r of RULES) if (match(r.pattern, path)) for (const [k, v] of Object.entries(r.headers)) h.set(k, v); return h; }

export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (url.hostname === 'www.' + CANONICAL) { url.hostname = CANONICAL; return Response.redirect(url.toString(), 301); }
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    let path = url.pathname;
    if (path.endsWith('/')) path += 'index.html';
    else if (!/\.[a-z]+$/.test(path)) path += '.html';
    if (!SAFE.test(path) || path.split('/').some(s => s.startsWith('_'))) return notFound(path);
    const res = await fetch(ORIGIN + path, { cf: { cacheTtl: 31536000, cacheEverything: true } });
    if (!res.ok) return notFound(path);
    const h = secure(path, new Headers({ 'Content-Type': TYPES[path.split('.').pop()] }));
    if (!h.has('Cache-Control')) h.set('Cache-Control', 'public, max-age=300');
    return new Response(req.method === 'HEAD' ? null : res.body, { headers: h });
  },
};
function notFound(path) {
  const h = secure(path, new Headers({ 'Content-Type': 'text/html; charset=utf-8' }));
  return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>404</title><p>الصفحة غير موجودة — <a href="/">الرئيسية</a></p></html>', { status: 404, headers: h });
}
