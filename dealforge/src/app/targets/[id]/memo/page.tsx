'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { getTarget, getContacts, getTouchpoints, getDealTerms, getDDProjectByTarget, getDDRisks } from '@/lib/db';
import { DEAL_STAGES, SCORE_CRITERIA } from '@/lib/types';
import type { Target, Contact, Touchpoint, DealTerm, DDProject, DDRisk } from '@/lib/types';

function fmt(n?: number): string {
  if (!n) return 'N/A';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function MemoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [target, setTarget] = useState<Target | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [terms, setTerms] = useState<DealTerm[]>([]);
  const [ddProject, setDDProject] = useState<DDProject | null>(null);
  const [risks, setRisks] = useState<DDRisk[]>([]);

  useEffect(() => {
    const t = getTarget(id);
    if (!t) { router.push('/targets'); return; }
    setTarget(t);
    setContacts(getContacts(id));
    setTouchpoints(getTouchpoints(id));
    setTerms(getDealTerms(id));
    const dd = getDDProjectByTarget(id);
    setDDProject(dd || null);
    if (dd) setRisks(getDDRisks(dd.id));
  }, [id, router]);

  if (!target) return null;

  const stage = DEAL_STAGES.find(s => s.key === target.stage);
  const daysInPipeline = Math.floor((Date.now() - new Date(target.created_at).getTime()) / 86400000);
  const primaryContact = contacts.find(c => c.is_primary);

  // Thesis
  const thesisRaw = typeof window !== 'undefined' ? localStorage.getItem(`dealforge_thesis_${id}`) : null;
  const thesis = thesisRaw ? JSON.parse(thesisRaw) : null;

  return (
    <div>
      {/* Print controls - hidden when printing */}
      <div className="print:hidden p-4 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <Link href={`/targets/${id}`} className="btn btn-ghost btn-sm">
          <ArrowLeft size={14} /> Back to Target
        </Link>
        <button onClick={() => window.print()} className="btn btn-primary btn-sm ml-auto">
          <Printer size={14} /> Print Memo
        </button>
      </div>

      {/* Printable memo */}
      <div className="max-w-3xl mx-auto p-8 print:p-0 print:max-w-none" style={{ fontFamily: 'Georgia, serif' }}>
        {/* Header */}
        <div className="text-center mb-8 pb-4" style={{ borderBottom: '3px double var(--border)' }}>
          <div className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--muted)' }}>Confidential Investment Memo</div>
          <h1 className="text-3xl font-bold mb-2">{target.name}</h1>
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {target.vertical} · {target.geography || 'Geography TBD'} · {stage?.label}
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
            Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · {daysInPipeline} days in pipeline
          </div>
        </div>

        {/* Executive Summary */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Executive Summary</h2>
          <p className="text-sm leading-relaxed">
            {target.name} is a {target.vertical.toLowerCase()} vertical market software company
            {target.geography ? ` headquartered in ${target.geography}` : ''}.
            {target.description ? ` ${target.description}` : ''}
          </p>
          {thesis?.thesis && (
            <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--background)' }}>
              <h3 className="text-sm font-bold mb-1">Investment Thesis</h3>
              <p className="text-sm whitespace-pre-wrap">{thesis.thesis}</p>
            </div>
          )}
        </section>

        {/* Key Financials */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Key Financials</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Revenue', value: fmt(target.revenue) },
              { label: 'ARR', value: fmt(target.arr) },
              { label: 'Recurring Rev %', value: target.recurring_revenue_pct ? `${target.recurring_revenue_pct}%` : 'N/A' },
              { label: 'Gross Margin', value: target.gross_margin_pct ? `${target.gross_margin_pct}%` : 'N/A' },
              { label: 'EBITA', value: fmt(target.ebita) },
              { label: 'EBITA Margin', value: target.ebita_margin_pct ? `${target.ebita_margin_pct}%` : 'N/A' },
              { label: 'YoY Growth', value: target.yoy_growth_pct ? `${target.yoy_growth_pct}%` : 'N/A' },
              { label: 'Customer Count', value: target.customer_count?.toLocaleString() || 'N/A' },
              { label: 'Employee Count', value: target.employee_count?.toLocaleString() || 'N/A' },
            ].map(f => (
              <div key={f.label} className="p-2 rounded" style={{ background: 'var(--background)' }}>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{f.label}</div>
                <div className="text-sm font-bold font-mono">{f.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Valuation & Multiples */}
        {target.asking_price && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Valuation</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded" style={{ background: 'var(--background)' }}>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>Asking Price</div>
                <div className="text-xl font-bold font-mono" style={{ color: 'var(--success)' }}>{fmt(target.asking_price)}</div>
              </div>
              <div className="space-y-2">
                {target.revenue && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--muted-foreground)' }}>EV / Revenue</span>
                    <span className="font-mono font-bold">{(target.asking_price / target.revenue).toFixed(1)}x</span>
                  </div>
                )}
                {target.arr && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--muted-foreground)' }}>EV / ARR</span>
                    <span className="font-mono font-bold">{(target.asking_price / target.arr).toFixed(1)}x</span>
                  </div>
                )}
                {target.ebita && target.ebita > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--muted-foreground)' }}>EV / EBITA</span>
                    <span className="font-mono font-bold">{(target.asking_price / target.ebita).toFixed(1)}x</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Acquisition Scorecard */}
        {target.score && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>VMS Acquisition Scorecard</h2>
            <div className="space-y-2">
              {SCORE_CRITERIA.map(c => {
                const val = target.score![c.key];
                return (
                  <div key={c.key} className="flex items-center gap-3 text-sm">
                    <span className="w-44" style={{ color: 'var(--muted-foreground)' }}>{c.label}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <div key={n} className="w-5 h-5 rounded" style={{
                          background: n <= val ? (val >= 4 ? 'var(--success)' : val >= 3 ? 'var(--warning)' : 'var(--danger)') : 'var(--background)',
                        }} />
                      ))}
                    </div>
                    <span className="font-mono text-xs">{val}/5 (x{c.weight})</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="font-bold">Weighted Score</span>
                <span className="text-xl font-bold font-mono" style={{
                  color: (target.weighted_score || 0) >= 4 ? 'var(--success)' : (target.weighted_score || 0) >= 3 ? 'var(--warning)' : 'var(--danger)',
                }}>
                  {target.weighted_score?.toFixed(1)} / 5.0
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Deal Terms */}
        {terms.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Deal Terms</h2>
            <div className="space-y-1">
              {terms.map(t => (
                <div key={t.id} className="flex items-baseline gap-2 text-sm py-1">
                  <span className="w-44" style={{ color: 'var(--muted-foreground)' }}>{t.label}</span>
                  <span className="font-medium">{t.value}</span>
                  {t.notes && <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>({t.notes})</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Key Contacts */}
        {contacts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Key Contacts</h2>
            <div className="space-y-2">
              {contacts.map(c => (
                <div key={c.id} className="text-sm">
                  <span className="font-medium">{c.name}</span>
                  {c.title && <span style={{ color: 'var(--muted-foreground)' }}> — {c.title}</span>}
                  {c.is_primary && <span className="text-xs ml-1" style={{ color: 'var(--accent)' }}>(Primary)</span>}
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {[c.email, c.phone].filter(Boolean).join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* DD Status */}
        {ddProject && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Due Diligence Status</h2>
            <div className="text-sm space-y-1">
              <div>Phase: <span className="font-medium capitalize">{ddProject.phase}</span> · Progress: <span className="font-mono font-bold">{ddProject.overall_progress_pct}%</span></div>
              <div>RAG Status: <span className="font-bold uppercase" style={{
                color: ddProject.rag_status === 'green' ? 'var(--success)' : ddProject.rag_status === 'amber' ? 'var(--warning)' : 'var(--danger)',
              }}>{ddProject.rag_status}</span></div>
            </div>
          </section>
        )}

        {/* Key Risks */}
        {risks.filter(r => r.status !== 'closed').length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Key Risks</h2>
            <div className="space-y-3">
              {risks.filter(r => r.status !== 'closed').sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 8).map(r => (
                <div key={r.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-xs uppercase px-1.5 py-0.5 rounded" style={{
                      background: (r.risk_score || 0) >= 15 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: (r.risk_score || 0) >= 15 ? 'var(--danger)' : 'var(--warning)',
                    }}>
                      {r.category} · Score: {r.risk_score || '?'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{r.description}</p>
                  {r.mitigation && <p className="text-xs mt-0.5" style={{ color: 'var(--success)' }}>Mitigation: {r.mitigation}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Risks section */}
        {thesis?.risks && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Key Risks & Mitigants</h2>
            <p className="text-sm whitespace-pre-wrap">{thesis.risks}</p>
          </section>
        )}

        {/* SWOT Analysis */}
        {(() => {
          const swotRaw = typeof window !== 'undefined' ? localStorage.getItem(`dealforge_swot_${id}`) : null;
          const swot = swotRaw ? JSON.parse(swotRaw) : null;
          if (!swot || (!swot.strengths?.length && !swot.weaknesses?.length && !swot.opportunities?.length && !swot.threats?.length)) return null;
          return (
            <section className="mb-8">
              <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>SWOT Analysis</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: 'Strengths', items: swot.strengths || [], color: 'var(--success)' },
                  { title: 'Weaknesses', items: swot.weaknesses || [], color: 'var(--danger)' },
                  { title: 'Opportunities', items: swot.opportunities || [], color: 'var(--accent)' },
                  { title: 'Threats', items: swot.threats || [], color: 'var(--warning)' },
                ].map(q => (
                  <div key={q.title} className="p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: q.color }}>{q.title}</h4>
                    {q.items.length > 0 ? (
                      <ul className="text-xs space-y-1">
                        {q.items.map((item: string, i: number) => <li key={i}>• {item}</li>)}
                      </ul>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>None identified</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Competitor Landscape */}
        {(() => {
          const compRaw = typeof window !== 'undefined' ? localStorage.getItem(`dealforge_competitors_${id}`) : null;
          const competitors = compRaw ? JSON.parse(compRaw) : [];
          if (!competitors || competitors.length === 0) return null;
          return (
            <section className="mb-8">
              <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Competitive Landscape</h2>
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>Competitor</th>
                    <th className="text-left p-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>Strengths</th>
                    <th className="text-left p-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>Weaknesses</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c: { name: string; strengths?: string; weaknesses?: string }, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-1.5 font-medium">{c.name}</td>
                      <td className="p-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.strengths || '—'}</td>
                      <td className="p-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.weaknesses || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })()}

        {/* Financial Analysis */}
        {target.asking_price && target.revenue && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Financial Analysis</h2>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left p-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>Metric</th>
                  <th className="text-right p-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>Value</th>
                  <th className="text-right p-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>Multiple</th>
                  <th className="text-right p-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>VMS Benchmark</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="p-1.5">Revenue</td>
                  <td className="p-1.5 text-right font-mono">{fmt(target.revenue)}</td>
                  <td className="p-1.5 text-right font-mono font-bold">{(target.asking_price / target.revenue).toFixed(1)}x</td>
                  <td className="p-1.5 text-right font-mono" style={{ color: 'var(--muted)' }}>2.0-4.0x</td>
                </tr>
                {target.arr && (
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="p-1.5">ARR</td>
                    <td className="p-1.5 text-right font-mono">{fmt(target.arr)}</td>
                    <td className="p-1.5 text-right font-mono font-bold">{(target.asking_price / target.arr).toFixed(1)}x</td>
                    <td className="p-1.5 text-right font-mono" style={{ color: 'var(--muted)' }}>3.0-6.0x</td>
                  </tr>
                )}
                {target.ebita && target.ebita > 0 && (
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="p-1.5">EBITA</td>
                    <td className="p-1.5 text-right font-mono">{fmt(target.ebita)}</td>
                    <td className="p-1.5 text-right font-mono font-bold">{(target.asking_price / target.ebita).toFixed(1)}x</td>
                    <td className="p-1.5 text-right font-mono" style={{ color: 'var(--muted)' }}>8.0-15.0x</td>
                  </tr>
                )}
              </tbody>
            </table>
            {target.revenue && target.yoy_growth_pct && (
              <div className="mt-3 text-xs p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                <span className="font-medium">Rule of 40 Check: </span>
                {(() => {
                  const r40 = (target.yoy_growth_pct || 0) + (target.ebita_margin_pct || 0);
                  return (
                    <span style={{ color: r40 >= 40 ? 'var(--success)' : r40 >= 25 ? 'var(--warning)' : 'var(--danger)' }}>
                      {target.yoy_growth_pct}% growth + {target.ebita_margin_pct || 0}% margin = <span className="font-bold">{r40}%</span>
                      {r40 >= 40 ? ' ✓ Passes' : ' — Below threshold'}
                    </span>
                  );
                })()}
              </div>
            )}
          </section>
        )}

        {/* Relationship History */}
        {touchpoints.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>Relationship History</h2>
            <div className="text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>
              {touchpoints.length} touchpoints · First contact: {new Date(touchpoints[touchpoints.length - 1].date).toLocaleDateString()} · Latest: {new Date(touchpoints[0].date).toLocaleDateString()}
            </div>
            <div className="space-y-1">
              {touchpoints.slice(0, 10).map(tp => (
                <div key={tp.id} className="text-xs py-1 flex gap-3">
                  <span className="font-mono w-20 flex-shrink-0" style={{ color: 'var(--muted)' }}>{new Date(tp.date).toLocaleDateString()}</span>
                  <span className="uppercase w-16 flex-shrink-0" style={{ color: 'var(--accent)' }}>{tp.type}</span>
                  <span>{tp.subject}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="mt-12 pt-4 text-center text-xs" style={{ borderTop: '3px double var(--border)', color: 'var(--muted)' }}>
          CONFIDENTIAL — For Internal Use Only · Generated by DealForge
        </div>
      </div>
    </div>
  );
}
