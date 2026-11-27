import React, { useEffect, useState } from 'react';

// Original exercise illustrations: a jointed figure driven by two poses (start -> end), drawn as SVG.
// Angles are in degrees measured from "straight down", clockwise (0 = down, 90 = right/forward, 180 = up, -90 = left/back).
const L = { torso: 50, thigh: 40, shin: 38, uA: 30, fA: 28, head: 9, neck: 5 };
const FLOOR = 225;
const rad = d => d * Math.PI / 180;
const dir = (deg, len) => [Math.sin(rad(deg)) * len, Math.cos(rad(deg)) * len];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const lerp = (a, b, k) => a + (b - a) * k;
const STAND = { a: [100, 221], t: 180, h: 0, s: 0, u: 0, f: 0 };
const SEAT = { a: [140, 221], t: 180, h: 90, s: 0 };
const S = (start, end, extra = {}) => ({ view: 'side', start: { ...STAND, ...start }, end: { ...STAND, ...end }, ...extra });

export const POSES = {
  press: { view: 'side', prop: 'seat', weight: 'db', start: { ...SEAT, u: 20, f: 175 }, end: { ...SEAT, u: 178, f: 180 } },
  front_raise: S({}, { u: 90, f: 90 }, { weight: 'db' }),
  curl: S({ u: 5, f: 5 }, { u: 5, f: 150 }, { weight: 'db' }),
  pushdown: S({ u: 10, f: 150 }, { u: 10, f: 15 }, { prop: 'cable_top' }),
  overhead_ext: S({ u: 175, f: -25 }, { u: 178, f: 178 }, { weight: 'db' }),
  upright_row: S({}, { u: 100, f: -110 }, { weight: 'bar' }),
  face_pull: S({ u: 90, f: 90 }, { u: -70, f: 140 }, { prop: 'cable_h' }),
  shrug: S({}, { lift: 9 }, { weight: 'db' }),
  carry: { view: 'side', weight: 'db', start: { r: [100, 143], t: 180, h: 14, s: -8, h2: -14, s2: -8, u: 0, f: 0 }, end: { r: [100, 141], t: 180, h: -14, s: -8, h2: 14, s2: -8, u: 0, f: 0 } },
  squat: { view: 'side', weight: 'db', start: { a: [95, 221], t: 180, h: 0, s: 0, u: 90, f: 90 }, end: { a: [95, 221], t: 150, h: 80, s: -30, u: 90, f: 90 } },
  lunge: { view: 'side', weight: 'db', start: { a: [130, 221], t: 180, h: 0, s: 0, h2: 0, s2: 0, u: 0, f: 0 }, end: { a: [130, 221], t: 180, h: 70, s: -5, h2: -30, s2: -100, u: 0, f: 0 } },
  hinge: S({}, { t: 95, h: 20, s: -12 }, { weight: 'bar' }),
  calf_raise: S({}, { a: [100, 210] }, { weight: 'db' }),
  bench_press: { view: 'side', prop: 'flat', weight: 'db', start: { a: [160, 221], t: -90, h: 105, s: 20, u: 175, f: 180 }, end: { a: [160, 221], t: -90, h: 105, s: 20, u: 45, f: 180 } },
  pushup: { view: 'side', start: { a: [40, 216], t: 115, h: -65, s: -65, u: 0, f: 0 }, end: { a: [40, 216], t: 100, h: -80, s: -80, u: -60, f: 60 } },
  plank: { view: 'side', start: { a: [40, 208], t: 98, h: -82, s: -82, u: 0, f: 90 }, end: { a: [40, 208], t: 100, h: -80, s: -80, u: 0, f: 90 } },
  pullup: { view: 'side', prop: 'bar', start: { r: [100, 123], t: 180, h: 4, s: -8, u: 180, f: 180 }, end: { r: [100, 66], t: 180, h: 4, s: -8, u: -10, f: 180 } },
  pulldown: { view: 'side', prop: 'cable_top', start: { ...SEAT, u: 170, f: 175 }, end: { ...SEAT, t: 170, u: 15, f: 150 } },
  row_seated: { view: 'side', prop: 'cable_h', start: { a: [170, 213], t: 180, h: 85, s: 95, u: 90, f: 90 }, end: { a: [170, 213], t: 190, h: 85, s: 95, u: -25, f: 85 } },
  row: { view: 'side', weight: 'db', start: { a: [100, 221], t: 140, h: 15, s: -10, u: 0, f: 0 }, end: { a: [100, 221], t: 140, h: 15, s: -10, u: -110, f: 10 } },
  extension: { view: 'side', prop: 'pad', start: { r: [100, 170], t: 50, h: -75, s: -75, u: 70, f: -110 }, end: { r: [100, 170], t: 105, h: -75, s: -75, u: 70, f: -110 } },
  crunch: { view: 'side', start: { r: [130, 215], t: -90, h: 130, s: 30, u: -150, f: 30 }, end: { r: [130, 215], t: -125, h: 130, s: 30, u: -150, f: 30 } },
  leg_raise: { view: 'side', start: { r: [110, 215], t: -90, h: 90, s: 90, u: 90, f: 90 }, end: { r: [110, 215], t: -90, h: 175, s: 175, u: 90, f: 90 } },
  bridge: { view: 'side', start: { a: [150, 221], t: -88, h: 100, s: 0, u: 100, f: 100 }, end: { a: [150, 221], t: -72, h: 80, s: 0, u: 100, f: 100 } },
  twist: { view: 'side', weight: 'db', start: { r: [100, 190], t: 205, h: 110, s: 70, u: 100, f: 80 }, end: { r: [100, 190], t: 205, h: 110, s: 70, u: 60, f: 100 } },
  lateral_raise: { view: 'front', weight: 'db', start: { u: 5, f: 5 }, end: { u: 85, f: 85 } },
  rear_fly: { view: 'front', weight: 'db', start: { sc: 0.6, u: 5, f: 5 }, end: { sc: 0.6, u: 80, f: 80 } },
  fly: { view: 'front', weight: 'db', start: { u: 100, f: 100 }, end: { u: 172, f: 172 } },
  side_bend: { view: 'front', weight: 'db', one: true, start: { tilt: 0 }, end: { tilt: 22 } }
};

