// ═══════════════════════════════════════════════════════════════
// الفحوصات الهندسية — كل فحص مستقل؛ لإضافة فحص أضف دالة إلى RULES
// كل دالة تُرجع null أو { level: ok|warn|bad, title, detail, fixes:[{label, apply(state)}] }
// ═══════════════════════════════════════════════════════════════
import { MATERIALS, DIAMETERS, VELOCITY } from '../data/materials.js';
import { PUMP_TYPES, byId } from '../data/pumps.js';
import { recommendPump, recommendDiameters, requiredLengths, fitToCurve } from './recommend.js';
import { n1, n2, n0 } from '../core/format.js';
import { t } from '../i18n/index.js';

const fixLengths = { label: t('اضبط الأطوال المطلوبة'), apply: s => { const L = requiredLengths(s, byId(s.pump.id).type); s.suction.L = L.suction; s.discharge.L = L.discharge; s.autoLength = true; } };
const fixThrottle = { label: t('اضبط صمام الخنق وقطر الدفع'), apply: s => fitToCurve(s) };
const fixPump = { label: t('طبّق المضخة الموصى بها'), apply: s => { s.pump.id = recommendPump(s, byId(s.pump.id).type); } };
const switchType = (t, label) => ({ label, apply: s => { s.pump.id = recommendPump(s, t); const L = requiredLengths(s, t); s.suction.L = L.suction; s.discharge.L = L.discharge; } });

