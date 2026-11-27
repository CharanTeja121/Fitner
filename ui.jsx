import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, X, ChevronDown, ChevronUp, Dumbbell, Timer, Repeat, ShieldCheck, Camera, Check } from 'lucide-react';
import ExerciseFigure from './ExerciseFigure';
import BodyMap from './BodyMap';
import { muscleName, levelLabel, restFor } from './muscles';
import { fmt } from './api';

export const COLORS = { calories: '#f97316', protein: '#ec4899', carbs: '#f59e0b', fat: '#3b82f6', fiber: '#10b981' };
export const MACROS = [['protein', 'Protein', 'P'], ['carbs', 'Carbs', 'C'], ['fat', 'Fat', 'F'], ['fiber', 'Fiber', 'Fi']];

export function Ring({ value, target, size = 130 }) {
  const r = 52, c = 2 * Math.PI * r, pct = target ? Math.min(1, value / target) : 0;
  return <svg width={size} height={size} viewBox="0 0 130 130" className="ring" role="img" aria-label={target ? `${Math.round(pct * 100)}% of calorie target` : 'No calorie target'}>
    <circle cx="65" cy="65" r={r} fill="none" stroke="#fde7d9" strokeWidth="11"/>
    <circle cx="65" cy="65" r={r} fill="none" stroke={value > target ? '#ea580c' : COLORS.calories} strokeWidth="11" strokeLinecap="round"
      strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 65 65)" style={{ transition: 'stroke-dashoffset .6s ease' }}/>
    <text x="65" y="71" textAnchor="middle" fontSize="22" fontWeight="800" fill={COLORS.calories}>{target ? Math.round(pct * 100) + '%' : '—'}</text>
  </svg>;
}

export function NutritionSummary({ totals, targets, title = "TODAY'S NUTRITION" }) {
  const t = targets?.calories, left = t == null ? null : Math.round(t - totals.calories);
  return <section className="card nutri">
    <div className="nutri-top">
      <div><span className="eyebrow">{title}</span>
        <div className="cal-big"><b>{fmt(totals.calories)}</b><span> / {t == null ? 'no target' : fmt(t) + ' kcal'}</span></div>
        <div className={'cal-left ' + (left != null && left < 0 ? 'over' : '')}>{left == null ? 'Calorie targets are not provided for users under 18.' : left >= 0 ? `${fmt(left)} kcal remaining` : `${fmt(-left)} kcal over target`}</div></div>
      <Ring value={totals.calories} target={t}/>
    </div>
    <div className="macro-grid">{MACROS.map(([k, name]) => {
      const tg = targets?.[k], pct = tg ? Math.min(100, (totals[k] / tg) * 100) : 0;
      return <div key={k} className="macro"><div className="macro-h"><i style={{ background: COLORS[k] }}/>{name.toUpperCase()}</div>
        <div className="macro-v"><b>{fmt(totals[k], 1)}g</b><span> / {tg == null ? '—' : fmt(tg) + 'g'}</span></div>
        <div className="bar"><div style={{ width: pct + '%', background: COLORS[k] }}/></div></div>;
    })}</div>
  </section>;
}

export function Modal({ title, onClose, children }) {
  useEffect(() => { const h = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return <div className="modal-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-h"><h3>{title}</h3><button className="icon-ghost" onClick={onClose} aria-label="Close"><X size={18}/></button></div>{children}</div></div>;
}

export function MealThumb({ meal, emoji }) {
  const [bad, setBad] = useState(false);
  return <div className="meal-img">{meal.image_url && !bad ? <img src={meal.image_url} alt={meal.food_name} onError={() => setBad(true)}/> : <span>{emoji || '🍽️'}</span>}</div>;
}

export function MealCard({ meal, emoji, onEdit, onDelete }) {
  return <div className="meal-card">
    <MealThumb meal={meal} emoji={emoji}/>
    <div className="meal-body"><h4>{meal.food_name}</h4><small>{fmt(meal.grams, 1)} g serving{meal.source === 'model' ? ' · AI-suggested' : ''}</small>
      <div className="meal-macros"><b style={{ color: COLORS.calories }}>{fmt(meal.calories)} cal</b>
        {MACROS.map(([k, , s]) => <span key={k}><i style={{ background: COLORS[k] }}/>{fmt(meal[k], 1)}g<em>{s === 'Fi' ? ' fiber' : ''}</em></span>)}</div></div>
    <div className="meal-actions"><button className="icon-ghost" onClick={() => onEdit(meal)} aria-label={`Edit ${meal.food_name}`}><Pencil size={17}/></button>
      <button className="icon-ghost danger" onClick={() => onDelete(meal)} aria-label={`Delete ${meal.food_name}`}><Trash2 size={17}/></button></div>
  </div>;
}

export function EditMealModal({ meal, onClose, onSave }) {
  const [grams, setGrams] = useState(meal.grams), [type, setType] = useState(meal.meal_type), [file, setFile] = useState(null), [remove, setRemove] = useState(false), [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); try { await onSave({ grams, meal_type: type, file, remove }); } finally { setBusy(false); } };
  return <Modal title={`Edit ${meal.food_name}`} onClose={onClose}>
    <div className="form-grid one">
      <label>Weight (g)<input type="number" min="1" max="5000" value={grams} onChange={e => setGrams(e.target.value)}/></label>
      <label>Meal<select value={type} onChange={e => setType(e.target.value)}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="snack">Evening Snacks</option><option value="dinner">Dinner</option></select></label>
      <label>Photo<span className="file-line"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { setFile(e.target.files[0] || null); setRemove(false); }}/></span></label>
      {meal.image_url && !file && <label className="check"><input type="checkbox" checked={remove} onChange={e => setRemove(e.target.checked)}/> Remove current photo</label>}
    </div>
    <p className="muted small">Nutrition is rescaled from the saved values for the new weight.</p>
    <div className="modal-f"><button className="ghost" onClick={onClose}>Cancel</button><button className="primary" disabled={busy} onClick={submit}><Check size={16}/> Save changes</button></div>
  </Modal>;
}

