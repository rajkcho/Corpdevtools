'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Edit2, Trash2, Plus, Phone, Mail, Video,
  MessageSquare, Calendar, Upload, FileText, Link2,
  Users, ExternalLink, MapPin, Building2, ChevronDown, ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import {
  getTarget, updateTarget, deleteTarget,
  getTouchpoints, createTouchpoint, deleteTouchpoint,
  getMeetingNotes, createMeetingNote, deleteMeetingNote,
  getContacts, createContact, deleteContact,
  getDDProjectByTarget, createDDProject, populateDDTemplates,
} from '@/lib/db';
import { DEAL_STAGES, SCORE_CRITERIA } from '@/lib/types';
import type { Target, Touchpoint, MeetingNote, Contact, DealScore } from '@/lib/types';
import Modal from '@/components/Modal';
import TargetForm from '@/components/TargetForm';

const TOUCHPOINT_ICONS: Record<string, React.ReactNode> = {
  email: <Mail size={14} />,
  call: <Phone size={14} />,
  meeting: <Video size={14} />,
  note: <MessageSquare size={14} />,
  linkedin: <Link2 size={14} />,
  conference: <Users size={14} />,
  other: <Calendar size={14} />,
};

export default function TargetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [target, setTarget] = useState<Target | null>(null);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTouchpointModal, setShowTouchpointModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'contacts' | 'scoring'>('timeline');
  const [ddProjectId, setDDProjectId] = useState<string | null>(null);

  const reload = useCallback(() => {
    const t = getTarget(id);
    if (!t) { router.push('/targets'); return; }
    setTarget(t);
    setTouchpoints(getTouchpoints(id));
    setMeetingNotes(getMeetingNotes(id));
    setContacts(getContacts(id));
    const dd = getDDProjectByTarget(id);
    setDDProjectId(dd?.id || null);
  }, [id, router]);

  useEffect(() => { reload(); }, [reload]);

  if (!target) return null;

  const stageInfo = DEAL_STAGES.find(s => s.key === target.stage);

  const handleDelete = () => {
    if (confirm('Delete this target and all related data?')) {
      deleteTarget(id);
      router.push('/targets');
    }
  };

  const handleStartDD = () => {
    const project = createDDProject({ target_id: id, target_name: target.name });
    populateDDTemplates(project.id);
    router.push(`/diligence/${project.id}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/targets" className="btn btn-ghost p-2 mt-1">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{target.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="badge" style={{ background: `${stageInfo?.color}20`, color: stageInfo?.color }}>
                {stageInfo?.label}
              </span>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                <Building2 size={14} className="inline mr-1" />{target.vertical}
              </span>
              {target.geography && (
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  <MapPin size={14} className="inline mr-1" />{target.geography}
                </span>
              )}
              {target.website && (
                <a href={target.website} target="_blank" rel="noopener noreferrer" className="text-sm inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                  <ExternalLink size={14} />Website
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!ddProjectId && target.stage !== 'identified' && target.stage !== 'closed_lost' && (
            <button onClick={handleStartDD} className="btn btn-secondary btn-sm">
              Start Due Diligence
            </button>
          )}
          {ddProjectId && (
            <Link href={`/diligence/${ddProjectId}`} className="btn btn-secondary btn-sm">
              View DD Project
            </Link>
          )}
          <button onClick={() => setShowEditModal(true)} className="btn btn-secondary btn-sm">
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={handleDelete} className="btn btn-danger btn-sm">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard label="Revenue" value={target.revenue ? `$${(target.revenue / 1000000).toFixed(1)}M` : '-'} />
        <MetricCard label="ARR" value={target.arr ? `$${(target.arr / 1000000).toFixed(1)}M` : '-'} />
        <MetricCard label="Recurring %" value={target.recurring_revenue_pct ? `${target.recurring_revenue_pct}%` : '-'} />
        <MetricCard label="Gross Margin" value={target.gross_margin_pct ? `${target.gross_margin_pct}%` : '-'} />
        <MetricCard label="EBITA Margin" value={target.ebita_margin_pct ? `${target.ebita_margin_pct}%` : '-'} />
        <MetricCard label="Score" value={target.weighted_score?.toFixed(1) || '-'} highlight />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--card)' }}>
        {(['timeline', 'notes', 'contacts', 'scoring'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors"
            style={{
              background: activeTab === tab ? 'var(--accent)' : 'transparent',
              color: activeTab === tab ? 'white' : 'var(--muted-foreground)',
            }}
          >
            {tab === 'notes' ? 'Meeting Notes' : tab}
          </button>
        ))}
      </div>

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Relationship Timeline</h2>
            <button onClick={() => setShowTouchpointModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> Log Touchpoint
            </button>
          </div>
          {touchpoints.length === 0 ? (
            <div className="glass-card p-8 text-center" style={{ color: 'var(--muted)' }}>
              No touchpoints logged yet. Start tracking your relationship with this target.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2.5 top-2 bottom-2 w-px" style={{ background: 'var(--border)' }} />
              {touchpoints.map(tp => (
                <div key={tp.id} className="relative">
                  <div className="absolute -left-6 top-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--card)', border: '2px solid var(--border)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                  </div>
                  <div className="glass-card p-4 ml-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 badge capitalize" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                          {TOUCHPOINT_ICONS[tp.type]}{tp.type}
                        </span>
                        <span className="text-sm font-medium">{tp.subject}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>
                          {new Date(tp.date).toLocaleDateString()}
                        </span>
                        <button onClick={() => { deleteTouchpoint(tp.id); reload(); }} className="btn-ghost p-1 rounded">
                          <Trash2 size={12} style={{ color: 'var(--muted)' }} />
                        </button>
                      </div>
                    </div>
                    {tp.summary && <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>{tp.summary}</p>}
                    {tp.participants && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Participants: {tp.participants}</p>}
                    {tp.follow_up_date && (
                      <div className="text-xs mt-2 p-2 rounded" style={{ background: 'var(--background)', color: 'var(--warning)' }}>
                        Follow-up: {new Date(tp.follow_up_date).toLocaleDateString()}
                        {tp.follow_up_notes && ` — ${tp.follow_up_notes}`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meeting Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Meeting Notes</h2>
            <button onClick={() => setShowUploadModal(true)} className="btn btn-primary btn-sm">
              <Upload size={14} /> Upload Notes
            </button>
          </div>
          {meetingNotes.length === 0 ? (
            <div className="glass-card p-8 text-center" style={{ color: 'var(--muted)' }}>
              No meeting notes uploaded yet. Upload notes from meetings to track key insights.
            </div>
          ) : (
            <div className="space-y-3">
              {meetingNotes.map(note => (
                <MeetingNoteCard key={note.id} note={note} onDelete={() => { deleteMeetingNote(note.id); reload(); }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Key Contacts</h2>
            <button onClick={() => setShowContactModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> Add Contact
            </button>
          </div>
          {target.founder_name && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{target.founder_name}</div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Founder / CEO</div>
                </div>
                <div className="flex gap-2">
                  {target.founder_email && (
                    <a href={`mailto:${target.founder_email}`} className="btn btn-ghost btn-sm"><Mail size={14} /></a>
                  )}
                  {target.founder_phone && (
                    <a href={`tel:${target.founder_phone}`} className="btn btn-ghost btn-sm"><Phone size={14} /></a>
                  )}
                </div>
              </div>
            </div>
          )}
          {contacts.map(c => (
            <div key={c.id} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name} {c.is_primary && <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>Primary</span>}</div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.title}</div>
                </div>
                <div className="flex gap-2">
                  {c.email && <a href={`mailto:${c.email}`} className="btn btn-ghost btn-sm"><Mail size={14} /></a>}
                  {c.phone && <a href={`tel:${c.phone}`} className="btn btn-ghost btn-sm"><Phone size={14} /></a>}
                  {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><Link2 size={14} /></a>}
                  <button onClick={() => { deleteContact(c.id); reload(); }} className="btn btn-ghost btn-sm"><Trash2 size={14} style={{ color: 'var(--danger)' }} /></button>
                </div>
              </div>
              {c.notes && <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>{c.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Scoring Tab */}
      {activeTab === 'scoring' && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4">Harris Acquisition Scorecard</h2>
          <div className="grid gap-4">
            {SCORE_CRITERIA.map(c => {
              const val = target.score?.[c.key] || 0;
              return (
                <div key={c.key} className="flex items-center gap-4">
                  <div className="w-48">
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Weight: {c.weight}x</div>
                  </div>
                  <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(val / 5) * 100}%`,
                        background: val >= 4 ? 'var(--success)' : val >= 3 ? 'var(--warning)' : 'var(--danger)',
                      }}
                    />
                  </div>
                  <span className="text-sm font-mono w-8 text-right font-bold" style={{
                    color: val >= 4 ? 'var(--success)' : val >= 3 ? 'var(--warning)' : 'var(--danger)',
                  }}>
                    {val}/5
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="font-semibold">Weighted Score</span>
              <span className="text-2xl font-bold font-mono" style={{
                color: (target.weighted_score || 0) >= 4 ? 'var(--success)' : (target.weighted_score || 0) >= 3 ? 'var(--warning)' : 'var(--danger)',
              }}>
                {target.weighted_score?.toFixed(1) || '-'} / 5.0
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Target" width="max-w-2xl">
        <TargetForm
          initial={target}
          onSubmit={(data) => { updateTarget(id, data); reload(); setShowEditModal(false); }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* Touchpoint Modal */}
      <Modal open={showTouchpointModal} onClose={() => setShowTouchpointModal(false)} title="Log Touchpoint">
        <TouchpointForm
          onSubmit={(data) => { createTouchpoint({ ...data, target_id: id }); reload(); setShowTouchpointModal(false); }}
          onCancel={() => setShowTouchpointModal(false)}
        />
      </Modal>

      {/* Contact Modal */}
      <Modal open={showContactModal} onClose={() => setShowContactModal(false)} title="Add Contact">
        <ContactForm
          onSubmit={(data) => { createContact({ ...data, target_id: id }); reload(); setShowContactModal(false); }}
          onCancel={() => setShowContactModal(false)}
        />
      </Modal>

      {/* Upload Modal */}
      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Meeting Notes">
        <MeetingNoteUpload
          targetId={id}
          onDone={() => { reload(); setShowUploadModal(false); }}
          onCancel={() => setShowUploadModal(false)}
        />
      </Modal>
    </div>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass-card p-3 text-center">
      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
      <div className={`font-bold font-mono ${highlight ? 'text-lg' : ''}`} style={highlight ? { color: 'var(--accent)' } : {}}>
        {value}
      </div>
    </div>
  );
}

