'use client';

import { SCORE_CRITERIA } from '@/lib/types';
import type { DealScore } from '@/lib/types';

interface RadarChartProps {
  score: DealScore;
  size?: number;
}

export default function RadarChart({ score, size = 240 }: RadarChartProps) {
  const center = size / 2;
  const maxRadius = (size / 2) - 30;
  const criteria = SCORE_CRITERIA;
  const count = criteria.length;
  const angleStep = (2 * Math.PI) / count;

  // Get point coordinates for a given value (1-5) at a given index
  const getPoint = (value: number, index: number): [number, number] => {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    const radius = (value / 5) * maxRadius;
    return [
      center + radius * Math.cos(angle),
      center + radius * Math.sin(angle),
    ];
  };

  // Build polygon path for the score
  const scorePath = criteria.map((c, i) => {
    const val = score[c.key] || 0;
    const [x, y] = getPoint(val, i);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ') + ' Z';

  // Grid circles
  const gridLevels = [1, 2, 3, 4, 5];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid circles */}
      {gridLevels.map(level => {
        const radius = (level / 5) * maxRadius;
        return (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={level === 5 ? 1.5 : 0.5}
            strokeDasharray={level < 5 ? '2,2' : 'none'}
          />
        );
      })}

      {/* Axis lines */}
      {criteria.map((_, i) => {
        const [x, y] = getPoint(5, i);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="var(--border)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Score polygon */}
      <path
        d={scorePath}
        fill="rgba(59, 130, 246, 0.15)"
        stroke="var(--accent)"
        strokeWidth={2}
      />

      {/* Score dots */}
      {criteria.map((c, i) => {
        const val = score[c.key] || 0;
        const [x, y] = getPoint(val, i);
        return (
          <circle
            key={c.key}
            cx={x}
            cy={y}
            r={4}
            fill="var(--accent)"
            stroke="var(--card)"
            strokeWidth={2}
          />
        );
      })}

      {/* Labels */}
      {criteria.map((c, i) => {
        const [x, y] = getPoint(6.2, i);
        const val = score[c.key] || 0;
        // Short labels
        const shortLabels: Record<string, string> = {
          diversified_customers: 'Diversified',
          low_churn: 'Low Churn',
          mission_critical: 'Mission Crit.',
          market_share: 'Market Share',
          fragmented_competition: 'Fragmented',
          growth_potential: 'Growth',
        };
        return (
          <text
            key={c.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill={val >= 4 ? 'var(--success)' : val >= 3 ? 'var(--warning)' : val > 0 ? 'var(--danger)' : 'var(--muted)'}
            fontWeight={500}
          >
            {shortLabels[c.key] || c.label}
            <tspan x={x} dy={12} fontSize={11} fontWeight={700}>
              {val > 0 ? val : '-'}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