// which drawn body part each muscle colours green
const SEG = { chest: ['torsoU'], shoulders: ['shoulder'], biceps: ['uA'], triceps: ['uA'], forearms: ['fA'], abs: ['torsoL'], obliques: ['torsoL'],
  upper_back: ['torsoU'], lower_back: ['torsoL'], traps: ['shoulder'], quads: ['thigh'], hamstrings: ['thigh'], glutes: ['hip'], calves: ['shin'] };

function mix(p0, p1, k) {
  const out = {};
  for (const key of new Set([...Object.keys(p0), ...Object.keys(p1)])) {
    const a = p0[key] ?? (key === 'sc' ? 1 : 0), b = p1[key] ?? (key === 'sc' ? 1 : 0);
    out[key] = Array.isArray(a) ? [lerp(a[0], b[0], k), lerp(a[1], b[1], k)] : lerp(a, b, k);
  }
  return out;
}

function solveSide(p) {
  const th = dir(p.h, L.thigh), sh = dir(p.s, L.shin);
  const hip = p.r ? p.r : [p.a[0] - th[0] - sh[0], p.a[1] - th[1] - sh[1]];
  const knee = add(hip, th), ankle = add(knee, sh);
  const h2 = p.h2 ?? p.h, s2 = p.s2 ?? p.s;
  const knee2 = add(hip, dir(h2, L.thigh)), ankle2 = add(knee2, dir(s2, L.shin));
  const shoulder = add(hip, dir(p.t, L.torso)); shoulder[1] -= p.lift || 0;
  const mid = [(hip[0] + shoulder[0]) / 2, (hip[1] + shoulder[1]) / 2];
  const head = add(shoulder, dir(p.t, L.neck + L.head));
  const elbow = add(shoulder, dir(p.u, L.uA)), wrist = add(elbow, dir(p.f, L.fA));
  return { hip, knee, ankle, knee2, ankle2, shoulder, mid, head, elbow, wrist };
}

