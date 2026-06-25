'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '$lib/supabase/client';

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  tag: string;
  feel: 'drag' | 'neutral' | 'flow';
  note: string;
};

export default function SessionPage() {
  const supabase = getSupabaseClient();
  const [activeStart, setActiveStart] = useState<Date | null>(null);
  const [tag, setTag] = useState('Deep work');
  const [feel, setFeel] = useState<SessionRow['feel']>('neutral');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [recent, setRecent] = useState<SessionRow[]>([]);
  const [presets] = useState([
    { tag: 'Deep work', feel: 'flow' as const, note: '' },
    { tag: 'Admin', feel: 'neutral' as const, note: '' },
    { tag: 'Meetings', feel: 'drag' as const, note: '' }
  ]);

  const [tick, setTick] = useState(0);

  const elapsed = useMemo(() => {
    if (!activeStart) return 0;
    // use tick to force reactivity
    return Math.floor((Date.now() - activeStart.getTime()) / 1000);
  }, [activeStart, tick]);

  const feelCounts = useMemo(() => {
    return recent.reduce(
      (acc, session) => {
        acc[session.feel] += 1;
        return acc;
      },
      { drag: 0, neutral: 0, flow: 0 } as Record<SessionRow['feel'], number>
    );
  }, [recent]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        console.warn('No active session, running in local database fallback mode.');
      }
    });
  }, []);

  useEffect(() => {
    if (!activeStart) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [activeStart]);

  async function loadRecent() {
    try {
      const { data, error } = await supabase
        .from('sessionmint_sessions')
        .select('id,started_at,ended_at,duration_seconds,tag,feel,note')
        .order('started_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setRecent((data || []) as SessionRow[]);
    } catch (err: any) {
      console.warn('Supabase session fetch failed, loading from localStorage:', err);
      try {
        const local = localStorage.getItem('sessionmint_sessions');
        if (local) {
          const parsed = JSON.parse(local) as SessionRow[];
          setRecent(parsed.slice(0, 10));
        }
      } catch (e) {
        console.error('Failed to parse local sessions:', e);
      }
    }
  }

  useEffect(() => {
    loadRecent();
  }, []);

  function startSession() {
    if (activeStart) return;
    setActiveStart(new Date());
    setStatus('Focus session started...');
  }

  async function stopSession() {
    if (!activeStart) return;
    const ended = new Date();
    const duration = Math.max(0, Math.floor((ended.getTime() - activeStart.getTime()) / 1000));
    if (duration < 5) { // reduced to 5s for easier testing
      setStatus('Session too short (min 5 seconds).');
      return;
    }

    const newSessionLocal: SessionRow = {
      id: 'local_sess_' + Math.random().toString(36).substring(2, 11),
      started_at: activeStart.toISOString(),
      ended_at: ended.toISOString(),
      duration_seconds: duration,
      tag: tag.trim() || 'Session',
      feel,
      note: note.trim()
    };

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User session not found');

      const { data, error } = await supabase
        .from('sessionmint_sessions')
        .insert({
          user_id: userData.user.id,
          started_at: activeStart.toISOString(),
          ended_at: ended.toISOString(),
          duration_seconds: duration,
          tag: tag.trim() || 'Session',
          feel,
          note: note.trim()
        })
        .select('id,started_at,ended_at,duration_seconds,tag,feel,note')
        .single();
      
      if (error) throw error;
      setRecent([data as SessionRow, ...recent].slice(0, 10));
      setStatus('Session saved to database!');
    } catch (err: any) {
      console.warn('Supabase insert failed, saving to localStorage:', err);
      
      // Fallback local storage write
      let allSessions: SessionRow[] = [];
      try {
        const local = localStorage.getItem('sessionmint_sessions');
        if (local) allSessions = JSON.parse(local);
      } catch (e) {
        console.error(e);
      }

      allSessions = [newSessionLocal, ...allSessions];
      localStorage.setItem('sessionmint_sessions', JSON.stringify(allSessions));
      setRecent(allSessions.slice(0, 10));
      setStatus('Session saved locally!');
    } finally {
      setActiveStart(null);
      setNote('');
    }
  }

  function applyPreset(preset: { tag: string; feel: SessionRow['feel']; note: string }) {
    setTag(preset.tag);
    setFeel(preset.feel);
    setNote(preset.note);
  }

  function repeatLast() {
    if (recent.length === 0) return;
    const last = recent[0];
    setTag(last.tag);
    setFeel(last.feel);
    setNote(last.note || '');
  }

  return (
    <div className="grid grid-2">
      <div className="card">
        <h2>Session Logger</h2>
        <p className="muted">Track focused work blocks and cognitive state.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Task Tag</label>
              <input className="input" placeholder="e.g. Deep work" value={tag} onChange={(e) => setTag(e.target.value)} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Focus State</label>
              <select className="input" value={feel} onChange={(e) => setFeel(e.target.value as SessionRow['feel'])}>
                <option value="drag">Drag (Slow)</option>
                <option value="neutral">Neutral</option>
                <option value="flow">Flow (Zone)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label className="muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Notes & Accomplishments</label>
            <textarea placeholder="What did you get done?" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="toolbar">
            <span className="muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Presets:</span>
            {presets.map((preset) => (
              <button key={preset.tag} className="btn secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => applyPreset(preset)}>
                {preset.tag} · {preset.feel}
              </button>
            ))}
            <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={repeatLast} disabled={recent.length === 0}>
              Repeat last
            </button>
          </div>

          <div className="toolbar" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn" onClick={startSession} disabled={!!activeStart}>Start Session</button>
              <button className="btn danger" onClick={stopSession} disabled={!activeStart}>Stop Session</button>
            </div>
            
            {activeStart && (
              <span className="badge" style={{ fontSize: '0.85rem', boxShadow: '0 0 10px var(--glow-violet)' }}>
                Elapsed: {Math.floor(elapsed / 60)}m {elapsed % 60}s
              </span>
            )}
          </div>
          
          {status && <p className="muted" style={{ fontSize: '0.85rem', color: 'var(--accent-2)' }}>{status}</p>}
        </div>
      </div>

      <div className="card alt">
        <h3>Recent Focus Blocks</h3>
        
        <div className="toolbar" style={{ marginTop: 12, marginBottom: 16 }}>
          <span className="badge" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}>Flow: {feelCounts.flow}</span>
          <span className="badge" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#c084fc', borderColor: 'rgba(167, 139, 250, 0.3)' }}>Neutral: {feelCounts.neutral}</span>
          <span className="badge" style={{ background: 'rgba(248, 113, 113, 0.15)', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}>Drag: {feelCounts.drag}</span>
        </div>

        {recent.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>No recent focus blocks logged yet.</p>
        ) : (
          <div className="grid" style={{ gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {recent.map((session) => (
              <div key={session.id} className="card" style={{ padding: '16px', background: 'rgba(6, 2, 12, 0.3)', borderColor: 'rgba(139, 92, 246, 0.15)' }}>
                <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '1rem', color: '#fff' }}>{session.tag}</strong>
                  <span className={`badge ${session.feel === 'flow' ? 'gold' : ''}`} style={{ fontSize: '0.7rem' }}>
                    {session.feel.toUpperCase()}
                  </span>
                </div>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>
                  Duration: {Math.round(session.duration_seconds / 60)} min · {new Date(session.started_at).toLocaleString()}
                </p>
                {session.note && (
                  <p className="muted" style={{ margin: '6px 0 0', fontSize: '0.8rem', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px', color: '#cbd5e1' }}>
                    {session.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
