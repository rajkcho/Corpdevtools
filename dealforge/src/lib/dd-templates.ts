// ============================================================
// DealForge — Due Diligence Task Templates
// Based on VMS (Vertical Market Software) acquisition best practices
// Compiled from industry research, VMS M&A professionals, analyst deep-dives
// and serial acquirer methodologies
// ============================================================

import type { DDWorkstreamKey } from './types';

export interface TaskTemplate {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  children?: TaskTemplate[];
}

// ============================================================
// COMMERCIAL / MARKET DD
// ============================================================
const commercialTasks: TaskTemplate[] = [
  {
    title: 'Market & Competitive Analysis',
    priority: 'high',
    children: [
      { title: 'Define and size the Total Addressable Market (TAM) for the vertical', priority: 'high' },
      { title: 'Identify TAM growth/decline trajectory — is the vertical structurally growing or shrinking?', priority: 'high' },
      { title: 'Map all direct competitors in the vertical niche', priority: 'high' },
      { title: 'Assess fragmentation level of competitive landscape', priority: 'medium' },
      { title: 'Identify any well-funded horizontal competitors entering the vertical', priority: 'high', description: 'Red flag: new horizontal entrant with deep pockets disrupting niche' },
      { title: 'Evaluate platform dependency risk (e.g., built on Salesforce, AWS-specific)', priority: 'medium', description: 'Red flag: single platform vendor dependency' },
      { title: 'Assess regulatory environment and any upcoming regulatory changes', priority: 'medium' },
      { title: 'Identify adjacent verticals or sub-segments for expansion', priority: 'low' },
    ],
  },
  {
    title: 'Product & Value Proposition',
    priority: 'high',
    children: [
      { title: 'Document core product functionality and module breakdown', priority: 'high' },
      { title: 'Assess mission-criticality: can customers operate daily without the software?', priority: 'critical', description: 'Tier 1 criteria: software must be mission-critical to daily operations' },
      { title: 'Evaluate switching costs — how deeply embedded is the product in customer workflows?', priority: 'critical', description: 'VMS acquirers love businesses where "ripping it out would be incredibly painful"' },
      { title: 'Review product roadmap and recent feature releases', priority: 'medium' },
      { title: 'Assess cross-sell / upsell opportunity with adjacent modules', priority: 'medium' },
      { title: 'Evaluate pricing model and pricing power (ability to raise prices)', priority: 'high' },
      { title: 'Compare win/loss rates against key competitors', priority: 'medium' },
      { title: 'Assess sales cycle length by customer segment', priority: 'medium' },
    ],
  },
  {
    title: 'Go-to-Market',
    priority: 'medium',
    children: [
      { title: 'Document sales channels: direct, partner, reseller, inbound', priority: 'medium' },
      { title: 'Review bookings pipeline and pipeline-to-close conversion rates', priority: 'high' },
      { title: 'Assess marketing spend efficiency and lead generation sources', priority: 'medium' },
      { title: 'Evaluate brand strength and reputation in the vertical', priority: 'medium' },
      { title: 'Review any channel partner agreements and dependencies', priority: 'medium' },
    ],
  },
];

