'use client';

import { Plus } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4" style={{ color: 'var(--muted)', opacity: 0.6 }}>{icon}</div>}
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)', maxWidth: '360px' }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary">
          <Plus size={14} /> {actionLabel}
        </button>
      )}
    </div>
  );
}
