'use client';

import { useEffect, useState, useMemo } from 'react';
import { getTargets, getTouchpoints, getDDProjects } from '@/lib/db';
import type { Target, Touchpoint, DDProject } from '@/lib/types';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Phone,
  Flag,
  Target as TargetIcon,
  FileSearch,
  AlertCircle,
  Clock,
} from 'lucide-react';

// --- Types ---

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'follow_up' | 'milestone' | 'dd_close' | 'first_contact';
  label: string;
  targetId: string;
  targetName: string;
  detail?: string;
  overdue: boolean;
  completed?: boolean;
}

interface Milestone {
  id: string;
  label: string;
  target_date: string;
  completed: boolean;
}

// --- Helpers ---

const EVENT_COLORS: Record<CalendarEvent['type'], string> = {
  follow_up: '#3B82F6',    // blue
  milestone: '#8B5CF6',    // purple
  dd_close: '#F97316',     // orange
  first_contact: '#10B981', // green
};

const EVENT_LABELS: Record<CalendarEvent['type'], string> = {
  follow_up: 'Follow-up',
  milestone: 'Milestone',
  dd_close: 'DD Close Date',
  first_contact: 'First Contact',
};

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// --- Component ---

export default function CalendarPage() {
  const today = new Date();
  const todayKey = toDateKey(today);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filterType, setFilterType] = useState<CalendarEvent['type'] | 'all'>('all');

  useEffect(() => {
    const targets = getTargets();
    const touchpoints = getTouchpoints();
    const ddProjects = getDDProjects();
    const todayStr = toDateKey(new Date());
    const collected: CalendarEvent[] = [];

    const targetMap = new Map<string, Target>();
    targets.forEach(t => targetMap.set(t.id, t));

    // Follow-up dates from touchpoints
    touchpoints.forEach(tp => {
      if (tp.follow_up_date) {
        const dateKey = tp.follow_up_date.slice(0, 10);
        const target = targetMap.get(tp.target_id);
        collected.push({
          id: `fu-${tp.id}`,
          date: dateKey,
          type: 'follow_up',
          label: tp.subject || 'Follow-up',
          targetId: tp.target_id,
          targetName: target?.name || 'Unknown',
          detail: tp.follow_up_notes || undefined,
          overdue: dateKey < todayStr,
        });
      }
    });

    // Milestones from localStorage
    targets.forEach(target => {
      try {
        const raw = localStorage.getItem(`dealforge_milestones_${target.id}`);
        if (raw) {
          const milestones: Milestone[] = JSON.parse(raw);
          milestones.forEach(ms => {
            if (ms.target_date) {
              const dateKey = ms.target_date.slice(0, 10);
              collected.push({
                id: `ms-${ms.id}`,
                date: dateKey,
                type: 'milestone',
                label: ms.label,
                targetId: target.id,
                targetName: target.name,
                overdue: !ms.completed && dateKey < todayStr,
                completed: ms.completed,
              });
            }
          });
        }
      } catch { /* ignore parse errors */ }
    });

    // DD target close dates
    ddProjects.forEach(proj => {
      if (proj.target_close_date) {
        const dateKey = proj.target_close_date.slice(0, 10);
        const target = targetMap.get(proj.target_id);
        collected.push({
          id: `dd-${proj.id}`,
          date: dateKey,
          type: 'dd_close',
          label: `DD Close: ${proj.target_name}`,
          targetId: proj.target_id,
          targetName: target?.name || proj.target_name,
          overdue: dateKey < todayStr && proj.status !== 'complete',
        });
      }
    });

    // First contact dates
    targets.forEach(target => {
      if (target.first_contact_date) {
        const dateKey = target.first_contact_date.slice(0, 10);
        collected.push({
          id: `fc-${target.id}`,
          date: dateKey,
          type: 'first_contact',
          label: `First Contact: ${target.name}`,
          targetId: target.id,
          targetName: target.name,
          overdue: false, // historical, never overdue
        });
      }
    });

    setEvents(collected);
  }, []);

  // Build calendar grid data
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);

  // Events grouped by date key
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(e => {
      if (filterType !== 'all' && e.type !== filterType) return;
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [events, filterType]);

  // Events for selected day
  const selectedDayEvents = selectedDay ? (eventsByDate.get(selectedDay) || []) : [];

  // Upcoming events (next 30 days from today)
  const upcomingEvents = useMemo(() => {
    const start = todayKey;
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    const end = toDateKey(endDate);
    return events
      .filter(e => {
        if (filterType !== 'all' && e.type !== filterType) return false;
        return e.date >= start && e.date <= end;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, filterType, todayKey]);

  // Overdue events
  const overdueEvents = useMemo(() => {
    return events
      .filter(e => {
        if (filterType !== 'all' && e.type !== filterType) return false;
        return e.overdue;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [events, filterType]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(todayKey);
  };

  // Build grid cells
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  // Fill remaining cells to complete the last week
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  function getEventIcon(type: CalendarEvent['type']) {
    switch (type) {
      case 'follow_up': return <Phone size={12} />;
      case 'milestone': return <Flag size={12} />;
      case 'dd_close': return <FileSearch size={12} />;
      case 'first_contact': return <TargetIcon size={12} />;
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon size={24} style={{ color: 'var(--accent)' }} />
            Pipeline Calendar
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Track follow-ups, milestones, and key dates across all M&A targets
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter by type */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as CalendarEvent['type'] | 'all')}
            className="px-3 py-1.5 rounded-lg text-sm border"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          >
            <option value="all">All Events</option>
            <option value="follow_up">Follow-ups</option>
            <option value="milestone">Milestones</option>
            <option value="dd_close">DD Close Dates</option>
            <option value="first_contact">First Contacts</option>
          </select>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {(Object.keys(EVENT_COLORS) as CalendarEvent['type'][]).map(type => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: EVENT_COLORS[type] }}
            />
            <span style={{ color: 'var(--muted)' }}>{EVENT_LABELS[type]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: 'var(--danger)' }}
          />
          <span style={{ color: 'var(--muted)' }}>Overdue</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 glass-card p-4 rounded-xl">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg transition-colors hover:opacity-80"
              style={{ background: 'var(--background)' }}
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg transition-colors hover:opacity-80"
              style={{ background: 'var(--background)' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {DAY_NAMES.map(day => (
              <div
                key={day}
                className="text-center text-xs font-medium py-2"
                style={{ color: 'var(--muted)' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-px">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[80px] rounded-lg"
                    style={{ background: 'var(--background)', opacity: 0.3 }}
                  />
                );
              }

              const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDate.get(dateKey) || [];
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDay;
              const hasOverdue = dayEvents.some(e => e.overdue);

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDay(dateKey === selectedDay ? null : dateKey)}
                  className="min-h-[80px] rounded-lg p-1.5 text-left transition-all relative flex flex-col"
                  style={{
                    background: isSelected
                      ? 'var(--accent-muted)'
                      : 'var(--background)',
                    border: isToday
                      ? '2px solid var(--accent)'
                      : isSelected
                        ? '2px solid var(--accent)'
                        : '1px solid var(--border)',
                  }}
                >
                  {/* Day number */}
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'text-white' : ''
                    }`}
                    style={{
                      background: isToday ? 'var(--accent)' : 'transparent',
                      color: isToday ? 'white' : 'var(--foreground)',
                    }}
                  >
                    {day}
                  </span>

                  {/* Event dots */}
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dayEvents.slice(0, 4).map(evt => (
                        <span
                          key={evt.id}
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background: evt.overdue
                              ? 'var(--danger)'
                              : EVENT_COLORS[evt.type],
                          }}
                          title={evt.label}
                        />
                      ))}
                      {dayEvents.length > 4 && (
                        <span
                          className="text-xs leading-none"
                          style={{ color: 'var(--muted)', fontSize: '0.6rem' }}
                        >
                          +{dayEvents.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* First event label preview on larger screens */}
                  {dayEvents.length > 0 && (
                    <div className="hidden md:block mt-auto">
                      <span
                        className="text-xs truncate block leading-tight"
                        style={{
                          color: hasOverdue
                            ? 'var(--danger)'
                            : EVENT_COLORS[dayEvents[0].type],
                          fontSize: '0.6rem',
                        }}
                      >
                        {dayEvents[0].label}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock size={14} style={{ color: 'var(--accent)' }} />
              {selectedDay ? formatDate(selectedDay) : 'Select a Day'}
            </h3>

            {!selectedDay && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Click on a day in the calendar to view its events.
              </p>
            )}

            {selectedDay && selectedDayEvents.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                No events on this day.
              </p>
            )}

            {selectedDayEvents.length > 0 && (
              <div className="space-y-2">
                {selectedDayEvents.map(evt => (
                  <Link
                    key={evt.id}
                    href={`/targets/${evt.targetId}`}
                    className="block p-3 rounded-lg transition-colors hover:opacity-90"
                    style={{
                      background: 'var(--background)',
                      border: evt.overdue
                        ? '1px solid var(--danger)'
                        : '1px solid var(--border)',
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-0.5 flex-shrink-0"
                        style={{
                          color: evt.overdue
                            ? 'var(--danger)'
                            : EVENT_COLORS[evt.type],
                        }}
                      >
                        {getEventIcon(evt.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-xs font-medium truncate"
                            style={{
                              color: evt.overdue
                                ? 'var(--danger)'
                                : 'var(--foreground)',
                            }}
                          >
                            {evt.label}
                          </span>
                          {evt.overdue && (
                            <AlertCircle
                              size={10}
                              style={{ color: 'var(--danger)' }}
                              className="flex-shrink-0"
                            />
                          )}
                          {evt.completed && (
                            <span
                              className="text-xs"
                              style={{ color: 'var(--success)' }}
                            >
                              Done
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs truncate mt-0.5"
                          style={{ color: 'var(--muted)' }}
                        >
                          {evt.targetName}
                        </div>
                        {evt.detail && (
                          <div
                            className="text-xs mt-1 line-clamp-2"
                            style={{ color: 'var(--muted)' }}
                          >
                            {evt.detail}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{
                              background: `${EVENT_COLORS[evt.type]}22`,
                              color: EVENT_COLORS[evt.type],
                              fontSize: '0.6rem',
                            }}
                          >
                            {EVENT_LABELS[evt.type]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Overdue section */}
          {overdueEvents.length > 0 && (
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--danger)' }}>
                <AlertCircle size={14} />
                Overdue ({overdueEvents.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {overdueEvents.slice(0, 10).map(evt => (
                  <Link
                    key={evt.id}
                    href={`/targets/${evt.targetId}`}
                    className="flex items-center gap-2 p-2 rounded-lg text-xs transition-colors hover:opacity-90"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid var(--danger)',
                    }}
                  >
                    <span style={{ color: 'var(--danger)' }}>
                      {getEventIcon(evt.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" style={{ color: 'var(--danger)' }}>
                        {evt.label}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>
                        {evt.targetName} &middot; {formatDate(evt.date)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <CalendarIcon size={14} style={{ color: 'var(--accent)' }} />
          Upcoming Events (Next 30 Days)
        </h3>

        {upcomingEvents.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            No upcoming events in the next 30 days.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingEvents.map(evt => (
              <Link
                key={evt.id}
                href={`/targets/${evt.targetId}`}
                className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:opacity-90"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                }}
              >
                <span
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: EVENT_COLORS[evt.type] }}
                >
                  {getEventIcon(evt.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{evt.label}</div>
                  <div
                    className="text-xs mt-0.5 truncate"
                    style={{ color: 'var(--muted)' }}
                  >
                    {evt.targetName}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-xs"
                      style={{ color: 'var(--muted)', fontSize: '0.65rem' }}
                    >
                      {formatDate(evt.date)}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{
                        background: `${EVENT_COLORS[evt.type]}22`,
                        color: EVENT_COLORS[evt.type],
                        fontSize: '0.6rem',
                      }}
                    >
                      {EVENT_LABELS[evt.type]}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
