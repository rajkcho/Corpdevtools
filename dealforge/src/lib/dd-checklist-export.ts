// ============================================================
// DealForge DD Checklist — Printable HTML Export
// ============================================================

import {
  getDDProject, getDDWorkstreams, getDDTasks, getDDRisks,
  getDDFindings, getInfoRequests, getTarget,
} from './db';
import { DD_WORKSTREAMS } from './types';

export function generateDDChecklist(projectId: string): string {
  const project = getDDProject(projectId);
  if (!project) return '<html><body>Project not found.</body></html>';

  const target = getTarget(project.target_id);
  const workstreams = getDDWorkstreams(projectId);
  const risks = getDDRisks(projectId);
  const findings = getDDFindings(projectId);
  const requests = getInfoRequests(projectId);

  const ragColor = (rag: string) => {
    switch (rag) {
      case 'red': return '#ef4444';
      case 'amber': return '#f59e0b';
      case 'green': return '#10b981';
      default: return '#6b7280';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'complete': return '&#9745;';
      case 'in_progress': return '&#9744;';
      case 'blocked': return '&#9888;';
      case 'n_a': return '&mdash;';
      default: return '&#9744;';
    }
  };

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DD Checklist — ${project.target_name}</title>
  <style>
    @media print {
      body { font-size: 11px; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 24px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e5e5e5; }
    h3 { font-size: 13px; margin: 12px 0 4px; color: #374151; }
    .header { border-bottom: 3px solid #3b82f6; padding-bottom: 12px; margin-bottom: 16px; }
    .meta { color: #6b7280; font-size: 12px; }
    .meta span { margin-right: 16px; }
    .rag { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
    .progress-bar { background: #e5e5e5; border-radius: 4px; height: 6px; overflow: hidden; margin: 4px 0; }
    .progress-fill { height: 100%; border-radius: 4px; background: #3b82f6; }
    .ws-header { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 8px; background: #f9fafb; border-radius: 6px; }
    .ws-header .title { font-weight: 600; font-size: 13px; flex: 1; }
    .ws-header .pct { font-family: monospace; font-size: 12px; }
    .task-group { margin: 8px 0 8px 16px; }
    .task-group-title { font-weight: 600; font-size: 12px; margin-bottom: 4px; color: #374151; }
    .task { font-size: 11px; padding: 2px 0; display: flex; align-items: flex-start; gap: 4px; }
    .task .icon { width: 16px; flex-shrink: 0; text-align: center; }
    .task.complete { color: #9ca3af; text-decoration: line-through; }
    .risk-table, .finding-table, .irl-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
    .risk-table th, .finding-table th, .irl-table th { background: #f3f4f6; text-align: left; padding: 4px 8px; font-weight: 600; border-bottom: 1px solid #e5e5e5; }
    .risk-table td, .finding-table td, .irl-table td { padding: 4px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    .risk-score { font-weight: 700; font-family: monospace; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 9999px; font-size: 10px; font-weight: 500; }
    .print-btn { position: fixed; top: 16px; right: 16px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .print-btn:hover { background: #2563eb; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0; }
    .summary-card { padding: 8px; border: 1px solid #e5e5e5; border-radius: 6px; text-align: center; }
    .summary-card .num { font-size: 20px; font-weight: 700; font-family: monospace; }
    .summary-card .label { font-size: 10px; color: #6b7280; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print Checklist</button>

  <div class="header">
    <h1>Due Diligence Checklist: ${project.target_name}</h1>
    <div class="meta">
      <span>Phase: <strong>${project.phase.charAt(0).toUpperCase() + project.phase.slice(1)}</strong></span>
      <span>Progress: <strong>${project.overall_progress_pct}%</strong></span>
      <span>RAG: <span class="rag" style="background:${ragColor(project.rag_status)}"></span>${project.rag_status.toUpperCase()}</span>
      <span>Generated: ${new Date().toLocaleDateString()}</span>
    </div>
    ${target ? `<div class="meta" style="margin-top:4px">
      <span>${target.vertical}</span>
      <span>${target.geography || ''}</span>
      ${target.revenue ? `<span>Revenue: $${(target.revenue / 1e6).toFixed(1)}M</span>` : ''}
      ${target.arr ? `<span>ARR: $${(target.arr / 1e6).toFixed(1)}M</span>` : ''}
      ${target.weighted_score ? `<span>Score: ${target.weighted_score.toFixed(1)}/5</span>` : ''}
    </div>` : ''}
    <div class="progress-bar" style="margin-top:8px">
      <div class="progress-fill" style="width:${project.overall_progress_pct}%"></div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card"><div class="num">${project.overall_progress_pct}%</div><div class="label">Overall Progress</div></div>
    <div class="summary-card"><div class="num" style="color:#ef4444">${risks.filter(r => r.status === 'open').length}</div><div class="label">Open Risks</div></div>
    <div class="summary-card"><div class="num" style="color:#f59e0b">${findings.filter(f => f.status === 'open').length}</div><div class="label">Open Findings</div></div>
    <div class="summary-card"><div class="num" style="color:#3b82f6">${requests.filter(r => r.status !== 'complete').length}</div><div class="label">Outstanding IRLs</div></div>
  </div>`;

  // Workstreams with tasks
  html += '<h2>Workstream Checklists</h2>';
  for (const wsDef of DD_WORKSTREAMS) {
    const ws = workstreams.find(w => w.key === wsDef.key);
    if (!ws) continue;
    const tasks = getDDTasks(ws.id);
    const parentTasks = tasks.filter(t => !t.parent_task_id);

    html += `
    <div class="ws-header">
      <span class="rag" style="background:${ragColor(ws.rag_status)}"></span>
      <span class="title">${ws.label}</span>
      ${ws.owner ? `<span class="meta">Owner: ${ws.owner}</span>` : ''}
      <span class="pct">${ws.progress_pct}%</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width:${ws.progress_pct}%"></div></div>`;

    for (const parent of parentTasks) {
      const children = tasks.filter(t => t.parent_task_id === parent.id);
      const completed = children.filter(c => c.status === 'complete').length;
      html += `<div class="task-group">
        <div class="task-group-title">${statusIcon(parent.status)} ${parent.title} (${completed}/${children.length})</div>`;
      for (const child of children) {
        html += `<div class="task${child.status === 'complete' ? ' complete' : ''}">
          <span class="icon">${statusIcon(child.status)}</span>
          <span>${child.title}</span>
        </div>`;
      }
      html += '</div>';
    }
  }

  // Risks
  if (risks.length > 0) {
    html += '<h2 class="page-break">Risk Register</h2>';
    html += `<table class="risk-table">
      <thead><tr><th>Score</th><th>Risk</th><th>Category</th><th>Impact</th><th>Prob</th><th>Status</th><th>Mitigation</th></tr></thead><tbody>`;
    for (const r of [...risks].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))) {
      const scoreColor = (r.risk_score || 0) >= 15 ? '#ef4444' : (r.risk_score || 0) >= 8 ? '#f59e0b' : '#3b82f6';
      html += `<tr>
        <td><span class="risk-score" style="color:${scoreColor}">${r.risk_score}</span></td>
        <td><strong>${r.title}</strong><br>${r.description || ''}</td>
        <td>${r.category}</td><td>${r.impact}</td><td>${r.probability}</td><td>${r.status}</td>
        <td>${r.mitigation || ''}</td>
      </tr>`;
    }
    html += '</tbody></table>';
  }

  // Findings
  if (findings.length > 0) {
    html += '<h2>Findings</h2>';
    html += `<table class="finding-table">
      <thead><tr><th>Severity</th><th>Type</th><th>Finding</th><th>Status</th></tr></thead><tbody>`;
    for (const f of findings) {
      const sevColor = f.severity === 'critical' ? '#ef4444' : f.severity === 'high' ? '#f97316' : f.severity === 'medium' ? '#f59e0b' : '#6b7280';
      html += `<tr>
        <td><span class="badge" style="background:${sevColor}20;color:${sevColor}">${f.severity}</span></td>
        <td>${f.type.replace('_', ' ')}</td>
        <td><strong>${f.title}</strong><br>${f.description || ''}</td>
        <td>${f.status}</td>
      </tr>`;
    }
    html += '</tbody></table>';
  }

  // IRL
  if (requests.length > 0) {
    html += '<h2>Information Request List</h2>';
    html += `<table class="irl-table">
      <thead><tr><th>#</th><th>Request</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead><tbody>`;
    for (const ir of requests) {
      html += `<tr>
        <td>${ir.request_number}</td>
        <td><strong>${ir.title}</strong><br>${ir.description || ''}</td>
        <td>${ir.priority}</td><td>${ir.status.replace('_', ' ')}</td>
        <td>${ir.due_date ? new Date(ir.due_date).toLocaleDateString() : ''}</td>
      </tr>`;
    }
    html += '</tbody></table>';
  }

  html += `
  <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e5e5;color:#9ca3af;font-size:10px;text-align:center">
    Generated by DealForge — ${new Date().toISOString()}
  </div>
</body>
</html>`;

  return html;
}
