// ============================================================
// DealForge Core Types
// ============================================================

// --- Pipeline / CRM ---

export type DealStage =
  | 'identified'
  | 'researching'
  | 'contacted'
  | 'nurturing'
  | 'loi_submitted'
  | 'loi_signed'
  | 'due_diligence'
  | 'closing'
  | 'closed_won'
  | 'closed_lost';

export const DEAL_STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: 'identified', label: 'Identified', color: '#6B7280' },
  { key: 'researching', label: 'Researching', color: '#8B5CF6' },
  { key: 'contacted', label: 'Contacted', color: '#3B82F6' },
  { key: 'nurturing', label: 'Nurturing', color: '#06B6D4' },
  { key: 'loi_submitted', label: 'LOI Submitted', color: '#F59E0B' },
  { key: 'loi_signed', label: 'LOI Signed', color: '#F97316' },
  { key: 'due_diligence', label: 'Due Diligence', color: '#EF4444' },
  { key: 'closing', label: 'Closing', color: '#EC4899' },
  { key: 'closed_won', label: 'Closed Won', color: '#10B981' },
  { key: 'closed_lost', label: 'Closed Lost', color: '#374151' },
];

export const VERTICALS = [
  'Healthcare',
  'Education',
  'Utilities',
  'Local Government',
  'Insurance',
  'Financial Services',
  'Public Safety',
  'Transportation',
  'Real Estate',
  'Retail',
  'Agriculture',
  'Construction',
  'Energy',
  'Legal',
  'Driver Education',
  'Supply Chain',
  'Hospitality',
  'Manufacturing',
  'Telecom',
  'Other',
] as const;

export type Vertical = (typeof VERTICALS)[number];

// VMS acquisition criteria — 6 dimensions scored 1-5
export interface DealScore {
  diversified_customers: number;   // 1-5
  low_churn: number;               // 1-5
  mission_critical: number;        // 1-5
  market_share: number;            // 1-5
  fragmented_competition: number;  // 1-5
  growth_potential: number;        // 1-5
}

export const SCORE_CRITERIA: { key: keyof DealScore; label: string; description: string; weight: number }[] = [
  { key: 'diversified_customers', label: 'Diversified Customer Base', description: 'Low customer concentration; no single customer >10% revenue', weight: 1 },
  { key: 'low_churn', label: 'Low Customer Attrition', description: 'High net revenue retention; sticky, mission-critical product', weight: 1.2 },
  { key: 'mission_critical', label: 'Mission Critical Software', description: 'Enterprise software essential to daily operations', weight: 1.3 },
  { key: 'market_share', label: 'Leading Market Share', description: 'Leading or increasing share in their vertical niche', weight: 1 },
  { key: 'fragmented_competition', label: 'Fragmented Competition', description: 'No dominant competitor; opportunity for consolidation', weight: 0.8 },
  { key: 'growth_potential', label: 'Growth Potential', description: 'Geographic expansion, product expansion, or tuck-in acquisition opportunity', weight: 0.7 },
];

export interface Target {
  id: string;
  name: string;
  vertical: Vertical;
  sub_vertical?: string;
  geography: string;
  website?: string;
  description?: string;

  // Financials
  revenue?: number;
  arr?: number;
  recurring_revenue_pct?: number;
  gross_margin_pct?: number;
  ebita?: number;
  ebita_margin_pct?: number;
  customer_count?: number;
  yoy_growth_pct?: number;
  employee_count?: number;

  // Contacts
  founder_name?: string;
  founder_email?: string;
  founder_phone?: string;
  key_contacts?: Contact[];

  // Deal tracking
  stage: DealStage;
  score?: DealScore;
  weighted_score?: number;
  source: 'proprietary' | 'broker' | 'inbound' | 'referral' | 'other';
  broker_name?: string;
  asking_price?: number;
  notes?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  first_contact_date?: string;
  stage_entered_at: string;
}

export interface Contact {
  id: string;
  target_id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  is_primary: boolean;
  notes?: string;
}

export interface Touchpoint {
  id: string;
  target_id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'linkedin' | 'conference' | 'other';
  date: string;
  subject: string;
  summary: string;
  participants?: string;
  follow_up_date?: string;
  follow_up_notes?: string;
  created_at: string;
}

export interface MeetingNote {
  id: string;
  target_id: string;
  touchpoint_id?: string;
  file_name: string;
  file_type: string;
  file_url: string;
  raw_text?: string;
  ai_summary?: string;
  ai_action_items?: ActionItem[];
  ai_key_insights?: string[];
  ai_deal_signals?: DealSignal[];
  uploaded_at: string;
}

export interface ActionItem {
  text: string;
  assignee?: string;
  due_date?: string;
  completed: boolean;
}

export interface DealSignal {
  signal: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  detail?: string;
}

// --- Due Diligence ---

export type DDStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete' | 'n_a';
export type RAGStatus = 'red' | 'amber' | 'green' | 'grey';
export type DDPhase = 'preliminary' | 'detailed' | 'confirmatory' | 'complete';

