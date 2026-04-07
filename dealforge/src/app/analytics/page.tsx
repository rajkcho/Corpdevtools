'use client';

import { useEffect, useState } from 'react';
import { getTargets, getTouchpoints, getDDProjects } from '@/lib/db';
import { DEAL_STAGES, VERTICALS, SCORE_CRITERIA } from '@/lib/types';
import type { Target, Touchpoint, DDProject, DealStage, DealScore } from '@/lib/types';
import { getActivities } from '@/lib/db';
import type { ActivityEntry } from '@/lib/types';
import { TrendingUp, Clock, Users, DollarSign, Activity, BarChart3, ArrowRight, AlertTriangle, MapPin, Calendar, Grid } from 'lucide-react';
import Link from 'next/link';

function fmt(n: number, prefix = ''): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n.toFixed(0)}`;
}

export default function AnalyticsPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [ddProjects, setDDProjects] = useState<DDProject[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    setTargets(getTargets());
    setTouchpoints(getTouchpoints());
    setDDProjects(getDDProjects());
    setActivities(getActivities());
  }, []);

  // Active targets (not closed)
  const active = targets.filter(t => !['closed_won', 'closed_lost'].includes(t.stage));
  const won = targets.filter(t => t.stage === 'closed_won');
  const lost = targets.filter(t => t.stage === 'closed_lost');

  // Pipeline value
  const totalPipelineValue = active.reduce((sum, t) => sum + (t.asking_price || 0), 0);
  const wonValue = won.reduce((sum, t) => sum + (t.asking_price || 0), 0);
  const totalRevenue = targets.reduce((sum, t) => sum + (t.revenue || 0), 0);

  // Stage distribution
  const stageData = DEAL_STAGES.map(s => ({
    ...s,
    count: targets.filter(t => t.stage === s.key).length,
    value: targets.filter(t => t.stage === s.key).reduce((sum, t) => sum + (t.asking_price || 0), 0),
  }));
  const maxStageCount = Math.max(...stageData.map(s => s.count), 1);

  // Vertical distribution
  const verticalData = VERTICALS
    .map(v => ({
      name: v,
      count: targets.filter(t => t.vertical === v).length,
      revenue: targets.filter(t => t.vertical === v).reduce((sum, t) => sum + (t.revenue || 0), 0),
    }))
    .filter(v => v.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxVerticalCount = Math.max(...verticalData.map(v => v.count), 1);

  // Source analysis
  const sources = ['proprietary', 'broker', 'inbound', 'referral', 'other'] as const;
  const sourceData = sources.map(s => ({
    name: s,
    count: targets.filter(t => t.source === s).length,
    won: targets.filter(t => t.source === s && t.stage === 'closed_won').length,
  })).filter(s => s.count > 0);
  const totalSourceCount = Math.max(targets.length, 1);
  const proprietaryRatio = targets.length > 0
    ? Math.round((targets.filter(t => t.source === 'proprietary').length / targets.length) * 100)
    : 0;

  // Days in stage analysis
  const stageVelocity = DEAL_STAGES.filter(s => !['closed_won', 'closed_lost'].includes(s.key)).map(s => {
    const targetsInStage = targets.filter(t => t.stage === s.key);
    if (targetsInStage.length === 0) return { ...s, avgDays: 0 };
    const avgDays = targetsInStage.reduce((sum, t) => {
      const days = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000);
      return sum + days;
    }, 0) / targetsInStage.length;
    return { ...s, avgDays: Math.round(avgDays) };
  });
  const maxDays = Math.max(...stageVelocity.map(s => s.avgDays), 1);

  // Touchpoint activity by month (last 6 months)
  const monthlyActivity: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const count = touchpoints.filter(tp => tp.date.startsWith(monthKey)).length;
    monthlyActivity.push({ month: label, count });
  }
  const maxActivity = Math.max(...monthlyActivity.map(m => m.count), 1);

  // Score distribution
  const scoredTargets = targets.filter(t => t.weighted_score);
  const scoreRanges = [
    { label: '4.0-5.0', min: 4, max: 5.01, color: 'var(--success)' },
    { label: '3.0-3.9', min: 3, max: 4, color: 'var(--accent)' },
    { label: '2.0-2.9', min: 2, max: 3, color: 'var(--warning)' },
    { label: '1.0-1.9', min: 1, max: 2, color: 'var(--danger)' },
  ];
  const scoreDistribution = scoreRanges.map(r => ({
    ...r,
    count: scoredTargets.filter(t => t.weighted_score! >= r.min && t.weighted_score! < r.max).length,
  }));
  const maxScoreCount = Math.max(...scoreDistribution.map(s => s.count), 1);

  // Win rate
  const closedDeals = won.length + lost.length;
  const winRate = closedDeals > 0 ? Math.round((won.length / closedDeals) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pipeline Analytics</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          {targets.length} total targets · {active.length} active · {touchpoints.length} touchpoints logged
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Active Pipeline Value" value={fmt(totalPipelineValue, '$')} sub={`${active.length} active targets`} icon={<DollarSign size={16} />} />
        <KPI label="Closed Won Value" value={fmt(wonValue, '$')} sub={`${won.length} deals won`} icon={<TrendingUp size={16} />} color="var(--success)" />
        <KPI label="Win Rate" value={`${winRate}%`} sub={`${closedDeals} closed deals`} icon={<Activity size={16} />} color={winRate >= 25 ? 'var(--success)' : 'var(--warning)'} />
        <KPI label="Proprietary Sourcing" value={`${proprietaryRatio}%`} sub="VMS benchmark: 60-70%" icon={<Users size={16} />} color={proprietaryRatio >= 60 ? 'var(--success)' : 'var(--warning)'} />
      </div>

      {/* Weighted Pipeline Forecast */}
      {(() => {
        const STAGE_PROBABILITY: Record<DealStage, number> = {
          identified: 0.05, researching: 0.10, contacted: 0.15, nurturing: 0.25,
          loi_submitted: 0.40, loi_signed: 0.60, due_diligence: 0.75, closing: 0.90,
          closed_won: 1.0, closed_lost: 0,
        };

        const activeWithPrice = targets.filter(t => !['closed_won', 'closed_lost'].includes(t.stage) && t.asking_price);
        if (activeWithPrice.length < 1) return null;

        const forecastByStage = DEAL_STAGES
          .filter(s => !['closed_won', 'closed_lost'].includes(s.key))
          .map(s => {
            const stageTargets = activeWithPrice.filter(t => t.stage === s.key);
            const rawValue = stageTargets.reduce((sum, t) => sum + (t.asking_price || 0), 0);
            const prob = STAGE_PROBABILITY[s.key];
            return { ...s, count: stageTargets.length, rawValue, prob, weightedValue: rawValue * prob };
          })
          .filter(s => s.count > 0);

        const totalRaw = forecastByStage.reduce((s, x) => s + x.rawValue, 0);
        const totalWeighted = forecastByStage.reduce((s, x) => s + x.weightedValue, 0);
        const maxRaw = Math.max(...forecastByStage.map(s => s.rawValue), 1);

        return (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  <TrendingUp size={16} style={{ color: 'var(--success)' }} /> Weighted Pipeline Forecast
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Stage-weighted probability model for active pipeline</p>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Expected Close Value</div>
                <div className="text-xl font-bold font-mono" style={{ color: 'var(--success)' }}>{fmt(totalWeighted, '$')}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>of {fmt(totalRaw, '$')} raw pipeline</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Stage</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Deals</th>
                    <th className="text-right p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Raw Value</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Prob.</th>
                    <th className="text-right p-2 text-xs" style={{ color: 'var(--success)' }}>Weighted</th>
                    <th className="p-2 text-xs w-32" style={{ color: 'var(--muted-foreground)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {forecastByStage.map(s => (
                    <tr key={s.key} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                          {s.label}
                        </span>
                      </td>
                      <td className="p-2 text-center font-mono">{s.count}</td>
                      <td className="p-2 text-right font-mono">{fmt(s.rawValue, '$')}</td>
                      <td className="p-2 text-center font-mono" style={{ color: 'var(--accent)' }}>{Math.round(s.prob * 100)}%</td>
                      <td className="p-2 text-right font-mono font-bold" style={{ color: 'var(--success)' }}>{fmt(s.weightedValue, '$')}</td>
                      <td className="p-2">
                        <div className="h-4 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                          <div className="h-full rounded" style={{ width: `${(s.rawValue / maxRaw) * 100}%`, background: s.color, opacity: 0.7 }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td className="p-2 font-bold">Total</td>
                    <td className="p-2 text-center font-mono font-bold">{activeWithPrice.length}</td>
                    <td className="p-2 text-right font-mono font-bold">{fmt(totalRaw, '$')}</td>
                    <td className="p-2 text-center font-mono" style={{ color: 'var(--accent)' }}>{totalRaw > 0 ? `${Math.round((totalWeighted / totalRaw) * 100)}%` : '—'}</td>
                    <td className="p-2 text-right font-mono font-bold" style={{ color: 'var(--success)' }}>{fmt(totalWeighted, '$')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4">Pipeline by Stage</h2>
          <div className="space-y-2">
            {stageData.map(s => (
              <div key={s.key} className="flex items-center gap-3">
                <span className="text-xs w-24 truncate" style={{ color: 'var(--muted-foreground)' }}>{s.label}</span>
                <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                  <div
                    className="h-full rounded flex items-center px-2"
                    style={{ width: `${Math.max((s.count / maxStageCount) * 100, s.count > 0 ? 8 : 0)}%`, background: s.color, transition: 'width 0.3s' }}
                  >
                    {s.count > 0 && <span className="text-xs font-bold text-white">{s.count}</span>}
                  </div>
                </div>
                {s.value > 0 && <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{fmt(s.value, '$')}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Vertical Distribution */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4">By Vertical</h2>
          <div className="space-y-2">
            {verticalData.map(v => (
              <div key={v.name} className="flex items-center gap-3">
                <span className="text-xs w-28 truncate" style={{ color: 'var(--muted-foreground)' }}>{v.name}</span>
                <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                  <div
                    className="h-full rounded flex items-center px-2"
                    style={{ width: `${Math.max((v.count / maxVerticalCount) * 100, 8)}%`, background: 'var(--accent)', transition: 'width 0.3s' }}
                  >
                    <span className="text-xs font-bold text-white">{v.count}</span>
                  </div>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{fmt(v.revenue, '$')}</span>
              </div>
            ))}
            {verticalData.length === 0 && <p className="text-sm" style={{ color: 'var(--muted)' }}>No data</p>}
          </div>
        </div>

        {/* Source Analysis */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4">Deal Source</h2>
          <div className="space-y-3">
            {sourceData.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-xs w-20 capitalize" style={{ color: 'var(--muted-foreground)' }}>{s.name}</span>
                <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                  <div
                    className="h-full rounded flex items-center px-2"
                    style={{
                      width: `${Math.max((s.count / totalSourceCount) * 100, 8)}%`,
                      background: s.name === 'proprietary' ? 'var(--success)' : 'var(--accent)',
                      transition: 'width 0.3s',
                    }}
                  >
                    <span className="text-xs font-bold text-white">{s.count}</span>
                  </div>
                </div>
                {s.won > 0 && <span className="text-xs" style={{ color: 'var(--success)' }}>{s.won} won</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Stage Velocity */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4">Average Days in Stage</h2>
          <div className="space-y-2">
            {stageVelocity.map(s => (
              <div key={s.key} className="flex items-center gap-3">
                <span className="text-xs w-24 truncate" style={{ color: 'var(--muted-foreground)' }}>{s.label}</span>
                <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                  <div
                    className="h-full rounded flex items-center px-2"
                    style={{
                      width: `${Math.max((s.avgDays / maxDays) * 100, s.avgDays > 0 ? 8 : 0)}%`,
                      background: s.avgDays > 30 ? 'var(--danger)' : s.avgDays > 14 ? 'var(--warning)' : 'var(--accent)',
                      transition: 'width 0.3s',
                    }}
                  >
                    {s.avgDays > 0 && <span className="text-xs font-bold text-white">{s.avgDays}d</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
            Red indicates deals stalling (&gt;30 days). Review stale deals in Pipeline view.
          </p>
        </div>

        {/* Touchpoint Activity */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4">Outreach Activity (6 Months)</h2>
          <div className="flex items-end gap-2 h-32">
            {monthlyActivity.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{m.count}</span>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max((m.count / maxActivity) * 100, m.count > 0 ? 4 : 0)}%`,
                    background: 'var(--accent)',
                    transition: 'height 0.3s',
                    minHeight: m.count > 0 ? '4px' : '0',
                  }}
                />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score Distribution */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4">Score Distribution</h2>
          {scoredTargets.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No scored targets yet. Score targets in their detail view.</p>
          ) : (
            <div className="space-y-3">
              {scoreDistribution.map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-xs w-16 font-mono" style={{ color: 'var(--muted-foreground)' }}>{s.label}</span>
                  <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                    <div
                      className="h-full rounded flex items-center px-2"
                      style={{
                        width: `${Math.max((s.count / maxScoreCount) * 100, s.count > 0 ? 8 : 0)}%`,
                        background: s.color,
                        transition: 'width 0.3s',
                      }}
                    >
                      {s.count > 0 && <span className="text-xs font-bold text-white">{s.count}</span>}
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                VMS criteria: Diversified Customers, Low Churn, Mission Critical, Market Share, Fragmented Competition, Growth Potential
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Financial Benchmarks */}
      {targets.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4">Financial Benchmarks (Portfolio Average)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(() => {
              const withRecurring = targets.filter(t => t.recurring_revenue_pct);
              const withMargin = targets.filter(t => t.gross_margin_pct);
              const withEbita = targets.filter(t => t.ebita_margin_pct);
              const withGrowth = targets.filter(t => t.yoy_growth_pct);
              const withCustomers = targets.filter(t => t.customer_count);
              return (
                <>
                  <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono" style={{ color: withRecurring.length > 0 && (withRecurring.reduce((s, t) => s + (t.recurring_revenue_pct || 0), 0) / withRecurring.length) >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                      {withRecurring.length > 0 ? `${Math.round(withRecurring.reduce((s, t) => s + (t.recurring_revenue_pct || 0), 0) / withRecurring.length)}%` : '—'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg Recurring Rev</div>
                    <div className="text-xs" style={{ color: 'var(--muted)', fontSize: '0.6rem' }}>Target: 80%+</div>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono" style={{ color: withMargin.length > 0 && (withMargin.reduce((s, t) => s + (t.gross_margin_pct || 0), 0) / withMargin.length) >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                      {withMargin.length > 0 ? `${Math.round(withMargin.reduce((s, t) => s + (t.gross_margin_pct || 0), 0) / withMargin.length)}%` : '—'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg Gross Margin</div>
                    <div className="text-xs" style={{ color: 'var(--muted)', fontSize: '0.6rem' }}>Target: 70%+</div>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono" style={{ color: withEbita.length > 0 && (withEbita.reduce((s, t) => s + (t.ebita_margin_pct || 0), 0) / withEbita.length) >= 20 ? 'var(--success)' : 'var(--warning)' }}>
                      {withEbita.length > 0 ? `${Math.round(withEbita.reduce((s, t) => s + (t.ebita_margin_pct || 0), 0) / withEbita.length)}%` : '—'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg EBITA Margin</div>
                    <div className="text-xs" style={{ color: 'var(--muted)', fontSize: '0.6rem' }}>Target: 20%+</div>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono">
                      {withGrowth.length > 0 ? `${Math.round(withGrowth.reduce((s, t) => s + (t.yoy_growth_pct || 0), 0) / withGrowth.length)}%` : '—'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg YoY Growth</div>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono">
                      {withCustomers.length > 0 ? Math.round(withCustomers.reduce((s, t) => s + (t.customer_count || 0), 0) / withCustomers.length).toLocaleString() : '—'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg Customer Count</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Enhanced Pipeline Funnel */}
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4">Pipeline Funnel</h2>
        <div className="space-y-0">
          {stageData.filter(s => s.count > 0 || !['closed_won', 'closed_lost'].includes(s.key)).map((s, i, arr) => {
            const maxCount = Math.max(arr[0]?.count || 1, 1);
            const widthPct = Math.max((s.count / maxCount) * 100, 12);
            const prevCount = i > 0 ? arr[i - 1]?.count || 0 : 0;
            const dropOff = i > 0 && prevCount > 0 ? Math.round(((prevCount - s.count) / prevCount) * 100) : 0;
            return (
              <div key={s.key}>
                {i > 0 && dropOff > 0 && (
                  <div className="flex items-center justify-center py-0.5">
                    <span className="text-[10px] font-mono" style={{ color: dropOff > 50 ? 'var(--danger)' : 'var(--muted)' }}>
                      ▼ {dropOff}% drop-off
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-center">
                  <div
                    className="py-2.5 text-center text-xs font-medium relative"
                    style={{
                      width: `${widthPct}%`,
                      background: s.color,
                      color: 'white',
                      transition: 'width 0.3s',
                      minWidth: '100px',
                      clipPath: 'polygon(2% 0%, 98% 0%, 100% 100%, 0% 100%)',
                    }}
                  >
                    {s.label}: {s.count} {s.value > 0 ? `(${fmt(s.value, '$')})` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            Top-of-funnel: <span className="font-mono font-bold">{stageData.slice(0, 3).reduce((s, d) => s + d.count, 0)}</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            Mid-funnel: <span className="font-mono font-bold">{stageData.slice(3, 6).reduce((s, d) => s + d.count, 0)}</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            Late-stage: <span className="font-mono font-bold">{stageData.slice(6, 8).reduce((s, d) => s + d.count, 0)}</span>
          </div>
          <div className="text-xs ml-auto" style={{ color: 'var(--success)' }}>
            Closed Won: <span className="font-mono font-bold">{won.length}</span>
          </div>
        </div>
      </div>
      {/* Stage Conversion Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4">Stage Conversion Rates</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            Percentage of targets that advance from each stage to the next
          </p>
          <div className="space-y-3">
            {DEAL_STAGES.slice(0, -2).map((s, i) => {
              const nextStage = DEAL_STAGES[i + 1];
              if (!nextStage || ['closed_won', 'closed_lost'].includes(nextStage.key)) return null;
              const inStage = targets.filter(t => {
                const stIdx = DEAL_STAGES.findIndex(st => st.key === t.stage);
                return stIdx >= i;
              }).length;
              const advanced = targets.filter(t => {
                const stIdx = DEAL_STAGES.findIndex(st => st.key === t.stage);
                return stIdx > i;
              }).length;
              const convRate = inStage > 0 ? Math.round((advanced / inStage) * 100) : 0;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="text-xs w-20 truncate" style={{ color: 'var(--muted-foreground)' }}>{s.label}</span>
                  <ArrowRight size={12} style={{ color: 'var(--muted)' }} />
                  <span className="text-xs w-20 truncate" style={{ color: 'var(--muted-foreground)' }}>{nextStage.label}</span>
                  <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                    <div
                      className="h-full rounded flex items-center px-2"
                      style={{
                        width: `${Math.max(convRate, convRate > 0 ? 8 : 0)}%`,
                        background: convRate >= 50 ? 'var(--success)' : convRate >= 25 ? 'var(--warning)' : 'var(--danger)',
                        transition: 'width 0.3s',
                      }}
                    >
                      {convRate > 0 && <span className="text-xs font-bold text-white">{convRate}%</span>}
                    </div>
                  </div>
                  <span className="text-xs font-mono w-12 text-right" style={{ color: 'var(--muted)' }}>{advanced}/{inStage}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage Transition History */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4">Recent Stage Transitions</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            Latest pipeline movements from the activity log
          </p>
          {(() => {
            const transitions = activities
              .filter(a => a.type === 'stage_changed')
              .slice(0, 12);
            if (transitions.length === 0) {
              return <p className="text-sm" style={{ color: 'var(--muted)' }}>No stage transitions recorded yet.</p>;
            }
            return (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {transitions.map(t => {
                  const fromStage = DEAL_STAGES.find(s => s.label === t.metadata?.from || s.key === t.metadata?.from);
                  const toStage = DEAL_STAGES.find(s => s.label === t.metadata?.to || s.key === t.metadata?.to);
                  return (
                    <div key={t.id} className="flex items-center gap-2 text-xs p-2 rounded" style={{ background: 'var(--background)' }}>
                      <span className="font-medium truncate w-24">{t.target_name}</span>
                      <span className="badge" style={{ background: `${fromStage?.color || 'var(--muted)'}20`, color: fromStage?.color || 'var(--muted)', fontSize: '0.6rem' }}>
                        {t.metadata?.from || '?'}
                      </span>
                      <ArrowRight size={10} style={{ color: 'var(--muted)' }} />
                      <span className="badge" style={{ background: `${toStage?.color || 'var(--muted)'}20`, color: toStage?.color || 'var(--muted)', fontSize: '0.6rem' }}>
                        {t.metadata?.to || '?'}
                      </span>
                      <span className="ml-auto" style={{ color: 'var(--muted)' }}>
                        {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* DD Progress Overview */}
      {ddProjects.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4">Due Diligence Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
              <div className="text-lg font-bold font-mono">{ddProjects.length}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Total Projects</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
              <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>
                {ddProjects.filter(p => p.status === 'in_progress').length}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>In Progress</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
              <div className="text-lg font-bold font-mono" style={{ color: 'var(--success)' }}>
                {ddProjects.filter(p => p.status === 'complete').length}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Complete</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
              <div className="text-lg font-bold font-mono">
                {ddProjects.length > 0 ? Math.round(ddProjects.reduce((s, p) => s + p.overall_progress_pct, 0) / ddProjects.length) : 0}%
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg Progress</div>
            </div>
          </div>
          <div className="space-y-2">
            {ddProjects.sort((a, b) => b.overall_progress_pct - a.overall_progress_pct).map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-xs w-32 truncate font-medium">{p.target_name}</span>
                <span className="badge" style={{
                  background: p.rag_status === 'green' ? 'rgba(16,185,129,0.2)' : p.rag_status === 'amber' ? 'rgba(245,158,11,0.2)' : p.rag_status === 'red' ? 'rgba(239,68,68,0.2)' : 'var(--background)',
                  color: p.rag_status === 'green' ? 'var(--success)' : p.rag_status === 'amber' ? 'var(--warning)' : p.rag_status === 'red' ? 'var(--danger)' : 'var(--muted)',
                  fontSize: '0.6rem',
                }}>
                  {p.phase}
                </span>
                <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                  <div
                    className="h-full rounded flex items-center px-2"
                    style={{
                      width: `${Math.max(p.overall_progress_pct, p.overall_progress_pct > 0 ? 4 : 0)}%`,
                      background: p.rag_status === 'green' ? 'var(--success)' : p.rag_status === 'amber' ? 'var(--warning)' : p.rag_status === 'red' ? 'var(--danger)' : 'var(--accent)',
                      transition: 'width 0.3s',
                    }}
                  >
                    {p.overall_progress_pct > 10 && <span className="text-xs font-bold text-white">{p.overall_progress_pct}%</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deal Aging Analysis */}
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
          Deal Aging Analysis
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
          Days since each active target entered its current stage. Red = stale (&gt;30d).
        </p>
        <div className="space-y-2">
          {active
            .map(t => ({
              ...t,
              daysInStage: Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000),
              daysInPipeline: Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000),
            }))
            .sort((a, b) => b.daysInStage - a.daysInStage)
            .slice(0, 15)
            .map(t => {
              const maxDaysAging = 90;
              const barPct = Math.min((t.daysInStage / maxDaysAging) * 100, 100);
              const stg = DEAL_STAGES.find(s => s.key === t.stage);
              return (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="text-xs w-28 truncate font-medium">{t.name}</span>
                  <span className="badge text-[9px]" style={{ background: `${stg?.color || 'var(--muted)'}20`, color: stg?.color }}>{stg?.label}</span>
                  <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                    <div
                      className="h-full rounded flex items-center px-2"
                      style={{
                        width: `${Math.max(barPct, 4)}%`,
                        background: t.daysInStage > 30 ? 'var(--danger)' : t.daysInStage > 14 ? 'var(--warning)' : 'var(--accent)',
                      }}
                    >
                      <span className="text-[10px] font-bold text-white">{t.daysInStage}d</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono w-14 text-right" style={{ color: 'var(--muted)' }}>{t.daysInPipeline}d total</span>
                </div>
              );
            })}
          {active.length === 0 && <p className="text-sm" style={{ color: 'var(--muted)' }}>No active targets</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geography Breakdown */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <MapPin size={16} style={{ color: 'var(--accent)' }} />
            Geography Breakdown
          </h2>
          <div className="space-y-2">
            {(() => {
              const geoMap = new Map<string, { count: number; value: number }>();
              for (const t of targets) {
                const geo = t.geography || 'Unknown';
                const existing = geoMap.get(geo) || { count: 0, value: 0 };
                geoMap.set(geo, { count: existing.count + 1, value: existing.value + (t.asking_price || 0) });
              }
              const geoArr = Array.from(geoMap.entries())
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.count - a.count);
              const maxGeo = Math.max(...geoArr.map(g => g.count), 1);
              return geoArr.map(g => (
                <div key={g.name} className="flex items-center gap-3">
                  <span className="text-xs w-28 truncate" style={{ color: 'var(--muted-foreground)' }}>{g.name}</span>
                  <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                    <div
                      className="h-full rounded flex items-center px-2"
                      style={{ width: `${Math.max((g.count / maxGeo) * 100, 8)}%`, background: 'var(--accent)' }}
                    >
                      <span className="text-xs font-bold text-white">{g.count}</span>
                    </div>
                  </div>
                  {g.value > 0 && <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{fmt(g.value, '$')}</span>}
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Valuation Multiples Distribution */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={16} style={{ color: 'var(--success)' }} />
            Valuation Multiples
          </h2>
          <div className="space-y-3">
            {(() => {
              const withMultiples = targets.filter(t => t.asking_price && t.revenue && t.revenue > 0);
              if (withMultiples.length === 0) return <p className="text-sm" style={{ color: 'var(--muted)' }}>No targets with both price and revenue data.</p>;
              const evRevMultiples = withMultiples.map(t => ({
                name: t.name,
                evRev: t.asking_price! / t.revenue!,
                evArr: t.arr && t.arr > 0 ? t.asking_price! / t.arr : null,
                evEbita: t.ebita && t.ebita > 0 ? t.asking_price! / t.ebita : null,
              })).sort((a, b) => a.evRev - b.evRev);
              const maxMultiple = Math.max(...evRevMultiples.map(m => m.evRev), 1);
              const avgMultiple = evRevMultiples.reduce((s, m) => s + m.evRev, 0) / evRevMultiples.length;
              return (
                <>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      Avg EV/Rev: <span className="font-mono font-bold" style={{ color: 'var(--foreground)' }}>{avgMultiple.toFixed(1)}x</span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      Range: <span className="font-mono">{evRevMultiples[0].evRev.toFixed(1)}x – {evRevMultiples[evRevMultiples.length - 1].evRev.toFixed(1)}x</span>
                    </div>
                  </div>
                  {evRevMultiples.map(m => (
                    <div key={m.name} className="flex items-center gap-3">
                      <span className="text-xs w-28 truncate" style={{ color: 'var(--muted-foreground)' }}>{m.name}</span>
                      <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                        <div
                          className="h-full rounded flex items-center px-2"
                          style={{
                            width: `${Math.max((m.evRev / maxMultiple) * 100, 8)}%`,
                            background: m.evRev <= 3 ? 'var(--success)' : m.evRev <= 5 ? 'var(--accent)' : 'var(--warning)',
                          }}
                        >
                          <span className="text-[10px] font-bold text-white">{m.evRev.toFixed(1)}x</span>
                        </div>
                      </div>
                      {m.evArr && <span className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>ARR: {m.evArr.toFixed(1)}x</span>}
                    </div>
                  ))}
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    Green ≤3x (attractive), Blue 3-5x (fair), Yellow &gt;5x (premium)
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Pipeline Vintage Analysis */}
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar size={16} style={{ color: 'var(--accent)' }} />
          Pipeline Vintage (Targets by Month Added)
        </h2>
        <div className="flex items-end gap-2 h-36">
          {(() => {
            const vintageMap = new Map<string, { label: string; count: number; active: number }>();
            for (let i = 11; i >= 0; i--) {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
              vintageMap.set(key, { label, count: 0, active: 0 });
            }
            for (const t of targets) {
              const key = t.created_at.substring(0, 7);
              if (vintageMap.has(key)) {
                const v = vintageMap.get(key)!;
                v.count++;
                if (!['closed_won', 'closed_lost'].includes(t.stage)) v.active++;
              }
            }
            const vintageArr = Array.from(vintageMap.values());
            const maxVintage = Math.max(...vintageArr.map(v => v.count), 1);
            return vintageArr.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono" style={{ color: 'var(--muted-foreground)' }}>{v.count || ''}</span>
                <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                  {v.count > 0 && (
                    <>
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${(v.active / maxVintage) * 100}%`,
                          background: 'var(--accent)',
                          minHeight: v.active > 0 ? '4px' : '0',
                        }}
                      />
                      <div
                        className="w-full"
                        style={{
                          height: `${((v.count - v.active) / maxVintage) * 100}%`,
                          background: 'var(--muted)',
                          opacity: 0.3,
                          minHeight: v.count > v.active ? '2px' : '0',
                        }}
                      />
                    </>
                  )}
                </div>
                <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{v.label}</span>
              </div>
            ));
          })()}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ background: 'var(--accent)' }} />
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Active</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ background: 'var(--muted)', opacity: 0.3 }} />
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Closed</span>
          </div>
        </div>
      </div>

      {/* Activity Heatmap - Weekly */}
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4">Activity Heatmap (12 Weeks)</h2>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-fit">
            {(() => {
              const weeks: { label: string; count: number }[] = [];
              for (let i = 11; i >= 0; i--) {
                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - (i * 7));
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 7);
                const count = activities.filter(a => {
                  const d = new Date(a.created_at);
                  return d >= weekStart && d < weekEnd;
                }).length;
                weeks.push({
                  label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  count,
                });
              }
              const maxWeekActivity = Math.max(...weeks.map(w => w.count), 1);
              return weeks.map((w, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1" style={{ minWidth: 40 }}>
                  <div
                    className="w-full rounded"
                    style={{
                      height: 32,
                      background: w.count === 0 ? 'var(--border)' : `rgba(59,130,246,${Math.max(0.15, (w.count / maxWeekActivity) * 0.9)})`,
                      transition: 'background 0.3s',
                    }}
                    title={`${w.label}: ${w.count} activities`}
                  >
                    <div className="flex items-center justify-center h-full text-xs font-mono" style={{ color: w.count > 0 ? 'white' : 'var(--muted)' }}>
                      {w.count || ''}
                    </div>
                  </div>
                  <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{w.label}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
      {/* Stage × Vertical Heatmap */}
      {targets.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <BarChart3 size={16} style={{ color: 'var(--accent)' }} /> Stage × Vertical Heatmap
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Number of targets at each stage by vertical</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left p-1.5 sticky left-0 z-10" style={{ background: 'var(--card)', color: 'var(--muted-foreground)', minWidth: 100 }}>Vertical</th>
                  {DEAL_STAGES.filter(s => targets.some(t => t.stage === s.key)).map(s => (
                    <th key={s.key} className="text-center p-1.5" style={{ color: s.color, minWidth: 50 }}>
                      {s.label.split(' ')[0]}
                    </th>
                  ))}
                  <th className="text-center p-1.5 font-bold" style={{ color: 'var(--foreground)', minWidth: 40 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {verticalData.map(v => {
                  const activeStages = DEAL_STAGES.filter(s => targets.some(t => t.stage === s.key));
                  return (
                    <tr key={v.name} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="p-1.5 font-medium sticky left-0 z-10" style={{ background: 'var(--card)' }}>{v.name}</td>
                      {activeStages.map(s => {
                        const count = targets.filter(t => t.vertical === v.name && t.stage === s.key).length;
                        const maxCell = Math.max(...verticalData.flatMap(vd =>
                          activeStages.map(st => targets.filter(t => t.vertical === vd.name && t.stage === st.key).length)
                        ), 1);
                        return (
                          <td key={s.key} className="text-center p-1.5">
                            {count > 0 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold"
                                style={{
                                  background: `${s.color}${Math.round(Math.max(0.15, (count / maxCell) * 0.7) * 255).toString(16).padStart(2, '0')}`,
                                  color: count / maxCell > 0.4 ? 'white' : s.color,
                                }}
                              >
                                {count}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--border)' }}>·</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center p-1.5 font-bold font-mono">{v.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conversion Rate Analysis */}
      {targets.length >= 3 && (() => {
        const stageOrder = DEAL_STAGES.map(s => s.key);
        const conversionData = DEAL_STAGES.slice(0, -2).map((s, i) => {
          const nextStage = DEAL_STAGES[i + 1];
          const inThisStage = targets.filter(t => stageOrder.indexOf(t.stage) >= i).length;
          const inNextStage = targets.filter(t => stageOrder.indexOf(t.stage) >= i + 1).length;
          const convRate = inThisStage > 0 ? Math.round((inNextStage / inThisStage) * 100) : 0;

          // Avg days in this stage for targets that progressed past it
          const progressed = targets.filter(t => {
            const history = typeof window !== 'undefined'
              ? JSON.parse(localStorage.getItem(`dealforge_stage_history`) || '[]')
              : [];
            return stageOrder.indexOf(t.stage) > i;
          });

          return { from: s, to: nextStage, convRate, inStage: inThisStage, progressed: inNextStage };
        }).filter(d => d.inStage > 0);

        if (conversionData.length === 0) return null;

        return (
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-1 flex items-center gap-2">
              <ArrowRight size={16} style={{ color: 'var(--accent)' }} /> Stage Conversion Rates
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Percentage of targets progressing to each subsequent stage</p>
            <div className="space-y-3">
              {conversionData.map(d => (
                <div key={d.from.key} className="flex items-center gap-3">
                  <span className="text-xs w-24 truncate" style={{ color: d.from.color }}>{d.from.label}</span>
                  <ArrowRight size={12} style={{ color: 'var(--muted)' }} />
                  <span className="text-xs w-24 truncate" style={{ color: d.to.color }}>{d.to.label}</span>
                  <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
                    <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end px-2"
                      style={{
                        width: `${Math.max(8, d.convRate)}%`,
                        background: d.convRate >= 60 ? 'var(--success)' : d.convRate >= 30 ? 'var(--warning)' : 'var(--danger)',
                      }}
                    >
                      <span className="text-[10px] font-bold text-white">{d.convRate}%</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono w-16 text-right" style={{ color: 'var(--muted)' }}>
                    {d.progressed}/{d.inStage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Score Distribution */}
      {targets.filter(t => t.weighted_score).length >= 3 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: 'var(--accent)' }} /> Score Distribution
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Distribution of weighted scores across all scored targets</p>
          <div className="flex items-end gap-1 h-32">
            {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(bucket => {
              const count = targets.filter(t => {
                const s = t.weighted_score || 0;
                return s >= bucket - 0.25 && s < bucket + 0.25;
              }).length;
              const maxCount = Math.max(...[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(b =>
                targets.filter(t => (t.weighted_score || 0) >= b - 0.25 && (t.weighted_score || 0) < b + 0.25).length
              ), 1);
              const color = bucket >= 4 ? 'var(--success)' : bucket >= 3 ? 'var(--warning)' : 'var(--danger)';
              return (
                <div key={bucket} className="flex-1 flex flex-col items-center">
                  <div className="w-full rounded-t transition-all duration-300" style={{
                    height: `${count > 0 ? Math.max(8, (count / maxCount) * 100) : 0}%`,
                    background: count > 0 ? color : 'transparent',
                  }} />
                  <span className="text-[9px] mt-1 font-mono" style={{ color: 'var(--muted)' }}>{bucket}</span>
                  {count > 0 && <span className="text-[9px] font-bold" style={{ color }}>{count}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>
            <span>← Lower scores</span>
            <span>Higher scores →</span>
          </div>
        </div>
      )}
      {/* Revenue vs Score Scatter */}
      {targets.filter(t => t.revenue && t.weighted_score).length >= 3 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <Activity size={16} style={{ color: 'var(--accent)' }} /> Revenue vs. Score Map
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            Each dot represents a target. Size indicates customer count. Position shows deal quality vs. revenue scale.
          </p>
          <div className="relative" style={{ height: '250px' }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[9px]" style={{ color: 'var(--muted)', width: '30px' }}>
              <span>5.0</span>
              <span>4.0</span>
              <span>3.0</span>
              <span>2.0</span>
              <span>1.0</span>
            </div>
            <div className="absolute top-0 bottom-0 right-0" style={{ left: '35px' }}>
              {/* Grid lines */}
              {[1, 2, 3, 4, 5].map(v => (
                <div key={v} className="absolute left-0 right-0 border-b" style={{ bottom: `${((v - 1) / 4) * 100}%`, borderColor: 'var(--border)', opacity: 0.3 }} />
              ))}
              {/* Dots */}
              {(() => {
                const withData = targets.filter(t => t.revenue && t.weighted_score);
                const maxRev = Math.max(...withData.map(t => t.revenue || 0));
                const maxCustomers = Math.max(...withData.map(t => t.customer_count || 50));
                return withData.map(t => {
                  const x = ((t.revenue || 0) / maxRev) * 90 + 5; // 5-95% range
                  const y = ((t.weighted_score || 1) - 1) / 4 * 100; // 0-100% from bottom
                  const size = Math.max(8, Math.min(24, ((t.customer_count || 50) / maxCustomers) * 24));
                  const stageInfo = DEAL_STAGES.find(s => s.key === t.stage);
                  return (
                    <Link
                      key={t.id}
                      href={`/targets/${t.id}`}
                      className="absolute rounded-full transition-all hover:scale-125"
                      style={{
                        left: `${x}%`,
                        bottom: `${y}%`,
                        width: `${size}px`,
                        height: `${size}px`,
                        background: stageInfo?.color || 'var(--accent)',
                        opacity: 0.7,
                        transform: 'translate(-50%, 50%)',
                      }}
                      title={`${t.name}: ${t.weighted_score?.toFixed(1)} score, $${((t.revenue || 0) / 1_000_000).toFixed(1)}M revenue`}
                    />
                  );
                });
              })()}
            </div>
            {/* X-axis label */}
            <div className="absolute bottom-0 left-9 right-0 text-center text-[9px]" style={{ color: 'var(--muted)' }}>
              Revenue →
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
            {DEAL_STAGES.filter(s => targets.some(t => t.stage === s.key && t.revenue && t.weighted_score)).map(s => (
              <div key={s.key} className="flex items-center gap-1 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span style={{ color: 'var(--muted)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deal Velocity — Average days per stage */}
      {(() => {
        const stageChanges = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('dealforge_stage_history') || '[]')
          : [];
        if (stageChanges.length < 3) return null;

        const daysPerStage: Record<string, number[]> = {};
        // Group consecutive stage changes by target to calculate time in each stage
        const byTarget = new Map<string, typeof stageChanges>();
        for (const sc of stageChanges) {
          const arr = byTarget.get(sc.target_id) || [];
          arr.push(sc);
          byTarget.set(sc.target_id, arr);
        }
        for (const [, changes] of byTarget) {
          changes.sort((a: { changed_at: string }, b: { changed_at: string }) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
          for (let i = 0; i < changes.length; i++) {
            const fromStage = changes[i].from_stage;
            const startDate = i > 0 ? new Date(changes[i - 1].changed_at) : new Date(changes[i].changed_at);
            const endDate = new Date(changes[i].changed_at);
            const days = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000));
            if (!daysPerStage[fromStage]) daysPerStage[fromStage] = [];
            daysPerStage[fromStage].push(days);
          }
        }

        const avgDays = DEAL_STAGES
          .filter(s => !['closed_won', 'closed_lost'].includes(s.key))
          .map(s => ({
            ...s,
            avg: daysPerStage[s.key] ? Math.round(daysPerStage[s.key].reduce((a, b) => a + b, 0) / daysPerStage[s.key].length) : null,
            count: daysPerStage[s.key]?.length || 0,
          }))
          .filter(s => s.avg !== null);

        if (avgDays.length === 0) return null;
        const maxDays = Math.max(...avgDays.map(s => s.avg || 0), 1);

        return (
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-1 flex items-center gap-2">
              <Clock size={16} style={{ color: 'var(--accent)' }} /> Deal Velocity
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Average days in each pipeline stage</p>
            <div className="space-y-3">
              {avgDays.map(s => (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-right" style={{ color: 'var(--muted-foreground)' }}>{s.label}</span>
                  <div className="flex-1 h-7 rounded-lg overflow-hidden relative" style={{ background: 'var(--background)' }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg flex items-center px-2 transition-all"
                      style={{ width: `${Math.max(((s.avg || 0) / maxDays) * 100, 10)}%`, background: `${s.color}55` }}
                    >
                      <span className="text-xs font-bold whitespace-nowrap" style={{ color: s.color }}>
                        {s.avg}d avg
                      </span>
                    </div>
                  </div>
                  <span className="text-xs w-16 text-right" style={{ color: 'var(--muted)' }}>
                    {s.count} deal{s.count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {/* Cohort / Vintage Analysis */}
      {targets.length > 3 && (() => {
        // Group targets by month they entered the pipeline
        const cohorts: Record<string, { label: string; targets: Target[]; won: number; lost: number; active: number; avgScore: number }> = {};
        targets.forEach(t => {
          const d = new Date(t.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          if (!cohorts[key]) cohorts[key] = { label, targets: [], won: 0, lost: 0, active: 0, avgScore: 0 };
          cohorts[key].targets.push(t);
          if (t.stage === 'closed_won') cohorts[key].won++;
          else if (t.stage === 'closed_lost') cohorts[key].lost++;
          else cohorts[key].active++;
        });
        Object.values(cohorts).forEach(c => {
          const scored = c.targets.filter(t => t.weighted_score);
          c.avgScore = scored.length > 0 ? scored.reduce((s, t) => s + (t.weighted_score || 0), 0) / scored.length : 0;
        });
        const sorted = Object.entries(cohorts).sort(([a], [b]) => a.localeCompare(b));
        if (sorted.length < 2) return null;

        return (
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-1 flex items-center gap-2">
              <Calendar size={16} style={{ color: 'var(--accent)' }} /> Cohort Analysis
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Pipeline vintage — outcomes by month of entry</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Cohort</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Total</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--success)' }}>Won</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--danger)' }}>Lost</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--accent)' }}>Active</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Avg Score</th>
                    <th className="p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Outcome Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(([key, c]) => {
                    const total = c.targets.length;
                    const wonPct = (c.won / total) * 100;
                    const lostPct = (c.lost / total) * 100;
                    const activePct = (c.active / total) * 100;
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="p-2 font-medium">{c.label}</td>
                        <td className="p-2 text-center font-mono">{total}</td>
                        <td className="p-2 text-center font-mono" style={{ color: c.won > 0 ? 'var(--success)' : 'var(--muted)' }}>{c.won}</td>
                        <td className="p-2 text-center font-mono" style={{ color: c.lost > 0 ? 'var(--danger)' : 'var(--muted)' }}>{c.lost}</td>
                        <td className="p-2 text-center font-mono" style={{ color: c.active > 0 ? 'var(--accent)' : 'var(--muted)' }}>{c.active}</td>
                        <td className="p-2 text-center font-mono" style={{ color: c.avgScore >= 3.5 ? 'var(--success)' : c.avgScore >= 2.5 ? 'var(--warning)' : 'var(--muted)' }}>
                          {c.avgScore > 0 ? c.avgScore.toFixed(1) : '—'}
                        </td>
                        <td className="p-2">
                          <div className="flex h-3 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
                            {wonPct > 0 && <div style={{ width: `${wonPct}%`, background: 'var(--success)' }} />}
                            {activePct > 0 && <div style={{ width: `${activePct}%`, background: 'var(--accent)' }} />}
                            {lostPct > 0 && <div style={{ width: `${lostPct}%`, background: 'var(--danger)' }} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: 'var(--muted)' }}>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: 'var(--success)' }} /> Won</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: 'var(--accent)' }} /> Active</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: 'var(--danger)' }} /> Lost</span>
            </div>
          </div>
        );
      })()}

      {/* Vertical Performance Matrix */}
      {targets.length > 3 && (() => {
        const verticalData = VERTICALS
          .map(v => {
            const vTargets = targets.filter(t => t.vertical === v);
            if (vTargets.length === 0) return null;
            const won = vTargets.filter(t => t.stage === 'closed_won').length;
            const lost = vTargets.filter(t => t.stage === 'closed_lost').length;
            const active = vTargets.filter(t => !['closed_won', 'closed_lost'].includes(t.stage)).length;
            const avgRevenue = vTargets.filter(t => t.revenue).reduce((s, t) => s + (t.revenue || 0), 0) / (vTargets.filter(t => t.revenue).length || 1);
            const avgScore = vTargets.filter(t => t.weighted_score).reduce((s, t) => s + (t.weighted_score || 0), 0) / (vTargets.filter(t => t.weighted_score).length || 1);
            const pipelineValue = vTargets.reduce((s, t) => s + (t.asking_price || 0), 0);
            return { vertical: v, total: vTargets.length, won, lost, active, avgRevenue, avgScore, pipelineValue };
          })
          .filter(Boolean)
          .sort((a, b) => b!.total - a!.total) as { vertical: string; total: number; won: number; lost: number; active: number; avgRevenue: number; avgScore: number; pipelineValue: number }[];

        if (verticalData.length < 2) return null;

        return (
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-1 flex items-center gap-2">
              <MapPin size={16} style={{ color: 'var(--accent)' }} /> Vertical Performance Matrix
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Deal performance metrics broken down by vertical market</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Vertical</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Deals</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--success)' }}>Won</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--accent)' }}>Active</th>
                    <th className="text-right p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Avg Revenue</th>
                    <th className="text-right p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Pipeline $</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {verticalData.map(v => (
                    <tr key={v.vertical} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2 font-medium">{v.vertical}</td>
                      <td className="p-2 text-center font-mono">{v.total}</td>
                      <td className="p-2 text-center font-mono" style={{ color: v.won > 0 ? 'var(--success)' : 'var(--muted)' }}>{v.won}</td>
                      <td className="p-2 text-center font-mono" style={{ color: v.active > 0 ? 'var(--accent)' : 'var(--muted)' }}>{v.active}</td>
                      <td className="p-2 text-right font-mono">{v.avgRevenue > 0 ? fmt(v.avgRevenue, '$') : '—'}</td>
                      <td className="p-2 text-right font-mono">{v.pipelineValue > 0 ? fmt(v.pipelineValue, '$') : '—'}</td>
                      <td className="p-2 text-center">
                        {v.avgScore > 0 ? (
                          <span className="font-mono font-bold" style={{ color: v.avgScore >= 3.5 ? 'var(--success)' : v.avgScore >= 2.5 ? 'var(--warning)' : 'var(--danger)' }}>
                            {v.avgScore.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Deal Scorecard Heatmap */}
      {(() => {
        const scored = targets.filter(t => t.score).sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0));
        if (scored.length < 2) return null;

        const cellColor = (val: number) => {
          if (val >= 5) return 'rgba(16,185,129,0.8)';
          if (val >= 4) return 'rgba(16,185,129,0.5)';
          if (val >= 3) return 'rgba(245,158,11,0.5)';
          if (val >= 2) return 'rgba(249,115,22,0.5)';
          return 'rgba(239,68,68,0.5)';
        };

        return (
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-1 flex items-center gap-2">
              <Grid size={16} style={{ color: 'var(--accent)' }} /> Deal Scorecard Heatmap
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>VMS acquisition criteria scores across all evaluated targets</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 text-xs sticky left-0" style={{ color: 'var(--muted-foreground)', background: 'var(--card)' }}>Target</th>
                    {SCORE_CRITERIA.map(c => (
                      <th key={c.key} className="text-center p-2 text-xs" style={{ color: 'var(--muted-foreground)' }} title={c.description}>
                        {c.label.split(' ').slice(0, 2).join(' ')}
                      </th>
                    ))}
                    <th className="text-center p-2 text-xs font-bold" style={{ color: 'var(--accent)' }}>Weighted</th>
                  </tr>
                </thead>
                <tbody>
                  {scored.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2 font-medium truncate max-w-[150px] sticky left-0" style={{ background: 'var(--card)' }}>
                        <Link href={`/targets/${t.id}`} className="hover:underline" style={{ color: 'var(--accent)' }}>{t.name}</Link>
                      </td>
                      {SCORE_CRITERIA.map(c => {
                        const val = t.score![c.key];
                        return (
                          <td key={c.key} className="p-2 text-center">
                            <span
                              className="inline-block w-8 h-8 rounded flex items-center justify-center font-mono font-bold text-white text-sm"
                              style={{ background: cellColor(val) }}
                            >
                              {val}
                            </span>
                          </td>
                        );
                      })}
                      <td className="p-2 text-center">
                        <span className="font-mono font-bold text-base" style={{ color: (t.weighted_score || 0) >= 3.5 ? 'var(--success)' : (t.weighted_score || 0) >= 2.5 ? 'var(--warning)' : 'var(--danger)' }}>
                          {(t.weighted_score || 0).toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Win/Loss Analysis */}
      {(() => {
        const closed = targets.filter(t => ['closed_won', 'closed_lost'].includes(t.stage));
        if (closed.length < 1) return null;

        const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0;
        const avgWonValue = won.length > 0 ? won.reduce((s, t) => s + (t.asking_price || 0), 0) / won.length : 0;
        const avgLostValue = lost.length > 0 ? lost.reduce((s, t) => s + (t.asking_price || 0), 0) / lost.length : 0;
        const avgDaysToClose = won.length > 0 ? Math.round(won.reduce((s, t) => {
          return s + (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / 86400000;
        }, 0) / won.length) : 0;

        // By source
        const sources = ['proprietary', 'broker', 'inbound', 'referral', 'other'] as const;
        const bySource = sources.map(src => {
          const srcClosed = closed.filter(t => t.source === src);
          const srcWon = won.filter(t => t.source === src);
          return { source: src, total: srcClosed.length, won: srcWon.length, rate: srcClosed.length > 0 ? Math.round((srcWon.length / srcClosed.length) * 100) : 0 };
        }).filter(s => s.total > 0);

        // By vertical
        const verticals = Array.from(new Set(closed.map(t => t.vertical)));
        const byVertical = verticals.map(v => {
          const vClosed = closed.filter(t => t.vertical === v);
          const vWon = won.filter(t => t.vertical === v);
          return { vertical: v, total: vClosed.length, won: vWon.length, rate: vClosed.length > 0 ? Math.round((vWon.length / vClosed.length) * 100) : 0 };
        }).sort((a, b) => b.rate - a.rate);

        // Characteristics comparison
        const avgScore = (arr: typeof targets) => {
          const scored = arr.filter(t => t.weighted_score);
          return scored.length > 0 ? (scored.reduce((s, t) => s + (t.weighted_score || 0), 0) / scored.length).toFixed(1) : '—';
        };
        const avgRev = (arr: typeof targets) => {
          const withRev = arr.filter(t => t.revenue);
          return withRev.length > 0 ? fmt(withRev.reduce((s, t) => s + (t.revenue || 0), 0) / withRev.length) : '—';
        };
        const avgRecurring = (arr: typeof targets) => {
          const withRR = arr.filter(t => t.recurring_revenue_pct);
          return withRR.length > 0 ? `${Math.round(withRR.reduce((s, t) => s + (t.recurring_revenue_pct || 0), 0) / withRR.length)}%` : '—';
        };

        return (
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-1 flex items-center gap-2">
              <Activity size={16} style={{ color: 'var(--accent)' }} /> Win/Loss Analysis
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Post-mortem analysis of closed deals</p>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                <div className="text-2xl font-bold font-mono" style={{ color: 'var(--success)' }}>{won.length}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>Deals Won</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                <div className="text-2xl font-bold font-mono" style={{ color: 'var(--danger)' }}>{lost.length}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>Deals Lost</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                <div className="text-2xl font-bold font-mono" style={{ color: winRate >= 25 ? 'var(--success)' : 'var(--warning)' }}>{winRate}%</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>Win Rate</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                <div className="text-2xl font-bold font-mono" style={{ color: 'var(--accent)' }}>{avgDaysToClose}d</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg Days to Close</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* By Source */}
              {bySource.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Win Rate by Source</h3>
                  <div className="space-y-2">
                    {bySource.map(s => (
                      <div key={s.source} className="flex items-center gap-3">
                        <span className="text-xs w-20 capitalize">{s.source}</span>
                        <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                          <div className="h-full rounded flex items-center px-2 text-[10px] font-bold text-white"
                            style={{ width: `${Math.max(s.rate, 8)}%`, background: s.rate >= 30 ? 'var(--success)' : s.rate >= 15 ? 'var(--warning)' : 'var(--danger)' }}
                          >
                            {s.rate}%
                          </div>
                        </div>
                        <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{s.won}/{s.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By Vertical */}
              {byVertical.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Win Rate by Vertical</h3>
                  <div className="space-y-2">
                    {byVertical.map(v => (
                      <div key={v.vertical} className="flex items-center gap-3">
                        <span className="text-xs w-24 truncate">{v.vertical}</span>
                        <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: 'var(--background)' }}>
                          <div className="h-full rounded flex items-center px-2 text-[10px] font-bold text-white"
                            style={{ width: `${Math.max(v.rate, 8)}%`, background: v.rate >= 30 ? 'var(--success)' : v.rate >= 15 ? 'var(--warning)' : 'var(--danger)' }}
                          >
                            {v.rate}%
                          </div>
                        </div>
                        <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{v.won}/{v.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Characteristics Comparison */}
            <div className="mt-5">
              <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Won vs Lost: Key Characteristics</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Metric</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--success)' }}>Won Avg</th>
                    <th className="text-center p-2 text-xs" style={{ color: 'var(--danger)' }}>Lost Avg</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="p-2">Deal Score</td>
                    <td className="p-2 text-center font-mono font-bold" style={{ color: 'var(--success)' }}>{avgScore(won)}</td>
                    <td className="p-2 text-center font-mono" style={{ color: 'var(--danger)' }}>{avgScore(lost)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="p-2">Revenue</td>
                    <td className="p-2 text-center font-mono font-bold" style={{ color: 'var(--success)' }}>{avgRev(won)}</td>
                    <td className="p-2 text-center font-mono" style={{ color: 'var(--danger)' }}>{avgRev(lost)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="p-2">Recurring Revenue %</td>
                    <td className="p-2 text-center font-mono font-bold" style={{ color: 'var(--success)' }}>{avgRecurring(won)}</td>
                    <td className="p-2 text-center font-mono" style={{ color: 'var(--danger)' }}>{avgRecurring(lost)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="p-2">Avg Deal Value</td>
                    <td className="p-2 text-center font-mono font-bold" style={{ color: 'var(--success)' }}>{avgWonValue > 0 ? fmt(avgWonValue) : '—'}</td>
                    <td className="p-2 text-center font-mono" style={{ color: 'var(--danger)' }}>{avgLostValue > 0 ? fmt(avgLostValue) : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function KPI({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2" style={{ color: color || 'var(--accent)' }}>
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      </div>
      <div className="text-xl font-bold font-mono" style={{ color: color || 'var(--foreground)' }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</div>
    </div>
  );
}
