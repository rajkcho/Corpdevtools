/**
 * Target Profile Export
 * Generates a professional, print-ready HTML document for a target company profile
 */

import { DEAL_STAGES, SCORE_CRITERIA } from './types';
import type { Target, Contact, Touchpoint, DDProject, DealScore } from './types';

function fmt(n: number, prefix = '$'): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n.toFixed(0)}`;
}

function fmtPct(n: number | undefined): string {
  return n != null ? `${n.toFixed(1)}%` : '\u2014';
}

function fmtNum(n: number | undefined, prefix = '$'): string {
  return n != null ? fmt(n, prefix) : '\u2014';
}

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStageLabel(stage: string): string {
  return DEAL_STAGES.find(s => s.key === stage)?.label || stage;
}

function getStageColor(stage: string): string {
  return DEAL_STAGES.find(s => s.key === stage)?.color || '#6B7280';
}

function scoreBarHtml(value: number, maxVal = 5): string {
  const pct = Math.round((value / maxVal) * 100);
  const color = value >= 4 ? '#10b981' : value >= 3 ? '#3b82f6' : value >= 2 ? '#f59e0b' : '#ef4444';
  return `<div style="display:flex;align-items:center;gap:8px;">
    <div style="flex:1;height:14px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;"></div>
    </div>
    <span style="font-family:'SF Mono',monospace;font-size:12px;font-weight:700;min-width:28px;text-align:right;">${value.toFixed(1)}</span>
  </div>`;
}

export function generateTargetProfile(
  target: Target,
  contacts: Contact[],
  touchpoints: Touchpoint[],
  ddProject?: DDProject,
): string {
  const sourceLabel = target.source.charAt(0).toUpperCase() + target.source.slice(1);

  // Compute weighted score if score exists
  let weightedScore = target.weighted_score;
  if (!weightedScore && target.score) {
    const totalWeight = SCORE_CRITERIA.reduce((s, c) => s + c.weight, 0);
    weightedScore = SCORE_CRITERIA.reduce((s, c) => s + (target.score![c.key] || 0) * c.weight, 0) / totalWeight;
  }

  // localStorage data (will be empty string if running server-side)
  let termsHtml = '';
  let swotHtml = '';
  let competitorsHtml = '';

  if (typeof window !== 'undefined') {
    // Deal Terms
    const termsRaw = localStorage.getItem(`dealforge_terms_${target.id}`);
    if (termsRaw) {
      try {
        const terms = JSON.parse(termsRaw);
        if (Array.isArray(terms) && terms.length > 0) {
          termsHtml = `
