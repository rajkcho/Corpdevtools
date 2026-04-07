# DealForge

M&A Intelligence Platform for tracking acquisition targets, managing deal pipelines, and running structured due diligence. Purpose-built for vertical market software (VMS) acquisitions.

## Features

### Pipeline CRM
- Kanban board with 10 deal stages (Identified through Closed Won/Lost)
- Drag-and-drop stage progression
- Target company profiles with full financials (Revenue, ARR, margins, customer count)
- 6-criteria weighted scoring engine (Diversified Customers, Low Churn, Mission Critical, Market Share, Fragmented Competition, Growth Potential)
- Relationship timeline with touchpoint logging (calls, emails, meetings, conferences)
- Meeting notes upload with optional AI analysis (action items, deal signals, insights extraction)
- Contact management with auto-discovery from AI-analyzed notes
- Bulk pipeline operations (multi-select, bulk stage change, bulk delete)
- List and grid views with search, filtering, and sorting
- CSV export for targets and contacts

### Deal Room
- Track deal terms by category: Valuation, Structure, Conditions, Timeline
- Inline editing of deal terms
- Per-target activity history feed

### Compare
- Side-by-side comparison of up to 5 targets
- Overview, financials, acquisition criteria, and implied valuation multiples
- Best-in-class value highlighting

### Pipeline Analytics
- Pipeline funnel visualization
- Stage velocity analysis (avg days in stage with stale deal warnings)
- Source analysis with proprietary sourcing ratio (VMS benchmark: 60-70%)
- Vertical market distribution
- Outreach activity trends (6-month bar chart)
- Score distribution histogram
- Win rate tracking

### Due Diligence
- 174 pre-built tasks across 8 workstreams based on VMS acquisition best practices:
  - Commercial, Financial, Customer, Technology & IP, Legal, HR & People, Tax, Operational
- Hierarchical task groups with collapsible sections and bulk operations
- Workstream owner assignment and notes
- Risk register with 5x5 impact/probability heatmap matrix
- Findings & issues log (red flags, concerns, observations, positives)
- Information Request List (IRL) tracker with status workflow
- Document vault with file upload (base64 in localStorage, 5MB limit) and download
- Phase gates (Preliminary, Detailed, Confirmatory, Complete) with approval tracking
- RAG (Red/Amber/Green) status rollups from task level to project level
- Structured DD report export (text format)

### Dashboard
- Portfolio overview with 6 KPI cards
- Pipeline breakdown by stage (horizontal bar chart)
- Vertical market distribution
- Source analysis with proprietary sourcing ratio
- Top scored targets ranking
- Stale deal alerts (>30 days in same stage)
- Upcoming follow-ups calendar
- Recent activity feed

### AI Integration (Optional)
- Supports OpenRouter, OpenAI, Anthropic, and custom OpenAI-compatible providers
- Meeting note analysis: summary, action items, deal signals, key insights, contact extraction
- Document summarization for due diligence
- Risk assessment based on target company data

### Settings
- AI provider configuration with connection testing
- Data management: export all data as JSON, import backups, clear data
- Demo data loader with 10 realistic VMS targets

## Tech Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- localStorage (single-user, no database required)
- Lucide React icons

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

All data is stored in your browser's localStorage. Use Settings > Export to back up your data.

## AI Setup (Optional)

1. Go to Settings
2. Select a provider (OpenRouter recommended for free model access)
3. Enter your API key
4. Test the connection
5. AI features will automatically activate in meeting note uploads
