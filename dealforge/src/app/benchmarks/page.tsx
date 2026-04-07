'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTargets } from '@/lib/db';
import type { Target } from '@/lib/types';
import { BarChart3, Target as TargetIcon, TrendingUp, CheckCircle2, XCircle, Minus } from 'lucide-react';
import Link from 'next/link';

interface Benchmark {
  label: string;
  category: string;
  poor: string;
  average: string;
  good: string;
  excellent: string;
  unit: string;
  getValue: (t: Target) => number | null;
  thresholds: [number, number, number]; // poor/avg boundary, avg/good boundary, good/excellent boundary
  higherIsBetter: boolean;
}

const VMS_BENCHMARKS: Benchmark[] = [
  // Financial
  {
    label: 'Recurring Revenue %', category: 'Financial',
    poor: '<60%', average: '60-75%', good: '75-85%', excellent: '>85%', unit: '%',
    getValue: t => t.recurring_revenue_pct ?? null,
    thresholds: [60, 75, 85], higherIsBetter: true,
  },
  {
    label: 'Gross Margin', category: 'Financial',
    poor: '<60%', average: '60-70%', good: '70-80%', excellent: '>80%', unit: '%',
    getValue: t => t.gross_margin_pct ?? null,
    thresholds: [60, 70, 80], higherIsBetter: true,
  },
  {
    label: 'EBITA Margin', category: 'Financial',
    poor: '<10%', average: '10-18%', good: '18-25%', excellent: '>25%', unit: '%',
    getValue: t => t.ebita_margin_pct ?? null,
    thresholds: [10, 18, 25], higherIsBetter: true,
  },
  {
    label: 'YoY Revenue Growth', category: 'Financial',
    poor: '<3%', average: '3-8%', good: '8-15%', excellent: '>15%', unit: '%',
    getValue: t => t.yoy_growth_pct ?? null,
    thresholds: [3, 8, 15], higherIsBetter: true,
  },
  {
    label: 'Revenue per Employee', category: 'Efficiency',
    poor: '<$80K', average: '$80-120K', good: '$120-180K', excellent: '>$180K', unit: '$K',
    getValue: t => (t.revenue && t.employee_count) ? t.revenue / t.employee_count / 1000 : null,
    thresholds: [80, 120, 180], higherIsBetter: true,
  },
  {
    label: 'ARR per Customer', category: 'Efficiency',
    poor: '<$5K', average: '$5-15K', good: '$15-40K', excellent: '>$40K', unit: '$K',
    getValue: t => (t.arr && t.customer_count) ? t.arr / t.customer_count / 1000 : null,
    thresholds: [5, 15, 40], higherIsBetter: true,
  },
  // Scale
  {
    label: 'Revenue', category: 'Scale',
    poor: '<$1M', average: '$1-3M', good: '$3-8M', excellent: '>$8M', unit: '$M',
    getValue: t => t.revenue ? t.revenue / 1_000_000 : null,
    thresholds: [1, 3, 8], higherIsBetter: true,
  },
  {
    label: 'ARR', category: 'Scale',
    poor: '<$1M', average: '$1-3M', good: '$3-6M', excellent: '>$6M', unit: '$M',
    getValue: t => t.arr ? t.arr / 1_000_000 : null,
    thresholds: [1, 3, 6], higherIsBetter: true,
  },
  {
    label: 'Customer Count', category: 'Scale',
    poor: '<50', average: '50-150', good: '150-400', excellent: '>400', unit: '',
    getValue: t => t.customer_count ?? null,
    thresholds: [50, 150, 400], higherIsBetter: true,
  },
  {
    label: 'Employee Count', category: 'Scale',
    poor: '<10', average: '10-25', good: '25-50', excellent: '>50', unit: '',
    getValue: t => t.employee_count ?? null,
    thresholds: [10, 25, 50], higherIsBetter: true,
  },
  // Scoring
  {
    label: 'Weighted Score', category: 'Scoring',
    poor: '<2.5', average: '2.5-3.2', good: '3.2-4.0', excellent: '>4.0', unit: '/5',
    getValue: t => t.weighted_score ?? null,
    thresholds: [2.5, 3.2, 4.0], higherIsBetter: true,
  },
];

const VALUATION_RANGES = [
  { label: 'EV / Revenue', low: '1.5x', mid: '2.5-4.0x', high: '4.0-6.0x', notes: 'Higher multiples for >80% recurring, >75% GM' },
  { label: 'EV / ARR', low: '2.0x', mid: '3.5-5.5x', high: '5.5-8.0x', notes: 'Primary metric for high-recurring businesses' },
  { label: 'EV / EBITA', low: '6.0x', mid: '8.0-12.0x', high: '12.0-18.0x', notes: 'Preferred for profitable, stable businesses' },
];

