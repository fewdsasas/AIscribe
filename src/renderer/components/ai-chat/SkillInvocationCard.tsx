import React, { useState } from 'react'
import type { SkillInvocation } from '../../store'

interface SkillInvocationCardProps {
  invocation: SkillInvocation
}

export const SkillInvocationCard: React.FC<SkillInvocationCardProps> = ({ invocation }) => {
  const [expanded, setExpanded] = useState(false)

  const statusConfig = {
    running: { icon: '⏳', color: 'var(--accent)', bg: 'var(--accent-bg)', label: '执行中...' },
    completed: {
      icon: '✅',
      color: 'var(--success)',
      bg: 'var(--success-bg)',
      label: `完成 (${invocation.duration.toFixed(1)}s)`
    },
    error: { icon: '❌', color: 'var(--danger)', bg: 'var(--danger-bg)', label: '失败' }
  }

  const config = statusConfig[invocation.status]

  return (
    <div className="my-2 rounded-lg border overflow-hidden text-sm" style={{ borderColor: config.color + '40' }}>
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        style={{ backgroundColor: config.bg }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span>{config.icon}</span>
          <span className="font-medium" style={{ color: config.color }}>
            {invocation.skillName}
          </span>
          <span className="text-xs text-[--color-text-secondary]">{config.label}</span>
        </div>
        <span className="text-xs text-[--color-text-secondary]">{expanded ? '收起 ▲' : '展开 ▼'}</span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="p-3 space-y-2 bg-surface">
          <div>
            <div className="text-xs font-medium text-[--color-text-secondary] mb-1">输入</div>
            <div className="text-xs text-[--color-text] bg-[--color-bg] rounded p-2">{invocation.input}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-[--color-text-secondary] mb-1">输出</div>
            <div className="text-xs text-[--color-text] bg-[--color-bg] rounded p-2 max-h-24 overflow-y-auto">
              {invocation.output}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
