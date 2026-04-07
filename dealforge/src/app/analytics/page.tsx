'use client';

import { useEffect, useState } from 'react';
import { getTargets, getTouchpoints, getDDProjects } from '@/lib/db';
import { DEAL_STAGES, VERTICALS } from '@/lib/types';
import type { Target, Touchpoint, DDProject, DealStage } from '@/lib/types';
import { getActivities } from '@/lib/db';
import type { ActivityEntry } from '@/lib/types';
import { TrendingUp, Clock, Users, DollarSign, Activity, BarChart3, ArrowRight } from 'lucide-react';

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

      {/* Conversion funnel */}
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4">Pipeline Funnel</h2>
        <div className="space-y-1">
          {stageData.filter(s => s.count > 0).map((s, i, arr) => {
            const widthPct = Math.max((s.count / Math.max(arr[0]?.count || 1, 1)) * 100, 10);
            return (
              <div key={s.key} className="flex items-center justify-center">
                <div
                  className="py-2 text-center rounded text-xs font-medium"
                  style={{
                    width: `${widthPct}%`,
                    background: s.color,
                    color: 'white',
                    transition: 'width 0.3s',
                    minWidth: '80px',
                  }}
                >
                  {s.label}: {s.count}
                </div>
              </div>
            );
          })}
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
