/**
 * Post-Close Integration Planning Checklist
 * Standard 100-day integration items for VMS acquisitions
 */

export interface IntegrationItem {
  id: string;
  category: string;
  task: string;
  timeline: 'day_1' | 'week_1' | 'month_1' | 'month_3' | 'ongoing';
  owner?: string;
  completed: boolean;
  notes?: string;
}

export const INTEGRATION_CATEGORIES = [
  'Day 1 Communications',
  'Financial Integration',
  'HR & People',
  'Customer Success',
  'Technology & IT',
  'Operations',
  'Governance',
  'Growth Initiatives',
] as const;

export const DEFAULT_INTEGRATION_ITEMS: Omit<IntegrationItem, 'completed' | 'owner' | 'notes'>[] = [
  // Day 1 Communications
  { id: 'int-01', category: 'Day 1 Communications', task: 'Send all-hands announcement email to acquired company employees', timeline: 'day_1' },
  { id: 'int-02', category: 'Day 1 Communications', task: 'Brief management team on integration plan and 100-day priorities', timeline: 'day_1' },
  { id: 'int-03', category: 'Day 1 Communications', task: 'Prepare and distribute customer communication (if required)', timeline: 'day_1' },
  { id: 'int-04', category: 'Day 1 Communications', task: 'Update website/legal notices as required', timeline: 'week_1' },
  { id: 'int-05', category: 'Day 1 Communications', task: 'Notify key vendors and partners of ownership change', timeline: 'week_1' },

  // Financial Integration
  { id: 'int-06', category: 'Financial Integration', task: 'Set up entity in parent company ERP/accounting system', timeline: 'week_1' },
  { id: 'int-07', category: 'Financial Integration', task: 'Establish new bank accounts and treasury management', timeline: 'week_1' },
  { id: 'int-08', category: 'Financial Integration', task: 'Implement standardized financial reporting package', timeline: 'month_1' },
  { id: 'int-09', category: 'Financial Integration', task: 'Align chart of accounts with parent company standards', timeline: 'month_1' },
  { id: 'int-10', category: 'Financial Integration', task: 'Set up intercompany billing and transfer pricing', timeline: 'month_1' },
  { id: 'int-11', category: 'Financial Integration', task: 'Implement purchase approval thresholds', timeline: 'week_1' },
  { id: 'int-12', category: 'Financial Integration', task: 'Complete working capital adjustment calculation', timeline: 'month_3' },

  // HR & People
  { id: 'int-13', category: 'HR & People', task: 'Finalize retention packages for key employees', timeline: 'day_1' },
  { id: 'int-14', category: 'HR & People', task: 'Enroll employees in new benefits programs', timeline: 'month_1' },
  { id: 'int-15', category: 'HR & People', task: 'Migrate payroll to parent company system', timeline: 'month_1' },
  { id: 'int-16', category: 'HR & People', task: 'Conduct 1-on-1s with all managers (skip-level)', timeline: 'month_1' },
  { id: 'int-17', category: 'HR & People', task: 'Align compensation bands with parent company', timeline: 'month_3' },
  { id: 'int-18', category: 'HR & People', task: 'Set up performance review cadence', timeline: 'month_3' },
  { id: 'int-19', category: 'HR & People', task: 'Identify and document key person dependencies', timeline: 'week_1' },

  // Customer Success
  { id: 'int-20', category: 'Customer Success', task: 'Review top 20 customer contracts for continuity', timeline: 'week_1' },
  { id: 'int-21', category: 'Customer Success', task: 'Maintain all existing SLAs and support commitments', timeline: 'day_1' },
  { id: 'int-22', category: 'Customer Success', task: 'Schedule introductory calls with top 10 customers', timeline: 'month_1' },
  { id: 'int-23', category: 'Customer Success', task: 'Assess customer satisfaction baseline (NPS/CSAT)', timeline: 'month_1' },
  { id: 'int-24', category: 'Customer Success', task: 'Review and optimize pricing/packaging strategy', timeline: 'month_3' },
  { id: 'int-25', category: 'Customer Success', task: 'Identify cross-sell opportunities with sister companies', timeline: 'month_3' },

  // Technology & IT
  { id: 'int-26', category: 'Technology & IT', task: 'Complete IT security audit and remediation plan', timeline: 'week_1' },
  { id: 'int-27', category: 'Technology & IT', task: 'Set up corporate email and communication tools', timeline: 'week_1' },
  { id: 'int-28', category: 'Technology & IT', task: 'Implement parent company security policies', timeline: 'month_1' },
  { id: 'int-29', category: 'Technology & IT', task: 'Review and renew critical vendor contracts', timeline: 'month_1' },
  { id: 'int-30', category: 'Technology & IT', task: 'Assess technical debt and create remediation roadmap', timeline: 'month_3' },
  { id: 'int-31', category: 'Technology & IT', task: 'Implement standardized monitoring and alerting', timeline: 'month_3' },

  // Operations
  { id: 'int-32', category: 'Operations', task: 'Document current state operating metrics baseline', timeline: 'week_1' },
  { id: 'int-33', category: 'Operations', task: 'Implement parent company KPI reporting cadence', timeline: 'month_1' },
  { id: 'int-34', category: 'Operations', task: 'Review and optimize R&D spend allocation', timeline: 'month_3' },
  { id: 'int-35', category: 'Operations', task: 'Review and optimize S&M efficiency', timeline: 'month_3' },
  { id: 'int-36', category: 'Operations', task: 'Identify shared services opportunities (legal, HR, IT)', timeline: 'month_3' },

  // Governance
  { id: 'int-37', category: 'Governance', task: 'Appoint board/oversight representatives', timeline: 'day_1' },
  { id: 'int-38', category: 'Governance', task: 'Establish monthly operating review cadence', timeline: 'week_1' },
  { id: 'int-39', category: 'Governance', task: 'Set up quarterly strategic review process', timeline: 'month_1' },
  { id: 'int-40', category: 'Governance', task: 'Implement capital allocation request process', timeline: 'month_1' },
  { id: 'int-41', category: 'Governance', task: 'Complete 100-day integration review', timeline: 'month_3' },

  // Growth Initiatives
  { id: 'int-42', category: 'Growth Initiatives', task: 'Identify 3-5 organic growth initiatives for Year 1', timeline: 'month_1' },
  { id: 'int-43', category: 'Growth Initiatives', task: 'Evaluate geographic expansion opportunities', timeline: 'month_3' },
  { id: 'int-44', category: 'Growth Initiatives', task: 'Assess tuck-in acquisition pipeline in vertical', timeline: 'month_3' },
  { id: 'int-45', category: 'Growth Initiatives', task: 'Develop product roadmap aligned with portfolio strategy', timeline: 'month_3' },
];

export function getIntegrationChecklist(targetId: string): IntegrationItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(`dealforge_integration_${targetId}`);
  if (raw) return JSON.parse(raw);
  // Initialize with defaults
  const items: IntegrationItem[] = DEFAULT_INTEGRATION_ITEMS.map(item => ({
    ...item,
    completed: false,
    owner: undefined,
    notes: undefined,
  }));
  localStorage.setItem(`dealforge_integration_${targetId}`, JSON.stringify(items));
  return items;
}

export function saveIntegrationChecklist(targetId: string, items: IntegrationItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`dealforge_integration_${targetId}`, JSON.stringify(items));
}
