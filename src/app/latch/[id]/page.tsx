'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '$lib/supabase/client';
import ProofUploadZone from '../../../components/ProofUploadZone';

type LatchItem = {
  id: string;
  title: string;
  body: string;
  phase: 'draft' | 'ready' | 'locked';
  proof_required: boolean;
  created_at: string;
  updated_at: string;
};

type Proof = {
  id: string;
  item_id: string;
  kind: 'note' | 'link' | 'file';
  label: string;
  note: string;
  url: string;
  created_at: string;
};

type AuditLog = {
  id: string;
  item_id: string;
  action_type: string;
  old_phase: string;
  new_phase: string;
  proof_url: string;
  created_at: string;
  latch_items?: { title: string };
};

function ProgressRing({ phase }: { phase: 'draft' | 'ready' | 'locked' }) {
  const pctMap = { draft: 33, ready: 66, locked: 100 };
  const colorMap = { draft: '#f59e0b', ready: '#06b6d4', locked: '#10b981' };
  
  const percentage = pctMap[phase];
  const color = colorMap[phase];
  const r = 10;
  const strokeWidth = 2.5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;

  return (
    <div className="progress-ring-container">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle 
          cx="12" 
          cy="12" 
          r={r} 
          fill="none" 
          stroke="rgba(255,255,255,0.06)" 
          strokeWidth={strokeWidth} 
        />
        <circle 
          cx="12" 
          cy="12" 
          r={r} 
          fill="none" 
          stroke={color} 
          strokeWidth={strokeWidth} 
          strokeDasharray={circ} 
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
    </div>
  );
}

