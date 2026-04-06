'use client';

import type { RAGStatus } from '@/lib/types';

export default function RAGDot({ status, size = 10 }: { status: RAGStatus; size?: number }) {
  const colors: Record<RAGStatus, string> = {
    red: '#ef4444',
    amber: '#f59e0b',
    green: '#10b981',
    grey: '#6b7280',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors[status],
      }}
    />
  );
}
