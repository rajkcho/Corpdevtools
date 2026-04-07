'use client';

import { useMemo } from 'react';
import type { Touchpoint, Contact, StageHistoryEntry } from '@/lib/types';
import { DEAL_STAGES } from '@/lib/types';
import {
  Mail, Phone, Users, MessageSquare, Link2, Globe,
  Calendar, TrendingUp, ArrowRight, FileText,
} from 'lucide-react';

interface RelationshipTimelineProps {
  touchpoints: Touchpoint[];
  contacts: Contact[];
  stageHistory: StageHistoryEntry[];
  targetCreatedAt: string;
}

type TimelineEvent = {
  id: string;
  date: string;
  type: 'touchpoint' | 'stage_change' | 'target_created';
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle?: string;
  detail?: string;
};

const TP_ICONS: Record<string, React.ReactNode> = {
  email: <Mail size={12} />,
  call: <Phone size={12} />,
  meeting: <Users size={12} />,
  note: <FileText size={12} />,
  linkedin: <Link2 size={12} />,
  conference: <Globe size={12} />,
  other: <MessageSquare size={12} />,
};

export default function RelationshipTimeline({ touchpoints, contacts, stageHistory, targetCreatedAt }: RelationshipTimelineProps) {
  const events = useMemo(() => {
    const all: TimelineEvent[] = [];

    // Target created
    all.push({
      id: 'created',
      date: targetCreatedAt,
      type: 'target_created',
      icon: <TrendingUp size={12} />,
      color: 'var(--success)',
      title: 'Target Added to Pipeline',
    });

    // Stage changes
    for (const sh of stageHistory) {
      const toStage = DEAL_STAGES.find(s => s.key === sh.to_stage);
      const fromStage = DEAL_STAGES.find(s => s.key === sh.from_stage);
      all.push({
        id: sh.id,
        date: sh.changed_at,
        type: 'stage_change',
        icon: <ArrowRight size={12} />,
        color: toStage?.color || 'var(--accent)',
        title: `Stage: ${fromStage?.label || sh.from_stage} → ${toStage?.label || sh.to_stage}`,
        detail: sh.notes,
      });
    }

    // Touchpoints
    for (const tp of touchpoints) {
      const participant = tp.participants
        ? contacts.find(c => tp.participants?.includes(c.name))
        : undefined;
      all.push({
        id: tp.id,
        date: tp.date,
        type: 'touchpoint',
        icon: TP_ICONS[tp.type] || <MessageSquare size={12} />,
        color: tp.type === 'meeting' ? 'var(--accent)' : tp.type === 'email' ? 'var(--success)' : tp.type === 'call' ? 'var(--warning)' : 'var(--muted-foreground)',
        title: tp.subject,
        subtitle: `${tp.type}${participant ? ` with ${participant.name}` : tp.participants ? ` with ${tp.participants}` : ''}`,
        detail: tp.summary,
      });
    }

    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [touchpoints, contacts, stageHistory, targetCreatedAt]);

  if (events.length === 0) {
    return (
      <div className="text-center py-6" style={{ color: 'var(--muted)' }}>
        <Calendar size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-xs">No relationship history yet</p>
      </div>
    );
  }

  // Group by month
  const grouped: { month: string; events: TimelineEvent[] }[] = [];
  for (const ev of events) {
    const month = new Date(ev.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    const existing = grouped.find(g => g.month === month);
    if (existing) existing.events.push(ev);
    else grouped.push({ month, events: [ev] });
  }

  // Engagement intensity (touchpoints per month over last 6 months)
  const sixMonthsAgo = Date.now() - 180 * 86400000;
  const recentTPs = touchpoints.filter(tp => new Date(tp.date).getTime() >= sixMonthsAgo);
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth();
    const year = d.getFullYear();
    const count = recentTPs.filter(tp => {
      const tpd = new Date(tp.date);
      return tpd.getMonth() === month && tpd.getFullYear() === year;
    }).length;
    return { label: d.toLocaleDateString('en-US', { month: 'short' }), count };
  });
  const maxBucket = Math.max(...monthBuckets.map(b => b.count), 1);

  return (
    <div>
      {/* Engagement Heatmap */}
      <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--background)' }}>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
          Engagement Intensity (6 months)
        </div>
        <div className="flex items-end gap-1 h-8">
          {monthBuckets.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${Math.max((b.count / maxBucket) * 100, b.count > 0 ? 15 : 4)}%`,
                  background: b.count === 0 ? 'var(--border)' : b.count >= 3 ? 'var(--success)' : b.count >= 1 ? 'var(--accent)' : 'var(--border)',
                  minHeight: 2,
                }}
                title={`${b.label}: ${b.count} touchpoints`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {monthBuckets.map((b, i) => (
            <div key={i} className="flex-1 text-center text-[8px]" style={{ color: 'var(--muted)' }}>
              {b.label}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px" style={{ background: 'var(--border)' }} />

        {grouped.map(group => (
          <div key={group.month} className="mb-4">
            <div className="relative flex items-center gap-2 mb-2 ml-8">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                {group.month}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>({group.events.length})</span>
            </div>
            {group.events.map(ev => (
              <div key={ev.id} className="relative flex items-start gap-3 mb-2 group">
                {/* Dot */}
                <div
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2"
                  style={{
                    background: `${ev.color}15`,
                    color: ev.color,
                    borderColor: ev.type === 'stage_change' ? ev.color : 'var(--card)',
                  }}
                >
                  {ev.icon}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{ev.title}</span>
                    <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--muted)' }}>
                      {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {ev.subtitle && (
                    <div className="text-[10px] capitalize" style={{ color: 'var(--muted-foreground)' }}>{ev.subtitle}</div>
                  )}
                  {ev.detail && (
                    <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: 'var(--muted)' }}>{ev.detail}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
