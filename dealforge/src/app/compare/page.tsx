'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTargets } from '@/lib/db';
import { SCORE_CRITERIA, DEAL_STAGES } from '@/lib/types';
import type { Target } from '@/lib/types';
import { X, Plus, ArrowUpDown, ChevronDown, Download } from 'lucide-react';

const COMPARE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

  const handleExportComparison = () => {
    if (selectedTargets.length === 0) return;
    const allRows = [...METRICS, ...SCORE_ROWS];
    const headers = ['Metric', ...selectedTargets.map(t => t.name)];
    const rows = allRows.map(row => [row.label, ...selectedTargets.map(t => row.render(t))]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${selectedTargets.map(t => t.name.replace(/\s+/g, '-')).join('-vs-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compare Targets</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Side-by-side comparison of up to 5 acquisition targets
          </p>
        </div>
        {selectedTargets.length >= 2 && (
          <button onClick={handleExportComparison} className="btn btn-secondary btn-sm">
            <Download size={14} /> Export CSV
          </button>
        )}
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
                  <tr><td colSpan={selectedTargets.length + 2} className="px-3 pt-4 pb-1"><span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>VMS Acquisition Criteria (1-5)</span></td></tr>
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

          {/* Radar Chart Overlay */}
          {selectedTargets.some(t => t.score) && (
            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--accent)' }}>Score Comparison</h3>
              <div className="flex items-center justify-center">
                <svg viewBox="0 0 300 300" width="300" height="300">
                  {/* Background grid */}
                  {[1, 2, 3, 4, 5].map(level => {
                    const r = (level / 5) * 120;
                    const points = SCORE_CRITERIA.map((_, i) => {
                      const angle = (Math.PI * 2 * i) / SCORE_CRITERIA.length - Math.PI / 2;
                      return `${150 + r * Math.cos(angle)},${150 + r * Math.sin(angle)}`;
                    }).join(' ');
                    return <polygon key={level} points={points} fill="none" stroke="var(--border)" strokeWidth="0.5" opacity={0.5} />;
                  })}
                  {/* Axis lines */}
                  {SCORE_CRITERIA.map((c, i) => {
                    const angle = (Math.PI * 2 * i) / SCORE_CRITERIA.length - Math.PI / 2;
                    return (
                      <g key={c.key}>
                        <line x1="150" y1="150" x2={150 + 120 * Math.cos(angle)} y2={150 + 120 * Math.sin(angle)} stroke="var(--border)" strokeWidth="0.5" />
                        <text x={150 + 138 * Math.cos(angle)} y={150 + 138 * Math.sin(angle)} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="var(--muted-foreground)">
                          {c.label.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}
                  {/* Target polygons */}
                  {selectedTargets.map((t, ti) => {
                    if (!t.score) return null;
                    const points = SCORE_CRITERIA.map((c, i) => {
                      const val = t.score?.[c.key] || 0;
                      const r = (val / 5) * 120;
                      const angle = (Math.PI * 2 * i) / SCORE_CRITERIA.length - Math.PI / 2;
                      return `${150 + r * Math.cos(angle)},${150 + r * Math.sin(angle)}`;
                    }).join(' ');
                    return (
                      <polygon key={t.id} points={points} fill={`${COMPARE_COLORS[ti]}20`} stroke={COMPARE_COLORS[ti]} strokeWidth="2" />
                    );
                  })}
                </svg>
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-3">
                {selectedTargets.filter(t => t.score).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-sm" style={{ background: COMPARE_COLORS[i] }} />
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparison Summary / Recommendation */}
          {selectedTargets.length >= 2 && selectedTargets.some(t => t.weighted_score) && (
            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--accent)' }}>Comparison Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Highest Overall Score */}
                {(() => {
                  const scored = selectedTargets.filter(t => t.weighted_score);
                  if (scored.length === 0) return null;
                  const best = scored.reduce((a, b) => (a.weighted_score || 0) >= (b.weighted_score || 0) ? a : b);
                  return (
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)' }}>
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--success)' }}>Highest Score</div>
                      <div className="font-semibold text-sm">{best.name}</div>
                      <div className="text-lg font-bold font-mono" style={{ color: 'var(--success)' }}>{best.weighted_score?.toFixed(1)}</div>
                    </div>
                  );
                })()}
                {/* Best Value (lowest EV/ARR) */}
                {(() => {
                  const withMultiple = selectedTargets.filter(t => t.asking_price && t.arr);
                  if (withMultiple.length < 2) return null;
                  const best = withMultiple.reduce((a, b) => (a.asking_price! / a.arr!) <= (b.asking_price! / b.arr!) ? a : b);
                  return (
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)' }}>
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>Best Value (EV/ARR)</div>
                      <div className="font-semibold text-sm">{best.name}</div>
                      <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>{(best.asking_price! / best.arr!).toFixed(1)}x</div>
                    </div>
                  );
                })()}
                {/* Highest Growth */}
                {(() => {
                  const withGrowth = selectedTargets.filter(t => t.yoy_growth_pct);
                  if (withGrowth.length < 2) return null;
                  const best = withGrowth.reduce((a, b) => (a.yoy_growth_pct || 0) >= (b.yoy_growth_pct || 0) ? a : b);
                  return (
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)' }}>
                      <div className="text-xs font-medium mb-1" style={{ color: '#8b5cf6' }}>Highest Growth</div>
                      <div className="font-semibold text-sm">{best.name}</div>
                      <div className="text-lg font-bold font-mono" style={{ color: '#8b5cf6' }}>{best.yoy_growth_pct}%</div>
                    </div>
                  );
                })()}
              </div>
              {/* Per-criterion winners */}
              <div className="mt-4 space-y-1">
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Criterion Leaders</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {SCORE_CRITERIA.map(c => {
                    const withScore = selectedTargets.filter(t => t.score?.[c.key]);
                    if (withScore.length < 2) return null;
                    const best = withScore.reduce((a, b) => (a.score?.[c.key] || 0) >= (b.score?.[c.key] || 0) ? a : b);
                    const idx = selectedTargets.indexOf(best);
                    return (
                      <div key={c.key} className="flex items-center gap-2 text-xs p-1.5 rounded" style={{ background: 'var(--background)' }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COMPARE_COLORS[idx] || 'var(--accent)' }} />
                        <span style={{ color: 'var(--muted)' }}>{c.label.split(' ').slice(0, 2).join(' ')}</span>
                        <span className="ml-auto font-mono font-bold">{best.name.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
