'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Download } from 'lucide-react';
import Link from 'next/link';
import { getTargets, createTarget, exportTargetsCSV } from '@/lib/db';
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

  const reload = useCallback(() => setTargets(getTargets()), []);
  useEffect(() => { reload(); }, [reload]);

  const filtered = targets
    .filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.vertical.toLowerCase().includes(q) || t.geography.toLowerCase().includes(q);
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
        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="btn btn-secondary btn-sm">
          {sortDir === 'desc' ? 'Desc' : 'Asc'}
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(t => (
          <Link key={t.id} href={`/targets/${t.id}`} className="glass-card p-4 hover:border-opacity-80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {t.vertical}{t.geography && ` · ${t.geography}`}
                </div>
              </div>
              {t.weighted_score && (
                <span className="badge font-mono" style={{
                  background: t.weighted_score >= 4 ? 'rgba(16,185,129,0.15)' : t.weighted_score >= 3 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                  color: t.weighted_score >= 4 ? 'var(--success)' : t.weighted_score >= 3 ? 'var(--warning)' : 'var(--danger)',
                }}>
                  {t.weighted_score.toFixed(1)}
                </span>
              )}
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
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {t.revenue && <span>Rev: ${(t.revenue / 1000000).toFixed(1)}M</span>}
              {t.arr && <span>ARR: ${(t.arr / 1000000).toFixed(1)}M</span>}
              {t.customer_count && <span>{t.customer_count} customers</span>}
            </div>
          </Link>
        ))}
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
