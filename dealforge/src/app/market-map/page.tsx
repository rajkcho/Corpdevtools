'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getTargets } from '@/lib/db';
import type { Target, Vertical } from '@/lib/types';
import { VERTICALS, DEAL_STAGES } from '@/lib/types';
import { Map as MapIcon, Target as TargetIcon, Users, TrendingUp, Filter, Eye, Grid3X3 } from 'lucide-react';

interface Competitor {
  id: string;
  name: string;
  type: 'direct' | 'indirect' | 'potential';
  threat_level: number;
  notes?: string;
}

interface TargetWithCompetitors extends Target {
  competitors: Competitor[];
}

type ViewMode = 'landscape' | 'vertical' | 'threat';

export default function MarketMapPage() {
  const [targets, setTargets] = useState<TargetWithCompetitors[]>([]);
  const [view, setView] = useState<ViewMode>('landscape');
  const [selectedVertical, setSelectedVertical] = useState<string>('all');
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  useEffect(() => {
    const allTargets = getTargets();
    const withCompetitors: TargetWithCompetitors[] = allTargets.map(t => {
      const raw = localStorage.getItem(`dealforge_competitors_${t.id}`);
      return { ...t, competitors: raw ? JSON.parse(raw) : [] };
    });
    setTargets(withCompetitors);
  }, []);

  const activeTargets = useMemo(() =>
    targets.filter(t => t.stage !== 'closed_lost'),
    [targets]
  );

  const filteredTargets = useMemo(() =>
    selectedVertical === 'all' ? activeTargets : activeTargets.filter(t => t.vertical === selectedVertical),
    [activeTargets, selectedVertical]
  );

  const allCompetitors = useMemo(() => {
    const map = new Map<string, { name: string; type: string; totalThreat: number; count: number; targets: string[] }>();
    for (const t of activeTargets) {
      for (const c of t.competitors) {
        const existing = map.get(c.name);
        if (existing) {
          existing.totalThreat += c.threat_level;
          existing.count++;
          existing.targets.push(t.name);
        } else {
          map.set(c.name, { name: c.name, type: c.type, totalThreat: c.threat_level, count: 1, targets: [t.name] });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalThreat / b.count - a.totalThreat / a.count);
  }, [activeTargets]);

  const verticals = useMemo(() => {
    const vSet = new Set<Vertical>();
    activeTargets.forEach(t => vSet.add(t.vertical));
    return Array.from(vSet).sort();
  }, [activeTargets]);

  const totalCompetitors = allCompetitors.length;
  const avgThreat = allCompetitors.length > 0
    ? (allCompetitors.reduce((s, c) => s + c.totalThreat / c.count, 0) / allCompetitors.length).toFixed(1)
    : '0';
  const targetsWithCompetitors = activeTargets.filter(t => t.competitors.length > 0).length;
  const multiTargetCompetitors = allCompetitors.filter(c => c.count > 1).length;

  const stageColor = (stage: string) => DEAL_STAGES.find(s => s.key === stage)?.color || '#6B7280';

  const threatColor = (level: number) => {
    if (level >= 3) return 'var(--danger)';
    if (level >= 2) return 'var(--warning)';
    return 'var(--success)';
  };

  const threatLabel = (level: number) => {
    if (level >= 3) return 'High';
    if (level >= 2) return 'Medium';
    return 'Low';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><MapIcon size={22} /> Market Map</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Competitive landscape analysis across your pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['landscape', 'vertical', 'threat'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: view === v ? 'var(--accent-muted)' : 'var(--card)',
                color: view === v ? 'var(--accent)' : 'var(--muted-foreground)',
                border: '1px solid var(--border)',
              }}
            >
              {v === 'landscape' ? 'Landscape' : v === 'vertical' ? 'By Vertical' : 'Threat Analysis'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Unique Competitors', value: totalCompetitors, sub: 'across pipeline' },
          { label: 'Avg Threat Level', value: avgThreat, sub: 'out of 3.0' },
          { label: 'Targets Mapped', value: `${targetsWithCompetitors}/${activeTargets.length}`, sub: 'have competitors' },
          { label: 'Overlapping', value: multiTargetCompetitors, sub: 'multi-target competitors' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>{kpi.label}</div>
            <div className="text-2xl font-bold mt-1">{kpi.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter size={14} style={{ color: 'var(--muted)' }} />
        <select
          value={selectedVertical}
          onChange={e => setSelectedVertical(e.target.value)}
          className="text-sm rounded-lg px-3 py-1.5 border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
          <option value="all">All Verticals</option>
          {verticals.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {filteredTargets.length} targets · {filteredTargets.reduce((s, t) => s + t.competitors.length, 0)} competitor entries
        </span>
      </div>

      {/* Landscape View */}
      {view === 'landscape' && (
        <div className="space-y-4">
          {filteredTargets.filter(t => t.competitors.length > 0).map(target => (
            <div
              key={target.id}
              className="rounded-xl border overflow-hidden"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setSelectedTarget(selectedTarget === target.id ? null : target.id)}
                style={{ borderBottom: selectedTarget === target.id ? '1px solid var(--border)' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full" style={{ background: stageColor(target.stage) }} />
                  <div>
                    <Link href={`/targets/${target.id}`} className="font-medium text-sm hover:underline" onClick={e => e.stopPropagation()}>
                      {target.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{target.vertical}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${stageColor(target.stage)}22`, color: stageColor(target.stage) }}>
                        {DEAL_STAGES.find(s => s.key === target.stage)?.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {target.competitors.map(c => (
                      <div
                        key={c.id}
                        className="w-3 h-3 rounded-full"
                        style={{ background: threatColor(c.threat_level), opacity: 0.8 }}
                        title={`${c.name} (${threatLabel(c.threat_level)})`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    {target.competitors.length} competitor{target.competitors.length !== 1 ? 's' : ''}
                  </span>
                  <Eye size={14} style={{ color: 'var(--muted)', transform: selectedTarget === target.id ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                </div>
              </div>

              {selectedTarget === target.id && (
                <div className="p-4 space-y-2">
                  {target.competitors.map(c => (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ background: 'var(--background)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ background: `${threatColor(c.threat_level)}22`, color: threatColor(c.threat_level) }}
                      >
                        {c.threat_level}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{c.name}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full capitalize"
                            style={{
                              background: c.type === 'direct' ? 'rgba(239,68,68,0.1)' : c.type === 'indirect' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                              color: c.type === 'direct' ? 'var(--danger)' : c.type === 'indirect' ? 'var(--warning)' : 'var(--accent)',
                            }}
                          >
                            {c.type}
                          </span>
                        </div>
                        {c.notes && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{c.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredTargets.filter(t => t.competitors.length > 0).length === 0 && (
            <div className="text-center py-12 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <Grid3X3 size={40} style={{ color: 'var(--muted)', margin: '0 auto' }} />
              <p className="text-sm mt-3" style={{ color: 'var(--muted)' }}>No competitor data for selected targets.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Add competitors from individual target pages.</p>
            </div>
          )}
        </div>
      )}

      {/* Vertical View */}
      {view === 'vertical' && (
        <div className="space-y-6">
          {verticals.map(vertical => {
            const vTargets = filteredTargets.filter(t => t.vertical === vertical);
            if (vTargets.length === 0) return null;
            const vCompetitors = new Map<string, { name: string; type: string; threat: number; targets: string[] }>();
            for (const t of vTargets) {
              for (const c of t.competitors) {
                const existing = vCompetitors.get(c.name);
                if (existing) {
                  existing.threat = Math.max(existing.threat, c.threat_level);
                  existing.targets.push(t.name);
                } else {
                  vCompetitors.set(c.name, { name: c.name, type: c.type, threat: c.threat_level, targets: [t.name] });
                }
              }
            }
            const sortedCompetitors = Array.from(vCompetitors.values()).sort((a, b) => b.threat - a.threat);

            return (
              <div key={vertical} className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="font-semibold text-sm">{vertical}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {vTargets.length} target{vTargets.length !== 1 ? 's' : ''} · {sortedCompetitors.length} unique competitor{sortedCompetitors.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="p-4">
                  {/* Our targets */}
                  <div className="mb-4">
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>OUR TARGETS</div>
                    <div className="flex flex-wrap gap-2">
                      {vTargets.map(t => (
                        <Link
                          key={t.id}
                          href={`/targets/${t.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                          style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                        >
                          <TargetIcon size={12} />
                          {t.name}
                          {t.weighted_score && <span className="ml-1 opacity-60">({t.weighted_score.toFixed(1)})</span>}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Competitors */}
                  {sortedCompetitors.length > 0 && (
                    <div>
                      <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>COMPETITIVE LANDSCAPE</div>
                      <div className="space-y-1.5">
                        {sortedCompetitors.map(c => (
                          <div key={c.name} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--background)' }}>
                            <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ background: `${threatColor(c.threat)}22`, color: threatColor(c.threat) }}>
                              {c.threat}
                            </div>
                            <span className="text-sm font-medium flex-1">{c.name}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full capitalize" style={{
                              background: c.type === 'direct' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                              color: c.type === 'direct' ? 'var(--danger)' : 'var(--warning)',
                            }}>
                              {c.type}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>
                              vs {c.targets.join(', ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sortedCompetitors.length === 0 && (
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>No competitor data mapped for this vertical.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Threat Analysis View */}
      {view === 'threat' && (
        <div className="space-y-4">
          {/* Threat matrix */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-sm">Competitor Threat Matrix</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                All competitors ranked by threat level and market presence
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>Competitor</th>
                    <th className="text-center p-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>Type</th>
                    <th className="text-center p-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>Avg Threat</th>
                    <th className="text-center p-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>Appearances</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>Competes Against</th>
                  </tr>
                </thead>
                <tbody>
                  {allCompetitors.map(c => {
                    const avgT = c.totalThreat / c.count;
                    return (
                      <tr key={c.name} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="p-3 font-medium">{c.name}</td>
                        <td className="p-3 text-center">
                          <span className="text-xs px-1.5 py-0.5 rounded-full capitalize" style={{
                            background: c.type === 'direct' ? 'rgba(239,68,68,0.1)' : c.type === 'indirect' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                            color: c.type === 'direct' ? 'var(--danger)' : c.type === 'indirect' ? 'var(--warning)' : 'var(--accent)',
                          }}>
                            {c.type}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
                              <div className="h-full rounded-full" style={{ width: `${(avgT / 3) * 100}%`, background: threatColor(Math.round(avgT)) }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color: threatColor(Math.round(avgT)) }}>
                              {avgT.toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: c.count > 1 ? 'rgba(239,68,68,0.1)' : 'var(--background)', color: c.count > 1 ? 'var(--danger)' : 'var(--muted)' }}>
                            {c.count}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {c.targets.map(tName => (
                              <span key={tName} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--background)', color: 'var(--muted-foreground)' }}>
                                {tName}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {allCompetitors.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>No competitor data. Add competitors from target detail pages.</p>
              </div>
            )}
          </div>

          {/* Competitive density by vertical */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-sm">Competitive Density by Vertical</h3>
            </div>
            <div className="p-4 space-y-3">
              {verticals.map(vertical => {
                const vTargets = activeTargets.filter(t => t.vertical === vertical);
                const totalComps = vTargets.reduce((s, t) => s + t.competitors.length, 0);
                const uniqueComps = new Set(vTargets.flatMap(t => t.competitors.map(c => c.name))).size;
                const avgThreatV = totalComps > 0
                  ? vTargets.flatMap(t => t.competitors).reduce((s, c) => s + c.threat_level, 0) / totalComps
                  : 0;
                const maxWidth = Math.max(...verticals.map(v => activeTargets.filter(t => t.vertical === v).reduce((s, t) => s + t.competitors.length, 0)), 1);

                return (
                  <div key={vertical} className="flex items-center gap-3">
                    <span className="text-xs w-28 text-right truncate" style={{ color: 'var(--muted-foreground)' }}>{vertical}</span>
                    <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
                      <div
                        className="h-full rounded-full flex items-center px-2 transition-all"
                        style={{
                          width: `${Math.max((totalComps / maxWidth) * 100, totalComps > 0 ? 15 : 0)}%`,
                          background: `${threatColor(Math.round(avgThreatV))}44`,
                        }}
                      >
                        {totalComps > 0 && (
                          <span className="text-xs font-medium whitespace-nowrap" style={{ color: threatColor(Math.round(avgThreatV)) }}>
                            {uniqueComps} competitor{uniqueComps !== 1 ? 's' : ''} · threat {avgThreatV.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs w-8 text-right" style={{ color: 'var(--muted)' }}>{vTargets.length}t</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
