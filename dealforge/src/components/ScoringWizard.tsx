'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Star, Edit2 } from 'lucide-react';
import type { DealScore } from '@/lib/types';
import { SCORE_CRITERIA } from '@/lib/types';

interface Props {
  currentScore?: DealScore;
  targetName: string;
  onSave: (score: DealScore) => void;
  onClose: () => void;
}

const SCORE_LABELS: { label: string; color: string }[] = [
  { label: 'Poor / High Risk', color: 'var(--danger, #ef4444)' },
  { label: 'Below Average', color: 'var(--warning, #f59e0b)' },
  { label: 'Average / Acceptable', color: 'var(--muted-foreground, #6b7280)' },
  { label: 'Good / Above Average', color: 'var(--info, #3b82f6)' },
  { label: 'Excellent / Best in Class', color: 'var(--success, #10b981)' },
];

interface ScoringQuestion {
  criterion: keyof DealScore;
  question: string;
  guidance: { score: number; description: string }[];
}

const SCORING_QUESTIONS: ScoringQuestion[] = [
  {
    criterion: 'diversified_customers',
    question: 'How diversified is the customer base?',
    guidance: [
      { score: 1, description: 'Top customer >50% revenue. Extreme concentration risk.' },
      { score: 2, description: 'Top customer 20-50% of revenue, or top 3 customers >60%.' },
      { score: 3, description: 'Top customer 10-20% of revenue. Moderate concentration.' },
      { score: 4, description: 'No customer >10% of revenue. Good diversification.' },
      { score: 5, description: 'No customer >5% of revenue. Highly diversified across 100+ accounts.' },
    ],
  },
  {
    criterion: 'low_churn',
    question: 'How sticky is the product? What is the customer attrition rate?',
    guidance: [
      { score: 1, description: 'Annual gross churn >15%. Customers leave frequently. Low switching costs.' },
      { score: 2, description: 'Annual gross churn 10-15%. Some stickiness but competitive alternatives exist.' },
      { score: 3, description: 'Annual gross churn 5-10%. Product is embedded in workflows. NRR ~100%.' },
      { score: 4, description: 'Annual gross churn 3-5%. High switching costs. NRR 100-110%.' },
      { score: 5, description: 'Annual gross churn <3%. Product is infrastructure. NRR >110%. Multi-year contracts.' },
    ],
  },
  {
    criterion: 'mission_critical',
    question: 'How mission-critical is the software to daily operations?',
    guidance: [
      { score: 1, description: 'Nice-to-have tool. Customers can operate without it. Easily replaced.' },
      { score: 2, description: 'Useful but not essential. Some manual workarounds exist.' },
      { score: 3, description: 'Important to operations. Disruption causes meaningful productivity loss.' },
      { score: 4, description: 'Core system of record. Operations would be severely impacted without it.' },
      { score: 5, description: 'Cannot operate without it. Regulated/compliance requirement. Zero downtime tolerance.' },
    ],
  },
  {
    criterion: 'market_share',
    question: 'What is the company\'s market position in its vertical niche?',
    guidance: [
      { score: 1, description: 'Tiny player. <2% market share. No brand recognition in the niche.' },
      { score: 2, description: 'Small player. 2-5% share. Known by some customers but not a leader.' },
      { score: 3, description: 'Mid-tier player. 5-15% share. Recognized in the market.' },
      { score: 4, description: 'Top 3 player. 15-30% share. Strong reputation and reference customers.' },
      { score: 5, description: 'Market leader. >30% share in niche. Default choice for new customers.' },
    ],
  },
  {
    criterion: 'fragmented_competition',
    question: 'How fragmented is the competitive landscape?',
    guidance: [
      { score: 1, description: 'Single dominant player with >50% share. Difficult to compete.' },
      { score: 2, description: '2-3 large players control most of the market. Limited opportunity.' },
      { score: 3, description: 'Mix of large and small players. Some consolidation opportunity.' },
      { score: 4, description: 'Many small competitors. No clear dominant player. Good for roll-up.' },
      { score: 5, description: 'Highly fragmented with dozens of small players. Clear consolidation opportunity.' },
    ],
  },
  {
    criterion: 'growth_potential',
    question: 'What is the growth potential for this business?',
    guidance: [
      { score: 1, description: 'Market is declining. Product is becoming obsolete. No clear growth path.' },
      { score: 2, description: 'Flat market. Growth only from price increases. Limited new customer opportunity.' },
      { score: 3, description: 'Moderate growth (5-10% TAM growth). Some geographic or product expansion possible.' },
      { score: 4, description: 'Good growth (10-15% TAM growth). Clear expansion paths: new geos, modules, or tuck-ins.' },
      { score: 5, description: 'Strong growth (>15% TAM growth). Multiple expansion vectors. Large untapped market.' },
    ],
  },
];

