import React, { useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Dumbbell, ArrowLeftRight } from 'lucide-react';
import MuscleScene from '../MuscleScene';
import BodyMap from '../BodyMap';
import { MUSCLES, MUSCLE_BY_ID, levelLabel } from '../muscles';

export default function Anatomy({ ctx }) {
  const api = useRef(null);
  const [selected, setSelected] = useState(null), [view, setView] = useState('front');
  const m = selected ? MUSCLE_BY_ID[selected] : null;
  const list = m ? ctx.exercises.filter(e => e.muscles.includes(m.id)) : [];
  const go = v => { setView(v); api.current?.setView(v); };
  return <div className="split">
    <section className="card scene-card">
      <div className="card-h"><div><span className="eyebrow">INTERACTIVE 3D BODY</span><h2>Explore muscle groups</h2></div>
        <div className="btn-row">
          <button className="ghost" onClick={() => go(view === 'front' ? 'back' : 'front')}><ArrowLeftRight size={15}/> Flip front / back</button>
          <button className="ghost" onClick={() => { setView('front'); api.current?.reset(); }}><RotateCcw size={15}/> Reset camera</button></div></div>
      <MuscleScene selectedId={selected} onSelect={setSelected} apiRef={api}/>
      <div className="view-bar">
        {['front', 'back', 'left', 'right'].map(v => <button key={v} className={'seg ' + (view === v ? 'on' : '')} onClick={() => go(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
        <span className="grow"/><button className="icon-ghost" onClick={() => api.current?.zoom(0.82)} aria-label="Zoom in"><ZoomIn size={18}/></button>
        <button className="icon-ghost" onClick={() => api.current?.zoom(1.22)} aria-label="Zoom out"><ZoomOut size={18}/></button></div>
      <p className="muted small">This is a stylised educational model built with Three.js, not a clinical anatomical scan. Its muscle regions are simplified.</p>
    </section>
    <section className="card side-card">
      <span className="eyebrow">{m ? 'SELECTED MUSCLE' : 'SELECT A MUSCLE'}</span>
      <h2 className="green-h">{m ? m.name : 'Tap the body or pick below'}</h2>
      {m ? <>
        <p>{m.desc}</p>
        <BodyMap primary={[m.id]} height={150}/>
        <h4>Recommended exercises</h4>
        <ul className="rec-list">{list.slice(0, 6).map(e => <li key={e.name}><b>{e.name}</b><span>{e.sets} × {e.reps} · {levelLabel(e.level)}</span></li>)}</ul>
        <button className="primary" onClick={() => ctx.go('workouts', { category: m.group })}><Dumbbell size={16}/> Open {m.group} workout</button>
      </> : <p className="muted">Selected muscles turn green in the 3D view. You can rotate the model with the mouse or your finger.</p>}
      <h4>All muscle groups</h4>
      <div className="chip-wrap">{MUSCLES.map(x => <button key={x.id} className={'chip ' + (selected === x.id ? 'on' : '')} onClick={() => setSelected(x.id)}>{x.name}</button>)}</div>
    </section>
  </div>;
}
