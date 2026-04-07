'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Target, FileSearch, BarChart3, ArrowUpDown, Settings, LayoutDashboard, Clock } from 'lucide-react';
import { getTargets, getDDProjects } from '@/lib/db';
import type { Target as TargetType, DDProject } from '@/lib/types';

interface SearchResult {
  id: string;
  type: 'target' | 'dd_project' | 'page';
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
  { id: 'diligence', type: 'page', label: 'Due Diligence', href: '/diligence', icon: <FileSearch size={16} /> },
  { id: 'activity', type: 'page', label: 'Activity Feed', href: '/activity', icon: <Clock size={16} /> },
  { id: 'settings', type: 'page', label: 'Settings', href: '/settings', icon: <Settings size={16} /> },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  if (!open) return null;

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
                  {result.type === 'dd_project' ? 'DD Project' : result.type}
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
