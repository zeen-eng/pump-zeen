# نشر pump.zeen على zeenpumps.com

الكود في GitHub: `zeen-eng/pump-zeen`، والموقع يُنشر على Cloudflare Workers، والدخول والحفظ في Supabase.

```
تعديل في site/  →  git push  →  Cloudflare يبني tools/build-worker.mjs وينشر تلقائياً  →  zeenpumps.com
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

## 2) الاستضافة: Cloudflare Workers + GitHub (مرة واحدة)

1. dash.cloudflare.com → **Workers & Pages → Create → Import a repository**.
2. اربط GitHub واختر `zeen-eng/pump-zeen`.
3. الإعدادات:
   - Project name: `pump-zeen`
   - Build command: `node tools/build-worker.mjs`
   - Deploy command: `npx wrangler deploy`
4. **Deploy**. بعدها كل `git push` إلى `main` يُنشر تلقائياً.

## 3) النطاق

Worker `pump-zeen` → **Settings → Domains & Routes → Add → Custom domain**: أضف `zeenpumps.com` ثم `www.zeenpumps.com` (يُحوَّل تلقائياً إلى الأصل).
وفي النطاق: **SSL/TLS → Full (strict)**، و**Edge Certificates → Always Use HTTPS + HSTS**.

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