// ============================================================
// FINANCIAL DD
// ============================================================
const financialTasks: TaskTemplate[] = [
  {
    title: 'Revenue Quality Analysis',
    priority: 'critical',
    children: [
      { title: 'Break down revenue by type: recurring (SaaS/maintenance), license, professional services, other', priority: 'critical', description: 'Industry standard requires >60-70% recurring revenue. Below this threshold is typically a pass.' },
      { title: 'Calculate recurring revenue % of total revenue', priority: 'critical' },
      { title: 'Analyze maintenance/license revenue ratio (for on-prem: maintenance as multiple of initial license)', priority: 'high', description: 'Industry benchmark: 3-5x+ lifetime maintenance vs. initial license fee' },
      { title: 'Assess professional services revenue quality — is it recurring or project-based?', priority: 'high', description: 'Red flag: revenue heavily weighted to PS/implementation' },
      { title: 'Review revenue recognition policies and deferred revenue trends', priority: 'high', description: 'Red flag: declining deferred revenue is a leading indicator of future revenue problems' },
      { title: 'Analyze revenue seasonality and any Q4/year-end loading', priority: 'medium' },
      { title: 'Identify any one-time or non-recurring revenue items', priority: 'high' },
    ],
  },
  {
    title: 'Financial Normalization',
    priority: 'critical',
    children: [
      { title: 'Normalize for owner compensation and personal expenses through P&L', priority: 'critical', description: 'VMS best practice: "The first thing we do is normalize the financials. Most small VMS companies have owner personal expenses running through the P&L."' },
      { title: 'Identify and adjust for one-time/non-recurring items', priority: 'high' },
      { title: 'Normalize for run-rate cost savings post-acquisition', priority: 'high' },
      { title: 'Adjust for any below-market or above-market compensation', priority: 'medium' },
      { title: 'Normalize working capital (identify any customer prepayments masking churn)', priority: 'high', description: 'Red flag: multi-year deals that hide underlying attrition' },
    ],
  },
  {
    title: 'Profitability & Cash Flow',
    priority: 'critical',
    children: [
      { title: 'Calculate adjusted EBITDA margin', priority: 'critical' },
      { title: 'Calculate maintenance/recurring revenue margin', priority: 'critical', description: 'Often the single most important margin metric for VMS acquirers' },
      { title: 'Analyze cash conversion: EBITDA to free cash flow', priority: 'critical', description: 'VMS best practice: focus on FCF, not accounting earnings' },
      { title: 'Calculate operating cash flow / revenue ratio', priority: 'high', description: 'Mark Leonard\'s preferred metric' },
      { title: 'Review capex requirements and maintenance capex vs. growth capex', priority: 'high' },
      { title: 'Analyze working capital dynamics and cash cycle', priority: 'medium' },
      { title: 'Identify any deferred maintenance/investment (capex holiday)', priority: 'medium' },
    ],
  },
  {
    title: 'Historical Financials (3-5 Year Trend)',
    priority: 'high',
    children: [
      { title: 'Obtain and review 3-5 years of audited/reviewed financial statements', priority: 'high' },
      { title: 'Analyze revenue trends by segment and product line', priority: 'high' },
      { title: 'Track EBITDA margin evolution over the period', priority: 'high' },
      { title: 'Identify any anomalies or inflection points requiring explanation', priority: 'medium' },
      { title: 'Review accounts receivable aging and bad debt history', priority: 'medium' },
      { title: 'Validate tax returns vs. financial statements', priority: 'medium' },
    ],
  },
  {
    title: 'Valuation & Returns',
    priority: 'critical',
    children: [
      { title: 'Build 10-year DCF model with terminal value (perpetuity growth method)', priority: 'critical', description: 'Standard VMS acquirer valuation methodology' },
      { title: 'Model probability-weighted scenarios (MECE: bull/base/bear)', priority: 'critical', description: 'Use MECE scenario modeling to produce single hurdle rate across different risk profiles' },
      { title: 'Calculate IRR against hurdle rates (<$1M=30%, $1-4M=25%, >$4M=20%)', priority: 'critical' },
      { title: 'Calculate revenue multiple and EBITDA multiple (VMS acquirers typically pay 0.5-1.5x revenue or 4-8x EBITDA)', priority: 'high' },
      { title: 'Model payback period from free cash flow', priority: 'high' },
      { title: 'Calculate ROIC on the investment', priority: 'high', description: 'Leonard\'s north-star metric' },
    ],
  },
];

