import React, { useMemo, useState } from 'react';
import { Play, Pause, RotateCcw, Save, SkipForward, Sparkles, Timer } from 'lucide-react';
import { api, mmss } from '../api';
import { CATEGORIES, PLANS, LEVELS, restFor, MUSCLES, MUSCLE_BY_ID } from '../muscles';
import { ExerciseCard } from '../ui';
import BodyMap from '../BodyMap';

const EQUIP = ['Bodyweight', 'Dumbbells', 'Barbell', 'Cable', 'Pull-up bar'];

export default function Workouts({ ctx }) {
  const { workout: w } = ctx;
  const byName = useMemo(() => Object.fromEntries(ctx.exercises.map(e => [e.name, e])), [ctx.exercises]);
  const plan = (PLANS[w.state.category] || []).map(([n, reps]) => ({ ex: byName[n], reps })).filter(p => p.ex);
  const sets = LEVELS[w.state.level].sets;
  const total = plan.length * sets;
  const done = plan.reduce((a, p) => a + Math.min(sets, w.state.done[p.ex.name] || 0), 0);
  const groupMuscles = MUSCLES.filter(m => m.group === w.state.category).map(m => m.id);
  const [rec, setRec] = useState({ muscle: 'chest', equipment: ctx.profile.equipment?.length ? ctx.profile.equipment : ['Bodyweight', 'Dumbbells'], list: null, busy: false });
  const level = ctx.profile.level || 'Beginner';

  const finish = async () => {
    const items = plan.filter(p => (w.state.done[p.ex.name] || 0) > 0).map(p => ({ name: p.ex.name, sets_done: Math.min(sets, w.state.done[p.ex.name]), sets_total: sets }));
    if (!items.length) return ctx.toast('Complete at least one set before saving the workout.', 'error');
    try { await api('/workouts/log', { method: 'POST', json: { category: w.state.category, duration_s: w.state.elapsed, exercises: items } }); w.reset(); ctx.bump(); ctx.toast(`Workout saved: ${items.length} exercises, ${items.reduce((a, i) => a + i.sets_done, 0)} sets.`); }
    catch (e) { ctx.toast(e.message, 'error'); }
  };
  const recommend = async () => {
    setRec(r => ({ ...r, busy: true }));
    try { const d = await api('/recommend', { method: 'POST', json: { muscle: rec.muscle, level, goal: ctx.profile.goal, equipment: rec.equipment } }); setRec(r => ({ ...r, list: d, busy: false })); }
    catch (e) { ctx.toast(e.message, 'error'); setRec(r => ({ ...r, busy: false })); }
  };

  return <div className="stack">
    <section className="card plan-head">
      <div className="plan-title"><div><span className="eyebrow">WORKOUT PLAN</span><h2>{w.state.category} Workout</h2>
        <p className="muted">{LEVELS[w.state.level].label}: {sets} sets per exercise · rest 60–120 s (compound lifts rest longer)</p></div>
        <BodyMap primary={groupMuscles} height={120} labels={false}/></div>
      <div className="tabs">{CATEGORIES.map(c => <button key={c} className={'tab ' + (w.state.category === c ? 'on' : '')} onClick={() => w.setCategory(c)}>{c}</button>)}</div>
      <div className="level-row">{LEVELS.map((l, i) => <button key={l.label} className={'seg ' + (w.state.level === i ? 'on' : '')} onClick={() => w.setLevel(i)}>{l.label} · {l.sets} sets</button>)}</div>
    </section>

    <section className="card timer-bar">
      <div className="timer-cell"><Timer size={18}/><div><small>WORKOUT TIME</small><b>{mmss(w.state.elapsed)}</b></div></div>
      <div className="timer-cell"><div><small>REST TIMER</small><b className={w.state.rest > 0 ? 'rest-on' : ''}>{w.state.rest > 0 ? mmss(w.state.rest) : 'Ready'}</b></div>
        {w.state.rest > 0 && <><button className="ghost sm" onClick={() => w.addRest(15)}>+15s</button><button className="ghost sm" onClick={w.skipRest}><SkipForward size={14}/> Skip</button></>}</div>
      <div className="progress-cell"><small>PROGRESS · {done}/{total} sets</small><div className="bar big"><div style={{ width: (total ? (done / total) * 100 : 0) + '%', background: '#22c55e' }}/></div></div>
      <div className="btn-row"><button className="ghost" onClick={w.toggle}>{w.state.running ? <><Pause size={15}/> Pause</> : <><Play size={15}/> Start</>}</button>
        <button className="ghost" onClick={w.reset}><RotateCcw size={15}/> Reset</button><button className="primary" onClick={finish}><Save size={15}/> Finish & save</button></div>
    </section>

    <div className="ex-grid">{plan.map(({ ex, reps }) => <ExerciseCard key={ex.name} ex={ex} sets={sets} reps={reps || ex.reps} rest={restFor(ex, w.state.level)}
      tracker={{ done: Math.min(sets, w.state.done[ex.name] || 0), onToggle: i => w.toggleSet(ex.name, i, restFor(ex, w.state.level)) }}/>)}</div>

    <section className="card">
      <div className="card-h"><div><span className="eyebrow">ML-POWERED EXERCISE MATCHING</span><h2><Sparkles size={20}/> Find exercises for a muscle</h2>
        <p className="muted small">Ranked by the trained TF-IDF + cosine-similarity model, boosted by the chosen muscle and filtered by your experience level ({level}) and equipment.</p></div></div>
      <div className="form-row">
        <label>Muscle<select value={rec.muscle} onChange={e => setRec({ ...rec, muscle: e.target.value })}>{MUSCLES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <div className="chip-wrap">{EQUIP.map(q => <button key={q} className={'chip ' + (rec.equipment.includes(q) ? 'on' : '')} onClick={() => setRec({ ...rec, equipment: rec.equipment.includes(q) ? rec.equipment.filter(x => x !== q) : [...rec.equipment, q] })}>{q}</button>)}</div>
        <button className="primary" onClick={recommend} disabled={rec.busy}>{rec.busy ? 'Ranking…' : 'Recommend'}</button></div>
      {rec.list && (rec.list.recommendations.length === 0
        ? <p className="muted">{rec.list.model_ready ? 'No exercises match those filters. Try adding equipment.' : 'The recommender model is not loaded. Run python train_recommender.py.'}</p>
        : <div className="ex-grid">{rec.list.recommendations.map(e => <div key={e.name} className="match-wrap"><span className="match-badge">{Math.round(e.match_score * 100)}% match</span>
            <ExerciseCard ex={e} sets={e.prescription.sets} reps={e.prescription.reps} rest={e.prescription.rest_seconds} compact/></div>)}</div>)}
    </section>
  </div>;
}
