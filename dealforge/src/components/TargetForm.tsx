'use client';

import { useState } from 'react';
import type { Target, DealStage, DealScore, Vertical } from '@/lib/types';
import { DEAL_STAGES, VERTICALS, SCORE_CRITERIA } from '@/lib/types';

interface TargetFormProps {
  initial?: Partial<Target>;
  onSubmit: (data: Partial<Target>) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export default function TargetForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: TargetFormProps) {
  const [form, setForm] = useState<Partial<Target>>({
    name: '',
    vertical: 'Other',
    geography: '',
    stage: 'identified',
    source: 'proprietary',
    ...initial,
  });

  const [score, setScore] = useState<DealScore>(
    initial?.score || {
      diversified_customers: 3,
      low_churn: 3,
      mission_critical: 3,
      market_share: 3,
      fragmented_competition: 3,
      growth_potential: 3,
    }
  );

  const [tab, setTab] = useState<'basic' | 'financials' | 'contacts' | 'scoring'>('basic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, score });
  };

  const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));
  const setNum = (key: string, value: string) => set(key, value === '' ? undefined : Number(value));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--background)' }}>
        {(['basic', 'financials', 'contacts', 'scoring'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
              tab === t ? 'text-white' : ''
            }`}
            style={{
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? 'white' : 'var(--muted-foreground)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'basic' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Company Name *</label>
            <input
              required
              value={form.name || ''}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Acme Software Inc."
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Vertical</label>
              <select value={form.vertical} onChange={e => set('vertical', e.target.value)} className="w-full">
                {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Sub-Vertical</label>
              <input value={form.sub_vertical || ''} onChange={e => set('sub_vertical', e.target.value)} placeholder="e.g. EHR, Billing" className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Geography</label>
              <input value={form.geography || ''} onChange={e => set('geography', e.target.value)} placeholder="e.g. North America" className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Website</label>
              <input value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://" className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Stage</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value as DealStage)} className="w-full">
                {DEAL_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Source</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className="w-full">
                <option value="proprietary">Proprietary</option>
                <option value="broker">Broker</option>
                <option value="inbound">Inbound</option>
                <option value="referral">Referral</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          {form.source === 'broker' && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Broker Name</label>
              <input value={form.broker_name || ''} onChange={e => set('broker_name', e.target.value)} className="w-full" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Description</label>
            <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3} className="w-full" placeholder="Brief description of the target company..." />
          </div>
        </div>
      )}

      {tab === 'financials' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Revenue ($)</label>
              <input type="number" value={form.revenue ?? ''} onChange={e => setNum('revenue', e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>ARR ($)</label>
              <input type="number" value={form.arr ?? ''} onChange={e => setNum('arr', e.target.value)} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Recurring Revenue %</label>
              <input type="number" min="0" max="100" value={form.recurring_revenue_pct ?? ''} onChange={e => setNum('recurring_revenue_pct', e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Gross Margin %</label>
              <input type="number" min="0" max="100" value={form.gross_margin_pct ?? ''} onChange={e => setNum('gross_margin_pct', e.target.value)} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>EBITA ($)</label>
              <input type="number" value={form.ebita ?? ''} onChange={e => setNum('ebita', e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>EBITA Margin %</label>
              <input type="number" min="0" max="100" value={form.ebita_margin_pct ?? ''} onChange={e => setNum('ebita_margin_pct', e.target.value)} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Customer Count</label>
              <input type="number" value={form.customer_count ?? ''} onChange={e => setNum('customer_count', e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>YoY Growth %</label>
              <input type="number" value={form.yoy_growth_pct ?? ''} onChange={e => setNum('yoy_growth_pct', e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Employees</label>
              <input type="number" value={form.employee_count ?? ''} onChange={e => setNum('employee_count', e.target.value)} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Asking Price ($)</label>
            <input type="number" value={form.asking_price ?? ''} onChange={e => setNum('asking_price', e.target.value)} className="w-full" />
          </div>
        </div>
      )}

      {tab === 'contacts' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Founder / CEO Name</label>
            <input value={form.founder_name || ''} onChange={e => set('founder_name', e.target.value)} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Email</label>
              <input type="email" value={form.founder_email || ''} onChange={e => set('founder_email', e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Phone</label>
              <input value={form.founder_phone || ''} onChange={e => set('founder_phone', e.target.value)} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Notes</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={4} className="w-full" placeholder="Additional notes about the target..." />
          </div>
        </div>
      )}

      {tab === 'scoring' && (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Score each criterion 1-5 based on Harris/Constellation acquisition criteria
          </p>
          {SCORE_CRITERIA.map(c => (
            <div key={c.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">{c.label}</label>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>
                  {score[c.key]}/5
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{c.description}</p>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={score[c.key]}
                onChange={e => setScore(prev => ({ ...prev, [c.key]: Number(e.target.value) }))}
                className="w-full accent-blue-500"
                style={{ background: 'transparent', border: 'none', padding: 0 }}
              />
              <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
