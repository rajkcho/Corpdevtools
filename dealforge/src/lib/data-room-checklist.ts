// ============================================================
// DealForge Data Room Document Checklist — M&A Due Diligence
// ============================================================

interface DocumentItem {
  name: string;
  preliminary: boolean; // included in preliminary phase
}

interface Category {
  title: string;
  icon: string;
  items: DocumentItem[];
}

const DATA_ROOM_CATEGORIES: Category[] = [
  {
    title: 'Corporate & Legal',
    icon: '⚖️',
    items: [
      { name: 'Articles of Incorporation / Certificate of Formation', preliminary: true },
      { name: 'Bylaws / Operating Agreement', preliminary: true },
      { name: 'Organizational chart (legal entities)', preliminary: true },
      { name: 'Board meeting minutes (last 3 years)', preliminary: false },
      { name: 'Shareholder agreements', preliminary: true },
      { name: 'Stock option plans / cap table', preliminary: true },
      { name: 'Material contracts list', preliminary: true },
      { name: 'Pending/threatened litigation summary', preliminary: true },
      { name: 'Regulatory licenses and permits', preliminary: false },
      { name: 'Insurance policies summary', preliminary: false },
    ],
  },
  {
    title: 'Financial',
    icon: '💰',
    items: [
      { name: 'Audited financial statements (3 years)', preliminary: true },
      { name: 'Monthly P&L (trailing 24 months)', preliminary: true },
      { name: 'Balance sheet (current)', preliminary: true },
      { name: 'Cash flow statements', preliminary: true },
      { name: 'Revenue breakdown by product/service', preliminary: true },
      { name: 'Revenue breakdown by customer', preliminary: true },
      { name: 'Accounts receivable aging', preliminary: false },
      { name: 'Accounts payable aging', preliminary: false },
      { name: 'Capital expenditure schedule', preliminary: false },
      { name: 'Debt schedule / loan agreements', preliminary: true },
      { name: 'Tax returns (3 years)', preliminary: false },
      { name: 'Budget vs actual (current year)', preliminary: false },
      { name: 'Financial projections (3-5 years)', preliminary: true },
    ],
  },
  {
    title: 'Customer & Commercial',
    icon: '🤝',
    items: [
      { name: 'Customer list with revenue', preliminary: true },
      { name: 'Top 20 customer contracts', preliminary: false },
      { name: 'Customer concentration analysis', preliminary: true },
      { name: 'Net revenue retention data', preliminary: true },
      { name: 'Logo retention / churn data', preliminary: true },
      { name: 'Sales pipeline report', preliminary: false },
      { name: 'Pricing schedule / rate cards', preliminary: false },
      { name: 'Customer satisfaction surveys / NPS', preliminary: false },
      { name: 'Case studies / testimonials', preliminary: false },
    ],
  },
  {
    title: 'Technology & IP',
    icon: '💻',
    items: [
      { name: 'System architecture diagram', preliminary: true },
      { name: 'Technology stack overview', preliminary: true },
      { name: 'Source code repository access', preliminary: false },
      { name: 'IP ownership documentation', preliminary: true },
      { name: 'Patents, trademarks, copyrights', preliminary: true },
      { name: 'Third-party software licenses', preliminary: false },
      { name: 'Security audit reports', preliminary: false },
      { name: 'SOC 2 / ISO certifications', preliminary: true },
      { name: 'Data privacy compliance (GDPR, etc.)', preliminary: false },
      { name: 'Disaster recovery / BCP plans', preliminary: false },
      { name: 'Technical debt assessment', preliminary: false },
    ],
  },
  {
    title: 'HR & People',
    icon: '👥',
    items: [
      { name: 'Employee roster with comp details', preliminary: false },
      { name: 'Organizational chart', preliminary: true },
      { name: 'Key employee agreements', preliminary: true },
      { name: 'Benefits summary', preliminary: false },
      { name: 'Employee handbook', preliminary: false },
      { name: 'Hiring plan', preliminary: false },
      { name: 'Turnover statistics (3 years)', preliminary: true },
      { name: 'Pending HR claims/disputes', preliminary: true },
      { name: 'Non-compete / NDA agreements', preliminary: false },
      { name: 'Bonus / incentive plans', preliminary: false },
    ],
  },
  {
    title: 'Tax',
    icon: '🏛️',
    items: [
      { name: 'Federal/state tax returns (3 years)', preliminary: false },
      { name: 'Transfer pricing documentation', preliminary: false },
      { name: 'Tax audit history', preliminary: true },
      { name: 'Sales/use tax compliance', preliminary: false },
      { name: 'R&D tax credit documentation', preliminary: false },
      { name: 'Property tax assessments', preliminary: false },
      { name: 'Tax provision workpapers', preliminary: false },
    ],
  },
  {
    title: 'Operations',
    icon: '⚙️',
    items: [
      { name: 'Key vendor/supplier contracts', preliminary: true },
      { name: 'Lease agreements', preliminary: false },
      { name: 'SLA documentation', preliminary: false },
      { name: 'Support ticket volume & resolution', preliminary: false },
      { name: 'Infrastructure costs breakdown', preliminary: false },
      { name: 'Business continuity plan', preliminary: false },
      { name: 'Quality assurance processes', preliminary: false },
    ],
  },
];

