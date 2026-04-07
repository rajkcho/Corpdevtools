'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTargets } from '@/lib/db';
import { SCORE_CRITERIA, DEAL_STAGES } from '@/lib/types';
import type { Target } from '@/lib/types';
import { X, Plus, ArrowUpDown, ChevronDown } from 'lucide-react';

function fmt(n: number | undefined, prefix = ''): string {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n}`;
}

function pct(n: number | undefined): string {
  return n !== undefined && n !== null ? `${n}%` : '—';
}

type MetricRow = {
  label: string;
  key: string;
  render: (t: Target) => string;
  highlight?: 'higher' | 'lower';
};

const METRICS: MetricRow[] = [
  { label: 'Vertical', key: 'vertical', render: t => t.vertical },
  { label: 'Geography', key: 'geography', render: t => t.geography || '—' },
  { label: 'Stage', key: 'stage', render: t => DEAL_STAGES.find(s => s.key === t.stage)?.label || t.stage },
  { label: 'Source', key: 'source', render: t => t.source },
  { label: 'Revenue', key: 'revenue', render: t => fmt(t.revenue, '$'), highlight: 'higher' },
  { label: 'ARR', key: 'arr', render: t => fmt(t.arr, '$'), highlight: 'higher' },
  { label: 'Recurring Rev %', key: 'recurring_revenue_pct', render: t => pct(t.recurring_revenue_pct), highlight: 'higher' },
  { label: 'Gross Margin', key: 'gross_margin_pct', render: t => pct(t.gross_margin_pct), highlight: 'higher' },
  { label: 'EBITA Margin', key: 'ebita_margin_pct', render: t => pct(t.ebita_margin_pct), highlight: 'higher' },
  { label: 'Customer Count', key: 'customer_count', render: t => t.customer_count?.toLocaleString() || '—', highlight: 'higher' },
  { label: 'Employee Count', key: 'employee_count', render: t => t.employee_count?.toLocaleString() || '—' },
  { label: 'YoY Growth', key: 'yoy_growth_pct', render: t => pct(t.yoy_growth_pct), highlight: 'higher' },
  { label: 'Asking Price', key: 'asking_price', render: t => fmt(t.asking_price, '$') },
  { label: 'Weighted Score', key: 'weighted_score', render: t => t.weighted_score?.toFixed(1) || '—', highlight: 'higher' },
];

const SCORE_ROWS: MetricRow[] = SCORE_CRITERIA.map(c => ({
  label: c.label,
  key: c.key,
  render: (t: Target) => t.score?.[c.key]?.toString() || '—',
  highlight: 'higher' as const,
}));

export default function ComparePage() {
  const [allTargets, setAllTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    setAllTargets(getTargets());
  }, []);

  const selectedTargets = selected.map(id => allTargets.find(t => t.id === id)).filter(Boolean) as Target[];

  const addTarget = (id: string) => {
    if (selected.length < 5 && !selected.includes(id)) {
      setSelected([...selected, id]);
    }
    setShowPicker(false);
  };

  const removeTarget = (id: string) => {
    setSelected(selected.filter(s => s !== id));
  };

  const getHighlight = (row: MetricRow, target: Target): string | undefined => {
    if (!row.highlight || selectedTargets.length < 2) return undefined;
    const values = selectedTargets.map(t => {
      const raw = (t as unknown as Record<string, unknown>)[row.key];
      return typeof raw === 'number' ? raw : undefined;
    });
    const validValues = values.filter((v): v is number => v !== undefined);
    if (validValues.length < 2) return undefined;

    const targetValue = (target as unknown as Record<string, unknown>)[row.key];
    if (typeof targetValue !== 'number') return undefined;

    const best = row.highlight === 'higher' ? Math.max(...validValues) : Math.min(...validValues);
    if (targetValue === best && validValues.filter(v => v === best).length === 1) return 'var(--success)';
    return undefined;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compare Targets</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Side-by-side comparison of up to 5 acquisition targets
        </p>
      </div>

      {selectedTargets.length === 0 ? (
        <div className="glass-card p-12 text-center" style={{ color: 'var(--muted)' }}>
          <ArrowUpDown size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-1">No targets selected</p>
          <p className="text-sm mb-4">Add targets to compare their metrics side-by-side.</p>
          <button onClick={() => setShowPicker(true)} className="btn btn-primary">
            <Plus size={14} /> Add Target
          </button>
        </div>
      ) : (
        <>
          {/* Sticky header with target names */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: `${200 + selectedTargets.length * 200}px` }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-3 text-sm font-medium sticky left-0 z-10" style={{ background: 'var(--card)', width: '200px', color: 'var(--muted-foreground)' }}>
                      Metric
                    </th>
                    {selectedTargets.map(t => (
                      <th key={t.id} className="text-left p-3" style={{ minWidth: '180px' }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-sm">{t.name}</div>
                            <div className="text-xs font-normal" style={{ color: 'var(--muted)' }}>{t.vertical}</div>
                          </div>
                          <button onClick={() => removeTarget(t.id)} className="btn-ghost p-1 rounded" style={{ color: 'var(--muted)' }}>
                            <X size={14} />
                          </button>
                        </div>
                      </th>
                    ))}
                    {selectedTargets.length < 5 && (
                      <th className="p-3" style={{ minWidth: '180px' }}>
                        <button onClick={() => setShowPicker(true)} className="btn btn-secondary btn-sm w-full">
                          <Plus size={12} /> Add
                        </button>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* Section: Overview */}
                  <tr><td colSpan={selectedTargets.length + 2} className="px-3 pt-4 pb-1"><span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Overview</span></td></tr>
                  {METRICS.slice(0, 4).map(row => (
                    <MetricRowComponent key={row.key} row={row} targets={selectedTargets} getHighlight={getHighlight} hasAddColumn={selectedTargets.length < 5} />
                  ))}

                  {/* Section: Financials */}
                  <tr><td colSpan={selectedTargets.length + 2} className="px-3 pt-4 pb-1"><span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Financials</span></td></tr>
                  {METRICS.slice(4, 13).map(row => (
                    <MetricRowComponent key={row.key} row={row} targets={selectedTargets} getHighlight={getHighlight} hasAddColumn={selectedTargets.length < 5} />
                  ))}

                  {/* Section: Scoring */}
                  <tr><td colSpan={selectedTargets.length + 2} className="px-3 pt-4 pb-1"><span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Harris Criteria (1-5)</span></td></tr>
                  {SCORE_ROWS.map(row => (
                    <MetricRowComponent key={row.key} row={row} targets={selectedTargets} getHighlight={getHighlight} hasAddColumn={selectedTargets.length < 5} />
                  ))}

                  {/* Section: Weighted Score */}
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td className="p-3 text-sm font-semibold sticky left-0 z-10" style={{ background: 'var(--card)' }}>Weighted Score</td>
                    {selectedTargets.map(t => (
                      <td key={t.id} className="p-3 text-sm font-bold font-mono" style={{ color: getHighlight(METRICS[METRICS.length - 1], t) || 'var(--foreground)' }}>
                        {t.weighted_score?.toFixed(1) || '—'}
                      </td>
                    ))}
                    {selectedTargets.length < 5 && <td />}
                  </tr>

                  {/* Implied valuation multiples */}
                  <tr><td colSpan={selectedTargets.length + 2} className="px-3 pt-4 pb-1"><span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Implied Multiples</span></td></tr>
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="p-3 text-sm sticky left-0 z-10" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>EV / Revenue</td>
                    {selectedTargets.map(t => (
                      <td key={t.id} className="p-3 text-sm font-mono">
                        {t.asking_price && t.revenue ? `${(t.asking_price / t.revenue).toFixed(1)}x` : '—'}
                      </td>
                    ))}
                    {selectedTargets.length < 5 && <td />}
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="p-3 text-sm sticky left-0 z-10" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>EV / ARR</td>
                    {selectedTargets.map(t => (
                      <td key={t.id} className="p-3 text-sm font-mono">
                        {t.asking_price && t.arr ? `${(t.asking_price / t.arr).toFixed(1)}x` : '—'}
                      </td>
                    ))}
                    {selectedTargets.length < 5 && <td />}
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="p-3 text-sm sticky left-0 z-10" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>Revenue / Employee</td>
                    {selectedTargets.map(t => (
                      <td key={t.id} className="p-3 text-sm font-mono">
                        {t.revenue && t.employee_count ? fmt(Math.round(t.revenue / t.employee_count), '$') : '—'}
                      </td>
                    ))}
                    {selectedTargets.length < 5 && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick add */}
          <div className="flex gap-2">
            {selectedTargets.length < 5 && (
              <button onClick={() => setShowPicker(true)} className="btn btn-secondary">
                <Plus size={14} /> Add Target
              </button>
            )}
          </div>
        </>
      )}

      {/* Target picker modal */}
      {showPicker && (
        <div className="modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="modal-content max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold">Select Target</h3>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {allTargets
                .filter(t => !selected.includes(t.id))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(t => (
                  <button
                    key={t.id}
                    onClick={() => addTarget(t.id)}
                    className="w-full text-left p-3 rounded-lg transition-colors"
                    style={{ background: 'var(--background)' }}
                  >
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {t.vertical} · {t.geography || 'No geography'} · {fmt(t.revenue, '$')} revenue
                    </div>
                  </button>
                ))}
            </div>
            <button onClick={() => setShowPicker(false)} className="btn btn-secondary w-full btn-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricRowComponent({ row, targets, getHighlight, hasAddColumn }: {
  row: MetricRow;
  targets: Target[];
  getHighlight: (row: MetricRow, target: Target) => string | undefined;
  hasAddColumn: boolean;
}) {
  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <td className="p-3 text-sm sticky left-0 z-10" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>
        {row.label}
      </td>
      {targets.map(t => (
        <td key={t.id} className="p-3 text-sm font-mono" style={{ color: getHighlight(row, t) || 'var(--foreground)' }}>
          {row.render(t)}
        </td>
      ))}
      {hasAddColumn && <td />}
    </tr>
  );
}
