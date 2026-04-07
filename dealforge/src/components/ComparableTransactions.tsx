'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { VERTICALS, type Vertical } from '@/lib/types';
import { Plus, Trash2, ArrowUpDown, Zap, ChevronDown, ChevronUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompTransaction {
  id: string;
  target_name: string;
  acquirer_name: string;
  year: number;
  vertical: Vertical;
  revenue: number;
  arr: number;
  ebitda: number;
  enterprise_value: number;
  source_notes: string;
}

type SortField =
  | 'target_name' | 'acquirer_name' | 'year' | 'vertical'
  | 'revenue' | 'arr' | 'ebitda' | 'enterprise_value'
  | 'rev_multiple' | 'arr_multiple' | 'ebitda_multiple';

type SortDir = 'asc' | 'desc';

const STORAGE_KEY = 'dealforge_comps';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmt$(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtX(n: number | null): string {
  if (n === null || !isFinite(n)) return 'N/A';
  return `${n.toFixed(1)}x`;
}

function revMultiple(c: CompTransaction): number | null {
  return c.revenue > 0 ? c.enterprise_value / c.revenue : null;
}

function arrMultiple(c: CompTransaction): number | null {
  return c.arr > 0 ? c.enterprise_value / c.arr : null;
}

function ebitdaMultiple(c: CompTransaction): number | null {
  return c.ebitda > 0 ? c.enterprise_value / c.ebitda : null;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_COMPS: Omit<CompTransaction, 'id'>[] = [
  { target_name: 'VerticalSoft', acquirer_name: 'Vista Equity Partners', year: 2023, vertical: 'Healthcare', revenue: 45_000_000, arr: 38_000_000, ebitda: 12_000_000, enterprise_value: 190_000_000, source_notes: 'Healthcare SaaS platform; strong recurring revenue base' },
  { target_name: 'GovLogic', acquirer_name: 'Thoma Bravo', year: 2022, vertical: 'Local Government', revenue: 28_000_000, arr: 24_000_000, ebitda: 7_500_000, enterprise_value: 135_000_000, source_notes: 'Municipal permitting and licensing software' },
  { target_name: 'EduTrack Pro', acquirer_name: 'Vista Equity Partners', year: 2023, vertical: 'Education', revenue: 32_000_000, arr: 29_000_000, ebitda: 9_000_000, enterprise_value: 165_000_000, source_notes: 'K-12 student information system with 85% recurring' },
  { target_name: 'InsureMatrix', acquirer_name: 'Roper Technologies', year: 2021, vertical: 'Insurance', revenue: 55_000_000, arr: 48_000_000, ebitda: 18_000_000, enterprise_value: 310_000_000, source_notes: 'Policy administration platform for mid-market carriers' },
  { target_name: 'BuildPlan Systems', acquirer_name: 'Thoma Bravo', year: 2024, vertical: 'Construction', revenue: 18_000_000, arr: 15_000_000, ebitda: 4_200_000, enterprise_value: 78_000_000, source_notes: 'Project management SaaS for commercial contractors' },
  { target_name: 'UtiliSync', acquirer_name: 'Constellation Software', year: 2022, vertical: 'Utilities', revenue: 22_000_000, arr: 19_500_000, ebitda: 6_800_000, enterprise_value: 98_000_000, source_notes: 'Field service management for utility companies' },
  { target_name: 'AgriData Corp', acquirer_name: 'Vista Equity Partners', year: 2024, vertical: 'Agriculture', revenue: 15_000_000, arr: 12_000_000, ebitda: 3_500_000, enterprise_value: 62_000_000, source_notes: 'Precision agriculture data platform; growing ARR' },
  { target_name: 'LegalEdge', acquirer_name: 'Constellation Software', year: 2023, vertical: 'Legal', revenue: 40_000_000, arr: 35_000_000, ebitda: 14_000_000, enterprise_value: 220_000_000, source_notes: 'Practice management software for mid-size law firms' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ComparableTransactions() {
  const [comps, setComps] = useState<CompTransaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterVertical, setFilterVertical] = useState<string>('all');
  const [filterYearFrom, setFilterYearFrom] = useState<string>('');
  const [filterYearTo, setFilterYearTo] = useState<string>('');

  // Form state
  const emptyForm = {
    target_name: '', acquirer_name: '', year: new Date().getFullYear().toString(),
    vertical: VERTICALS[0] as string, revenue: '', arr: '', ebitda: '',
    enterprise_value: '', source_notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setComps(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Persist
  const persist = useCallback((next: CompTransaction[]) => {
    setComps(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  // Add transaction
  const handleAdd = () => {
    const c: CompTransaction = {
      id: uid(),
      target_name: form.target_name.trim(),
      acquirer_name: form.acquirer_name.trim(),
      year: parseInt(form.year) || new Date().getFullYear(),
      vertical: form.vertical as Vertical,
      revenue: parseFloat(form.revenue) || 0,
      arr: parseFloat(form.arr) || 0,
      ebitda: parseFloat(form.ebitda) || 0,
      enterprise_value: parseFloat(form.enterprise_value) || 0,
      source_notes: form.source_notes.trim(),
    };
    if (!c.target_name || !c.acquirer_name) return;
    persist([...comps, c]);
    setForm(emptyForm);
    setShowForm(false);
  };

  // Delete
  const handleDelete = (id: string) => {
    persist(comps.filter(c => c.id !== id));
  };

  // Seed
  const handleSeed = () => {
    const seeded = SEED_COMPS.map(s => ({ ...s, id: uid() }));
    persist([...comps, ...seeded]);
  };

  // Filtered comps
  const filtered = useMemo(() => {
    let result = [...comps];
    if (filterVertical !== 'all') result = result.filter(c => c.vertical === filterVertical);
    if (filterYearFrom) result = result.filter(c => c.year >= parseInt(filterYearFrom));
    if (filterYearTo) result = result.filter(c => c.year <= parseInt(filterYearTo));
    return result;
  }, [comps, filterVertical, filterYearFrom, filterYearTo]);

  // Sorted comps
  const sorted = useMemo(() => {
    const getVal = (c: CompTransaction, f: SortField): string | number => {
      switch (f) {
        case 'rev_multiple': return revMultiple(c) ?? -1;
        case 'arr_multiple': return arrMultiple(c) ?? -1;
        case 'ebitda_multiple': return ebitdaMultiple(c) ?? -1;
        default: return c[f as keyof CompTransaction] as string | number;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = getVal(a, sortField);
      const bv = getVal(b, sortField);
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortField, sortDir]);

  // Stats
  const stats = useMemo(() => {
    const revMs = filtered.map(revMultiple).filter((v): v is number => v !== null && isFinite(v));
    const arrMs = filtered.map(arrMultiple).filter((v): v is number => v !== null && isFinite(v));
    const ebitdaMs = filtered.map(ebitdaMultiple).filter((v): v is number => v !== null && isFinite(v));
    return {
      rev: { values: revMs, median: median(revMs), mean: mean(revMs), p25: percentile(revMs, 25), p75: percentile(revMs, 75) },
      arr: { values: arrMs, median: median(arrMs), mean: mean(arrMs), p25: percentile(arrMs, 25), p75: percentile(arrMs, 75) },
      ebitda: { values: ebitdaMs, median: median(ebitdaMs), mean: mean(ebitdaMs), p25: percentile(ebitdaMs, 25), p75: percentile(ebitdaMs, 75) },
    };
  }, [filtered]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  // Form computed multiples
  const formRev = parseFloat(form.revenue) || 0;
  const formArr = parseFloat(form.arr) || 0;
  const formEbitda = parseFloat(form.ebitda) || 0;
  const formEV = parseFloat(form.enterprise_value) || 0;

  const inputStyle: React.CSSProperties = {
    background: 'var(--background)', border: '1px solid var(--border)',
    borderRadius: '0.5rem', padding: '0.4rem 0.6rem', fontSize: '0.8rem',
    color: 'var(--foreground)', width: '100%',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Comparable Transactions</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Track M&A comparable transactions and valuation multiples
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent)' }}
          >
            <Zap size={12} /> Quick Add VMS Comps
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus size={12} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>New Comparable Transaction</h3>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>Target Company *</label>
              <input style={inputStyle} value={form.target_name} onChange={e => setForm({ ...form, target_name: e.target.value })} placeholder="Company name" />
            </div>
            <div>
              <label className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>Acquirer *</label>
              <input style={inputStyle} value={form.acquirer_name} onChange={e => setForm({ ...form, acquirer_name: e.target.value })} placeholder="Acquirer name" />
            </div>
            <div>
              <label className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>Year</label>
              <input style={inputStyle} type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>Vertical</label>
              <select style={inputStyle} value={form.vertical} onChange={e => setForm({ ...form, vertical: e.target.value })}>
                {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>Revenue ($)</label>
              <input style={inputStyle} type="number" value={form.revenue} onChange={e => setForm({ ...form, revenue: e.target.value })} placeholder="e.g. 25000000" />
            </div>
            <div>
              <label className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>ARR ($)</label>
              <input style={inputStyle} type="number" value={form.arr} onChange={e => setForm({ ...form, arr: e.target.value })} placeholder="e.g. 20000000" />
            </div>
            <div>
              <label className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>EBITDA ($)</label>
              <input style={inputStyle} type="number" value={form.ebitda} onChange={e => setForm({ ...form, ebitda: e.target.value })} placeholder="e.g. 6000000" />
            </div>
            <div>
              <label className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>Enterprise Value ($)</label>
              <input style={inputStyle} type="number" value={form.enterprise_value} onChange={e => setForm({ ...form, enterprise_value: e.target.value })} placeholder="e.g. 120000000" />
            </div>
          </div>
          {/* Auto-calculated multiples preview */}
          {formEV > 0 && (
            <div className="flex gap-4 text-xs" style={{ color: 'var(--muted)' }}>
              <span>EV/Revenue: <strong style={{ color: 'var(--foreground)' }}>{formRev > 0 ? fmtX(formEV / formRev) : 'N/A'}</strong></span>
              <span>EV/ARR: <strong style={{ color: 'var(--foreground)' }}>{formArr > 0 ? fmtX(formEV / formArr) : 'N/A'}</strong></span>
              <span>EV/EBITDA: <strong style={{ color: 'var(--foreground)' }}>{formEbitda > 0 ? fmtX(formEV / formEbitda) : 'N/A'}</strong></span>
            </div>
          )}
          <div>
            <label className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>Source / Notes</label>
            <input style={inputStyle} value={form.source_notes} onChange={e => setForm({ ...form, source_notes: e.target.value })} placeholder="Source or notes about this transaction" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: 'var(--muted)' }}>Cancel</button>
            <button onClick={handleAdd} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--accent)', color: 'white' }}>Save Transaction</button>
          </div>
        </div>
      )}

      {/* Filters */}
      {comps.length > 0 && (
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: 'var(--muted)' }}>Filter:</span>
          <select
            style={{ ...inputStyle, width: 'auto' }}
            value={filterVertical}
            onChange={e => setFilterVertical(e.target.value)}
          >
            <option value="all">All Verticals</option>
            {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <input
            style={{ ...inputStyle, width: '80px' }}
            type="number" placeholder="From year"
            value={filterYearFrom}
            onChange={e => setFilterYearFrom(e.target.value)}
          />
          <span style={{ color: 'var(--muted)' }}>to</span>
          <input
            style={{ ...inputStyle, width: '80px' }}
            type="number" placeholder="To year"
            value={filterYearTo}
            onChange={e => setFilterYearTo(e.target.value)}
          />
          <span style={{ color: 'var(--muted)' }}>
            Showing {filtered.length} of {comps.length} transactions
          </span>
        </div>
      )}

      {/* Sortable Table */}
      {sorted.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                  {([
                    ['target_name', 'Target'],
                    ['acquirer_name', 'Acquirer'],
                    ['year', 'Year'],
                    ['vertical', 'Vertical'],
                    ['revenue', 'Revenue'],
                    ['arr', 'ARR'],
                    ['ebitda', 'EBITDA'],
                    ['enterprise_value', 'EV'],
                    ['rev_multiple', 'EV/Rev'],
                    ['arr_multiple', 'EV/ARR'],
                    ['ebitda_multiple', 'EV/EBITDA'],
                  ] as [SortField, string][]).map(([field, label]) => (
                    <th
                      key={field}
                      className="p-2 text-left font-medium cursor-pointer select-none"
                      style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}
                      onClick={() => toggleSort(field)}
                    >
                      <span className="flex items-center gap-1">{label} <SortIcon field={field} /></span>
                    </th>
                  ))}
                  <th className="p-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="p-2 font-medium" style={{ whiteSpace: 'nowrap' }}>{c.target_name}</td>
                    <td className="p-2" style={{ whiteSpace: 'nowrap' }}>{c.acquirer_name}</td>
                    <td className="p-2 font-mono">{c.year}</td>
                    <td className="p-2">{c.vertical}</td>
                    <td className="p-2 font-mono">{fmt$(c.revenue)}</td>
                    <td className="p-2 font-mono">{fmt$(c.arr)}</td>
                    <td className="p-2 font-mono">{fmt$(c.ebitda)}</td>
                    <td className="p-2 font-mono">{fmt$(c.enterprise_value)}</td>
                    <td className="p-2 font-mono font-bold" style={{ color: 'var(--accent)' }}>{fmtX(revMultiple(c))}</td>
                    <td className="p-2 font-mono font-bold" style={{ color: 'var(--accent)' }}>{fmtX(arrMultiple(c))}</td>
                    <td className="p-2 font-mono font-bold" style={{ color: 'var(--accent)' }}>{fmtX(ebitdaMultiple(c))}</td>
                    <td className="p-2">
                      <button onClick={() => handleDelete(c.id)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--danger)' }}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aggregate Statistics */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {([
            { label: 'EV / Revenue', data: stats.rev },
            { label: 'EV / ARR', data: stats.arr },
            { label: 'EV / EBITDA', data: stats.ebitda },
          ] as const).map(({ label, data }) => (
            <div key={label} className="glass-card p-4 space-y-3">
              <h3 className="text-xs font-semibold">{label} Multiples</h3>
              {data.values.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span style={{ color: 'var(--muted)' }}>Median</span>
                      <div className="font-mono font-bold text-sm">{fmtX(data.median)}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--muted)' }}>Mean</span>
                      <div className="font-mono font-bold text-sm">{fmtX(data.mean)}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--muted)' }}>25th Pctl</span>
                      <div className="font-mono font-bold text-sm">{fmtX(data.p25)}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--muted)' }}>75th Pctl</span>
                      <div className="font-mono font-bold text-sm">{fmtX(data.p75)}</div>
                    </div>
                  </div>
                  {/* Distribution chart */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>Distribution</div>
                    {data.values.length > 0 && (() => {
                      const minV = Math.min(...data.values);
                      const maxV = Math.max(...data.values);
                      const range = maxV - minV || 1;
                      // pair each value with its index in the sorted filtered list
                      const items = data.values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
                      return (
                        <div className="space-y-0.5">
                          {items.map(({ v, i }) => {
                            const pct = ((v - minV) / range) * 100;
                            const isMedianClose = Math.abs(v - data.median) < range * 0.05;
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <div className="flex-1 h-4 rounded relative" style={{ background: 'var(--background)' }}>
                                  <div
                                    className="absolute inset-y-0 left-0 rounded"
                                    style={{
                                      width: `${Math.max(pct, 4)}%`,
                                      background: isMedianClose ? 'var(--success)' : 'rgba(59,130,246,0.4)',
                                    }}
                                  />
                                  {/* 25th/75th markers */}
                                  <div className="absolute inset-y-0" style={{ left: `${((data.p25 - minV) / range) * 100}%`, width: '1px', background: 'var(--warning)', opacity: 0.6 }} />
                                  <div className="absolute inset-y-0" style={{ left: `${((data.p75 - minV) / range) * 100}%`, width: '1px', background: 'var(--warning)', opacity: 0.6 }} />
                                </div>
                                <span className="text-[10px] font-mono w-10 text-right" style={{ color: 'var(--muted)' }}>{fmtX(v)}</span>
                              </div>
                            );
                          })}
                          <div className="flex items-center gap-3 text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded" style={{ background: 'rgba(59,130,246,0.4)' }} /> Deal</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded" style={{ background: 'var(--success)' }} /> Near Median</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-0.5" style={{ background: 'var(--warning)' }} /> P25/P75</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <div className="text-xs" style={{ color: 'var(--muted)' }}>No data</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {comps.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No comparable transactions yet.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Click &ldquo;Quick Add VMS Comps&rdquo; to seed reference data, or add transactions manually.
          </p>
        </div>
      )}
    </div>
  );
}
