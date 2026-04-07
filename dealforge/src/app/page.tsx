'use client';

import { useEffect, useState } from 'react';
import {
  Target, KanbanSquare, FileSearch, AlertTriangle, DollarSign,
  Clock, TrendingUp, Calendar, BarChart3, Plus, Mail, ArrowUpDown,
} from 'lucide-react';
import Link from 'next/link';
import { getTargets, getDDProjects, getDDRisks, getTouchpoints, getDDFindings, getInfoRequests, getActivities } from '@/lib/db';
import type { ActivityEntry } from '@/lib/types';
import { DEAL_STAGES, VERTICALS } from '@/lib/types';
import type { Target as TargetType, DDProject, DDRisk, Touchpoint } from '@/lib/types';
import RAGDot from '@/components/RAGDot';
import ProgressBar from '@/components/ProgressBar';

export default function DashboardPage() {
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [ddProjects, setDDProjects] = useState<DDProject[]>([]);
  const [risks, setRisks] = useState<DDRisk[]>([]);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [allTargets, setAllTargets] = useState<TargetType[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    const t = getTargets();
    setAllTargets(t);
    setTargets(t);
    setDDProjects(getDDProjects());
    setRisks(getDDRisks());
    setTouchpoints(getTouchpoints());
    setRecentActivities(getActivities(15));
  }, []);

  const activeTargets = targets.filter(t => !['closed_won', 'closed_lost'].includes(t.stage));
  const totalPipelineValue = targets.reduce((sum, t) => sum + (t.asking_price || 0), 0);
  const activeDD = ddProjects.filter(p => p.status !== 'complete');
  const openRisks = risks.filter(r => r.status === 'open' || r.status === 'mitigating');
  const criticalRisks = openRisks.filter(r => (r.risk_score || 0) >= 15);
  const closedWon = targets.filter(t => t.stage === 'closed_won');

  // Pipeline stage breakdown
  const stageBreakdown = DEAL_STAGES.map(s => ({
    ...s,
    count: targets.filter(t => t.stage === s.key).length,
  })).filter(s => s.count > 0);

  // Vertical breakdown
  const verticalBreakdown = VERTICALS
    .map(v => ({ vertical: v, count: targets.filter(t => t.vertical === v).length }))
    .filter(v => v.count > 0)
    .sort((a, b) => b.count - a.count);

  // Source breakdown
  const sourceBreakdown = ['proprietary', 'broker', 'inbound', 'referral', 'other']
    .map(s => ({ source: s, count: targets.filter(t => t.source === s).length }))
    .filter(s => s.count > 0);

  // Stale deals (>30 days in same stage)
  const staleDeals = activeTargets.filter(t => {
    const days = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24));
    return days > 30;
  }).sort((a, b) => new Date(a.stage_entered_at).getTime() - new Date(b.stage_entered_at).getTime());

  // Upcoming follow-ups from touchpoints
  const now = new Date();
  const upcomingFollowups = touchpoints
    .filter(tp => tp.follow_up_date && new Date(tp.follow_up_date) >= now)
    .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())
    .slice(0, 5)
    .map(tp => ({
      ...tp,
      target_name: allTargets.find(t => t.id === tp.target_id)?.name || 'Unknown',
    }));

  // Recent touchpoints
  const recentTouchpoints = touchpoints.slice(0, 8).map(tp => ({
    ...tp,
    target_name: allTargets.find(t => t.id === tp.target_id)?.name || 'Unknown',
  }));

  // Top scored targets
  const topScored = [...targets]
    .filter(t => t.weighted_score && !['closed_won', 'closed_lost'].includes(t.stage))
    .sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0))
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          M&A pipeline overview and activity summary
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<Target size={18} />} label="Active Targets" value={activeTargets.length} sub={`${targets.length} total`} color="var(--accent)" />
        <StatCard icon={<DollarSign size={18} />} label="Pipeline Value" value={totalPipelineValue > 0 ? `$${(totalPipelineValue / 1000000).toFixed(1)}M` : '$0'} sub={`${activeTargets.filter(t => t.asking_price).length} with pricing`} color="var(--success)" />
        <StatCard icon={<FileSearch size={18} />} label="Active DD" value={activeDD.length} sub={`${ddProjects.length} total`} color="var(--warning)" />
        <StatCard icon={<AlertTriangle size={18} />} label="Open Risks" value={openRisks.length} sub={criticalRisks.length > 0 ? `${criticalRisks.length} critical` : 'None critical'} color={criticalRisks.length > 0 ? 'var(--danger)' : 'var(--muted)'} />
        <StatCard icon={<TrendingUp size={18} />} label="Closed Won" value={closedWon.length} sub="Acquisitions" color="var(--success)" />
        <StatCard icon={<Clock size={18} />} label="Stale Deals" value={staleDeals.length} sub=">30 days in stage" color={staleDeals.length > 0 ? 'var(--warning)' : 'var(--muted)'} />
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Quick Actions:</span>
        <Link href="/targets" className="btn btn-secondary btn-sm"><Plus size={12} /> New Target</Link>
        <Link href="/pipeline" className="btn btn-secondary btn-sm"><KanbanSquare size={12} /> Pipeline</Link>
        <Link href="/compare" className="btn btn-secondary btn-sm"><ArrowUpDown size={12} /> Compare</Link>
        <Link href="/outreach" className="btn btn-secondary btn-sm"><Mail size={12} /> Outreach</Link>
        <Link href="/analytics" className="btn btn-secondary btn-sm"><BarChart3 size={12} /> Analytics</Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Breakdown */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><BarChart3 size={16} /> Pipeline by Stage</h2>
            <Link href="/pipeline" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>View Pipeline</Link>
          </div>
          {stageBreakdown.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
              <KanbanSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No targets in pipeline yet</p>
              <Link href="/targets" className="text-xs mt-1 inline-block" style={{ color: 'var(--accent)' }}>Add your first target</Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stageBreakdown.map(s => (
                <div key={s.key} className="flex items-center gap-3">
                  <div className="w-28 text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{s.label}</div>
                  <div className="flex-1 h-5 rounded" style={{ background: 'var(--background)' }}>
                    <div
                      className="h-full rounded flex items-center px-2 text-xs font-medium text-white transition-all"
                      style={{ width: `${Math.max(8, (s.count / targets.length) * 100)}%`, background: s.color }}
                    >
                      {s.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active DD Projects */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Due Diligence</h2>
            <Link href="/diligence" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>View All</Link>
          </div>
          {activeDD.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
              <FileSearch size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active DD projects</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDD.slice(0, 5).map(p => (
                <Link key={p.id} href={`/diligence/${p.id}`} className="flex items-center gap-3 p-2 rounded-lg transition-colors" style={{ background: 'var(--background)' }}>
                  <RAGDot status={p.rag_status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.target_name}</div>
                    <div className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{p.phase}</div>
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{p.overall_progress_pct}%</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vertical Breakdown */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-3">By Vertical</h2>
          {verticalBreakdown.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>No targets yet</p>
          ) : (
            <div className="space-y-2">
              {verticalBreakdown.slice(0, 8).map(v => (
                <div key={v.vertical} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{v.vertical}</span>
                  <span className="text-sm font-mono font-bold">{v.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Source Breakdown */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-3">By Source</h2>
          {sourceBreakdown.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>No targets yet</p>
          ) : (
            <div className="space-y-2">
              {sourceBreakdown.map(s => {
                const pct = targets.length > 0 ? Math.round((s.count / targets.length) * 100) : 0;
                return (
                  <div key={s.source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm capitalize" style={{ color: 'var(--muted-foreground)' }}>{s.source}</span>
                      <span className="text-xs font-mono">{s.count} ({pct}%)</span>
                    </div>
                    <ProgressBar value={pct} color={s.source === 'proprietary' ? 'var(--success)' : 'var(--accent)'} />
                  </div>
                );
              })}
              {targets.length > 0 && (
                <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                  {sourceBreakdown.find(s => s.source === 'proprietary')
                    ? `${Math.round(((sourceBreakdown.find(s => s.source === 'proprietary')?.count || 0) / targets.length) * 100)}% proprietary (VMS benchmark: 60-70%)`
                    : 'Track proprietary vs broker sourcing ratio'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Top Scored Targets */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-3">Top Scored Targets</h2>
          {topScored.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>Score targets to see rankings</p>
          ) : (
            <div className="space-y-2">
              {topScored.map((t, i) => (
                <Link key={t.id} href={`/targets/${t.id}`} className="flex items-center gap-2 p-1.5 rounded text-sm hover:bg-opacity-50">
                  <span className="w-5 text-xs font-mono text-center" style={{ color: 'var(--muted)' }}>#{i + 1}</span>
                  <span className="flex-1 truncate">{t.name}</span>
                  <span className="font-mono font-bold" style={{
                    color: (t.weighted_score || 0) >= 4 ? 'var(--success)' : (t.weighted_score || 0) >= 3 ? 'var(--warning)' : 'var(--danger)',
                  }}>
                    {t.weighted_score?.toFixed(1)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stale Deals Alert */}
        {staleDeals.length > 0 && (
          <div className="glass-card p-5" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Clock size={16} style={{ color: 'var(--warning)' }} /> Stale Deals ({staleDeals.length})
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Targets sitting in the same stage for over 30 days</p>
            <div className="space-y-2">
              {staleDeals.slice(0, 5).map(t => {
                const days = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <Link key={t.id} href={`/targets/${t.id}`} className="flex items-center gap-3 p-2 rounded-lg text-sm" style={{ background: 'var(--background)' }}>
                    <span className="font-medium flex-1">{t.name}</span>
                    <span className="badge capitalize" style={{ background: `${DEAL_STAGES.find(s => s.key === t.stage)?.color}20`, color: DEAL_STAGES.find(s => s.key === t.stage)?.color }}>
                      {DEAL_STAGES.find(s => s.key === t.stage)?.label}
                    </span>
                    <span className="font-mono text-xs" style={{ color: 'var(--warning)' }}>{days}d</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Follow-ups */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar size={16} style={{ color: 'var(--accent)' }} /> Upcoming Follow-ups
          </h2>
          {upcomingFollowups.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>
              No upcoming follow-ups. Log touchpoints with follow-up dates to track.
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingFollowups.map(tp => (
                <div key={tp.id} className="flex items-center gap-3 p-2 rounded-lg text-sm" style={{ background: 'var(--background)' }}>
                  <span className="font-medium">{tp.target_name}</span>
                  <span className="flex-1 truncate" style={{ color: 'var(--muted-foreground)' }}>{tp.follow_up_notes || tp.subject}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>
                    {new Date(tp.follow_up_date!).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Activity</h2>
          <Link href="/activity" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>View All</Link>
        </div>
        {recentActivities.length === 0 && recentTouchpoints.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>
            No recent activity. Start by adding targets and logging touchpoints.
          </p>
        ) : (
          <div className="space-y-1.5">
            {recentActivities.length > 0 ? (
              recentActivities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg text-sm" style={{ background: 'var(--background)' }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{
                    background: a.type.includes('created') || a.type.includes('added') ? 'var(--success)'
                      : a.type.includes('deleted') ? 'var(--danger)'
                      : a.type.includes('changed') || a.type.includes('updated') ? 'var(--warning)'
                      : 'var(--accent)',
                  }} />
                  <span className="flex-1 truncate">{a.description}</span>
                  {a.target_name && (
                    <Link href={`/targets/${a.target_id}`} className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--accent)' }}>
                      {a.target_name}
                    </Link>
                  )}
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              recentTouchpoints.map((tp) => (
                <div key={tp.id} className="flex items-center gap-3 p-2 rounded-lg text-sm" style={{ background: 'var(--background)' }}>
                  <span className="badge capitalize" style={{ background: 'var(--accent-muted)', color: 'var(--accent)', minWidth: 65, textAlign: 'center' }}>
                    {tp.type}
                  </span>
                  <span className="font-medium">{tp.target_name}</span>
                  <span className="flex-1 truncate" style={{ color: 'var(--muted-foreground)' }}>{tp.subject}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                    {new Date(tp.date).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string; color: string;
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