function getRating(value: number, benchmark: Benchmark): 'poor' | 'average' | 'good' | 'excellent' {
  const [t1, t2, t3] = benchmark.thresholds;
  if (benchmark.higherIsBetter) {
    if (value >= t3) return 'excellent';
    if (value >= t2) return 'good';
    if (value >= t1) return 'average';
    return 'poor';
  }
  if (value <= t1) return 'excellent';
  if (value <= t2) return 'good';
  if (value <= t3) return 'average';
  return 'poor';
}

const RATING_COLORS = {
  poor: 'var(--danger)',
  average: 'var(--warning)',
  good: 'var(--accent)',
  excellent: 'var(--success)',
};

const RATING_ICONS = {
  poor: <XCircle size={14} />,
  average: <Minus size={14} />,
  good: <CheckCircle2 size={14} />,
  excellent: <CheckCircle2 size={14} />,
};

export default function BenchmarksPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('portfolio');

  useEffect(() => {
    setTargets(getTargets());
  }, []);

  const activeTargets = useMemo(() =>
    targets.filter(t => !['closed_lost'].includes(t.stage)),
    [targets]
  );

  // Calculate portfolio averages
  const getPortfolioAvg = (benchmark: Benchmark): number | null => {
    const values = activeTargets.map(t => benchmark.getValue(t)).filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
  };

  const currentTarget = selectedTarget === 'portfolio'
    ? null
    : activeTargets.find(t => t.id === selectedTarget);

  const categories = Array.from(new Set(VMS_BENCHMARKS.map(b => b.category)));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><BarChart3 size={22} /> VMS Benchmarks</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Industry benchmarks for vertical market software acquisitions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Compare:</span>
          <select
            value={selectedTarget}
            onChange={e => setSelectedTarget(e.target.value)}
            className="text-sm"
          >
            <option value="portfolio">Portfolio Average ({activeTargets.length} targets)</option>
            {activeTargets.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Benchmark categories */}
      {categories.map(category => (
        <div key={category} className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-semibold text-sm">{category} Benchmarks</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                  <th className="text-left p-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>Metric</th>
                  <th className="text-center p-3 text-xs font-medium" style={{ color: RATING_COLORS.poor }}>Poor</th>
                  <th className="text-center p-3 text-xs font-medium" style={{ color: RATING_COLORS.average }}>Average</th>
                  <th className="text-center p-3 text-xs font-medium" style={{ color: RATING_COLORS.good }}>Good</th>
                  <th className="text-center p-3 text-xs font-medium" style={{ color: RATING_COLORS.excellent }}>Excellent</th>
                  <th className="text-center p-3 text-xs font-medium" style={{ color: 'var(--accent)' }}>
                    {currentTarget ? currentTarget.name : 'Your Pipeline'}
                  </th>
                  <th className="text-center p-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>Rating</th>
                </tr>
              </thead>
              <tbody>
                {VMS_BENCHMARKS.filter(b => b.category === category).map(b => {
                  const value = currentTarget ? b.getValue(currentTarget) : getPortfolioAvg(b);
                  const rating = value !== null ? getRating(value, b) : null;

                  return (
                    <tr key={b.label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-3 font-medium">{b.label}</td>
                      <td className="p-3 text-center text-xs" style={{ color: 'var(--muted)' }}>{b.poor}</td>
                      <td className="p-3 text-center text-xs" style={{ color: 'var(--muted)' }}>{b.average}</td>
                      <td className="p-3 text-center text-xs" style={{ color: 'var(--muted)' }}>{b.good}</td>
                      <td className="p-3 text-center text-xs" style={{ color: 'var(--muted)' }}>{b.excellent}</td>
                      <td className="p-3 text-center">
                        {value !== null ? (
                          <span className="font-mono font-bold" style={{ color: rating ? RATING_COLORS[rating] : 'var(--foreground)' }}>
                            {value < 1 && b.unit === '$M' ? `$${(value * 1000).toFixed(0)}K` : value >= 100 ? value.toFixed(0) : value.toFixed(1)}{b.unit !== '$M' && b.unit !== '$K' && b.unit !== '' ? b.unit : ''}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>N/A</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {rating ? (
                          <span className="flex items-center justify-center gap-1 text-xs font-medium capitalize" style={{ color: RATING_COLORS[rating] }}>
                            {RATING_ICONS[rating]} {rating}
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
          </div>
        </div>
      ))}

      {/* Valuation Benchmarks */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm">VMS Valuation Multiples (Typical Ranges)</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Based on VMS acquisition data. Actual multiples vary by recurring %, growth, margins, and market position.
          </p>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {VALUATION_RANGES.map(v => (
              <div key={v.label} className="flex items-center gap-4">
                <div className="w-28 text-sm font-medium text-right">{v.label}</div>
                <div className="flex-1 h-10 rounded-lg overflow-hidden flex" style={{ background: 'var(--background)' }}>
                  <div className="flex items-center justify-center px-3" style={{ background: 'rgba(239,68,68,0.15)', width: '25%' }}>
                    <span className="text-xs font-mono" style={{ color: 'var(--danger)' }}>{v.low}</span>
                  </div>
                  <div className="flex items-center justify-center px-3" style={{ background: 'rgba(59,130,246,0.15)', width: '45%' }}>
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>{v.mid}</span>
                  </div>
                  <div className="flex items-center justify-center px-3" style={{ background: 'rgba(16,185,129,0.15)', width: '30%' }}>
                    <span className="text-xs font-mono" style={{ color: 'var(--success)' }}>{v.high}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1.5">
            {VALUATION_RANGES.map(v => (
              <div key={v.label} className="text-xs flex items-start gap-2" style={{ color: 'var(--muted)' }}>
                <span className="font-medium flex-shrink-0">{v.label}:</span>
                <span>{v.notes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
            VMS Acquisition Criteria
          </h3>
          <div className="space-y-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {[
              'Recurring revenue >75% of total revenue',
              'Gross margins >70%',
              'Mission-critical software embedded in customer operations',
              'Low customer churn (<5% annual gross)',
              'Diversified customer base (no customer >10%)',
              'Fragmented competitive landscape',
              'Strong market position in defined vertical niche',
              'Motivated seller with reasonable valuation expectations',
              'Capable management team willing to stay post-close',
              'Clean technology stack with manageable tech debt',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <XCircle size={16} style={{ color: 'var(--danger)' }} />
            Red Flags to Watch For
          </h3>
          <div className="space-y-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {[
              'Customer concentration >15% single customer',
              'Declining recurring revenue percentage',
              'Key person dependency with no succession plan',
              'Technical debt requiring major replatforming',
              'Pending litigation or regulatory issues',
              'Declining gross margins or EBITA',
              'High employee turnover or low morale',
              'Competitive threat from well-funded entrant',
              'Founder demanding unrealistic valuation',
              'Revenue dependent on one-time projects/services',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <XCircle size={12} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--danger)' }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rule of 40 analysis */}
      {activeTargets.filter(t => t.yoy_growth_pct !== undefined && t.ebita_margin_pct !== undefined).length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-semibold text-sm">Rule of 40 Analysis</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              Revenue Growth % + EBITA Margin % ≥ 40% indicates a healthy SaaS/VMS business
            </p>
          </div>
          <div className="p-4 space-y-3">
            {activeTargets
              .filter(t => t.yoy_growth_pct !== undefined && t.ebita_margin_pct !== undefined)
              .map(t => {
                const ro40 = (t.yoy_growth_pct || 0) + (t.ebita_margin_pct || 0);
                const passes = ro40 >= 40;
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <Link href={`/targets/${t.id}`} className="w-36 text-sm font-medium truncate hover:underline" style={{ color: 'var(--accent)' }}>
                      {t.name}
                    </Link>
                    <div className="flex-1 h-6 rounded-full overflow-hidden relative" style={{ background: 'var(--background)' }}>
                      {/* Growth portion */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-l-full flex items-center px-2"
                        style={{ width: `${Math.min((t.yoy_growth_pct || 0) / 60 * 100, 100)}%`, background: 'rgba(59,130,246,0.4)' }}
                      >
                        {(t.yoy_growth_pct || 0) > 5 && (
                          <span className="text-[10px] font-mono text-white whitespace-nowrap">{t.yoy_growth_pct}% growth</span>
                        )}
                      </div>
                      {/* Margin portion */}
                      <div
                        className="absolute inset-y-0 rounded-r-full flex items-center justify-end px-2"
                        style={{
                          left: `${Math.min((t.yoy_growth_pct || 0) / 60 * 100, 100)}%`,
                          width: `${Math.min((t.ebita_margin_pct || 0) / 60 * 100, 100)}%`,
                          background: 'rgba(16,185,129,0.4)',
                        }}
                      >
                        {(t.ebita_margin_pct || 0) > 8 && (
                          <span className="text-[10px] font-mono text-white whitespace-nowrap">{t.ebita_margin_pct}% margin</span>
                        )}
                      </div>
                      {/* Rule of 40 line */}
                      <div className="absolute inset-y-0" style={{ left: `${40 / 60 * 100}%`, width: '2px', background: passes ? 'var(--success)' : 'var(--danger)' }} />
                    </div>
                    <span className="w-16 text-right font-mono text-sm font-bold" style={{ color: passes ? 'var(--success)' : ro40 >= 30 ? 'var(--warning)' : 'var(--danger)' }}>
                      {ro40}%
                    </span>
                  </div>
                );
              })}
            <div className="flex items-center gap-4 text-xs pt-2" style={{ color: 'var(--muted)' }}>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'rgba(59,130,246,0.4)' }} /> Growth</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'rgba(16,185,129,0.4)' }} /> EBITA Margin</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: 'var(--success)' }} /> Rule of 40 threshold</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
