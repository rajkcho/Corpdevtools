'use client';

import { useEffect, useState } from 'react';
import { getTargets, getContacts } from '@/lib/db';
import type { Target, Contact } from '@/lib/types';
import { Mail, Copy, Check, ChevronDown, Edit2 } from 'lucide-react';

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

  useEffect(() => {
    setTargets(getTargets());
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

  const template = TEMPLATES.find(t => t.id === selectedTemplate)!;
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
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Template</h3>
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
          <div className="flex gap-3">
            <button onClick={handleOpenMailClient} className="btn btn-primary">
              <Mail size={14} /> Open in Mail Client
            </button>
            <button onClick={() => handleCopy('body')} className="btn btn-secondary">
              <Copy size={14} /> Copy Full Email
            </button>
            {isEditing && (
              <button onClick={() => setIsEditing(false)} className="btn btn-ghost">
                Reset to Template
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
