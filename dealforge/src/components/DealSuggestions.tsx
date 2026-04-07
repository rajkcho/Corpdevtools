'use client';

import { useMemo } from 'react';
import type { Target, Contact, Touchpoint, DealTerm } from '@/lib/types';
import type { DDProject } from '@/lib/types';
import { Lightbulb, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DealSuggestionsProps {
  target: Target;
  contacts: Contact[];
  touchpoints: Touchpoint[];
  dealTerms: DealTerm[];
  ddProject?: DDProject;
  hasThesis: boolean;
  hasCompetitors: boolean;
  hasSWOT: boolean;
}

interface Suggestion {
  priority: 'high' | 'medium' | 'low';
  category: 'action' | 'data' | 'risk' | 'milestone';
  text: string;
  detail?: string;
}

export default function DealSuggestions({
  target, contacts, touchpoints, dealTerms, ddProject, hasThesis, hasCompetitors, hasSWOT,
}: DealSuggestionsProps) {
  const suggestions = useMemo(() => {
    const items: Suggestion[] = [];
    const stage = target.stage;
    const hasScore = !!target.weighted_score;
    const hasPrimaryContact = contacts.some(c => c.is_primary);
    const hasFinancials = !!(target.revenue || target.arr);
    const daysInStage = Math.floor((Date.now() - new Date(target.stage_entered_at).getTime()) / 86400000);
    const recentTPs = touchpoints.filter(tp => Date.now() - new Date(tp.date).getTime() < 30 * 86400000);
    const hasOverdueFollowup = touchpoints.some(tp => tp.follow_up_date && new Date(tp.follow_up_date) < new Date());

    // Universal suggestions
    if (!hasScore && !['identified'].includes(stage)) {
      items.push({ priority: 'medium', category: 'data', text: 'Score this target', detail: 'Use the VMS scoring wizard to evaluate acquisition criteria' });
    }
    if (contacts.length === 0 && !['identified', 'closed_won', 'closed_lost'].includes(stage)) {
      items.push({ priority: 'high', category: 'data', text: 'Add contacts', detail: 'No contacts on file for this target' });
    }
    if (!hasPrimaryContact && contacts.length > 0) {
      items.push({ priority: 'low', category: 'data', text: 'Set a primary contact', detail: 'Mark one contact as primary for easy reference' });
    }
    if (!hasFinancials && !['identified'].includes(stage)) {
      items.push({ priority: 'medium', category: 'data', text: 'Add financial data', detail: 'Revenue, ARR, and margins needed for valuation' });
    }
    if (hasOverdueFollowup) {
      items.push({ priority: 'high', category: 'action', text: 'Complete overdue follow-up', detail: 'One or more follow-ups are past due' });
    }
    if (daysInStage > 45) {
      items.push({ priority: 'high', category: 'risk', text: 'Deal is stale', detail: `${daysInStage} days in ${stage.replace(/_/g, ' ')} — review and advance or park` });
    } else if (daysInStage > 30) {
      items.push({ priority: 'medium', category: 'risk', text: 'Deal momentum slowing', detail: `${daysInStage} days in current stage` });
    }

    // Stage-specific suggestions
    switch (stage) {
      case 'identified':
        items.push({ priority: 'medium', category: 'action', text: 'Research the company', detail: 'Review website, LinkedIn, industry reports to assess fit' });
        if (!target.description) {
          items.push({ priority: 'low', category: 'data', text: 'Add a company description', detail: 'Helps with context when reviewing later' });
        }
        break;

      case 'researching':
        if (recentTPs.length === 0) {
          items.push({ priority: 'medium', category: 'action', text: 'Begin outreach', detail: 'Ready to initiate contact — use Outreach templates' });
        }
        if (!hasThesis) {
          items.push({ priority: 'low', category: 'data', text: 'Draft an investment thesis', detail: 'Even a preliminary thesis helps focus the approach' });
        }
        break;

      case 'contacted':
        if (recentTPs.length === 0) {
          items.push({ priority: 'high', category: 'action', text: 'Follow up on initial outreach', detail: 'No recent touchpoints — the contact may have gone cold' });
        }
        items.push({ priority: 'medium', category: 'milestone', text: 'Schedule introductory call', detail: 'Move toward a face-to-face or video meeting' });
        break;

      case 'nurturing':
        if (!hasThesis) {
          items.push({ priority: 'medium', category: 'data', text: 'Document investment thesis', detail: 'Important before advancing to LOI stage' });
        }
        if (!hasCompetitors) {
          items.push({ priority: 'low', category: 'data', text: 'Map competitive landscape', detail: 'Understand competitive positioning before making an offer' });
        }
        if (recentTPs.length < 2) {
          items.push({ priority: 'medium', category: 'action', text: 'Increase engagement', detail: 'Nurturing stage benefits from regular touchpoints (2+ per month)' });
        }
        if (!target.asking_price && hasFinancials) {
          items.push({ priority: 'medium', category: 'data', text: 'Establish valuation range', detail: 'Use the Valuation Calculator to model scenarios' });
        }
        break;

      case 'loi_submitted':
        items.push({ priority: 'high', category: 'action', text: 'Follow up on LOI response', detail: 'Check with seller/broker on LOI review timeline' });
        if (dealTerms.length === 0) {
          items.push({ priority: 'medium', category: 'data', text: 'Document proposed terms', detail: 'Record key deal terms in the Deal Room' });
        }
        break;

      case 'loi_signed':
        if (!ddProject) {
          items.push({ priority: 'high', category: 'action', text: 'Start due diligence project', detail: 'LOI is signed — initiate formal DD process' });
        }
        items.push({ priority: 'medium', category: 'milestone', text: 'Send Information Request List', detail: 'Generate and send IRL to seller' });
        break;

      case 'due_diligence':
        if (ddProject && ddProject.overall_progress_pct < 50) {
          items.push({ priority: 'medium', category: 'action', text: 'Accelerate DD progress', detail: `DD is ${ddProject.overall_progress_pct}% complete — ensure workstreams are on track` });
        }
        if (!hasSWOT) {
          items.push({ priority: 'low', category: 'data', text: 'Complete SWOT analysis', detail: 'Document findings for IC presentation' });
        }
        items.push({ priority: 'medium', category: 'milestone', text: 'Prepare IC memo', detail: 'Generate Investment Committee memorandum for approval' });
        break;

      case 'closing':
        items.push({ priority: 'high', category: 'milestone', text: 'Finalize definitive agreement', detail: 'Work with legal counsel to close documentation' });
        items.push({ priority: 'medium', category: 'action', text: 'Prepare integration plan', detail: 'Start planning 100-day integration checklist' });
        break;

      case 'closed_won':
        items.push({ priority: 'medium', category: 'action', text: 'Execute 100-day integration plan', detail: 'Switch to the Integration tab to track post-close activities' });
        break;
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 6);
  }, [target, contacts, touchpoints, dealTerms, ddProject, hasThesis, hasCompetitors, hasSWOT]);

  if (suggestions.length === 0) return null;

  const iconMap = {
    action: <ArrowRight size={12} />,
    data: <Lightbulb size={12} />,
    risk: <AlertTriangle size={12} />,
    milestone: <CheckCircle2 size={12} />,
  };

  const colorMap = {
    high: 'var(--danger)',
    medium: 'var(--warning)',
    low: 'var(--muted-foreground)',
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
        <Lightbulb size={12} /> Suggested Next Steps
      </h3>
      <div className="space-y-1.5">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'var(--background)' }}>
            <span className="mt-0.5 flex-shrink-0" style={{ color: colorMap[s.priority] }}>
              {iconMap[s.category]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{s.text}</div>
              {s.detail && <div className="text-[10px]" style={{ color: 'var(--muted)' }}>{s.detail}</div>}
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{
              background: `${colorMap[s.priority]}15`,
              color: colorMap[s.priority],
            }}>
              {s.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
