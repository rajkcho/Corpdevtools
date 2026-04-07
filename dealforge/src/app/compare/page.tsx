'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTargets } from '@/lib/db';
import { SCORE_CRITERIA, DEAL_STAGES } from '@/lib/types';
import type { Target } from '@/lib/types';
import { X, Plus, ArrowUpDown, ChevronDown, Download, FileOutput } from 'lucide-react';

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
          <div className="flex gap-2">
            <button onClick={handleExportComparison} className="btn btn-secondary btn-sm">
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={() => {
                const allRows = [...METRICS, ...SCORE_ROWS];
                const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Target Comparison</title>
<style>
body{font-family:-apple-system,sans-serif;padding:40px;max-width:900px;margin:0 auto;font-size:12px;color:#1a1a2e}
h1{font-size:22px;margin-bottom:4px}h2{font-size:14px;border-bottom:2px solid #3b82f6;padding-bottom:4px;margin:20px 0 10px;color:#3b82f6;text-transform:uppercase}
table{width:100%;border-collapse:collapse;margin:8px 0}th,td{padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:11px}
th{background:#f8fafc;color:#64748b;font-size:9px;text-transform:uppercase;font-weight:600}
.best{color:#10b981;font-weight:700}.mono{font-family:Consolas,monospace}
.footer{margin-top:30px;padding-top:10px;border-top:1px solid #e5e7eb;text-align:center;color:#94a3b8;font-size:9px}
.print-btn{position:fixed;top:20px;right:20px;padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px}
@media print{.no-print{display:none}}
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
<h1>Target Comparison</h1>
<p style="color:#666;margin-bottom:20px">${selectedTargets.map(t => t.name).join(' vs ')} — ${new Date().toLocaleDateString()}</p>
<h2>Overview & Financials</h2>
<table><tr><th>Metric</th>${selectedTargets.map(t => `<th>${t.name}</th>`).join('')}</tr>
${allRows.map(row => `<tr><td>${row.label}</td>${selectedTargets.map(t => `<td class="mono">${row.render(t)}</td>`).join('')}</tr>`).join('\n')}
<tr style="border-top:2px solid #333"><td><strong>Weighted Score</strong></td>${selectedTargets.map(t => `<td class="mono" style="font-weight:bold;color:${(t.weighted_score||0)>=4?'#10b981':(t.weighted_score||0)>=3?'#f59e0b':'#ef4444'}">${t.weighted_score?.toFixed(1)||'—'}</td>`).join('')}</tr>
</table>
<h2>Implied Multiples</h2>
<table><tr><th>Multiple</th>${selectedTargets.map(t => `<th>${t.name}</th>`).join('')}</tr>
<tr><td>EV / Revenue</td>${selectedTargets.map(t => `<td class="mono">${t.asking_price&&t.revenue?(t.asking_price/t.revenue).toFixed(1)+'x':'—'}</td>`).join('')}</tr>
<tr><td>EV / ARR</td>${selectedTargets.map(t => `<td class="mono">${t.asking_price&&t.arr?(t.asking_price/t.arr).toFixed(1)+'x':'—'}</td>`).join('')}</tr>
<tr><td>Revenue / Employee</td>${selectedTargets.map(t => `<td class="mono">${t.revenue&&t.employee_count?fmt(Math.round(t.revenue/t.employee_count),'$'):'—'}</td>`).join('')}</tr>
</table>
<div class="footer">Target Comparison Report — Generated by DealForge | ${new Date().toLocaleDateString()}</div>
</body></html>`;
                const win = window.open('', '_blank');
                if (win) { win.document.write(html); win.document.close(); }
              }}
              className="btn btn-primary btn-sm"
            >
              <FileOutput size={14} /> Report
            </button>
          </div>
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
          {/* Radar Chart Overlay - above comparison table */}
          {selectedTargets.length >= 2 && selectedTargets.some(t => t.score) && (
            <CompareRadar targets={selectedTargets} />
          )}

          {/* Quick Summary */}
          {selectedTargets.length >= 2 && selectedTargets.some(t => t.weighted_score) && (
            <QuickSummary targets={selectedTargets} />
          )}

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

/** Hex color to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const RADAR_SHORT_LABELS: Record<string, string> = {
  diversified_customers: 'Diversified',
  low_churn: 'Low Churn',
  mission_critical: 'Mission Crit.',
  market_share: 'Mkt Share',
  fragmented_competition: 'Fragmented',
  growth_potential: 'Growth',
};

function CompareRadar({ targets }: { targets: Target[] }) {
  const size = 400;
  const center = size / 2;
  const maxRadius = 140;
  const count = SCORE_CRITERIA.length;
  const angleStep = (2 * Math.PI) / count;

  const getPoint = (value: number, index: number): [number, number] => {
    const angle = angleStep * index - Math.PI / 2;
    const radius = (value / 5) * maxRadius;
    return [center + radius * Math.cos(angle), center + radius * Math.sin(angle)];
  };

  const gridPoints = (level: number) =>
    SCORE_CRITERIA.map((_, i) => {
      const [x, y] = getPoint(level, i);
      return `${x},${y}`;
    }).join(' ');

  return (
    <div className="glass-card p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--accent)' }}>
        Acquisition Score Overlay
      </h3>
      <div className="flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          style={{ width: '100%', maxWidth: '400px', height: 'auto' }}
        >
          {/* Concentric grid polygons (hexagons for 6 criteria) */}
          {[1, 2, 3, 4, 5].map(level => (
            <polygon
              key={level}
              points={gridPoints(level)}
              fill="none"
              stroke="var(--border)"
              strokeWidth={level === 5 ? 1.5 : 0.5}
              strokeDasharray={level < 5 ? '3,3' : 'none'}
              opacity={0.6}
            />
          ))}

          {/* Axis lines and labels */}
          {SCORE_CRITERIA.map((c, i) => {
            const [ax, ay] = getPoint(5, i);
            const [lx, ly] = getPoint(6.1, i);
            return (
              <g key={c.key}>
                <line x1={center} y1={center} x2={ax} y2={ay} stroke="var(--border)" strokeWidth={0.5} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fill="var(--muted-foreground)"
                  fontWeight={500}
                >
                  {RADAR_SHORT_LABELS[c.key] || c.label}
                </text>
              </g>
            );
          })}

          {/* Scale labels on first axis */}
          {[1, 2, 3, 4, 5].map(level => {
            const [x, y] = getPoint(level, 0);
            return (
              <text key={level} x={x + 8} y={y - 4} fontSize="8" fill="var(--muted)" textAnchor="start">
                {level}
              </text>
            );
          })}

          {/* Target score polygons - overlaid with 20% opacity fill */}
          {targets.map((t, ti) => {
            if (!t.score) return null;
            const points = SCORE_CRITERIA.map((c, i) => {
              const val = t.score?.[c.key] || 0;
              const [x, y] = getPoint(val, i);
              return `${x},${y}`;
            }).join(' ');
            const color = COMPARE_COLORS[ti];
            return (
              <g key={t.id}>
                <polygon
                  points={points}
                  fill={hexToRgba(color, 0.2)}
                  stroke={color}
                  strokeWidth="2"
                />
                {/* Score dots at each vertex */}
                {SCORE_CRITERIA.map((c, i) => {
                  const val = t.score?.[c.key] || 0;
                  if (val === 0) return null;
                  const [x, y] = getPoint(val, i);
                  return (
                    <circle
                      key={c.key}
                      cx={x}
                      cy={y}
                      r={3}
                      fill={color}
                      stroke="var(--card)"
                      strokeWidth={1.5}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
        {targets.filter(t => t.score).map((t, i) => (
          <div key={t.id} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-sm" style={{ background: COMPARE_COLORS[i] }} />
            <span>{t.name}</span>
            {t.weighted_score != null && (
              <span className="font-mono font-semibold" style={{ color: COMPARE_COLORS[i] }}>
                ({t.weighted_score.toFixed(1)})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickSummary({ targets }: { targets: Target[] }) {
  // Count how many criteria each target leads in
  const leaderTally: Record<string, number> = {};
  targets.forEach(t => { leaderTally[t.id] = 0; });

  SCORE_CRITERIA.forEach(c => {
    const withScore = targets.filter(t => t.score?.[c.key]);
    if (withScore.length < 2) return;
    const best = withScore.reduce((a, b) => (a.score?.[c.key] || 0) >= (b.score?.[c.key] || 0) ? a : b);
    leaderTally[best.id] = (leaderTally[best.id] || 0) + 1;
  });

  // Find the target leading in the most criteria
  const mostLeads = targets.reduce((a, b) => (leaderTally[a.id] || 0) >= (leaderTally[b.id] || 0) ? a : b);

  // Find the highest weighted score target
  const scored = targets.filter(t => t.weighted_score);
  const bestOverall = scored.length > 0
    ? scored.reduce((a, b) => (a.weighted_score || 0) >= (b.weighted_score || 0) ? a : b)
    : null;

  // Best value (lowest EV/ARR)
  const withMultiple = targets.filter(t => t.asking_price && t.arr);
  const bestValue = withMultiple.length >= 2
    ? withMultiple.reduce((a, b) => (a.asking_price! / a.arr!) <= (b.asking_price! / b.arr!) ? a : b)
    : null;

  // Highest growth
  const withGrowth = targets.filter(t => t.yoy_growth_pct);
  const bestGrowth = withGrowth.length >= 2
    ? withGrowth.reduce((a, b) => (a.yoy_growth_pct || 0) >= (b.yoy_growth_pct || 0) ? a : b)
    : null;

  // Overall recommendation
  const recommendation = bestOverall
    ? bestOverall.weighted_score! >= 4
      ? `${bestOverall.name} is a strong acquisition candidate with a weighted score of ${bestOverall.weighted_score!.toFixed(1)}/5.`
      : bestOverall.weighted_score! >= 3
        ? `${bestOverall.name} leads with a score of ${bestOverall.weighted_score!.toFixed(1)}/5, but further diligence is recommended.`
        : `No target scores above 3.0. Consider expanding the pipeline before proceeding.`
    : null;

  return (
    <div className="glass-card p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--accent)' }}>
        Quick Summary
      </h3>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Highest Overall Score */}
        {bestOverall && (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)' }}>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--success)' }}>Highest Score</div>
            <div className="font-semibold text-sm">{bestOverall.name}</div>
            <div className="text-lg font-bold font-mono" style={{ color: 'var(--success)' }}>{bestOverall.weighted_score?.toFixed(1)}</div>
          </div>
        )}
        {/* Most Criteria Leads */}
        {(leaderTally[mostLeads.id] || 0) > 0 && (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)' }}>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--warning)' }}>Most Criteria Leads</div>
            <div className="font-semibold text-sm">{mostLeads.name}</div>
            <div className="text-lg font-bold font-mono" style={{ color: 'var(--warning)' }}>
              {leaderTally[mostLeads.id]}/{SCORE_CRITERIA.length}
            </div>
          </div>
        )}
        {/* Best Value */}
        {bestValue && (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)' }}>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>Best Value (EV/ARR)</div>
            <div className="font-semibold text-sm">{bestValue.name}</div>
            <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>{(bestValue.asking_price! / bestValue.arr!).toFixed(1)}x</div>
          </div>
        )}
        {/* Highest Growth */}
        {bestGrowth && (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)' }}>
            <div className="text-xs font-medium mb-1" style={{ color: '#8b5cf6' }}>Highest Growth</div>
            <div className="font-semibold text-sm">{bestGrowth.name}</div>
            <div className="text-lg font-bold font-mono" style={{ color: '#8b5cf6' }}>{bestGrowth.yoy_growth_pct}%</div>
          </div>
        )}
      </div>

      {/* Per-criterion leaders */}
      <div className="mt-4 space-y-1">
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Criterion Leaders</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SCORE_CRITERIA.map(c => {
            const withScore = targets.filter(t => t.score?.[c.key]);
            if (withScore.length < 2) return null;
            const best = withScore.reduce((a, b) => (a.score?.[c.key] || 0) >= (b.score?.[c.key] || 0) ? a : b);
            const idx = targets.indexOf(best);
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

      {/* Overall recommendation */}
      {recommendation && (
        <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: 'var(--background)', borderLeft: '3px solid var(--accent)' }}>
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--accent)' }}>Recommendation: </span>
          {recommendation}
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
