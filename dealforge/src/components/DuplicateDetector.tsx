'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, GitMerge } from 'lucide-react';
import type { Target } from '@/lib/types';
import { DEAL_STAGES } from '@/lib/types';
import {
  updateTarget, deleteTarget,
  getContacts, getTouchpoints,
  updateContact, updateTouchpoint,
  logActivity,
} from '@/lib/db';

// --- Levenshtein distance (inline, no deps) ---

function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const matrix: number[][] = [];
  for (let i = 0; i <= la; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= lb; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[la][lb];
}

function nameSimilarity(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  const maxLen = Math.max(la.length, lb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(la, lb) / maxLen;
}

function revenueSimilarity(a?: number, b?: number): number {
  if (!a || !b) return 0.5; // neutral if missing
  const ratio = Math.min(a, b) / Math.max(a, b);
  return ratio; // 0..1
}

export interface DuplicatePair {
  targetA: Target;
  targetB: Target;
  score: number; // 0..100
  reasons: string[];
}

function findDuplicates(targets: Target[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i];
      const b = targets[j];

      const reasons: string[] = [];
      let totalScore = 0;

      // Name similarity (weight: 50%)
      const ns = nameSimilarity(a.name, b.name);
      if (ns >= 0.6) {
        reasons.push(`Name similarity: ${Math.round(ns * 100)}%`);
      }
      totalScore += ns * 50;

      // Same vertical (weight: 20%)
      if (a.vertical === b.vertical) {
        reasons.push('Same vertical');
        totalScore += 20;
      }

      // Revenue similarity (weight: 15%)
      const rs = revenueSimilarity(a.revenue, b.revenue);
      if (a.revenue && b.revenue && rs > 0.7) {
        reasons.push(`Revenue within ${Math.round((1 - rs) * 100)}%`);
      }
      totalScore += rs * 15;

      // Same geography (weight: 10%)
      if (a.geography && b.geography && a.geography.toLowerCase() === b.geography.toLowerCase()) {
        reasons.push('Same geography');
        totalScore += 10;
      }

      // Website match (weight: 5%)
      if (a.website && b.website) {
        const wa = a.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase();
        const wb = b.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase();
        if (wa === wb) {
          reasons.push('Same website');
          totalScore += 5;
        }
      }

      // Only include if score >= 60 and name similarity is at least 0.5
      if (totalScore >= 60 && ns >= 0.5) {
        pairs.push({ targetA: a, targetB: b, score: Math.round(totalScore), reasons });
      }
    }
  }

  return pairs.sort((a, b) => b.score - a.score);
}

// Determine which target is "more complete" (has more filled fields)
function completenessScore(t: Target): number {
  let score = 0;
  if (t.revenue) score++;
  if (t.arr) score++;
  if (t.recurring_revenue_pct) score++;
  if (t.gross_margin_pct) score++;
  if (t.ebita) score++;
  if (t.customer_count) score++;
  if (t.yoy_growth_pct) score++;
  if (t.employee_count) score++;
  if (t.website) score++;
  if (t.description) score += (t.description.length > 10 ? 2 : 1);
  if (t.founder_name) score++;
  if (t.founder_email) score++;
  if (t.notes) score += (t.notes.length > 10 ? 2 : 1);
  if (t.score) score += 3;
  if (t.asking_price) score++;
  if (t.tags && t.tags.length > 0) score++;
  if (t.sub_vertical) score++;
  // Prefer further-along stage
  const stageOrder = DEAL_STAGES.map(s => s.key);
  score += stageOrder.indexOf(t.stage);
  return score;
}

interface DuplicateDetectorProps {
  targets: Target[];
  onMergeComplete: () => void;
}

