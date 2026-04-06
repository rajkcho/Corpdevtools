'use client';

import { useEffect, useState } from 'react';
import { Target, KanbanSquare, FileSearch, AlertTriangle, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { getTargets, getDDProjects, getDDRisks, getTouchpoints } from '@/lib/db';
import { DEAL_STAGES } from '@/lib/types';
import type { Target as TargetType, DDProject, DDRisk } from '@/lib/types';
import RAGDot from '@/components/RAGDot';

export default function DashboardPage() {
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [ddProjects, setDDProjects] = useState<DDProject[]>([]);
  const [risks, setRisks] = useState<DDRisk[]>([]);
  const [recentTouchpoints, setRecentTouchpoints] = useState<{ target_name: string; subject: string; date: string; type: string }[]>([]);

  useEffect(() => {
    const allTargets = getTargets();
    setTargets(allTargets);
    setDDProjects(getDDProjects());
    setRisks(getDDRisks());

    const allTouchpoints = getTouchpoints();
    const recent = allTouchpoints.slice(0, 5).map(tp => ({
      target_name: allTargets.find(t => t.id === tp.target_id)?.name || 'Unknown',
      subject: tp.subject,
      date: tp.date,
      type: tp.type,
    }));
    setRecentTouchpoints(recent);
  }, []);

  const activeTargets = targets.filter(t => !['closed_won', 'closed_lost'].includes(t.stage));
  const totalPipelineValue = targets.reduce((sum, t) => sum + (t.asking_price || 0), 0);
  const activeDD = ddProjects.filter(p => p.status !== 'complete');
  const openRisks = risks.filter(r => r.status === 'open' || r.status === 'mitigating');
  const criticalRisks = openRisks.filter(r => (r.risk_score || 0) >= 15);

  const stageBreakdown = DEAL_STAGES.map(s => ({
    ...s,
    count: targets.filter(t => t.stage === s.key).length,
  })).filter(s => s.count > 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          M&A pipeline overview and activity summary
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Target size={20} />}
          label="Active Targets"
          value={activeTargets.length}
          sub={`${targets.length} total`}
          color="var(--accent)"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="Pipeline Value"
          value={totalPipelineValue > 0 ? `$${(totalPipelineValue / 1000000).toFixed(1)}M` : '$0'}
          sub={`${activeTargets.filter(t => t.asking_price).length} with pricing`}
          color="var(--success)"
        />
        <StatCard
          icon={<FileSearch size={20} />}
          label="Active DD Projects"
          value={activeDD.length}
          sub={`${ddProjects.length} total`}
          color="var(--warning)"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Open Risks"
          value={openRisks.length}
          sub={criticalRisks.length > 0 ? `${criticalRisks.length} critical` : 'None critical'}
          color={criticalRisks.length > 0 ? 'var(--danger)' : 'var(--muted)'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Breakdown */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Pipeline by Stage</h2>
            <Link href="/pipeline" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              View Pipeline
            </Link>
          </div>
          {stageBreakdown.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
              <KanbanSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No targets in pipeline yet</p>
              <Link href="/targets" className="text-xs mt-1 inline-block" style={{ color: 'var(--accent)' }}>
                Add your first target
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stageBreakdown.map(s => (
                <div key={s.key} className="flex items-center gap-3">
                  <div className="w-28 text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{s.label}</div>
                  <div className="flex-1 h-6 rounded" style={{ background: 'var(--background)' }}>
                    <div
                      className="h-full rounded flex items-center px-2 text-xs font-medium text-white transition-all"
                      style={{
                        width: `${Math.max(10, (s.count / targets.length) * 100)}%`,
                        background: s.color,
                      }}
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
            <Link href="/diligence" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              View All
            </Link>
          </div>
          {activeDD.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
              <FileSearch size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active DD projects</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDD.slice(0, 5).map(p => (
                <Link
                  key={p.id}
                  href={`/diligence/${p.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg transition-colors"
                  style={{ background: 'var(--background)' }}
                >
                  <RAGDot status={p.rag_status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.target_name}</div>
                    <div className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{p.phase}</div>
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    {p.overall_progress_pct}%
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4">Recent Activity</h2>
        {recentTouchpoints.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>
            No recent activity. Start by adding targets and logging touchpoints.
          </p>
        ) : (
          <div className="space-y-2">
            {recentTouchpoints.map((tp, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg text-sm" style={{ background: 'var(--background)' }}>
                <span className="badge capitalize" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  {tp.type}
                </span>
                <span className="font-medium">{tp.target_name}</span>
                <span style={{ color: 'var(--muted-foreground)' }}>{tp.subject}</span>
                <span className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>
                  {new Date(tp.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}
