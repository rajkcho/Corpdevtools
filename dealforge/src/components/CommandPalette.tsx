'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Target, FileSearch, BarChart3, ArrowUpDown, Settings, LayoutDashboard, Clock, Mail, Keyboard, Calculator, Building2, Map, Rocket } from 'lucide-react';
import { getTargets, getDDProjects, getContacts, getTouchpoints } from '@/lib/db';
import type { Target as TargetType, DDProject, Contact, Touchpoint } from '@/lib/types';
import { Users, MessageSquare } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'target' | 'dd_project' | 'page' | 'contact' | 'touchpoint';
  label: string;
  sublabel?: string;
  href: string;
  icon: React.ReactNode;
}

const PAGES: SearchResult[] = [
  { id: 'dashboard', type: 'page', label: 'Dashboard', href: '/', icon: <LayoutDashboard size={16} /> },
  { id: 'pipeline', type: 'page', label: 'Pipeline', href: '/pipeline', icon: <Target size={16} /> },
  { id: 'targets', type: 'page', label: 'Targets', href: '/targets', icon: <Target size={16} /> },
  { id: 'compare', type: 'page', label: 'Compare Targets', href: '/compare', icon: <ArrowUpDown size={16} /> },
  { id: 'analytics', type: 'page', label: 'Analytics', href: '/analytics', icon: <BarChart3 size={16} /> },
  { id: 'valuation', type: 'page', label: 'Valuation Calculator', href: '/valuation', icon: <Calculator size={16} /> },
  { id: 'diligence', type: 'page', label: 'Due Diligence', href: '/diligence', icon: <FileSearch size={16} /> },
  { id: 'outreach', type: 'page', label: 'Outreach Templates', href: '/outreach', icon: <Mail size={16} /> },
  { id: 'portfolio', type: 'page', label: 'Portfolio', href: '/portfolio', icon: <Building2 size={16} /> },
  { id: 'reports', type: 'page', label: 'Deal Flow Reports', href: '/reports', icon: <FileSearch size={16} /> },
  { id: 'market-map', type: 'page', label: 'Market Map', href: '/market-map', icon: <Map size={16} /> },
  { id: 'benchmarks', type: 'page', label: 'VMS Benchmarks', href: '/benchmarks', icon: <BarChart3 size={16} /> },
  { id: 'integration', type: 'page', label: 'Integration Planning', href: '/integration', icon: <Rocket size={16} /> },
  { id: 'activity', type: 'page', label: 'Activity Feed', href: '/activity', icon: <Clock size={16} /> },
  { id: 'settings', type: 'page', label: 'Settings', href: '/settings', icon: <Settings size={16} /> },
];

