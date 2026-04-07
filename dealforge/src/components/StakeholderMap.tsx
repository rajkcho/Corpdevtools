'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Contact } from '@/lib/types';

type StakeholderRole = 'decision_maker' | 'influencer' | 'champion' | 'blocker' | 'end_user' | 'unassigned';

interface StakeholderRoleInfo {
  key: StakeholderRole;
  label: string;
  color: string;
  borderColor: string;
}

const STAKEHOLDER_ROLES: StakeholderRoleInfo[] = [
  { key: 'decision_maker', label: 'Decision Maker', color: '#F59E0B', borderColor: '#D97706' },
  { key: 'influencer', label: 'Influencer', color: '#3B82F6', borderColor: '#2563EB' },
  { key: 'champion', label: 'Champion', color: '#10B981', borderColor: '#059669' },
  { key: 'blocker', label: 'Blocker', color: '#EF4444', borderColor: '#DC2626' },
  { key: 'end_user', label: 'End User', color: '#8B5CF6', borderColor: '#7C3AED' },
  { key: 'unassigned', label: 'Unassigned', color: '#6B7280', borderColor: '#4B5563' },
];

function getRoleInfo(role: StakeholderRole): StakeholderRoleInfo {
  return STAKEHOLDER_ROLES.find(r => r.key === role) || STAKEHOLDER_ROLES[5];
}

function getStorageKey(targetId: string): string {
  return `dealforge_stakeholder_roles_${targetId}`;
}

function loadRoles(targetId: string): Record<string, StakeholderRole> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(getStorageKey(targetId));
  return raw ? JSON.parse(raw) : {};
}

function saveRoles(targetId: string, roles: Record<string, StakeholderRole>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getStorageKey(targetId), JSON.stringify(roles));
}

// Relationship strength: 0-4 based on contact data completeness
function getRelationshipStrength(contact: Contact): number {
  let strength = 0;
  if (contact.email) strength++;
  if (contact.phone) strength++;
  if (contact.linkedin) strength++;
  if (contact.notes && contact.notes.length > 10) strength++;
  return strength;
}

interface StakeholderMapProps {
  targetId: string;
  contacts: Contact[];
  founderName?: string;
}

