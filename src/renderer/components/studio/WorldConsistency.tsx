import React, { useMemo, useState } from 'react'

interface ConsistencyItem {
  category: string
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestion: string
}

interface WorldConsistencyProps {
  items: ConsistencyItem[]
  worldName?: string
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  error: { label: '错误', color: 'var(--danger)', bg: 'var(--danger-bg)', icon: '✕' },
  warning: { label: '警告', color: 'var(--accent)', bg: 'var(--accent-bg)', icon: '⚠' },
  info: { label: '建议', color: 'var(--accent)', bg: 'var(--accent-bg)', icon: 'ℹ' }
}

export const WorldConsistency: React.FC<WorldConsistencyProps> = ({ items, worldName }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [resolvedIds, setResolvedIds] = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items
    return items.filter(item => item.severity === filter)
  }, [items, filter])

  const counts = useMemo(
    () => ({
      error: items.filter(i => i.severity === 'error').length,
      warning: items.filter(i => i.severity === 'warning').length,
      info: items.filter(i => i.severity === 'info').length,
      total: items.length,
      resolved: resolvedIds.size
    }),
    [items, resolvedIds]
  )

  // Map original indices for resolved tracking
  const filteredItemsWithIndex = useMemo(() => {
    return filteredItems.map(item => ({
      item,
      originalIndex: items.indexOf(item)
    }))
  }, [items, filteredItems])

  const toggleResolved = (index: number) => {
    setResolvedIds(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
        <div className="text-3xl mb-3">🌍</div>
        <p>暂无一致性检查项</p>
        <p className="text-xs mt-1">开始构建世界观后，系统将自动检查设定一致性</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            世界观一致性检查
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {worldName ? `${worldName} · ` : ''}
            {counts.total} 项检查 · {counts.resolved} 项已解决
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-xs">
            <span style={{ color: 'var(--danger)' }}>● {counts.error} 错误</span>
            <span style={{ color: 'var(--accent)' }}>● {counts.warning} 警告</span>
            <span style={{ color: 'var(--accent)' }}>● {counts.info} 建议</span>
          </div>
          <div style={{ width: 96, height: 3, background: 'var(--ink-100)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              data-testid="progress-bar"
              style={{
                height: '100%',
                borderRadius: 2,
                transition: 'width .3s',
                width: `${counts.total > 0 ? (counts.resolved / counts.total) * 100 : 0}%`,
                backgroundColor: counts.resolved === counts.total ? 'var(--success)' : 'var(--accent)'
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="flex gap-1 bg-surface rounded-lg p-1 border"
        style={{ borderColor: 'var(--color-border)', width: 'fit-content' }}
      >
        {(['all', 'error', 'warning', 'info'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1 rounded-md text-xs transition-colors"
            style={{
              background: filter === f ? 'var(--accent)' : '',
              color: filter === f ? 'white' : 'var(--text-secondary)'
            }}
          >
            {f === 'all' ? `全部 (${counts.total})` : `${SEVERITY_CONFIG[f].label} (${counts[f]})`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredItemsWithIndex.map(({ item, originalIndex }) => {
          const isExpanded = expandedId === originalIndex
          const isResolved = resolvedIds.has(originalIndex)
          const config = SEVERITY_CONFIG[item.severity]

          return (
            <div
              key={originalIndex}
              className="bg-surface rounded-lg border transition-all"
              style={{
                borderColor: isResolved ? 'var(--success)' : 'var(--color-border)',
                opacity: isResolved ? 0.6 : 1
              }}
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : originalIndex)}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white shrink-0"
                  style={{ background: config.color }}
                >
                  {config.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                      {item.category}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: config.bg, color: config.color }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p
                    className="text-sm"
                    style={{
                      color: isResolved ? 'var(--text-secondary)' : 'var(--text)',
                      textDecoration: isResolved ? 'line-through' : 'none'
                    }}
                  >
                    {item.message}
                  </p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    toggleResolved(originalIndex)
                  }}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{
                    color: isResolved ? 'var(--success)' : 'var(--text-secondary)',
                    background: isResolved ? 'var(--success-bg)' : ''
                  }}
                >
                  {isResolved ? '✓ 已解决' : '标记解决'}
                </button>
              </div>
              {isExpanded && item.suggestion && (
                <div className="px-3 pb-3 pt-0">
                  <div
                    className="ml-9 p-2 rounded text-xs"
                    style={{ background: 'var(--color-bg)', color: 'var(--text-secondary)' }}
                  >
                    💡 {item.suggestion}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
