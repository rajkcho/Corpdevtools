// ============================================================
// DealForge DD Report Generator
// Generates a structured text report from a DD project
// ============================================================

import {
  getDDProject, getDDWorkstreams, getDDTasks, getDDRisks,
  getDDFindings, getInfoRequests, getApprovalGates, getTarget,
} from './db';
import { DD_WORKSTREAMS } from './types';
import type { DDRisk, DDFinding, InformationRequest, DDWorkstream, DDTask } from './types';

function line(text: string): string { return text + '\n'; }
function heading(text: string, level: 1 | 2 | 3 = 1): string {
  const char = level === 1 ? '=' : level === 2 ? '-' : '.';
  return `\n${text}\n${char.repeat(text.length)}\n`;
}
function bullet(text: string, indent = 0): string { return ' '.repeat(indent) + `- ${text}\n`; }

export function generateDDReport(projectId: string): string {
  const project = getDDProject(projectId);
  if (!project) return 'Project not found.';

  const target = getTarget(project.target_id);
  const workstreams = getDDWorkstreams(projectId);
  const risks = getDDRisks(projectId);
  const findings = getDDFindings(projectId);
  const requests = getInfoRequests(projectId);
  const gates = getApprovalGates(projectId);

  let report = '';

  // Header
  report += heading(`DUE DILIGENCE REPORT: ${project.target_name.toUpperCase()}`);
  report += line(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  report += line(`Phase: ${project.phase.charAt(0).toUpperCase() + project.phase.slice(1)}`);
  report += line(`Overall Progress: ${project.overall_progress_pct}%`);
  report += line(`RAG Status: ${project.rag_status.toUpperCase()}`);
  report += line(`Start Date: ${new Date(project.start_date).toLocaleDateString()}`);
  if (project.target_close_date) {
    report += line(`Target Close: ${new Date(project.target_close_date).toLocaleDateString()}`);
  }

  // Target summary
  if (target) {
    report += heading('TARGET SUMMARY', 2);
    report += line(`Company: ${target.name}`);
    report += line(`Vertical: ${target.vertical}`);
    report += line(`Geography: ${target.geography || 'N/A'}`);
    if (target.revenue) report += line(`Revenue: $${(target.revenue / 1_000_000).toFixed(1)}M`);
    if (target.arr) report += line(`ARR: $${(target.arr / 1_000_000).toFixed(1)}M`);
    if (target.recurring_revenue_pct) report += line(`Recurring Revenue: ${target.recurring_revenue_pct}%`);
    if (target.gross_margin_pct) report += line(`Gross Margin: ${target.gross_margin_pct}%`);
    if (target.ebita_margin_pct) report += line(`EBITA Margin: ${target.ebita_margin_pct}%`);
    if (target.customer_count) report += line(`Customers: ${target.customer_count}`);
    if (target.employee_count) report += line(`Employees: ${target.employee_count}`);
    if (target.asking_price) report += line(`Asking Price: $${(target.asking_price / 1_000_000).toFixed(1)}M`);
    if (target.weighted_score) report += line(`Acquisition Score: ${target.weighted_score.toFixed(1)} / 5.0`);
  }

  // Phase gates
  report += heading('PHASE GATES', 2);
  const phases = ['preliminary', 'detailed', 'confirmatory', 'complete'] as const;
  for (const phase of phases) {
    const gate = gates.find(g => g.phase === phase);
    const status = gate ? gate.status.toUpperCase() : 'NOT SET';
    const date = gate?.decision_date ? ` (${new Date(gate.decision_date).toLocaleDateString()})` : '';
    report += bullet(`${phase.charAt(0).toUpperCase() + phase.slice(1)}: ${status}${date}`);
  }

  // Workstream summaries
  report += heading('WORKSTREAM STATUS', 2);
  for (const wsDef of DD_WORKSTREAMS) {
    const ws = workstreams.find(w => w.key === wsDef.key);
    if (!ws) continue;
    report += `\n${wsDef.label} [${ws.rag_status.toUpperCase()}] — ${ws.progress_pct}%\n`;
    if (ws.owner) report += line(`  Owner: ${ws.owner}`);
    if (ws.notes) report += line(`  Notes: ${ws.notes}`);

    const tasks = getDDTasks(ws.id);
    const parentTasks = tasks.filter(t => !t.parent_task_id);
    for (const parent of parentTasks) {
      const children = tasks.filter(t => t.parent_task_id === parent.id);
      const completed = children.filter(c => c.status === 'complete').length;
      const statusIcon = parent.status === 'complete' ? '[x]' : parent.status === 'blocked' ? '[!]' : '[ ]';
      report += bullet(`${statusIcon} ${parent.title} (${completed}/${children.length} subtasks done)`, 2);
    }
  }

  // Executive risk summary
  report += heading('RISK REGISTER', 2);
  const openRisks = risks.filter(r => r.status === 'open' || r.status === 'mitigating');
  const criticalRisks = openRisks.filter(r => (r.impact * r.probability) >= 12);
  const highRisks = openRisks.filter(r => (r.impact * r.probability) >= 8 && (r.impact * r.probability) < 12);

  report += line(`Total Risks: ${risks.length} | Open: ${openRisks.length} | Critical: ${criticalRisks.length} | High: ${highRisks.length}`);

  if (criticalRisks.length > 0) {
    report += '\nCritical Risks (Score >= 12):\n';
    for (const r of criticalRisks) {
      report += bullet(`[${r.impact}x${r.probability}=${r.impact * r.probability}] ${r.title} — ${r.description}`);
      if (r.mitigation) report += line(`    Mitigation: ${r.mitigation}`);
    }
  }

  if (highRisks.length > 0) {
    report += '\nHigh Risks (Score 8-11):\n';
    for (const r of highRisks) {
      report += bullet(`[${r.impact}x${r.probability}=${r.impact * r.probability}] ${r.title} — ${r.description}`);
      if (r.mitigation) report += line(`    Mitigation: ${r.mitigation}`);
    }
  }

  for (const r of openRisks.filter(r => (r.impact * r.probability) < 8)) {
    report += bullet(`[${r.impact}x${r.probability}=${r.impact * r.probability}] ${r.title}`);
  }

  // Findings
  report += heading('KEY FINDINGS', 2);
  const redFlags = findings.filter(f => f.type === 'red_flag');
  const concerns = findings.filter(f => f.type === 'concern');
  const positives = findings.filter(f => f.type === 'positive');
  const observations = findings.filter(f => f.type === 'observation');

  if (redFlags.length > 0) {
    report += '\nRed Flags:\n';
    for (const f of redFlags) report += bullet(`[${f.severity.toUpperCase()}] ${f.title}: ${f.description}`);
  }
  if (concerns.length > 0) {
    report += '\nConcerns:\n';
    for (const f of concerns) report += bullet(`[${f.severity.toUpperCase()}] ${f.title}: ${f.description}`);
  }
  if (positives.length > 0) {
    report += '\nPositive Findings:\n';
    for (const f of positives) report += bullet(`${f.title}: ${f.description}`);
  }
  if (observations.length > 0) {
    report += '\nObservations:\n';
    for (const f of observations) report += bullet(`${f.title}: ${f.description}`);
  }

  // IRL Status
  report += heading('INFORMATION REQUEST LIST', 2);
  const irlByStatus = {
    complete: requests.filter(r => r.status === 'complete'),
    received: requests.filter(r => r.status === 'received' || r.status === 'under_review'),
    sent: requests.filter(r => r.status === 'sent'),
    outstanding: requests.filter(r => r.status === 'draft' || r.status === 'overdue'),
  };
  report += line(`Total: ${requests.length} | Complete: ${irlByStatus.complete.length} | In Progress: ${irlByStatus.received.length} | Sent: ${irlByStatus.sent.length} | Outstanding: ${irlByStatus.outstanding.length}`);

  if (irlByStatus.outstanding.length > 0) {
    report += '\nOutstanding Requests:\n';
    for (const r of irlByStatus.outstanding) {
      report += bullet(`[${r.priority.toUpperCase()}] #${r.request_number}: ${r.title}`);
    }
  }

  // Footer
  report += '\n' + '='.repeat(60) + '\n';
  report += `Report generated by DealForge on ${new Date().toISOString()}\n`;

  return report;
}
