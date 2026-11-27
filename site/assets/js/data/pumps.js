// ═══════════════════════════════════════════════════════════════
// كتالوج المضخات — بيانات منشورة من الشركة المصنّعة
// لإضافة مضخة: أضف عنصراً إلى PUMPS بنفس الشكل، واذكر مصدرها في SOURCES.
// النقاط curve: [التدفق لتر/دقيقة, الضاغط متر] كما في جدول الكتالوج حرفياً.
// ═══════════════════════════════════════════════════════════════

export const SOURCES = {
  cp60: {
    title: 'Pedrollo CP 0.25–2.2 kW — Datasheet 60 Hz',
    url: 'https://www.pedrollo.com/wp-content/uploads/schede-tecniche/EN/CP_EN-datasheet_60Hz.pdf',
    publisher: 'Pedrollo S.p.A. — الموقع الرسمي',
    hz: 60, rpm: 3450,
    notes: 'الجدول عند HS = 0 م، وتفاوت المنحنيات حسب EN ISO 9906 Grade 3B. أقصى سحب مانومتري 7 م. ضغط الجسم 6 بار للموديلات 600–620 و10 بار للموديلات 650–670. حرارة السائل −10 إلى +90°م.',
  },
  jsw2_60: {
    title: 'Pedrollo JSW2 — Catálogo general 60 Hz (ص 104–105)',
    url: 'https://cdn.shopify.com/s/files/1/0604/8697/5686/files/JSW2-60Hz-ES.pdf',
    publisher: 'صفحة من كتالوج Pedrollo العام 60 Hz منشورة لدى موزّع',
    hz: 60, rpm: 3450,
    notes: 'مضخات JET ذاتية التحضين. أقصى سحب 9 م (HS). حرارة السائل حتى +40°م. أقصى ضغط في الجسم 6 بار.',
  },
  sr4_60: {
    title: 'Pedrollo 4SR-S 4" submersible — Datasheet 60 Hz',
    url: 'https://www.pedrollo.com/wp-content/uploads/schede-tecniche/EN/4SR_EN-datasheet_60Hz.pdf',
    publisher: 'Pedrollo S.p.A. — الموقع الرسمي',
    hz: 60, rpm: 3450,
    notes: 'مضخة آبار 4 بوصة. حرارة السائل حتى +40°م، رمل حتى 200 غ/م³. عند تركيبها في خزان (لا بئر) يلزم غلاف تبريد (flow sleeve) ليمر الماء على المحرك.',
  },
};