export interface DDProject {
  id: string;
  target_id: string;
  target_name: string;
  phase: DDPhase;
  status: DDStatus;
  rag_status: RAGStatus;
  start_date: string;
  target_close_date?: string;
  actual_close_date?: string;
  overall_progress_pct: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const DD_WORKSTREAMS = [
  { key: 'commercial', label: 'Commercial', icon: 'TrendingUp', description: 'Market position, competitive landscape, customer analysis, product-market fit' },
  { key: 'financial', label: 'Financial', icon: 'DollarSign', description: 'Revenue quality, profitability, cash flow, working capital, projections' },
  { key: 'customer', label: 'Customer', icon: 'Users', description: 'Customer concentration, churn analysis, NRR, cohort retention, satisfaction' },
  { key: 'technology', label: 'Technology & IP', icon: 'Code', description: 'Tech stack, architecture, tech debt, IP ownership, security posture' },
  { key: 'legal', label: 'Legal', icon: 'Scale', description: 'Contracts, litigation, regulatory, change-of-control provisions' },
  { key: 'hr', label: 'HR & People', icon: 'UserCheck', description: 'Key person dependencies, org structure, compensation, retention risk' },
  { key: 'tax', label: 'Tax', icon: 'FileText', description: 'Tax compliance, structure, NOLs, transfer pricing, exposures' },
  { key: 'operational', label: 'Operational', icon: 'Settings', description: 'Operating ratios (S&M, R&D, G&A), processes, infrastructure, scalability' },
] as const;

export type DDWorkstreamKey = (typeof DD_WORKSTREAMS)[number]['key'];

export interface DDWorkstream {
  id: string;
  project_id: string;
  key: DDWorkstreamKey;
  label: string;
  status: DDStatus;
  rag_status: RAGStatus;
  progress_pct: number;
  owner?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DDTask {
  id: string;
  workstream_id: string;
  parent_task_id?: string;    // for nesting
  title: string;
  description?: string;
  status: DDStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  owner?: string;
  due_date?: string;
  completed_at?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DDRisk {
  id: string;
  project_id: string;
  workstream_key?: DDWorkstreamKey;
  title: string;
  description: string;
  category: 'customer' | 'financial' | 'technology' | 'legal' | 'people' | 'operational' | 'market' | 'regulatory';
  impact: 1 | 2 | 3 | 4 | 5;        // 1=negligible, 5=critical
  probability: 1 | 2 | 3 | 4 | 5;   // 1=rare, 5=almost certain
  risk_score?: number;                 // impact × probability
  mitigation?: string;
  owner?: string;
  status: 'open' | 'mitigating' | 'accepted' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface DDFinding {
  id: string;
  project_id: string;
  workstream_key?: DDWorkstreamKey;
  document_id?: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  type: 'red_flag' | 'concern' | 'observation' | 'positive';
  status: 'open' | 'investigating' | 'resolved' | 'accepted';
  resolution?: string;
  created_at: string;
  updated_at: string;
}

export interface InformationRequest {
  id: string;
  project_id: string;
  workstream_key?: DDWorkstreamKey;
  request_number: number;
  title: string;
  description: string;
  status: 'draft' | 'sent' | 'received' | 'under_review' | 'complete' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  requested_date?: string;
  due_date?: string;
  received_date?: string;
  response_notes?: string;
  documents?: string[];   // linked document IDs
  created_at: string;
  updated_at: string;
}

export interface DDDocument {
  id: string;
  project_id: string;
  workstream_key?: DDWorkstreamKey;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size?: number;
  category: 'financial_statement' | 'contract' | 'customer_list' | 'org_chart' | 'technical' | 'legal' | 'tax' | 'other';
  version: number;
  uploaded_by?: string;
  notes?: string;
  uploaded_at: string;
}

export interface ApprovalGate {
  id: string;
  project_id: string;
  phase: DDPhase;
  title: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_info';
  decision_date?: string;
  decision_notes?: string;
  conditions?: string[];
  created_at: string;
}

// --- Dashboard ---

export interface PipelineStats {
  total_targets: number;
  by_stage: Record<DealStage, number>;
  by_vertical: Record<string, number>;
  avg_weighted_score: number;
  active_dd_projects: number;
  total_pipeline_value: number;
  avg_days_in_stage: Record<DealStage, number>;
}

// --- Activity Log ---

export type ActivityType =
  | 'target_created' | 'target_updated' | 'target_deleted' | 'stage_changed'
  | 'touchpoint_added' | 'meeting_note_added' | 'contact_added'
  | 'dd_project_created' | 'dd_task_completed' | 'dd_risk_added' | 'dd_finding_added'
  | 'irl_sent' | 'document_uploaded' | 'phase_changed' | 'score_updated';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  target_id?: string;
  target_name?: string;
  project_id?: string;
  description: string;
  metadata?: Record<string, string>;
  created_at: string;
}

// --- Deal Room ---

export interface DealTerm {
  id: string;
  target_id: string;
  category: 'valuation' | 'structure' | 'conditions' | 'timeline' | 'other';
  label: string;
  value: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
