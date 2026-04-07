'use client';

import { useEffect, useState } from 'react';
import { getTargets, getTouchpoints, getDDProjects, getActivities } from '@/lib/db';
import { DEAL_STAGES } from '@/lib/types';
import type { Target, Touchpoint, DDProject, ActivityEntry } from '@/lib/types';
import { FileText, Printer, Calendar, TrendingUp, BarChart3, ArrowRight, Download, FileOutput, Clock } from 'lucide-react';

function fmt(n: number, prefix = '$'): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n.toFixed(0)}`;
}

type Period = 'qtd' | 'ytd' | '3m' | '6m' | '12m' | 'all';

function getPeriodStart(period: Period): Date {
  const now = new Date();
  switch (period) {
    case 'qtd': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), qMonth, 1);
    }
    case 'ytd': return new Date(now.getFullYear(), 0, 1);
    case '3m': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case '6m': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case '12m': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case 'all': return new Date(2000, 0, 1);
  }
}

export default function ReportsPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [ddProjects, setDDProjects] = useState<DDProject[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [period, setPeriod] = useState<Period>('ytd');

  useEffect(() => {
    setTargets(getTargets());
    setTouchpoints(getTouchpoints());
    setDDProjects(getDDProjects());
    setActivities(getActivities(1000));
  }, []);

  const periodStart = getPeriodStart(period);
  const periodLabel = { qtd: 'Quarter to Date', ytd: 'Year to Date', '3m': 'Last 3 Months', '6m': 'Last 6 Months', '12m': 'Last 12 Months', all: 'All Time' }[period];

  // Filter by period
  const periodTargets = targets.filter(t => new Date(t.created_at) >= periodStart);
  const periodTouchpoints = touchpoints.filter(t => new Date(t.date) >= periodStart);
  const periodActivities = activities.filter(a => new Date(a.created_at) >= periodStart);

  // All targets (regardless of when created)
  const active = targets.filter(t => !['closed_won', 'closed_lost'].includes(t.stage));
  const closedWon = targets.filter(t => t.stage === 'closed_won');
  const closedLost = targets.filter(t => t.stage === 'closed_lost');

  // Period-specific metrics
  const newTargets = periodTargets.length;
  const stageChanges = periodActivities.filter(a => a.type === 'stage_changed').length;
  const periodWon = closedWon.filter(t => {
    const stageHistory = periodActivities.find(a => a.target_id === t.id && a.type === 'stage_changed' && a.metadata?.to === 'closed_won');
    return stageHistory || (new Date(t.updated_at) >= periodStart && t.stage === 'closed_won');
  });
  const periodLost = closedLost.filter(t => new Date(t.updated_at) >= periodStart);

  // Sourcing breakdown for period
  const sourcingData = ['proprietary', 'broker', 'inbound', 'referral', 'other'].map(s => ({
    source: s,
    new: periodTargets.filter(t => t.source === s).length,
    total: targets.filter(t => t.source === s).length,
    active: active.filter(t => t.source === s).length,
    won: closedWon.filter(t => t.source === s).length,
  })).filter(s => s.total > 0);

  // Pipeline movement
  const pipelineMovement = DEAL_STAGES.map(s => {
    const entered = periodActivities.filter(a => a.type === 'stage_changed' && a.metadata?.to === s.key).length;
    const exited = periodActivities.filter(a => a.type === 'stage_changed' && a.metadata?.from === s.key).length;
    const current = targets.filter(t => t.stage === s.key).length;
    return { ...s, entered, exited, current };
  }).filter(s => s.current > 0 || s.entered > 0);

  // Touchpoint activity by type
  const tpByType = ['email', 'call', 'meeting', 'note', 'linkedin', 'conference', 'other'].map(type => ({
    type,
    count: periodTouchpoints.filter(t => t.type === type).length,
  })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

  // Monthly trend (last 6 months)
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const month = date.getMonth();
    const year = date.getFullYear();
    const label = date.toLocaleDateString('en-US', { month: 'short' });

    const newTgts = targets.filter(t => {
      const d = new Date(t.created_at);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    const tps = touchpoints.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    const moves = activities.filter(a => {
      const d = new Date(a.created_at);
      return d.getMonth() === month && d.getFullYear() === year && a.type === 'stage_changed';
    }).length;

    return { label, newTargets: newTgts, touchpoints: tps, stageChanges: moves };
  });

  const maxMonthly = Math.max(...monthlyTrend.map(m => Math.max(m.newTargets, m.touchpoints, m.stageChanges)), 1);

  // Pipeline value by stage
  const pipelineValue = DEAL_STAGES
    .map(s => ({
      ...s,
      value: targets.filter(t => t.stage === s.key).reduce((sum, t) => sum + (t.asking_price || 0), 0),
      count: targets.filter(t => t.stage === s.key).length,
    }))
    .filter(s => s.count > 0);

  const handleExportReport = () => {
    const lines = [
      `DEAL FLOW REPORT - ${periodLabel}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      'PIPELINE SUMMARY',
      `Active Targets: ${active.length}`,
      `New Targets (period): ${newTargets}`,
      `Stage Changes (period): ${stageChanges}`,
      `Won (period): ${periodWon.length}`,
      `Lost (period): ${periodLost.length}`,
      `Total Pipeline Value: ${fmt(active.reduce((s, t) => s + (t.asking_price || 0), 0))}`,
      '',
      'SOURCING',
      ...sourcingData.map(s => `  ${s.source}: ${s.new} new, ${s.active} active, ${s.won} won`),
      '',
      'PIPELINE BY STAGE',
      ...pipelineValue.map(s => `  ${s.label}: ${s.count} targets, ${fmt(s.value)} value`),
      '',
      'ACTIVITY',
      `Total Touchpoints (period): ${periodTouchpoints.length}`,
      ...tpByType.map(t => `  ${t.type}: ${t.count}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deal-flow-report-${period}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText size={24} style={{ color: 'var(--accent)' }} /> Deal Flow Report
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            M&A pipeline activity and sourcing metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={e => setPeriod(e.target.value as Period)} className="text-sm">
            <option value="qtd">Quarter to Date</option>
            <option value="ytd">Year to Date</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="12m">Last 12 Months</option>
            <option value="all">All Time</option>
          </select>
          <button onClick={handleExportReport} className="btn btn-secondary btn-sm">
            <Download size={14} /> Export
          </button>
          <button
            onClick={async () => {
              const { generateDealFlowReport } = await import('@/lib/deal-flow-report');
              const periodMap: Record<string, '7d' | '30d' | '90d' | 'all'> = { qtd: '30d', ytd: '90d', '3m': '90d', '6m': '90d', '12m': 'all', all: 'all' };
              const html = generateDealFlowReport(periodMap[period] || '30d');
              const win = window.open('', '_blank');
              if (win) { win.document.write(html); win.document.close(); }
            }}
            className="btn btn-primary btn-sm"
          >
            <FileOutput size={14} /> Deal Flow Report
          </button>
          <button
            onClick={async () => {
              const { generateExecutiveSummary } = await import('@/lib/executive-summary');
              const periodMap: Record<string, '7d' | '14d' | '30d'> = { qtd: '30d', ytd: '30d', '3m': '30d', '6m': '30d', '12m': '30d', all: '30d' };
              const digestPeriod = period === 'qtd' || period === 'ytd' ? '30d' : period === '3m' ? '30d' : '7d';
              const html = generateExecutiveSummary(digestPeriod);
              const win = window.open('', '_blank');
              if (win) { win.document.write(html); win.document.close(); }
            }}
            className="btn btn-primary btn-sm"
          >
            <FileOutput size={14} /> Executive Summary
          </button>
          <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Period header (for print) */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">Deal Flow Report - {periodLabel}</h1>
        <p className="text-sm">{new Date().toLocaleDateString()}</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Active Pipeline" value={active.length.toString()} sub="targets" color="var(--accent)" />
        <SummaryCard label="New (Period)" value={newTargets.toString()} sub="targets added" color="var(--success)" />
        <SummaryCard label="Stage Advances" value={stageChanges.toString()} sub="movements" color="var(--warning)" />
        <SummaryCard label="Won (Period)" value={periodWon.length.toString()} sub="acquisitions" color="var(--success)" />
        <SummaryCard label="Lost (Period)" value={periodLost.length.toString()} sub="passed/lost" color="var(--danger)" />
        <SummaryCard label="Touchpoints" value={periodTouchpoints.length.toString()} sub="interactions" color="var(--accent)" />
      </div>

      {/* Monthly Activity Trend */}
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <Calendar size={16} style={{ color: 'var(--accent)' }} /> Monthly Activity Trend
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Last 6 months of deal flow activity</p>
        <div className="flex items-end gap-3 h-36">
          {monthlyTrend.map(m => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-0.5">
              {/* Stacked bars */}
              <div className="w-full flex flex-col items-center gap-0.5" style={{ height: 100 }}>
                <div className="w-full flex items-end gap-0.5 h-full">
                  <div className="flex-1 rounded-t" style={{ height: `${(m.newTargets / maxMonthly) * 100}%`, background: 'var(--success)', minHeight: m.newTargets > 0 ? 4 : 0 }} title={`${m.newTargets} new targets`} />
                  <div className="flex-1 rounded-t" style={{ height: `${(m.touchpoints / maxMonthly) * 100}%`, background: 'var(--accent)', minHeight: m.touchpoints > 0 ? 4 : 0 }} title={`${m.touchpoints} touchpoints`} />
                  <div className="flex-1 rounded-t" style={{ height: `${(m.stageChanges / maxMonthly) * 100}%`, background: 'var(--warning)', minHeight: m.stageChanges > 0 ? 4 : 0 }} title={`${m.stageChanges} stage changes`} />
                </div>
              </div>
              <span className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: 'var(--muted)' }}>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: 'var(--success)' }} /> New Targets</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: 'var(--accent)' }} /> Touchpoints</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: 'var(--warning)' }} /> Stage Changes</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Value by Stage */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <BarChart3 size={16} style={{ color: 'var(--accent)' }} /> Pipeline Value by Stage
          </h2>
          <div className="space-y-2">
            {pipelineValue.map(s => (
              <div key={s.key} className="flex items-center gap-3">
                <span className="text-xs w-24 truncate" style={{ color: s.color }}>{s.label}</span>
                <div className="flex-1 h-5 rounded" style={{ background: 'var(--background)' }}>
                  <div className="h-full rounded flex items-center px-2 text-[10px] font-medium text-white"
                    style={{
                      width: `${Math.max(12, (s.value / Math.max(...pipelineValue.map(x => x.value), 1)) * 100)}%`,
                      background: s.color,
                    }}
                  >
                    {s.value > 0 ? fmt(s.value) : ''}
                  </div>
                </div>
                <span className="text-xs font-mono w-6 text-right">{s.count}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-semibold">Total Pipeline</span>
              <span className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>
                {fmt(pipelineValue.reduce((s, v) => s + v.value, 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Sourcing Breakdown */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-3">Sourcing Breakdown</h2>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left p-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>Source</th>
                <th className="text-center p-1.5 text-xs" style={{ color: 'var(--success)' }}>New</th>
                <th className="text-center p-1.5 text-xs" style={{ color: 'var(--accent)' }}>Active</th>
                <th className="text-center p-1.5 text-xs" style={{ color: 'var(--success)' }}>Won</th>
                <th className="text-center p-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sourcingData.map(s => (
                <tr key={s.source} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="p-1.5 capitalize font-medium">{s.source}</td>
                  <td className="p-1.5 text-center font-mono" style={{ color: 'var(--success)' }}>{s.new}</td>
                  <td className="p-1.5 text-center font-mono" style={{ color: 'var(--accent)' }}>{s.active}</td>
                  <td className="p-1.5 text-center font-mono" style={{ color: 'var(--success)' }}>{s.won}</td>
                  <td className="p-1.5 text-center font-mono">{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {targets.length > 0 && (() => {
            const propCount = targets.filter(t => t.source === 'proprietary').length;
            const propPct = Math.round((propCount / targets.length) * 100);
            return (
              <p className="text-xs mt-3" style={{ color: propPct >= 60 ? 'var(--success)' : 'var(--warning)' }}>
                Proprietary sourcing: {propPct}% (VMS benchmark target: 60-70%)
              </p>
            );
          })()}
        </div>
      </div>

      {/* Pipeline Movement */}
      {pipelineMovement.some(s => s.entered > 0 || s.exited > 0) && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <ArrowRight size={16} style={{ color: 'var(--accent)' }} /> Pipeline Movement ({periodLabel})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Stage</th>
                  <th className="text-center p-2 text-xs" style={{ color: 'var(--success)' }}>Entered</th>
                  <th className="text-center p-2 text-xs" style={{ color: 'var(--danger)' }}>Exited</th>
                  <th className="text-center p-2 text-xs" style={{ color: 'var(--accent)' }}>Net Change</th>
                  <th className="text-center p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Current</th>
                </tr>
              </thead>
              <tbody>
                {pipelineMovement.map(s => {
                  const net = s.entered - s.exited;
                  return (
                    <tr key={s.key} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2 font-medium" style={{ color: s.color }}>{s.label}</td>
                      <td className="p-2 text-center font-mono" style={{ color: s.entered > 0 ? 'var(--success)' : 'var(--muted)' }}>
                        {s.entered > 0 ? `+${s.entered}` : '—'}
                      </td>
                      <td className="p-2 text-center font-mono" style={{ color: s.exited > 0 ? 'var(--danger)' : 'var(--muted)' }}>
                        {s.exited > 0 ? `-${s.exited}` : '—'}
                      </td>
                      <td className="p-2 text-center font-mono font-bold" style={{ color: net > 0 ? 'var(--success)' : net < 0 ? 'var(--danger)' : 'var(--muted)' }}>
                        {net > 0 ? `+${net}` : net < 0 ? net : '—'}
                      </td>
                      <td className="p-2 text-center font-mono">{s.current}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Touchpoint Breakdown */}
      {tpByType.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-3">Engagement Activity ({periodLabel})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tpByType.map(t => (
              <div key={t.type} className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                <div className="text-xl font-bold font-mono" style={{ color: 'var(--accent)' }}>{t.count}</div>
                <div className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{t.type}s</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Aging Report */}
      {active.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <Clock size={16} style={{ color: 'var(--warning)' }} /> Pipeline Aging Report
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Deals grouped by time in current stage</p>

          {(() => {
            const buckets = [
              { label: '0-7 days', min: 0, max: 7, color: 'var(--success)' },
              { label: '8-14 days', min: 8, max: 14, color: 'var(--success)' },
              { label: '15-30 days', min: 15, max: 30, color: 'var(--accent)' },
              { label: '31-60 days', min: 31, max: 60, color: 'var(--warning)' },
              { label: '61-90 days', min: 61, max: 90, color: 'var(--warning)' },
              { label: '90+ days', min: 91, max: 99999, color: 'var(--danger)' },
            ];

            const getAgingDays = (t: Target) => Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000);

            const bucketData = buckets.map(b => ({
              ...b,
              targets: active.filter(t => {
                const days = getAgingDays(t);
                return days >= b.min && days <= b.max;
              }),
            }));

            const maxBucket = Math.max(...bucketData.map(b => b.targets.length), 1);
            const avgAge = active.length > 0 ? Math.round(active.reduce((s, t) => s + getAgingDays(t), 0) / active.length) : 0;
            const staleCount = active.filter(t => getAgingDays(t) > 30).length;

            return (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono">{avgAge}d</div>
                    <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Avg Age in Stage</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono" style={{ color: staleCount > 0 ? 'var(--warning)' : 'var(--success)' }}>{staleCount}</div>
                    <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Stale (&gt;30d)</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono">{active.length}</div>
                    <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Active Deals</div>
                  </div>
                </div>

                {/* Aging Distribution */}
                <div className="space-y-2 mb-4">
                  {bucketData.map(b => (
                    <div key={b.label} className="flex items-center gap-3">
                      <span className="text-xs w-20" style={{ color: b.color }}>{b.label}</span>
                      <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                        <div className="h-full rounded flex items-center px-2 text-[10px] font-bold text-white transition-all"
                          style={{ width: `${Math.max((b.targets.length / maxBucket) * 100, b.targets.length > 0 ? 10 : 0)}%`, background: b.color }}
                        >
                          {b.targets.length > 0 ? b.targets.length : ''}
                        </div>
                      </div>
                      <span className="text-xs font-mono w-16 text-right" style={{ color: 'var(--muted)' }}>
                        {b.targets.length > 0 ? fmt(b.targets.reduce((s, t) => s + (t.asking_price || 0), 0)) : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Stale Deals Detail */}
                {staleCount > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--warning)' }}>Stale Deals Requiring Attention</h3>
                    <div className="space-y-1.5">
                      {active
                        .filter(t => getAgingDays(t) > 30)
                        .sort((a, b) => getAgingDays(b) - getAgingDays(a))
                        .slice(0, 10)
                        .map(t => {
                          const days = getAgingDays(t);
                          const stage = DEAL_STAGES.find(s => s.key === t.stage);
                          return (
                            <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg text-sm" style={{ background: 'var(--background)' }}>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: days > 60 ? 'var(--danger)' : 'var(--warning)' }} />
                              <span className="font-medium flex-1 truncate">{t.name}</span>
                              <span className="badge text-[9px]" style={{ background: `${stage?.color}20`, color: stage?.color }}>{stage?.label}</span>
                              <span className="text-xs font-mono font-bold" style={{ color: days > 60 ? 'var(--danger)' : 'var(--warning)' }}>{days}d</span>
                              {t.asking_price && <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{fmt(t.asking_price)}</span>}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="glass-card p-3 text-center">
      <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
      <div className="text-[10px]" style={{ color: 'var(--muted)' }}>{sub}</div>
    </div>
  );
}