// type: surface | selfprime | sub
// qBep (اختياري، م³/س): تدفق أفضل كفاءة إن عُرف. في 4SR الرقم قبل G هو التدفق عند أفضل كفاءة بالغالون الأمريكي/دقيقة (25G ≈ 5.68 م³/س)
// maxLift: أقصى سحب مانومتري من الكتالوج (م)، maxBar: أقصى ضغط للجسم، tMax: أقصى حرارة سائل
export const PUMPS = [
  // ── سطحية طرد مركزي — Pedrollo CP، 60 Hz ──
  { id: 'cpm600', model: 'CPm 600', type: 'surface', kw: 0.37, src: 'cp60', maxLift: 7, maxBar: 6, tMax: 90, ports: '1" × 1"',
    curve: [[0,22],[10,21],[20,20],[40,18],[60,15],[80,11]] },
  { id: 'cpm610', model: 'CPm 610', type: 'surface', kw: 0.60, src: 'cp60', maxLift: 7, maxBar: 6, tMax: 90, ports: '1" × 1"',
    curve: [[0,28.5],[10,28],[20,27],[40,25],[60,22],[80,19],[90,17]] },
  { id: 'cpm620', model: 'CPm 620', type: 'surface', kw: 0.75, src: 'cp60', maxLift: 7, maxBar: 6, tMax: 90, ports: '1" × 1"',
    curve: [[0,35],[10,34],[20,33],[40,31],[60,28.5],[80,25.5],[90,23.5],[100,21]] },
  { id: 'cpm650', model: 'CPm 650', type: 'surface', kw: 1.1, src: 'cp60', maxLift: 7, maxBar: 10, tMax: 90, ports: '1¼" × 1"',
    curve: [[0,40],[20,39],[40,38],[60,36],[80,33.1],[90,31.2],[100,28.8],[110,26]] },
  { id: 'cpm660', model: 'CPm 660', type: 'surface', kw: 1.5, src: 'cp60', maxLift: 7, maxBar: 10, tMax: 90, ports: '1¼" × 1"',
    curve: [[0,48],[20,47.5],[40,46],[60,44],[80,41],[90,39.5],[100,37.5],[110,35],[120,32]] },
  { id: 'cpm670', model: 'CPm 670', type: 'surface', kw: 2.2, src: 'cp60', maxLift: 7, maxBar: 10, tMax: 90, ports: '1¼" × 1"',
    curve: [[0,56],[20,55.5],[40,54.5],[60,52.5],[80,50],[90,48.5],[100,46.5],[110,44],[120,41.5],[130,38]] },

  // ── ذاتية التحضين JET — Pedrollo JSW2، 60 Hz ──
  { id: 'jswm2c', model: 'JSWm 2C', type: 'selfprime', kw: 0.75, src: 'jsw2_60', maxLift: 9, maxBar: 6, tMax: 40, ports: '1" × 1"',
    curve: [[0,50],[5,47],[10,44],[20,38.5],[25,36],[30,34],[40,29.5],[45,27.5],[50,26],[60,22.5],[70,20]] },
  { id: 'jswm2b', model: 'JSWm 2B', type: 'selfprime', kw: 0.90, src: 'jsw2_60', maxLift: 9, maxBar: 6, tMax: 40, ports: '1" × 1"',
    curve: [[0,58],[5,55],[10,52],[20,46.5],[25,43.5],[30,41],[40,36.5],[45,34],[50,32],[60,28],[70,25]] },
  { id: 'jswm2a', model: 'JSWm 2A', type: 'selfprime', kw: 1.1, src: 'jsw2_60', maxLift: 9, maxBar: 6, tMax: 40, ports: '1" × 1"',
    curve: [[0,64],[5,61],[10,57.5],[20,51.5],[25,49],[30,46],[40,41],[45,38.5],[50,36],[60,32],[70,29]] },

  // ── غاطسة 4" — Pedrollo 4SR-S، 60 Hz ──
  { id: '4sr25g5', qBep: 5.68, model: '4SRm 25G/5-S', type: 'sub', kw: 0.37, src: 'sr4_60', stages: 3, maxBar: null, tMax: 40, ports: '1¼" NPT',
    curve: [[0,34.5],[20,33.5],[40,32],[60,29.5],[80,25.4],[100,19.8],[120,13],[130,9]] },
  { id: '4sr13g5', qBep: 2.95, model: '4SRm 13G/5-S', type: 'sub', kw: 0.37, src: 'sr4_60', stages: 5, maxBar: null, tMax: 40, ports: '1¼" NPT',
    curve: [[0,58.5],[10,55],[20,52.5],[30,49.5],[40,46],[50,41],[60,34],[70,26],[75,21.5]] },
  { id: '4sr25g7', qBep: 5.68, model: '4SRm 25G/7-S', type: 'sub', kw: 0.55, src: 'sr4_60', stages: 5, maxBar: null, tMax: 40, ports: '1¼" NPT',
    curve: [[0,58],[20,56],[40,53.5],[60,49],[80,42.5],[100,33],[120,21.6],[130,15.5]] },
  { id: '4sr25g10', qBep: 5.68, model: '4SRm 25G/10-S', type: 'sub', kw: 0.75, src: 'sr4_60', stages: 6, maxBar: null, tMax: 40, ports: '1¼" NPT',
    curve: [[0,69.5],[20,67],[40,64],[60,59],[80,51],[100,39.5],[120,26],[130,18.5]] },
  { id: '4sr13g7', qBep: 2.95, model: '4SRm 13G/7-S', type: 'sub', kw: 0.55, src: 'sr4_60', stages: 7, maxBar: null, tMax: 40, ports: '1¼" NPT',
    curve: [[0,82],[10,77],[20,74],[30,69.5],[40,64.5],[50,57.5],[60,48],[70,36.5],[75,30]] },
  { id: '4sr25g15', qBep: 5.68, model: '4SRm 25G/15-S', type: 'sub', kw: 1.1, src: 'sr4_60', stages: 8, maxBar: null, tMax: 40, ports: '1¼" NPT',
    curve: [[0,92],[20,90],[40,85],[60,78],[80,67.5],[100,53],[120,34.5],[130,24.5]] },
];

export const PUMP_TYPES = {
  surface:   { name: 'سطحية',          note: 'طرد مركزي فوق الأرض. تحتاج صمام قدم يبقيها ممتلئة، وأقصى سحب في الكتالوج 7 م.' },
  selfprime: { name: 'ذاتية التحضين',  note: 'نوع JET يطرد الهواء وحده، يسحب حتى 9 م. تدفق أقل من الطرد المركزي بنفس القدرة.' },
  sub:       { name: 'غاطسة',          note: 'تُركَّب داخل الخزان فلا سحب ولا تكهف. في الخزان تحتاج غلاف تبريد للمحرك.' },
};

export const byId = id => PUMPS.find(p => p.id === id);
export const ofType = t => PUMPS.filter(p => p.type === t);
