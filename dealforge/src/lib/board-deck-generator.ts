/**
 * Board Deck Generator
 * Generates a presentation-style HTML slide deck for board/IC review
 */

import { getTargets, getTouchpoints, getContacts, getDDProjects, getDDRisks, getActivities } from './db';
import { DEAL_STAGES, SCORE_CRITERIA } from './types';
import type { DealStage, Target } from './types';

function fmt(n: number, prefix = '$'): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n.toFixed(0)}`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STAGE_PROB: Record<DealStage, number> = {
  identified: 0.05, researching: 0.10, contacted: 0.15, nurturing: 0.25,
  loi_submitted: 0.40, loi_signed: 0.60, due_diligence: 0.75, closing: 0.90,
  closed_won: 1.0, closed_lost: 0,
};

function getStageLabel(s: string): string {
  return DEAL_STAGES.find(d => d.key === s)?.label || s;
}

function getStageColor(s: string): string {
  return DEAL_STAGES.find(d => d.key === s)?.color || '#6B7280';
}

function weightedScore(t: Target): number {
  if (t.weighted_score) return t.weighted_score;
  if (!t.score) return 0;
  const tw = SCORE_CRITERIA.reduce((s, c) => s + c.weight, 0);
  return SCORE_CRITERIA.reduce((s, c) => s + (t.score![c.key] || 0) * c.weight, 0) / tw;
}

export function generateBoardDeck(options: { period: '30d' | '90d' | 'ytd' | 'all' }): string {
  const now = Date.now();
  let cutoff: number;
  let periodLabel: string;
  switch (options.period) {
    case '30d': cutoff = now - 30 * 86400000; periodLabel = 'Last 30 Days'; break;
    case '90d': cutoff = now - 90 * 86400000; periodLabel = 'Last 90 Days'; break;
    case 'ytd': cutoff = new Date(new Date().getFullYear(), 0, 1).getTime(); periodLabel = 'Year to Date'; break;
    default: cutoff = 0; periodLabel = 'All Time';
  }

  const targets = getTargets();
  const touchpoints = getTouchpoints();
  const contacts = getContacts();
  const ddProjects = getDDProjects();
  const ddRisks = getDDRisks();
  const activities = getActivities();

  const active = targets.filter(t => t.stage !== 'closed_won' && t.stage !== 'closed_lost');
  const won = targets.filter(t => t.stage === 'closed_won');
  const lost = targets.filter(t => t.stage === 'closed_lost');
  const periodTouchpoints = touchpoints.filter(tp => new Date(tp.date).getTime() >= cutoff);
  const periodActivities = activities.filter(a => new Date(a.created_at).getTime() >= cutoff);
  const newTargets = targets.filter(t => new Date(t.created_at).getTime() >= cutoff);
  const meetings = periodTouchpoints.filter(tp => tp.type === 'meeting');
  const stageAdvances = periodActivities.filter(a => a.type === 'stage_changed');

  // Pipeline value
  const totalPipelineValue = active.reduce((s, t) => s + (t.asking_price || t.revenue || 0), 0);
  const weightedPipelineValue = active.reduce((s, t) => s + (t.asking_price || t.revenue || 0) * STAGE_PROB[t.stage], 0);

  // Stage distribution
  const stageCounts: Record<string, { count: number; value: number }> = {};
  for (const t of active) {
    const label = getStageLabel(t.stage);
    if (!stageCounts[label]) stageCounts[label] = { count: 0, value: 0 };
    stageCounts[label].count++;
    stageCounts[label].value += t.asking_price || t.revenue || 0;
  }
  const maxStageCount = Math.max(1, ...Object.values(stageCounts).map(s => s.count));

  // Top deals
  const topDeals = [...active]
    .sort((a, b) => weightedScore(b) - weightedScore(a))
    .slice(0, 5);

  // Win rate
  const closed = won.length + lost.length;
  const winRate = closed > 0 ? ((won.length / closed) * 100).toFixed(0) : 'N/A';

  // Vertical distribution
  const verticals: Record<string, number> = {};
  for (const t of active) { verticals[t.vertical] = (verticals[t.vertical] || 0) + 1; }
  const sortedVerticals = Object.entries(verticals).sort((a, b) => b[1] - a[1]);

  // Geography distribution
  const geos: Record<string, number> = {};
  for (const t of active) { const g = t.geography || 'Unknown'; geos[g] = (geos[g] || 0) + 1; }
  const sortedGeos = Object.entries(geos).sort((a, b) => b[1] - a[1]);

  // Deal size buckets
  const small = active.filter(t => (t.revenue || 0) < 5_000_000).length;
  const mid = active.filter(t => (t.revenue || 0) >= 5_000_000 && (t.revenue || 0) < 25_000_000).length;
  const large = active.filter(t => (t.revenue || 0) >= 25_000_000).length;

  // DD projects with RAG
  const activeDDProjects = ddProjects.filter(p => p.status !== 'complete');
  const topRisks = [...ddRisks]
    .filter(r => r.status === 'open' || r.status === 'mitigating')
    .sort((a, b) => (b.impact * b.probability) - (a.impact * a.probability))
    .slice(0, 5);

  // Upcoming follow-ups
  const upcoming = touchpoints
    .filter(tp => tp.follow_up_date && new Date(tp.follow_up_date).getTime() >= now)
    .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())
    .slice(0, 8);

  // Stale deals
  const staleDeals = active.filter(t => {
    const tps = touchpoints.filter(tp => tp.target_id === t.id);
    if (tps.length === 0) return true;
    const latest = Math.max(...tps.map(tp => new Date(tp.date).getTime()));
    return (now - latest) > 14 * 86400000;
  }).slice(0, 5);

  const slideStyle = `
    .slide { min-height: 100vh; padding: 60px; display: flex; flex-direction: column; justify-content: center; page-break-after: always; position: relative; }
    .slide-dark { background: linear-gradient(135deg, #0f2644, #1e3a5f); color: white; }
    .slide-light { background: #ffffff; color: #1a1a2e; }
    .slide-alt { background: #f8fafc; color: #1a1a2e; }
    .slide h2 { font-size: 32px; margin-bottom: 40px; letter-spacing: -0.02em; }
    .slide-dark h2 { border-bottom: 2px solid rgba(255,255,255,0.2); padding-bottom: 16px; }
    .slide-light h2, .slide-alt h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; color: #1e3a5f; }
    .slide-number { position: absolute; bottom: 30px; right: 40px; font-size: 12px; opacity: 0.4; }
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 24px; margin-bottom: 40px; }
    .kpi-box { text-align: center; padding: 24px; border-radius: 12px; }
    .slide-dark .kpi-box { background: rgba(255,255,255,0.08); }
    .slide-light .kpi-box, .slide-alt .kpi-box { background: #f1f5f9; border: 1px solid #e2e8f0; }
    .kpi-value { font-size: 36px; font-weight: 800; font-family: 'SF Mono', monospace; }
    .kpi-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 8px; opacity: 0.7; }
    .bar-chart { display: flex; flex-direction: column; gap: 12px; }
    .bar-row { display: flex; align-items: center; gap: 12px; }
    .bar-label { width: 140px; font-size: 14px; font-weight: 600; text-align: right; }
    .bar-track { flex: 1; height: 32px; border-radius: 6px; overflow: hidden; position: relative; }
    .slide-dark .bar-track { background: rgba(255,255,255,0.08); }
    .slide-light .bar-track, .slide-alt .bar-track { background: #f1f5f9; }
    .bar-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 12px; font-size: 13px; font-weight: 700; color: white; min-width: 30px; }
    .bar-count { font-size: 14px; min-width: 30px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.6; }
    td { padding: 12px; font-size: 14px; }
    .slide-dark th { border-bottom: 1px solid rgba(255,255,255,0.15); }
    .slide-dark td { border-bottom: 1px solid rgba(255,255,255,0.08); }
    .slide-light th, .slide-alt th { border-bottom: 2px solid #e2e8f0; color: #64748b; }
    .slide-light td, .slide-alt td { border-bottom: 1px solid #f1f5f9; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .mono { font-family: 'SF Mono', monospace; }
    .risk-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
  `;

  let slideNum = 0;
  const sn = () => `<div class="slide-number">${++slideNum}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>M&A Pipeline Review - Board Deck</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  ${slideStyle}
  @media print {
    .slide { min-height: auto; height: 100vh; page-break-after: always; }
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="no-print" style="position:fixed;top:0;left:0;right:0;z-index:100;background:#1e3a5f;color:white;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-size:13px">
  <span>Board Deck Preview</span>
  <button onclick="window.print()" style="background:white;color:#1e3a5f;border:none;padding:6px 20px;border-radius:6px;font-weight:700;cursor:pointer">Print / Save PDF</button>
</div>

<!-- SLIDE 1: Title -->
<div class="slide slide-dark" style="justify-content:center;align-items:center;text-align:center">
  <div style="font-size:14px;letter-spacing:0.15em;text-transform:uppercase;opacity:0.5;margin-bottom:24px">CONFIDENTIAL</div>
  <h1 style="font-size:48px;margin-bottom:16px;letter-spacing:-0.03em">M&A Pipeline Review</h1>
  <div style="font-size:18px;opacity:0.7;margin-bottom:8px">${periodLabel}</div>
  <div style="font-size:14px;opacity:0.4">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
  ${sn()}
</div>

<!-- SLIDE 2: Pipeline Overview -->
<div class="slide slide-light">
  <h2>Pipeline Overview</h2>
  <div class="kpi-row">
    <div class="kpi-box">
      <div class="kpi-value">${active.length}</div>
      <div class="kpi-label">Active Deals</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${fmt(totalPipelineValue)}</div>
      <div class="kpi-label">Total Pipeline</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${fmt(weightedPipelineValue)}</div>
      <div class="kpi-label">Weighted Value</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${winRate}${winRate !== 'N/A' ? '%' : ''}</div>
      <div class="kpi-label">Win Rate</div>
    </div>
  </div>
  <div class="bar-chart">
    ${Object.entries(stageCounts).map(([label, data]) => {
      const pct = Math.round((data.count / maxStageCount) * 100);
      const stage = DEAL_STAGES.find(s => s.label === label);
      const color = stage?.color || '#6B7280';
      return `<div class="bar-row">
        <div class="bar-label">${esc(label)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.max(pct, 8)}%;background:${color}">${data.count}</div>
        </div>
        <div class="bar-count mono">${fmt(data.value)}</div>
      </div>`;
    }).join('')}
  </div>
  ${sn()}
</div>

<!-- SLIDE 3: Key Deals -->
<div class="slide slide-alt">
  <h2>Top Prospects</h2>
  <table>
    <thead><tr><th>Company</th><th>Vertical</th><th>Stage</th><th>Revenue</th><th>Score</th><th>Key Insight</th></tr></thead>
    <tbody>
      ${topDeals.map(t => {
        const score = weightedScore(t);
        const tps = touchpoints.filter(tp => tp.target_id === t.id).length;
        const conts = contacts.filter(c => c.target_id === t.id).length;
        return `<tr>
          <td style="font-weight:700">${esc(t.name)}</td>
          <td>${esc(t.vertical)}</td>
          <td><span class="badge" style="background:${getStageColor(t.stage)}22;color:${getStageColor(t.stage)}">${getStageLabel(t.stage)}</span></td>
          <td class="mono">${t.revenue ? fmt(t.revenue) : '\u2014'}</td>
          <td class="mono" style="font-weight:700;color:${score >= 3.5 ? '#10b981' : score >= 2.5 ? '#f59e0b' : '#ef4444'}">${score > 0 ? score.toFixed(1) : '\u2014'}</td>
          <td style="font-size:12px;color:#64748b">${tps} touchpoints, ${conts} contacts</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  ${sn()}
</div>

<!-- SLIDE 4: Financial Summary -->
<div class="slide slide-dark">
  <h2 style="color:white">Financial Summary</h2>
  <div class="kpi-row">
    <div class="kpi-box">
      <div class="kpi-value">${fmt(active.reduce((s, t) => s + (t.revenue || 0), 0))}</div>
      <div class="kpi-label">Total Pipeline Revenue</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${fmt(active.reduce((s, t) => s + (t.arr || 0), 0))}</div>
      <div class="kpi-label">Total Pipeline ARR</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${active.length > 0 ? fmt(active.reduce((s, t) => s + (t.revenue || 0), 0) / active.length) : '$0'}</div>
      <div class="kpi-label">Avg Deal Size</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${active.filter(t => t.gross_margin_pct).length > 0 ? (active.reduce((s, t) => s + (t.gross_margin_pct || 0), 0) / active.filter(t => t.gross_margin_pct).length).toFixed(0) + '%' : '\u2014'}</div>
      <div class="kpi-label">Avg Gross Margin</div>
    </div>
  </div>
  <div class="kpi-row">
    <div class="kpi-box">
      <div class="kpi-value">${active.filter(t => t.recurring_revenue_pct).length > 0 ? (active.reduce((s, t) => s + (t.recurring_revenue_pct || 0), 0) / active.filter(t => t.recurring_revenue_pct).length).toFixed(0) + '%' : '\u2014'}</div>
      <div class="kpi-label">Avg Recurring %</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${active.filter(t => t.yoy_growth_pct).length > 0 ? (active.reduce((s, t) => s + (t.yoy_growth_pct || 0), 0) / active.filter(t => t.yoy_growth_pct).length).toFixed(0) + '%' : '\u2014'}</div>
      <div class="kpi-label">Avg YoY Growth</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${won.length}</div>
      <div class="kpi-label">Deals Won</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${lost.length}</div>
      <div class="kpi-label">Deals Lost</div>
    </div>
  </div>
  ${sn()}
</div>

<!-- SLIDE 5: Activity Metrics -->
<div class="slide slide-light">
  <h2>Activity Metrics</h2>
  <div class="kpi-row">
    <div class="kpi-box">
      <div class="kpi-value">${periodTouchpoints.length}</div>
      <div class="kpi-label">Total Touchpoints</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${meetings.length}</div>
      <div class="kpi-label">Meetings Held</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${newTargets.length}</div>
      <div class="kpi-label">New Targets</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value">${stageAdvances.length}</div>
      <div class="kpi-label">Stage Advances</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">
    <div>
      <h3 style="font-size:16px;margin-bottom:16px;color:#1e3a5f">Activity by Type</h3>
      ${(() => {
        const types: Record<string, number> = {};
        for (const tp of periodTouchpoints) { types[tp.type] = (types[tp.type] || 0) + 1; }
        const max = Math.max(1, ...Object.values(types));
        return Object.entries(types).sort((a, b) => b[1] - a[1]).map(([type, count]) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:80px;font-size:13px;text-transform:capitalize;text-align:right">${type}</div>
            <div style="flex:1;height:20px;background:#f1f5f9;border-radius:4px;overflow:hidden">
              <div style="width:${(count / max) * 100}%;height:100%;background:#3b82f6;border-radius:4px"></div>
            </div>
            <div style="font-size:13px;font-weight:700;min-width:24px" class="mono">${count}</div>
          </div>`).join('');
      })()}
    </div>
    <div>
      <h3 style="font-size:16px;margin-bottom:16px;color:#1e3a5f">Sourcing Breakdown</h3>
      ${(() => {
        const sources: Record<string, number> = {};
        for (const t of active) { sources[t.source] = (sources[t.source] || 0) + 1; }
        return Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([src, count]) => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px">
            <span style="text-transform:capitalize">${src}</span>
            <span class="mono" style="font-weight:700">${count} (${((count / active.length) * 100).toFixed(0)}%)</span>
          </div>`).join('');
      })()}
    </div>
  </div>
  ${sn()}
</div>

<!-- SLIDE 6: Risk Summary -->
<div class="slide slide-alt">
  <h2>Due Diligence & Risk Summary</h2>
  ${activeDDProjects.length > 0 ? `
  <table style="margin-bottom:32px">
    <thead><tr><th>Target</th><th>Phase</th><th>RAG</th><th>Progress</th></tr></thead>
    <tbody>
      ${activeDDProjects.map(p => {
        const ragColors: Record<string, string> = { green: '#10b981', amber: '#f59e0b', red: '#ef4444', grey: '#94a3b8' };
        return `<tr>
          <td style="font-weight:700">${esc(p.target_name)}</td>
          <td style="text-transform:capitalize">${p.phase}</td>
          <td><span class="risk-dot" style="background:${ragColors[p.rag_status] || '#94a3b8'}"></span>${p.rag_status.toUpperCase()}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:12px;background:#e2e8f0;border-radius:4px;overflow:hidden">
                <div style="width:${p.overall_progress_pct}%;height:100%;background:#1e3a5f;border-radius:4px"></div>
              </div>
              <span class="mono" style="font-size:13px">${p.overall_progress_pct}%</span>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>` : '<p style="color:#64748b;margin-bottom:32px">No active DD projects</p>'}
  ${topRisks.length > 0 ? `
  <h3 style="font-size:16px;margin-bottom:16px;color:#1e3a5f">Top Risks</h3>
  <table>
    <thead><tr><th>Risk</th><th>Category</th><th>Impact</th><th>Probability</th><th>Score</th><th>Status</th></tr></thead>
    <tbody>
      ${topRisks.map(r => {
        const score = r.impact * r.probability;
        const color = score >= 15 ? '#ef4444' : score >= 8 ? '#f59e0b' : '#10b981';
        return `<tr>
          <td style="font-weight:600">${esc(r.title)}</td>
          <td style="text-transform:capitalize">${r.category}</td>
          <td class="mono">${r.impact}</td>
          <td class="mono">${r.probability}</td>
          <td><span class="mono" style="color:${color};font-weight:700">${score}</span></td>
          <td style="text-transform:capitalize">${r.status}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>` : ''}
  ${sn()}
</div>

<!-- SLIDE 7: Strategic Themes -->
<div class="slide slide-dark">
  <h2 style="color:white">Strategic Themes</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">
    <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:28px">
      <h3 style="font-size:18px;margin-bottom:20px;opacity:0.9">Vertical Focus</h3>
      ${sortedVerticals.slice(0, 5).map(([v, c]) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-size:14px">
          <span>${esc(v)}</span>
          <span class="mono" style="font-weight:700">${c} deal${c !== 1 ? 's' : ''} (${((c / active.length) * 100).toFixed(0)}%)</span>
        </div>`).join('')}
      <div style="margin-top:16px;font-size:13px;opacity:0.6">${sortedVerticals.length > 3 ? `Pipeline spans ${sortedVerticals.length} verticals` : 'Pipeline concentrated in few verticals'}</div>
    </div>
    <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:28px">
      <h3 style="font-size:18px;margin-bottom:20px;opacity:0.9">Geographic Spread</h3>
      ${sortedGeos.slice(0, 5).map(([g, c]) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-size:14px">
          <span>${esc(g)}</span>
          <span class="mono" style="font-weight:700">${c} deal${c !== 1 ? 's' : ''}</span>
        </div>`).join('')}
    </div>
    <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:28px">
      <h3 style="font-size:18px;margin-bottom:20px;opacity:0.9">Deal Size Distribution</h3>
      <div style="display:flex;gap:16px;text-align:center">
        <div style="flex:1;padding:16px;background:rgba(255,255,255,0.06);border-radius:8px">
          <div class="mono" style="font-size:24px;font-weight:800">${small}</div>
          <div style="font-size:11px;opacity:0.6;margin-top:4px">Small (&lt;$5M)</div>
        </div>
        <div style="flex:1;padding:16px;background:rgba(255,255,255,0.06);border-radius:8px">
          <div class="mono" style="font-size:24px;font-weight:800">${mid}</div>
          <div style="font-size:11px;opacity:0.6;margin-top:4px">Mid ($5-25M)</div>
        </div>
        <div style="flex:1;padding:16px;background:rgba(255,255,255,0.06);border-radius:8px">
          <div class="mono" style="font-size:24px;font-weight:800">${large}</div>
          <div style="font-size:11px;opacity:0.6;margin-top:4px">Large (&gt;$25M)</div>
        </div>
      </div>
    </div>
    <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:28px">
      <h3 style="font-size:18px;margin-bottom:20px;opacity:0.9">Pipeline Quality</h3>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;justify-content:space-between;font-size:14px"><span>Avg Weighted Score</span><span class="mono" style="font-weight:700">${active.filter(t => t.score).length > 0 ? (active.filter(t => t.score).reduce((s, t) => s + weightedScore(t), 0) / active.filter(t => t.score).length).toFixed(1) : '\u2014'}/5.0</span></div>
        <div style="display:flex;justify-content:space-between;font-size:14px"><span>Scored Targets</span><span class="mono" style="font-weight:700">${active.filter(t => t.score).length}/${active.length}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:14px"><span>With DD Projects</span><span class="mono" style="font-weight:700">${ddProjects.length}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:14px"><span>Proprietary %</span><span class="mono" style="font-weight:700">${active.length > 0 ? ((active.filter(t => t.source === 'proprietary').length / active.length) * 100).toFixed(0) : 0}%</span></div>
      </div>
    </div>
  </div>
  ${sn()}
</div>

<!-- SLIDE 8: Next Steps -->
<div class="slide slide-light">
  <h2>Next Steps & Action Items</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">
    <div>
      <h3 style="font-size:16px;margin-bottom:16px;color:#1e3a5f">Upcoming Follow-ups</h3>
      ${upcoming.length > 0 ? upcoming.map(tp => {
        const target = targets.find(t => t.id === tp.target_id);
        return `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px">
          <div style="font-weight:700">${target ? esc(target.name) : 'Unknown'}</div>
          <div style="color:#64748b">${esc(tp.subject)} \u00b7 ${formatDate(tp.follow_up_date!)}</div>
        </div>`;
      }).join('') : '<p style="color:#94a3b8;font-size:13px">No upcoming follow-ups scheduled</p>'}
    </div>
    <div>
      <h3 style="font-size:16px;margin-bottom:16px;color:#ef4444">Attention Required</h3>
      ${staleDeals.length > 0 ? staleDeals.map(t => {
        const tps = touchpoints.filter(tp => tp.target_id === t.id);
        const latest = tps.length > 0 ? Math.max(...tps.map(tp => new Date(tp.date).getTime())) : 0;
        const daysSince = latest > 0 ? Math.round((now - latest) / 86400000) : 999;
        return `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px">
          <div style="font-weight:700">${esc(t.name)}</div>
          <div style="color:#ef4444">${daysSince > 900 ? 'No touchpoints' : `${daysSince} days since last activity`} \u00b7 ${getStageLabel(t.stage)}</div>
        </div>`;
      }).join('') : '<p style="color:#10b981;font-size:13px">All deals on track!</p>'}
    </div>
  </div>
  ${sn()}
</div>

<!-- SLIDE 9: Closing -->
<div class="slide slide-dark" style="justify-content:center;align-items:center;text-align:center">
  <div style="font-size:14px;letter-spacing:0.1em;opacity:0.4;margin-bottom:20px">END OF PRESENTATION</div>
  <h2 style="border:none;font-size:28px;margin-bottom:12px">Questions & Discussion</h2>
  <div style="font-size:14px;opacity:0.5">Generated by DealForge \u00b7 ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  ${sn()}
</div>

</body>
</html>`;
}
