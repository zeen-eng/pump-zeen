// ═══════════════════════════════════════════════════════════════
// إعدادات الموقع — الملف الوحيد الذي تحتاج تعديله عند النشر
// ═══════════════════════════════════════════════════════════════
export const CONFIG = {
  siteName: 'pump.zeen',

  // مزوّد تسجيل الدخول:
  //  'auto'     → Supabase على نطاقك، وحساب Claude داخل معاينة Claude
  //  'supabase' → دائماً Supabase
  //  'claude'   → دائماً حساب Claude (المعاينة فقط)
  authProvider: 'auto',

  // من لوحة Supabase: Project Settings → API
  // (المفتاح العام publishable/anon آمن للنشر؛ لا تضع هنا service_role أبداً)
  supabaseUrl: '',          // مثال: 'https://abcd1234.supabase.co'
  supabaseKey: '',          // مثال: 'sb_publishable_...'

  // إغلاق الجلسة تلقائياً بعد عدم النشاط (بالدقائق)
  idleMinutes: 20,

  // قيم افتراضية للتصميم
  defaults: {
    waterTempC: 30,
    altitudeM: 600,          // الرياض تقريباً
    pumpingHours: 4,
    tariffSarPerKwh: 0.18,   // تعرفة سكنية تقريبية؛ عدّلها حسب شريحتك
    gridHz: 60,              // شبكة الكهرباء في السعودية
  },
};