function TouchpointForm({ onSubmit, onCancel }: { onSubmit: (data: Partial<Touchpoint>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    type: 'meeting' as Touchpoint['type'],
    date: new Date().toISOString().split('T')[0],
    subject: '',
    summary: '',
    participants: '',
    follow_up_date: '',
    follow_up_notes: '',
  });

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Type</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Touchpoint['type'] }))} className="w-full">
            <option value="email">Email</option>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="linkedin">LinkedIn</option>
            <option value="conference">Conference</option>
            <option value="note">Note</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Date</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Subject</label>
        <input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full" placeholder="e.g. Intro call with CEO" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Summary</label>
        <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={4} className="w-full" placeholder="Key takeaways from the interaction..." />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Participants</label>
        <input value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))} className="w-full" placeholder="e.g. John Smith (CEO), Jane Doe (CFO)" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Follow-up Date</label>
          <input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Follow-up Notes</label>
          <input value={form.follow_up_notes} onChange={e => setForm(f => ({ ...f, follow_up_notes: e.target.value }))} className="w-full" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" className="btn btn-primary">Log Touchpoint</button>
      </div>
    </form>
  );
}

function ContactForm({ onSubmit, onCancel }: { onSubmit: (data: Partial<Contact>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', title: '', email: '', phone: '', linkedin: '', is_primary: false, notes: '' });

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Name *</label>
        <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Title</label>
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full" placeholder="e.g. VP of Sales" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>LinkedIn URL</label>
        <input value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} className="w-full" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_primary} onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))} />
        Primary contact
      </label>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full" />
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" className="btn btn-primary">Add Contact</button>
      </div>
    </form>
  );
}

