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
  ActivityEntry, ActivityType, DealTerm, JournalEntry,
} from './types';
import { SCORE_CRITERIA, DD_WORKSTREAMS } from './types';
import { DD_TASK_TEMPLATES } from './dd-templates';
import type { TaskTemplate } from './dd-templates';

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
  logActivity('target_created', `Added target: ${target.name}`, { target_id: target.id, target_name: target.name });
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
    logActivity('score_updated', `Updated score for ${prev.name}`, { target_id: id, target_name: prev.name });
  }

  setStore('targets', targets);

  if (stageChanged) {
    logActivity('stage_changed', `${prev.name}: ${prev.stage} → ${data.stage}`, { target_id: id, target_name: prev.name, metadata: { from: prev.stage, to: data.stage! } });
  } else if (!data.score) {
    logActivity('target_updated', `Updated target: ${prev.name}`, { target_id: id, target_name: prev.name });
  }

  return targets[idx];
}

export function deleteTarget(id: string): void {
  const target = getTarget(id);
  setStore('targets', getTargets().filter(t => t.id !== id));
  // Cascade delete related records
  setStore('touchpoints', getTouchpoints().filter(t => t.target_id !== id));
  setStore('meeting_notes', getMeetingNotes().filter(m => m.target_id !== id));
  setStore('contacts', getContacts().filter(c => c.target_id !== id));
  if (target) logActivity('target_deleted', `Deleted target: ${target.name}`, { target_id: id, target_name: target.name });
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
  const target = getTarget(contact.target_id);
  logActivity('contact_added', `Added contact: ${contact.name}`, { target_id: contact.target_id, target_name: target?.name });
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
  const target = getTarget(tp.target_id);
  logActivity('touchpoint_added', `${tp.type}: ${tp.subject}`, { target_id: tp.target_id, target_name: target?.name });
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
  const target = getTarget(note.target_id);
  logActivity('meeting_note_added', `Uploaded: ${note.file_name}`, { target_id: note.target_id, target_name: target?.name });
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

  logActivity('dd_project_created', `Started DD for ${project.target_name}`, { target_id: project.target_id, target_name: project.target_name, project_id: project.id });
  return project;
}

