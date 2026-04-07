'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, List, KanbanSquare, GripVertical, CheckSquare, Square, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getTargets, createTarget, updateTarget, deleteTarget } from '@/lib/db';
import { DEAL_STAGES } from '@/lib/types';
import type { Target, DealStage } from '@/lib/types';
import Modal from '@/components/Modal';
import TargetForm from '@/components/TargetForm';

export default function PipelinePage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [showAddModal, setShowAddModal] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [filterVertical, setFilterVertical] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<string>('');

  const reload = useCallback(() => setTargets(getTargets()), []);

  useEffect(() => { reload(); }, [reload]);

  const filteredTargets = targets.filter(t => {
    if (filterVertical !== 'all' && t.vertical !== filterVertical) return false;
    if (filterSource !== 'all' && t.source !== filterSource) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAdd = (data: Partial<Target>) => {
    createTarget(data);
    reload();
    setShowAddModal(false);
  };

  const handleDragStart = (targetId: string) => {
    setDragTarget(targetId);
  };

  const handleDrop = (stage: DealStage) => {
    if (dragTarget) {
      updateTarget(dragTarget, { stage });
      reload();
      setDragTarget(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const ids = filteredTargets.map(t => t.id);
    setSelectedIds(prev => prev.size === ids.length ? new Set() : new Set(ids));
  };

  const handleBulkStageChange = () => {
    if (!bulkStage || selectedIds.size === 0) return;
    for (const id of selectedIds) {
      updateTarget(id, { stage: bulkStage as DealStage });
    }
    setSelectedIds(new Set());
    setBulkStage('');
    reload();
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} target(s)? This cannot be undone.`)) return;
    for (const id of selectedIds) {
      deleteTarget(id);
    }
    setSelectedIds(new Set());
    reload();
  };

  const verticals = Array.from(new Set(targets.map(t => t.vertical))).sort();

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {filteredTargets.length} targets across {DEAL_STAGES.filter(s => filteredTargets.some(t => t.stage === s.key)).length} stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setView('kanban')}
              className="btn btn-sm"
              style={{ background: view === 'kanban' ? 'var(--accent)' : 'var(--card)', color: view === 'kanban' ? 'white' : 'var(--muted-foreground)' }}
            >
              <KanbanSquare size={14} />
            </button>
            <button
              onClick={() => setView('list')}
              className="btn btn-sm"
              style={{ background: view === 'list' ? 'var(--accent)' : 'var(--card)', color: view === 'list' ? 'white' : 'var(--muted-foreground)' }}
            >
              <List size={14} />
            </button>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Target
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          placeholder="Search targets..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-64"
        />
        <select value={filterVertical} onChange={e => setFilterVertical(e.target.value)} className="text-sm">
          <option value="all">All Verticals</option>
          {verticals.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="text-sm">
          <option value="all">All Sources</option>
          <option value="proprietary">Proprietary</option>
          <option value="broker">Broker</option>
          <option value="inbound">Inbound</option>
          <option value="referral">Referral</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            {selectedIds.size} selected
          </span>
          <select
            value={bulkStage}
            onChange={e => setBulkStage(e.target.value)}
            className="text-sm"
            style={{ width: 160 }}
          >
            <option value="">Move to stage...</option>
            {DEAL_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button
            onClick={handleBulkStageChange}
            disabled={!bulkStage}
            className="btn btn-primary btn-sm"
          >
            <ArrowRight size={14} /> Move
          </button>
          <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="btn btn-ghost btn-sm ml-auto">
            Clear Selection
          </button>
        </div>
      )}

      {/* Kanban View */}
      {view === 'kanban' ? (
        <div className="kanban-scroll flex gap-3 flex-1 pb-4 min-h-0">
          {DEAL_STAGES.map(stage => {
            const stageTargets = filteredTargets.filter(t => t.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="flex-shrink-0 w-72 flex flex-col rounded-xl"
                style={{ background: 'var(--card)' }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(stage.key)}
              >
                {/* Column header */}
                <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-sm font-medium flex-1">{stage.label}</span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--background)', color: 'var(--muted-foreground)' }}>
                    {stageTargets.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                  {stageTargets.map(target => (
                    <Link
                      key={target.id}
                      href={`/targets/${target.id}`}
                      draggable
                      onDragStart={() => handleDragStart(target.id)}
                      className="block p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:border-opacity-80"
                      style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-sm truncate">{target.name}</div>
                        <GripVertical size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                        {target.vertical}
                        {target.geography && ` · ${target.geography}`}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {target.arr && (
                          <span className="text-xs font-mono" style={{ color: 'var(--success)' }}>
                            ${(target.arr / 1000000).toFixed(1)}M ARR
                          </span>
                        )}
                        {target.weighted_score && (
                          <span className="badge ml-auto" style={{
                            background: target.weighted_score >= 4 ? 'rgba(16,185,129,0.15)' : target.weighted_score >= 3 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                            color: target.weighted_score >= 4 ? 'var(--success)' : target.weighted_score >= 3 ? 'var(--warning)' : 'var(--danger)',
                          }}>
                            {target.weighted_score.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)', fontSize: '0.65rem' }}>
                          {target.source}
                        </span>
                        {daysSinceStageEntry(target.stage_entered_at) > 30 && (
                          <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', fontSize: '0.65rem' }}>
                            {daysSinceStageEntry(target.stage_entered_at)}d
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {stageTargets.length === 0 && (
                    <div className="text-center py-8 text-xs" style={{ color: 'var(--muted)' }}>
                      Drop target here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="glass-card overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="p-3 w-8">
                  <button onClick={selectAll}>
                    {selectedIds.size === filteredTargets.length && filteredTargets.length > 0
                      ? <CheckSquare size={14} style={{ color: 'var(--accent)' }} />
                      : <Square size={14} style={{ color: 'var(--muted)' }} />}
                  </button>
                </th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Name</th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Vertical</th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Stage</th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Source</th>
                <th className="text-right p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>ARR</th>
                <th className="text-right p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Score</th>
                <th className="text-right p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Days</th>
              </tr>
            </thead>
            <tbody>
              {filteredTargets.map(t => (
                <tr key={t.id} className="border-b hover:bg-opacity-50" style={{ borderColor: 'var(--border)' }}>
                  <td className="p-3 w-8">
                    <button onClick={() => toggleSelect(t.id)}>
                      {selectedIds.has(t.id)
                        ? <CheckSquare size={14} style={{ color: 'var(--accent)' }} />
                        : <Square size={14} style={{ color: 'var(--muted)' }} />}
                    </button>
                  </td>
                  <td className="p-3">
                    <Link href={`/targets/${t.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                      {t.name}
                    </Link>
                  </td>
                  <td className="p-3" style={{ color: 'var(--muted-foreground)' }}>{t.vertical}</td>
                  <td className="p-3">
                    <span className="badge" style={{
                      background: `${DEAL_STAGES.find(s => s.key === t.stage)?.color}20`,
                      color: DEAL_STAGES.find(s => s.key === t.stage)?.color,
                    }}>
                      {DEAL_STAGES.find(s => s.key === t.stage)?.label}
                    </span>
                  </td>
                  <td className="p-3 capitalize" style={{ color: 'var(--muted-foreground)' }}>{t.source}</td>
                  <td className="p-3 text-right font-mono" style={{ color: 'var(--success)' }}>
                    {t.arr ? `$${(t.arr / 1000000).toFixed(1)}M` : '-'}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {t.weighted_score?.toFixed(1) || '-'}
                  </td>
                  <td className="p-3 text-right font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    {daysSinceStageEntry(t.stage_entered_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Target" width="max-w-2xl">
        <TargetForm onSubmit={handleAdd} onCancel={() => setShowAddModal(false)} submitLabel="Create Target" />
      </Modal>
    </div>
  );
}

function daysSinceStageEntry(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}
