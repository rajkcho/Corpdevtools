'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileSearch, Plus } from 'lucide-react';
import Link from 'next/link';
import { getDDProjects, getTargets, createDDProject, populateDDTemplates } from '@/lib/db';
import { countTemplateTasks } from '@/lib/dd-templates';
import type { DDProject, Target } from '@/lib/types';
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
                <div className="text-sm font-medium">Pre-populate with CSU/Harris DD templates</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {countTemplateTasks()} tasks across 8 workstreams based on Constellation Software&apos;s
                  due diligence methodology. Includes customer reference calls, financial normalization,
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
      <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--muted)' }}>
        <span>Started: {new Date(project.start_date).toLocaleDateString()}</span>
        {project.target_close_date && <span>Target close: {new Date(project.target_close_date).toLocaleDateString()}</span>}
      </div>
    </Link>
  );
}
