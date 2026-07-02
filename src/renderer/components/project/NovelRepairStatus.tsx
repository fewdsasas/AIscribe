import React from 'react'

interface NovelRepairStatusProps {
  /** 修复中 */
  repairing: boolean
  /** 当前进度 */
  current?: number
  /** 总章节数 */
  total?: number
  /** 当前动作描述 */
  action?: string
  /** 修复完成后是否显示结果 */
  done?: boolean
  /** 完成的修复动作数 */
  actionsCount?: number
}

export const NovelRepairStatus: React.FC<NovelRepairStatusProps> = ({
  repairing,
  current = 0,
  total = 1,
  action = '',
  done = false,
  actionsCount = 0
}) => {
  if (!repairing && !done) return null

  const progress = Math.min(100, Math.round((current / total) * 100))

  return (
    <div
      className="text-xs px-3 py-2 rounded-lg"
      style={{
        background: repairing
          ? 'var(--accent-bg, rgba(99, 102, 241, 0.08))'
          : 'var(--success-bg, rgba(34, 197, 94, 0.08))'
      }}
    >
      {repairing && (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full border-2 animate-spin"
            style={{
              borderColor: 'var(--accent)',
              borderTopColor: 'transparent'
            }}
          />
          <span style={{ color: 'var(--color-text-secondary)' }}>{action || 'AI 正在修复章节结构...'}</span>
          {total > 0 && (
            <span className="ml-auto font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
              {progress}%
            </span>
          )}
        </div>
      )}
      {done && (
        <div className="flex items-center gap-1" style={{ color: 'var(--success)' }}>
          <span>✓</span>
          <span>
            AI 结构修复完成
            {actionsCount > 0 ? `，已优化 ${actionsCount} 处结构问题` : ''}
          </span>
        </div>
      )}
    </div>
  )
}