function Weight({ at, kind }) { return kind ? <circle cx={at[0]} cy={at[1]} r={kind === 'bar' ? 8 : 6} fill="#111827"/> : null; }

function Side({ pose, k, hl, ghost }) {
  const p = mix(pose.start, pose.end, k), q = solveSide(p), col = seg => (hl.primary.has(seg) ? '#22c55e' : hl.secondary.has(seg) ? '#86efac' : (ghost ? '#bbf7d0' : '#4b5563'));
  const stroke = ghost ? 0.55 : 1;
  const line = (a, b, w, c) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeWidth={w} strokeLinecap="round"/>;
  return <g opacity={stroke}>
    {line(q.hip, q.knee2, 9, ghost ? '#d1d5db' : '#9ca3af')}{line(q.knee2, q.ankle2, 7, ghost ? '#d1d5db' : '#9ca3af')}
    {line(q.hip, q.knee, 10, col('thigh'))}{line(q.knee, q.ankle, 8, col('shin'))}
    {line(q.ankle, add(q.ankle, [11, 2]), 5, '#374151')}
    {line(q.hip, q.mid, 15, col('torsoL'))}{line(q.mid, q.shoulder, 15, col('torsoU'))}
    <circle cx={q.hip[0]} cy={q.hip[1]} r="8" fill={col('hip')}/>
    {line(q.shoulder, q.elbow, 8, col('uA'))}{line(q.elbow, q.wrist, 7, col('fA'))}
    <circle cx={q.shoulder[0]} cy={q.shoulder[1]} r="8" fill={col('shoulder')}/>
    <circle cx={q.head[0]} cy={q.head[1]} r={L.head} fill="#f3f4f6" stroke="#374151" strokeWidth="2.2"/>
    {!ghost && <Weight at={q.wrist} kind={pose.weight}/>}
  </g>;
}

function Props({ pose }) {
  const q = solveSide(pose.start), e = solveSide(pose.end);
  const gray = '#d1d5db';
  switch (pose.prop) {
    case 'seat': return <g fill={gray}><rect x={q.hip[0] - 28} y={q.hip[1] + 8} width="56" height="7" rx="3"/><rect x={q.hip[0] - 36} y={q.hip[1] - 58} width="9" height="70" rx="4"/><rect x={q.hip[0] - 4} y={q.hip[1] + 15} width="8" height={FLOOR - q.hip[1] - 15}/></g>;
    case 'flat': return <g fill={gray}><rect x="40" y={q.hip[1] + 5} width="88" height="9" rx="4"/><rect x="48" y={q.hip[1] + 14} width="7" height={FLOOR - q.hip[1] - 14}/><rect x="112" y={q.hip[1] + 14} width="7" height={FLOOR - q.hip[1] - 14}/></g>;
    case 'bar': return <g><line x1="55" y1="15" x2="145" y2="15" stroke="#6b7280" strokeWidth="5" strokeLinecap="round"/><line x1="55" y1="15" x2="55" y2={FLOOR} stroke={gray} strokeWidth="4"/><line x1="145" y1="15" x2="145" y2={FLOOR} stroke={gray} strokeWidth="4"/></g>;
    case 'cable_top': { const w = q.wrist, w2 = e.wrist; return <g stroke="#9ca3af" strokeWidth="1.6" fill="none"><line x1="140" y1="18" x2={w[0]} y2={w[1]} strokeDasharray="3 2" opacity=".4"/><line x1="140" y1="18" x2={w2[0]} y2={w2[1]}/><circle cx="140" cy="18" r="5" fill="#e5e7eb"/></g>; }
    case 'cable_h': { const w = e.wrist, w0 = q.wrist; return <g stroke="#9ca3af" strokeWidth="1.6" fill="none"><line x1="192" y1={w0[1]} x2={w0[0]} y2={w0[1]} opacity=".4" strokeDasharray="3 2"/><line x1="192" y1={w[1]} x2={w[0]} y2={w[1]}/><rect x="190" y={w0[1] - 16} width="6" height="32" fill="#e5e7eb"/></g>; }
    case 'pad': return <g fill={gray}><rect x={q.hip[0] - 8} y={q.hip[1] - 4} width="18" height="30" rx="5"/><rect x={q.hip[0] - 3} y={q.hip[1] + 26} width="8" height={FLOOR - q.hip[1] - 26}/></g>;
    default: return null;
  }
}

