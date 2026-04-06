// ============================================================
// DealForge Local Database (localStorage-backed)
// Single-user, no external DB required
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  Target, Touchpoint, MeetingNote, Contact,
  DDProject, DDWorkstream, DDTask, DDRisk, DDFinding,
  InformationRequest, DDDocument, ApprovalGate,
  DealStage, DealScore, DDStatus, RAGStatus,
} from './types';
import { SCORE_CRITERIA, DD_WORKSTREAMS } from './types';

// --- Helpers ---

function getStore<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(`dealforge_${key}`);
  return raw ? JSON.parse(raw) : [];
}

function setStore<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`dealforge_${key}`, JSON.stringify(data));
}

function now(): string {
  return new Date().toISOString();
}

// --- Targets ---

export function getTargets(): Target[] {
  return getStore<Target>('targets');
}

export function getTarget(id: string): Target | undefined {
  return getTargets().find(t => t.id === id);
}

export function createTarget(data: Partial<Target>): Target {
  const targets = getTargets();
  const target: Target = {
    id: uuidv4(),
    name: data.name || 'Untitled Target',
    vertical: data.vertical || 'Other',
    geography: data.geography || '',
    stage: data.stage || 'identified',
    source: data.source || 'proprietary',
    created_at: now(),
    updated_at: now(),
    stage_entered_at: now(),
    ...data,
  };
  target.weighted_score = calculateWeightedScore(target.score);
  targets.push(target);
  setStore('targets', targets);
  return target;
}

export function updateTarget(id: string, data: Partial<Target>): Target | undefined {
  const targets = getTargets();
  const idx = targets.findIndex(t => t.id === id);
  if (idx === -1) return undefined;

  const prev = targets[idx];
  const stageChanged = data.stage && data.stage !== prev.stage;

  targets[idx] = {
    ...prev,
    ...data,
    updated_at: now(),
    stage_entered_at: stageChanged ? now() : prev.stage_entered_at,
  };

  if (data.score) {
    targets[idx].weighted_score = calculateWeightedScore(data.score);
  }

  setStore('targets', targets);
  return targets[idx];
}

export function deleteTarget(id: string): void {
  setStore('targets', getTargets().filter(t => t.id !== id));
  // Cascade delete related records
  setStore('touchpoints', getTouchpoints().filter(t => t.target_id !== id));
  setStore('meeting_notes', getMeetingNotes().filter(m => m.target_id !== id));
  setStore('contacts', getContacts().filter(c => c.target_id !== id));
}

export function getTargetsByStage(stage: DealStage): Target[] {
  return getTargets().filter(t => t.stage === stage);
}

export function calculateWeightedScore(score?: DealScore): number | undefined {
  if (!score) return undefined;
  let totalWeight = 0;
  let totalScore = 0;
  for (const criterion of SCORE_CRITERIA) {
    const val = score[criterion.key];
    if (val !== undefined && val !== null) {
      totalScore += val * criterion.weight;
      totalWeight += criterion.weight;
    }
  }
  return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : undefined;
}

// --- Contacts ---

export function getContacts(targetId?: string): Contact[] {
  const all = getStore<Contact>('contacts');
  return targetId ? all.filter(c => c.target_id === targetId) : all;
}

export function createContact(data: Partial<Contact>): Contact {
  const contacts = getContacts();
  const contact: Contact = {
    id: uuidv4(),
    target_id: data.target_id || '',
    name: data.name || '',
    is_primary: data.is_primary || false,
    ...data,
  };
  contacts.push(contact);
  setStore('contacts', contacts);
  return contact;
}

export function updateContact(id: string, data: Partial<Contact>): void {
  const contacts = getContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx !== -1) {
    contacts[idx] = { ...contacts[idx], ...data };
    setStore('contacts', contacts);
  }
}

export function deleteContact(id: string): void {
  setStore('contacts', getContacts().filter(c => c.id !== id));
}

// --- Touchpoints ---

