'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, AlertTriangle,
  FileText, CheckCircle2, Circle, Clock, Ban, Upload, Send, Eye,
  TrendingUp, DollarSign, Code, Scale, UserCheck, Settings,
  Users, BookOpen, Download, Edit2,
} from 'lucide-react';
import Link from 'next/link';
import {
  getDDProject, updateDDProject, getDDWorkstreams, updateDDWorkstream,
  getDDTasks, createDDTask, updateDDTask, deleteDDTask,
  getDDRisks, createDDRisk, updateDDRisk, deleteDDRisk,
  getDDFindings, createDDFinding, updateDDFinding, deleteDDFinding,
  getInfoRequests, createInfoRequest, updateInfoRequest, deleteInfoRequest,
  getDDDocuments, createDDDocument, deleteDDDocument,
  getApprovalGates, createApprovalGate, updateApprovalGate,
  recalcDDProgress,
} from '@/lib/db';
import { DD_WORKSTREAMS } from '@/lib/types';
import type {
  DDProject, DDWorkstream, DDTask, DDRisk, DDFinding,
  InformationRequest, DDDocument, ApprovalGate,
  DDWorkstreamKey, DDStatus, DDPhase,
} from '@/lib/types';
import Modal from '@/components/Modal';
import RAGDot from '@/components/RAGDot';
import ProgressBar from '@/components/ProgressBar';
import { generateDDReport } from '@/lib/dd-report';
import { generateDDChecklist } from '@/lib/dd-checklist-export';

const WS_ICONS: Record<string, React.ReactNode> = {
  commercial: <TrendingUp size={16} />,
  financial: <DollarSign size={16} />,
  customer: <Users size={16} />,
  technology: <Code size={16} />,
  legal: <Scale size={16} />,
  hr: <UserCheck size={16} />,
  tax: <FileText size={16} />,
  operational: <Settings size={16} />,
};

const STATUS_ICONS: Record<DDStatus, React.ReactNode> = {
  not_started: <Circle size={14} style={{ color: 'var(--muted)' }} />,
  in_progress: <Clock size={14} style={{ color: 'var(--accent)' }} />,
  blocked: <Ban size={14} style={{ color: 'var(--danger)' }} />,
  complete: <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />,
  n_a: <Ban size={14} style={{ color: 'var(--muted)' }} />,
};