const RULES = [
  R => R.noLift && { level: 'bad', title: t('المضخة لا تكفي للرفع'),
    detail: t('أقصى ضاغط للمضخة {0} م والرفع الساكن {1} م، فلن يصل الماء إلى الخزان العلوي.', [n1(R.C.H0), n1(R.g.Hs)]), fixes: [fixPump] },

  R => R.air && { level: 'bad', title: t('ماسورة السحب لا تصل إلى الماء'),
    detail: t('طولها {0} م والمطلوب {1} م على الأقل. المضخة ستسحب هواءً وتدور جافة فيتلف مانع التسرب.', [n1(R.s.suction.L), n1(R.g.suctionReq)]), fixes: [fixLengths] },

  R => R.dischargeShort && { level: 'bad', title: t('ماسورة الدفع قصيرة'),
    detail: t('طولها {0} م والمطلوب {1} م لتصل إلى مدخل الخزان العلوي.', [n1(R.s.discharge.L), n1(R.g.dischargeReq)]), fixes: [fixLengths] },

  R => R.tempC > R.pump.tMax && { level: 'bad', title: t('حرارة الماء فوق حد المضخة'),
    detail: t('الكتالوج يحدد حرارة السائل حتى {0}°م، والتصميم {1}°م.', [R.pump.tMax, n0(R.tempC)]), fixes: [switchType('surface', t('استخدم مضخة طرد مركزي CP (حتى 90°م)'))] },

  R => !R.noLift && !R.air && (() => {
    const k = R.q / R.D.qReq;
    return { level: k >= 1 ? 'ok' : k >= 0.8 ? 'warn' : 'bad', title: t('التدفق مقابل الطلب'),
      detail: t('نقطة التشغيل {0} م³/س، والمطلوب {1} م³/س (استهلاك {2} م³/يوم خلال {3} ساعات ضخ).', [n2(R.q), n2(R.D.qReq), n1(R.D.daily), n0(R.s.env.pumpingHours)]),
      fixes: k < 1 ? [fixPump, { label: t('زِد ساعات الضخ إلى {0}', [Math.min(24, Math.ceil(R.D.daily / Math.max(R.q, 0.1)))]), apply: s => { s.env.pumpingHours = Math.min(24, Math.ceil(R.D.daily / Math.max(R.q, 0.1))); } }] : [] };
  })(),

  R => R.runout && { level: 'bad', title: t('التشغيل بعد نهاية المنحنى المنشور'),
    detail: t('منحنى النظام يقطع منحنى المضخة بعد آخر نقطة في جدول الكتالوج (Run-out). المضخة تعمل بتدفق عالٍ وكفاءة متدنية وخطر تكهف وحمل زائد على المحرك.'),
    fixes: [fixThrottle, fixPump] },

  R => !R.noLift && !R.air && !R.runout && { level: (R.r >= 0.7 && R.r <= 1.2) ? 'ok' : (R.r >= 0.4 && R.r <= 1.6) ? 'warn' : 'bad',
    title: t('القرب من نقطة أفضل كفاءة (BEP)'),
    detail: t('التشغيل عند {0}٪ من تدفق BEP التقديري ({1} م³/س). النطاق المفضل 70–120٪ (Hydraulic Institute)؛ خارجه يزيد الاهتزاز وتآكل المحامل. BEP هنا تقديري، فاعتبر الحكم إرشادياً.', [n0(R.r * 100), n2(R.C.qBep)]),
    fixes: R.r > 1.2 ? [fixThrottle, fixPump] : R.r < 0.7 ? [fixPump] : [] },

  R => !R.sub && !R.noLift && !R.air && (() => {
    const m = R.margin;
    return { level: m >= 1 ? 'ok' : m >= 0.5 ? 'warn' : 'bad', title: t('التكهف (NPSH)'),
      detail: t('NPSH المتاح {0} م، والمطلوب ≈ {1} م (تقديري)، والهامش {2} م. يُفضَّل هامش 1 م أو أكثر.', [n2(R.npsha), n2(R.npshr), n2(m)]),
      fixes: m < 1 ? [
        { label: t('اخفض المضخة إلى الأرض'), apply: s => { s.pump.z = 0; s.pump.x = Math.min(s.pump.x, 2); } },
        { label: t('كبّر قطر السحب'), apply: s => { s.suction.d = recommendDiameters(Math.max(R.q, R.D.qReq)).suction; } },
        switchType('sub', t('استخدم مضخة غاطسة')),
      ] : [] };
  })(),

  R => !R.sub && R.pump.maxLift && { level: R.g.lift <= R.pump.maxLift ? 'ok' : 'bad', title: t('السحب مقابل حد الكتالوج'),
    detail: t('المضخة فوق سطح الماء بـ {0} م، وأقصى سحب في كتالوج {1} هو {2} م.', [n1(R.g.lift), R.pump.model, R.pump.maxLift]),
    fixes: R.g.lift > R.pump.maxLift ? [switchType('selfprime', t('استخدم ذاتية التحضين (9 م)')), switchType('sub', t('استخدم مضخة غاطسة'))] : [] },

  R => R.pump.type === 'surface' && R.g.lift > 4 && { level: 'warn', title: t('التحضين'),
    detail: t('مضخة طرد مركزي تسحب من {0} م تحتها؛ أي تسريب هواء في صمام القدم يفقدها التحضين.', [n1(R.g.lift)]),
    fixes: [switchType('selfprime', t('حوّل إلى ذاتية التحضين'))] },

  R => R.sub && { level: 'info', title: t('تبريد المحرك الغاطس'),
    detail: t('مضخات 4SR مصممة للآبار حيث يمر الماء حول المحرك. داخل خزان يجب تركيب غلاف تبريد (flow sleeve) وإلا يسخن المحرك.'), fixes: [] },

  R => R.L.s && !R.air && (() => {
    const v = R.L.s.V, lim = VELOCITY.suction;
    return { level: v <= lim.max ? 'ok' : v <= lim.hard ? 'warn' : 'bad', title: t('سرعة السحب'),
      detail: t('{0} م/ث في قطر {1} مم. الموصى به {2}–{3} م/ث.', [n2(v), R.s.suction.d, lim.min, lim.max]),
      fixes: v > lim.max ? [{ label: t('طبّق القطر الموصى به'), apply: s => { s.suction.d = recommendDiameters(R.q).suction; } }] : [] };
  })(),

  R => !R.noLift && (() => {
    const v = R.L.d.V, lim = VELOCITY.discharge;
    return { level: (v >= lim.min && v <= lim.max) ? 'ok' : 'warn', title: t('سرعة الدفع'),
      detail: t('{0} م/ث في قطر {1} مم. النطاق المناسب {2}–{3} م/ث.', [n2(v), R.s.discharge.d, lim.min, lim.max]),
      fixes: (v < lim.min || v > lim.max) ? [{ label: t('طبّق القطر الموصى به'), apply: s => { s.discharge.d = recommendDiameters(R.q).discharge; } }] : [] };
  })(),

  R => !R.sub && R.s.suction.d < R.s.discharge.d && { level: 'warn', title: t('قطر السحب أصغر من الدفع'),
    detail: t('القاعدة العملية أن يساوي قطر السحب قطر الدفع أو يزيد عليه درجة لتقليل فقد السحب.'),
    fixes: [{ label: t('ساوِ قطر السحب'), apply: s => { s.suction.d = s.discharge.d; } }] },

  R => R.q > 0 && R.s.discharge.valveK > 0 && { level: 'info', title: t('صمام الخنق'),
    detail: t('صمام البوابة على الدفع مضبوط بمعامل K = {0} ليبقى التشغيل داخل المنحنى المنشور. يُضبط عند التركيب بمقياس ضغط على مخرج المضخة حتى يقرأ ≈ {1} م ({2} بار).', [n1(R.s.discharge.valveK), n1(R.h), n2(R.h * 0.0979)]), fixes: [] },
  R => R.q > 0 && { level: 'info', title: t('قدرة المحرك'),
    detail: t('قدرة العمود عند التشغيل ≈ {0} ك.واط من {1} ك.واط (P2 في الكتالوج). الكفاءة ≈ {2}٪ (تقديرية).', [n2(R.shaftKw), R.pump.kw, n0(R.eta * 100)]), fixes: [] },

  R => R.q > 0 && { level: R.pMaxBar <= R.pnBar ? 'ok' : 'bad', title: t('الطرق المائي وضغط الماسورة'),
    detail: t('ارتفاع الضغط عند إغلاق مفاجئ ≈ {0} م (جوكوفسكي). أقصى ضغط {1} بار، وتحمّل {2} {3} بار{4}. صمام عدم رجوع زنبركي سريع الإغلاق يقلل الطرق.', [n1(R.surge), n1(R.pMaxBar), MATERIALS[R.s.discharge.mat].name, n1(R.pnBar), R.derate < 1 ? t(' بعد تخفيض الحرارة') : '']),
    fixes: R.pMaxBar > R.pnBar ? [{ label: t('حوّل الدفع إلى مجلفن'), apply: s => { s.discharge.mat = 'galv'; } }] : [] },

  R => R.pump.maxBar && R.q > 0 && R.pMaxBar > R.pump.maxBar && { level: 'warn', title: t('ضغط جسم المضخة'),
    detail: t('أقصى ضغط متوقع {0} بار وجسم {1} مصمم لـ {2} بار.', [n1(R.pMaxBar), R.pump.model, R.pump.maxBar]), fixes: [] },

  R => R.tempC > 45 && (R.s.discharge.mat === 'pvc' || (!R.sub && R.s.suction.mat === 'pvc')) && { level: 'bad', title: t('الحرارة ومادة PVC'),
    detail: t('ماء {0}°م يتجاوز حد PVC العادي (45°م).', [n0(R.tempC)]),
    fixes: [{ label: t('حوّل المواسير إلى مجلفن'), apply: s => { s.discharge.mat = 'galv'; s.suction.mat = 'galv'; } }] },

  R => { const k = R.s.roof.vol / R.D.roofRec;
    return { level: k >= 0.9 ? 'ok' : 'warn', title: t('سعة الخزان العلوي'),
      detail: t('{0} م³، والموصى به {1} م³ (نصف الاستهلاك اليومي).', [n1(R.s.roof.vol), n1(R.D.roofRec)]),
      fixes: k < 0.9 ? [{ label: t('طبّق السعة'), apply: s => { s.roof.vol = R.D.roofRec; } }] : [] }; },

  R => { const k = R.s.ground.vol / R.D.groundRec;
    return { level: k >= 0.9 ? 'ok' : 'warn', title: t('سعة الخزان الأرضي'),
      detail: t('{0} م³، والموصى به {1} م³ (استهلاك يوم كامل).', [n1(R.s.ground.vol), n1(R.D.groundRec)]),
      fixes: k < 0.9 ? [{ label: t('طبّق السعة'), apply: s => { s.ground.vol = R.D.groundRec; } }] : [] }; },
];

const ORDER = { bad: 0, warn: 1, ok: 2, info: 3 };

export function runChecks(R, s) {
  const ctx = Object.assign({}, R, { s });
  return RULES.map(f => f(ctx)).filter(Boolean).sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}

export function verdict(list) {
  const bad = list.filter(c => c.level === 'bad').length, warn = list.filter(c => c.level === 'warn').length;
  return { level: bad ? 'bad' : warn ? 'warn' : 'ok', bad, warn };
}

export { PUMP_TYPES };