export function getTouchpoints(targetId?: string): Touchpoint[] {
  const all = getStore<Touchpoint>('touchpoints');
  const filtered = targetId ? all.filter(t => t.target_id === targetId) : all;
  return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function createTouchpoint(data: Partial<Touchpoint>): Touchpoint {
  const touchpoints = getTouchpoints();
  const tp: Touchpoint = {
    id: uuidv4(),
    target_id: data.target_id || '',
    type: data.type || 'note',
    date: data.date || now(),
    subject: data.subject || '',
    summary: data.summary || '',
    created_at: now(),
    ...data,
  };
  touchpoints.push(tp);
  setStore('touchpoints', touchpoints);
  return tp;
}

export function updateTouchpoint(id: string, data: Partial<Touchpoint>): void {
  const touchpoints = getStore<Touchpoint>('touchpoints');
  const idx = touchpoints.findIndex(t => t.id === id);
  if (idx !== -1) {
    touchpoints[idx] = { ...touchpoints[idx], ...data };
    setStore('touchpoints', touchpoints);
  }
}

export function deleteTouchpoint(id: string): void {
  setStore('touchpoints', getStore<Touchpoint>('touchpoints').filter(t => t.id !== id));
}

// --- Meeting Notes ---

export function getMeetingNotes(targetId?: string): MeetingNote[] {
  const all = getStore<MeetingNote>('meeting_notes');
  return targetId ? all.filter(m => m.target_id === targetId) : all;
}

export function createMeetingNote(data: Partial<MeetingNote>): MeetingNote {
  const notes = getMeetingNotes();
  const note: MeetingNote = {
    id: uuidv4(),
    target_id: data.target_id || '',
    file_name: data.file_name || '',
    file_type: data.file_type || '',
    file_url: data.file_url || '',
    uploaded_at: now(),
    ...data,
  };
  notes.push(note);
  setStore('meeting_notes', notes);
  return note;
}

export function updateMeetingNote(id: string, data: Partial<MeetingNote>): void {
  const notes = getStore<MeetingNote>('meeting_notes');
  const idx = notes.findIndex(n => n.id === id);
  if (idx !== -1) {
    notes[idx] = { ...notes[idx], ...data };
    setStore('meeting_notes', notes);
  }
}

export function deleteMeetingNote(id: string): void {
  setStore('meeting_notes', getStore<MeetingNote>('meeting_notes').filter(n => n.id !== id));
}

// --- DD Projects ---

export function getDDProjects(): DDProject[] {
  return getStore<DDProject>('dd_projects');
}

export function getDDProject(id: string): DDProject | undefined {
  return getDDProjects().find(p => p.id === id);
}

export function getDDProjectByTarget(targetId: string): DDProject | undefined {
  return getDDProjects().find(p => p.target_id === targetId);
}

export function createDDProject(data: Partial<DDProject>): DDProject {
  const projects = getDDProjects();
  const project: DDProject = {
    id: uuidv4(),
    target_id: data.target_id || '',
    target_name: data.target_name || '',
    phase: 'preliminary',
    status: 'not_started',
    rag_status: 'grey',
    start_date: now(),
    overall_progress_pct: 0,
    created_at: now(),
    updated_at: now(),
    ...data,
  };
  projects.push(project);
  setStore('dd_projects', projects);

  // Auto-create workstreams
  for (const ws of DD_WORKSTREAMS) {
    createDDWorkstream({
      project_id: project.id,
      key: ws.key,
      label: ws.label,
    });
  }

  return project;
}

export function updateDDProject(id: string, data: Partial<DDProject>): DDProject | undefined {
  const projects = getDDProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return undefined;
  projects[idx] = { ...projects[idx], ...data, updated_at: now() };
  setStore('dd_projects', projects);
  return projects[idx];
}

export function deleteDDProject(id: string): void {
  setStore('dd_projects', getDDProjects().filter(p => p.id !== id));
  // Cascade
  const wsIds = getDDWorkstreams(id).map(ws => ws.id);
  setStore('dd_workstreams', getStore<DDWorkstream>('dd_workstreams').filter(ws => ws.project_id !== id));
  setStore('dd_tasks', getStore<DDTask>('dd_tasks').filter(t => !wsIds.includes(t.workstream_id)));
  setStore('dd_risks', getStore<DDRisk>('dd_risks').filter(r => r.project_id !== id));
  setStore('dd_findings', getStore<DDFinding>('dd_findings').filter(f => f.project_id !== id));
  setStore('dd_documents', getStore<DDDocument>('dd_documents').filter(d => d.project_id !== id));
  setStore('info_requests', getStore<InformationRequest>('info_requests').filter(ir => ir.project_id !== id));
  setStore('approval_gates', getStore<ApprovalGate>('approval_gates').filter(ag => ag.project_id !== id));
}

// --- DD Workstreams ---

export function getDDWorkstreams(projectId?: string): DDWorkstream[] {
  const all = getStore<DDWorkstream>('dd_workstreams');
  return projectId ? all.filter(ws => ws.project_id === projectId) : all;
}

export function getDDWorkstream(id: string): DDWorkstream | undefined {
  return getStore<DDWorkstream>('dd_workstreams').find(ws => ws.id === id);
}

export function createDDWorkstream(data: Partial<DDWorkstream>): DDWorkstream {
  const workstreams = getStore<DDWorkstream>('dd_workstreams');
  const ws: DDWorkstream = {
    id: uuidv4(),
    project_id: data.project_id || '',
    key: data.key || 'commercial',
    label: data.label || '',
    status: 'not_started',
    rag_status: 'grey',
    progress_pct: 0,
    created_at: now(),
    updated_at: now(),
    ...data,
  };
  workstreams.push(ws);
  setStore('dd_workstreams', workstreams);
  return ws;
}

export function updateDDWorkstream(id: string, data: Partial<DDWorkstream>): void {
  const workstreams = getStore<DDWorkstream>('dd_workstreams');
  const idx = workstreams.findIndex(ws => ws.id === id);
  if (idx !== -1) {
    workstreams[idx] = { ...workstreams[idx], ...data, updated_at: now() };
    setStore('dd_workstreams', workstreams);
  }
}

// --- DD Tasks ---

export function getDDTasks(workstreamId?: string): DDTask[] {
  const all = getStore<DDTask>('dd_tasks');
  const filtered = workstreamId ? all.filter(t => t.workstream_id === workstreamId) : all;
  return filtered.sort((a, b) => a.sort_order - b.sort_order);
}

export function getDDTasksByProject(projectId: string): DDTask[] {
  const wsIds = getDDWorkstreams(projectId).map(ws => ws.id);
  return getStore<DDTask>('dd_tasks').filter(t => wsIds.includes(t.workstream_id));
}

export function createDDTask(data: Partial<DDTask>): DDTask {
  const tasks = getStore<DDTask>('dd_tasks');
  const task: DDTask = {
    id: uuidv4(),
    workstream_id: data.workstream_id || '',
    title: data.title || '',
    status: 'not_started',
    priority: data.priority || 'medium',
    sort_order: data.sort_order ?? tasks.filter(t => t.workstream_id === data.workstream_id).length,
    created_at: now(),
    updated_at: now(),
    ...data,
  };
  tasks.push(task);
  setStore('dd_tasks', tasks);
  return task;
}

export function updateDDTask(id: string, data: Partial<DDTask>): void {
  const tasks = getStore<DDTask>('dd_tasks');
  const idx = tasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    tasks[idx] = {
      ...tasks[idx],
      ...data,
      updated_at: now(),
      completed_at: data.status === 'complete' ? now() : tasks[idx].completed_at,
    };
    setStore('dd_tasks', tasks);
  }
}

