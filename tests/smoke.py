"""
اختبار شامل للموقع في متصفح حقيقي مع خادم Supabase وهمي.
التشغيل:  python3 tests/smoke.py   (يحتاج playwright و Chrome)
يحفظ لقطات الشاشة في tests/shots/
"""
import asyncio, json, os, re, subprocess, sys, time, uuid
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
SHOTS = os.path.join(ROOT, 'tests', 'shots')
PORT = 8765
BASE = f'http://127.0.0.1:{PORT}/'
SUPA = 'https://test.supabase.co'
os.makedirs(SHOTS, exist_ok=True)
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')

class FakeSupabase:
    def __init__(self, admin=True):
        self.designs = {}; self.admin = admin; self.user = {'id': 'u-1', 'email': 'eng@example.com', 'user_metadata': {'full_name': 'م. زين'}}
    def tok(self):
        return {'access_token': 'AT', 'refresh_token': 'RT', 'expires_in': 3600, 'user': self.user}
    async def handle(self, route):
        req = route.request; url = req.url; m = req.method
        body = json.loads(req.post_data) if req.post_data else {}
        def ok(data, status=200):
            return route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
        if '/auth/v1/token' in url:
            if body.get('password') == 'wrong': return await ok({'error_code': 'invalid_credentials'}, 400)
            return await ok(self.tok())
        if '/auth/v1/signup' in url: return await ok({'id': 'u-9', 'email': body.get('email')})   # تأكيد البريد مطلوب
        if '/auth/v1/resend' in url: return await ok({})
        if '/auth/v1/logout' in url: return await route.fulfill(status=204, body='')
        if '/auth/v1/recover' in url: return await ok({})
        if '/rpc/is_admin' in url: return await ok(self.admin)
        if '/rpc/admin_overview' in url: return await ok({'users': 3, 'designs': len(self.designs), 'active7': 2, 'new7': 1, 'signups_open': True})
        if '/rpc/admin_users' in url: return await ok([{'id': 'u-1', 'email': 'eng@example.com', 'full_name': 'م. زين', 'role': 'admin', 'created_at': '2026-11-20T10:00:00Z', 'last_sign_in_at': '2026-11-27T06:00:00Z', 'confirmed': True, 'designs': 2},
                                                      {'id': 'u-2', 'email': 'x@example.com', 'full_name': '<img src=x onerror=alert(1)>', 'role': 'user', 'created_at': '2026-11-21T10:00:00Z', 'last_sign_in_at': None, 'confirmed': False, 'designs': 0}])
        if '/rpc/admin_auth_log' in url: return await ok([{'at': '2026-11-27T06:00:00Z', 'email': 'eng@example.com', 'action': 'login', 'ip': '1.2.3.4'}])
        if '/rpc/admin_designs' in url: return await ok([{'id': k, 'name': v['name'], 'owner_email': 'eng@example.com', 'updated_at': '2026-11-27T06:00:00Z'} for k, v in self.designs.items()])
        if '/rpc/' in url: return await ok(None)
        if '/rest/v1/designs' in url:
            if m == 'POST':
                i = str(uuid.uuid4()); self.designs[i] = {'name': body['name'], 'data': body['data']}
                return await ok([{'id': i}], 201)
            if m == 'GET':
                mm = re.search(r'id=eq\.([\w-]+)', url)
                if mm: return await ok([{'data': self.designs[mm.group(1)]['data']}])
                return await ok([{'id': k, 'name': v['name'], 'updated_at': '2026-11-27T06:00:00Z'} for k, v in self.designs.items()])
            if m == 'PATCH':
                i = re.search(r'id=eq\.([\w-]+)', url).group(1); self.designs[i].update(body); return await route.fulfill(status=204, body='')
            if m == 'DELETE':
                i = re.search(r'id=eq\.([\w-]+)', url).group(1); self.designs.pop(i, None); return await route.fulfill(status=204, body='')
        return await ok({}, 404)

async def page_with(browser, vp, dark, fake):
    ctx = await browser.new_context(viewport=vp, color_scheme='dark' if dark else 'light')
    # English is the default: check a fresh visitor first, then run the rest in Arabic
    fresh = await ctx.new_page(); await fresh.goto(BASE + 'index.html'); await fresh.wait_for_timeout(300)
    assert await fresh.evaluate("document.documentElement.lang") == 'en', 'English default'
    assert await fresh.is_visible('.lang-switch button[lang=ar]'), 'language switch visible on first page'
    await fresh.close()
    await ctx.add_init_script("try{if(!localStorage.getItem('pz.lang'))localStorage.setItem('pz.lang','ar')}catch(e){}")
    page = await ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    page.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('console: ' + m.text))
    async def cfg(route):
        src = open(os.path.join(SITE, 'assets/js/config.js'), encoding='utf-8').read()
        src = re.sub(r"supabaseUrl: '[^']*'", f"supabaseUrl: '{SUPA}'", src)
        src = re.sub(r"supabaseKey: '[^']*'", "supabaseKey: 'sb_publishable_test'", src)
        await route.fulfill(content_type='text/javascript', body=src)
    await page.route('**/assets/js/config.js', cfg)
    await page.route(SUPA + '/**', fake.handle)
    await page.route('https://fonts.*/**', lambda r: r.abort())
    return ctx, page, errs

