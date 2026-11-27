import React, { useState } from 'react';
import { Save, Trash2, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../api';

const FIELDS = [['calories', 'kcal'], ['protein', 'P'], ['carbs', 'C'], ['fat', 'F'], ['fiber', 'Fi']];
function Row({ f, ctx }) {
  const [v, setV] = useState({ name: f.name, portion: f.portion, portion_g: f.portion_g, ...f.per_100g });
  const dirty = JSON.stringify(v) !== JSON.stringify({ name: f.name, portion: f.portion, portion_g: f.portion_g, ...f.per_100g });
  const save = async () => { try { const r = await api('/foods/' + f.id, { method: 'PUT', json: v }); ctx.setFoods(fs => fs.map(x => x.id === f.id ? r : x)); ctx.toast(`${r.name} updated.`); } catch (e) { ctx.toast(e.message, 'error'); } };
  const del = async () => { try { await api('/foods/' + f.id, { method: 'DELETE' }); ctx.setFoods(fs => fs.filter(x => x.id !== f.id)); ctx.toast('Food deleted.'); } catch (e) { ctx.toast(e.message, 'error'); } };
  return <tr><td>{f.emoji}</td><td><input className="in-name" value={v.name} onChange={e => setV({ ...v, name: e.target.value })} aria-label="Food name"/></td>
    <td><input className="in-sm" value={v.portion} onChange={e => setV({ ...v, portion: e.target.value })} aria-label="Portion label"/></td>
    <td><input className="in-xs" type="number" value={v.portion_g} onChange={e => setV({ ...v, portion_g: e.target.value })} aria-label="Portion grams"/></td>
    {FIELDS.map(([k]) => <td key={k}><input className="in-xs" type="number" step="0.1" value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} aria-label={k + ' per 100 g'}/></td>)}
    <td className="nowrap"><button className="icon-ghost" disabled={!dirty} onClick={save} aria-label={`Save ${f.name}`}><Save size={16}/></button>{f.custom && <button className="icon-ghost danger" onClick={del} aria-label={`Delete ${f.name}`}><Trash2 size={16}/></button>}</td></tr>;
}

export default function Settings({ ctx }) {
  const h = ctx.health, fm = h?.food_model;
  const [n, setN] = useState({ name: '', portion_g: 100, calories: '', protein: '', carbs: '', fat: '', fiber: 0 });
  const add = async () => { try { const r = await api('/foods', { method: 'POST', json: n }); ctx.setFoods(fs => [...fs, r]); setN({ name: '', portion_g: 100, calories: '', protein: '', carbs: '', fat: '', fiber: 0 }); ctx.toast(`${r.name} added.`); } catch (e) { ctx.toast(e.message, 'error'); } };
  const St = ({ ok, children }) => <li>{ok ? <CheckCircle2 size={16} color="#16a34a"/> : <XCircle size={16} color="#dc2626"/>} {children}</li>;
  return <div className="stack">
    <section className="card"><span className="eyebrow">SYSTEM STATUS</span><h2>Backend & models</h2>
      <ul className="status">{h ? <><St ok>Flask backend connected · SQLite database · {h.exercise_count} exercises</St>
        <St ok={h.recommender_loaded}>Workout recommender (TF-IDF + cosine similarity): {h.recommender_loaded ? 'loaded' : 'not loaded: run python train_recommender.py'}</St>
        <St ok={fm.installed}>Food image recognition ({fm.model_id}): {fm.installed ? (fm.loaded ? 'loaded' : 'installed, loads on first photo') : 'not installed. Food is chosen manually (see README)'}</St></> : <St ok={false}>Backend offline. Start it with python app.py</St>}</ul></section>
    <section className="card"><span className="eyebrow">FOOD DATABASE</span><h2>Edit nutrition values</h2>
      <p className="muted small">Values are per 100 g and are estimates; real nutrition depends on ingredients and preparation. Editing a food affects future meals only. Saved meals keep their original values.</p>
      <div className="table-wrap"><table className="food-table"><thead><tr><th/><th>Food</th><th>Portion</th><th>Portion g</th>{FIELDS.map(([k, l]) => <th key={k}>{l}</th>)}<th/></tr></thead>
        <tbody>{ctx.foods.map(f => <Row key={f.id + JSON.stringify(f.per_100g) + f.portion_g} f={f} ctx={ctx}/>)}</tbody></table></div>
      <h4>Add a custom food</h4>
      <div className="form-row wrap"><label>Name<input value={n.name} onChange={e => setN({ ...n, name: e.target.value })}/></label><label>Portion (g)<input type="number" value={n.portion_g} onChange={e => setN({ ...n, portion_g: e.target.value })}/></label>
        {FIELDS.map(([k, l]) => <label key={k}>{k} /100g<input type="number" step="0.1" value={n[k]} onChange={e => setN({ ...n, [k]: e.target.value })}/></label>)}
        <button className="primary" disabled={!n.name || n.calories === ''} onClick={add}><Plus size={16}/> Add food</button></div></section>
    <section className="card"><span className="eyebrow">ABOUT</span><h2>Educational use only</h2><p className="muted">Workout and nutrition information is general education, not medical advice. BMI and calorie targets are provided for adults only. Consult a qualified professional for health conditions, pain, pregnancy or if you are under 18.</p></section>
  </div>;
}