<div class="section">
  <h2>Deal Terms</h2>
  <table>
    <thead><tr><th>Category</th><th>Term</th><th>Value</th><th>Notes</th></tr></thead>
    <tbody>
      ${terms.map((t: { category?: string; label?: string; value?: string; notes?: string }) => `
      <tr>
        <td style="text-transform:capitalize">${esc(t.category)}</td>
        <td class="bold">${esc(t.label)}</td>
        <td class="mono">${esc(t.value)}</td>
        <td style="font-size:11px;color:#64748b">${esc(t.notes) || '\u2014'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
        }
      } catch { /* ignore */ }
    }

    // SWOT Analysis
    const swotRaw = localStorage.getItem(`dealforge_swot_${target.id}`);
    if (swotRaw) {
      try {
        const swot = JSON.parse(swotRaw);
        const quadrants = [
          { key: 'strengths', label: 'Strengths', color: '#10b981', bg: '#dcfce7' },
          { key: 'weaknesses', label: 'Weaknesses', color: '#ef4444', bg: '#fee2e2' },
          { key: 'opportunities', label: 'Opportunities', color: '#3b82f6', bg: '#dbeafe' },
          { key: 'threats', label: 'Threats', color: '#f59e0b', bg: '#fef3c7' },
        ];
        const hasContent = quadrants.some(q => {
          const items = swot[q.key];
          return Array.isArray(items) && items.length > 0;
        });
        if (hasContent) {
          swotHtml = `
<div class="section">
  <h2>SWOT Analysis</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
    ${quadrants.map(q => {
      const items: string[] = Array.isArray(swot[q.key]) ? swot[q.key] : [];
      return `
    <div style="background:${q.bg};border-radius:8px;padding:14px;">
      <div style="font-weight:700;font-size:13px;color:${q.color};margin-bottom:8px;">${q.label}</div>
      <ul style="list-style:none;padding:0;margin:0;font-size:12px;">
        ${items.map((item: string) => `<li style="padding:2px 0;">\u2022 ${esc(typeof item === 'string' ? item : (item as { text?: string }).text || '')}</li>`).join('')}
      </ul>
    </div>`;
    }).join('')}
  </div>
</div>`;
        }
      } catch { /* ignore */ }
    }

    // Competitive Landscape
    const compRaw = localStorage.getItem(`dealforge_competitors_${target.id}`);
    if (compRaw) {
      try {
        const competitors = JSON.parse(compRaw);
        if (Array.isArray(competitors) && competitors.length > 0) {
          competitorsHtml = `
<div class="section">
  <h2>Competitive Landscape</h2>
  <table>
    <thead><tr><th>Competitor</th><th>Positioning</th><th>Strengths</th><th>Weaknesses</th></tr></thead>
    <tbody>
      ${competitors.map((c: { name?: string; positioning?: string; strengths?: string; weaknesses?: string; notes?: string }) => `
      <tr>
        <td class="bold">${esc(c.name)}</td>
        <td>${esc(c.positioning || c.notes)}</td>
        <td style="font-size:11px">${esc(c.strengths)}</td>
        <td style="font-size:11px">${esc(c.weaknesses)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
        }
      } catch { /* ignore */ }
    }
  }

  // Scorecard section
  let scorecardHtml = '';
  if (target.score) {
    scorecardHtml = `
<div class="section">
  <h2>VMS Scorecard</h2>
  <table>
    <thead><tr><th>Criterion</th><th>Weight</th><th style="width:50%">Score</th></tr></thead>
    <tbody>
      ${SCORE_CRITERIA.map(c => `
      <tr>
        <td>
          <div class="bold">${esc(c.label)}</div>
          <div style="font-size:10px;color:#94a3b8">${esc(c.description)}</div>
        </td>
        <td class="text-center mono">${c.weight.toFixed(1)}x</td>
        <td>${scoreBarHtml(target.score![c.key] || 0)}</td>
      </tr>`).join('')}
    </tbody>
    <tfoot>
      <tr style="border-top:2px solid #e2e8f0">
        <td class="bold">Weighted Score</td>
        <td></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:14px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
              <div style="width:${Math.round(((weightedScore || 0) / 5) * 100)}%;height:100%;background:#1e3a5f;border-radius:4px;"></div>
            </div>
            <span style="font-family:'SF Mono',monospace;font-size:14px;font-weight:700;color:#1e3a5f;">${(weightedScore || 0).toFixed(2)}</span>
          </div>
        </td>
      </tr>
    </tfoot>
  </table>
</div>`;
  }

  // Contacts section
  let contactsHtml = '';
  if (contacts.length > 0) {
    contactsHtml = `
<div class="section">
  <h2>Key Contacts</h2>
  <table>
    <thead><tr><th>Name</th><th>Title</th><th>Email</th><th>Phone</th><th>LinkedIn</th><th class="text-center">Primary</th></tr></thead>
    <tbody>
      ${contacts.map(c => `
      <tr>
        <td class="bold">${esc(c.name)}</td>
        <td>${esc(c.title)}</td>
        <td class="mono" style="font-size:11px">${esc(c.email) || '\u2014'}</td>
        <td class="mono" style="font-size:11px">${esc(c.phone) || '\u2014'}</td>
        <td style="font-size:11px">${c.linkedin ? `<a href="${esc(c.linkedin)}" style="color:#3b82f6">Profile</a>` : '\u2014'}</td>
        <td class="text-center">${c.is_primary ? '<span style="color:#10b981;font-weight:700">&#10003;</span>' : ''}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
  }

  // Engagement History (last 20)
  let engagementHtml = '';
  const recentTouchpoints = [...touchpoints]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);
  if (recentTouchpoints.length > 0) {
    engagementHtml = `
<div class="section">
  <h2>Engagement History</h2>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Subject</th><th>Summary</th></tr></thead>
    <tbody>
      ${recentTouchpoints.map(tp => `
      <tr>
        <td class="mono" style="white-space:nowrap;font-size:11px">${formatDate(tp.date)}</td>
        <td><span class="badge badge-blue" style="text-transform:capitalize">${esc(tp.type)}</span></td>
        <td class="bold">${esc(tp.subject)}</td>
        <td style="font-size:11px;color:#475569;max-width:300px">${esc(tp.summary)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
  }

  // Due Diligence Status
  let ddHtml = '';
  if (ddProject) {
    const ragColors: Record<string, { bg: string; fg: string; label: string }> = {
      green: { bg: '#dcfce7', fg: '#166534', label: 'Green' },
      amber: { bg: '#fef3c7', fg: '#92400e', label: 'Amber' },
      red: { bg: '#fee2e2', fg: '#991b1b', label: 'Red' },
      grey: { bg: '#f1f5f9', fg: '#64748b', label: 'Grey' },
    };
    const rag = ragColors[ddProject.rag_status] || ragColors.grey;
    ddHtml = `
<div class="section">
  <h2>Due Diligence Status</h2>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
    <div class="kpi">
      <div class="label">Phase</div>
      <div class="value" style="font-size:16px;text-transform:capitalize">${esc(ddProject.phase)}</div>
    </div>
    <div class="kpi">
      <div class="label">RAG Status</div>
      <div style="text-align:center"><span class="badge" style="background:${rag.bg};color:${rag.fg};font-size:12px;padding:4px 12px">${rag.label}</span></div>
    </div>
    <div class="kpi">
      <div class="label">Progress</div>
      <div class="value" style="font-size:16px">${ddProject.overall_progress_pct}%</div>
      <div style="margin-top:6px;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden">
        <div style="width:${ddProject.overall_progress_pct}%;height:100%;background:#1e3a5f;border-radius:4px"></div>
      </div>
    </div>
    <div class="kpi">
      <div class="label">Target Close</div>
      <div class="value" style="font-size:14px">${ddProject.target_close_date ? formatDate(ddProject.target_close_date) : '\u2014'}</div>
    </div>
  </div>
  ${ddProject.notes ? `<div style="margin-top:12px;font-size:12px;color:#475569;background:#f8fafc;border-radius:6px;padding:12px">${esc(ddProject.notes)}</div>` : ''}
</div>`;
  }

  // Financial overview rows
  const financials: [string, string][] = [
    ['Revenue', fmtNum(target.revenue)],
    ['ARR', fmtNum(target.arr)],
    ['Recurring Revenue %', fmtPct(target.recurring_revenue_pct)],
    ['Gross Margin', fmtPct(target.gross_margin_pct)],
    ['EBITDA', fmtNum(target.ebita)],
    ['EBITDA Margin', fmtPct(target.ebita_margin_pct)],
    ['Customer Count', target.customer_count != null ? target.customer_count.toLocaleString() : '\u2014'],
    ['YoY Growth', fmtPct(target.yoy_growth_pct)],
    ['Employee Count', target.employee_count != null ? target.employee_count.toLocaleString() : '\u2014'],
  ];
  const hasFinancials = financials.some(([, v]) => v !== '\u2014');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Target Profile - ${esc(target.name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; background: #fff; line-height: 1.5; }
  .header { background: linear-gradient(135deg, #1e3a5f, #0f2644); color: white; padding: 40px; }
  .header h1 { font-size: 28px; margin-bottom: 4px; }
  .header-meta { display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; opacity: 0.85; margin-top: 8px; }
  .header-meta span { display: flex; align-items: center; gap: 4px; }
  .header .date { font-size: 11px; opacity: 0.55; margin-top: 12px; }
  .container { max-width: 900px; margin: 0 auto; padding: 30px; }
  .section { margin-bottom: 30px; page-break-inside: avoid; }
  .section h2 { font-size: 16px; color: #1e3a5f; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 16px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
  .kpi .value { font-size: 22px; font-weight: 700; font-family: 'SF Mono', monospace; color: #1e3a5f; }
  .kpi .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
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
  .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13px; color: #334155; line-height: 1.7; }
  .fin-table td:first-child { font-weight: 600; color: #475569; width: 40%; }
  .fin-table td:last-child { font-family: 'SF Mono', monospace; text-align: right; font-weight: 600; }
  .footer { text-align: center; font-size: 10px; color: #94a3b8; padding: 20px; border-top: 1px solid #e2e8f0; margin-top: 40px; }
  @media print {
    body { font-size: 11px; }
    .header { padding: 24px; }
    .no-print { display: none !important; }
    .section { page-break-inside: avoid; }
    a { color: inherit; text-decoration: none; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>${esc(target.name)}</h1>
  <div class="header-meta">
    <span>${esc(target.vertical)}${target.sub_vertical ? ` / ${esc(target.sub_vertical)}` : ''}</span>
    <span>${esc(target.geography)}</span>
    ${target.website ? `<span><a href="${esc(target.website)}" style="color:white;text-decoration:underline">${esc(target.website)}</a></span>` : ''}
  </div>
  <div class="date">Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>

<div class="no-print" style="text-align:center;padding:12px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
  <button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:8px 24px;border-radius:6px;cursor:pointer;font-size:13px">Print Profile</button>
</div>

<div class="container">

<!-- Executive Summary -->
<div class="section">
  <h2>Executive Summary</h2>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="label">Current Stage</div>
      <div style="margin-top:6px"><span class="badge" style="background:${getStageColor(target.stage)}22;color:${getStageColor(target.stage)};font-size:12px;padding:4px 12px">${getStageLabel(target.stage)}</span></div>
    </div>
    <div class="kpi">
      <div class="label">Source</div>
      <div class="value" style="font-size:16px">${esc(sourceLabel)}</div>
      ${target.broker_name ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${esc(target.broker_name)}</div>` : ''}
    </div>
    <div class="kpi">
      <div class="label">Weighted Score</div>
      <div class="value" style="color:${(weightedScore || 0) >= 3.5 ? '#10b981' : (weightedScore || 0) >= 2.5 ? '#f59e0b' : '#ef4444'}">${weightedScore != null ? weightedScore.toFixed(2) : '\u2014'}</div>
    </div>
  </div>
  ${target.description ? `<div class="summary-box">${esc(target.description)}</div>` : ''}
</div>

<!-- Financial Overview -->
${hasFinancials ? `
<div class="section">
  <h2>Financial Overview</h2>
  <table class="fin-table">
    <tbody>
      ${financials.map(([label, val]) => `
      <tr>
        <td>${label}</td>
        <td>${val}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  ${target.asking_price ? `<div style="margin-top:12px;padding:12px;background:#eef2ff;border-radius:6px;font-size:13px"><strong style="color:#1e3a5f">Asking Price:</strong> <span class="mono" style="font-weight:700">${fmtNum(target.asking_price)}</span></div>` : ''}
</div>` : ''}

<!-- VMS Scorecard -->
${scorecardHtml}

<!-- Key Contacts -->
${contactsHtml}

<!-- Engagement History -->
${engagementHtml}

<!-- Deal Terms -->
${termsHtml}

<!-- SWOT Analysis -->
${swotHtml}

<!-- Competitive Landscape -->
${competitorsHtml}

<!-- Due Diligence Status -->
${ddHtml}

</div>

<div class="footer">
  CONFIDENTIAL \u2014 For Internal Use Only<br>
  Generated by DealForge \u00b7 ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
</div>

</body>
</html>`;
}
