'use client';

import { useEffect, useState, useMemo } from 'react';
import { getTargets } from '@/lib/db';
import type { Target } from '@/lib/types';
import {
  getIntegrationChecklist, saveIntegrationChecklist,
  INTEGRATION_CATEGORIES, DEFAULT_INTEGRATION_ITEMS,
  type IntegrationItem,
} from '@/lib/integration-checklist';
import Link from 'next/link';
import {
  CheckCircle2, Circle, Clock, ChevronDown, ChevronRight,
  Building2, Users, DollarSign, Shield, Settings, Rocket,
  MessageSquare, Monitor, Plus, Trash2, Edit3, Save,
  BarChart3, Calendar, AlertTriangle,
} from 'lucide-react';

const TIMELINE_LABELS: Record<string, { label: string; color: string; order: number }> = {
  day_1: { label: 'Day 1', color: 'var(--danger)', order: 0 },
  week_1: { label: 'Week 1', color: 'var(--warning)', order: 1 },
  month_1: { label: 'Month 1', color: 'var(--accent)', order: 2 },
  month_3: { label: 'Month 3', color: 'var(--success)', order: 3 },
  ongoing: { label: 'Ongoing', color: 'var(--muted)', order: 4 },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Day 1 Communications': <MessageSquare size={14} />,
  'Financial Integration': <DollarSign size={14} />,
  'HR & People': <Users size={14} />,
  'Customer Success': <Building2 size={14} />,
  'Technology & IT': <Monitor size={14} />,
  'Operations': <Settings size={14} />,
  'Governance': <Shield size={14} />,
  'Growth Initiatives': <Rocket size={14} />,
};

type ViewMode = 'checklist' | 'timeline' | 'progress';

