import React, { useEffect, useState } from 'react'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { logger } from '@renderer/utils/logger'
import { checkpointService } from '@renderer/services'

interface CheckpointItem {
  id: string
  label: string
  description: string
  createdAt: string
  tags: string[]
}

interface CheckpointManagerProps {
  projectId: string
}

export const CheckpointManager: React.FC<CheckpointManagerProps> = ({ projectId }) => {
  const [checkpoints, setCheckpoints] = useState<CheckpointItem[]>([])
  const [loading, setLoading] = useState(true)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const list = await checkpointService.list(projectId)
      setCheckpoints(
        (list ?? []).map((cp: CheckpointItem) => ({
          id: cp.id,
          label: cp.label,
          description: cp.description,
          createdAt: cp.createdAt,
          tags: cp.tags ?? []
        })) ?? []
      )
    } catch (err) {
      logger.error('加载检查点失败:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [projectId])

  const handleCreate = async () => {
    setShowCreateDialog(true)
    setNewLabel(`v${checkpoints.length + 1}`)
    setError(null)
  }

  const doCreate = async () => {
    if (!newLabel.trim()) return
    setCreating(true)
    setError(null)
    try {
      await checkpointService.create({
        projectId,
        label: newLabel.trim(),
        description: `章节存档 #${checkpoints.length + 1}`,
        snapshot: {
          novel: '{}',
          characters: '[]',
          worlds: '[]',
          plots: '[]',
          outline: '{}'
        },
        tags: ['自动保存']
      })
      setShowCreateDialog(false)
      load()
    } catch (err) {
      setError(`创建失败: ${(err as Error).message}`)
    }
    setCreating(false)
  }

  const handleRestore = async () => {
    if (!restoreId) return
    try {
      await checkpointService.restore(restoreId)
      setError(null)
      load()
    } catch (err) {
      setError(`恢复失败: ${(err as Error).message}`)
    }
    setRestoreId(null)
  }

  if (loading)
    return (
      <div className="text-sm p-4" style={{ color: 'var(--color-text-secondary)' }}>
        加载中...
      </div>
    )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          版本历史 ({checkpoints.length})
        </h3>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-3 py-1.5 text-xs bg-[--color-primary] text-white rounded-lg font-medium disabled:opacity-50"
        >
          {creating ? '创建中...' : '+ 创建检查点'}
        </button>
      </div>

      {checkpoints.length === 0 ? (
        <p className="text-xs py-6 text-center" style={{ color: 'var(--color-text-secondary)' }}>
          暂无检查点。点击上方按钮创建第一个版本快照。
        </p>
      ) : (
        <div className="space-y-2">
          {checkpoints.map(cp => (
            <div
              key={cp.id}
              className="bg-surface rounded-lg border p-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {cp.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {(() => {
                      try {
                        const d = new Date(cp.createdAt)
                        return isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN')
                      } catch {
                        return '—'
                      }
                    })()}
                  </div>
                  {cp.description && (
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {cp.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setRestoreId(cp.id)}
                  className="text-xs px-2 py-1 rounded border transition-colors"
                  style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                >
                  恢复
                </button>
              </div>
              {cp.tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {cp.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--accent-bg)', color: 'var(--color-primary)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          className="text-xs px-3 py-2 rounded-lg"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}

      {showCreateDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setShowCreateDialog(false)}
        >
          <div
            className="bg-surface rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--color-text)' }}>
              创建检查点
            </h3>
            <input
              autoFocus
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doCreate()}
              placeholder="输入检查点名称"
              className="w-full px-3 py-2 border rounded-lg text-sm mb-4"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-sm rounded-lg"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={doCreate}
                disabled={creating || !newLabel.trim()}
                className="px-4 py-2 text-sm bg-[--color-primary] text-white rounded-lg font-medium disabled:opacity-50"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {restoreId && (
        <ConfirmDialog
          open={true}
          title="恢复检查点"
          message="将恢复到该检查点保存时的状态。当前未保存的更改将丢失。"
          confirmLabel="恢复"
          danger
          onConfirm={handleRestore}
          onCancel={() => setRestoreId(null)}
        />
      )}
    </div>
  )
}
