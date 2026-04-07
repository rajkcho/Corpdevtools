/**
 * DD Executive Summary Generator
 * Generates a professional, print-ready HTML executive summary for due diligence projects
 */

import type { DDProject, DDWorkstream, DDTask, DDRisk, DDFinding, Target } from './types';
import { DD_WORKSTREAMS } from './types';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function ragColor(rag: string): string {
  switch (rag) {
    case 'red': return '#ef4444';
    case 'amber': return '#f59e0b';
    case 'green': return '#10b981';
    default: return '#94a3b8';
  }
}

function ragLabel(rag: string): string {
  switch (rag) {
    case 'red': return 'Red';
    case 'amber': return 'Amber';
    case 'green': return 'Green';
    default: return 'Grey';
  }
}

function ragBadgeClass(rag: string): string {
  switch (rag) {
    case 'red': return 'badge-red';
    case 'amber': return 'badge-yellow';
    case 'green': return 'badge-green';
    default: return 'badge-grey';
  }
}

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case 'critical': return 'badge-red';
    case 'high': return 'badge-red';
    case 'medium': return 'badge-yellow';
    case 'low': return 'badge-blue';
    default: return 'badge-grey';
  }
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function phaseLabel(phase: string): string {
  return phase.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function scoreColor(score: number): string {
  if (score >= 15) return '#ef4444';
  if (score >= 10) return '#f59e0b';
  if (score >= 5) return '#3b82f6';
  return '#10b981';
}

export function generateDDExecutiveSummary(
  project: DDProject,
  workstreams: DDWorkstream[],
  tasks: DDTask[],
  risks: DDRisk[],
  findings: DDFinding[],
  target?: Target
): string {
  const displayName = target?.name || project.target_name;

  // --- Executive Overview Metrics ---
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'complete').length;
  const completedPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const openRisks = risks.filter(r => r.status === 'open' || r.status === 'mitigating');
  const criticalFindings = findings.filter(f => f.severity === 'critical' && f.status !== 'resolved');
  const highFindings = findings.filter(f => f.severity === 'high' && f.status !== 'resolved');

  // --- Workstream Status Matrix ---
  const wsData = workstreams.map(ws => {
    const wsTasks = tasks.filter(t => t.workstream_id === ws.id);
    const wsOpenTasks = wsTasks.filter(t => t.status !== 'complete' && t.status !== 'n_a');
    const wsFindings = findings.filter(f => f.workstream_key === ws.key);
    const wsKeyFindings = wsFindings.filter(f => f.severity === 'critical' || f.severity === 'high');
    return { ws, wsTasks, wsOpenTasks, wsFindings, wsKeyFindings };
  });

  // --- Risk Register: Top 10 by score ---
  const sortedRisks = [...risks]
    .map(r => ({ ...r, computed_score: (r.risk_score ?? (r.impact * r.probability)) }))
    .sort((a, b) => b.computed_score - a.computed_score)
    .slice(0, 10);

  // --- Key Findings grouped by severity ---
  const criticalFindingsList = findings.filter(f => f.severity === 'critical');
  const highFindingsList = findings.filter(f => f.severity === 'high');
  const mediumFindingsList = findings.filter(f => f.severity === 'medium');

  // --- Open Action Items: high-priority incomplete tasks ---
  const openActions = tasks
    .filter(t => t.status !== 'complete' && t.status !== 'n_a' && (t.priority === 'high' || t.priority === 'critical'))
    .sort((a, b) => {
      const prioOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (prioOrder[a.priority] ?? 3) - (prioOrder[b.priority] ?? 3);
    })
    .slice(0, 20);

  // --- Auto Recommendation ---
  const recommendation = generateRecommendation(project, criticalFindings, highFindings, openRisks);

  const wsLabelMap: Record<string, string> = {};
  for (const def of DD_WORKSTREAMS) {
    wsLabelMap[def.key] = def.label;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>DD Executive Summary - ${esc(displayName)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; background: #fff; line-height: 1.5; }
  .header { background: linear-gradient(135deg, #1e3a5f, #0f2644); color: white; padding: 40px; text-align: center; }
  .header h1 { font-size: 28px; margin-bottom: 8px; }
  .header .subtitle { font-size: 14px; opacity: 0.8; }
  .header .date { font-size: 12px; opacity: 0.6; margin-top: 4px; }
  .header-meta { display: flex; justify-content: center; gap: 24px; margin-top: 16px; }
  .header-meta-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .header-meta-item .rag-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); }
  .container { max-width: 900px; margin: 0 auto; padding: 30px; }
  .section { margin-bottom: 30px; page-break-inside: avoid; }
  .section h2 { font-size: 16px; color: #1e3a5f; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 16px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
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
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: capitalize; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-grey { background: #f1f5f9; color: #64748b; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .bar-container { height: 16px; background: #f1f5f9; border-radius: 4px; overflow: hidden; min-width: 80px; }
  .bar { height: 100%; border-radius: 4px; }
  .footer { text-align: center; font-size: 10px; color: #94a3b8; padding: 20px; border-top: 1px solid #e2e8f0; margin-top: 40px; }
  .recommendation-box { border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; }
  .rec-proceed { background: #dcfce7; border: 1px solid #86efac; }
  .rec-caution { background: #fef3c7; border: 1px solid #fcd34d; }
  .rec-halt { background: #fee2e2; border: 1px solid #fca5a5; }
  .rec-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
  .rec-body { font-size: 13px; color: #374151; }
  .finding-group { margin-bottom: 20px; }
  .finding-group h3 { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
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
  <h1>Due Diligence Executive Summary</h1>
  <div class="subtitle">${esc(displayName)}</div>
  <div class="date">Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <div class="header-meta">
    <div class="header-meta-item">
      <span class="rag-dot" style="background:${ragColor(project.rag_status)}"></span>
      <span>RAG: ${ragLabel(project.rag_status)}</span>
    </div>
    <div class="header-meta-item">Phase: ${esc(phaseLabel(project.phase))}</div>
    <div class="header-meta-item">Progress: ${project.overall_progress_pct}%</div>
  </div>
</div>

<div class="no-print" style="text-align:center;padding:12px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
  <button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:8px 24px;border-radius:6px;cursor:pointer;font-size:13px">Print Report</button>
</div>

<div class="container">

<!-- Executive Overview -->
<div class="section">
  <h2>Executive Overview</h2>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="value blue">${totalTasks}</div>
      <div class="label">Total Tasks</div>
      <div class="sub">${completedTasks} completed</div>
    </div>
    <div class="kpi">
      <div class="value ${completedPct >= 75 ? 'green' : completedPct >= 50 ? 'orange' : 'red'}">${completedPct}%</div>
      <div class="label">Completion Rate</div>
      <div class="sub">${totalTasks - completedTasks} remaining</div>
    </div>
    <div class="kpi">
      <div class="value ${openRisks.length > 5 ? 'red' : openRisks.length > 0 ? 'orange' : 'green'}">${openRisks.length}</div>
      <div class="label">Open Risks</div>
      <div class="sub">${risks.length} total identified</div>
    </div>
    <div class="kpi">
      <div class="value ${criticalFindings.length > 0 ? 'red' : 'green'}">${criticalFindings.length}</div>
      <div class="label">Critical Findings</div>
      <div class="sub">${highFindings.length} high severity</div>
    </div>
  </div>
</div>

<!-- Workstream Status Matrix -->
<div class="section">
  <h2>Workstream Status Matrix</h2>
  <table>
    <thead>
      <tr>
        <th>Workstream</th>
        <th class="text-center">RAG</th>
        <th>Progress</th>
        <th>Owner</th>
        <th class="text-center">Open Tasks</th>
        <th class="text-center">Key Findings</th>
      </tr>
    </thead>
    <tbody>
      ${wsData.map(({ ws, wsOpenTasks, wsKeyFindings }) => `
      <tr>
        <td class="bold">${esc(ws.label)}</td>
        <td class="text-center"><span class="dot" style="background:${ragColor(ws.rag_status)}"></span><span class="badge ${ragBadgeClass(ws.rag_status)}">${ragLabel(ws.rag_status)}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="bar-container" style="flex:1"><div class="bar" style="width:${ws.progress_pct}%;background:${ragColor(ws.rag_status)}"></div></div>
            <span class="mono" style="font-size:11px;min-width:32px">${ws.progress_pct}%</span>
          </div>
        </td>
        <td style="font-size:12px">${esc(ws.owner || 'Unassigned')}</td>
        <td class="text-center mono ${wsOpenTasks.length > 5 ? 'red bold' : ''}">${wsOpenTasks.length}</td>
        <td class="text-center mono ${wsKeyFindings.length > 0 ? 'red bold' : ''}">${wsKeyFindings.length}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- Risk Register Summary -->
${sortedRisks.length > 0 ? `
<div class="section">
  <h2>Risk Register Summary (Top ${sortedRisks.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Risk</th>
        <th>Category</th>
        <th class="text-center">Impact</th>
        <th class="text-center">Probability</th>
        <th class="text-center">Score</th>
        <th class="text-center">Status</th>
        <th>Mitigation</th>
      </tr>
    </thead>
    <tbody>
      ${sortedRisks.map(r => `
      <tr>
        <td>
          <div class="bold">${esc(r.title)}</div>
          ${r.workstream_key ? `<div style="font-size:10px;color:#94a3b8">${esc(wsLabelMap[r.workstream_key] || r.workstream_key)}</div>` : ''}
        </td>
        <td style="text-transform:capitalize;font-size:12px">${esc(r.category)}</td>
        <td class="text-center mono">${r.impact}/5</td>
        <td class="text-center mono">${r.probability}/5</td>
        <td class="text-center"><span class="mono bold" style="color:${scoreColor(r.computed_score)}">${r.computed_score}</span></td>
        <td class="text-center"><span class="badge ${r.status === 'closed' ? 'badge-green' : r.status === 'mitigating' ? 'badge-yellow' : r.status === 'accepted' ? 'badge-blue' : 'badge-red'}">${statusLabel(r.status)}</span></td>
        <td style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.mitigation || '—')}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : `
<div class="section">
  <h2>Risk Register Summary</h2>
  <p style="color:#64748b;font-size:13px">No risks have been identified.</p>
</div>`}

<!-- Key Findings -->
<div class="section">
  <h2>Key Findings</h2>
  ${criticalFindingsList.length === 0 && highFindingsList.length === 0 && mediumFindingsList.length === 0
    ? '<p style="color:#64748b;font-size:13px">No findings at critical, high, or medium severity.</p>'
    : `
  ${renderFindingsGroup('Critical', criticalFindingsList, wsLabelMap)}
  ${renderFindingsGroup('High', highFindingsList, wsLabelMap)}
  ${renderFindingsGroup('Medium', mediumFindingsList, wsLabelMap)}
  `}
</div>

<!-- Open Action Items -->
${openActions.length > 0 ? `
<div class="section">
  <h2>Open Action Items (High Priority)</h2>
  <table>
    <thead>
      <tr>
        <th>Task</th>
        <th>Priority</th>
        <th>Owner</th>
        <th>Due Date</th>
        <th>Workstream</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${openActions.map(t => {
        const parentWs = workstreams.find(w => w.id === t.workstream_id);
        const isOverdue = t.due_date && new Date(t.due_date) < new Date();
        return `
      <tr>
        <td class="bold">${esc(t.title)}</td>
        <td><span class="badge ${t.priority === 'critical' ? 'badge-red' : 'badge-yellow'}">${t.priority}</span></td>
        <td style="font-size:12px">${esc(t.owner || 'Unassigned')}</td>
        <td class="mono" style="font-size:12px;${isOverdue ? 'color:#ef4444;font-weight:700' : ''}">${t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}${isOverdue ? ' (overdue)' : ''}</td>
        <td style="font-size:12px">${esc(parentWs?.label || '—')}</td>
        <td><span class="badge badge-blue">${statusLabel(t.status)}</span></td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>` : `
<div class="section">
  <h2>Open Action Items</h2>
  <p style="color:#64748b;font-size:13px">No high-priority open tasks.</p>
</div>`}

<!-- Recommendation -->
<div class="section">
  <h2>Recommendation</h2>
  <div class="recommendation-box ${recommendation.cssClass}">
    <div class="rec-title">${esc(recommendation.title)}</div>
    <div class="rec-body">${esc(recommendation.body)}</div>
  </div>
</div>

</div>

<div class="footer">
  CONFIDENTIAL — For Internal Use Only<br>
  Generated by DealForge · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
</div>

</body>
</html>`;
}

function renderFindingsGroup(
  severityLabel: string,
  findingsList: DDFinding[],
  wsLabelMap: Record<string, string>
): string {
  if (findingsList.length === 0) return '';
  const badgeClass = severityLabel === 'Critical' ? 'badge-red' : severityLabel === 'High' ? 'badge-red' : 'badge-yellow';
  return `
  <div class="finding-group">
    <h3><span class="badge ${badgeClass}">${severityLabel}</span> (${findingsList.length})</h3>
    <table>
      <thead>
        <tr>
          <th>Finding</th>
          <th>Workstream</th>
          <th>Type</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${findingsList.map(f => `
        <tr>
          <td>
            <div class="bold">${esc(f.title)}</div>
            <div style="font-size:11px;color:#64748b;max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.description)}</div>
          </td>
          <td style="font-size:12px">${esc(f.workstream_key ? (wsLabelMap[f.workstream_key] || f.workstream_key) : '—')}</td>
          <td style="font-size:12px;text-transform:capitalize">${esc(f.type.replace(/_/g, ' '))}</td>
          <td><span class="badge ${f.status === 'resolved' ? 'badge-green' : f.status === 'investigating' ? 'badge-yellow' : f.status === 'accepted' ? 'badge-blue' : 'badge-red'}">${statusLabel(f.status)}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function generateRecommendation(
  project: DDProject,
  criticalFindings: DDFinding[],
  highFindings: DDFinding[],
  openRisks: DDRisk[]
): { title: string; body: string; cssClass: string } {
  const highScoreRisks = openRisks.filter(r => (r.risk_score ?? (r.impact * r.probability)) >= 15);

  // Halt conditions
  if (
    project.rag_status === 'red' ||
    criticalFindings.length >= 3 ||
    highScoreRisks.length >= 3
  ) {
    return {
      title: 'Recommendation: Halt — Significant Issues Require Resolution',
      body: `The due diligence process has identified ${criticalFindings.length} unresolved critical finding(s) and ${highScoreRisks.length} high-severity risk(s). ` +
        `The overall RAG status is ${project.rag_status.toUpperCase()}. It is recommended to halt progression until these material issues are investigated and resolved. ` +
        `Key areas requiring immediate attention should be prioritized before proceeding to the next phase.`,
      cssClass: 'rec-halt',
    };
  }

  // Proceed with caution conditions
  if (
    project.rag_status === 'amber' ||
    criticalFindings.length > 0 ||
    highFindings.length >= 3 ||
    highScoreRisks.length > 0
  ) {
    return {
      title: 'Recommendation: Proceed with Caution',
      body: `The due diligence process has identified ${criticalFindings.length} critical and ${highFindings.length} high-severity finding(s) with ${openRisks.length} open risk(s). ` +
        `While no individual issue is a definitive deal-breaker, the cumulative risk profile warrants careful monitoring. ` +
        `It is recommended to proceed to the next phase with enhanced oversight and clear mitigation plans for all identified concerns.`,
      cssClass: 'rec-caution',
    };
  }

  // Proceed
  return {
    title: 'Recommendation: Proceed',
    body: `The due diligence process is progressing well with ${project.overall_progress_pct}% completion. ` +
      `No critical findings remain unresolved and the risk profile is within acceptable parameters. ` +
      `The overall RAG status is ${project.rag_status.toUpperCase()}. It is recommended to proceed to the next phase of the transaction.`,
    cssClass: 'rec-proceed',
  };
}