export function updateDDProject(id: string, data: Partial<DDProject>): DDProject | undefined {
  const projects = getDDProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return undefined;
  const prev = projects[idx];
  projects[idx] = { ...prev, ...data, updated_at: now() };
  setStore('dd_projects', projects);
  if (data.phase && data.phase !== prev.phase) {
    logActivity('phase_changed', `${prev.target_name}: phase ${prev.phase} → ${data.phase}`, { target_id: prev.target_id, target_name: prev.target_name, project_id: id });
  }
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
    const prev = tasks[idx];
    tasks[idx] = {
      ...prev,
      ...data,
      updated_at: now(),
      completed_at: data.status === 'complete' ? now() : prev.completed_at,
    };
    setStore('dd_tasks', tasks);
    if (data.status === 'complete' && prev.status !== 'complete') {
      logActivity('dd_task_completed', `Completed DD task: ${prev.title}`, {});
    }
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
  logActivity('dd_risk_added', `New risk: ${risk.title} (score: ${risk.risk_score})`, { project_id: risk.project_id });
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
  logActivity('dd_finding_added', `New finding: ${finding.title} (${finding.severity})`, { project_id: finding.project_id });
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
  logActivity('irl_sent', `IRL #${ir.request_number}: ${ir.title}`, { project_id: ir.project_id });
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
  logActivity('document_uploaded', `Uploaded: ${doc.file_name}`, { project_id: doc.project_id });
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

// --- Populate DD Templates ---

export function populateDDTemplates(projectId: string): void {
  const workstreams = getDDWorkstreams(projectId);
  for (const ws of workstreams) {
    const templates = DD_TASK_TEMPLATES[ws.key];
    if (!templates) continue;

    let sortOrder = 0;
    for (const group of templates) {
      // Create parent task (group header)
      const parentTask = createDDTask({
        workstream_id: ws.id,
        title: group.title,
        priority: group.priority,
        description: group.description,
        sort_order: sortOrder++,
      });

      // Create child tasks
      if (group.children) {
        for (const child of group.children) {
          createDDTask({
            workstream_id: ws.id,
            parent_task_id: parentTask.id,
            title: child.title,
            priority: child.priority,
            description: child.description,
            sort_order: sortOrder++,
          });
        }
      }
    }
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

// --- Activity Log ---

export function getActivities(limit = 50): ActivityEntry[] {
  const all = getStore<ActivityEntry>('activities');
  return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
}

export function getActivitiesForTarget(targetId: string, limit = 30): ActivityEntry[] {
  const all = getStore<ActivityEntry>('activities');
  return all
    .filter(a => a.target_id === targetId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export function logActivity(type: ActivityType, description: string, extra?: { target_id?: string; target_name?: string; project_id?: string; metadata?: Record<string, string> }): void {
  const activities = getStore<ActivityEntry>('activities');
  activities.push({
    id: uuidv4(),
    type,
    description,
    target_id: extra?.target_id,
    target_name: extra?.target_name,
    project_id: extra?.project_id,
    metadata: extra?.metadata,
    created_at: now(),
  });
  // Keep last 500 activities
  const trimmed = activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 500);
  setStore('activities', trimmed);
}

// --- Deal Terms ---

export function getDealTerms(targetId: string): DealTerm[] {
  const all = getStore<DealTerm>('deal_terms');
  return all.filter(dt => dt.target_id === targetId);
}

export function createDealTerm(data: Partial<DealTerm>): DealTerm {
  const terms = getStore<DealTerm>('deal_terms');
  const term: DealTerm = {
    id: uuidv4(),
    target_id: data.target_id || '',
    category: data.category || 'other',
    label: data.label || '',
    value: data.value || '',
    created_at: now(),
    updated_at: now(),
    ...data,
  };
  terms.push(term);
  setStore('deal_terms', terms);
  return term;
}

export function updateDealTerm(id: string, data: Partial<DealTerm>): void {
  const terms = getStore<DealTerm>('deal_terms');
  const idx = terms.findIndex(dt => dt.id === id);
  if (idx !== -1) {
    terms[idx] = { ...terms[idx], ...data, updated_at: now() };
    setStore('deal_terms', terms);
  }
}

export function deleteDealTerm(id: string): void {
  setStore('deal_terms', getStore<DealTerm>('deal_terms').filter(dt => dt.id !== id));
}

// --- Journal Entries ---

export function getJournalEntries(targetId: string): JournalEntry[] {
  const all = getStore<JournalEntry>('journal_entries');
  return all
    .filter(j => j.target_id === targetId)
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
}

export function createJournalEntry(data: Partial<JournalEntry>): JournalEntry {
  const entries = getStore<JournalEntry>('journal_entries');
  const entry: JournalEntry = {
    id: uuidv4(),
    target_id: data.target_id || '',
    title: data.title || '',
    content: data.content || '',
    tags: data.tags || [],
    pinned: data.pinned || false,
    created_at: now(),
    updated_at: now(),
    ...data,
  };
  entries.push(entry);
  setStore('journal_entries', entries);
  return entry;
}

export function updateJournalEntry(id: string, data: Partial<JournalEntry>): void {
  const entries = getStore<JournalEntry>('journal_entries');
  const idx = entries.findIndex(j => j.id === id);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], ...data, updated_at: now() };
    setStore('journal_entries', entries);
  }
}

export function deleteJournalEntry(id: string): void {
  setStore('journal_entries', getStore<JournalEntry>('journal_entries').filter(j => j.id !== id));
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

export function exportContactsCSV(): string {
  const contacts = getContacts();
  const targets = getTargets();
  if (contacts.length === 0) return '';

  const headers = ['Name', 'Title', 'Company', 'Email', 'Phone', 'LinkedIn', 'Primary', 'Notes'];
  const rows = contacts.map(c => {
    const target = targets.find(t => t.id === c.target_id);
    return [
      `"${c.name}"`, `"${c.title || ''}"`, `"${target?.name || ''}"`,
      c.email || '', c.phone || '', c.linkedin || '',
      c.is_primary ? 'Yes' : 'No', `"${(c.notes || '').replace(/"/g, '""')}"`,
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function importContactsFromCSV(csv: string, targetId: string): number {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return 0;

  let imported = 0;
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    // Simple CSV parse (handles quoted fields)
    const fields = line.match(/("(?:[^"]*(?:""[^"]*)*)"|[^,]*)/g)?.map(f => f.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
    if (fields.length >= 1 && fields[0].trim()) {
      createContact({
        target_id: targetId,
        name: fields[0].trim(),
        title: fields[1]?.trim() || undefined,
        email: fields[3]?.trim() || undefined,
        phone: fields[4]?.trim() || undefined,
        linkedin: fields[5]?.trim() || undefined,
        is_primary: fields[6]?.toLowerCase() === 'yes',
        notes: fields[7]?.trim() || undefined,
      });
      imported++;
    }
  }
  return imported;
}