// ============================================================
// CUSTOMER DD
// ============================================================
const customerTasks: TaskTemplate[] = [
  {
    title: 'Customer Base Analysis',
    priority: 'critical',
    children: [
      { title: 'Obtain complete customer list with revenue by customer', priority: 'critical' },
      { title: 'Calculate customer concentration: Top 10 customers as % of revenue', priority: 'critical', description: 'Red flag: any single customer >15-20% of revenue. Some sources say >10%.' },
      { title: 'Calculate Herfindahl-Hirschman Index (HHI) for revenue concentration', priority: 'high', description: 'Compute HHI or equivalent concentration measure' },
      { title: 'Assess industry concentration even if no single customer is large', priority: 'high', description: 'VMS best practice: if all customers are in one sub-segment, that\'s concentration risk' },
      { title: 'Analyze customer tenure / vintage — average customer life (target: >7-10 years)', priority: 'high' },
      { title: 'Segment customers by size, vertical sub-segment, and geography', priority: 'medium' },
      { title: 'Assess government/single-payer dependency', priority: 'high', description: 'Red flag: budget risk, procurement cycle risk' },
    ],
  },
  {
    title: 'Churn & Retention Analysis',
    priority: 'critical',
    children: [
      { title: 'Calculate annual logo churn (gross attrition) by segment', priority: 'critical', description: 'Best practice target: <10% annual logo churn' },
      { title: 'Calculate dollar churn (revenue-weighted attrition)', priority: 'critical' },
      { title: 'Calculate Gross Revenue Retention (GRR)', priority: 'critical', description: 'Best practice target: >90%. Below 85% is a significant concern.' },
      { title: 'Calculate Net Revenue Retention (NRR)', priority: 'high' },
      { title: 'Build customer cohort retention curves by vintage year', priority: 'high', description: 'Analyze revenue per customer segmented by cohort/vintage year' },
      { title: 'Identify customers on legacy contracts with below-market pricing', priority: 'high', description: 'Red flag: risk of sticker shock on renewal' },
      { title: 'Review contract renewal dates — flag clusters in first 12 months post-acquisition', priority: 'high', description: 'VMS best practice: cluster of renewals in year 1 post-close is a risk' },
      { title: 'Identify any customers currently in churn risk or on notice', priority: 'high' },
    ],
  },
  {
    title: 'Customer Reference Calls',
    priority: 'critical',
    children: [
      { title: 'Select 10-20 customers for reference calls (WE pick, not the seller)', priority: 'critical', description: 'VMS best practice: "We always do customer calls. Minimum 5-10 reference calls, and we pick the customers, not the seller."' },
      { title: 'Include mix of: top revenue customers, mid-tier, recent wins, longest-tenured', priority: 'high' },
      { title: 'Conduct calls using standardized question template', priority: 'high' },
      { title: 'Assess customer satisfaction and NPS sentiment', priority: 'high' },
      { title: 'Probe switching intent — are they evaluating alternatives?', priority: 'critical' },
      { title: 'Understand the customer\'s view of competitive landscape', priority: 'medium' },
      { title: 'Ask about product gaps, feature requests, and pain points', priority: 'medium' },
      { title: 'Assess customers\' reaction to potential ownership change', priority: 'high' },
      { title: 'Document call findings in standardized format', priority: 'high' },
      { title: 'Flag any "stuck not happy" customers — high switching costs but low satisfaction', priority: 'critical', description: 'Red flag: switching costs without satisfaction = vulnerability to disruption' },
    ],
  },
];

// ============================================================
// TECHNOLOGY & IP DD
// ============================================================
const technologyTasks: TaskTemplate[] = [
  {
    title: 'Architecture & Code Quality',
    priority: 'high',
    children: [
      { title: 'Document technology stack: languages, frameworks, databases, infrastructure', priority: 'high' },
      { title: 'Assess: can this platform be maintained for 10+ years without a rewrite?', priority: 'critical', description: 'VMS best practice: "The tech DD was not about whether the code was beautiful. It was about: can we maintain this for 10+ years without a rewrite?"' },
      { title: 'Evaluate tech debt level and modernization cost estimate', priority: 'critical', description: 'VMS best practice: tech debt should be priced into the deal. Not "old tech" but "unmaintainable tech" is the red flag.' },
      { title: 'Review CI/CD pipeline and automated testing coverage', priority: 'high', description: 'Red flag: no automated testing / CI/CD indicates fragile codebase' },
      { title: 'Assess single-developer dependency on codebase', priority: 'critical', description: 'Red flag: one person who understands the codebase' },
      { title: 'Review code repository history and contribution patterns', priority: 'medium' },
      { title: 'Identify any "ticking clock" — end-of-life framework, database, or OS', priority: 'high', description: 'VMS best practice: is there a ticking clock requiring expensive, risky migration?' },
    ],
  },
  {
    title: 'Security & Compliance',
    priority: 'high',
    children: [
      { title: 'Review security posture and any recent vulnerability assessments', priority: 'high', description: 'VMS best practice: especially critical in regulated verticals' },
      { title: 'Assess data privacy compliance (GDPR, HIPAA, SOC2 as applicable)', priority: 'high' },
      { title: 'Review open-source licensing for compliance risk', priority: 'high', description: 'Red flag: significant open-source licensing risk' },
      { title: 'Evaluate disaster recovery and business continuity capabilities', priority: 'medium' },
      { title: 'Review any past security incidents or data breaches', priority: 'high' },
    ],
  },
  {
    title: 'IP & Product',
    priority: 'high',
    children: [
      { title: 'Verify IP ownership — all code, patents, trademarks properly assigned to company', priority: 'critical' },
      { title: 'Review any third-party IP dependencies or licensing obligations', priority: 'high' },
      { title: 'Assess hosting and infrastructure: on-prem vs. cloud vs. hybrid', priority: 'medium' },
      { title: 'Review API capabilities and integration ecosystem', priority: 'medium' },
      { title: 'Evaluate product scalability under customer growth', priority: 'medium' },
    ],
  },
];