export function deleteDDTask(id: string): void {
  setStore('dd_tasks', getStore<DDTask>('dd_tasks').filter(t => t.id !== id));
}

// --- DD Risks ---

export function getDDRisks(projectId?: string): DDRisk[] {
  const all = getStore<DDRisk>('dd_risks');
  return projectId ? all.filter(r => r.project_id === projectId) : all;
}

export function createDDRisk(data: Partial<DDRisk>): DDRisk {
  const risks = getDDRisks();
  const risk: DDRisk = {
    id: uuidv4(),
    project_id: data.project_id || '',
    title: data.title || '',
    description: data.description || '',
    category: data.category || 'operational',
    impact: data.impact || 3,
    probability: data.probability || 3,
    status: 'open',
    created_at: now(),
    updated_at: now(),
    ...data,
  };
  risk.risk_score = risk.impact * risk.probability;
  risks.push(risk);
  setStore('dd_risks', risks);
  return risk;
}

export function updateDDRisk(id: string, data: Partial<DDRisk>): void {
  const risks = getStore<DDRisk>('dd_risks');
  const idx = risks.findIndex(r => r.id === id);
  if (idx !== -1) {
    risks[idx] = { ...risks[idx], ...data, updated_at: now() };
    if (data.impact || data.probability) {
      risks[idx].risk_score = (data.impact || risks[idx].impact) * (data.probability || risks[idx].probability);
    }
    setStore('dd_risks', risks);
  }
}

