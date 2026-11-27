// ═══════════════════════════════════════════════════════════════
// المشهد: مقطع رأسي للموقع بأسلوب المخطط الهندسي
// يرسم SVG فقط من الحالة ونتيجة الحساب؛ لا يغيّر شيئاً
// النقر يمر عبر data-act ويُعالج في pages/app.js
// ═══════════════════════════════════════════════════════════════
import { BUILDINGS } from '../data/buildings.js';
import { MATERIALS } from '../data/materials.js';
import { n1, n2 } from '../core/format.js';
import { esc } from '../core/dom.js';

const W = 1000, H = 560, GY = 360;           // خط الأرض
const TANK = { x0: 70, x1: 230, y0: GY, y1: 530 };
const BW = { house: 210, school: 270, factory: 280 };

const P = pts => 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
const txt = (x, y, s, cls = '', anchor = 'middle', extra = '') => `<text class="s-txt ${cls}" x="${x}" y="${y}" text-anchor="${anchor}" ${extra}>${s}</text>`;
const num = s => `<tspan class="s-num">${s}</tspan>`;

function defs() {
  return `<defs>
  <pattern id="pEarth" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="9" class="s-hair"/></pattern>
  <pattern id="pConc" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1" fill="var(--ink-3)"/><circle cx="11" cy="11" r=".8" fill="var(--ink-3)"/><path d="M10 3l2 3h-4z" fill="none" stroke="var(--ink-3)" stroke-width=".6"/></pattern>
  <pattern id="pGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="var(--rule-soft)" stroke-width=".5"/></pattern>
  <marker id="mArr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" class="s-arrow"/></marker>
  </defs>`;
}

// علامة منسوب ▽
// الأرقام بأسلوب LTR صريح حتى لا يقلبها اتجاه الصفحة
function level(x, y, label, toRight = true) {
  const tx = toRight ? x + 10 : x - 10, a = toRight ? 'start' : 'end';
  return `<g><path d="M${x - 6} ${y - 9}h12l-6 9z" class="s-fill" style="stroke-width:.9"/><line x1="${x - 12}" x2="${x + 12}" y1="${y}" y2="${y}" class="s-thin"/>${txt(tx, y - 12, label, 'mute', a, 'direction="ltr"')}</g>`;
}
// بُعد رأسي
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

function building(s, sel) {
  const B = s.building, w = BW[B.type], x0 = W - 90 - w, x1 = x0 + w;
  const fpx = Math.min(48, 240 / B.floors), h = B.floors * fpx, top = GY - h;
  const bays = B.type === 'house' ? 3 : B.type === 'school' ? 5 : 4;
  let o = `<g class="hot${sel === 'building' ? ' is-sel' : ''}" data-act="building" tabindex="0" role="button" aria-label="المبنى">`;
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
  if (B.type === 'school') o += `<line x1="${x0 + 18}" x2="${x0 + 18}" y1="${top}" y2="${top - 46}" class="s-thin"/><path d="M${x0 + 18} ${top - 46}h22v12h-22" class="s-fill"/>`;
  o += `<rect x="${x0 - 3}" y="${top - 10}" width="${w + 6}" height="10" class="s-fill"/></g>`;
  // مناسيب الأدوار
  for (let f = 1; f <= B.floors; f++) if (B.floors <= 8 || f % 2 === 0 || f === B.floors) o += level(x1 + 14, GY - f * fpx, '+' + n2(f * B.floorH));
  return { o, x0, x1, top };
}

