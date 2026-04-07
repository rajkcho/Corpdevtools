/**
 * LOI (Letter of Intent) Generator
 * Generates a structured, print-ready LOI document from target and deal term data
 */

import type { Target, Contact, DealTerm } from './types';

interface LOIData {
  target: Target;
  contacts: Contact[];
  dealTerms: DealTerm[];
  buyerName: string;
  buyerTitle: string;
  buyerCompany: string;
  customClauses: string[];
}

export function generateLOI(data: LOIData): string {
  const { target, contacts, dealTerms, buyerName, buyerTitle, buyerCompany, customClauses } = data;
  const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
  const contactName = primaryContact?.name || target.founder_name || '[Seller Name]';

  // Extract deal terms by category
  const getTerms = (cat: string) => dealTerms.filter(t => t.category === cat);
  const valuationTerms = getTerms('valuation');
  const structureTerms = getTerms('structure');
  const conditionTerms = getTerms('conditions');
  const timelineTerms = getTerms('timeline');

  const ev = valuationTerms.find(t => t.label.toLowerCase().includes('enterprise value') || t.label.toLowerCase().includes('ev'))?.value || '[Enterprise Value]';
  const structure = structureTerms.find(t => t.label.toLowerCase().includes('structure'))?.value || 'All cash at closing';
  const earnout = structureTerms.find(t => t.label.toLowerCase().includes('earnout'))?.value;
  const exclusivity = timelineTerms.find(t => t.label.toLowerCase().includes('exclusivity'))?.value || '60 days';
  const closingTimeline = timelineTerms.find(t => t.label.toLowerCase().includes('close') || t.label.toLowerCase().includes('closing'))?.value || '90 days from execution of this LOI';

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Letter of Intent - ${target.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.6; color: #111; max-width: 8.5in; margin: 0 auto; padding: 1in; background: white; }
    h1 { font-size: 16pt; text-align: center; margin-bottom: 24pt; text-transform: uppercase; letter-spacing: 2px; }
    h2 { font-size: 12pt; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; text-decoration: underline; }
    .header { text-align: right; margin-bottom: 24pt; font-size: 11pt; }
    .date { margin-bottom: 12pt; }
    .addressee { margin-bottom: 18pt; }
    .salutation { margin-bottom: 12pt; }
    p { margin-bottom: 12pt; text-align: justify; }
    .section { margin-bottom: 6pt; }
    .indent { margin-left: 36pt; }
    .term-row { display: flex; margin-bottom: 4pt; }
    .term-label { font-weight: bold; min-width: 200px; }
    .signature-block { margin-top: 48pt; }
    .sig-line { border-top: 1px solid #000; width: 300px; margin-top: 48pt; padding-top: 4pt; }
    .confidential { text-align: center; font-size: 9pt; color: #666; margin-top: 36pt; border-top: 1px solid #ccc; padding-top: 12pt; }
    ul { margin-left: 36pt; margin-bottom: 12pt; }
    li { margin-bottom: 4pt; }
    .page-break { page-break-before: always; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>

<div class="header">
  <strong>${buyerCompany || '[Buyer Company]'}</strong><br>
  ${today}
</div>

<h1>Non-Binding Letter of Intent</h1>

<div class="addressee">
  ${contactName}<br>
  ${primaryContact?.title || 'Owner'}<br>
  ${target.name}<br>
</div>

<div class="salutation">
  Dear ${contactName.split(' ')[0]},
</div>

<p>
  This letter sets forth the principal terms pursuant to which <strong>${buyerCompany || '[Buyer Company]'}</strong>
  (the "Buyer") proposes to acquire 100% of the equity interests or substantially all of the assets of
  <strong>${target.name}</strong> (the "Company" or the "Seller"). This Letter of Intent ("LOI") is intended
  to serve as the basis for the preparation of a definitive purchase agreement (the "Definitive Agreement")
  and related documentation.
</p>

<h2>1. Transaction Overview</h2>
<p>
  The Buyer proposes to acquire the Company through a purchase of ${structure.toLowerCase().includes('asset') ? 'substantially all of the assets' : '100% of the outstanding equity interests'}
  of the Company (the "Transaction").
</p>

<h2>2. Enterprise Value</h2>
<p>
  The total enterprise value for the Transaction shall be <strong>${ev}</strong> (the "Purchase Price"),
  subject to customary adjustments for working capital, cash, and indebtedness at closing.
</p>
${earnout ? `
<p>
  <strong>Earnout:</strong> ${earnout}
</p>
` : ''}

<h2>3. Payment Structure</h2>
<p>
  ${structure}. The Purchase Price will be paid in immediately available funds at closing${earnout ? ', with any earnout payments made in accordance with the terms described above' : ''}.
</p>

${valuationTerms.filter(t => !t.label.toLowerCase().includes('enterprise value') && !t.label.toLowerCase().includes('ev')).length > 0 ? `
<h2>4. Additional Valuation Terms</h2>
<ul>
${valuationTerms.filter(t => !t.label.toLowerCase().includes('enterprise value') && !t.label.toLowerCase().includes('ev')).map(t => `  <li><strong>${t.label}:</strong> ${t.value}${t.notes ? ` — ${t.notes}` : ''}</li>`).join('\n')}
</ul>
` : ''}

<h2>${valuationTerms.filter(t => !t.label.toLowerCase().includes('enterprise value') && !t.label.toLowerCase().includes('ev')).length > 0 ? '5' : '4'}. Due Diligence</h2>
<p>
  The Transaction is subject to the satisfactory completion of customary business, financial, legal,
  tax, and technical due diligence by the Buyer and its advisors. The Buyer shall conduct due diligence
  in a thorough but efficient manner, with the goal of completing the due diligence review within
  ${closingTimeline.includes('day') ? closingTimeline : '60 days'} of the execution of this LOI.
</p>
<p>
  The Company shall provide the Buyer and its representatives with reasonable access to the Company's
  books, records, personnel, customers (with prior consent), facilities, and other information as
  reasonably requested.
</p>

<h2>${valuationTerms.filter(t => !t.label.toLowerCase().includes('enterprise value') && !t.label.toLowerCase().includes('ev')).length > 0 ? '6' : '5'}. Exclusivity</h2>
<p>
  For a period of <strong>${exclusivity}</strong> from the date of execution of this LOI (the "Exclusivity Period"),
  the Seller agrees not to, directly or indirectly, solicit, initiate, encourage, or engage in discussions
  or negotiations with any third party regarding any sale, merger, recapitalization, or similar transaction
  involving the Company.
</p>

<h2>${valuationTerms.filter(t => !t.label.toLowerCase().includes('enterprise value') && !t.label.toLowerCase().includes('ev')).length > 0 ? '7' : '6'}. Conditions</h2>
<p>The Transaction shall be subject to the following conditions:</p>
<ul>
  <li>Satisfactory completion of due diligence</li>
  <li>Negotiation and execution of a mutually acceptable Definitive Agreement</li>
  <li>Receipt of all necessary regulatory approvals, if any</li>
  <li>No material adverse change in the business, financial condition, or operations of the Company prior to closing</li>
  ${conditionTerms.map(t => `<li>${t.label}: ${t.value}</li>`).join('\n  ')}
</ul>

<h2>${valuationTerms.filter(t => !t.label.toLowerCase().includes('enterprise value') && !t.label.toLowerCase().includes('ev')).length > 0 ? '8' : '7'}. Management & Employees</h2>
<p>
  The Buyer intends to retain the existing management team and employees of the Company post-closing.
  The Buyer's operating model emphasizes operational independence, and the Company will continue to
  operate as a standalone business unit with existing leadership in place.
</p>

<h2>${valuationTerms.filter(t => !t.label.toLowerCase().includes('enterprise value') && !t.label.toLowerCase().includes('ev')).length > 0 ? '9' : '8'}. Confidentiality</h2>
<p>
  The parties acknowledge that this LOI and all related discussions, negotiations, and materials
  exchanged between the parties shall be kept strictly confidential and shall not be disclosed to
  any third party without the prior written consent of the other party, except as may be required by law
  or to the parties' respective advisors, attorneys, and accountants who are bound by confidentiality obligations.
</p>

<h2>${valuationTerms.filter(t => !t.label.toLowerCase().includes('enterprise value') && !t.label.toLowerCase().includes('ev')).length > 0 ? '10' : '9'}. Target Closing Date</h2>
<p>
  The parties shall use commercially reasonable efforts to close the Transaction within <strong>${closingTimeline}</strong>.
</p>

${customClauses.length > 0 ? `
<h2>${valuationTerms.filter(t => !t.label.toLowerCase().includes('enterprise value') && !t.label.toLowerCase().includes('ev')).length > 0 ? '11' : '10'}. Additional Terms</h2>
<ul>
${customClauses.map(c => `  <li>${c}</li>`).join('\n')}
</ul>
` : ''}

<h2>Non-Binding Nature</h2>
<p>
  Except for the provisions regarding Exclusivity and Confidentiality, which shall be binding upon
  the parties, this LOI is non-binding and is intended solely to set forth the principal terms under
  which the parties would enter into a Definitive Agreement. Neither party shall have any obligation
  to consummate the Transaction unless and until a Definitive Agreement is executed and delivered
  by both parties.
</p>

<p>
  If the foregoing terms are acceptable, please indicate your agreement by signing below and
  returning a copy of this letter. We look forward to working with you to bring this Transaction
  to a successful conclusion.
</p>

<p>Sincerely,</p>

<div class="signature-block">
  <div class="sig-line">
    ${buyerName || '[Name]'}<br>
    ${buyerTitle || '[Title]'}<br>
    ${buyerCompany || '[Company]'}
  </div>
</div>

<div class="signature-block">
  <strong>ACKNOWLEDGED AND AGREED:</strong>
  <div class="sig-line">
    ${contactName}<br>
    ${primaryContact?.title || '[Title]'}<br>
    ${target.name}
  </div>
</div>

<div class="confidential">
  CONFIDENTIAL — This document contains proprietary information and is intended solely for the named recipient(s).
</div>

</body>
</html>`;
}
