import React, { useEffect, useState } from 'react'
import { importService } from '../../services'
import type { ImportNovelData, ImportNovelResult } from '../../../shared/types/ipc'
import { NovelRepairStatus } from './NovelRepairStatus'

interface ImportNovelDialogProps {
  open: boolean
  projectId?: string
  onClose: () => void
  onImported: (projectId: string, novelId: string) => void
}

function inferFormatFromPath(filePath: string): ImportNovelData['format'] {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext === 'txt') return 'txt'
  if (ext === 'epub') return 'epub'
  if (ext === 'docx') return 'docx'
  if (ext === 'pdf') return 'pdf'
  return undefined
}

function formatLabel(format: string): string {
  switch (format) {
    case 'txt':
      return 'TXT'
    case 'epub':
      return 'EPUB'
    case 'docx':
      return 'DOCX'
    case 'pdf':
      return 'PDF'
    default:
      return '未知'
  }
}

export const ImportNovelDialog: React.FC<ImportNovelDialogProps> = ({ open, projectId, onClose, onImported }) => {
  const [filePath, setFilePath] = useState<string | null>(null)
  const [format, setFormat] = useState<ImportNovelData['format']>(undefined)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [repairing, setRepairing] = useState(false)
  const [repairDone, setRepairDone] = useState(false)
  const [repairProgress, setRepairProgress] = useState({ current: 0, total: 1, action: '' })
  const [repairActionsCount, setRepairActionsCount] = useState(0)

  // 监听 AI 修复进度事件
  useEffect(() => {
    const api = window.aiscribe
    if (!api) return

    api.onRepairProgress(data => {
      setRepairing(true)
      setRepairProgress({ current: data.current, total: data.total, action: data.action })
    })

    api.onRepairDone(data => {
      setRepairing(false)
      setRepairDone(true)
      setRepairActionsCount(data.actionsCount)
    })

    return () => {
      // Reset handlers to no-ops on unmount to prevent stale callbacks
      api.onRepairProgress(() => {})
      api.onRepairDone(() => {})
    }
  }, [])

  if (!open) return null

  const handleSelectFile = async () => {
    setError(null)
    try {
      const result = await importService.selectNovelFile()
      if (result.canceled || !result.filePath) return
      setFilePath(result.filePath)
      setFormat(inferFormatFromPath(result.filePath))
    } catch (err) {
      setError(`选择文件失败: ${(err as Error).message}`)
    }
  }

  const handleImport = async () => {
    if (!filePath) return
    setImporting(true)
    setError(null)

    try {
      const data: ImportNovelData = { filePath, projectId, format }
      const result: ImportNovelResult = await importService.novelImport(data)
      onImported(result.projectId, result.novelId)
    } catch (err) {
      setError(`导入失败: ${(err as Error).message}`)
    } finally {
      setImporting(false)
    }
  }

  const fileName = filePath ? filePath.split(/[/\\]/).pop() : null

  const handleClose = () => {
    if (importing) return
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={() => {
        if (!importing) onClose()
      }}
    >
      <div className="bg-surface rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>
            导入小说
          </h2>
          <button
            onClick={handleClose}
            disabled={importing}
            className="text-xl leading-none"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              选择文件
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleSelectFile}
                disabled={importing}
                className="px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-[--color-bg]"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                浏览...
              </button>
              <div
                className="flex-1 px-3 py-2 text-sm rounded-lg border truncate"
                style={{
                  borderColor: 'var(--color-border)',
                  color: fileName ? 'var(--color-text)' : 'var(--color-text-secondary)'
                }}
              >
                {fileName || '未选择文件'}
              </div>
            </div>
          </div>

          {format && (
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              检测到格式: <span className="font-medium">{formatLabel(format)}</span>
            </div>
          )}

          {(importing || repairing || repairDone) && (
            <NovelRepairStatus
              repairing={repairing}
              current={repairProgress.current}
              total={repairProgress.total}
              action={repairProgress.action}
              done={repairDone}
              actionsCount={repairActionsCount}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={handleClose}
            disabled={importing}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!filePath || importing}
            className="px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
            style={{ background: 'var(--accent)' }}
          >
            {importing ? '导入中...' : '导入'}
          </button>
        </div>
      </div>
    </div>
  )
}