function pipe(pts, frac, key, p, flowing, V, sel) {
  const pts2 = cutPath(pts, frac), d = P(pts2), w = 3 + p.d / 14;
  const mid = labelPoint(pts2);
  const lab = `${key === 'suction' ? 'سحب' : 'دفع'} · ${esc(MATERIALS[p.mat].name)} Ø${p.d} · L ${n1(p.L)} م`;
  const tw = lab.length * 6.3 + 18;
  return { end: pts2[pts2.length - 1], svg: `<g class="${sel === key ? 'is-sel' : ''}">
    <path d="${d}" class="pipe-wall" stroke-width="${w + 2.5}"/><path d="${d}" class="pipe-core ${p.mat}" stroke-width="${w}"/>
    ${flowing ? `<path d="${d}" class="pipe-flow" stroke-width="${Math.max(1.6, w - 3)}" style="animation-duration:${Math.min(2, Math.max(.25, 1 / Math.max(V, .2))).toFixed(2)}s"/>` : ''}</g>
    <path d="${d}" class="pipe-hit" data-act="${key}"/>
    <g class="hot" data-act="${key}" tabindex="0" role="button" aria-label="ماسورة ${key === 'suction' ? 'السحب' : 'الدفع'}">
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
function labelPoint(pts) { // منتصف أطول مقطع أفقي
  let best = null, bl = -1;
  for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][1] - pts[i - 1][1]) < 1) { const l = Math.abs(pts[i][0] - pts[i - 1][0]); if (l > bl) { bl = l; best = [(pts[i][0] + pts[i - 1][0]) / 2, pts[i][1]]; } }
  return best || pts[Math.floor(pts.length / 2)];
}

export function renderScene(s, ui, R) {
  const sel = ui.selected, run = ui.running;
  let o = defs() + `<rect width="${W}" height="${H}" fill="url(#pGrid)"/>`;
  // الأرض
  o += `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="url(#pEarth)"/><line x1="0" x2="${W}" y1="${GY}" y2="${GY}" class="s-ground"/>`;
  o += level(30, GY, '±0.00');

  const next = !s.building ? 'addBuilding' : !s.roof ? 'addRoof' : !s.ground ? 'addGround' : !s.pump ? 'addPump' : null;
  let Bd = null;
  if (s.building) { Bd = building(s, sel); o += Bd.o; }
  else o += slot(560, 120, 320, 200, 'أضف المبنى', 'addBuilding', true);

  // الخزان الأرضي
  let waterY = GY + 50;
  if (s.ground) {
    const { x0, x1, y1 } = TANK; waterY = GY + 14 + (s.ground.depth / 4.5) * (y1 - GY - 28);
    o += `<g class="hot${sel === 'ground' ? ' is-sel' : ''}" data-act="ground" tabindex="0" role="button" aria-label="الخزان الأرضي">
      <rect x="${x0 - 12}" y="${GY - 12}" width="${x1 - x0 + 24}" height="${y1 - GY + 24}" fill="url(#pConc)" class="s-fill"/>
      <rect x="${x0}" y="${GY}" width="${x1 - x0}" height="${y1 - GY}" class="s-fill"/>
      <rect x="${x0 + 1}" y="${waterY}" width="${x1 - x0 - 2}" height="${y1 - waterY - 1}" class="s-water"/>
      <line x1="${x0}" x2="${x1}" y1="${waterY}" y2="${waterY}" class="s-wline"/>
      <rect x="${x0 + 18}" y="${GY - 18}" width="44" height="6" class="s-fill"/>
      ${txt((x0 + x1) / 2, y1 + 26, 'خزان أرضي ' + num(n1(s.ground.vol)) + ' م³')}</g>`;
    o += level(x1 + 30, waterY, '−' + n2(s.ground.depth));
  } else if (s.building) o += slot(TANK.x0, GY + 30, TANK.x1 - TANK.x0, 130, 'الخزان الأرضي', 'addGround', next === 'addGround');

  // الخزان العلوي
  let rt = null;
  if (s.building) {
    const cx = Bd.x0 + (Bd.x1 - Bd.x0) * 0.62, tw = 96, th = 50, ty = Bd.top - 10 - 18 - th;
    rt = { cx, top: ty, bottom: ty + th };
    if (s.roof) {
      const lv = th * Math.min(1, Math.max(0, ui.fill));
      o += `<g class="hot${sel === 'roof' ? ' is-sel' : ''}" data-act="roof" tabindex="0" role="button" aria-label="الخزان العلوي">
        <path d="M${cx - tw / 2 + 10} ${ty + th}v18M${cx + tw / 2 - 10} ${ty + th}v18M${cx - tw / 2 + 10} ${ty + th + 18}L${cx + tw / 2 - 10} ${ty + th}" class="s-thin"/>
        <rect x="${cx - tw / 2}" y="${ty}" width="${tw}" height="${th}" class="s-fill"/>
        <rect id="roofWater" x="${cx - tw / 2 + 1}" y="${ty + th - lv}" width="${tw - 2}" height="${lv}" class="s-water"/>
        ${txt(cx - tw / 2 - 10, ty + th / 2 + 4, 'خزان علوي ' + num(n1(s.roof.vol)) + ' م³', '', 'start')}</g>`;
    } else o += slot(cx - 70, ty - 20, 140, th + 34, 'الخزان العلوي', 'addRoof', next === 'addRoof');
  }

  if (s.building && s.roof && s.ground && !s.pump) {
    o += `<path d="M${TANK.x1 + 12} ${GY - 22}H${Bd.x0 - 26}V${rt.top - 22}H${rt.cx}" fill="none" stroke="var(--ink-3)" stroke-width="1.2" stroke-dasharray="3 5"/>`;
    o += slot((TANK.x1 + Bd.x0) / 2 - 85, GY - 150, 170, 100, 'أضف المضخة', 'addPump', true);
    o += txt((TANK.x1 + Bd.x0) / 2, GY - 30, 'غير موصول — المضخة مطلوبة', 'mute');
  }

  if (R && s.pump) {
    const sub = R.sub, px = TANK.x1 + (s.pump.x / s.site) * (Bd.x0 - TANK.x1 - 70) + 14;
    const py = sub ? TANK.y1 - 34 : GY - 14 - s.pump.z * 26, rx = Bd.x0 - 26;
    const go = run && !R.air && !R.noLift;
    // الدفع
    const dPts = sub ? [[150, py - 18], [150, GY - 34], [rx, GY - 34], [rx, rt.top - 22], [rt.cx, rt.top - 22], [rt.cx, rt.top + 4]]
                     : [[px + 18, py - 14], [px + 18, py - 40], [rx, py - 40], [rx, rt.top - 22], [rt.cx, rt.top - 22], [rt.cx, rt.top + 4]];
    const dp = pipe(dPts, Math.min(1, s.discharge.L / R.g.dischargeReq), 'discharge', s.discharge, go, R.L.d.V, sel);
    o += dp.svg;
    // السحب
    if (!sub) {
      const sPts = [[px - 26, py], [160, py], [160, waterY + 34]];
      const sp = pipe(sPts, Math.min(1, s.suction.L / R.g.suctionReq), 'suction', s.suction, go, R.L.s.V, sel);
      o += sp.svg;
      if (!R.air) o += `<rect x="149" y="${waterY + 32}" width="22" height="10" class="s-fill"/><path d="M151 ${waterY + 36}h18M151 ${waterY + 39}h18" class="s-hair"/>`;
      if (run && R.air) for (let i = 0; i < 5; i++) o += `<circle class="fx-bub" cx="${sp.end[0] + (i % 2 ? 4 : -4)}" cy="${sp.end[1] - i * 7}" r="${2.5 + i % 2}" style="animation-delay:${i * .2}s"/>`;
      // بُعد السحب
      o += dimV(px - 52, waterY, py, 'سحب ' + n2(R.g.lift) + ' م');
    }
    // جسم المضخة
    const shake = run && (R.cavitation || R.air) ? ' fx-shake' : '';
    if (sub) {
      o += `<g class="hot${sel === 'pump' ? ' is-sel' : ''}${shake}" data-act="pump" tabindex="0" role="button" aria-label="المضخة">
        <rect x="139" y="${py - 18}" width="22" height="52" rx="3" class="s-fill"/><path d="M139 ${py + 6}h22M139 ${py + 10}h22" class="s-hair"/><path d="M141 ${py + 16}h18" class="s-thin" stroke-dasharray="2 2"/></g>`;
    } else {
      o += `<g class="hot${sel === 'pump' ? ' is-sel' : ''}${shake}" data-act="pump" tabindex="0" role="button" aria-label="المضخة">
        <rect x="${px - 40}" y="${py + 12}" width="78" height="${GY - py - 12}" fill="url(#pConc)" class="s-fill"/>
        <rect x="${px - 36}" y="${py - 14}" width="40" height="26" class="s-fill"/>
        ${[0, 1, 2, 3, 4].map(i => `<line x1="${px - 32 + i * 7}" x2="${px - 32 + i * 7}" y1="${py - 12}" y2="${py + 10}" class="s-hair"/>`).join('')}
        <circle cx="${px + 18}" cy="${py - 1}" r="15" class="s-fill"/>
        <g class="${run && R.q > 0 ? 'fx-spin' : ''}"><circle cx="${px + 18}" cy="${py - 1}" r="6" class="s-fill"/>${[0, 60, 120].map(a => `<line x1="${px + 12}" x2="${px + 24}" y1="${py - 1}" y2="${py - 1}" class="s-thin" transform="rotate(${a} ${px + 18} ${py - 1})"/>`).join('')}</g></g>`;
      if (run && R.cavitation && !R.air) for (let i = 0; i < 6; i++) o += `<circle class="fx-bub" cx="${px + 6 + i * 3}" cy="${py + 4}" r="${1.6 + i % 2}" style="animation-delay:${i * .17}s"/>`;
    }
    o += sub ? txt(132, py + 10, esc(R.pump.model), 'big', 'start') : txt(px, GY + 22, esc(R.pump.model), 'big');
    // تسرب
    if (run && R.leak) {
      const e = dp.end;
      for (let i = 0; i < 4; i++) o += `<ellipse class="fx-drop" cx="${e[0] + (i - 1.5) * 4}" cy="${e[1] + 6}" rx="2.5" ry="4" style="animation-delay:${i * .25}s"/>`;
      o += `<ellipse cx="${e[0]}" cy="${GY + 5}" rx="44" ry="5" class="s-water"/>`;
    }
    // بُعد الرفع الساكن
    o += dimV(W - 14, waterY, rt.top - 22, 'Hs ' + n2(R.g.Hs) + ' م');
  }
  return o;
}

export const sceneSize = { W, H };
