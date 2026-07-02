import React, { useMemo, useState } from 'react'
import type { PlotBeat } from '@shared/types'

interface PlotTimelineProps {
  beats: PlotBeat[]
  framework?: string
  acts?: { name: string; beats: string[]; color: string }[]
}

// ===== Pure utility functions (testable without DOM) =====

export function generateEmotionalCurvePath(beats: PlotBeat[], width: number, height: number): string {
  if (beats.length === 0) return ''
  if (beats.length === 1) {
    const x = width / 2
    const y = height - (height * beats[0].emotionalIntensity) / 10
    return `M ${x} ${y}`
  }

  const padding = 20
  const graphWidth = width - padding * 2
  const graphHeight = height - padding * 2

  return beats
    .map((beat, i) => {
      const x = padding + (i / (beats.length - 1)) * graphWidth
      const y = padding + graphHeight - (graphHeight * beat.emotionalIntensity) / 10
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export function colorForAct(act: string): string {
  const colors: Record<string, string> = {
    setup: 'var(--amber-500)',
    confrontation: 'var(--accent)',
    resolution: 'var(--success)',
    beginning: 'var(--amber-500)',
    middle: 'var(--accent)',
    ending: 'var(--success)'
  }
  return colors[act] ?? 'var(--text-secondary)'
}

export const PlotTimeline: React.FC<PlotTimelineProps> = ({ beats, framework, acts: _acts }) => {
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null)

  const svgWidth = 600
  const svgHeight = 120

  const curvePath = useMemo(() => generateEmotionalCurvePath(beats, svgWidth, svgHeight), [beats])

  const statusColor = (status: string): string => {
    switch (status) {
      case 'drafted':
        return 'var(--accent)'
      case 'revised':
        return 'var(--success)'
      default:
        return 'var(--ink-600)'
    }
  }

  const statusLabel = (status: string): string => {
    switch (status) {
      case 'drafted':
        return '已写'
      case 'revised':
        return '已改'
      default:
        return '待写'
    }
  }

  if (beats.length === 0) {
    return (
      <div className="text-center py-12 text-[--color-text-secondary]">
        <div className="text-3xl mb-3">📋</div>
        <p>暂无节拍</p>
        <p className="text-xs mt-1">在「技能工坊」中使用故事结构技能生成节拍</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[--color-text]">情节时间线</h3>
          <p className="text-xs text-[--color-text-secondary]">
            {beats.length} 个节拍{framework ? ` · ${framework}` : ''}
          </p>
        </div>
        {/* Legend */}
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--text-secondary)' }} />
            待写
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            已写
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
            已改
          </span>
        </div>
      </div>

      {/* Emotional intensity curve */}
      <div className="bg-surface rounded-xl border border-[--color-border] p-4">
        <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          {/* Grid lines */}
          {[2, 4, 6, 8, 10].map(level => {
            const y = svgHeight - (svgHeight * level) / 10
            return (
              <g key={level}>
                <line x1={20} y1={y} x2={svgWidth - 20} y2={y} stroke="var(--color-border)" strokeWidth={1} />
                <text x={8} y={y + 3} fill="var(--text-secondary)" fontSize={10} textAnchor="end">
                  {level}
                </text>
              </g>
            )
          })}

          {/* Data points and curve */}
          {beats.map((beat, i) => {
            const x = 20 + (i / Math.max(beats.length - 1, 1)) * (svgWidth - 40)
            const y = svgHeight - (svgHeight * beat.emotionalIntensity) / 10
            return (
              <g key={beat.id}>
                <circle cx={x} cy={y} r={4} fill={statusColor(beat.status)} stroke="var(--color-bg)" strokeWidth={2} />
              </g>
            )
          })}

          {/* Curve path */}
          {curvePath && (
            <path
              d={curvePath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.6}
            />
          )}

          {/* X-axis labels */}
          {beats.map((beat, i) => {
            const x = 20 + (i / Math.max(beats.length - 1, 1)) * (svgWidth - 40)
            return (
              <text
                key={beat.id}
                x={x}
                y={svgHeight - 4}
                fill="var(--text-secondary)"
                fontSize={9}
                textAnchor="middle"
                transform={`rotate(-30, ${x}, ${svgHeight - 4})`}
              >
                {beat.name.slice(0, 8)}
              </text>
            )
          })}
        </svg>
      </div>

      {/* Beat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {beats.map(beat => (
          <div
            key={beat.id}
            onClick={() => setExpandedBeat(expandedBeat === beat.id ? null : beat.id)}
            className="bg-surface rounded-lg border border-[--color-border] p-3 cursor-pointer hover:border-[--color-primary] transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-[--color-text]">{beat.name}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: statusColor(beat.status) }}
              >
                {statusLabel(beat.status)}
              </span>
            </div>

            {/* Intensity bar */}
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1.5 bg-[--ink-100] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${beat.emotionalIntensity * 10}%`,
                    backgroundColor: colorForAct('setup')
                  }}
                />
              </div>
              <span className="text-[10px] text-[--color-text-secondary]">{beat.emotionalIntensity}/10</span>
            </div>

            {expandedBeat === beat.id && (
              <div className="mt-2 pt-2 border-t border-[--color-border]">
                <p className="text-xs text-[--color-text-secondary] mb-1">{beat.description}</p>
                {beat.chapterIds.length > 0 && (
                  <p className="text-[10px] text-[--color-text-secondary]">章节: {beat.chapterIds.join(', ')}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
