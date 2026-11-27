// ═══════════════════════════════════════════════════════════════
// المشهد: مقطع رأسي للموقع بأسلوب المخطط الهندسي، مع حركة واقعية
// • يرسم SVG فقط من الحالة ونتيجة الحساب؛ لا يغيّر شيئاً
// • ui: { selected, running, primed, fill (الخزان العلوي 0..1), ground (الأرضي 0..1) }
// • التشغيل: الماء يتقدم في السحب ثم الدفع (PRIME)، ثم ينسكب في الخزان العلوي
// • مستويات الماء تُحدَّث كل إطار عبر setLevels() دون إعادة الرسم
// النقر يمر عبر data-act ويُعالج في pages/app.js
// ═══════════════════════════════════════════════════════════════
import { BUILDINGS } from '../data/buildings.js';
import { MATERIALS } from '../data/materials.js';
import { n1, n2 } from '../core/format.js';
import { esc } from '../core/dom.js';
import { t } from '../i18n/index.js';

const W = 1000, H = 560, GY = 360;           // خط الأرض
const TANK = { x0: 70, x1: 230, y0: GY, y1: 530 };
const BW = { house: 210, school: 270, factory: 280 };
export const PRIME = { suction: 0.8, discharge: 1.3 };   // ثوانٍ: زمن امتلاء المواسير عند التشغيل
export const PRIME_TOTAL = PRIME.suction + PRIME.discharge;

const P = pts => 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
const txt = (x, y, s, cls = '', anchor = 'middle', extra = '') => `<text class="s-txt ${cls}" x="${x}" y="${y}" text-anchor="${anchor}" ${extra}>${s}</text>`;
const num = s => `<tspan class="s-num">${s}</tspan>`;
const clamp01 = v => Math.min(1, Math.max(0, v));
let prevKeys = null;   // لتحريك العناصر الجديدة عند ظهورها

function defs() {
  return `<defs>
  <pattern id="pEarth" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="9" class="s-hair"/></pattern>
  <pattern id="pConc" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1" fill="var(--ink-3)"/><circle cx="11" cy="11" r=".8" fill="var(--ink-3)"/><path d="M10 3l2 3h-4z" fill="none" stroke="var(--ink-3)" stroke-width=".6"/></pattern>
  <pattern id="pGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="var(--rule-soft)" stroke-width=".5"/></pattern>
  <linearGradient id="gWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--water)" stop-opacity=".28"/><stop offset="1" stop-color="var(--water)" stop-opacity=".5"/></linearGradient>
  <marker id="mArr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" class="s-arrow"/></marker>
  </defs>`;
}

// علامة منسوب ▽ (الأرقام LTR صريح حتى لا يقلبها اتجاه الصفحة)
function level(x, y, label, toRight = true) {
  const tx = toRight ? x + 10 : x - 10, a = toRight ? 'start' : 'end';
  return `<g><path d="M${x - 6} ${y - 9}h12l-6 9z" class="s-fill" style="stroke-width:.9"/><line x1="${x - 12}" x2="${x + 12}" y1="${y}" y2="${y}" class="s-thin"/>${txt(tx, y - 12, label, 'mute', a, 'direction="ltr"')}</g>`;
}
function dimV(x, y1, y2, label) {
  const m = (y1 + y2) / 2;
  return `<g><line x1="${x - 5}" x2="${x + 5}" y1="${y1}" y2="${y1}" class="s-dim"/><line x1="${x - 5}" x2="${x + 5}" y1="${y2}" y2="${y2}" class="s-dim"/>
  <line x1="${x}" x2="${x}" y1="${y1}" y2="${y2}" class="s-dim" marker-start="url(#mArr)" marker-end="url(#mArr)"/>
  <rect x="${x - 9}" y="${m - 38}" width="18" height="76" class="s-tagbg"/>${txt(x, m, num(label), 'mute', 'middle', `transform="rotate(-90 ${x} ${m})" dominant-baseline="middle"`)}</g>`;
}
function slot(x, y, w, h, label, act, next) {
  return `<g class="slot${next ? ' next' : ''}" data-act="${act}" tabindex="0" role="button" aria-label="${label}">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/><path class="plus" d="M${x + w / 2 - 8} ${y + h / 2 - 12}h16M${x + w / 2} ${y + h / 2 - 20}v16"/>
  ${txt(x + w / 2, y + h / 2 + 18, label)}</g>`;
}

