export const SERVER = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
export const API = SERVER + '/api';
// Small fetch wrapper: JSON or multipart in, JSON out, readable Error on failure.
export async function api(path, { method = 'GET', json, form } = {}) {
  const opts = { method };
  if (json !== undefined) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(json); }
  if (form) opts.body = form;
  let res;
  try { res = await fetch(API + path, opts); } catch { throw new Error('Cannot reach the backend. Start Flask on port 5000 (python app.py).'); }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}
export const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
export const shiftDate = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const fmt = (n, dp = 0) => n == null ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: 0 });
export const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;
