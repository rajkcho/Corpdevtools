// ============================================================
// DealForge Demo Data Seed
// Generates realistic sample data for testing and demos
// ============================================================

import { createTarget, createTouchpoint, createContact, createDDProject, createDDRisk, createDDFinding, createInfoRequest, populateDDTemplates, createDealTerm, createJournalEntry, recordStageChange } from './db';
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

// Rich touchpoints per target for realistic demo
const TARGET_TOUCHPOINTS: Record<string, { type: 'email' | 'call' | 'meeting' | 'note' | 'linkedin' | 'conference'; subject: string; summary: string; daysAgo: number; follow_up_date?: number; follow_up_notes?: string; participants?: string }[]> = {
  'MedChart Systems': [
    { type: 'linkedin', subject: 'Connected with Dr. Chen on LinkedIn', summary: 'Found Dr. Chen through Ontario HealthTech association contacts. Sent personalized connection request mentioning shared interest in healthcare IT.', daysAgo: 120 },
    { type: 'email', subject: 'Introductory email to Dr. Chen', summary: 'Sent warm introduction. Outlined our permanent-ownership model and interest in healthcare vertical. Mentioned our existing healthcare portfolio companies as references.', daysAgo: 105 },
    { type: 'call', subject: 'Discovery call with Dr. Chen', summary: 'Great 45-minute call. She founded MedChart in 2014 after frustration with existing EHR systems. Built the product specifically for outpatient clinics. Revenue growing ~12% YoY organically. She is interested in a partnership but not actively seeking exit yet. Agreed to continue dialogue.', daysAgo: 90, participants: 'Dr. Sarah Chen (CEO)' },
    { type: 'email', subject: 'Shared VMS acquisition case studies', summary: 'Sent two case studies showing how acquired companies maintained autonomy post-close while accessing shared services. Also included reference to a healthcare SaaS company we acquired in 2023.', daysAgo: 75 },
    { type: 'conference', subject: 'Met at HIMSS Canada conference', summary: 'Ran into Dr. Chen at HIMSS Toronto. Had informal 20-minute conversation over coffee. She mentioned thinking more seriously about strategic options as she approaches 12 years running the company. Seemed more receptive than initial call.', daysAgo: 55, participants: 'Dr. Sarah Chen, Mark Lee (VP Product)' },
    { type: 'call', subject: 'Follow-up call post-conference', summary: 'Scheduled follow-up to HIMSS meeting. Dr. Chen asked detailed questions about our operating model, especially around how we handle R&D investment post-acquisition. She wants to ensure product development continues.', daysAgo: 40, participants: 'Dr. Sarah Chen (CEO)' },
    { type: 'email', subject: 'Request for preliminary financials', summary: 'Formally requested high-level financials (revenue, ARR breakdown, customer metrics). Dr. Chen said she would discuss with her CFO and get back to us within 2 weeks.', daysAgo: 20, follow_up_date: -5, follow_up_notes: 'Call Dr. Chen if no email response by Friday' },
  ],
  'CivicTrack Pro': [
    { type: 'email', subject: 'Cold outreach to Robert Mitchell', summary: 'Sent tailored email about our interest in govtech vertical. Referenced specific CivicTrack installations we found through public records.', daysAgo: 200 },
    { type: 'call', subject: 'Initial call with founder', summary: 'Robert has been building CivicTrack for 15 years. Started in a single county and expanded to 180 municipalities. Very proud of the team and customer relationships. Mentioned he is thinking about succession planning.', daysAgo: 185, participants: 'Robert Mitchell (CEO)' },
    { type: 'meeting', subject: 'On-site visit to Atlanta HQ', summary: 'Full day visit. Toured the office, met the leadership team (Lisa Washington, Tom Baker, VP Eng). Product demo was impressive — deeply embedded in municipal workflows. Team morale seemed high. Robert showed us the roadmap for cloud migration.', daysAgo: 160, participants: 'Robert Mitchell (CEO), Lisa Washington (VP Sales), Tom Baker (CFO), Dev Team' },
    { type: 'email', subject: 'CIM received and reviewed', summary: 'Tom Baker sent the CIM. Clean financials, no debt, consistent 8% growth. Revenue per customer is increasing YoY. Gross margin is solid at 72%. Noted the desktop client dependency.', daysAgo: 140 },
    { type: 'call', subject: 'Financial deep dive with CFO', summary: 'Spent 90 minutes walking through the financials with Tom Baker. ARR is $6.5M with NRR of 103%. Churn is <3% annually. Top 5 customers represent 22% of revenue. Seasonality around municipal budget cycles (Q4 spike).', daysAgo: 120, participants: 'Tom Baker (CFO)' },
    { type: 'meeting', subject: 'Customer reference visits', summary: 'Visited two CivicTrack customers: Gwinnett County and City of Savannah. Both gave glowing reviews. Average relationship length is 9+ years. Neither is considering switching. Key pain point: mobile access for inspectors.', daysAgo: 95, participants: 'Customer IT Directors' },
    { type: 'call', subject: 'Valuation discussion with Robert', summary: 'Initial valuation conversation. Robert expects 4-4.5x ARR. We discussed structure: asset purchase, 15% earnout, 3-year founder retention. He seems aligned. Wants to protect his employees.', daysAgo: 70, participants: 'Robert Mitchell (CEO)' },
    { type: 'meeting', subject: 'IC presentation prep', summary: 'Internal meeting to prepare the investment committee memo. Discussed key risks (customer concentration, tech debt, VP Eng tenure). Agreed to target 4.3x ARR with earnout.', daysAgo: 55 },
    { type: 'email', subject: 'LOI delivered to Robert Mitchell', summary: 'Sent formal LOI with $28M EV (4.3x ARR), 15% earnout tied to 2-year revenue retention, 60-day exclusivity, and 3-year founder employment agreement. Awaiting response.', daysAgo: 30 },
    { type: 'call', subject: 'LOI negotiation call', summary: 'Robert came back with minor comments: wants 90-day exclusivity instead of 60, and wants to include VP Sales in retention package. We counter-offered 75-day exclusivity. Close to agreement.', daysAgo: 22, participants: 'Robert Mitchell (CEO), Tom Baker (CFO)' },
  ],
  'SchoolBridge ERP': [
    { type: 'email', subject: 'Introduction via industry contact', summary: 'Referred by a contact at BC Ministry of Education who mentioned SchoolBridge as a growing player. Sent introductory email to Maria Garcia.', daysAgo: 180 },
    { type: 'call', subject: 'First call with CEO', summary: 'Maria Garcia is sharp and mission-driven. Started SchoolBridge to fix the broken SIS market in Western Canada. Product handles attendance, grading, scheduling, and parent comms. 95 districts and growing.', daysAgo: 165, participants: 'Maria Garcia (CEO)' },
    { type: 'meeting', subject: 'Management team meeting in Vancouver', summary: 'Met full leadership: Maria (CEO), Kevin (CTO), two product managers. Product demo was excellent — modern UI, deep workflow automation. Kevin is the technical founder and only person who knows the legacy backend.', daysAgo: 140, participants: 'Maria Garcia (CEO), Kevin O\'Brien (CTO), Product team' },
    { type: 'email', subject: 'Financials and customer data received', summary: 'Received detailed financial package. $5.5M revenue, 87% recurring, 81% GM, 25% EBITA margins. Impressive metrics. Customer list shows strong retention with zero involuntary churn in 3 years.', daysAgo: 115 },
    { type: 'call', subject: 'Deep dive on technology stack', summary: 'Technical call with Kevin. Stack is Java monolith with React frontend. Database is PostgreSQL. No REST API for integrations which is a concern. Kevin estimates 6 months to add API layer. Hosting on AWS.', daysAgo: 95, participants: 'Kevin O\'Brien (CTO)' },
    { type: 'meeting', subject: 'Customer reference calls', summary: 'Called 5 school district IT directors. All highly satisfied. Average NPS would be 60+. Key feedback: great support, product evolving well, some want better reporting. Switching cost cited as "astronomical" by all.', daysAgo: 75 },
    { type: 'call', subject: 'IC presentation and approval', summary: 'Presented to investment committee. Approved to proceed with LOI. Key discussion: CTO retention risk and monolithic architecture. Committee comfortable given switching costs and market position.', daysAgo: 55 },
    { type: 'email', subject: 'LOI signed by both parties', summary: 'LOI executed at $22M (4.6x ARR). 45-day exclusivity, confirmatory DD expected 6 weeks, asset purchase structure. Maria enthusiastic about partnership.', daysAgo: 35 },
    { type: 'meeting', subject: 'DD kickoff meeting', summary: 'Kicked off formal DD process. Shared IRL with 90+ items across 7 workstreams. Maria assigned Kevin and her operations lead to be our primary contacts for DD. Weekly status calls scheduled.', daysAgo: 20, participants: 'Maria Garcia (CEO), Kevin O\'Brien (CTO), Legal counsel' },
    { type: 'call', subject: 'DD Week 2 status call', summary: 'Financial DD progressing well. Audited statements received and clean. Technology DD flagged monolithic architecture but no show-stoppers. Customer interviews ongoing. Key person risk on CTO remains top concern.', daysAgo: 6, participants: 'Maria Garcia, Kevin O\'Brien, DD team' },
  ],
  'UtiliSoft': [
    { type: 'linkedin', subject: 'Connected with James Walker', summary: 'Found James through a referral from a utility industry event. Connected on LinkedIn, he posted about rural utility challenges.', daysAgo: 45 },
    { type: 'email', subject: 'Introduction email', summary: 'Sent personalized outreach referencing his LinkedIn post about rural cooperative modernization. Expressed interest in the utility billing space.', daysAgo: 38 },
    { type: 'call', subject: 'Discovery call', summary: 'Good 30-minute call. James built UtiliSoft from scratch 10 years ago. Serves 65 rural electric co-ops in Pacific Northwest. Product is very sticky — implementations take 6-9 months. 88% recurring revenue. He is not actively selling but open to conversation.', daysAgo: 25, participants: 'James Walker (Founder)' },
  ],
  'TransitOps': [
    { type: 'email', subject: 'Initial outreach to David Thompson', summary: 'Sent cold email. TransitOps is an interesting UK target — fleet management for public transit. Located in Manchester.', daysAgo: 180 },
    { type: 'call', subject: 'Introductory call', summary: 'David is an engineer turned entrepreneur. Built TransitOps to solve real problems he saw in public transit operations. 48 transit authority customers across the UK. Revenue £4.8M (~$6.1M USD). Open to conversation but timeline is 12-18 months.', daysAgo: 160, participants: 'David Thompson (CEO)' },
    { type: 'conference', subject: 'Met at Transport Innovation Summit', summary: 'David was speaking at the UK Transport Innovation Summit. Caught up informally. He is getting more inbound interest from PE firms. We should keep him warm.', daysAgo: 90, participants: 'David Thompson (CEO)' },
    { type: 'call', subject: 'Quarterly catch-up call', summary: 'Good conversation. David mentioned considering strategic options in 12-18 months. Revenue growing well. Just signed 3 new transit authorities in Scotland. Key concern: Brexit regulatory impact on EU expansion plans.', daysAgo: 45, follow_up_date: -15, follow_up_notes: 'Send industry report and schedule next check-in' },
  ],
  'RetailPOS Central': [
    { type: 'email', subject: 'Initial contact via broker', summary: 'Received teaser from Melbourne-based broker. RetailPOS is a cloud POS system for specialty retail chains in Australia. Interesting vertical.', daysAgo: 280 },
    { type: 'call', subject: 'Broker intro call', summary: 'Broker provided overview. Michael Barnes built RetailPOS over 8 years. $4.8M revenue, 85% recurring. 520 retail locations. He wants to retire and travel. Clean deal, no complications.', daysAgo: 265 },
    { type: 'meeting', subject: 'Video call with founder', summary: 'Michael is personable and straightforward. Product is well-built, good customer satisfaction. Market in Australia is underserved for specialty retail POS. He estimates 3x his size in addressable market remaining.', daysAgo: 240, participants: 'Michael Barnes (CEO)' },
    { type: 'call', subject: 'Financial review with broker', summary: 'Reviewed financials in detail. Clean P&L, growing 10% YoY, 24% EBITA margins. 520 locations across 85 retail chains. No customer >3% of revenue. Very diversified.', daysAgo: 210 },
    { type: 'meeting', subject: 'On-site visit to Melbourne', summary: 'Flew to Melbourne for 2-day visit. Met entire team of 32. Product demo, customer visits to 3 retail chains. Strong product-market fit. Team is capable and self-sufficient. Michael has a good #2 who can take over.', daysAgo: 180, participants: 'Michael Barnes (CEO), Leadership team, Customer visits' },
    { type: 'email', subject: 'LOI executed', summary: 'LOI signed at $19M (4.6x ARR). All-cash. Michael staying 12 months for transition then retiring. VP Product becomes CEO.', daysAgo: 150 },
    { type: 'meeting', subject: 'DD completed - clean bill of health', summary: 'DD complete after 6 weeks. No material findings. Clean cap table, no litigation, solid IP ownership. Technology stack is modern (React/Node). Proceeding to SPA.', daysAgo: 110 },
    { type: 'email', subject: 'SPA executed - closing complete', summary: 'Deal closed. Total consideration $19M paid at close. Michael Barnes transitioning to advisory role. VP Product Sarah Liu promoted to CEO. Integration planning underway.', daysAgo: 75 },
  ],
  'ConstructPlan': [
    { type: 'email', subject: 'Broker teaser received', summary: 'Received a sell-side mandate from Calgary broker. ConstructPlan is project management for general contractors. Revenue $3.4M but only 59% recurring.', daysAgo: 150 },
    { type: 'call', subject: 'Initial assessment call', summary: 'Spoke with Kevin O\'Brien, the founder. Product is solid but the business model is too project-based. 59% recurring revenue is below our threshold. Customer base of 85 is also fairly concentrated.', daysAgo: 135, participants: 'Kevin O\'Brien (CEO)' },
    { type: 'meeting', subject: 'Management presentation', summary: 'Attended formal management presentation. Product has potential but needs significant investment to move to SaaS model. Current gross margins at 62% are too low for our model. Customer concentration with top 3 at 25% of revenue.', daysAgo: 110, participants: 'Kevin O\'Brien (CEO), Management team' },
    { type: 'note', subject: 'Decision: Pass on ConstructPlan', summary: 'After IC review, decided to pass. Key reasons: (1) Recurring revenue below 75% minimum threshold, (2) Gross margins below 70%, (3) Would require significant investment to transition to pure SaaS. Communicated decision to broker.', daysAgo: 95 },
  ],
  'AgriFlow Solutions': [
    { type: 'email', subject: 'Received broker package', summary: 'Ag-tech broker sent overview of AgriFlow. Farm management software for mid-size operations in Midwest US. Revenue $2.1M. Interesting niche but early stage.', daysAgo: 40 },
    { type: 'call', subject: 'Broker overview call', summary: 'Learned more about the opportunity. Tom Henderson is founder/CEO. 420 farms using the platform. Revenue mix is 71% recurring. Still investing heavily in product development.', daysAgo: 30 },
  ],
  'LegalDox': [
    { type: 'email', subject: 'Inbound inquiry from founder', summary: 'Alexandra Petrov reached out after seeing our acquisition profile on our website. She founded LegalDox 5 years ago. $950K revenue, 84% recurring. Small but interesting.', daysAgo: 35 },
    { type: 'call', subject: 'Initial exploratory call', summary: 'Alexandra is looking for a strategic partner. The company is capital-constrained and she sees a big market opportunity but can\'t fund the sales team needed. 120 law firms, all in Ontario. Product is good but needs to scale.', daysAgo: 20, participants: 'Alexandra Petrov (Founder)' },
  ],
};

