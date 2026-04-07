'use client';

import { useEffect, useState } from 'react';
import { getTargets, getContacts, getTouchpoints, createTouchpoint, logActivity } from '@/lib/db';
import type { Target, Contact, Touchpoint } from '@/lib/types';
import { Mail, Copy, Check, ChevronDown, Edit2, Clock, Trash2, Send, Plus, Save } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  stage: string; // which pipeline stage this is best for
  description: string;
}

const TEMPLATES: EmailTemplate[] = [
  {
    id: 'cold_outreach',
    name: 'Initial Cold Outreach',
    subject: 'Exploring a potential partnership with {{company}}',
    stage: 'identified',
    description: 'First contact with a target company. Emphasizes permanent ownership and operational independence.',
    body: `Dear {{contact_name}},

I hope this email finds you well. My name is {{your_name}} and I lead M&A efforts at {{your_company}}, where we acquire and permanently hold vertical market software companies.

I've been following {{company}} and am impressed by your position in the {{vertical}} space. We're particularly drawn to companies with strong recurring revenue, loyal customer bases, and mission-critical products — all of which {{company}} appears to embody.

Unlike private equity firms, we acquire companies with the intent to hold them permanently. We don't flip businesses, and we're committed to maintaining operational independence for the teams we partner with. Our model focuses on providing resources, best practices, and a long-term home while preserving what makes each company special.

I'd welcome the opportunity to have a brief introductory call to share more about our approach and learn about your vision for {{company}}. Would you have 20-30 minutes in the coming weeks?

Best regards,
{{your_name}}
{{your_title}}
{{your_company}}`,
  },
  {
    id: 'broker_response',
    name: 'Broker/CIM Response',
    subject: 'RE: {{company}} - Expression of Interest',
    stage: 'researching',
    description: 'Response to a broker presenting a deal opportunity.',
    body: `Hi {{contact_name}},

Thank you for sharing the opportunity regarding {{company}}. We've reviewed the teaser and are interested in learning more.

A few initial questions before we proceed with the CIM:

1. What is the seller's primary motivation and timeline?
2. Can you share the approximate recurring revenue percentage?
3. How many active customers does the company serve?
4. Is there a formal process or are you open to bilateral discussions?

We are active acquirers in the {{vertical}} space and can move quickly with a streamlined diligence process. Our typical close timeline is 60-90 days from LOI.

Please send over the CIM and any additional materials at your convenience.

Best regards,
{{your_name}}
{{your_title}}
{{your_company}}`,
  },
  {
    id: 'follow_up',
    name: 'Follow-Up After Meeting',
    subject: 'Great speaking with you - {{company}} next steps',
    stage: 'contacted',
    description: 'Follow-up email after an initial meeting or call with the target.',
    body: `Dear {{contact_name}},

Thank you for taking the time to speak with me today about {{company}}. I really enjoyed learning more about your business and the {{vertical}} market.

A few key takeaways from our discussion:
- [Key point 1]
- [Key point 2]
- [Key point 3]

As discussed, our next steps would be:
1. [Next step 1]
2. [Next step 2]

I'd also like to share a few references from founders of companies we've acquired — they can speak firsthand to what it's like working with us post-acquisition.

Please don't hesitate to reach out with any questions. I'm looking forward to continuing our conversation.

Best regards,
{{your_name}}
{{your_title}}
{{your_company}}`,
  },
  {
    id: 'loi_cover',
    name: 'LOI Cover Letter',
    subject: 'Letter of Intent - {{company}}',
    stage: 'nurturing',
    description: 'Cover letter accompanying a Letter of Intent submission.',
    body: `Dear {{contact_name}},

Following our productive discussions about {{company}}, I am pleased to submit the attached non-binding Letter of Intent outlining the terms under which we would propose to acquire the business.

Key terms summary:
- Enterprise Value: [Value]
- Structure: [Cash/earnout mix]
- Exclusivity Period: [X] days
- Expected Close: [Timeline]
- Management: We intend to retain the existing management team

This LOI reflects our genuine appreciation for what you've built at {{company}} and our commitment to being the right long-term home for the business, its customers, and its employees.

We are prepared to move expeditiously through due diligence and are flexible on timing to accommodate your needs. Our diligence process is thorough but respectful — we understand that running a business while going through an acquisition is demanding.

I welcome the opportunity to discuss these terms at your convenience.

Best regards,
{{your_name}}
{{your_title}}
{{your_company}}`,
  },
  {
    id: 'irl_cover',
    name: 'Information Request',
    subject: '{{company}} - Due Diligence Information Request',
    stage: 'due_diligence',
    description: 'Cover email for sending a due diligence information request list.',
    body: `Dear {{contact_name}},

As we move forward with our due diligence process for {{company}}, I've attached our initial information request list.

I understand this is a significant undertaking, and I want to assure you that:

1. We will treat all materials with the utmost confidentiality
2. Our team is available to discuss any items that need clarification
3. We can prioritize the most critical items first if time is limited
4. We're happy to work with your existing formats — no need to repackage

The items are organized by workstream (Financial, Customer, Technology, Legal, HR, Tax, Operational). Where exact documents aren't available, reasonable approximations or management commentary are perfectly acceptable.

Could we schedule a brief call this week to walk through the list and prioritize items together?

Best regards,
{{your_name}}
{{your_title}}
{{your_company}}`,
  },
  {
    id: 'nurture',
    name: 'Relationship Nurture',
    subject: 'Thought you might find this interesting - {{vertical}} market update',
    stage: 'nurturing',
    description: 'Keep-warm email to maintain relationship with a target not yet ready to sell.',
    body: `Hi {{contact_name}},

I hope all is well at {{company}}. I came across [article/report/news] about the {{vertical}} market and thought of you.

[Brief insight or observation about the industry]

No agenda here — just wanted to stay in touch and share something I thought you'd find valuable. If you'd ever like to catch up over coffee or a call, I'm always happy to chat.

Best,
{{your_name}}`,
  },
];

