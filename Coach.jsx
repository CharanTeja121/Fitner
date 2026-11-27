import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../api';

export default function Coach({ ctx }) {
  const [chat, setChat] = useState([{ role: 'assistant', text: 'Hi! I’m your fitness assistant. Ask me about exercises, muscles or training basics.' }]), [message, setMessage] = useState(''), [mode, setMode] = useState('');
  const send = async () => {
    if (!message.trim()) return;
    const q = message; setChat(c => [...c, { role: 'user', text: q }]); setMessage('');
    try { const d = await api('/chat', { method: 'POST', json: { message: q, profile: ctx.profile } }); setChat(c => [...c, { role: 'assistant', text: d.answer }]); setMode(d.mode || ''); }
    catch (e) { setChat(c => [...c, { role: 'assistant', text: e.message }]); }
  };
  return <section className="card chat-panel"><span className="eyebrow">LLM + RETRIEVAL ASSISTANT</span><h2>Ask your fitness coach</h2>
    <p className="muted">Configure an API key in the backend for live LLM responses. Without it, the assistant uses a clearly labelled local knowledge fallback.</p>
    <div className="chat-log">{chat.map((m, i) => <div className={'bubble ' + m.role} key={i}>{m.text}</div>)}</div>
    <div className="chat-compose"><input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about bench press, chest workouts…" aria-label="Message"/>
      <button className="primary icon-btn" onClick={send} aria-label="Send"><Send size={17}/></button></div>
    {mode && <small className="muted">Response mode: {mode}</small>}</section>;
}
