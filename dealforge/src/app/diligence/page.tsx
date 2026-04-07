'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileSearch, Plus, AlertTriangle, CheckCircle2, Clock, Shield } from 'lucide-react';
import Link from 'next/link';
import { getDDProjects, getTargets, createDDProject, populateDDTemplates, getDDRisks, getDDFindings, getInfoRequests, getDDWorkstreams, getDDTasks } from '@/lib/db';
import { countTemplateTasks } from '@/lib/dd-templates';
import type { DDProject, Target, DDWorkstream } from '@/lib/types';
import { DD_WORKSTREAMS } from '@/lib/types';
import RAGDot from '@/components/RAGDot';
import ProgressBar from '@/components/ProgressBar';
import Modal from '@/components/Modal';

export default function DiligencePage() {
  const [projects, setProjects] = useState<DDProject[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const reload = useCallback(() => {
    setProjects(getDDProjects());
    setTargets(getTargets());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const eligibleTargets = targets.filter(t =>
    !projects.some(p => p.target_id === t.id) &&
    !['identified', 'closed_won', 'closed_lost'].includes(t.stage)
  );

  const [useTemplates, setUseTemplates] = useState(true);

  const handleCreate = (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    const project = createDDProject({ target_id: targetId, target_name: target.name });
    if (useTemplates) {
      populateDDTemplates(project.id);
    }
    setShowCreate(false);
    reload();
  };

  const active = projects.filter(p => p.status !== 'complete');
  const completed = projects.filter(p => p.status === 'complete');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Due Diligence</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {active.length} active projects · {completed.length} completed
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm" disabled={eligibleTargets.length === 0}>
          <Plus size={14} /> New DD Project
        </button>
      </div>

      {/* DD Portfolio Summary */}
      {projects.length > 0 && (() => {
        const allRisks = projects.flatMap(p => getDDRisks(p.id));
        const allFindings = projects.flatMap(p => getDDFindings(p.id));
        const allIRLs = projects.flatMap(p => getInfoRequests(p.id));
        const allWS = projects.flatMap(p => getDDWorkstreams(p.id));
        const allTasks = allWS.flatMap(ws => getDDTasks(ws.id));
        const openRisks = allRisks.filter(r => r.status === 'open' || r.status === 'mitigating');
        const criticalRisks = openRisks.filter(r => (r.risk_score || 0) >= 15);
        const overdueIRLs = allIRLs.filter(ir => ir.due_date && ir.status !== 'complete' && new Date(ir.due_date).getTime() < Date.now());
        const completedTasks = allTasks.filter(t => t.status === 'complete' || t.status === 'n_a');
        const redProjects = projects.filter(p => p.rag_status === 'red' && p.status !== 'complete');

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="glass-card p-3 text-center">
              <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>{active.length}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Active Projects</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-lg font-bold font-mono">
                {allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0}%
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{completedTasks.length}/{allTasks.length} Tasks</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-lg font-bold font-mono" style={{ color: criticalRisks.length > 0 ? 'var(--danger)' : 'var(--muted)' }}>
                {openRisks.length}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Open Risks {criticalRisks.length > 0 && `(${criticalRisks.length} critical)`}</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-lg font-bold font-mono" style={{ color: allFindings.filter(f => f.status === 'open').length > 0 ? 'var(--warning)' : 'var(--muted)' }}>
                {allFindings.filter(f => f.status === 'open').length}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Open Findings</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-lg font-bold font-mono" style={{ color: overdueIRLs.length > 0 ? 'var(--danger)' : 'var(--muted)' }}>
                {overdueIRLs.length}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Overdue IRLs</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-lg font-bold font-mono" style={{ color: redProjects.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {redProjects.length > 0 ? `${redProjects.length} Red` : 'All Clear'}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>RAG Status</div>
            </div>
          </div>
        );
      })()}

      {projects.length === 0 ? (
        <div className="glass-card p-12 text-center" style={{ color: 'var(--muted)' }}>
          <FileSearch size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-1">No due diligence projects yet</p>
          <p className="text-sm">Start a DD project from a target in your pipeline or create one here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Active</h2>
              <div className="grid gap-3">
                {active.map(p => <DDProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3" style={{ color: 'var(--muted-foreground)' }}>Completed</h2>
              <div className="grid gap-3">
                {completed.map(p => <DDProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Start Due Diligence">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Select a target from your pipeline to begin due diligence:
          </p>

          {/* Template toggle */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--background)' }}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useTemplates}
                onChange={e => setUseTemplates(e.target.checked)}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium">Pre-populate with VMS DD templates</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {countTemplateTasks()} tasks across 8 workstreams based on vertical market software
                  acquisition best practices. Includes customer reference calls, financial normalization,
                  operating ratio benchmarks, red flag checklists, and more.
                </div>
              </div>
            </label>
          </div>

          {eligibleTargets.length === 0 ? (
            <p className="text-sm p-4 rounded text-center" style={{ background: 'var(--background)', color: 'var(--muted)' }}>
              No eligible targets. Add targets to your pipeline first.
            </p>
          ) : (
            eligibleTargets.map(t => (
              <button
                key={t.id}
                onClick={() => handleCreate(t.id)}
                className="w-full text-left p-3 rounded-lg border transition-colors"
                style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
              >
                <div className="font-medium">{t.name}</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {t.vertical} · {t.geography || 'No geography'}
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

function DDProjectCard({ project }: { project: DDProject }) {
  const risks = getDDRisks(project.id);
  const findings = getDDFindings(project.id);
  const irls = getInfoRequests(project.id);
  const workstreams = getDDWorkstreams(project.id);
  const openRisks = risks.filter(r => r.status === 'open' || r.status === 'mitigating').length;
  const criticalRisks = risks.filter(r => (r.risk_score || 0) >= 15 && r.status !== 'closed').length;
  const openFindings = findings.filter(f => f.status === 'open').length;
  const pendingIrls = irls.filter(ir => ir.status !== 'complete').length;

  // Compute workstream progress
  const wsProgress = workstreams.map(ws => {
    const tasks = getDDTasks(ws.id);
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'complete' || t.status === 'n_a').length;
    return { ...ws, total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  // Days since start
  const daysSinceStart = Math.floor((Date.now() - new Date(project.start_date).getTime()) / 86400000);
  const daysToClose = project.target_close_date
    ? Math.floor((new Date(project.target_close_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <Link href={`/diligence/${project.id}`} className="glass-card p-4 block hover:border-opacity-80 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <RAGDot status={project.rag_status} size={12} />
          <span className="font-semibold">{project.target_name}</span>
          <span className="badge capitalize" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            {project.phase}
          </span>
        </div>
        <span className="text-sm font-mono font-bold" style={{ color: 'var(--accent)' }}>
          {project.overall_progress_pct}%
        </span>
      </div>
      <ProgressBar value={project.overall_progress_pct} />

      {/* Workstream mini progress */}
      {wsProgress.length > 0 && (
        <div className="mt-3 grid grid-cols-4 md:grid-cols-8 gap-1.5">
          {wsProgress.map(ws => {
            const wsInfo = DD_WORKSTREAMS.find(w => w.key === ws.key);
            const ragColor = ws.rag_status === 'green' ? 'var(--success)' : ws.rag_status === 'amber' ? 'var(--warning)' : ws.rag_status === 'red' ? 'var(--danger)' : 'var(--muted)';
            return (
              <div key={ws.id} className="text-center" title={`${wsInfo?.label}: ${ws.done}/${ws.total} tasks (${ws.pct}%)`}>
                <div className="h-1.5 rounded-full overflow-hidden mb-0.5" style={{ background: 'var(--background)' }}>
                  <div className="h-full rounded-full" style={{ width: `${ws.pct}%`, background: ragColor, transition: 'width 0.3s' }} />
                </div>
                <span className="text-[8px] leading-none" style={{ color: ragColor }}>{wsInfo?.label.substring(0, 4)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--muted)' }}>
        <span>{daysSinceStart}d elapsed</span>
        {daysToClose !== null && (
          <span style={{ color: daysToClose < 0 ? 'var(--danger)' : daysToClose < 14 ? 'var(--warning)' : 'var(--muted)' }}>
            {daysToClose < 0 ? `${Math.abs(daysToClose)}d overdue` : `${daysToClose}d to close`}
          </span>
        )}
        {openRisks > 0 && (
          <span style={{ color: criticalRisks > 0 ? 'var(--danger)' : 'var(--warning)' }}>
            {openRisks} risk{openRisks !== 1 ? 's' : ''}{criticalRisks > 0 ? ` (${criticalRisks} critical)` : ''}
          </span>
        )}
        {openFindings > 0 && (
          <span style={{ color: 'var(--warning)' }}>{openFindings} finding{openFindings !== 1 ? 's' : ''}</span>
        )}
        {pendingIrls > 0 && (
          <span style={{ color: 'var(--accent)' }}>{pendingIrls} IRL{pendingIrls !== 1 ? 's' : ''} pending</span>
        )}
      </div>
    </Link>
  );
}
