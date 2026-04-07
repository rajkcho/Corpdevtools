'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Download, Upload, CheckSquare, Square, Trash2, ArrowRight, Tag } from 'lucide-react';
import Link from 'next/link';
import { getTargets, createTarget, updateTarget, deleteTarget, exportTargetsCSV, importTargetsFromCSV } from '@/lib/db';
import { DEAL_STAGES, VERTICALS } from '@/lib/types';
import type { Target, DealStage } from '@/lib/types';
import Modal from '@/components/Modal';
import TargetForm from '@/components/TargetForm';
import BulkImport from '@/components/BulkImport';

export default function TargetsPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'updated_at' | 'weighted_score' | 'revenue'>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterVertical, setFilterVertical] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<string>('');
  const [bulkTag, setBulkTag] = useState<string>('');
  const [filterGeo, setFilterGeo] = useState<string>('all');
  const [filterScoreMin, setFilterScoreMin] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const reload = useCallback(() => setTargets(getTargets()), []);
  useEffect(() => { reload(); }, [reload]);

  const verticals = Array.from(new Set(targets.map(t => t.vertical))).sort();
  const geographies = Array.from(new Set(targets.map(t => t.geography).filter(Boolean))).sort();

  const filtered = targets
    .filter(t => {
      if (filterStage !== 'all' && t.stage !== filterStage) return false;
      if (filterVertical !== 'all' && t.vertical !== filterVertical) return false;
      if (filterGeo !== 'all' && t.geography !== filterGeo) return false;
      if (filterSource !== 'all' && t.source !== filterSource) return false;
      if (filterScoreMin && (t.weighted_score || 0) < Number(filterScoreMin)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.vertical.toLowerCase().includes(q) || t.geography.toLowerCase().includes(q) || t.tags?.some(tag => tag.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'updated_at') cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      else if (sortBy === 'weighted_score') cmp = (a.weighted_score || 0) - (b.weighted_score || 0);
      else if (sortBy === 'revenue') cmp = (a.revenue || 0) - (b.revenue || 0);
      return sortDir === 'desc' ? -cmp : cmp;
    });

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const ids = filtered.map(t => t.id);
    setSelectedIds(prev => prev.size === ids.length ? new Set() : new Set(ids));
  };

  const handleBulkStageChange = () => {
    if (!bulkStage || selectedIds.size === 0) return;
    for (const id of selectedIds) updateTarget(id, { stage: bulkStage as DealStage });
    setSelectedIds(new Set());
    setBulkStage('');
    reload();
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} target(s)? This cannot be undone.`)) return;
    for (const id of selectedIds) deleteTarget(id);
    setSelectedIds(new Set());
    reload();
  };

  const handleBulkTag = () => {
    if (!bulkTag.trim() || selectedIds.size === 0) return;
    const tag = bulkTag.trim();
    for (const id of selectedIds) {
      const t = targets.find(x => x.id === id);
      if (t) {
        const existing = t.tags || [];
        if (!existing.includes(tag)) updateTarget(id, { tags: [...existing, tag] });
      }
    }
    setBulkTag('');
    reload();
  };

  const handleExport = () => {
    const csv = exportTargetsCSV();
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dealforge-targets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Targets</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{targets.length} companies tracked</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkImport(true)} className="btn btn-secondary btn-sm">
            <Upload size={14} /> Bulk Import
          </button>
          <button onClick={handleExport} className="btn btn-secondary btn-sm">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Target
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, vertical, geography..."
            className="w-full pl-9"
          />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="text-sm">
          <option value="updated_at">Last Updated</option>
          <option value="name">Name</option>
          <option value="weighted_score">Score</option>
          <option value="revenue">Revenue</option>
        </select>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="text-sm">
          <option value="all">All Stages</option>
          {DEAL_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filterVertical} onChange={e => setFilterVertical(e.target.value)} className="text-sm">
          <option value="all">All Verticals</option>
          {verticals.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="btn btn-secondary btn-sm">
          {sortDir === 'desc' ? 'Desc' : 'Asc'}
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterGeo} onChange={e => setFilterGeo(e.target.value)} className="text-sm">
          <option value="all">All Geographies</option>
          {geographies.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="text-sm">
          <option value="all">All Sources</option>
          <option value="proprietary">Proprietary</option>
          <option value="broker">Broker</option>
          <option value="inbound">Inbound</option>
          <option value="referral">Referral</option>
          <option value="other">Other</option>
        </select>
        <select value={filterScoreMin} onChange={e => setFilterScoreMin(e.target.value)} className="text-sm">
          <option value="">Min Score: Any</option>
          <option value="2">Min Score: 2.0+</option>
          <option value="3">Min Score: 3.0+</option>
          <option value="3.5">Min Score: 3.5+</option>
          <option value="4">Min Score: 4.0+</option>
        </select>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode('cards')}
            className="btn btn-ghost btn-sm text-xs"
            style={{ background: viewMode === 'cards' ? 'var(--accent-muted)' : undefined, color: viewMode === 'cards' ? 'var(--accent)' : 'var(--muted)' }}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className="btn btn-ghost btn-sm text-xs"
            style={{ background: viewMode === 'table' ? 'var(--accent-muted)' : undefined, color: viewMode === 'table' ? 'var(--accent)' : 'var(--muted)' }}
          >
            Table
          </button>
        </div>
        {(filterStage !== 'all' || filterVertical !== 'all' || filterGeo !== 'all' || filterSource !== 'all' || filterScoreMin || search) && (
          <button
            onClick={() => { setFilterStage('all'); setFilterVertical('all'); setFilterGeo('all'); setFilterSource('all'); setFilterScoreMin(''); setSearch(''); }}
            className="text-xs"
            style={{ color: 'var(--accent)' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
          <span>{filtered.length} shown</span>
          <span>Pipeline: ${filtered.reduce((s, t) => s + (t.asking_price || 0), 0) > 0 ? `${(filtered.reduce((s, t) => s + (t.asking_price || 0), 0) / 1000000).toFixed(1)}M` : '—'}</span>
          <span>Avg Score: {filtered.filter(t => t.weighted_score).length > 0 ? (filtered.reduce((s, t) => s + (t.weighted_score || 0), 0) / filtered.filter(t => t.weighted_score).length).toFixed(1) : '—'}</span>
          <span>Scored: {filtered.filter(t => t.weighted_score).length}/{filtered.length}</span>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg flex-wrap" style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            {selectedIds.size} selected
          </span>
          <select value={bulkStage} onChange={e => setBulkStage(e.target.value)} className="text-sm" style={{ width: 160 }}>
            <option value="">Move to stage...</option>
            {DEAL_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button onClick={handleBulkStageChange} disabled={!bulkStage} className="btn btn-primary btn-sm">
            <ArrowRight size={14} /> Move
          </button>
          <div className="flex items-center gap-1">
            <input
              value={bulkTag}
              onChange={e => setBulkTag(e.target.value)}
              placeholder="Add tag..."
              className="text-sm"
              style={{ width: 120, padding: '0.25rem 0.5rem' }}
              onKeyDown={e => { if (e.key === 'Enter') handleBulkTag(); }}
            />
            <button onClick={handleBulkTag} disabled={!bulkTag.trim()} className="btn btn-secondary btn-sm">
              <Tag size={14} />
            </button>
          </div>
          <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="btn btn-ghost btn-sm ml-auto">
            Clear
          </button>
        </div>
      )}

      {/* Select All */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2">
          <button onClick={selectAll} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {selectedIds.size === filtered.length && filtered.length > 0
              ? <CheckSquare size={14} style={{ color: 'var(--accent)' }} />
              : <Square size={14} />}
            Select All
          </button>
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => {
            const daysInStage = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000);
            const staleWarning = daysInStage > 30 && !['closed_won', 'closed_lost'].includes(t.stage);
            const isSelected = selectedIds.has(t.id);
            return (
              <div key={t.id} className="glass-card p-4 hover:border-opacity-80 transition-all relative" style={isSelected ? { borderColor: 'var(--accent)' } : {}}>
                <button
                  onClick={e => toggleSelect(t.id, e)}
                  className="absolute top-2 left-2 z-10 p-0.5"
                >
                  {isSelected
                    ? <CheckSquare size={16} style={{ color: 'var(--accent)' }} />
                    : <Square size={16} style={{ color: 'var(--muted)', opacity: 0.4 }} />}
                </button>
                <Link href={`/targets/${t.id}`} className="block pl-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      {t.vertical}{t.geography && ` · ${t.geography}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {staleWarning && (
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} title={`${daysInStage}d in stage`} />
                    )}
                    {t.weighted_score ? (
                      <span className="badge font-mono" style={{
                        background: t.weighted_score >= 4 ? 'rgba(16,185,129,0.15)' : t.weighted_score >= 3 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        color: t.weighted_score >= 4 ? 'var(--success)' : t.weighted_score >= 3 ? 'var(--warning)' : 'var(--danger)',
                      }}>
                        {t.weighted_score.toFixed(1)}
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'var(--background)', color: 'var(--muted)', fontSize: '0.6rem' }}>Unscored</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="badge" style={{
                    background: `${DEAL_STAGES.find(s => s.key === t.stage)?.color}20`,
                    color: DEAL_STAGES.find(s => s.key === t.stage)?.color,
                  }}>
                    {DEAL_STAGES.find(s => s.key === t.stage)?.label}
                  </span>
                  <span className="badge capitalize" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                    {t.source}
                  </span>
                  <span className="text-[10px] ml-auto font-mono" style={{ color: staleWarning ? 'var(--warning)' : 'var(--muted)' }}>
                    {daysInStage}d
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs flex-wrap" style={{ color: 'var(--muted-foreground)' }}>
                  {t.revenue ? <span>Rev: ${(t.revenue / 1000000).toFixed(1)}M</span> : null}
                  {t.arr ? <span>ARR: ${(t.arr / 1000000).toFixed(1)}M</span> : null}
                  {t.recurring_revenue_pct ? <span>{t.recurring_revenue_pct}% recurring</span> : null}
                  {t.asking_price ? <span style={{ color: 'var(--success)' }}>Ask: ${(t.asking_price / 1000000).toFixed(1)}M</span> : null}
                  {t.asking_price && t.arr ? <span className="font-mono">{(t.asking_price / t.arr).toFixed(1)}x ARR</span> : null}
                  {t.customer_count ? <span>{t.customer_count} customers</span> : null}
                </div>
                {t.tags && t.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {t.tags.map(tag => (
                      <span key={tag} className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)', fontSize: '0.6rem' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {t.weighted_score && (
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(t.weighted_score / 5) * 100}%`,
                        background: t.weighted_score >= 4 ? 'var(--success)' : t.weighted_score >= 3 ? 'var(--warning)' : 'var(--danger)',
                      }}
                    />
                  </div>
                )}
              </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Name</th>
                <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Stage</th>
                <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Vertical</th>
                <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Geography</th>
                <th className="text-right p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Revenue</th>
                <th className="text-right p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>ARR</th>
                <th className="text-right p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Rec %</th>
                <th className="text-right p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Ask</th>
                <th className="text-center p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Score</th>
                <th className="text-right p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Days</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const daysInStage = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000);
                const staleWarning = daysInStage > 30 && !['closed_won', 'closed_lost'].includes(t.stage);
                const stage = DEAL_STAGES.find(s => s.key === t.stage);
                const fmtM = (n?: number) => n ? `$${(n / 1_000_000).toFixed(1)}M` : '—';
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }} className="transition-colors hover:bg-opacity-50">
                    <td className="p-3">
                      <Link href={`/targets/${t.id}`} className="font-medium" style={{ color: 'var(--accent)' }}>
                        {t.name}
                      </Link>
                      <div className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{t.source}</div>
                    </td>
                    <td className="p-3">
                      <span className="badge text-[10px]" style={{ background: `${stage?.color}20`, color: stage?.color }}>
                        {stage?.label}
                      </span>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{t.vertical}</td>
                    <td className="p-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{t.geography || '—'}</td>
                    <td className="p-3 text-right font-mono text-xs">{fmtM(t.revenue)}</td>
                    <td className="p-3 text-right font-mono text-xs">{fmtM(t.arr)}</td>
                    <td className="p-3 text-right font-mono text-xs">{t.recurring_revenue_pct ? `${t.recurring_revenue_pct}%` : '—'}</td>
                    <td className="p-3 text-right font-mono text-xs" style={{ color: 'var(--success)' }}>{fmtM(t.asking_price)}</td>
                    <td className="p-3 text-center">
                      {t.weighted_score ? (
                        <span className="font-mono font-bold text-xs" style={{
                          color: t.weighted_score >= 4 ? 'var(--success)' : t.weighted_score >= 3 ? 'var(--warning)' : 'var(--danger)',
                        }}>
                          {t.weighted_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-xs" style={{ color: staleWarning ? 'var(--warning)' : 'var(--muted)' }}>
                      {daysInStage}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
          {targets.length === 0 ? 'No targets yet. Add your first acquisition target.' : 'No targets match your search.'}
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Target" width="max-w-2xl">
        <TargetForm
          onSubmit={(data) => { createTarget(data); reload(); setShowAddModal(false); }}
          onCancel={() => setShowAddModal(false)}
          submitLabel="Create Target"
        />
      </Modal>

      {showBulkImport && (
        <BulkImport onClose={() => setShowBulkImport(false)} onComplete={reload} />
      )}
    </div>
  );
}