// ============================================================
// LEGAL DD
// ============================================================
const legalTasks: TaskTemplate[] = [
  {
    title: 'Contracts & Agreements',
    priority: 'high',
    children: [
      { title: 'Review all material customer contracts (especially top 20 by revenue)', priority: 'critical' },
      { title: 'Identify change-of-control provisions that could trigger termination', priority: 'critical' },
      { title: 'Review auto-renewal terms and termination notice periods', priority: 'high' },
      { title: 'Identify any contracts with below-market pricing or unfavorable terms', priority: 'high' },
      { title: 'Review vendor and supplier agreements for material dependencies', priority: 'medium' },
      { title: 'Review any exclusivity, non-compete, or most-favored-nation clauses', priority: 'high' },
      { title: 'Assess any government contracts with special compliance requirements', priority: 'medium' },
    ],
  },
  {
    title: 'Litigation & Regulatory',
    priority: 'high',
    children: [
      { title: 'Review all pending, threatened, or recent litigation', priority: 'high' },
      { title: 'Identify any regulatory investigations or compliance issues', priority: 'high' },
      { title: 'Review insurance coverage (D&O, E&O, cyber liability)', priority: 'medium' },
      { title: 'Assess regulatory compliance status for the target vertical', priority: 'medium' },
    ],
  },
  {
    title: 'Corporate & IP',
    priority: 'medium',
    children: [
      { title: 'Review corporate structure and capitalization table', priority: 'high' },
      { title: 'Verify all employee IP assignment agreements are in place', priority: 'high' },
      { title: 'Review any outstanding options, warrants, or convertible instruments', priority: 'medium' },
      { title: 'Confirm no undisclosed liabilities or obligations', priority: 'high' },
    ],
  },
];

// ============================================================
// HR & PEOPLE DD
// ============================================================
const hrTasks: TaskTemplate[] = [
  {
    title: 'Key Person Assessment',
    priority: 'critical',
    children: [
      { title: 'Map ALL critical knowledge holders: codebase, customer relationships, operations', priority: 'critical', description: 'Map all critical knowledge holders during DD' },
      { title: 'Assess founder dependency — is the founder the sole key relationship holder with major customers?', priority: 'critical', description: 'Red flag: founder IS the product (consulting practice wrapped in software) = pass' },
      { title: 'Evaluate depth of management bench — is there a capable #2?', priority: 'critical', description: 'VMS best practice: "bus factor" of 1 is a key risk' },
      { title: 'Assess whether critical knowledge is documented or tacit', priority: 'high', description: 'Plan for knowledge transfer during integration' },
      { title: 'Identify founder/owner retention plan: earnout, retention agreement (1-3 years)', priority: 'high', description: 'Structure earnouts and retention agreements for founder-dependent businesses' },
    ],
  },
  {
    title: 'Organization & Compensation',
    priority: 'high',
    children: [
      { title: 'Obtain complete org chart with reporting structure', priority: 'high' },
      { title: 'Review all employee compensation vs. market benchmarks', priority: 'high', description: 'Red flag: compensation significantly below market = retention risk post-acquisition' },
      { title: 'Review employee benefits, PTO policies, and any unusual perks', priority: 'medium' },
      { title: 'Identify any pending or expected departures', priority: 'high' },
      { title: 'Assess employee satisfaction and cultural health', priority: 'medium' },
      { title: 'Review any outstanding employment disputes or claims', priority: 'medium' },
      { title: 'Calculate revenue per employee and EBITDA per employee', priority: 'high', description: 'VMS benchmarks: Revenue/employee $100K-$200K target' },
    ],
  },
  {
    title: 'Culture & Integration Readiness',
    priority: 'medium',
    children: [
      { title: 'Assess cultural fit with acquiring organization operating model (measurement, reporting, accountability)', priority: 'high', description: 'Red flag: teams that resist measurement, reporting, accountability' },
      { title: 'Evaluate team\'s openness to new ownership and operating changes', priority: 'medium' },
      { title: 'Identify any cultural mismatch signals', priority: 'medium' },
    ],
  },
];

