/**
 * Deal Flow Report Generator
 * Generates a comprehensive, print-ready HTML deal flow report for board/IC presentation
 */

import { getTargets, getTouchpoints, getDDProjects, getDDRisks, getActivities, getContacts } from './db';
import { DEAL_STAGES } from './types';
import type { DealStage } from './types';

function fmt(n: number, prefix = '$'): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n.toFixed(0)}`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export type ReportPeriod = '7d' | '30d' | '90d' | 'all';

const STAGE_PROBABILITY: Record<DealStage, number> = {
  identified: 0.05, researching: 0.10, contacted: 0.15, nurturing: 0.25,
  loi_submitted: 0.40, loi_signed: 0.60, due_diligence: 0.75, closing: 0.90,
  closed_won: 1.0, closed_lost: 0,
};

export function generateDealFlowReport(period: ReportPeriod = '30d'): string {
  const periodMs = period === '7d' ? 7 * 86400000 : period === '30d' ? 30 * 86400000 : period === '90d' ? 90 * 86400000 : Date.now();
  const periodLabel = period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : period === '90d' ? 'Last 90 Days' : 'All Time';
  const cutoff = Date.now() - periodMs;

  const targets = getTargets();
  const touchpoints = getTouchpoints();
  const ddProjects = getDDProjects();
  const risks = getDDRisks();
  const activities = getActivities(1000);
  const contacts = getContacts();

  const active = targets.filter(t => !['closed_won', 'closed_lost'].includes(t.stage));
  const won = targets.filter(t => t.stage === 'closed_won');
  const lost = targets.filter(t => t.stage === 'closed_lost');
  const closed = [...won, ...lost];

  const periodActivities = activities.filter(a => new Date(a.created_at).getTime() > cutoff);
  const periodTouchpoints = touchpoints.filter(tp => new Date(tp.date).getTime() > cutoff);
  const newTargets = targets.filter(t => new Date(t.created_at).getTime() > cutoff);
  const stageChanges = periodActivities.filter(a => a.type === 'stage_changed');

  const totalPipelineValue = active.reduce((s, t) => s + (t.asking_price || 0), 0);
  const weightedPipelineValue = active.reduce((s, t) => s + (t.asking_price || 0) * STAGE_PROBABILITY[t.stage], 0);
  const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0;
  const proprietaryPct = targets.length > 0 ? Math.round((targets.filter(t => t.source === 'proprietary').length / targets.length) * 100) : 0;

  // Stale deals
  const staleDeals = active.filter(t => {
    const days = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000);
    return days > 30;
  }).sort((a, b) => new Date(a.stage_entered_at).getTime() - new Date(b.stage_entered_at).getTime());

  // Overdue follow-ups
  const overdueFollowups = touchpoints.filter(tp => tp.follow_up_date && new Date(tp.follow_up_date) < new Date()).map(tp => ({
    ...tp,
    targetName: targets.find(t => t.id === tp.target_id)?.name || 'Unknown',
    daysOverdue: Math.floor((Date.now() - new Date(tp.follow_up_date!).getTime()) / 86400000),
  })).sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Top prospects
  const topProspects = [...active]
    .filter(t => t.weighted_score)
    .sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0))
    .slice(0, 5);

  // Pipeline by stage
  const pipelineByStage = DEAL_STAGES.map(s => ({
    ...s,
    count: targets.filter(t => t.stage === s.key).length,
    value: targets.filter(t => t.stage === s.key).reduce((sum, t) => sum + (t.asking_price || 0), 0),
    prob: STAGE_PROBABILITY[s.key],
  })).filter(s => s.count > 0);

  // Touchpoints by type
  const tpByType = ['email', 'call', 'meeting', 'note', 'linkedin', 'conference', 'other']
    .map(type => ({ type, count: periodTouchpoints.filter(t => t.type === type).length }))
    .filter(t => t.count > 0);

  // Sourcing
  const sources = ['proprietary', 'broker', 'inbound', 'referral', 'other'] as const;
  const sourcingData = sources.map(src => ({
    source: src,
    total: targets.filter(t => t.source === src).length,
    active: active.filter(t => t.source === src).length,
    won: won.filter(t => t.source === src).length,
    rate: (() => {
      const srcClosed = closed.filter(t => t.source === src);
      return srcClosed.length > 0 ? Math.round((won.filter(t => t.source === src).length / srcClosed.length) * 100) : 0;
    })(),
  })).filter(s => s.total > 0);

  // Open risks
  const openRisks = risks.filter(r => r.status === 'open' || r.status === 'mitigating')
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  const dateRange = `${new Date(cutoff).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Deal Flow Report - ${esc(periodLabel)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; background: #fff; line-height: 1.5; }
  .header { background: linear-gradient(135deg, #1e3a5f, #0f2644); color: white; padding: 40px; text-align: center; }
  .header h1 { font-size: 28px; margin-bottom: 8px; }
  .header .subtitle { font-size: 14px; opacity: 0.8; }
  .header .date { font-size: 12px; opacity: 0.6; margin-top: 4px; }
  .container { max-width: 900px; margin: 0 auto; padding: 30px; }
  .section { margin-bottom: 30px; page-break-inside: avoid; }
  .section h2 { font-size: 16px; color: #1e3a5f; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 16px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
  .kpi .value { font-size: 24px; font-weight: 700; font-family: 'SF Mono', monospace; }
  .kpi .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  .kpi .sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .green { color: #10b981; }
  .red { color: #ef4444; }
  .blue { color: #3b82f6; }
  .orange { color: #f59e0b; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
  tr:nth-child(even) td { background: #fafbfc; }
  .mono { font-family: 'SF Mono', 'Cascadia Code', monospace; }
  .bold { font-weight: 700; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .bar-container { height: 16px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .bar { height: 100%; border-radius: 4px; }
  .footer { text-align: center; font-size: 10px; color: #94a3b8; padding: 20px; border-top: 1px solid #e2e8f0; margin-top: 40px; }
  .alert { background: #fef3c7; border: 1px solid #f59e0b33; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
  .alert-title { font-weight: 600; font-size: 13px; color: #92400e; }
  .alert-body { font-size: 12px; color: #78350f; margin-top: 4px; }
  @media print {
    body { font-size: 11px; }
    .header { padding: 24px; }
    .no-print { display: none !important; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>Deal Flow Report</h1>
  <div class="subtitle">${esc(periodLabel)} · ${esc(dateRange)}</div>
  <div class="date">Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>

<div class="no-print" style="text-align:center;padding:12px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
  <button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:8px 24px;border-radius:6px;cursor:pointer;font-size:13px">Print Report</button>
</div>

<div class="container">

<!-- Executive Summary KPIs -->
<div class="section">
  <h2>Executive Summary</h2>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="value blue">${active.length}</div>
      <div class="label">Active Pipeline</div>
      <div class="sub">${targets.length} total targets</div>
    </div>
    <div class="kpi">
      <div class="value green">${fmt(totalPipelineValue)}</div>
      <div class="label">Pipeline Value</div>
      <div class="sub">Weighted: ${fmt(weightedPipelineValue)}</div>
    </div>
    <div class="kpi">
      <div class="value">${newTargets.length}</div>
      <div class="label">New Targets (Period)</div>
      <div class="sub">${stageChanges.length} stage changes</div>
    </div>
    <div class="kpi">
      <div class="value ${winRate >= 25 ? 'green' : 'orange'}">${winRate}%</div>
      <div class="label">Win Rate</div>
      <div class="sub">${won.length} won / ${closed.length} closed</div>
    </div>
    <div class="kpi">
      <div class="value ${proprietaryPct >= 60 ? 'green' : 'orange'}">${proprietaryPct}%</div>
      <div class="label">Proprietary Sourcing</div>
      <div class="sub">Target: 60-70%</div>
    </div>
    <div class="kpi">
      <div class="value">${periodTouchpoints.length}</div>
      <div class="label">Touchpoints (Period)</div>
      <div class="sub">${contacts.length} total contacts</div>
    </div>
  </div>
</div>

<!-- Pipeline by Stage -->
<div class="section">
  <h2>Pipeline by Stage</h2>
  <table>
    <thead>
      <tr>
        <th>Stage</th>
        <th class="text-center">Deals</th>
        <th class="text-right">Raw Value</th>
        <th class="text-center">Prob.</th>
        <th class="text-right">Weighted Value</th>
      </tr>
    </thead>
    <tbody>
      ${pipelineByStage.map(s => `
      <tr>
        <td><span class="dot" style="background:${s.color}"></span>${esc(s.label)}</td>
        <td class="text-center mono">${s.count}</td>
        <td class="text-right mono">${s.value > 0 ? fmt(s.value) : '—'}</td>
        <td class="text-center mono">${Math.round(s.prob * 100)}%</td>
        <td class="text-right mono bold">${s.value > 0 ? fmt(s.value * s.prob) : '—'}</td>
      </tr>`).join('')}
    </tbody>
    <tfoot>
      <tr style="border-top:2px solid #e2e8f0">
        <td class="bold">Total</td>
        <td class="text-center mono bold">${targets.length}</td>
        <td class="text-right mono bold">${fmt(totalPipelineValue)}</td>
        <td class="text-center mono">${totalPipelineValue > 0 ? `${Math.round((weightedPipelineValue / totalPipelineValue) * 100)}%` : '—'}</td>
        <td class="text-right mono bold green">${fmt(weightedPipelineValue)}</td>
      </tr>
    </tfoot>
  </table>
</div>

<!-- Activity Summary -->
${periodTouchpoints.length > 0 ? `
<div class="section">
  <h2>Activity Summary (${esc(periodLabel)})</h2>
  <table>
    <thead>
      <tr><th>Activity Type</th><th class="text-center">Count</th><th>Distribution</th></tr>
    </thead>
    <tbody>
      ${tpByType.map(t => `
      <tr>
        <td style="text-transform:capitalize">${esc(t.type)}s</td>
        <td class="text-center mono bold">${t.count}</td>
        <td><div class="bar-container"><div class="bar" style="width:${Math.max((t.count / Math.max(...tpByType.map(x => x.count), 1)) * 100, 8)}%;background:#3b82f6"></div></div></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- Sourcing Analysis -->
<div class="section">
  <h2>Sourcing Analysis</h2>
  <table>
    <thead>
      <tr><th>Source</th><th class="text-center">Total</th><th class="text-center">Active</th><th class="text-center">Won</th><th class="text-center">Win Rate</th></tr>
    </thead>
    <tbody>
      ${sourcingData.map(s => `
      <tr>
        <td style="text-transform:capitalize">${esc(s.source)}</td>
        <td class="text-center mono">${s.total}</td>
        <td class="text-center mono">${s.active}</td>
        <td class="text-center mono green">${s.won}</td>
        <td class="text-center mono bold">${s.rate > 0 ? `${s.rate}%` : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- Top Prospects -->
${topProspects.length > 0 ? `
<div class="section">
  <h2>Top Prospects</h2>
  <table>
    <thead>
      <tr><th>Target</th><th>Vertical</th><th>Stage</th><th class="text-right">Revenue</th><th class="text-center">Score</th><th class="text-right">Value</th></tr>
    </thead>
    <tbody>
      ${topProspects.map(t => {
        const stage = DEAL_STAGES.find(s => s.key === t.stage);
        return `
      <tr>
        <td class="bold">${esc(t.name)}</td>
        <td>${esc(t.vertical)}</td>
        <td><span class="badge badge-blue">${stage?.label || t.stage}</span></td>
        <td class="text-right mono">${t.revenue ? fmt(t.revenue) : '—'}</td>
        <td class="text-center mono bold ${(t.weighted_score || 0) >= 3.5 ? 'green' : 'orange'}">${(t.weighted_score || 0).toFixed(1)}</td>
        <td class="text-right mono">${t.asking_price ? fmt(t.asking_price) : '—'}</td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- Stale Deals Alert -->
${staleDeals.length > 0 ? `
<div class="section">
  <h2>⚠ Stale Deals Requiring Attention</h2>
  <div class="alert">
    <div class="alert-title">${staleDeals.length} deal${staleDeals.length > 1 ? 's' : ''} stagnant for 30+ days</div>
    <div class="alert-body">These targets have not progressed and may need re-engagement or disposition.</div>
  </div>
  <table>
    <thead>
      <tr><th>Target</th><th>Stage</th><th class="text-center">Days in Stage</th><th class="text-right">Value</th></tr>
    </thead>
    <tbody>
      ${staleDeals.slice(0, 10).map(t => {
        const days = Math.floor((Date.now() - new Date(t.stage_entered_at).getTime()) / 86400000);
        const stage = DEAL_STAGES.find(s => s.key === t.stage);
        return `
      <tr>
        <td class="bold">${esc(t.name)}</td>
        <td><span class="badge ${days > 60 ? 'badge-red' : 'badge-yellow'}">${stage?.label || t.stage}</span></td>
        <td class="text-center mono bold ${days > 60 ? 'red' : 'orange'}">${days}d</td>
        <td class="text-right mono">${t.asking_price ? fmt(t.asking_price) : '—'}</td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- Overdue Follow-ups -->
${overdueFollowups.length > 0 ? `
<div class="section">
  <h2>Overdue Follow-ups</h2>
  <table>
    <thead>
      <tr><th>Target</th><th>Subject</th><th class="text-center">Days Overdue</th><th>Follow-up Notes</th></tr>
    </thead>
    <tbody>
      ${overdueFollowups.slice(0, 10).map(tp => `
      <tr>
        <td class="bold">${esc(tp.targetName)}</td>
        <td>${esc(tp.subject)}</td>
        <td class="text-center mono bold red">${tp.daysOverdue}d</td>
        <td style="font-size:11px;color:#64748b">${esc(tp.follow_up_notes || '—')}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- Risk Summary -->
${openRisks.length > 0 ? `
<div class="section">
  <h2>Open Risks Across DD Projects</h2>
  <table>
    <thead>
      <tr><th>Risk</th><th>Category</th><th class="text-center">Impact</th><th class="text-center">Prob.</th><th class="text-center">Score</th><th>Status</th></tr>
    </thead>
    <tbody>
      ${openRisks.slice(0, 10).map(r => {
        const project = ddProjects.find(p => p.id === r.project_id);
        return `
      <tr>
        <td>
          <div class="bold">${esc(r.title)}</div>
          ${project ? `<div style="font-size:10px;color:#94a3b8">${esc(project.target_name)}</div>` : ''}
        </td>
        <td style="text-transform:capitalize">${esc(r.category)}</td>
        <td class="text-center mono">${r.impact}/5</td>
        <td class="text-center mono">${r.probability}/5</td>
        <td class="text-center mono bold ${(r.risk_score || 0) >= 15 ? 'red' : (r.risk_score || 0) >= 10 ? 'orange' : ''}">${r.risk_score || '?'}</td>
        <td><span class="badge ${r.status === 'mitigating' ? 'badge-yellow' : 'badge-red'}" style="text-transform:capitalize">${r.status}</span></td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>` : ''}

</div>

<div class="footer">
  CONFIDENTIAL — For Internal Use Only<br>
  Generated by DealForge · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
</div>

</body>
</html>`;
}
