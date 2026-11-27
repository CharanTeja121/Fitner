import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Camera, ScanSearch, Save, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { api, today, fmt } from '../api';
import { Modal, COLORS, MACROS } from '../ui';

function CameraModal({ onClose, onShot }) {
  const video = useRef(null), stream = useRef(null), [err, setErr] = useState('');
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { stream.current = s; if (video.current) video.current.srcObject = s; })
      .catch(() => setErr('Camera access was denied or no camera was found. Use "Upload photo" instead.'));
    return () => stream.current?.getTracks().forEach(t => t.stop());
  }, []);
  const snap = () => {
    const v = video.current, c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0); c.toBlob(b => { onShot(new File([b], 'camera.jpg', { type: 'image/jpeg' })); onClose(); }, 'image/jpeg', 0.9);
  };
  return <Modal title="Take a meal photo" onClose={onClose}>{err ? <p className="warn">{err}</p> : <video ref={video} autoPlay playsInline muted className="cam"/>}
    <div className="modal-f"><button className="ghost" onClick={onClose}>Cancel</button><button className="primary" disabled={!!err} onClick={snap}><Camera size={16}/> Capture</button></div></Modal>;
}

export default function FoodRecognition({ ctx }) {
  const [file, setFile] = useState(null), [preview, setPreview] = useState(null), [rec, setRec] = useState(null), [busy, setBusy] = useState(false), [cam, setCam] = useState(false);
  const [foodId, setFoodId] = useState(null), [grams, setGrams] = useState(100), [q, setQ] = useState(''), [calc, setCalc] = useState(null);
  const [mealType, setMealType] = useState(ctx.nav?.mealType || 'lunch'), [date, setDate] = useState(today()), [saving, setSaving] = useState(false);
  const capture = useRef(null);
  const food = ctx.foods.find(f => f.id === foodId);

  const choose = async f => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return ctx.toast('Please choose a JPG, PNG or WEBP image.', 'error');
    if (f.size > 5 * 1024 * 1024) return ctx.toast('Image is larger than 5 MB.', 'error');
    setFile(f); setPreview(URL.createObjectURL(f)); setRec(null); setBusy(true);
    try {
      const fd = new FormData(); fd.append('image', f);
      const r = await api('/food/recognize', { method: 'POST', form: fd }); setRec(r);
      const top = r.predictions.find(p => p.food_id);
      if (r.confident && top) { setFoodId(top.food_id); setGrams(ctx.foods.find(x => x.id === top.food_id)?.portion_g || 100); }
    } catch (e) { ctx.toast(e.message, 'error'); } finally { setBusy(false); }
  };
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {  // live nutrition via the calculator endpoint
    if (!foodId || !(Number(grams) > 0)) { setCalc(null); return; }
    const t = setTimeout(() => api('/food/calculate', { method: 'POST', json: { food_id: foodId, grams: Number(grams) } }).then(setCalc).catch(e => { setCalc(null); ctx.toast(e.message, 'error'); }), 250);
    return () => clearTimeout(t);
  }, [foodId, grams]);

  const pick = f => { setFoodId(f.id); setGrams(f.portion_g); };
  const list = useMemo(() => {
    const order = rec?.suggestions || [], rank = id => { const i = order.indexOf(id); return i < 0 ? 999 : i; };
    return ctx.foods.filter(f => !q || f.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
  }, [ctx.foods, rec, q]);

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData(); fd.append('food_id', foodId); fd.append('grams', grams); fd.append('meal_type', mealType); fd.append('date', date);
      if (file) fd.append('image', file);
      const mapped = rec?.predictions?.some(p => p.food_id === foodId); if (mapped) fd.append('source', 'model');
      await api('/nutrition/add', { method: 'POST', form: fd });
      ctx.bump(); ctx.toast(`${food.name} saved to your diary.`);
      setFile(null); setPreview(null); setRec(null); setFoodId(null); setCalc(null); setGrams(100);
    } catch (e) { ctx.toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return <div className="split">
    <section className="card">
      <span className="eyebrow">STEP 1</span><h2>Add a meal photo</h2>
      <div className="drop">{preview ? <img src={preview} alt="Your meal"/> : <div className="drop-empty"><ScanSearch size={40}/><p>Upload or take a photo of your meal, or skip it and choose the food manually.</p></div>}</div>
      <div className="btn-row wrap">
        <label className="primary file-btn"><Upload size={16}/> Upload photo<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { choose(e.target.files[0]); e.target.value = ''; }}/></label>
        <button className="ghost" onClick={() => (navigator.mediaDevices?.getUserMedia && window.isSecureContext ? setCam(true) : capture.current.click())}><Camera size={16}/> Take photo</button>
        <input ref={capture} type="file" accept="image/*" capture="environment" hidden onChange={e => { choose(e.target.files[0]); e.target.value = ''; }}/>
        {file && <button className="ghost" onClick={() => { setFile(null); setPreview(null); setRec(null); }}><X size={15}/> Remove</button>}</div>
      {busy && <p className="muted">Analysing photo…</p>}
      {rec && !rec.model_available && <div className="notice warn"><AlertTriangle size={18}/><div><b>No image-recognition model is installed.</b><p>{rec.message}</p></div></div>}
      {rec?.model_available && <div className={'notice ' + (rec.confident ? 'ok' : 'warn')}>{rec.confident ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}<div><b>Model: {rec.model_id}</b><p>{rec.message}</p>
        <ul className="preds">{rec.predictions.map(p => <li key={p.raw_label}><span>{p.label}{p.food_name ? <em> → {p.food_name}</em> : <em className="muted"> (not in your food list)</em>}</span>
          <div className="bar"><div style={{ width: p.confidence * 100 + '%', background: p.food_id ? '#22c55e' : '#d1d5db' }}/></div><b>{Math.round(p.confidence * 100)}%</b>
          {p.food_id && <button className="text-btn" onClick={() => pick(ctx.foods.find(f => f.id === p.food_id))}>Use</button>}</li>)}</ul></div></div>}
      {ctx.health?.food_model && !ctx.health.food_model.installed && !rec && <p className="muted small">Image recognition is optional and not installed, so food is chosen manually. See the README to enable it.</p>}
    </section>

    <section className="card">
      <span className="eyebrow">STEP 2</span><h2>Choose food & portion</h2>
      <input className="full" value={q} onChange={e => setQ(e.target.value)} placeholder="Search foods…" aria-label="Search foods"/>
      <div className="food-grid">{list.map(f => <button key={f.id} className={'food-chip ' + (foodId === f.id ? 'on' : '')} onClick={() => pick(f)}><span>{f.emoji}</span>{f.name}</button>)}</div>
      {food && <>
        <div className="portion">
          <label>Weight (g)<input type="number" min="1" max="5000" value={grams} onChange={e => setGrams(e.target.value)}/></label>
          <div className="chip-wrap">{[0.5, 1, 1.5, 2].map(n => <button key={n} className="chip" onClick={() => setGrams(Math.round(food.portion_g * n * 10) / 10)}>{n}× serving</button>)}</div>
          <small className="muted">1 serving = {food.portion} ≈ {food.portion_g} g</small></div>
        {calc && <div className="calc"><div className="calc-cal"><b>{fmt(calc.nutrients.calories)}</b> kcal</div>
          <div className="calc-macros">{MACROS.map(([k, n]) => <div key={k}><i style={{ background: COLORS[k] }}/>{n}<b>{fmt(calc.nutrients[k], 1)} g</b></div>)}</div>
          <p className="muted small">{calc.formula}. These are estimates; real values depend on ingredients and preparation.</p></div>}
        <div className="form-row"><label>Meal<select value={mealType} onChange={e => setMealType(e.target.value)}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="snack">Evening Snacks</option><option value="dinner">Dinner</option></select></label>
          <label>Date<input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)}/></label></div>
        <div className="btn-row"><button className="primary" onClick={save} disabled={saving || !calc}><Save size={16}/> Save to food diary</button>
          <button className="ghost" onClick={() => ctx.go('nutrition')}>View diary</button></div></>}
      {!food && <p className="muted">Select a food above to calculate its nutrition.</p>}
    </section>
    {cam && <CameraModal onClose={() => setCam(false)} onShot={choose}/>}
  </div>;
}