export function deleteDDRisk(id: string): void {
  setStore('dd_risks', getStore<DDRisk>('dd_risks').filter(r => r.id !== id));
}

// --- DD Findings ---

export function getDDFindings(projectId?: string): DDFinding[] {
  const all = getStore<DDFinding>('dd_findings');
  return projectId ? all.filter(f => f.project_id === projectId) : all;
}

export function createDDFinding(data: Partial<DDFinding>): DDFinding {
  const findings = getDDFindings();
  const finding: DDFinding = {
    id: uuidv4(),
    project_id: data.project_id || '',
    title: data.title || '',
    description: data.description || '',
    severity: data.severity || 'medium',
    type: data.type || 'observation',
    status: 'open',
    created_at: now(),
    updated_at: now(),
    ...data,
  };
  findings.push(finding);
  setStore('dd_findings', findings);
  return finding;
}

export function updateDDFinding(id: string, data: Partial<DDFinding>): void {
  const findings = getStore<DDFinding>('dd_findings');
  const idx = findings.findIndex(f => f.id === id);
  if (idx !== -1) {
    findings[idx] = { ...findings[idx], ...data, updated_at: now() };
    setStore('dd_findings', findings);
  }
}

export function deleteDDFinding(id: string): void {
  setStore('dd_findings', getStore<DDFinding>('dd_findings').filter(f => f.id !== id));
}

// --- Information Requests ---

export function getInfoRequests(projectId?: string): InformationRequest[] {
  const all = getStore<InformationRequest>('info_requests');
  return projectId ? all.filter(ir => ir.project_id === projectId) : all;
}

export function createInfoRequest(data: Partial<InformationRequest>): InformationRequest {
  const requests = getInfoRequests();
  const projectRequests = data.project_id ? requests.filter(ir => ir.project_id === data.project_id) : [];
  const ir: InformationRequest = {
    id: uuidv4(),
    project_id: data.project_id || '',
    request_number: projectRequests.length + 1,
    title: data.title || '',
    description: data.description || '',
    status: 'draft',
    priority: data.priority || 'medium',
    created_at: now(),
    updated_at: now(),
    ...data,
  };
  requests.push(ir);
  setStore('info_requests', requests);
  return ir;
}

export function updateInfoRequest(id: string, data: Partial<InformationRequest>): void {
  const requests = getStore<InformationRequest>('info_requests');
  const idx = requests.findIndex(ir => ir.id === id);
  if (idx !== -1) {
    requests[idx] = { ...requests[idx], ...data, updated_at: now() };
    setStore('info_requests', requests);
  }
}

export function deleteInfoRequest(id: string): void {
  setStore('info_requests', getStore<InformationRequest>('info_requests').filter(ir => ir.id !== id));
}

// --- DD Documents ---

export function getDDDocuments(projectId?: string): DDDocument[] {
  const all = getStore<DDDocument>('dd_documents');
  return projectId ? all.filter(d => d.project_id === projectId) : all;
}

export function createDDDocument(data: Partial<DDDocument>): DDDocument {
  const docs = getDDDocuments();
  const doc: DDDocument = {
    id: uuidv4(),
    project_id: data.project_id || '',
    file_name: data.file_name || '',
    file_type: data.file_type || '',
    file_url: data.file_url || '',
    category: data.category || 'other',
    version: 1,
    uploaded_at: now(),
    ...data,
  };
  docs.push(doc);
  setStore('dd_documents', docs);
  return doc;
}

