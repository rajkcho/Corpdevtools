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
  Mail,
  Bell,
  Sun,
  Moon,
  Users,
  Calculator,
  Building2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getNotificationCounts, getAlerts, type NotificationCounts, type Alert } from '@/lib/notifications';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/targets', label: 'Targets', icon: Target },
  { href: '/compare', label: 'Compare', icon: ArrowUpDown },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/outreach', label: 'Outreach', icon: Mail },
  { href: '/portfolio', label: 'Portfolio', icon: Building2 },
  { href: '/valuation', label: 'Valuation', icon: Calculator },
  { href: '/diligence', label: 'Due Diligence', icon: FileSearch },
  { href: '/activity', label: 'Activity', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [counts, setCounts] = useState<NotificationCounts>({ staleDeals: 0, overdueFollowUps: 0, overdueIRLs: 0, activeDD: 0, targetsWithoutContacts: 0, total: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    setCounts(getNotificationCounts());
    setAlerts(getAlerts());
    const interval = setInterval(() => { setCounts(getNotificationCounts()); setAlerts(getAlerts()); }, 60000);
    return () => clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem('dealforge_theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('dealforge_theme', next);
  };

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
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && item.href === '/pipeline' && counts.staleDeals > 0 && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--warning)', fontSize: '0.6rem' }}>
                  {counts.staleDeals}
                </span>
              )}
              {!collapsed && item.href === '/diligence' && counts.overdueIRLs > 0 && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', fontSize: '0.6rem' }}>
                  {counts.overdueIRLs}
                </span>
              )}
              {collapsed && item.href === '/pipeline' && counts.staleDeals > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} />
              )}
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

      {/* Notification bell */}
      <div className="px-3 pb-2 relative">
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors relative"
          style={{ background: counts.total > 0 ? 'rgba(239,68,68,0.1)' : 'var(--background)', color: counts.total > 0 ? 'var(--danger)' : 'var(--muted)' }}
        >
          <Bell size={14} />
          {!collapsed && <span className="flex-1 text-left">{counts.total > 0 ? `${counts.total} alert${counts.total !== 1 ? 's' : ''}` : 'No alerts'}</span>}
          {counts.total > 0 && (
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', fontSize: '0.6rem' }}>
              {counts.total}
            </span>
          )}
        </button>
        {showAlerts && alerts.length > 0 && (
          <div
            className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border shadow-lg overflow-hidden z-50"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-semibold">Alerts ({alerts.length})</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {alerts.slice(0, 8).map(a => (
                <Link
                  key={a.id}
                  href={a.href}
                  onClick={() => setShowAlerts(false)}
                  className="flex items-start gap-2 p-2.5 text-xs border-b transition-colors hover:bg-opacity-50"
                  style={{ borderColor: 'var(--border)', background: 'transparent' }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: a.severity === 'danger' ? 'var(--danger)' : 'var(--warning)' }} />
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div style={{ color: 'var(--muted)' }}>{a.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Theme toggle */}
      <div className="px-3 pb-1">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ background: 'var(--background)', color: 'var(--muted)' }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
      </div>

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
