'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, List, KanbanSquare, GripVertical, CheckSquare, Square, Trash2, ArrowRight, ChevronRight, ChevronLeft, X, MoreVertical, XCircle, Star, Eye, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { getTargets, createTarget, updateTarget, deleteTarget } from '@/lib/db';
import { DEAL_STAGES } from '@/lib/types';
import type { Target, DealStage } from '@/lib/types';
import Modal from '@/components/Modal';
import TargetForm from '@/components/TargetForm';

export default function PipelinePage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [view, setView] = useState<'kanban' | 'list' | 'timeline' | 'forecast'>('kanban');
  const [showAddModal, setShowAddModal] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [filterVertical, setFilterVertical] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string } | null>(null);

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

  const getNextStage = (current: DealStage): DealStage | null => {
    const stages = DEAL_STAGES.map(s => s.key);
    const idx = stages.indexOf(current);
    return idx < stages.length - 1 ? stages[idx + 1] : null;
  };

  const getPrevStage = (current: DealStage): DealStage | null => {
    const stages = DEAL_STAGES.map(s => s.key);
    const idx = stages.indexOf(current);
    return idx > 0 ? stages[idx - 1] : null;
  };

  const advanceStage = (targetId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    const next = getNextStage(target.stage);
    if (next) { updateTarget(targetId, { stage: next }); reload(); }
  };

  const regressStage = (targetId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    const prev = getPrevStage(target.stage);
    if (prev) { updateTarget(targetId, { stage: prev }); reload(); }
  };

  const markLost = (targetId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateTarget(targetId, { stage: 'closed_lost' });
    reload();
    setContextMenu(null);
  };

  const markWon = (targetId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateTarget(targetId, { stage: 'closed_won' });
    reload();
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, targetId });
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
            <button
              onClick={() => setView('timeline')}
              className="btn btn-sm"
              style={{ background: view === 'timeline' ? 'var(--accent)' : 'var(--card)', color: view === 'timeline' ? 'white' : 'var(--muted-foreground)' }}
            >
              <Calendar size={14} />
            </button>
            <button
              onClick={() => setView('forecast')}
              className="btn btn-sm"
              style={{ background: view === 'forecast' ? 'var(--accent)' : 'var(--card)', color: view === 'forecast' ? 'white' : 'var(--muted-foreground)' }}
            >
              <TrendingUp size={14} />
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

      {/* Pipeline summary */}
      <div className="flex items-center gap-4 text-xs overflow-x-auto" style={{ color: 'var(--muted)' }}>
        {DEAL_STAGES.map(stage => {
          const count = filteredTargets.filter(t => t.stage === stage.key).length;
          const value = filteredTargets.filter(t => t.stage === stage.key).reduce((s, t) => s + (t.asking_price || 0), 0);
          if (count === 0) return null;
          return (
            <div key={stage.key} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
              <span className="font-medium" style={{ color: stage.color }}>{count}</span>
              {value > 0 && <span className="font-mono">${(value / 1000000).toFixed(1)}M</span>}
            </div>
          );
        })}
        <span className="ml-auto font-mono">
          Total: ${(filteredTargets.reduce((s, t) => s + (t.asking_price || 0), 0) / 1000000).toFixed(1)}M
        </span>
      </div>

      {/* Kanban View */}
      {view === 'kanban' ? (
        <div className="kanban-scroll flex gap-3 flex-1 pb-4 min-h-0">
          {DEAL_STAGES.map(stage => {
            const stageTargets = filteredTargets.filter(t => t.stage === stage.key);
            const stageValue = stageTargets.reduce((s, t) => s + (t.asking_price || 0), 0);
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
                  {stageValue > 0 && (
                    <span className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
                      ${(stageValue / 1000000).toFixed(1)}M
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                  {stageTargets.map(target => {
                    const nextStage = getNextStage(target.stage);
                    const prevStage = getPrevStage(target.stage);
                    return (
                    <div
                      key={target.id}
                      className="group relative p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:border-opacity-80"
                      style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
                      draggable
                      onDragStart={() => handleDragStart(target.id)}
                      onContextMenu={e => handleContextMenu(e, target.id)}
                    >
                      <Link href={`/targets/${target.id}`} className="block">
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
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)', fontSize: '0.65rem' }}>
                            {target.source}
                          </span>
                          {target.recurring_revenue_pct && (
                            <span className="badge" style={{
                              background: target.recurring_revenue_pct >= 80 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                              color: target.recurring_revenue_pct >= 80 ? 'var(--success)' : 'var(--warning)',
                              fontSize: '0.65rem',
                            }}>
                              {target.recurring_revenue_pct}% rec
                            </span>
                          )}
                          {daysSinceStageEntry(target.stage_entered_at) > 30 && (
                            <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', fontSize: '0.65rem' }}>
                              {daysSinceStageEntry(target.stage_entered_at)}d
                            </span>
                          )}
                        </div>
                      </Link>
                      {/* Quick action buttons — visible on hover */}
                      <div className="absolute bottom-1 right-1 hidden group-hover:flex items-center gap-0.5">
                        {prevStage && (
                          <button
                            onClick={e => regressStage(target.id, e)}
                            className="p-1 rounded transition-colors"
                            style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}
                            title={`Move to ${DEAL_STAGES.find(s => s.key === prevStage)?.label}`}
                          >
                            <ChevronLeft size={12} />
                          </button>
                        )}
                        {nextStage && (
                          <button
                            onClick={e => advanceStage(target.id, e)}
                            className="p-1 rounded transition-colors"
                            style={{ background: 'var(--accent)', color: 'white' }}
                            title={`Advance to ${DEAL_STAGES.find(s => s.key === nextStage)?.label}`}
                          >
                            <ChevronRight size={12} />
                          </button>
                        )}
                        <button
                          onClick={e => handleContextMenu(e, target.id)}
                          className="p-1 rounded transition-colors"
                          style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}
                          title="More actions"
                        >
                          <MoreVertical size={12} />
                        </button>
                      </div>
                    </div>
                    );
                  })}
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

      {/* Timeline View */}
      {view === 'timeline' && (() => {
        const activeTargets = filteredTargets
          .filter(t => !['closed_lost'].includes(t.stage))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        if (activeTargets.length === 0) {
          return (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--muted)' }}>
              <p className="text-sm">No targets to display in timeline.</p>
            </div>
          );
        }

        // Time range: oldest created to now
        const now = Date.now();
        const oldestCreated = Math.min(...activeTargets.map(t => new Date(t.created_at).getTime()));
        const timeRange = now - oldestCreated;
        const monthMs = 30 * 24 * 60 * 60 * 1000;

        // Generate month markers
        const months: { label: string; position: number }[] = [];
        const startDate = new Date(oldestCreated);
        startDate.setDate(1);
        let currentMonth = new Date(startDate);
        while (currentMonth.getTime() <= now) {
          const pos = timeRange > 0 ? ((currentMonth.getTime() - oldestCreated) / timeRange) * 100 : 0;
          months.push({
            label: currentMonth.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            position: Math.max(0, Math.min(100, pos)),
          });
          currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        }

        return (
          <div className="glass-card flex-1 overflow-auto p-4">
            {/* Month header */}
            <div className="relative h-6 mb-2" style={{ marginLeft: 160 }}>
              {months.map((m, i) => (
                <div key={i} className="absolute text-[10px]" style={{ left: `${m.position}%`, color: 'var(--muted)', transform: 'translateX(-50%)' }}>
                  {m.label}
                </div>
              ))}
            </div>

            {/* Grid lines */}
            <div className="space-y-1">
              {activeTargets.map(t => {
                const stageConfig = DEAL_STAGES.find(s => s.key === t.stage);
                const stageIdx = DEAL_STAGES.findIndex(s => s.key === t.stage);
                const createdPos = timeRange > 0 ? ((new Date(t.created_at).getTime() - oldestCreated) / timeRange) * 100 : 0;
                const stageEnteredPos = timeRange > 0 ? ((new Date(t.stage_entered_at).getTime() - oldestCreated) / timeRange) * 100 : 0;
                const nowPos = 100;
                const daysInStage = Math.floor((now - new Date(t.stage_entered_at).getTime()) / 86400000);
                const daysTotal = Math.floor((now - new Date(t.created_at).getTime()) / 86400000);
                const stale = daysInStage > 30 && !['closed_won', 'closed_lost'].includes(t.stage);

                return (
                  <Link key={t.id} href={`/targets/${t.id}`} className="flex items-center gap-0 group" style={{ height: 28 }}>
                    {/* Target name */}
                    <div className="w-40 flex-shrink-0 flex items-center gap-1.5 pr-2">
                      <span className="text-xs font-medium truncate group-hover:underline" style={{ color: 'var(--foreground)' }}>
                        {t.name}
                      </span>
                    </div>
                    {/* Timeline bar */}
                    <div className="flex-1 relative h-full">
                      {/* Background gridlines */}
                      {months.map((m, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${m.position}%`, background: 'var(--border)', opacity: 0.3 }} />
                      ))}
                      {/* Bar: from created to now */}
                      <div
                        className="absolute top-1 bottom-1 rounded-sm flex items-center overflow-hidden"
                        style={{
                          left: `${createdPos}%`,
                          width: `${Math.max(0.5, nowPos - createdPos)}%`,
                          background: `${stageConfig?.color}30`,
                          border: `1px solid ${stageConfig?.color}60`,
                        }}
                      >
                        {/* Stage entered marker */}
                        {stageEnteredPos > createdPos + 2 && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5"
                            style={{
                              left: `${((stageEnteredPos - createdPos) / (nowPos - createdPos)) * 100}%`,
                              background: stageConfig?.color,
                              opacity: 0.5,
                            }}
                          />
                        )}
                        {/* Label inside bar */}
                        <span className="text-[9px] font-medium px-1.5 truncate whitespace-nowrap" style={{ color: stageConfig?.color }}>
                          {stageConfig?.label} · {daysTotal}d
                          {stale && ' ⚠'}
                        </span>
                      </div>
                    </div>
                    {/* Score */}
                    <div className="w-12 flex-shrink-0 text-right">
                      {t.weighted_score ? (
                        <span className="text-[10px] font-mono font-bold" style={{
                          color: t.weighted_score >= 4 ? 'var(--success)' : t.weighted_score >= 3 ? 'var(--warning)' : 'var(--danger)',
                        }}>
                          {t.weighted_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t flex-wrap" style={{ borderColor: 'var(--border)' }}>
              {DEAL_STAGES.filter(s => filteredTargets.some(t => t.stage === s.key)).map(s => (
                <div key={s.key} className="flex items-center gap-1 text-[10px]">
                  <div className="w-3 h-2 rounded-sm" style={{ background: `${s.color}50`, border: `1px solid ${s.color}` }} />
                  <span style={{ color: 'var(--muted)' }}>{s.label}</span>
                </div>
              ))}
              <span className="text-[10px] ml-auto" style={{ color: 'var(--muted)' }}>⚠ = stale ({'>'}30d in stage)</span>
            </div>
          </div>
        );
      })()}

      {/* Forecast View */}
      {view === 'forecast' && (() => {
        // Stage win probabilities (VMS M&A typical)
        const STAGE_PROBABILITY: Record<string, number> = {
          identified: 0.05, researching: 0.10, contacted: 0.15,
          nurturing: 0.25, loi_submitted: 0.50, loi_signed: 0.70,
          due_diligence: 0.80, closing: 0.90, closed_won: 1.0, closed_lost: 0,
        };

        const activeDeals = filteredTargets.filter(t => !['closed_won', 'closed_lost'].includes(t.stage));
        const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n}`;

        const totalPipeline = activeDeals.reduce((s, t) => s + (t.asking_price || t.revenue ? (t.asking_price || (t.arr || t.revenue || 0) * 4) : 0), 0);
        const weightedPipeline = activeDeals.reduce((s, t) => {
          const ev = t.asking_price || (t.arr || t.revenue || 0) * 4;
          return s + ev * (STAGE_PROBABILITY[t.stage] || 0);
        }, 0);
        const avgProbability = activeDeals.length > 0
          ? activeDeals.reduce((s, t) => s + (STAGE_PROBABILITY[t.stage] || 0), 0) / activeDeals.length
          : 0;

        // Group by stage for funnel
        const stageData = DEAL_STAGES
          .filter(s => !['closed_won', 'closed_lost'].includes(s.key))
          .map(s => {
            const deals = activeDeals.filter(t => t.stage === s.key);
            const totalEV = deals.reduce((sum, t) => sum + (t.asking_price || (t.arr || t.revenue || 0) * 4), 0);
            const weightedEV = totalEV * (STAGE_PROBABILITY[s.key] || 0);
            return { ...s, deals, totalEV, weightedEV, probability: STAGE_PROBABILITY[s.key] || 0 };
          });

        const maxStageEV = Math.max(...stageData.map(s => s.totalEV), 1);

        // Quarterly forecast — estimate when deals might close based on stage
        const monthsToClose: Record<string, number> = {
          identified: 12, researching: 10, contacted: 8, nurturing: 6,
          loi_submitted: 4, loi_signed: 3, due_diligence: 2, closing: 1,
        };
        const quarters: { label: string; totalEV: number; weightedEV: number; deals: typeof activeDeals }[] = [];
        const now = new Date();
        for (let q = 0; q < 4; q++) {
          const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + q * 3, 1);
          const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0);
          const qLabel = `Q${Math.floor(qStart.getMonth() / 3) + 1} ${qStart.getFullYear()}`;
          const qDeals = activeDeals.filter(t => {
            const estClose = new Date(now);
            estClose.setMonth(estClose.getMonth() + (monthsToClose[t.stage] || 6));
            return estClose >= qStart && estClose <= qEnd;
          });
          const totalEV = qDeals.reduce((s, t) => s + (t.asking_price || (t.arr || t.revenue || 0) * 4), 0);
          const weightedEV = qDeals.reduce((s, t) => {
            const ev = t.asking_price || (t.arr || t.revenue || 0) * 4;
            return s + ev * (STAGE_PROBABILITY[t.stage] || 0);
          }, 0);
          quarters.push({ label: qLabel, totalEV, weightedEV, deals: qDeals });
        }
        const maxQEV = Math.max(...quarters.map(q => q.totalEV), 1);

        return (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Pipeline', value: fmt(totalPipeline), sub: `${activeDeals.length} active deals` },
                { label: 'Weighted Pipeline', value: fmt(weightedPipeline), sub: 'probability-adjusted' },
                { label: 'Avg Win Probability', value: `${(avgProbability * 100).toFixed(0)}%`, sub: 'across active deals' },
                { label: 'Expected Closes (12mo)', value: activeDeals.filter(t => (monthsToClose[t.stage] || 12) <= 12).length.toString(), sub: 'based on stage velocity' },
              ].map(kpi => (
                <div key={kpi.label} className="glass-card p-4">
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>{kpi.label}</div>
                  <div className="text-2xl font-bold mt-1">{kpi.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Pipeline funnel by stage */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-sm mb-4">Pipeline Funnel — Weighted by Win Probability</h3>
              <div className="space-y-3">
                {stageData.map(s => (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="w-28 text-right">
                      <div className="text-xs font-medium">{s.label}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>{(s.probability * 100).toFixed(0)}% prob</div>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: 'var(--background)' }}>
                        {/* Total EV bar */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-lg transition-all"
                          style={{ width: `${(s.totalEV / maxStageEV) * 100}%`, background: `${s.color}33` }}
                        />
                        {/* Weighted EV bar */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-lg transition-all flex items-center px-2"
                          style={{ width: `${(s.weightedEV / maxStageEV) * 100}%`, background: `${s.color}88` }}
                        >
                          {s.weightedEV > 0 && (
                            <span className="text-xs font-bold text-white whitespace-nowrap">
                              {fmt(s.weightedEV)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <div className="text-xs font-medium">{s.deals.length} deal{s.deals.length !== 1 ? 's' : ''}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>{s.totalEV > 0 ? fmt(s.totalEV) : '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'var(--accent)', opacity: 0.3 }} /> Total EV</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'var(--accent)', opacity: 0.7 }} /> Weighted EV</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  EV estimated at asking price or 4x ARR/Revenue
                </span>
              </div>
            </div>

            {/* Quarterly forecast */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-sm mb-4">Quarterly Close Forecast</h3>
              <div className="grid grid-cols-4 gap-4">
                {quarters.map((q, qi) => (
                  <div key={q.label} className="rounded-xl p-4 border" style={{ borderColor: 'var(--border)', background: qi === 0 ? 'var(--accent-muted)' : 'var(--background)' }}>
                    <div className="text-xs font-medium" style={{ color: qi === 0 ? 'var(--accent)' : 'var(--muted)' }}>
                      {q.label} {qi === 0 && '(Current)'}
                    </div>
                    <div className="mt-2">
                      <div className="text-lg font-bold">{q.totalEV > 0 ? fmt(q.totalEV) : '—'}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>
                        {q.weightedEV > 0 ? `${fmt(q.weightedEV)} weighted` : 'no projected closes'}
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'var(--card)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(q.totalEV / maxQEV) * 100}%`, background: qi === 0 ? 'var(--accent)' : 'var(--muted)' }}
                      />
                    </div>
                    <div className="mt-2 space-y-1">
                      {q.deals.slice(0, 3).map(d => (
                        <Link
                          key={d.id}
                          href={`/targets/${d.id}`}
                          className="flex items-center justify-between text-xs py-0.5 hover:underline"
                        >
                          <span className="truncate">{d.name}</span>
                          <span style={{ color: 'var(--muted)' }}>{(STAGE_PROBABILITY[d.stage] * 100).toFixed(0)}%</span>
                        </Link>
                      ))}
                      {q.deals.length > 3 && (
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>+{q.deals.length - 3} more</div>
                      )}
                      {q.deals.length === 0 && (
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>No projected closes</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deal-level detail */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-sm mb-4">Deal-Level Forecast Detail</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left p-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>Target</th>
                      <th className="text-left p-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>Stage</th>
                      <th className="text-right p-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>Est. EV</th>
                      <th className="text-center p-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>Win Prob</th>
                      <th className="text-right p-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>Weighted EV</th>
                      <th className="text-center p-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>Est. Close</th>
                      <th className="text-center p-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>Days in Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDeals
                      .sort((a, b) => (STAGE_PROBABILITY[b.stage] || 0) - (STAGE_PROBABILITY[a.stage] || 0))
                      .map(d => {
                        const ev = d.asking_price || (d.arr || d.revenue || 0) * 4;
                        const prob = STAGE_PROBABILITY[d.stage] || 0;
                        const estClose = new Date();
                        estClose.setMonth(estClose.getMonth() + (monthsToClose[d.stage] || 6));
                        const daysIn = daysSinceStageEntry(d.stage_entered_at);
                        const stageInfo = DEAL_STAGES.find(s => s.key === d.stage);
                        return (
                          <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="p-2">
                              <Link href={`/targets/${d.id}`} className="font-medium hover:underline">{d.name}</Link>
                              <div className="text-xs" style={{ color: 'var(--muted)' }}>{d.vertical}</div>
                            </td>
                            <td className="p-2">
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${stageInfo?.color}22`, color: stageInfo?.color }}>
                                {stageInfo?.label}
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono">{ev > 0 ? fmt(ev) : '—'}</td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <div className="w-12 h-2 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${prob * 100}%`, background: prob >= 0.5 ? 'var(--success)' : prob >= 0.2 ? 'var(--warning)' : 'var(--muted)' }} />
                                </div>
                                <span className="text-xs font-mono">{(prob * 100).toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="p-2 text-right font-mono font-medium" style={{ color: 'var(--accent)' }}>
                              {ev > 0 ? fmt(ev * prob) : '—'}
                            </td>
                            <td className="p-2 text-center text-xs" style={{ color: 'var(--muted)' }}>
                              {estClose.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </td>
                            <td className="p-2 text-center">
                              <span className="text-xs font-mono" style={{ color: daysIn > 30 ? 'var(--warning)' : 'var(--muted)' }}>
                                {daysIn}d
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border)' }}>
                      <td className="p-2 font-semibold" colSpan={2}>Total</td>
                      <td className="p-2 text-right font-mono font-bold">{fmt(totalPipeline)}</td>
                      <td className="p-2 text-center text-xs" style={{ color: 'var(--muted)' }}>{(avgProbability * 100).toFixed(0)}% avg</td>
                      <td className="p-2 text-right font-mono font-bold" style={{ color: 'var(--accent)' }}>{fmt(weightedPipeline)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Target" width="max-w-2xl">
        <TargetForm onSubmit={handleAdd} onCancel={() => setShowAddModal(false)} submitLabel="Create Target" />
      </Modal>

      {/* Context Menu */}
      {contextMenu && (() => {
        const target = targets.find(t => t.id === contextMenu.targetId);
        if (!target) return null;
        const next = getNextStage(target.stage);
        const prev = getPrevStage(target.stage);
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
            <div
              className="fixed z-50 py-1 rounded-lg shadow-lg min-w-[180px]"
              style={{
                left: contextMenu.x,
                top: contextMenu.y,
                background: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="px-3 py-1.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                {target.name}
              </div>
              <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
              <Link
                href={`/targets/${target.id}`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-opacity-80 transition-colors"
                style={{ color: 'var(--foreground)' }}
                onClick={() => setContextMenu(null)}
              >
                <Eye size={14} /> View Details
              </Link>
              {next && (
                <button
                  onClick={e => { advanceStage(contextMenu.targetId, e); setContextMenu(null); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm w-full text-left hover:bg-opacity-80 transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  <ChevronRight size={14} /> Advance to {DEAL_STAGES.find(s => s.key === next)?.label}
                </button>
              )}
              {prev && (
                <button
                  onClick={e => { regressStage(contextMenu.targetId, e); setContextMenu(null); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm w-full text-left hover:bg-opacity-80 transition-colors"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <ChevronLeft size={14} /> Back to {DEAL_STAGES.find(s => s.key === prev)?.label}
                </button>
              )}
              <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
              {target.stage !== 'closed_won' && (
                <button
                  onClick={e => markWon(contextMenu.targetId, e)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm w-full text-left"
                  style={{ color: 'var(--success)' }}
                >
                  <Star size={14} /> Mark Won
                </button>
              )}
              {target.stage !== 'closed_lost' && (
                <button
                  onClick={e => markLost(contextMenu.targetId, e)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm w-full text-left"
                  style={{ color: 'var(--danger)' }}
                >
                  <XCircle size={14} /> Mark Lost
                </button>
              )}
              <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
              <button
                onClick={e => {
                  e.preventDefault();
                  if (confirm(`Delete ${target.name}?`)) {
                    deleteTarget(contextMenu.targetId);
                    reload();
                  }
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm w-full text-left"
                style={{ color: 'var(--danger)' }}
              >
                <Trash2 size={14} /> Delete Target
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}

function daysSinceStageEntry(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}
