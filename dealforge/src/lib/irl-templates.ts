/**
 * IRL (Information Request List) Templates by DD Workstream
 * Standard due diligence information requests for VMS acquisitions
 */

export interface IRLItem {
  id: string;
  category: string;
  request: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  notes?: string;
}

export interface IRLWorkstream {
  key: string;
  label: string;
  items: IRLItem[];
}

export const IRL_TEMPLATES: IRLWorkstream[] = [
  {
    key: 'financial',
    label: 'Financial',
    items: [
      { id: 'fin-01', category: 'Historical Financials', request: 'Audited financial statements for the last 3 fiscal years', priority: 'critical' },
      { id: 'fin-02', category: 'Historical Financials', request: 'Monthly P&L and balance sheet for the last 24 months', priority: 'critical' },
      { id: 'fin-03', category: 'Historical Financials', request: 'Revenue breakdown by product/service line, by month', priority: 'critical' },
      { id: 'fin-04', category: 'Revenue Quality', request: 'Revenue by customer (top 20) for the last 3 years', priority: 'critical' },
      { id: 'fin-05', category: 'Revenue Quality', request: 'Recurring vs. non-recurring revenue breakdown by month', priority: 'critical' },
      { id: 'fin-06', category: 'Revenue Quality', request: 'Deferred revenue schedule and recognition policies', priority: 'high' },
      { id: 'fin-07', category: 'Revenue Quality', request: 'Backlog and contracted but unrecognized revenue', priority: 'high' },
      { id: 'fin-08', category: 'Profitability', request: 'Detailed cost structure breakdown (COGS, S&M, R&D, G&A)', priority: 'high' },
      { id: 'fin-09', category: 'Profitability', request: 'EBITDA bridge / normalization adjustments', priority: 'critical' },
      { id: 'fin-10', category: 'Profitability', request: 'Owner compensation and related-party transactions', priority: 'high' },
      { id: 'fin-11', category: 'Working Capital', request: 'Accounts receivable aging report (current)', priority: 'high' },
      { id: 'fin-12', category: 'Working Capital', request: 'Accounts payable aging report (current)', priority: 'medium' },
      { id: 'fin-13', category: 'Working Capital', request: 'Cash flow statement for the last 3 years', priority: 'high' },
      { id: 'fin-14', category: 'Projections', request: 'Management financial projections for the next 3 years', priority: 'high' },
      { id: 'fin-15', category: 'Projections', request: 'Key assumptions underlying projections', priority: 'high' },
      { id: 'fin-16', category: 'Tax', request: 'Tax returns for the last 3 fiscal years', priority: 'high' },
      { id: 'fin-17', category: 'Tax', request: 'Schedule of any pending or potential tax liabilities', priority: 'medium' },
    ],
  },
  {
    key: 'customer',
    label: 'Customer',
    items: [
      { id: 'cust-01', category: 'Customer Base', request: 'Complete customer list with contract values and start dates', priority: 'critical' },
      { id: 'cust-02', category: 'Customer Base', request: 'Customer count by product/tier over the last 3 years', priority: 'high' },
      { id: 'cust-03', category: 'Retention', request: 'Gross and net revenue retention rates (last 3 years)', priority: 'critical' },
      { id: 'cust-04', category: 'Retention', request: 'Logo churn rate and reasons for churn (last 3 years)', priority: 'critical' },
      { id: 'cust-05', category: 'Retention', request: 'Customer cohort analysis by year of acquisition', priority: 'high' },
      { id: 'cust-06', category: 'Concentration', request: 'Revenue concentration — % from top 1, 5, 10, 20 customers', priority: 'critical' },
      { id: 'cust-07', category: 'Contracts', request: 'Sample customer contracts (3-5 representative agreements)', priority: 'high' },
      { id: 'cust-08', category: 'Contracts', request: 'Contract renewal dates and auto-renewal terms', priority: 'high' },
      { id: 'cust-09', category: 'Contracts', request: 'Change-of-control provisions in customer contracts', priority: 'critical' },
      { id: 'cust-10', category: 'Satisfaction', request: 'NPS or customer satisfaction survey results (if available)', priority: 'medium' },
      { id: 'cust-11', category: 'Satisfaction', request: 'List of recent customer complaints or disputes', priority: 'medium' },
      { id: 'cust-12', category: 'Sales', request: 'Sales pipeline and new bookings trend (last 12 months)', priority: 'high' },
      { id: 'cust-13', category: 'Sales', request: 'Average contract value and deal cycle length', priority: 'medium' },
    ],
  },
  {
    key: 'technology',
    label: 'Technology & IP',
    items: [
      { id: 'tech-01', category: 'Architecture', request: 'High-level system architecture diagram', priority: 'critical' },
      { id: 'tech-02', category: 'Architecture', request: 'Technology stack overview (languages, frameworks, databases, cloud)', priority: 'critical' },
      { id: 'tech-03', category: 'Architecture', request: 'Deployment model (SaaS/on-prem/hybrid) and hosting details', priority: 'high' },
      { id: 'tech-04', category: 'Development', request: 'Development team size, structure, and key personnel', priority: 'high' },
      { id: 'tech-05', category: 'Development', request: 'Release cadence and SDLC process overview', priority: 'medium' },
      { id: 'tech-06', category: 'Development', request: 'Product roadmap for the next 12-18 months', priority: 'high' },
      { id: 'tech-07', category: 'Tech Debt', request: 'Known technical debt and modernization needs', priority: 'high' },
      { id: 'tech-08', category: 'Tech Debt', request: 'Age of core codebase and any planned rewrites', priority: 'medium' },
      { id: 'tech-09', category: 'Security', request: 'Security certifications (SOC 2, ISO 27001, etc.)', priority: 'high' },
      { id: 'tech-10', category: 'Security', request: 'History of security incidents or breaches', priority: 'critical' },
      { id: 'tech-11', category: 'Security', request: 'Penetration testing results (most recent)', priority: 'medium' },
      { id: 'tech-12', category: 'IP', request: 'List of patents, trademarks, and registered copyrights', priority: 'high' },
      { id: 'tech-13', category: 'IP', request: 'Third-party software licenses and open-source usage', priority: 'high' },
      { id: 'tech-14', category: 'IP', request: 'Data privacy compliance (GDPR, CCPA, HIPAA as applicable)', priority: 'high' },
      { id: 'tech-15', category: 'Infrastructure', request: 'Uptime/SLA performance over the last 12 months', priority: 'medium' },
      { id: 'tech-16', category: 'Infrastructure', request: 'Disaster recovery and business continuity plans', priority: 'medium' },
    ],
  },
  {
    key: 'legal',
    label: 'Legal',
    items: [
      { id: 'legal-01', category: 'Corporate', request: 'Articles of incorporation, bylaws, and amendments', priority: 'critical' },
      { id: 'legal-02', category: 'Corporate', request: 'Cap table and equity holder details', priority: 'critical' },
      { id: 'legal-03', category: 'Corporate', request: 'List of subsidiaries and corporate structure diagram', priority: 'high' },
      { id: 'legal-04', category: 'Contracts', request: 'All material contracts (customers, vendors, partners)', priority: 'critical' },
      { id: 'legal-05', category: 'Contracts', request: 'Lease agreements for all facilities', priority: 'high' },
      { id: 'legal-06', category: 'Contracts', request: 'Non-compete and non-solicitation agreements', priority: 'high' },
      { id: 'legal-07', category: 'Litigation', request: 'Schedule of pending or threatened litigation', priority: 'critical' },
      { id: 'legal-08', category: 'Litigation', request: 'History of settled litigation (last 5 years)', priority: 'medium' },
      { id: 'legal-09', category: 'Regulatory', request: 'List of required licenses, permits, and regulatory approvals', priority: 'high' },
      { id: 'legal-10', category: 'Regulatory', request: 'History of regulatory inquiries or compliance issues', priority: 'high' },
      { id: 'legal-11', category: 'Insurance', request: 'Schedule of insurance policies and coverage levels', priority: 'medium' },
      { id: 'legal-12', category: 'Insurance', request: 'Claims history for the last 3 years', priority: 'medium' },
    ],
  },
  {
    key: 'hr',
    label: 'HR & People',
    items: [
      { id: 'hr-01', category: 'Organization', request: 'Organization chart with reporting lines', priority: 'critical' },
      { id: 'hr-02', category: 'Organization', request: 'Employee census (name, title, hire date, compensation, location)', priority: 'critical' },
      { id: 'hr-03', category: 'Organization', request: 'Independent contractor list and agreements', priority: 'high' },
      { id: 'hr-04', category: 'Key Personnel', request: 'Bios of key management and technical personnel', priority: 'high' },
      { id: 'hr-05', category: 'Key Personnel', request: 'Key person dependencies and succession planning', priority: 'critical' },
      { id: 'hr-06', category: 'Compensation', request: 'Total compensation packages for top 10 employees', priority: 'high' },
      { id: 'hr-07', category: 'Compensation', request: 'Bonus/incentive plan structures', priority: 'medium' },
      { id: 'hr-08', category: 'Compensation', request: 'Benefits summary (health, retirement, equity, etc.)', priority: 'high' },
      { id: 'hr-09', category: 'Retention', request: 'Employee turnover rates (last 3 years)', priority: 'high' },
      { id: 'hr-10', category: 'Retention', request: 'Open positions and hiring plan', priority: 'medium' },
      { id: 'hr-11', category: 'Compliance', request: 'Employee handbook and key HR policies', priority: 'medium' },
      { id: 'hr-12', category: 'Compliance', request: 'Any pending employment disputes or EEOC claims', priority: 'high' },
    ],
  },
  {
    key: 'commercial',
    label: 'Commercial / Market',
    items: [
      { id: 'comm-01', category: 'Market', request: 'Total addressable market (TAM) estimate and methodology', priority: 'high' },
      { id: 'comm-02', category: 'Market', request: 'Competitive landscape overview and market share estimates', priority: 'high' },
      { id: 'comm-03', category: 'Market', request: 'Key competitive differentiators and moat analysis', priority: 'high' },
      { id: 'comm-04', category: 'Market', request: 'Industry trends and regulatory drivers/headwinds', priority: 'medium' },
      { id: 'comm-05', category: 'Product', request: 'Product demo or access to sandbox environment', priority: 'critical' },
      { id: 'comm-06', category: 'Product', request: 'Pricing model and recent pricing changes', priority: 'high' },
      { id: 'comm-07', category: 'Product', request: 'Feature comparison vs. top 3 competitors', priority: 'medium' },
      { id: 'comm-08', category: 'Growth', request: 'Geographic expansion opportunities', priority: 'medium' },
      { id: 'comm-09', category: 'Growth', request: 'Potential tuck-in acquisition targets', priority: 'low' },
      { id: 'comm-10', category: 'Growth', request: 'Cross-sell / upsell opportunity analysis', priority: 'medium' },
    ],
  },
  {
    key: 'operational',
    label: 'Operational',
    items: [
      { id: 'ops-01', category: 'Operations', request: 'Description of key business processes and workflows', priority: 'medium' },
      { id: 'ops-02', category: 'Operations', request: 'Customer support model and SLA commitments', priority: 'high' },
      { id: 'ops-03', category: 'Operations', request: 'Support ticket volume and resolution metrics', priority: 'medium' },
      { id: 'ops-04', category: 'Operations', request: 'Implementation/onboarding process and timeline', priority: 'high' },
      { id: 'ops-05', category: 'Vendors', request: 'Key vendor and supplier list with contract terms', priority: 'high' },
      { id: 'ops-06', category: 'Vendors', request: 'Single-source dependencies or concentration risks', priority: 'high' },
      { id: 'ops-07', category: 'Metrics', request: 'Key operating metrics dashboard (if available)', priority: 'medium' },
      { id: 'ops-08', category: 'Metrics', request: 'Revenue per employee and operating ratios (S&M %, R&D %, G&A %)', priority: 'high' },
    ],
  },
];

