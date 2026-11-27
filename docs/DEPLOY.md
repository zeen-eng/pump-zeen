# نشر pump.zeen على zeenpumps.com

الكود في GitHub: `zeen-eng/pump-zeen`، والموقع يُنشر على Cloudflare Workers، والدخول والحفظ في Supabase.

```
تعديل في site/  →  git push  →  بناء deploy/edge.js بالـ commit الجديد ورفعه إلى Worker «pump-zeen»  →  zeenpumps.com
```

---

## 1) قاعدة البيانات: Supabase

1. supabase.com → **New project** → الاسم `pump-zeen` → المنطقة **South Asia (Mumbai)** → احفظ كلمة مرور قاعدة البيانات.
2. **SQL Editor**: شغّل `supabase/migrations/001_init.sql` كاملاً.
3. حدّد بريد المدير (لا يُحفظ في المستودع لأنه عام):
   ```sql
   update public.app_settings set admin_email = 'بريد-المدير' where id = 1;
   ```
4. **Project Settings → API**: انسخ `Project URL` والمفتاح `publishable` إلى `site/assets/js/config.js`. لا تضع `service_role` أبداً.
5. **Authentication → Sign In / Providers → Email**: فعّل **Confirm email**، الحد الأدنى لكلمة المرور 10، ومتطلبات: حروف وأرقام.
6. **Authentication → URL Configuration**:
   - Site URL: `https://zeenpumps.com`
   - Redirect URLs: `https://zeenpumps.com/**`

## 2) الاستضافة: Cloudflare Worker «pump-zeen» (جاهز)

الـ Worker يقدّم ملفات `site/` من GitHub مثبتةً على commit محدد، مع ترويسات الأمان من `site/_headers`.
ملفه مولَّد في `deploy/edge.js`.

**لنشر أي تعديل:**
```bash
git push                                   # ارفع التعديل
node tools/build-edge.mjs $(git rev-parse HEAD)   # ثبّت الـ Worker على الـ commit الجديد
# ثم ارفع deploy/edge.js إلى Worker «pump-zeen» (Claude يفعل ذلك، أو: npx wrangler deploy deploy/edge.js --name pump-zeen)
```
المستودع يجب أن يبقى **عاماً** لهذه الطريقة. إن جعلته خاصاً فاستخدم بدلاً منها `node tools/build-worker.mjs` (يحزم الموقع كاملاً في `deploy/worker.js`) واربط الـ Worker بـ GitHub من لوحة Cloudflare.

## 3) النطاق

تم: `zeenpumps.com` و`www.zeenpumps.com` (يُحوَّل للأصل) مربوطان بالـ Worker، وSSL على Full (strict)، وHTTPS إجباري، وTLS 1.2 كحد أدنى.

## 4) حماية إضافية لصفحة الإدارة (اختياري)

**Zero Trust → Access → Applications → Self-hosted** → الدومين `zeenpumps.com` والمسار `admin.html` → سياسة Allow لبريد المدير فقط.
الصفحة لا تعرض بيانات لغير المدير أصلاً (قاعدة البيانات ترفض)، وهذه طبقة تخفي الصفحة نفسها.

## 5) بعد النشر

- [ ] سجّل حساب المدير أولاً وتأكد من ظهور رابط «الإدارة».
- [ ] إن أردت الموقع خاصاً: أطفئ «السماح بحسابات جديدة» من لوحة الإدارة.
- [ ] Supabase → Advisors → Security: لا تحذيرات حرجة.
- [ ] افحص النطاق في securityheaders.com.
- [ ] فعّل التحقق بخطوتين في GitHub وCloudflare وSupabase.

## التعديل لاحقاً

عدّل الملفات في `site/` (الجدول في `README.md` يدلك على الملف)، ثم `git push`. لا تعدّل `deploy/worker.js` يدوياً؛ يُولَّد من `site/`.