function MeetingNoteUpload({ targetId, onDone, onCancel }: { targetId: string; onDone: () => void; onCancel: () => void }) {
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawText(text);
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    createMeetingNote({
      target_id: targetId,
      file_name: fileName || 'Manual Entry',
      file_type: 'text',
      file_url: '',
      raw_text: rawText,
    });

    // Also create a touchpoint for the meeting
    createTouchpoint({
      target_id: targetId,
      type: 'meeting',
      date: new Date().toISOString(),
      subject: `Meeting notes: ${fileName || 'Manual entry'}`,
      summary: rawText.substring(0, 500),
    });

    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
          Upload a text file or paste notes directly
        </label>
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {fileName || 'Click to upload .txt, .md, or .doc files'}
          </p>
          <input
            id="file-upload"
            type="file"
            accept=".txt,.md,.doc,.docx,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
          Or paste meeting notes directly
        </label>
        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          rows={10}
          className="w-full font-mono text-sm"
          placeholder="Paste your meeting notes here...&#10;&#10;Attendees: ...&#10;Date: ...&#10;&#10;Key Discussion Points:&#10;- ...&#10;&#10;Action Items:&#10;- ..."
        />
      </div>
      <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
        AI summarization placeholder: When you connect an AI provider (OpenRouter, etc.), uploaded notes will be automatically summarized with extracted action items, key insights, and deal signals.
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" disabled={!rawText.trim()} className="btn btn-primary">
          {uploading ? 'Saving...' : 'Save Notes'}
        </button>
      </div>
    </form>
  );
}

