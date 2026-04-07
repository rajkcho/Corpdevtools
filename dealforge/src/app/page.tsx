'use client';

import { useEffect, useState } from 'react';
import {
  Target, KanbanSquare, FileSearch, AlertTriangle, DollarSign,
  Clock, TrendingUp, Calendar, BarChart3, Plus, Mail, ArrowUpDown, Users, Star,
} from 'lucide-react';
import Link from 'next/link';
import { getTargets, getDDProjects, getDDRisks, getTouchpoints, getDDFindings, getInfoRequests, getActivities, getContacts } from '@/lib/db';
import type { ActivityEntry } from '@/lib/types';
import { DEAL_STAGES, VERTICALS } from '@/lib/types';
import type { Target as TargetType, DDProject, DDRisk, Touchpoint, Contact } from '@/lib/types';
import RAGDot from '@/components/RAGDot';
import ProgressBar from '@/components/ProgressBar';

export default function DashboardPage() {
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [ddProjects, setDDProjects] = useState<DDProject[]>([]);
  const [risks, setRisks] = useState<DDRisk[]>([]);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [allTargets, setAllTargets] = useState<TargetType[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityEntry[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const t = getTargets();
    setAllTargets(t);
    setTargets(t);
    setDDProjects(getDDProjects());
    setRisks(getDDRisks());
    setTouchpoints(getTouchpoints());
    setRecentActivities(getActivities(15));
    setAllContacts(getContacts());
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

      {/* Data freshness warning */}
      {(() => {
        const lastBackup = typeof window !== 'undefined' ? localStorage.getItem('dealforge_last_backup') : null;
        const daysSinceBackup = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : null;
        const showWarning = !lastBackup || (daysSinceBackup !== null && daysSinceBackup > 7);
        if (!showWarning || targets.length === 0) return null;
        return (
          <div className="flex items-center gap-3 p-3 rounded-lg text-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <span style={{ color: 'var(--warning)' }}>
              {!lastBackup ? 'You haven\'t backed up your data yet.' : `Last backup: ${daysSinceBackup}d ago.`}
              {' '}All data is stored in your browser only.
            </span>
            <Link href="/settings" className="btn btn-secondary btn-sm ml-auto flex-shrink-0">
              Backup Now
            </Link>
          </div>
        );
      })()}

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

      {/* Watchlist */}
      {(() => {
        const watchlistRaw = typeof window !== 'undefined' ? localStorage.getItem('dealforge_watchlist') : null;
        const watchlistIds: string[] = watchlistRaw ? JSON.parse(watchlistRaw) : [];
        const watchlistTargets = targets.filter(t => watchlistIds.includes(t.id));
        if (watchlistTargets.length === 0) return null;

        return (
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Star size={16} style={{ color: '#F59E0B' }} /> Watchlist ({watchlistTargets.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {watchlistTargets.map(t => {
                const stage = DEAL_STAGES.find(s => s.key === t.stage);
                const daysInStage = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000);
                return (
                  <Link key={t.id} href={`/targets/${t.id}`} className="flex items-center gap-3 p-3 rounded-lg transition-colors" style={{ background: 'var(--background)' }}>
                    <Star size={14} fill="#F59E0B" style={{ color: '#F59E0B', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.name}</div>
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{t.vertical}</div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className="badge text-[9px]" style={{ background: `${stage?.color}20`, color: stage?.color }}>{stage?.label}</span>
                      {t.weighted_score && (
                        <span className="text-[10px] font-mono" style={{
                          color: t.weighted_score >= 4 ? 'var(--success)' : t.weighted_score >= 3 ? 'var(--warning)' : 'var(--danger)',
                        }}>{t.weighted_score.toFixed(1)}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

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

      {/* Pipeline Velocity */}
      {activeTargets.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp size={16} style={{ color: 'var(--accent)' }} /> Pipeline Velocity
            </h2>
            <Link href="/analytics" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Details</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(() => {
              const avgDaysInStage = activeTargets.length > 0
                ? Math.round(activeTargets.reduce((sum, t) => sum + Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000), 0) / activeTargets.length)
                : 0;
              const avgDaysTotal = activeTargets.length > 0
                ? Math.round(activeTargets.reduce((sum, t) => sum + Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000), 0) / activeTargets.length)
                : 0;
              const touchpointsThisMonth = touchpoints.filter(tp => {
                const d = new Date(tp.date);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length;
              const closedCount = targets.filter(t => t.stage === 'closed_won' || t.stage === 'closed_lost').length;
              const winRate = closedCount > 0 ? Math.round((closedWon.length / closedCount) * 100) : 0;
              return (
                <>
                  <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono" style={{ color: avgDaysInStage > 30 ? 'var(--danger)' : avgDaysInStage > 14 ? 'var(--warning)' : 'var(--success)' }}>
                      {avgDaysInStage}d
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg Days in Stage</div>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono">{avgDaysTotal}d</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg Deal Age</div>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>{touchpointsThisMonth}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Touchpoints (MTD)</div>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <div className="text-lg font-bold font-mono" style={{ color: winRate >= 25 ? 'var(--success)' : 'var(--warning)' }}>
                      {winRate}%
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Win Rate</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Weekly Digest */}
      {recentActivities.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <BarChart3 size={16} style={{ color: 'var(--accent)' }} /> This Week&apos;s Summary
          </h2>
          {(() => {
            const weekAgo = Date.now() - 7 * 86400000;
            const weekActivities = recentActivities.filter(a => new Date(a.created_at).getTime() > weekAgo);
            const newTargets = weekActivities.filter(a => a.type === 'target_created').length;
            const stageChanges = weekActivities.filter(a => a.type === 'stage_changed').length;
            const touchpointsLogged = weekActivities.filter(a => a.type === 'touchpoint_added').length;
            const ddTasks = weekActivities.filter(a => a.type === 'dd_task_completed').length;
            const risksAdded = weekActivities.filter(a => a.type === 'dd_risk_added').length;

            if (weekActivities.length === 0) {
              return <p className="text-sm" style={{ color: 'var(--muted)' }}>No activity this week. Time to engage with your pipeline!</p>;
            }

            return (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="text-center p-2 rounded-lg" style={{ background: 'var(--background)' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: newTargets > 0 ? 'var(--success)' : 'var(--muted)' }}>{newTargets}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>New Targets</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: 'var(--background)' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: stageChanges > 0 ? 'var(--warning)' : 'var(--muted)' }}>{stageChanges}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Stage Changes</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: 'var(--background)' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: touchpointsLogged > 0 ? 'var(--accent)' : 'var(--muted)' }}>{touchpointsLogged}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Touchpoints</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: 'var(--background)' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: ddTasks > 0 ? 'var(--success)' : 'var(--muted)' }}>{ddTasks}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>DD Tasks Done</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: 'var(--background)' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: risksAdded > 0 ? 'var(--danger)' : 'var(--muted)' }}>{risksAdded}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Risks Flagged</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Priority Actions - Smart next steps */}
      {targets.length > 0 && (() => {
        const actions: { priority: number; label: string; detail: string; href: string; color: string }[] = [];

        // Overdue follow-ups
        const overdueCount = touchpoints.filter(tp => tp.follow_up_date && new Date(tp.follow_up_date) < now).length;
        if (overdueCount > 0) {
          actions.push({ priority: 1, label: 'Follow up', detail: `${overdueCount} overdue follow-up${overdueCount > 1 ? 's' : ''}`, href: '/activity', color: 'var(--danger)' });
        }

        // Unscored targets in active stages
        const unscoredActive = activeTargets.filter(t => !t.weighted_score && !['identified'].includes(t.stage));
        if (unscoredActive.length > 0) {
          actions.push({ priority: 3, label: 'Score targets', detail: `${unscoredActive.length} active target${unscoredActive.length > 1 ? 's' : ''} need scoring`, href: `/targets/${unscoredActive[0].id}`, color: 'var(--warning)' });
        }

        // Targets without contacts in advanced stages
        const noContactTargets = activeTargets.filter(t =>
          ['contacted', 'nurturing', 'loi_submitted', 'loi_signed', 'due_diligence', 'closing'].includes(t.stage) &&
          allContacts.filter(c => c.target_id === t.id).length === 0
        );
        if (noContactTargets.length > 0) {
          actions.push({ priority: 2, label: 'Add contacts', detail: `${noContactTargets.length} advanced target${noContactTargets.length > 1 ? 's' : ''} missing contacts`, href: `/targets/${noContactTargets[0].id}`, color: 'var(--warning)' });
        }

        // Stale deals needing attention
        if (staleDeals.length > 0) {
          actions.push({ priority: 2, label: 'Review stale deals', detail: `${staleDeals.length} deal${staleDeals.length > 1 ? 's' : ''} stale >30 days`, href: '/pipeline', color: 'var(--warning)' });
        }

        // DD projects with red RAG
        const redDD = ddProjects.filter(p => p.rag_status === 'red' && p.status !== 'complete');
        if (redDD.length > 0) {
          actions.push({ priority: 1, label: 'DD at risk', detail: `${redDD.length} project${redDD.length > 1 ? 's' : ''} flagged red`, href: `/diligence/${redDD[0].id}`, color: 'var(--danger)' });
        }

        // Critical risks needing mitigation
        if (criticalRisks.length > 0) {
          actions.push({ priority: 1, label: 'Mitigate risks', detail: `${criticalRisks.length} critical risk${criticalRisks.length > 1 ? 's' : ''} open`, href: '/diligence', color: 'var(--danger)' });
        }

        // Targets in closing stage
        const closingTargets = activeTargets.filter(t => t.stage === 'closing');
        if (closingTargets.length > 0) {
          actions.push({ priority: 1, label: 'Close deals', detail: `${closingTargets.length} target${closingTargets.length > 1 ? 's' : ''} in closing stage`, href: `/targets/${closingTargets[0].id}`, color: 'var(--success)' });
        }

        if (actions.length === 0) return null;
        actions.sort((a, b) => a.priority - b.priority);

        return (
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-3">Priority Actions</h2>
            <div className="flex flex-wrap gap-2">
              {actions.slice(0, 6).map((a, i) => (
                <Link
                  key={i}
                  href={a.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ background: `${a.color}10`, border: `1px solid ${a.color}30` }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                  <span className="font-medium">{a.label}</span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{a.detail}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Overdue Follow-ups + Contacts Overview */}
      {(() => {
        const overdueFollowups = touchpoints
          .filter(tp => tp.follow_up_date && new Date(tp.follow_up_date) < now)
          .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())
          .slice(0, 5)
          .map(tp => ({
            ...tp,
            target_name: allTargets.find(t => t.id === tp.target_id)?.name || 'Unknown',
            days_overdue: Math.floor((Date.now() - new Date(tp.follow_up_date!).getTime()) / 86400000),
          }));

        const contactsByTarget = allTargets
          .filter(t => !['closed_won', 'closed_lost'].includes(t.stage))
          .map(t => ({
            target: t,
            contacts: allContacts.filter(c => c.target_id === t.id),
            primary: allContacts.find(c => c.target_id === t.id && c.is_primary),
          }))
          .filter(x => x.contacts.length > 0)
          .sort((a, b) => b.contacts.length - a.contacts.length)
          .slice(0, 6);

        const targetsWithoutContacts = allTargets
          .filter(t => !['closed_won', 'closed_lost'].includes(t.stage))
          .filter(t => allContacts.filter(c => c.target_id === t.id).length === 0);

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overdue Follow-ups */}
            {overdueFollowups.length > 0 && (
              <div className="glass-card p-5" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} style={{ color: 'var(--danger)' }} /> Overdue Follow-ups ({overdueFollowups.length})
                </h2>
                <div className="space-y-2">
                  {overdueFollowups.map(tp => (
                    <Link key={tp.id} href={`/targets/${tp.target_id}`} className="flex items-center gap-3 p-2 rounded-lg text-sm" style={{ background: 'var(--background)' }}>
                      <span className="font-medium">{tp.target_name}</span>
                      <span className="flex-1 truncate" style={{ color: 'var(--muted-foreground)' }}>{tp.follow_up_notes || tp.subject}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--danger)' }}>
                        {tp.days_overdue}d overdue
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts Overview */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <Users size={16} style={{ color: 'var(--accent)' }} /> Contacts ({allContacts.length})
                </h2>
              </div>
              {contactsByTarget.length > 0 ? (
                <div className="space-y-2">
                  {contactsByTarget.map(({ target: t, contacts: c, primary }) => (
                    <Link key={t.id} href={`/targets/${t.id}`} className="flex items-center gap-3 p-2 rounded-lg text-sm" style={{ background: 'var(--background)' }}>
                      <span className="font-medium flex-1 truncate">{t.name}</span>
                      {primary && (
                        <span className="text-xs truncate" style={{ color: 'var(--muted-foreground)', maxWidth: 120 }}>
                          {primary.name}{primary.title ? ` (${primary.title})` : ''}
                        </span>
                      )}
                      <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>
                        {c.length} contact{c.length > 1 ? 's' : ''}
                      </span>
                    </Link>
                  ))}
                  {targetsWithoutContacts.length > 0 && (
                    <p className="text-xs mt-2" style={{ color: 'var(--warning)' }}>
                      {targetsWithoutContacts.length} active target{targetsWithoutContacts.length > 1 ? 's' : ''} without contacts
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>
                  No contacts added yet. Add contacts to track relationships.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Deal Health Scorecard */}
      {activeTargets.length > 0 && (() => {
        const dealHealth = activeTargets
          .filter(t => !['identified'].includes(t.stage))
          .map(t => {
            const daysInStage = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000);
            const tps = touchpoints.filter(tp => tp.target_id === t.id);
            const lastTouchpoint = tps.length > 0 ? tps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
            const daysSinceContact = lastTouchpoint ? Math.floor((Date.now() - new Date(lastTouchpoint.date).getTime()) / 86400000) : null;
            const contacts = allContacts.filter(c => c.target_id === t.id);
            const dd = ddProjects.find(p => p.target_id === t.id);
            const targetRisks = risks.filter(r => dd && r.project_id === dd.id && r.status === 'open');

            // Score components (0-100 each)
            let momentum = 100;
            if (daysInStage > 60) momentum -= 50;
            else if (daysInStage > 30) momentum -= 25;
            if (daysSinceContact === null) momentum -= 30;
            else if (daysSinceContact > 30) momentum -= 40;
            else if (daysSinceContact > 14) momentum -= 20;
            momentum = Math.max(0, momentum);

            let completeness = 0;
            if (t.weighted_score) completeness += 25;
            if (contacts.length > 0) completeness += 25;
            if (t.revenue || t.arr) completeness += 25;
            if (tps.length >= 2) completeness += 25;

            let riskLevel = 100;
            if (targetRisks.length > 0) riskLevel -= targetRisks.length * 15;
            if (dd?.rag_status === 'red') riskLevel -= 30;
            else if (dd?.rag_status === 'amber') riskLevel -= 15;
            riskLevel = Math.max(0, riskLevel);

            const overall = Math.round((momentum * 0.4 + completeness * 0.3 + riskLevel * 0.3));
            const healthColor = overall >= 70 ? 'var(--success)' : overall >= 40 ? 'var(--warning)' : 'var(--danger)';
            const healthLabel = overall >= 70 ? 'Healthy' : overall >= 40 ? 'Needs Attention' : 'At Risk';

            return { target: t, overall, momentum, completeness, riskLevel, healthColor, healthLabel, daysInStage, daysSinceContact };
          })
          .sort((a, b) => a.overall - b.overall);

        if (dealHealth.length === 0) return null;

        const avgHealth = Math.round(dealHealth.reduce((s, d) => s + d.overall, 0) / dealHealth.length);
        const atRisk = dealHealth.filter(d => d.overall < 40).length;

        return (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <TrendingUp size={16} style={{ color: 'var(--accent)' }} /> Deal Health Scorecard
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  Avg Health: <span className="font-mono font-bold" style={{ color: avgHealth >= 70 ? 'var(--success)' : avgHealth >= 40 ? 'var(--warning)' : 'var(--danger)' }}>{avgHealth}</span>
                </span>
                {atRisk > 0 && (
                  <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>
                    {atRisk} at risk
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {dealHealth.slice(0, 8).map(d => (
                <Link key={d.target.id} href={`/targets/${d.target.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg text-sm transition-colors"
                  style={{ background: 'var(--background)' }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${d.healthColor}15`, color: d.healthColor, border: `2px solid ${d.healthColor}` }}
                  >
                    {d.overall}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{d.target.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{d.healthLabel}</span>
                      <span className="text-[10px]" style={{ color: 'var(--muted)' }}>·</span>
                      <span className="text-[10px]" style={{ color: d.daysInStage > 30 ? 'var(--warning)' : 'var(--muted)' }}>{d.daysInStage}d in stage</span>
                      {d.daysSinceContact !== null && (
                        <>
                          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>·</span>
                          <span className="text-[10px]" style={{ color: d.daysSinceContact > 14 ? 'var(--warning)' : 'var(--muted)' }}>{d.daysSinceContact}d since contact</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div title="Momentum" className="w-8 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${d.momentum}%`, background: d.momentum >= 70 ? 'var(--success)' : d.momentum >= 40 ? 'var(--warning)' : 'var(--danger)' }} />
                    </div>
                    <div title="Completeness" className="w-8 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${d.completeness}%`, background: d.completeness >= 75 ? 'var(--success)' : d.completeness >= 50 ? 'var(--warning)' : 'var(--danger)' }} />
                    </div>
                    <div title="Risk Level" className="w-8 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${d.riskLevel}%`, background: d.riskLevel >= 70 ? 'var(--success)' : d.riskLevel >= 40 ? 'var(--warning)' : 'var(--danger)' }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: 'var(--muted)' }}>
              <span>Bars: Momentum · Completeness · Risk</span>
              <span>Score: 40% momentum + 30% completeness + 30% risk profile</span>
            </div>
          </div>
        );
      })()}

      {/* Upcoming Milestones Across All Targets */}
      {(() => {
        if (typeof window === 'undefined') return null;
        const allMilestones: { target: string; targetId: string; label: string; date: string; overdue: boolean }[] = [];
        for (const t of activeTargets) {
          const raw = localStorage.getItem(`dealforge_milestones_${t.id}`);
          if (!raw) continue;
          const ms = JSON.parse(raw);
          for (const m of ms) {
            if (m.completed || !m.target_date) continue;
            const overdue = new Date(m.target_date).getTime() < Date.now();
            allMilestones.push({ target: t.name, targetId: t.id, label: m.label, date: m.target_date, overdue });
          }
        }
        if (allMilestones.length === 0) return null;
        allMilestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return (
          <div className="glass-card p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar size={16} style={{ color: 'var(--accent)' }} /> Upcoming Milestones
            </h2>
            <div className="space-y-2">
              {allMilestones.slice(0, 8).map((m, i) => {
                const daysUntil = Math.floor((new Date(m.date).getTime() - Date.now()) / 86400000);
                return (
                  <Link key={i} href={`/targets/${m.targetId}`} className="flex items-center gap-3 p-2 rounded-lg text-sm" style={{ background: 'var(--background)' }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.overdue ? 'var(--danger)' : daysUntil <= 7 ? 'var(--warning)' : 'var(--accent)' }} />
                    <span className="font-medium flex-shrink-0 w-28 truncate">{m.target}</span>
                    <span className="flex-1 truncate" style={{ color: 'var(--muted-foreground)' }}>{m.label}</span>
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: m.overdue ? 'var(--danger)' : daysUntil <= 7 ? 'var(--warning)' : 'var(--muted)' }}>
                      {m.overdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

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