function getCustomTemplates(): EmailTemplate[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('dealforge_custom_templates');
  return raw ? JSON.parse(raw) : [];
}

function saveCustomTemplates(templates: EmailTemplate[]): void {
  localStorage.setItem('dealforge_custom_templates', JSON.stringify(templates));
}

export default function OutreachPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0].id);
  const [yourName, setYourName] = useState('');
  const [yourTitle, setYourTitle] = useState('');
  const [yourCompany, setYourCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [outreachLog, setOutreachLog] = useState<Touchpoint[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<EmailTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    setTargets(getTargets());
    setCustomTemplates(getCustomTemplates());
    // Load all email touchpoints as outreach log
    const allTps = getTouchpoints();
    setOutreachLog(allTps.filter(tp => tp.type === 'email').slice(0, 20));
    // Load saved preferences
    if (typeof window !== 'undefined') {
      setYourName(localStorage.getItem('dealforge_your_name') || '');
      setYourTitle(localStorage.getItem('dealforge_your_title') || '');
      setYourCompany(localStorage.getItem('dealforge_your_company') || '');
    }
  }, []);

  // Save preferences
  useEffect(() => {
    if (typeof window !== 'undefined' && yourName) {
      localStorage.setItem('dealforge_your_name', yourName);
      localStorage.setItem('dealforge_your_title', yourTitle);
      localStorage.setItem('dealforge_your_company', yourCompany);
    }
  }, [yourName, yourTitle, yourCompany]);

  const allTemplates = [...TEMPLATES, ...customTemplates];
  const template = allTemplates.find(t => t.id === selectedTemplate) || TEMPLATES[0];
  const target = targets.find(t => t.id === selectedTarget);

  // Get contacts for selected target
  const contacts = selectedTarget ? getContacts(selectedTarget) : [];
  const primaryContact = contacts.find(c => c.is_primary) || contacts[0];

  // Auto-fill contact name when target changes
  useEffect(() => {
    if (target && primaryContact) {
      setContactName(primaryContact.name);
    } else if (target?.founder_name) {
      setContactName(target.founder_name);
    }
  }, [selectedTarget]);

  const fillTemplate = (text: string): string => {
    return text
      .replace(/\{\{company\}\}/g, target?.name || '[Company Name]')
      .replace(/\{\{contact_name\}\}/g, contactName || '[Contact Name]')
      .replace(/\{\{vertical\}\}/g, target?.vertical || '[Vertical]')
      .replace(/\{\{your_name\}\}/g, yourName || '[Your Name]')
      .replace(/\{\{your_title\}\}/g, yourTitle || '[Your Title]')
      .replace(/\{\{your_company\}\}/g, yourCompany || '[Your Company]');
  };

  const filledSubject = fillTemplate(isEditing ? customSubject : template.subject);
  const filledBody = fillTemplate(isEditing ? customBody : template.body);

  const handleCopy = (type: 'subject' | 'body') => {
    const text = type === 'subject' ? filledSubject : filledBody;
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleStartEdit = () => {
    setCustomSubject(template.subject);
    setCustomBody(template.body);
    setIsEditing(true);
  };

  const handleOpenMailClient = () => {
    const to = primaryContact?.email || target?.founder_email || '';
    const mailto = `mailto:${to}?subject=${encodeURIComponent(filledSubject)}&body=${encodeURIComponent(filledBody)}`;
    window.open(mailto);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Outreach Templates</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          M&A email templates with auto-populated target details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-4">
          {/* Your details */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Your Details</h3>
            <input value={yourName} onChange={e => setYourName(e.target.value)} placeholder="Your Name" className="w-full text-sm" />
            <input value={yourTitle} onChange={e => setYourTitle(e.target.value)} placeholder="Your Title" className="w-full text-sm" />
            <input value={yourCompany} onChange={e => setYourCompany(e.target.value)} placeholder="Your Company" className="w-full text-sm" />
          </div>

          {/* Target selection */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Target</h3>
            <select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)} className="w-full text-sm">
              <option value="">Select a target...</option>
              {targets.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.vertical})</option>
              ))}
            </select>
            <input
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              placeholder="Contact Name"
              className="w-full text-sm"
            />
            {target && (
              <div className="text-xs space-y-1" style={{ color: 'var(--muted)' }}>
                <div>Vertical: {target.vertical}</div>
                <div>Stage: {target.stage}</div>
                {primaryContact?.email && <div>Email: {primaryContact.email}</div>}
              </div>
            )}
          </div>

          {/* Template selection */}
          <div className="glass-card p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Templates</h3>
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedTemplate(t.id); setIsEditing(false); }}
                className="w-full text-left p-2.5 rounded-lg transition-colors"
                style={{
                  background: selectedTemplate === t.id ? 'var(--accent-muted)' : 'var(--background)',
                  borderLeft: selectedTemplate === t.id ? '3px solid var(--accent)' : '3px solid transparent',
                }}
              >
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{t.description}</div>
              </button>
            ))}
            {customTemplates.length > 0 && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wider pt-2" style={{ color: 'var(--muted)' }}>Custom</div>
                {customTemplates.map(t => (
                  <div key={t.id} className="flex items-center gap-1">
                    <button
                      onClick={() => { setSelectedTemplate(t.id); setIsEditing(false); }}
                      className="flex-1 text-left p-2.5 rounded-lg transition-colors"
                      style={{
                        background: selectedTemplate === t.id ? 'var(--accent-muted)' : 'var(--background)',
                        borderLeft: selectedTemplate === t.id ? '3px solid var(--accent)' : '3px solid transparent',
                      }}
                    >
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{t.description}</div>
                    </button>
                    <button
                      onClick={() => {
                        const updated = customTemplates.filter(ct => ct.id !== t.id);
                        setCustomTemplates(updated);
                        saveCustomTemplates(updated);
                        if (selectedTemplate === t.id) setSelectedTemplate(TEMPLATES[0].id);
                      }}
                      className="btn-ghost p-1 rounded flex-shrink-0"
                    >
                      <Trash2 size={12} style={{ color: 'var(--muted)' }} />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* Subject line */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Subject</span>
              <button onClick={() => handleCopy('subject')} className="btn btn-ghost btn-sm">
                {copied === 'subject' ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                {copied === 'subject' ? 'Copied' : 'Copy'}
              </button>
            </div>
            {isEditing ? (
              <input
                value={customSubject}
                onChange={e => setCustomSubject(e.target.value)}
                className="w-full text-sm font-medium"
              />
            ) : (
              <div className="text-sm font-medium">{filledSubject}</div>
            )}
          </div>

          {/* Email body */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Body</span>
              <div className="flex gap-2">
                {!isEditing && (
                  <button onClick={handleStartEdit} className="btn btn-ghost btn-sm">
                    <Edit2 size={14} /> Customize
                  </button>
                )}
                <button onClick={() => handleCopy('body')} className="btn btn-ghost btn-sm">
                  {copied === 'body' ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                  {copied === 'body' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            {isEditing ? (
              <textarea
                value={customBody}
                onChange={e => setCustomBody(e.target.value)}
                className="w-full font-mono text-sm"
                rows={20}
                style={{ lineHeight: 1.6 }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm" style={{ fontFamily: 'inherit', lineHeight: 1.6 }}>
                {filledBody}
              </pre>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleOpenMailClient} className="btn btn-primary">
              <Mail size={14} /> Open in Mail Client
            </button>
            <button onClick={() => handleCopy('body')} className="btn btn-secondary">
              <Copy size={14} /> Copy Full Email
            </button>
            {selectedTarget && (
              <button
                onClick={() => {
                  createTouchpoint({
                    target_id: selectedTarget,
                    type: 'email',
                    date: new Date().toISOString(),
                    subject: filledSubject,
                    summary: `Sent "${template.name}" template to ${contactName}`,
                  });
                  const allTps = getTouchpoints();
                  setOutreachLog(allTps.filter(tp => tp.type === 'email').slice(0, 20));
                  alert('Email logged as touchpoint');
                }}
                className="btn btn-secondary"
              >
                <Send size={14} /> Log as Sent
              </button>
            )}
            {isEditing && (
              <>
                <button onClick={() => setIsEditing(false)} className="btn btn-ghost">
                  Reset to Template
                </button>
                <button
                  onClick={() => setShowSaveTemplate(true)}
                  className="btn btn-secondary"
                >
                  <Save size={14} /> Save as Template
                </button>
              </>
            )}
            {showSaveTemplate && (
              <div className="w-full flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                <input
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  placeholder="Template name..."
                  className="flex-1"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (!newTemplateName.trim()) return;
                    const newTemplate: EmailTemplate = {
                      id: `custom_${Date.now()}`,
                      name: newTemplateName,
                      subject: customSubject,
                      body: customBody,
                      stage: 'nurturing',
                      description: 'Custom template',
                    };
                    const updated = [...customTemplates, newTemplate];
                    setCustomTemplates(updated);
                    saveCustomTemplates(updated);
                    setSelectedTemplate(newTemplate.id);
                    setShowSaveTemplate(false);
                    setNewTemplateName('');
                    setIsEditing(false);
                  }}
                  disabled={!newTemplateName.trim()}
                  className="btn btn-primary btn-sm"
                >
                  Save
                </button>
                <button onClick={() => setShowSaveTemplate(false)} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Outreach Follow-up Tracker */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Clock size={16} style={{ color: 'var(--warning)' }} /> Follow-up Tracker
          </h2>
          <button onClick={() => setShowLog(!showLog)} className="btn btn-ghost btn-sm">
            {showLog ? 'Hide' : 'Show'} Email Log ({outreachLog.length})
          </button>
        </div>

        {/* Overdue follow-ups */}
        {(() => {
          const allTps = getTouchpoints();
          const overdue = allTps
            .filter(tp => tp.follow_up_date && new Date(tp.follow_up_date).getTime() < Date.now())
            .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime());
          const upcoming = allTps
            .filter(tp => tp.follow_up_date && new Date(tp.follow_up_date).getTime() >= Date.now())
            .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())
            .slice(0, 5);
          const allTargetsList = getTargets();

          if (overdue.length === 0 && upcoming.length === 0) {
            return <p className="text-sm" style={{ color: 'var(--muted)' }}>No pending follow-ups. Log touchpoints with follow-up dates to track them here.</p>;
          }

          return (
            <div className="space-y-3">
              {overdue.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--danger)' }}>
                    Overdue ({overdue.length})
                  </h3>
                  <div className="space-y-1">
                    {overdue.slice(0, 5).map(tp => {
                      const t = allTargetsList.find(tgt => tgt.id === tp.target_id);
                      const daysOverdue = Math.floor((Date.now() - new Date(tp.follow_up_date!).getTime()) / 86400000);
                      return (
                        <div key={tp.id} className="flex items-center gap-3 p-2 rounded text-xs" style={{ background: 'rgba(239,68,68,0.05)' }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }} />
                          <span className="font-medium">{t?.name || 'Unknown'}</span>
                          <span className="flex-1 truncate" style={{ color: 'var(--muted-foreground)' }}>{tp.subject}</span>
                          <span className="font-mono" style={{ color: 'var(--danger)' }}>{daysOverdue}d overdue</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {upcoming.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--warning)' }}>
                    Upcoming ({upcoming.length})
                  </h3>
                  <div className="space-y-1">
                    {upcoming.map(tp => {
                      const t = allTargetsList.find(tgt => tgt.id === tp.target_id);
                      const daysUntil = Math.floor((new Date(tp.follow_up_date!).getTime() - Date.now()) / 86400000);
                      return (
                        <div key={tp.id} className="flex items-center gap-3 p-2 rounded text-xs" style={{ background: 'var(--background)' }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: daysUntil === 0 ? 'var(--warning)' : 'var(--accent)' }} />
                          <span className="font-medium">{t?.name || 'Unknown'}</span>
                          <span className="flex-1 truncate" style={{ color: 'var(--muted-foreground)' }}>{tp.subject}</span>
                          <span className="font-mono" style={{ color: daysUntil === 0 ? 'var(--warning)' : 'var(--accent)' }}>
                            {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Email log */}
        {showLog && outreachLog.length > 0 && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>Recent Emails</h3>
            <div className="space-y-1">
              {outreachLog.map(tp => {
                const t = targets.find(tgt => tgt.id === tp.target_id);
                return (
                  <div key={tp.id} className="flex items-center gap-3 p-2 rounded text-xs" style={{ background: 'var(--background)' }}>
                    <Mail size={12} style={{ color: 'var(--accent)' }} />
                    <span className="font-medium">{t?.name || 'Unknown'}</span>
                    <span className="flex-1 truncate" style={{ color: 'var(--muted-foreground)' }}>{tp.subject}</span>
                    <span style={{ color: 'var(--muted)' }}>{new Date(tp.date).toLocaleDateString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {/* Outreach Cadence Planner */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Mail size={16} style={{ color: 'var(--accent)' }} /> Outreach Pipeline
          </h2>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
          Track outreach status per target. See who needs initial contact, follow-up, or has gone cold.
        </p>
        {(() => {
          const allTps = getTouchpoints();
          const activeTargets = targets.filter(t => !['closed_won', 'closed_lost'].includes(t.stage));

          const targetOutreach = activeTargets.map(t => {
            const tps = allTps.filter(tp => tp.target_id === t.id && tp.type === 'email');
            const lastEmail = tps.length > 0 ? tps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
            const daysSinceContact = lastEmail ? Math.floor((Date.now() - new Date(lastEmail.date).getTime()) / 86400000) : null;
            const pendingFollowUp = allTps.find(tp => tp.target_id === t.id && tp.follow_up_date && new Date(tp.follow_up_date) < new Date());

            let status: 'never_contacted' | 'recent' | 'warming' | 'cold' | 'has_followup';
            if (pendingFollowUp) status = 'has_followup';
            else if (!lastEmail) status = 'never_contacted';
            else if (daysSinceContact !== null && daysSinceContact <= 7) status = 'recent';
            else if (daysSinceContact !== null && daysSinceContact <= 30) status = 'warming';
            else status = 'cold';

            return { target: t, lastEmail, daysSinceContact, emailCount: tps.length, status, pendingFollowUp };
          }).sort((a, b) => {
            const order = { has_followup: 0, cold: 1, never_contacted: 2, warming: 3, recent: 4 };
            return (order[a.status] || 0) - (order[b.status] || 0);
          });

          const statusConfig = {
            never_contacted: { label: 'Never Contacted', color: 'var(--muted)', bg: 'var(--background)' },
            recent: { label: 'Recently Contacted', color: 'var(--success)', bg: 'rgba(16,185,129,0.05)' },
            warming: { label: 'Needs Follow-up', color: 'var(--warning)', bg: 'rgba(245,158,11,0.05)' },
            cold: { label: 'Gone Cold', color: 'var(--danger)', bg: 'rgba(239,68,68,0.05)' },
            has_followup: { label: 'Overdue Follow-up', color: 'var(--danger)', bg: 'rgba(239,68,68,0.08)' },
          };

          // Summary counts
          const counts = targetOutreach.reduce((acc, to) => {
            acc[to.status] = (acc[to.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return (
            <div className="space-y-3">
              {/* Summary chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(counts).map(([status, count]) => {
                  const cfg = statusConfig[status as keyof typeof statusConfig];
                  return (
                    <span key={status} className="badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}20` }}>
                      {count} {cfg.label}
                    </span>
                  );
                })}
              </div>

              {/* Target list */}
              <div className="space-y-1">
                {targetOutreach.slice(0, 12).map(({ target: t, lastEmail, daysSinceContact, emailCount, status }) => {
                  const cfg = statusConfig[status];
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-2 rounded text-xs" style={{ background: cfg.bg }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                      <span className="font-medium w-32 truncate">{t.name}</span>
                      <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: '0.6rem' }}>
                        {cfg.label}
                      </span>
                      <span className="flex-1" />
                      {emailCount > 0 && (
                        <span style={{ color: 'var(--muted)' }}>{emailCount} email{emailCount > 1 ? 's' : ''}</span>
                      )}
                      {daysSinceContact !== null && (
                        <span className="font-mono" style={{ color: cfg.color }}>{daysSinceContact}d ago</span>
                      )}
                      {!lastEmail && (
                        <button
                          onClick={() => { setSelectedTarget(t.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.6rem', color: 'var(--accent)' }}
                        >
                          Draft Email
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
