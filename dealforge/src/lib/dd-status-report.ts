/**
 * DD Status Report — HTML Generator
 * Generates a print-ready HTML due diligence status report
 */

import {
  getDDProject, getDDWorkstreams, getDDTasks, getDDRisks,
  getDDFindings, getInfoRequests, getTarget,
} from './db';
import { DD_WORKSTREAMS, DEAL_STAGES } from './types';

function fmt(n?: number): string {
  if (!n) return 'N/A';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function generateDDStatusReport(projectId: string): string {
  const project = getDDProject(projectId);
  if (!project) return '';

  const target = getTarget(project.target_id);
  if (!target) return '';

  const workstreams = getDDWorkstreams(projectId);
  const risks = getDDRisks(projectId);
  const findings = getDDFindings(projectId);
  const requests = getInfoRequests(projectId);

  const stage = DEAL_STAGES.find(s => s.key === target.stage);
  const daysInDD = Math.floor((Date.now() - new Date(project.start_date).getTime()) / 86400000);
  const openRisks = risks.filter(r => r.status !== 'closed');
  const criticalRisks = openRisks.filter(r => (r.risk_score || 0) >= 15);
  const openFindings = findings.filter(f => f.status !== 'resolved' && f.status !== 'accepted');
  const pendingIRLs = requests.filter(r => !['complete', 'received'].includes(r.status));
  const overdueIRLs = requests.filter(r => r.due_date && new Date(r.due_date) < new Date() && !['complete', 'received'].includes(r.status));

  const ragColor = (rag: string) => rag === 'green' ? '#10b981' : rag === 'amber' ? '#f59e0b' : rag === 'red' ? '#ef4444' : '#94a3b8';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DD Status Report — ${target.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1a1a2e; line-height: 1.5; padding: 40px; max-width: 850px; margin: 0 auto; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 14px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; margin: 24px 0 12px 0; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; margin-bottom: 24px; border-bottom: 3px double #333; }
    .rag { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 12px 0; }
    .kpi { padding: 10px; background: #f8fafc; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
    .kpi .value { font-size: 18px; font-weight: 700; font-family: 'SF Mono', Consolas, monospace; }
    .kpi .label { font-size: 9px; color: #64748b; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    th { color: #64748b; font-weight: 600; font-size: 9px; text-transform: uppercase; background: #f8fafc; }
    .progress-bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 3px; }
    .callout { padding: 10px; border-radius: 6px; margin: 10px 0; font-size: 11px; }
    .callout-danger { background: #fef2f2; border-left: 4px solid #ef4444; }
    .callout-warn { background: #fffbeb; border-left: 4px solid #f59e0b; }
    .callout-info { background: #eff6ff; border-left: 4px solid #3b82f6; }
    .text-bold { font-weight: 600; }
    .text-muted { color: #64748b; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 3px double #333; text-align: center; color: #94a3b8; font-size: 9px; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }
    @media print { .no-print { display: none; } body { padding: 20px; } }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

  <div class="header">
    <div>
      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.3em; color: #999;">Due Diligence Status Report</div>
      <h1>${target.name}</h1>
      <div style="color: #666; font-size: 12px;">${target.vertical} | Phase: ${project.phase} | ${daysInDD} days in DD</div>
    </div>
    <div style="text-align: right;">
      <div style="display: flex; align-items: center; gap: 8px; justify-content: flex-end;">
        <span style="font-size: 12px; font-weight: 600;">Overall RAG:</span>
        <span class="rag" style="background: ${ragColor(project.rag_status)}; width: 20px; height: 20px;"></span>
        <span style="font-weight: 700; text-transform: uppercase; color: ${ragColor(project.rag_status)};">${project.rag_status}</span>
      </div>
      <div style="font-size: 12px; margin-top: 8px; font-weight: 700;">${project.overall_progress_pct}% Complete</div>
      <div style="font-size: 10px; color: #999;">Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
  </div>

  <h2>Executive Summary</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="value" style="color: ${ragColor(project.rag_status)}">${project.overall_progress_pct}%</div><div class="label">Progress</div></div>
    <div class="kpi"><div class="value">${workstreams.length}</div><div class="label">Workstreams</div></div>
    <div class="kpi"><div class="value" style="color: ${openRisks.length > 0 ? '#ef4444' : '#10b981'}">${openRisks.length}</div><div class="label">Open Risks</div></div>
    <div class="kpi"><div class="value" style="color: ${openFindings.length > 0 ? '#f59e0b' : '#10b981'}">${openFindings.length}</div><div class="label">Open Findings</div></div>
    <div class="kpi"><div class="value" style="color: ${pendingIRLs.length > 0 ? '#f59e0b' : '#10b981'}">${pendingIRLs.length}</div><div class="label">Pending IRLs</div></div>
  </div>

  ${criticalRisks.length > 0 ? `
  <div class="callout callout-danger">
    <strong>🔴 Critical Risks (${criticalRisks.length})</strong>: ${criticalRisks.map(r => r.title).join(', ')}
  </div>
  ` : ''}

  ${overdueIRLs.length > 0 ? `
  <div class="callout callout-warn">
    <strong>⚠ Overdue Information Requests (${overdueIRLs.length})</strong>: ${overdueIRLs.map(r => r.title).join(', ')}
  </div>
  ` : ''}

  <h2>Workstream Progress</h2>
  <table>
    <tr><th>Workstream</th><th style="text-align:center">RAG</th><th style="width:200px">Progress</th><th style="text-align:center">Tasks</th><th style="text-align:center">Risks</th><th style="text-align:center">Findings</th></tr>
    ${workstreams.map(ws => {
      const tasks = getDDTasks(ws.id);
      const doneTasks = tasks.filter(t => t.status === 'complete' || t.status === 'n_a').length;
      const wsRisks = risks.filter(r => r.workstream_key === ws.key);
      const wsFindings = findings.filter(f => f.workstream_key === ws.key);
      const pct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
      return `<tr>
        <td class="text-bold">${ws.label}</td>
        <td style="text-align:center"><span class="rag" style="background: ${ragColor(ws.rag_status)}"></span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${pct}%; background:${ragColor(ws.rag_status)}"></div></div>
            <span style="font-family: monospace; font-size: 10px; width: 30px; text-align: right;">${pct}%</span>
          </div>
        </td>
        <td style="text-align:center; font-family: monospace;">${doneTasks}/${tasks.length}</td>
        <td style="text-align:center; font-family: monospace; color: ${wsRisks.filter(r => r.status !== 'closed').length > 0 ? '#ef4444' : '#94a3b8'};">${wsRisks.filter(r => r.status !== 'closed').length}</td>
        <td style="text-align:center; font-family: monospace; color: ${wsFindings.filter(f => f.status !== 'resolved').length > 0 ? '#f59e0b' : '#94a3b8'};">${wsFindings.filter(f => f.status !== 'resolved').length}</td>
      </tr>`;
    }).join('\n')}
  </table>

  ${openRisks.length > 0 ? `
  <h2>Risk Register</h2>
  <table>
    <tr><th>Risk</th><th>Category</th><th style="text-align:center">Impact</th><th style="text-align:center">Probability</th><th style="text-align:center">Score</th><th>Status</th><th>Mitigation</th></tr>
    ${openRisks.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).map(r => `<tr>
      <td class="text-bold">${r.title}</td>
      <td style="text-transform: capitalize;">${r.category}</td>
      <td style="text-align:center; font-family: monospace;">${r.impact}</td>
      <td style="text-align:center; font-family: monospace;">${r.probability}</td>
      <td style="text-align:center; font-family: monospace; font-weight: bold; color: ${(r.risk_score || 0) >= 15 ? '#ef4444' : (r.risk_score || 0) >= 9 ? '#f59e0b' : '#10b981'};">${r.risk_score || '?'}</td>
      <td style="text-transform: capitalize;">${r.status}</td>
      <td class="text-muted">${r.mitigation || '—'}</td>
    </tr>`).join('\n')}
  </table>
  ` : '<div class="callout callout-info">No open risks identified.</div>'}

  ${openFindings.length > 0 ? `
  <h2>Key Findings</h2>
  <table>
    <tr><th>Finding</th><th>Workstream</th><th>Severity</th><th>Type</th><th>Status</th></tr>
    ${openFindings.sort((a, b) => {
      const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (sevOrder[a.severity] || 4) - (sevOrder[b.severity] || 4);
    }).map(f => {
      const sevColor = f.severity === 'critical' ? '#ef4444' : f.severity === 'high' ? '#f59e0b' : f.severity === 'medium' ? '#3b82f6' : '#94a3b8';
      return `<tr>
        <td class="text-bold">${f.title}<br><span class="text-muted">${f.description.substring(0, 100)}${f.description.length > 100 ? '...' : ''}</span></td>
        <td style="text-transform: capitalize;">${f.workstream_key || '—'}</td>
        <td style="color: ${sevColor}; font-weight: 600; text-transform: capitalize;">${f.severity}</td>
        <td style="text-transform: capitalize;">${f.type.replace(/_/g, ' ')}</td>
        <td style="text-transform: capitalize;">${f.status}</td>
      </tr>`;
    }).join('\n')}
  </table>
  ` : ''}

  ${requests.length > 0 ? `
  <h2>Information Request Status</h2>
  <table>
    <tr><th>#</th><th>Request</th><th>Status</th><th>Due Date</th></tr>
    ${requests.map(r => {
      const isOverdue = r.due_date && new Date(r.due_date) < new Date() && !['complete', 'received'].includes(r.status);
      return `<tr>
        <td style="font-family: monospace;">${r.request_number}</td>
        <td class="text-bold">${r.title}</td>
        <td style="text-transform: capitalize; color: ${r.status === 'complete' || r.status === 'received' ? '#10b981' : isOverdue ? '#ef4444' : '#f59e0b'}; font-weight: 600;">${r.status.replace(/_/g, ' ')}${isOverdue ? ' ⚠' : ''}</td>
        <td>${r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}</td>
      </tr>`;
    }).join('\n')}
  </table>
  ` : ''}

  ${target.asking_price ? `
  <h2>Target Financial Summary</h2>
  <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
    <div class="kpi"><div class="value">${fmt(target.revenue)}</div><div class="label">Revenue</div></div>
    <div class="kpi"><div class="value">${fmt(target.arr)}</div><div class="label">ARR</div></div>
    <div class="kpi"><div class="value">${target.recurring_revenue_pct ? target.recurring_revenue_pct + '%' : 'N/A'}</div><div class="label">Recurring %</div></div>
    <div class="kpi"><div class="value">${fmt(target.asking_price)}</div><div class="label">Asking Price</div></div>
  </div>
  ` : ''}

  <div class="footer">
    CONFIDENTIAL — Due Diligence Status Report: ${target.name}<br>
    Phase: ${project.phase} | Generated by DealForge | ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;
}