export function seedDemoData(): void {
  // Create targets
  const targetIds: string[] = [];
  for (const data of SAMPLE_TARGETS) {
    const target = createTarget(data);
    targetIds.push(target.id);

    // Add rich touchpoints from TARGET_TOUCHPOINTS if available
    const richTouchpoints = TARGET_TOUCHPOINTS[data.name];
    if (richTouchpoints) {
      for (const tp of richTouchpoints) {
        createTouchpoint({
          target_id: target.id,
          type: tp.type,
          subject: tp.subject,
          summary: tp.summary,
          date: new Date(Date.now() - tp.daysAgo * 86400000).toISOString(),
          participants: tp.participants,
          follow_up_date: tp.follow_up_date !== undefined ? new Date(Date.now() - Math.abs(tp.follow_up_date) * 86400000 * (tp.follow_up_date < 0 ? -1 : 1)).toISOString() : undefined,
          follow_up_notes: tp.follow_up_notes,
        });
      }
    } else if (data.stage !== 'identified') {
      // Fall back to generic touchpoints
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

    // Journal entries for MedChart Systems
    const medChartIdx = SAMPLE_TARGETS.findIndex(t => t.name === 'MedChart Systems');
    if (medChartIdx >= 0) {
      createJournalEntry({
        target_id: targetIds[medChartIdx],
        title: 'Initial Thesis: MedChart Systems',
        content: 'MedChart is a compelling healthcare VMS target with strong product-market fit in the outpatient clinic EHR space.\n\nKey thesis points:\n1. 86% recurring revenue with 340 clinics — well-diversified\n2. Healthcare IT switching costs are extreme (data migration, physician training, regulatory compliance)\n3. The outpatient clinic segment is underserved by the large EHR vendors (Epic, Cerner) who focus on hospitals\n4. Dr. Chen is a physician-founder which gives unique product insight\n5. 12% organic growth with minimal sales investment\n\nPotential concerns:\n- Need to verify customer concentration\n- Canadian healthcare regulations may limit US expansion\n- Founder motivation unclear — may not be ready for exit yet\n\nNext steps: Build relationship. This may be a 6-12 month nurture before she is ready.',
        tags: ['thesis', 'healthcare', 'VMS'],
        pinned: true,
      });
      createJournalEntry({
        target_id: targetIds[medChartIdx],
        title: 'HIMSS Conference Notes',
        content: 'Ran into Dr. Chen at HIMSS Canada in Toronto. Key takeaways:\n\n- She is thinking more seriously about strategic options (mentioned "12 years is a long time")\n- Mark Lee (VP Product) seems like a strong #2 who could lead post-acquisition\n- She specifically asked about how we handle R&D investment — she cares deeply about product evolution\n- Competitor Telus Health is getting more aggressive in the market\n- Her NPS score is apparently 72 which is exceptional for healthcare IT\n\nSentiment: Warming up. I think she will be ready to engage more formally within 3-6 months.',
        tags: ['meeting', 'conference', 'relationship'],
      });
    }

    // Journal entries for SchoolBridge
    const schoolBridgeIdx = SAMPLE_TARGETS.findIndex(t => t.name === 'SchoolBridge ERP');
    if (schoolBridgeIdx >= 0) {
      createJournalEntry({
        target_id: targetIds[schoolBridgeIdx],
        title: 'DD Week 1 Summary',
        content: 'Due diligence kicked off. Initial observations:\n\nFinancial:\n- Audited financials received and are clean\n- Revenue quality is high — 87% recurring, <2% annual churn\n- Customer cohort analysis shows expanding revenue per district\n\nTechnology:\n- Java monolith is the main concern\n- Kevin says 6 months to API layer but I think it is 12 months realistically\n- No security audit has been done — we should commission one\n- AWS hosting is well-architected\n\nCustomer:\n- Zero involuntary churn in 3 years is remarkable\n- Spoke with 3 district IT directors — all very positive\n- Average implementation takes 4 months which creates high switching costs\n\nPeople:\n- CTO key person risk is real — he is the only one who knows the legacy backend\n- Need 3-year retention minimum\n- Rest of team seems solid but small (38 people total)',
        tags: ['due-diligence', 'week-1', 'summary'],
        pinned: true,
      });
      createJournalEntry({
        target_id: targetIds[schoolBridgeIdx],
        title: 'Customer Reference Call Notes',
        content: 'Completed 5 customer reference calls:\n\n1. Surrey School District (#1 customer, 8% of revenue)\n   - Using SchoolBridge for 6 years\n   - "Would be extremely painful to switch"\n   - NPS: 9/10\n   - Wants better analytics/reporting module\n\n2. Burnaby District\n   - 4 years on platform\n   - Loves the parent communication features\n   - Recently expanded to transportation module\n   - NPS: 8/10\n\n3. Kelowna District\n   - 3 years, still rolling out attendance module\n   - Good support experience\n   - Concerned about data sovereignty regulations\n   - NPS: 7/10\n\n4. Victoria District\n   - 5 years, using full suite\n   - "SchoolBridge is essential infrastructure"\n   - NPS: 9/10\n\n5. Kamloops District\n   - 2 years, newest customer in sample\n   - Smooth implementation experience\n   - Would like mobile app for teachers\n   - NPS: 8/10\n\nAverage NPS: 8.2/10 — excellent.',
        tags: ['due-diligence', 'customer', 'references'],
      });

      // Deal terms for SchoolBridge
      createDealTerm({ target_id: targetIds[schoolBridgeIdx], category: 'valuation', label: 'Enterprise Value', value: '$22M (4.6x ARR)' });
      createDealTerm({ target_id: targetIds[schoolBridgeIdx], category: 'valuation', label: 'Valuation Method', value: 'Primary: ARR multiple. Secondary: 17.6x EBITA' });
      createDealTerm({ target_id: targetIds[schoolBridgeIdx], category: 'structure', label: 'Transaction Type', value: 'Asset purchase' });
      createDealTerm({ target_id: targetIds[schoolBridgeIdx], category: 'structure', label: 'Financing', value: '90% cash at close, 10% holdback (12 months)' });
      createDealTerm({ target_id: targetIds[schoolBridgeIdx], category: 'conditions', label: 'CTO Retention', value: 'Kevin O\'Brien 3-year employment agreement with non-compete' });
      createDealTerm({ target_id: targetIds[schoolBridgeIdx], category: 'conditions', label: 'Working Capital Target', value: '$400K normalized working capital at close' });
      createDealTerm({ target_id: targetIds[schoolBridgeIdx], category: 'conditions', label: 'IP Assignment', value: 'All IP, source code, and customer contracts assigned to buyer' });
      createDealTerm({ target_id: targetIds[schoolBridgeIdx], category: 'timeline', label: 'DD Period', value: '45 business days from LOI signing' });
      createDealTerm({ target_id: targetIds[schoolBridgeIdx], category: 'timeline', label: 'Target Close', value: 'May 15, 2026' });
      createDealTerm({ target_id: targetIds[schoolBridgeIdx], category: 'timeline', label: 'SPA Execution Target', value: 'May 10, 2026' });
    }

    // Journal entries for TransitOps
    const transitIdx = SAMPLE_TARGETS.findIndex(t => t.name === 'TransitOps');
    if (transitIdx >= 0) {
      createJournalEntry({
        target_id: targetIds[transitIdx],
        title: 'Long-term Nurture Strategy',
        content: 'TransitOps is a high-quality target but David Thompson is on a 12-18 month timeline.\n\nStrategy:\n1. Quarterly check-in calls to maintain relationship\n2. Share relevant industry reports and news\n3. Invite to our annual portfolio company conference\n4. Monitor for competitive bids — PE firms are circling\n\nDavid values:\n- Cultural fit and employee protection\n- Continued investment in product\n- Autonomy to run the business\n\nAll of these align well with our model. Should be a strong candidate when he is ready.\n\nKey risk: Another buyer (likely PE) may approach before we can execute. David seems to prefer strategic buyers but price will matter.',
        tags: ['nurture', 'strategy', 'long-term'],
        pinned: true,
      });
    }

    // Journal entries for RetailPOS (closed deal)
    const retailIdx = SAMPLE_TARGETS.findIndex(t => t.name === 'RetailPOS Central');
    if (retailIdx >= 0) {
      createJournalEntry({
        target_id: targetIds[retailIdx],
        title: 'Post-Close Integration Update — Month 2',
        content: 'Integration progressing well under Sarah Liu\'s leadership.\n\nCompleted:\n- Day 1 communications to all 520 retail locations\n- Financial integration with shared services (accounting, AP/AR)\n- IT security audit completed — all clear\n- Sarah promoted to CEO, Michael transitioning to advisory\n\nIn Progress:\n- HR benefits alignment (target: month 3)\n- Shared IT infrastructure migration to our cloud environment\n- Customer success team training on our playbook\n\nKey Metrics Post-Close:\n- Zero customer churn since announcement\n- Employee retention: 100% (32/32)\n- Revenue run rate tracking to $5.1M (ahead of plan)\n- 3 new retail chain logos signed since close\n\nOverall: Model acquisition and integration. Sarah is an excellent operator.',
        tags: ['post-close', 'integration', 'update'],
        pinned: true,
      });
      createJournalEntry({
        target_id: targetIds[retailIdx],
        title: 'Deal Retrospective',
        content: 'RetailPOS is a good example of executing our playbook:\n\n1. Clean target with strong VMS characteristics\n2. Motivated seller (retirement) with clear succession plan\n3. Straightforward DD with no surprises\n4. Fast close (LOI to close in ~75 days)\n5. Integration running smoothly\n\nLessons learned:\n- Having a strong #2 already in place made the transition seamless\n- Australia time zone creates some friction for shared services\n- The $19M price at 4.6x ARR was fair — could have pushed lower but maintaining founder relationship was worth it\n- Specialty retail POS is a good vertical for tuck-in acquisitions',
        tags: ['retrospective', 'lessons-learned', 'closed'],
      });

      // Deal terms for RetailPOS
      createDealTerm({ target_id: targetIds[retailIdx], category: 'valuation', label: 'Enterprise Value', value: '$19M (4.6x ARR / 3.96x Revenue)' });
      createDealTerm({ target_id: targetIds[retailIdx], category: 'structure', label: 'Transaction Type', value: 'Asset purchase' });
      createDealTerm({ target_id: targetIds[retailIdx], category: 'structure', label: 'Financing', value: '100% cash at close' });
      createDealTerm({ target_id: targetIds[retailIdx], category: 'conditions', label: 'Founder Transition', value: 'Michael Barnes: 12-month advisory role' });
      createDealTerm({ target_id: targetIds[retailIdx], category: 'conditions', label: 'CEO Appointment', value: 'Sarah Liu promoted to CEO effective at close' });
      createDealTerm({ target_id: targetIds[retailIdx], category: 'timeline', label: 'Close Date', value: 'January 23, 2026 (actual)' });
    }

    // Journal entry for ConstructPlan (lost deal)
    const constructIdx = SAMPLE_TARGETS.findIndex(t => t.name === 'ConstructPlan');
    if (constructIdx >= 0) {
      createJournalEntry({
        target_id: targetIds[constructIdx],
        title: 'Post-Mortem: Why We Passed',
        content: 'Decided to pass on ConstructPlan after management presentation.\n\nKey reasons:\n1. Recurring revenue at 59% — well below our 75% minimum threshold\n2. Gross margins at 62% — need 70%+ for our model\n3. High customer concentration (top 3 = 25% of revenue)\n4. Would require $2-3M investment to transition from project-based to SaaS model\n5. Construction vertical is cyclical — concern about downturn resilience\n\nWhat was good:\n- Kevin O\'Brien is a competent operator\n- Product is well-built for its niche\n- 85 general contractors is a reasonable base\n\nVerdict: Not right for us today. Could revisit in 2-3 years if they successfully transition to SaaS model and improve margins. Keeping on watchlist.',
        tags: ['post-mortem', 'passed', 'construction'],
        pinned: true,
      });
    }
  }

  // Seed stage history for targets that have progressed
  const stageProgression: Record<string, DealStage[]> = {
    'MedChart Systems': ['identified', 'researching', 'contacted', 'nurturing'],
    'CivicTrack Pro': ['identified', 'researching', 'contacted', 'nurturing', 'loi_submitted'],
    'SchoolBridge ERP': ['identified', 'researching', 'contacted', 'nurturing', 'loi_submitted', 'loi_signed', 'due_diligence'],
    'UtiliSoft': ['identified', 'researching', 'contacted'],
    'TransitOps': ['identified', 'researching', 'nurturing'],
    'RetailPOS Central': ['identified', 'researching', 'contacted', 'nurturing', 'loi_submitted', 'loi_signed', 'due_diligence', 'closing', 'closed_won'],
    'ConstructPlan': ['identified', 'researching', 'contacted', 'nurturing', 'closed_lost'],
    'AgriFlow Solutions': ['identified', 'researching'],
    'LegalDox': ['identified', 'researching'],
  };

  for (const [name, stages] of Object.entries(stageProgression)) {
    const idx = SAMPLE_TARGETS.findIndex(t => t.name === name);
    if (idx < 0) continue;
    const tid = targetIds[idx];
    for (let i = 0; i < stages.length - 1; i++) {
      recordStageChange(tid, stages[i], stages[i + 1]);
    }
  }

  // Add more contacts for key targets
  const contactsToAdd = [
    { targetName: 'MedChart Systems', contacts: [
      { name: 'Dr. Sarah Chen', title: 'Founder & CEO', is_primary: true, email: 'schen@medchart.example.com', phone: '(416) 555-0187', linkedin: 'linkedin.com/in/drsarahchen', notes: 'Founded MedChart in 2014. Physician turned entrepreneur. Motivated by improving healthcare IT, not just financial exit. Key decision maker.' },
      { name: 'Mark Lee', title: 'VP Product', email: 'mlee@medchart.example.com', phone: '(416) 555-0193', notes: 'Strong technical background. Been with company 6 years. Would be important retention target.' },
      { name: 'Jennifer Kwon', title: 'Controller', email: 'jkwon@medchart.example.com', notes: 'Handles all financial reporting. Clean books.' },
    ]},
    { targetName: 'CivicTrack Pro', contacts: [
      { name: 'Robert Mitchell', title: 'Founder & CEO', is_primary: true, email: 'rmitchell@civictrack.example.com', phone: '(404) 555-0102', linkedin: 'linkedin.com/in/robertmitchell-govtech', notes: '15-year founder. Succession-motivated. Wants to protect employees. Aligned on permanent ownership model.' },
      { name: 'Lisa Washington', title: 'VP Sales', email: 'lwashington@civictrack.example.com', phone: '(404) 555-0108', notes: 'Key revenue driver. Manages all municipal relationships. 7 years at company.' },
      { name: 'Tom Baker', title: 'CFO', email: 'tbaker@civictrack.example.com', phone: '(404) 555-0115', notes: 'Very detail-oriented. Runs clean financials. Good partner for DD process.' },
      { name: 'David Kim', title: 'VP Engineering', email: 'dkim@civictrack.example.com', notes: 'Joined 8 months ago from Tyler Technologies. Leading cloud migration. Key person risk — only been there 8 months.' },
    ]},
    { targetName: 'SchoolBridge ERP', contacts: [
      { name: 'Maria Garcia', title: 'CEO', is_primary: true, email: 'mgarcia@schoolbridge.example.com', phone: '(604) 555-0234', linkedin: 'linkedin.com/in/mariagarcia-edtech', notes: 'Mission-driven founder. Enthusiastic about partnership. Key relationship to maintain through DD.' },
      { name: 'Kevin O\'Brien', title: 'CTO & Co-founder', email: 'kobrien@schoolbridge.example.com', phone: '(604) 555-0241', notes: 'Built the entire platform. Only person with deep legacy knowledge. Critical retention target — need 3-year agreement minimum.' },
      { name: 'Rachel Simmons', title: 'Head of Customer Success', email: 'rsimmons@schoolbridge.example.com', notes: 'Manages all district relationships. High NPS is partly due to her team.' },
      { name: 'Daniel Park', title: 'Operations Lead', email: 'dpark@schoolbridge.example.com', notes: 'Point of contact for DD document requests. Very responsive.' },
    ]},
    { targetName: 'UtiliSoft', contacts: [
      { name: 'James Walker', title: 'Founder & CEO', is_primary: true, email: 'jwalker@utilisoft.example.com', phone: '(503) 555-0156', notes: 'Solo founder. Built the company over 10 years. Not actively selling but open to conversation.' },
      { name: 'Amy Chen', title: 'Director of Operations', email: 'achen@utilisoft.example.com', notes: 'James\'s right hand. Manages client onboarding and support.' },
    ]},
    { targetName: 'TransitOps', contacts: [
      { name: 'David Thompson', title: 'CEO & Founder', is_primary: true, email: 'dthompson@transitops.example.co.uk', phone: '+44 161 555 0198', notes: 'Engineer turned entrepreneur. Timeframe 12-18 months. Getting PE inbound interest. Keep warm.' },
      { name: 'Emma Clarke', title: 'Commercial Director', email: 'eclarke@transitops.example.co.uk', notes: 'Handles all transit authority contracts. Key relationship person.' },
    ]},
    { targetName: 'RetailPOS Central', contacts: [
      { name: 'Michael Barnes', title: 'Founder (Advisory)', is_primary: false, email: 'mbarnes@retailpos.example.com.au', notes: 'Now in 12-month advisory role post-close. Transitioning out. Very cooperative.' },
      { name: 'Sarah Liu', title: 'CEO (Promoted)', is_primary: true, email: 'sliu@retailpos.example.com.au', phone: '+61 3 5555 0167', notes: 'Promoted to CEO post-acquisition. Former VP Product. Strong operator. Integration going well under her leadership.' },
      { name: 'James Nguyen', title: 'CTO', email: 'jnguyen@retailpos.example.com.au', notes: 'Technical leader. Overseeing integration of shared services.' },
    ]},
    { targetName: 'InsureTrack', contacts: [
      { name: 'Patricia Wong', title: 'Founder & CEO', is_primary: true, email: 'pwong@insuretrack.example.com', notes: 'Early stage contact. Company came through broker channel. Need to assess interest level.' },
    ]},
    { targetName: 'AgriFlow Solutions', contacts: [
      { name: 'Tom Henderson', title: 'Founder & CEO', is_primary: true, email: 'thenderson@agriflow.example.com', phone: '(515) 555-0134', notes: 'Former farmer who learned to code. Deep domain expertise. Passionate about ag-tech.' },
    ]},
    { targetName: 'LegalDox', contacts: [
      { name: 'Alexandra Petrov', title: 'Founder & CEO', is_primary: true, email: 'apetrov@legaldox.example.com', phone: '(416) 555-0212', linkedin: 'linkedin.com/in/alexandrapetrov', notes: 'Inbound inquiry. Capital-constrained but sees big opportunity. Looking for strategic partner, not just capital.' },
    ]},
    { targetName: 'ConstructPlan', contacts: [
      { name: 'Kevin O\'Brien', title: 'Founder & CEO', is_primary: true, email: 'kobrien@constructplan.example.com', notes: 'Deal passed. Reason: low recurring revenue, low margins. Keep on radar in case business model improves.' },
    ]},
  ];

  for (const { targetName, contacts } of contactsToAdd) {
    const idx = SAMPLE_TARGETS.findIndex(t => t.name === targetName);
    if (idx < 0) continue;
    for (const c of contacts) {
      createContact({ target_id: targetIds[idx], ...c });
    }
  }

  // Add tags to some targets
  // Tags are added via updateTarget import is not available here, so we handle via localStorage directly
  if (typeof window !== 'undefined') {
    const targets = JSON.parse(localStorage.getItem('dealforge_targets') || '[]');
    const tagMap: Record<string, string[]> = {
      'MedChart Systems': ['healthcare', 'high-priority', 'succession-play'],
      'CivicTrack Pro': ['govtech', 'consolidation-play', 'high-priority'],
      'SchoolBridge ERP': ['edtech', 'in-dd', 'platform'],
      'PolicyHub': ['insurtech', 'broker-deal'],
      'TransitOps': ['transportation', 'long-term-nurture'],
    };
    for (const t of targets) {
      if (tagMap[t.name]) t.tags = tagMap[t.name];
    }
    localStorage.setItem('dealforge_targets', JSON.stringify(targets));

    // Seed watchlist
    const watchlistTargets = targets.filter((t: { name: string }) =>
      ['CivicTrack Pro', 'SchoolBridge ERP', 'MedChart Systems', 'TransitOps', 'UtiliSoft'].includes(t.name)
    );
    localStorage.setItem('dealforge_watchlist', JSON.stringify(watchlistTargets.map((t: { id: string }) => t.id)));

    // Seed deal thesis for MedChart Systems
    const medChart = targets.find((t: { name: string }) => t.name === 'MedChart Systems');
    if (medChart) {
      localStorage.setItem(`dealforge_thesis_${medChart.id}`, JSON.stringify({
        thesis: 'MedChart is an attractive healthcare VMS target. 86% recurring revenue from 340 outpatient clinics in Canada. EHR switching costs are extreme — data migration, physician retraining, and regulatory compliance create 10+ year customer relationships. Dr. Chen\'s physician background gives unique product insight, and the outpatient segment is underserved by large EHR vendors (Epic, Cerner) who focus on hospital systems. 12% organic growth with minimal sales investment suggests significant upside potential with proper go-to-market.',
        risks: '1. Founder may not be ready for exit yet — need to continue nurturing relationship\n2. Canadian healthcare regulations create jurisdictional complexity\n3. Telus Health is getting more aggressive in the market\n4. Need to verify customer concentration data\n5. Only 28 employees — key person risk across multiple functions',
      }));
      localStorage.setItem(`dealforge_competitors_${medChart.id}`, JSON.stringify([
        { id: crypto.randomUUID(), name: 'Telus Health', type: 'direct', threat_level: 3, notes: 'Largest Canadian health IT company. More enterprise-focused but expanding into clinics through acquisitions.' },
        { id: crypto.randomUUID(), name: 'OSCAR EMR', type: 'direct', threat_level: 2, notes: 'Open-source alternative used by some Canadian clinics. Limited support and customization.' },
        { id: crypto.randomUUID(), name: 'Jane App', type: 'indirect', threat_level: 2, notes: 'Practice management for allied health. Could expand into EHR territory.' },
        { id: crypto.randomUUID(), name: 'QHR Technologies', type: 'direct', threat_level: 2, notes: 'Acquired by Loblaw. Accuro product competes in same space. Integration uncertainty post-acquisition.' },
      ]));
    }

    // Seed deal thesis for CivicTrack Pro
    const civicTrack = targets.find((t: { name: string }) => t.name === 'CivicTrack Pro');
    if (civicTrack) {
      localStorage.setItem(`dealforge_thesis_${civicTrack.id}`, JSON.stringify({
        thesis: 'CivicTrack Pro is a compelling VMS acquisition target with strong recurring revenue (83%), high customer retention in the local government vertical, and mission-critical permitting software that has significant switching costs. The Southeast US market is fragmented with many small competitors, creating a consolidation opportunity. Post-acquisition, we can drive margin expansion through operational improvements and cross-sell additional modules to the existing 180-municipality customer base.',
        risks: '1. Customer concentration: Top 10 municipalities represent ~25% of revenue - need to confirm diversification trend\n2. Technology stack may need modernization (currently on older .NET framework)\n3. Founder succession: Robert Mitchell has indicated 2-year transition willingness\n4. Regulatory changes in permitting could impact product relevance',
      }));

      // Seed competitors for CivicTrack Pro
      localStorage.setItem(`dealforge_competitors_${civicTrack.id}`, JSON.stringify([
        { id: crypto.randomUUID(), name: 'Tyler Technologies', type: 'direct', threat_level: 3, notes: 'Dominant player in govtech space, but focused on larger municipalities. CivicTrack serves the sub-50K population segment.' },
        { id: crypto.randomUUID(), name: 'Accela', type: 'direct', threat_level: 2, notes: 'Strong in permitting but weaker in code enforcement. Higher price point.' },
        { id: crypto.randomUUID(), name: 'CityGovApps', type: 'indirect', threat_level: 1, notes: 'Open-source alternative. Limited adoption due to support concerns.' },
      ]));
    }

    // Seed thesis for SchoolBridge ERP
    const schoolBridge = targets.find((t: { name: string }) => t.name === 'SchoolBridge ERP');
    if (schoolBridge) {
      localStorage.setItem(`dealforge_thesis_${schoolBridge.id}`, JSON.stringify({
        thesis: 'SchoolBridge ERP is a best-in-class SIS platform for Western Canadian K-12 districts with 87% recurring revenue and 81% gross margins. The education vertical exhibits extremely low churn due to multi-year government procurement cycles. With 95 districts and a TAM of 400+ districts in Western Canada alone, significant growth runway remains. The product is deeply embedded in school operations (attendance, grading, scheduling, parent communications) creating very high switching costs.',
        risks: '1. Provincial education budget cuts could delay new district adoption\n2. Two-person development team creates key-person risk on the CTO\n3. Competition from PowerSchool and Clever intensifying in Canadian market',
      }));

      // Seed milestones for SchoolBridge (in DD)
      localStorage.setItem(`dealforge_competitors_${schoolBridge.id}`, JSON.stringify([
        { id: crypto.randomUUID(), name: 'PowerSchool', type: 'direct', threat_level: 3, notes: 'US-based SIS leader. Expanding into Canada but not well-established in BC/Alberta yet. Higher price point.' },
        { id: crypto.randomUUID(), name: 'Clever', type: 'indirect', threat_level: 2, notes: 'Integration middleware, not a direct SIS competitor. Could evolve into platform threat.' },
        { id: crypto.randomUUID(), name: 'MyEducation BC', type: 'direct', threat_level: 2, notes: 'Government-built system used by some BC districts. Clunky and underfunded. Districts migrating away.' },
        { id: crypto.randomUUID(), name: 'Follett', type: 'direct', threat_level: 1, notes: 'Primarily US-focused. Limited Canadian presence.' },
      ]));

      localStorage.setItem(`dealforge_milestones_${schoolBridge.id}`, JSON.stringify([
        { id: crypto.randomUUID(), label: 'Initial Research Complete', category: 'research', completed: true, completed_at: '2026-01-15T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'First Contact Made', category: 'outreach', completed: true, completed_at: '2026-01-28T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'Management Meeting Scheduled', category: 'outreach', completed: true, completed_at: '2026-02-05T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'Management Meeting Complete', category: 'outreach', completed: true, completed_at: '2026-02-12T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'Financial Data Received', category: 'diligence', completed: true, completed_at: '2026-02-20T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'Valuation Model Complete', category: 'diligence', completed: true, completed_at: '2026-03-01T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'IC Memo Drafted', category: 'approval', completed: true, completed_at: '2026-03-05T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'IC Approval Obtained', category: 'approval', completed: true, completed_at: '2026-03-08T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'LOI Issued', category: 'deal', completed: true, completed_at: '2026-03-10T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'LOI Signed', category: 'deal', completed: true, completed_at: '2026-03-15T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'DD Kickoff', category: 'diligence', completed: true, completed_at: '2026-03-18T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'DD Complete', category: 'diligence', completed: false, target_date: '2026-04-20' },
        { id: crypto.randomUUID(), label: 'SPA Drafted', category: 'legal', completed: false, target_date: '2026-04-25' },
        { id: crypto.randomUUID(), label: 'SPA Executed', category: 'legal', completed: false, target_date: '2026-05-10' },
        { id: crypto.randomUUID(), label: 'Closing', category: 'deal', completed: false, target_date: '2026-05-15' },
      ]));
    }

    // Seed thesis/competitors for UtiliSoft
    const utilisoft = targets.find((t: { name: string }) => t.name === 'UtiliSoft');
    if (utilisoft) {
      localStorage.setItem(`dealforge_thesis_${utilisoft.id}`, JSON.stringify({
        thesis: 'UtiliSoft serves 65 rural electric cooperatives in the Pacific Northwest with billing and CIS software. 88% recurring revenue is strong. The rural utility niche is extremely sticky — implementations take 6-9 months and cooperatives are risk-averse, change-resistant organizations. No dominant vendor in this sub-segment (most vendors focus on larger IOUs). Acquisition could be the foundation of a utility software vertical with tuck-in opportunities.',
        risks: '1. Small TAM for rural co-ops specifically — growth may require expanding to small municipal utilities\n2. James Walker is a solo founder with limited management depth\n3. Only 22 employees — capacity constraints on new implementations\n4. Technology stack age unknown — need to assess',
      }));
      localStorage.setItem(`dealforge_competitors_${utilisoft.id}`, JSON.stringify([
        { id: crypto.randomUUID(), name: 'NISC (National Information Solutions Cooperative)', type: 'direct', threat_level: 3, notes: 'Dominant player in rural utility space. Member-owned cooperative model gives them preferential positioning. Much larger than UtiliSoft.' },
        { id: crypto.randomUUID(), name: 'Milsoft Utility Solutions', type: 'direct', threat_level: 2, notes: 'Engineering and outage management software. Some billing overlap. Texas-based.' },
        { id: crypto.randomUUID(), name: 'Cayenta (Harris subsidiary)', type: 'direct', threat_level: 2, notes: 'Already in our corporate family. Potential for knowledge sharing or eventual combination.' },
      ]));
    }

    // Seed thesis/competitors for TransitOps
    const transitOps = targets.find((t: { name: string }) => t.name === 'TransitOps');
    if (transitOps) {
      localStorage.setItem(`dealforge_thesis_${transitOps.id}`, JSON.stringify({
        thesis: 'TransitOps provides fleet management and route optimization software for 48 UK public transit authorities. £4.8M revenue with 85% recurring. Transit authority software is mission-critical and highly sticky — transit systems cannot operate without these tools. The UK market is consolidating from regional to national contracts, which benefits established vendors. David Thompson\'s expansion into Scotland shows strong growth trajectory. Could be a platform for European transit tech expansion.',
        risks: '1. UK-only customer base — currency risk and Brexit regulatory impacts\n2. Timeline is 12-18 months — need patience\n3. PE firms are circling — competitive process risk\n4. Small customer base (48) means higher concentration risk\n5. Need to understand impact of UK transport devolution on procurement',
      }));
    }

    // Seed thesis for RetailPOS (closed deal)
    const retailPOS = targets.find((t: { name: string }) => t.name === 'RetailPOS Central');
    if (retailPOS) {
      localStorage.setItem(`dealforge_thesis_${retailPOS.id}`, JSON.stringify({
        thesis: 'RetailPOS Central was acquired to serve as the foundation of our specialty retail vertical in the APAC region. 520 retail locations across 85 chains in Australia. 85% recurring revenue, 24% EBITA margins. The specialty retail POS market in ANZ is fragmented with no dominant player. Post-acquisition, the company is tracking above plan with 3 new logos signed since close.',
        risks: '(Post-close) 1. Australia time zone creates some shared services friction\n2. Need to monitor AUD/USD exchange rate impact on reported results\n3. Michael Barnes transitioning out — need to ensure Sarah Liu has full support',
      }));

      // Milestones for RetailPOS (completed deal)
      localStorage.setItem(`dealforge_milestones_${retailPOS.id}`, JSON.stringify([
        { id: crypto.randomUUID(), label: 'Initial Research Complete', category: 'research', completed: true, completed_at: '2025-06-15T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'Management Meeting', category: 'outreach', completed: true, completed_at: '2025-07-20T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'Site Visit (Melbourne)', category: 'outreach', completed: true, completed_at: '2025-08-10T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'IC Approval', category: 'approval', completed: true, completed_at: '2025-09-05T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'LOI Signed', category: 'deal', completed: true, completed_at: '2025-09-20T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'DD Complete', category: 'diligence', completed: true, completed_at: '2025-11-01T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'SPA Executed', category: 'legal', completed: true, completed_at: '2025-12-15T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'Deal Closed', category: 'deal', completed: true, completed_at: '2026-01-23T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'Day 1 Integration', category: 'integration', completed: true, completed_at: '2026-01-24T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'Month 1 Integration Review', category: 'integration', completed: true, completed_at: '2026-02-23T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'Month 3 Integration Review', category: 'integration', completed: false, target_date: '2026-04-23' },
      ]));
    }

    // Seed milestones for CivicTrack Pro (LOI stage)
    const civicTrackM = targets.find((t: { name: string }) => t.name === 'CivicTrack Pro');
    if (civicTrackM) {
      localStorage.setItem(`dealforge_milestones_${civicTrackM.id}`, JSON.stringify([
        { id: crypto.randomUUID(), label: 'Initial Research', category: 'research', completed: true, completed_at: '2025-09-20T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'First Contact', category: 'outreach', completed: true, completed_at: '2025-10-05T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'On-site Visit (Atlanta)', category: 'outreach', completed: true, completed_at: '2025-10-30T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'CIM Received', category: 'diligence', completed: true, completed_at: '2025-11-20T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'Customer References', category: 'diligence', completed: true, completed_at: '2026-01-05T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'IC Presentation', category: 'approval', completed: true, completed_at: '2026-02-10T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'LOI Submitted', category: 'deal', completed: true, completed_at: '2026-03-08T00:00:00Z' },
        { id: crypto.randomUUID(), label: 'LOI Signed', category: 'deal', completed: false, target_date: '2026-04-15' },
        { id: crypto.randomUUID(), label: 'DD Kickoff', category: 'diligence', completed: false, target_date: '2026-04-20' },
        { id: crypto.randomUUID(), label: 'Target Close', category: 'deal', completed: false, target_date: '2026-07-15' },
      ]));
    }

    // Add tags to more targets
    const extendedTagMap: Record<string, string[]> = {
      'UtiliSoft': ['utilities', 'cooperative', 'sticky-vertical'],
      'InsureTrack': ['insurtech', 'early-stage', 'needs-assessment'],
      'TransitOps': ['transportation', 'UK', 'long-term-nurture', 'high-quality'],
      'AgriFlow Solutions': ['agtech', 'broker-deal', 'early-research'],
      'LegalDox': ['legaltech', 'inbound', 'small-but-interesting'],
      'RetailPOS Central': ['retail', 'APAC', 'closed', 'integration'],
      'ConstructPlan': ['construction', 'passed', 'low-recurring'],
    };
    for (const t of targets) {
      if (extendedTagMap[t.name]) {
        t.tags = [...(t.tags || []), ...extendedTagMap[t.name]];
      }
    }
    localStorage.setItem('dealforge_targets', JSON.stringify(targets));

    // Seed outreach settings
    localStorage.setItem('dealforge_outreach_settings', JSON.stringify({
      senderName: '',
      senderTitle: 'Director, M&A',
      companyName: '',
      senderEmail: '',
      senderPhone: '',
    }));
  }
}

export function hasDemoData(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem('dealforge_targets');
  if (!raw) return false;
  const targets = JSON.parse(raw);
  return targets.length > 0;
}
