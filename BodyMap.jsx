import React from 'react';
import { MUSCLES, LIMBS } from './muscles';
const X = x => 100 + x * 60, Y = y => 20 + (1.95 - y) * 100;
const GREEN = '#22c55e', LIGHT = '#86efac', BASE = '#e7e5e4', SKIN = '#f3f1ee';

function View({ side, primary, secondary, selected, onSelect }) {
  const shapes = [];
  MUSCLES.forEach(m => m.shapes.forEach((sh, i) => {
    if (sh.side !== 'both' && sh.side !== side) return;
    const fill = selected === m.id || primary.includes(m.id) ? GREEN : secondary.includes(m.id) ? LIGHT : BASE;
    (sh.mirror ? [1, -1] : [1]).forEach(sg => shapes.push(
      <ellipse key={m.id + i + sg} cx={X(sh.p[0] * sg)} cy={Y(sh.p[1])} rx={sh.s[0] * 60} ry={sh.s[1] * 100} fill={fill}
        stroke="#d6d3d1" strokeWidth=".6" style={onSelect ? { cursor: 'pointer' } : null} onClick={onSelect ? () => onSelect(m.id) : undefined}>
        <title>{m.name}</title></ellipse>));
  }));
  return <g>
    <circle cx="100" cy={Y(1.58)} r="24" fill={SKIN}/>
    <rect x={X(-0.11)} y={Y(1.45)} width="13" height="16" fill={SKIN}/>
    <ellipse cx="100" cy={Y(0.62)} rx={0.56 * 60} ry={0.82 * 100} fill={SKIN}/>
    <ellipse cx="100" cy={Y(0)} rx={0.5 * 60} ry={0.28 * 100} fill={SKIN}/>
    {LIMBS.flatMap(([a, b, r], i) => [1, -1].map(sg => <line key={i + '' + sg} x1={X(a[0] * sg)} y1={Y(a[1])} x2={X(b[0] * sg)} y2={Y(b[1])}
      stroke={SKIN} strokeWidth={r * 2 * 60} strokeLinecap="round"/>))}
    {shapes}
  </g>;
}
// Front + back muscle illustration. primary/secondary are muscle ids; selected highlights one muscle (interactive mode).
export default function BodyMap({ primary = [], secondary = [], selected, onSelect, height = 150, labels = true }) {
  return <div className="bodymap" style={{ height }}>
    {['front', 'back'].map(side => <div key={side} className="bodymap-view">
      <svg viewBox="20 10 160 390" height="100%" role="img" aria-label={`${side} muscle map`}>
        <View side={side} primary={primary} secondary={secondary} selected={selected} onSelect={onSelect}/></svg>
      {labels && <span>{side}</span>}</div>)}
  </div>;
}
