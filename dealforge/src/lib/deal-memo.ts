// ============================================================
// DealForge Deal Memo / Investment Summary Generator
// Generates a formatted investment memo from target data
// ============================================================

import { getTarget, getContacts, getTouchpoints, getDealTerms, getDDProjectByTarget, getDDRisks } from './db';
import { DEAL_STAGES, SCORE_CRITERIA, VERTICALS } from './types';

export function generateDealMemo(targetId: string): string {
  const target = getTarget(targetId);
  if (!target) return '';

  const contacts = getContacts(targetId);
  const touchpoints = getTouchpoints(targetId);
  const dealTerms = getDealTerms(targetId);
  const ddProject = getDDProjectByTarget(targetId);
  const risks = ddProject ? getDDRisks(ddProject.id) : [];

  const primaryContact = contacts.find(c => c.is_primary);
  const stage = DEAL_STAGES.find(s => s.key === target.stage);
  const daysInPipeline = Math.floor((Date.now() - new Date(target.created_at).getTime()) / 86400000);

  const formatCurrency = (n?: number) => {
    if (!n) return 'N/A';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  };

  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`INVESTMENT MEMO: ${target.name.toUpperCase()}`);
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push(`Status: ${stage?.label || target.stage} | Source: ${target.source}`);
  lines.push(`Days in Pipeline: ${daysInPipeline}`);
  lines.push('');

  // EXECUTIVE SUMMARY
  lines.push('━━━ EXECUTIVE SUMMARY ━━━');
  lines.push('');
  lines.push(`${target.name} is a ${target.vertical.toLowerCase()} vertical market software company`);
  if (target.geography) lines.push(`headquartered in ${target.geography}.`);
  if (target.description) {
    lines.push('');
    lines.push(target.description);
  }
  lines.push('');

  // KEY FINANCIALS
  lines.push('━━━ KEY FINANCIALS ━━━');
  lines.push('');
  lines.push(`Revenue:              ${formatCurrency(target.revenue)}`);
  lines.push(`ARR:                  ${formatCurrency(target.arr)}`);
  lines.push(`Recurring Rev %:      ${target.recurring_revenue_pct ? `${target.recurring_revenue_pct}%` : 'N/A'}`);
  lines.push(`Gross Margin:         ${target.gross_margin_pct ? `${target.gross_margin_pct}%` : 'N/A'}`);
  lines.push(`EBITA:                ${formatCurrency(target.ebita)}`);
  lines.push(`EBITA Margin:         ${target.ebita_margin_pct ? `${target.ebita_margin_pct}%` : 'N/A'}`);
  lines.push(`YoY Growth:           ${target.yoy_growth_pct ? `${target.yoy_growth_pct}%` : 'N/A'}`);
  lines.push(`Customer Count:       ${target.customer_count?.toLocaleString() || 'N/A'}`);
  lines.push(`Employee Count:       ${target.employee_count?.toLocaleString() || 'N/A'}`);
  lines.push(`Asking Price:         ${formatCurrency(target.asking_price)}`);
  lines.push('');

  // IMPLIED MULTIPLES
  if (target.asking_price) {
    lines.push('━━━ IMPLIED MULTIPLES ━━━');
    lines.push('');
    if (target.revenue) lines.push(`EV / Revenue:         ${(target.asking_price / target.revenue).toFixed(1)}x`);
    if (target.arr) lines.push(`EV / ARR:             ${(target.asking_price / target.arr).toFixed(1)}x`);
    if (target.ebita && target.ebita > 0) lines.push(`EV / EBITA:           ${(target.asking_price / target.ebita).toFixed(1)}x`);
    if (target.employee_count) lines.push(`Revenue / Employee:   ${formatCurrency(Math.round((target.revenue || 0) / target.employee_count))}`);
    lines.push('');
  }

  // ACQUISITION SCORECARD
  if (target.score) {
    lines.push('━━━ VMS ACQUISITION SCORECARD ━━━');
    lines.push('');
    for (const c of SCORE_CRITERIA) {
      const val = target.score[c.key];
      const bar = '█'.repeat(val) + '░'.repeat(5 - val);
      lines.push(`${c.label.padEnd(30)} ${bar}  ${val}/5`);
    }
    lines.push('');
    lines.push(`Weighted Score:       ${target.weighted_score?.toFixed(1) || 'N/A'} / 5.0`);
    lines.push('');
  }

  // DEAL TERMS
  if (dealTerms.length > 0) {
    lines.push('━━━ DEAL TERMS ━━━');
    lines.push('');
    for (const term of dealTerms) {
      lines.push(`${term.label.padEnd(30)} ${term.value}`);
      if (term.notes) lines.push(`${''.padEnd(30)} Note: ${term.notes}`);
    }
    lines.push('');
  }

  // KEY CONTACTS
  if (contacts.length > 0) {
    lines.push('━━━ KEY CONTACTS ━━━');
    lines.push('');
    for (const c of contacts) {
      lines.push(`${c.name}${c.title ? ` — ${c.title}` : ''}${c.is_primary ? ' (PRIMARY)' : ''}`);
      if (c.email) lines.push(`  Email: ${c.email}`);
      if (c.phone) lines.push(`  Phone: ${c.phone}`);
    }
    lines.push('');
  }

  // RELATIONSHIP HISTORY
  if (touchpoints.length > 0) {
    lines.push('━━━ RELATIONSHIP HISTORY ━━━');
    lines.push('');
    lines.push(`Total Touchpoints: ${touchpoints.length}`);
    lines.push(`First Contact: ${touchpoints.length > 0 ? new Date(touchpoints[touchpoints.length - 1].date).toLocaleDateString() : 'N/A'}`);
    lines.push(`Last Contact: ${touchpoints.length > 0 ? new Date(touchpoints[0].date).toLocaleDateString() : 'N/A'}`);
    lines.push('');
    for (const tp of touchpoints.slice(0, 5)) {
      lines.push(`  ${new Date(tp.date).toLocaleDateString()}  [${tp.type.toUpperCase()}]  ${tp.subject}`);
    }
    lines.push('');
  }

  // DD STATUS
  if (ddProject) {
    lines.push('━━━ DUE DILIGENCE STATUS ━━━');
    lines.push('');
    lines.push(`Phase: ${ddProject.phase} | Progress: ${ddProject.overall_progress_pct}%`);
    lines.push(`RAG Status: ${ddProject.rag_status.toUpperCase()}`);
    if (risks.length > 0) {
      const openRisks = risks.filter(r => r.status === 'open' || r.status === 'mitigating');
      lines.push(`Open Risks: ${openRisks.length} (${risks.filter(r => (r.risk_score || 0) >= 15).length} critical)`);
    }
    lines.push('');
  }

  // RISKS & CONCERNS
  if (risks.length > 0) {
    const openRisks = risks.filter(r => r.status !== 'closed').sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
    if (openRisks.length > 0) {
      lines.push('━━━ KEY RISKS ━━━');
      lines.push('');
      for (const r of openRisks.slice(0, 5)) {
        lines.push(`[${r.category.toUpperCase()}] ${r.title} (Score: ${r.risk_score || '?'})`);
        lines.push(`  ${r.description}`);
        if (r.mitigation) lines.push(`  Mitigation: ${r.mitigation}`);
        lines.push('');
      }
    }
  }

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('CONFIDENTIAL — For Internal Use Only');
  lines.push('Generated by DealForge');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}
