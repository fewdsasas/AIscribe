import React, { useState } from 'react'
import { exportService } from '../../services'
import Skeleton from '../shared/Skeleton'

interface ExportDialogProps {
  projectId: string
  projectName: string
  onClose: () => void
}

type ExportFormat = 'txt' | 'markdown' | 'html'

const FORMATS: { id: ExportFormat; label: string; desc: string }[] = [
  { id: 'txt', label: '纯文本 (.txt)', desc: '纯文字，适合导入各种编辑器' },
  { id: 'markdown', label: 'Markdown (.md)', desc: '带标题层级，适合写作平台' },
  { id: 'html', label: '网页 (.html)', desc: '带样式，可直接在浏览器查看' }
]

export const ExportDialog: React.FC<ExportDialogProps> = ({ projectId, projectName, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [includeSynopsis, setIncludeSynopsis] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportService.exportProject({
        projectId,
        format,
        includeSynopsis
      })
      if (data) {
        // Create a download link
        const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.filename
        a.click()
        URL.revokeObjectURL(url)
        setResult(`✅ 已导出 ${data.filename}`)
      } else {
        setResult('❌ 导出失败：未获取到数据')
      }
    } catch (err) {
      setResult(`❌ 导出失败: ${(err as Error).message}`)
    }
    setExporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-surface rounded-2xl w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>
            导出作品
          </h2>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--color-text-secondary)' }}>
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            导出「{projectName}」为以下格式
          </p>

          {/* Format selection */}
          <div className="space-y-2">
            {FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`w-full text-left p-3 rounded-xl border text-sm transition-colors ${
                  format === f.id
                    ? 'border-[--color-primary] bg-[--amber-50]'
                    : 'border-[--color-border] hover:border-[--color-primary]'
                }`}
              >
                <div className="font-medium" style={{ color: 'var(--color-text)' }}>
                  {f.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {f.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Options */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeSynopsis}
              onChange={e => setIncludeSynopsis(e.target.checked)}
              className="rounded"
            />
            <span style={{ color: 'var(--color-text)' }}>包含简介</span>
          </label>

          {/* Exporting progress */}
          {exporting && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                正在导出...
              </p>
              <Skeleton count={1} height="8px" rounded="rounded-full" />
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                background: result.startsWith('✅') ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: result.startsWith('✅') ? 'var(--success)' : 'var(--danger)'
              }}
            >
              {result}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            关闭
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm bg-[--color-primary] text-white rounded-lg font-medium disabled:opacity-50"
          >
            {exporting ? '导出中...' : '导出并下载'}
          </button>
        </div>
      </div>
    </div>
  )
}