const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'Open command palette' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['G', 'D'], description: 'Go to Dashboard' },
  { keys: ['G', 'P'], description: 'Go to Pipeline' },
  { keys: ['G', 'T'], description: 'Go to Targets' },
  { keys: ['G', 'A'], description: 'Go to Analytics' },
  { keys: ['G', 'I'], description: 'Go to Due Diligence' },
  { keys: ['G', 'O'], description: 'Go to Outreach' },
  { keys: ['G', 'S'], description: 'Go to Settings' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pendingG, setPendingG] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K, ?, and G+key navigation
  useEffect(() => {
    let gTimer: ReturnType<typeof setTimeout>;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setShowShortcuts(false);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setShowShortcuts(false);
        return;
      }

      if (isInput) return;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        setOpen(false);
        return;
      }

      // G+key navigation
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        setPendingG(true);
        gTimer = setTimeout(() => setPendingG(false), 1000);
        return;
      }

      if (pendingG) {
        setPendingG(false);
        clearTimeout(gTimer);
        const routes: Record<string, string> = {
          d: '/', p: '/pipeline', t: '/targets', a: '/analytics',
          i: '/diligence', o: '/outreach', s: '/settings',
        };
        if (routes[e.key]) {
          e.preventDefault();
          router.push(routes[e.key]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); clearTimeout(gTimer); };
  }, [pendingG, router]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search
  useEffect(() => {
    if (!open) return;
    const q = query.toLowerCase().trim();
    const allResults: SearchResult[] = [];

    // Search pages
    for (const page of PAGES) {
      if (!q || page.label.toLowerCase().includes(q)) {
        allResults.push(page);
      }
    }

    // Search targets
    if (typeof window !== 'undefined') {
      const targets = getTargets();
      for (const t of targets) {
        if (!q || t.name.toLowerCase().includes(q) || t.vertical.toLowerCase().includes(q) || t.geography?.toLowerCase().includes(q)) {
          allResults.push({
            id: t.id,
            type: 'target',
            label: t.name,
            sublabel: `${t.vertical} · ${t.stage}`,
            href: `/targets/${t.id}`,
            icon: <Target size={16} />,
          });
        }
      }

      // Search DD projects
      const projects = getDDProjects();
      for (const p of projects) {
        if (!q || p.target_name.toLowerCase().includes(q)) {
          allResults.push({
            id: p.id,
            type: 'dd_project',
            label: `DD: ${p.target_name}`,
            sublabel: `${p.phase} · ${p.overall_progress_pct}%`,
            href: `/diligence/${p.id}`,
            icon: <FileSearch size={16} />,
          });
        }
      }

      // Search contacts (only when query has 2+ chars)
      if (q.length >= 2) {
        const contacts = getContacts();
        for (const c of contacts) {
          if (c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q)) {
            const target = targets.find(t => t.id === c.target_id);
            allResults.push({
              id: c.id,
              type: 'contact',
              label: c.name,
              sublabel: `${c.title || 'Contact'} · ${target?.name || 'Unknown'}`,
              href: `/targets/${c.target_id}`,
              icon: <Users size={16} />,
            });
          }
        }

        // Search touchpoints
        const tps = getTouchpoints();
        for (const tp of tps.slice(0, 100)) {
          if (tp.subject.toLowerCase().includes(q) || tp.summary?.toLowerCase().includes(q)) {
            const target = targets.find(t => t.id === tp.target_id);
            allResults.push({
              id: tp.id,
              type: 'touchpoint',
              label: tp.subject,
              sublabel: `${tp.type} · ${target?.name || 'Unknown'} · ${new Date(tp.date).toLocaleDateString()}`,
              href: `/targets/${tp.target_id}`,
              icon: <MessageSquare size={16} />,
            });
          }
        }
      }
    }

    setResults(allResults.slice(0, 15));
    setSelectedIndex(0);
  }, [query, open]);

  const handleSelect = useCallback((result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  if (!open && !showShortcuts) return null;

  // Shortcuts panel
  if (showShortcuts) return (
    <div className="modal-overlay" onClick={() => setShowShortcuts(false)} style={{ alignItems: 'flex-start', paddingTop: '20vh' }}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Keyboard size={16} /> Keyboard Shortcuts
          </div>
          <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--background)', color: 'var(--muted)', border: '1px solid var(--border)' }}>ESC</kbd>
        </div>
        <div className="p-4 space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-sm">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <span key={j}>
                    <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>{k}</kbd>
                    {j < s.keys.length - 1 && <span className="text-xs mx-0.5" style={{ color: 'var(--muted)' }}>+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)} style={{ alignItems: 'flex-start', paddingTop: '20vh' }}>
      <div
        className="modal-content max-w-lg"
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <Search size={18} style={{ color: 'var(--muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search targets, pages, DD projects..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ padding: 0, boxShadow: 'none' }}
          />
          <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--background)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>No results found</p>
          ) : (
            results.map((result, i) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left text-sm transition-colors"
                style={{
                  background: i === selectedIndex ? 'var(--accent-muted)' : 'transparent',
                  color: i === selectedIndex ? 'var(--accent)' : 'var(--foreground)',
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span style={{ color: i === selectedIndex ? 'var(--accent)' : 'var(--muted)' }}>
                  {result.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{result.label}</div>
                  {result.sublabel && (
                    <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>{result.sublabel}</div>
                  )}
                </div>
                <span className="text-xs capitalize" style={{ color: 'var(--muted)' }}>
                  {result.type === 'dd_project' ? 'DD' : result.type === 'touchpoint' ? 'Activity' : result.type}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 p-3 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          <span><kbd className="px-1 py-0.5 rounded" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 rounded" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>↵</kbd> select</span>
          <span><kbd className="px-1 py-0.5 rounded" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