// جسم ماء بسطح متموج؛ يتحرك رأسياً حسب المستوى (data-h = الارتفاع الكامل)
function waterBody(id, x, y, w, h, lvl, stir, extra = '') {
  const per = 24, amp = stir ? 2.2 : 1.2, x0 = x - per * 2, x1 = x + w + per * 2;
  let top = `M${x0} ${y}`;
  for (let xx = x0; xx < x1; xx += per) top += ` q${per / 4} ${-amp} ${per / 2} 0 t${per / 2} 0`;
  const shape = `${top} V${y + h + 6} H${x0} Z`;
  return `<clipPath id="c-${id}"><rect x="${x}" y="${y - 6}" width="${w}" height="${h + 6}"/></clipPath>
  <g clip-path="url(#c-${id})"><g id="${id}" class="water-body" data-h="${h}" style="transform:translateY(${((1 - clamp01(lvl)) * h).toFixed(1)}px)">
    <g class="wave${stir ? ' stir' : ''}"><path d="${shape}" fill="url(#gWater)"/><path d="${top}" class="s-wline"/></g>${extra}</g></g>`;
}

// تحديث مستويات الماء دون إعادة رسم (يُستدعى كل إطار أثناء التشغيل)
export function setLevels(svg, { fill, ground }) {
  for (const [id, v] of [['roofWater', fill], ['groundWater', ground]]) {
    const g = svg.querySelector('#' + id);
    if (g && v != null) g.style.transform = `translateY(${((1 - clamp01(v)) * +g.dataset.h).toFixed(1)}px)`;
  }
}

function building(s, sel, appear) {
  const B = s.building, w = BW[B.type], x0 = W - 90 - w, x1 = x0 + w;
  const fpx = Math.min(48, 240 / B.floors), h = B.floors * fpx, top = GY - h;
  const bays = B.type === 'house' ? 3 : B.type === 'school' ? 5 : 4;
  let o = `<g class="hot${sel === 'building' ? ' is-sel' : ''}${appear}" data-act="building" tabindex="0" role="button" aria-label="${t('المبنى')}">`;
  o += `<rect x="${x0}" y="${top}" width="${w}" height="${h}" class="s-fill"/>`;
  for (let f = 0; f < B.floors; f++) {
    const yb = GY - f * fpx, yt = yb - fpx;
    o += `<rect x="${x0 - 3}" y="${yt}" width="${w + 6}" height="4" class="s-slab"/>`;
    for (let c = 0; c < bays; c++) {
      const bw = w / bays, wx = x0 + c * bw + bw * 0.2, ww = bw * 0.6;
      if (f === 0 && c === Math.floor(bays / 2)) { o += `<rect x="${wx + ww * 0.2}" y="${yb - fpx * 0.72}" width="${ww * 0.6}" height="${fpx * 0.72}" class="s-win"/>`; continue; }
      o += `<rect x="${wx}" y="${yt + fpx * 0.3}" width="${ww}" height="${fpx * 0.42}" class="s-win"/><line x1="${wx + ww / 2}" x2="${wx + ww / 2}" y1="${yt + fpx * 0.3}" y2="${yt + fpx * 0.72}" class="s-hair"/>`;
    }
  }
  if (B.type === 'factory') { for (let i = 0; i < 4; i++) o += `<path d="M${x0 + i * w / 4} ${top}l${w / 4} -22v22" class="s-thin"/>`; o += `<rect x="${x1 - 34}" y="${top - 70}" width="16" height="70" class="s-fill"/>`; }
  if (B.type === 'school') o += `<line x1="${x0 + 18}" x2="${x0 + 18}" y1="${top}" y2="${top - 46}" class="s-thin"/><path d="M${x0 + 18} ${top - 46}h22v12h-22" class="s-fill flag"/>`;
  o += `<rect x="${x0 - 3}" y="${top - 10}" width="${w + 6}" height="10" class="s-fill"/></g>`;
  for (let f = 1; f <= B.floors; f++) if (B.floors <= 8 || f % 2 === 0 || f === B.floors) o += level(x1 + 14, GY - f * fpx, '+' + n2(f * B.floorH));
  return { o, x0, x1, top };
}

