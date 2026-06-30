import React, { useState } from 'react'
import { chapterService, novelService, projectService } from '../../services'

interface ProjectDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (projectId: string) => void
}

const GENRES = ['玄幻', '仙侠', '都市', '悬疑', '科幻', '言情', '轻小说', '历史', '游戏', '其他']

export const ProjectDialog: React.FC<ProjectDialogProps> = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('玄幻')
  const [targetWordCount, setTargetWordCount] = useState('100000')
  const [creating, setCreating] = useState(false)
  const [creationStep, setCreationStep] = useState<'idle' | 'creating-project' | 'creating-novel' | 'creating-chapter'>(
    'idle'
  )
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    setCreationStep('creating-project')
    setError(null)
    try {
      setCreationStep('creating-project')
      const project = await projectService.create({
        name: name.trim(),
        description: description.trim(),
        genre,
        status: 'planning' as const,
        targetWordCount: parseInt(targetWordCount) || 100000
      })
      if (!project?.id) {
        setError('创建失败，请重试')
        setCreating(false)
        setCreationStep('idle')
        return
      }
      setCreationStep('creating-novel')
      const novel = await novelService.create({
        projectId: project.id,
        title: name.trim(),
        author: '',
        synopsis: description.trim(),
        genre,
        tags: [],
        targetAudience: ''
      })
      if (!novel?.id) {
        setError('小说创建失败，项目可能已部分创建')
        setCreating(false)
        setCreationStep('idle')
        return
      }
      setCreationStep('creating-chapter')
      try {
        await chapterService.create({
          novelId: novel.id,
          title: '第一章',
          content: '',
          sortOrder: 1,
          status: 'draft'
        })
      } catch (chapterErr) {
        // Chapter creation failed but novel exists — warn user but don't block
        console.warn('Chapter creation failed:', chapterErr)
      }
      onCreated(project.id)
    } catch (err) {
      setError(`创建失败: ${(err as Error).message}`)
    }
    setCreating(false)
    setCreationStep('idle')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={() => {
        if (!creating) onClose()
      }}
    >
      <div className="bg-surface rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>
            新建项目
          </h2>
          <button
            onClick={onClose}
            disabled={creating}
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

          {creationStep !== 'idle' && (
            <div className="text-xs text-center py-1" style={{ color: 'var(--color-text-secondary)' }}>
              {creationStep === 'creating-project' && '创建项目...'}
              {creationStep === 'creating-novel' && '创建小说...'}
              {creationStep === 'creating-chapter' && '创建章节...'}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              作品名称 *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入小说名称"
              autoFocus
              className="w-full px-3 py-2 bg-surface border rounded-lg text-sm focus:outline-none"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              简介
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="简要描述你的小说..."
              rows={3}
              className="w-full px-3 py-2 bg-surface border rounded-lg text-sm resize-none focus:outline-none"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                类型
              </label>
              <select
                value={genre}
                onChange={e => setGenre(e.target.value)}
                className="w-full px-3 py-2 bg-surface border rounded-lg text-sm focus:outline-none"
                style={{ borderColor: 'var(--color-border)' }}
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
                目标字数
              </label>
              <select
                value={targetWordCount}
                onChange={e => setTargetWordCount(e.target.value)}
                className="w-full px-3 py-2 bg-surface border rounded-lg text-sm focus:outline-none"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <option value="50000">5 万字（短篇）</option>
                <option value="100000">10 万字（中篇）</option>
                <option value="300000">30 万字（长篇）</option>
                <option value="1000000">100 万字（超长篇）</option>
                <option value="0">不设目标</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
            style={{ background: 'var(--accent)' }}
          >
            {creating ? '创建中...' : '创建项目'}
          </button>
        </div>
      </div>
    </div>
  )
}
