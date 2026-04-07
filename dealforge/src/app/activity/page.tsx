'use client';

import { useEffect, useState } from 'react';
import { getActivities } from '@/lib/db';
import type { ActivityEntry, ActivityType } from '@/lib/types';
import Link from 'next/link';
import {
  Target, FileSearch, Users, TrendingUp, FileText, AlertTriangle,
  Send, Upload, Clock, CheckCircle2, Plus, Filter,
} from 'lucide-react';

const TYPE_CONFIG: Record<ActivityType, { icon: React.ReactNode; color: string; label: string }> = {
  target_created: { icon: <Plus size={14} />, color: 'var(--success)', label: 'Target Created' },
  target_updated: { icon: <TrendingUp size={14} />, color: 'var(--accent)', label: 'Target Updated' },
  target_deleted: { icon: <Target size={14} />, color: 'var(--danger)', label: 'Target Deleted' },
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
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    setActivities(getActivities(200));
  }, []);

  const filtered = filterType === 'all'
    ? activities
    : activities.filter(a => a.type === filterType);

  // Group by date
  const grouped: Record<string, ActivityEntry[]> = {};
  for (const a of filtered) {
    const date = new Date(a.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(a);
  }

  const activeTypes = Array.from(new Set(activities.map(a => a.type)));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity Feed</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {activities.length} total activities logged
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: 'var(--muted)' }} />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm"
          >
            <option value="all">All Activities</option>
            {activeTypes.map(t => (
              <option key={t} value={t}>{TYPE_CONFIG[t]?.label || t}</option>
            ))}
          </select>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="glass-card p-12 text-center" style={{ color: 'var(--muted)' }}>
          <Clock size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-1">No activity yet</p>
          <p className="text-sm">Activities will appear here as you use DealForge -- adding targets, logging touchpoints, completing DD tasks, etc.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>
                {date}
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
