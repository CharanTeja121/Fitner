import React, { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, ReferenceLine } from 'recharts';
import { Dumbbell, Utensils, Flame, Activity } from 'lucide-react';
import { api, today, fmt } from '../api';
import { NutritionSummary, COLORS } from '../ui';

export default function Dashboard({ ctx }) {
  const [daily, setDaily] = useState(null), [prog, setProg] = useState(null), [err, setErr] = useState('');
  useEffect(() => {
    Promise.all([api('/nutrition/daily?date=' + today()), api('/progress?range=week')]).then(([d, p]) => { setDaily(d); setProg(p); setErr(''); }).catch(e => setErr(e.message));
  }, [ctx.version]);
  const s = ctx.stats, name = ctx.profile.name || 'Athlete';
  return <div className="stack">
    <section className="hero"><div><span className="pill">TRAIN SMART · EAT SMART</span><h2>Hello, {name}.</h2>
      <p>{ctx.profile.goal === 'fat_loss' ? 'Weight loss' : ctx.profile.goal === 'muscle_gain' ? 'Muscle gain' : 'Weight maintenance'} goal · BMI {s?.bmi ?? '—'}{s?.calories ? ` · ${fmt(s.calories)} kcal/day target` : ''}</p>
      <div className="btn-row wrap"><button className="primary" onClick={() => ctx.go('workouts')}><Dumbbell size={16}/> Start a workout</button><button className="ghost light" onClick={() => ctx.go('food')}><Utensils size={16}/> Log a meal</button></div></div></section>
    {err && <div className="card"><p className="warn">{err}</p></div>}
    {daily && <div className="grid-2"><NutritionSummary totals={daily.totals} targets={daily.targets}/>
      <section className="card"><span className="eyebrow">THIS WEEK</span>
        <div className="mini-stats"><div><Flame color={COLORS.calories}/><b>{fmt(prog?.summary.avg_calories)}</b><small>avg kcal / logged day</small></div>
          <div><Activity color="#22c55e"/><b>{prog?.summary.workout_days ?? 0}</b><small>workout days</small></div>
          <div><Dumbbell color="#111827"/><b>{prog?.summary.total_sets ?? 0}</b><small>sets completed</small></div></div>
        <div className="chart-sm"><ResponsiveContainer width="100%" height="100%"><BarChart data={prog?.days || []}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11}/><Tooltip formatter={v => [v + ' kcal', 'Calories']}/>
          {daily.targets.calories && <ReferenceLine y={daily.targets.calories} stroke="#9ca3af" strokeDasharray="4 3"/>}
          <Bar dataKey="calories" fill={COLORS.calories} radius={[6, 6, 0, 0]}/></BarChart></ResponsiveContainer></div></section></div>}
    {s && <section className="card"><span className="eyebrow">YOUR DAILY TARGETS</span>
      <div className="target-row">{[['Calories', s.calories, 'kcal', COLORS.calories], ['Protein', s.protein_g, 'g', COLORS.protein], ['Carbs', s.carbs_g, 'g', COLORS.carbs], ['Fat', s.fat_g, 'g', COLORS.fat], ['Fiber', s.fiber_g, 'g', COLORS.fiber]]
        .map(([n, v, u, c]) => <div key={n}><i style={{ background: c }}/><small>{n}</small><b>{v == null ? '—' : fmt(v) + ' ' + u}</b></div>)}</div>
      <p className="muted small">{s.note}</p></section>}
  </div>;
}
