import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { api, fmt } from '../api';
import { COLORS } from '../ui';
import { levelLabel } from '../muscles';

const EQUIP = ['Bodyweight', 'Dumbbells', 'Barbell', 'Cable', 'Pull-up bar'];
export default function Profile({ ctx }) {
  const [p, setP] = useState({ ...ctx.profile, equipment: ctx.profile.equipment || [] }), [busy, setBusy] = useState(false);
  const set = (k, v) => setP(x => ({ ...x, [k]: v }));
  const save = async () => {
    setBusy(true);
    try { const r = await api('/profile', { method: 'POST', json: p }); ctx.setProfile(r.profile); ctx.setStats(r); ctx.bump(); ctx.toast('Profile saved.'); }
    catch (e) { ctx.toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const s = ctx.stats;
  return <div className="split">
    <section className="card"><span className="eyebrow">ATHLETE PROFILE</span><h2>Personal details</h2>
      <div className="form-grid">
        <label>Name<input value={p.name || ''} onChange={e => set('name', e.target.value)}/></label>
        <label>Age<input type="number" min="1" max="110" value={p.age} onChange={e => set('age', Number(e.target.value))}/></label>
        <label>Height (cm)<input type="number" value={p.height_cm} onChange={e => set('height_cm', Number(e.target.value))}/></label>
        <label>Weight (kg)<input type="number" step="0.1" value={p.weight_kg} onChange={e => set('weight_kg', Number(e.target.value))}/></label>
        <label>Sex (optional)<select value={p.sex} onChange={e => set('sex', e.target.value)}><option value="male">Male</option><option value="female">Female</option><option value="other">Other / prefer not to say</option></select></label>
        <label>Activity level<select value={p.activity_factor} onChange={e => set('activity_factor', Number(e.target.value))}><option value="1.2">Sedentary</option><option value="1.375">Lightly active</option><option value="1.55">Moderately active</option><option value="1.725">Very active</option></select></label>
        <label>Fitness goal<select value={p.goal === 'weight_loss' ? 'fat_loss' : p.goal} onChange={e => set('goal', e.target.value)}><option value="fat_loss">Weight loss</option><option value="muscle_gain">Muscle gain</option><option value="maintenance">Weight maintenance</option></select></label>
        <label>Experience level<select value={p.level || 'Beginner'} onChange={e => set('level', e.target.value)}>{['Beginner', 'Moderate', 'Pro'].map(l => <option key={l} value={l}>{levelLabel(l)}</option>)}</select></label>
        <label>Profession<input value={p.profession || ''} onChange={e => set('profession', e.target.value)}/></label></div>
      <h4>Available equipment</h4><div className="chip-wrap">{EQUIP.map(q => <button key={q} className={'chip ' + (p.equipment.includes(q) ? 'on' : '')} onClick={() => set('equipment', p.equipment.includes(q) ? p.equipment.filter(x => x !== q) : [...p.equipment, q])}>{q}</button>)}</div>
      <button className="primary" onClick={save} disabled={busy}><Save size={16}/> Save & calculate</button></section>
    <section className="card"><span className="eyebrow">YOUR ESTIMATES</span><h2>BMI {s?.bmi ?? '—'}</h2><p className="muted">{s?.bmi_category}</p>
      <div className="target-col">{[['Daily calories', s?.calories, 'kcal', COLORS.calories], ['Protein', s?.protein_g, 'g', COLORS.protein], ['Carbohydrates', s?.carbs_g, 'g', COLORS.carbs], ['Fat', s?.fat_g, 'g', COLORS.fat], ['Fiber', s?.fiber_g, 'g', COLORS.fiber]]
        .map(([n, v, u, c]) => <div key={n}><i style={{ background: c }}/><span>{n}</span><b>{v == null ? '—' : fmt(v) + ' ' + u}</b></div>)}</div>
      <div className="info-note">{s?.note || 'Save your profile to calculate estimates.'}</div>
      <p className="muted small">Calculated with the Mifflin-St Jeor equation, your activity level and goal. These are general estimates, not medical prescriptions. BMI is a screening measure and ignores muscle mass.</p></section>
  </div>;
}
