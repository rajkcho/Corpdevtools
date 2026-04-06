'use client';

export default function ProgressBar({ value, color }: { value: number; color?: string }) {
  const bg = color || (value >= 75 ? 'var(--success)' : value >= 40 ? 'var(--warning)' : 'var(--accent)');
  return (
    <div className="progress-bar w-full">
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: bg }} />
    </div>
  );
}
