// ============================================================
// DealForge Notification / Alert System
// Computes badges and alerts from current data state
// ============================================================

import { getTargets, getTouchpoints, getInfoRequests, getDDProjects, getContacts } from './db';
import type { Target, InformationRequest } from './types';

export interface NotificationCounts {
  staleDeals: number;
  overdueFollowUps: number;
  overdueIRLs: number;
  activeDD: number;
  targetsWithoutContacts: number;
  total: number;
}

export interface Alert {
  id: string;
  type: 'stale_deal' | 'overdue_followup' | 'overdue_irl' | 'dd_blocked';
  severity: 'warning' | 'danger';
  title: string;
  description: string;
  targetId?: string;
  targetName?: string;
  href: string;
}

export function getNotificationCounts(): NotificationCounts {
  const targets = getTargets();
  const now = Date.now();

  // Stale deals: in an active stage for >30 days
  const activeStages = ['identified', 'researching', 'contacted', 'nurturing', 'loi_submitted', 'loi_signed', 'due_diligence', 'closing'];
  const staleDeals = targets.filter(t =>
    activeStages.includes(t.stage) &&
    (now - new Date(t.stage_entered_at).getTime()) > 30 * 86400000
  ).length;

  // Overdue follow-ups
  const touchpoints = getTouchpoints();
  const overdueFollowUps = touchpoints.filter(tp =>
    tp.follow_up_date &&
    new Date(tp.follow_up_date).getTime() < now
  ).length;

  // Overdue IRLs
  const irls = getInfoRequests();
  const overdueIRLs = irls.filter(ir =>
    (ir.status === 'sent' || ir.status === 'draft') &&
    ir.due_date &&
    new Date(ir.due_date).getTime() < now
  ).length;

  // Active DD projects
  const activeDD = getDDProjects().filter(p => p.status !== 'complete').length;

  // Targets without contacts (in active stages beyond 'identified')
  const allContacts = getContacts();
  const advancedStages = ['contacted', 'nurturing', 'loi_submitted', 'loi_signed', 'due_diligence', 'closing'];
  const targetsWithoutContacts = targets.filter(t =>
    advancedStages.includes(t.stage) &&
    allContacts.filter(c => c.target_id === t.id).length === 0
  ).length;

  return {
    staleDeals,
    overdueFollowUps,
    overdueIRLs,
    activeDD,
    targetsWithoutContacts,
    total: staleDeals + overdueFollowUps + overdueIRLs + targetsWithoutContacts,
  };
}

export function getAlerts(): Alert[] {
  const targets = getTargets();
  const touchpoints = getTouchpoints();
  const irls = getInfoRequests();
  const now = Date.now();
  const alerts: Alert[] = [];

  // Stale deals
  const activeStages = ['identified', 'researching', 'contacted', 'nurturing', 'loi_submitted', 'loi_signed', 'due_diligence', 'closing'];
  for (const t of targets) {
    if (!activeStages.includes(t.stage)) continue;
    const days = Math.floor((now - new Date(t.stage_entered_at).getTime()) / 86400000);
    if (days > 30) {
      alerts.push({
        id: `stale-${t.id}`,
        type: 'stale_deal',
        severity: days > 60 ? 'danger' : 'warning',
        title: `${t.name} stale for ${days} days`,
        description: `In "${t.stage}" stage for ${days} days without progression.`,
        targetId: t.id,
        targetName: t.name,
        href: `/targets/${t.id}`,
      });
    }
  }

  // Overdue follow-ups
  for (const tp of touchpoints) {
    if (!tp.follow_up_date) continue;
    const followUpDate = new Date(tp.follow_up_date).getTime();
    if (followUpDate < now) {
      const days = Math.floor((now - followUpDate) / 86400000);
      const target = targets.find(t => t.id === tp.target_id);
      alerts.push({
        id: `followup-${tp.id}`,
        type: 'overdue_followup',
        severity: days > 7 ? 'danger' : 'warning',
        title: `Overdue follow-up: ${tp.subject}`,
        description: `Follow-up was due ${days} days ago${target ? ` for ${target.name}` : ''}.`,
        targetId: tp.target_id,
        targetName: target?.name,
        href: `/targets/${tp.target_id}`,
      });
    }
  }

  // Overdue IRLs
  for (const ir of irls) {
    if (!ir.due_date || ir.status === 'complete') continue;
    const dueDate = new Date(ir.due_date).getTime();
    if (dueDate < now && (ir.status === 'sent' || ir.status === 'draft')) {
      const days = Math.floor((now - dueDate) / 86400000);
      alerts.push({
        id: `irl-${ir.id}`,
        type: 'overdue_irl',
        severity: 'danger',
        title: `Overdue IRL #${ir.request_number}: ${ir.title}`,
        description: `Information request was due ${days} days ago.`,
        href: '/diligence',
      });
    }
  }

  // Targets without contacts in advanced stages
  const allContacts = getContacts();
  const advancedStages = ['contacted', 'nurturing', 'loi_submitted', 'loi_signed', 'due_diligence', 'closing'];
  for (const t of targets) {
    if (!advancedStages.includes(t.stage)) continue;
    if (allContacts.filter(c => c.target_id === t.id).length === 0) {
      alerts.push({
        id: `nocontact-${t.id}`,
        type: 'stale_deal',
        severity: 'warning',
        title: `${t.name}: no contacts`,
        description: `Target is in "${t.stage}" stage but has no contacts tracked.`,
        targetId: t.id,
        targetName: t.name,
        href: `/targets/${t.id}`,
      });
    }
  }

  // Sort by severity then date
  return alerts.sort((a, b) => {
    if (a.severity === 'danger' && b.severity !== 'danger') return -1;
    if (a.severity !== 'danger' && b.severity === 'danger') return 1;
    return 0;
  });
}
