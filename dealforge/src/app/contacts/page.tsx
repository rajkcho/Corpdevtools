'use client';

import { useEffect, useState } from 'react';
import { getContacts, getTargets } from '@/lib/db';
import type { Contact, Target } from '@/lib/types';
import { Users, Search, Mail, Phone, Building2, Star } from 'lucide-react';
import Link from 'next/link';
import { DEAL_STAGES } from '@/lib/types';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    setContacts(getContacts());
    setTargets(getTargets());
  }, []);

  const targetMap = new Map(targets.map(t => [t.id, t]));

  // Extract unique roles/titles
  const roles = Array.from(new Set(contacts.map(c => c.title).filter(Boolean))).sort();

  const filtered = contacts
    .filter(c => {
      if (filterRole !== 'all' && c.title !== filterRole) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const target = targetMap.get(c.target_id);
      return c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q) ||
        target?.name.toLowerCase().includes(q) || false;
    })
    .sort((a, b) => {
      // Primary contacts first, then alphabetical
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return a.name.localeCompare(b.name);
    });

  // Stats
  const primaryCount = contacts.filter(c => c.is_primary).length;
  const withEmail = contacts.filter(c => c.email).length;
  const withPhone = contacts.filter(c => c.phone).length;
  const targetsWithContacts = new Set(contacts.map(c => c.target_id)).size;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contact Directory</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {contacts.length} contacts across {targetsWithContacts} targets
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-bold font-mono">{contacts.length}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Total Contacts</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>{primaryCount}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Primary Contacts</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-bold font-mono">{withEmail}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>With Email</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-bold font-mono">{withPhone}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>With Phone</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, title, or company..."
            className="w-full pl-9"
          />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="text-sm">
          <option value="all">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Contacts Table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Name</th>
              <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Title</th>
              <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Company</th>
              <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Stage</th>
              <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Email</th>
              <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Phone</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const target = targetMap.get(c.target_id);
              const stage = DEAL_STAGES.find(s => s.key === target?.stage);
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }} className="transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{
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
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.title || '—'}</td>
                  <td className="p-3">
                    {target ? (
                      <Link href={`/targets/${target.id}`} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                        {target.name}
                      </Link>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>Unknown</span>
                    )}
                  </td>
                  <td className="p-3">
                    {stage && (
                      <span className="badge text-[10px]" style={{ background: `${stage.color}20`, color: stage.color }}>
                        {stage.label}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        <Mail size={10} /> {c.email}
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {c.phone ? (
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                        <Phone size={10} /> {c.phone}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                </tr>
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
    </div>
  );
}
