// ═══════════════════════════════════════════════════════════════
// أنواع المباني ومعدلات الاستهلاك
// rate: لتر/شخص/يوم — قيم تصميمية شائعة، عدّلها حسب كود البلدية أو المشروع
// ═══════════════════════════════════════════════════════════════
import { t } from '../i18n/index.js';
export const BUILDINGS = {
  house:   { name: t('بيت'),    rate: 200, perFloor: 5,   floors: 2, floorH: 3.2, people: t('السكان'),  desc: t('سكني — 200 لتر للفرد يومياً') },
  school:  { name: t('مدرسة'),  rate: 45,  perFloor: 120, floors: 3, floorH: 3.6, people: t('الطلاب'),  desc: t('تعليمي — 45 لتر للطالب يومياً') },
  factory: { name: t('مصنع'),   rate: 120, perFloor: 30,  floors: 2, floorH: 5.0, people: t('العمال'),  desc: t('صناعي خفيف — 120 لتر للعامل يومياً') },
};

// نسب سعة الخزانات من الاستهلاك اليومي
export const TANK_RULES = {
  roofShare: 0.5,     // العلوي = نصف يوم
  groundShare: 1.0,   // الأرضي = يوم كامل
  roofMin: 1, groundMin: 2,
  roofInletAboveRoof: 1.2, // ارتفاع مدخل الخزان العلوي فوق السطح (م)
};