export default function DuplicateDetector({ targets, onMergeComplete }: DuplicateDetectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);

  const duplicates = useMemo(() => findDuplicates(targets), [targets]);

  const handleMerge = (pair: DuplicatePair) => {
    const key = `${pair.targetA.id}-${pair.targetB.id}`;
    if (merging === key) return;

    if (!confirm(`Merge "${pair.targetA.name}" and "${pair.targetB.name}"? The less complete record will be deleted.`)) {
      return;
    }

    setMerging(key);

    try {
      // Determine primary (more complete) and secondary
      const scoreA = completenessScore(pair.targetA);
      const scoreB = completenessScore(pair.targetB);
      const primary = scoreA >= scoreB ? pair.targetA : pair.targetB;
      const secondary = scoreA >= scoreB ? pair.targetB : pair.targetA;

      // Build merged data: fill gaps in primary with secondary's data
      const merged: Partial<Target> = {};

      // Financial fields: keep primary if set, otherwise use secondary
      const numericFields: (keyof Target)[] = [
        'revenue', 'arr', 'recurring_revenue_pct', 'gross_margin_pct',
        'ebita', 'ebita_margin_pct', 'customer_count', 'yoy_growth_pct',
        'employee_count', 'asking_price',
      ];
      for (const field of numericFields) {
        if (!primary[field] && secondary[field]) {
          (merged as Record<string, unknown>)[field] = secondary[field];
        }
      }

      // String fields
      const stringFields: (keyof Target)[] = [
        'website', 'description', 'sub_vertical', 'founder_name',
        'founder_email', 'founder_phone', 'broker_name', 'first_contact_date',
      ];
      for (const field of stringFields) {
        if (!primary[field] && secondary[field]) {
          (merged as Record<string, unknown>)[field] = secondary[field];
        }
      }

      // Merge notes
      if (secondary.notes) {
        merged.notes = primary.notes
          ? `${primary.notes}\n\n--- Merged from ${secondary.name} ---\n${secondary.notes}`
          : secondary.notes;
      }

      // Merge tags (union)
      const allTags = Array.from(new Set([...(primary.tags || []), ...(secondary.tags || [])]));
      if (allTags.length > 0) {
        merged.tags = allTags;
      }

      // Keep primary's score if it has one, otherwise use secondary's
      if (!primary.score && secondary.score) {
        merged.score = secondary.score;
        merged.weighted_score = secondary.weighted_score;
      }

      // Update primary target
      updateTarget(primary.id, merged);

      // Reassign contacts from secondary to primary
      const secondaryContacts = getContacts(secondary.id);
      for (const contact of secondaryContacts) {
        updateContact(contact.id, { target_id: primary.id });
      }

      // Reassign touchpoints from secondary to primary
      const secondaryTouchpoints = getTouchpoints(secondary.id);
      for (const tp of secondaryTouchpoints) {
        updateTouchpoint(tp.id, { target_id: primary.id });
      }

      // Log the merge
      logActivity('target_updated', `Merged duplicate: "${secondary.name}" into "${primary.name}"`, {
        target_id: primary.id,
        target_name: primary.name,
        metadata: { merged_from_id: secondary.id, merged_from_name: secondary.name },
      });

      // Delete the secondary target (without cascade since we already moved records)
      deleteTarget(secondary.id);

      onMergeComplete();
    } finally {
      setMerging(null);
    }
  };

  if (duplicates.length === 0) return null;

  const fmtM = (n?: number) => n ? `$${(n / 1_000_000).toFixed(1)}M` : '\u2014';

  return (
    <div className="glass-card" style={{ borderColor: 'var(--warning)', borderWidth: 1 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
          <span className="font-semibold text-sm">Potential Duplicates</span>
          <span
            className="badge font-mono text-xs"
            style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}
          >
            {duplicates.length}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            These targets may be duplicates based on name similarity, vertical, and financials.
            Review each pair and merge if appropriate.
          </p>

          {duplicates.map((pair) => {
            const key = `${pair.targetA.id}-${pair.targetB.id}`;
            const stageA = DEAL_STAGES.find(s => s.key === pair.targetA.stage);
            const stageB = DEAL_STAGES.find(s => s.key === pair.targetB.stage);
            const isMerging = merging === key;

            return (
              <div key={key} className="glass-card p-4" style={{ background: 'var(--background)' }}>
                {/* Score header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="badge font-mono text-xs font-bold"
                      style={{
                        background: pair.score >= 80
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(245,158,11,0.15)',
                        color: pair.score >= 80 ? 'var(--danger)' : 'var(--warning)',
                      }}
                    >
                      {pair.score}% match
                    </span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {pair.reasons.join(' · ')}
                    </span>
                  </div>
                  <button
                    onClick={() => handleMerge(pair)}
                    disabled={isMerging}
                    className="btn btn-sm flex items-center gap-1"
                    style={{
                      background: 'var(--accent-muted)',
                      color: 'var(--accent)',
                      opacity: isMerging ? 0.5 : 1,
                    }}
                  >
                    <GitMerge size={14} />
                    {isMerging ? 'Merging...' : 'Merge'}
                  </button>
                </div>

                {/* Side-by-side comparison */}
                <div className="grid grid-cols-2 gap-3">
                  {[pair.targetA, pair.targetB].map((t, idx) => {
                    const stage = idx === 0 ? stageA : stageB;
                    const isPrimary = completenessScore(t) >= completenessScore(idx === 0 ? pair.targetB : pair.targetA);
                    return (
                      <div
                        key={t.id}
                        className="rounded-lg p-3"
                        style={{
                          background: isPrimary ? 'rgba(16,185,129,0.05)' : 'transparent',
                          border: `1px solid ${isPrimary ? 'var(--success)' : 'var(--border)'}`,
                        }}
                      >
                        {isPrimary && (
                          <span className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--success)' }}>
                            PRIMARY (will be kept)
                          </span>
                        )}
                        <div className="font-semibold text-sm">{t.name}</div>
                        <div className="text-xs mt-1 space-y-0.5" style={{ color: 'var(--muted-foreground)' }}>
                          <div>Vertical: <span style={{ color: 'var(--foreground)' }}>{t.vertical}</span></div>
                          <div>Revenue: <span className="font-mono" style={{ color: 'var(--foreground)' }}>{fmtM(t.revenue)}</span></div>
                          <div>
                            Stage:{' '}
                            <span
                              className="badge text-[10px]"
                              style={{ background: `${stage?.color}20`, color: stage?.color }}
                            >
                              {stage?.label}
                            </span>
                          </div>
                          {t.geography && <div>Geo: <span style={{ color: 'var(--foreground)' }}>{t.geography}</span></div>}
                          {t.arr && <div>ARR: <span className="font-mono" style={{ color: 'var(--foreground)' }}>{fmtM(t.arr)}</span></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
