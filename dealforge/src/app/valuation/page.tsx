'use client';

import { useEffect, useState } from 'react';
import { getTargets } from '@/lib/db';
import type { Target } from '@/lib/types';
import { Calculator, DollarSign, TrendingUp, Info, BarChart3, Printer } from 'lucide-react';

interface ValuationInputs {
  revenue: number;
  arr: number;
  recurringPct: number;
  grossMarginPct: number;
  ebitaMarginPct: number;
  yoyGrowthPct: number;
  customerCount: number;
  churnPct: number;
  // Multiples
  evRevenueMultiple: number;
  evArrMultiple: number;
  evEbitaMultiple: number;
}

interface ScenarioResult {
  label: string;
  evRevenue: number;
  evArr: number;
  evEbita: number;
  blended: number;
}

const VMS_BENCHMARKS = {
  evRevenue: { low: 1.5, median: 2.5, high: 4.0, premium: 6.0 },
  evArr: { low: 2.0, median: 3.5, high: 5.5, premium: 8.0 },
  evEbita: { low: 6.0, median: 10.0, high: 14.0, premium: 18.0 },
};

function fmt(n: number): string {
  if (!n || isNaN(n)) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function calculateScenarios(inputs: ValuationInputs): ScenarioResult[] {
  const ebita = inputs.revenue * (inputs.ebitaMarginPct / 100);
  const evR = inputs.revenue * inputs.evRevenueMultiple;
  const evA = inputs.arr * inputs.evArrMultiple;
  const evE = ebita * inputs.evEbitaMultiple;

  // Blended: weight ARR highest if recurring > 80%, else weight revenue highest
  const isHighRecurring = inputs.recurringPct >= 80;
  const blended = isHighRecurring
    ? evA * 0.5 + evR * 0.2 + evE * 0.3
    : evR * 0.4 + evA * 0.25 + evE * 0.35;

  // Conservative: use low-end multiples
  const consEvR = inputs.revenue * VMS_BENCHMARKS.evRevenue.low;
  const consEvA = inputs.arr * VMS_BENCHMARKS.evArr.low;
  const consEvE = ebita * VMS_BENCHMARKS.evEbita.low;
  const consBlended = isHighRecurring
    ? consEvA * 0.5 + consEvR * 0.2 + consEvE * 0.3
    : consEvR * 0.4 + consEvA * 0.25 + consEvE * 0.35;

  // Aggressive: use high-end multiples
  const aggEvR = inputs.revenue * VMS_BENCHMARKS.evRevenue.high;
  const aggEvA = inputs.arr * VMS_BENCHMARKS.evArr.high;
  const aggEvE = ebita * VMS_BENCHMARKS.evEbita.high;
  const aggBlended = isHighRecurring
    ? aggEvA * 0.5 + aggEvR * 0.2 + aggEvE * 0.3
    : aggEvR * 0.4 + aggEvA * 0.25 + aggEvE * 0.35;

  return [
    { label: 'Conservative', evRevenue: consEvR, evArr: consEvA, evEbita: consEvE, blended: consBlended },
    { label: 'Your Estimate', evRevenue: evR, evArr: evA, evEbita: evE, blended },
    { label: 'Aggressive', evRevenue: aggEvR, evArr: aggEvA, evEbita: aggEvE, blended: aggBlended },
  ];
}

export default function ValuationPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [inputs, setInputs] = useState<ValuationInputs>({
    revenue: 5_000_000,
    arr: 4_000_000,
    recurringPct: 80,
    grossMarginPct: 75,
    ebitaMarginPct: 25,
    yoyGrowthPct: 10,
    customerCount: 200,
    churnPct: 5,
    evRevenueMultiple: 2.5,
    evArrMultiple: 3.5,
    evEbitaMultiple: 10,
  });

  useEffect(() => {
    setTargets(getTargets());
  }, []);

  // Load target data when selected
  useEffect(() => {
    if (!selectedTarget) return;
    const t = targets.find(x => x.id === selectedTarget);
    if (!t) return;
    setInputs(prev => ({
      ...prev,
      revenue: t.revenue || prev.revenue,
      arr: t.arr || prev.arr,
      recurringPct: t.recurring_revenue_pct || prev.recurringPct,
      grossMarginPct: t.gross_margin_pct || prev.grossMarginPct,
      ebitaMarginPct: t.ebita_margin_pct || prev.ebitaMarginPct,
      yoyGrowthPct: t.yoy_growth_pct || prev.yoyGrowthPct,
      customerCount: t.customer_count || prev.customerCount,
    }));
  }, [selectedTarget, targets]);

  const scenarios = calculateScenarios(inputs);
  const ebita = inputs.revenue * (inputs.ebitaMarginPct / 100);
  const nrr = 100 - inputs.churnPct;
  const ltv = inputs.arr / inputs.customerCount * (1 / (inputs.churnPct / 100));
  const arpu = inputs.arr / (inputs.customerCount || 1);
  const revenuePerEmployee = inputs.revenue / 1; // placeholder, not in inputs
  const rule40 = inputs.yoyGrowthPct + inputs.ebitaMarginPct;

  // Quality premium/discount factors
  const qualityFactors: { label: string; impact: string; positive: boolean }[] = [];
  if (inputs.recurringPct >= 90) qualityFactors.push({ label: 'High Recurring Revenue (90%+)', impact: '+10-20% premium', positive: true });
  else if (inputs.recurringPct < 70) qualityFactors.push({ label: 'Low Recurring Revenue (<70%)', impact: '-10-20% discount', positive: false });
  if (inputs.churnPct <= 3) qualityFactors.push({ label: 'Very Low Churn (≤3%)', impact: '+15-25% premium', positive: true });
  else if (inputs.churnPct > 10) qualityFactors.push({ label: 'High Churn (>10%)', impact: '-15-25% discount', positive: false });
  if (inputs.grossMarginPct >= 80) qualityFactors.push({ label: 'High Gross Margin (80%+)', impact: '+5-10% premium', positive: true });
  if (inputs.yoyGrowthPct >= 20) qualityFactors.push({ label: 'Strong Growth (20%+)', impact: '+15-30% premium', positive: true });
  else if (inputs.yoyGrowthPct < 5) qualityFactors.push({ label: 'Low Growth (<5%)', impact: '-10-15% discount', positive: false });
  if (rule40 >= 40) qualityFactors.push({ label: 'Rule of 40 Pass', impact: 'Supports premium valuation', positive: true });
  if (inputs.customerCount >= 500) qualityFactors.push({ label: 'Large Customer Base (500+)', impact: '+5-10% premium', positive: true });
  else if (inputs.customerCount < 50) qualityFactors.push({ label: 'Small Customer Base (<50)', impact: 'Concentration risk', positive: false });

  // 5-year projection
  const projections = Array.from({ length: 5 }, (_, i) => {
    const year = i + 1;
    const projRevenue = inputs.revenue * Math.pow(1 + inputs.yoyGrowthPct / 100, year);
    const projArr = inputs.arr * Math.pow(1 + inputs.yoyGrowthPct / 100, year);
    const projEbita = projRevenue * (inputs.ebitaMarginPct / 100);
    return { year, revenue: projRevenue, arr: projArr, ebita: projEbita };
  });

  const updateInput = (key: keyof ValuationInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator size={24} style={{ color: 'var(--accent)' }} /> Valuation Calculator
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            VMS acquisition valuation model with scenario analysis
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedTarget}
            onChange={e => setSelectedTarget(e.target.value)}
            className="text-sm"
          >
            <option value="">Load from target...</option>
            {targets.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Inputs */}
        <div className="space-y-4 print:hidden">
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Company Financials
            </h3>
            <InputField label="Total Revenue" value={inputs.revenue} onChange={v => updateInput('revenue', v)} prefix="$" step={100000} />
            <InputField label="Annual Recurring Revenue (ARR)" value={inputs.arr} onChange={v => updateInput('arr', v)} prefix="$" step={100000} />
            <InputField label="Recurring Revenue %" value={inputs.recurringPct} onChange={v => updateInput('recurringPct', v)} suffix="%" max={100} />
            <InputField label="Gross Margin %" value={inputs.grossMarginPct} onChange={v => updateInput('grossMarginPct', v)} suffix="%" max={100} />
            <InputField label="EBITA Margin %" value={inputs.ebitaMarginPct} onChange={v => updateInput('ebitaMarginPct', v)} suffix="%" max={100} min={-50} />
            <InputField label="YoY Growth %" value={inputs.yoyGrowthPct} onChange={v => updateInput('yoyGrowthPct', v)} suffix="%" min={-50} max={200} />
            <InputField label="Customer Count" value={inputs.customerCount} onChange={v => updateInput('customerCount', v)} step={10} min={1} />
            <InputField label="Annual Churn %" value={inputs.churnPct} onChange={v => updateInput('churnPct', v)} suffix="%" max={50} />
          </div>

          <div className="glass-card p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Valuation Multiples
            </h3>
            <InputField label="EV / Revenue" value={inputs.evRevenueMultiple} onChange={v => updateInput('evRevenueMultiple', v)} suffix="x" step={0.1} min={0} max={20} decimal />
            <InputField label="EV / ARR" value={inputs.evArrMultiple} onChange={v => updateInput('evArrMultiple', v)} suffix="x" step={0.1} min={0} max={20} decimal />
            <InputField label="EV / EBITA" value={inputs.evEbitaMultiple} onChange={v => updateInput('evEbitaMultiple', v)} suffix="x" step={0.5} min={0} max={30} decimal />
            {/* VMS Benchmark reference */}
            <div className="text-xs space-y-1 pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              <div className="font-medium mb-1">VMS Benchmarks:</div>
              <div className="flex justify-between"><span>EV/Revenue</span><span>{VMS_BENCHMARKS.evRevenue.low}x – {VMS_BENCHMARKS.evRevenue.high}x</span></div>
              <div className="flex justify-between"><span>EV/ARR</span><span>{VMS_BENCHMARKS.evArr.low}x – {VMS_BENCHMARKS.evArr.high}x</span></div>
              <div className="flex justify-between"><span>EV/EBITA</span><span>{VMS_BENCHMARKS.evEbita.low}x – {VMS_BENCHMARKS.evEbita.high}x</span></div>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card p-3 text-center">
              <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>{fmt(ebita)}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>EBITA</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-lg font-bold font-mono" style={{ color: nrr >= 95 ? 'var(--success)' : nrr >= 90 ? 'var(--warning)' : 'var(--danger)' }}>{nrr}%</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Net Retention</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-lg font-bold font-mono">{fmt(arpu)}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>ARPU</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="text-lg font-bold font-mono" style={{ color: rule40 >= 40 ? 'var(--success)' : 'var(--warning)' }}>{rule40}%</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Rule of 40</div>
            </div>
          </div>

          {/* Scenario Table */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
              Scenario Analysis
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Scenario</th>
                  <th className="text-right p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>EV/Revenue</th>
                  <th className="text-right p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>EV/ARR</th>
                  <th className="text-right p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>EV/EBITA</th>
                  <th className="text-right p-2 text-xs font-semibold" style={{ color: 'var(--accent)' }}>Blended EV</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s, i) => (
                  <tr key={s.label} style={{ borderBottom: '1px solid var(--border)', background: i === 1 ? 'var(--accent-muted)' : undefined }}>
                    <td className="p-2 font-medium">{s.label}</td>
                    <td className="p-2 text-right font-mono text-xs">{fmt(s.evRevenue)}</td>
                    <td className="p-2 text-right font-mono text-xs">{fmt(s.evArr)}</td>
                    <td className="p-2 text-right font-mono text-xs">{fmt(s.evEbita)}</td>
                    <td className="p-2 text-right font-mono font-bold" style={{ color: 'var(--accent)' }}>{fmt(s.blended)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
              Blended EV weights: {inputs.recurringPct >= 80 ? '50% ARR, 30% EBITA, 20% Revenue' : '40% Revenue, 35% EBITA, 25% ARR'}
            </div>
          </div>

          {/* Valuation Range Visual */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--accent)' }}>
              Valuation Range
            </h3>
            <div className="space-y-4">
              {scenarios.map((s, i) => {
                const maxVal = Math.max(...scenarios.map(x => x.blended));
                const pct = maxVal > 0 ? (s.blended / maxVal) * 100 : 0;
                const colors = ['var(--warning)', 'var(--accent)', 'var(--success)'];
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className="font-mono font-bold text-sm" style={{ color: colors[i] }}>{fmt(s.blended)}</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: colors[i] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quality Factors */}
          {qualityFactors.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
                Valuation Quality Factors
              </h3>
              <div className="space-y-2">
                {qualityFactors.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded text-sm" style={{
                    background: f.positive ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                  }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{
                      background: f.positive ? 'var(--success)' : 'var(--danger)',
                    }} />
                    <span className="flex-1">{f.label}</span>
                    <span className="text-xs font-medium" style={{
                      color: f.positive ? 'var(--success)' : 'var(--danger)',
                    }}>{f.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5-Year Projection */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
              <TrendingUp size={14} /> 5-Year Revenue Projection ({inputs.yoyGrowthPct}% CAGR)
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Year</th>
                  <th className="text-right p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Revenue</th>
                  <th className="text-right p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>ARR</th>
                  <th className="text-right p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>EBITA</th>
                  <th className="text-right p-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Implied EV (Your Multiple)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--accent-muted)' }}>
                  <td className="p-2 font-medium">Current</td>
                  <td className="p-2 text-right font-mono text-xs">{fmt(inputs.revenue)}</td>
                  <td className="p-2 text-right font-mono text-xs">{fmt(inputs.arr)}</td>
                  <td className="p-2 text-right font-mono text-xs">{fmt(ebita)}</td>
                  <td className="p-2 text-right font-mono text-xs font-bold" style={{ color: 'var(--accent)' }}>{fmt(scenarios[1].blended)}</td>
                </tr>
                {projections.map(p => (
                  <tr key={p.year} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="p-2 font-medium">Year {p.year}</td>
                    <td className="p-2 text-right font-mono text-xs">{fmt(p.revenue)}</td>
                    <td className="p-2 text-right font-mono text-xs">{fmt(p.arr)}</td>
                    <td className="p-2 text-right font-mono text-xs">{fmt(p.ebita)}</td>
                    <td className="p-2 text-right font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {fmt(p.arr * inputs.evArrMultiple * 0.5 + p.revenue * inputs.evRevenueMultiple * 0.2 + p.ebita * inputs.evEbitaMultiple * 0.3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sensitivity Analysis */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
              <BarChart3 size={14} /> Sensitivity Analysis — Blended EV
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
              How blended enterprise value changes with growth rate (rows) and EBITA margin (columns)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="p-1.5 text-left" style={{ color: 'var(--muted)', minWidth: 80 }}>Growth \ Margin</th>
                    {[-5, 0, 5, 10, 15].map(delta => {
                      const margin = inputs.ebitaMarginPct + delta;
                      const isCurrent = delta === 0;
                      return (
                        <th key={delta} className="p-1.5 text-right font-mono" style={{ color: isCurrent ? 'var(--accent)' : 'var(--muted-foreground)', fontWeight: isCurrent ? 700 : 400 }}>
                          {margin}%
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[-5, -2, 0, 2, 5, 10].map(growthDelta => {
                    const growth = inputs.yoyGrowthPct + growthDelta;
                    const isCurrentGrowth = growthDelta === 0;
                    return (
                      <tr key={growthDelta} style={{ borderBottom: '1px solid var(--border)', background: isCurrentGrowth ? 'var(--accent-muted)' : undefined }}>
                        <td className="p-1.5 font-mono" style={{ color: isCurrentGrowth ? 'var(--accent)' : 'var(--muted-foreground)', fontWeight: isCurrentGrowth ? 700 : 400 }}>
                          {growth}% growth
                        </td>
                        {[-5, 0, 5, 10, 15].map(marginDelta => {
                          const margin = inputs.ebitaMarginPct + marginDelta;
                          const isCurrent = growthDelta === 0 && marginDelta === 0;
                          const sensInputs = { ...inputs, yoyGrowthPct: growth, ebitaMarginPct: margin };
                          const sensScenarios = calculateScenarios(sensInputs);
                          const ev = sensScenarios[1].blended;
                          return (
                            <td key={marginDelta} className="p-1.5 text-right font-mono" style={{
                              color: isCurrent ? 'var(--accent)' : 'var(--foreground)',
                              fontWeight: isCurrent ? 700 : 400,
                              background: isCurrent ? 'rgba(59,130,246,0.1)' : undefined,
                            }}>
                              {fmt(ev)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* IRR / Payback */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
              Return Analysis
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(() => {
                const purchasePrice = scenarios[1].blended;
                const yearlyFcf = ebita * 0.85; // ~85% FCF conversion
                const paybackYears = purchasePrice > 0 ? purchasePrice / yearlyFcf : 0;
                const y5Ebita = projections[4]?.ebita || ebita;
                const exitEv = y5Ebita * inputs.evEbitaMultiple;
                const totalReturn = purchasePrice > 0 ? ((exitEv + yearlyFcf * 5) / purchasePrice) : 0;
                const moic = totalReturn;
                const irr = purchasePrice > 0 ? (Math.pow(totalReturn, 1/5) - 1) * 100 : 0;

                return (
                  <>
                    <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                      <div className="text-lg font-bold font-mono" style={{ color: paybackYears <= 5 ? 'var(--success)' : 'var(--warning)' }}>
                        {paybackYears > 0 ? `${paybackYears.toFixed(1)}yr` : '—'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>FCF Payback</div>
                    </div>
                    <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                      <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>{fmt(yearlyFcf)}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>Est. Annual FCF</div>
                    </div>
                    <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                      <div className="text-lg font-bold font-mono" style={{ color: moic >= 3 ? 'var(--success)' : 'var(--warning)' }}>
                        {moic > 0 ? `${moic.toFixed(1)}x` : '—'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>5yr MOIC</div>
                    </div>
                    <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                      <div className="text-lg font-bold font-mono" style={{ color: irr >= 20 ? 'var(--success)' : irr >= 15 ? 'var(--warning)' : 'var(--danger)' }}>
                        {irr > 0 ? `${irr.toFixed(0)}%` : '—'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>5yr IRR</div>
                    </div>
                  </>
                );
              })()}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
              Assumes 85% FCF conversion, constant multiples at exit, {inputs.yoyGrowthPct}% CAGR. Permanent hold model — exit multiples shown for reference only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, prefix, suffix, step = 1, min = 0, max, decimal }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  decimal?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{prefix}</span>}
        <input
          type="number"
          value={decimal ? value : Math.round(value)}
          onChange={e => onChange(Number(e.target.value))}
          step={step}
          min={min}
          max={max}
          className="w-full text-sm font-mono"
        />
        {suffix && <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{suffix}</span>}
      </div>
    </div>
  );
}