// ماسورة: جدار + قلب + ماء (يتقدم عند التشغيل) + خطوط جريان
function pipe(pts, frac, key, p, water, sel) {
  const pts2 = cutPath(pts, frac), d = P(pts2), w = 3 + p.d / 14;
  const mid = labelPoint(pts2);
  const lab = t('{0} · {1} Ø{2} · L {3} م', [key === 'suction' ? t('سحب') : t('دفع'), esc(MATERIALS[p.mat].name), p.d, n1(p.L)]);
  const tw = lab.length * 6.3 + 18;
  let wet = '';
  if (water) {
    let wp = water.cut ? cutPath(pts2, water.cut) : pts2;
    if (water.reverse) wp = wp.slice().reverse();   // يتقدم الماء من نهاية الماسورة (السحب: من الخزان إلى المضخة)
    const wd = P(wp);
    const prime = water.prime ? `style="animation-duration:${water.prime[1]}s;animation-delay:${water.prime[0]}s"` : '';
    wet = `<path d="${wd}" pathLength="100" class="pipe-water${water.prime ? ' priming' : ''}" stroke-width="${Math.max(1.6, w - 2)}" ${prime}/>`;
    if (water.flow) wet += `<path d="${water.reverse ? P(pts2.slice().reverse()) : d}" class="pipe-flow" stroke-width="${Math.max(1.2, w - 4)}" style="animation-duration:${water.flow.toFixed(2)}s,.3s;animation-delay:0s,${water.prime ? PRIME_TOTAL : 0}s"/>`;
  }
  return { end: pts2[pts2.length - 1], svg: `<g class="${sel === key ? 'is-sel' : ''}">
    <path d="${d}" class="pipe-wall" stroke-width="${w + 2.5}"/><path d="${d}" class="pipe-core ${p.mat}" stroke-width="${w}"/>${wet}</g>
    <path d="${d}" class="pipe-hit" data-act="${key}"/>
    <g class="hot" data-act="${key}" tabindex="0" role="button" aria-label="${key === 'suction' ? t('ماسورة السحب') : t('ماسورة الدفع')}">
      <line x1="${mid[0]}" y1="${mid[1]}" x2="${mid[0]}" y2="${mid[1] - 18}" class="s-dim"/>
      <rect x="${mid[0] - tw / 2}" y="${mid[1] - 40}" width="${tw}" height="22" class="s-fill" style="stroke-width:.8"/>
      ${txt(mid[0], mid[1] - 25, lab)}</g>` };
}
function cutPath(pts, fr) {
  if (fr >= 1) return pts;
  const seg = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
  let want = tot * Math.max(0.05, fr); const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (want <= seg[i - 1]) { const k = want / seg[i - 1]; out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]); return out; }
    want -= seg[i - 1]; out.push(pts[i]);
  }
  return out;
}
function labelPoint(pts) {
  let best = null, bl = -1;
  for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][1] - pts[i - 1][1]) < 1) { const l = Math.abs(pts[i][0] - pts[i - 1][0]); if (l > bl) { bl = l; best = [(pts[i][0] + pts[i - 1][0]) / 2, pts[i][1]]; } }
  return best || pts[Math.floor(pts.length / 2)];
}

// مقياس الضغط على خط الدفع
function gauge(x, y, stemTo, bar, max, mode) {
  const a = -120 + 240 * Math.min(1, bar / max);
  const ticks = [0, 1, 2, 3, 4].map(i => { const r = (-120 + i * 60 - 90) * Math.PI / 180; return `<line x1="${x + Math.cos(r) * 8}" y1="${y + Math.sin(r) * 8}" x2="${x + Math.cos(r) * 10}" y2="${y + Math.sin(r) * 10}" class="s-thin" style="stroke-width:.8"/>`; }).join('');
  const needle = mode === 'idle' ? `transform:rotate(-120deg)` : mode === 'rise' ? `--a:${a}deg` : `transform:rotate(${a}deg)`;
  return `<g class="gauge"><line x1="${stemTo[0]}" y1="${stemTo[1]}" x2="${x}" y2="${y}" class="s-thin"/>
    <circle cx="${x}" cy="${y}" r="12" class="s-fill"/>${ticks}
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y - 8}" class="needle${mode === 'rise' ? ' rise' : ''}" style="${needle};transform-origin:${x}px ${y}px"/>
    <circle cx="${x}" cy="${y}" r="1.6" fill="var(--ink)"/>
    ${mode !== 'idle' ? txt(x + 16, y + 4, n1(bar) + ' bar', 'mute gauge-txt', 'start', 'direction="ltr"') : ''}</g>`;
}

