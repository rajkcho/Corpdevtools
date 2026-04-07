'use client';

import { useEffect, useState, useMemo } from 'react';
import { getContacts, getTargets, getTouchpoints, updateContact } from '@/lib/db';
import type { Contact, Target, Touchpoint } from '@/lib/types';
import { Users, Search, Mail, Phone, Building2, Star, ExternalLink, Edit2, Check, X, ChevronDown, Link2, Signal } from 'lucide-react';
import Link from 'next/link';
import { DEAL_STAGES } from '@/lib/types';

type ViewMode = 'table' | 'cards';
type SortField = 'name' | 'company' | 'stage' | 'lastContact' | 'title' | 'strength';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [view, setView] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('lastContact');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  const reload = () => {
    setContacts(getContacts());
    setTargets(getTargets());
    setTouchpoints(getTouchpoints());
  };

  useEffect(() => { reload(); }, []);

  const targetMap = useMemo(() => new Map(targets.map(t => [t.id, t])), [targets]);

  // Build touchpoint map per target
  const touchpointsByTarget = useMemo(() => {
    const map = new Map<string, Touchpoint[]>();
    for (const tp of touchpoints) {
      const existing = map.get(tp.target_id) || [];
      existing.push(tp);
      map.set(tp.target_id, existing);
    }
    return map;
  }, [touchpoints]);

  const getLastContactDate = (c: Contact): Date | null => {
    const tps = touchpointsByTarget.get(c.target_id) || [];
    if (tps.length === 0) return null;
    const sorted = tps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return new Date(sorted[0].date);
  };

  const getContactTouchpoints = (c: Contact): Touchpoint[] => {
    return (touchpointsByTarget.get(c.target_id) || [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  const getRelationshipStrength = (c: Contact): number => {
    let score = 0;

    // Touchpoint count: up to 30 points (1 tp = 3 pts, max at 10+)
    const tps = touchpointsByTarget.get(c.target_id) || [];
    score += Math.min(30, tps.length * 3);

    // Recency of last contact: up to 30 points
    const lastDate = getLastContactDate(c);
    if (lastDate) {
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 7) score += 30;
      else if (daysSince <= 14) score += 25;
      else if (daysSince <= 30) score += 20;
      else if (daysSince <= 60) score += 12;
      else if (daysSince <= 90) score += 6;
      // >90 days = 0
    }

    // Primary contact: 15 points
    if (c.is_primary) score += 15;

    // Contact info completeness: up to 15 points (5 each)
    if (c.email) score += 5;
    if (c.phone) score += 5;
    if (c.linkedin) score += 5;

    // Deal stage advancement: up to 10 points
    const target = targetMap.get(c.target_id);
    if (target) {
      const stageOrder = DEAL_STAGES.map(s => s.key);
      const idx = stageOrder.indexOf(target.stage);
      // 10 stages, scale index to 10 points
      score += Math.min(10, Math.round((idx / Math.max(stageOrder.length - 1, 1)) * 10));
    }

    return Math.min(100, score);
  };

  const getStrengthInfo = (score: number) => {
    if (score >= 80) return { label: 'Strong', color: 'var(--success)', bg: 'var(--success)' };
    if (score >= 50) return { label: 'Moderate', color: 'var(--warning)', bg: 'var(--warning)' };
    if (score >= 20) return { label: 'Weak', color: '#F97316', bg: '#F97316' };
    return { label: 'Cold', color: 'var(--danger)', bg: 'var(--danger)' };
  };

  const StrengthBadge = ({ contact }: { contact: Contact }) => {
    const score = getRelationshipStrength(contact);
    const info = getStrengthInfo(score);
    return (
      <div className="flex items-center gap-1.5" title={`Relationship Strength: ${score}/100 (${info.label})`}>
        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${score}%`, background: info.bg }}
          />
        </div>
        <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: info.color }}>
          {score}
        </span>
      </div>
    );
  };

  // Extract unique roles/titles
  const roles = useMemo(() =>
    Array.from(new Set(contacts.map(c => c.title).filter(Boolean))).sort(),
    [contacts]
  );

  const activeStages = useMemo(() =>
    Array.from(new Set(contacts.map(c => targetMap.get(c.target_id)?.stage).filter(Boolean))),
    [contacts, targetMap]
  );

  const filtered = useMemo(() => {
    return contacts
      .filter(c => {
        const target = targetMap.get(c.target_id);
        if (filterRole !== 'all' && c.title !== filterRole) return false;
        if (filterStage !== 'all' && target?.stage !== filterStage) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.notes?.toLowerCase().includes(q) ||
          target?.name.toLowerCase().includes(q) || false;
      })
      .sort((a, b) => {
        const targetA = targetMap.get(a.target_id);
        const targetB = targetMap.get(b.target_id);
        let cmp = 0;
        switch (sortField) {
          case 'name': cmp = a.name.localeCompare(b.name); break;
          case 'company': cmp = (targetA?.name || '').localeCompare(targetB?.name || ''); break;
          case 'title': cmp = (a.title || '').localeCompare(b.title || ''); break;
          case 'stage': {
            const stageOrder = DEAL_STAGES.map(s => s.key);
            cmp = stageOrder.indexOf(targetA?.stage || 'identified') - stageOrder.indexOf(targetB?.stage || 'identified');
            break;
          }
          case 'lastContact': {
            const dateA = getLastContactDate(a)?.getTime() || 0;
            const dateB = getLastContactDate(b)?.getTime() || 0;
            cmp = dateA - dateB;
            break;
          }
          case 'strength': {
            cmp = getRelationshipStrength(a) - getRelationshipStrength(b);
            break;
          }
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [contacts, targetMap, search, filterRole, filterStage, sortField, sortAsc, touchpointsByTarget]);

  // Relationship strength stats
  const strengthCounts = useMemo(() => {
    const counts = { strong: 0, moderate: 0, weak: 0, cold: 0 };
    for (const c of contacts) {
      const score = getRelationshipStrength(c);
      if (score >= 80) counts.strong++;
      else if (score >= 50) counts.moderate++;
      else if (score >= 20) counts.weak++;
      else counts.cold++;
    }
    return counts;
  }, [contacts, touchpointsByTarget, targetMap]);

  // Stats
  const primaryCount = contacts.filter(c => c.is_primary).length;
  const withEmail = contacts.filter(c => c.email).length;
  const withPhone = contacts.filter(c => c.phone).length;
  const withNotes = contacts.filter(c => c.notes).length;
  const targetsWithContacts = new Set(contacts.map(c => c.target_id)).size;
  const targetsWithoutContacts = targets.filter(t => !contacts.some(c => c.target_id === t.id) && !['closed_lost'].includes(t.stage)).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleSaveNotes = (contactId: string) => {
    updateContact(contactId, { notes: notesText });
    setEditingNotes(null);
    reload();
  };

  const daysAgo = (date: Date | null) => {
    if (!date) return null;
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="text-left p-3 text-xs font-medium cursor-pointer select-none hover:opacity-80 transition-opacity"
      style={{ color: 'var(--muted-foreground)' }}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <ChevronDown size={10} style={{ transform: sortAsc ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
        )}
      </span>
    </th>
  );

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contact Directory</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {contacts.length} contacts across {targetsWithContacts} targets
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['table', 'cards'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize"
              style={{
                background: view === v ? 'var(--accent-muted)' : 'var(--card)',
                color: view === v ? 'var(--accent)' : 'var(--muted-foreground)',
                border: '1px solid var(--border)',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-bold font-mono">{contacts.length}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Total</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>{primaryCount}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Primary</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-bold font-mono">{withEmail}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>With Email</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-bold font-mono">{withPhone}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>With Phone</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-bold font-mono">{withNotes}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>With Notes</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-bold font-mono" style={{ color: targetsWithoutContacts > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {targetsWithoutContacts}
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Targets w/o Contacts</div>
        </div>
      </div>

      {/* Relationship Strength Summary */}
      {contacts.length > 0 && (
        <div className="glass-card p-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
            <Signal size={13} />
            Relationships:
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
            <span style={{ color: 'var(--success)' }}>{strengthCounts.strong} strong</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} />
            <span style={{ color: 'var(--warning)' }}>{strengthCounts.moderate} moderate</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ background: '#F97316' }} />
            <span style={{ color: '#F97316' }}>{strengthCounts.weak} weak</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }} />
            <span style={{ color: 'var(--danger)' }}>{strengthCounts.cold} cold</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, title, company, or notes..."
            className="w-full pl-9"
          />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="text-sm">
          <option value="all">All Roles</option>
          {roles.map(r => <option key={r} value={r!}>{r}</option>)}
        </select>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="text-sm">
          <option value="all">All Stages</option>
          {DEAL_STAGES.filter(s => activeStages.includes(s.key)).map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table View */}
      {view === 'table' && (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <SortHeader field="name" label="Name" />
                <SortHeader field="title" label="Title" />
                <SortHeader field="company" label="Company" />
                <SortHeader field="stage" label="Stage" />
                <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Contact Info</th>
                <SortHeader field="strength" label="Strength" />
                <SortHeader field="lastContact" label="Last Interaction" />
                <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const target = targetMap.get(c.target_id);
                const stage = DEAL_STAGES.find(s => s.key === target?.stage);
                const lastDate = getLastContactDate(c);
                const daysSinceContact = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
                const isExpanded = expandedContact === c.id;
                const recentTPs = getContactTouchpoints(c);

                return (
                  <>
                    <tr
                      key={c.id}
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)' }}
                      className="transition-colors cursor-pointer"
                      onClick={() => setExpandedContact(isExpanded ? null : c.id)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{
                            background: c.is_primary ? 'var(--accent)' : 'var(--background)',
                            color: c.is_primary ? 'white' : 'var(--muted-foreground)',
                          }}>
                            {c.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              {c.name}
                              {c.is_primary && <Star size={10} fill="var(--warning)" style={{ color: 'var(--warning)' }} />}
                            </div>
                            {c.linkedin && (
                              <a
                                href={`https://${c.linkedin}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs flex items-center gap-0.5 mt-0.5"
                                style={{ color: 'var(--accent)' }}
                                onClick={e => e.stopPropagation()}
                              >
                                <Link2 size={9} /> LinkedIn
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.title || '—'}</td>
                      <td className="p-3">
                        {target ? (
                          <Link
                            href={`/targets/${target.id}`}
                            className="text-xs font-medium hover:underline"
                            style={{ color: 'var(--accent)' }}
                            onClick={e => e.stopPropagation()}
                          >
                            {target.name}
                          </Link>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>Unknown</span>
                        )}
                      </td>
                      <td className="p-3">
                        {stage && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${stage.color}20`, color: stage.color }}>
                            {stage.label}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <StrengthBadge contact={c} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {c.email && (
                            <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} title={c.email}>
                              <Mail size={14} style={{ color: 'var(--accent)' }} />
                            </a>
                          )}
                          {c.phone && (
                            <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} title={c.phone}>
                              <Phone size={14} style={{ color: 'var(--muted-foreground)' }} />
                            </a>
                          )}
                          {!c.email && !c.phone && <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        {lastDate ? (
                          <span
                            className="text-xs"
                            style={{ color: daysSinceContact !== null && daysSinceContact > 30 ? 'var(--warning)' : 'var(--muted-foreground)' }}
                          >
                            {daysAgo(lastDate)}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>Never</span>
                        )}
                      </td>
                      <td className="p-3">
                        {c.notes ? (
                          <span className="text-xs truncate max-w-[200px] inline-block" style={{ color: 'var(--muted-foreground)' }}>
                            {c.notes.substring(0, 50)}{c.notes.length > 50 ? '...' : ''}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr key={`${c.id}-detail`} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={8} className="p-0">
                          <div className="p-4 space-y-3" style={{ background: 'var(--background)' }}>
                            <div className="grid grid-cols-2 gap-4">
                              {/* Contact details */}
                              <div>
                                <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>CONTACT DETAILS</div>
                                <div className="space-y-1.5 text-xs">
                                  {c.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail size={12} style={{ color: 'var(--muted)' }} />
                                      <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)' }}>{c.email}</a>
                                    </div>
                                  )}
                                  {c.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone size={12} style={{ color: 'var(--muted)' }} />
                                      <span>{c.phone}</span>
                                    </div>
                                  )}
                                  {c.linkedin && (
                                    <div className="flex items-center gap-2">
                                      <Link2 size={12} style={{ color: 'var(--muted)' }} />
                                      <a href={`https://${c.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                                        {c.linkedin} <ExternalLink size={10} />
                                      </a>
                                    </div>
                                  )}
                                </div>

                                {/* Notes */}
                                <div className="mt-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>NOTES</span>
                                    {editingNotes !== c.id ? (
                                      <button
                                        onClick={e => { e.stopPropagation(); setEditingNotes(c.id); setNotesText(c.notes || ''); }}
                                        className="text-xs flex items-center gap-1"
                                        style={{ color: 'var(--accent)' }}
                                      >
                                        <Edit2 size={10} /> Edit
                                      </button>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <button onClick={e => { e.stopPropagation(); handleSaveNotes(c.id); }} style={{ color: 'var(--success)' }}><Check size={12} /></button>
                                        <button onClick={e => { e.stopPropagation(); setEditingNotes(null); }} style={{ color: 'var(--danger)' }}><X size={12} /></button>
                                      </div>
                                    )}
                                  </div>
                                  {editingNotes === c.id ? (
                                    <textarea
                                      value={notesText}
                                      onChange={e => setNotesText(e.target.value)}
                                      onClick={e => e.stopPropagation()}
                                      className="w-full text-xs p-2 rounded-lg"
                                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                                      rows={3}
                                      placeholder="Add notes about this contact..."
                                    />
                                  ) : (
                                    <p className="text-xs whitespace-pre-wrap" style={{ color: c.notes ? 'var(--foreground)' : 'var(--muted)' }}>
                                      {c.notes || 'No notes. Click Edit to add.'}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Interaction history */}
                              <div>
                                <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>
                                  RECENT INTERACTIONS ({target?.name || 'Unknown'})
                                </div>
                                {recentTPs.length > 0 ? (
                                  <div className="space-y-2">
                                    {recentTPs.map(tp => (
                                      <div key={tp.id} className="flex items-start gap-2 text-xs">
                                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{
                                          background: tp.type === 'meeting' ? 'var(--accent)' : tp.type === 'call' ? 'var(--success)' : 'var(--muted)',
                                        }} />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium truncate">{tp.subject}</span>
                                            <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--muted)' }}>
                                              {new Date(tp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                          </div>
                                          <span className="capitalize" style={{ color: 'var(--muted)' }}>{tp.type}</span>
                                          {tp.participants && <span style={{ color: 'var(--muted)' }}> · {tp.participants}</span>}
                                        </div>
                                      </div>
                                    ))}
                                    <Link
                                      href={`/targets/${c.target_id}`}
                                      className="text-xs block mt-1"
                                      style={{ color: 'var(--accent)' }}
                                      onClick={e => e.stopPropagation()}
                                    >
                                      View all interactions →
                                    </Link>
                                  </div>
                                ) : (
                                  <p className="text-xs" style={{ color: 'var(--muted)' }}>No interactions logged yet.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">{contacts.length === 0 ? 'No contacts yet. Add contacts from target detail pages.' : 'No contacts match your search.'}</p>
            </div>
          )}
        </div>
      )}

      {/* Cards View */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const target = targetMap.get(c.target_id);
            const stage = DEAL_STAGES.find(s => s.key === target?.stage);
            const lastDate = getLastContactDate(c);
            const recentTPs = getContactTouchpoints(c);

            return (
              <div
                key={c.id}
                className="rounded-xl border p-4 space-y-3"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{
                    background: c.is_primary ? 'var(--accent)' : 'var(--background)',
                    color: c.is_primary ? 'white' : 'var(--muted-foreground)',
                  }}>
                    {c.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-1">
                      {c.name}
                      {c.is_primary && <Star size={10} fill="var(--warning)" style={{ color: 'var(--warning)' }} />}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>{c.title || 'No title'}</div>
                    <div className="mt-1">
                      <StrengthBadge contact={c} />
                    </div>
                    {target && (
                      <div className="flex items-center gap-2 mt-1">
                        <Link
                          href={`/targets/${target.id}`}
                          className="text-xs font-medium"
                          style={{ color: 'var(--accent)' }}
                        >
                          {target.name}
                        </Link>
                        {stage && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${stage.color}20`, color: stage.color }}>
                            {stage.label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="flex items-center gap-3 text-xs">
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1 truncate" style={{ color: 'var(--accent)' }}>
                      <Mail size={11} /> {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <span className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                      <Phone size={11} /> {c.phone}
                    </span>
                  )}
                </div>

                {/* Notes */}
                {c.notes && (
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                    {c.notes.substring(0, 120)}{c.notes.length > 120 ? '...' : ''}
                  </p>
                )}

                {/* Recent activity */}
                <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>RECENT ACTIVITY</span>
                    {lastDate && (
                      <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                        Last: {daysAgo(lastDate)}
                      </span>
                    )}
                  </div>
                  {recentTPs.length > 0 ? (
                    <div className="mt-1.5 space-y-1">
                      {recentTPs.slice(0, 3).map(tp => (
                        <div key={tp.id} className="flex items-center gap-1.5 text-[11px]">
                          <div className="w-1 h-1 rounded-full" style={{
                            background: tp.type === 'meeting' ? 'var(--accent)' : tp.type === 'call' ? 'var(--success)' : 'var(--muted)',
                          }} />
                          <span className="truncate">{tp.subject}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>No interactions logged</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {c.linkedin && (
                    <a
                      href={`https://${c.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors"
                      style={{ background: 'var(--background)', color: 'var(--accent)' }}
                    >
                      <Link2 size={10} /> LinkedIn
                    </a>
                  )}
                  <Link
                    href={`/targets/${c.target_id}`}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors"
                    style={{ background: 'var(--background)', color: 'var(--muted-foreground)' }}
                  >
                    <Building2 size={10} /> View Target
                  </Link>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12" style={{ color: 'var(--muted)' }}>
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">{contacts.length === 0 ? 'No contacts yet. Add contacts from target detail pages.' : 'No contacts match your search.'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
