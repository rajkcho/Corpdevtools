// ============================================================
// DealForge AI Integration
// Supports OpenRouter, OpenAI, Anthropic, and custom providers
// ============================================================

interface AISettings {
  provider: 'openrouter' | 'openai' | 'anthropic' | 'custom';
  api_key: string;
  model: string;
  base_url: string;
}

function getAISettings(): AISettings | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('dealforge_ai_settings');
  if (!raw) return null;
  const settings = JSON.parse(raw) as AISettings;
  return settings.api_key ? settings : null;
}

export function isAIConfigured(): boolean {
  return getAISettings() !== null;
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const settings = getAISettings();
  if (!settings) throw new Error('AI not configured. Go to Settings to add an API key.');

  const baseUrl = settings.provider === 'openrouter'
    ? 'https://openrouter.ai/api/v1'
    : settings.provider === 'openai'
    ? 'https://api.openai.com/v1'
    : settings.provider === 'anthropic'
    ? 'https://api.anthropic.com/v1'
    : settings.base_url;

  if (settings.provider === 'anthropic') {
    const res = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.api_key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = await res.json();
    if (data.content?.[0]?.text) return data.content[0].text;
    throw new Error(data.error?.message || 'Anthropic API error');
  }

  // OpenAI-compatible (OpenRouter, OpenAI, custom)
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.api_key}`,
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  const data = await res.json();
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  throw new Error(data.error?.message || 'API error');
}

// --- Meeting Notes Analysis ---

export interface MeetingAnalysis {
  summary: string;
  action_items: { text: string; assignee?: string; due_date?: string }[];
  key_insights: string[];
  deal_signals: { signal: string; sentiment: 'positive' | 'negative' | 'neutral'; detail?: string }[];
  mentioned_contacts: { name: string; title?: string }[];
  follow_up_recommended: string | null;
}

export async function analyzeMeetingNotes(notes: string, targetName: string): Promise<MeetingAnalysis> {
  const systemPrompt = `You are an M&A analyst at a serial acquirer of vertical market software (VMS) companies. You analyze meeting notes to extract actionable intelligence.

You MUST respond with valid JSON matching this exact structure:
{
  "summary": "2-3 sentence executive summary of the meeting",
  "action_items": [{"text": "action item description", "assignee": "person name or null", "due_date": "YYYY-MM-DD or null"}],
  "key_insights": ["insight 1", "insight 2"],
  "deal_signals": [{"signal": "signal description", "sentiment": "positive|negative|neutral", "detail": "additional context"}],
  "mentioned_contacts": [{"name": "person name", "title": "their title or null"}],
  "follow_up_recommended": "recommended follow-up action or null"
}

Focus on M&A-relevant signals:
- Seller motivation and timeline
- Key person dependencies
- Customer concentration mentions
- Technology/product health indicators
- Revenue quality signals (recurring vs one-time)
- Competitive threats mentioned
- Integration complexity indicators
- Pricing/valuation signals`;

  const userPrompt = `Analyze these meeting notes for the acquisition target "${targetName}":\n\n${notes}`;

  const response = await callAI(systemPrompt, userPrompt);

  // Parse JSON from response (handle markdown code blocks)
  const jsonStr = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

// --- Document Summary ---

export async function summarizeDocument(text: string, documentName: string, category: string): Promise<{
  summary: string;
  key_findings: string[];
  red_flags: string[];
  questions: string[];
}> {
  const systemPrompt = `You are an M&A due diligence analyst reviewing documents for a vertical market software acquisition. Extract key findings relevant to deal evaluation.

Respond with valid JSON:
{
  "summary": "2-3 sentence summary of the document",
  "key_findings": ["finding 1", "finding 2"],
  "red_flags": ["any concerning findings"],
  "questions": ["questions that need follow-up"]
}

Focus on: revenue quality, customer concentration, churn indicators, technology health, key person dependencies, legal risks, and anything that would affect a buy/no-buy decision.`;

  const userPrompt = `Analyze this ${category} document "${documentName}":\n\n${text}`;

  const response = await callAI(systemPrompt, userPrompt);
  const jsonStr = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

// --- Risk Assessment ---

export async function assessRisks(targetData: {
  name: string;
  vertical: string;
  revenue?: number;
  arr?: number;
  recurring_revenue_pct?: number;
  customer_count?: number;
  employee_count?: number;
  description?: string;
}): Promise<{
  risks: { title: string; description: string; category: string; impact: number; probability: number; mitigation: string }[];
  overall_assessment: string;
}> {
  const systemPrompt = `You are an M&A risk analyst at a serial acquirer of vertical market software companies. Based on limited target company data, identify potential risks that should be investigated during due diligence.

Respond with valid JSON:
{
  "risks": [{"title": "Risk title", "description": "Details", "category": "customer|financial|technology|legal|people|operational|market|regulatory", "impact": 1-5, "probability": 1-5, "mitigation": "Suggested mitigation"}],
  "overall_assessment": "1-2 sentence overall risk assessment"
}

Consider VMS evaluation criteria: customer concentration, churn, mission-criticality, switching costs, market position, technology durability, key-person dependency.`;

  const userPrompt = `Assess risks for this potential acquisition target:\n${JSON.stringify(targetData, null, 2)}`;

  const response = await callAI(systemPrompt, userPrompt);
  const jsonStr = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}
