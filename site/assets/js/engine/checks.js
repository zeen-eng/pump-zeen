// ═══════════════════════════════════════════════════════════════
// الفحوصات الهندسية — كل فحص مستقل؛ لإضافة فحص أضف دالة إلى RULES
// كل دالة تُرجع null أو { level: ok|warn|bad, title, detail, fixes:[{label, apply(state)}] }
// ═══════════════════════════════════════════════════════════════
import { MATERIALS, DIAMETERS, VELOCITY } from '../data/materials.js';
import { PUMP_TYPES, byId } from '../data/pumps.js';
import { recommendPump, recommendDiameters, requiredLengths, fitToCurve } from './recommend.js';
import { n1, n2, n0 } from '../core/format.js';

const fixLengths = { label: 'اضبط الأطوال المطلوبة', apply: s => { const L = requiredLengths(s, byId(s.pump.id).type); s.suction.L = L.suction; s.discharge.L = L.discharge; s.autoLength = true; } };
const fixThrottle = { label: 'اضبط صمام الخنق وقطر الدفع', apply: s => fitToCurve(s) };
const fixPump = { label: 'طبّق المضخة الموصى بها', apply: s => { s.pump.id = recommendPump(s, byId(s.pump.id).type); } };
const switchType = (t, label) => ({ label, apply: s => { s.pump.id = recommendPump(s, t); const L = requiredLengths(s, t); s.suction.L = L.suction; s.discharge.L = L.discharge; } });

