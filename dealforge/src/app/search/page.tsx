'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  Search,
  Target,
  Users,
  MessageSquare,
  FileSearch,
  FileText,
  Clock,
  BookOpen,
  ArrowRight,
  X,
  Filter,
} from 'lucide-react';
import {
  getTargets,
  getContacts,
  getTouchpoints,
  getDDProjects,
  getDDRisks,
  getDDFindings,
  getMeetingNotes,
  getActivities,
  getJournalEntries,
} from '@/lib/db';
import type {
  Target as TargetType,
  Contact,
  Touchpoint,
  DDProject,
  DDRisk,
  DDFinding,
  MeetingNote,
  ActivityEntry,
  JournalEntry,
} from '@/lib/types';

// --- Types ---

type ResultCategory = 'all' | 'targets' | 'contacts' | 'touchpoints' | 'notes' | 'dd' | 'activity';

interface SearchResultItem {
  id: string;
  category: ResultCategory;
  type: string;
  title: string;
  subtitle: string;
  matchedField: string;
  matchedText: string;
  href: string;
  icon: React.ReactNode;
}

// --- Helpers ---

function matchesQuery(text: string | undefined | null, query: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

function getMatchedText(text: string | undefined | null, query: string): string {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 120);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 60);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;

  let searchIdx = 0;
  while (searchIdx < text.length) {
    const idx = lowerText.indexOf(lowerQuery, searchIdx);
    if (idx === -1) break;
    if (idx > lastIndex) {
      parts.push({ text: text.slice(lastIndex, idx), highlight: false });
    }
    parts.push({ text: text.slice(idx, idx + query.length), highlight: true });
    lastIndex = idx + query.length;
    searchIdx = idx + query.length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  if (parts.length === 0) return <span>{text}</span>;

  return (
    <span>
      {parts.map((part, i) =>
        part.highlight ? (
          <strong key={i} style={{ color: 'var(--accent)', fontWeight: 700 }}>
            {part.text}
          </strong>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}

const CATEGORY_TABS: { key: ResultCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Filter size={14} /> },
  { key: 'targets', label: 'Targets', icon: <Target size={14} /> },
  { key: 'contacts', label: 'Contacts', icon: <Users size={14} /> },
  { key: 'touchpoints', label: 'Touchpoints', icon: <MessageSquare size={14} /> },
  { key: 'notes', label: 'Notes', icon: <BookOpen size={14} /> },
  { key: 'dd', label: 'Due Diligence', icon: <FileSearch size={14} /> },
  { key: 'activity', label: 'Activity', icon: <Clock size={14} /> },
];

// --- Search Logic ---

function performSearch(query: string): SearchResultItem[] {
  if (!query.trim() || typeof window === 'undefined') return [];

  const q = query.trim();
  const results: SearchResultItem[] = [];
  const targets = getTargets();

  // Targets
  for (const t of targets) {
    const fields: { field: string; value: string | undefined }[] = [
      { field: 'name', value: t.name },
      { field: 'vertical', value: t.vertical },
      { field: 'geography', value: t.geography },
      { field: 'description', value: t.description },
      { field: 'notes', value: t.notes },
      { field: 'tags', value: t.tags?.join(', ') },
    ];
    for (const f of fields) {
      if (matchesQuery(f.value, q)) {
        results.push({
          id: `target-${t.id}-${f.field}`,
          category: 'targets',
          type: 'Target',
          title: t.name,
          subtitle: `${t.vertical} - ${t.stage} - ${t.geography}`,
          matchedField: f.field,
          matchedText: getMatchedText(f.value, q),
          href: `/targets/${t.id}`,
          icon: <Target size={16} />,
        });
        break; // one result per target
      }
    }
  }

  // Contacts
  const contacts = getContacts();
  for (const c of contacts) {
    const fields: { field: string; value: string | undefined }[] = [
      { field: 'name', value: c.name },
      { field: 'title', value: c.title },
      { field: 'email', value: c.email },
      { field: 'notes', value: c.notes },
    ];
    for (const f of fields) {
      if (matchesQuery(f.value, q)) {
        const target = targets.find(t => t.id === c.target_id);
        results.push({
          id: `contact-${c.id}`,
          category: 'contacts',
          type: 'Contact',
          title: c.name,
          subtitle: `${c.title || 'Contact'} at ${target?.name || 'Unknown'}`,
          matchedField: f.field,
          matchedText: getMatchedText(f.value, q),
          href: `/targets/${c.target_id}`,
          icon: <Users size={16} />,
        });
        break;
      }
    }
  }

  // Touchpoints
  const touchpoints = getTouchpoints();
  for (const tp of touchpoints) {
    const fields: { field: string; value: string | undefined }[] = [
      { field: 'subject', value: tp.subject },
      { field: 'summary', value: tp.summary },
      { field: 'participants', value: tp.participants },
    ];
    for (const f of fields) {
      if (matchesQuery(f.value, q)) {
        const target = targets.find(t => t.id === tp.target_id);
        results.push({
          id: `touchpoint-${tp.id}`,
          category: 'touchpoints',
          type: 'Touchpoint',
          title: tp.subject,
          subtitle: `${tp.type} - ${target?.name || 'Unknown'} - ${new Date(tp.date).toLocaleDateString()}`,
          matchedField: f.field,
          matchedText: getMatchedText(f.value, q),
          href: `/targets/${tp.target_id}`,
          icon: <MessageSquare size={16} />,
        });
        break;
      }
    }
  }

  // Meeting Notes
  const meetingNotes = getMeetingNotes();
  for (const mn of meetingNotes) {
    const fields: { field: string; value: string | undefined }[] = [
      { field: 'file_name', value: mn.file_name },
      { field: 'raw_text', value: mn.raw_text },
      { field: 'ai_summary', value: mn.ai_summary },
    ];
    for (const f of fields) {
      if (matchesQuery(f.value, q)) {
        const target = targets.find(t => t.id === mn.target_id);
        results.push({
          id: `meeting-note-${mn.id}`,
          category: 'notes',
          type: 'Meeting Note',
          title: mn.file_name,
          subtitle: `${target?.name || 'Unknown'} - ${new Date(mn.uploaded_at).toLocaleDateString()}`,
          matchedField: f.field,
          matchedText: getMatchedText(f.value, q),
          href: `/targets/${mn.target_id}`,
          icon: <FileText size={16} />,
        });
        break;
      }
    }
  }

  // Journal Entries - search across all targets
  for (const t of targets) {
    const entries = getJournalEntries(t.id);
    for (const je of entries) {
      const fields: { field: string; value: string | undefined }[] = [
        { field: 'title', value: je.title },
        { field: 'content', value: je.content },
        { field: 'tags', value: je.tags?.join(', ') },
      ];
      for (const f of fields) {
        if (matchesQuery(f.value, q)) {
          results.push({
            id: `journal-${je.id}`,
            category: 'notes',
            type: 'Journal Entry',
            title: je.title,
            subtitle: `${t.name} - ${new Date(je.created_at).toLocaleDateString()}`,
            matchedField: f.field,
            matchedText: getMatchedText(f.value, q),
            href: `/targets/${t.id}`,
            icon: <BookOpen size={16} />,
          });
          break;
        }
      }
    }
  }

  // DD Projects
  const ddProjects = getDDProjects();
  for (const p of ddProjects) {
    const fields: { field: string; value: string | undefined }[] = [
      { field: 'target_name', value: p.target_name },
      { field: 'notes', value: p.notes },
    ];
    for (const f of fields) {
      if (matchesQuery(f.value, q)) {
        results.push({
          id: `dd-project-${p.id}`,
          category: 'dd',
          type: 'DD Project',
          title: `DD: ${p.target_name}`,
          subtitle: `${p.phase} - ${p.rag_status.toUpperCase()} - ${p.overall_progress_pct}% complete`,
          matchedField: f.field,
          matchedText: getMatchedText(f.value, q),
          href: `/diligence/${p.id}`,
          icon: <FileSearch size={16} />,
        });
        break;
      }
    }

    // DD Risks
    const risks = getDDRisks(p.id);
    for (const r of risks) {
      if (matchesQuery(r.title, q) || matchesQuery(r.description, q) || matchesQuery(r.mitigation, q)) {
        results.push({
          id: `dd-risk-${r.id}`,
          category: 'dd',
          type: 'DD Risk',
          title: r.title,
          subtitle: `${p.target_name} - Impact: ${r.impact} - ${r.status}`,
          matchedField: 'description',
          matchedText: getMatchedText(r.description || r.title, q),
          href: `/diligence/${p.id}`,
          icon: <FileSearch size={16} />,
        });
      }
    }

    // DD Findings
    const findings = getDDFindings(p.id);
    for (const f of findings) {
      if (matchesQuery(f.title, q) || matchesQuery(f.description, q)) {
        results.push({
          id: `dd-finding-${f.id}`,
          category: 'dd',
          type: 'DD Finding',
          title: f.title,
          subtitle: `${p.target_name} - ${f.severity} - ${f.type}`,
          matchedField: 'description',
          matchedText: getMatchedText(f.description || f.title, q),
          href: `/diligence/${p.id}`,
          icon: <FileSearch size={16} />,
        });
      }
    }
  }

  // Activities
  const activities = getActivities();
  for (const a of activities) {
    if (matchesQuery(a.description, q)) {
      results.push({
        id: `activity-${a.id}`,
        category: 'activity',
        type: 'Activity',
        title: a.description,
        subtitle: `${a.type} - ${new Date(a.created_at).toLocaleDateString()}`,
        matchedField: 'description',
        matchedText: getMatchedText(a.description, q),
        href: a.target_id ? `/targets/${a.target_id}` : '/activity',
        icon: <Clock size={16} />,
      });
    }
  }

  return results;
}

// --- Components ---

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get('q') || '';

  const [inputValue, setInputValue] = useState(urlQuery);
  const [activeTab, setActiveTab] = useState<ResultCategory>('all');

  // Sync input with URL
  useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);

  const results = useMemo(() => performSearch(urlQuery), [urlQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ResultCategory, number> = {
      all: results.length,
      targets: 0,
      contacts: 0,
      touchpoints: 0,
      notes: 0,
      dd: 0,
      activity: 0,
    };
    for (const r of results) {
      if (r.category in counts) {
        counts[r.category as ResultCategory]++;
      }
    }
    return counts;
  }, [results]);

  const filteredResults = useMemo(() => {
    if (activeTab === 'all') return results;
    return results.filter(r => r.category === activeTab);
  }, [results, activeTab]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      } else {
        router.push('/search');
      }
    },
    [inputValue, router]
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    router.push('/search');
  }, [router]);

  // Group results by category for the "all" view
  const groupedResults = useMemo(() => {
    if (activeTab !== 'all') return null;
    const groups: Record<string, SearchResultItem[]> = {};
    for (const r of filteredResults) {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    }
    return groups;
  }, [filteredResults, activeTab]);

  const categoryLabel: Record<string, string> = {
    targets: 'Targets',
    contacts: 'Contacts',
    touchpoints: 'Touchpoints',
    notes: 'Notes & Journal',
    dd: 'Due Diligence',
    activity: 'Activity',
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Search</h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Search across targets, contacts, touchpoints, notes, due diligence, and activity
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <Search size={20} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Search everything..."
            className="flex-1 bg-transparent border-none outline-none text-base"
            style={{ padding: 0, boxShadow: 'none', color: 'var(--foreground)' }}
            autoFocus
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Filter Tabs */}
      {urlQuery && (
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                background: activeTab === tab.key ? 'var(--accent-muted)' : 'transparent',
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted-foreground)',
              }}
            >
              {tab.icon}
              {tab.label}
              {urlQuery && (
                <span
                  className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: activeTab === tab.key ? 'var(--accent)' : 'var(--background)',
                    color: activeTab === tab.key ? 'white' : 'var(--muted-foreground)',
                  }}
                >
                  {categoryCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {!urlQuery ? (
        // Empty state - no query
        <div className="flex flex-col items-center justify-center py-20">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-muted)' }}
          >
            <Search size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2">Search DealForge</h2>
          <p className="text-sm text-center max-w-md" style={{ color: 'var(--muted-foreground)' }}>
            Find targets, contacts, touchpoints, meeting notes, journal entries, due diligence items, and activity across your entire deal pipeline.
          </p>
        </div>
      ) : filteredResults.length === 0 ? (
        // Empty state - no results
        <div className="flex flex-col items-center justify-center py-20">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--background)' }}
          >
            <Search size={28} style={{ color: 'var(--muted)' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2">No results found</h2>
          <p className="text-sm text-center max-w-md" style={{ color: 'var(--muted-foreground)' }}>
            No matches for &quot;{urlQuery}&quot;{activeTab !== 'all' ? ` in ${categoryLabel[activeTab] || activeTab}` : ''}. Try a different search term or broaden your filters.
          </p>
        </div>
      ) : activeTab === 'all' && groupedResults ? (
        // Grouped results view
        <div className="space-y-6">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Found <strong>{results.length}</strong> result{results.length !== 1 ? 's' : ''} for &quot;{urlQuery}&quot;
          </p>
          {Object.entries(groupedResults).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-3">
                <h3
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {categoryLabel[category] || category} ({items.length})
                </h3>
                {items.length > 5 && (
                  <button
                    onClick={() => setActiveTab(category as ResultCategory)}
                    className="text-xs font-medium flex items-center gap-1 transition-colors"
                    style={{ color: 'var(--accent)' }}
                  >
                    View all <ArrowRight size={12} />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {items.slice(0, 5).map(item => (
                  <ResultCard key={item.id} item={item} query={urlQuery} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Filtered single category view
        <div className="space-y-1">
          <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Found <strong>{filteredResults.length}</strong> result{filteredResults.length !== 1 ? 's' : ''} for &quot;{urlQuery}&quot;
            {activeTab !== 'all' ? ` in ${categoryLabel[activeTab] || activeTab}` : ''}
          </p>
          {filteredResults.map(item => (
            <ResultCard key={item.id} item={item} query={urlQuery} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ item, query }: { item: SearchResultItem; query: string }) {
  return (
    <Link
      href={item.href}
      className="glass-card flex items-start gap-3 p-3 rounded-xl border transition-colors block"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--card)',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
      >
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm truncate">
            <HighlightedText text={item.title} query={query} />
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{ background: 'var(--background)', color: 'var(--muted-foreground)' }}
          >
            {item.type}
          </span>
        </div>
        <p className="text-xs mb-1 truncate" style={{ color: 'var(--muted-foreground)' }}>
          {item.subtitle}
        </p>
        {item.matchedText && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            <span className="italic" style={{ color: 'var(--muted-foreground)' }}>
              {item.matchedField}:
            </span>{' '}
            <HighlightedText text={item.matchedText} query={query} />
          </p>
        )}
      </div>
      <ArrowRight size={14} className="flex-shrink-0 mt-2" style={{ color: 'var(--muted)' }} />
    </Link>
  );
}

// --- Page export with Suspense boundary ---

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">Search</h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading search...</p>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
