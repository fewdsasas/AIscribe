import React, { useEffect, useState } from 'react'
import { projectService } from '../../services'

const GENRES = ['玄幻', '仙侠', '都市', '悬疑', '科幻', '言情', '轻小说', '历史', '游戏', '其他']
const STATUSES = [
  { value: 'planning' as const, label: '规划中' },
  { value: 'outlining' as const, label: '大纲中' },
  { value: 'writing' as const, label: '写作中' },
  { value: 'revising' as const, label: '修改中' },
  { value: 'completed' as const, label: '已完成' },
  { value: 'on_hold' as const, label: '暂停' }
]

interface ProjectSettingsProps {
  projectId: string
  onClose: () => void
  onUpdated: () => void
}

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({ projectId, onClose, onUpdated }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('玄幻')
  const [status, setStatus] = useState('planning')
  const [targetWordCount, setTargetWordCount] = useState('100000')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const project = await projectService.get(projectId)
        if (project) {
          setName(project.name)
          setDescription(project.description)
          setGenre(project.genre)
          setStatus(project.status)
          setTargetWordCount(String(project.targetWordCount ?? 100000))
        }
      } catch {
        /* ignore */
      }
      setLoading(false)
    }
    load()
  }, [projectId])

  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await projectService.update(projectId, {
        name: name.trim(),
        description: description.trim(),
        genre,
        status: status as (typeof STATUSES)[number]['value'],
        targetWordCount: parseInt(targetWordCount) || 0
      })
      onUpdated()
      onClose()
    } catch (err) {
      setSaveError(`保存失败: ${(err as Error).message}`)
    }
    setSaving(false)
  }

  if (loading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-surface rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--color-border]">
          <h2 className="text-lg font-medium text-[--color-text]">项目设置</h2>
          <button onClick={onClose} className="text-[--color-text-secondary] hover:text-[--color-text] text-xl">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              作品名称
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-[--color-border] rounded-lg text-sm focus:outline-none focus:border-[--color-primary]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              简介
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-surface border border-[--color-border] rounded-lg text-sm resize-none focus:outline-none focus:border-[--color-primary]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                类型
              </label>
              <select
                value={genre}
                onChange={e => setGenre(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-[--color-border] rounded-lg text-sm"
              >
                {GENRES.map(g => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                状态
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-[--color-border] rounded-lg text-sm"
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              目标字数
            </label>
            <input
              type="number"
              value={targetWordCount}
              onChange={e => setTargetWordCount(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-[--color-border] rounded-lg text-sm focus:outline-none focus:border-[--color-primary]"
            />
          </div>
        </div>

        {saveError && (
          <div className="px-6 py-2">
            <p className="text-xs text-[--danger]" style={{ color: 'var(--danger)' }}>
              {saveError}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[--color-border]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-[--color-primary] text-white rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
