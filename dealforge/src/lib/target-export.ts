// ============================================================
// DealForge Target One-Pager Export
// Generates a printable HTML summary for a target
// ============================================================

import { getTarget, getTouchpoints, getContacts, getDDProjectByTarget, getDealTerms } from './db';
import { DEAL_STAGES, SCORE_CRITERIA } from './types';

export function generateTargetOnePager(targetId: string): string {
  const target = getTarget(targetId);
  if (!target) return '<html><body>Target not found.</body></html>';

  const touchpoints = getTouchpoints(targetId);
  const contacts = getContacts(targetId);
  const ddProject = getDDProjectByTarget(targetId);
  const dealTerms = getDealTerms(targetId);
  const stageInfo = DEAL_STAGES.find(s => s.key === target.stage);

  const fmtM = (n?: number) => n ? `$${(n / 1e6).toFixed(1)}M` : '—';
  const fmtPct = (n?: number) => n ? `${n}%` : '—';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${target.name} - Target Summary</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1a1a2e; line-height: 1.5; padding: 24px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 20px; margin-bottom: 2px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #3b82f6; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .grid { display: grid; gap: 8px; }
    .grid-2 { grid-template-columns: 1fr 1fr; }
    .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
    .grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
    .metric { background: #f9fafb; padding: 8px; border-radius: 4px; }
    .metric .label { font-size: 9px; color: #6b7280; text-transform: uppercase; }
    .metric .value { font-size: 14px; font-weight: 700; font-family: monospace; }
    .score-bar { height: 6px; border-radius: 3px; background: #e5e7eb; overflow: hidden; margin-top: 2px; }
    .score-fill { height: 100%; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
    th { color: #6b7280; font-weight: 600; font-size: 9px; text-transform: uppercase; }
    .text-right { text-align: right; }
    .text-muted { color: #9ca3af; }
    .text-success { color: #10b981; }
    .text-warning { color: #f59e0b; }
    .text-danger { color: #ef4444; }
    .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 12px; } @page { margin: 0.5in; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${target.name}</h1>
      <div style="margin-top: 4px;">
        <span class="badge" style="background: ${stageInfo?.color}20; color: ${stageInfo?.color}">${stageInfo?.label}</span>
        <span style="margin-left: 8px; color: #6b7280;">${target.vertical}${target.geography ? ` · ${target.geography}` : ''}</span>
      </div>
    </div>
    <div style="text-align: right;">
      ${target.weighted_score ? `<div style="font-size: 24px; font-weight: 700; font-family: monospace; color: ${target.weighted_score >= 4 ? '#10b981' : target.weighted_score >= 3 ? '#f59e0b' : '#ef4444'}">${target.weighted_score.toFixed(1)}/5</div>
      <div style="font-size: 9px; color: #6b7280;">VMS Score</div>` : '<div class="text-muted">Unscored</div>'}
    </div>
  </div>

  ${target.description ? `<p style="margin-bottom: 12px; color: #374151;">${target.description}</p>` : ''}

  <h2>Key Financials</h2>
  <div class="grid grid-4">
    <div class="metric"><div class="label">Revenue</div><div class="value">${fmtM(target.revenue)}</div></div>
    <div class="metric"><div class="label">ARR</div><div class="value">${fmtM(target.arr)}</div></div>
    <div class="metric"><div class="label">Recurring %</div><div class="value">${fmtPct(target.recurring_revenue_pct)}</div></div>
    <div class="metric"><div class="label">Gross Margin</div><div class="value">${fmtPct(target.gross_margin_pct)}</div></div>
    <div class="metric"><div class="label">EBITA Margin</div><div class="value">${fmtPct(target.ebita_margin_pct)}</div></div>
    <div class="metric"><div class="label">Customers</div><div class="value">${target.customer_count?.toLocaleString() || '—'}</div></div>
    <div class="metric"><div class="label">Employees</div><div class="value">${target.employee_count?.toLocaleString() || '—'}</div></div>
    <div class="metric"><div class="label">Asking Price</div><div class="value">${fmtM(target.asking_price)}</div></div>
  </div>

  ${target.asking_price && target.revenue ? `
  <h2>Implied Multiples</h2>
  <div class="grid grid-4">
    ${target.revenue ? `<div class="metric"><div class="label">EV/Revenue</div><div class="value">${(target.asking_price / target.revenue).toFixed(1)}x</div></div>` : ''}
    ${target.arr ? `<div class="metric"><div class="label">EV/ARR</div><div class="value">${(target.asking_price / target.arr).toFixed(1)}x</div></div>` : ''}
    ${target.ebita && target.ebita > 0 ? `<div class="metric"><div class="label">EV/EBITA</div><div class="value">${(target.asking_price / target.ebita).toFixed(1)}x</div></div>` : ''}
    ${target.revenue && target.employee_count ? `<div class="metric"><div class="label">Rev/Employee</div><div class="value">$${Math.round(target.revenue / target.employee_count / 1000)}K</div></div>` : ''}
  </div>` : ''}

  ${target.score ? `
  <h2>VMS Scorecard</h2>
  <table>
    <tr><th>Criterion</th><th>Weight</th><th class="text-right">Score</th><th style="width:40%">Rating</th></tr>
    ${SCORE_CRITERIA.map(c => {
      const val = target.score![c.key] || 0;
      const color = val >= 4 ? '#10b981' : val >= 3 ? '#f59e0b' : '#ef4444';
      return `<tr>
        <td>${c.label}</td>
        <td>${c.weight}x</td>
        <td class="text-right" style="font-family:monospace;font-weight:700;color:${color}">${val}/5</td>
        <td><div class="score-bar"><div class="score-fill" style="width:${(val/5)*100}%;background:${color}"></div></div></td>
      </tr>`;
    }).join('\n')}
  </table>` : ''}

  ${contacts.length > 0 || target.founder_name ? `
  <h2>Key Contacts</h2>
  <table>
    <tr><th>Name</th><th>Title</th><th>Email</th><th>Phone</th></tr>
    ${target.founder_name ? `<tr><td><strong>${target.founder_name}</strong></td><td>Founder/CEO</td><td>${target.founder_email || '—'}</td><td>${target.founder_phone || '—'}</td></tr>` : ''}
    ${contacts.map(c => `<tr><td>${c.name}${c.is_primary ? ' ★' : ''}</td><td>${c.title || '—'}</td><td>${c.email || '—'}</td><td>${c.phone || '—'}</td></tr>`).join('\n')}
  </table>` : ''}

  ${dealTerms.length > 0 ? `
  <h2>Deal Terms</h2>
  <table>
    <tr><th>Category</th><th>Term</th><th>Value</th></tr>
    ${dealTerms.map(dt => `<tr><td style="text-transform:capitalize">${dt.category}</td><td>${dt.label}</td><td><strong>${dt.value}</strong></td></tr>`).join('\n')}
  </table>` : ''}

  ${touchpoints.length > 0 ? `
  <h2>Relationship Timeline (Last 5)</h2>
  <table>
    <tr><th>Date</th><th>Type</th><th>Subject</th></tr>
    ${touchpoints.slice(0, 5).map(tp => `<tr><td>${new Date(tp.date).toLocaleDateString()}</td><td style="text-transform:capitalize">${tp.type}</td><td>${tp.subject}</td></tr>`).join('\n')}
  </table>` : ''}

  ${ddProject ? `
  <h2>Due Diligence Status</h2>
  <div class="grid grid-3">
    <div class="metric"><div class="label">Phase</div><div class="value" style="text-transform:capitalize">${ddProject.phase}</div></div>
    <div class="metric"><div class="label">RAG Status</div><div class="value" style="text-transform:uppercase;color:${ddProject.rag_status === 'green' ? '#10b981' : ddProject.rag_status === 'amber' ? '#f59e0b' : ddProject.rag_status === 'red' ? '#ef4444' : '#6b7280'}">${ddProject.rag_status}</div></div>
    <div class="metric"><div class="label">Progress</div><div class="value">${ddProject.overall_progress_pct}%</div></div>
  </div>` : ''}

  <div class="footer">
    ${target.name} Target Summary · Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · DealForge M&A Platform
  </div>
</body>
</html>`;
}
