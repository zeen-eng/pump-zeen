// ═══════════════════════════════════════════════════════════════
// مواد المواسير والأقطار والقطع
// e: الخشونة المطلقة (مم)، pn: ضغط التشغيل الاسمي (بار)، a: سرعة موجة الضغط (م/ث)
// القيم نموذجية من المراجع الهندسية الشائعة (Crane TP-410، كتب الهيدروليك)
// ═══════════════════════════════════════════════════════════════
export const MATERIALS = {
  pvc:   { name: 'PVC',         e: 0.0015, pn: 10, a: 400,  tMax: 45 },
  steel: { name: 'حديد أسود',   e: 0.045,  pn: 40, a: 1200, tMax: 120 },
  galv:  { name: 'حديد مجلفن',  e: 0.15,   pn: 25, a: 1150, tMax: 120 },
  cast:  { name: 'زهر',         e: 0.26,   pn: 16, a: 1100, tMax: 120 },
};

// تخفيض ضغط PVC مع الحرارة (معامل × PN)
export function pvcDerate(tC) {
  if (tC <= 25) return 1;
  if (tC <= 35) return 0.8;
  if (tC <= 45) return 0.63;
  return 0.5;
}

// القطر الداخلي (مم)
export const DIAMETERS = [20, 25, 32, 40, 50, 63, 75, 90, 110];

// معاملات الفقد الموضعي K
export const FITTINGS = {
  elbow90: 0.9,
  footValve: 2.5,   // صمام قدم بمصفاة
  entrance: 0.5,
  checkValve: 2.0,  // صمام عدم رجوع
  gateValve: 0.2,
  exit: 1.0,
};

// حدود السرعة الموصى بها (م/ث)
export const VELOCITY = {
  suction:   { min: 0.6, max: 1.5, hard: 2.0, design: 1.2 },
  discharge: { min: 0.6, max: 2.5, design: 1.2 },
};
