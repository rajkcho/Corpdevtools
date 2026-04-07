// ============================================================
// DealForge Demo Data Seed
// Generates realistic sample data for testing and demos
// ============================================================

import { createTarget, createTouchpoint, createContact, createDDProject, createDDRisk, createDDFinding, createInfoRequest, populateDDTemplates, createDealTerm, createJournalEntry } from './db';
import type { DealStage, Vertical } from './types';

const SAMPLE_TARGETS: {
  name: string; vertical: Vertical; geography: string; stage: DealStage;
  source: 'proprietary' | 'broker' | 'inbound' | 'referral';
  revenue?: number; arr?: number; recurring_revenue_pct?: number;
  gross_margin_pct?: number; ebita_margin_pct?: number;
  customer_count?: number; employee_count?: number;
  asking_price?: number; yoy_growth_pct?: number; description?: string;
  founder_name?: string; website?: string;
  score?: { diversified_customers: number; low_churn: number; mission_critical: number; market_share: number; fragmented_competition: number; growth_potential: number };
}[] = [
  {
    name: 'MedChart Systems', vertical: 'Healthcare', geography: 'Ontario, Canada', stage: 'nurturing',
    source: 'proprietary', revenue: 4200000, arr: 3600000, recurring_revenue_pct: 86,
    gross_margin_pct: 78, ebita_margin_pct: 22, customer_count: 340, employee_count: 28,
    asking_price: 16000000, yoy_growth_pct: 12, description: 'EHR and practice management software for outpatient clinics across Canada.',
    founder_name: 'Dr. Sarah Chen', website: 'https://medchartsystems.example.com',
    score: { diversified_customers: 4, low_churn: 4, mission_critical: 5, market_share: 3, fragmented_competition: 4, growth_potential: 3 },
  },
  {
    name: 'CivicTrack Pro', vertical: 'Local Government', geography: 'Southeast US', stage: 'loi_submitted',
    source: 'proprietary', revenue: 7800000, arr: 6500000, recurring_revenue_pct: 83,
    gross_margin_pct: 72, ebita_margin_pct: 18, customer_count: 180, employee_count: 52,
    asking_price: 28000000, yoy_growth_pct: 8, description: 'Permitting, licensing, and code enforcement software for municipalities.',
    founder_name: 'Robert Mitchell', website: 'https://civictrackpro.example.com',
    score: { diversified_customers: 4, low_churn: 5, mission_critical: 5, market_share: 4, fragmented_competition: 3, growth_potential: 4 },
  },
  {
    name: 'AgriFlow Solutions', vertical: 'Agriculture', geography: 'Midwest US', stage: 'researching',
    source: 'broker', revenue: 2100000, arr: 1500000, recurring_revenue_pct: 71,
    gross_margin_pct: 68, ebita_margin_pct: 15, customer_count: 420, employee_count: 15,
    description: 'Farm management and crop planning software for mid-size agricultural operations.',
    founder_name: 'Tom Henderson',
    score: { diversified_customers: 5, low_churn: 3, mission_critical: 3, market_share: 2, fragmented_competition: 4, growth_potential: 4 },
  },
  {
    name: 'SchoolBridge ERP', vertical: 'Education', geography: 'Western Canada', stage: 'due_diligence',
    source: 'proprietary', revenue: 5500000, arr: 4800000, recurring_revenue_pct: 87,
    gross_margin_pct: 81, ebita_margin_pct: 25, customer_count: 95, employee_count: 38,
    asking_price: 22000000, yoy_growth_pct: 15, description: 'Student information system and administrative ERP for K-12 school districts.',
    founder_name: 'Maria Garcia', website: 'https://schoolbridge.example.com',
    score: { diversified_customers: 3, low_churn: 5, mission_critical: 5, market_share: 4, fragmented_competition: 3, growth_potential: 3 },
  },
  {
    name: 'UtiliSoft', vertical: 'Utilities', geography: 'Pacific Northwest', stage: 'contacted',
    source: 'referral', revenue: 3200000, arr: 2800000, recurring_revenue_pct: 88,
    gross_margin_pct: 75, ebita_margin_pct: 20, customer_count: 65, employee_count: 22,
    description: 'Billing and customer information system for small-to-mid rural electric cooperatives.',
    founder_name: 'James Walker',
    score: { diversified_customers: 3, low_churn: 5, mission_critical: 5, market_share: 3, fragmented_competition: 4, growth_potential: 2 },
  },
  {
    name: 'InsureTrack', vertical: 'Insurance', geography: 'Northeast US', stage: 'identified',
    source: 'broker', revenue: 1800000, arr: 1200000, recurring_revenue_pct: 67,
    gross_margin_pct: 65, customer_count: 210, employee_count: 12,
    description: 'Policy administration and claims management for independent P&C agencies.',
    founder_name: 'Patricia Wong',
  },
  {
    name: 'TransitOps', vertical: 'Transportation', geography: 'UK', stage: 'nurturing',
    source: 'proprietary', revenue: 6100000, arr: 5200000, recurring_revenue_pct: 85,
    gross_margin_pct: 74, ebita_margin_pct: 19, customer_count: 48, employee_count: 45,
    asking_price: 24000000, description: 'Fleet management and route optimization for public transit authorities.',
    founder_name: 'David Thompson',
    score: { diversified_customers: 2, low_churn: 4, mission_critical: 4, market_share: 3, fragmented_competition: 3, growth_potential: 4 },
  },
  {
    name: 'LegalDox', vertical: 'Legal', geography: 'Toronto, Canada', stage: 'researching',
    source: 'inbound', revenue: 950000, arr: 800000, recurring_revenue_pct: 84,
    gross_margin_pct: 82, customer_count: 120, employee_count: 8,
    description: 'Document management and matter tracking for small law firms.',
    founder_name: 'Alexandra Petrov',
  },
  {
    name: 'RetailPOS Central', vertical: 'Retail', geography: 'Australia', stage: 'closed_won',
    source: 'proprietary', revenue: 4800000, arr: 4100000, recurring_revenue_pct: 85,
    gross_margin_pct: 76, ebita_margin_pct: 24, customer_count: 520, employee_count: 32,
    asking_price: 19000000, description: 'Point-of-sale and inventory management for specialty retail chains.',
    founder_name: 'Michael Barnes',
    score: { diversified_customers: 5, low_churn: 4, mission_critical: 4, market_share: 3, fragmented_competition: 5, growth_potential: 3 },
  },
  {
    name: 'ConstructPlan', vertical: 'Construction', geography: 'Alberta, Canada', stage: 'closed_lost',
    source: 'broker', revenue: 3400000, arr: 2000000, recurring_revenue_pct: 59,
    gross_margin_pct: 62, customer_count: 85, employee_count: 25,
    description: 'Project management and estimating software for general contractors.',
    founder_name: 'Kevin O\'Brien',
    score: { diversified_customers: 3, low_churn: 2, mission_critical: 3, market_share: 2, fragmented_competition: 3, growth_potential: 3 },
  },
];

