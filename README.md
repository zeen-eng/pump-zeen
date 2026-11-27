# pump.zeen

موقع لتصميم شبكة ضخ المياه للمباني: مبنى، خزان أرضي، مضخة، مواسير، خزان علوي.
يحسب نقطة التشغيل والتكهف والطرق المائي من منحنيات مضخات حقيقية (Pedrollo، 60 Hz).

- موقع ثابت (HTML + CSS + JavaScript) بدون مكتبات خارجية وبدون خطوة بناء.
- الدخول وحفظ التصاميم ولوحة الإدارة عبر **Supabase**، والحماية مفروضة في قاعدة البيانات.
- الاستضافة على **Cloudflare Workers** على zeenpumps.com، وكل `git push` يُنشر تلقائياً. الخطوات في [`docs/DEPLOY.md`](docs/DEPLOY.md).

## أين أعدّل؟

| أريد أن… | الملف |
|---|---|
| أربط الموقع بقاعدة البيانات، أغيّر مدة الخمول أو القيم الافتراضية | `site/assets/js/config.js` |
| أضيف مضخة أو أعدّل منحنى أو أضيف مصدر كتالوج | `site/assets/js/data/pumps.js` |
| أضيف مادة ماسورة، قطراً، أو أغيّر معاملات الأكواع والصمامات | `site/assets/js/data/materials.js` |
| أغيّر استهلاك المبنى (لتر/شخص/يوم) أو نسب الخزانات | `site/assets/js/data/buildings.js` |
| أعدّل معادلة الاحتكاك أو الفقد | `site/assets/js/engine/hydraulics.js` |
| أعدّل خصائص الماء (كثافة، لزوجة، ضغط بخار، ضغط جوي) | `site/assets/js/engine/water.js` |
| أعدّل طريقة قراءة منحنى المضخة أو تقدير الكفاءة وNPSHr | `site/assets/js/engine/pumpcurve.js` |
| أعدّل حساب نقطة التشغيل والطاقة والطرق المائي | `site/assets/js/engine/solve.js` |
| أضيف فحصاً هندسياً جديداً أو أعدّل نصه أو حدوده | `site/assets/js/engine/checks.js` (أضف دالة إلى `RULES`) |
| أغيّر طريقة اختيار المضخة الموصى بها | `site/assets/js/engine/recommend.js` |
| أغيّر رسم المشهد (المبنى، الخزانات، المواسير، الأبعاد) | `site/assets/js/ui/scene.js` + `site/assets/css/scene.css` |
| أغيّر لوحة الخصائص الجانبية | `site/assets/js/ui/inspector.js` |
| أغيّر نافذة اختيار المضخة أو المبنى | `site/assets/js/ui/pickers.js` |
| أغيّر المذكرة الحسابية أو المنحنى | `site/assets/js/ui/analysis.js` + `site/assets/js/ui/chart.js` |
| أغيّر الألوان والخطوط (الهوية) | `site/assets/css/tokens.css` فقط |
| أغيّر صفحة الدخول | `site/index.html` + `site/assets/js/pages/login.js` + `site/assets/css/auth.css` |
| أغيّر لوحة الإدارة | `site/admin.html` + `site/assets/js/pages/admin.js` |
| أغيّر الجداول أو الصلاحيات في قاعدة البيانات | ملف جديد في `supabase/migrations/` (لا تعدّل `001_init.sql` بعد تشغيله) |
| أغيّر ترويسات الأمان | `site/_headers` |

## الهيكل

```
site/                     ← هذا ما يُرفع إلى الاستضافة
├─ index.html             الدخول والتسجيل (عامة)
├─ app.html               المصمم (يتطلب دخول)
├─ admin.html             لوحة الإدارة (المدير فقط)
├─ catalog.html           كتالوج المضخات ومصادره (عامة)
├─ reset.html             تعيين كلمة مرور جديدة
├─ _headers               ترويسات الأمان لـ Cloudflare Pages
└─ assets/
   ├─ css/   tokens · base · app · scene · report · auth · pages
   └─ js/
      ├─ config.js        الإعدادات
      ├─ data/            بيانات: مضخات، مواد، مبانٍ
      ├─ engine/          الحسابات فقط، بدون واجهة
      ├─ core/            الحالة، التنسيق، التحقق من المدخلات
      ├─ auth/            Supabase أو حساب Claude (للمعاينة)
      ├─ storage/         حفظ التصاميم
      ├─ ui/              المشهد، المفتش، النوافذ، المنحنى
      └─ pages/           ملف لكل صفحة يربط الأجزاء
supabase/migrations/      قاعدة البيانات والصلاحيات
tests/smoke.py            اختبار كامل في متصفح حقيقي
docs/                     النشر، الأمان، مصادر الكتالوج
```

القاعدة: `engine/` لا يعرف شيئاً عن الواجهة، و`ui/` لا يحسب شيئاً، و`pages/` يربطهما. فإذا عدّلت معادلة لن تنكسر الواجهة، والعكس صحيح.

## التشغيل محلياً

```bash
cd site && python3 -m http.server 8000
# افتح http://localhost:8000
```

## الاختبار

```bash
pip install playwright && python3 -m playwright install chromium
python3 tests/smoke.py      # يحاكي Supabase، ويحفظ لقطات في tests/shots/
```
