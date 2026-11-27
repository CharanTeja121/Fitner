import React, { useEffect, useState } from 'react';
import { CartesianGrid, Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts';
import { api, today, fmt, mmss } from '../api';
import { COLORS } from '../ui';

const Chart = ({ title, children, note }) => <section className="card"><h3>{title}</h3><div className="chart">{children}</div>{note && <p className="muted small">{note}</p>}</section>;
const axis = { tickLine: false, axisLine: false, fontSize: 11 };

export default function Progress({ ctx }) {
  const [range, setRange] = useState('week'), [d, setD] = useState(null), [err, setErr] = useState(''), [w, setW] = useState('');
  useEffect(() => { api('/progress?range=' + range).then(x => { setD(x); setErr(''); }).catch(e => setErr(e.message)); }, [range, ctx.version]);
  const logWeight = async () => { try { await api('/weight', { method: 'POST', json: { weight_kg: w, date: today() } }); setW(''); ctx.bump(); ctx.toast('Weight saved.'); } catch (e) { ctx.toast(e.message, 'error'); } };
  if (err) return <div className="card"><p className="warn">{err}</p></div>;
  if (!d) return <div className="card"><p className="muted">Loading progress…</p></div>;
  const s = d.summary, t = d.targets, tick = range === 'month' ? 4 : 0;
  return <div className="stack">
    <div className="date-nav"><h2>Progress</h2><div className="seg-group">{['week', 'month'].map(r => <button key={r} className={'seg ' + (range === r ? 'on' : '')} onClick={() => setRange(r)}>{r === 'week' ? 'Weekly' : 'Monthly'}</button>)}</div></div>
    <div className="stats-grid">{[['Avg calories', fmt(s.avg_calories) + ' kcal', `${s.days_logged} ${s.days_logged === 1 ? 'day' : 'days'} logged`], ['Avg protein', fmt(s.avg_protein, 1) + ' g', 'per logged day'], ['Avg fiber', fmt(s.avg_fiber, 1) + ' g', 'per logged day'],
      ['Workouts', s.workout_days + (s.workout_days === 1 ? ' day' : ' days'), `${s.total_sets} ${s.total_sets === 1 ? 'set' : 'sets'} · ${s.completion_pct}% completed`], ['Weight', s.current_weight ? s.current_weight + ' kg' : '—', s.weight_change != null ? `${s.weight_change > 0 ? '+' : ''}${s.weight_change} kg in period` : 'log more entries']]
      .map(([a, b, c]) => <div className="stat-card" key={a}><span>{a}</span><strong>{b}</strong><small>{c}</small></div>)}</div>
    <div className="grid-2">
      <Chart title="Daily calorie intake" note={t.calories ? 'Dashed line = your daily target.' : null}><ResponsiveContainer><BarChart data={d.days}><CartesianGrid vertical={false} stroke="#eee"/><XAxis dataKey="label" interval={tick} {...axis}/><YAxis {...axis} width={40} domain={[0, max => Math.max(max, t.calories || 0)]}/><Tooltip/>
        {t.calories && <ReferenceLine y={t.calories} stroke="#6b7280" strokeDasharray="4 3"/>}<Bar dataKey="calories" name="kcal" fill={COLORS.calories} radius={[5, 5, 0, 0]}/></BarChart></ResponsiveContainer></Chart>
      <Chart title="Protein & fiber (g)"><ResponsiveContainer><LineChart data={d.days}><CartesianGrid vertical={false} stroke="#eee"/><XAxis dataKey="label" interval={tick} {...axis}/><YAxis {...axis} width={34}/><Tooltip/><Legend/>
        <Line dataKey="protein" name="Protein" stroke={COLORS.protein} strokeWidth={2.5} dot={false}/><Line dataKey="fiber" name="Fiber" stroke={COLORS.fiber} strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></Chart>
      <Chart title="Weekly nutrition history (macros, g)"><ResponsiveContainer><BarChart data={d.days}><CartesianGrid vertical={false} stroke="#eee"/><XAxis dataKey="label" interval={tick} {...axis}/><YAxis {...axis} width={34}/><Tooltip/><Legend/>
        <Bar dataKey="protein" name="Protein" stackId="m" fill={COLORS.protein}/><Bar dataKey="carbs" name="Carbs" stackId="m" fill={COLORS.carbs}/><Bar dataKey="fat" name="Fat" stackId="m" fill={COLORS.fat} radius={[5, 5, 0, 0]}/></BarChart></ResponsiveContainer></Chart>
      <Chart title="Workout completion (sets)"><ResponsiveContainer><BarChart data={d.days}><CartesianGrid vertical={false} stroke="#eee"/><XAxis dataKey="label" interval={tick} {...axis}/><YAxis {...axis} width={30} allowDecimals={false}/><Tooltip/><Legend/>
        <Bar dataKey="sets_total" name="Planned" fill="#d1d5db" radius={[5, 5, 0, 0]}/><Bar dataKey="sets_done" name="Completed" fill="#22c55e" radius={[5, 5, 0, 0]}/></BarChart></ResponsiveContainer></Chart>
    </div>
    <section className="card"><div className="card-h"><h3>Weight tracking</h3><div className="inline-form"><input type="number" step="0.1" min="1" max="500" placeholder="Today's weight (kg)" value={w} onChange={e => setW(e.target.value)} aria-label="Weight in kg"/><button className="primary" disabled={!w} onClick={logWeight}>Log weight</button></div></div>
      {d.weight.length < 2 ? <p className="muted">Log your weight on at least two days to see the trend ({d.weight.length} entry so far).</p> :
        <div className="chart"><ResponsiveContainer><LineChart data={d.weight}><CartesianGrid vertical={false} stroke="#eee"/><XAxis dataKey="date" tickFormatter={x => x.slice(5)} {...axis}/><YAxis domain={['dataMin - 1', 'dataMax + 1']} {...axis} width={40}/><Tooltip/><Line dataKey="weight_kg" name="kg" stroke="#111827" strokeWidth={2.5} dot/></LineChart></ResponsiveContainer></div>}</section>
    <section className="card"><h3>Workout history</h3>{d.workout_history.length === 0 ? <p className="muted">No workouts saved yet. Finish a workout in Workout Plans to see it here.</p> :
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Exercise</th><th>Sets</th><th>Duration</th></tr></thead><tbody>{d.workout_history.map(h => <tr key={h.id}><td>{h.date}</td><td>{h.category}</td><td>{h.exercise}</td><td>{h.sets_done}/{h.sets_total}</td><td>{h.duration_s ? mmss(h.duration_s) : '—'}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
