'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Target,
  KanbanSquare,
  FileSearch,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ArrowUpDown,
  Clock,
  Search,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/targets', label: 'Targets', icon: Target },
  { href: '/compare', label: 'Compare', icon: ArrowUpDown },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/diligence', label: 'Due Diligence', icon: FileSearch },
  { href: '/activity', label: 'Activity', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col border-r transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b" style={{ borderColor: 'var(--border)' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
          style={{ background: 'var(--accent)' }}
        >
          DF
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight">DealForge</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'text-white font-medium'
                  : 'hover:text-white'
              }`}
              style={{
                background: isActive ? 'var(--accent-muted)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--muted-foreground)',
              }}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Quick search hint */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{ background: 'var(--background)', color: 'var(--muted)' }}
          >
            <Search size={12} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>⌘K</kbd>
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t btn-ghost"
        style={{ borderColor: 'var(--border)' }}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