export default function StakeholderMap({ targetId, contacts, founderName }: StakeholderMapProps) {
  const [roles, setRoles] = useState<Record<string, StakeholderRole>>({});
  const [editingContact, setEditingContact] = useState<string | null>(null);

  useEffect(() => {
    setRoles(loadRoles(targetId));
  }, [targetId]);

  const assignRole = useCallback((contactId: string, role: StakeholderRole) => {
    setRoles(prev => {
      const next = { ...prev, [contactId]: role };
      saveRoles(targetId, next);
      return next;
    });
    setEditingContact(null);
  }, [targetId]);

  // Build nodes: contacts + optional founder
  const allNodes: { id: string; name: string; title: string; isFounder: boolean; strength: number }[] = [];

  if (founderName) {
    allNodes.push({ id: '__founder__', name: founderName, title: 'Founder / CEO', isFounder: true, strength: 3 });
  }
  contacts.forEach(c => {
    allNodes.push({ id: c.id, name: c.name, title: c.title || 'No title', isFounder: false, strength: getRelationshipStrength(c) });
  });

  if (allNodes.length === 0) {
    return (
      <div className="glass-card p-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
        <p className="text-lg font-medium mb-2">No contacts to map</p>
        <p className="text-sm">Add contacts in the Contacts tab to build your stakeholder map.</p>
      </div>
    );
  }

  // SVG layout: grid-based
  const nodeWidth = 180;
  const nodeHeight = 80;
  const gapX = 40;
  const gapY = 40;
  const cols = Math.min(allNodes.length, 4);
  const rows = Math.ceil(allNodes.length / cols);
  const svgWidth = cols * (nodeWidth + gapX) - gapX + 60;
  const svgHeight = rows * (nodeHeight + gapY) - gapY + 60;

  // Coverage gap analysis
  const assignedRoles = new Set<string>(Object.values(roles).filter(r => r !== 'unassigned'));
  const criticalRoles: { key: StakeholderRole; label: string }[] = [
    { key: 'decision_maker', label: 'Decision Maker' },
    { key: 'champion', label: 'Champion' },
    { key: 'influencer', label: 'Influencer' },
  ];
  const gaps = criticalRoles.filter(r => !assignedRoles.has(r.key));
  const hasBlocker = assignedRoles.has('blocker');

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-sm">Stakeholder Roles</h3>
          <div className="flex gap-3 flex-wrap">
            {STAKEHOLDER_ROLES.filter(r => r.key !== 'unassigned').map(role => (
              <div key={role.key} className="flex items-center gap-1.5 text-xs">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: `${role.color}25`,
                    border: `2px solid ${role.color}`,
                  }}
                />
                <span style={{ color: 'var(--foreground)' }}>{role.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Org Chart */}
      <div className="glass-card p-4 overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
        >
          {allNodes.map((node, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = 30 + col * (nodeWidth + gapX);
            const y = 30 + row * (nodeHeight + gapY);
            const role = roles[node.id] || 'unassigned';
            const roleInfo = getRoleInfo(role);
            const strengthDots = node.strength;

            // Draw connector lines to center (from first node)
            return (
              <g key={node.id}>
                {/* Connecting lines between rows */}
                {row > 0 && (
                  <line
                    x1={x + nodeWidth / 2}
                    y1={y}
                    x2={x + nodeWidth / 2}
                    y2={y - gapY}
                    stroke="var(--border)"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                  />
                )}
                {/* Node rectangle */}
                <rect
                  x={x}
                  y={y}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={8}
                  ry={8}
                  fill={`${roleInfo.color}12`}
                  stroke={roleInfo.borderColor}
                  strokeWidth={role === 'unassigned' ? 1 : 2.5}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEditingContact(editingContact === node.id ? null : node.id)}
                />
                {/* Name */}
                <text
                  x={x + nodeWidth / 2}
                  y={y + 22}
                  textAnchor="middle"
                  fill="var(--foreground)"
                  fontSize={13}
                  fontWeight={600}
                >
                  {node.name.length > 20 ? node.name.slice(0, 18) + '...' : node.name}
                </text>
                {/* Title */}
                <text
                  x={x + nodeWidth / 2}
                  y={y + 38}
                  textAnchor="middle"
                  fill="var(--muted-foreground)"
                  fontSize={10}
                >
                  {node.title.length > 26 ? node.title.slice(0, 24) + '...' : node.title}
                </text>
                {/* Role badge */}
                {role !== 'unassigned' && (
                  <>
                    <rect
                      x={x + nodeWidth / 2 - 40}
                      y={y + 46}
                      width={80}
                      height={16}
                      rx={8}
                      fill={`${roleInfo.color}30`}
                    />
                    <text
                      x={x + nodeWidth / 2}
                      y={y + 57}
                      textAnchor="middle"
                      fill={roleInfo.borderColor}
                      fontSize={9}
                      fontWeight={600}
                    >
                      {roleInfo.label}
                    </text>
                  </>
                )}
                {role === 'unassigned' && (
                  <text
                    x={x + nodeWidth / 2}
                    y={y + 57}
                    textAnchor="middle"
                    fill="var(--muted-foreground)"
                    fontSize={9}
                    fontStyle="italic"
                  >
                    Click to assign role
                  </text>
                )}
                {/* Relationship strength dots */}
                {[0, 1, 2, 3].map(i => (
                  <circle
                    key={i}
                    cx={x + nodeWidth / 2 - 9 + i * 6}
                    cy={y + 72}
                    r={2.5}
                    fill={i < strengthDots ? roleInfo.color : 'var(--border)'}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Role assignment dropdown */}
      {editingContact && (
        <div className="glass-card p-4">
          <h4 className="font-medium text-sm mb-2">
            Assign role to: {allNodes.find(n => n.id === editingContact)?.name}
          </h4>
          <div className="flex gap-2 flex-wrap">
            {STAKEHOLDER_ROLES.map(role => {
              const isActive = (roles[editingContact] || 'unassigned') === role.key;
              return (
                <button
                  key={role.key}
                  onClick={() => assignRole(editingContact, role.key)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                  style={{
                    background: isActive ? role.color : `${role.color}15`,
                    color: isActive ? 'white' : role.borderColor,
                    border: `1.5px solid ${isActive ? role.borderColor : `${role.color}40`}`,
                  }}
                >
                  {role.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Coverage Analysis */}
      <div className="glass-card p-4">
        <h3 className="font-semibold text-sm mb-3">Coverage Analysis</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Gaps */}
          {gaps.length > 0 && (
            <div className="p-3 rounded-lg" style={{ background: 'var(--danger-bg, #FEF2F2)', border: '1px solid var(--danger-border, #FECACA)' }}>
              <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--danger, #DC2626)' }}>Coverage Gaps</div>
              {gaps.map(g => (
                <div key={g.key} className="text-xs mb-0.5" style={{ color: 'var(--danger, #DC2626)' }}>
                  &#x26A0; No {g.label.toLowerCase()} identified
                </div>
              ))}
            </div>
          )}
          {gaps.length === 0 && (
            <div className="p-3 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: '#16A34A' }}>All critical roles covered</div>
              <div className="text-xs" style={{ color: '#16A34A' }}>Decision maker, champion, and influencer identified.</div>
            </div>
          )}

          {/* Blocker warning */}
          {hasBlocker && (
            <div className="p-3 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: '#DC2626' }}>Blocker Identified</div>
              <div className="text-xs" style={{ color: '#DC2626' }}>
                A blocker has been identified. Develop a mitigation strategy.
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
            <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Summary</div>
            <div className="text-xs space-y-0.5" style={{ color: 'var(--muted-foreground)' }}>
              <div>Total stakeholders: {allNodes.length}</div>
              <div>Roles assigned: {Object.values(roles).filter(r => r !== 'unassigned').length} / {allNodes.length}</div>
              <div>Avg. relationship strength: {allNodes.length > 0 ? (allNodes.reduce((a, n) => a + n.strength, 0) / allNodes.length).toFixed(1) : 0} / 4</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
