import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Utensils } from 'lucide-react';
import { api, today, shiftDate } from '../api';
import { MEAL_ORDER } from '../muscles';
import { NutritionSummary, MealCard, EditMealModal, ConfirmModal, Empty } from '../ui';

export default function Nutrition({ ctx }) {
  const [date, setDate] = useState(today()), [data, setData] = useState(null), [edit, setEdit] = useState(null), [del, setDel] = useState(null), [err, setErr] = useState('');
  useEffect(() => { api('/nutrition/daily?date=' + date).then(d => { setData(d); setErr(''); }).catch(e => setErr(e.message)); }, [date, ctx.version]);
  const emoji = id => ctx.foods.find(f => f.id === id)?.emoji;
  const save = async ({ grams, meal_type, file, remove }) => {
    try {
      const fd = new FormData(); fd.append('id', edit.id); fd.append('grams', grams); fd.append('meal_type', meal_type);
      if (file) fd.append('image', file); if (remove) fd.append('remove_image', 'true');
      await api('/nutrition/update', { method: 'PUT', form: fd }); setEdit(null); ctx.bump(); ctx.toast('Meal updated.');
    } catch (e) { ctx.toast(e.message, 'error'); }
  };
  const remove = async () => { try { await api('/nutrition/delete', { method: 'DELETE', json: { id: del.id } }); setDel(null); ctx.bump(); ctx.toast('Meal deleted.'); } catch (e) { ctx.toast(e.message, 'error'); } };
  if (err) return <div className="card"><p className="warn">{err}</p></div>;
  if (!data) return <div className="card"><p className="muted">Loading diary…</p></div>;
  const isToday = date === today();
  return <div className="stack narrow">
    <div className="date-nav"><h2>{isToday ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
      <div className="btn-row"><button className="icon-ghost circle" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day"><ChevronLeft size={18}/></button>
        <button className="icon-ghost circle" disabled={isToday} onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day"><ChevronRight size={18}/></button>
        <button className="primary" onClick={() => ctx.go('food', { mealType: 'lunch' })}><Plus size={16}/> Add food</button></div></div>
    <NutritionSummary totals={data.totals} targets={data.targets} title={isToday ? "TODAY'S NUTRITION" : 'DAILY NUTRITION'}/>
    <div className="section-h"><h3>Meals</h3><span className="muted">{data.count} {data.count === 1 ? 'entry' : 'entries'}</span></div>
    {data.count === 0 && <Empty icon={<Utensils size={34}/>} text="No meals logged for this day yet." action={<button className="primary" onClick={() => ctx.go('food')}>Log a meal</button>}/>}
    {MEAL_ORDER.map(([key, label]) => <section key={key} className="meal-sec"><div className="section-h"><h4>{label}</h4>
      <button className="text-btn" onClick={() => ctx.go('food', { mealType: key })}><Plus size={14}/> Add</button></div>
      {data.meals[key].length === 0 ? <p className="muted small pad">Nothing logged.</p> : data.meals[key].map(m => <MealCard key={m.id} meal={m} emoji={emoji(m.food_id)} onEdit={setEdit} onDelete={setDel}/>)}</section>)}
    {edit && <EditMealModal meal={edit} onClose={() => setEdit(null)} onSave={save}/>}
    {del && <ConfirmModal title="Delete meal?" text={`Remove ${del.food_name} (${del.calories} kcal) from your diary?`} onClose={() => setDel(null)} onConfirm={remove}/>}
  </div>;
}
