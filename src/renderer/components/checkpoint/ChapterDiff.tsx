import React, { useEffect, useState } from 'react'
import { logger } from '@renderer/utils/logger'
import { checkpointService } from '@renderer/services'

interface ChapterDiffProps {
  projectId: string
}

interface CheckpointItem {
  id: string
  label: string
  createdAt: string
}

export function computeDiff(oldText: string, newText: string): { type: 'same' | 'added' | 'removed'; text: string }[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: { type: 'same' | 'added' | 'removed'; text: string }[] = []
  const maxLen = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLen; i++) {
    if (i >= oldLines.length) {
      result.push({ type: 'added', text: newLines[i] })
    } else if (i >= newLines.length) {
      result.push({ type: 'removed', text: oldLines[i] })
    } else if (oldLines[i] !== newLines[i]) {
      result.push({ type: 'removed', text: oldLines[i] })
      result.push({ type: 'added', text: newLines[i] })
    } else {
      result.push({ type: 'same', text: oldLines[i] })
    }
  }
  return result
}

export const ChapterDiff: React.FC<ChapterDiffProps> = ({ projectId }) => {
  const [checkpoints, setCheckpoints] = useState<{ id: string; label: string; createdAt: string }[]>([])
  const [leftId, setLeftId] = useState<string>('')
  const [rightId, setRightId] = useState<string>('')
  const [diffs, setDiffs] = useState<{ type: string; text: string }[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const list = await checkpointService.list(projectId)
        if (list) {
          const items = (list ?? []).map((cp: CheckpointItem) => ({
            id: cp.id,
            label: cp.label,
            createdAt: cp.createdAt
          }))
          setCheckpoints(items)
          if (items.length >= 2) {
            setLeftId(items[1].id)
            setRightId(items[0].id)
          } else if (items.length === 1) {
            setLeftId('')
            setRightId(items[0].id)
          }
        }
      } catch (err) {
        logger.warn('Failed to load checkpoints for diff:', err)
      }
    }
    load()
  }, [projectId])

  const handleCompare = async () => {
    if (!leftId || !rightId) return
    try {
      const snaps = await Promise.all([checkpointService.restore(leftId), checkpointService.restore(rightId)])
      const leftSnap = snaps[0] as unknown as { novel: string } | null
      const rightSnap = snaps[1] as unknown as { novel: string } | null
      const left = typeof leftSnap?.novel === 'string' ? leftSnap.novel : JSON.stringify(leftSnap?.novel ?? '')
      const right = typeof rightSnap?.novel === 'string' ? rightSnap.novel : JSON.stringify(rightSnap?.novel ?? '')
      setDiffs(computeDiff(left, right))
    } catch {
      logger.warn('Chapter diff comparison failed')
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
        章节对比
      </h3>
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        选择两个检查点进行对比
      </p>

      {checkpoints.length < 2 ? (
        <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
          需要至少 2 个检查点才能进行对比。
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={leftId}
              onChange={e => setLeftId(e.target.value)}
              className="w-full px-3 py-2 bg-surface border rounded-lg text-xs"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {checkpoints.map(cp => (
                <option key={cp.id} value={cp.id}>
                  {cp.label} ({new Date(cp.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
            <select
              value={rightId}
              onChange={e => setRightId(e.target.value)}
              className="w-full px-3 py-2 bg-surface border rounded-lg text-xs"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {checkpoints.map(cp => (
                <option key={cp.id} value={cp.id}>
                  {cp.label} ({new Date(cp.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCompare}
            className="px-4 py-2 text-xs bg-[--color-primary] text-white rounded-lg font-medium"
          >
            对比版本
          </button>

          {diffs.length > 0 && (
            <div
              className="bg-surface rounded-lg border overflow-hidden text-xs font-mono"
              style={{ borderColor: 'var(--color-border)', maxHeight: 400 }}
            >
              <div className="overflow-y-auto p-2 space-y-0.5">
                {diffs.map((d, i) => (
                  <div
                    key={i}
                    className="px-2 py-0.5 rounded"
                    style={{
                      background:
                        d.type === 'added'
                          ? 'var(--success-bg)'
                          : d.type === 'removed'
                            ? 'var(--danger-bg)'
                            : 'transparent',
                      color:
                        d.type === 'added'
                          ? 'var(--success)'
                          : d.type === 'removed'
                            ? 'var(--danger)'
                            : 'var(--color-text)'
                    }}
                  >
                    <span className="mr-2 select-none">
                      {d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' '}
                    </span>
                    {d.text || ' '}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