export function ConfirmModal({ title, text, confirm = 'Delete', onClose, onConfirm }) {
  return <Modal title={title} onClose={onClose}><p>{text}</p><div className="modal-f"><button className="ghost" onClick={onClose}>Cancel</button><button className="primary danger-btn" onClick={onConfirm}>{confirm}</button></div></Modal>;
}

export function ExerciseCard({ ex, sets, reps, rest, tracker, compact }) {
  const [open, setOpen] = useState(false), [hover, setHover] = useState(false);
  const S = sets ?? ex.sets, R = reps ?? ex.reps, T = rest ?? ex.rest_seconds;
  return <article className={'ex-card ' + (tracker?.done >= S ? 'complete' : '')}>
    <div className="ex-fig" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)} tabIndex={0}>
      <ExerciseFigure pose={ex.pose} primary={ex.muscles.slice(0, Math.max(1, ex.primary.length > 1 ? 2 : 1))} secondary={ex.muscles.slice(2)} animate={hover || open} label={`${ex.name} demonstration`}/>
      <span className="play-hint">{hover || open ? 'Playing' : 'Hover to animate'}</span>
    </div>
    <div className="ex-main">
      <div className="ex-title"><h3>{ex.name}</h3><span className={'lvl lvl-' + ex.level}>{levelLabel(ex.level)}</span></div>
      <div className="chips"><span><Repeat size={13}/> {S} sets × {R}</span><span><Timer size={13}/> {T}s rest</span><span><Dumbbell size={13}/> {ex.equipment}</span></div>
      <p className="muted small"><b>Primary:</b> {ex.primary.join(', ')}<br/><b>Secondary:</b> {ex.secondary.join(', ') || '—'}</p>
      {!compact && <BodyMap primary={ex.muscles.slice(0, Math.max(1, ex.primary.length > 1 ? 2 : 1))} secondary={ex.muscles.slice(2)} height={96} labels={false}/>}
      {tracker && <div className="sets-row" aria-label="Completed sets">{Array.from({ length: S }, (_, i) => <button key={i} className={'set-dot ' + (i < tracker.done ? 'on' : '')}
        onClick={() => tracker.onToggle(i)} aria-label={`Set ${i + 1} ${i < tracker.done ? 'completed' : 'not completed'}`}>{i < tracker.done ? <Check size={15}/> : i + 1}</button>)}
        <span className="muted small">{tracker.done}/{S} sets</span></div>}
      <button className="text-btn" onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? <>Hide details <ChevronUp size={14}/></> : <>Steps & safety <ChevronDown size={14}/></>}</button>
      {open && <div className="ex-more"><p className="muted small">{ex.description}</p>
        <h5>How to do it</h5><ol>{ex.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>
        <h5><ShieldCheck size={14}/> Safety tips</h5><ul>{ex.safety.map((s, i) => <li key={i}>{s}</li>)}</ul>
        <p className="small"><b>Muscles:</b> {ex.muscles.map(muscleName).join(', ')}</p></div>}
    </div>
  </article>;
}

export function Empty({ icon, text, action }) { return <div className="empty">{icon}<p>{text}</p>{action}</div>; }
