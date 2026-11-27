import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutDashboard, PersonStanding, Dumbbell, BookOpen, ScanLine, Utensils, TrendingUp, UserRound, Settings as Cog, Bot, Menu, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from './api';
import Dashboard from './pages/Dashboard';
import Anatomy from './pages/Anatomy';
import Workouts from './pages/Workouts';
import Library from './pages/Library';
import FoodRecognition from './pages/FoodRecognition';
import Nutrition from './pages/Nutrition';
import Progress from './pages/Progress';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Coach from './pages/Coach';

const NAV = [['dashboard', 'Dashboard', LayoutDashboard, Dashboard], ['anatomy', '3D Body Anatomy', PersonStanding, Anatomy], ['workouts', 'Workout Plans', Dumbbell, Workouts],
  ['library', 'Exercise Library', BookOpen, Library], ['food', 'Food Recognition', ScanLine, FoodRecognition], ['nutrition', 'Nutrition Tracker', Utensils, Nutrition],
  ['progress', 'Progress', TrendingUp, Progress], ['profile', 'Profile', UserRound, Profile], ['coach', 'AI Coach', Bot, Coach], ['settings', 'Settings', Cog, Settings]];
const BOTTOM = ['dashboard', 'workouts', 'food', 'nutrition', 'progress'];
const DEMO = { name: 'Alex', age: 24, height_cm: 172, weight_kg: 72, sex: 'male', profession: '', goal: 'muscle_gain', activity_factor: 1.375, level: 'Beginner', equipment: ['Bodyweight', 'Dumbbells'] };

// Workout state lives in App so timers and completed sets survive navigating between pages.
function useWorkout(toast) {
  const [state, setState] = useState({ category: 'Shoulders', level: 0, done: {}, elapsed: 0, running: false, rest: 0 });
  const restRef = useRef(0);
  useEffect(() => {
    if (!state.running && state.rest <= 0) return;
    const id = setInterval(() => setState(s => ({ ...s, elapsed: s.running ? s.elapsed + 1 : s.elapsed, rest: Math.max(0, s.rest - 1) })), 1000);
    return () => clearInterval(id);
  }, [state.running, state.rest > 0]);
  useEffect(() => { if (restRef.current > 0 && state.rest === 0) toast('Rest is over. Start your next set!'); restRef.current = state.rest; }, [state.rest]);
  return {
    state,
    setCategory: category => setState(s => ({ ...s, category })),
    setLevel: level => setState(s => ({ ...s, level })),
    toggle: () => setState(s => ({ ...s, running: !s.running })),
    reset: () => { restRef.current = 0; setState(s => ({ ...s, done: {}, elapsed: 0, running: false, rest: 0 })); },
    addRest: n => setState(s => ({ ...s, rest: s.rest + n })),
    skipRest: () => { restRef.current = 0; setState(s => ({ ...s, rest: 0 })); },
    toggleSet: (name, i, rest) => setState(s => {
      const cur = s.done[name] || 0, undo = i < cur;
      return { ...s, running: true, done: { ...s.done, [name]: undo ? i : i + 1 }, rest: undo ? s.rest : rest };
    })
  };
}

export default function App() {
  const [page, setPage] = useState(() => (NAV.find(n => n[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard'));
  const [nav, setNav] = useState({}), [drawer, setDrawer] = useState(false), [toasts, setToasts] = useState([]), [version, setVersion] = useState(0);
  const [profile, setProfile] = useState(DEMO), [stats, setStats] = useState(null), [foods, setFoods] = useState([]), [exercises, setExercises] = useState([]), [health, setHealth] = useState(null), [boot, setBoot] = useState('loading');
  const toast = useCallback((msg, type = 'ok') => { const id = Math.random(); setToasts(t => [...t, { id, msg, type }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200); }, []);
  const workout = useWorkout(toast);

  useEffect(() => {
    Promise.all([api('/health'), api('/exercises'), api('/foods'), api('/profile')]).then(([h, ex, fd, pr]) => {
      setHealth(h); setExercises(ex); setFoods(fd); setProfile({ ...DEMO, ...pr.profile }); setStats(pr.stats); setBoot('ready');
    }).catch(e => { setBoot(e.message); });
  }, []);
  useEffect(() => { location.hash = page; window.scrollTo(0, 0); }, [page]);

  const go = (p, opts = {}) => { setNav(opts); if (opts.category) workout.setCategory(opts.category); setPage(p); setDrawer(false); };
  const ctx = { profile, setProfile, stats, setStats, foods, setFoods, exercises, health, go, nav, toast, version, bump: () => setVersion(v => v + 1), workout };
  const Page = NAV.find(n => n[0] === page)[3];
  const title = NAV.find(n => n[0] === page)[1];

  const sidebar = <nav className="nav" aria-label="Main navigation">{NAV.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => go(id)}><Icon size={19}/>{label}</button>)}</nav>;
  return <div className="app">
    <aside className="sidebar"><div className="brand"><span className="logo"><Dumbbell size={20}/></span><div><b>AI Gym</b><small>Personal Fitness Assistant</small></div></div>{sidebar}</aside>
    {drawer && <div className="drawer-back" onClick={() => setDrawer(false)}><aside className="drawer" onClick={e => e.stopPropagation()}><div className="brand"><span className="logo"><Dumbbell size={20}/></span><b>AI Gym</b>
      <button className="icon-ghost" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={20}/></button></div>{sidebar}</aside></div>}
    <main className="main">
      <header className="topbar"><button className="icon-ghost menu-btn" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={22}/></button><h1>{title}</h1></header>
      {boot === 'loading' ? <div className="card"><p className="muted">Connecting to the backend…</p></div>
        : boot !== 'ready' ? <div className="card"><h2>Backend not reachable</h2><p className="warn">{boot}</p><p className="muted">Open a second terminal, then run: <code>cd backend</code>, <code>.venv\Scripts\activate</code>, <code>python app.py</code>. Reload this page afterwards.</p></div>
        : <Page ctx={ctx}/>}
    </main>
    <nav className="bottom-nav" aria-label="Quick navigation">{BOTTOM.map(id => { const [, label, Icon] = NAV.find(n => n[0] === id); const short = { dashboard: 'Home', workouts: 'Workouts', food: 'Log', nutrition: 'Track', progress: 'Progress' }[id];
      return <button key={id} className={(page === id ? 'active ' : '') + (id === 'food' ? 'center' : '')} onClick={() => go(id)} aria-label={label}><Icon size={id === 'food' ? 24 : 21}/><span>{short}</span></button>; })}</nav>
    <div className="toasts" role="status" aria-live="polite">{toasts.map(t => <div key={t.id} className={'toast ' + t.type}>{t.type === 'error' ? <AlertTriangle size={16}/> : <CheckCircle2 size={16}/>} {t.msg}</div>)}</div>
  </div>;
}