const TOTAL_STEPS = SCORING_QUESTIONS.length + 1; // +1 for the summary step

export default function ScoringWizard({ currentScore, targetName, onSave, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Partial<DealScore>>(() => currentScore || {});

  const isSummaryStep = step === SCORING_QUESTIONS.length;
  const isComplete = SCORING_QUESTIONS.every(q => scores[q.criterion] !== undefined);

  const weightedTotal = SCORE_CRITERIA.reduce((sum, c) => {
    const val = scores[c.key];
    return sum + (val !== undefined ? val * c.weight : 0);
  }, 0);
  const maxWeighted = SCORE_CRITERIA.reduce((sum, c) => sum + 5 * c.weight, 0);
  const answeredCount = SCORING_QUESTIONS.filter(q => scores[q.criterion] !== undefined).length;

  const handleScore = (value: number) => {
    const currentQuestion = SCORING_QUESTIONS[step];
    if (!currentQuestion) return;
    setScores(prev => ({ ...prev, [currentQuestion.criterion]: value }));
  };

  const handleNext = () => {
    if (isSummaryStep) {
      if (isComplete) {
        onSave(scores as DealScore);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    setStep(s => Math.max(0, s - 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div
        className="glass-card w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Scoring Wizard</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                Evaluating: {targetName}
              </p>
            </div>
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--background)', color: 'var(--muted)' }}>
              Cancel
            </button>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-1.5 mt-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
              const isCriterionStep = i < SCORING_QUESTIONS.length;
              const filled = isCriterionStep
                ? scores[SCORING_QUESTIONS[i].criterion] !== undefined
                : isComplete;
              return (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-full cursor-pointer transition-all"
                  onClick={() => setStep(i)}
                  style={{
                    background: filled
                      ? 'var(--accent)'
                      : i === step
                      ? 'var(--accent-muted)'
                      : 'var(--background)',
                  }}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              Step {step + 1} of {TOTAL_STEPS}{isSummaryStep ? ' — Summary' : ''}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {answeredCount}/{SCORING_QUESTIONS.length} answered
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {isSummaryStep ? (
            /* Summary Step */
            <div>
              <h3 className="text-base font-semibold mb-4">Score Summary</h3>
              <div className="space-y-2">
                {SCORE_CRITERIA.map((c, idx) => {
                  const val = scores[c.key];
                  const labelInfo = val !== undefined ? SCORE_LABELS[val - 1] : null;
                  return (
                    <div
                      key={c.key}
                      className="glass-card flex items-center justify-between p-3 rounded-lg"
                      style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{c.label}</span>
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>
                            ({c.weight}x)
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{c.description}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        {val !== undefined && labelInfo ? (
                          <>
                            <div className="text-right">
                              <span className="text-lg font-bold font-mono" style={{ color: labelInfo.color }}>{val}</span>
                              <span className="text-xs ml-1" style={{ color: labelInfo.color }}>{labelInfo.label}</span>
                            </div>
                            <button
                              onClick={() => setStep(idx)}
                              className="p-1 rounded transition-colors"
                              style={{ color: 'var(--muted)' }}
                              title="Edit this score"
                            >
                              <Edit2 size={12} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--danger)', color: 'white' }}>
                            Not scored
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weighted total */}
              <div
                className="glass-card mt-4 p-4 rounded-lg text-center"
                style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent)' }}
              >
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>Weighted Total Score</div>
                <div className="text-3xl font-bold font-mono" style={{ color: 'var(--accent)' }}>
                  {isComplete ? (weightedTotal / maxWeighted * 5).toFixed(2) : '--'}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>out of 5.00</div>
                {isComplete && (
                  <div className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                    Raw weighted: {weightedTotal.toFixed(1)} / {maxWeighted.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Criterion Step */
            (() => {
              const currentQuestion = SCORING_QUESTIONS[step];
              const criterion = SCORE_CRITERIA.find(c => c.key === currentQuestion.criterion)!;
              const currentValue = scores[currentQuestion.criterion];
              return (
                <>
                  <div className="mb-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                    >
                      {criterion.label}
                    </span>
                    <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>
                      Weight: {criterion.weight}x
                    </span>
                  </div>
                  <h3 className="text-base font-semibold mt-3">{currentQuestion.question}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{criterion.description}</p>

                  {/* Score cards */}
                  <div className="grid grid-cols-5 gap-2 mt-5">
                    {[1, 2, 3, 4, 5].map(n => {
                      const info = SCORE_LABELS[n - 1];
                      const isSelected = currentValue === n;
                      return (
                        <button
                          key={n}
                          onClick={() => handleScore(n)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                          style={{
                            background: isSelected ? 'var(--accent-muted)' : 'var(--background)',
                            border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                            color: isSelected ? 'var(--accent)' : 'var(--foreground)',
                          }}
                        >
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: n }).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                fill={isSelected ? 'var(--accent)' : 'none'}
                                style={{ color: isSelected ? 'var(--accent)' : 'var(--muted)' }}
                              />
                            ))}
                          </div>
                          <span className="text-lg font-bold">{n}</span>
                          <span
                            className="text-[10px] leading-tight text-center font-medium"
                            style={{ color: isSelected ? 'var(--accent)' : info.color }}
                          >
                            {info.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Guidance - always visible */}
                  <div className="mt-5 space-y-1.5 p-4 rounded-xl" style={{ background: 'var(--background)' }}>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
                      Scoring Guide
                    </div>
                    {currentQuestion.guidance.map(g => {
                      const gInfo = SCORE_LABELS[g.score - 1];
                      return (
                        <div
                          key={g.score}
                          className="flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleScore(g.score)}
                          style={{
                            background: currentValue === g.score ? 'var(--accent-muted)' : 'transparent',
                          }}
                        >
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              background: currentValue === g.score ? 'var(--accent)' : 'var(--card)',
                              color: currentValue === g.score ? 'white' : gInfo.color,
                              border: `1px solid ${currentValue === g.score ? 'var(--accent)' : 'var(--border)'}`,
                            }}
                          >
                            {g.score}
                          </span>
                          <span className="text-xs leading-relaxed" style={{ color: currentValue === g.score ? 'var(--accent)' : 'var(--muted-foreground)' }}>
                            {g.description}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            {isComplete && !isSummaryStep && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--success)' }}>
                <CheckCircle2 size={14} />
                Score: {(weightedTotal / maxWeighted * 5).toFixed(2)} / 5.00
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-30"
              style={{ background: 'var(--background)', color: 'var(--foreground)' }}
            >
              <ChevronLeft size={16} /> Back
            </button>
            {isSummaryStep ? (
              <button
                onClick={handleNext}
                disabled={!isComplete}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <CheckCircle2 size={16} /> Save Score
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {step === SCORING_QUESTIONS.length - 1 ? 'Review' : 'Next'} <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