/**
 * Generate a print-ready HTML IRL document
 */
export function generateIRLDocument(
  companyName: string,
  workstreamKeys: string[],
  buyerCompany: string,
): string {
  const selectedWorkstreams = IRL_TEMPLATES.filter(w => workstreamKeys.includes(w.key));
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let totalItems = 0;
  selectedWorkstreams.forEach(w => { totalItems += w.items.length; });

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Information Request List - ${companyName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 10pt; line-height: 1.5; color: #111; max-width: 8.5in; margin: 0 auto; padding: 0.75in; background: white; }
    h1 { font-size: 18pt; color: #1e40af; margin-bottom: 4pt; }
    h2 { font-size: 13pt; color: #1e40af; margin-top: 20pt; margin-bottom: 8pt; padding-bottom: 4pt; border-bottom: 2px solid #1e40af; }
    h3 { font-size: 10pt; color: #374151; margin-top: 12pt; margin-bottom: 4pt; text-transform: uppercase; letter-spacing: 0.5px; }
    .header { margin-bottom: 16pt; }
    .meta { color: #6b7280; font-size: 9pt; margin-bottom: 2pt; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; font-size: 9pt; }
    th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-weight: 600; border: 1px solid #e5e7eb; }
    td { padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
    tr:nth-child(even) { background: #f9fafb; }
    .priority-critical { color: #dc2626; font-weight: 600; }
    .priority-high { color: #ea580c; }
    .priority-medium { color: #ca8a04; }
    .priority-low { color: #6b7280; }
    .status-col { width: 70px; text-align: center; }
    .priority-col { width: 60px; }
    .num-col { width: 35px; text-align: center; }
    .notes-col { width: 120px; }
    .footer { margin-top: 24pt; padding-top: 12pt; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #9ca3af; }
    @media print { body { padding: 0; } h2 { page-break-after: avoid; } }
  </style>
</head>
<body>

<div class="header">
  <h1>Information Request List</h1>
  <div class="meta"><strong>Target Company:</strong> ${companyName}</div>
  <div class="meta"><strong>Prepared by:</strong> ${buyerCompany || 'M&A Team'}</div>
  <div class="meta"><strong>Date:</strong> ${today}</div>
  <div class="meta"><strong>Total Items:</strong> ${totalItems} across ${selectedWorkstreams.length} workstream${selectedWorkstreams.length !== 1 ? 's' : ''}</div>
</div>

<p style="margin-bottom: 12pt; font-size: 9pt; color: #374151;">
  Please provide the following documents and information to support our due diligence review.
  Items marked as <span class="priority-critical">Critical</span> are needed first to enable initial assessment.
  Where exact documents are not available, management commentary or reasonable approximations are acceptable.
</p>
`;

  let itemNum = 0;
  for (const ws of selectedWorkstreams) {
    html += `<h2>${ws.label} Workstream</h2>\n`;

    // Group by category
    const categories = Array.from(new Set(ws.items.map(i => i.category)));
    for (const cat of categories) {
      const catItems = ws.items.filter(i => i.category === cat);
      html += `<h3>${cat}</h3>\n`;
      html += `<table>
  <thead>
    <tr>
      <th class="num-col">#</th>
      <th>Request</th>
      <th class="priority-col">Priority</th>
      <th class="status-col">Status</th>
      <th class="notes-col">Notes</th>
    </tr>
  </thead>
  <tbody>\n`;

      for (const item of catItems) {
        itemNum++;
        html += `    <tr>
      <td class="num-col">${itemNum}</td>
      <td>${item.request}</td>
      <td class="priority-col"><span class="priority-${item.priority}">${item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}</span></td>
      <td class="status-col">☐</td>
      <td class="notes-col"></td>
    </tr>\n`;
      }

      html += `  </tbody>\n</table>\n`;
    }
  }

  html += `
<div class="footer">
  <p>CONFIDENTIAL — This Information Request List is confidential and proprietary. Distribution is limited to authorized parties.</p>
  <p>Generated by DealForge on ${today}</p>
</div>

</body>
</html>`;

  return html;
}