export default function LatchDetailPage() {
  const supabase = getSupabaseClient();
  const params = useParams();
  const latchId = params?.id as string;
  const [items, setItems] = useState<LatchItem[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [pendingDropTransition, setPendingDropTransition] = useState<{ item: LatchItem; nextPhase: 'draft' | 'ready' | 'locked' } | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [proofFilter, setProofFilter] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sort, setSort] = useState('updated_desc');

  const groupedProofs = useMemo(() => {
    return proofs.reduce<Record<string, Proof[]>>((acc, proof) => {
      acc[proof.item_id] = acc[proof.item_id] || [];
      acc[proof.item_id].push(proof);
      return acc;
    }, {});
  }, [proofs]);

  const summary = useMemo(() => {
    const total = items.length;
    const draft = items.filter((item) => item.phase === 'draft').length;
    const ready = items.filter((item) => item.phase === 'ready').length;
    const locked = items.filter((item) => item.phase === 'locked').length;
    const proofRequired = items.filter((item) => item.proof_required).length;
    return { total, draft, ready, locked, proofRequired };
  }, [items]);

  const filteredItems = useMemo(() => {
    let next = [...items];
    if (filter) {
      const needle = filter.toLowerCase();
      next = next.filter((item) => item.title.toLowerCase().includes(needle) || item.body.toLowerCase().includes(needle));
    }
    if (phaseFilter) {
      next = next.filter((item) => item.phase === phaseFilter);
    }
    if (proofFilter) {
      next = next.filter((item) => (proofFilter === 'required' ? item.proof_required : !item.proof_required));
    }
    next.sort((a, b) => {
      if (sort === 'created_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'created_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return next;
  }, [filter, items, phaseFilter, proofFilter, sort]);

  // Split into columns for Kanban
  const draftItems = useMemo(() => filteredItems.filter((i) => i.phase === 'draft'), [filteredItems]);
  const readyItems = useMemo(() => filteredItems.filter((i) => i.phase === 'ready'), [filteredItems]);
  const lockedItems = useMemo(() => filteredItems.filter((i) => i.phase === 'locked'), [filteredItems]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = '/login';
      }
    });
  }, []);

  async function loadLatch() {
    const { data: itemsData, error: itemsError } = await supabase
      .from('latch_items')
      .select('id,title,body,phase,proof_required,created_at,updated_at')
      .eq('latch_id', latchId)
      .order('created_at', { ascending: false });
    if (itemsError) {
      setStatus(itemsError.message);
      return;
    }
    const itemsList = (itemsData || []) as LatchItem[];
    setItems(itemsList);

    const { data: proofsData, error: proofsError } = await supabase
      .from('item_proofs')
      .select('id,item_id,kind,label,note,url,created_at')
      .in('item_id', itemsList.map((item) => item.id));
    if (proofsError) {
      setStatus(proofsError.message);
      return;
    }
    setProofs((proofsData || []) as Proof[]);
  }

  async function loadAuditLogs() {
    const { data, error } = await supabase
      .from('latch_audit_log')
      .select('id,item_id,action_type,old_phase,new_phase,proof_url,created_at,latch_items(title)')
      .eq('latch_id', latchId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setAuditLogs(data as any[]);
    }
  }

  useEffect(() => {
    if (!latchId) return;
    loadLatch();
    loadAuditLogs();
  }, [latchId]);

  async function addItem() {
    if (!title.trim()) {
      setStatus('Title required.');
      return;
    }
    if (title.trim().length > 80) {
      setStatus('Title too long (max 80).');
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setStatus('Session expired.');
      return;
    }
    const { data, error } = await supabase
      .from('latch_items')
      .insert({
        latch_id: latchId,
        user_id: userData.user.id,
        title: title.trim(),
        body: body.trim(),
        proof_required: true
      })
      .select('id,title,body,phase,proof_required,created_at,updated_at')
      .single();
    if (error) {
      setStatus(error.message);
      return;
    }
    setItems([data as LatchItem, ...items]);
    setTitle('');
    setBody('');
  }

  async function toggleProofRequired(item: LatchItem) {
    const { data, error } = await supabase
      .from('latch_items')
      .update({ proof_required: !item.proof_required })
      .eq('id', item.id)
      .select('id,title,body,phase,proof_required,created_at,updated_at')
      .single();
    if (error) {
      setStatus(error.message);
      return;
    }
    setItems(items.map((it) => (it.id === item.id ? (data as LatchItem) : it)));
  }

  async function advancePhase(item: LatchItem, next: 'draft' | 'ready' | 'locked') {
    const { data, error } = await supabase.rpc('advance_item_phase', {
      p_item_id: item.id,
      p_next: next
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setItems(items.map((it) => (it.id === item.id ? (data as LatchItem) : it)));
    loadAuditLogs();
  }

  function toggleSelect(id: string, next?: boolean) {
    setSelected((prev) => ({ ...prev, [id]: next ?? !prev[id] }));
  }

  async function bulkAdvance(next: 'draft' | 'ready' | 'locked') {
    const ids = Object.entries(selected).filter(([, value]) => value).map(([id]) => id);
    if (!ids.length) return;
    for (const id of ids) {
      const item = items.find((it) => it.id === id);
      if (!item) continue;
      await advancePhase(item, next);
    }
    setSelected({});
  }

  async function bulkToggleProof() {
    const ids = Object.entries(selected).filter(([, value]) => value).map(([id]) => id);
    if (!ids.length) return;
    for (const id of ids) {
      const item = items.find((it) => it.id === id);
      if (!item) continue;
      await toggleProofRequired(item);
    }
    setSelected({});
  }

  function resetFilters() {
    setFilter('');
    setPhaseFilter('');
    setProofFilter('');
    setSort('updated_desc');
  }

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetPhase: 'draft' | 'ready' | 'locked') => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (!itemId) return;
    
    const item = items.find((it) => it.id === itemId);
    if (!item) return;
    if (item.phase === targetPhase) return;

    if ((targetPhase === 'ready' || targetPhase === 'locked') && item.proof_required) {
      const itemProofs = groupedProofs[item.id] || [];
      if (itemProofs.length === 0) {
        setPendingDropTransition({ item, nextPhase: targetPhase });
        return;
      }
    }

    await advancePhase(item, targetPhase);
    setDraggedItemId(null);
  };

  async function handleAddProof(proofData: { kind: 'note' | 'link' | 'file'; label: string; note: string; url: string }) {
    if (!pendingDropTransition) return;
    const { item, nextPhase } = pendingDropTransition;
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setStatus('Session expired.');
      return;
    }

    const { error: proofError } = await supabase
      .from('item_proofs')
      .insert({
        item_id: item.id,
        user_id: userData.user.id,
        kind: proofData.kind,
        label: proofData.label,
        note: proofData.note,
        url: proofData.url
      });

    if (proofError) {
      setStatus(proofError.message);
      setPendingDropTransition(null);
      return;
    }

    const { data: proofsData } = await supabase
      .from('item_proofs')
      .select('id,item_id,kind,label,note,url,created_at')
      .in('item_id', items.map((it) => it.id));
    if (proofsData) {
      setProofs(proofsData as Proof[]);
    }

    await advancePhase(item, nextPhase);
    setPendingDropTransition(null);
  }

  function renderKanbanCard(item: LatchItem) {
    const isSelected = !!selected[item.id];
    return (
      <div 
        key={item.id} 
        className={`kanban-card ${draggedItemId === item.id ? 'dragging' : ''}`}
        draggable="true"
        onDragStart={(e) => handleDragStart(e, item.id)}
      >
        <ProgressRing phase={item.phase} />
        
        <div className="toolbar" style={{ justifyContent: 'space-between', paddingRight: 28 }}>
          <div className="toolbar">
            {bulkMode && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(event) => toggleSelect(item.id, event.target.checked)}
              />
            )}
            <strong style={{ fontSize: '15px' }}>{item.title}</strong>
          </div>
        </div>
        
        <p className="muted" style={{ margin: '8px 0', fontSize: '13px', lineBreak: 'anywhere' }}>
          {item.body || 'No description yet.'}
        </p>

        <div className="toolbar" style={{ marginTop: 12, gap: '6px' }}>
          <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => toggleProofRequired(item)}>
            Proof {item.proof_required ? 'required' : 'optional'}
          </button>
          <a className="btn secondary" style={{ padding: '6px 12px', fontSize: '11px' }} href={`/latch/${latchId}/item/${item.id}`}>Open</a>
        </div>

        <div className="toolbar" style={{ marginTop: 12, justifyContent: 'space-between', fontSize: '11px' }}>
          <span className="muted">Proofs: {(groupedProofs[item.id] || []).length}</span>
          <span className="muted">{new Date(item.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>Latch items</h2>
        <p className="muted">Drag and drop cards across columns to advance them through phases.</p>
        <div className="toolbar" style={{ marginTop: 12 }}>
          <span className="badge">Total {summary.total}</span>
          <span className="badge">Draft {summary.draft}</span>
          <span className="badge">Ready {summary.ready}</span>
          <span className="badge">Locked {summary.locked}</span>
          <span className="badge">Proof required {summary.proofRequired}</span>
        </div>
        <div className="toolbar" style={{ marginTop: 12 }}>
          <input className="input" placeholder="Search items" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <select className="input" value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
            <option value="">All phases</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="locked">Locked</option>
          </select>
          <select className="input" value={proofFilter} onChange={(e) => setProofFilter(e.target.value)}>
            <option value="">Proof: any</option>
            <option value="required">Proof required</option>
            <option value="optional">Proof optional</option>
          </select>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="updated_desc">Updated: newest</option>
            <option value="created_desc">Created: newest</option>
            <option value="created_asc">Created: oldest</option>
          </select>
          <button className="btn secondary" onClick={resetFilters}>Reset</button>
          <a className="btn secondary" href="/">Back</a>
        </div>
        {status && <p className="muted" style={{ marginTop: 12 }}>{status}</p>}
      </div>

      <div className="card">
        <h3>Add item</h3>
        <div className="grid">
          <input className="input" placeholder="Title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="btn" onClick={addItem}>Add item</button>
        </div>
      </div>

      <div className="card alt">
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Bulk actions</h3>
          <button className="btn secondary" onClick={() => setBulkMode((prev) => !prev)}>
            {bulkMode ? 'Exit bulk mode' : 'Select items'}
          </button>
        </div>
        <p className="muted">Apply phase changes or proof toggles to multiple items.</p>
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button className="btn secondary" onClick={() => bulkAdvance('draft')} disabled={!bulkMode}>Draft</button>
          <button className="btn secondary" onClick={() => bulkAdvance('ready')} disabled={!bulkMode}>Ready</button>
          <button className="btn secondary" onClick={() => bulkAdvance('locked')} disabled={!bulkMode}>Locked</button>
          <button className="btn secondary" onClick={bulkToggleProof} disabled={!bulkMode}>Toggle proof</button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        <div 
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'draft')}
        >
          <div className="kanban-column-header">
            <h3><span className="column-dot draft"></span> Draft</h3>
            <span className="badge">{draftItems.length}</span>
          </div>
          <div className="kanban-cards">
            {draftItems.length === 0 ? (
              <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>No draft items.</p>
            ) : (
              draftItems.map((item) => renderKanbanCard(item))
            )}
          </div>
        </div>

        <div 
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'ready')}
        >
          <div className="kanban-column-header">
            <h3><span className="column-dot ready"></span> Ready</h3>
            <span className="badge">{readyItems.length}</span>
          </div>
          <div className="kanban-cards">
            {readyItems.length === 0 ? (
              <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>No ready items.</p>
            ) : (
              readyItems.map((item) => renderKanbanCard(item))
            )}
          </div>
        </div>

        <div 
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'locked')}
        >
          <div className="kanban-column-header">
            <h3><span className="column-dot locked"></span> Locked</h3>
            <span className="badge">{lockedItems.length}</span>
          </div>
          <div className="kanban-cards">
            {lockedItems.length === 0 ? (
              <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>No locked items.</p>
            ) : (
              lockedItems.map((item) => renderKanbanCard(item))
            )}
          </div>
        </div>
      </div>

      {/* Proof Modal */}
      {pendingDropTransition && (
        <ProofUploadZone 
          onAddProof={handleAddProof}
          onCancel={() => setPendingDropTransition(null)}
        />
      )}

      {/* Audit History Toggle Button */}
      <button className="btn audit-gutter-toggle" onClick={() => setIsAuditOpen(true)}>
        <span>📜</span> Audit History
      </button>

      {/* Audit Gutter Drawer */}
      <div className={`audit-gutter ${isAuditOpen ? 'open' : ''}`}>
        <div className="audit-gutter-header">
          <h3>Transaction History</h3>
          <button className="audit-gutter-close" onClick={() => setIsAuditOpen(false)}>×</button>
        </div>
        <div className="audit-gutter-content">
          {auditLogs.length === 0 ? (
            <p className="muted">No history logged yet.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="audit-entry">
                <div>
                  Item: <span style={{ fontWeight: 600 }}>{log.latch_items?.title || 'Unknown Item'}</span>
                </div>
                <div>
                  Action: <span className="audit-label-val">{log.action_type}</span>
                </div>
                {log.old_phase && (
                  <div>
                    Transition: <span className="muted">{log.old_phase}</span> → <span style={{ color: '#10b981' }}>{log.new_phase}</span>
                  </div>
                )}
                {log.proof_url && (
                  <div style={{ wordBreak: 'break-all', fontSize: '11px', marginTop: 4 }}>
                    Proof: <a href={log.proof_url} target="_blank" rel="noopener noreferrer" style={{ color: '#06b6d4' }}>{log.proof_url}</a>
                  </div>
                )}
                <span className="audit-entry-time">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