// ============================================================
// TAX DD
// ============================================================
const taxTasks: TaskTemplate[] = [
  {
    title: 'Tax Compliance & Structure',
    priority: 'high',
    children: [
      { title: 'Review federal and state/provincial tax returns for 3-5 years', priority: 'high' },
      { title: 'Validate tax returns against financial statements', priority: 'high' },
      { title: 'Identify any tax audits, disputes, or pending assessments', priority: 'high' },
      { title: 'Review corporate structure for tax efficiency', priority: 'medium' },
      { title: 'Identify any NOLs (net operating losses) and their usability post-acquisition', priority: 'medium' },
      { title: 'Assess transfer pricing compliance for multi-jurisdiction operations', priority: 'medium' },
      { title: 'Review sales tax/VAT compliance', priority: 'medium' },
      { title: 'Identify any tax exposures or contingent tax liabilities', priority: 'high' },
    ],
  },
];

// ============================================================
// OPERATIONAL DD
// ============================================================
const operationalTasks: TaskTemplate[] = [
  {
    title: 'Operating Ratios & Benchmarking',
    priority: 'critical',
    children: [
      { title: 'Calculate R&D as % of revenue (VMS range: 15-25% at acquisition, target 12-20%)', priority: 'critical', description: 'Benchmark every acquired company against its peer group' },
      { title: 'Calculate S&M as % of revenue (VMS range: 10-20% at acquisition, target 8-15%)', priority: 'critical' },
      { title: 'Calculate G&A as % of revenue (VMS range: 10-20% at acquisition, target 8-12%)', priority: 'critical' },
      { title: 'Calculate Support/COGS as % of revenue (VMS range: 15-25% at acquisition, target 12-20%)', priority: 'high' },
      { title: 'Calculate maintenance/recurring revenue margin (Best practice target: 80-90%)', priority: 'critical' },
      { title: 'Calculate cash conversion: FCF/EBITDA (Best practice target: 80-95%)', priority: 'high' },
      { title: 'Compare all ratios against portfolio benchmarks', priority: 'high', description: 'Best practice: "If your R&D spend is 25% and the peer group is at 18%, ask why."' },
    ],
  },
  {
    title: 'Operations & Infrastructure',
    priority: 'medium',
    children: [
      { title: 'Review customer support operations: ticket volumes, resolution times, SLA compliance', priority: 'high', description: 'DD workstream: support ticket analysis, SLA compliance' },
      { title: 'Assess implementation backlog and professional services pipeline', priority: 'medium' },
      { title: 'Review office leases, equipment, and physical infrastructure', priority: 'low' },
      { title: 'Evaluate internal tools and operational systems', priority: 'low' },
      { title: 'Assess scalability of operations under growth', priority: 'medium' },
    ],
  },
  {
    title: 'Integration Planning',
    priority: 'high',
    children: [
      { title: 'Develop Day-1 readiness plan', priority: 'high', description: 'VMS best practice: "The first thing we do is implement our reporting within 30 days of close."' },
      { title: 'Identify quick wins: pricing adjustments, cost rationalization opportunities', priority: 'high', description: '100-day review: execute quick wins' },
      { title: 'Plan financial reporting integration (monthly financials in standard format)', priority: 'high' },
      { title: 'Outline 100-day integration plan with milestones', priority: 'medium' },
      { title: 'Identify shared services opportunities (finance, HR, IT)', priority: 'medium', description: 'Optimize G&A through shared services' },
      { title: 'Plan customer communication strategy re: ownership change', priority: 'medium' },
    ],
  },
];

// ============================================================
// MASTER TEMPLATE MAP
// ============================================================

export const DD_TASK_TEMPLATES: Record<DDWorkstreamKey, TaskTemplate[]> = {
  commercial: commercialTasks,
  financial: financialTasks,
  customer: customerTasks,
  technology: technologyTasks,
  legal: legalTasks,
  hr: hrTasks,
  tax: taxTasks,
  operational: operationalTasks,
};

// Count total tasks across all templates
export function countTemplateTasks(): number {
  let count = 0;
  for (const ws of Object.values(DD_TASK_TEMPLATES)) {
    for (const group of ws) {
      count++; // group header
      if (group.children) count += group.children.length;
    }
  }
  return count;
}