async def run(browser, name, vp, dark):
    fake = FakeSupabase()
    ctx, page, errs = await page_with(browser, vp, dark, fake)
    shot = lambda n: page.screenshot(path=os.path.join(SHOTS, f'{name}-{n}.png'))
    await page.goto(BASE + 'index.html'); await page.wait_for_timeout(300); await shot('01-login')
    # التسجيل → شاشة «تحقق من بريدك»
    await page.click('[data-tab=up]'); await shot('01b-signup')
    await page.fill('#upName', 'زين'); await page.fill('#upEmail', 'new@gmail.com'); await page.fill('#upPass', 'abc12345678')
    await page.click('#fUp [type=submit]'); await page.wait_for_timeout(1600)
    assert await page.is_visible('#sent'), 'sent panel'
    assert 'new@gmail.com' in await page.inner_text('#sentTo')
    assert await page.is_visible('#openMail'), 'gmail shortcut'
    await shot('01c-sent')
    await page.click('#toSignIn')
    await page.fill('#inEmail', 'eng@example.com'); await page.fill('#inPass', 'wrong'); await page.click('#fIn [type=submit]')
    await page.wait_for_timeout(200); assert 'غير صحيحة' in await page.inner_text('#msg'), 'wrong-password message'
    await page.fill('#inPass', 'correct-pass-1'); await page.click('#fIn [type=submit]')
    await page.wait_for_url('**/app.html'); await page.wait_for_timeout(300); await shot('02-empty')
    await page.click('[data-act=addBuilding]'); await page.click('.dialog .btn >> nth=0'); await page.wait_for_timeout(100)
    await page.click('[data-act=addRoof]'); await page.click('[data-act=addGround]'); await shot('03-tanks')
    await page.click('[data-act=addPump]'); await page.wait_for_timeout(200); await shot('04-pumps')
    await page.click('.pump-table tr.rec'); await page.wait_for_timeout(100)
    await page.click('#run'); await page.wait_for_timeout(700); await shot('05a-priming')
    await page.wait_for_timeout(2600); await shot('05-running')
    lv = await page.evaluate("document.getElementById('roofWater').style.transform"); print(name, 'roof level transform:', lv)
    status = await page.inner_text('#statusMsg'); print(name, 'running:', status)
    await page.click('#run')
    await page.click('.hot[data-act=discharge]'); await page.fill('.inspector input[type=number] >> nth=0', '4'); await page.press('.inspector input[type=number] >> nth=0', 'Tab')
    await page.click('#run'); await page.wait_for_timeout(700); await shot('06-leak'); print(name, 'leak:', await page.inner_text('#statusMsg')); await page.click('#run')
    # اللغة: التبديل إلى الإنجليزية يحفظ التصميم ويعيد التحميل
    await page.click('.lang-btn'); await page.wait_for_load_state('load'); await page.wait_for_timeout(900)
    print(name, 'EN status:', await page.inner_text('#statusMsg'), '| pump:', await page.inner_text('#tbPump'))
    ar = await page.evaluate(r"document.body.innerText.split('\n').filter(l => /[\u0600-\u06FF]/.test(l))")
    print(name, 'Arabic left in EN UI:', ar[:8])
    await shot('06b-english')
    await page.click('#analyze'); await page.wait_for_timeout(300); await shot('06c-english-memo')
    ar2 = await page.evaluate(r"document.querySelector('.dialog').innerText.split('\n').filter(l => /[\u0600-\u06FF]/.test(l))"); print(name, 'Arabic left in EN memo:', ar2[:5])
    await page.click('.x-btn')
    await page.click('.lang-btn'); await page.wait_for_load_state('load'); await page.wait_for_timeout(900)
    await page.click('#analyze'); await page.wait_for_timeout(200); await shot('07-memo')
    await page.click('.checks .fixes .btn >> nth=0'); await page.wait_for_timeout(200)
    await page.click('.x-btn'); print(name, 'after fix:', await page.inner_text('#statusMsg'))
    await page.click('#analyze'); await page.wait_for_timeout(200)
    await page.screenshot(path=os.path.join(SHOTS, f'{name}-08-memo-full.png'), full_page=True); await page.click('.x-btn')
    for t in [1, 2]:
        await page.click('.hot[data-act=building]'); await page.click(f'.inspector .seg button >> nth={t}'); await page.wait_for_timeout(100); await shot(f'09-bld{t}')
    await page.fill('#projName', 'فيلا الاختبار')
    await page.click('#savedBtn'); await page.click('.dialog .btn.primary'); await page.wait_for_timeout(200)
    await page.click('#savedBtn'); await page.wait_for_timeout(300); n = await page.locator('.dialog .btn.sm:has-text("فتح")').count(); print(name, 'saved:', n)
    await page.click('.dialog .btn.sm:has-text("فتح")'); await page.wait_for_timeout(200)
    await page.click('#adminLink'); await page.wait_for_url('**/admin.html'); await page.wait_for_timeout(400); await shot('10-admin')
    assert await page.locator('#users img').count() == 0, 'XSS in admin table'
    await page.goto(BASE + 'catalog.html'); await page.wait_for_timeout(200); await shot('11-catalog')
    await page.goto(BASE + 'reset.html#access_token=abc&type=recovery'); await page.wait_for_timeout(200)
    assert 'access_token' not in page.url, 'token left in URL'
    await page.goto(BASE + 'app.html'); await page.wait_for_timeout(300); await page.click('#outBtn'); await page.wait_for_url('**/index.html*'); print(name, 'logout:', await page.inner_text('#msg'))
    await page.goto(BASE + 'admin.html'); await page.wait_for_timeout(500); print(name, 'admin after logout ->', page.url.split('/')[-1])
    print(name, 'errors:', errs)
    await ctx.close()
    return errs

async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=CHROME)
            e1 = await run(b, 'desk', {'width': 1360, 'height': 860}, False)
            e2 = await run(b, 'mob', {'width': 390, 'height': 844}, True)
            await b.close()
        sys.exit(1 if (e1 or e2) else 0)
    finally:
        srv.terminate()

asyncio.run(main())