export function renderScene(s, ui, R) {
  const sel = ui.selected, run = ui.running, primed = !!ui.primed;
  const keys = new Set(['building', 'roof', 'ground', 'pump'].filter(k => s[k]));
  const appear = k => (prevKeys && !prevKeys.has(k) ? ' appear' : '');
  let o = defs() + `<rect width="${W}" height="${H}" fill="url(#pGrid)"/>`;
  o += `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="url(#pEarth)"/><line x1="0" x2="${W}" y1="${GY}" y2="${GY}" class="s-ground"/>`;
  o += level(30, GY, '±0.00');

  const next = !s.building ? 'addBuilding' : !s.roof ? 'addRoof' : !s.ground ? 'addGround' : !s.pump ? 'addPump' : null;
  let Bd = null;
  if (s.building) { Bd = building(s, sel, appear('building')); o += Bd.o; }
  else o += slot(560, 120, 320, 200, t('أضف المبنى'), 'addBuilding', true);

  const flowing = !!(R && run && R.flows);
  const stirGround = !!(R && run && R.q > 0 && !R.air);

  // الخزان الأرضي
  let waterY = GY + 50;
  if (s.ground) {
    const { x0, x1, y1 } = TANK; waterY = GY + 14 + (s.ground.depth / 4.5) * (y1 - GY - 28);
    o += `<g class="hot${sel === 'ground' ? ' is-sel' : ''}${appear('ground')}" data-act="ground" tabindex="0" role="button" aria-label="${t('الخزان الأرضي')}">
      <rect x="${x0 - 12}" y="${GY - 12}" width="${x1 - x0 + 24}" height="${y1 - GY + 24}" fill="url(#pConc)" class="s-fill"/>
      <rect x="${x0}" y="${GY}" width="${x1 - x0}" height="${y1 - GY}" class="s-fill"/>
      ${waterBody('groundWater', x0 + 1, waterY, x1 - x0 - 2, y1 - waterY - 1, ui.ground ?? 1, stirGround)}
      <rect x="${x0 + 18}" y="${GY - 18}" width="44" height="6" class="s-fill"/>
      ${txt((x0 + x1) / 2, y1 + 26, t('خزان أرضي ') + num(n1(s.ground.vol)) + t(' م³'))}</g>`;
    o += level(x1 + 30, waterY, '−' + n2(s.ground.depth));
  } else if (s.building) o += slot(TANK.x0, GY + 30, TANK.x1 - TANK.x0, 130, t('الخزان الأرضي'), 'addGround', next === 'addGround');

  // الخزان العلوي (مع تيار الماء الداخل والعوّامة)
  let rt = null;
  if (s.building) {
    const cx = Bd.x0 + (Bd.x1 - Bd.x0) * 0.62, tw = 96, th = 50, ty = Bd.top - 10 - 18 - th;
    rt = { cx, top: ty, bottom: ty + th };
    if (s.roof) {
      const delay = primed ? 0 : PRIME_TOTAL;
      const stream = flowing ? `<path d="M${cx} ${ty + 4}V${ty + th}" class="stream" style="animation-delay:${delay}s,0s"/>` : '';
      const extras = `<circle cx="${cx + 26}" cy="${ty - 1.5}" r="4.5" class="float"/><line x1="${cx + 26}" y1="${ty - 1.5}" x2="${cx + 40}" y2="${ty - 14}" class="s-thin float-arm"/>`
        + (flowing ? `<ellipse cx="${cx}" cy="${ty + 1}" rx="10" ry="2.2" class="ripple" style="animation-delay:${delay}s"/><ellipse cx="${cx}" cy="${ty + 1}" rx="10" ry="2.2" class="ripple" style="animation-delay:${delay + 0.6}s"/>` : '');
      o += `<g class="hot${sel === 'roof' ? ' is-sel' : ''}${appear('roof')}" data-act="roof" tabindex="0" role="button" aria-label="${t('الخزان العلوي')}">
        <path d="M${cx - tw / 2 + 10} ${ty + th}v18M${cx + tw / 2 - 10} ${ty + th}v18M${cx - tw / 2 + 10} ${ty + th + 18}L${cx + tw / 2 - 10} ${ty + th}" class="s-thin"/>
        <rect x="${cx - tw / 2}" y="${ty}" width="${tw}" height="${th}" class="s-fill"/>
        ${stream}${waterBody('roofWater', cx - tw / 2 + 1, ty + 1, tw - 2, th - 2, ui.fill ?? 0.15, flowing, extras)}
        ${txt(cx - tw / 2 - 10, ty + th / 2 + 4, t('خزان علوي ') + num(n1(s.roof.vol)) + t(' م³'), '', 'start')}</g>`;
    } else o += slot(cx - 70, ty - 20, 140, th + 34, t('الخزان العلوي'), 'addRoof', next === 'addRoof');
  }

  if (s.building && s.roof && s.ground && !s.pump) {
    o += `<path d="M${TANK.x1 + 12} ${GY - 22}H${Bd.x0 - 26}V${rt.top - 22}H${rt.cx}" fill="none" stroke="var(--ink-3)" stroke-width="1.2" stroke-dasharray="3 5" class="dash-move"/>`;
    o += slot((TANK.x1 + Bd.x0) / 2 - 85, GY - 150, 170, 100, t('أضف المضخة'), 'addPump', true);
    o += txt((TANK.x1 + Bd.x0) / 2, GY - 30, t('غير موصول — المضخة مطلوبة'), 'mute');
  }

  if (R && s.pump) {
    const sub = R.sub, px = TANK.x1 + (s.pump.x / s.site) * (Bd.x0 - TANK.x1 - 70) + 14;
    const py = sub ? TANK.y1 - 34 : GY - 14 - s.pump.z * 26, rx = Bd.x0 - 26;
    const wetRun = run && !R.air;                 // يوجد ماء في المواسير
    const wetIdle = !run && primed && !R.air;      // بعد الإيقاف: المواسير تبقى ممتلئة (صمام عدم الرجوع)
    const flowT = V => Math.min(2, Math.max(0.25, 1 / Math.max(V, 0.2)));

    // الدفع
    const dPts = sub ? [[150, py - 18], [150, GY - 34], [rx, GY - 34], [rx, rt.top - 22], [rt.cx, rt.top - 22], [rt.cx, rt.top + 4]]
                     : [[px + 18, py - 14], [px + 18, py - 40], [rx, py - 40], [rx, rt.top - 22], [rt.cx, rt.top - 22], [rt.cx, rt.top + 4]];
    const dWater = (wetRun || wetIdle) ? {
      cut: R.noLift ? Math.min(0.95, R.C.H0 / Math.max(R.g.Hs, 0.1)) : 0,
      prime: run && !primed ? [sub ? 0 : PRIME.suction, PRIME.discharge] : null,
      flow: run && R.q > 0 && !R.noLift ? flowT(R.L.d.V) : 0,
    } : null;
    const dp = pipe(dPts, Math.min(1, s.discharge.L / R.g.dischargeReq), 'discharge', s.discharge, dWater, sel);
    o += dp.svg;

    // السحب
    if (!sub) {
      const sPts = [[px - 26, py], [160, py], [160, waterY + 34]];
      const sWater = (wetRun || wetIdle) ? { reverse: true, prime: run && !primed ? [0, PRIME.suction] : null, flow: run && R.q > 0 ? flowT(R.L.s.V) : 0 } : null;
      const sp = pipe(sPts, Math.min(1, s.suction.L / R.g.suctionReq), 'suction', s.suction, sWater, sel);
      o += sp.svg;
      if (!R.air) o += `<rect x="149" y="${waterY + 32}" width="22" height="10" class="s-fill"/><path d="M151 ${waterY + 36}h18M151 ${waterY + 39}h18" class="s-hair"/>`;
      if (run && R.air) for (let i = 0; i < 6; i++) o += `<circle class="fx-bub" cx="${px - 30 - i * 10}" cy="${py + (i % 2 ? 2 : -2)}" r="${2 + i % 2}" style="animation-delay:${i * .18}s"/>`;
      o += dimV(px - 52, waterY, py, t('سحب ') + n2(R.g.lift) + t(' م'));
    }

    // جسم المضخة
    const shake = run && (R.cavitation || R.air) ? ' fx-shake' : run ? ' fx-hum' : '';
    const spin = run ? (R.air ? ' fx-spin fast' : ' fx-spin') : '';
    if (sub) {
      o += `<g class="hot${sel === 'pump' ? ' is-sel' : ''}${shake}${appear('pump')}" data-act="pump" tabindex="0" role="button" aria-label="${t('المضخة')}">
        <rect x="139" y="${py - 18}" width="22" height="52" rx="3" class="s-fill"/><path d="M139 ${py + 6}h22M139 ${py + 10}h22" class="s-hair"/><path d="M141 ${py + 16}h18" class="s-thin" stroke-dasharray="2 2"/>
        <circle cx="150" cy="${py + 26}" r="2.4" class="led${run ? ' on' : ''}"/></g>`;
      if (run && R.q > 0) for (let i = 0; i < 4; i++) o += `<circle class="fx-intake" cx="${139 - 6 - i * 4}" cy="${py + 14}" r="1.4" style="animation-delay:${i * .25}s"/>`;
    } else {
      o += `<g class="hot${sel === 'pump' ? ' is-sel' : ''}${shake}${appear('pump')}" data-act="pump" tabindex="0" role="button" aria-label="${t('المضخة')}">
        <rect x="${px - 40}" y="${py + 12}" width="78" height="${GY - py - 12}" fill="url(#pConc)" class="s-fill"/>
        <rect x="${px - 36}" y="${py - 14}" width="40" height="26" class="s-fill"/>
        ${[0, 1, 2, 3, 4].map(i => `<line x1="${px - 32 + i * 7}" x2="${px - 32 + i * 7}" y1="${py - 12}" y2="${py + 10}" class="s-hair"/>`).join('')}
        <circle cx="${px - 30}" cy="${py - 18}" r="2.6" class="led${run ? (R.air || R.cavitation || R.noLift ? ' on bad' : ' on') : ''}"/>
        <circle cx="${px + 18}" cy="${py - 1}" r="15" class="s-fill"/>
        <g class="impeller${spin}"><circle cx="${px + 18}" cy="${py - 1}" r="6" class="s-fill"/>${[0, 60, 120].map(a => `<line x1="${px + 12}" x2="${px + 24}" y1="${py - 1}" y2="${py - 1}" class="s-thin" transform="rotate(${a} ${px + 18} ${py - 1})"/>`).join('')}</g></g>`;
      if (run && R.cavitation && !R.air) for (let i = 0; i < 7; i++) o += `<circle class="fx-bub" cx="${px + 6 + i * 3}" cy="${py + 4}" r="${1.4 + i % 2}" style="animation-delay:${i * .15}s"/>`;
    }
    o += sub ? txt(132, py + 10, esc(R.pump.model), 'big', 'start') : txt(px, GY + 22, esc(R.pump.model), 'big');

    // مقياس الضغط
    const bar = R.h * R.w.rho * 9.81 / 1e5, gmax = R.C.H0 * 0.0981 > 5.5 ? 10 : 6;
    const gMode = !run || R.air ? 'idle' : primed ? 'static' : 'rise';
    o += sub ? gauge(176, GY - 52, [150, GY - 52], R.noLift ? R.C.H0 * 0.0981 : bar, gmax, gMode)
             : gauge(px + 44, py - 30, [px + 18 + 4, py - 30], R.noLift ? R.C.H0 * 0.0981 : bar, gmax, gMode);

    // تسرب
    if (run && R.leak) {
      const e = dp.end, d = primed ? 0 : PRIME_TOTAL;
      o += `<path d="M${e[0]} ${e[1] + 2}V${GY}" class="stream leak" style="animation-delay:${d}s,0s"/>`;
      for (let i = 0; i < 5; i++) o += `<ellipse class="fx-drop" cx="${e[0] + (i - 2) * 4}" cy="${e[1] + 6}" rx="2.2" ry="3.6" style="animation-delay:${d + i * .22}s"/>`;
      o += `<ellipse cx="${e[0]}" cy="${GY + 5}" rx="46" ry="5" class="puddle" style="animation-delay:${d}s"/>`;
    }
    o += dimV(W - 14, waterY, rt.top - 22, 'Hs ' + n2(R.g.Hs) + t(' م'));
  }
  prevKeys = keys;
  return o;
}

export const sceneSize = { W, H };
