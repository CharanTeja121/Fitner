import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CATEGORIES, MUSCLES, levelLabel } from '../muscles';
import { ExerciseCard, Empty } from '../ui';

export default function Library({ ctx }) {
  const [q, setQ] = useState(''), [cat, setCat] = useState('All'), [lvl, setLvl] = useState('All'), [eq, setEq] = useState('All'), [mu, setMu] = useState('All');
  const equipment = useMemo(() => ['All', ...new Set(ctx.exercises.map(e => e.equipment))].sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b))), [ctx.exercises]);
  const list = ctx.exercises.filter(e => (cat === 'All' || e.group === cat) && (lvl === 'All' || e.level === lvl) && (eq === 'All' || e.equipment === eq) && (mu === 'All' || e.muscles.includes(mu))
    && (!q || JSON.stringify([e.name, e.group, e.primary, e.secondary, e.equipment, e.tags]).toLowerCase().includes(q.toLowerCase())));
  return <div className="stack">
    <section className="card"><span className="eyebrow">EXERCISE LIBRARY</span><h2>What does each exercise train?</h2>
      <div className="search-row"><div className="input-icon"><Search size={16}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search bench press, squat, curl, shoulders…" aria-label="Search exercises"/></div></div>
      <div className="filters">
        <label>Category<select value={cat} onChange={e => setCat(e.target.value)}><option>All</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Level<select value={lvl} onChange={e => setLvl(e.target.value)}><option value="All">All</option>{['Beginner', 'Moderate', 'Pro'].map(l => <option key={l} value={l}>{levelLabel(l)}</option>)}</select></label>
        <label>Equipment<select value={eq} onChange={e => setEq(e.target.value)}>{equipment.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Muscle<select value={mu} onChange={e => setMu(e.target.value)}><option value="All">All</option>{MUSCLES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div>
      <p className="muted small">{list.length} of {ctx.exercises.length} exercises</p></section>
    {list.length ? <div className="ex-grid">{list.map(e => <ExerciseCard key={e.name} ex={e}/>)}</div> : <Empty text="No exercises match these filters."/>}
  </div>;
}
