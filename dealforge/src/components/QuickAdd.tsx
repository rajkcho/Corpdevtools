'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Target, MessageSquare } from 'lucide-react';
import { createTarget, getTargets, createTouchpoint } from '@/lib/db';
import { VERTICALS, type Target as TargetType } from '@/lib/types';

type ActiveForm = null | 'target' | 'touchpoint';

export default function QuickAdd() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [targets, setTargets] = useState<TargetType[]>([]);

  // Target form state
  const [targetName, setTargetName] = useState('');
  const [targetVertical, setTargetVertical] = useState<string>(VERTICALS[0]);
  const [targetGeography, setTargetGeography] = useState('');
  const [targetSource, setTargetSource] = useState<'proprietary' | 'broker' | 'inbound' | 'referral' | 'other'>('proprietary');

  // Touchpoint form state
  const [tpTargetId, setTpTargetId] = useState('');
  const [tpType, setTpType] = useState<'email' | 'call' | 'meeting' | 'note' | 'linkedin' | 'conference' | 'other'>('email');
  const [tpSubject, setTpSubject] = useState('');
  const [tpSummary, setTpSummary] = useState('');

  useEffect(() => {
    if (activeForm === 'touchpoint') {
      const allTargets = getTargets();
      setTargets(allTargets);
      if (allTargets.length > 0 && !tpTargetId) {
        setTpTargetId(allTargets[0].id);
      }
    }
  }, [activeForm, tpTargetId]);

  const resetForms = useCallback(() => {
    setTargetName('');
    setTargetVertical(VERTICALS[0]);
    setTargetGeography('');
    setTargetSource('proprietary');
    setTpTargetId('');
    setTpType('email');
    setTpSubject('');
    setTpSummary('');
  }, []);

  const close = useCallback(() => {
    setActiveForm(null);
    setIsOpen(false);
    resetForms();
  }, [resetForms]);

  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    setTimeout(() => {
      setSuccess(null);
      close();
    }, 1500);
  }, [close]);

  const handleCreateTarget = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!targetName.trim()) return;
    createTarget({
      name: targetName.trim(),
      vertical: targetVertical as TargetType['vertical'],
      geography: targetGeography.trim(),
      source: targetSource,
    });
    showSuccess('Target created!');
  }, [targetName, targetVertical, targetGeography, targetSource, showSuccess]);

  const handleCreateTouchpoint = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!tpTargetId || !tpSubject.trim()) return;
    createTouchpoint({
      target_id: tpTargetId,
      type: tpType,
      subject: tpSubject.trim(),
      summary: tpSummary.trim(),
    });
    showSuccess('Touchpoint logged!');
  }, [tpTargetId, tpType, tpSubject, tpSummary, showSuccess]);

  return (
    <>
      {/* Backdrop */}
      {(isOpen || activeForm) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 9998,
            transition: 'opacity 0.2s ease',
          }}
          onClick={close}
        />
      )}

      {/* Success toast */}
      {success && (
        <div
          style={{
            position: 'fixed',
            bottom: 100,
            right: 24,
            zIndex: 10001,
            background: 'var(--success)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
            animation: 'quickadd-fadein 0.2s ease',
          }}
        >
          {success}
        </div>
      )}

      {/* Form overlay */}
      {activeForm && !success && (
        <div
          className="glass-card"
          style={{
            position: 'fixed',
            bottom: 90,
            right: 24,
            zIndex: 10000,
            width: 340,
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            borderRadius: 12,
            border: '1px solid var(--border)',
            padding: 20,
            animation: 'quickadd-fadein 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
              {activeForm === 'target' ? 'New Target' : 'Log Touchpoint'}
            </h3>
            <button
              onClick={() => { setActiveForm(null); resetForms(); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                borderRadius: 4,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {activeForm === 'target' && (
            <form onSubmit={handleCreateTarget} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Name *</span>
                <input
                  type="text"
                  value={targetName}
                  onChange={e => setTargetName(e.target.value)}
                  placeholder="Company name"
                  required
                  autoFocus
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Vertical</span>
                <select value={targetVertical} onChange={e => setTargetVertical(e.target.value)} style={inputStyle}>
                  {VERTICALS.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Geography</span>
                <input
                  type="text"
                  value={targetGeography}
                  onChange={e => setTargetGeography(e.target.value)}
                  placeholder="e.g. North America"
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Source</span>
                <select value={targetSource} onChange={e => setTargetSource(e.target.value as typeof targetSource)} style={inputStyle}>
                  <option value="proprietary">Proprietary</option>
                  <option value="broker">Broker</option>
                  <option value="inbound">Inbound</option>
                  <option value="referral">Referral</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <button type="submit" style={submitStyle}>
                Create Target
              </button>
            </form>
          )}

          {activeForm === 'touchpoint' && (
            <form onSubmit={handleCreateTouchpoint} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Target *</span>
                <select value={tpTargetId} onChange={e => setTpTargetId(e.target.value)} required style={inputStyle}>
                  {targets.length === 0 && <option value="">No targets available</option>}
                  {targets.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Type</span>
                <select value={tpType} onChange={e => setTpType(e.target.value as typeof tpType)} style={inputStyle}>
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Note</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="conference">Conference</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Subject *</span>
                <input
                  type="text"
                  value={tpSubject}
                  onChange={e => setTpSubject(e.target.value)}
                  placeholder="Brief subject"
                  required
                  autoFocus
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Summary</span>
                <textarea
                  value={tpSummary}
                  onChange={e => setTpSummary(e.target.value)}
                  placeholder="Key points discussed..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>
              <button type="submit" disabled={targets.length === 0} style={submitStyle}>
                Log Touchpoint
              </button>
            </form>
          )}
        </div>
      )}

      {/* Expanded action buttons */}
      {isOpen && !activeForm && !success && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            right: 24,
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            animation: 'quickadd-fadein 0.15s ease',
          }}
        >
          <button
            onClick={() => setActiveForm('target')}
            className="glass-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--foreground)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--card-hover)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--card)';
            }}
          >
            <Target size={16} style={{ color: 'var(--accent)' }} />
            New Target
          </button>
          <button
            onClick={() => setActiveForm('touchpoint')}
            className="glass-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--foreground)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--card-hover)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--card)';
            }}
          >
            <MessageSquare size={16} style={{ color: 'var(--accent)' }} />
            Log Touchpoint
          </button>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => {
          if (activeForm || success) {
            close();
          } else {
            setIsOpen(!isOpen);
          }
        }}
        aria-label={isOpen || activeForm ? 'Close quick add' : 'Quick add'}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 10000,
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
          transition: 'transform 0.2s ease, background 0.15s ease',
          transform: isOpen || activeForm ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
      >
        {isOpen || activeForm ? <X size={22} style={{ transform: 'rotate(-45deg)' }} /> : <Plus size={22} />}
      </button>

      {/* Keyframe animation */}
      <style>{`
        @keyframes quickadd-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// Shared inline styles for form elements
const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--muted-foreground)',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
  color: 'var(--foreground)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const submitStyle: React.CSSProperties = {
  marginTop: 4,
  padding: '10px 16px',
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};