function Front({ pose, k, hl, ghost }) {
  const p = mix(pose.start, pose.end, k), sc = p.sc || 1, tilt = p.tilt || 0;
  const hip = [100, 143], torso = dir(180 - tilt, L.torso * sc), c = add(hip, torso);
  const pr = [Math.cos(rad(tilt)), Math.sin(rad(tilt))];
  const sR = [c[0] + pr[0] * 20, c[1] + pr[1] * 20], sL = [c[0] - pr[0] * 20, c[1] - pr[1] * 20];
  const head = add(c, dir(180 - tilt, L.neck + L.head));
  const col = seg => (hl.primary.has(seg) ? '#22c55e' : hl.secondary.has(seg) ? '#86efac' : (ghost ? '#bbf7d0' : '#4b5563'));
  const arm = (s, sg, oneArm) => {
    const u = pose.one ? 0 : p.u, f = pose.one ? 0 : p.f;
    const uu = oneArm ? 0 : u, ff = oneArm ? 0 : f;
    const el = add(s, dir(sg * uu, L.uA)), wr = add(el, dir(sg * ff, L.fA));
    return { el, wr };
  };
  const R = arm(sR, 1, false), Lf = arm(sL, -1, pose.one && true);
  const ln = (a, b, w, cc) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={cc} strokeWidth={w} strokeLinecap="round"/>;
  return <g opacity={ghost ? 0.55 : 1}>
    {ln([92, 143], [86, 221], 11, col('thigh'))}{ln([108, 143], [114, 221], 11, col('thigh'))}
    {ln(hip, c, 30, col('torsoL'))}{ln([c[0] - pr[0] * 14, c[1] - pr[1] * 14], [c[0] + pr[0] * 14, c[1] + pr[1] * 14], 12, col('torsoU'))}
    {ln(sR, R.el, 8, col('uA'))}{ln(R.el, R.wr, 7, col('fA'))}{ln(sL, Lf.el, 8, col('uA'))}{ln(Lf.el, Lf.wr, 7, col('fA'))}
    <circle cx={sR[0]} cy={sR[1]} r="8" fill={col('shoulder')}/><circle cx={sL[0]} cy={sL[1]} r="8" fill={col('shoulder')}/>
    <circle cx={head[0]} cy={head[1]} r={L.head} fill="#f3f4f6" stroke="#374151" strokeWidth="2.2"/>
    {!ghost && <><Weight at={R.wr} kind={pose.weight}/>{!pose.one && <Weight at={Lf.wr} kind={pose.weight}/>}</>}
  </g>;
}

export default function ExerciseFigure({ pose = 'press', primary = [], secondary = [], animate = false, label }) {
  const def = POSES[pose] || POSES.press;
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setK(animate ? 1 : 0); return; }
    let raf, t0 = performance.now();
    const tick = now => { setK((1 - Math.cos(((now - t0) / 1800) * Math.PI)) / 2); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate]);
  const hl = { primary: new Set(primary.flatMap(m => SEG[m] || [])), secondary: new Set(secondary.flatMap(m => SEG[m] || []).filter(s => !primary.flatMap(m => SEG[m] || []).includes(s))) };
  const Fig = def.view === 'front' ? Front : Side;
  return <svg viewBox="0 0 200 240" className="fig" role="img" aria-label={label || 'Exercise demonstration'}>
    <rect x="0" y="0" width="200" height="240" fill="#f8faf8"/>
    <line x1="10" y1={FLOOR} x2="190" y2={FLOOR} stroke="#d1d5db" strokeWidth="2"/>
    {def.view === 'side' && <Props pose={def}/>}
    {!animate && <Fig pose={def} k={1} hl={hl} ghost/>}
    <Fig pose={def} k={animate ? k : 0} hl={hl}/>
  </svg>;
}