export default function DDProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<DDProject | null>(null);
  const [workstreams, setWorkstreams] = useState<DDWorkstream[]>([]);
  const [expandedWs, setExpandedWs] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workstreams' | 'risks' | 'findings' | 'requests' | 'documents'>('workstreams');
  const [risks, setRisks] = useState<DDRisk[]>([]);
  const [findings, setFindings] = useState<DDFinding[]>([]);
  const [requests, setRequests] = useState<InformationRequest[]>([]);
  const [documents, setDocuments] = useState<DDDocument[]>([]);
  const [gates, setGates] = useState<ApprovalGate[]>([]);
  const [showModal, setShowModal] = useState<string | null>(null);

  const reload = useCallback(() => {
    const p = getDDProject(id);
    if (!p) { router.push('/diligence'); return; }
    setProject(p);
    setWorkstreams(getDDWorkstreams(id));
    setRisks(getDDRisks(id));
    setFindings(getDDFindings(id));
    setRequests(getInfoRequests(id));
    setDocuments(getDDDocuments(id));
    setGates(getApprovalGates(id));
  }, [id, router]);

  useEffect(() => { reload(); }, [reload]);

  if (!project) return null;

  const handleRecalc = () => {
    recalcDDProgress(id);
    reload();
  };

  const handlePhaseChange = (phase: DDPhase) => {
    updateDDProject(id, { phase });
    reload();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/diligence" className="btn btn-ghost p-2 mt-1"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-2xl font-bold">{project.target_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <RAGDot status={project.rag_status} size={12} />
              <span className="text-sm font-medium capitalize">{project.phase} Phase</span>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {project.overall_progress_pct}% complete
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={project.phase}
            onChange={e => handlePhaseChange(e.target.value as DDPhase)}
            className="text-sm"
          >
            <option value="preliminary">Preliminary</option>
            <option value="detailed">Detailed</option>
            <option value="confirmatory">Confirmatory</option>
            <option value="complete">Complete</option>
          </select>
          <button onClick={handleRecalc} className="btn btn-secondary btn-sm">Recalculate</button>
          <button
            onClick={() => {
              const report = generateDDReport(id);
              const blob = new Blob([report], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `dd-report-${project.target_name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn btn-secondary btn-sm"
          >
            <Download size={14} /> Export Report
          </button>
          <button
            onClick={() => {
              const html = generateDDChecklist(id);
              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `dd-checklist-${project.target_name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.html`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn btn-secondary btn-sm"
          >
            <CheckCircle2 size={14} /> Export Checklist
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm font-mono font-bold" style={{ color: 'var(--accent)' }}>{project.overall_progress_pct}%</span>
        </div>
        <ProgressBar value={project.overall_progress_pct} />
        <div className="grid grid-cols-4 gap-3 mt-4">
          {workstreams.map(ws => (
            <div key={ws.id} className="flex items-center gap-2 text-xs">
              <RAGDot status={ws.rag_status} size={8} />
              <span style={{ color: 'var(--muted-foreground)' }}>{ws.label}</span>
              <span className="ml-auto font-mono">{ws.progress_pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Approval Gates */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Phase Gates</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Approval required to advance phases</span>
        </div>
        <div className="flex items-center gap-2">
          {(['preliminary', 'detailed', 'confirmatory', 'complete'] as DDPhase[]).map((phase, i) => {
            const gate = gates.find(g => g.phase === phase);
            const isCurrent = project.phase === phase;
            const isPast = ['preliminary', 'detailed', 'confirmatory', 'complete'].indexOf(project.phase) > i;
            const isApproved = gate?.status === 'approved';
            return (
              <div key={phase} className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => {
                    if (gate) {
                      const next = gate.status === 'approved' ? 'pending' : 'approved';
                      updateApprovalGate(gate.id, { status: next, decision_date: next === 'approved' ? new Date().toISOString() : undefined });
                    } else {
                      createApprovalGate({ project_id: id, phase, title: `${phase} gate`, status: 'approved', decision_date: new Date().toISOString() });
                    }
                    reload();
                  }}
                  className="flex-1 py-2 rounded-lg text-xs font-medium text-center transition-all"
                  style={{
                    background: isApproved || isPast ? 'rgba(16,185,129,0.15)' : isCurrent ? 'var(--accent-muted)' : 'var(--background)',
                    color: isApproved || isPast ? 'var(--success)' : isCurrent ? 'var(--accent)' : 'var(--muted)',
                    border: isCurrent ? '1px solid var(--accent)' : '1px solid transparent',
                  }}
                >
                  <div className="capitalize">{phase}</div>
                  <div className="text-xs mt-0.5 opacity-70">
                    {isApproved ? 'Approved' : isPast ? 'Passed' : isCurrent ? 'Current' : 'Pending'}
                  </div>
                </button>
                {i < 3 && <ChevronRight size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Executive Summary */}
      <details className="glass-card">
        <summary className="p-4 cursor-pointer text-sm font-medium flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
          <FileText size={14} /> Executive Summary
        </summary>
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg" style={{ background: 'var(--background)' }}>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Open Risks</div>
              <div className="text-xl font-bold" style={{ color: risks.filter(r => (r.risk_score || 0) >= 15 && r.status !== 'closed').length > 0 ? 'var(--danger)' : 'var(--foreground)' }}>
                {risks.filter(r => r.status === 'open' || r.status === 'mitigating').length}
              </div>
              {risks.filter(r => (r.risk_score || 0) >= 15 && r.status !== 'closed').length > 0 && (
                <div className="text-xs" style={{ color: 'var(--danger)' }}>{risks.filter(r => (r.risk_score || 0) >= 15 && r.status !== 'closed').length} critical</div>
              )}
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--background)' }}>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Open Findings</div>
              <div className="text-xl font-bold">{findings.filter(f => f.status === 'open').length}</div>
              {findings.filter(f => f.severity === 'critical' || f.severity === 'high').length > 0 && (
                <div className="text-xs" style={{ color: 'var(--warning)' }}>{findings.filter(f => (f.severity === 'critical' || f.severity === 'high') && f.status === 'open').length} high/critical</div>
              )}
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--background)' }}>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>IRL Completion</div>
              <div className="text-xl font-bold">
                {requests.length > 0 ? Math.round((requests.filter(r => r.status === 'complete').length / requests.length) * 100) : 0}%
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{requests.filter(r => r.status === 'complete').length}/{requests.length} complete</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--background)' }}>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Documents</div>
              <div className="text-xl font-bold">{documents.length}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>uploaded</div>
            </div>
          </div>
          {/* Top risks list */}
          {risks.filter(r => r.status !== 'closed').sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 3).length > 0 && (
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Top Risks</div>
              {risks.filter(r => r.status !== 'closed').sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center gap-2 text-xs py-1">
                  <span className="font-mono font-bold w-6 text-center" style={{
                    color: (r.risk_score || 0) >= 15 ? 'var(--danger)' : (r.risk_score || 0) >= 8 ? 'var(--warning)' : 'var(--accent)',
                  }}>{r.risk_score}</span>
                  <span>{r.title}</span>
                  <span className="ml-auto capitalize badge" style={{ background: 'var(--background)' }}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
          {/* Blocked workstreams */}
          {workstreams.filter(ws => ws.rag_status === 'red').length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--danger)' }}>Blocked Workstreams</div>
              {workstreams.filter(ws => ws.rag_status === 'red').map(ws => (
                <div key={ws.id} className="text-xs py-0.5">{ws.label} ({ws.progress_pct}%)</div>
              ))}
            </div>
          )}
        </div>
      </details>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--card)' }}>
        {([
          { key: 'workstreams', label: 'Workstreams' },
          { key: 'risks', label: `Risks (${risks.filter(r => r.status === 'open').length})` },
          { key: 'findings', label: `Findings (${findings.length})` },
          { key: 'requests', label: `IRL (${requests.length})` },
          { key: 'documents', label: `Documents (${documents.length})` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors"
            style={{
              background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--muted-foreground)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Workstreams Tab */}
      {activeTab === 'workstreams' && (
        <div className="space-y-3">
          {workstreams.map(ws => (
            <WorkstreamSection
              key={ws.id}
              workstream={ws}
              expanded={expandedWs === ws.id}
              onToggle={() => setExpandedWs(expandedWs === ws.id ? null : ws.id)}
              onReload={() => { handleRecalc(); }}
            />
          ))}
        </div>
      )}

      {/* Risks Tab */}
      {activeTab === 'risks' && (
        <RisksPanel projectId={id} risks={risks} onReload={reload} />
      )}

      {/* Findings Tab */}
      {activeTab === 'findings' && (
        <FindingsPanel projectId={id} findings={findings} workstreams={workstreams} onReload={reload} />
      )}

      {/* IRL Tab */}
      {activeTab === 'requests' && (
        <IRLPanel projectId={id} requests={requests} workstreams={workstreams} onReload={reload} />
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <DocumentsPanel projectId={id} documents={documents} workstreams={workstreams} onReload={reload} />
      )}
    </div>
  );
}

// === WORKSTREAM SECTION (Hierarchical) ===
function WorkstreamSection({ workstream, expanded, onToggle, onReload }: {
  workstream: DDWorkstream; expanded: boolean; onToggle: () => void; onReload: () => void;
}) {
  const [tasks, setTasks] = useState<DDTask[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<DDTask['priority']>('medium');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (expanded) setTasks(getDDTasks(workstream.id));
  }, [expanded, workstream.id]);

  const refreshTasks = () => { setTasks(getDDTasks(workstream.id)); onReload(); };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    createDDTask({ workstream_id: workstream.id, title: newTaskTitle, priority: newTaskPriority });
    setNewTaskTitle('');
    refreshTasks();
  };

  const handleStatusChange = (taskId: string, status: DDStatus) => {
    updateDDTask(taskId, { status });
    refreshTasks();
  };

  const handleDeleteTask = (taskId: string) => {
    deleteDDTask(taskId);
    refreshTasks();
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  const toggleDescription = (taskId: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  // Mark all children of a parent complete/not_started
  const bulkSetGroupStatus = (parentId: string, status: DDStatus) => {
    const children = tasks.filter(t => t.parent_task_id === parentId);
    for (const child of children) {
      updateDDTask(child.id, { status });
    }
    updateDDTask(parentId, { status });
    refreshTasks();
  };

  // Group tasks: parents (no parent_task_id) and their children
  const parentTasks = tasks.filter(t => !t.parent_task_id);
  const orphanTasks = tasks.filter(t => t.parent_task_id && !parentTasks.find(p => p.id === t.parent_task_id));
  const getChildren = (parentId: string) => tasks.filter(t => t.parent_task_id === parentId);

  const wsInfo = DD_WORKSTREAMS.find(w => w.key === workstream.key);

  // Stats
  const totalTasks = tasks.filter(t => t.parent_task_id).length || tasks.length;
  const completeTasks = tasks.filter(t => (t.parent_task_id || parentTasks.length === 0) && t.status === 'complete').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

  return (
    <div className="glass-card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
        <span style={{ color: 'var(--accent)' }}>{WS_ICONS[workstream.key]}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{workstream.label}</span>
            <RAGDot status={workstream.rag_status} size={8} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {completeTasks}/{totalTasks} tasks
              {blockedTasks > 0 && <span style={{ color: 'var(--danger)' }}> · {blockedTasks} blocked</span>}
            </span>
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{wsInfo?.description}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono" style={{ color: 'var(--muted-foreground)' }}>{workstream.progress_pct}%</span>
          <div className="w-24"><ProgressBar value={workstream.progress_pct} /></div>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--border)' }}>
          {/* Workstream owner & notes */}
          <div className="flex items-center gap-3 mb-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs" style={{ color: 'var(--muted)' }}>Owner:</label>
              <input
                value={workstream.owner || ''}
                onChange={e => { updateDDWorkstream(workstream.id, { owner: e.target.value }); onReload(); }}
                placeholder="Assign owner..."
                className="flex-1 text-xs"
                style={{ padding: '0.25rem 0.5rem' }}
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs" style={{ color: 'var(--muted)' }}>Notes:</label>
              <input
                value={workstream.notes || ''}
                onChange={e => { updateDDWorkstream(workstream.id, { notes: e.target.value }); onReload(); }}
                placeholder="Workstream notes..."
                className="flex-1 text-xs"
                style={{ padding: '0.25rem 0.5rem' }}
              />
            </div>
          </div>

          {/* Batch actions */}
          {tasks.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => {
                  for (const t of tasks) updateDDTask(t.id, { status: 'complete' });
                  refreshTasks();
                }}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.65rem' }}
              >
                <CheckCircle2 size={12} /> Mark All Complete
              </button>
              <button
                onClick={() => {
                  for (const t of tasks) updateDDTask(t.id, { status: 'not_started' });
                  refreshTasks();
                }}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.65rem' }}
              >
                <Circle size={12} /> Reset All
              </button>
              <button
                onClick={() => {
                  for (const t of tasks) {
                    if (t.status === 'not_started') updateDDTask(t.id, { status: 'n_a' });
                  }
                  refreshTasks();
                }}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.65rem' }}
              >
                <Ban size={12} /> Mark Remaining N/A
              </button>
            </div>
          )}

          {/* Hierarchical task groups */}
          <div className="space-y-3">
            {parentTasks.map(parent => {
              const children = getChildren(parent.id);
              const isCollapsed = collapsedGroups.has(parent.id);
              const hasChildren = children.length > 0;
              const childComplete = children.filter(c => c.status === 'complete' || c.status === 'n_a').length;
              const groupProgress = hasChildren ? Math.round((childComplete / children.length) * 100) : (parent.status === 'complete' ? 100 : 0);

              return (
                <div key={parent.id} className="rounded-lg" style={{ background: 'var(--background)' }}>
                  {/* Group header (parent task) */}
                  <div className="flex items-center gap-2 p-2.5">
                    {hasChildren ? (
                      <button onClick={() => toggleGroupCollapse(parent.id)} className="p-0.5">
                        {isCollapsed ? <ChevronRight size={14} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--muted)' }} />}
                      </button>
                    ) : (
                      <button onClick={() => handleStatusChange(parent.id, parent.status === 'complete' ? 'not_started' : 'complete')}>
                        {STATUS_ICONS[parent.status]}
                      </button>
                    )}
                    <BookOpen size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span className="font-medium text-sm flex-1">{parent.title}</span>
                    {hasChildren && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded" style={{
                        background: groupProgress === 100 ? 'rgba(16,185,129,0.15)' : 'var(--card)',
                        color: groupProgress === 100 ? 'var(--success)' : 'var(--muted-foreground)',
                      }}>
                        {childComplete}/{children.length}
                      </span>
                    )}
                    <span className="badge" style={{
                      background: parent.priority === 'critical' ? 'rgba(239,68,68,0.15)' : parent.priority === 'high' ? 'rgba(245,158,11,0.15)' : 'transparent',
                      color: parent.priority === 'critical' ? 'var(--danger)' : parent.priority === 'high' ? 'var(--warning)' : 'var(--muted)',
                      fontSize: '0.65rem',
                    }}>
                      {parent.priority}
                    </span>
                    {hasChildren && (
                      <button
                        onClick={() => bulkSetGroupStatus(parent.id, childComplete === children.length ? 'not_started' : 'complete')}
                        className="btn btn-ghost btn-sm text-xs"
                        title={childComplete === children.length ? 'Reset all' : 'Complete all'}
                      >
                        {childComplete === children.length ? 'Reset' : 'All'}
                      </button>
                    )}
                    <button onClick={() => handleDeleteTask(parent.id)} className="opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} style={{ color: 'var(--danger)' }} />
                    </button>
                  </div>

                  {/* Group description */}
                  {parent.description && (
                    <div className="px-9 pb-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>{parent.description}</div>
                  )}

                  {/* Child tasks */}
                  {hasChildren && !isCollapsed && (
                    <div className="pl-9 pr-2 pb-2 space-y-0.5">
                      {children.map(task => (
                        <div key={task.id} className="group">
                          <div className="flex items-start gap-2 p-1.5 rounded text-sm hover:bg-opacity-50">
                            <button onClick={() => handleStatusChange(task.id, task.status === 'complete' ? 'not_started' : 'complete')} className="mt-0.5 flex-shrink-0">
                              {STATUS_ICONS[task.status]}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className={`${task.status === 'complete' ? 'line-through opacity-50' : ''}`}>{task.title}</span>
                                {task.description && (
                                  <button onClick={() => toggleDescription(task.id)} className="flex-shrink-0 opacity-50 hover:opacity-100">
                                    <Eye size={11} />
                                  </button>
                                )}
                              </div>
                              {task.description && expandedDescriptions.has(task.id) && (
                                <p className="text-xs mt-1 p-1.5 rounded" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <span className="badge flex-shrink-0" style={{
                              background: task.priority === 'critical' ? 'rgba(239,68,68,0.15)' : task.priority === 'high' ? 'rgba(245,158,11,0.15)' : 'transparent',
                              color: task.priority === 'critical' ? 'var(--danger)' : task.priority === 'high' ? 'var(--warning)' : 'var(--muted)',
                              fontSize: '0.6rem',
                            }}>
                              {task.priority}
                            </span>
                            <select
                              value={task.status}
                              onChange={e => handleStatusChange(task.id, e.target.value as DDStatus)}
                              className="text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              style={{ width: 90, padding: '1px 2px' }}
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="blocked">Blocked</option>
                              <option value="complete">Complete</option>
                              <option value="n_a">N/A</option>
                            </select>
                            <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 flex-shrink-0">
                              <Trash2 size={11} style={{ color: 'var(--danger)' }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Group progress bar */}
                  {hasChildren && (
                    <div className="px-9 pb-2">
                      <div className="progress-bar w-full" style={{ height: 3 }}>
                        <div className="progress-fill" style={{ width: `${groupProgress}%`, background: groupProgress === 100 ? 'var(--success)' : 'var(--accent)' }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Orphan tasks (no parent) - render flat */}
            {orphanTasks.length > 0 && (
              <div className="rounded-lg p-2 space-y-1" style={{ background: 'var(--background)' }}>
                <div className="text-xs font-medium px-2 mb-1" style={{ color: 'var(--muted)' }}>Uncategorized Tasks</div>
                {orphanTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 p-1.5 rounded text-sm group">
                    <button onClick={() => handleStatusChange(task.id, task.status === 'complete' ? 'not_started' : 'complete')}>
                      {STATUS_ICONS[task.status]}
                    </button>
                    <span className={`flex-1 ${task.status === 'complete' ? 'line-through opacity-50' : ''}`}>{task.title}</span>
                    <select
                      value={task.status}
                      onChange={e => handleStatusChange(task.id, e.target.value as DDStatus)}
                      className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ width: 90, padding: '1px 2px' }}
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="complete">Complete</option>
                      <option value="n_a">N/A</option>
                    </select>
                    <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100">
                      <Trash2 size={11} style={{ color: 'var(--danger)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add task inline */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <input
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTask()}
              placeholder="Add custom task..."
              className="flex-1 text-sm"
            />
            <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as DDTask['priority'])} className="text-xs" style={{ width: 90 }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="btn btn-primary btn-sm">
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// === RISKS PANEL ===
function RisksPanel({ projectId, risks, onReload }: { projectId: string; risks: DDRisk[]; onReload: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'operational' as DDRisk['category'], impact: 3 as DDRisk['impact'], probability: 3 as DDRisk['probability'], mitigation: '' });

  const handleAdd = () => {
    createDDRisk({ project_id: projectId, ...form });
    setForm({ title: '', description: '', category: 'operational', impact: 3, probability: 3, mitigation: '' });
    setShowAdd(false);
    onReload();
  };

  const sorted = [...risks].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Risk Register</h2>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm"><Plus size={14} /> Add Risk</button>
      </div>

      {/* Risk Summary + 5x5 Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <div className="text-xs font-medium mb-3" style={{ color: 'var(--muted-foreground)' }}>Risk Summary</div>
          <div className="grid grid-cols-4 gap-4 text-center text-xs">
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--danger)' }}>
                {risks.filter(r => (r.risk_score || 0) >= 15 && r.status !== 'closed').length}
              </div>
              <div style={{ color: 'var(--muted-foreground)' }}>Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
                {risks.filter(r => (r.risk_score || 0) >= 8 && (r.risk_score || 0) < 15 && r.status !== 'closed').length}
              </div>
              <div style={{ color: 'var(--muted-foreground)' }}>High</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                {risks.filter(r => (r.risk_score || 0) >= 4 && (r.risk_score || 0) < 8 && r.status !== 'closed').length}
              </div>
              <div style={{ color: 'var(--muted-foreground)' }}>Medium</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
                {risks.filter(r => (r.risk_score || 0) < 4 && r.status !== 'closed').length}
              </div>
              <div style={{ color: 'var(--muted-foreground)' }}>Low</div>
            </div>
          </div>
        </div>

        {/* 5x5 Heatmap */}
        <div className="glass-card p-4">
          <div className="text-xs font-medium mb-3" style={{ color: 'var(--muted-foreground)' }}>Impact vs Probability Matrix</div>
          <div className="flex gap-1">
            <div className="flex flex-col justify-between items-center mr-1 py-1" style={{ fontSize: '0.6rem', color: 'var(--muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              IMPACT
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-0.5">
                {[5, 4, 3, 2, 1].map(impact =>
                  [1, 2, 3, 4, 5].map(prob => {
                    const score = impact * prob;
                    const count = risks.filter(r => r.impact === impact && r.probability === prob && r.status !== 'closed').length;
                    const bg = score >= 15 ? 'rgba(239,68,68,0.6)' : score >= 10 ? 'rgba(239,68,68,0.3)' : score >= 6 ? 'rgba(245,158,11,0.3)' : score >= 3 ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.15)';
                    return (
                      <div
                        key={`${impact}-${prob}`}
                        className="aspect-square rounded flex items-center justify-center text-xs font-bold"
                        style={{ background: bg, color: count > 0 ? 'var(--foreground)' : 'transparent', minHeight: 28 }}
                        title={`Impact ${impact} × Prob ${prob} = ${score}`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex justify-between mt-1 px-1" style={{ fontSize: '0.55rem', color: 'var(--muted)' }}>
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
              <div className="text-center mt-0.5" style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>PROBABILITY</div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk List */}
      <div className="space-y-2">
        {sorted.map(r => (
          <div key={r.id} className="glass-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{
                    background: (r.risk_score || 0) >= 15 ? 'rgba(239,68,68,0.15)' : (r.risk_score || 0) >= 8 ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                    color: (r.risk_score || 0) >= 15 ? 'var(--danger)' : (r.risk_score || 0) >= 8 ? 'var(--warning)' : 'var(--accent)',
                  }}>
                    {r.risk_score}
                  </span>
                  <div>
                    <div className="font-medium text-sm">{r.title}</div>
                    <div className="text-xs capitalize" style={{ color: 'var(--muted)' }}>
                      {r.category} · Impact: {r.impact} · Prob: {r.probability}
                    </div>
                  </div>
                </div>
                {r.description && <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>{r.description}</p>}
                {r.mitigation && (
                  <p className="text-sm mt-1" style={{ color: 'var(--success)' }}>Mitigation: {r.mitigation}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={r.status}
                  onChange={e => { updateDDRisk(r.id, { status: e.target.value as DDRisk['status'] }); onReload(); }}
                  className="text-xs"
                  style={{ width: 100 }}
                >
                  <option value="open">Open</option>
                  <option value="mitigating">Mitigating</option>
                  <option value="accepted">Accepted</option>
                  <option value="closed">Closed</option>
                </select>
                <button onClick={() => { deleteDDRisk(r.id); onReload(); }} className="btn btn-ghost btn-sm">
                  <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Risk">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full" required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full" rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as DDRisk['category'] }))} className="w-full text-sm">
                <option value="customer">Customer</option>
                <option value="financial">Financial</option>
                <option value="technology">Technology</option>
                <option value="legal">Legal</option>
                <option value="people">People</option>
                <option value="operational">Operational</option>
                <option value="market">Market</option>
                <option value="regulatory">Regulatory</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Impact (1-5)</label>
              <input type="number" min="1" max="5" value={form.impact} onChange={e => setForm(f => ({ ...f, impact: Number(e.target.value) as DDRisk['impact'] }))} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Probability (1-5)</label>
              <input type="number" min="1" max="5" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: Number(e.target.value) as DDRisk['probability'] }))} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Mitigation Plan</label>
            <textarea value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} className="w-full" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={!form.title} className="btn btn-primary">Add Risk</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// === FINDINGS PANEL ===
function FindingsPanel({ projectId, findings, workstreams, onReload }: { projectId: string; findings: DDFinding[]; workstreams: DDWorkstream[]; onReload: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium' as DDFinding['severity'], type: 'observation' as DDFinding['type'], workstream_key: '' as string });

  const handleAdd = () => {
    createDDFinding({ project_id: projectId, ...form, workstream_key: form.workstream_key as DDWorkstreamKey || undefined });
    setForm({ title: '', description: '', severity: 'medium', type: 'observation', workstream_key: '' });
    setShowAdd(false);
    onReload();
  };

  const severityColors: Record<string, string> = { critical: 'var(--danger)', high: '#f97316', medium: 'var(--warning)', low: 'var(--accent)', info: 'var(--muted)' };
  const typeColors: Record<string, string> = { red_flag: 'var(--danger)', concern: 'var(--warning)', observation: 'var(--accent)', positive: 'var(--success)' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Findings & Issues</h2>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm"><Plus size={14} /> Add Finding</button>
      </div>
      {findings.length === 0 ? (
        <div className="glass-card p-8 text-center" style={{ color: 'var(--muted)' }}>No findings recorded yet.</div>
      ) : (
        <div className="space-y-2">
          {findings.map(f => (
            <div key={f.id} className="glass-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} style={{ color: severityColors[f.severity], marginTop: 2 }} />
                  <div>
                    <div className="font-medium text-sm">{f.title}</div>
                    <div className="flex gap-2 mt-1">
                      <span className="badge" style={{ background: `${severityColors[f.severity]}20`, color: severityColors[f.severity] }}>{f.severity}</span>
                      <span className="badge capitalize" style={{ background: `${typeColors[f.type]}20`, color: typeColors[f.type] }}>{f.type.replace('_', ' ')}</span>
                      {f.workstream_key && (
                        <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                          {DD_WORKSTREAMS.find(w => w.key === f.workstream_key)?.label}
                        </span>
                      )}
                    </div>
                    {f.description && <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>{f.description}</p>}
                    {f.resolution && <p className="text-sm mt-1" style={{ color: 'var(--success)' }}>Resolution: {f.resolution}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={f.status}
                    onChange={e => { updateDDFinding(f.id, { status: e.target.value as DDFinding['status'] }); onReload(); }}
                    className="text-xs" style={{ width: 100 }}
                  >
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="accepted">Accepted</option>
                  </select>
                  <button onClick={() => { deleteDDFinding(f.id); onReload(); }} className="btn btn-ghost btn-sm">
                    <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Finding">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full" rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as DDFinding['severity'] }))} className="w-full text-sm">
                <option value="info">Info</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DDFinding['type'] }))} className="w-full text-sm">
                <option value="red_flag">Red Flag</option>
                <option value="concern">Concern</option>
                <option value="observation">Observation</option>
                <option value="positive">Positive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Workstream</label>
              <select value={form.workstream_key} onChange={e => setForm(f => ({ ...f, workstream_key: e.target.value }))} className="w-full text-sm">
                <option value="">General</option>
                {DD_WORKSTREAMS.map(ws => <option key={ws.key} value={ws.key}>{ws.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={!form.title} className="btn btn-primary">Add Finding</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// === IRL PANEL ===
function IRLPanel({ projectId, requests, workstreams, onReload }: { projectId: string; requests: InformationRequest[]; workstreams: DDWorkstream[]; onReload: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as InformationRequest['priority'], workstream_key: '', due_date: '' });

  const handleAdd = () => {
    createInfoRequest({ project_id: projectId, ...form, workstream_key: form.workstream_key as DDWorkstreamKey || undefined });
    setForm({ title: '', description: '', priority: 'medium', workstream_key: '', due_date: '' });
    setShowAdd(false);
    onReload();
  };

  const statusColors: Record<string, string> = { draft: 'var(--muted)', sent: 'var(--accent)', received: 'var(--success)', under_review: 'var(--warning)', complete: 'var(--success)', overdue: 'var(--danger)' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Information Request List (IRL)</h2>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm"><Plus size={14} /> Add Request</button>
      </div>

      {/* Summary */}
      <div className="glass-card p-4 grid grid-cols-5 gap-4 text-center text-xs">
        {['draft', 'sent', 'received', 'under_review', 'complete'].map(s => (
          <div key={s}>
            <div className="text-lg font-bold" style={{ color: statusColors[s] }}>
              {requests.filter(r => r.status === s).length}
            </div>
            <div className="capitalize" style={{ color: 'var(--muted-foreground)' }}>{s.replace('_', ' ')}</div>
          </div>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="glass-card p-8 text-center" style={{ color: 'var(--muted)' }}>No information requests yet.</div>
      ) : (
        <div className="space-y-2">
          {requests.map(r => (
            <div key={r.id} className="glass-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>#{r.request_number}</span>
                    <span className="font-medium text-sm">{r.title}</span>
                    <span className="badge capitalize" style={{ background: `${statusColors[r.status]}20`, color: statusColors[r.status] }}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                  {r.description && <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{r.description}</p>}
                  {r.due_date && (
                    <span className="text-xs mt-1 inline-block" style={{ color: new Date(r.due_date) < new Date() ? 'var(--danger)' : 'var(--muted)' }}>
                      Due: {new Date(r.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={r.status}
                    onChange={e => { updateInfoRequest(r.id, { status: e.target.value as InformationRequest['status'] }); onReload(); }}
                    className="text-xs" style={{ width: 110 }}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="received">Received</option>
                    <option value="under_review">Under Review</option>
                    <option value="complete">Complete</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <button onClick={() => { deleteInfoRequest(r.id); onReload(); }} className="btn btn-ghost btn-sm">
                    <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Information Request">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full" placeholder="e.g. Last 3 years audited financials" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full" rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as InformationRequest['priority'] }))} className="w-full text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Workstream</label>
              <select value={form.workstream_key} onChange={e => setForm(f => ({ ...f, workstream_key: e.target.value }))} className="w-full text-sm">
                <option value="">General</option>
                {DD_WORKSTREAMS.map(ws => <option key={ws.key} value={ws.key}>{ws.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={!form.title} className="btn btn-primary">Add Request</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// === DOCUMENTS PANEL ===
function DocumentsPanel({ projectId, documents, workstreams, onReload }: { projectId: string; documents: DDDocument[]; workstreams: DDWorkstream[]; onReload: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ file_name: '', category: 'other' as DDDocument['category'], workstream_key: '', notes: '' });
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; data: string; size: number } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Limit to 5MB for localStorage
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB for local storage.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setUploadedFile({ name: file.name, type: file.type, data, size: file.size });
      if (!form.file_name) {
        setForm(f => ({ ...f, file_name: file.name }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = () => {
    createDDDocument({
      project_id: projectId,
      file_name: form.file_name,
      file_type: uploadedFile?.type || 'manual',
      file_url: uploadedFile?.data || '',
      file_size: uploadedFile?.size,
      category: form.category,
      workstream_key: form.workstream_key as DDWorkstreamKey || undefined,
      notes: form.notes,
    });
    setForm({ file_name: '', category: 'other', workstream_key: '', notes: '' });
    setUploadedFile(null);
    setShowAdd(false);
    onReload();
  };

  const handleDownload = (doc: DDDocument) => {
    if (!doc.file_url || !doc.file_url.startsWith('data:')) return;
    const a = document.createElement('a');
    a.href = doc.file_url;
    a.download = doc.file_name;
    a.click();
  };

  const categoryLabels: Record<string, string> = {
    financial_statement: 'Financial Statement', contract: 'Contract', customer_list: 'Customer List',
    org_chart: 'Org Chart', technical: 'Technical', legal: 'Legal', tax: 'Tax', other: 'Other',
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Document Vault</h2>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm"><Upload size={14} /> Upload Document</button>
      </div>
      {documents.length === 0 ? (
        <div className="glass-card p-8 text-center" style={{ color: 'var(--muted)' }}>
          <Upload size={32} className="mx-auto mb-2 opacity-50" />
          <p>No documents uploaded yet.</p>
          <p className="text-xs mt-1">Upload files up to 5MB. Files are stored locally in your browser.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(d => (
            <div key={d.id} className="glass-card p-3 flex items-center gap-3">
              <FileText size={18} style={{ color: 'var(--accent)' }} />
              <div className="flex-1">
                <div className="text-sm font-medium">{d.file_name}</div>
                <div className="flex gap-2 mt-0.5">
                  <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{categoryLabels[d.category]}</span>
                  {d.workstream_key && (
                    <span className="badge" style={{ background: 'var(--background)', color: 'var(--muted-foreground)' }}>
                      {DD_WORKSTREAMS.find(w => w.key === d.workstream_key)?.label}
                    </span>
                  )}
                  {d.file_size && <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatSize(d.file_size)}</span>}
                </div>
                {d.notes && <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{d.notes}</p>}
              </div>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{new Date(d.uploaded_at).toLocaleDateString()}</span>
              {d.file_url && d.file_url.startsWith('data:') && (
                <button onClick={() => handleDownload(d)} className="btn btn-ghost btn-sm" title="Download">
                  <Download size={14} style={{ color: 'var(--accent)' }} />
                </button>
              )}
              <button onClick={() => { deleteDDDocument(d.id); onReload(); }} className="btn btn-ghost btn-sm">
                <Trash2 size={14} style={{ color: 'var(--danger)' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Upload Document">
        <div className="space-y-3">
          {/* File upload area */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>File (max 5MB)</label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center" style={{ borderColor: uploadedFile ? 'var(--success)' : 'var(--border)' }}>
              {uploadedFile ? (
                <div className="text-sm">
                  <span style={{ color: 'var(--success)' }}>{uploadedFile.name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>({formatSize(uploadedFile.size)})</span>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload size={24} className="mx-auto mb-1" style={{ color: 'var(--muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Click to select a file</p>
                  <input type="file" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Document Name *</label>
            <input value={form.file_name} onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))} className="w-full" placeholder="e.g. 2024 Audited Financial Statements" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as DDDocument['category'] }))} className="w-full text-sm">
                {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Workstream</label>
              <select value={form.workstream_key} onChange={e => setForm(f => ({ ...f, workstream_key: e.target.value }))} className="w-full text-sm">
                <option value="">General</option>
                {DD_WORKSTREAMS.map(ws => <option key={ws.key} value={ws.key}>{ws.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => { setShowAdd(false); setUploadedFile(null); }} className="btn btn-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={!form.file_name} className="btn btn-primary">
              <Upload size={14} /> Upload
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