export function generateDataRoomChecklist(targetName: string, phase: string): string {
  const isPreliminary = phase === 'preliminary';
  const dateStr = new Date().toISOString().split('T')[0];

  const categories = DATA_ROOM_CATEGORIES.map(cat => {
    const items = isPreliminary ? cat.items.filter(i => i.preliminary) : cat.items;
    return { ...cat, items };
  }).filter(cat => cat.items.length > 0);

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);

  const phaseLabel = phase.charAt(0).toUpperCase() + phase.slice(1);

  const categoryRows = categories.map((cat, catIdx) => {
    const itemRows = cat.items.map((item, idx) => `
        <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
          <td class="item-name">
            <span class="checkbox">&#9744;</span>
            ${escapeHtml(item.name)}
            ${isPreliminary && item.preliminary ? '' : ''}
          </td>
          <td class="status-cell"><span class="checkbox">&#9744;</span></td>
          <td class="status-cell"><span class="checkbox">&#9744;</span></td>
          <td class="status-cell"><span class="checkbox">&#9744;</span></td>
          <td class="notes-cell"></td>
        </tr>`).join('\n');

    return `
      ${catIdx > 0 ? '<tr class="spacer-row"><td colspan="5"></td></tr>' : ''}
      <tr class="category-header">
        <td colspan="5">
          <span class="cat-icon">${cat.icon}</span>
          ${escapeHtml(cat.title)}
          <span class="cat-count">${cat.items.length} items</span>
        </td>
      </tr>
      ${itemRows}`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Data Room Checklist — ${escapeHtml(targetName)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 1.5cm;
    }
    @media print {
      body { font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      table { font-size: 10px; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.5;
      padding: 24px;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #0f2644 100%);
      color: #ffffff;
      padding: 28px 32px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .header .subtitle {
      font-size: 14px;
      color: #93c5fd;
      margin-bottom: 16px;
    }
    .header-meta {
      display: flex;
      gap: 24px;
      font-size: 12px;
      color: #bfdbfe;
    }
    .header-meta span { display: inline-flex; align-items: center; gap: 4px; }
    .header-meta strong { color: #ffffff; }

    /* Progress tracker */
    .progress-section {
      background: #f0f9ff;
      border-bottom: 1px solid #e2e8f0;
      padding: 16px 32px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .progress-bar-container {
      flex: 1;
      background: #e2e8f0;
      border-radius: 6px;
      height: 10px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
      border-radius: 6px;
      width: 0%;
      transition: width 0.3s;
    }
    .progress-label {
      font-size: 13px;
      color: #475569;
      font-weight: 600;
      white-space: nowrap;
    }
    .progress-count {
      font-size: 13px;
      color: #1e3a5f;
      font-weight: 700;
      white-space: nowrap;
    }

    /* Table */
    .checklist-body { padding: 24px 32px 32px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    thead th {
      background: #1e3a5f;
      color: #ffffff;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 10px 12px;
      text-align: left;
      border: none;
    }
    thead th:not(:first-child) { text-align: center; }
    thead th:last-child { text-align: left; }

    .category-header td {
      background: #dbeafe;
      color: #1e3a5f;
      font-weight: 700;
      font-size: 14px;
      padding: 10px 12px;
      border-top: 2px solid #93c5fd;
    }
    .cat-icon { margin-right: 6px; }
    .cat-count {
      font-size: 11px;
      font-weight: 500;
      color: #3b82f6;
      margin-left: 8px;
    }

    .spacer-row td {
      height: 8px;
      border: none;
      background: transparent;
    }

    tr.row-even td { background: #ffffff; }
    tr.row-odd td { background: #f8fafc; }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .item-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .checkbox {
      font-size: 16px;
      color: #94a3b8;
      line-height: 1;
    }
    .status-cell {
      text-align: center;
      width: 80px;
    }
    .notes-cell {
      width: 140px;
      border-left: 1px dashed #e2e8f0;
    }

    /* Footer */
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 16px 32px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }

    /* Print button */
    .print-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      background: #1e3a5f;
      color: #fff;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      z-index: 100;
    }
    .print-btn:hover { background: #0f2644; }
  </style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

<div class="container">
  <div class="header">
    <h1>Data Room Document Checklist</h1>
    <div class="subtitle">${escapeHtml(targetName)} — M&amp;A Due Diligence</div>
    <div class="header-meta">
      <span>Date: <strong>${dateStr}</strong></span>
      <span>Phase: <strong>${escapeHtml(phaseLabel)}</strong></span>
      <span>Total Items: <strong>${totalItems}</strong></span>
    </div>
  </div>

  <div class="progress-section no-print">
    <span class="progress-label">Completion Progress</span>
    <div class="progress-bar-container">
      <div class="progress-bar" id="progressBar"></div>
    </div>
    <span class="progress-count" id="progressCount">0 / ${totalItems}</span>
  </div>

  <div class="checklist-body">
    <table>
      <thead>
        <tr>
          <th style="width:auto;">Document</th>
          <th style="width:80px;">Requested</th>
          <th style="width:80px;">Received</th>
          <th style="width:80px;">Reviewed</th>
          <th style="width:140px;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${categoryRows}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Generated by DealForge &mdash; ${dateStr} &mdash; ${escapeHtml(phaseLabel)} Phase &mdash; Confidential
  </div>
</div>

<script>
  // Interactive progress tracking (non-print)
  (function() {
    const checkboxes = document.querySelectorAll('.status-cell .checkbox, .item-name .checkbox');
    const total = document.querySelectorAll('.item-name .checkbox').length;
    let checked = 0;

    checkboxes.forEach(function(cb) {
      cb.style.cursor = 'pointer';
      cb.addEventListener('click', function() {
        if (this.innerHTML.trim() === '\\u2610') {
          this.innerHTML = '\\u2611';
          this.style.color = '#1d4ed8';
          if (this.closest('.item-name')) {
            checked++;
          }
        } else {
          this.innerHTML = '\\u2610';
          this.style.color = '#94a3b8';
          if (this.closest('.item-name')) {
            checked--;
          }
        }
        var pct = Math.round((checked / total) * 100);
        var bar = document.getElementById('progressBar');
        var count = document.getElementById('progressCount');
        if (bar) bar.style.width = pct + '%';
        if (count) count.textContent = checked + ' / ' + total;
      });
    });
  })();
</script>

</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
