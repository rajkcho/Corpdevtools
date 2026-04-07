// ============================================================
// DealForge IC (Investment Committee) Memo Generator
// Generates a structured HTML document for IC presentation
// ============================================================

import { getTarget, getContacts, getTouchpoints, getDealTerms, getDDProjectByTarget, getDDRisks, getDDWorkstreams, getDDTasks } from './db';
import { DEAL_STAGES, SCORE_CRITERIA } from './types';

function fmt(n?: number): string {
  if (!n) return 'N/A';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function generateICMemo(targetId: string): string {
  const target = getTarget(targetId);
  if (!target) return '';

  const contacts = getContacts(targetId);
  const touchpoints = getTouchpoints(targetId);
  const dealTerms = getDealTerms(targetId);
  const ddProject = getDDProjectByTarget(targetId);
  const risks = ddProject ? getDDRisks(ddProject.id) : [];
  const workstreams = ddProject ? getDDWorkstreams(ddProject.id) : [];

  const stage = DEAL_STAGES.find(s => s.key === target.stage);
  const daysInPipeline = Math.floor((Date.now() - new Date(target.created_at).getTime()) / 86400000);
  const primaryContact = contacts.find(c => c.is_primary);

  // Get thesis from localStorage
  let thesis = '';
  let thesisRisks = '';
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`dealforge_thesis_${targetId}`);
    if (raw) {
      const data = JSON.parse(raw);
      thesis = data.thesis || '';
      thesisRisks = data.risks || '';
    }
  }

  // Get competitors from localStorage
  let competitors: { name: string; type: string; threat_level: number; notes: string }[] = [];
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`dealforge_competitors_${targetId}`);
    if (raw) competitors = JSON.parse(raw);
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>IC Memo — ${target.name}</title>
<style>
  @page { margin: 0.75in; size: letter; }
  body { font-family: 'Georgia', serif; color: #1a1a1a; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 28px; margin: 0 0 8px; }
  .header .subtitle { color: #666; font-size: 14px; }
  .header .meta { color: #999; font-size: 12px; margin-top: 8px; }
  h2 { font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 30px; }
  h3 { font-size: 14px; color: #444; margin-top: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 13px; }
  th { font-weight: 600; color: #666; background: #f8f8f8; }
  .metric-value { font-family: 'Courier New', monospace; font-weight: bold; }
  .section { margin: 24px 0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .box { background: #f8f8f8; border-radius: 8px; padding: 12px; }
  .box .label { font-size: 11px; color: #666; text-transform: uppercase; }
  .box .value { font-size: 18px; font-weight: bold; font-family: 'Courier New', monospace; }
  .score-bar { display: inline-block; width: 12px; height: 12px; border-radius: 2px; margin-right: 2px; }
  .risk-high { color: #dc2626; font-weight: bold; }
  .risk-med { color: #f59e0b; }
  .footer { text-align: center; border-top: 3px double #333; padding-top: 16px; margin-top: 40px; font-size: 11px; color: #999; }
  .recommendation { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; }
  .callout { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; font-size: 13px; }
  ul { padding-left: 20px; }
  li { margin: 4px 0; font-size: 13px; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="header">
  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.3em; color: #999;">Investment Committee Memorandum</div>
  <h1>${target.name}</h1>
  <div class="subtitle">${target.vertical} | ${target.geography || 'Geography TBD'} | ${stage?.label}</div>
  <div class="meta">Prepared: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | ${daysInPipeline} days in pipeline${primaryContact ? ` | Primary Contact: ${primaryContact.name}` : ''}</div>
</div>

<h2>1. Transaction Overview</h2>
<div class="section">
  <p>${target.name} is a ${target.vertical.toLowerCase()} vertical market software company${target.geography ? ` headquartered in ${target.geography}` : ''}.${target.description ? ` ${target.description}` : ''}</p>
  ${thesis ? `
  <div class="recommendation">
    <h3 style="margin-top:0">Investment Thesis</h3>
    <p style="white-space: pre-wrap; margin: 8px 0 0;">${thesis}</p>
  </div>` : ''}
</div>

<h2>2. Financial Summary</h2>
<div class="grid">
  <div class="box"><div class="label">Revenue</div><div class="value">${fmt(target.revenue)}</div></div>
  <div class="box"><div class="label">ARR</div><div class="value">${fmt(target.arr)}</div></div>
  <div class="box"><div class="label">Recurring Revenue</div><div class="value">${target.recurring_revenue_pct ? `${target.recurring_revenue_pct}%` : 'N/A'}</div></div>
  <div class="box"><div class="label">Gross Margin</div><div class="value">${target.gross_margin_pct ? `${target.gross_margin_pct}%` : 'N/A'}</div></div>
  <div class="box"><div class="label">EBITA</div><div class="value">${fmt(target.ebita)}</div></div>
  <div class="box"><div class="label">EBITA Margin</div><div class="value">${target.ebita_margin_pct ? `${target.ebita_margin_pct}%` : 'N/A'}</div></div>
  <div class="box"><div class="label">YoY Growth</div><div class="value">${target.yoy_growth_pct ? `${target.yoy_growth_pct}%` : 'N/A'}</div></div>
  <div class="box"><div class="label">Customers</div><div class="value">${target.customer_count?.toLocaleString() || 'N/A'}</div></div>
</div>

${target.asking_price ? `
<h2>3. Valuation & Multiples</h2>
<table>
  <tr><th>Metric</th><th>Value</th><th>VMS Benchmark</th></tr>
  <tr><td>Asking Price</td><td class="metric-value">${fmt(target.asking_price)}</td><td>—</td></tr>
  ${target.revenue ? `<tr><td>EV / Revenue</td><td class="metric-value">${(target.asking_price / target.revenue).toFixed(1)}x</td><td>2.0x – 5.0x</td></tr>` : ''}
  ${target.arr ? `<tr><td>EV / ARR</td><td class="metric-value">${(target.asking_price / target.arr).toFixed(1)}x</td><td>3.0x – 7.0x</td></tr>` : ''}
  ${target.ebita && target.ebita > 0 ? `<tr><td>EV / EBITA</td><td class="metric-value">${(target.asking_price / target.ebita).toFixed(1)}x</td><td>8.0x – 15.0x</td></tr>` : ''}
  ${target.employee_count && target.revenue ? `<tr><td>Revenue / Employee</td><td class="metric-value">${fmt(Math.round(target.revenue / target.employee_count))}</td><td>$100K – $200K</td></tr>` : ''}
</table>
` : `<h2>3. Valuation</h2><p>Asking price not yet established.</p>`}

${target.score ? `
<h2>4. VMS Acquisition Scorecard</h2>
<table>
  <tr><th>Criterion</th><th>Score</th><th>Weight</th><th>Weighted</th></tr>
  ${SCORE_CRITERIA.map(c => {
    const val = target.score![c.key];
    const bars = Array(5).fill(0).map((_, i) => `<span class="score-bar" style="background:${i < val ? (val >= 4 ? '#10b981' : val >= 3 ? '#f59e0b' : '#ef4444') : '#eee'}"></span>`).join('');
    return `<tr><td>${c.label}</td><td>${bars} ${val}/5</td><td>${c.weight}</td><td class="metric-value">${(val * c.weight).toFixed(1)}</td></tr>`;
  }).join('\n')}
  <tr style="border-top: 2px solid #333;"><td colspan="3"><strong>Weighted Total</strong></td><td class="metric-value" style="font-size: 16px; color: ${(target.weighted_score || 0) >= 4 ? '#10b981' : (target.weighted_score || 0) >= 3 ? '#f59e0b' : '#ef4444'}">${target.weighted_score?.toFixed(1)} / 5.0</td></tr>
</table>
` : ''}

${dealTerms.length > 0 ? `
<h2>${target.score ? '5' : '4'}. Proposed Deal Terms</h2>
<table>
  <tr><th>Term</th><th>Value</th><th>Notes</th></tr>
  ${dealTerms.map(t => `<tr><td>${t.label}</td><td class="metric-value">${t.value}</td><td style="color:#666; font-size: 12px;">${t.notes || ''}</td></tr>`).join('\n')}
</table>
` : ''}

${risks.length > 0 || thesisRisks ? `
<h2>${target.score ? (dealTerms.length > 0 ? '6' : '5') : (dealTerms.length > 0 ? '5' : '4')}. Risk Assessment</h2>
${thesisRisks ? `<div class="callout"><strong>Key Risks & Mitigants:</strong><br><span style="white-space: pre-wrap;">${thesisRisks}</span></div>` : ''}
${risks.filter(r => r.status !== 'closed').length > 0 ? `
<table>
  <tr><th>Risk</th><th>Category</th><th>Score</th><th>Status</th></tr>
  ${risks.filter(r => r.status !== 'closed').sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 10).map(r =>
    `<tr><td>${r.title}<br><span style="font-size:11px;color:#666">${r.description}</span>${r.mitigation ? `<br><span style="font-size:11px;color:#10b981">Mitigation: ${r.mitigation}</span>` : ''}</td><td>${r.category}</td><td class="${(r.risk_score || 0) >= 15 ? 'risk-high' : 'risk-med'}">${r.risk_score || '?'}</td><td>${r.status}</td></tr>`
  ).join('\n')}
</table>` : ''}
` : ''}

${competitors.length > 0 ? `
<h2>Competitive Landscape</h2>
<table>
  <tr><th>Competitor</th><th>Type</th><th>Threat</th><th>Notes</th></tr>
  ${competitors.map(c => `<tr><td>${c.name}</td><td>${c.type}</td><td>${['', 'Low', 'Medium', 'High'][c.threat_level]}</td><td style="font-size:12px">${c.notes}</td></tr>`).join('\n')}
</table>
` : ''}

${ddProject ? `
<h2>Due Diligence Status</h2>
<p>Phase: <strong>${ddProject.phase}</strong> | Progress: <strong>${ddProject.overall_progress_pct}%</strong> | RAG: <strong style="color:${ddProject.rag_status === 'green' ? '#10b981' : ddProject.rag_status === 'amber' ? '#f59e0b' : '#ef4444'}">${ddProject.rag_status.toUpperCase()}</strong></p>
${workstreams.length > 0 ? `
<table>
  <tr><th>Workstream</th><th>Progress</th><th>RAG</th></tr>
  ${workstreams.map(ws => {
    const tasks = getDDTasks(ws.id);
    const done = tasks.filter(t => t.status === 'complete' || t.status === 'n_a').length;
    return `<tr><td>${ws.label}</td><td class="metric-value">${tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0}%</td><td style="color:${ws.rag_status === 'green' ? '#10b981' : ws.rag_status === 'amber' ? '#f59e0b' : ws.rag_status === 'red' ? '#ef4444' : '#999'}">${ws.rag_status.toUpperCase()}</td></tr>`;
  }).join('\n')}
</table>` : ''}
` : ''}

<h2>Recommendation</h2>
<div class="recommendation">
  <p><strong>[Analyst to complete]</strong></p>
  <p>Based on the analysis above, the recommendation is to [PROCEED / PASS / REQUEST MORE INFORMATION] on the acquisition of ${target.name}.</p>
  <ul>
    <li>Weighted acquisition score: ${target.weighted_score?.toFixed(1) || 'Not scored'}/5.0</li>
    ${target.asking_price && target.arr ? `<li>Proposed valuation: ${fmt(target.asking_price)} (${(target.asking_price / target.arr).toFixed(1)}x ARR)</li>` : ''}
    <li>Key strengths: [To be completed]</li>
    <li>Primary concerns: [To be completed]</li>
    <li>Proposed next steps: [To be completed]</li>
  </ul>
</div>

<div class="footer">
  CONFIDENTIAL — For Investment Committee Review Only<br>
  Generated by DealForge | ${new Date().toLocaleDateString()}
</div>
</body>
</html>`;
}
