# نشر pump.zeen على نطاقك

المجموع: نحو ساعة، وتكلفة النطاق فقط (حوالي 10.5 دولار سنوياً لنطاق ‎.com عبر Cloudflare). الاستضافة وقاعدة البيانات مجانيتان في هذا الحجم.

> ملاحظة عن الاسم: `pump.zeen` ليس نطاقاً يمكن شراؤه، لأن `.zeen` ليس امتداداً موجوداً. اختر مثلاً `pumpzeen.com` أو `zeenpump.com`.
> امتداد `.sa` يحتاج هوية سعودية أو إقامة ويُسجَّل عبر مسجّل مرخّص من SaudiNIC (القائمة في nic.sa/registrars)، وسعره أعلى بكثير.

---

## 1) قاعدة البيانات: Supabase (10 دقائق)

1. ادخل supabase.com → **New project** → الاسم `pump-zeen`، المنطقة `Mumbai (ap-south-1)` أو `Frankfurt` (الأقرب للسعودية)، واحفظ كلمة مرور قاعدة البيانات في مكان آمن.
2. بعد اكتمال الإنشاء: **SQL Editor → New query**، الصق محتوى `supabase/migrations/001_init.sql` كاملاً، ثم **Run**.
   - (اختياري) ليكون بريدك هو المدير مهما حصل، شغّل بعدها:
     `update public.app_settings set admin_email = 'بريدك@example.com' where id = 1;`
   - إن لم تفعل: **أول حساب يُسجَّل يصبح المدير**، فسجّل أنت أولاً مباشرة بعد النشر.
3. **Project Settings → API**: انسخ `Project URL` والمفتاح العام `publishable` (أو `anon`).
   ضعهما في `site/assets/js/config.js`:
   ```js
   supabaseUrl: 'https://abcd1234.supabase.co',
   supabaseKey: 'sb_publishable_...',
   ```
   لا تضع مفتاح `service_role` في الموقع أبداً.
4. في `site/_headers` استبدل `YOUR-PROJECT` بمعرّف مشروعك (الجزء قبل `.supabase.co`).
5. **Authentication → Sign In / Providers → Email**:
   - فعّل **Confirm email** (تأكيد البريد).
   - **Minimum password length** = 10، و**Password requirements** = حروف وأرقام.
   - فعّل **Leaked password protection** إن كانت متاحة في خطتك.
6. **Authentication → URL Configuration**:
   - **Site URL** = `https://نطاقك.com`
   - **Redirect URLs** = `https://نطاقك.com/reset.html` و `https://نطاقك.com/**`

## 2) الكود على GitHub (5 دقائق)

1. github.com → **New repository** → الاسم `pump-zeen` → **Private** → Create.
2. ارفع مجلد المشروع كما هو (زر **uploading an existing file** واسحب الملفات)، أو أخبرني باسم المستودع وأنا أرفع عليه وأحدّثه لك بعدها.

## 3) الاستضافة: Cloudflare Pages (10 دقائق)

1. dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → اختر `pump-zeen`.
2. الإعدادات:
   - Framework preset: **None**
   - Build command: *(فارغ)*
   - Build output directory: **`site`**
3. **Save and Deploy**. سيظهر رابط مؤقت مثل `pump-zeen.pages.dev`، جرّبه.

بعدها، أي تعديل يُرفع إلى GitHub يُنشر تلقائياً خلال دقيقة.

## 4) النطاق (15 دقيقة)

1. في Cloudflare: **Domain Registration → Register Domains** → ابحث عن الاسم وادفع.
   Cloudflare يبيع بسعر التكلفة دون زيادة عند التجديد.
2. ارجع إلى مشروع Pages → **Custom domains → Set up a custom domain** → اكتب نطاقك → **Activate**.
   بما أن النطاق في Cloudflare نفسها، تُضبط إعدادات DNS والشهادة (HTTPS) تلقائياً.
3. **SSL/TLS → Overview**: اختر **Full (strict)**. ثم **Edge Certificates**: فعّل **Always Use HTTPS** و**HSTS**.

## 5) طبقة حماية إضافية لصفحة الإدارة (اختياري، موصى به، مجاني)

حتى لو فتح شخص `admin.html` فلن يرى أي بيانات، لأن قاعدة البيانات ترفض كل طلب إداري من غير المدير.
لكن يمكنك إخفاء الصفحة نفسها عن العالم:

1. Cloudflare → **Zero Trust → Access → Applications → Add → Self-hosted**.
2. Application domain: `نطاقك.com` ، Path: `admin.html`.
3. Policy: **Allow** ← **Emails** ← بريدك فقط.
4. النتيجة: قبل فتح الصفحة يطلب Cloudflare رمزاً يُرسل إلى بريدك.

## 6) بعد النشر مباشرة

- [ ] سجّل حسابك أولاً وتأكد أن رابط «الإدارة» ظهر في الشريط العلوي.
- [ ] إن أردت موقعاً خاصاً: من لوحة الإدارة أطفئ **السماح بحسابات جديدة**.
- [ ] Supabase → **Advisors → Security Advisor**: يجب ألا تظهر تحذيرات حرجة.
- [ ] افتح `securityheaders.com` وافحص نطاقك. المتوقع درجة A أو أعلى.
