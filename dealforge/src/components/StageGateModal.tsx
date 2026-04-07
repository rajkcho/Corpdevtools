'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, ArrowRight, Shield } from 'lucide-react';
import { DEAL_STAGES } from '@/lib/types';
import type { Target, DealStage } from '@/lib/types';
import { getContacts, getTouchpoints, getDDProjectByTarget, updateTarget, logActivity } from '@/lib/db';

interface StageCheck {
  label: string;
  passed: boolean;
}

interface StageGateModalProps {
  open: boolean;
  onClose: () => void;
  target: Target;
  newStage: DealStage;
  onComplete: () => void; // called after successful transition
}

function evaluateChecks(target: Target, newStage: DealStage): StageCheck[] {
  const contacts = getContacts(target.id);
  const touchpoints = getTouchpoints(target.id);
  const ddProject = getDDProjectByTarget(target.id);

  const checks: StageCheck[] = [];

  switch (newStage) {
    case 'researching':
      checks.push({
        label: 'Description is filled in',
        passed: !!(target.description && target.description.trim().length > 0),
      });
      break;

    case 'contacted':
      checks.push({
        label: 'At least 1 contact OR founder email exists',
        passed: contacts.length > 0 || !!(target.founder_email && target.founder_email.trim().length > 0),
      });
      break;

    case 'nurturing':
      checks.push({
        label: 'At least 1 touchpoint recorded',
        passed: touchpoints.length >= 1,
      });
      checks.push({
        label: 'At least 1 contact exists',
        passed: contacts.length >= 1,
      });
      break;

    case 'loi_submitted':
      checks.push({
        label: 'Deal score is filled in',
        passed: !!target.score,
      });
      checks.push({
        label: 'Asking price or revenue is filled in',
        passed: !!(target.asking_price || target.revenue),
      });
      checks.push({
        label: 'At least 3 touchpoints recorded',
        passed: touchpoints.length >= 3,
      });
      break;

    case 'loi_signed':
      checks.push({
        label: 'Asking price is filled in',
        passed: !!target.asking_price,
      });
      break;

    case 'due_diligence':
      checks.push({
        label: 'Due diligence project has been created',
        passed: !!ddProject,
      });
      break;

    case 'closing':
      checks.push({
        label: 'Due diligence project exists',
        passed: !!ddProject,
      });
      checks.push({
        label: 'DD project is at least 50% complete',
        passed: !!(ddProject && ddProject.overall_progress_pct >= 50),
      });
      break;

    case 'closed_won':
      checks.push({
        label: 'Due diligence project exists',
        passed: !!ddProject,
      });
      checks.push({
        label: 'DD project is at least 90% complete',
        passed: !!(ddProject && ddProject.overall_progress_pct >= 90),
      });
      checks.push({
        label: 'Asking price is filled in',
        passed: !!target.asking_price,
      });
      break;

    case 'closed_lost':
      // No prerequisites
      break;

    // identified has no prerequisites either
    default:
      break;
  }

  return checks;
}

function saveStageHistory(
  targetId: string,
  from: DealStage,
  to: DealStage,
  notes: string,
  overrides: string[]
) {
  const key = `dealforge_stage_history_${targetId}`;
  const existing = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem(key) || '[]')
    : [];
  existing.push({
    from,
    to,
    date: new Date().toISOString(),
    notes: notes || '',
    overrides,
  });
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(existing));
  }
}

export default function StageGateModal({ open, onClose, target, newStage, onComplete }: StageGateModalProps) {
  const [notes, setNotes] = useState('');
  const [checks, setChecks] = useState<StageCheck[]>([]);

  useEffect(() => {
    if (open) {
      setNotes('');
      setChecks(evaluateChecks(target, newStage));
    }
  }, [open, target, newStage]);

  if (!open) return null;

  const fromStage = DEAL_STAGES.find(s => s.key === target.stage);
  const toStage = DEAL_STAGES.find(s => s.key === newStage);
  const metCount = checks.filter(c => c.passed).length;
  const totalCount = checks.length;
  const allPassed = totalCount === 0 || metCount === totalCount;
  const failedChecks = checks.filter(c => !c.passed);

  const handleProceed = (isOverride: boolean) => {
    const overrides = isOverride ? failedChecks.map(c => c.label) : [];

    // Update the target stage
    updateTarget(target.id, { stage: newStage });

    // Log activity with override metadata
    const metadataEntries: Record<string, string> = {
      from: target.stage,
      to: newStage,
    };
    if (notes.trim()) {
      metadataEntries.notes = notes.trim();
    }
    if (overrides.length > 0) {
      metadataEntries.overrides = overrides.join('; ');
      metadataEntries.override_count = String(overrides.length);
    }

    logActivity('stage_changed', `Stage gate: ${target.name} ${fromStage?.label} → ${toStage?.label}${isOverride ? ' (with overrides)' : ''}`, {
      target_id: target.id,
      target_name: target.name,
      metadata: metadataEntries,
    });

    // Save to localStorage history
    saveStageHistory(target.id, target.stage, newStage, notes, overrides);

    onComplete();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Shield size={18} style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold">Stage Gate Check</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Stage transition header */}
          <div className="flex items-center justify-center gap-3 py-3 rounded-xl" style={{ background: 'var(--background)' }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: fromStage?.color }} />
              <span className="text-sm font-semibold">{fromStage?.label}</span>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--muted)' }} />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: toStage?.color }} />
              <span className="text-sm font-semibold">{toStage?.label}</span>
            </div>
          </div>

          {/* Checklist */}
          {checks.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Prerequisites</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                  background: allPassed ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: allPassed ? 'var(--success)' : 'var(--warning)',
                }}>
                  {metCount}/{totalCount} met
                </span>
              </div>
              <div className="space-y-2">
                {checks.map((check, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                    style={{
                      borderColor: check.passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                      background: check.passed ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                    }}
                  >
                    {check.passed ? (
                      <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <XCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                    )}
                    <span className="text-sm" style={{ color: check.passed ? 'var(--foreground)' : 'var(--danger)' }}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)' }}>
              <CheckCircle size={16} style={{ color: 'var(--success)' }} />
              <span className="text-sm" style={{ color: 'var(--success)' }}>No prerequisites for this stage</span>
            </div>
          )}

          {/* Warning if overriding */}
          {!allPassed && (
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
              <span className="text-xs" style={{ color: 'var(--warning)' }}>
                {failedChecks.length} prerequisite{failedChecks.length > 1 ? 's' : ''} not met. You can still proceed, but the override will be logged.
              </span>
            </div>
          )}

          {/* Notes field */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
              Transition Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-lg p-3 text-sm"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', resize: 'vertical', minHeight: 60 }}
              placeholder="Reason for stage change, context, etc."
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onClose}
              className="btn btn-ghost flex-1"
              style={{ padding: '0.5rem 1rem' }}
            >
              Cancel
            </button>
            {!allPassed && (
              <button
                onClick={() => handleProceed(true)}
                className="btn flex-1 flex items-center justify-center gap-1.5"
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(245,158,11,0.15)',
                  color: 'var(--warning)',
                  border: '1px solid rgba(245,158,11,0.3)',
                }}
              >
                <AlertTriangle size={14} />
                Override & Proceed
              </button>
            )}
            <button
              onClick={() => handleProceed(false)}
              className="btn btn-primary flex-1 flex items-center justify-center gap-1.5"
              style={{
                padding: '0.5rem 1rem',
                opacity: allPassed ? 1 : 0.5,
              }}
              disabled={!allPassed}
            >
              <CheckCircle size={14} />
              Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