export default function IntegrationPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [view, setView] = useState<ViewMode>('checklist');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(INTEGRATION_CATEGORIES));
  const [filterTimeline, setFilterTimeline] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editOwner, setEditOwner] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ category: INTEGRATION_CATEGORIES[0] as string, task: '', timeline: 'month_1' as string, owner: '' });

  useEffect(() => {
    const t = getTargets();
    const closedWon = t.filter(x => x.stage === 'closed_won');
    setTargets(closedWon);
    if (closedWon.length > 0) {
      setSelectedTargetId(closedWon[0].id);
    }
  }, []);

  useEffect(() => {
    if (selectedTargetId) {
      setItems(getIntegrationChecklist(selectedTargetId));
    }
  }, [selectedTargetId]);

  const save = (updated: IntegrationItem[]) => {
    setItems(updated);
    saveIntegrationChecklist(selectedTargetId, updated);
  };

  const toggleItem = (id: string) => {
    const updated = items.map(i => i.id === id ? { ...i, completed: !i.completed } : i);
    save(updated);
  };

  const saveItemEdit = (id: string) => {
    const updated = items.map(i => i.id === id ? { ...i, owner: editOwner || undefined, notes: editNotes || undefined } : i);
    save(updated);
    setEditingItem(null);
  };

  const deleteItem = (id: string) => {
    save(items.filter(i => i.id !== id));
  };

  const addTask = () => {
    if (!newTask.task.trim()) return;
    const item: IntegrationItem = {
      id: `int-custom-${Date.now()}`,
      category: newTask.category,
      task: newTask.task.trim(),
      timeline: newTask.timeline as IntegrationItem['timeline'],
      completed: false,
      owner: newTask.owner || undefined,
    };
    save([...items, item]);
    setNewTask({ category: INTEGRATION_CATEGORIES[0] as string, task: '', timeline: 'month_1', owner: '' });
    setShowAddTask(false);
  };

  const resetChecklist = () => {
    const fresh: IntegrationItem[] = DEFAULT_INTEGRATION_ITEMS.map(item => ({
      ...item,
      completed: false,
      owner: undefined,
      notes: undefined,
    }));
    save(fresh);
  };

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (filterTimeline !== 'all' && i.timeline !== filterTimeline) return false;
      if (filterStatus === 'done' && !i.completed) return false;
      if (filterStatus === 'pending' && i.completed) return false;
      return true;
    });
  }, [items, filterTimeline, filterStatus]);

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // Stats
  const totalItems = items.length;
  const completedItems = items.filter(i => i.completed).length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const timelineStats = Object.entries(TIMELINE_LABELS).map(([key, cfg]) => {
    const tItems = items.filter(i => i.timeline === key);
    const done = tItems.filter(i => i.completed).length;
    return { key, ...cfg, total: tItems.length, done, pct: tItems.length > 0 ? Math.round((done / tItems.length) * 100) : 0 };
  }).filter(t => t.total > 0);

  const categoryStats = (INTEGRATION_CATEGORIES as readonly string[]).map(cat => {
    const catItems = items.filter(i => i.category === cat);
    const done = catItems.filter(i => i.completed).length;
    return { category: cat, total: catItems.length, done, pct: catItems.length > 0 ? Math.round((done / catItems.length) * 100) : 0 };
  }).filter(c => c.total > 0);

  const selectedTarget = targets.find(t => t.id === selectedTargetId);

  if (targets.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Integration Planning</h1>
        <div className="glass-card p-12 text-center" style={{ color: 'var(--muted)' }}>
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No Closed Acquisitions</p>
          <p className="text-sm mb-4">Integration planning is available for targets that have reached &quot;Closed Won&quot; status.</p>
          <Link href="/pipeline" className="btn btn-primary btn-sm">View Pipeline</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket size={24} style={{ color: 'var(--accent)' }} /> Integration Planning
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Post-close 100-day integration checklist
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTargetId}
            onChange={e => setSelectedTargetId(e.target.value)}
            className="text-sm"
          >
            {targets.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold">{selectedTarget?.name} — Integration Progress</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {completedItems} of {totalItems} tasks complete
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold font-mono" style={{ color: progressPct >= 75 ? 'var(--success)' : progressPct >= 50 ? 'var(--warning)' : 'var(--accent)' }}>
              {progressPct}%
            </div>
          </div>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: progressPct >= 75 ? 'var(--success)' : progressPct >= 50 ? 'var(--warning)' : 'var(--accent)',
            }}
          />
        </div>

        {/* Timeline progress bars */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          {timelineStats.map(t => (
            <div key={t.key} className="p-2 rounded-lg" style={{ background: 'var(--background)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase" style={{ color: t.color }}>{t.label}</span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>{t.done}/{t.total}</span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${t.pct}%`, background: t.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View toggle + filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--card)' }}>
          {(['checklist', 'timeline', 'progress'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize"
              style={{
                background: view === v ? 'var(--accent-muted)' : 'transparent',
                color: view === v ? 'var(--accent)' : 'var(--muted-foreground)',
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={filterTimeline} onChange={e => setFilterTimeline(e.target.value)} className="text-xs">
            <option value="all">All Timelines</option>
            {Object.entries(TIMELINE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="done">Completed</option>
          </select>
          <button onClick={() => setShowAddTask(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Task
          </button>
          <button onClick={resetChecklist} className="btn btn-ghost btn-sm text-xs" style={{ color: 'var(--muted)' }}>
            Reset
          </button>
        </div>
      </div>

      {/* Add Task Form */}
      {showAddTask && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold mb-3">Add Custom Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={newTask.category} onChange={e => setNewTask({ ...newTask, category: e.target.value })} className="text-sm">
              {INTEGRATION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              value={newTask.task}
              onChange={e => setNewTask({ ...newTask, task: e.target.value })}
              placeholder="Task description..."
              className="text-sm col-span-1 md:col-span-2"
            />
            <select value={newTask.timeline} onChange={e => setNewTask({ ...newTask, timeline: e.target.value })} className="text-sm">
              {Object.entries(TIMELINE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input
              value={newTask.owner}
              onChange={e => setNewTask({ ...newTask, owner: e.target.value })}
              placeholder="Owner (optional)"
              className="text-sm max-w-xs"
            />
            <button onClick={addTask} className="btn btn-primary btn-sm"><Save size={14} /> Save</button>
            <button onClick={() => setShowAddTask(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Checklist View */}
      {view === 'checklist' && (
        <div className="space-y-3">
          {categoryStats.map(cs => {
            const catItems = filtered.filter(i => i.category === cs.category);
            if (catItems.length === 0) return null;
            const expanded = expandedCats.has(cs.category);
            return (
              <div key={cs.category} className="glass-card overflow-hidden">
                <button
                  onClick={() => toggleCat(cs.category)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span style={{ color: 'var(--accent)' }}>{CATEGORY_ICONS[cs.category]}</span>
                  <span className="font-semibold text-sm flex-1">{cs.category}</span>
                  <span className="text-xs font-mono" style={{ color: cs.pct === 100 ? 'var(--success)' : 'var(--muted)' }}>
                    {cs.done}/{cs.total}
                  </span>
                  <div className="w-20 h-1.5 rounded-full" style={{ background: 'var(--background)' }}>
                    <div className="h-full rounded-full" style={{ width: `${cs.pct}%`, background: cs.pct === 100 ? 'var(--success)' : 'var(--accent)' }} />
                  </div>
                </button>
                {expanded && (
                  <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                    {catItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 px-4 py-3 border-b last:border-b-0 transition-colors"
                        style={{ borderColor: 'var(--border)', opacity: item.completed ? 0.6 : 1 }}
                      >
                        <button onClick={() => toggleItem(item.id)} className="mt-0.5 flex-shrink-0">
                          {item.completed
                            ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                            : <Circle size={18} style={{ color: 'var(--muted)' }} />
                          }
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${item.completed ? 'line-through' : ''}`}>{item.task}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: `${TIMELINE_LABELS[item.timeline]?.color}15`, color: TIMELINE_LABELS[item.timeline]?.color }}
                            >
                              {TIMELINE_LABELS[item.timeline]?.label}
                            </span>
                            {item.owner && (
                              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                                Owner: {item.owner}
                              </span>
                            )}
                            {item.notes && (
                              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                                — {item.notes}
                              </span>
                            )}
                          </div>
                          {editingItem === item.id && (
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                value={editOwner}
                                onChange={e => setEditOwner(e.target.value)}
                                placeholder="Owner"
                                className="text-xs max-w-[120px]"
                              />
                              <input
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="Notes"
                                className="text-xs flex-1"
                              />
                              <button onClick={() => saveItemEdit(item.id)} className="btn btn-primary btn-sm text-xs">
                                <Save size={12} />
                              </button>
                              <button onClick={() => setEditingItem(null)} className="btn btn-ghost btn-sm text-xs">
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEditingItem(item.id); setEditOwner(item.owner || ''); setEditNotes(item.notes || ''); }}
                            className="p-1 rounded hover:bg-opacity-10"
                            style={{ color: 'var(--muted)' }}
                          >
                            <Edit3 size={12} />
                          </button>
                          {item.id.startsWith('int-custom-') && (
                            <button onClick={() => deleteItem(item.id)} className="p-1 rounded" style={{ color: 'var(--danger)' }}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline View */}
      {view === 'timeline' && (
        <div className="space-y-6">
          {timelineStats.map(t => {
            const tItems = filtered.filter(i => i.timeline === t.key);
            if (tItems.length === 0) return null;
            return (
              <div key={t.key}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                  <h3 className="font-semibold" style={{ color: t.color }}>{t.label}</h3>
                  <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{t.done}/{t.total} complete</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                  {tItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 p-3 rounded-lg transition-colors"
                      style={{ background: 'var(--card)', opacity: item.completed ? 0.6 : 1 }}
                    >
                      <button onClick={() => toggleItem(item.id)} className="mt-0.5">
                        {item.completed
                          ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                          : <Circle size={16} style={{ color: 'var(--muted)' }} />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${item.completed ? 'line-through' : ''}`}>{item.task}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-1 rounded" style={{ background: 'var(--background)', color: 'var(--muted)' }}>
                            {item.category}
                          </span>
                          {item.owner && <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{item.owner}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress View */}
      {view === 'progress' && (
        <div className="space-y-4">
          {/* By Category */}
          <div className="glass-card p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 size={16} style={{ color: 'var(--accent)' }} /> Progress by Workstream
            </h3>
            <div className="space-y-3">
              {categoryStats.map(cs => (
                <div key={cs.category} className="flex items-center gap-3">
                  <span className="flex items-center gap-2 w-48 text-xs truncate">
                    {CATEGORY_ICONS[cs.category]}
                    {cs.category}
                  </span>
                  <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: 'var(--background)' }}>
                    <div
                      className="h-full rounded-lg flex items-center px-2 text-[10px] font-bold text-white transition-all"
                      style={{
                        width: `${Math.max(cs.pct, 8)}%`,
                        background: cs.pct === 100 ? 'var(--success)' : cs.pct >= 50 ? 'var(--accent)' : 'var(--warning)',
                      }}
                    >
                      {cs.pct}%
                    </div>
                  </div>
                  <span className="text-xs font-mono w-12 text-right" style={{ color: 'var(--muted)' }}>
                    {cs.done}/{cs.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* By Timeline */}
          <div className="glass-card p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar size={16} style={{ color: 'var(--accent)' }} /> Progress by Timeline
            </h3>
            <div className="space-y-3">
              {timelineStats.map(t => (
                <div key={t.key} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-medium" style={{ color: t.color }}>{t.label}</span>
                  <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: 'var(--background)' }}>
                    <div
                      className="h-full rounded-lg flex items-center px-2 text-[10px] font-bold text-white transition-all"
                      style={{ width: `${Math.max(t.pct, 8)}%`, background: t.color }}
                    >
                      {t.pct}%
                    </div>
                  </div>
                  <span className="text-xs font-mono w-12 text-right" style={{ color: 'var(--muted)' }}>
                    {t.done}/{t.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue / At Risk */}
          {items.filter(i => !i.completed && (i.timeline === 'day_1' || i.timeline === 'week_1')).length > 0 && (
            <div className="glass-card p-5 border-l-4" style={{ borderLeftColor: 'var(--warning)' }}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle size={16} style={{ color: 'var(--warning)' }} /> Potentially Overdue Items
              </h3>
              <div className="space-y-2">
                {items.filter(i => !i.completed && (i.timeline === 'day_1' || i.timeline === 'week_1')).map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--background)' }}>
                    <button onClick={() => toggleItem(item.id)}>
                      <Circle size={16} style={{ color: 'var(--warning)' }} />
                    </button>
                    <span className="text-xs flex-1">{item.task}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: `${TIMELINE_LABELS[item.timeline]?.color}15`, color: TIMELINE_LABELS[item.timeline]?.color }}>
                      {TIMELINE_LABELS[item.timeline]?.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
