'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '$lib/supabase/client';
import MintAnimation from '../../components/MintAnimation';

type MintRow = {
  id: string;
  week_start: string;
  total_seconds: number;
  session_count: number;
  flow_count: number;
  drag_count: number;
  top_tags: Array<{ tag: string; seconds: number }>;
  created_at: string;
};

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  tag: string;
  feel: 'drag' | 'neutral' | 'flow';
  note: string;
};

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function MintsPage() {
  const supabase = getSupabaseClient();
  const [mints, setMints] = useState<MintRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterTag, setFilterTag] = useState('');
  const [triggerExplosion, setTriggerExplosion] = useState(false);

  const currentWeek = useMemo(() => getWeekStart(), []);

  // Check login session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      // Allow fallback testing if not logged in
      if (!data.session) {
        console.warn('No active session, running in local database fallback mode.');
      }
    });
  }, []);

  // Load mints and sessions with offline/localStorage fallback
  async function loadData() {
    try {
      // 1. Fetch mints
      const { data: mintsData, error: mintsError } = await supabase
        .from('sessionmint_weekly_mints')
        .select('id,week_start,total_seconds,session_count,flow_count,drag_count,top_tags,created_at')
        .order('week_start', { ascending: false });

      if (mintsError) throw mintsError;
      setMints((mintsData || []) as MintRow[]);

      // 2. Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessionmint_sessions')
        .select('id,started_at,ended_at,duration_seconds,tag,feel,note')
        .order('started_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      setSessions((sessionsData || []) as SessionRow[]);

    } catch (err: any) {
      console.warn('Supabase fetch failed, loading from localStorage:', err);
      
      // Load mints fallback
      try {
        const localMints = localStorage.getItem('sessionmint_weekly_mints');
        if (localMints) setMints(JSON.parse(localMints));
      } catch (e) {
        console.error('Failed to parse local weekly mints:', e);
      }

      // Load sessions fallback
      try {
        const localSessions = localStorage.getItem('sessionmint_sessions');
        if (localSessions) setSessions(JSON.parse(localSessions));
      } catch (e) {
        console.error('Failed to parse local sessions:', e);
      }
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Compute Weekly Goals Progress (e.g. Target: 10 sessions or 12 hours of total duration for current week)
  const currentWeekStats = useMemo(() => {
    const startStr = currentWeek.toISOString().slice(0, 10);
    const end = new Date(currentWeek);
    end.setDate(end.getDate() + 7);

    // Get current week sessions
    const weekSessions = sessions.filter(s => {
      const date = new Date(s.started_at);
      return date >= currentWeek && date < end;
    });

    const totalSecs = weekSessions.reduce((sum, s) => sum + s.duration_seconds, 0);
    return {
      count: weekSessions.length,
      hours: Math.round((totalSecs / 3600) * 10) / 10,
      targetHours: 12,
      targetCount: 10,
      percent: Math.min(100, Math.round((totalSecs / (12 * 3600)) * 100))
    };
  }, [sessions, currentWeek]);

  // Compute Contribution Calendar Matrix (last 12 weeks, Mon-Sun grid)
  const calendarWeeks = useMemo(() => {
    const weeksList = [];
    // Generate week start dates for the last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const start = new Date(currentWeek);
      start.setDate(start.getDate() - i * 7);
      weeksList.push(start);
    }

    return weeksList.map((weekStart) => {
      // Generate days for this week
      const days = [];
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + dayOffset);
        const dayStr = dayDate.toISOString().slice(0, 10);

        // Find sessions on this specific day
        const daySessions = sessions.filter(s => {
          const sDate = new Date(s.started_at).toISOString().slice(0, 10);
          return sDate === dayStr;
        });

        const totalSecs = daySessions.reduce((sum, s) => sum + s.duration_seconds, 0);
        const count = daySessions.length;

        // Determine Level: 
        // Level 0: 0s, Level 1: <= 30 mins, Level 2: <= 1 hour, Level 3: <= 3 hours, Level 4: > 3 hours
        let level = 0;
        if (totalSecs > 0 && totalSecs <= 1800) level = 1;
        else if (totalSecs > 1800 && totalSecs <= 3600) level = 2;
        else if (totalSecs > 3600 && totalSecs <= 10800) level = 3;
        else if (totalSecs > 10800) level = 4;

        days.push({
          date: dayDate,
          dateStr: dayStr,
          totalSeconds: totalSecs,
          count,
          level
        });
      }
      return {
        weekStart,
        days
      };
    });
  }, [sessions, currentWeek]);

  // Tag Cloud aggregation: calculate size of each tag based on session hours
  const tagCloud = useMemo(() => {
    const weights: Record<string, number> = {};
    sessions.forEach(s => {
      weights[s.tag] = (weights[s.tag] || 0) + s.duration_seconds;
    });

    const list = Object.keys(weights).map(tag => ({
      tag,
      seconds: weights[tag],
      hours: Math.round((weights[tag] / 3600) * 10) / 10
    })).sort((a, b) => b.seconds - a.seconds);

    const maxSeconds = list.length > 0 ? Math.max(...list.map(t => t.seconds)) : 1;

    return list.map(t => {
      // Font size scales between 0.85rem (13px) and 2rem (32px)
      const scale = t.seconds / maxSeconds;
      const fontSize = 0.85 + scale * 1.15;
      return {
        ...t,
        fontSize: `${fontSize}rem`,
        opacity: 0.6 + scale * 0.4
      };
    });
  }, [sessions]);

  // Mint current week rollup
  async function mintWeek() {
    setLoading(true);
    setStatus('');
    const weekStartStr = currentWeek.toISOString().slice(0, 10);

    try {
      const { data, error } = await supabase.rpc('sessionmint_mint_week', { p_week_start: weekStartStr });
      if (error) throw error;
      
      setMints([data as MintRow, ...mints.filter((m) => m.week_start !== (data as MintRow).week_start)]);
      
      // Fire visual canvas explosion
      setTriggerExplosion(true);
      setStatus('Week successfully minted! Check your record below.');
    } catch (err: any) {
      console.warn('RPC minting failed, running local calculations:', err);

      // Perform local rollup calculation
      const end = new Date(currentWeek);
      end.setDate(end.getDate() + 7);

      const weekSessions = sessions.filter(s => {
        const date = new Date(s.started_at);
        return date >= currentWeek && date < end;
      });

      const totalSecs = weekSessions.reduce((sum, s) => sum + s.duration_seconds, 0);
      const flow = weekSessions.filter(s => s.feel === 'flow').length;
      const drag = weekSessions.filter(s => s.feel === 'drag').length;

      // Top tags calculation
      const tagMap: Record<string, number> = {};
      weekSessions.forEach(s => {
        tagMap[s.tag] = (tagMap[s.tag] || 0) + s.duration_seconds;
      });
      const topTags = Object.keys(tagMap).map(tag => ({
        tag,
        seconds: tagMap[tag]
      })).sort((a, b) => b.seconds - a.seconds).slice(0, 5);

      const newMint: MintRow = {
        id: 'local_mint_' + Math.random().toString(36).substring(2, 11),
        week_start: weekStartStr,
        total_seconds: totalSecs,
        session_count: weekSessions.length,
        flow_count: flow,
        drag_count: drag,
        top_tags: topTags,
        created_at: new Date().toISOString()
      };

      const updatedMints = [newMint, ...mints.filter((m) => m.week_start !== weekStartStr)];
      setMints(updatedMints);
      
      // Save locally
      localStorage.setItem('sessionmint_weekly_mints', JSON.stringify(updatedMints));

      // Fire visual canvas explosion
      setTriggerExplosion(true);
      setStatus('Week successfully minted locally! Check your record below.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      {/* Fullscreen Mint Particle Burst Canvas */}
      <MintAnimation trigger={triggerExplosion} onComplete={() => setTriggerExplosion(false)} />

      <div className="card">
        <h2>Weekly Mints</h2>
        <p className="muted">Roll up your focus hours into weekly immutable digests.</p>
        
        {/* Goal Progress Bar */}
        <div className="progress-bar-container">
          <div className="progress-header">
            <span>Weekly Goal Progress (Focus Target: {currentWeekStats.targetHours}h)</span>
            <span className="mono">{currentWeekStats.hours}h ({currentWeekStats.percent}%)</span>
          </div>
          <div className="progress-bar-glow">
            <div className="progress-fill-glow" style={{ width: `${currentWeekStats.percent}%` }}></div>
          </div>
        </div>

        <div className="toolbar" style={{ marginTop: 20 }}>
          <button className="btn" onClick={mintWeek} disabled={loading}>
            {loading ? 'Minting...' : 'Mint weekly rollup'}
          </button>
          <span className="badge gold">Week of {currentWeek.toLocaleDateString()}</span>
        </div>
        
        {status && <p className="muted" style={{ marginTop: 12, color: 'var(--accent-2)' }}>{status}</p>}
      </div>

      {/* Left-Right Column Layout for Grid and Tag Cloud */}
      <div className="grid grid-2">
        {/* Contribution calendar card */}
        <div className="card">
          <h3>Contribution Heatmap</h3>
          <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 12 }}>Last 12 weeks of logged focus blocks (Mon - Sun).</p>
          
          <div className="calendar-grid">
            <div className="calendar-days">
              <div className="calendar-day-label">M</div>
              <div className="calendar-day-label">T</div>
              <div className="calendar-day-label">W</div>
              <div className="calendar-day-label">T</div>
              <div className="calendar-day-label">F</div>
              <div className="calendar-day-label">S</div>
              <div className="calendar-day-label">S</div>
            </div>

            {calendarWeeks.map((week, idx) => (
              <div key={idx} className="calendar-squares">
                {week.days.map((day, dIdx) => (
                  <div
                    key={dIdx}
                    className={`calendar-square level-${day.level}`}
                  >
                    <span className="tooltip">
                      {new Date(day.date).toLocaleDateString()}<br />
                      {day.count} session(s)<br />
                      {Math.round((day.totalSeconds / 3600) * 10) / 10} hours focus
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Tag Cloud card */}
        <div className="card">
          <h3>Interactive Tag Cloud</h3>
          <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 12 }}>Relative weight of your tasks based on cumulative tracked seconds.</p>
          {tagCloud.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', marginTop: 32 }}>Log sessions to populate tag weights.</p>
          ) : (
            <div className="tag-cloud">
              {tagCloud.map(t => (
                <span
                  key={t.tag}
                  className="tag-cloud-item"
                  style={{ fontSize: t.fontSize, opacity: t.opacity }}
                  onClick={() => setFilterTag(t.tag === filterTag ? '' : t.tag)}
                >
                  {t.tag} ({t.hours}h)
                </span>
              ))}
            </div>
          )}
          {filterTag && (
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Filtering digests by tag: <strong>{filterTag}</strong></span>
              <button className="btn secondary" style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }} onClick={() => setFilterTag('')}>Clear</button>
            </p>
          )}
        </div>
      </div>

      {/* Mints history view */}
      <div className="card alt">
        <h3>Minted Weekly Digests</h3>
        <div className="grid" style={{ marginTop: 16 }}>
          {mints.length === 0 ? (
            <p className="muted">No minted weeks yet. Run rollup calculations above to create weekly digests.</p>
          ) : (
            mints
              .filter((mint) => {
                if (!filterTag) return true;
                return (mint.top_tags || []).some((row) => row.tag.toLowerCase().includes(filterTag.toLowerCase()));
              })
              .map((mint) => (
                <a key={mint.id} className="card" href={`/mint/${mint.week_start}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                    <strong style={{ color: '#fff', fontSize: '1.05rem' }}>Week starting {new Date(mint.week_start).toLocaleDateString()}</strong>
                    <span className="badge gold">{Math.round((mint.total_seconds / 3600) * 10) / 10} hours logged</span>
                  </div>
                  <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
                    Total Sessions: <span style={{ color: 'var(--text)' }}>{mint.session_count}</span> · 
                    Flow: <span style={{ color: '#34d399' }}>{mint.flow_count}</span> · 
                    Drag: <span style={{ color: '#f87171' }}>{mint.drag_count}</span>
                  </p>
                  {(mint.top_tags || []).length > 0 && (
                    <div className="toolbar" style={{ marginTop: 12 }}>
                      {mint.top_tags.map((row) => (
                        <span key={row.tag} className="badge" style={{ fontSize: '0.7rem' }}>
                          {row.tag} ({Math.round((row.seconds / 3600) * 10) / 10}h)
                        </span>
                      ))}
                    </div>
                  )}
                </a>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