const RULES = [
  R => R.noLift && { level: 'bad', title: 'المضخة لا تكفي للرفع',
    detail: `أقصى ضاغط للمضخة ${n1(R.C.H0)} م والرفع الساكن ${n1(R.g.Hs)} م، فلن يصل الماء إلى الخزان العلوي.`, fixes: [fixPump] },

  R => R.air && { level: 'bad', title: 'ماسورة السحب لا تصل إلى الماء',
    detail: `طولها ${n1(R.s.suction.L)} م والمطلوب ${n1(R.g.suctionReq)} م على الأقل. المضخة ستسحب هواءً وتدور جافة فيتلف مانع التسرب.`, fixes: [fixLengths] },

  R => R.dischargeShort && { level: 'bad', title: 'ماسورة الدفع قصيرة',
    detail: `طولها ${n1(R.s.discharge.L)} م والمطلوب ${n1(R.g.dischargeReq)} م لتصل إلى مدخل الخزان العلوي.`, fixes: [fixLengths] },

  R => R.tempC > R.pump.tMax && { level: 'bad', title: 'حرارة الماء فوق حد المضخة',
    detail: `الكتالوج يحدد حرارة السائل حتى ${R.pump.tMax}°م، والتصميم ${n0(R.tempC)}°م.`, fixes: [switchType('surface', 'استخدم مضخة طرد مركزي CP (حتى 90°م)')] },

  R => !R.noLift && !R.air && (() => {
    const k = R.q / R.D.qReq;
    return { level: k >= 1 ? 'ok' : k >= 0.8 ? 'warn' : 'bad', title: 'التدفق مقابل الطلب',
      detail: `نقطة التشغيل ${n2(R.q)} م³/س، والمطلوب ${n2(R.D.qReq)} م³/س (استهلاك ${n1(R.D.daily)} م³/يوم خلال ${n0(R.s.env.pumpingHours)} ساعات ضخ).`,
      fixes: k < 1 ? [fixPump, { label: `زِد ساعات الضخ إلى ${Math.min(24, Math.ceil(R.D.daily / Math.max(R.q, 0.1)))}`, apply: s => { s.env.pumpingHours = Math.min(24, Math.ceil(R.D.daily / Math.max(R.q, 0.1))); } }] : [] };
  })(),

  R => R.runout && { level: 'bad', title: 'التشغيل بعد نهاية المنحنى المنشور',
    detail: 'منحنى النظام يقطع منحنى المضخة بعد آخر نقطة في جدول الكتالوج (Run-out). المضخة تعمل بتدفق عالٍ وكفاءة متدنية وخطر تكهف وحمل زائد على المحرك.',
    fixes: [fixThrottle, fixPump] },

  R => !R.noLift && !R.air && !R.runout && { level: (R.r >= 0.7 && R.r <= 1.2) ? 'ok' : (R.r >= 0.4 && R.r <= 1.6) ? 'warn' : 'bad',
    title: 'القرب من نقطة أفضل كفاءة (BEP)',
    detail: `التشغيل عند ${n0(R.r * 100)}٪ من تدفق BEP التقديري (${n2(R.C.qBep)} م³/س). النطاق المفضل 70–120٪ (Hydraulic Institute)؛ خارجه يزيد الاهتزاز وتآكل المحامل. BEP هنا تقديري، فاعتبر الحكم إرشادياً.`,
    fixes: R.r > 1.2 ? [fixThrottle, fixPump] : R.r < 0.7 ? [fixPump] : [] },

  R => !R.sub && !R.noLift && !R.air && (() => {
    const m = R.margin;
    return { level: m >= 1 ? 'ok' : m >= 0.5 ? 'warn' : 'bad', title: 'التكهف (NPSH)',
      detail: `NPSH المتاح ${n2(R.npsha)} م، والمطلوب ≈ ${n2(R.npshr)} م (تقديري)، والهامش ${n2(m)} م. يُفضَّل هامش 1 م أو أكثر.`,
      fixes: m < 1 ? [
        { label: 'اخفض المضخة إلى الأرض', apply: s => { s.pump.z = 0; s.pump.x = Math.min(s.pump.x, 2); } },
        { label: 'كبّر قطر السحب', apply: s => { s.suction.d = recommendDiameters(Math.max(R.q, R.D.qReq)).suction; } },
        switchType('sub', 'استخدم مضخة غاطسة'),
      ] : [] };
  })(),

  R => !R.sub && R.pump.maxLift && { level: R.g.lift <= R.pump.maxLift ? 'ok' : 'bad', title: 'السحب مقابل حد الكتالوج',
    detail: `المضخة فوق سطح الماء بـ ${n1(R.g.lift)} م، وأقصى سحب في كتالوج ${R.pump.model} هو ${R.pump.maxLift} م.`,
    fixes: R.g.lift > R.pump.maxLift ? [switchType('selfprime', 'استخدم ذاتية التحضين (9 م)'), switchType('sub', 'استخدم مضخة غاطسة')] : [] },

  R => R.pump.type === 'surface' && R.g.lift > 4 && { level: 'warn', title: 'التحضين',
    detail: `مضخة طرد مركزي تسحب من ${n1(R.g.lift)} م تحتها؛ أي تسريب هواء في صمام القدم يفقدها التحضين.`,
    fixes: [switchType('selfprime', 'حوّل إلى ذاتية التحضين')] },

  R => R.sub && { level: 'info', title: 'تبريد المحرك الغاطس',
    detail: 'مضخات 4SR مصممة للآبار حيث يمر الماء حول المحرك. داخل خزان يجب تركيب غلاف تبريد (flow sleeve) وإلا يسخن المحرك.', fixes: [] },

  R => R.L.s && !R.air && (() => {
    const v = R.L.s.V, lim = VELOCITY.suction;
    return { level: v <= lim.max ? 'ok' : v <= lim.hard ? 'warn' : 'bad', title: 'سرعة السحب',
      detail: `${n2(v)} م/ث في قطر ${R.s.suction.d} مم. الموصى به ${lim.min}–${lim.max} م/ث.`,
      fixes: v > lim.max ? [{ label: 'طبّق القطر الموصى به', apply: s => { s.suction.d = recommendDiameters(R.q).suction; } }] : [] };
  })(),

  R => !R.noLift && (() => {
    const v = R.L.d.V, lim = VELOCITY.discharge;
    return { level: (v >= lim.min && v <= lim.max) ? 'ok' : 'warn', title: 'سرعة الدفع',
      detail: `${n2(v)} م/ث في قطر ${R.s.discharge.d} مم. النطاق المناسب ${lim.min}–${lim.max} م/ث.`,
      fixes: (v < lim.min || v > lim.max) ? [{ label: 'طبّق القطر الموصى به', apply: s => { s.discharge.d = recommendDiameters(R.q).discharge; } }] : [] };
  })(),

  R => !R.sub && R.s.suction.d < R.s.discharge.d && { level: 'warn', title: 'قطر السحب أصغر من الدفع',
    detail: 'القاعدة العملية أن يساوي قطر السحب قطر الدفع أو يزيد عليه درجة لتقليل فقد السحب.',
    fixes: [{ label: 'ساوِ قطر السحب', apply: s => { s.suction.d = s.discharge.d; } }] },

  R => R.q > 0 && R.s.discharge.valveK > 0 && { level: 'info', title: 'صمام الخنق',
    detail: `صمام البوابة على الدفع مضبوط بمعامل K = ${n1(R.s.discharge.valveK)} ليبقى التشغيل داخل المنحنى المنشور. يُضبط عند التركيب بمقياس ضغط على مخرج المضخة حتى يقرأ ≈ ${n1(R.h)} م (${n2(R.h * 0.0979)} بار).`, fixes: [] },
  R => R.q > 0 && { level: 'info', title: 'قدرة المحرك',
    detail: `قدرة العمود عند التشغيل ≈ ${n2(R.shaftKw)} ك.واط من ${R.pump.kw} ك.واط (P2 في الكتالوج). الكفاءة ≈ ${n0(R.eta * 100)}٪ (تقديرية).`, fixes: [] },

  R => R.q > 0 && { level: R.pMaxBar <= R.pnBar ? 'ok' : 'bad', title: 'الطرق المائي وضغط الماسورة',
    detail: `ارتفاع الضغط عند إغلاق مفاجئ ≈ ${n1(R.surge)} م (جوكوفسكي). أقصى ضغط ${n1(R.pMaxBar)} بار، وتحمّل ${MATERIALS[R.s.discharge.mat].name} ${n1(R.pnBar)} بار${R.derate < 1 ? ' بعد تخفيض الحرارة' : ''}. صمام عدم رجوع زنبركي سريع الإغلاق يقلل الطرق.`,
    fixes: R.pMaxBar > R.pnBar ? [{ label: 'حوّل الدفع إلى مجلفن', apply: s => { s.discharge.mat = 'galv'; } }] : [] },

  R => R.pump.maxBar && R.q > 0 && R.pMaxBar > R.pump.maxBar && { level: 'warn', title: 'ضغط جسم المضخة',
    detail: `أقصى ضغط متوقع ${n1(R.pMaxBar)} بار وجسم ${R.pump.model} مصمم لـ ${R.pump.maxBar} بار.`, fixes: [] },

  R => R.tempC > 45 && (R.s.discharge.mat === 'pvc' || (!R.sub && R.s.suction.mat === 'pvc')) && { level: 'bad', title: 'الحرارة ومادة PVC',
    detail: `ماء ${n0(R.tempC)}°م يتجاوز حد PVC العادي (45°م).`,
    fixes: [{ label: 'حوّل المواسير إلى مجلفن', apply: s => { s.discharge.mat = 'galv'; s.suction.mat = 'galv'; } }] },

  R => { const k = R.s.roof.vol / R.D.roofRec;
    return { level: k >= 0.9 ? 'ok' : 'warn', title: 'سعة الخزان العلوي',
      detail: `${n1(R.s.roof.vol)} م³، والموصى به ${n1(R.D.roofRec)} م³ (نصف الاستهلاك اليومي).`,
      fixes: k < 0.9 ? [{ label: 'طبّق السعة', apply: s => { s.roof.vol = R.D.roofRec; } }] : [] }; },

  R => { const k = R.s.ground.vol / R.D.groundRec;
    return { level: k >= 0.9 ? 'ok' : 'warn', title: 'سعة الخزان الأرضي',
      detail: `${n1(R.s.ground.vol)} م³، والموصى به ${n1(R.D.groundRec)} م³ (استهلاك يوم كامل).`,
      fixes: k < 0.9 ? [{ label: 'طبّق السعة', apply: s => { s.ground.vol = R.D.groundRec; } }] : [] }; },
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
