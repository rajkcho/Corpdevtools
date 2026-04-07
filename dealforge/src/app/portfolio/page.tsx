'use client';

import { useEffect, useState } from 'react';
import { getTargets, getDDProjects, getTouchpoints, getContacts } from '@/lib/db';
import type { Target, DDProject, Touchpoint, Contact } from '@/lib/types';
import { DEAL_STAGES } from '@/lib/types';
import Link from 'next/link';
import {
  Building2, DollarSign, TrendingUp, Calendar, Users, CheckCircle2,
  BarChart3, ArrowUpDown, Clock, Star,
} from 'lucide-react';

function fmt(n: number, prefix = '$'): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n.toFixed(0)}`;
}

export default function PortfolioPage() {
  const [allTargets, setAllTargets] = useState<Target[]>([]);
  const [ddProjects, setDDProjects] = useState<DDProject[]>([]);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    setAllTargets(getTargets());
    setDDProjects(getDDProjects());
    setTouchpoints(getTouchpoints());
    setContacts(getContacts());
  }, []);

  const closedWon = allTargets.filter(t => t.stage === 'closed_won');
  const closedLost = allTargets.filter(t => t.stage === 'closed_lost');
  const active = allTargets.filter(t => !['closed_won', 'closed_lost'].includes(t.stage));

  // Portfolio metrics
  const totalDeployed = closedWon.reduce((s, t) => s + (t.asking_price || 0), 0);
  const totalRevenue = closedWon.reduce((s, t) => s + (t.revenue || 0), 0);
  const totalArr = closedWon.reduce((s, t) => s + (t.arr || 0), 0);
  const totalCustomers = closedWon.reduce((s, t) => s + (t.customer_count || 0), 0);
  const totalEmployees = closedWon.reduce((s, t) => s + (t.employee_count || 0), 0);
  const avgScore = closedWon.filter(t => t.weighted_score).length > 0
    ? closedWon.reduce((s, t) => s + (t.weighted_score || 0), 0) / closedWon.filter(t => t.weighted_score).length
    : 0;
  const weightedRecurring = totalRevenue > 0
    ? closedWon.reduce((s, t) => s + (t.revenue || 0) * (t.recurring_revenue_pct || 0) / 100, 0) / totalRevenue * 100
    : 0;

  // Win rate
  const totalClosed = closedWon.length + closedLost.length;
  const winRate = totalClosed > 0 ? Math.round((closedWon.length / totalClosed) * 100) : 0;

  // Blended multiples
  const withMultiples = closedWon.filter(t => t.asking_price && t.revenue);
  const avgEvRevenue = withMultiples.length > 0
    ? withMultiples.reduce((s, t) => s + t.asking_price! / t.revenue!, 0) / withMultiples.length
    : 0;
  const withArrMultiples = closedWon.filter(t => t.asking_price && t.arr);
  const avgEvArr = withArrMultiples.length > 0
    ? withArrMultiples.reduce((s, t) => s + t.asking_price! / t.arr!, 0) / withArrMultiples.length
    : 0;

  // Vertical concentration
  const verticalBreakdown = Array.from(new Set(closedWon.map(t => t.vertical)))
    .map(v => ({
      vertical: v,
      count: closedWon.filter(t => t.vertical === v).length,
      revenue: closedWon.filter(t => t.vertical === v).reduce((s, t) => s + (t.revenue || 0), 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Geography breakdown
  const geoBreakdown = Array.from(new Set(closedWon.map(t => t.geography).filter(Boolean)))
    .map(g => ({
      geo: g!,
      count: closedWon.filter(t => t.geography === g).length,
      revenue: closedWon.filter(t => t.geography === g).reduce((s, t) => s + (t.revenue || 0), 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Source effectiveness
  const sourceBreakdown = ['proprietary', 'broker', 'inbound', 'referral', 'other'].map(s => {
    const wonFromSource = closedWon.filter(t => t.source === s).length;
    const lostFromSource = closedLost.filter(t => t.source === s).length;
    const activeFromSource = active.filter(t => t.source === s).length;
    const total = wonFromSource + lostFromSource + activeFromSource;
    return {
      source: s,
      won: wonFromSource,
      lost: lostFromSource,
      active: activeFromSource,
      total,
      winRate: wonFromSource + lostFromSource > 0 ? Math.round((wonFromSource / (wonFromSource + lostFromSource)) * 100) : null,
    };
  }).filter(s => s.total > 0);

  // Integration progress for won deals
  const integrationData = closedWon.map(t => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(`dealforge_integration_${t.id}`) : null;
    if (!raw) return { target: t, progress: null, total: 0, completed: 0 };
    const items = JSON.parse(raw) as { completed: boolean }[];
    const completed = items.filter(i => i.completed).length;
    return { target: t, progress: Math.round((completed / items.length) * 100), total: items.length, completed };
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 size={24} style={{ color: 'var(--accent)' }} /> Portfolio
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Completed acquisitions and portfolio performance metrics
        </p>
      </div>

      {closedWon.length === 0 ? (
        <div className="glass-card p-12 text-center" style={{ color: 'var(--muted)' }}>
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-1">No completed acquisitions yet</p>
          <p className="text-sm mb-4">Deals marked as &quot;Closed Won&quot; will appear here with portfolio analytics.</p>
          <Link href="/pipeline" className="btn btn-primary">View Pipeline</Link>
        </div>
      ) : (
        <>
          {/* Portfolio KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPI icon={<Building2 size={18} />} label="Acquisitions" value={closedWon.length.toString()} sub={`${winRate}% win rate`} color="var(--success)" />
            <KPI icon={<DollarSign size={18} />} label="Capital Deployed" value={fmt(totalDeployed)} sub={closedWon.filter(t => t.asking_price).length + ' with pricing'} color="var(--accent)" />
            <KPI icon={<TrendingUp size={18} />} label="Portfolio Revenue" value={fmt(totalRevenue)} sub={`${weightedRecurring.toFixed(0)}% recurring`} color="var(--success)" />
            <KPI icon={<BarChart3 size={18} />} label="Portfolio ARR" value={fmt(totalArr)} sub={totalArr > 0 && totalDeployed > 0 ? `${(totalDeployed / totalArr).toFixed(1)}x deployed/ARR` : '—'} color="var(--accent)" />
            <KPI icon={<Users size={18} />} label="Total Customers" value={totalCustomers.toLocaleString()} sub={`${totalEmployees} employees`} color="var(--warning)" />
            <KPI icon={<Star size={18} />} label="Avg Score" value={avgScore > 0 ? avgScore.toFixed(1) : '—'} sub="Weighted acquisition score" color={avgScore >= 4 ? 'var(--success)' : avgScore >= 3 ? 'var(--warning)' : 'var(--muted)'} />
          </div>

          {/* Blended Multiples */}
          {(avgEvRevenue > 0 || avgEvArr > 0) && (
            <div className="glass-card p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <ArrowUpDown size={16} style={{ color: 'var(--accent)' }} /> Blended Acquisition Multiples
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {avgEvRevenue > 0 && (
                  <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <div className="text-xl font-bold font-mono" style={{ color: 'var(--accent)' }}>{avgEvRevenue.toFixed(1)}x</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg EV/Revenue</div>
                  </div>
                )}
                {avgEvArr > 0 && (
                  <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <div className="text-xl font-bold font-mono" style={{ color: 'var(--accent)' }}>{avgEvArr.toFixed(1)}x</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg EV/ARR</div>
                  </div>
                )}
                <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                  <div className="text-xl font-bold font-mono" style={{ color: 'var(--success)' }}>{weightedRecurring.toFixed(0)}%</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Blended Recurring %</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                  <div className="text-xl font-bold font-mono">
                    {closedWon.filter(t => t.gross_margin_pct).length > 0
                      ? `${Math.round(closedWon.reduce((s, t) => s + (t.gross_margin_pct || 0), 0) / closedWon.filter(t => t.gross_margin_pct).length)}%`
                      : '—'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg Gross Margin</div>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Companies Grid */}
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-4">Portfolio Companies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedWon.map(t => {
                const intData = integrationData.find(d => d.target.id === t.id);
                const tps = touchpoints.filter(tp => tp.target_id === t.id).length;
                const cts = contacts.filter(c => c.target_id === t.id).length;
                return (
                  <Link key={t.id} href={`/targets/${t.id}`} className="p-4 rounded-lg transition-colors" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {t.vertical} · {t.geography || '—'}
                        </div>
                      </div>
                      {t.weighted_score && (
                        <span className="badge font-mono" style={{
                          background: t.weighted_score >= 4 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: t.weighted_score >= 4 ? 'var(--success)' : 'var(--warning)',
                        }}>
                          {t.weighted_score.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      {t.revenue && <div><span style={{ color: 'var(--muted)' }}>Revenue: </span><span className="font-mono">{fmt(t.revenue)}</span></div>}
                      {t.arr && <div><span style={{ color: 'var(--muted)' }}>ARR: </span><span className="font-mono">{fmt(t.arr)}</span></div>}
                      {t.asking_price && <div><span style={{ color: 'var(--muted)' }}>EV: </span><span className="font-mono">{fmt(t.asking_price)}</span></div>}
                      {t.customer_count && <div><span style={{ color: 'var(--muted)' }}>Customers: </span><span className="font-mono">{t.customer_count}</span></div>}
                      {t.recurring_revenue_pct && <div><span style={{ color: 'var(--muted)' }}>Recurring: </span><span className="font-mono">{t.recurring_revenue_pct}%</span></div>}
                      {t.employee_count && <div><span style={{ color: 'var(--muted)' }}>Employees: </span><span className="font-mono">{t.employee_count}</span></div>}
                    </div>
                    {intData && intData.progress !== null && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Integration Progress</span>
                          <span className="text-[10px] font-mono" style={{ color: intData.progress >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                            {intData.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <div className="h-full rounded-full" style={{
                            width: `${intData.progress}%`,
                            background: intData.progress >= 80 ? 'var(--success)' : intData.progress >= 40 ? 'var(--warning)' : 'var(--danger)',
                          }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-3 text-[10px]" style={{ color: 'var(--muted)' }}>
                      <span>{tps} touchpoints</span>
                      <span>{cts} contacts</span>
                      <span className="capitalize">{t.source}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Vertical & Geography Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Vertical */}
            <div className="glass-card p-5">
              <h2 className="font-semibold mb-3">Portfolio by Vertical</h2>
              <div className="space-y-2">
                {verticalBreakdown.map(v => (
                  <div key={v.vertical} className="flex items-center gap-3">
                    <span className="text-sm w-28 truncate" style={{ color: 'var(--muted-foreground)' }}>{v.vertical}</span>
                    <div className="flex-1 h-5 rounded" style={{ background: 'var(--background)' }}>
                      <div
                        className="h-full rounded flex items-center px-2 text-[10px] font-medium text-white"
                        style={{
                          width: `${Math.max(15, (v.revenue / (totalRevenue || 1)) * 100)}%`,
                          background: 'var(--accent)',
                        }}
                      >
                        {fmt(v.revenue)}
                      </div>
                    </div>
                    <span className="text-xs font-mono w-4 text-right">{v.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Geography */}
            <div className="glass-card p-5">
              <h2 className="font-semibold mb-3">Portfolio by Geography</h2>
              {geoBreakdown.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>No geography data</p>
              ) : (
                <div className="space-y-2">
                  {geoBreakdown.map(g => (
                    <div key={g.geo} className="flex items-center gap-3">
                      <span className="text-sm w-36 truncate" style={{ color: 'var(--muted-foreground)' }}>{g.geo}</span>
                      <div className="flex-1 h-5 rounded" style={{ background: 'var(--background)' }}>
                        <div
                          className="h-full rounded flex items-center px-2 text-[10px] font-medium text-white"
                          style={{
                            width: `${Math.max(15, (g.revenue / (totalRevenue || 1)) * 100)}%`,
                            background: 'var(--success)',
                          }}
                        >
                          {fmt(g.revenue)}
                        </div>
                      </div>
                      <span className="text-xs font-mono w-4 text-right">{g.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Source Effectiveness */}
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-3">Source Effectiveness</h2>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Source</th>
                  <th className="text-center p-2 text-xs" style={{ color: 'var(--success)' }}>Won</th>
                  <th className="text-center p-2 text-xs" style={{ color: 'var(--danger)' }}>Lost</th>
                  <th className="text-center p-2 text-xs" style={{ color: 'var(--accent)' }}>Active</th>
                  <th className="text-center p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Total</th>
                  <th className="text-center p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {sourceBreakdown.map(s => (
                  <tr key={s.source} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="p-2 font-medium capitalize">{s.source}</td>
                    <td className="p-2 text-center font-mono" style={{ color: 'var(--success)' }}>{s.won}</td>
                    <td className="p-2 text-center font-mono" style={{ color: 'var(--danger)' }}>{s.lost}</td>
                    <td className="p-2 text-center font-mono" style={{ color: 'var(--accent)' }}>{s.active}</td>
                    <td className="p-2 text-center font-mono">{s.total}</td>
                    <td className="p-2 text-center">
                      {s.winRate !== null ? (
                        <span className="font-mono font-bold" style={{ color: s.winRate >= 30 ? 'var(--success)' : 'var(--warning)' }}>
                          {s.winRate}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pipeline Conversion Funnel */}
          {allTargets.length > 3 && (
            <div className="glass-card p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp size={16} style={{ color: 'var(--accent)' }} /> Pipeline Conversion Funnel
              </h2>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                Percentage of targets that have reached or passed each stage
              </p>
              <div className="space-y-2">
                {(() => {
                  const stageOrder = ['identified', 'researching', 'contacted', 'nurturing', 'loi_submitted', 'loi_signed', 'due_diligence', 'closing', 'closed_won'];
                  const total = allTargets.length;
                  return stageOrder.map((stageKey, idx) => {
                    // Count targets that have reached this stage or beyond
                    const reachedCount = allTargets.filter(t => {
                      const tIdx = stageOrder.indexOf(t.stage);
                      return tIdx >= idx || t.stage === 'closed_lost';
                    }).length;
                    // For funnel: targets at or beyond this stage (excluding closed_lost)
                    const atOrBeyond = allTargets.filter(t => stageOrder.indexOf(t.stage) >= idx).length;
                    const pct = total > 0 ? Math.round((atOrBeyond / total) * 100) : 0;
                    const stage = DEAL_STAGES.find(s => s.key === stageKey);
                    return (
                      <div key={stageKey} className="flex items-center gap-3">
                        <span className="text-xs w-28 truncate" style={{ color: stage?.color }}>{stage?.label}</span>
                        <div className="flex-1 h-5 rounded" style={{ background: 'var(--background)' }}>
                          <div
                            className="h-full rounded flex items-center px-2 text-[10px] font-bold text-white transition-all"
                            style={{ width: `${Math.max(pct, 6)}%`, background: stage?.color }}
                          >
                            {pct > 10 ? `${pct}%` : ''}
                          </div>
                        </div>
                        <span className="text-xs font-mono w-16 text-right" style={{ color: 'var(--muted)' }}>{atOrBeyond}/{total}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              {closedWon.length > 0 && allTargets.length > 0 && (
                <div className="mt-3 p-2 rounded-lg text-xs" style={{ background: 'var(--background)' }}>
                  <span className="font-medium">Overall conversion:</span>{' '}
                  <span className="font-mono font-bold" style={{ color: 'var(--success)' }}>
                    {Math.round((closedWon.length / allTargets.length) * 100)}%
                  </span>{' '}
                  <span style={{ color: 'var(--muted)' }}>({closedWon.length} won out of {allTargets.length} total targets)</span>
                </div>
              )}
            </div>
          )}

          {/* Lost Deals Analysis */}
          {closedLost.length > 0 && (
            <div className="glass-card p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Clock size={16} style={{ color: 'var(--muted)' }} /> Lost Deals ({closedLost.length})
              </h2>
              <div className="space-y-2">
                {closedLost.map(t => (
                  <Link key={t.id} href={`/targets/${t.id}`} className="flex items-center gap-3 p-2 rounded-lg text-sm" style={{ background: 'var(--background)' }}>
                    <span className="font-medium flex-1">{t.name}</span>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{t.vertical}</span>
                    {t.asking_price && <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{fmt(t.asking_price)}</span>}
                    <span className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{t.source}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KPI({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="glass-card p-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg" style={{ background: `${color}20`, color }}>{icon}</div>
        <div>
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
          <div className="text-lg font-bold">{value}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}
