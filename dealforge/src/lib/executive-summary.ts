/**
 * Executive Summary / Weekly Digest Generator
 * Generates a print-ready HTML executive summary of M&A pipeline activity
 */

import { getTargets, getTouchpoints, getDDProjects, getDDRisks, getActivities, getContacts } from './db';
import { DEAL_STAGES } from './types';

function fmt(n: number, prefix = '$'): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n.toFixed(0)}`;
}

export type DigestPeriod = '7d' | '14d' | '30d';

export function generateExecutiveSummary(period: DigestPeriod = '7d'): string {
  const periodMs = period === '7d' ? 7 * 86400000 : period === '14d' ? 14 * 86400000 : 30 * 86400000;
  const periodLabel = period === '7d' ? 'Weekly' : period === '14d' ? 'Bi-Weekly' : 'Monthly';
  const cutoff = Date.now() - periodMs;

  const targets = getTargets();
  const touchpoints = getTouchpoints();
  const ddProjects = getDDProjects();
  const risks = getDDRisks();
  const activities = getActivities(500);
  const contacts = getContacts();

  const periodActivities = activities.filter(a => new Date(a.created_at).getTime() > cutoff);
  const periodTouchpoints = touchpoints.filter(tp => new Date(tp.date).getTime() > cutoff);

  const active = targets.filter(t => !['closed_won', 'closed_lost'].includes(t.stage));
  const closedWon = targets.filter(t => t.stage === 'closed_won');

  // Period metrics
  const newTargets = periodActivities.filter(a => a.type === 'target_created');
  const stageChanges = periodActivities.filter(a => a.type === 'stage_changed');
  const ddTasksDone = periodActivities.filter(a => a.type === 'dd_task_completed');
  const newRisks = periodActivities.filter(a => a.type === 'dd_risk_added');

  // Pipeline value
  const totalPipelineValue = active.reduce((s, t) => s + (t.asking_price || 0), 0);

  // Active DD
  const activeDD = ddProjects.filter(p => p.status !== 'complete');
  const criticalRisks = risks.filter(r => (r.risk_score || 0) >= 15 && r.status !== 'closed');

  // Stale deals
  const staleDeals = active.filter(t => {
    const days = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000);
    return days > 30;
  });

  // Overdue follow-ups
  const overdueFollowups = touchpoints.filter(tp => tp.follow_up_date && new Date(tp.follow_up_date).getTime() < Date.now());

  // Stage progression detail
  const stageDetail = stageChanges.map(a => {
    const target = targets.find(t => t.id === a.target_id);
    const from = DEAL_STAGES.find(s => s.key === a.metadata?.from);
    const to = DEAL_STAGES.find(s => s.key === a.metadata?.to);
    return { target: target?.name || a.target_name || 'Unknown', from: from?.label || a.metadata?.from, to: to?.label || a.metadata?.to, color: to?.color || '#666' };
  });

  // Pipeline by stage
  const stageBreakdown = DEAL_STAGES
    .map(s => ({ ...s, count: targets.filter(t => t.stage === s.key).length, value: targets.filter(t => t.stage === s.key).reduce((sum, t) => sum + (t.asking_price || 0), 0) }))
    .filter(s => s.count > 0);

  // Top 5 targets by score
  const topTargets = [...active]
    .filter(t => t.weighted_score)
    .sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0))
    .slice(0, 5);

  // Engagement: touchpoints by type
  const tpByType: Record<string, number> = {};
  periodTouchpoints.forEach(tp => { tpByType[tp.type] = (tpByType[tp.type] || 0) + 1; });

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const periodStart = new Date(cutoff).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const periodEnd = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${periodLabel} Executive Summary - DealForge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1a1a2e; line-height: 1.5; padding: 40px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 14px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; margin: 24px 0 12px 0; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px double #333; }
    .header .subtitle { color: #666; font-size: 13px; margin-top: 4px; }
    .header .date { color: #999; font-size: 11px; margin-top: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin: 16px 0; }
    .kpi { padding: 12px 8px; background: #f8fafc; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
    .kpi .value { font-size: 20px; font-weight: 700; font-family: 'SF Mono', Consolas, monospace; }
    .kpi .label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    th { color: #64748b; font-weight: 600; font-size: 9px; text-transform: uppercase; background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; }
    .text-muted { color: #64748b; }
    .text-success { color: #10b981; }
    .text-warning { color: #f59e0b; }
    .text-danger { color: #ef4444; }
    .text-bold { font-weight: 600; }
    .callout { padding: 12px; border-radius: 8px; margin: 12px 0; }
    .callout-warn { background: #fffbeb; border-left: 4px solid #f59e0b; }
    .callout-danger { background: #fef2f2; border-left: 4px solid #ef4444; }
    .callout-info { background: #eff6ff; border-left: 4px solid #3b82f6; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 3px double #333; text-align: center; color: #94a3b8; font-size: 9px; }
    .bar { height: 6px; border-radius: 3px; background: #e5e7eb; margin: 4px 0; }
    .bar-fill { height: 100%; border-radius: 3px; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }
    @media print { .no-print { display: none; } body { padding: 20px; } }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

  <div class="header">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.3em; color: #999;">M&A Pipeline</div>
    <h1>${periodLabel} Executive Summary</h1>
    <div class="subtitle">${periodStart} — ${periodEnd}</div>
    <div class="date">Generated: ${today}</div>
  </div>

  <h2>Pipeline Snapshot</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="value">${active.length}</div><div class="label">Active Targets</div></div>
    <div class="kpi"><div class="value">${fmt(totalPipelineValue)}</div><div class="label">Pipeline Value</div></div>
    <div class="kpi"><div class="value">${closedWon.length}</div><div class="label">Closed Won</div></div>
    <div class="kpi"><div class="value">${activeDD.length}</div><div class="label">Active DD</div></div>
    <div class="kpi"><div class="value">${criticalRisks.length}</div><div class="label">Critical Risks</div></div>
    <div class="kpi"><div class="value">${contacts.length}</div><div class="label">Contacts</div></div>
  </div>

  <h2>Period Activity (${periodStart} — ${periodEnd})</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="value" style="color: #10b981">${newTargets.length}</div><div class="label">New Targets</div></div>
    <div class="kpi"><div class="value" style="color: #3b82f6">${stageChanges.length}</div><div class="label">Stage Changes</div></div>
    <div class="kpi"><div class="value" style="color: #8b5cf6">${periodTouchpoints.length}</div><div class="label">Touchpoints</div></div>
    <div class="kpi"><div class="value" style="color: #10b981">${ddTasksDone.length}</div><div class="label">DD Tasks Done</div></div>
    <div class="kpi"><div class="value" style="color: ${newRisks.length > 0 ? '#ef4444' : '#94a3b8'}">${newRisks.length}</div><div class="label">Risks Flagged</div></div>
    <div class="kpi"><div class="value" style="color: ${overdueFollowups.length > 0 ? '#ef4444' : '#94a3b8'}">${overdueFollowups.length}</div><div class="label">Overdue F/U</div></div>
  </div>

  ${Object.keys(tpByType).length > 0 ? `
  <div style="margin: 8px 0; font-size: 10px; color: #64748b;">
    Engagement breakdown: ${Object.entries(tpByType).map(([k, v]) => `${v} ${k}${v > 1 ? 's' : ''}`).join(', ')}
  </div>
  ` : ''}

  ${stageDetail.length > 0 ? `
  <h2>Stage Progression</h2>
  <table>
    <tr><th>Target</th><th>From</th><th></th><th>To</th></tr>
    ${stageDetail.map(s => `<tr><td class="text-bold">${s.target}</td><td>${s.from || '—'}</td><td style="text-align:center;">→</td><td><span class="badge" style="background: ${s.color}20; color: ${s.color};">${s.to || '—'}</span></td></tr>`).join('\n')}
  </table>
  ` : ''}

  <div class="two-col">
    <div>
      <h2>Pipeline by Stage</h2>
      <table>
        <tr><th>Stage</th><th style="text-align:right">Count</th><th style="text-align:right">Value</th></tr>
        ${stageBreakdown.map(s => `<tr><td><span class="badge" style="background: ${s.color}20; color: ${s.color};">${s.label}</span></td><td style="text-align:right" class="text-bold">${s.count}</td><td style="text-align:right">${s.value > 0 ? fmt(s.value) : '—'}</td></tr>`).join('\n')}
        <tr style="border-top: 2px solid #333;"><td class="text-bold">Total</td><td style="text-align:right" class="text-bold">${targets.length}</td><td style="text-align:right" class="text-bold">${fmt(totalPipelineValue)}</td></tr>
      </table>
    </div>

    <div>
      ${topTargets.length > 0 ? `
      <h2>Top Scored Targets</h2>
      <table>
        <tr><th>#</th><th>Target</th><th>Vertical</th><th style="text-align:right">Score</th></tr>
        ${topTargets.map((t, i) => `<tr><td>${i + 1}</td><td class="text-bold">${t.name}</td><td class="text-muted">${t.vertical}</td><td style="text-align:right; color: ${(t.weighted_score || 0) >= 4 ? '#10b981' : (t.weighted_score || 0) >= 3 ? '#f59e0b' : '#ef4444'}; font-weight: bold;">${t.weighted_score?.toFixed(1)}</td></tr>`).join('\n')}
      </table>
      ` : ''}
    </div>
  </div>

  ${staleDeals.length > 0 ? `
  <div class="callout callout-warn">
    <strong>⚠ Stale Deals (${staleDeals.length})</strong> — Targets sitting in the same stage for over 30 days:
    <ul style="margin-top: 6px; padding-left: 16px;">
      ${staleDeals.slice(0, 5).map(t => {
        const days = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000);
        const stage = DEAL_STAGES.find(s => s.key === t.stage);
        return `<li>${t.name} — ${stage?.label} for ${days} days</li>`;
      }).join('\n')}
    </ul>
  </div>
  ` : ''}

  ${criticalRisks.length > 0 ? `
  <div class="callout callout-danger">
    <strong>🔴 Critical Risks (${criticalRisks.length})</strong>
    <ul style="margin-top: 6px; padding-left: 16px;">
      ${criticalRisks.slice(0, 5).map(r => `<li>${r.title} — Score: ${r.risk_score} (${r.category})${r.mitigation ? ` | Mitigation: ${r.mitigation}` : ''}</li>`).join('\n')}
    </ul>
  </div>
  ` : ''}

  ${overdueFollowups.length > 0 ? `
  <div class="callout callout-danger">
    <strong>📅 Overdue Follow-ups (${overdueFollowups.length})</strong>
    <ul style="margin-top: 6px; padding-left: 16px;">
      ${overdueFollowups.slice(0, 5).map(tp => {
        const target = targets.find(t => t.id === tp.target_id);
        const days = Math.floor((Date.now() - new Date(tp.follow_up_date!).getTime()) / 86400000);
        return `<li>${target?.name || 'Unknown'}: ${tp.subject} — ${days}d overdue</li>`;
      }).join('\n')}
    </ul>
  </div>
  ` : ''}

  ${activeDD.length > 0 ? `
  <h2>Due Diligence Status</h2>
  <table>
    <tr><th>Target</th><th>Phase</th><th>Progress</th><th>RAG</th></tr>
    ${activeDD.map(p => `<tr><td class="text-bold">${p.target_name}</td><td style="text-transform: capitalize;">${p.phase}</td><td>
      <div class="bar"><div class="bar-fill" style="width: ${p.overall_progress_pct}%; background: ${p.rag_status === 'green' ? '#10b981' : p.rag_status === 'amber' ? '#f59e0b' : '#ef4444'};"></div></div>
      ${p.overall_progress_pct}%
    </td><td style="color: ${p.rag_status === 'green' ? '#10b981' : p.rag_status === 'amber' ? '#f59e0b' : '#ef4444'}; font-weight: bold; text-transform: uppercase;">${p.rag_status}</td></tr>`).join('\n')}
  </table>
  ` : ''}

  <div class="footer">
    CONFIDENTIAL — ${periodLabel} Executive Summary<br>
    Generated by DealForge | ${today}
  </div>
</body>
</html>`;
}
