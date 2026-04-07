'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Download, Upload } from 'lucide-react';
import Link from 'next/link';
import { getTargets, createTarget, exportTargetsCSV, importTargetsFromCSV } from '@/lib/db';
import { DEAL_STAGES, VERTICALS } from '@/lib/types';
import type { Target } from '@/lib/types';
import Modal from '@/components/Modal';
import TargetForm from '@/components/TargetForm';

export default function TargetsPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'updated_at' | 'weighted_score' | 'revenue'>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterVertical, setFilterVertical] = useState<string>('all');

  const reload = useCallback(() => setTargets(getTargets()), []);
  useEffect(() => { reload(); }, [reload]);

  const verticals = Array.from(new Set(targets.map(t => t.vertical))).sort();

  const filtered = targets
    .filter(t => {
      if (filterStage !== 'all' && t.stage !== filterStage) return false;
      if (filterVertical !== 'all' && t.vertical !== filterVertical) return false;
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
          <label className="btn btn-secondary btn-sm cursor-pointer">
            <Upload size={14} /> Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  const count = importTargetsFromCSV(ev.target?.result as string);
                  alert(`Imported ${count} target(s).`);
                  reload();
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </label>
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

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
          <span>{filtered.length} shown</span>
          <span>Pipeline: ${filtered.reduce((s, t) => s + (t.asking_price || 0), 0) > 0 ? `${(filtered.reduce((s, t) => s + (t.asking_price || 0), 0) / 1000000).toFixed(1)}M` : '—'}</span>
          <span>Avg Score: {filtered.filter(t => t.weighted_score).length > 0 ? (filtered.reduce((s, t) => s + (t.weighted_score || 0), 0) / filtered.filter(t => t.weighted_score).length).toFixed(1) : '—'}</span>
          <span>Scored: {filtered.filter(t => t.weighted_score).length}/{filtered.length}</span>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(t => {
          const daysInStage = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000);
          const staleWarning = daysInStage > 30 && !['closed_won', 'closed_lost'].includes(t.stage);
          return (
            <Link key={t.id} href={`/targets/${t.id}`} className="glass-card p-4 hover:border-opacity-80 transition-all">
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
              <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {t.revenue ? <span>Rev: ${(t.revenue / 1000000).toFixed(1)}M</span> : null}
                {t.arr ? <span>ARR: ${(t.arr / 1000000).toFixed(1)}M</span> : null}
                {t.recurring_revenue_pct ? <span>{t.recurring_revenue_pct}% recurring</span> : null}
                {t.asking_price ? <span style={{ color: 'var(--success)' }}>Ask: ${(t.asking_price / 1000000).toFixed(1)}M</span> : null}
                {t.customer_count ? <span>{t.customer_count} customers</span> : null}
              </div>
              {/* Tags */}
              {t.tags && t.tags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {t.tags.map(tag => (
                    <span key={tag} className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)', fontSize: '0.6rem' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {/* Mini score bar */}
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
          );
        })}
      </div>

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
    </div>
  );
}