export function updateDDDocument(id: string, data: Partial<DDDocument>): void {
  const docs = getStore<DDDocument>('dd_documents');
  const idx = docs.findIndex(d => d.id === id);
  if (idx !== -1) {
    docs[idx] = { ...docs[idx], ...data };
    setStore('dd_documents', docs);
  }
}

export function deleteDDDocument(id: string): void {
  setStore('dd_documents', getStore<DDDocument>('dd_documents').filter(d => d.id !== id));
}

// --- Approval Gates ---

export function getApprovalGates(projectId?: string): ApprovalGate[] {
  const all = getStore<ApprovalGate>('approval_gates');
  return projectId ? all.filter(ag => ag.project_id === projectId) : all;
}

export function createApprovalGate(data: Partial<ApprovalGate>): ApprovalGate {
  const gates = getApprovalGates();
  const gate: ApprovalGate = {
    id: uuidv4(),
    project_id: data.project_id || '',
    phase: data.phase || 'preliminary',
    title: data.title || '',
    status: 'pending',
    created_at: now(),
    ...data,
  };
  gates.push(gate);
  setStore('approval_gates', gates);
  return gate;
}

export function updateApprovalGate(id: string, data: Partial<ApprovalGate>): void {
  const gates = getStore<ApprovalGate>('approval_gates');
  const idx = gates.findIndex(ag => ag.id === id);
  if (idx !== -1) {
    gates[idx] = { ...gates[idx], ...data };
    setStore('approval_gates', gates);
  }
}

// --- Utility: Recalculate DD Progress ---

export function recalcDDProgress(projectId: string): void {
  const workstreams = getDDWorkstreams(projectId);
  let totalProgress = 0;
  let worstRag: RAGStatus = 'green';

  for (const ws of workstreams) {
    const tasks = getDDTasks(ws.id);
    if (tasks.length === 0) {
      updateDDWorkstream(ws.id, { progress_pct: 0, rag_status: 'grey', status: 'not_started' });
      continue;
    }

    const completed = tasks.filter(t => t.status === 'complete').length;
    const blocked = tasks.some(t => t.status === 'blocked');
    const progress = Math.round((completed / tasks.length) * 100);

    let rag: RAGStatus = 'green';
    if (blocked) rag = 'red';
    else if (progress < 25) rag = 'grey';
    else if (progress < 75) rag = 'amber';

    const status: DDStatus = progress === 100 ? 'complete' : progress > 0 ? 'in_progress' : 'not_started';

    updateDDWorkstream(ws.id, { progress_pct: progress, rag_status: rag, status });
    totalProgress += progress;

    if (rag === 'red') worstRag = 'red';
    else if (rag === 'amber' && worstRag !== 'red') worstRag = 'amber';
    else if (rag === 'grey' && worstRag === 'green') worstRag = 'grey';
  }

  const overallProgress = workstreams.length > 0 ? Math.round(totalProgress / workstreams.length) : 0;
  const overallStatus: DDStatus = overallProgress === 100 ? 'complete' : overallProgress > 0 ? 'in_progress' : 'not_started';

  updateDDProject(projectId, {
    overall_progress_pct: overallProgress,
    rag_status: worstRag,
    status: overallStatus,
  });
}

// --- Export Utilities ---

export function exportTargetsCSV(): string {
  const targets = getTargets();
  if (targets.length === 0) return '';

  const headers = ['Name', 'Vertical', 'Geography', 'Stage', 'Source', 'Revenue', 'ARR', 'Recurring Rev %', 'Gross Margin %', 'EBITA', 'Customer Count', 'Weighted Score', 'Created'];
  const rows = targets.map(t => [
    t.name, t.vertical, t.geography, t.stage, t.source,
    t.revenue || '', t.arr || '', t.recurring_revenue_pct || '',
    t.gross_margin_pct || '', t.ebita || '', t.customer_count || '',
    t.weighted_score || '', t.created_at,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
