import type { Target, Contact, Touchpoint, DealTerm, JournalEntry } from './types';
import { DEAL_STAGES, SCORE_CRITERIA } from './types';

interface DealSummaryData {
  target: Target;
  contacts: Contact[];
  touchpoints: Touchpoint[];
  dealTerms: DealTerm[];
  journalEntries: JournalEntry[];
  thesis?: { thesis: string; risks: string };
  competitors?: { name: string; type: string; threat_level: number; notes?: string }[];
}

export function generateDealSummary(data: DealSummaryData): string {
  const { target, contacts, touchpoints, dealTerms, journalEntries, thesis, competitors } = data;
  const stage = DEAL_STAGES.find(s => s.key === target.stage);
  const primaryContact = contacts.find(c => c.is_primary);
  const recentTPs = touchpoints.slice(0, 5);
  const pinnedEntries = journalEntries.filter(j => j.pinned);

  const fmt = (n: number | undefined, prefix = '$') => {
    if (!n) return 'N/A';
    if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
    return `${prefix}${n}`;
  };

  const scoreBar = (value: number) => {
    const filled = '█'.repeat(value);
    const empty = '░'.repeat(5 - value);
    return filled + empty;
  };

  const evRevenue = target.asking_price && target.revenue ? (target.asking_price / target.revenue).toFixed(1) : null;
  const evArr = target.asking_price && target.arr ? (target.asking_price / target.arr).toFixed(1) : null;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Deal Summary: ${target.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1a1a2e; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 14px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; margin: 20px 0 10px 0; color: #3b82f6; }
    h3 { font-size: 12px; font-weight: 600; margin: 10px 0 6px 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
    .header-right { text-align: right; }
    .stage-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; color: white; background: ${stage?.color || '#6B7280'}; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0; }
    .metric { padding: 8px; background: #f8fafc; border-radius: 6px; text-align: center; border: 1px solid #e5e7eb; }
    .metric .value { font-size: 16px; font-weight: 700; color: #1a1a2e; }
    .metric .label { font-size: 9px; color: #64748b; text-transform: uppercase; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .score-row { display: flex; align-items: center; gap: 8px; margin: 3px 0; }
    .score-label { width: 130px; font-size: 10px; color: #64748b; }
    .score-bar { font-family: monospace; font-size: 12px; letter-spacing: 1px; }
    .score-val { font-size: 10px; font-weight: 600; width: 20px; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
    th { color: #64748b; font-weight: 600; font-size: 9px; text-transform: uppercase; }
    .tag { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; background: #e0f2fe; color: #0369a1; margin-right: 4px; }
    .threat-high { color: #dc2626; }
    .threat-med { color: #d97706; }
    .threat-low { color: #16a34a; }
    .text-muted { color: #64748b; }
    .text-small { font-size: 10px; }
    .text-bold { font-weight: 600; }
    .mt-1 { margin-top: 4px; }
    .mt-2 { margin-top: 8px; }
    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; color: #94a3b8; font-size: 9px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }
    .print-btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

  <div class="header">
    <div>
      <h1>${target.name}</h1>
      <div class="text-muted">${target.vertical} · ${target.geography || 'No geography'}</div>
      ${target.description ? `<div class="text-small mt-1">${target.description}</div>` : ''}
      ${target.website ? `<div class="text-small text-muted">${target.website}</div>` : ''}
    </div>
    <div class="header-right">
      <div class="stage-badge">${stage?.label || target.stage}</div>
      <div class="text-muted mt-1">Source: ${target.source}</div>
      <div class="text-muted">Added: ${new Date(target.created_at).toLocaleDateString()}</div>
      ${target.weighted_score ? `<div class="text-bold mt-1">Score: ${target.weighted_score.toFixed(1)} / 5.0</div>` : ''}
    </div>
  </div>

  <h2>Key Metrics</h2>
  <div class="metrics-grid">
    <div class="metric"><div class="value">${fmt(target.revenue)}</div><div class="label">Revenue</div></div>
    <div class="metric"><div class="value">${fmt(target.arr)}</div><div class="label">ARR</div></div>
    <div class="metric"><div class="value">${target.recurring_revenue_pct ? target.recurring_revenue_pct + '%' : 'N/A'}</div><div class="label">Recurring %</div></div>
    <div class="metric"><div class="value">${target.gross_margin_pct ? target.gross_margin_pct + '%' : 'N/A'}</div><div class="label">Gross Margin</div></div>
    <div class="metric"><div class="value">${target.ebita_margin_pct ? target.ebita_margin_pct + '%' : 'N/A'}</div><div class="label">EBITA Margin</div></div>
    <div class="metric"><div class="value">${target.customer_count?.toLocaleString() || 'N/A'}</div><div class="label">Customers</div></div>
    <div class="metric"><div class="value">${target.employee_count?.toLocaleString() || 'N/A'}</div><div class="label">Employees</div></div>
    <div class="metric"><div class="value">${target.yoy_growth_pct ? target.yoy_growth_pct + '%' : 'N/A'}</div><div class="label">YoY Growth</div></div>
  </div>

  ${target.asking_price ? `
  <div class="metrics-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 6px;">
    <div class="metric"><div class="value">${fmt(target.asking_price)}</div><div class="label">Asking Price</div></div>
    <div class="metric"><div class="value">${evRevenue ? evRevenue + 'x' : 'N/A'}</div><div class="label">EV / Revenue</div></div>
    <div class="metric"><div class="value">${evArr ? evArr + 'x' : 'N/A'}</div><div class="label">EV / ARR</div></div>
  </div>
  ` : ''}

  <div class="two-col">
    <div>
      ${target.score ? `
      <h2>VMS Acquisition Score</h2>
      ${SCORE_CRITERIA.map(c => {
        const val = target.score?.[c.key] || 0;
        return `<div class="score-row">
          <span class="score-label">${c.label}</span>
          <span class="score-bar" style="color: ${val >= 4 ? '#16a34a' : val >= 3 ? '#d97706' : '#dc2626'}">${scoreBar(val)}</span>
          <span class="score-val">${val}</span>
        </div>`;
      }).join('')}
      <div class="score-row" style="border-top: 1px solid #e5e7eb; padding-top: 4px; margin-top: 4px;">
        <span class="score-label text-bold">Weighted Score</span>
        <span class="text-bold" style="font-size: 14px;">${target.weighted_score?.toFixed(1) || 'N/A'} / 5.0</span>
      </div>
      ` : ''}

      ${contacts.length > 0 ? `
      <h2>Key Contacts</h2>
      <table>
        <tr><th>Name</th><th>Title</th><th>Contact</th></tr>
        ${contacts.slice(0, 6).map(c => `
          <tr>
            <td class="text-bold">${c.name}${c.is_primary ? ' ★' : ''}</td>
            <td>${c.title || '—'}</td>
            <td>${c.email || c.phone || '—'}</td>
          </tr>
        `).join('')}
      </table>
      ` : ''}
    </div>

    <div>
      ${thesis ? `
      <h2>Investment Thesis</h2>
      <div class="text-small">${thesis.thesis.replace(/\n/g, '<br/>')}</div>
      ${thesis.risks ? `
      <h3>Key Risks</h3>
      <div class="text-small text-muted">${thesis.risks.replace(/\n/g, '<br/>')}</div>
      ` : ''}
      ` : ''}

      ${competitors && competitors.length > 0 ? `
      <h2>Competitive Landscape</h2>
      <table>
        <tr><th>Competitor</th><th>Type</th><th>Threat</th></tr>
        ${competitors.map(c => `
          <tr>
            <td class="text-bold">${c.name}</td>
            <td>${c.type}</td>
            <td class="${c.threat_level >= 3 ? 'threat-high' : c.threat_level >= 2 ? 'threat-med' : 'threat-low'}">${c.threat_level >= 3 ? 'High' : c.threat_level >= 2 ? 'Medium' : 'Low'}</td>
          </tr>
        `).join('')}
      </table>
      ` : ''}
    </div>
  </div>

  ${dealTerms.length > 0 ? `
  <h2>Deal Terms</h2>
  <table>
    <tr><th>Category</th><th>Term</th><th>Value</th></tr>
    ${dealTerms.map(dt => `
      <tr>
        <td class="text-muted" style="text-transform: capitalize;">${dt.category}</td>
        <td class="text-bold">${dt.label}</td>
        <td>${dt.value}</td>
      </tr>
    `).join('')}
  </table>
  ` : ''}

  ${recentTPs.length > 0 ? `
  <h2>Recent Activity</h2>
  <table>
    <tr><th>Date</th><th>Type</th><th>Subject</th></tr>
    ${recentTPs.map(tp => `
      <tr>
        <td class="text-muted">${new Date(tp.date).toLocaleDateString()}</td>
        <td style="text-transform: capitalize;">${tp.type}</td>
        <td>${tp.subject}</td>
      </tr>
    `).join('')}
  </table>
  ` : ''}

  ${pinnedEntries.length > 0 ? `
  <h2>Key Notes</h2>
  ${pinnedEntries.slice(0, 2).map(e => `
    <h3>${e.title}</h3>
    <div class="text-small">${e.content.substring(0, 500).replace(/\n/g, '<br/>')}${e.content.length > 500 ? '...' : ''}</div>
  `).join('')}
  ` : ''}

  ${target.tags && target.tags.length > 0 ? `
  <div class="mt-2">
    ${target.tags.map(t => `<span class="tag">${t}</span>`).join('')}
  </div>
  ` : ''}

  <div class="footer">
    Deal Summary for ${target.name} · Generated ${new Date().toLocaleDateString()} · DealForge
  </div>
</body>
</html>`;
}
