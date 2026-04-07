'use client';

import { useEffect, useState } from 'react';
import { getActivities, getTargets } from '@/lib/db';
import type { ActivityEntry, ActivityType, Target } from '@/lib/types';
import Link from 'next/link';
import {
  Target as TargetIcon, FileSearch, Users, TrendingUp, FileText, AlertTriangle,
  Send, Upload, Clock, CheckCircle2, Plus, Filter, Search, BarChart3,
} from 'lucide-react';

const TYPE_CONFIG: Record<ActivityType, { icon: React.ReactNode; color: string; label: string }> = {
  target_created: { icon: <Plus size={14} />, color: 'var(--success)', label: 'Target Created' },
  target_updated: { icon: <TrendingUp size={14} />, color: 'var(--accent)', label: 'Target Updated' },
  target_deleted: { icon: <TargetIcon size={14} />, color: 'var(--danger)', label: 'Target Deleted' },
  stage_changed: { icon: <TrendingUp size={14} />, color: 'var(--warning)', label: 'Stage Changed' },
  touchpoint_added: { icon: <Users size={14} />, color: 'var(--accent)', label: 'Touchpoint Logged' },
  meeting_note_added: { icon: <FileText size={14} />, color: 'var(--accent)', label: 'Meeting Note Added' },
  contact_added: { icon: <Users size={14} />, color: 'var(--success)', label: 'Contact Added' },
  dd_project_created: { icon: <FileSearch size={14} />, color: 'var(--success)', label: 'DD Project Started' },
  dd_task_completed: { icon: <CheckCircle2 size={14} />, color: 'var(--success)', label: 'DD Task Completed' },
  dd_risk_added: { icon: <AlertTriangle size={14} />, color: 'var(--danger)', label: 'Risk Identified' },
  dd_finding_added: { icon: <AlertTriangle size={14} />, color: 'var(--warning)', label: 'Finding Added' },
  irl_sent: { icon: <Send size={14} />, color: 'var(--accent)', label: 'IRL Sent' },
  document_uploaded: { icon: <Upload size={14} />, color: 'var(--accent)', label: 'Document Uploaded' },
  phase_changed: { icon: <Clock size={14} />, color: 'var(--warning)', label: 'Phase Changed' },
  score_updated: { icon: <TrendingUp size={14} />, color: 'var(--success)', label: 'Score Updated' },
};

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [allTargets, setAllTargets] = useState<Target[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTarget, setFilterTarget] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActivities(getActivities(500));
    setAllTargets(getTargets());
  }, []);

  const filtered = activities.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterTarget !== 'all' && a.target_id !== filterTarget) return false;
    if (filterDateRange !== 'all') {
      const now = Date.now();
      const created = new Date(a.created_at).getTime();
      if (filterDateRange === '7d' && now - created > 7 * 86400000) return false;
      if (filterDateRange === '30d' && now - created > 30 * 86400000) return false;
      if (filterDateRange === '90d' && now - created > 90 * 86400000) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.description.toLowerCase().includes(q) || a.target_name?.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by date
  const grouped: Record<string, ActivityEntry[]> = {};
  for (const a of filtered) {
    const date = new Date(a.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(a);
  }

  const activeTypes = Array.from(new Set(activities.map(a => a.type)));
  const targetsInActivity = Array.from(new Set(activities.filter(a => a.target_id).map(a => a.target_id!)));

  // Activity type breakdown
  const typeCounts = activeTypes.map(t => ({
    type: t,
    count: activities.filter(a => a.type === t).length,
    config: TYPE_CONFIG[t],
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity Feed</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {filtered.length} of {activities.length} activities shown
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            className="w-full pl-9 text-sm"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-sm">
          <option value="all">All Types</option>
          {activeTypes.map(t => (
            <option key={t} value={t}>{TYPE_CONFIG[t]?.label || t}</option>
          ))}
        </select>
        <select value={filterTarget} onChange={e => setFilterTarget(e.target.value)} className="text-sm">
          <option value="all">All Targets</option>
          {targetsInActivity.map(tid => {
            const t = allTargets.find(x => x.id === tid);
            return <option key={tid} value={tid}>{t?.name || tid}</option>;
          })}
        </select>
        <select value={filterDateRange} onChange={e => setFilterDateRange(e.target.value)} className="text-sm">
          <option value="all">All Time</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {/* Activity Stats */}
      {activities.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
            <BarChart3 size={12} /> Activity Breakdown
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            {typeCounts.slice(0, 8).map(tc => (
              <button
                key={tc.type}
                onClick={() => setFilterType(filterType === tc.type ? 'all' : tc.type)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
                style={{
                  background: filterType === tc.type ? `${tc.config.color}20` : 'var(--background)',
                  color: filterType === tc.type ? tc.config.color : 'var(--muted-foreground)',
                  border: filterType === tc.type ? `1px solid ${tc.config.color}40` : '1px solid transparent',
                }}
              >
                {tc.config.icon}
                <span>{tc.config.label}</span>
                <span className="font-mono font-bold">{tc.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="glass-card p-12 text-center" style={{ color: 'var(--muted)' }}>
          <Clock size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-1">No activity yet</p>
          <p className="text-sm">Activities will appear here as you use DealForge -- adding targets, logging touchpoints, completing DD tasks, etc.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center" style={{ color: 'var(--muted)' }}>
          <Filter size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No activities match your filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>
                {date} <span className="font-normal ml-1" style={{ color: 'var(--muted)' }}>({entries.length})</span>
              </h3>
              <div className="space-y-1">
                {entries.map(a => {
                  const config = TYPE_CONFIG[a.type] || { icon: <Clock size={14} />, color: 'var(--muted)', label: a.type };
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg transition-colors" style={{ background: 'var(--card)' }}>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${config.color}15`, color: config.color }}
                      >
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{a.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge" style={{ background: `${config.color}15`, color: config.color }}>
                            {config.label}
                          </span>
                          {a.target_name && a.target_id && (
                            <Link
                              href={`/targets/${a.target_id}`}
                              className="text-xs hover:underline"
                              style={{ color: 'var(--accent)' }}
                            >
                              {a.target_name}
                            </Link>
                          )}
                        </div>
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                        {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