const TOUCHPOINT_TEMPLATES = [
  { type: 'email' as const, subject: 'Initial outreach email', summary: 'Sent introductory email explaining our acquisition model and permanent ownership philosophy.' },
  { type: 'call' as const, subject: 'Intro call with founder', summary: 'Discussed company history, growth trajectory, and founder motivations. Founder expressed interest in learning more about our approach.' },
  { type: 'meeting' as const, subject: 'In-person meeting', summary: 'Met with management team. Toured office. Discussed product roadmap and customer base in detail.' },
  { type: 'email' as const, subject: 'Follow-up with CIM request', summary: 'Requested confidential information memorandum and high-level financials for initial evaluation.' },
  { type: 'linkedin' as const, subject: 'Connected on LinkedIn', summary: 'Founder accepted LinkedIn connection request. Engaged with recent company post.' },
];

export function seedDemoData(): void {
  // Create targets
  const targetIds: string[] = [];
  for (const data of SAMPLE_TARGETS) {
    const target = createTarget(data);
    targetIds.push(target.id);

    // Add touchpoints for non-identified targets
    if (data.stage !== 'identified') {
      const numTouchpoints = Math.min(TOUCHPOINT_TEMPLATES.length, ['researching', 'contacted'].includes(data.stage) ? 2 : ['nurturing'].includes(data.stage) ? 3 : 4);
      for (let i = 0; i < numTouchpoints; i++) {
        const tp = TOUCHPOINT_TEMPLATES[i];
        const daysAgo = (numTouchpoints - i) * 15 + Math.floor(Math.random() * 10);
        createTouchpoint({
          target_id: target.id,
          type: tp.type,
          subject: tp.subject,
          summary: tp.summary,
          date: new Date(Date.now() - daysAgo * 86400000).toISOString(),
          follow_up_date: i === numTouchpoints - 1 ? new Date(Date.now() + 7 * 86400000).toISOString() : undefined,
          follow_up_notes: i === numTouchpoints - 1 ? 'Schedule next check-in call' : undefined,
        });
      }
    }

    // Add contacts for some targets
    if (data.founder_name) {
      createContact({
        target_id: target.id,
        name: data.founder_name,
        title: 'Founder & CEO',
        is_primary: true,
      });
    }
  }

  // Create DD project for SchoolBridge ERP (the one in DD stage)
  const ddTarget = SAMPLE_TARGETS.find(t => t.stage === 'due_diligence')!;
  const ddTargetId = targetIds[SAMPLE_TARGETS.indexOf(ddTarget)];
  const ddProject = createDDProject({
    target_id: ddTargetId,
    target_name: ddTarget.name,
    phase: 'detailed',
  });

  // Populate with templates
  populateDDTemplates(ddProject.id);

  // Add some risks
  createDDRisk({
    project_id: ddProject.id,
    title: 'Key person dependency on CTO',
    description: 'CTO built core platform and is the only person with deep knowledge of the legacy codebase.',
    category: 'people',
    impact: 4 as const,
    probability: 3 as const,
    mitigation: 'Negotiate 3-year retention agreement with CTO. Begin knowledge transfer documentation during DD.',
  });
  createDDRisk({
    project_id: ddProject.id,
    title: 'Top 3 school districts represent 28% of revenue',
    description: 'Customer concentration risk. Largest district alone is 12% of ARR.',
    category: 'customer',
    impact: 4 as const,
    probability: 2 as const,
    mitigation: 'Conduct customer reference calls with top 5 accounts. Assess contract renewal timeline and switching costs.',
  });
  createDDRisk({
    project_id: ddProject.id,
    title: 'Provincial regulatory changes planned for 2027',
    description: 'BC Ministry of Education proposing new data residency requirements that could require infrastructure changes.',
    category: 'regulatory',
    impact: 3 as const,
    probability: 3 as const,
  });

  // Add some findings
  createDDFinding({
    project_id: ddProject.id,
    title: 'Strong net revenue retention at 108%',
    description: 'Expansion revenue from module upsells (attendance, transportation) driving NRR above 100%.',
    severity: 'info',
    type: 'positive',
    workstream_key: 'customer',
  });
  createDDFinding({
    project_id: ddProject.id,
    title: 'Monolithic architecture with limited API surface',
    description: 'Application is a single Java monolith. No REST API for third-party integrations. This limits partnership opportunities.',
    severity: 'medium',
    type: 'concern',
    workstream_key: 'technology',
  });

  // Add info requests
  createInfoRequest({
    project_id: ddProject.id,
    title: 'Last 3 years audited financial statements',
    description: 'Need P&L, balance sheet, and cash flow statements for FY2023, FY2024, FY2025.',
    priority: 'critical',
    status: 'received',
    workstream_key: 'financial',
  });
  createInfoRequest({
    project_id: ddProject.id,
    title: 'Customer list with revenue by account',
    description: 'Full customer list showing annual revenue, contract start date, and renewal date per account.',
    priority: 'high',
    status: 'sent',
    workstream_key: 'customer',
  });
  createInfoRequest({
    project_id: ddProject.id,
    title: 'Employee roster with compensation details',
    description: 'Full org chart with names, titles, tenure, base salary, and bonus structure.',
    priority: 'high',
    status: 'draft',
    workstream_key: 'hr',
  });

  // Add deal terms for the LOI target (CivicTrack Pro)
  const loiTargetIdx = SAMPLE_TARGETS.findIndex(t => t.stage === 'loi_submitted');
  if (loiTargetIdx >= 0) {
    const loiTargetId = targetIds[loiTargetIdx];
    createDealTerm({ target_id: loiTargetId, category: 'valuation', label: 'Enterprise Value', value: '$28M (4.3x ARR)' });
    createDealTerm({ target_id: loiTargetId, category: 'valuation', label: 'Earnout', value: '15% held back, tied to 2-year revenue retention' });
    createDealTerm({ target_id: loiTargetId, category: 'structure', label: 'Transaction Type', value: 'Asset purchase' });
    createDealTerm({ target_id: loiTargetId, category: 'structure', label: 'Financing', value: '100% cash at close' });
    createDealTerm({ target_id: loiTargetId, category: 'conditions', label: 'Exclusivity', value: '60 days from LOI signing' });
    createDealTerm({ target_id: loiTargetId, category: 'conditions', label: 'Key Person Retention', value: 'Founder 3-year employment agreement required' });
    createDealTerm({ target_id: loiTargetId, category: 'timeline', label: 'Target Close', value: 'Q3 2026' });
    createDealTerm({ target_id: loiTargetId, category: 'timeline', label: 'DD Period', value: '45 business days' });

    // Add journal entries
    createJournalEntry({
      target_id: loiTargetId,
      title: 'Initial Thesis',
      content: 'CivicTrack Pro is a strong fit for the VMS playbook. Municipal permitting software is extremely sticky — switching costs are astronomical due to data migration and retraining requirements. 83% recurring revenue with 180 municipal customers across the Southeast.\n\nKey thesis: consolidation play. There are 3-4 smaller competitors in the region that could be tuck-in acquisitions within 2 years of closing.',
      tags: ['thesis', 'consolidation', 'VMS'],
      pinned: true,
    });
    createJournalEntry({
      target_id: loiTargetId,
      title: 'Founder Meeting Notes',
      content: 'Met Robert Mitchell in Atlanta. Genuinely great operator — built the company over 15 years from a single county deployment. He\'s motivated by succession planning rather than a quick exit.\n\nConcerns:\n- His VP Engineering has only been there 8 months\n- One large county (Fulton) is ~11% of revenue\n- The product has a desktop client that needs modernization\n\nPositives:\n- Average customer tenure is 9.2 years\n- NRR is 103% even without aggressive upselling\n- Clean financials, no debt',
      tags: ['meeting', 'founder', 'assessment'],
    });

    // Add overdue follow-up for the nurturing target
    const nurturingIdx = SAMPLE_TARGETS.findIndex(t => t.name === 'MedChart Systems');
    if (nurturingIdx >= 0) {
      createTouchpoint({
        target_id: targetIds[nurturingIdx],
        type: 'email',
        subject: 'Follow up on financial data request',
        summary: 'Sent request for preliminary financials. Need to follow up if no response.',
        date: new Date(Date.now() - 20 * 86400000).toISOString(),
        follow_up_date: new Date(Date.now() - 5 * 86400000).toISOString(),
        follow_up_notes: 'Call Dr. Chen if no email response by Friday',
      });
    }

    // Add overdue follow-up for TransitOps
    const transitIdx = SAMPLE_TARGETS.findIndex(t => t.name === 'TransitOps');
    if (transitIdx >= 0) {
      createTouchpoint({
        target_id: targetIds[transitIdx],
        type: 'call',
        subject: 'Quarterly catch-up call',
        summary: 'Good conversation. David mentioned considering strategic options in 12-18 months.',
        date: new Date(Date.now() - 45 * 86400000).toISOString(),
        follow_up_date: new Date(Date.now() - 15 * 86400000).toISOString(),
        follow_up_notes: 'Send industry report and schedule next check-in',
      });
    }
  }
}

export function hasDemoData(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem('dealforge_targets');
  if (!raw) return false;
  const targets = JSON.parse(raw);
  return targets.length > 0;
}