function MeetingNoteCard({ note, onDelete }: { note: MeetingNote; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} style={{ color: 'var(--accent)' }} />
          <span className="font-medium text-sm">{note.file_name}</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {new Date(note.uploaded_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setExpanded(!expanded)} className="btn btn-ghost btn-sm">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onDelete} className="btn btn-ghost btn-sm">
            <Trash2 size={14} style={{ color: 'var(--danger)' }} />
          </button>
        </div>
      </div>

      {note.ai_summary && (
        <div className="mt-2 p-2 rounded text-sm" style={{ background: 'var(--accent-muted)' }}>
          <strong className="text-xs" style={{ color: 'var(--accent)' }}>AI Summary:</strong>
          <p className="mt-1" style={{ color: 'var(--foreground)' }}>{note.ai_summary}</p>
        </div>
      )}

      {note.ai_action_items && note.ai_action_items.length > 0 && (
        <div className="mt-2">
          <strong className="text-xs" style={{ color: 'var(--warning)' }}>Action Items:</strong>
          <ul className="mt-1 space-y-1">
            {note.ai_action_items.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <input type="checkbox" checked={item.completed} readOnly className="mt-0.5" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expanded && note.raw_text && (
        <pre className="mt-3 p-3 rounded text-xs whitespace-pre-wrap font-mono overflow-auto" style={{ background: 'var(--background)', color: 'var(--muted-foreground)', maxHeight: 400 }}>
          {note.raw_text}
        </pre>
      )}
    </div>
  );
}
