'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Edit2, Trash2, Plus, Phone, Mail, Video,
  MessageSquare, Calendar, Upload, FileText, Link2,
  Users, ExternalLink, MapPin, Building2, ChevronDown, ChevronUp,
  Download, Import, Printer, FileOutput, Flag, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import {
  getTarget, getTargets, updateTarget, deleteTarget, getStageHistory,
  getTouchpoints, createTouchpoint, deleteTouchpoint,
  getMeetingNotes, createMeetingNote, updateMeetingNote, deleteMeetingNote,
  getContacts, createContact, updateContact, deleteContact,
  getDDProjectByTarget, createDDProject, populateDDTemplates,
  getDealTerms, createDealTerm, updateDealTerm, deleteDealTerm,
  getActivitiesForTarget, logActivity,
  exportContactsCSV, importContactsFromCSV,
  getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry,
} from '@/lib/db';
import { DEAL_STAGES, SCORE_CRITERIA } from '@/lib/types';
import type { Target, Touchpoint, MeetingNote, Contact, DealScore, DealTerm, ActivityEntry, JournalEntry } from '@/lib/types';
import Modal from '@/components/Modal';
import TargetForm from '@/components/TargetForm';
import RadarChart from '@/components/RadarChart';

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
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'contacts' | 'journal' | 'dealroom' | 'scoring'>('timeline');
  const [ddProjectId, setDDProjectId] = useState<string | null>(null);
  const [dealTerms, setDealTerms] = useState<DealTerm[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  const reload = useCallback(() => {
    const t = getTarget(id);
    if (!t) { router.push('/targets'); return; }
    setTarget(t);
    setTouchpoints(getTouchpoints(id));
    setMeetingNotes(getMeetingNotes(id));
    setContacts(getContacts(id));
    const dd = getDDProjectByTarget(id);
    setDDProjectId(dd?.id || null);
    setDealTerms(getDealTerms(id));
    setActivities(getActivitiesForTarget(id));
    setJournal(getJournalEntries(id));
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
            {target.tags && target.tags.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {target.tags.map(tag => (
                  <span key={tag} className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
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
          <button
            onClick={async () => {
              const { generateTargetOnePager } = await import('@/lib/target-export');
              const html = generateTargetOnePager(id);
              const w = window.open('', '_blank');
              if (w) { w.document.write(html); w.document.close(); }
            }}
            className="btn btn-secondary btn-sm"
            title="Print one-pager"
          >
            <Printer size={14} />
          </button>
          <button
            onClick={async () => {
              const { generateDealMemo } = await import('@/lib/deal-memo');
              const memo = generateDealMemo(id);
              const blob = new Blob([memo], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `deal-memo-${target.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn btn-secondary btn-sm"
            title="Export deal memo"
          >
            <FileOutput size={14} />
          </button>
          <button onClick={() => setShowEditModal(true)} className="btn btn-secondary btn-sm">
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={handleDelete} className="btn btn-danger btn-sm">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Pipeline Stage</span>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
              {Math.floor((Date.now() - new Date(target.stage_entered_at).getTime()) / 86400000)}d in stage
            </span>
          </div>
          <select
            value={target.stage}
            onChange={e => {
              updateTarget(id, { stage: e.target.value as Target['stage'] });
              reload();
            }}
            className="text-xs"
          >
            {DEAL_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          {DEAL_STAGES.map((s, i) => {
            const stageIdx = DEAL_STAGES.findIndex(st => st.key === target.stage);
            const isPast = i < stageIdx;
            const isCurrent = i === stageIdx;
            return (
              <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full h-2 rounded-full transition-all"
                  style={{
                    background: isPast ? s.color : isCurrent ? s.color : 'var(--border)',
                    opacity: isPast ? 0.6 : isCurrent ? 1 : 0.3,
                  }}
                />
                <span className="text-[9px] truncate w-full text-center" style={{
                  color: isCurrent ? s.color : 'var(--muted)',
                  fontWeight: isCurrent ? 600 : 400,
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard label="Revenue" value={target.revenue ? `$${(target.revenue / 1000000).toFixed(1)}M` : '-'} />
        <MetricCard label="ARR" value={target.arr ? `$${(target.arr / 1000000).toFixed(1)}M` : '-'} />
        <MetricCard label="Recurring %" value={target.recurring_revenue_pct ? `${target.recurring_revenue_pct}%` : '-'} />
        <MetricCard label="Gross Margin" value={target.gross_margin_pct ? `${target.gross_margin_pct}%` : '-'} />
        <MetricCard label="EBITA Margin" value={target.ebita_margin_pct ? `${target.ebita_margin_pct}%` : '-'} />
        <MetricCard label="Customers" value={target.customer_count?.toLocaleString() || '-'} />
        <MetricCard label="YoY Growth" value={target.yoy_growth_pct ? `${target.yoy_growth_pct}%` : '-'} />
        <MetricCard label="Score" value={target.weighted_score?.toFixed(1) || '-'} highlight />
        {/* Financial Health Indicator */}
        {(() => {
          let score = 0;
          let count = 0;
          if (target.recurring_revenue_pct) { score += target.recurring_revenue_pct >= 80 ? 3 : target.recurring_revenue_pct >= 60 ? 2 : 1; count++; }
          if (target.gross_margin_pct) { score += target.gross_margin_pct >= 70 ? 3 : target.gross_margin_pct >= 50 ? 2 : 1; count++; }
          if (target.ebita_margin_pct) { score += target.ebita_margin_pct >= 20 ? 3 : target.ebita_margin_pct >= 10 ? 2 : 1; count++; }
          if (target.yoy_growth_pct) { score += target.yoy_growth_pct >= 15 ? 3 : target.yoy_growth_pct >= 5 ? 2 : 1; count++; }
          if (count === 0) return null;
          const avg = score / count;
          const color = avg >= 2.5 ? 'var(--success)' : avg >= 1.5 ? 'var(--warning)' : 'var(--danger)';
          const label = avg >= 2.5 ? 'Strong' : avg >= 1.5 ? 'Fair' : 'Weak';
          return (
            <div className="glass-card p-3 text-center">
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Health</div>
              <div className="font-bold" style={{ color }}>{label}</div>
            </div>
          );
        })()}
      </div>

      {/* Implied Multiples (shown when asking price exists) */}
      {target.asking_price && (target.revenue || target.arr || target.ebita) && (
        <div className="glass-card p-4">
          <div className="text-xs font-medium mb-3" style={{ color: 'var(--muted-foreground)' }}>
            Implied Multiples (Asking: ${(target.asking_price / 1000000).toFixed(1)}M)
          </div>
          <div className="flex items-center gap-6">
            {target.revenue && (
              <div className="text-center">
                <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>
                  {(target.asking_price / target.revenue).toFixed(1)}x
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>EV/Revenue</div>
              </div>
            )}
            {target.arr && (
              <div className="text-center">
                <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>
                  {(target.asking_price / target.arr).toFixed(1)}x
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>EV/ARR</div>
              </div>
            )}
            {target.ebita && target.ebita > 0 && (
              <div className="text-center">
                <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>
                  {(target.asking_price / target.ebita).toFixed(1)}x
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>EV/EBITA</div>
              </div>
            )}
            {target.revenue && target.employee_count && target.employee_count > 0 && (
              <div className="text-center">
                <div className="text-lg font-bold font-mono" style={{ color: 'var(--muted-foreground)' }}>
                  ${Math.round(target.revenue / target.employee_count / 1000)}K
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>Rev/Employee</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deal Timeline Summary */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Deal Timeline</span>
          <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
            {Math.floor((Date.now() - new Date(target.created_at).getTime()) / 86400000)}d since identified
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {(() => {
            const stageTransitions = activities
              .filter(a => a.type === 'stage_changed')
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const timelineEvents = [
              { label: 'Created', date: target.created_at, color: 'var(--accent)' },
              ...stageTransitions.map(t => ({
                label: t.metadata?.to || 'Stage change',
                date: t.created_at,
                color: DEAL_STAGES.find(s => s.key === t.metadata?.to)?.color || 'var(--muted)',
              })),
            ];
            if (target.first_contact_date) {
              timelineEvents.push({ label: 'First Contact', date: target.first_contact_date, color: 'var(--success)' });
            }
            timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return (
              <div className="w-full overflow-x-auto">
                <div className="flex items-center gap-0 min-w-fit">
                  {timelineEvents.map((event, i) => (
                    <div key={i} className="flex items-center">
                      <div className="flex flex-col items-center" style={{ minWidth: 70 }}>
                        <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: event.color, background: i === timelineEvents.length - 1 ? event.color : 'var(--card)' }} />
                        <div className="font-medium mt-1 text-center truncate w-full" style={{ color: event.color, fontSize: '0.6rem' }}>
                          {event.label}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.55rem' }}>
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      {i < timelineEvents.length - 1 && (
                        <div className="h-0.5 flex-1" style={{ background: 'var(--border)', minWidth: 20 }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Description & Notes */}
      {(target.description || target.notes) && (
        <div className="glass-card p-4">
          {target.description && (
            <div className="text-sm mb-2">{target.description}</div>
          )}
          {target.notes && (
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              <span className="font-medium">Notes:</span> {target.notes}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--card)' }}>
        {([
          { key: 'timeline', label: 'Timeline' },
          { key: 'notes', label: 'Meeting Notes' },
          { key: 'contacts', label: 'Contacts' },
          { key: 'journal', label: 'Journal' },
          { key: 'dealroom', label: 'Deal Room' },
          { key: 'scoring', label: 'Scoring' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors"
            style={{
              background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--muted-foreground)',
            }}
          >
            {tab.label}
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
                    {tp.follow_up_date && (() => {
                      const isOverdue = new Date(tp.follow_up_date).getTime() < Date.now();
                      const daysUntil = Math.floor((new Date(tp.follow_up_date).getTime() - Date.now()) / 86400000);
                      return (
                        <div className="text-xs mt-2 p-2 rounded flex items-center gap-2" style={{
                          background: isOverdue ? 'rgba(239,68,68,0.1)' : 'var(--background)',
                          color: isOverdue ? 'var(--danger)' : 'var(--warning)',
                        }}>
                          <Calendar size={12} />
                          <span className="font-medium">
                            {isOverdue ? `Overdue by ${Math.abs(daysUntil)}d` : daysUntil === 0 ? 'Due today' : `Due in ${daysUntil}d`}
                          </span>
                          <span style={{ color: 'var(--muted-foreground)' }}>
                            {new Date(tp.follow_up_date).toLocaleDateString()}
                            {tp.follow_up_notes && ` — ${tp.follow_up_notes}`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stage Progression History */}
          {(() => {
            const history = getStageHistory(id);
            if (history.length === 0) return null;
            return (
              <div className="glass-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>
                  Stage Progression
                </h3>
                <div className="space-y-2">
                  {history.map((h, i) => {
                    const fromStage = DEAL_STAGES.find(s => s.key === h.from_stage);
                    const toStage = DEAL_STAGES.find(s => s.key === h.to_stage);
                    const daysAgo = Math.floor((Date.now() - new Date(h.changed_at).getTime()) / 86400000);
                    const daysInPrevStage = i > 0
                      ? Math.floor((new Date(h.changed_at).getTime() - new Date(history[i - 1].changed_at).getTime()) / 86400000)
                      : Math.floor((new Date(h.changed_at).getTime() - new Date(target.created_at).getTime()) / 86400000);
                    return (
                      <div key={h.id} className="flex items-center gap-3 text-xs">
                        <span className="w-16 font-mono text-right flex-shrink-0" style={{ color: 'var(--muted)' }}>
                          {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="badge" style={{ background: `${fromStage?.color}20`, color: fromStage?.color }}>
                            {fromStage?.label}
                          </span>
                          <span style={{ color: 'var(--muted)' }}>→</span>
                          <span className="badge" style={{ background: `${toStage?.color}20`, color: toStage?.color }}>
                            {toStage?.label}
                          </span>
                        </div>
                        <span className="font-mono" style={{ color: 'var(--muted)' }}>
                          {daysInPrevStage}d in stage
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Deal Milestones */}
          <MilestoneTracker targetId={id} />
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
                <MeetingNoteCard key={note.id} note={note} onDelete={() => { deleteMeetingNote(note.id); reload(); }} onUpdate={reload} />
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
            <div className="flex gap-2">
              <label className="btn btn-secondary btn-sm cursor-pointer">
                <Upload size={14} /> Import CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const csv = ev.target?.result as string;
                      const count = importContactsFromCSV(csv, id);
                      alert(`Imported ${count} contacts`);
                      reload();
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>
              {contacts.length > 0 && (
                <button
                  onClick={() => {
                    const csv = exportContactsCSV();
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `contacts-${target.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={14} /> Export
                </button>
              )}
              <button onClick={() => setShowContactModal(true)} className="btn btn-primary btn-sm">
                <Plus size={14} /> Add Contact
              </button>
            </div>
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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    {c.is_primary && <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>Primary</span>}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.title}</div>
                  {c.email && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{c.email}</div>}
                </div>
                <div className="flex gap-1">
                  {c.email && <a href={`mailto:${c.email}`} className="btn btn-ghost btn-sm"><Mail size={14} /></a>}
                  {c.phone && <a href={`tel:${c.phone}`} className="btn btn-ghost btn-sm"><Phone size={14} /></a>}
                  {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><Link2 size={14} /></a>}
                  <button onClick={() => { deleteContact(c.id); reload(); }} className="btn btn-ghost btn-sm"><Trash2 size={14} style={{ color: 'var(--danger)' }} /></button>
                </div>
              </div>
              <div className="mt-2">
                <textarea
                  defaultValue={c.notes || ''}
                  onBlur={e => {
                    if (e.target.value !== (c.notes || '')) {
                      updateContact(c.id, { notes: e.target.value });
                      reload();
                    }
                  }}
                  placeholder="Add notes about this contact..."
                  className="w-full text-xs"
                  rows={2}
                  style={{ resize: 'none', background: 'var(--background)', padding: '0.375rem 0.5rem' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Journal Tab */}
      {activeTab === 'journal' && (
        <JournalPanel targetId={id} entries={journal} onReload={reload} />
      )}

      {/* Deal Room Tab */}
      {activeTab === 'dealroom' && (
        <DealRoomPanel
          targetId={id}
          terms={dealTerms}
          activities={activities}
          onReload={reload}
        />
      )}

      {/* Scoring Tab */}
      {activeTab === 'scoring' && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">VMS Acquisition Scorecard</h2>
              <button
                onClick={async () => {
                  try {
                    const { isAIConfigured, assessRisks } = await import('@/lib/ai');
                    if (!isAIConfigured()) {
                      alert('AI not configured. Go to Settings to add an API key.');
                      return;
                    }
                    const result = await assessRisks({
                      name: target.name,
                      vertical: target.vertical,
                      revenue: target.revenue,
                      arr: target.arr,
                      recurring_revenue_pct: target.recurring_revenue_pct,
                      customer_count: target.customer_count,
                      employee_count: target.employee_count,
                      description: target.description,
                    });
                    alert(`AI Risk Assessment:\n\n${result.overall_assessment}\n\n${result.risks.map(r => `• [${r.category}] ${r.title} (Impact: ${r.impact}, Prob: ${r.probability})`).join('\n')}`);
                  } catch (err) {
                    alert(`AI analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                  }
                }}
                className="btn btn-secondary btn-sm"
              >
                AI Risk Assessment
              </button>
            </div>

            {/* Radar Chart */}
            {target.score && (
              <div className="flex justify-center mb-6">
                <RadarChart score={target.score} size={280} />
              </div>
            )}

            <div className="grid gap-4">
              {SCORE_CRITERIA.map(c => {
                const val = target.score?.[c.key] || 0;
                return (
                  <div key={c.key} className="flex items-center gap-4">
                    <div className="w-48">
                      <div className="text-sm font-medium">{c.label}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>{c.description}</div>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          onClick={() => {
                            const newScore = { ...(target.score || {} as Record<string, number>), [c.key]: n };
                            updateTarget(id, { score: newScore as Target['score'] });
                            reload();
                          }}
                          className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                          style={{
                            background: n <= val ? (val >= 4 ? 'var(--success)' : val >= 3 ? 'var(--warning)' : 'var(--danger)') : 'var(--background)',
                            color: n <= val ? 'white' : 'var(--muted)',
                            border: n === val ? 'none' : '1px solid var(--border)',
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                      ×{c.weight}
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

          {/* Valuation Quick Calc */}
          {(target.revenue || target.arr || target.ebita) && (
            <div className="glass-card p-5">
              <h2 className="font-semibold mb-4">Valuation Sensitivity</h2>
              <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                Implied enterprise values at various multiples
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Metric</th>
                      <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Base</th>
                      {[2, 3, 4, 5, 6, 8].map(m => (
                        <th key={m} className="text-right py-2 px-3 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{m}x</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {target.revenue && (
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2 px-3 font-medium">Revenue</td>
                        <td className="py-2 px-3 font-mono">${(target.revenue / 1e6).toFixed(1)}M</td>
                        {[2, 3, 4, 5, 6, 8].map(m => {
                          const ev = target.revenue! * m;
                          const isAsk = target.asking_price && Math.abs(ev - target.asking_price) / target.asking_price < 0.1;
                          return (
                            <td key={m} className="py-2 px-3 text-right font-mono" style={{ color: isAsk ? 'var(--accent)' : undefined, fontWeight: isAsk ? 700 : undefined }}>
                              ${(ev / 1e6).toFixed(1)}M
                            </td>
                          );
                        })}
                      </tr>
                    )}
                    {target.arr && (
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2 px-3 font-medium">ARR</td>
                        <td className="py-2 px-3 font-mono">${(target.arr / 1e6).toFixed(1)}M</td>
                        {[2, 3, 4, 5, 6, 8].map(m => {
                          const ev = target.arr! * m;
                          const isAsk = target.asking_price && Math.abs(ev - target.asking_price) / target.asking_price < 0.1;
                          return (
                            <td key={m} className="py-2 px-3 text-right font-mono" style={{ color: isAsk ? 'var(--accent)' : undefined, fontWeight: isAsk ? 700 : undefined }}>
                              ${(ev / 1e6).toFixed(1)}M
                            </td>
                          );
                        })}
                      </tr>
                    )}
                    {target.ebita && target.ebita > 0 && (
                      <tr>
                        <td className="py-2 px-3 font-medium">EBITA</td>
                        <td className="py-2 px-3 font-mono">${(target.ebita / 1e6).toFixed(1)}M</td>
                        {[2, 3, 4, 5, 6, 8].map(m => {
                          const ev = target.ebita! * m;
                          const isAsk = target.asking_price && Math.abs(ev - target.asking_price) / target.asking_price < 0.1;
                          return (
                            <td key={m} className="py-2 px-3 text-right font-mono" style={{ color: isAsk ? 'var(--accent)' : undefined, fontWeight: isAsk ? 700 : undefined }}>
                              ${(ev / 1e6).toFixed(1)}M
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {target.asking_price && (
                <p className="text-xs mt-2" style={{ color: 'var(--accent)' }}>
                  Highlighted values are within 10% of asking price (${(target.asking_price / 1e6).toFixed(1)}M)
                </p>
              )}
            </div>
          )}
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
          existingContacts={getContacts()}
        />
      </Modal>

      {/* Upload Modal */}
      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Meeting Notes">
        <MeetingNoteUpload
          targetId={id}
          targetName={target.name}
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

function ContactForm({ onSubmit, onCancel, existingContacts = [] }: { onSubmit: (data: Partial<Contact>) => void; onCancel: () => void; existingContacts?: Contact[] }) {
  const [form, setForm] = useState({ name: '', title: '', email: '', phone: '', linkedin: '', is_primary: false, notes: '' });

  // Duplicate detection
  const duplicates = existingContacts.filter(c => {
    if (form.name.length < 2 && !form.email) return false;
    const nameSimilar = form.name.length >= 2 && c.name.toLowerCase().includes(form.name.toLowerCase());
    const emailMatch = form.email && c.email && c.email.toLowerCase() === form.email.toLowerCase();
    return nameSimilar || emailMatch;
  });

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Name *</label>
        <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full" />
      </div>
      {duplicates.length > 0 && (
        <div className="p-2 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
          <div className="font-medium mb-1">Possible duplicates found:</div>
          {duplicates.map(d => (
            <div key={d.id} className="flex items-center gap-2">
              <span>{d.name}</span>
              {d.title && <span style={{ color: 'var(--muted)' }}>({d.title})</span>}
              {d.email && <span style={{ color: 'var(--muted)' }}>{d.email}</span>}
            </div>
          ))}
        </div>
      )}
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

function MeetingNoteUpload({ targetId, targetName, onDone, onCancel }: { targetId: string; targetName: string; onDone: () => void; onCancel: () => void }) {
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAvailable, setAIAvailable] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import('@/lib/ai').then(mod => setAIAvailable(mod.isAIConfigured()));
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError(null);

    let aiSummary: string | undefined;
    let aiActionItems: { text: string; assignee?: string; due_date?: string; completed: boolean }[] | undefined;
    let aiKeyInsights: string[] | undefined;
    let aiDealSignals: { signal: string; sentiment: 'positive' | 'negative' | 'neutral'; detail?: string }[] | undefined;

    // Run AI analysis if available and enabled
    if (aiAvailable && useAI && rawText.trim()) {
      try {
        setAnalyzing(true);
        const { analyzeMeetingNotes } = await import('@/lib/ai');
        const analysis = await analyzeMeetingNotes(rawText, targetName);
        aiSummary = analysis.summary;
        aiActionItems = analysis.action_items.map(a => ({ ...a, completed: false }));
        aiKeyInsights = analysis.key_insights;
        aiDealSignals = analysis.deal_signals;

        // Auto-create contacts if mentioned
        if (analysis.mentioned_contacts?.length > 0) {
          const existingContacts = getContacts(targetId);
          for (const mc of analysis.mentioned_contacts) {
            const exists = existingContacts.some(c => c.name.toLowerCase() === mc.name.toLowerCase());
            if (!exists && mc.name) {
              createContact({ target_id: targetId, name: mc.name, title: mc.title, is_primary: false });
            }
          }
        }
      } catch (err) {
        setError(`AI analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}. Notes saved without AI analysis.`);
      } finally {
        setAnalyzing(false);
      }
    }

    createMeetingNote({
      target_id: targetId,
      file_name: fileName || 'Manual Entry',
      file_type: 'text',
      file_url: '',
      raw_text: rawText,
      ai_summary: aiSummary,
      ai_action_items: aiActionItems,
      ai_key_insights: aiKeyInsights,
      ai_deal_signals: aiDealSignals,
    });

    // Also create a touchpoint for the meeting
    createTouchpoint({
      target_id: targetId,
      type: 'meeting',
      date: new Date().toISOString(),
      subject: `Meeting notes: ${fileName || 'Manual entry'}`,
      summary: aiSummary || rawText.substring(0, 500),
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

      {/* AI Analysis Toggle */}
      {aiAvailable ? (
        <div className="p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={useAI} onChange={e => setUseAI(e.target.checked)} className="mt-0.5" />
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--success)' }}>AI Analysis Enabled</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                Meeting notes will be analyzed to extract: executive summary, action items, key insights,
                deal signals (positive/negative), and mentioned contacts.
              </div>
            </div>
          </label>
        </div>
      ) : (
        <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
          AI not configured. Go to Settings to connect an AI provider (OpenRouter, OpenAI, etc.) for automatic
          meeting note analysis with action items, deal signals, and insights extraction.
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" disabled={!rawText.trim() || uploading} className="btn btn-primary">
          {analyzing ? 'Analyzing with AI...' : uploading ? 'Saving...' : aiAvailable && useAI ? 'Save & Analyze' : 'Save Notes'}
        </button>
      </div>
    </form>
  );
}

// === JOURNAL PANEL ===
function JournalPanel({ targetId, entries, onReload }: { targetId: string; entries: JournalEntry[]; onReload: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  const handleAdd = () => {
    createJournalEntry({
      target_id: targetId,
      title: form.title,
      content: form.content,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setForm({ title: '', content: '', tags: '' });
    setShowAdd(false);
    onReload();
  };

  const handleUpdate = (id: string) => {
    updateJournalEntry(id, {
      title: form.title,
      content: form.content,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setEditingId(null);
    setForm({ title: '', content: '', tags: '' });
    onReload();
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setForm({ title: entry.title, content: entry.content, tags: entry.tags.join(', ') });
  };

  const TAG_COLORS = ['var(--accent)', 'var(--success)', 'var(--warning)', '#8b5cf6', '#ec4899', '#f97316'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Deal Journal</h2>
        <button onClick={() => { setShowAdd(true); setEditingId(null); setForm({ title: '', content: '', tags: '' }); }} className="btn btn-primary btn-sm">
          <Plus size={14} /> New Entry
        </button>
      </div>

      {(showAdd || editingId) && (
        <div className="glass-card p-4 space-y-3">
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Entry title..."
            className="w-full text-sm font-medium"
          />
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Write your thoughts, analysis, observations..."
            className="w-full text-sm"
            rows={8}
            style={{ lineHeight: 1.6 }}
          />
          <input
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            placeholder="Tags (comma-separated): valuation, risk, culture..."
            className="w-full text-sm"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="btn btn-secondary btn-sm">Cancel</button>
            {editingId ? (
              <button onClick={() => handleUpdate(editingId)} disabled={!form.title} className="btn btn-primary btn-sm">Save</button>
            ) : (
              <button onClick={handleAdd} disabled={!form.title} className="btn btn-primary btn-sm">Add Entry</button>
            )}
          </div>
        </div>
      )}

      {entries.length === 0 && !showAdd && (
        <div className="glass-card p-8 text-center" style={{ color: 'var(--muted)' }}>
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No journal entries yet.</p>
          <p className="text-xs mt-1">Use the journal to track your thinking, analysis notes, and observations about this deal.</p>
        </div>
      )}

      {entries.map(entry => (
        <div key={entry.id} className="glass-card p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {entry.pinned && <span style={{ color: 'var(--warning)', fontSize: '0.7rem' }}>PINNED</span>}
                <h3 className="font-medium text-sm">{entry.title}</h3>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {entry.updated_at !== entry.created_at && ' (edited)'}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => { updateJournalEntry(entry.id, { pinned: !entry.pinned }); onReload(); }}
                className="btn btn-ghost btn-sm"
                title={entry.pinned ? 'Unpin' : 'Pin'}
                style={{ color: entry.pinned ? 'var(--warning)' : 'var(--muted)' }}
              >
                ★
              </button>
              <button onClick={() => startEdit(entry)} className="btn btn-ghost btn-sm">
                <Edit2 size={12} />
              </button>
              <button onClick={() => { deleteJournalEntry(entry.id); onReload(); }} className="btn btn-ghost btn-sm">
                <Trash2 size={12} style={{ color: 'var(--danger)' }} />
              </button>
            </div>
          </div>
          <div className="mt-2 text-sm whitespace-pre-wrap" style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
            {entry.content}
          </div>
          {entry.tags.length > 0 && (
            <div className="flex gap-1 mt-3">
              {entry.tags.map((tag, i) => (
                <span key={tag} className="badge" style={{ background: `${TAG_COLORS[i % TAG_COLORS.length]}15`, color: TAG_COLORS[i % TAG_COLORS.length] }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// === DEAL ROOM PANEL ===
function DealRoomPanel({ targetId, terms, activities, onReload }: { targetId: string; terms: DealTerm[]; activities: ActivityEntry[]; onReload: () => void; }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: 'valuation' as DealTerm['category'], label: '', value: '', notes: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const categories = [
    { key: 'valuation' as const, label: 'Valuation', color: 'var(--success)' },
    { key: 'structure' as const, label: 'Deal Structure', color: 'var(--accent)' },
    { key: 'conditions' as const, label: 'Conditions', color: 'var(--warning)' },
    { key: 'timeline' as const, label: 'Timeline', color: '#8b5cf6' },
    { key: 'other' as const, label: 'Other Terms', color: 'var(--muted-foreground)' },
  ];

  const handleAdd = () => {
    createDealTerm({ target_id: targetId, ...form });
    setForm({ category: 'valuation', label: '', value: '', notes: '' });
    setShowAdd(false);
    onReload();
  };

  const handleInlineEdit = (id: string, newValue: string) => {
    updateDealTerm(id, { value: newValue });
    setEditingId(null);
    onReload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Deal Room</h2>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm">
          <Plus size={14} /> Add Term
        </button>
      </div>

      {/* Deal terms by category */}
      {categories.map(cat => {
        const catTerms = terms.filter(t => t.category === cat.key);
        if (catTerms.length === 0 && !showAdd) return null;
        return (
          <div key={cat.key} className="glass-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: cat.color }}>
              {cat.label}
            </h3>
            {catTerms.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>No terms added yet.</p>
            ) : (
              <div className="space-y-2">
                {catTerms.map(term => (
                  <div key={term.id} className="flex items-start gap-3 p-2 rounded" style={{ background: 'var(--background)' }}>
                    <div className="flex-1">
                      <div className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{term.label}</div>
                      {editingId === term.id ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => handleInlineEdit(term.id, editValue)}
                          onKeyDown={e => { if (e.key === 'Enter') handleInlineEdit(term.id, editValue); if (e.key === 'Escape') setEditingId(null); }}
                          className="w-full text-sm mt-0.5"
                          style={{ padding: '0.125rem 0.25rem' }}
                        />
                      ) : (
                        <div
                          className="text-sm font-medium cursor-pointer"
                          onClick={() => { setEditingId(term.id); setEditValue(term.value); }}
                          title="Click to edit"
                        >
                          {term.value}
                        </div>
                      )}
                      {term.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{term.notes}</p>}
                    </div>
                    <button onClick={() => { deleteDealTerm(term.id); onReload(); }} className="btn-ghost p-1 rounded flex-shrink-0">
                      <Trash2 size={12} style={{ color: 'var(--muted)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {terms.length === 0 && (
        <div className="glass-card p-8 text-center" style={{ color: 'var(--muted)' }}>
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No deal terms tracked yet.</p>
          <p className="text-xs mt-1">Add valuation, structure, conditions, and timeline terms to track deal progress.</p>
        </div>
      )}

      {/* Deal Thesis */}
      <DealThesis targetId={targetId} />

      {/* Competitor Tracking */}
      <CompetitorTracker targetId={targetId} />

      {/* Qualification Checklist */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
          Deal Qualification Checklist
        </h3>
        <QualificationChecklist targetId={targetId} />
      </div>

      {/* Related Targets */}
      <RelatedTargets targetId={targetId} onReload={onReload} />

      {/* Recent activity */}
      {activities.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>
            Recent Activity
          </h3>
          <div className="space-y-2">
            {activities.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                <span style={{ color: 'var(--muted-foreground)' }}>{a.description}</span>
                <span className="ml-auto" style={{ color: 'var(--muted)' }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add term modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold">Add Deal Term</h3>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as DealTerm['category'] }))} className="w-full text-sm">
                {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Label *</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="w-full" placeholder="e.g. Enterprise Value, Earnout %, Exclusivity Period" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Value *</label>
              <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="w-full" placeholder="e.g. $15M, 3x ARR, 60 days" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAdd} disabled={!form.label || !form.value} className="btn btn-primary">Add Term</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RelatedTargets({ targetId, onReload }: { targetId: string; onReload: () => void }) {
  const [allTargets, setAllTargets] = useState<Target[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkType, setLinkType] = useState<'parent' | 'related'>('related');

  useEffect(() => { setAllTargets(getTargets()); }, []);

  const current = allTargets.find(t => t.id === targetId);
  if (!current) return null;

  const parentTarget = current.parent_target_id ? allTargets.find(t => t.id === current.parent_target_id) : null;
  const childTargets = allTargets.filter(t => t.parent_target_id === targetId);
  const relatedTargets = (current.related_target_ids || []).map(rid => allTargets.find(t => t.id === rid)).filter(Boolean) as Target[];
  const hasRelationships = parentTarget || childTargets.length > 0 || relatedTargets.length > 0;

  const availableTargets = allTargets.filter(t => t.id !== targetId && t.id !== current.parent_target_id && !(current.related_target_ids || []).includes(t.id));

  const linkTarget = (otherId: string) => {
    if (linkType === 'parent') {
      updateTarget(targetId, { parent_target_id: otherId });
    } else {
      const existing = current.related_target_ids || [];
      updateTarget(targetId, { related_target_ids: [...existing, otherId] });
      // Bidirectional link
      const other = allTargets.find(t => t.id === otherId);
      if (other) {
        const otherRelated = other.related_target_ids || [];
        if (!otherRelated.includes(targetId)) {
          updateTarget(otherId, { related_target_ids: [...otherRelated, targetId] });
        }
      }
    }
    setShowLinkModal(false);
    onReload();
    setAllTargets(getTargets());
  };

  const unlinkParent = () => {
    updateTarget(targetId, { parent_target_id: undefined });
    onReload();
    setAllTargets(getTargets());
  };

  const unlinkRelated = (otherId: string) => {
    updateTarget(targetId, { related_target_ids: (current.related_target_ids || []).filter(r => r !== otherId) });
    const other = allTargets.find(t => t.id === otherId);
    if (other) {
      updateTarget(otherId, { related_target_ids: (other.related_target_ids || []).filter(r => r !== targetId) });
    }
    onReload();
    setAllTargets(getTargets());
  };

  const TargetLink = ({ t, label, onUnlink }: { t: Target; label: string; onUnlink?: () => void }) => (
    <div className="flex items-center gap-2 p-2 rounded" style={{ background: 'var(--background)' }}>
      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{label}</span>
      <Link href={`/targets/${t.id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--accent)' }}>{t.name}</Link>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>{t.vertical}</span>
      <span className="badge ml-auto" style={{
        background: `${DEAL_STAGES.find(s => s.key === t.stage)?.color}20`,
        color: DEAL_STAGES.find(s => s.key === t.stage)?.color,
      }}>
        {DEAL_STAGES.find(s => s.key === t.stage)?.label}
      </span>
      {onUnlink && (
        <button onClick={onUnlink} className="p-1 rounded" style={{ color: 'var(--muted)' }}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
          Related Targets
        </h3>
        <button onClick={() => setShowLinkModal(true)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.65rem' }}>
          <Plus size={12} /> Link Target
        </button>
      </div>

      {!hasRelationships && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>No related targets. Link parent companies, subsidiaries, or related opportunities.</p>
      )}

      <div className="space-y-1.5">
        {parentTarget && <TargetLink t={parentTarget} label="Parent" onUnlink={unlinkParent} />}
        {childTargets.map(c => <TargetLink key={c.id} t={c} label="Subsidiary" />)}
        {relatedTargets.map(r => <TargetLink key={r.id} t={r} label="Related" onUnlink={() => unlinkRelated(r.id)} />)}
      </div>

      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal-content max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold">Link Target</h3>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Relationship Type</label>
              <select value={linkType} onChange={e => setLinkType(e.target.value as 'parent' | 'related')} className="w-full text-sm">
                <option value="related">Related / Tuck-in</option>
                <option value="parent">Parent Company</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Select Target</label>
              <div className="max-h-48 overflow-y-auto space-y-1 p-1 rounded" style={{ background: 'var(--background)' }}>
                {availableTargets.length === 0 && <p className="text-xs p-2" style={{ color: 'var(--muted)' }}>No other targets available.</p>}
                {availableTargets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => linkTarget(t.id)}
                    className="w-full text-left p-2 rounded text-sm hover:bg-opacity-80 transition-colors flex items-center gap-2"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{t.vertical}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setShowLinkModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingNoteCard({ note, onDelete, onUpdate }: { note: MeetingNote; onDelete: () => void; onUpdate?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasAI = !!(note.ai_summary || note.ai_action_items?.length || note.ai_key_insights?.length || note.ai_deal_signals?.length);
  const sentimentColors: Record<string, string> = { positive: 'var(--success)', negative: 'var(--danger)', neutral: 'var(--muted-foreground)' };

  const toggleActionItem = (index: number) => {
    if (!note.ai_action_items) return;
    const updated = [...note.ai_action_items];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    updateMeetingNote(note.id, { ai_action_items: updated });
    onUpdate?.();
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} style={{ color: 'var(--accent)' }} />
          <span className="font-medium text-sm">{note.file_name}</span>
          {hasAI && (
            <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>AI Analyzed</span>
          )}
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
        <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: 'var(--accent-muted)' }}>
          <strong className="text-xs" style={{ color: 'var(--accent)' }}>AI Summary</strong>
          <p className="mt-1">{note.ai_summary}</p>
        </div>
      )}

      {note.ai_deal_signals && note.ai_deal_signals.length > 0 && (
        <div className="mt-3">
          <strong className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Deal Signals</strong>
          <div className="mt-1 space-y-1">
            {note.ai_deal_signals.map((signal, i) => (
              <div key={i} className="flex items-start gap-2 text-sm p-1.5 rounded" style={{ background: 'var(--background)' }}>
                <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: sentimentColors[signal.sentiment] }} />
                <div>
                  <span className="font-medium">{signal.signal}</span>
                  {signal.detail && <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>— {signal.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {note.ai_action_items && note.ai_action_items.length > 0 && (
        <div className="mt-3">
          <strong className="text-xs" style={{ color: 'var(--warning)' }}>Action Items</strong>
          <ul className="mt-1 space-y-1">
            {note.ai_action_items.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2 p-1.5 rounded cursor-pointer" style={{ background: 'var(--background)' }} onClick={() => toggleActionItem(i)}>
                <input type="checkbox" checked={item.completed} readOnly className="mt-0.5 pointer-events-none" />
                <span className="flex-1" style={{ textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1 }}>{item.text}</span>
                {item.assignee && <span className="text-xs" style={{ color: 'var(--muted)' }}>{item.assignee}</span>}
                {item.due_date && <span className="text-xs" style={{ color: 'var(--accent)' }}>{item.due_date}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {note.ai_key_insights && note.ai_key_insights.length > 0 && (
        <div className="mt-3">
          <strong className="text-xs" style={{ color: 'var(--accent)' }}>Key Insights</strong>
          <ul className="mt-1 space-y-1">
            {note.ai_key_insights.map((insight, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span style={{ color: 'var(--accent)' }}>•</span>
                <span>{insight}</span>
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

// === QUALIFICATION CHECKLIST ===
const QUALIFICATION_ITEMS = [
  { key: 'recurring_revenue', label: 'Recurring revenue > 70%', category: 'Financial' },
  { key: 'gross_margin', label: 'Gross margin > 65%', category: 'Financial' },
  { key: 'customer_diversification', label: 'No single customer > 15% revenue', category: 'Customer' },
  { key: 'customer_count', label: 'Minimum viable customer base (50+)', category: 'Customer' },
  { key: 'mission_critical', label: 'Product is mission-critical to customers', category: 'Product' },
  { key: 'switching_costs', label: 'High switching costs / sticky product', category: 'Product' },
  { key: 'founder_willing', label: 'Founder/owner willing to transact', category: 'Deal' },
  { key: 'valuation_reasonable', label: 'Valuation expectations reasonable', category: 'Deal' },
  { key: 'no_major_legal', label: 'No major legal/regulatory concerns', category: 'Risk' },
  { key: 'key_person_plan', label: 'Key person retention plan feasible', category: 'Risk' },
  { key: 'tech_sustainable', label: 'Technology sustainable (not obsolete)', category: 'Technology' },
  { key: 'market_position', label: 'Defensible market position in niche', category: 'Market' },
];

function QualificationChecklist({ targetId }: { targetId: string }) {
  const storageKey = `dealforge_qual_${targetId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) setChecked(JSON.parse(raw));
  }, [storageKey]);

  const toggle = (key: string) => {
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const totalChecked = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((totalChecked / QUALIFICATION_ITEMS.length) * 100);
  const categories = Array.from(new Set(QUALIFICATION_ITEMS.map(i => i.category)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono" style={{ color: totalChecked === QUALIFICATION_ITEMS.length ? 'var(--success)' : 'var(--muted-foreground)' }}>
          {totalChecked}/{QUALIFICATION_ITEMS.length} ({pct}%)
        </span>
        <div className="flex-1 mx-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)' }} />
        </div>
        <span className="text-xs" style={{ color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
          {pct >= 80 ? 'Strong' : pct >= 50 ? 'Moderate' : 'Weak'}
        </span>
      </div>
      {categories.map(cat => (
        <div key={cat}>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>{cat}</div>
          {QUALIFICATION_ITEMS.filter(i => i.category === cat).map(item => (
            <label key={item.key} className="flex items-center gap-2 py-1 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={!!checked[item.key]}
                onChange={() => toggle(item.key)}
                className="rounded"
              />
              <span style={{ color: checked[item.key] ? 'var(--success)' : 'var(--muted-foreground)', textDecoration: checked[item.key] ? 'line-through' : 'none' }}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

// === DEAL THESIS ===
function DealThesis({ targetId }: { targetId: string }) {
  const storageKey = `dealforge_thesis_${targetId}`;
  const [thesis, setThesis] = useState('');
  const [risks, setRisks] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      setThesis(data.thesis || '');
      setRisks(data.risks || '');
    }
  }, [storageKey]);

  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify({ thesis, risks }));
    setEditing(false);
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--success)' }}>
          Investment Thesis
        </h3>
        <button onClick={() => editing ? save() : setEditing(true)} className="btn btn-ghost btn-sm text-xs">
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Why should we acquire this company?</label>
            <textarea
              value={thesis}
              onChange={e => setThesis(e.target.value)}
              className="w-full text-sm"
              rows={4}
              placeholder="Describe the strategic rationale, market opportunity, and synergy potential..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Key risks & mitigants</label>
            <textarea
              value={risks}
              onChange={e => setRisks(e.target.value)}
              className="w-full text-sm"
              rows={3}
              placeholder="Customer concentration, technology debt, integration complexity..."
            />
          </div>
        </div>
      ) : (
        <div>
          {thesis ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Thesis</div>
                <p className="text-sm whitespace-pre-wrap">{thesis}</p>
              </div>
              {risks && (
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--warning)' }}>Key Risks</div>
                  <p className="text-sm whitespace-pre-wrap">{risks}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No investment thesis written yet. Click Edit to document your deal rationale.</p>
          )}
        </div>
      )}
    </div>
  );
}

// === COMPETITOR TRACKER ===
interface Competitor {
  id: string;
  name: string;
  type: 'direct' | 'indirect' | 'adjacent';
  notes: string;
  threat_level: 1 | 2 | 3;
}

function CompetitorTracker({ targetId }: { targetId: string }) {
  const storageKey = `dealforge_competitors_${targetId}`;
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'direct' as Competitor['type'], notes: '', threat_level: 2 as Competitor['threat_level'] });

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setCompetitors(JSON.parse(saved));
  }, [storageKey]);

  const save = (data: Competitor[]) => {
    setCompetitors(data);
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  const handleAdd = () => {
    save([...competitors, { ...form, id: crypto.randomUUID() }]);
    setForm({ name: '', type: 'direct', notes: '', threat_level: 2 });
    setShowAdd(false);
  };

  const handleDelete = (id: string) => save(competitors.filter(c => c.id !== id));

  const threatColors = { 1: 'var(--success)', 2: 'var(--warning)', 3: 'var(--danger)' };
  const threatLabels = { 1: 'Low', 2: 'Medium', 3: 'High' };
  const typeColors = { direct: 'var(--danger)', indirect: 'var(--warning)', adjacent: 'var(--accent)' };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
          Competitive Landscape
        </h3>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-ghost btn-sm text-xs">
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-lg mb-3 space-y-2" style={{ background: 'var(--background)' }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full text-sm" placeholder="Competitor name" />
          <div className="flex gap-2">
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Competitor['type'] }))} className="text-sm flex-1">
              <option value="direct">Direct</option>
              <option value="indirect">Indirect</option>
              <option value="adjacent">Adjacent</option>
            </select>
            <select value={form.threat_level} onChange={e => setForm(f => ({ ...f, threat_level: Number(e.target.value) as Competitor['threat_level'] }))} className="text-sm flex-1">
              <option value={1}>Low Threat</option>
              <option value={2}>Medium Threat</option>
              <option value={3}>High Threat</option>
            </select>
          </div>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full text-sm" rows={2} placeholder="Notes on competitive positioning..." />
          <button onClick={handleAdd} disabled={!form.name} className="btn btn-primary btn-sm">Add Competitor</button>
        </div>
      )}

      {competitors.length === 0 && !showAdd ? (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>No competitors tracked. Add known competitors to assess market positioning.</p>
      ) : (
        <div className="space-y-2">
          {competitors.map(c => (
            <div key={c.id} className="flex items-start gap-3 p-2 rounded" style={{ background: 'var(--background)' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="badge text-[9px]" style={{ background: `${typeColors[c.type]}20`, color: typeColors[c.type] }}>{c.type}</span>
                  <span className="badge text-[9px]" style={{ background: `${threatColors[c.threat_level]}20`, color: threatColors[c.threat_level] }}>
                    {threatLabels[c.threat_level]} threat
                  </span>
                </div>
                {c.notes && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{c.notes}</p>}
              </div>
              <button onClick={() => handleDelete(c.id)} className="btn-ghost p-1 rounded flex-shrink-0">
                <Trash2 size={12} style={{ color: 'var(--muted)' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// === MILESTONE TRACKER ===
const DEFAULT_MILESTONES = [
  { label: 'Initial Research Complete', category: 'research' },
  { label: 'First Contact Made', category: 'outreach' },
  { label: 'Management Meeting Scheduled', category: 'outreach' },
  { label: 'Management Meeting Complete', category: 'outreach' },
  { label: 'Financial Data Received', category: 'diligence' },
  { label: 'Valuation Model Complete', category: 'diligence' },
  { label: 'IC Memo Drafted', category: 'approval' },
  { label: 'IC Approval Obtained', category: 'approval' },
  { label: 'LOI Issued', category: 'deal' },
  { label: 'LOI Signed', category: 'deal' },
  { label: 'DD Kickoff', category: 'diligence' },
  { label: 'DD Complete', category: 'diligence' },
  { label: 'SPA Drafted', category: 'legal' },
  { label: 'SPA Executed', category: 'legal' },
  { label: 'Closing', category: 'deal' },
];

interface Milestone {
  id: string;
  label: string;
  category: string;
  completed: boolean;
  completed_at?: string;
  target_date?: string;
  notes?: string;
}

function MilestoneTracker({ targetId }: { targetId: string }) {
  const storageKey = `dealforge_milestones_${targetId}`;
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setMilestones(JSON.parse(saved));
    } else {
      const defaults: Milestone[] = DEFAULT_MILESTONES.map(m => ({
        id: crypto.randomUUID(),
        label: m.label,
        category: m.category,
        completed: false,
      }));
      setMilestones(defaults);
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    }
    setInitialized(true);
  }, [storageKey]);

  const save = (data: Milestone[]) => {
    setMilestones(data);
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  const toggle = (id: string) => {
    save(milestones.map(m =>
      m.id === id
        ? { ...m, completed: !m.completed, completed_at: !m.completed ? new Date().toISOString() : undefined }
        : m
    ));
  };

  const setTargetDate = (id: string, date: string) => {
    save(milestones.map(m => m.id === id ? { ...m, target_date: date || undefined } : m));
  };

  const addCustom = () => {
    if (!customLabel.trim()) return;
    save([...milestones, { id: crypto.randomUUID(), label: customLabel, category: 'custom', completed: false }]);
    setCustomLabel('');
    setShowAdd(false);
  };

  const removeMilestone = (id: string) => save(milestones.filter(m => m.id !== id));

  if (!initialized) return null;

  const completed = milestones.filter(m => m.completed).length;
  const total = milestones.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const categoryColors: Record<string, string> = {
    research: 'var(--accent)',
    outreach: '#06B6D4',
    diligence: 'var(--warning)',
    approval: '#8B5CF6',
    deal: 'var(--success)',
    legal: '#F97316',
    custom: 'var(--muted-foreground)',
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flag size={16} style={{ color: 'var(--accent)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
            Deal Milestones
          </h3>
          <span className="text-xs font-mono" style={{ color: pct === 100 ? 'var(--success)' : 'var(--muted)' }}>
            {completed}/{total} ({pct}%)
          </span>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-ghost btn-sm text-xs">
          {showAdd ? 'Cancel' : '+ Custom'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full mb-4" style={{ background: 'var(--background)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--accent)' }} />
      </div>

      {showAdd && (
        <div className="flex gap-2 mb-3">
          <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} className="flex-1 text-sm" placeholder="Custom milestone..." onKeyDown={e => e.key === 'Enter' && addCustom()} />
          <button onClick={addCustom} disabled={!customLabel.trim()} className="btn btn-primary btn-sm">Add</button>
        </div>
      )}

      <div className="space-y-1">
        {milestones.map(m => {
          const isOverdue = m.target_date && !m.completed && new Date(m.target_date).getTime() < Date.now();
          return (
            <div key={m.id} className="flex items-center gap-2 p-1.5 rounded group" style={{ background: m.completed ? 'rgba(16,185,129,0.05)' : 'transparent' }}>
              <button onClick={() => toggle(m.id)} className="flex-shrink-0">
                {m.completed
                  ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                  : <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />
                }
              </button>
              <span
                className="text-sm flex-1"
                style={{
                  textDecoration: m.completed ? 'line-through' : 'none',
                  opacity: m.completed ? 0.6 : 1,
                  color: isOverdue ? 'var(--danger)' : undefined,
                }}
              >
                {m.label}
              </span>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: categoryColors[m.category] || 'var(--muted)' }} />
              <input
                type="date"
                value={m.target_date || ''}
                onChange={e => setTargetDate(m.id, e.target.value)}
                className="text-[10px] w-28 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                style={{ padding: '0.125rem' }}
              />
              {m.completed_at && (
                <span className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
                  {new Date(m.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {m.category === 'custom' && (
                <button onClick={() => removeMilestone(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={10} style={{ color: 'var(--muted)' }} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        {Object.entries(categoryColors).filter(([k]) => milestones.some(m => m.category === k)).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[10px] capitalize" style={{ color: 'var(--muted)' }}>{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
